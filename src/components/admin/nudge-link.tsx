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
  summary: Pick<LeadSummary, "contactEmail" | "contactName" | "businessName" | "docsMissing">;
  reference: string;
  className?: string;
}) {
  const { contactEmail, contactName, businessName, docsMissing } = summary;

  // No address, nothing to send to. No outstanding documents, nothing to
  // chase — and a chase naming zero documents is worse than none at all.
  if (!contactEmail || docsMissing.length === 0) return null;

  const firstName = contactName?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";

  const list = docsMissing.map((d) => `  • ${d}`).join("\n");

  // THE SUBJECT LEADS WITH THE BUSINESS, NOT THE REFERENCE. It used to open
  // "FLS-2026-000075 — still need 2 documents", which reads like a support
  // ticket from a system rather than a message from the broker handling your
  // file. The applicant has never seen that number and it means nothing to
  // them; their own business name is the thing they recognise in an inbox.
  const plural = docsMissing.length === 1 ? "" : "s";
  const subject = businessName
    ? `${businessName} — ${docsMissing.length} document${plural} still needed`
    : `${docsMissing.length} document${plural} still needed for your financing file`;

  // Written to read as a professional note from a named person at a named
  // firm, because that is what it is: Robert sends this from his own mail
  // client and it is often the only message an applicant gets between
  // applying and funding. "Quick nudge", no company name and a bare "Robert"
  // read as an internal reminder that escaped.
  //
  // THE REFERENCE MOVES TO THE FOOT. It still has to travel — it is how a
  // reply gets matched back to a file — but as a filing detail under the
  // signature rather than the first thing in the subject line.
  const body = [
    greeting,
    "",
    "We're putting your financing file together and still need the following before it can go to a funding source:",
    "",
    list,
    "",
    "You can upload these from your dashboard whenever it suits, and I'll pick them up as soon as they arrive. If anything on that list is difficult to get hold of, reply here and we'll find another way.",
    "",
    "Thanks,",
    "Robert Saucedo",
    "FLS Capital Advisors",
    "",
    `Reference ${reference}`,
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
