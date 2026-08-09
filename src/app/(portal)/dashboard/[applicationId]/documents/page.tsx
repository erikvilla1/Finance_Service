import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Badge,
  Card,
  Container,
  EmptyState,
  ProgressBar,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/crm";
import {
  DOCUMENT_STATUS_LABEL,
  documentStatusTone,
  loadChecklist,
  needsApplicant,
} from "@/lib/documents/checklist";
import { UploadControl, UploadedFile } from "./upload-controls";

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
 * There is no ownership check in this file. RLS scopes both queries to
 * applications the caller owns, so a guessed id returns nothing and falls
 * through to notFound() — which is also the honest answer, since "this exists
 * but isn't yours" is itself a disclosure.
 */
export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, reference_code, financing_goal")
    .eq("id", applicationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!application) notFound();

  const checklist = await loadChecklist(supabase, applicationId);

  if (!checklist || checklist.items.length === 0) {
    return (
      <Container>
        <div className="mx-auto max-w-3xl">
          <BackLink />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900">
            Your documents
          </h1>
          <div className="mt-8">
            <EmptyState
              title="Nothing to send yet"
              description="When your specialist needs paperwork from you, it will appear here with instructions."
            />
          </div>
        </div>
      </Container>
    );
  }

  const { outstanding, requiredSettled, requiredTotal } = checklist;

  return (
    <Container>
      <div className="mx-auto max-w-3xl">
        <BackLink />

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900">
          Your documents
        </h1>
        <p className="mt-1 font-mono text-sm text-ink-500">
          {application.reference_code}
          {application.financing_goal ? ` · ${application.financing_goal}` : ""}
        </p>

        <Card className="mt-6">
          <p className="text-lg font-semibold text-ink-900">
            {outstanding === 0
              ? "You're all caught up"
              : outstanding === 1
                ? "One item still to send"
                : `${outstanding} items still to send`}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            {outstanding === 0
              ? "We have everything we've asked for so far. If we need anything else, it will show up here."
              : "Photos of paper are fine as long as every corner is in the frame and the text is readable."}
          </p>

          <div className="mt-5">
            <ProgressBar
              value={requiredSettled}
              max={requiredTotal}
              label="Required documents complete"
            />
          </div>
        </Card>

        <ul className="mt-6 space-y-4">
          {checklist.items.map((item) => {
            const open = needsApplicant(item.status);

            return (
              <Card as="li" key={item.requestId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-ink-900">
                      {item.label}
                      {!item.isRequired && (
                        <span className="ml-2 text-sm font-normal text-ink-500">
                          optional
                        </span>
                      )}
                    </h2>
                    {(item.instructions ?? item.description) && (
                      <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-600">
                        {item.instructions ?? item.description}
                      </p>
                    )}
                  </div>
                  <Badge tone={documentStatusTone(item.status)}>
                    {DOCUMENT_STATUS_LABEL[item.status]}
                  </Badge>
                </div>

                {item.dueDate && open && (
                  <p className="mt-2 text-sm text-warning-700">
                    Needed by {formatDate(item.dueDate)}
                  </p>
                )}

                {item.documents.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {item.documents.map((document) => (
                      <UploadedFile
                        key={document.id}
                        applicationId={applicationId}
                        document={document}
                      />
                    ))}
                  </ul>
                )}

                {/* Still offered once something has been sent. A second copy is
                    often exactly what is needed, and hiding the control after
                    one upload means a mistake can only be fixed by phone. */}
                {item.status !== "waived" && (
                  <UploadControl
                    applicationId={applicationId}
                    requestId={item.requestId}
                    documentTypeKey={item.key}
                    label={item.documents.length > 0 ? "another file" : "file"}
                  />
                )}
              </Card>
            );
          })}
        </ul>

        <p className="mt-8 text-sm text-ink-600">
          Not sure about something on this list?{" "}
          <Link
            href="/contact"
            className="font-semibold text-brand-700 hover:underline"
          >
            Talk with your specialist
          </Link>
        </p>
      </div>
    </Container>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard"
      className="text-sm font-semibold text-brand-700 hover:underline"
    >
      ← Your applications
    </Link>
  );
}
