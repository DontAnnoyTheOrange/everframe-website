// The ONE place that decides which package fits a number of hours.
// The numbers (max_hours, upgrade_above_hours, extra_hour_rate) come from the database `packages` table,
// so changing a rule means changing a database value, not hunting through components.
// The database function quote_booking() enforces the same limit, so the screen can never be tricked.
import { formatPeso } from "../format";
import type { PackageRow, ServiceType } from "../types/db";

/** All tiers of one service, cheapest first. */
export function tiersFor(
  packages: PackageRow[],
  service: ServiceType,
): PackageRow[] {
  return packages
    .filter((p) => p.service_type === service)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** Does this package accept that many hours? (null limit = no limit) */
export function fitsHours(pkg: PackageRow, hours: number): boolean {
  return pkg.upgrade_above_hours === null || hours <= pkg.upgrade_above_hours;
}

/**
 * The package that is actually in force.
 * Start from the package the customer picked (`chosenId`) and move up one tier at a time
 * until a tier accepts `hours`. Never moves below the picked package, so lowering the
 * hours again brings the customer back to the package they picked.
 * This is a pure function of its inputs: same inputs, same answer, no loops.
 */
export function resolvePackage(
  tiers: PackageRow[],
  chosenId: string,
  hours: number,
): PackageRow {
  const start = Math.max(
    0,
    tiers.findIndex((p) => p.id === chosenId),
  );
  let i = start;
  while (i < tiers.length - 1 && !fitsHours(tiers[i], hours)) i++;
  return tiers[i];
}

/** What the coverage box shows. Whole-event packages never show a number of hours. */
export function coverageLabel(pkg: PackageRow, hours: number): string {
  if (pkg.max_hours === null) return "Whole Event";
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/** The small explanation under the coverage box. */
export function limitNote(
  pkg: PackageRow,
  next: PackageRow | undefined,
): string {
  if (pkg.max_hours === null) {
    return "Whole-event package: the price is the same for any length. The hours above only help us check the calendar.";
  }
  const nextName = next ? next.name : "a higher package";
  const hasExtra = pkg.extra_hour_rate !== null;
  if (pkg.upgrade_above_hours === null) {
    return hasExtra
      ? `Each hour beyond ${pkg.max_hours} adds ${formatPeso(pkg.extra_hour_rate ?? 0)}.`
      : `Hours beyond ${pkg.max_hours} are quoted separately.`;
  }
  if (!hasExtra || pkg.upgrade_above_hours <= pkg.max_hours) {
    return `${pkg.name} covers up to ${pkg.max_hours} hours. For a longer event we switch you to ${nextName}.`;
  }
  return `Each hour beyond ${pkg.max_hours} adds ${formatPeso(pkg.extra_hour_rate ?? 0)}, up to ${pkg.upgrade_above_hours} hours. Longer than that, we switch you to ${nextName}.`;
}