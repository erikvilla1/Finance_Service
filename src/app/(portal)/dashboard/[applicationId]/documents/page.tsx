import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
    .select("id, reference_code, financing_goal, signature_requested_at")
    .eq("id", applicationId)
    .eq("profile_id", user.id)
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
  const allSettled = requiredTotal > 0 && requiredSettled === requiredTotal;

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
          {/*
            Three states, not two. "Nothing outstanding" and "everything has
            been checked and accepted" feel the same to this page but are very
            different to the person reading it: one means we are looking, the
            other means we are done looking. Collapsing them left someone who
            had just been accepted staring at the same sentence as someone
            whose upload had not been opened yet.
          */}
          <p className="text-lg font-semibold text-ink-900">
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

                {/*
                  The signed application is produced by signing, not by
                  uploading. When it needs the applicant again — released and
                  not yet signed, or signed and sent back — the door to open is
                  the signing page, where the prefilled document, the reason it
                  came back, and the signature pad all live. The upload control
                  stays underneath as the paper route: someone who printed and
                  signed by hand sends their scan through it.
                */}
                {item.key === "signed_application" &&
                  application.signature_requested_at &&
                  open && (
                    <div className="mt-4 rounded-lg bg-ink-50 p-4">
                      <Link
                        href={`/dashboard/${applicationId}/sign`}
                        className="text-sm font-semibold text-brand-700 hover:underline"
                      >
                        {item.documents.length > 0
                          ? "Review and sign again →"
                          : "Review and sign →"}
                      </Link>
                      <p className="mt-1 text-sm leading-relaxed text-ink-600">
                        Your application is prefilled and ready — signing it
                        takes a couple of minutes. Rather sign on paper? Ask
                        your specialist for a copy to print, then upload the
                        signed pages below.
                      </p>
                    </div>
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
