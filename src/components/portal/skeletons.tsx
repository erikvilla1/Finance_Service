import { panelClass } from "./ui";

/**
 * Loading placeholders for the portal's pages, shaped like the pages they
 * stand in for. Every portal page reads Supabase before it can render, so a
 * click in the sidebar used to show nothing (or the old page) until the data
 * came back. Now the new page's frame appears at once and fills in.
 *
 * Deliberately plain: soft bars on the same cards, no spinners. They're on
 * screen for a moment; they should read as "the page", not as "loading".
 */

function Bone({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-lg bg-ink-900/[0.07] ${className}`} />;
}

function HeaderSkeleton({ eyebrow = false, description = true }: { eyebrow?: boolean; description?: boolean }) {
  return (
    <div className="pl-3 sm:pl-4 lg:pr-36">
      {eyebrow && <Bone className="mb-3 h-3 w-40" />}
      <Bone className="h-9 w-72 max-w-full" />
      {description && <Bone className="mt-3 h-5 w-[28rem] max-w-full" />}
    </div>
  );
}

function PanelSkeleton({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`${panelClass} ${className}`}>
      <Bone className="h-4 w-32" />
      <div className="mt-5 space-y-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Bone className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Bone className="h-3.5 w-2/5" />
              <Bone className="h-2 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldsSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className={panelClass}>
      <div className="space-y-6">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Bone className="h-3.5 w-36" />
            <Bone className="h-11 w-full rounded-lg" />
          </div>
        ))}
        <Bone className="h-11 w-44 rounded-xl" />
      </div>
    </div>
  );
}

/** Overview: header, the three main cards, and the side column. */
export function OverviewSkeleton() {
  return (
    <div className="mx-auto max-w-5xl" role="status" aria-label="Loading your dashboard">
      <HeaderSkeleton eyebrow />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <div className={panelClass}>
            <Bone className="h-3 w-28" />
            <Bone className="mt-3 h-7 w-64 max-w-full" />
            <Bone className="mt-3 h-4 w-full" />
            <div className="mt-7 grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Bone key={i} className="h-7 w-full rounded-full" />
              ))}
            </div>
          </div>
          <Bone className="h-40 w-full rounded-3xl" />
          <PanelSkeleton rows={2} />
        </div>
        <div className="space-y-6">
          <PanelSkeleton rows={2} className="sm:p-6" />
          <PanelSkeleton rows={3} className="sm:p-6" />
        </div>
      </div>
    </div>
  );
}

/** A list with a side column: the application overview, documents, support. */
export function ListPageSkeleton({ rows = 4, label }: { rows?: number; label: string }) {
  return (
    <div className="mx-auto max-w-5xl" role="status" aria-label={label}>
      <HeaderSkeleton />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <PanelSkeleton rows={rows} className="min-w-0" />
        <div className="space-y-6">
          <PanelSkeleton rows={1} className="sm:p-6" />
          <PanelSkeleton rows={2} className="sm:p-6" />
        </div>
      </div>
    </div>
  );
}

/** One column of fields: a section of the application, obligations, settings. */
export function FormPageSkeleton({
  steps = false,
  fields = 5,
  width = "max-w-3xl",
  label,
}: {
  steps?: boolean;
  fields?: number;
  width?: "max-w-3xl" | "max-w-4xl";
  label: string;
}) {
  return (
    <div className={`mx-auto ${width}`} role="status" aria-label={label}>
      <HeaderSkeleton eyebrow={steps} />
      {steps && (
        <div className="mt-8 flex gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Bone key={i} className="h-1.5 flex-1 rounded-full" />
          ))}
        </div>
      )}
      <div className="mt-8">
        <FieldsSkeleton fields={fields} />
      </div>
    </div>
  );
}
