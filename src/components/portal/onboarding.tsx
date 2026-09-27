"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  FolderUp,
  Mail,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";

/**
 * "How this works": five short illustrated steps on what the dashboard is and
 * how a file moves, opened from "How this works" in the sidebar (the "?" on a
 * phone). Closes any way: the close button, Escape, or the backdrop.
 *
 * Where things are on the page is the first-run spotlight's job
 * (first-run-tour.tsx); this is the why and the how, for whenever it's wanted.
 */

interface Step {
  eyebrow: string;
  title: string;
  body: ReactNode;
  visual: ReactNode;
}

export function Onboarding({
  firstName,
  onClose,
}: {
  firstName: string | null;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const steps: Step[] = [
    {
      eyebrow: "Welcome",
      title: firstName ? `Welcome to your dashboard, ${firstName}` : "Welcome to your dashboard",
      body: (
        <>
          This is where your financing comes together: your application, your
          documents, and where your file stands, all in one place. Here&apos;s a
          quick look at how it works. It takes under a minute.
        </>
      ),
      visual: <WelcomeVisual />,
    },
    {
      eyebrow: "How it works",
      title: "Four steps from here to a decision",
      body: (
        <>
          You finish your application and send your documents. A specialist
          reviews everything and prepares your file for the right funding
          source. You&apos;ll always see which step you&apos;re on.
        </>
      ),
      visual: <JourneyVisual />,
    },
    {
      eyebrow: "Your application",
      title: "A few short sections about your business",
      body: (
        <>
          Your answers from the questionnaire are already here. Fill in the rest
          in any order; everything saves as you go, so you can stop and come
          back anytime.
        </>
      ),
      visual: <ApplicationVisual />,
    },
    {
      eyebrow: "Your documents",
      title: "Upload securely, see every status",
      body: (
        <>
          We&apos;ll list exactly what&apos;s needed, like bank statements and an
          ID. Upload from your computer or phone, and each item shows whether
          it&apos;s needed, received, or accepted.
        </>
      ),
      visual: <DocumentsVisual />,
    },
    {
      eyebrow: "Your specialist",
      title: "A person reviews every file",
      body: (
        <>
          Robert and the FLS team review your file and email you whenever
          something changes or anything&apos;s needed. Message him anytime from
          his card in the menu. Need this again? Click{" "}
          <span className="font-semibold text-ink-900">How this works</span> in
          the menu, or the ? at the top on a phone.
        </>
      ),
      visual: <SpecialistVisual />,
    },
  ];

  const last = index === steps.length - 1;
  const step = steps[index];

  const next = useCallback(() => {
    if (last) onClose();
    else setIndex((i) => i + 1);
  }, [last, onClose]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    panelRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") back();
      else if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="animate-fade absolute inset-0 bg-brand-950/45 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        tabIndex={-1}
        className="animate-rise relative w-full max-w-xl overflow-hidden rounded-t-3xl bg-white shadow-[0_40px_120px_-30px_rgb(0_0_0/0.6)] outline-none sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/80 text-ink-500 backdrop-blur hover:text-ink-900"
        >
          <span aria-hidden="true" className="text-lg leading-none">×</span>
        </button>

        {/* The picture half: a small, calm illustration of the step. */}
        <div className="relative h-56 overflow-hidden bg-[#F6EFE0] sm:h-60">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(80%_80%_at_20%_10%,rgb(255_255_255/0.7),transparent),radial-gradient(70%_70%_at_90%_100%,rgb(200_170_120/0.35),transparent)]"
          />
          <div key={index} className="animate-rise relative flex h-full items-center justify-center px-8">
            {step.visual}
          </div>
        </div>

        <div className="px-7 pb-7 pt-6 sm:px-9 sm:pb-8">
          <div key={index} className="animate-rise">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-800">
              {step.eyebrow}
            </p>
            <h2 id="tour-title" className="mt-2 text-2xl font-bold tracking-tight text-ink-900">
              {step.title}
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600">{step.body}</p>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5" aria-label={`Step ${index + 1} of ${steps.length}`}>
              {steps.map((s, i) => (
                <button
                  key={s.eyebrow}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Go to step ${i + 1}: ${s.eyebrow}`}
                  aria-current={i === index ? "step" : undefined}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? "w-6 bg-brand-900" : i < index ? "w-1.5 bg-brand-900/50" : "w-1.5 bg-ink-200"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={back}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100"
                >
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={next}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-900 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgb(0_0_0/0.7)] transition-colors hover:bg-brand-800"
              >
                {last ? "Done" : index === 0 ? "Show me" : "Next"}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Illustrations: small mock UI in the portal's own style, not stock art.
// -----------------------------------------------------------------------------

function MiniCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-[0_18px_40px_-24px_rgb(60_40_10/0.45)] ring-1 ring-black/5 ${className}`}>
      {children}
    </div>
  );
}

function WelcomeVisual() {
  return (
    <div className="relative w-full max-w-sm">
      <MiniCard className="rotate-[-3deg]">
        <div className="h-2 w-16 rounded-full bg-accent-300/70" />
        <div className="mt-3 h-3 w-40 rounded-full bg-ink-900/80" />
        <div className="mt-2 h-2 w-56 rounded-full bg-ink-200" />
        <div className="mt-4 flex gap-2">
          <div className="h-7 w-24 rounded-lg bg-brand-900" />
          <div className="h-7 w-16 rounded-lg bg-ink-100" />
        </div>
      </MiniCard>
      <MiniCard className="absolute -bottom-6 -right-2 w-44 rotate-[4deg]">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-success-50 text-success-700">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <div className="h-2 w-20 rounded-full bg-ink-200" />
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-ink-100">
          <div className="h-full w-2/3 rounded-full bg-brand-900" />
        </div>
      </MiniCard>
    </div>
  );
}

function JourneyVisual() {
  const items = [
    { icon: FileText, label: "Application" },
    { icon: FolderUp, label: "Documents" },
    { icon: Search, label: "Review" },
    { icon: Send, label: "Submitted" },
  ];
  return (
    <div className="flex w-full max-w-md items-start justify-between">
      {items.map(({ icon: Icon, label }, i) => (
        <div key={label} className="relative flex flex-1 flex-col items-center">
          {i < items.length - 1 && (
            <span aria-hidden="true" className="absolute left-1/2 top-6 h-px w-full bg-ink-900/15" />
          )}
          <span
            className={`relative grid h-12 w-12 place-items-center rounded-2xl ${
              i === 0 ? "bg-brand-900 text-white" : "bg-white text-ink-700 ring-1 ring-black/5"
            } shadow-[0_12px_24px_-16px_rgb(60_40_10/0.6)]`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <span className="mt-3 text-xs font-semibold text-ink-700">{label}</span>
        </div>
      ))}
    </div>
  );
}

function ApplicationVisual() {
  const rows = [
    { label: "Your business", done: true },
    { label: "Ownership", done: true },
    { label: "Finances", done: false },
  ];
  return (
    <MiniCard className="w-full max-w-xs">
      <div className="flex items-center justify-between">
        <div className="h-2.5 w-28 rounded-full bg-ink-900/80" />
        <span className="text-[0.65rem] font-semibold text-ink-500">2 of 3</span>
      </div>
      <ul className="mt-4 space-y-2.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-3">
            <span
              className={`grid h-5 w-5 place-items-center rounded-full ${
                row.done ? "bg-success-600 text-white" : "ring-2 ring-inset ring-ink-200"
              }`}
            >
              {row.done && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="text-xs font-medium text-ink-700">{row.label}</span>
          </li>
        ))}
      </ul>
    </MiniCard>
  );
}

function DocumentsVisual() {
  const rows = [
    { label: "Bank statements", status: "Accepted", tone: "bg-success-50 text-success-700" },
    { label: "Driver's license", status: "Received", tone: "bg-brand-50 text-brand-700" },
    { label: "Tax return", status: "Needed", tone: "bg-warning-50 text-warning-700" },
  ];
  return (
    <MiniCard className="w-full max-w-xs">
      <div className="flex items-center gap-2 text-ink-500">
        <ShieldCheck className="h-3.5 w-3.5 text-success-700" />
        <span className="text-[0.65rem] font-semibold">Encrypted upload</span>
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 rounded-lg bg-ink-50 px-3 py-2">
            <span className="flex items-center gap-2 text-xs font-medium text-ink-800">
              <FileText className="h-3.5 w-3.5 text-ink-400" />
              {row.label}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${row.tone}`}>
              {row.status}
            </span>
          </li>
        ))}
      </ul>
    </MiniCard>
  );
}

function SpecialistVisual() {
  return (
    <div className="relative w-full max-w-xs">
      <MiniCard className="flex items-center gap-4">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-ink-100 ring-2 ring-white">
          <Image src="/brand/robert.jpg" alt="" fill sizes="56px" className="object-cover object-top" />
        </span>
        <span className="min-w-0">
          <span className="block text-[0.65rem] font-semibold uppercase tracking-wider text-accent-800">
            Your specialist
          </span>
          <span className="block text-sm font-bold text-ink-900">Robert Saucedo</span>
          <span className="block text-xs text-ink-500">Founder, FLS Capital Advisors</span>
        </span>
      </MiniCard>
      <MiniCard className="absolute -bottom-7 right-2 flex items-center gap-2 px-3 py-2.5">
        <Mail className="h-4 w-4 text-brand-900" />
        <span className="text-xs font-semibold text-ink-800">We&apos;ll email you updates</span>
      </MiniCard>
    </div>
  );
}
