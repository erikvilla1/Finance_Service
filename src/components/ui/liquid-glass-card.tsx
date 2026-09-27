"use client";

import { useId, type CSSProperties, type ReactNode } from "react";

/**
 * A "liquid glass" surface: the page behind it blurred and gently warped,
 * with a soft outer glow and bright inner edges.
 *
 * Adapted from the 21st.dev LiquidGlassCard. What was kept is the look, which
 * is three stacked layers under the content:
 *
 *   bend  backdrop blur, run through an SVG turbulence + displacement filter
 *         so what shows through ripples like thick glass rather than frosting
 *   face  the outer shadow and white glow
 *   edge  inset highlights on the top-left and bottom-right rims
 *
 * What was left out: drag-to-wobble and click-to-expand. On a results panel
 * both read as the page coming loose, and they were the only reason the
 * original needed the `motion` package. Also dropped: @ts-nocheck, and the
 * shared filter id — the original hard-coded id="glass-blur", so two cards on
 * one page would both point at whichever filter came first. useId makes it
 * per instance.
 *
 * The warp is Chromium's: Safari and Firefox ignore an SVG url() filter on a
 * backdrop-filtered layer and show plain frosted glass, which is a fine
 * fallback.
 */

const BLUR = {
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
  xl: "backdrop-blur-xl",
} as const;

const EDGE = {
  none: "inset 0 0 0 0 rgba(255, 255, 255, 0)",
  xs: "inset 1px 1px 1px 0 rgba(255, 255, 255, 0.3), inset -1px -1px 1px 0 rgba(255, 255, 255, 0.3)",
  sm: "inset 2px 2px 2px 0 rgba(255, 255, 255, 0.35), inset -2px -2px 2px 0 rgba(255, 255, 255, 0.35)",
  md: "inset 3px 3px 3px 0 rgba(255, 255, 255, 0.45), inset -3px -3px 3px 0 rgba(255, 255, 255, 0.45)",
  lg: "inset 4px 4px 4px 0 rgba(255, 255, 255, 0.5), inset -4px -4px 4px 0 rgba(255, 255, 255, 0.5)",
  xl: "inset 6px 6px 6px 0 rgba(255, 255, 255, 0.55), inset -6px -6px 6px 0 rgba(255, 255, 255, 0.55)",
} as const;

const GLOW = {
  none: "0 4px 4px rgba(0, 0, 0, 0.05), 0 0 12px rgba(0, 0, 0, 0.05)",
  xs: "0 4px 4px rgba(0, 0, 0, 0.15), 0 0 12px rgba(0, 0, 0, 0.08), 0 0 16px rgba(255, 255, 255, 0.05)",
  sm: "0 4px 4px rgba(0, 0, 0, 0.15), 0 0 12px rgba(0, 0, 0, 0.08), 0 0 24px rgba(255, 255, 255, 0.1)",
  md: "0 4px 4px rgba(0, 0, 0, 0.15), 0 0 12px rgba(0, 0, 0, 0.08), 0 0 32px rgba(255, 255, 255, 0.15)",
  lg: "0 4px 4px rgba(0, 0, 0, 0.15), 0 0 12px rgba(0, 0, 0, 0.08), 0 0 40px rgba(255, 255, 255, 0.2)",
  xl: "0 4px 4px rgba(0, 0, 0, 0.15), 0 0 12px rgba(0, 0, 0, 0.08), 0 0 48px rgba(255, 255, 255, 0.25)",
} as const;

export function LiquidGlassCard({
  children,
  className = "",
  borderRadius = "1.25rem",
  blurIntensity = "xl",
  edgeIntensity = "md",
  glowIntensity = "sm",
  style,
}: {
  children: ReactNode;
  className?: string;
  borderRadius?: string;
  blurIntensity?: keyof typeof BLUR;
  edgeIntensity?: keyof typeof EDGE;
  glowIntensity?: keyof typeof GLOW;
  style?: CSSProperties;
}) {
  // useId returns colons (":r1:"), which are legal in an id but not inside
  // url(#...) without escaping. Strip them.
  const filterId = `glass-bend-${useId().replace(/:/g, "")}`;

  return (
    <div className={`relative ${className}`} style={{ borderRadius, ...style }}>
      <svg aria-hidden="true" className="absolute h-0 w-0">
        <defs>
          <filter id={filterId} x="0" y="0" width="100%" height="100%" filterUnits="objectBoundingBox">
            <feTurbulence type="fractalNoise" baseFrequency="0.003 0.007" numOctaves={1} result="turbulence" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="turbulence"
              scale={200}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Bend */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 z-0 ${BLUR[blurIntensity]}`}
        style={{ borderRadius, filter: `url(#${filterId})` }}
      />
      {/* Face */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10"
        style={{ borderRadius, boxShadow: GLOW[glowIntensity] }}
      />
      {/* Edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20"
        style={{ borderRadius, boxShadow: EDGE[edgeIntensity] }}
      />

      <div className="relative z-30">{children}</div>
    </div>
  );
}
