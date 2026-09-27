import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { Panel, Pill, primaryButton, type PillTone } from "@/components/portal/ui";
import { formatDate } from "@/lib/crm";
import { DOCUMENT_STATUS_LABEL, needsApplicant, type ChecklistItem } from "@/lib/documents/checklist";
import { UploadControl, UploadedFile } from "./upload-controls";

/**
 * One document on the checklist, and the progress bar for the whole list.
 * Split from page.tsx so the page stays about loading and grouping.
 */

export type Group = "needed" | "with_specialist" | "done";

export const GROUP_LABEL: Record<Group, string> = {
  needed: "Needed",
  with_specialist: "With your specialist",
  done: "Done",
};

const ITEM_TONE: Record<ChecklistItem["status"], PillTone> = {
  requested: "todo",
  rejected: "attention",
  uploaded: "waiting",
  under_review: "waiting",
  accepted: "done",
  waived: "todo",
};

export function DocumentItem({
  item,
  group,
  applicationId,
  signatureRequested,
}: {
  item: ChecklistItem;
  group: Group;
  applicationId: string;
  signatureRequested: boolean;
}) {
  const open = needsApplicant(item.status);
  // Why it came back, in the specialist's words, from the latest returned file.
  const returnedNote =
    item.status === "rejected" ? item.documents.find((d) => d.status === "rejected")?.note ?? null : null;

  return (
    <Panel
      as="li"
      className={`sm:p-6 ${item.status === "rejected" ? "ring-2 ring-warning-600/40" : ""} ${
        group === "done" ? "bg-white/70" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink-900">
            {item.label}
            {!item.isRequired && <span className="ml-2 text-sm font-normal text-ink-500">optional</span>}
          </h3>
          {group !== "done" && (item.instructions ?? item.description) && (
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-600">
              {item.instructions ?? item.description}
            </p>
          )}
        </div>
        <Pill tone={ITEM_TONE[item.status]}>{DOCUMENT_STATUS_LABEL[item.status]}</Pill>
      </div>

      {item.status === "rejected" && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-warning-50 px-3.5 py-3 text-sm leading-relaxed text-warning-700">
          <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-semibold">Your specialist needs another copy.</span>{" "}
            {returnedNote ?? "Something on the last one needs another look. Please send it again."}
          </span>
        </div>
      )}

      {item.dueDate && open && (
        <p className="mt-2 text-sm text-warning-700">Needed by {formatDate(item.dueDate)}</p>
      )}

      {item.documents.length > 0 && (
        <ul className="mt-4 space-y-2">
          {item.documents.map((document) => (
            <UploadedFile key={document.id} applicationId={applicationId} document={document} />
          ))}
        </ul>
      )}

      {/*
        The signed application is produced by signing, not by uploading. When it
        needs the applicant again — released and not yet signed, or signed and
        sent back — the door to open is the signing page, where the prefilled
        document, the reason it came back, and the signature pad all live. The
        upload control stays underneath as the paper route: someone who printed
        and signed by hand sends their scan through it.
      */}
      {item.key === "signed_application" && signatureRequested && open && (
        <div className="mt-4 rounded-xl bg-ink-50 p-4">
          <Link href={`/dashboard/${applicationId}/sign`} className={`${primaryButton} h-10`}>
            {item.documents.length > 0 ? "Review and sign again" : "Review and sign"}
          </Link>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Your application is prefilled and ready. Signing it takes a couple of
            minutes. Rather sign on paper? Ask your specialist for a copy to
            print, then upload the signed pages below.
          </p>
        </div>
      )}

      {/* Still offered once something has been sent. A second copy is often
          exactly what is needed, and hiding the control after one upload means
          a mistake can only be fixed by phone. Not on finished items: if more
          is needed there, the specialist reopens it and it moves to Needed. */}
      {group !== "done" && (
        <UploadControl
          applicationId={applicationId}
          requestId={item.requestId}
          documentTypeKey={item.key}
          label={item.label}
          compact={!open}
        />
      )}
    </Panel>
  );
}

/**
 * Two measures on one bar, both labelled: what you've sent (light) and what
 * your specialist has finished with (dark, "Done").
 *
 * It used to show only the second, "Required documents complete", which is
 * right about the file (an upload nobody has opened isn't done) but read as
 * broken from the applicant's side: send four of eight and the bar sat at
 * 0 of 8 while the heading above it said four were left. The count people
 * read first is now the one that moves when they act.
 */
export function DocumentsProgress({ total, sent, done }: { total: number; sent: number; done: number }) {
  const pct = (n: number) => `${Math.min(100, Math.round((n / Math.max(total, 1)) * 100))}%`;
  const checking = Math.max(0, sent - done);

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-ink-700">Required documents sent</span>
        <span className="tabular-nums text-ink-500">
          {sent} of {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={sent}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuetext={`${sent} of ${total} sent, ${done} done`}
        aria-label="Required documents sent"
        className="relative h-2 w-full overflow-hidden rounded-full bg-ink-200"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-600/35 transition-all duration-500 ease-out"
          style={{ width: pct(sent) }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-600 transition-all duration-500 ease-out"
          style={{ width: pct(done) }}
        />
      </div>
      {sent > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-600" />
            {done} done
          </span>
          {checking > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-600/35" />
              {checking} with your specialist to check
            </span>
          )}
        </p>
      )}
    </div>
  );
}
