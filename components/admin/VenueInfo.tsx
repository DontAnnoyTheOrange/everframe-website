import { mapsLinks } from "@/lib/booking/venue";

// Venue for the admin screens, with one-click Google Maps links. If the client picked the place from
// the map, the links use the exact saved pin. If they typed it, the links search by the typed text and
// the badge says so. Links are built from numbers and URL-encoded text (see mapsLinks), never raw text.
export default function VenueInfo({
  venue,
  placeId,
  lat,
  lng,
}: {
  venue: string | null;
  placeId: string | null;
  lat: number | string | null;
  lng: number | string | null;
}) {
  const la = lat === null ? null : Number(lat);
  const ln = lng === null ? null : Number(lng);
  const links = mapsLinks({ venue, placeId, lat: la, lng: ln });
  if (!venue && !links.open) return <span className="text-neutral-400">-</span>;
  const linkCls = "text-blue-700 underline hover:text-blue-900";
  return (
    <span className="flex flex-col items-end gap-1">
      <span>{venue}</span>
      <span
        className={`rounded px-1.5 py-0.5 text-xs ${links.pinned ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
      >
        {links.pinned ? "Pinned location" : "Typed by client, not pinned"}
      </span>
      {links.open && (
        <span className="flex gap-3 text-sm">
          <a
            href={links.open}
            target="_blank"
            rel="noopener noreferrer"
            className={linkCls}
          >
            Open in Google Maps ↗
          </a>
          {links.directions && (
            <a
              href={links.directions}
              target="_blank"
              rel="noopener noreferrer"
              className={linkCls}
            >
              Get directions ↗
            </a>
          )}
        </span>
      )}
    </span>
  );
}