"use client";

import { useActionState, useState } from "react";
import { CircleAlert, CircleCheck, Send } from "lucide-react";
import { sendSupportMessage, type SupportState } from "./actions";

const TOPICS = [
  { value: "application", label: "My application" },
  { value: "documents", label: "My documents" },
  { value: "status", label: "Where my file stands" },
  { value: "other", label: "Something else" },
];

/**
 * The message form. Topics are chips rather than a dropdown: four choices
 * read at a glance, and one tap picks one. After sending, the form gives way
 * to a confirmation with the one fact that matters: the reply comes by email.
 */
export function SupportForm({ email }: { email: string | null }) {
  // "Send another" remounts the form, which starts a fresh action state
  // rather than carrying the last one's "sent".
  const [round, setRound] = useState(0);
  return <MessageForm key={round} email={email} onAnother={() => setRound((n) => n + 1)} />;
}

function MessageForm({ email, onAnother }: { email: string | null; onAnother: () => void }) {
  const [state, action, pending] = useActionState<SupportState, FormData>(sendSupportMessage, {});
  const [topic, setTopic] = useState("application");
  const [message, setMessage] = useState("");

  if (state.sent) {
    return (
      <div className="animate-rise rounded-2xl bg-success-50/80 p-6 ring-1 ring-inset ring-success-600/15">
        <div className="flex items-start gap-3">
          <CircleCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-success-700" />
          <div>
            <p className="font-semibold text-ink-900">Message sent</p>
            <p className="mt-1 leading-relaxed text-ink-600">
              Robert will reply by email{email ? (
                <>
                  {" "}to <span className="font-medium text-ink-900">{email}</span>
                </>
              ) : null}
              . Keep an eye on your inbox.
            </p>
            <button
              type="button"
              onClick={onAnother}
              className="mt-4 text-sm font-semibold text-brand-900 underline-offset-4 hover:underline"
            >
              Send another message
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <fieldset>
        <legend className="text-sm font-medium text-ink-800">What&apos;s it about?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TOPICS.map((option) => {
            const selected = topic === option.value;
            return (
              <label
                key={option.value}
                className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  selected
                    ? "bg-brand-900 text-white"
                    : "bg-white text-ink-700 ring-1 ring-inset ring-ink-200 hover:ring-ink-400"
                }`}
              >
                <input
                  type="radio"
                  name="topic"
                  value={option.value}
                  checked={selected}
                  onChange={() => setTopic(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="support-message" className="block text-sm font-medium text-ink-800">
          Your message
        </label>
        <textarea
          id="support-message"
          name="message"
          rows={6}
          required
          minLength={10}
          maxLength={4000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask a question or tell us what's changed."
          className="mt-2 block w-full resize-y rounded-xl border-0 bg-white px-4 py-3 text-ink-900 ring-1 ring-inset ring-ink-300 placeholder:text-ink-400 focus:ring-2 focus:ring-inset focus:ring-brand-500"
        />
        <p className="mt-1.5 text-xs text-ink-500">
          Robert replies by email{email ? ` to ${email}` : ""}.
        </p>
      </div>

      {state.error && !pending && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl bg-danger-50 px-3.5 py-3 text-sm text-danger-700 ring-1 ring-inset ring-danger-600/15"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-900 px-6 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgb(0_0_0/0.7)] transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send aria-hidden="true" className="h-4 w-4" />
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
