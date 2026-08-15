/**
 * Animated grain gradient — light red bleeding out of opposite corners, with a
 * fine noise dither over the top.
 *
 * WHY NOT @paper-design/shaders-react. The reference renders this on a WebGL
 * canvas that repaints every frame for as long as the page is open. On a
 * sign-in screen that is a GPU context and a continuous draw loop behind a
 * two-field form, on a laptop that is often on battery. It also fails to a
 * blank element wherever WebGL is unavailable or blocked, which on this page is
 * the entire right half.
 *
 * Two stacked radial gradients and an SVG noise overlay get within a hair of
 * the same image, animate on the compositor rather than the GPU draw loop, cost
 * no dependency, and degrade to a static gradient instead of to nothing.
 *
 * THE GRAIN IS A FILTER, NOT AN IMAGE. feTurbulence generates the noise in the
 * browser, so there is no texture file to ship and it resolves crisply at any
 * density. mix-blend-overlay lets the dark end stay dark — a flat white noise
 * layer would grey out the black and kill the contrast the whole effect
 * depends on.
 */

/**
 * fractalNoise at a high base frequency: fine sand rather than clouds.
 * numOctaves 4 is the point where added octaves stop being visible and start
 * being cost. Percent-encoded because a CSS url() cannot carry raw #, < or >.
 */
const GRAIN =
  "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22240%22%20height%3D%22240%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.85%22%20numOctaves%3D%224%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E";

/**
 * The light preset, shared by the application flow and the sign-in screen.
 *
 * Exported rather than repeated so the two cannot drift: they are meant to read
 * as one continuous surface as someone moves between them, and two hardcoded
 * pairs of values will always eventually disagree.
 */
export const LIGHT_GRADIENT = { base: "#F6EFE0", intensity: 0.55 } as const;

export function GrainGradient({
  className,
  base = "#070707",
  intensity = 1,
}: {
  className?: string;
  /**
   * Colour behind the glow.
   *
   * Defaults to the near-black the sign-in screen uses. The application flow
   * passes a light one: the same gradient over a dark base would invert a
   * page made of white cards and dark type. Everything else — the corner
   * radials, the drift, the grain — is identical, which is what makes the two
   * screens read as the same treatment rather than the same colour.
   */
  base?: string;
  /** Strength of the corner glow. Lower it when the gradient sits behind content. */
  intensity?: number;
}) {
  return (
    <div aria-hidden="true" className={className}>
      <div className="absolute inset-0" style={{ backgroundColor: base }} />

      {/*
        Two corners, opposite each other, each running white → light red →
        nothing. The white core is what stops it reading as a flat wash: the
        colour has to have somewhere brighter to come from.

        Tokens rather than hex — accent-* is the red scale, and Tailwind v4
        exposes every token as a CSS variable, so this stays on-palette if the
        brand shifts.
      */}
      <div
        className="grain-drift absolute inset-[-20%]"
        style={{
          opacity: intensity,
          backgroundImage: [
            "radial-gradient(115% 85% at 100% 0%, #ffffff 0%, var(--color-accent-400) 26%, var(--color-accent-700) 44%, transparent 66%)",
            "radial-gradient(100% 80% at 0% 100%, #ffffff 0%, var(--color-accent-300) 24%, var(--color-accent-600) 42%, transparent 64%)",
          ].join(", "),
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.28] mix-blend-overlay"
        style={{ backgroundImage: `url("${GRAIN}")` }}
      />
    </div>
  );
}
