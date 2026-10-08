import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleAlert,
  FileText,
  FolderUp,
  Hourglass,
  PenLine,
  RotateCcw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ActivityKind } from "@/lib/activity";
import type { CustomerStage } from "@/lib/customer-status";
import { formatCurrency, formatDate } from "@/lib/crm";
import type { LeadSummary } from "@/lib/leads";
import { TimeGreeting } from "./time-greeting";
import { SignNowButton } from "./sign-now-button";

/**
 * The client overview's sections, shared by the dashboard page. See
 * src/app/(portal)/dashboard/page.tsx for what each is for and why.
 */

// Four steps. "Received" (FLS has the file, review not begun) sits inside
// "In review": from the applicant's side both mean "it's with FLS now".
const TRACK: { key: string; label: string; stages: CustomerStage[] }[] = [
  { key: "application", label: "Your application", stages: ["started"] },
  { key: "review", label: "In review", stages: ["received", "reviewing", "need_from_you"] },
  { key: "submitted", label: "Submitted", stages: ["with_funder"] },
  { key: "complete", label: "Complete", stages: ["complete"] },
];

export interface NextStep {
  icon: LucideIcon;
  title: string;
  body: string;
  cta?: { label: string; href: string };
  /** A step that is a server action rather than a link: "Sign now". */
  action?: { kind: "sign_now"; label: string; applicationId: string };
  tone: "action" | "calm";
}

export function Greeting({ firstName, line }: { firstName: string | null; line: string }) {
  return (
    // A small inset (half the cards' own padding) so the greeting sits just
    // inside the cards' edge. Right padding on desktop keeps a long name
    // clear of the Sign out button.
    <header className="pl-3 sm:pl-4 lg:pr-36">
      <TimeGreeting firstName={firstName} />
      <p className="mt-2 text-lg text-ink-600">{line}</p>
    </header>
  );
}

/**
 * How far along the applicant's own part is: answers, the existing-loans
 * section when it applies, and documents sent, as one percentage.
 */
export function readinessPercent(lead: LeadSummary | undefined): number {
  if (!lead) return 0;
  const done = lead.formAnswered + (lead.docsTotal - lead.docsOutstanding);
  const total = lead.formRequired + lead.docsTotal;
  return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
}

/**
 * The line under the greeting: the whole picture in one sentence, in the
 * applicant's terms. The status card below has the detail; this is the gist.
 */
export function greetingLine(stage: CustomerStage, percent: number): string {
  switch (stage) {
    case "started":
      return percent > 0
        ? `You're ${percent}% of the way there. Finish up and Robert takes it from here.`
        : "Let's get your file ready. Everything saves as you go.";
    case "received":
      return "You've done your part. Your file is with Robert now.";
    case "reviewing":
      return "Your file is with Robert for review.";
    case "need_from_you":
      return "Robert needs a few things from you to keep things moving.";
    case "with_funder":
      return "Your file is with a funding source. We'll keep you posted.";
    case "complete":
      return "This application is complete.";
  }
}

type PathState = "done" | "current" | "upcoming";

interface PathStep {
  title: string;
  detail?: string;
  state: PathState;
  /** Mark this step with Robert's photo rather than a dot. */
  robert?: boolean;
}

function pathFor(stage: CustomerStage): PathStep[] {
  const review = {
    title: "Robert S. reviews your file",
    detail: "He checks your documents and looks at which programs may fit.",
    robert: true,
  };
  const talk = {
    title: "You talk through your options",
    detail: "He reaches out with what he found and the next steps.",
  };

  switch (stage) {
    case "started":
      return [
        { title: "You finish your application and documents", detail: "Everything saves as you go.", state: "current" },
        { ...review, state: "upcoming" },
        { ...talk, state: "upcoming" },
      ];
    case "received":
    case "reviewing":
      return [
        { title: "Your application and documents are in", state: "done" },
        { ...review, state: "current" },
        { ...talk, state: "upcoming" },
      ];
    case "need_from_you":
      return [
        { title: "Your application and documents are in", state: "done" },
        {
          title: "Robert needs a few things from you",
          detail: "They're in your checklist. Once they're in, his review carries on.",
          state: "current",
          robert: true,
        },
        { ...talk, state: "upcoming" },
      ];
    case "with_funder":
    case "complete": {
      const finished = stage === "complete";
      return [
        { title: "Robert prepared your file", state: "done", robert: true },
        {
          title: "A funding source reviews it",
          detail: finished ? undefined : "Any questions they have come to you through Robert.",
          state: finished ? "done" : "current",
        },
        {
          title: "You hear back",
          detail: finished ? undefined : "Robert lets you know as soon as they respond.",
          state: finished ? "done" : "upcoming",
        },
      ];
    }
  }
}

/**
 * What happens next: the short path from where the file is now, so "you're
 * all set" is never a dead end. Three steps, the current one marked, and no
 * dates or promises about outcomes (spec §5).
 */
export function WhatsNext({ stage }: { stage: CustomerStage }) {
  const steps = pathFor(stage);
  return (
    <section
      aria-labelledby="whats-next-title"
      className="rounded-3xl bg-white/85 p-6 ring-1 ring-inset ring-ink-200/70 backdrop-blur"
    >
      <h2 id="whats-next-title" className="text-base font-semibold text-ink-900">
        What happens next
      </h2>
      <ol className="mt-5">
        {steps.map((step, i) => (
          <li
            key={step.title}
            aria-current={step.state === "current" ? "step" : undefined}
            className="relative flex gap-3 pb-6 last:pb-0"
          >
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute bottom-0 left-[13px] top-8 w-px ${step.state === "done" ? "bg-brand-900/40" : "bg-ink-200"}`}
              />
            )}
            <PathMarker step={step} />
            <div className="min-w-0 pt-1">
              <p
                className={`text-sm leading-snug ${
                  step.state === "current"
                    ? "font-semibold text-ink-900"
                    : step.state === "done"
                      ? "text-ink-500"
                      : "text-ink-700"
                }`}
              >
                {step.title}
              </p>
              {step.detail && step.state !== "done" && (
                <p className="mt-1 text-xs leading-relaxed text-ink-500">{step.detail}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PathMarker({ step }: { step: PathStep }) {
  if (step.robert) {
    return (
      <span
        className={`relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-ink-100 ${
          step.state === "current"
            ? "ring-2 ring-brand-900 ring-offset-2 ring-offset-white"
            : step.state === "upcoming"
              ? "opacity-70 ring-1 ring-ink-200"
              : "ring-1 ring-ink-200"
        }`}
      >
        <Image src="/brand/robert.jpg" alt="" fill sizes="28px" loading="eager" className="object-cover object-top" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`relative grid h-7 w-7 shrink-0 place-items-center rounded-full ${
        step.state === "done"
          ? "bg-brand-900 text-white"
          : step.state === "current"
            ? "bg-white ring-2 ring-brand-900"
            : "bg-white ring-1 ring-ink-200"
      }`}
    >
      {step.state === "done" ? (
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      ) : step.state === "current" ? (
        <span className="h-2 w-2 rounded-full bg-brand-900" />
      ) : null}
    </span>
  );
}

export function nextStepFor(
  application: { id: string; signature_requested_at: string | null },
  lead: LeadSummary | undefined,
  actionNeeded: boolean,
  isSigned: boolean,
): NextStep {
  const id = application.id;
  const formLeft = Math.max(0, (lead?.formRequired ?? 0) - (lead?.formAnswered ?? 0));
  const docsLeft = lead?.docsOutstanding ?? 0;

  if (application.signature_requested_at && !isSigned) {
    return {
      icon: PenLine,
      title: "Review and sign your application",
      body: "It's the last thing we need before your file goes to a funding source, and it takes a couple of minutes.",
      cta: { label: "Review and sign", href: `/dashboard/${id}/sign` },
      tone: "action",
    };
  }
  if (formLeft > 0) {
    const started = (lead?.formAnswered ?? 0) > 0;
    return {
      icon: FileText,
      title: started ? "Finish your application" : "Complete your application",
      body: `${formLeft} ${formLeft === 1 ? "question" : "questions"} left. Your answers save as you go, so you can do it in more than one sitting.`,
      cta: { label: started ? "Pick up where you left off" : "Start your application", href: `/dashboard/${id}/application` },
      tone: "action",
    };
  }
  // Every section complete and nothing released yet: the applicant can
  // sign now (client review, Notion 09.27). Ahead of the documents, because
  // the signature is the thing a file cannot leave without and the
  // documents can follow while it is reviewed.
  if ((lead?.formRequired ?? 0) > 0 && !application.signature_requested_at && !isSigned) {
    return {
      icon: PenLine,
      title: "Sign your application",
      body: "Every section is complete. Review the application that goes to a funding source and sign it; it takes a couple of minutes. We will email you the link as well.",
      action: { kind: "sign_now", label: "Sign now", applicationId: id },
      tone: "action",
    };
  }
  if (docsLeft > 0) {
    return {
      icon: FolderUp,
      title: docsLeft === 1 ? "Upload 1 document" : `Upload ${docsLeft} documents`,
      body: "Sending these is usually what moves a file forward fastest. Uploads are encrypted.",
      cta: { label: "Upload documents", href: `/dashboard/${id}/documents` },
      tone: "action",
    };
  }
  if (actionNeeded) {
    return {
      icon: CircleAlert,
      title: "Your specialist needs a little more",
      body: "They'll email you about exactly what's needed. You can also message them from Support.",
      cta: { label: "Message your specialist", href: "/dashboard/support" },
      tone: "action",
    };
  }
  return {
    icon: Hourglass,
    title: "You're all set for now",
    body: "There's nothing you need to do. We'll email you as soon as anything changes.",
    tone: "calm",
  };
}

export function StatusCard({
  stage,
  label,
  description,
  actionNeeded,
}: {
  stage: CustomerStage;
  /** The customer-facing stage name, e.g. "Finishing your application". */
  label: string;
  description: string;
  actionNeeded: boolean;
}) {
  const at = TRACK.findIndex((step) => step.stages.includes(stage));

  return (
    <section
      data-tour="status"
      aria-labelledby="status-title"
      className="rounded-3xl bg-white/85 p-6 ring-1 ring-inset ring-ink-200/70 backdrop-blur sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-accent-800">Current status</p>
      <h2 id="status-title" className="mt-2 text-2xl font-bold tracking-tight text-ink-900">
        {label}
      </h2>
      <p className="mt-2 max-w-2xl leading-relaxed text-ink-600">{description}</p>

      <ol className="mt-7 grid grid-cols-4 gap-2" aria-label="Your file's progress">
        {TRACK.map((step, i) => {
          const done = i < at || stage === "complete";
          const current = i === at && stage !== "complete";
          return (
            <li key={step.key} aria-current={current ? "step" : undefined} className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                    done
                      ? "bg-brand-900 text-white"
                      : current
                        ? actionNeeded
                          ? "bg-accent-100 text-accent-800 ring-2 ring-accent-600"
                          : "bg-white text-brand-900 ring-2 ring-brand-900"
                        : "bg-ink-100 text-ink-400"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                {i < TRACK.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`h-0.5 flex-1 rounded-full ${done ? "bg-brand-900" : "bg-ink-200"}`}
                  />
                )}
              </div>
              {/* WRAPS BELOW sm, TRUNCATES ABOVE IT.

                  The track is four equal columns. On a 375px phone that is
                  (375 - 32 main px-4 - 48 panel p-6 - 24 gaps) / 4 = 68px per
                  column, and "Your application" renders at 94px in text-xs —
                  so `truncate` alone showed the first step as "Your applic...".
                  The other three labels (51/57/55px) fit.

                  Wrapping rather than grid-cols-2 below sm: the connector line
                  between steps is a flex-1 rule drawn after every step but the
                  last, so a two-column layout would draw it pointing off the
                  end of each row. Wrapping keeps the single-row track and the
                  connectors correct, and costs one line of height.

                  Shortening the label to "Application" (66px) would also fit,
                  but that is customer-facing copy on a surface nobody has
                  reviewed on a phone, so it is not mine to change.

                  NOT VERIFIED IN A BROWSER: /dashboard is auth-gated and no
                  agent has credentials. The widths above are measured — the
                  column from the layout's own padding, the label by rendering
                  the string at text-xs in the real font — but nobody has
                  actually looked at this on a phone. Worth an eyeball. */}
              <p
                className={`mt-2 text-xs sm:truncate sm:text-sm ${
                  current ? "font-semibold text-ink-900" : done ? "text-ink-700" : "text-ink-400"
                }`}
              >
                {step.label}
              </p>
              {current && (
                <p className="hidden text-[0.7rem] font-semibold uppercase tracking-wider text-accent-800 sm:block">
                  You are here
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function NextStepCard({ step }: { step: NextStep }) {
  const Icon = step.icon;
  const action = step.tone === "action";
  return (
    <section
      data-tour="next-step"
      aria-labelledby="next-title"
      className={`rounded-3xl p-6 sm:p-8 ${
        action
          ? "bg-brand-950 text-white shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]"
          : "bg-white/85 ring-1 ring-inset ring-ink-200/70 backdrop-blur"
      }`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {/* flex-1 with a zero basis so the copy takes what the button leaves
            and the row does not wrap the button under it; the only thing
            that wraps is a full-width error line from SignNowButton. */}
        <div className="flex min-w-0 items-start gap-4 sm:flex-1 sm:basis-0">
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
              action ? "bg-white/10 text-white ring-1 ring-inset ring-white/15" : "bg-success-50 text-success-700"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${action ? "text-accent-300" : "text-accent-800"}`}>
              Your next step
            </p>
            <h2 id="next-title" className={`mt-1 text-xl font-bold tracking-tight ${action ? "text-white" : "text-ink-900"}`}>
              {step.title}
            </h2>
            <p className={`mt-1.5 max-w-xl leading-relaxed ${action ? "text-white/75" : "text-ink-600"}`}>
              {step.body}
            </p>
          </div>
        </div>
        {step.action && (
          <SignNowButton applicationId={step.action.applicationId} label={step.action.label} onDark inRow />
        )}
        {step.cta && (
          <Link
            href={step.cta.href}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-brand-950 transition-colors hover:bg-accent-100"
          >
            {step.cta.label}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        )}
      </div>
    </section>
  );
}

export function Checklist({
  applicationId,
  lead,
  signatureRequested,
  signed,
}: {
  applicationId: string;
  lead: LeadSummary | undefined;
  signatureRequested: boolean;
  signed: boolean;
}) {
  const formDone = lead?.formAnswered ?? 0;
  const formTotal = lead?.formRequired ?? 0;
  const docsTotal = lead?.docsTotal ?? 0;
  const docsSent = docsTotal - (lead?.docsOutstanding ?? 0);
  const docsSettled = lead?.docsSettled ?? 0;

  const rows: {
    icon: LucideIcon;
    label: string;
    href: string;
    done: number;
    total: number;
    /** Of `done`, how many are finished on our side (a second, darker fill). */
    settled?: number;
    status: string;
    state: "done" | "progress" | "todo" | "waiting";
  }[] = [
    {
      icon: FileText,
      label: "Application",
      href: `/dashboard/${applicationId}/application`,
      done: formDone,
      total: formTotal,
      ...(formTotal > 0 && formDone >= formTotal
        ? { status: "Complete", state: "done" as const }
        : formDone > 0
          ? { status: "In progress", state: "progress" as const }
          : { status: "Not started", state: "todo" as const }),
    },
    {
      icon: FolderUp,
      label: "Documents",
      href: `/dashboard/${applicationId}/documents`,
      done: docsSent,
      total: docsTotal,
      settled: docsSettled,
      ...(docsTotal === 0
        ? { status: "Nothing needed yet", state: "waiting" as const }
        : docsSettled >= docsTotal
          ? { status: "Accepted", state: "done" as const }
          : docsSent >= docsTotal
            ? { status: "With your specialist", state: "waiting" as const }
            : docsSent > 0
              ? { status: "In progress", state: "progress" as const }
              : { status: "Not started", state: "todo" as const }),
    },
  ];

  if (signatureRequested) {
    rows.push({
      icon: PenLine,
      label: "Signature",
      href: `/dashboard/${applicationId}/sign`,
      done: signed ? 1 : 0,
      total: 1,
      ...(signed ? { status: "Signed", state: "done" as const } : { status: "Ready to sign", state: "todo" as const }),
    });
  }

  const pill: Record<string, string> = {
    done: "bg-success-50 text-success-700",
    progress: "bg-accent-100 text-accent-800",
    todo: "bg-ink-100 text-ink-600",
    waiting: "bg-brand-50 text-brand-700",
  };

  return (
    <section
      data-tour="checklist"
      aria-labelledby="checklist-title"
      className="rounded-3xl bg-white/85 p-6 ring-1 ring-inset ring-ink-200/70 backdrop-blur sm:p-8"
    >
      <h2 id="checklist-title" className="text-base font-semibold text-ink-900">
        Your checklist
      </h2>
      <ul className="mt-4 divide-y divide-ink-100">
        {rows.map((row) => {
          const Icon = row.icon;
          const pct = row.total > 0 ? Math.round((row.done / row.total) * 100) : 0;
          return (
            <li key={row.label}>
              <Link
                href={row.href}
                className="group -mx-3 flex items-center gap-4 rounded-2xl px-3 py-4 transition-colors hover:bg-ink-900/[0.03]"
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    row.state === "done" ? "bg-success-50 text-success-700" : "bg-ink-100 text-ink-600"
                  }`}
                >
                  {row.state === "done" ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" strokeWidth={1.9} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink-900">{row.label}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pill[row.state]}`}>
                      {row.status}
                    </span>
                  </span>
                  {row.total > 0 && (
                    <span className="mt-2 flex items-center gap-3">
                      {/* Documents fill in two shades: light for sent, dark
                          for accepted. So "8 of 8" sent and waiting isn't read
                          as finished. */}
                      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                        <span
                          className={`absolute inset-y-0 left-0 rounded-full ${
                            row.state === "done"
                              ? "bg-success-600"
                              : row.settled !== undefined
                                ? "bg-brand-900/30"
                                : "bg-brand-900"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                        {row.settled !== undefined && row.state !== "done" && row.settled > 0 && (
                          <span
                            className="absolute inset-y-0 left-0 rounded-full bg-brand-900"
                            style={{ width: `${Math.round((row.settled / row.total) * 100)}%` }}
                          />
                        )}
                      </span>
                      <span className="min-w-12 whitespace-nowrap text-right text-xs tabular-nums text-ink-500">
                        {row.done} of {row.total}
                      </span>
                    </span>
                  )}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-600"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function FileDetails({
  applicationId,
  businessName,
  goal,
  amount,
  started,
}: {
  applicationId: string;
  businessName: string | null;
  goal: string | null;
  amount: number | null;
  started: string;
}) {
  // NO REFERENCE CODE. FLS-2026-000068 is a staff filing number: it means
  // nothing to the applicant, and being sequential it tells anyone how many
  // applications there have been this year. Support messages carry it to the
  // specialist automatically, so the applicant never needs to quote it.
  const rows: [string, React.ReactNode][] = [
    [
      "Business",
      businessName ?? (
        <Link
          href={`/dashboard/${applicationId}/application/core_business`}
          className="font-semibold text-accent-800 underline-offset-4 hover:underline"
        >
          Add your business name
        </Link>
      ),
    ],
    ["Goal", goal ?? "Financing application"],
    ["Amount requested", amount ? formatCurrency(amount) : "To be confirmed"],
    ["Started", formatDate(started)],
  ];

  return (
    <section
      aria-labelledby="details-title"
      className="rounded-3xl bg-white/85 p-6 ring-1 ring-inset ring-ink-200/70 backdrop-blur"
    >
      <h2 id="details-title" className="text-base font-semibold text-ink-900">
        Your file
      </h2>
      <dl className="mt-4 space-y-3.5">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-ink-500">{label}</dt>
            <dd className="mt-0.5 text-sm text-ink-900">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const ACTIVITY_ICON: Record<ActivityKind, LucideIcon> = {
  started: Sparkles,
  application: FileText,
  uploaded: FolderUp,
  accepted: Check,
  returned: RotateCcw,
  signed: PenLine,
};

/**
 * Recent activity: the last few things that happened on the file, so "did
 * my upload arrive?" is answered on the page instead of by email.
 */
export function RecentActivity({
  events,
}: {
  events: { id: string; kind: ActivityKind; text: string; when: string }[];
}) {
  if (events.length === 0) return null;
  return (
    <section
      aria-labelledby="activity-title"
      className="rounded-3xl bg-white/85 p-6 ring-1 ring-inset ring-ink-200/70 backdrop-blur"
    >
      <h2 id="activity-title" className="text-base font-semibold text-ink-900">
        Recent activity
      </h2>
      <ul className="mt-4 space-y-3.5">
        {events.map((event) => {
          const Icon = ACTIVITY_ICON[event.kind];
          return (
            <li key={event.id} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                  event.kind === "accepted"
                    ? "bg-success-50 text-success-700"
                    : event.kind === "returned"
                      ? "bg-warning-50 text-warning-700"
                      : "bg-ink-100 text-ink-600"
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm leading-snug text-ink-800">{event.text}</span>
                <span className="block text-xs text-ink-500">{event.when}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The banner for a document that came back. The status card says "action
 * needed" and the next step says "upload 1 document"; this says which one,
 * and why, in the specialist's own words when they gave any.
 */
export function AttentionBanner({
  applicationId,
  items,
}: {
  applicationId: string;
  items: { label: string; note: string | null }[];
}) {
  if (items.length === 0) return null;
  const [first, ...rest] = items;
  return (
    <section
      role="status"
      className="flex flex-col gap-4 rounded-3xl bg-warning-50 p-5 ring-1 ring-inset ring-warning-600/25 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-warning-700 ring-1 ring-inset ring-warning-600/25">
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink-900">
            Robert needs another copy of {first.label}
            {rest.length > 0 && ` and ${rest.length} more`}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-700">
            {first.note ?? "Something on the last one needs another look."}
          </p>
        </div>
      </div>
      <Link
        href={`/dashboard/${applicationId}/documents`}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
      >
        Upload again
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </section>
  );
}
