import Link from "next/link";
import Icon, { type IconName } from "@/components/admin/Icon";

// Shared building blocks so every admin screen has the same header, cards and empty states.

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="a-eyebrow mb-1.5">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-neutral-500">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`a-card min-w-0 p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="a-card-title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({
  icon = "image",
  title,
  text,
  href,
  action,
}: {
  icon?: IconName;
  title: string;
  text: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--a-olive-soft)] text-[var(--a-olive-d)]">
        <Icon name={icon} />
      </span>
      <p className="a-card-title">{title}</p>
      <p className="max-w-sm text-sm text-neutral-500">{text}</p>
      {href && action && (
        <Link href={href} className="a-btn a-btn-primary mt-2">
          {action}
        </Link>
      )}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      {children}
    </p>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`a-skel ${className}`} />;
}

/** A booking or portfolio thumbnail slot: a photo if there is one, otherwise a quiet placeholder. */
export function ThumbFallback({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid place-items-center bg-[var(--a-olive-soft)] text-[var(--a-olive)] ${className}`}
    >
      <Icon name="image" />
    </span>
  );
}