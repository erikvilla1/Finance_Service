import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Design system primitives.
 *
 * Platform spec §32: cards, icons, clear hierarchy, strong whitespace,
 * mobile-first. Spec §39: accessible UI with loading, error, and empty states.
 *
 * Kept in one file deliberately — at this size, splitting into a dozen modules
 * costs more in navigation than it buys in organisation. Split when it grows.
 */

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// -----------------------------------------------------------------------------
// LAYOUT
// -----------------------------------------------------------------------------

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        // Padding matches the hero card's inner padding, and the cap only
        // engages on very wide displays. max-w-6xl centred used to start
        // section content ~140px right of where the hero's headline starts,
        // which made every section below the fold look indented relative to
        // the page it belongs to. Line length is held by max-w-* on the text
        // inside rather than by squeezing the whole column.
        "mx-auto w-full max-w-[110rem] px-6 sm:px-10 lg:px-14",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Section({
  children,
  className,
  tone = "default",
  id,
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "muted" | "brand";
  /** Anchor target. Sections on the single-page home use this for in-page nav. */
  id?: string;
}) {
  const tones = {
    default: "bg-white",
    muted: "bg-ink-50",
    brand: "bg-brand-900 text-brand-50",
  };
  return (
    <section
      id={id}
      className={cx(
        "py-16 sm:py-24",
        // Anchored sections would otherwise land under the floating header,
        // which is ~108px tall at its largest. Applied to every section rather
        // than only the anchored ones so it cannot be forgotten when a new id
        // is added.
        "scroll-mt-28 sm:scroll-mt-32",
        tones[tone],
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  inverted = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  inverted?: boolean;
}) {
  return (
    <div
      className={cx(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
      )}
    >
      {eyebrow && (
        <p
          className={cx(
            "mb-3 text-sm font-semibold uppercase tracking-wider",
            inverted ? "text-accent-300" : "text-brand-600",
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cx(
          "text-3xl font-bold tracking-tight sm:text-4xl",
          inverted ? "text-white" : "text-ink-900",
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cx(
            "mt-4 text-lg leading-relaxed",
            inverted ? "text-brand-100" : "text-ink-600",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// BUTTON
// -----------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "inverted";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-55";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent-500 text-brand-900 hover:bg-accent-600",
  secondary:
    "bg-white text-brand-800 ring-1 ring-inset ring-ink-300 hover:bg-ink-50",
  ghost: "text-brand-700 hover:bg-brand-50",
  inverted: "bg-white text-brand-800 hover:bg-brand-50",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-2.5 text-[0.95rem]",
  lg: "px-7 py-3.5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cx(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
    >
      {children}
    </Link>
  );
}

// -----------------------------------------------------------------------------
// CARD
// -----------------------------------------------------------------------------

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
}) {
  return (
    <Tag
      className={cx(
        "rounded-card bg-white p-6 shadow-card ring-1 ring-ink-200/70",
        // Only ever applies inside the admin shell — the dark variant is scoped
        // to that wrapper in globals.css, so these classes are inert on every
        // customer-facing page that uses this same component.
        "dark:bg-brand-900 dark:ring-brand-800",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * Card that navigates. Used by the goal selector.
 *
 * Two densities. The default is the roomy marketing card. `compact` is the
 * flat, tightly-packed tile used inside the application flow, where the goal
 * list is a decision to get through rather than something to browse: thinner
 * padding, a hairline border instead of a shadow, and the affordance moved to
 * a chevron so the tile height is set by the copy alone.
 */
export function SelectableCard({
  href,
  title,
  description,
  compact = false,
  className,
}: {
  href: string;
  title: string;
  description?: string;
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <Link
        href={href}
        className={cx(
          "group flex h-full items-start gap-3 rounded-xl bg-white px-4 py-4 text-left",
          "ring-1 ring-inset ring-ink-200 transition-colors",
          "hover:bg-brand-50/40 hover:ring-brand-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          className,
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink-900 group-hover:text-brand-700">
            {title}
          </span>
          {description && (
            <span className="mt-1 block text-sm leading-snug text-ink-600">
              {description}
            </span>
          )}
        </span>
        <ChevronRight
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-ink-300 transition-colors group-hover:text-brand-600"
        />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cx(
        "group flex h-full flex-col rounded-card bg-white p-6 text-left",
        "shadow-card ring-1 ring-ink-200/70 transition-all",
        "hover:shadow-card-hover hover:ring-brand-300",
        className,
      )}
    >
      <span className="text-lg font-semibold text-ink-900 group-hover:text-brand-700">
        {title}
      </span>
      {description && (
        <span className="mt-2 text-sm leading-relaxed text-ink-600">
          {description}
        </span>
      )}
      <span
        aria-hidden="true"
        className="mt-4 text-sm font-semibold text-brand-600"
      >
        Continue →
      </span>
    </Link>
  );
}

// -----------------------------------------------------------------------------
// BADGE
// -----------------------------------------------------------------------------

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  const tones: Record<BadgeTone, string> = {
    neutral: "bg-ink-100 text-ink-700 dark:bg-brand-800 dark:text-ink-300",
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-800 dark:text-ink-200",
    // The status scales only define 50/600/700 — no light steps exist to use as
    // dark-mode text. A translucent fill of the 600 with the 600 as text keeps
    // the same hue readable on a dark surface without inventing tokens.
    success: "bg-success-50 text-success-700 dark:bg-success-600/20 dark:text-success-600",
    warning: "bg-warning-50 text-warning-700 dark:bg-warning-600/20 dark:text-warning-600",
    danger: "bg-danger-50 text-danger-700 dark:bg-danger-600/20 dark:text-danger-600",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

// -----------------------------------------------------------------------------
// PROGRESS — the application flow and the document checklist both need one
// -----------------------------------------------------------------------------

export function ProgressBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label?: string;
}) {
  const safeMax = Math.max(max, 1);
  const pct = Math.min(100, Math.round((value / safeMax) * 100));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-ink-700">{label ?? "Progress"}</span>
        <span className="tabular-nums text-ink-500">
          {value} of {safeMax}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-2 w-full overflow-hidden rounded-full bg-ink-200"
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// STATES — spec §39 requires loading, error, and empty states everywhere
// -----------------------------------------------------------------------------

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-ink-300 bg-ink-50/50 p-10 text-center">
      <h3 className="text-base font-semibold text-ink-800">{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-card border border-danger-600/25 bg-danger-50 p-6"
    >
      <h3 className="text-base font-semibold text-danger-700">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-ink-700">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-ink-100" />
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// FORM FIELDS
// -----------------------------------------------------------------------------

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  inverted = false,
  hideLabel = false,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** For fields on a dark surface — ink-800 on brand-900 is unreadable. */
  inverted?: boolean;
  /**
   * Hide the label visually, keeping it for screen readers.
   *
   * For when the label is already on screen as part of a wider row — a heading
   * with a link beside it, say. The element still exists and is still
   * associated with the input, because "looks labelled" and "is labelled" are
   * different things and only one helps someone using a screen reader.
   */
  hideLabel?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className={cx(
          hideLabel && "sr-only",
          !hideLabel && "block text-sm font-medium",
          !hideLabel && (inverted ? "text-white" : "text-ink-800"),
        )}
      >
        {label}
        {required && !hideLabel && (
          <span
            className={cx("ml-1", inverted ? "text-brand-100" : "text-danger-600")}
            aria-hidden="true"
          >
            *
          </span>
        )}
      </label>
      {hint && (
        <p className={cx("text-sm", inverted ? "text-brand-100/80" : "text-ink-500")}>
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p
          role="alert"
          className={cx(
            "text-sm font-medium",
            inverted ? "text-white" : "text-danger-700",
          )}
        >
          {error}
        </p>
      )}
    </div>
  );
}

const controlClasses =
  "block w-full rounded-lg border-0 bg-white px-3.5 py-2.5 text-ink-900 " +
  "ring-1 ring-inset ring-ink-300 placeholder:text-ink-400 " +
  "focus:ring-2 focus:ring-inset focus:ring-brand-500 sm:text-[0.95rem]";

export function Input({
  className,
  ...props
}: ComponentPropsWithoutRef<"input">) {
  return <input className={cx(controlClasses, className)} {...props} />;
}

/**
 * A native <select>, restyled.
 *
 * WHY NATIVE. A custom listbox (Radix and friends) renders nothing without
 * JavaScript, and the prequal flow is built on the premise that it still works
 * when the bundle does not arrive — see the <noscript> fallback on the prequal
 * page. It would also replace the OS picker on mobile, where the native
 * control is a full-height wheel with momentum and type-ahead that no div can
 * match, and where most applicants are.
 *
 * So the appearance is rebuilt instead: the browser's chevron is removed with
 * appearance-none and replaced with an inlined SVG as a background image,
 * which is the only way to put a custom mark inside a native select. The SVG
 * uses ink-500 (#7e7d7d) — hard-coded because a background-image URL cannot
 * read a CSS variable.
 */
export function Select({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"select">) {
  return (
    <select
      className={cx(
        controlClasses,
        "cursor-pointer appearance-none bg-[length:1.15rem] bg-[right_0.75rem_center] bg-no-repeat pr-11",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222%22%20stroke%3D%22%237e7d7d%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]",
        // An unanswered select shows its placeholder option, which should read
        // as a prompt rather than as an answer already given.
        "[&:has(option[value='']:checked)]:text-ink-400",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: ComponentPropsWithoutRef<"textarea">) {
  return <textarea className={cx(controlClasses, className)} rows={4} {...props} />;
}

/** Large tap targets — most applicants will be on a phone. */
export function RadioCardGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: string; label: string; description?: string }[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        const checked = value === option.value;
        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cx(
              "flex cursor-pointer items-start gap-3 rounded-lg p-4 ring-1 ring-inset transition-colors",
              checked
                ? "bg-brand-50 ring-2 ring-brand-500"
                : "bg-white ring-ink-300 hover:bg-ink-50",
            )}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange?.(option.value)}
              className="mt-1 h-4 w-4 text-brand-600"
            />
            <span>
              <span className="block text-sm font-medium text-ink-900">
                {option.label}
              </span>
              {option.description && (
                <span className="mt-0.5 block text-sm text-ink-600">
                  {option.description}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// DISCLOSURE
// -----------------------------------------------------------------------------

/**
 * Standing disclaimer for anything resembling a prequalification result.
 *
 * BUSINESS_CONTEXT §12 and platform spec §26: results are indicative only and
 * never a commitment to lend. This component exists so that requirement is met
 * by construction rather than by remembering.
 */
export function IndicativeDisclosure({ className }: { className?: string }) {
  return (
    <p
      className={cx(
        "rounded-lg bg-ink-50 p-4 text-sm leading-relaxed text-ink-600",
        className,
      )}
    >
      This information is indicative only and is not a commitment to lend, an
      offer of credit, or an approval. Any financing is subject to qualification,
      lender review, and program availability. A financing specialist will review
      your information and may contact you if anything further is needed.
    </p>
  );
}
