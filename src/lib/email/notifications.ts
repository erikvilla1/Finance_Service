import { createServiceRoleClient } from "@/lib/supabase/server";
import { absoluteUrl, sendEmail, wrapHtml, type SendOutcome } from "./send";

/**
 * The four things worth interrupting someone for.
 *
 * Every one of these replaces a silence. Before this, an applicant learned
 * their application was ready to sign by happening to log in, and Robert
 * learned a document had arrived by happening to look. BUSINESS_CONTEXT §8:
 * the checklist is where deals die — not because people refuse to send things,
 * but because nobody knows whose turn it is.
 *
 * WHAT IS DELIBERATELY NOT SENT. No "we received your application", no weekly
 * digest, no "just checking in". Every email here is either a thing the
 * recipient has to do, or the end of a wait they know they are in. Mail that
 * can be ignored teaches people to ignore the mail that cannot.
 *
 * Reads run on the service role because these fire from contexts where the
 * acting user is staff and the recipient is the applicant — a per-user client
 * would see the sender's rows, not the reader's. Nothing here is written.
 */

interface Recipient {
  email: string;
  name: string | null;
  businessName: string | null;
  referenceCode: string;
}

/** Who to write to, and what to call them. */
async function recipientFor(applicationId: string): Promise<Recipient | null> {
  const service = createServiceRoleClient();

  const { data: application } = await service
    .from("applications")
    .select("id, reference_code, profile_id, business_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application?.profile_id) return null;

  const [{ data: profile }, { data: business }, { data: owner }] = await Promise.all([
    service
      .from("profiles")
      .select("email, full_name")
      .eq("id", application.profile_id)
      .maybeSingle(),
    application.business_id
      ? service
          .from("businesses")
          .select("legal_name")
          .eq("id", application.business_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    service
      .from("application_owners")
      .select("full_name")
      .eq("application_id", applicationId)
      .eq("is_primary", true)
      .maybeSingle(),
  ]);

  if (!profile?.email) return null;

  return {
    email: profile.email,
    // The owner named on the application first, for the same reason the
    // pipeline uses it: a bookkeeper often creates the login.
    name: owner?.full_name ?? profile.full_name ?? null,
    businessName: business?.legal_name ?? null,
    referenceCode: application.reference_code,
  };
}

function greeting(recipient: Recipient): string {
  const first = recipient.name?.trim().split(/\s+/)[0];
  return first ? `Hi ${first},` : "Hello,";
}

/**
 * How a file identifies itself in staff mail.
 *
 * SEPARATE FROM recipientFor ON PURPOSE. That function answers "who do we write
 * to", and gives up when an application has no profile — correctly, because
 * there is no customer address to write to yet. Staff mail has its own address
 * and needs none of that: it needs a name and a reference code, and both exist
 * from the moment the prequal row is inserted, which is before any account is
 * created.
 *
 * Routing staff mail through recipientFor made the earliest alert — a lead that
 * has not signed up yet, and the most perishable thing in the pipeline — arrive
 * as "An applicant" with no reference code and no way to find the file.
 */
async function fileSummary(
  applicationId: string,
): Promise<{ referenceCode: string | null; who: string }> {
  const service = createServiceRoleClient();

  const { data: application } = await service
    .from("applications")
    .select("reference_code, profile_id, business_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) return { referenceCode: null, who: "An applicant" };

  const [{ data: business }, { data: owner }, { data: profile }] = await Promise.all([
    application.business_id
      ? service
          .from("businesses")
          .select("legal_name")
          .eq("id", application.business_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    service
      .from("application_owners")
      .select("full_name")
      .eq("application_id", applicationId)
      .eq("is_primary", true)
      .maybeSingle(),
    application.profile_id
      ? service
          .from("profiles")
          .select("full_name, email")
          .eq("id", application.profile_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    referenceCode: application.reference_code,
    // The business first — it is what Robert calls the file. A person's name is
    // the next best thing, and the email address is better than nothing at the
    // prequal stage, where a business name is optional.
    who:
      business?.legal_name ??
      owner?.full_name ??
      profile?.full_name ??
      profile?.email ??
      application.reference_code ??
      "An applicant",
  };
}

// -----------------------------------------------------------------------------
// APPLICANT
// -----------------------------------------------------------------------------

/**
 * The application is ready to sign.
 *
 * The highest-value message here by some distance. Signing is the last thing
 * standing between a finished file and a lender, it takes two minutes, and
 * until now the only way to discover it was needed was to log in and look.
 */
export async function notifySignatureRequested(
  applicationId: string,
): Promise<SendOutcome> {
  const recipient = await recipientFor(applicationId);
  if (!recipient) return { sent: false, reason: "no_recipient" };

  const url = absoluteUrl(`/dashboard/${applicationId}/sign`);
  const subject = "Your financing application is ready to sign";

  const body = `Your specialist has reviewed everything and your funding application is ready for your signature. It is the last thing we need before your file can go to a funding source, and it takes a couple of minutes.`;

  return sendEmail({
    to: recipient.email,
    subject,
    text: `${greeting(recipient)}

${body}

Sign here: ${url}

Reference ${recipient.referenceCode}

Would you rather sign on paper? There is no charge either way — just reply and we will send you a copy to print.`,
    html: wrapHtml({
      heading: "Ready for your signature",
      body: `<p style="margin:0 0 12px;">${greeting(recipient)}</p><p style="margin:0;">${body}</p>`,
      cta: { label: "Review and sign", href: url },
      footer: `Reference ${recipient.referenceCode}. Would you rather sign on paper? There is no charge either way — reply to this email and we will send you a copy to print.`,
    }),
  });
}

/**
 * A document needs sending again, and why.
 *
 * The reason travels with the message. Telling someone a document was rejected
 * without saying what was wrong produces the same document again, and the
 * second round trip is as wasted as the first.
 *
 * THE SIGNED APPLICATION IS THE EXCEPTION. It is produced by signing, not by
 * uploading — so when it is the thing that came back, the message says "sign
 * again" and the button opens the signing page, where the prefilled document
 * and the reason are waiting. Sending that person to an upload control asks
 * them to fix a signature with a file picker.
 */
export async function notifyDocumentReturned(
  applicationId: string,
  documentLabel: string,
  reason: string,
  documentTypeKey?: string | null,
): Promise<SendOutcome> {
  const recipient = await recipientFor(applicationId);
  if (!recipient) return { sent: false, reason: "no_recipient" };

  if (documentTypeKey === "signed_application") {
    const url = absoluteUrl(`/dashboard/${applicationId}/sign`);

    return sendEmail({
      to: recipient.email,
      subject: "Your application needs to be signed again",
      text: `${greeting(recipient)}

Your specialist looked at your signed application and needs you to review it and sign again.

What they said: ${reason}

Review and sign here: ${url}

Reference ${recipient.referenceCode}

Would you rather sign on paper? There is no charge either way — just reply and we will send you a copy to print.`,
      html: wrapHtml({
        heading: "Please review and sign again",
        body: `<p style="margin:0 0 12px;">${greeting(recipient)}</p>
               <p style="margin:0 0 12px;">Your specialist looked at your signed application and needs you to review it and sign again. It takes a couple of minutes.</p>
               <p style="margin:0;padding:12px 14px;background:#f6f6f5;border-radius:8px;">${reason}</p>`,
        cta: { label: "Review and sign", href: url },
        footer: `Reference ${recipient.referenceCode}. Would you rather sign on paper? There is no charge either way — reply to this email and we will send you a copy to print.`,
      }),
    });
  }

  const url = absoluteUrl(`/dashboard/${applicationId}/documents`);
  const subject = `We need another copy of one document`;

  return sendEmail({
    to: recipient.email,
    subject,
    text: `${greeting(recipient)}

Your specialist looked at the ${documentLabel} you sent and needs another copy.

What they said: ${reason}

You can upload the replacement here: ${url}

Reference ${recipient.referenceCode}`,
    html: wrapHtml({
      heading: "One document needs another copy",
      body: `<p style="margin:0 0 12px;">${greeting(recipient)}</p>
             <p style="margin:0 0 12px;">Your specialist looked at the <strong>${documentLabel}</strong> you sent and needs another copy.</p>
             <p style="margin:0;padding:12px 14px;background:#f6f6f5;border-radius:8px;">${reason}</p>`,
      cta: { label: "Send a replacement", href: url },
      footer: `Reference ${recipient.referenceCode}. Reply to this email if anything is unclear.`,
    }),
  });
}

/**
 * Everything asked for has been accepted.
 *
 * Sent once, when the last outstanding item settles. The end of a wait the
 * applicant knows they are in, which is the test for whether a notification
 * earns its place.
 */
export async function notifyDocumentsComplete(
  applicationId: string,
): Promise<SendOutcome> {
  const recipient = await recipientFor(applicationId);
  if (!recipient) return { sent: false, reason: "no_recipient" };

  const url = absoluteUrl(`/dashboard/${applicationId}/documents`);

  return sendEmail({
    to: recipient.email,
    subject: "We have everything we asked for",
    text: `${greeting(recipient)}

Your specialist has checked the documents you sent and has everything they asked for. There is nothing you need to do right now — we will be in touch as your file progresses.

Your documents: ${url}

Reference ${recipient.referenceCode}`,
    html: wrapHtml({
      heading: "We have everything we asked for",
      body: `<p style="margin:0 0 12px;">${greeting(recipient)}</p>
             <p style="margin:0;">Your specialist has checked the documents you sent and has everything they asked for. There is nothing you need to do right now — we will be in touch as your file progresses.</p>`,
      cta: { label: "View your documents", href: url },
      footer: `Reference ${recipient.referenceCode}.`,
    }),
  });
}

// -----------------------------------------------------------------------------
// STAFF
// -----------------------------------------------------------------------------

/**
 * Something arrived and needs a person.
 *
 * Goes to STAFF_NOTIFICATION_EMAIL rather than to whoever is assigned, because
 * assignment is often nobody early on and an unassigned file is exactly the one
 * that goes cold. One address is also one thing to change when Robert takes on
 * a second specialist.
 */
export async function notifyStaff(
  applicationId: string,
  event: string,
  detail: string,
): Promise<SendOutcome> {
  const to = process.env.STAFF_NOTIFICATION_EMAIL;
  if (!to) return { sent: false, reason: "no_staff_address" };

  const { who, referenceCode } = await fileSummary(applicationId);
  const url = absoluteUrl(`/admin/applications/${applicationId}`);

  return sendEmail({
    to,
    subject: `${event} — ${who}`,
    text: `${event}

${who}${referenceCode ? ` (${referenceCode})` : ""}
${detail}

Open the file: ${url}`,
    html: wrapHtml({
      heading: event,
      body: `<p style="margin:0 0 8px;"><strong>${who}</strong>${
        referenceCode ? ` &middot; ${referenceCode}` : ""
      }</p><p style="margin:0;">${detail}</p>`,
      cta: { label: "Open the file", href: url },
      footer: "Internal notification.",
    }),
  });
}
