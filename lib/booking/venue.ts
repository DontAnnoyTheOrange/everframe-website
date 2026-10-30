// Venue rules. The client either picks a place from the map search ("map": we keep the place id and exact
// coordinates) or, when map search is not available or finds nothing, types an address ("typed").
// The server checks this again, so a hand-made request cannot slip bad data in.
import { z } from "zod";

export const VENUE_MIN = 5;
export const VENUE_MAX = 200; // the database column allows 200 characters

export type VenueSource = "map" | "typed";

export type VenueValue = {
  text: string;
  source: VenueSource | null; // null = typed but not chosen yet
  placeId: string | null;
  lat: number | null;
  lng: number | null;
};

export const EMPTY_VENUE: VenueValue = {
  text: "",
  source: null,
  placeId: null,
  lat: null,
  lng: null,
};

export const venueSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(VENUE_MIN, "Please enter the venue (at least 5 characters).")
      .max(VENUE_MAX, `Please keep the venue under ${VENUE_MAX} characters.`),
    source: z.enum(["map", "typed"], {
      error:
        "Please search for your venue and choose it from the list, or choose “Use what I typed”.",
    }),
    placeId: z.string().max(255).nullable(),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.source === "map") {
      if (!v.placeId || !/^[A-Za-z0-9_-]{10,255}$/.test(v.placeId)) {
        ctx.addIssue({
          code: "custom",
          path: ["placeId"],
          message: "Please choose your venue again from the list.",
        });
      }
      if (v.lat === null || v.lng === null) {
        ctx.addIssue({
          code: "custom",
          path: ["lat"],
          message: "Please choose your venue again from the list.",
        });
      }
    } else if (v.placeId !== null || v.lat !== null || v.lng !== null) {
      // A typed address carries no map data.
      ctx.addIssue({
        code: "custom",
        path: ["source"],
        message: "Please choose your venue again.",
      });
    }
  });

/** "Casa Real, Tagaytay, Cavite": the place name plus its address, without repeating the name. */
export function buildVenueText(
  name: string | null | undefined,
  address: string | null | undefined,
): string {
  const n = (name ?? "").trim();
  const a = (address ?? "").trim();
  let text: string;
  if (n && a)
    text = a.toLowerCase().startsWith(n.toLowerCase()) ? a : `${n}, ${a}`;
  else text = n || a;
  return text.slice(0, VENUE_MAX);
}

export type MapsLinks = {
  open: string | null; // opens the spot in Google Maps
  directions: string | null; // opens Google Maps directions to it
  pinned: boolean; // true when exact coordinates are known
};

/**
 * Google Maps links for the admin screen, built from the saved coordinates (they need no Google key). Numbers are formatted here and text is
 * URL-encoded, so nothing saved in the database can change the link's address or add a script.
 */
export function mapsLinks(v: {
  venue: string | null;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
}): MapsLinks {
  const hasGeo =
    typeof v.lat === "number" &&
    typeof v.lng === "number" &&
    Number.isFinite(v.lat) &&
    Number.isFinite(v.lng);
  if (hasGeo) {
    const at = `${(v.lat as number).toFixed(6)},${(v.lng as number).toFixed(6)}`;
    return {
      open: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(at)}`,
      directions: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(at)}`,
      pinned: true,
    };
  }
  const text = (v.venue ?? "").trim();
  if (!text) return { open: null, directions: null, pinned: false };
  const q = encodeURIComponent(text);
  return {
    open: `https://www.google.com/maps/search/?api=1&query=${q}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    pinned: false,
  };
}