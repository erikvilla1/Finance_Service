import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

/**
 * The portal's shared pieces: the page header, the card surface, status pills
 * and the two button styles. The Overview set the look; these are it, named,
 * so the inner pages (application, documents, signing, settings, support)
 * read as the same product instead of an older one.
 */

/** Page title block. Inset to match the Overview's greeting; the right padding
 * keeps a long title clear of the Sign out button. */
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="pl-3 sm:pl-4 lg:pr-36">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-800">{eyebrow}</p>
      )}
      <h1 className={`${eyebrow ? "mt-2 " : ""}text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl`}>
        {title}
      </h1>
      {description && <p className="mt-2 max-w-2xl text-lg leading-relaxed text-ink-600">{description}</p>}
      {children}
    </header>
  );
}

export const panelClass = "rounded-3xl bg-white/85 p-6 ring-1 ring-inset ring-ink-200/70 backdrop-blur sm:p-8";

/** The card surface every portal section sits on. */
export function Panel<T extends ElementType = "section">({
  as,
  className = "",
  ...props
}: { as?: T; className?: string } & Omit<ComponentPropsWithoutRef<T>, "as" | "className">) {
  const Tag = (as ?? "section") as ElementType;
  return <Tag className={`${panelClass} ${className}`} {...props} />;
}

export type PillTone = "done" | "progress" | "todo" | "waiting" | "attention";

const pillTones: Record<PillTone, string> = {
  done: "bg-success-50 text-success-700",
  progress: "bg-accent-100 text-accent-800",
  todo: "bg-ink-100 text-ink-600",
  waiting: "bg-brand-50 text-brand-700",
  attention: "bg-warning-50 text-warning-700",
};

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${pillTones[tone]}`}>
      {children}
    </span>
  );
}

/** Dark, the portal's one call to action per view. */
export const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-900 px-5 text-sm font-semibold text-white " +
  "shadow-[0_10px_24px_-12px_rgb(0_0_0/0.7)] transition-colors hover:bg-brand-800 " +
  "disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500 disabled:shadow-none";

/** White with a hairline, for everything that isn't the main action. */
export const secondaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-ink-900 " +
  "ring-1 ring-inset ring-ink-200 transition-colors hover:ring-ink-400 disabled:cursor-not-allowed disabled:opacity-60";

export const textLink = "font-semibold text-brand-900 underline-offset-4 hover:underline";
