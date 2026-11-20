import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import AdminShell from "@/components/admin/AdminShell";
import { BookingDrawer } from "@/components/admin/BookingPanel";
import Icon from "@/components/admin/Icon";
import MessengerLink from "@/components/admin/MessengerLink";
import StatusBadge from "@/components/admin/StatusBadge";
import { Card, EmptyState, ErrorNote, PageHeader } from "@/components/admin/ui";
import { loadBookingDetail } from "@/lib/admin/bookingDetail";
import { cleanQuery } from "@/lib/admin/search";
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

// The first filter reads "Pending" here; its rule (inquiries and requests waiting for a reply) is unchanged.
const LABEL: Record<string, string> = { open: "Pending" };

type Row = Pick<
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
>;

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; view?: string }>;
}) {
  const { supabase, displayName } = await requireAdmin();
  const sp = await searchParams;
  const filter = filterFor(sp.status);
  const q = cleanQuery(sp.q);

  let query = supabase
    .from("bookings")
    .select(COLUMNS)
    .in("status", [...filter.statuses])
    .order(filter.key === "confirmed" ? "starts_at" : "created_at", {
      ascending: filter.key === "confirmed",
    })
    .limit(200);
  if (q) query = query.or(`client_name.ilike.%${q}%,reference_code.ilike.%${q}%`);

  const [rowsRes, countsRes, catsRes] = await Promise.all([
    query,
    supabase.from("bookings").select("status").limit(2000),
    supabase.from("event_categories").select("id,name"),
  ]);

  const failed = rowsRes.error ?? countsRes.error ?? catsRes.error;
  if (failed) console.error("bookings list failed:", failed.message);

  const rows = (rowsRes.data ?? []) as Row[];
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

  const base = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ status: filter.key });
    if (q) p.set("q", q);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return `/admin/bookings?${p.toString()}`;
  };

  // The slide-in panel for ?view=<booking id>.
  const viewId = z.uuid().safeParse(sp.view).success ? sp.view! : null;
  const detail = viewId ? await loadBookingDetail(supabase, viewId) : null;

  const eventOf = (b: Row) =>
    b.event_type_other
      ? `Others: ${b.event_type_other}`
      : (cats.get(b.category_id) ?? "");
  const totalOf = (b: Row) =>
    b.total_price !== null
      ? formatPeso(b.total_price)
      : b.custom_quote
        ? "Quote"
        : "-";

  return (
    <AdminShell name={displayName} current="bookings">
      <PageHeader
        eyebrow="Workspace"
        title="Bookings"
        description="Search requests by client name or reference, filter by status, and open any booking to review it, confirm it or close it."
        actions={
          <Link href="/admin/bookings/new" className="a-btn a-btn-primary">
            <Icon name="plus" size={16} />
            New booking
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <form
          action="/admin/bookings"
          method="get"
          role="search"
          className="flex min-w-0 flex-1 basis-72 items-center gap-2"
        >
          <input type="hidden" name="status" value={filter.key} />
          <label htmlFor="booking-search" className="sr-only">
            Search bookings by client name or reference
          </label>
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500">
              <Icon name="search" size={16} />
            </span>
            <input
              id="booking-search"
              name="q"
              type="search"
              defaultValue={q}
              maxLength={60}
              placeholder="Search by client name or reference"
              className="min-h-10 w-full rounded-md border border-neutral-300 bg-white py-2 pr-3 pl-9 text-sm"
            />
          </div>
          <button type="submit" className="a-btn">
            Search
          </button>
          {q && (
            <Link href={`/admin/bookings?status=${filter.key}`} className="a-btn">
              Clear
            </Link>
          )}
        </form>
      </div>

      <nav aria-label="Filter bookings" className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/bookings?status=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            aria-current={f.key === filter.key ? "page" : undefined}
            className="a-chip"
          >
            {LABEL[f.key] ?? f.label}
            <span className="tabular-nums opacity-70">({countFor(f.statuses)})</span>
          </Link>
        ))}
      </nav>

      {failed && (
        <div className="mt-4">
          <ErrorNote>
            Could not load bookings. Check your connection and refresh.
          </ErrorNote>
        </div>
      )}

      <Card className="mt-5 !p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={q ? "search" : "bookings"}
            title={q ? "No bookings match your search" : "Nothing here yet"}
            text={
              q
                ? "Try a different name or reference, or look in All."
                : "Requests from the website show up here. You can also add one yourself."
            }
            href={q ? `/admin/bookings?status=all` : "/admin/bookings/new"}
            action={q ? "Search all bookings" : "Add a booking"}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="a-table w-full text-left text-sm">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Event</th>
                    <th>When (Manila)</th>
                    <th>Package</th>
                    <th className="text-right">Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id} className="relative">
                      <td>
                        <Link
                          href={base({ view: b.id })}
                          scroll={false}
                          className="font-medium after:absolute after:inset-0 after:content-['']"
                          aria-label={`Open booking ${b.reference_code}, ${b.client_name}`}
                        >
                          {b.client_name}
                        </Link>
                        <div className="text-xs text-neutral-500">
                          {b.reference_code} ·{" "}
                          {SOURCE_LABEL[b.source] ?? b.source}
                        </div>
                      </td>
                      <td>{eventOf(b)}</td>
                      <td>{formatManilaRange(b.starts_at, b.ends_at)}</td>
                      <td>{b.package_name_snapshot ?? "Custom"}</td>
                      <td className="text-right tabular-nums">{totalOf(b)}</td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-[var(--a-line)] md:hidden">
              {rows.map((b) => (
                <li key={b.id}>
                  <Link
                    href={base({ view: b.id })}
                    scroll={false}
                    className="block p-4 hover:bg-[#faf9f5]"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {b.client_name}
                        </span>
                        <span className="block text-xs text-neutral-500">
                          {b.reference_code} · {eventOf(b)}
                        </span>
                      </span>
                      <StatusBadge status={b.status} />
                    </span>
                    <span className="mt-2 block text-sm text-neutral-600">
                      {formatManilaRange(b.starts_at, b.ends_at)}
                    </span>
                    <span className="mt-1 flex justify-between text-sm">
                      <span className="text-neutral-500">
                        {b.package_name_snapshot ?? "Custom"}
                      </span>
                      <span className="tabular-nums">{totalOf(b)}</span>
                    </span>
                  </Link>
                  {b.client_messenger && (
                    <div className="px-4 pb-3">
                      <MessengerLink value={b.client_messenger} compact />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
      {rows.length === 200 && (
        <p className="mt-2 text-xs text-neutral-500">
          Showing the newest 200. Use the search to narrow the list.
        </p>
      )}

      {viewId && !detail && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          That booking could not be found.
        </p>
      )}
      {detail && (
        <BookingDrawer
          detail={detail}
          closeHref={base()}
        />
      )}
    </AdminShell>
  );
}