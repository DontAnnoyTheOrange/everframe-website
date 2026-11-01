import Link from "next/link";

const links = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/pricing", label: "Pricing" },
  { href: "/booking", label: "Booking" },
  { href: "/contact", label: "Contact" },
];

const cta = "bg-brass text-brass-ink rounded-md px-4 py-2 text-sm font-medium";

// "Message us" opens the studio's Messenger chat when the owner has set it, otherwise the Contact page.
export default function SiteNav({ messenger }: { messenger: string | null }) {
  return (
    <header className="flex items-center justify-between px-6 py-6 md:px-16">
      <Link href="/" className="text-bone font-serif text-xl tracking-wide">
        Everframe
      </Link>
      <nav
        aria-label="Main"
        className="text-stone hidden gap-8 text-sm md:flex"
      >
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-bone">
            {l.label}
          </Link>
        ))}
      </nav>
      {messenger ? (
        <a
          href={messenger}
          target="_blank"
          rel="noopener noreferrer"
          className={cta}
        >
          Message us
        </a>
      ) : (
        <Link href="/contact" className={cta}>
          Message us
        </Link>
      )}
    </header>
  );
}