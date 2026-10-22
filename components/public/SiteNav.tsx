import Link from "next/link";

const links = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/pricing", label: "Pricing" },
  { href: "/booking", label: "Booking" },
  { href: "/contact", label: "Contact" },
];

export default function SiteNav() {
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
      {/* Messenger link becomes a site setting in Phase C. */}
      <Link
        href="/contact"
        className="bg-brass text-brass-ink rounded-md px-4 py-2 text-sm font-medium"
      >
        Message us
      </Link>
    </header>
  );
}
