import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Email confirmation landing point.
 *
 * Clicking the link in a Supabase confirmation email does NOT sign anyone in.
 * It returns them here carrying a single-use credential that has to be
 * exchanged for a session, and this route is what performs that exchange and
 * writes the session cookies.
 *
 * BOTH SHAPES ARE HANDLED, deliberately:
 *
 *   • token_hash + type — produced when the email template uses {{ .TokenHash }}.
 *     This is what Supabase recommends for server-side auth and it is the one
 *     that survives the applicant opening the link on a different device from
 *     the one they signed up on, which is extremely common: people fill in forms
 *     on a laptop and check email on their phone.
 *
 *   • code — the PKCE flow, produced by the default template. It requires the
 *     code-verifier cookie set at signup, so it only works in the SAME browser.
 *     Supported because it is the out-of-the-box behaviour, but the token_hash
 *     template is the one to switch to before launch.
 *
 * Set the template under Authentication → Emails → Confirm signup:
 *
 *   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard">
 *     Confirm your email
 *   </a>
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  // Where to land after a successful confirmation. Validated to a same-site
  // path: an unchecked `next` is an open redirect, and this URL arrives from an
  // email, which is exactly the vector a phisher would use.
  const requestedNext = searchParams.get("next") ?? "/dashboard";
  const next =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard";

  // Prefer the configured site URL over the request origin so a proxied or
  // rewritten host cannot bounce the applicant somewhere unintended.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, base));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, base));
  }

  // Expired, already used, or opened in a browser without the verifier cookie.
  // All three are recoverable by signing in, so say so rather than showing a
  // raw error.
  return NextResponse.redirect(new URL("/auth/link-problem", base));
}
