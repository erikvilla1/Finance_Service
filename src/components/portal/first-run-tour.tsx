"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * The first-run walkthrough: a spotlight that points at the real dashboard.
 *
 * WHY A SPOTLIGHT, NOT A SLIDESHOW. Someone arriving for the first time needs
 * to know where things are, and "your status is here" lands better pointing
 * at the status card than describing it. The illustrated explainer (How this
 * works, onboarding.tsx) stays for the why and the how, on demand.
 *
 * HOW IT DRAWS. One element sits over the target with a huge box-shadow, which
 * dims everything else and leaves the target lit through the "hole". Moving
 * between steps just animates that element's box. The whole layer catches
 * clicks, so the page underneath can't be used mid-tour.
 *
 * MANDATORY, ONCE: no skip and no Escape, and it's about a minute long. It
 * runs on the Overview, where the things it points at are, and a step whose
 * target isn't on screen (a phone has no sidebar; a new account has no status
 * card yet) is left out.
 *
 * POSITIONS ARE WRITTEN STRAIGHT TO THE DOM from a layout effect rather than
 * held in state: they're measurements, and a render per measurement would be
 * wasted work and a flicker.
 *
 * "SEEN" IS REMEMBERED IN THIS BROWSER (localStorage, keyed by user id), so the
 * database is untouched. The trade-off: a second device shows it once more.
 */

// v2: the spotlight replaced the v1 slideshow, so everyone sees it once.
const storageKey = (userId: string) => `fls:tour-seen:v2:${userId}`;

const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Whether this browser has finished the tour. Server render: treat as seen. */
function useTourSeen(userId: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(storageKey(userId)) === "1";
      } catch {
        return true; // Storage blocked: never trap anyone in a tour.
      }
    },
    () => true,
  );
}

function markTourSeen(userId: string) {
  try {
    localStorage.setItem(storageKey(userId), "1");
  } catch {}
  for (const listener of listeners) listener();
}

type Side = "top" | "bottom" | "left" | "right";

interface SpotStep {
  /** data-tour values to point at; the first one on screen wins. None: centred. */
  targets?: string[];
  eyebrow: string;
  title: string;
  body: ReactNode;
  /** Where the card goes first, if it fits there. */
  side?: Side;
}

const PAD = 8; // Breathing room around the lit target.
const GAP = 14; // Between the lit target and the card.
const MARGIN = 16; // Kept clear at the viewport's edges.

function stepsFor(firstName: string | null): SpotStep[] {
  return [
    {
      eyebrow: "Welcome",
      title: firstName ? `Welcome to your dashboard, ${firstName}` : "Welcome to your dashboard",
      body: "Let's take a quick look around so you know where everything is. It takes under a minute.",
    },
    {
      targets: ["status"],
      eyebrow: "Where you stand",
      title: "Your status",
      body: "Which step your file is on and what comes next. It updates as your specialist moves things forward.",
      side: "bottom",
    },
    {
      targets: ["next-step"],
      eyebrow: "What to do",
      title: "Your next step",
      body: "Always the one thing to do next. Click it and you're taken straight there.",
      side: "bottom",
    },
    {
      targets: ["checklist"],
      eyebrow: "Your progress",
      title: "Your checklist",
      body: "Your application and documents, and how far along each one is.",
      side: "top",
    },
    {
      targets: ["nav"],
      eyebrow: "Getting around",
      title: "Everything's in the sidebar",
      body: "Your application, your documents and your settings are always one click away.",
      side: "right",
    },
    {
      targets: ["menu"],
      eyebrow: "Getting around",
      title: "Everything's in the menu",
      body: "Your application, documents, settings, and your specialist are always here.",
      side: "bottom",
    },
    {
      targets: ["specialist"],
      eyebrow: "Your specialist",
      title: "Robert S. reviews your file",
      body: "Questions? Message him here anytime. He replies by email.",
      side: "right",
    },
    {
      targets: ["help", "help-mobile"],
      eyebrow: "Anytime",
      title: "How this works",
      body: "A short walkthrough of how the whole process works, whenever you want a refresher.",
      side: "right",
    },
  ];
}

/** The first element for these keys that's actually on screen. */
function findTarget(keys: string[]): HTMLElement | null {
  for (const key of keys) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`)) {
      const r = el.getBoundingClientRect();
      // Zero size: display:none (the desktop sidebar on a phone). Off to the
      // side: the phone menu's copy of the sidebar while it's closed.
      if (r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth) return el;
    }
  }
  return null;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

export function FirstRunTour({ userId, firstName }: { userId: string; firstName: string | null }) {
  const seen = useTourSeen(userId);
  if (seen) return null;
  return <Spotlight firstName={firstName} onDone={() => markTourSeen(userId)} />;
}

function Spotlight({ firstName, onDone }: { firstName: string | null; onDone: () => void }) {
  // The welcome shows first; the rest of the plan is worked out when they
  // press "Show me", by which point everything it points at is on the page.
  const [plan, setPlan] = useState<SpotStep[]>(() => stepsFor(firstName).slice(0, 1));
  const [index, setIndex] = useState(0);
  const holeRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const step = plan[index];
  const last = index === plan.length - 1 && plan.length > 1;

  const layout = useCallback(
    (allowScroll: boolean) => {
      const hole = holeRef.current;
      const card = cardRef.current;
      if (!hole || !card) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cw = card.offsetWidth;
      const ch = card.offsetHeight;
      const el = step.targets ? findTarget(step.targets) : null;

      if (!el) {
        // Nothing to point at: close the light to a point and centre the card.
        Object.assign(hole.style, { top: `${vh / 2}px`, left: `${vw / 2}px`, width: "0px", height: "0px" });
        Object.assign(card.style, { top: `${Math.max(MARGIN, (vh - ch) / 2)}px`, left: `${(vw - cw) / 2}px` });
        return;
      }

      const side = step.side ?? "bottom";
      let r = el.getBoundingClientRect();

      // Bring the target (and the card, when it goes above or below) into view.
      // The scroll is smooth, so the light is placed where the target WILL be
      // and the page slides up into it, rather than chasing it.
      if (allowScroll) {
        const top = side === "top" ? r.top - PAD - GAP - ch : r.top - PAD;
        const bottom = side === "bottom" ? r.bottom + PAD + GAP + ch : r.bottom + PAD;
        if (top < MARGIN || bottom > vh - MARGIN) {
          const height = bottom - top;
          const want = height <= vh - 2 * MARGIN ? (vh - height) / 2 : MARGIN;
          const max = document.documentElement.scrollHeight - vh;
          const nextY = clamp(window.scrollY + (top - want), 0, max);
          const dy = nextY - window.scrollY;
          if (Math.abs(dy) > 1) {
            const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            window.scrollTo({ top: nextY, behavior: reduce ? "auto" : "smooth" });
            r = new DOMRect(r.x, r.y - dy, r.width, r.height);
          }
        }
      }

      const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 8;
      const box = { top: r.top - PAD, left: r.left - PAD, right: r.right + PAD, bottom: r.bottom + PAD };
      Object.assign(hole.style, {
        top: `${box.top}px`,
        left: `${box.left}px`,
        width: `${box.right - box.left}px`,
        height: `${box.bottom - box.top}px`,
        borderRadius: `${radius + PAD}px`,
      });

      const order: Side[] = [side, "bottom", "top", "right", "left"];
      let spot: { top: number; left: number } | null = null;
      for (const s of order) {
        if (s === "bottom" && box.bottom + GAP + ch <= vh - MARGIN) {
          spot = { top: box.bottom + GAP, left: clamp(box.left, MARGIN, vw - cw - MARGIN) };
        } else if (s === "top" && box.top - GAP - ch >= MARGIN) {
          spot = { top: box.top - GAP - ch, left: clamp(box.left, MARGIN, vw - cw - MARGIN) };
        } else if (s === "right" && box.right + GAP + cw <= vw - MARGIN) {
          spot = { top: clamp(box.top, MARGIN, vh - ch - MARGIN), left: box.right + GAP };
        } else if (s === "left" && box.left - GAP - cw >= MARGIN) {
          spot = { top: clamp(box.top, MARGIN, vh - ch - MARGIN), left: box.left - GAP - cw };
        }
        if (spot) break;
      }
      spot ??= { top: vh - ch - MARGIN, left: (vw - cw) / 2 };
      Object.assign(card.style, { top: `${spot.top}px`, left: `${spot.left}px` });
    },
    [step],
  );

  // Place everything for this step before it paints, then correct once the
  // smooth scroll has settled.
  useLayoutEffect(() => {
    layout(true);
    const settle = window.setTimeout(() => layout(false), 700);
    return () => window.clearTimeout(settle);
  }, [layout]);

  useEffect(() => {
    const onResize = () => layout(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [layout]);

  // The page stays put underneath: the tour does the scrolling.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true });
  }, [index]);

  const finish = useCallback(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    onDone();
  }, [onDone]);

  const next = useCallback(() => {
    if (index === 0 && plan.length === 1) {
      const all = stepsFor(firstName);
      setPlan([all[0], ...all.slice(1).filter((s) => s.targets && findTarget(s.targets))]);
      setIndex(1);
    } else if (last) {
      finish();
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, plan.length, firstName, last, finish]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") back();
      else if (event.key === "Tab") {
        // Keep keyboard focus inside the card while the page is covered.
        const focusable = cardRef.current?.querySelectorAll<HTMLElement>("button");
        if (!focusable?.length) return;
        const first = focusable[0];
        const lastEl = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          lastEl.focus();
        } else if (!event.shiftKey && document.activeElement === lastEl) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back]);

  const counted = plan.length > 1 ? plan.slice(1) : [];

  return (
    <div className="animate-fade fixed inset-0 z-50" aria-hidden={false}>
      <div
        ref={holeRef}
        aria-hidden="true"
        className="pointer-events-none fixed ring-2 ring-white/70 transition-[top,left,width,height,border-radius] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ boxShadow: "0 0 0 200vmax color-mix(in oklch, var(--color-brand-950) 58%, transparent)" }}
      />

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="spotlight-title"
        aria-describedby="spotlight-body"
        className="fixed w-[min(23rem,calc(100vw-2rem))] rounded-2xl bg-white p-5 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] transition-[top,left] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:p-6"
      >
        <div key={index} className="animate-rise">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-800">{step.eyebrow}</p>
          <h2 id="spotlight-title" className="mt-1.5 text-lg font-bold tracking-tight text-ink-900">
            {step.title}
          </h2>
          <p id="spotlight-body" className="mt-2 text-sm leading-relaxed text-ink-600">
            {step.body}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          {index > 0 ? (
            <div className="flex items-center gap-1.5" aria-label={`Step ${index} of ${counted.length}`}>
              {counted.map((s, i) => (
                <span
                  key={s.title}
                  aria-hidden="true"
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i + 1 === index ? "w-5 bg-brand-900" : i + 1 < index ? "w-1.5 bg-brand-900/50" : "w-1.5 bg-ink-200"
                  }`}
                />
              ))}
            </div>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1.5">
            {index > 0 && (
              <button
                type="button"
                onClick={back}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Back
              </button>
            )}
            <button
              ref={primaryRef}
              type="button"
              onClick={next}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-900 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgb(0_0_0/0.7)] transition-colors hover:bg-brand-800"
            >
              {index === 0 ? "Show me" : last ? "Finish" : "Next"}
              {!last && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
