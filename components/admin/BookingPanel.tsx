import Link from "next/link";
import DrawerBehavior from "@/components/admin/DrawerBehavior";
import Icon from "@/components/admin/Icon";
import MessengerLink from "@/components/admin/MessengerLink";
import { NotesForm, StatusActions } from "@/components/admin/BookingActions";
import StatusBadge from "@/components/admin/StatusBadge";
import VenueInfo from "@/components/admin/VenueInfo";
import type { BookingDetail } from "@/lib/admin/bookingDetail";
import {
  formatManilaDate,
  formatManilaRange,
  formatManilaTime,
} from "@/lib/booking/manila";
import { STATUS_LABEL, isStatus } from "@/lib/booking/status";
import { SERVICE_LABEL, formatPeso } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/types/admin";
import type { ServiceType } from "@/lib/types/db";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="a-card p-5">
      <h3 className="a-eyebrow mb-3">{title}</h3>
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
      <span className="min-w-0 text-right break-words">{value}</span>
    </div>
  );
}

/** The full booking: client, event, price breakdown, status buttons, notes and history. */
export default function BookingPanel({ detail }: { detail: BookingDetail }) {
  const { booking: b, category, addons, history, clash } = detail;
  const service = b.service_type_snapshot as ServiceType | null;
  const eventLabel = b.event_type_other
    ? `Others: ${b.event_type_other}`
    : category;
  return (
    <div className="flex flex-col gap-4">
      {clash && (
        <p
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          Heads up: this time overlaps a confirmed booking or a blocked time
          (travel buffer included). Confirming will be refused until that
          changes.
        </p>
      )}

      <Section title="Client">
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
        <Row
          label="Messenger"
          value={<MessengerLink value={b.client_messenger} />}
        />
        {b.client_message && (
          <div className="mt-3 border-t border-[var(--a-line)] pt-3">
            <p className="a-eyebrow">Message from the client</p>
            <p className="mt-1 text-sm whitespace-pre-wrap">
              {b.client_message}
            </p>
          </div>
        )}
      </Section>

      <Section title="Event">
        <Row label="Type" value={eventLabel || "-"} />
        <Row
          label="Date and time (Manila)"
          value={formatManilaRange(b.starts_at, b.ends_at)}
        />
        <Row
          label="Coverage"
          value={
            b.duration_hours !== null
              ? `${b.duration_hours} ${b.duration_hours === 1 ? "hour" : "hours"}`
              : "-"
          }
        />
        <Row
          label="Venue"
          value={
            <VenueInfo
              venue={b.venue}
              placeId={b.venue_place_id}
              lat={b.venue_lat}
              lng={b.venue_lng}
            />
          }
        />
      </Section>

      <Section title="Package and price (saved when the request was made)">
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
            value={b.custom_quote ? "To quote" : formatPeso(b.extra_hours_fee)}
          />
        )}
        {addons.map((a) => (
          <Row
            key={a.id}
            label={a.name_snapshot}
            value={a.line_total === 0 ? "Included" : formatPeso(a.line_total)}
          />
        ))}
        {b.outside_base_area && (
          <Row label="Transport" value={formatPeso(b.travel_fee)} />
        )}
        <div className="mt-3 border-t border-[var(--a-line)] pt-3">
          <Row
            label="Total"
            strong
            value={
              b.total_price !== null ? formatPeso(b.total_price) : "To be quoted"
            }
          />
        </div>
      </Section>

      <Section title="Update status">
        <StatusActions bookingId={b.id} status={b.status} />
      </Section>

      <Section title="Notes">
        <NotesForm bookingId={b.id} notes={b.internal_notes ?? ""} />
      </Section>

      <Section title="History">
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
                  {isStatus(h.to_status) ? STATUS_LABEL[h.to_status] : h.to_status}
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
      </Section>
    </div>
  );
}

/** The slide-in drawer wrapped around the panel. `closeHref` is a plain link, so it works without scripts. */
export function BookingDrawer({
  detail,
  closeHref,
}: {
  detail: BookingDetail;
  closeHref: string;
}) {
  const b = detail.booking;
  return (
    <>
      <Link
        href={closeHref}
        scroll={false}
        aria-label="Close booking details"
        className="a-drawer-back"
      />
      <DrawerBehavior closeHref={closeHref} drawerId="booking-drawer" />
      <aside
        id="booking-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Booking ${b.reference_code}`}
        className="a-drawer"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--a-line)] bg-[var(--a-bg)] px-5 py-4">
          <div className="min-w-0">
            <p className="a-eyebrow">Booking</p>
            <h2 className="a-serif text-3xl leading-tight">
              {b.reference_code}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <StatusBadge status={b.status} />
              <span>
                {SOURCE_LABEL[b.source] ?? b.source} · received{" "}
                {formatManilaDate(b.created_at)}
              </span>
            </div>
          </div>
          <Link
            href={closeHref}
            scroll={false}
            aria-label="Close"
            className="a-btn !min-h-11 !min-w-11 !px-2.5"
          >
            <Icon name="close" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 px-5 pt-4">
          <Link
            href={`/admin/bookings/${b.id}/edit`}
            className="a-btn a-btn-copper"
          >
            Edit booking
          </Link>
          <Link href={`/admin/bookings/${b.id}`} className="a-btn">
            Open full page
          </Link>
        </div>
        <div className="p-5">
          <BookingPanel detail={detail} />
        </div>
      </aside>
    </>
  );
}