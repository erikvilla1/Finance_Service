"use client";

import type { ComponentProps, MouseEvent } from "react";
import { ButtonLink } from "@/components/ui";

/**
 * ButtonLink with the shimmer lit and the glow following the cursor.
 *
 * WHY THIS IS A SEPARATE FILE. The glow reads its position from --glow-x and
 * --glow-y, which have to come from a mousemove handler. components/ui/index.tsx
 * is a server module that every page imports, and a "use client" at the top of
 * it would drag the entire design system into the client bundle to give one
 * button a hover effect. This is the smallest thing that can own the handler.
 *
 * The same reason SubmitButton owns it for the prequal submit — that button is
 * already a client component for useFormStatus, so it had somewhere to put it.
 *
 * SHIMMER IS ON BY DEFAULT HERE, which is the point of reaching for this
 * component rather than passing the props by hand: it marks the one action a
 * page is built around. Two of these on a screen and neither is special.
 */
export function GlowButtonLink({
  shimmer = true,
  glow = true,
  ...props
}: ComponentProps<typeof ButtonLink>) {
  /**
   * Feeds the cursor glow its position.
   *
   * WRITTEN STRAIGHT ONTO THE ELEMENT, NOT INTO STATE. Keeping the coordinates
   * in useState re-renders on every mousemove — dozens of React renders a second
   * to move a circle. Setting two custom properties on the node skips React
   * entirely and lets the compositor place it, and nothing in the render output
   * depends on the value.
   *
   * No mouseleave handler either: the glow's opacity is driven by :hover in CSS,
   * so it fades out on its own and the stale coordinates behind it are invisible
   * and harmless.
   */
  function trackGlow(event: MouseEvent<HTMLAnchorElement>) {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--glow-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--glow-y", `${event.clientY - rect.top}px`);
  }

  return (
    <ButtonLink
      shimmer={shimmer}
      glow={glow}
      onMouseMove={trackGlow}
      {...props}
    />
  );
}
