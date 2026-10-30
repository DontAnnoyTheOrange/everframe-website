import type { Metadata } from "next";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import StatusBadge from "@/components/admin/StatusBadge";
import { requireAdmin } from "@/lib/auth/dal";
import { formatManilaRange, nowIso } from "@/lib/booking/manila";
import { formatPeso } from "@/lib/format";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

type Mini = {
  id: string;
  reference_code: string;
  status: string;
  client_name: string;
  starts_at: string | null;
  ends_at: string | null;
  total_price: number | null;
};
const COLS =
  "id,reference_code,status,client_name,starts_at,ends_at,total_price";

export default async function AdminHome() {
  const { supabase, displayName } = await requireAdmin();

  const [open, upcoming, statuses] = await Promise.all([
    supabase
      .from("bookings")
      .select(COLS)
      .in("status", ["inquiry", "pending_confirmation"])
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("bookings")
      .select(COLS)
      .eq("status", "confirmed")
      .gte("ends_at", nowIso())
      .order("starts_at", { ascending: true })
      .limit(5),
    supabase.from("bookings").select("status").limit(2000),
  ]);
  const failed = open.error ?? upcoming.error ?? statuses.error;
  if (failed) console.error("dashboard failed:", failed.message);

  const all = (statuses.data ?? []) as { status: string }[];
  const count = (...s: string[]) =>
    all.filter((r) => s.includes(r.status)).length;

  return (
    <AdminShell name={displayName} current="dashboard">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {failed && (
        <p
          role="alert"
          className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800"
        >
          Could not load the latest numbers. Check your connection and refresh.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Need a reply"
          value={count("inquiry", "pending_confirmation")}
          href="/admin/bookings?status=open"
        />
        <Stat
          label="Confirmed"
          value={count("confirmed")}
          href="/admin/bookings?status=confirmed"
        />
        <Stat
          label="Closed"
          value={count("completed", "cancelled", "rejected")}
          href="/admin/bookings?status=closed"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <List
          title="Newest requests"
          rows={(open.data ?? []) as Mini[]}
          empty="No requests waiting."
        />
        <List
          title="Coming up (confirmed)"
          rows={(upcoming.data ?? []) as Mini[]}
          empty="No upcoming confirmed bookings."
        />
      </div>
    </AdminShell>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-neutral-200 bg-white p-5 hover:bg-neutral-50"
    >
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-neutral-600">{label}</p>
    </Link>
  );
}

function List({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Mini[];
  empty: string;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-neutral-700">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-200">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <div>
                <Link
                  href={`/admin/bookings/${r.id}`}
                  className="font-medium underline"
                >
                  {r.reference_code}
                </Link>{" "}
                · {r.client_name}
                <div className="text-neutral-500">
                  {formatManilaRange(r.starts_at, r.ends_at)}
                </div>
              </div>
              <div className="text-right">
                <StatusBadge status={r.status} />
                <div className="mt-1 tabular-nums">
                  {r.total_price !== null ? formatPeso(r.total_price) : ""}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}