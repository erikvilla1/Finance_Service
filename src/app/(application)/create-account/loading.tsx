import { Card, Container } from "@/components/ui";

/**
 * What "Start Application Now" shows the instant it is clicked.
 *
 * WHY THIS FILE EXISTS. The account page reads the application on the server
 * before it can render (the token lookup in page.tsx), and a dynamic page
 * with no loading boundary is not prefetched and does not navigate until the
 * server has answered. On Vercel that answer can be a cold function start
 * plus a database round trip: the button appeared to do nothing for seconds
 * (client, 10-16: "immense lag when clicking start application"). With this
 * boundary Next prefetches the page's shell while the results page is still
 * on screen and swaps to it on click; the form streams in behind it.
 *
 * SHAPED LIKE THE PAGE IT STANDS IN FOR. The same backdrop as VideoBackdrop's
 * opening state (the footage as shot, a soft shadow behind the heading), so
 * when the page arrives and its backdrop starts settling darker nothing
 * jumps; the same column, the heading's width and the form's card, as quiet
 * bars. data-dark-bg keeps the layout's light logo up and its footer hidden,
 * as the page itself does.
 */
function Bone({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-lg bg-ink-900/[0.07] ${className}`} />;
}

export default function Loading() {
  return (
    <>
      <div data-dark-bg="" aria-hidden="true" className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(55%_38%_at_50%_30%,rgb(0_0_0/0.38),transparent)]" />
      </div>

      {/* The page's own column, margins included; see the note there. */}
      <Container className="relative z-10 -mb-8 -mt-[120px] flex min-h-dvh flex-col justify-center pb-8 pt-24 sm:-mb-10 sm:-mt-[156px] sm:pt-28 lg:pt-8 [@media(max-height:960px)]:pb-5 [@media(max-height:960px)]:lg:pt-5">
        <div
          role="status"
          aria-busy="true"
          aria-label="Loading your account page"
          className="mx-auto w-full max-w-lg"
        >
          <div className="flex flex-col items-center">
            <span className="block h-9 w-72 max-w-full animate-pulse rounded-lg bg-white/25 sm:h-10 sm:w-[26rem]" />
            <span className="mt-4 block h-5 w-80 max-w-full animate-pulse rounded-lg bg-white/15" />
          </div>

          <Card className="mt-8 [@media(max-height:960px)]:mt-6">
            <div className="space-y-5">
              {["w-24", "w-32", "w-20", "w-36"].map((width) => (
                <div key={width} className="space-y-2">
                  <Bone className={`h-3.5 ${width}`} />
                  <Bone className="h-11 w-full rounded-xl" />
                </div>
              ))}
              <Bone className="h-4 w-4/5" />
              <Bone className="h-12 w-full rounded-xl bg-ink-900/[0.12]" />
            </div>
          </Card>
        </div>
      </Container>
    </>
  );
}
