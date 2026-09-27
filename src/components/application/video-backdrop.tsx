/**
 * Account creation's overlay on the drone footage, settling darker. The
 * footage itself is the flow layout's (FlowVideo), the same element the
 * results page showed, so it keeps playing across the move.
 *
 * THE FADE, THE RESULTS PAGE'S IN REVERSE. The results page arrives dark and
 * brightens to the footage as shot; this page arrives at that brightness, so
 * the handoff is seamless, and darkens over about three seconds to the
 * results page's opening overlay (the same two gradients). While it's still
 * bright, a soft
 * shadow behind the centred heading keeps the white type legible over the sky;
 * it fades out as the overlay takes over. See .scrim-lift and .scrim-settle
 * in globals.css. Reduced motion lands on the finished state.
 *
 * data-dark-bg switches the header to the light logo and hides the flow's
 * footer (globals.css).
 *
 * Pages using it put their content in a `relative z-10` wrapper: this layer
 * is z-0, fixed, and would otherwise paint over unpositioned content.
 */
export function VideoBackdrop() {
  return (
    <div data-dark-bg="" aria-hidden="true" className="fixed inset-0 z-0">
      <div className="scrim-lift absolute inset-0 bg-[radial-gradient(55%_38%_at_50%_30%,rgb(0_0_0/0.38),transparent)]" />
      <div className="scrim-settle absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-950/90 via-brand-950/65 to-brand-950/35" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/55 via-transparent to-brand-950/70" />
      </div>
    </div>
  );
}
