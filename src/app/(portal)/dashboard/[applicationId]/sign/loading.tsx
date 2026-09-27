import { FormPageSkeleton } from "@/components/portal/skeletons";

export default function Loading() {
  return <FormPageSkeleton fields={4} width="max-w-4xl" label="Loading your application to sign" />;
}
