import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ChevronDown, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/portal/ui";
import { SupportForm } from "./support-form";

export const metadata: Metadata = {
  title: "Support",
  robots: { index: false, follow: false },
};

/**
 * Support: message the specialist, and the answers to what people ask most.
 *
 * Replaces the "Talk with your specialist" links, which pointed at the public
 * contact page and felt like being sent out of the portal. The message goes
 * to Robert as an email (see actions.ts); he replies by email.
 *
 * The answers are careful not to promise timelines or outcomes (spec §5, §26).
 */

const QUESTIONS = [
  {
    q: "How long does a review take?",
    a: "It depends on the program and how complete your file is. Finishing your application and sending your documents is the biggest thing that speeds it up, and we'll email you whenever anything changes.",
  },
  {
    q: "Does anything here affect my credit?",
    a: "No. Nothing in your dashboard pulls your credit. Your specialist will talk with you before any step that would.",
  },
  {
    q: "Is my information secure?",
    a: "Your documents upload over an encrypted connection and are only visible to you and the FLS team. We never sell your information.",
  },
  {
    q: "Can I change my answers?",
    a: "Yes, while your application is being prepared you can edit any section. If it's already under review, send a message here and your specialist can reopen it.",
  },
];

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/dashboard/support");

  const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id).single();
  const email = profile?.email ?? user.email ?? null;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Support" description="Questions about your file? Send your specialist a message." />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section
          aria-labelledby="message-title"
          className="rounded-3xl bg-white/85 p-6 ring-1 ring-inset ring-ink-200/70 backdrop-blur sm:p-8"
        >
          <div className="flex items-center gap-4">
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-ink-100 ring-2 ring-white shadow-[0_10px_24px_-14px_rgb(0_0_0/0.5)]">
              <Image src="/brand/robert.jpg" alt="" fill sizes="56px" className="object-cover object-top" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-800">Your specialist</p>
              <h2 id="message-title" className="text-xl font-bold tracking-tight text-ink-900">
                Message Robert Saucedo
              </h2>
            </div>
          </div>
          <div className="mt-6">
            <SupportForm email={email} />
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl bg-white/85 p-6 ring-1 ring-inset ring-ink-200/70 backdrop-blur">
            <h2 className="text-base font-semibold text-ink-900">Common questions</h2>
            <ul className="mt-3 divide-y divide-ink-100">
              {QUESTIONS.map((item) => (
                <li key={item.q}>
                  <details className="group py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-ink-900 [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <ChevronDown
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-180"
                      />
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.a}</p>
                  </details>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex items-start gap-3 rounded-3xl bg-white/85 p-5 ring-1 ring-inset ring-ink-200/70 backdrop-blur">
            <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
            <p className="text-sm leading-relaxed text-ink-700">
              We email you whenever your file changes or anything&apos;s needed, so
              you never have to check in to find out.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
