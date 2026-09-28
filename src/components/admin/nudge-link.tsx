import type { LeadSummary } from "@/lib/leads";

/**
 * "Chase documents" — a prefilled mail draft, not a send.
 *
 * WHY mailto AND NOT sendEmail(). The infrastructure to send from the app
 * exists (lib/email/send.ts, used by portal support and notifications), and it
 * was the obvious choice until you look at what a chase email actually is.
 *
 * It is a personal message from Robert to someone he is probably also calling.
 * Sent from the app it leaves from the FLS domain, so the reply lands wherever
 * that inbox is routed rather than in his; it never appears in his sent items,
 * so his own mail history stops being a record of the relationship; and every
 * one of them reads identically, which is the wrong tone for "hey, still need
 * those bank statements". A mailto opens his own client, from his own address,
 * with the reply coming back to him — and he can change a sentence before it
 * goes.
 *
 * What it removes is the annoying part: looking up which documents are
 * actually outstanding. That list comes from the same checklist the pipeline
 * counts, so the email cannot name a document that is already settled.
 *
 * THE APP-SENT VERSION IS STILL THE RIGHT ANSWER LATER, for one reason this
 * does not cover: nothing about a mailto is recorded against the file, so
 * "when did we last chase them" is unanswerable. That wants a logged action
 * and a crm_notes row, which is a bigger change than a link.
 */
export function NudgeLink({
  summary,
  reference,
  className = "",
}: {
  summary: Pick<LeadSummary, "contactEmail" | "contactName" | "docsMissing">;
  reference: string;
  className?: string;
}) {
  const { contactEmail, contactName, docsMissing } = summary;

  // No address, nothing to send to. No outstanding documents, nothing to
  // chase — and a chase naming zero documents is worse than none at all.
  if (!contactEmail || docsMissing.length === 0) return null;

  const firstName = contactName?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";

  const list = docsMissing.map((d) => `  • ${d}`).join("\n");

  const subject = `${reference} — still need ${docsMissing.length} document${
    docsMissing.length === 1 ? "" : "s"
  }`;

  const body = [
    greeting,
    "",
    "Quick nudge on your financing file — we're still waiting on:",
    "",
    list,
    "",
    "You can upload them from your dashboard, and I'll pick them up as soon as they land. Reply here if anything on that list is a problem to get hold of.",
    "",
    "Thanks,",
    "Robert",
  ].join("\n");

  const href = `mailto:${encodeURIComponent(contactEmail)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;

  return (
    <a
      href={href}
      className={`inline-flex items-center gap-2 border border-accent-600 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-700 transition-colors hover:bg-accent-50 dark:border-accent-400/60 dark:text-accent-300 dark:hover:bg-accent-400/10 ${className}`}
    >
      Chase {docsMissing.length} document{docsMissing.length === 1 ? "" : "s"}
    </a>
  );
}
