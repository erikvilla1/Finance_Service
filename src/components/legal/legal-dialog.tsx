"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { TermsContent } from "@/components/legal/terms-content";
import { PrivacyContent } from "@/components/legal/privacy-content";

/**
 * Opens the Terms or the Privacy Policy in a dialog instead of navigating away.
 *
 * -----------------------------------------------------------------------------
 * WHY THIS EXISTS AT ALL. It is on the account-creation form, where the links
 * used to open a new tab. Nothing broke, but reading the terms should not mean
 * leaving a half-filled form and finding your way back to it.
 *
 * SAME SOURCE AS THE PAGE. It renders TermsContent / PrivacyContent, which is
 * the exact markup /terms and /privacy render. That is the point rather than a
 * convenience: the checkbox beside these links writes a consent record naming
 * the wording the person was shown, so a dialog with its own copy of the text
 * would eventually record agreement to words that were never displayed.
 *
 * NATIVE <dialog>, NOT A MODAL LIBRARY. showModal() gives the focus trap, the
 * inert background, Escape-to-close, the top layer and the ::backdrop for free
 * — all the parts people reach for Radix or Headless UI to get. The browser
 * has done this since 2022.
 *
 * WHY THE LINKS STILL EXIST UNDERNEATH. Each trigger is rendered as a real
 * anchor pointing at the real page, and the click handler only takes over when
 * the dialog can actually be used. Middle-click, cmd-click and "open in new
 * tab" keep working, a crawler follows a link rather than a button, and with
 * JavaScript off the original behaviour is exactly what happens.
 * -----------------------------------------------------------------------------
 */
export function LegalDialogLink({
  document: which,
  children,
  className,
}: {
  document: "terms" | "privacy";
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  const href = which === "terms" ? "/terms" : "/privacy";
  const title = which === "terms" ? "Terms of Use" : "Privacy Policy";

  return (
    <>
      <a
        href={href}
        onClick={(event) => {
          // Let the browser do its normal thing for anything that is not a
          // plain left click — new tab, new window, download, context menu.
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          ) {
            return;
          }
          const dialog = ref.current;
          // No dialog support, or no element yet: fall through to the href.
          if (!dialog?.showModal) return;
          event.preventDefault();
          dialog.showModal();
        }}
        className={className}
      >
        {children}
      </a>

      <dialog
        ref={ref}
        aria-labelledby={`legal-dialog-title-${which}`}
        // p-0 because the padding belongs to the panel inside, which scrolls.
        // The backdrop is styled in globals.css — ::backdrop cannot be reached
        // from a Tailwind utility.
        className="legal-dialog m-auto w-[min(46rem,calc(100vw-2rem))] rounded-2xl p-0 text-ink-800 backdrop:bg-brand-900/40"
      >
        {/*
          A PLAIN DIV, NOT <form method="dialog">.

          method="dialog" is the tidy way to close a dialog — the button's
          default action dismisses it, no handler needed. It cannot be used
          here: this component is rendered inside the account form's <form>,
          and a form inside a form is invalid HTML. React's hydration then
          reconciles the server markup against a DOM the browser has silently
          restructured, and the whole tree gets thrown away and re-rendered on
          the client.

          It cost nothing real. The dialog only ever opens through showModal(),
          so there was never a no-JavaScript path where a no-JavaScript close
          button mattered.

          type="button" on both controls is load-bearing for the same reason:
          inside a form, a button with no type defaults to submit, so the close
          button would have tried to create an account.
        */}
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-6 py-4">
            <h2
              id={`legal-dialog-title-${which}`}
              className="text-lg font-semibold text-ink-900"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Close"
              className="-m-1 rounded-full p-1 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          {/* The only scrolling region. The header and footer stay put, which is
              what stops a long policy burying the close button. */}
          <div className="overflow-y-auto px-6 py-2">
            {which === "terms" ? <TermsContent /> : <PrivacyContent />}
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-ink-200 px-6 py-4">
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-ink-600 underline underline-offset-2 hover:text-ink-900"
            >
              Open the full page
            </a>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
