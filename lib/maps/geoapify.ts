// Venue search with Geoapify (free plan, no credit card). Map data is © OpenStreetMap contributors.
// The key is meant to be public (it is sent from the browser), so restrict it to your website
// addresses in the Geoapify dashboard. If the key is missing, wrong, over its limit, or the network
// fails, the search throws and the form falls back to a plain typed address.

export type FoundPlace = {
  placeId: string; // Geoapify's own id (not a Google id)
  main: string; // short title, e.g. the place name or street
  secondary: string; // the rest of the address
  text: string; // full one-line address that is saved as the venue
  lat: number;
  lng: number;
};

const ENDPOINT = "https://api.geoapify.com/v1/geocode/autocomplete";
const PLACE_ID = /^[A-Za-z0-9_-]{10,255}$/;

type Feature = { properties?: Record<string, unknown> };

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function parsePlaces(json: unknown): FoundPlace[] {
  const features = (json as { features?: Feature[] } | null)?.features;
  if (!Array.isArray(features)) return [];
  const out: FoundPlace[] = [];
  for (const f of features) {
    const p = f.properties ?? {};
    const lat = p.lat;
    const lng = p.lon;
    const placeId = str(p.place_id);
    const formatted = str(p.formatted);
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180 ||
      !PLACE_ID.test(placeId) ||
      !formatted
    ) {
      continue; // skip anything we cannot pin exactly
    }
    out.push({
      placeId,
      main: str(p.name) || str(p.address_line1) || formatted,
      secondary: str(p.address_line2),
      text: formatted.slice(0, 200),
      lat,
      lng,
    });
  }
  return out;
}

export async function searchPlaces(
  apiKey: string,
  query: string,
  signal?: AbortSignal,
): Promise<FoundPlace[]> {
  const url =
    `${ENDPOINT}?text=${encodeURIComponent(query)}` +
    `&filter=countrycode:ph&lang=en&limit=6&format=geojson` +
    `&apiKey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Geoapify ${res.status}`);
  return parsePlaces(await res.json());
}