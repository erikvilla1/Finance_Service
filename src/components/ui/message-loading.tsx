"use client";

import { useId } from "react";

/**
 * Three dots rising in turn, a "working on it" mark.
 *
 * Adapted from the 21st.dev MessageLoading component. The animation is the
 * original's SVG <animate> chain: each dot's rise begins off the one before,
 * and the first restarts a quarter-second after the last lands. Changes:
 *
 *   - Colour comes from `currentColor` via className, not shadcn's
 *     `text-foreground`, a token this project doesn't define.
 *   - The chain's ids are per instance (useId). The original hard-coded
 *     "spinner_qFRN" and "spinner_OcgL", which are document-global, so a
 *     second copy on the same page would have tied both animations to
 *     whichever was declared first. useId's colons are stripped because
 *     SMIL's "id.end" syntax can't parse them.
 *   - Sized by className (the viewBox scales), default 24px as before.
 */
export function MessageLoading({ className = "h-6 w-6" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const first = `${id}-first`;
  const last = `${id}-last`;

  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <circle cx="4" cy="12" r="2" fill="currentColor">
        <animate
          id={first}
          begin={`0;${last}.end+0.25s`}
          attributeName="cy"
          calcMode="spline"
          dur="0.6s"
          values="12;6;12"
          keySplines=".33,.66,.66,1;.33,0,.66,.33"
        />
      </circle>
      <circle cx="12" cy="12" r="2" fill="currentColor">
        <animate
          begin={`${first}.begin+0.1s`}
          attributeName="cy"
          calcMode="spline"
          dur="0.6s"
          values="12;6;12"
          keySplines=".33,.66,.66,1;.33,0,.66,.33"
        />
      </circle>
      <circle cx="20" cy="12" r="2" fill="currentColor">
        <animate
          id={last}
          begin={`${first}.begin+0.2s`}
          attributeName="cy"
          calcMode="spline"
          dur="0.6s"
          values="12;6;12"
          keySplines=".33,.66,.66,1;.33,0,.66,.33"
        />
      </circle>
    </svg>
  );
}
