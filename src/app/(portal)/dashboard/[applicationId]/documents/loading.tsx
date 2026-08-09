import { Container, LoadingRows } from "@/components/ui";

/**
 * Spec §39 requires a loading state on every view. This one earns its keep:
 * the page makes four round trips to Supabase before it can render anything,
 * and without it a slow connection shows the portal chrome with an empty body,
 * which reads as "you have no documents" rather than "still loading".
 */
export default function Loading() {
  return (
    <Container>
      <div className="mx-auto max-w-3xl">
        <div className="h-9 w-64 animate-pulse rounded bg-ink-200" />
        <div className="mt-6">
          <LoadingRows rows={4} />
        </div>
      </div>
    </Container>
  );
}
