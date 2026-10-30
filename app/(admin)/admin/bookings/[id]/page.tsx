import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import AdminShell from "@/components/admin/AdminShell";
import { NotesForm, StatusActions } from "@/components/admin/BookingActions";
import StatusBadge from "@/components/admin/StatusBadge";
import { requireAdmin } from "@/lib/auth/dal";
import {
  formatManilaDate,
  formatManilaRange,
  formatManilaTime,
  overlapsAny,
} from "@/lib/booking/manila";
import { STATUS_LABEL, isStatus } from "@/lib/booking/status";
import { SERVICE_LABEL, formatPeso } from "@/lib/format";
import {
  SOURCE_LABEL,
  type BookingAddonRow,
  type BookingRow,
  type HistoryRow,
} from "@/lib/types/admin";
import type { ServiceType } from "@/lib/types/db";

export const metadata: Metadata = {
  title: "Booking",
  robots: { index: false, follow: false },
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, displayName } = await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const b = data as BookingRow;

  const [catRes, addonsRes, historyRes] = await Promise.all([
    supabase
      .from("event_categories")
      .select("name")
      .eq("id", b.category_id)
      .maybeSingle(),
    supabase
      .from("booking_addons")
      .select("id,name_snapshot,quantity,line_total")
      .eq("booking_id", id),
    supabase
      .from("booking_status_history")
      .select("id,from_status,to_status,changed_at,note")
      .eq("booking_id", id)
      .order("changed_at", { ascending: false }),
  ]);
  const category = (catRes.data?.name as string | undefined) ?? "";
  const addons = (addonsRes.data ?? []) as BookingAddonRow[];
  const history = (historyRes.data ?? []) as HistoryRow[];

  // For a request that is not confirmed yet: does its time already collide with a confirmed booking?
  let clash = false;
  if (
    (b.status === "pending_confirmation" || b.status === "inquiry") &&
    b.starts_at &&
    b.ends_at
  ) {
    const s = Date.parse(b.starts_at);
    const e = Date.parse(b.ends_at);
    const { data: ranges } = await supabase.rpc("busy_ranges", {
      p_from: new Date(s - 86400000).toISOString(),
      p_to: new Date(e + 86400000).toISOString(),
    });
    clash = overlapsAny(
      s,
      e,
      ((ranges ?? []) as { starts_at: string; ends_at: string }[]).map((r) => ({
        s: Date.parse(r.starts_at),
        e: Date.parse(r.ends_at),
      })),
    );
  }

  const service = b.service_type_snapshot as ServiceType | null;
  const eventLabel = b.event_type_other
    ? `Others: ${b.event_type_other}`
    : category;

  return (
    <AdminShell name={displayName} current="bookings">
      <p className="text-sm">
        <Link href="/admin/bookings" className="underline">
          ← All bookings
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{b.reference_code}</h1>
        <StatusBadge status={b.status} />
        <span className="text-sm text-neutral-500">
          {SOURCE_LABEL[b.source] ?? b.source} · received{" "}
          {formatManilaDate(b.created_at)} {formatManilaTime(b.created_at)}
        </span>
      </div>

      {clash && (
        <p
          role="alert"
          className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900"
        >
          Heads up: this time overlaps a confirmed booking or a blocked time
          (travel buffer included). Confirming will be refused until that
          changes.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Card title="Event">
            <Row label="Type" value={eventLabel} />
            <Row
              label="When (Manila)"
              value={formatManilaRange(b.starts_at, b.ends_at)}
            />
            <Row
              label="Hours"
              value={b.duration_hours !== null ? String(b.duration_hours) : "-"}
            />
            <Row label="Venue" value={b.venue ?? "-"} />
          </Card>

          <Card title="Client">
            <Row label="Name" value={b.client_name} />
            <Row
              label="Email"
              value={
                b.client_email ? (
                  <a className="underline" href={`mailto:${b.client_email}`}>
                    {b.client_email}
                  </a>
                ) : (
                  "-"
                )
              }
            />
            <Row
              label="Mobile"
              value={
                b.client_phone ? (
                  <a className="underline" href={`tel:${b.client_phone}`}>
                    {b.client_phone}
                  </a>
                ) : (
                  "-"
                )
              }
            />
            <Row label="Messenger" value={b.client_messenger ?? "-"} />
            {b.client_message && (
              <div className="mt-3">
                <p className="text-xs text-neutral-500 uppercase">
                  Message from the client
                </p>
                <p className="mt-1 whitespace-pre-wrap">{b.client_message}</p>
              </div>
            )}
          </Card>

          <Card title="Price (saved when the request was made)">
            <Row
              label={`${service ? SERVICE_LABEL[service] + " · " : ""}${b.package_name_snapshot ?? "Custom"}`}
              value={
                b.package_price_snapshot !== null
                  ? formatPeso(b.package_price_snapshot)
                  : "-"
              }
            />
            {b.extra_hours > 0 && (
              <Row
                label={`Extra hours (${b.extra_hours})`}
                value={
                  b.custom_quote ? "To quote" : formatPeso(b.extra_hours_fee)
                }
              />
            )}
            {addons.map((a) => (
              <Row
                key={a.id}
                label={a.name_snapshot}
                value={
                  a.line_total === 0 ? "Included" : formatPeso(a.line_total)
                }
              />
            ))}
            {b.outside_base_area && (
              <Row label="Transport" value={formatPeso(b.travel_fee)} />
            )}
            <div className="mt-3 border-t border-neutral-200 pt-3">
              <Row
                label="Total"
                strong
                value={
                  b.total_price !== null
                    ? formatPeso(b.total_price)
                    : "To be quoted"
                }
              />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Update status">
            <StatusActions bookingId={b.id} status={b.status} />
          </Card>
          <Card title="Notes">
            <NotesForm bookingId={b.id} notes={b.internal_notes ?? ""} />
          </Card>
          <Card title="History">
            {history.length === 0 ? (
              <p className="text-sm text-neutral-500">No history yet.</p>
            ) : (
              <ol className="flex flex-col gap-3 text-sm">
                {history.map((h) => (
                  <li key={h.id}>
                    <span className="font-medium">
                      {h.from_status && isStatus(h.from_status)
                        ? `${STATUS_LABEL[h.from_status]} → `
                        : ""}
                      {isStatus(h.to_status)
                        ? STATUS_LABEL[h.to_status]
                        : h.to_status}
                    </span>
                    <span className="text-neutral-500">
                      {" "}
                      · {formatManilaDate(h.changed_at)}{" "}
                      {formatManilaTime(h.changed_at)}
                    </span>
                    {h.note && <p className="text-neutral-700">{h.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-neutral-700">{title}</h2>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-1 text-sm ${strong ? "text-base font-semibold" : ""}`}
    >
      <span className="text-neutral-500">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}