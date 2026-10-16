import { Resend } from "resend";
import { EMAIL_LOGO_BASE64, EMAIL_LOGO_CID, EMAIL_LOGO_FILENAME } from "./logo";

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
const DEFAULT_FROM = "FLS Capital Advisors <onboarding@resend.dev>";

/**
 * The From header, always with the firm's name in front of the address.
 *
 * EMAIL_FROM was set in production as a bare address, and a bare address is
 * what every inbox then showed as the sender — "notifications@mail.…" in the
 * place where the firm's name belongs. A missing display name also counts
 * against a message in most junk filters. Whatever the variable holds, mail
 * leaves as "FLS Capital Advisors <address>" unless it already carries a name.
 */
export function fromHeader(configured: string | undefined): string {
  const value = configured?.trim();
  if (!value) return DEFAULT_FROM;
  if (value.includes("<")) return value;
  return `FLS Capital Advisors <${value}>`;
}

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
// admin@ is the one mailbox the firm reads (client, 10-16: everything routes
// to the admin inbox). It was help@, the address named in the 09.27 notes,
// but no such mailbox was ever confirmed to exist; a contact address in a
// footer that nobody reads is worse than none. The sending address may be a
// send-only domain, so without a reply-to a reply would vanish; this is the
// one address a person should land on, and the one the legal pages give.
export const CONTACT_ADDRESS = "admin@flscapitaladvisors.com";
const REPLY_TO = process.env.EMAIL_REPLY_TO || CONTACT_ADDRESS;

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
      from: fromHeader(process.env.EMAIL_FROM),
      to,
      subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo ?? REPLY_TO,
      // The logo, inside the message (see logo.ts). Referenced from wrapHtml
      // by Content-ID, so it shows with remote images still blocked.
      attachments: [
        { filename: EMAIL_LOGO_FILENAME, content: EMAIL_LOGO_BASE64, contentId: EMAIL_LOGO_CID },
      ],
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
 *
 * WHAT IT LOOKS LIKE, AND WHY. The first version was a white card with a red
 * button — no brand in it anywhere, and red is the colour of a warning, not of
 * this firm. The client's note was that an outbound email has to look and feel
 * legitimate: these land in the inbox of someone deciding whether to hand over
 * their bank statements. So: the mark the site uses, on the site's paper; one dark button, the same dark as the site's primary
 * action; the link written out underneath it, because a button is the thing
 * a cautious reader will not click, and a plain URL on the firm's domain is
 * the thing they will check; and a signature line with the one address that
 * reaches a person. Nothing internal — the reference code is the file's
 * name inside the admin and means nothing to the applicant (see
 * notifications.ts). The legal name is on every message because the
 * sending name is the trading name.
 */
export function wrapHtml(options: {
  heading: string;
  body: string;
  cta?: { label: string; href: string };
  footer?: string;
  /** Staff mail: internal, so no help line and no legal foot. */
  internal?: boolean;
  /** The small capitals above the heading, as on the portal's cards. */
  eyebrow?: string;
}): string {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  // THE PORTAL'S PALETTE, so a message reads as the dashboard it links to
  // (client, 10-16: "make consistent with the client dashboard theme").
  // The page is the portal's cream, the card its white panel with the same
  // hairline, the button its primary (brand-900), the eyebrow its
  // accent-800 small capitals, the type its ink scale. Hex rather than the
  // site's oklch tokens because mail clients read neither CSS variables nor
  // oklch; the values are those tokens converted, and are listed with their
  // names so a palette change on the site can be carried over by hand.
  const page = "#f6efe0"; // LIGHT_GRADIENT.base
  const card = "#ffffff";
  const hairline = "#e7e2d6"; // ink-200 at 70% over the cream
  const heading = "#121211"; // ink-900
  const text = "#424241"; // ink-700
  const muted = "#7d7d7d"; // ink-500
  const eyebrow = "#6a573e"; // accent-800
  const button = "#1f201b"; // brand-900
  const divider = "#dededd"; // ink-200

  // The mark the site uses, as an image, with the name as its alt text (the
  // styled alt text is the brand for anyone who has images off). It is in
  // the message as an inline attachment (sendEmail, logo.ts) and referenced
  // by Content-ID, so it shows with remote content blocked. Width and height
  // are attributes as well as styles because Outlook ignores the styles.
  const wordmark = `<img src="cid:${EMAIL_LOGO_CID}" alt="FLS Capital Advisors"
       width="112" height="58"
       style="display:block;width:112px;height:58px;border:0;outline:none;text-decoration:none;
              font-family:${font};font-size:12px;line-height:1.25;font-weight:700;letter-spacing:0.04em;color:${button};" />`;

  const cta = options.cta
    ? `<tr><td style="padding:6px 0 10px;">
         <table role="presentation" cellpadding="0" cellspacing="0" border="0">
           <tr><td style="background:${button};border-radius:12px;">
             <a href="${options.cta.href}"
                style="display:inline-block;font-family:${font};color:#ffffff;
                       text-decoration:none;padding:14px 22px;font-weight:600;
                       font-size:14px;line-height:1;">${options.cta.label}</a>
           </td></tr>
         </table>
       </td></tr>
       <tr><td style="padding:0 0 24px;font-family:${font};font-size:12px;
                      line-height:1.6;color:${muted};word-break:break-all;">
         Or copy this link into your browser:<br>
         <a href="${options.cta.href}" style="color:${muted};">${options.cta.href}</a>
       </td></tr>`
    : "";

  const foot = options.internal
    ? `<tr><td style="border-top:1px solid ${divider};padding-top:16px;
                      font-family:${font};font-size:12px;line-height:1.6;color:${muted};">
         ${options.footer ?? "Internal notification."}
       </td></tr>`
    : `<tr><td style="border-top:1px solid ${divider};padding-top:18px;
                      font-family:${font};font-size:14px;line-height:1.6;color:${text};">
         ${options.footer ? `<p style="margin:0 0 14px;">${options.footer}</p>` : ""}
         <p style="margin:0;">Questions? Reply to this email or write to
           <a href="mailto:${CONTACT_ADDRESS}" style="color:${button};font-weight:600;">${CONTACT_ADDRESS}</a>.
         </p>
       </td></tr>`;

  const legal = options.internal
    ? ""
    : `<tr><td align="center" style="padding:20px 24px 0;font-family:${font};
                                     font-size:11px;line-height:1.6;color:${muted};">
         Financial Lending Specialists D.B.A. FLS Capital Advisors.
         You are receiving this because you have a financing application with us.
       </td></tr>`;

  const kicker = options.eyebrow
    ? `<tr><td style="padding-bottom:10px;font-family:${font};font-size:11px;font-weight:700;
                      letter-spacing:0.12em;text-transform:uppercase;color:${eyebrow};">${options.eyebrow}</td></tr>`
    : "";

  // LIGHT ONLY, DECLARED. Left undeclared, a client in dark mode inverts
  // the design itself: the cream and white go dark, and the black mark,
  // being an image, stays black on the new dark ground. A dark version of
  // our own was tried and the client preferred the dashboard's look
  // everywhere, so the message declares that it supports light only, which
  // Apple Mail and the Outlook apps respect. Gmail's apps invert regardless;
  // the cream plate under the mark (logo.ts) is for them.
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  @media only screen and (max-width: 480px) {
    .fls-outer { padding: 20px 12px !important; }
    .fls-card { padding: 26px 22px 24px !important; }
    .fls-heading { font-size: 20px !important; }
  }
</style></head>
<body style="margin:0;padding:0;background:${page};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         class="fls-outer" style="background:${page};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;">
        <tr><td style="padding:0 0 14px;">${wordmark}</td></tr>
        <tr><td class="fls-card" style="background:${card};border:1px solid ${hairline};border-radius:20px;
                       padding:34px 36px 30px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${kicker}
            <tr><td class="fls-heading" style="padding-bottom:14px;font-family:${font};font-size:22px;
                           font-weight:700;letter-spacing:-0.01em;color:${heading};line-height:1.3;">${options.heading}</td></tr>
            <tr><td style="padding-bottom:22px;font-family:${font};font-size:15px;
                           line-height:1.65;color:${text};">${options.body}</td></tr>
            ${cta}
            ${foot}
          </table>
        </td></tr>
        ${legal}
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
