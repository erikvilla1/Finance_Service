"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Check, Mail, Phone, User } from "lucide-react";
import { TimezoneField } from "@/components/application/timezone-field";
import { submitContact, type ContactResult } from "@/app/(marketing)/contact-actions";

/**
 * Contact form for the home page's contact section.
 *
 * RESTYLED, STILL WIRED. The layout follows a supplied reference — centred
 * column, pill fields with leading icons, full-width submit. What did NOT
 * change is what happens on submit: this still posts to submitContact, which
 * inserts into contact_submissions (migration 0027). The reference form has no
 * name attributes on any input and no action, so it submits nothing at all;
 * adopting it wholesale would have replaced a working form with a decoration.
 *
 * OTHER FIXES CARRIED OVER THE REFERENCE:
 *   - rows="4" is a string there, which is a type error in TSX. It is rows={4}.
 *   - Its labels use htmlFor pointing at ids no input has, so clicking a label
 *     focuses nothing and screen readers announce the fields unlabelled.
 *   - Its icons are inline SVG with fill="#475569" hard-coded, which ignores
 *     the theme and cannot respond to focus. These are lucide icons, already a
 *     dependency, inheriting currentColor.
 *
 * NO CHAT, NO ASSISTANT. Deliberate, and worth stating where someone will look
 * for it: an assistant on this surface is one careless sentence from an
 * eligibility determination, which is a credit decision under Regulation B and
 * carries an adverse-action notice requirement. The prequal engine can produce
 * the specific reasons that rule needs. A conversation cannot.
 */

/** Pill field wrapper. The ring is on the container so the icon lights up too. */
const FIELD_SHELL =
  "mt-2 flex h-12 items-center gap-2 rounded-full border border-ink-300 bg-white pl-4 pr-1 transition-all focus-within:border-accent-400 focus-within:ring-2 focus-within:ring-accent-400/40";
const INPUT = "h-full w-full bg-transparent pr-3 text-ink-900 outline-none placeholder:text-ink-400";
const LABEL = "text-sm font-medium text-ink-800";

export function ContactForm({ submissionToken }: { submissionToken: string }) {
  const [state, action] = useActionState<ContactResult | null, FormData>(
    submitContact,
    null,
  );

  if (state?.ok) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-ink-200 bg-white p-8 text-center shadow-card">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-success-600">
          <Check aria-hidden="true" className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-ink-900">Message sent</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          A financing specialist will get back to you. If you&apos;d like to see
          what may be available in the meantime, the questions take about two
          minutes and nothing there affects your credit.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col items-center">
      <p className="rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-800">
        Contact us
      </p>
      <h2 className="py-4 text-center text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
        Let&apos;s Get In Touch.
      </h2>
      {/*
        The reference puts a mailto here. Left out rather than invented — see
        the note in the contact section on the home page. Drop Robert's address
        in once it is confirmed.
      */}
      <p className="max-w-xl pb-10 text-center leading-relaxed text-ink-600">
        Tell us what you&apos;re trying to accomplish. A financing specialist
        will review your message and follow up.
      </p>

      {/*
        Two columns from sm up. Name and email are short fields and were each
        taking a full row of a 28rem column, which made the form a narrow
        ribbon with a lot of empty section either side of it. Pairing them
        removes a row of height and uses the width the section already has.

        Phone and message stay full width — a lone half-width field under a
        pair reads as a mistake, and a textarea needs the measure.
      */}
      <div className="grid w-full max-w-3xl grid-cols-1 gap-x-6 gap-y-5 px-4 sm:grid-cols-2">
        <input type="hidden" name="submission_token" value={submissionToken} />
        <TimezoneField />

        <div>
        <label htmlFor="contact-name" className={LABEL}>
          Full name
        </label>
        <div className={FIELD_SHELL}>
          <User aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-500" />
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Enter your full name"
            className={INPUT}
          />
        </div>
        </div>

        <div>
        <label htmlFor="contact-email" className={LABEL}>
          Email address
        </label>
        <div className={FIELD_SHELL}>
          <Mail aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-500" />
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Enter your email address"
            className={INPUT}
          />
        </div>
        </div>

        <div className="sm:col-span-2">
        <label htmlFor="contact-phone" className={LABEL}>
          Phone <span className="font-normal text-ink-400">optional</span>
        </label>
        <div className={FIELD_SHELL}>
          <Phone aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-500" />
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="(555) 555-0100"
            className={INPUT}
          />
        </div>
        </div>

        <div className="sm:col-span-2">
        <label htmlFor="contact-message" className={LABEL}>
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          required
          placeholder="A sentence or two about what you're trying to do."
          className="mt-2 w-full resize-none rounded-2xl border border-ink-300 bg-white p-3 text-ink-900 outline-none transition-all placeholder:text-ink-400 focus:border-accent-400 focus:ring-2 focus:ring-accent-400/40"
        />
        </div>

        {state?.error && (
          <p role="alert" className="text-sm font-medium text-danger-700 sm:col-span-2">
            {state.error}
          </p>
        )}

        <div className="sm:col-span-2">
          <SendButton />
        </div>

        <p className="text-center text-xs leading-relaxed text-ink-500 sm:col-span-2">
          Sending a message is not an application for credit and does not affect
          your credit.
        </p>
      </div>
    </form>
  );
}

/**
 * useFormStatus() has to be read from inside the <form>, which is the only
 * reason this is a separate component rather than inline above.
 */
function SendButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-live="polite"
      className="mx-auto mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-accent-500 py-3 font-semibold text-brand-900 transition hover:bg-accent-600 disabled:opacity-60 sm:w-72"
    >
      {pending ? "Sending…" : "Submit form"}
      {!pending && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
    </button>
  );
}
