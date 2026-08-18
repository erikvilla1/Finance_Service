import { Resend } from "resend";

/**
 * Sending mail.
 *
 * TWO RULES, AND THE FIRST ONE MATTERS MORE THAN THE FEATURE.
 *
 * 1. AN EMAIL NEVER BREAKS THE THING THAT TRIGGERED IT. A specialist accepting
 *    a document must succeed whether or not Resend is reachable, whether or not
 *    the applicant has an address on file, whether or not the API key is set.
 *    Everything here returns rather than throws, and the caller is not asked to
 *    handle a failure it cannot do anything about. The alternative — an accepted
 *    document rolling back because a mail server was slow — is worse than a
 *    missing notification in every case.
 *
 * 2. WHILE NO DOMAIN IS VERIFIED, NOTHING REACHES A REAL PERSON. Resend's
 *    onboarding sender only delivers to the account owner, so a stray send is
 *    already unlikely — but "unlikely" is not a control, and this is an
 *    application whose emails say things like "your application is ready to
 *    sign". EMAIL_REDIRECT_TO forces every message to one inbox and marks the
 *    subject, so a test run cannot mail an applicant and it is obvious at a
 *    glance which mode you are in.
 *
 * Turning on real sending is three environment variables and no code change:
 * set EMAIL_FROM to the verified domain and remove EMAIL_REDIRECT_TO.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain text. Always sent — some clients prefer it, and it is the fallback. */
  text: string;
  html: string;
  replyTo?: string;
}

export type SendOutcome =
  | { sent: true; id: string | null }
  | { sent: false; reason: string };

/**
 * Resend's shared sender, which delivers only to the account owner.
 *
 * A safe default rather than a placeholder: if EMAIL_FROM is never set, the
 * worst case is mail that goes nowhere useful, not mail that goes to an
 * applicant from an unverified address.
 */
const DEFAULT_FROM = "Financial Lending Specialists <onboarding@resend.dev>";

/**
 * Where a reply goes.
 *
 * THE SENDING ADDRESS IS NOT A MAILBOX. Mail goes out as
 * notifications@mail.flscapitaladvisors.com because that is the domain verified
 * for sending — but nothing receives there, and an applicant who hits Reply on
 * "your application is ready to sign" is answering a real question to an
 * address that silently drops it. That reply is the most engaged message a
 * customer will ever send, and losing it is worse than sending nothing.
 *
 * EMAIL_REPLY_TO points at an inbox a person actually reads. Set it to a
 * staff address; while there is no FLS mailbox it can be a personal one.
 *
 * A caller can still override per-message — notifyStaff has no reason to send
 * staff replies to the applicant-facing address.
 */
const REPLY_TO = process.env.EMAIL_REPLY_TO;

export async function sendEmail(message: EmailMessage): Promise<SendOutcome> {
  const apiKey = process.env.RESEND_API_KEY;

  // Not an error. Local development without a key should behave exactly like
  // production with one, minus the sending.
  if (!apiKey) {
    console.info("[email] no RESEND_API_KEY; not sending:", message.subject);
    return { sent: false, reason: "no_api_key" };
  }

  if (!message.to) {
    console.info("[email] no recipient for:", message.subject);
    return { sent: false, reason: "no_recipient" };
  }

  const redirect = process.env.EMAIL_REDIRECT_TO;
  const to = redirect || message.to;

  // The original recipient is preserved in the subject rather than dropped,
  // because "did this go to the right person" is the thing being tested.
  const subject = redirect
    ? `[dev → ${message.to}] ${message.subject}`
    : message.subject;

  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to,
      subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo ?? REPLY_TO,
    });

    if (error) {
      // Logged with the subject rather than the body: these messages carry
      // names, reference codes and amounts, and a log is a place data goes to
      // be forgotten about.
      console.error("[email] send failed:", message.subject, error.message);
      return { sent: false, reason: error.message };
    }

    return { sent: true, id: data?.id ?? null };
  } catch (cause) {
    console.error("[email] threw:", message.subject, cause);
    return { sent: false, reason: "exception" };
  }
}

/**
 * The shared wrapper every message renders into.
 *
 * Deliberately plain HTML with inline styles. Email clients are a decade behind
 * browsers — Outlook still renders through Word — so a stylesheet, a flexbox or
 * a web font is a message that arrives looking broken to the one recipient who
 * matters. Tables and inline styles are ugly and they work everywhere.
 */
export function wrapHtml(options: {
  heading: string;
  body: string;
  cta?: { label: string; href: string };
  footer?: string;
}): string {
  const cta = options.cta
    ? `<tr><td style="padding:8px 0 24px;">
         <a href="${options.cta.href}"
            style="display:inline-block;background:#e62427;color:#ffffff;
                   text-decoration:none;padding:12px 22px;border-radius:8px;
                   font-weight:600;font-size:15px;">${options.cta.label}</a>
       </td></tr>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f6f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:#f6f6f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border-radius:14px;
                    padding:32px;font-family:-apple-system,BlinkMacSystemFont,
                    'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2b2b2b;">
        <tr><td style="padding-bottom:8px;font-size:13px;font-weight:700;
                       letter-spacing:0.04em;color:#1d1d1b;">
          FINANCIAL LENDING SPECIALISTS
        </td></tr>
        <tr><td style="padding:8px 0 12px;font-size:21px;font-weight:700;
                       color:#1d1d1b;line-height:1.3;">${options.heading}</td></tr>
        <tr><td style="padding-bottom:20px;font-size:15px;line-height:1.6;
                       color:#3f3f3d;">${options.body}</td></tr>
        ${cta}
        <tr><td style="border-top:1px solid #e8e8e6;padding-top:16px;
                       font-size:12px;line-height:1.6;color:#7e7d7d;">
          ${options.footer ?? "This message was sent by Financial Lending Specialists regarding your financing application."}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Absolute URL for a link in an email.
 *
 * A relative path in an inbox is a dead link, and NEXT_PUBLIC_SITE_URL being
 * wrong is the single most likely reason an otherwise working email is useless
 * — which is why the deploy has to come before this feature does.
 */
export function absoluteUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
