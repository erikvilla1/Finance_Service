"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Catches a password-recovery link that landed on the wrong page.
 *
 * WHY THIS EXISTS. Supabase's default reset template uses `{{ .ConfirmationURL }}`,
 * which sends people to the site root with the tokens in a URL *hash fragment*:
 *
 *   https://example.com/#access_token=…&refresh_token=…&type=recovery
 *
 * A hash is never sent to the server. So the app receives a plain request for
 * the home page, renders it, and the person stares at a marketing site
 * wondering where the password form went. Nothing errors, nothing logs, and the
 * link looks broken.
 *
 * The documented fix is to rewrite the email template to point at
 * /auth/confirm with a token_hash — and that is still worth doing, because it
 * survives the link being opened on a different device. But a recovery flow
 * that only works if someone remembered to edit a template in a dashboard is a
 * recovery flow that will be broken again the next time a project is set up.
 * This makes the default work too.
 *
 * Mounted in the root layout so it catches the landing wherever Supabase sends
 * it. Costs nothing on every other page load: the first line reads a string and
 * returns.
 *
 * Deliberately narrow. It acts only on `type=recovery`, never on any other hash,
 * and it does not attempt to be a general session-from-URL handler — /auth/confirm
 * is that, for the query-parameter flow it was written for.
 */
export function RecoveryRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("type=recovery")) return;

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) return;

    let cancelled = false;
    const supabase = createClient();

    // setSession writes the cookies the server reads, so /auth/reset sees an
    // authenticated user on the very next request. Without this the tokens
    // would live only in the fragment and die with the navigation.
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (cancelled) return;

        // Strip the fragment before navigating. Tokens in an address bar get
        // copied into support tickets, screenshots and browser history, and
        // this one is a live session.
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );

        // On failure send them somewhere that explains rather than to a form
        // that will refuse them — an expired or reused link is the ordinary
        // outcome here, not an exception.
        router.replace(error ? "/auth/link-problem" : "/auth/reset");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
