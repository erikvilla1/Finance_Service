import { ListPageSkeleton } from "@/components/portal/skeletons";

export default function Loading() {
  return <ListPageSkeleton rows={3} label="Loading your application" />;
}
