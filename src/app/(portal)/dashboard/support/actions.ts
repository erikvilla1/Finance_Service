"use server";

import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, sendEmail, wrapHtml } from "@/lib/email/send";

/**
 * A message from an applicant to their specialist, sent as an email.
 *
 * EMAIL, NOT A MESSAGES TABLE. It goes to the staff inbox with the applicant
 * as Reply-To, so Robert answers from his own mail client and the thread
 * lives there. Nothing is written to the database. The trade-off is that the
 * conversation isn't visible in the portal; a stored thread is the upgrade if
 * that's ever wanted.
 *
 * The sender is whoever is signed in, read from the session, never from the
 * form, so a message can't be sent in someone else's name.
 */

export type SupportState = { sent?: boolean; error?: string };

const TOPICS: Record<string, string> = {
  application: "My application",
  documents: "My documents",
  status: "Where my file stands",
  other: "Something else",
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export async function sendSupportMessage(
  _prev: SupportState,
  formData: FormData,
): Promise<SupportState> {
  const topicKey = String(formData.get("topic") ?? "");
  const topic = TOPICS[topicKey];
  const message = String(formData.get("message") ?? "").trim();

  if (!topic) return { error: "Choose what your message is about." };
  if (message.length < 10) return { error: "Add a little more detail so we can help." };
  if (message.length > 4000) return { error: "That message is a bit long. Keep it under 4,000 characters." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has ended. Sign in again to send a message." };

  const [{ data: profile }, { data: application }] = await Promise.all([
    supabase.from("profiles").select("full_name, email, phone").eq("id", user.id).single(),
    supabase
      .from("applications")
      .select("id, reference_code, financing_goal")
      .eq("profile_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const to = process.env.STAFF_NOTIFICATION_EMAIL;
  if (!to) {
    return {
      error:
        "Messages can't be sent from the dashboard right now. Please try again later.",
    };
  }

  const name = profile?.full_name ?? "An applicant";
  const email = profile?.email ?? user.email ?? "";
  // Added in Settings, and optional. When it's there, a call can be quicker.
  const phone = profile?.phone ?? null;
  const reference = application?.reference_code ?? null;
  const fileUrl = application ? absoluteUrl(`/admin/applications/${application.id}`) : null;

  const outcome = await sendEmail({
    to,
    replyTo: email || undefined,
    subject: `Message from ${name}: ${topic}${reference ? ` (${reference})` : ""}`,
    text: `${name}${email ? ` <${email}>` : ""} sent a message from their dashboard.

Topic: ${topic}
${phone ? `Phone: ${phone}\n` : ""}${reference ? `File: ${reference}${application?.financing_goal ? ` · ${application.financing_goal}` : ""}\n` : ""}
${message}

Reply to this email to answer them directly.${fileUrl ? `\nOpen the file: ${fileUrl}` : ""}`,
    html: wrapHtml({
      heading: `Message from ${escapeHtml(name)}`,
      body: `<p style="margin:0 0 6px;"><strong>Topic:</strong> ${escapeHtml(topic)}</p>${
        phone ? `<p style="margin:0 0 6px;"><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ""
      }${
        reference
          ? `<p style="margin:0 0 14px;"><strong>File:</strong> ${escapeHtml(reference)}${
              application?.financing_goal ? ` &middot; ${escapeHtml(application.financing_goal)}` : ""
            }</p>`
          : ""
      }<p style="margin:0 0 14px;white-space:pre-wrap;">${escapeHtml(message)}</p><p style="margin:0;color:#6b6b6b;">Reply to this email to answer ${escapeHtml(
        name,
      )} directly.</p>`,
      cta: fileUrl ? { label: "Open the file", href: fileUrl } : undefined,
      footer: "Sent from the client dashboard.",
    }),
  });

  if (!outcome.sent) {
    return { error: "We couldn't send that just now. Please try again in a moment." };
  }
  return { sent: true };
}
