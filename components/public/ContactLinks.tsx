import type { SiteSettings } from "@/lib/data/settings";

const item =
  "border-line text-bone hover:border-brass rounded-md border px-4 py-2.5 text-sm";

// Every way to reach the studio that the owner has filled in. Nothing is shown for empty details.
export default function ContactLinks({
  settings,
  className = "",
}: {
  settings: SiteSettings;
  className?: string;
}) {
  const { emailHref, email, phoneHref, phone, socials } = settings;
  if (!emailHref && !phoneHref && socials.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-3 ${className}`}>
      {emailHref && (
        <li>
          <a href={emailHref} className={item}>
            {email}
          </a>
        </li>
      )}
      {phoneHref && (
        <li>
          <a href={phoneHref} className={item}>
            {phone}
          </a>
        </li>
      )}
      {socials.map((s) => (
        <li key={s.key}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className={item}
          >
            {s.label}
          </a>
        </li>
      ))}
    </ul>
  );
}