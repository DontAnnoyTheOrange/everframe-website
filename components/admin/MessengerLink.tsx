import { messengerHref } from "@/lib/booking/messenger";

// A clickable Messenger link for the admin screens. One click opens the client's chat in a new tab,
// so there is nothing to copy and paste. The saved text is checked again (messengerHref), so only a
// real Messenger or Facebook link can become clickable; anything else is shown as plain text.
export default function MessengerLink({
  value,
  label = "Open chat in Messenger",
  compact = false,
}: {
  value: string | null;
  label?: string;
  compact?: boolean;
}) {
  const href = messengerHref(value);
  if (!href) {
    return value ? (
      <span>{value}</span>
    ) : (
      <span className="text-neutral-400">-</span>
    );
  }
  const shown = href.replace(/^https:\/\/(www\.)?/, "");
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        compact
          ? "text-sm text-blue-700 underline hover:text-blue-900"
          : "text-blue-700 underline hover:text-blue-900"
      }
    >
      {compact ? "Messenger ↗" : `${label} (${shown}) ↗`}
    </a>
  );
}