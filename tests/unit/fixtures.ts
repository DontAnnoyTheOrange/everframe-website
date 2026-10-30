import type { PackageRow } from "../../lib/types/db";

// Same numbers as supabase/migrations 004 + 005 (the rate cards).
function p(
  slug: string,
  service_type: PackageRow["service_type"],
  name: string,
  price: number,
  max_hours: number | null,
  extra_hour_rate: number | null,
  upgrade_above_hours: number | null,
  sort_order: number,
): PackageRow {
  return {
    id: slug,
    slug,
    service_type,
    name,
    price,
    max_hours,
    extra_hour_rate,
    upgrade_above_hours,
    inclusions: [],
    sort_order,
  };
}

export const PACKAGES: PackageRow[] = [
  p("photo-basic", "photo", "Basic Events", 3500, 2, null, 2, 1),
  p("photo-any", "photo", "Any Events", 4500, null, null, null, 2),
  p("video-basic", "video", "Basic", 3500, 2, 500, 3, 3),
  p("video-standard", "video", "Standard", 5000, 4, 500, 5, 4),
  p("video-premium", "video", "Premium", 7000, 6, 500, null, 5),
  p("combo-standard", "photo_video", "Standard", 8000, 4, 500, 5, 6),
  p("combo-premium", "photo_video", "Premium", 11000, 6, 500, null, 7),
];