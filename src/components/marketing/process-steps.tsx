"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import Image from "next/image";
import { BatteryFull, Mail, Wifi } from "lucide-react";
import { GRAIN } from "@/components/marketing/grain-gradient";
import { Reveal } from "@/components/marketing/reveal";
import { useMediaQuery } from "@/components/marketing/use-reduced-motion";

export interface ProcessStep {
  title: string;
  body: string;
}

/**
 * Scroll distance allotted to each step, as a fraction of viewport height.
 *
 * Sets the pace of the whole section. Lower it to move faster.
 */
const STEP_VH = 50;

const pad = (n: number) => String(n).padStart(2, "0");
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* -------------------------------------------------------------------------- */
/* The showcase                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Real screens from the site, and the real client emails, captured from the
 * running app with a made-up business ("Northside Fabrication LLC") so no
 * applicant's data is ever on the marketing page. They live in
 * public/showcase/, at 2x, from a 960px-wide window so the text is large
 * relative to the frame it is shown in.
 *
 * TO REFRESH THEM, re-capture the same filenames the same way (2x device
 * scale, reduced motion, so every entrance animation has settled): the
 * prequal pages straight from /start, and the results, account, dashboard and
 * email screens from copies of those pages fed the example data. The dashboard
 * shots are of the current, unfinished portal and are the ones to replace
 * once it is redesigned.
 *
 * SERVED UNOPTIMIZED. Next's image pipeline only allows quality 75 by default
 * (Next 16), and re-encoding a screenshot of small UI text at 75 is exactly
 * what makes it look soft. These are already sized and compressed.
 */
interface Shot {
  src: string;
  width: number;
  height: number;
  alt: string;
}

const shot = (name: string, width: number, height: number, alt: string): Shot => ({
  src: `/showcase/${name}.webp`,
  width,
  height,
  alt,
});

/** An overlay that is an email gets an inbox header above the message. */
interface Overlay {
  shot: Shot;
  /** Width of the overlay as a share of the frame. */
  width: string;
  email?: { subject: string };
}

interface Scene {
  /** What the browser window's address bar shows. */
  path: string;
  screen: Shot;
  overlay: Overlay;
  /**
   * The fake cursor's route for this step: a point it passes over on the page
   * (as fractions of the frame), then the point it clicks (as fractions of
   * the overlay card), usually the control the step is about.
   */
  cursor: { hover: [number, number]; click: [number, number] };
}

const SCENES: Scene[] = [
  {
    path: "/start",
    screen: shot("start", 1920, 2750, "The goal picker: what are you looking to accomplish?"),
    overlay: { shot: shot("start-tile", 868, 244, "The Equipment Financing option"), width: "w-[44%]" },
    cursor: { hover: [0.34, 0.42], click: [0.42, 0.5] },
  },
  {
    path: "/start/prequal",
    screen: shot("prequal", 1920, 1800, "Prequalification, question three of eight"),
    overlay: { shot: shot("prequal-form", 1440, 682, "Two questions answered, the third being filled in"), width: "w-[50%]" },
    cursor: { hover: [0.38, 0.58], click: [0.1, 0.67] },
  },
  {
    path: "/start/result",
    screen: shot("result", 1920, 3000, "Prequalification results"),
    overlay: { shot: shot("result-option", 868, 468, "Equipment Financing, with an illustrative range of $90,000 to $150,000"), width: "w-[42%]" },
    cursor: { hover: [0.3, 0.5], click: [0.42, 0.4] },
  },
  {
    path: "/create-account",
    screen: shot("create-account", 1920, 2364, "Create your account"),
    overlay: { shot: shot("card-received", 1536, 1026, "Dashboard: application received"), width: "w-[52%]" },
    cursor: { hover: [0.44, 0.52], click: [0.27, 0.5] },
  },
  {
    path: "/dashboard/documents",
    screen: shot("documents", 1920, 2750, "The document checklist"),
    overlay: { shot: shot("card-need", 1536, 1026, "Dashboard: two documents still to send"), width: "w-[52%]" },
    cursor: { hover: [0.4, 0.46], click: [0.14, 0.72] },
  },
  {
    path: "/dashboard",
    screen: shot("dashboard-docsdone", 1920, 1800, "Dashboard: documents accepted"),
    overlay: {
      shot: shot("email-documents", 1120, 746, "Email: we have everything we asked for"),
      width: "w-[46%]",
      email: { subject: "We have everything we asked for" },
    },
    cursor: { hover: [0.36, 0.44], click: [0.24, 0.75] },
  },
  {
    path: "/dashboard",
    screen: shot("dashboard-sign", 1920, 1800, "Dashboard: application ready to sign"),
    overlay: {
      shot: shot("email-sign", 1120, 784, "Email: your application is ready to sign"),
      width: "w-[46%]",
      email: { subject: "Your financing application is ready to sign" },
    },
    cursor: { hover: [0.3, 0.66], click: [0.21, 0.72] },
  },
  {
    path: "/dashboard",
    screen: shot("dashboard-complete", 1920, 1800, "Dashboard: complete"),
    overlay: { shot: shot("card-complete", 1536, 930, "Dashboard: application complete"), width: "w-[52%]" },
    cursor: { hover: [0.42, 0.4], click: [0.88, 0.11] },
  },
];

/**
 * The window's viewport height. The pan animation reads it as --window-h.
 * The frame is 34rem tall: a 1.5rem menu bar, 1.25rem of desktop, the window
 * (2.25rem title bar + this), then 1.5rem of desktop below. So this is
 * 34 − 1.5 − 1.25 − 2.25 − 1.5.
 */
const WINDOW_H = "27.5rem";

/**
 * The menu bar clock: the viewer's own date and time, the way a real menu bar
 * shows it ("Sat Sep 26  4:16 PM"), so the screen always reads as today.
 * It ticks on the minute. The showcase only ever renders in the browser (the
 * pinned layout is chosen by a media query), so there is no server time to
 * disagree with; the server snapshot is just a blank.
 */
function subscribeToClock(onTick: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const next = () => {
    timer = setTimeout(() => {
      onTick();
      next();
    }, 60_000 - (Date.now() % 60_000));
  };
  next();
  return () => clearTimeout(timer);
}

function readClock() {
  const now = new Date();
  const part = (options: Intl.DateTimeFormatOptions) =>
    now.toLocaleString("en-US", options);
  const date = `${part({ weekday: "short" })} ${part({ month: "short" })} ${part({ day: "numeric" })}`;
  return `${date}\u00a0\u00a0${part({ hour: "numeric", minute: "2-digit" })}`;
}

function MenuBarClock() {
  const time = useSyncExternalStore(subscribeToClock, readClock, () => "");
  return <span className="tabular-nums">{time}</span>;
}

/**
 * A browser window of the site on a desktop, with a closer crop (or
 * the email that step sends) overlapping its lower right.
 *
 * NOTHING LEAVES THE FRAME. The window is fixed; between steps its page
 * cross-fades in place, settling out of a slight scale and blur, and the
 * address bar changes with it. The overlay fades out where it is and the next
 * one rises into the same spot. Scroll decides which step is showing; the
 * change itself then plays on its own clock, so a screen is never left
 * half-arrived when the reader stops.
 *
 * ALIVE WHILE IT HOLDS. The current page scrolls slowly down and back inside
 * the window, as if someone were reading it, and the overlay floats. Both are
 * CSS animations on the current step's elements only (see globals.css), so
 * each starts again from the top when its step comes round.
 *
 * Every step's images are mounted from the start, so nothing pops in while
 * it loads.
 */
function Showcase({ active }: { active: number }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cursorRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLSpanElement>(null);

  // ---- The fake cursor. Each step it glides over the page, then to the
  // control in the overlay card that the step is about, and clicks it. It
  // always starts from wherever it is, so a step change mid-move turns rather
  // than jumps. Web Animations rather than CSS, because the route depends on
  // where things are laid out and has to be interruptible.
  useEffect(() => {
    const frame = frameRef.current;
    const cursor = cursorRef.current;
    const pointer = pointerRef.current;
    const ripple = rippleRef.current;
    const overlay = overlayRefs.current[active];
    const route = SCENES[active]?.cursor;
    if (!frame || !cursor || !pointer || !ripple || !overlay || !route) return;

    // Current position, from wherever the last move left it.
    const current = new DOMMatrixReadOnly(getComputedStyle(cursor).transform);
    const from = { x: current.m41, y: current.m42 };

    // offset* rather than getBoundingClientRect: the overlay is mid-entrance
    // (translated, scaled) right now, and offsets ignore transforms.
    const hover = {
      x: frame.offsetWidth * route.hover[0],
      y: frame.offsetHeight * route.hover[1],
    };
    const click = {
      x: overlay.offsetLeft + overlay.offsetWidth * route.click[0],
      y: overlay.offsetTop + overlay.offsetHeight * route.click[1],
    };

    const at = (point: { x: number; y: number }) =>
      `translate(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px)`;
    const glide = "cubic-bezier(0.45, 0, 0.2, 1)";
    const total = 2600;
    const pressAt = 2050;

    const move = cursor.animate(
      [
        { transform: at(from), offset: 0 },
        { transform: at(from), offset: 350 / total, easing: glide },
        { transform: at(hover), offset: 1100 / total },
        { transform: at(hover), offset: 1350 / total, easing: glide },
        { transform: at(click), offset: pressAt / total - 0.02 },
        { transform: at(click), offset: 1 },
      ],
      { duration: total, fill: "forwards" },
    );
    const press = pointer.animate(
      [{ transform: "scale(1)" }, { transform: "scale(0.82)" }, { transform: "scale(1)" }],
      { duration: 260, delay: pressAt, easing: "ease-out" },
    );
    ripple.style.left = `${click.x}px`;
    ripple.style.top = `${click.y}px`;
    const ring = ripple.animate(
      [
        { transform: "translate(-50%, -50%) scale(0.2)", opacity: 0.7 },
        { transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
      ],
      { duration: 650, delay: pressAt + 40, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" },
    );

    return () => {
      // Keep the cursor where it got to, so the next step starts from there.
      // Only while it is still on the page: when the showcase unmounts (a
      // navigation away, or the window narrowing to the static layout) the
      // cursor is already detached, and commitStyles throws on an element
      // that isn't rendered. There is nothing to keep in that case anyway.
      if (cursor.isConnected) {
        try {
          move.commitStyles();
        } catch {
          // Not rendered (e.g. display: none mid-teardown). Nothing to keep.
        }
      }
      move.cancel();
      press.cancel();
      ring.cancel();
    };
  }, [active]);

  return (
    // The wrapper is not clipped, so the overlay card can hang past the
    // panel's edge; the panel inside it clips its own rounded corners. The
    // panel sits at the wrapper's origin, so the cursor's coordinates (from
    // the panel's size and the overlay's offsets) share one space.
    <div className="relative w-full max-w-[54rem]">
    <div
      ref={frameRef}
      onMouseMove={(event) => {
        const frame = frameRef.current;
        if (!frame) return;
        const rect = frame.getBoundingClientRect();
        frame.style.setProperty("--x", `${event.clientX - rect.left}px`);
        frame.style.setProperty("--y", `${event.clientY - rect.top}px`);
      }}
      className="group relative h-[34rem] w-full overflow-hidden rounded-[2rem] bg-accent-100 shadow-[0_40px_80px_-40px_rgb(16_24_40/0.45)] ring-1 ring-black/10"
    >
      {/*
        THE DESKTOP. The panel is a computer screen: a wallpaper, a menu bar
        with today's date, and the browser window open on it. The wallpaper
        is a warm pearl on the site's own palette: a soft light from the top
        right, a champagne glow rising from the bottom left, and the same fine
        grain as the sign-in background. The top-right light is kept faint:
        at full strength it washed out the menu bar's clock and icons. No dark bands (the sign-in gradient's
        deeper ring read as brown at this size) and nothing cool-toned (a pale
        blue sat apart from the rest of the page). Quiet on purpose, so the
        page in the window is the only thing to look at.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(70% 65% at 100% 0%, rgb(255 255 255 / 0.4) 0%, transparent 70%)",
            "radial-gradient(85% 75% at 0% 100%, color-mix(in oklch, var(--color-champagne-400) 70%, transparent) 0%, transparent 72%)",
            "radial-gradient(60% 55% at 85% 100%, color-mix(in oklch, var(--color-champagne-500) 35%, transparent) 0%, transparent 70%)",
            "linear-gradient(160deg, #EFEAE2 0%, #E5DDCF 100%)",
          ].join(", "),
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay"
        style={{ backgroundImage: `url("${GRAIN}")` }}
      />
      {/* Menu bar: translucent, like a real one, with the status items and
          today's date and time on the right. pr-8 matches the panel's 2rem
          corner radius, so the clock clears the curve instead of being
          clipped by it. Mostly white with a hairline under it, so it reads as
          a bar and not as a lighter patch of the wallpaper. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-10 flex h-6 items-center justify-end gap-3.5 border-b border-black/[0.06] bg-white/70 pl-4 pr-8 text-[11px] font-medium text-ink-800 backdrop-blur-md"
      >
        <Wifi className="h-3.5 w-3.5" strokeWidth={2.25} />
        <BatteryFull className="h-4 w-4" strokeWidth={1.75} />
        <MenuBarClock />
      </div>
      {/* Cursor spotlight, for the real mouse. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(520px circle at var(--x, 50%) var(--y, 50%), rgb(255 255 255 / 0.18), transparent 60%)",
        }}
      />

      {/* ------------------------------------------------ BROWSER WINDOW */}
      {/* Open on the desktop: under the menu bar, 1.5rem in from the sides
          and bottom. */}
      <div className="absolute inset-x-6 top-[2.75rem] overflow-hidden rounded-xl bg-white shadow-[0_30px_60px_-24px_rgb(40_30_10/0.45)] ring-1 ring-black/10">
        <div className="flex h-9 items-center gap-3 border-b border-ink-200 bg-ink-100 px-3.5">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
          </span>
          <span className="relative flex h-6 flex-1 items-center justify-center rounded-md bg-white text-[11px] text-ink-500 ring-1 ring-inset ring-ink-200">
            {/* Every address stacked, the current one shown, so a change
                cross-fades rather than snapping. */}
            {SCENES.map((scene, index) => (
              <span
                key={index}
                aria-hidden={index !== active}
                className={`absolute transition-opacity duration-300 ${
                  index === active ? "opacity-100" : "opacity-0"
                }`}
              >
                flscapitaladvisors.com{scene.path}
              </span>
            ))}
          </span>
        </div>
        <div
          className="relative overflow-hidden bg-white"
          style={{ height: WINDOW_H, "--window-h": WINDOW_H } as CSSProperties}
        >
          {SCENES.map((scene, index) => {
            const on = index === active;
            return (
              <div
                key={index}
                aria-hidden={!on}
                className={`absolute inset-x-0 top-0 transition-[opacity,transform,filter] ${
                  on
                    ? "scale-100 opacity-100 blur-0 delay-75 duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    : "scale-[1.025] opacity-0 blur-[6px] duration-400 ease-out"
                }`}
              >
                <Image
                  src={scene.screen.src}
                  width={scene.screen.width}
                  height={scene.screen.height}
                  alt={scene.screen.alt}
                  unoptimized
                  className={`h-auto w-full ${on ? "animate-showcase-pan" : ""}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>

      {/* ------------------------------------------------------ OVERLAY */}
      {/* Hangs 2rem past the panel's lower-right corner, over the page. */}
      {SCENES.map((scene, index) => {
        const on = index === active;
        const { overlay } = scene;
        return (
          <div
            key={index}
            ref={(el) => {
              overlayRefs.current[index] = el;
            }}
            aria-hidden={!on}
            className={`pointer-events-none absolute -bottom-8 -right-8 z-30 ${overlay.width} transition-[opacity,transform,filter] ${
              on
                ? "translate-y-0 scale-100 opacity-100 blur-0 delay-200 duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                : "translate-y-4 scale-[0.98] opacity-0 blur-[4px] duration-300 ease-out"
            }`}
          >
            <div className={on ? "animate-showcase-float" : undefined}>
              <div className="overflow-hidden rounded-2xl bg-white shadow-[0_28px_60px_-18px_rgb(0_0_0/0.65)] ring-1 ring-black/5">
                {overlay.email && (
                  <div className="flex items-center gap-3 border-b border-ink-100 bg-ink-50 px-4 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white">
                      <Mail className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="flex items-baseline justify-between gap-2 text-[11px] text-ink-500">
                        <span className="font-semibold text-ink-900">FLS Capital Advisors</span>
                        Just now
                      </p>
                      <p className="truncate text-[11px] text-ink-700">{overlay.email.subject}</p>
                    </div>
                  </div>
                )}
                <Image
                  src={overlay.shot.src}
                  width={overlay.shot.width}
                  height={overlay.shot.height}
                  alt={overlay.shot.alt}
                  unoptimized
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* ------------------------------------------------------ CURSOR */}
      <span
        ref={rippleRef}
        aria-hidden="true"
        className="pointer-events-none absolute z-40 h-14 w-14 rounded-full border-2 border-gold-500 bg-gold-400/25 opacity-0"
      />
      {/* Positioned by the effect above. Starts over the window; the wrapper
          doesn't clip, so a start outside the panel would sit visible on the
          page. */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-50"
        style={{ transform: "translate(560px, 300px)" }}
      >
        <div className="animate-cursor-idle">
          {/* The tip of the arrow is the point: nudged so it lands exactly
              on the coordinates rather than 3px down and right of them. */}
          <div ref={pointerRef} className="-translate-x-[3px] -translate-y-[2px]" style={{ transformOrigin: "3px 2px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" className="drop-shadow-[0_2px_3px_rgb(0_0_0/0.35)]">
              <path
                d="M3 2 L3 19.5 L7.6 15.2 L10.6 21.6 L13.6 20.3 L10.7 14.1 L16.8 13.8 Z"
                fill="#1d1d1b"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * How it works.
 *
 * TWO RENDERS, ONE CONTENT. On a wide, tall enough window with motion allowed,
 * the section becomes a pinned stage (PinnedProcess): the page holds still
 * while scrolling plays the eight steps through, then lets go. Everywhere
 * else, including the server render, no-JS, and reduced motion, it is a plain
 * list with every step open beside one screen from the flow (StaticProcess).
 *
 * The query is read during render. Its server snapshot is false, so the
 * server and any browser that never hydrates get the static list, which is
 * the safe render.
 */
export function ProcessSteps({ steps }: { steps: ProcessStep[] }) {
  const pinned = useMediaQuery(
    "(min-width: 80rem) and (min-height: 44rem) and (prefers-reduced-motion: no-preference)",
  );
  return pinned ? <PinnedProcess steps={steps} /> : <StaticProcess steps={steps} />;
}

/* -------------------------------------------------------------------------- */
/* Pinned stage                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The stage fills the viewport while pinned. Left: the heading, a step
 * numeral, and the current step's title and description. Right: the
 * showcase, playing the real screens for whichever step the scroll is on.
 *
 * The left side is scrubbed: the numeral rolls and the step copy drifts past
 * as a direct function of scroll, written straight to the DOM from one
 * requestAnimationFrame callback so scrolling never re-renders React. React
 * state only changes at step boundaries, which is what cues the showcase.
 *
 * NOT HIJACKED. Scroll is never intercepted. The wrapper is simply tall and
 * the stage is sticky. A flick gets through it in a second, the scrollbar is
 * honest about how much is left, and the segments under the copy jump to any
 * step.
 */
function PinnedProcess({ steps }: { steps: ProcessStep[] }) {
  const count = steps.length;

  const outerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const numeralRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);

  /** The step whose slice the scroll is in. */
  const [active, setActive] = useState(0);

  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const outer = outerRef.current;
      const stage = stageRef.current;
      if (!outer || !stage) return;

      const vh = window.innerHeight;
      const top = outer.getBoundingClientRect().top;
      const travel = outer.offsetHeight - vh;
      const ratio = travel > 0 ? clamp01(-top / travel) : 0;

      // Position in steps, 0 → count. Step i owns [i, i + 1).
      const x = ratio * count;
      const index = Math.min(count - 1, Math.floor(x));
      setActive(index);
      stage.style.setProperty("--p", ratio.toFixed(4));
      stage.style.setProperty("--step-fill", (ratio === 1 ? 1 : x - index).toFixed(4));

      // ---- Numeral. Holds on each number and rolls to the next across a
      // short window centred on each boundary.
      if (numeralRef.current) {
        const y = x - 0.5;
        const k = Math.floor(y);
        const roll = Math.min(
          Math.max(k + easeInOut(clamp01((y - k - 0.32) / 0.36)), 0),
          count - 1,
        );
        numeralRef.current.style.transform = `translateY(${(-roll * 6.5).toFixed(3)}rem)`;
      }

      // ---- Step copy. Each block drifts up through its slice and fades at
      // the edges, so titles pass by like a slow reel. The first holds
      // before its slice and the last after, so neither is ever blank.
      textRefs.current.forEach((el, j) => {
        if (!el) return;
        let c = x - j - 0.5;
        if (j === 0) c = Math.max(c, 0);
        if (j === count - 1) c = Math.min(c, 0);
        // Full until 0.34 from its centre, gone by 0.48: the outgoing title
        // is out before the incoming one starts, so the two never overlap.
        const opacity = clamp01(1 - (Math.abs(c) - 0.34) / 0.14);
        el.style.opacity = opacity.toFixed(3);
        el.style.transform = `translateY(${(-c * 44).toFixed(1)}px)`;
        el.style.visibility = opacity > 0 ? "visible" : "hidden";
      });
    };

    const onScroll = () => {
      // One read per frame. Scroll fires faster than paint, and
      // getBoundingClientRect forces layout every call.
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [count]);

  // The static render this replaces is far shorter, so a page loaded with a
  // hash further down (/#about, /#resources) was scrolled into place before
  // this section grew, and now points into the middle of it. Re-apply the
  // hash once, now that the height is final.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const target = id ? document.getElementById(decodeURIComponent(id)) : null;
    if (target && outerRef.current && !outerRef.current.contains(target)) {
      target.scrollIntoView();
    }
  }, []);

  /** Scrolls to the middle of that step. */
  const jumpTo = useCallback(
    (index: number) => {
      const node = outerRef.current;
      if (!node) return;
      const travel = node.offsetHeight - window.innerHeight;
      const top = node.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: top + ((index + 0.5) / count) * travel,
        behavior: "smooth",
      });
    },
    [count],
  );

  return (
    <div
      ref={outerRef}
      className="relative"
      style={{ height: `${count * STEP_VH + 100}vh` }}
    >
      <div ref={stageRef} className="sticky top-0 h-dvh overflow-hidden">
        {/* Backdrop. A dot grid that drifts up as you scroll through, masked
            to fade out toward the edges, and one warm glow that travels
            from the lower right. Both transform-only. */}
        <div aria-hidden="true" className="process-dots pointer-events-none absolute inset-0">
          <div className="process-dots-layer" />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 -right-40 h-[46rem] w-[46rem] rounded-full bg-accent-500/40 blur-3xl"
          style={{
            transform:
              "translate3d(calc(var(--p, 0) * -34vw), calc(var(--p, 0) * -28vh), 0)",
          }}
        />

        {/* All eight steps for assistive tech. What is on screen shows one at
            a time and is hidden from it. */}
        <ol className="sr-only">
          {steps.map((step) => (
            <li key={step.title}>
              {step.title}. {step.body}
            </li>
          ))}
        </ol>

        {/* pt clears the floating site header, which sits over the top
            ~100px of the viewport. */}
        <div className="relative mx-auto flex h-full w-full max-w-[110rem] items-center px-14 pb-10 pt-24">
          <div className="grid w-full grid-cols-[minmax(0,24rem)_minmax(0,1fr)] items-center gap-12 min-[90rem]:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] min-[90rem]:gap-16">
            {/* ---------------------------------------------------- COPY */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                A simple path forward
              </h2>

              <div aria-hidden="true" className="mt-10">
                {/* Numeral: all eight in a column behind a one-numeral
                    window, rolled by scroll. */}
                <div className="h-[6.5rem] overflow-hidden">
                  <div ref={numeralRef}>
                    {steps.map((step, index) => (
                      <div
                        key={step.title}
                        className="process-numeral h-[6.5rem] w-fit text-[6.5rem] font-bold leading-none tracking-tight"
                      >
                        {pad(index + 1)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Every step's copy stacked in one grid cell, so the block
                    is always as tall as the longest and nothing below it
                    moves. */}
                <div className="mt-6 grid [&>*]:col-start-1 [&>*]:row-start-1">
                  {steps.map((step, index) => (
                    <div
                      key={step.title}
                      ref={(el) => {
                        textRefs.current[index] = el;
                      }}
                      style={{ opacity: index === 0 ? 1 : 0 }}
                    >
                      <h3 className="text-3xl font-bold tracking-tight text-ink-900 min-[90rem]:text-[2.5rem] min-[90rem]:leading-[1.1]">
                        {step.title}
                      </h3>
                      <p className="mt-4 text-lg leading-relaxed text-ink-600">
                        {step.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress. One segment per step: passed ones full, the
                  current one filling with scroll. Each jumps to its step. */}
              <div className="mt-10 flex items-center gap-4">
                <div className="flex flex-1 gap-1.5">
                  {steps.map((step, index) => (
                    <button
                      key={step.title}
                      type="button"
                      onClick={() => jumpTo(index)}
                      aria-label={`Go to step ${index + 1}: ${step.title}`}
                      aria-current={index === active ? "step" : undefined}
                      className="group relative h-6 flex-1"
                    >
                      <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-ink-200 transition-colors group-hover:bg-ink-300">
                        <span
                          className="block h-full origin-left bg-champagne-500"
                          style={{
                            transform:
                              index < active
                                ? "scaleX(1)"
                                : index === active
                                  ? "scaleX(var(--step-fill, 0))"
                                  : "scaleX(0)",
                          }}
                        />
                      </span>
                    </button>
                  ))}
                </div>
                <span className="text-sm font-medium tabular-nums text-ink-500">
                  {pad(active + 1)} / {pad(count)}
                </span>
              </div>

              {/* The disclaimer, as a footnote to the steps rather than a
                  caption floating under the showcase. */}
              <p className="mt-6 max-w-sm text-xs leading-relaxed text-ink-400">
                Screens and emails from the FLS application, shown with an
                example business. Figures are illustrative, not an offer.
              </p>
            </div>

            {/* ------------------------------------------------ SHOWCASE */}
            <div className="flex flex-col items-center">
              {/* pb-8 leaves room for the overlay card hanging below. */}
              <div className="w-full max-w-[54rem] pb-8">
                <Showcase active={active} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Static list                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Narrow or short windows, reduced motion, and the server render: every step
 * open, in order, down a drawn rail, beside one screen from the flow.
 */
function StaticProcess({ steps }: { steps: ProcessStep[] }) {
  return (
    <div className="mx-auto w-full max-w-[110rem] px-6 pb-16 pt-16 sm:px-10 sm:pb-24 sm:pt-24 lg:px-14">
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
          How it works
        </p>
      </Reveal>
      <Reveal delayMs={110}>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          A simple path forward
        </h2>
      </Reveal>
      <Reveal delayMs={220}>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-600">
          Eight steps from first question to funded file. Nothing here commits
          you to anything.
        </p>
      </Reveal>

      {/* minmax(0,1fr) on narrow screens too, so a wide child can never push
          the single column past the screen edge. */}
      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)] lg:items-start lg:gap-16">
        <ol className="flex flex-col border-l-2 border-accent-800">
          {steps.map((step, index) => (
            <li key={step.title} className="py-2.5 pl-6">
              <p className="flex items-baseline gap-4">
                <span className="w-5 shrink-0 text-xs font-semibold tabular-nums text-accent-800">
                  {pad(index + 1)}
                </span>
                <span className="text-lg font-semibold tracking-tight text-ink-900">
                  {step.title}
                </span>
              </p>
              <p className="max-w-md pb-1 pl-9 pt-1.5 leading-relaxed text-ink-600">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <div className="lg:sticky lg:top-32">
          <div className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-brand-900 to-brand-800 p-4 sm:p-8">
            {/* The top of the results page, in a window-shaped crop. */}
            <div className="aspect-[16/11] overflow-hidden rounded-xl bg-white ring-1 ring-white/10">
              <Image
                src={SCENES[2].screen.src}
                width={SCENES[2].screen.width}
                height={SCENES[2].screen.height}
                alt={SCENES[2].screen.alt}
                unoptimized
                className="h-auto w-full"
              />
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-ink-600">
            A screen from the FLS application, shown with an example business.
            Figures are illustrative, not an offer.
          </p>
        </div>
      </div>
    </div>
  );
}
