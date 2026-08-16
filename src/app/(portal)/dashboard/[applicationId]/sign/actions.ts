"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { signFundingApplication } from "@/lib/funding-application/sign";

/**
 * Receiving a signature.
 *
 * The IP address and user agent are read here rather than sent by the browser.
 * A client that reports its own address for an audit record is a client that
 * can report someone else's, and the whole value of the record is that the
 * signer did not write it.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SignState = { error?: string; signed?: boolean };

export async function signAction(
  _prevState: SignState,
  formData: FormData,
): Promise<SignState> {
  const applicationId = String(formData.get("application_id") ?? "");

  if (!UUID_PATTERN.test(applicationId)) {
    return { error: "Something went wrong with that form. Please reload the page." };
  }

  const headerList = await headers();

  // x-forwarded-for is a list when proxies chain; the first entry is the client.
  // Absent in local development, which is why the audit block tolerates null
  // rather than refusing to sign.
  const forwarded = headerList.get("x-forwarded-for");
  const ipAddress =
    forwarded?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    null;

  const result = await signFundingApplication({
    applicationId,
    signatureDataUrl: String(formData.get("signature") ?? ""),
    signerName: String(formData.get("signer_name") ?? ""),
    signerTitle: String(formData.get("signer_title") ?? "") || null,
    ssn: String(formData.get("ssn") ?? "") || null,
    taxId: String(formData.get("tax_id") ?? "") || null,
    agreedFcra: formData.get("agree_fcra") === "on",
    agreedESign: formData.get("agree_esign") === "on",
    ipAddress,
    userAgent: headerList.get("user-agent"),
  });

  if (!result.ok) return { error: result.error };

  revalidatePath(`/dashboard/${applicationId}/sign`);
  revalidatePath(`/dashboard/${applicationId}/documents`);
  revalidatePath("/dashboard");

  return { signed: true };
}
