import type { Metadata } from "next";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import MessengerLink from "@/components/admin/MessengerLink";
import StatusBadge from "@/components/admin/StatusBadge";
import { requireAdmin } from "@/lib/auth/dal";
import { formatManilaRange } from "@/lib/booking/manila";
import { FILTERS, filterFor } from "@/lib/booking/status";
import { formatPeso } from "@/lib/format";
import { SOURCE_LABEL, type BookingRow } from "@/lib/types/admin";

export const metadata: Metadata = {
  title: "Bookings",
  robots: { index: false, follow: false },
};

const COLUMNS =
  "id,reference_code,status,source,client_name,client_messenger,event_type_other,category_id,starts_at,ends_at,duration_hours,package_name_snapshot,total_price,custom_quote,created_at";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase, displayName } = await requireAdmin();
  const { status } = await searchParams;
  const filter = filterFor(status);

  const [rowsRes, countsRes, catsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select(COLUMNS)
      .in("status", [...filter.statuses])
      .order(filter.key === "confirmed" ? "starts_at" : "created_at", {
        ascending: filter.key === "confirmed",
      })
      .limit(200),
    supabase.from("bookings").select("status").limit(2000),
    supabase.from("event_categories").select("id,name"),
  ]);

  const failed = rowsRes.error ?? countsRes.error ?? catsRes.error;
  if (failed) console.error("bookings list failed:", failed.message);

  const rows = (rowsRes.data ?? []) as Pick<
    BookingRow,
    | "id"
    | "reference_code"
    | "status"
    | "source"
    | "client_name"
    | "client_messenger"
    | "event_type_other"
    | "category_id"
    | "starts_at"
    | "ends_at"
    | "duration_hours"
    | "package_name_snapshot"
    | "total_price"
    | "custom_quote"
    | "created_at"
  >[];
  const cats = new Map(
    (catsRes.data ?? []).map((c) => [c.id as string, c.name as string]),
  );
  const statusCount = new Map<string, number>();
  for (const r of countsRes.data ?? [])
    statusCount.set(
      r.status as string,
      (statusCount.get(r.status as string) ?? 0) + 1,
    );
  const countFor = (statuses: readonly string[]) =>
    statuses.reduce((n, s) => n + (statusCount.get(s) ?? 0), 0);

  return (
    <AdminShell name={displayName} current="bookings">
      <h1 className="text-2xl font-semibold">Bookings</h1>

      <nav aria-label="Filter bookings" className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/bookings?status=${f.key}`}
            aria-current={f.key === filter.key ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              f.key === filter.key
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            {f.label} ({countFor(f.statuses)})
          </Link>
        ))}
      </nav>

      {failed && (
        <p
          role="alert"
          className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800"
        >
          Could not load bookings. Check your connection and refresh.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-100 text-xs text-neutral-600 uppercase">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">When (Manila)</th>
              <th className="px-4 py-3">Package</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-neutral-500"
                >
                  Nothing here yet.
                </td>
              </tr>
            )}
            {rows.map((b) => (
              <tr
                key={b.id}
                className="border-t border-neutral-200 hover:bg-neutral-50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/bookings/${b.id}`}
                    className="font-medium underline"
                  >
                    {b.reference_code}
                  </Link>
                  <div className="text-xs text-neutral-500">
                    {SOURCE_LABEL[b.source] ?? b.source}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {b.client_name}
                  <div>
                    <MessengerLink value={b.client_messenger} compact />
                  </div>
                </td>
                <td className="px-4 py-3">
                  {b.event_type_other
                    ? `Others: ${b.event_type_other}`
                    : (cats.get(b.category_id) ?? "")}
                </td>
                <td className="px-4 py-3">
                  {formatManilaRange(b.starts_at, b.ends_at)}
                </td>
                <td className="px-4 py-3">
                  {b.package_name_snapshot ?? "Custom"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {b.total_price !== null
                    ? formatPeso(b.total_price)
                    : b.custom_quote
                      ? "Quote"
                      : "-"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}