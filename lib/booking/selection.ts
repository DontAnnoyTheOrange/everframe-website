// Turns the link from the pricing page (/booking?package=...&hours=...) into a checked selection.
// Anything unknown or out of range is dropped or corrected here, so the booking page never
// trusts raw link text. The database re-checks everything again when the request is saved.
import { cleanOtherLabel, OTHER_LABEL_MAX } from "./eventType";
import { resolvePackage, tiersFor } from "../pricing/packageRules";
import type { AddonRow, CategoryRow, PackageRow } from "../types/db";

export type BookingParams = {
  package?: string;
  hours?: string;
  category?: string;
  other?: string;
  addons?: string;
  outside?: string;
};

export type Selection = {
  pkg: PackageRow;
  hours: number;
  categoryId: string;
  other: string;
  addonIds: string[];
  outsideBase: boolean;
};

export function resolveSelection(
  packages: PackageRow[],
  categories: CategoryRow[],
  addons: AddonRow[],
  params: BookingParams,
): Selection | null {
  const picked = packages.find((p) => p.slug === params.package);
  if (!picked || categories.length === 0) return null;

  const asNumber = Number(params.hours);
  const hours =
    Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= 24
      ? asNumber
      : (picked.max_hours ?? 4);

  // If the hours are more than the picked package covers, move up to the tier that fits.
  const tiers = tiersFor(packages, picked.service_type);
  const pkg = resolvePackage(tiers, picked.id, hours);

  const category =
    categories.find((c) => c.slug === params.category) ?? categories[0];

  const known = new Set(addons.map((a) => a.id));
  const addonIds = [
    ...new Set((params.addons ?? "").split(",").filter((id) => known.has(id))),
  ];

  return {
    pkg,
    hours,
    categoryId: category.id,
    other: category.is_other
      ? cleanOtherLabel(params.other ?? "").slice(0, OTHER_LABEL_MAX)
      : "",
    addonIds,
    outsideBase: params.outside === "1",
  };
}