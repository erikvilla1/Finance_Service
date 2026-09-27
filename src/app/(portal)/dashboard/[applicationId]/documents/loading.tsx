import { ListPageSkeleton } from "@/components/portal/skeletons";

/**
 * Spec §39 requires a loading state on every view. This one earns its keep:
 * the page makes four round trips to Supabase before it can render anything,
 * and without it a slow connection shows the portal chrome with an empty body,
 * which reads as "you have no documents" rather than "still loading".
 */
export default function Loading() {
  return <ListPageSkeleton rows={4} label="Loading your documents" />;
}
