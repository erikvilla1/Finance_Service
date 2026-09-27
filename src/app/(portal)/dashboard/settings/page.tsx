import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, panelClass } from "@/components/portal/ui";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

/**
 * Account settings: your name and phone (editable) and your password.
 *
 * Nothing here repeats the frame: the tour ("How this works"), messaging your
 * specialist (his card) and signing out (top right) are all one click away on
 * every page, so they aren't listed again.
 *
 * EMAIL STAYS READ-ONLY. It's the sign-in address, and changing it means
 * re-verifying with Supabase Auth; until that flow exists the specialist
 * changes it, and the page says so rather than showing a field that looks
 * editable and isn't.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/dashboard/settings");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single();

  const card = panelClass;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Your profile and password." />

      <div className="mt-8 space-y-6">
        <section aria-labelledby="profile-title" className={card}>
          <h2 id="profile-title" className="text-base font-semibold text-ink-900">
            Profile
          </h2>
          <ProfileForm
            fullName={profile?.full_name ?? ""}
            phone={profile?.phone ?? ""}
            email={profile?.email ?? user.email ?? ""}
          />
        </section>

        <section aria-labelledby="security-title" className={card}>
          <h2 id="security-title" className="text-base font-semibold text-ink-900">
            Password
          </h2>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-ink-600">
              We&apos;ll email you a secure link to set a new one.
            </p>
            <Link
              href="/sign-in/forgot"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 transition-colors hover:ring-ink-400"
            >
              <KeyRound aria-hidden="true" className="h-4 w-4 text-ink-500" />
              Change password
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
