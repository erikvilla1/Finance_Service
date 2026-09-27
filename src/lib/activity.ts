import type { DocumentSource, DocumentStatus } from "@/types/database";

/**
 * The Overview's "Recent activity": what has happened on the file, newest
 * first, in the applicant's words.
 *
 * WHY. The question behind most "did you get it?" emails is whether an upload
 * arrived. A line that says "You uploaded Bank Statements · 2 hours ago"
 * answers it before it's asked.
 *
 * ONLY WHAT'S ALREADY RECORDED, and only the applicant's side of it: their
 * uploads and edits, and a specialist's accept or return of a document. No
 * pipeline status, no staff notes, nothing internal (spec §18).
 *
 * Pure, so it can be tested; the dashboard page gathers the inputs.
 */

export type ActivityKind = "started" | "application" | "uploaded" | "accepted" | "returned" | "signed";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  text: string;
  at: string;
}

export interface ActivityInput {
  startedAt: string;
  /** Latest save to the application form, if any. */
  applicationUpdatedAt: string | null;
  applicationComplete: boolean;
  items: {
    label: string;
    documents: {
      id: string;
      uploadedAt: string;
      verifiedAt: string | null;
      status: DocumentStatus;
      source: DocumentSource;
    }[];
  }[];
}

/** Uploads to the same item this close together read as one event. */
const BATCH_MS = 10 * 60 * 1000;

export function buildActivity(input: ActivityInput, limit = 6): ActivityEvent[] {
  const events: ActivityEvent[] = [
    { id: "started", kind: "started", text: "You started your application", at: input.startedAt },
  ];

  if (input.applicationUpdatedAt && input.applicationUpdatedAt > input.startedAt) {
    events.push({
      id: "application",
      kind: "application",
      text: input.applicationComplete ? "You completed your application" : "You updated your application",
      at: input.applicationUpdatedAt,
    });
  }

  for (const item of input.items) {
    const uploads = item.documents
      .filter((d) => d.source === "applicant_upload")
      .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));

    // Group a run of uploads into one line: "3 files for Bank Statements".
    let batch: typeof uploads = [];
    const flush = () => {
      if (batch.length === 0) return;
      const last = batch[batch.length - 1];
      events.push({
        id: `upload-${batch[0].id}`,
        kind: "uploaded",
        text:
          batch.length === 1
            ? `You uploaded ${item.label}`
            : `You uploaded ${batch.length} files for ${item.label}`,
        at: last.uploadedAt,
      });
      batch = [];
    };
    for (const upload of uploads) {
      const previous = batch[batch.length - 1];
      if (previous && Date.parse(upload.uploadedAt) - Date.parse(previous.uploadedAt) > BATCH_MS) flush();
      batch.push(upload);
    }
    flush();

    for (const document of item.documents) {
      if (document.source === "e_signature") {
        events.push({ id: `signed-${document.id}`, kind: "signed", text: "You signed your application", at: document.uploadedAt });
      }
      if (document.verifiedAt && document.status === "accepted") {
        events.push({ id: `accepted-${document.id}`, kind: "accepted", text: `${item.label} accepted`, at: document.verifiedAt });
      }
      if (document.verifiedAt && document.status === "rejected") {
        events.push({
          id: `returned-${document.id}`,
          kind: "returned",
          text: `Another copy of ${item.label} needed`,
          at: document.verifiedAt,
        });
      }
    }
  }

  // Several files accepted together read as one line per item, not one each.
  const seen = new Set<string>();
  return events
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter((event) => {
      const key = event.kind === "accepted" || event.kind === "returned" ? `${event.kind}:${event.text}` : event.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

/** "Just now", "12 min ago", "3 hours ago", "Yesterday", "4 days ago", "Sep 24". */
export function timeAgo(at: string, now: number = Date.now()): string {
  const minutes = Math.floor((now - Date.parse(at)) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
