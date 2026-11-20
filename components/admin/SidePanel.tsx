import Link from "next/link";
import DrawerBehavior from "@/components/admin/DrawerBehavior";
import Icon from "@/components/admin/Icon";

/** A server-rendered slide-in panel. It closes with a plain link, and behaves like a dialog (focus, Escape). */
export default function SidePanel({
  id,
  eyebrow,
  title,
  closeHref,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  closeHref: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Link
        href={closeHref}
        scroll={false}
        aria-label={`Close ${title}`}
        className="a-drawer-back"
      />
      <DrawerBehavior closeHref={closeHref} drawerId={id} />
      <aside id={id} role="dialog" aria-modal="true" aria-label={title} className="a-drawer">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--a-line)] bg-[var(--a-bg)] px-5 py-4">
          <div className="min-w-0">
            <p className="a-eyebrow">{eyebrow}</p>
            <h2 className="a-serif text-3xl leading-tight">{title}</h2>
          </div>
          <Link
            href={closeHref}
            scroll={false}
            aria-label="Close"
            className="a-btn !min-h-11 !min-w-11 !px-2.5"
          >
            <Icon name="close" />
          </Link>
        </div>
        <div className="p-5">{children}</div>
      </aside>
    </>
  );
}