import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Check, FolderUp } from "lucide-react";
import { PageHeader, Panel, textLink } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { loadChecklist, needsApplicant, type ChecklistItem } from "@/lib/documents/checklist";
import { DocumentItem, DocumentsProgress, GROUP_LABEL, type Group } from "./document-item";

export const metadata: Metadata = {
  title: "Your documents",
  robots: { index: false, follow: false },
};

/**
 * The document checklist.
 *
 * BUSINESS_CONTEXT §8 puts this bluntly: the checklist is where deals die. Not
 * usually because someone refuses to send a document — because nobody can see
 * what is still outstanding without a phone call. So the page answers one
 * question above everything else, in the first line: what is left for you to do.
 *
 * NOTHING HERE SHOWS INTERNAL STATE. Document statuses are the applicant's own
 * documents and safe to show, but the words are not the database's: 'rejected'
 * reads as "send another copy", because a crooked scan is not a rejection and
 * "rejected" is on the forbidden list in customer-status.ts for a reason.
 *
 * THE OWNERSHIP CHECK IS THE profile_id FILTER, and it has to be here rather
 * than left to RLS. The applications policy is `profile_id = auth.uid() or
 * public.is_staff()`, which would let a specialist open an applicant's portal
 * page — a view written entirely in customer vocabulary, showing customer-facing
 * wording for decisions the specialist made themselves. /admin is where staff
 * read other people's files.
 *
 * A guessed id therefore returns nothing and falls through to notFound(), which
 * is also the honest answer: "this exists but isn't yours" is itself a
 * disclosure. Everything after this gate is scoped by application id, so this
 * one query is what stands between a URL and someone else's paperwork.
 */
export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?next=/dashboard");

  const { data: application } = await supabase
    .from("applications")
    .select("id, financing_goal, signature_requested_at")
    .eq("id", applicationId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!application) notFound();

  const checklist = await loadChecklist(supabase, applicationId);

  if (!checklist || checklist.items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Your documents" />
        <Panel className="mt-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-ink-100 text-ink-600">
            <FolderUp aria-hidden="true" className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink-900">Nothing to send yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-600">
            When your specialist needs paperwork from you, it will appear here with instructions.
          </p>
        </Panel>
      </div>
    );
  }

  const { outstanding, requiredSettled, requiredTotal } = checklist;
  const allSettled = requiredTotal > 0 && requiredSettled === requiredTotal;

  /*
   * THREE GROUPS: what's still needed from you, what's with your specialist,
   * and what's done. Eight identical cards stopped saying anything once most
   * were sent; grouped, the page answers "what's left?" at a glance.
   *
   * ONE FLAT LIST, headings included. An upload moves its item from Needed to
   * With your specialist the moment it's recorded, while the rest of a batch
   * may still be going up. As siblings in one keyed list React moves the card
   * and keeps its upload queue; split into separate lists, the card would be
   * remounted and the progress bars would vanish mid-upload.
   */
  const groupOf = (item: ChecklistItem): Group =>
    needsApplicant(item.status)
      ? "needed"
      : item.status === "accepted" || item.status === "waived"
        ? "done"
        : "with_specialist";
  const groups: Group[] = ["needed", "with_specialist", "done"];
  const counts = Object.fromEntries(
    groups.map((group) => [group, checklist.items.filter((item) => groupOf(item) === group).length]),
  ) as Record<Group, number>;
  const ordered = groups.flatMap((group) => checklist.items.filter((item) => groupOf(item) === group));

  const rows: ReactNode[] = [];
  let lastGroup: Group | null = null;
  for (const item of ordered) {
    const group = groupOf(item);
    if (group !== lastGroup) {
      rows.push(
        <li key={`heading-${group}`} className={`pl-3 sm:pl-4 ${lastGroup ? "pt-4" : ""}`}>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-500">
            {GROUP_LABEL[group]}
            <span className="rounded-full bg-ink-900/[0.06] px-2 py-0.5 text-xs tabular-nums text-ink-600">
              {counts[group]}
            </span>
          </h2>
        </li>,
      );
      lastGroup = group;
    }
    rows.push(
      <DocumentItem
        key={item.requestId}
        item={item}
        group={group}
        applicationId={applicationId}
        signatureRequested={Boolean(application.signature_requested_at)}
      />,
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Your documents"
        description="Upload what's listed below. Photos of paper are fine as long as every corner is in the frame and the text is readable."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ul className="min-w-0 space-y-4">{rows}</ul>

        <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <Panel className="sm:p-6">
            {/*
              Three states, not two. "Nothing outstanding" and "everything has
              been checked and accepted" feel the same to this page but are very
              different to the person reading it: one means we are looking, the
              other means we are done looking.
            */}
            <p className="text-base font-semibold text-ink-900">
              {allSettled
                ? "Everything's been accepted"
                : outstanding === 0
                  ? "Nothing outstanding right now"
                  : outstanding === 1
                    ? "One item still to send"
                    : `${outstanding} items still to send`}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">
              {allSettled
                ? "Your specialist has checked everything we asked for. If anything else is needed, it will appear here."
                : outstanding === 0
                  ? "Everything you've sent is with your specialist to look over. There's nothing for you to do right now."
                  : "Each one moves to With your specialist as soon as it's sent."}
            </p>
            <DocumentsProgress total={requiredTotal} sent={requiredTotal - outstanding} done={requiredSettled} />
          </Panel>

          <Panel className="sm:p-6">
            <h2 className="text-base font-semibold text-ink-900">Tips for clear uploads</h2>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-600">
              {[
                "Send every page, including blank or signature pages.",
                "PDFs straight from your bank or accountant are best.",
                "Photos work too: flat surface, good light, all four corners.",
                "Several files for one item is fine, e.g. one per month.",
              ].map((tip) => (
                <li key={tip} className="flex gap-2">
                  <Check aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-success-700" strokeWidth={2.5} />
                  {tip}
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-ink-100 pt-4 text-sm text-ink-600">
              Not sure about something on this list?{" "}
              <Link href="/dashboard/support" className={textLink}>
                Message your specialist
              </Link>
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
