"use server";

import { revalidatePath } from "next/cache";
import { isFormModule } from "@/lib/application-form/mapping";
import { saveSection } from "@/lib/application-form/save";

/**
 * Saving a section.
 *
 * Thin on purpose: it validates that the two identifiers are the shapes they
 * claim to be and hands the rest to saveSection, which re-reads the application
 * on the caller's own client. Nothing about ownership is decided from what the
 * browser posted.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SectionState = { error?: string; saved?: boolean };

export async function saveSectionAction(
  _prevState: SectionState,
  formData: FormData,
): Promise<SectionState> {
  const applicationId = String(formData.get("application_id") ?? "");
  // Not named `module`: Next reserves that identifier in bundled output and
  // eslint-config-next rejects assigning to it.
  const moduleKey = String(formData.get("module") ?? "");

  if (!UUID_PATTERN.test(applicationId) || !isFormModule(moduleKey)) {
    return { error: "Something went wrong with that form. Please reload the page." };
  }

  const result = await saveSection(applicationId, moduleKey, formData);

  if (!result.ok) return { error: result.error };

  revalidatePath(`/dashboard/${applicationId}/application`);
  revalidatePath(`/dashboard/${applicationId}/application/${moduleKey}`);
  revalidatePath("/dashboard");

  return { saved: true };
}
