"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { TimezoneField } from "@/components/application/timezone-field";
import { submitContact, type ContactResult } from "@/app/(marketing)/contact-actions";

/**
 * Contact form for the home page's contact section.
 *
 * DELIBERATELY NOT THE PRIMARY ACTION. Platform spec §4 says contact must not
 * become the main conversion path, and a form is easier to fill than an
 * application — so it sits beside "See My Financing Options" rather than
 * instead of it, and its own copy points back to the prequal for anyone whose
 * real question is "what could I get".
 *
 * NO CHAT, NO ASSISTANT. Deliberate, and worth stating where someone will look
 * for it: an assistant on this surface is one careless sentence from an
 * eligibility determination, which is a credit decision under Regulation B and
 * carries an adverse-action notice requirement. The prequal engine can produce
 * the specific reasons that rule needs. A conversation cannot.
 */
export function ContactForm({ submissionToken }: { submissionToken: string }) {
  const [state, action] = useActionState<ContactResult | null, FormData>(
    submitContact,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-card border border-white/20 bg-white/10 p-8 backdrop-blur">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
          <Check aria-hidden="true" className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white">Message sent</h3>
        <p className="mt-2 text-sm leading-relaxed text-brand-100">
          A financing specialist will get back to you. If you&apos;d like to see
          what may be available in the meantime, the questions take about two
          minutes and nothing there affects your credit.
        </p>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="rounded-card border border-white/20 bg-white/10 p-6 backdrop-blur sm:p-8"
    >
      <input type="hidden" name="submission_token" value={submissionToken} />
      <TimezoneField />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="contact-name" required inverted>
          <Input id="contact-name" name="name" required autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="contact-email" required inverted>
          <Input
            id="contact-email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Phone" htmlFor="contact-phone" hint="Optional." inverted>
            <Input
              id="contact-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="(555) 555-0100"
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="How can we help?" htmlFor="contact-message" required inverted>
            <Textarea
              id="contact-message"
              name="message"
              required
              placeholder="A sentence or two about what you're trying to do."
            />
          </Field>
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="mt-4 text-sm font-medium text-white">
          {state.error}
        </p>
      )}

      <div className="mt-6">
        <SendButton />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-brand-100/80">
        Sending a message is not an application for credit and does not affect
        your credit.
      </p>
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
    <Button
      type="submit"
      size="lg"
      variant="inverted"
      disabled={pending}
      aria-live="polite"
      className="w-full sm:w-auto"
    >
      {pending ? "Sending…" : "Send message"}
    </Button>
  );
}
