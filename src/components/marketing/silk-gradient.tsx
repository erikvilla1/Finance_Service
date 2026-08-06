import type { CSSProperties } from "react";

/**
 * Recreation of the "Dreamy Pastel Wash" Silk Blend gradient (21st.dev
 * community gradients), recolored to the FLS brand palette — black → gray →
 * red → black — instead of the source's pastel stops.
 *
 * Silk Blend is a smooth, static, continuous linear gradient (no stripe
 * bands, no wave distortion), so unlike RibbonGradient this needs no canvas
 * or animation loop — a plain CSS linear-gradient is vector, GPU-composited,
 * and stays perfectly crisp at any size or pixel density. The grain layer is
 * the same feTurbulence SVG technique as the source export, blended via
 * background-blend-mode exactly as their CSS recipe does.
 */

const GRAIN_SVG =
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.100\'/%3E%3C/svg%3E")';

const GRADIENT =
  "linear-gradient(150deg, #1d1d1b 0%, #7e7d7d 33%, #e62427 67%, #1d1d1b 100%)";

export function SilkGradient({
  className,
  opacity = 1,
}: {
  /** Must include a positioning class (e.g. "fixed inset-0" or "absolute inset-0") — this component has no position of its own. */
  className?: string;
  /** 0–1. Use a low value (e.g. 0.12–0.2) for a subtle ambient background rather than a focal graphic. */
  opacity?: number;
}) {
  const style: CSSProperties = {
    opacity,
    backgroundColor: "#1d1d1b",
    backgroundImage: `${GRAIN_SVG}, ${GRADIENT}`,
    backgroundSize: "120px 120px, auto",
    backgroundBlendMode: "overlay, normal",
  };

  return <div aria-hidden="true" className={className} style={style} />;
}
