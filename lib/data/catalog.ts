import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  AddonRow,
  CategoryRow,
  Catalog,
  PackageRow,
  Turnaround,
} from "@/lib/types/db";

const EMPTY_TURNAROUND: Turnaround = { photo: "", video: "", photo_video: "" };

// Everything the pricing page and homepage need, read from the database in one go.
// Returns null (instead of throwing) when Supabase is not configured or unreachable.
export async function getCatalog(): Promise<Catalog | null> {
  const db = createPublicClient();
  if (!db) return null;

  const [pkgs, addons, included, cats, settings] = await Promise.all([
    db
      .from("packages")
      .select(
        "id,slug,service_type,name,price,max_hours,extra_hour_rate,upgrade_above_hours,inclusions,sort_order",
      )
      .eq("is_active", true)
      .order("sort_order"),
    db
      .from("addons")
      .select("id,name,price,per_hour,sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    db.from("package_included_addons").select("package_id,addon_id"),
    db
      .from("event_categories")
      .select("id,slug,name,short_story,sort_order,is_other")
      .eq("is_published", true)
      .order("sort_order"),
    db
      .from("site_settings")
      .select("key,value")
      .in("key", ["transport_fee", "home_base", "turnaround"]),
  ]);

  const failed = [pkgs, addons, included, cats, settings].find((r) => r.error);
  if (failed?.error) {
    console.error("getCatalog failed:", failed.error.message);
    return null;
  }

  const s = Object.fromEntries(
    (settings.data ?? []).map((r) => [r.key, r.value]),
  );
  return {
    packages: (pkgs.data ?? []) as PackageRow[],
    addons: (addons.data ?? []) as AddonRow[],
    includedAddons: included.data ?? [],
    categories: (cats.data ?? []) as CategoryRow[],
    transportFee: typeof s.transport_fee === "number" ? s.transport_fee : 0,
    homeBase: typeof s.home_base === "string" ? s.home_base : "",
    turnaround: { ...EMPTY_TURNAROUND, ...(s.turnaround ?? {}) },
  };
}