import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import AdminShell from "@/components/admin/AdminShell";
import { BlockForm, DeleteBlockButton } from "@/components/admin/BlockForm";
import { BookingDrawer } from "@/components/admin/BookingPanel";
import Icon from "@/components/admin/Icon";
import SidePanel from "@/components/admin/SidePanel";
import StatusBadge from "@/components/admin/StatusBadge";
import { EmptyState, ErrorNote, PageHeader } from "@/components/admin/ui";
import { loadBookingDetail } from "@/lib/admin/bookingDetail";
import {
  VIEWS,
  dateOr,
  dayFullyBlocked,
  dayTitle,
  eventsByDay,
  monthTitle,
  shiftDate,
  viewFor,
  visibleDays,
  weekTitle,
  type CalEvent,
  type ViewKey,
} from "@/lib/admin/calendar";
import { requireAdmin } from "@/lib/auth/dal";
import {
  addDays,
  formatManilaDate,
  formatManilaTime,
  manilaIso,
  todayInManila,
} from "@/lib/booking/manila";

export const metadata: Metadata = {
  title: "Calendar",
  robots: { index: false, follow: false },
};

type SP = {
  view?: string;
  date?: string;
  booking?: string;
  block?: string;
  panel?: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const { supabase, displayName } = await requireAdmin();
  const sp = await searchParams;
  const today = todayInManila();
  const view = viewFor(sp.view);
  const date = dateOr(sp.date, today);
  const days = visibleDays(view, date);
  const from = manilaIso(days[0], "00:00");
  const to = manilaIso(addDays(days[days.length - 1], 1), "00:00");

  // Only CONFIRMED bookings and blocks take up time. Pending requests are counted, never drawn as busy.
  const [bookingsRes, blocksRes, pendingRes, catsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id,reference_code,client_name,starts_at,ends_at,package_name_snapshot,venue,status,category_id,event_type_other",
      )
      .eq("status", "confirmed")
      .lt("starts_at", to)
      .gt("ends_at", from)
      .order("starts_at")
      .limit(500),
    supabase
      .from("availability_blocks")
      .select("id,starts_at,ends_at,reason")
      .lt("starts_at", to)
      .gt("ends_at", from)
      .order("starts_at")
      .limit(500),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("status", ["inquiry", "pending_confirmation"]),
    supabase.from("event_categories").select("id,name"),
  ]);
  const failed = bookingsRes.error ?? blocksRes.error ?? catsRes.error;
  if (failed) console.error("calendar load failed:", failed.message);

  const cats = new Map(
    (catsRes.data ?? []).map((c) => [c.id as string, c.name as string]),
  );
  const extra = new Map<string, { event: string; venue: string }>();
  const events: CalEvent[] = [
    ...(bookingsRes.data ?? []).map((b): CalEvent => {
      const event = b.event_type_other
        ? `Others: ${b.event_type_other as string}`
        : (cats.get(b.category_id as string) ?? "Event");
      extra.set(b.id as string, { event, venue: (b.venue as string | null) ?? "" });
      return {
        kind: "booking",
        id: b.id as string,
        starts: b.starts_at as string,
        ends: b.ends_at as string,
        title: b.client_name as string,
        detail: event,
      };
    }),
    ...(blocksRes.data ?? []).map(
      (b): CalEvent => ({
        kind: "block",
        id: b.id as string,
        starts: b.starts_at as string,
        ends: b.ends_at as string,
        title: "Blocked",
        detail: (b.reason as string | null) ?? "",
      }),
    ),
  ];
  const byDay = eventsByDay(events, days);
  const pending = pendingRes.count ?? 0;

  const url = (o: { view?: ViewKey; date?: string; booking?: string; block?: string; panel?: string } = {}) => {
    const p = new URLSearchParams();
    p.set("view", o.view ?? view);
    p.set("date", o.date ?? date);
    if (o.booking) p.set("booking", o.booking);
    if (o.block) p.set("block", o.block);
    if (o.panel) p.set("panel", o.panel);
    return `/admin/schedule?${p.toString()}`;
  };
  const closeHref = url();

  const bookingId = z.uuid().safeParse(sp.booking).success ? sp.booking! : null;
  const detail = bookingId ? await loadBookingDetail(supabase, bookingId) : null;
  const block =
    sp.block && z.uuid().safeParse(sp.block).success
      ? events.find((e) => e.kind === "block" && e.id === sp.block)
      : undefined;

  const title =
    view === "month" ? monthTitle(date) : view === "week" ? weekTitle(date) : dayTitle(date);

  const timeOf = (e: CalEvent) =>
    `${formatManilaTime(e.starts)}`;

  const chip = (e: CalEvent, day: string) => {
    const isBlock = e.kind === "block";
    return (
      <Link
        key={`${e.kind}-${e.id}-${day}`}
        href={isBlock ? url({ block: e.id }) : url({ booking: e.id })}
        scroll={false}
        className={`block truncate rounded px-1.5 py-1 text-xs leading-tight ${
          isBlock
            ? "bg-neutral-200 text-neutral-700 [background-image:repeating-linear-gradient(135deg,transparent_0_5px,var(--a-stripe)_5px_10px)]"
            : "bg-[var(--a-olive-soft)] text-[var(--a-olive-ink)] hover:bg-[var(--a-olive-hover)]"
        }`}
      >
        {isBlock ? (
          <>
            <span className="font-medium">Blocked</span>
            {e.detail ? ` · ${e.detail}` : ""}
          </>
        ) : (
          <>
            <span className="font-medium">{timeOf(e)}</span> {e.title}
          </>
        )}
      </Link>
    );
  };

  return (
    <AdminShell name={displayName} current="schedule">
      <PageHeader
        eyebrow="Workspace"
        title="Calendar"
        description={
          <>
            Confirmed bookings and blocked dates. Pending requests do not take
            up time until you confirm them
            {pending > 0 && (
              <>
                {" "}
                (
                <Link className="underline" href="/admin/bookings?status=open">
                  {pending} waiting for a reply
                </Link>
                )
              </>
            )}
            .
          </>
        }
        actions={
          <>
            <Link href={url({ panel: "block" })} scroll={false} className="a-btn a-btn-copper">
              <Icon name="block" size={16} />
              Block dates
            </Link>
            <Link href="/admin/bookings/new" className="a-btn a-btn-primary">
              <Icon name="plus" size={16} />
              New booking
            </Link>
          </>
        }
      />

      {failed && (
        <ErrorNote>
          Could not load the calendar. Check your connection and refresh.
        </ErrorNote>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={url({ date: shiftDate(view, date, -1) })}
            aria-label={`Previous ${view}`}
            className="a-btn !min-w-10 !px-2.5"
          >
            <Icon name="chevL" size={18} />
          </Link>
          <Link href={url({ date: today })} className="a-btn">
            Today
          </Link>
          <Link
            href={url({ date: shiftDate(view, date, 1) })}
            aria-label={`Next ${view}`}
            className="a-btn !min-w-10 !px-2.5"
          >
            <Icon name="chevR" size={18} />
          </Link>
          <h2 className="a-serif ml-2 text-2xl" aria-live="polite">
            {title}
          </h2>
        </div>
        <nav aria-label="Calendar view" className="flex gap-1.5">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={url({ view: v.key })}
              aria-current={v.key === view ? "page" : undefined}
              className="a-chip"
            >
              {v.label}
            </Link>
          ))}
        </nav>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-500">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--a-olive)]" /> Confirmed booking
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-neutral-400" /> Blocked (clients cannot book)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full ring-2 ring-[var(--a-copper)]" /> Today
        </li>
      </ul>

      {view === "month" && (
        <div className="a-card mt-4 overflow-hidden">
          <table className="w-full table-fixed border-collapse text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                {WEEKDAYS.map((w) => (
                  <th key={w} scope="col" className="a-eyebrow !bg-[var(--a-sidebar)] px-2 py-2 text-left">
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: days.length / 7 }, (_, w) => (
                <tr key={w}>
                  {days.slice(w * 7, w * 7 + 7).map((d) => {
                    const list = byDay.get(d) ?? [];
                    const inMonth = d.slice(0, 7) === date.slice(0, 7);
                    const full = dayFullyBlocked(list, d);
                    const isToday = d === today;
                    const bookings = list.filter((e) => e.kind === "booking").length;
                    const blocks = list.length - bookings;
                    return (
                      <td
                        key={d}
                        className={`h-20 border-t border-l border-[var(--a-line)] p-1.5 align-top first:border-l-0 md:h-32 ${
                          full
                            ? "bg-neutral-100 [background-image:repeating-linear-gradient(135deg,transparent_0_6px,var(--a-stripe-soft)_6px_12px)]"
                            : inMonth
                              ? "bg-white"
                              : "bg-[var(--a-dim)]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Link
                            href={url({ view: "day", date: d })}
                            aria-label={`${dayTitle(d)}${list.length ? `, ${list.length} item${list.length > 1 ? "s" : ""}` : ""}${full ? ", unavailable" : ""}`}
                            aria-current={isToday ? "date" : undefined}
                            className={`grid h-7 min-w-7 place-items-center rounded-full px-1 text-xs ${
                              isToday
                                ? "bg-[var(--a-copper)] font-semibold text-white"
                                : inMonth
                                  ? "font-medium hover:bg-[var(--a-sidebar)]"
                                  : "text-neutral-400 hover:bg-[var(--a-sidebar)]"
                            }`}
                          >
                            {Number(d.slice(8))}
                          </Link>
                          {full && (
                            <span className="hidden text-[0.65rem] text-neutral-500 md:inline">
                              Unavailable
                            </span>
                          )}
                        </div>
                        {/* Phones: small counters. Larger screens: the events themselves. */}
                        <div className="mt-1 flex flex-wrap gap-1 md:hidden">
                          {bookings > 0 && (
                            <span className="rounded bg-[var(--a-olive-soft)] px-1.5 text-[0.7rem] text-[var(--a-olive-ink)]">
                              {bookings}
                            </span>
                          )}
                          {blocks > 0 && (
                            <span className="rounded bg-neutral-200 px-1.5 text-[0.7rem] text-neutral-700">
                              {blocks}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 hidden flex-col gap-1 md:flex">
                          {list.slice(0, 3).map((e) => chip(e, d))}
                          {list.length > 3 && (
                            <Link
                              href={url({ view: "day", date: d })}
                              className="px-1 text-xs text-neutral-500 underline"
                            >
                              +{list.length - 3} more
                            </Link>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "week" && (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {days.map((d, i) => {
            const list = byDay.get(d) ?? [];
            const full = dayFullyBlocked(list, d);
            return (
              <section
                key={d}
                aria-label={dayTitle(d)}
                className={`a-card flex min-h-40 flex-col gap-2 p-3 ${full ? "bg-neutral-100" : ""} ${d === today ? "!border-[var(--a-copper)]" : ""}`}
              >
                <Link
                  href={url({ view: "day", date: d })}
                  className="flex items-baseline justify-between"
                >
                  <span className="a-eyebrow">{WEEKDAYS[i]}</span>
                  <span className={`a-serif text-xl ${d === today ? "text-[var(--a-copper-d)]" : ""}`}>
                    {Number(d.slice(8))}
                  </span>
                </Link>
                {full && <p className="text-xs text-neutral-500">Unavailable all day</p>}
                {list.length === 0 && !full && (
                  <p className="text-xs text-neutral-400">Free</p>
                )}
                {list.map((e) => chip(e, d))}
              </section>
            );
          })}
        </div>
      )}

      {view === "day" && (
        <div className="a-card mt-4">
          {(byDay.get(date) ?? []).length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Nothing scheduled this day"
              text="No confirmed bookings or blocks. Clients can book this day, unless the time is within the travel buffer of another booking."
              href={url({ panel: "block" })}
              action="Block dates"
            />
          ) : (
            <ul className="divide-y divide-[var(--a-line)]">
              {(byDay.get(date) ?? []).map((e) => {
                const x = extra.get(e.id);
                return (
                  <li key={`${e.kind}-${e.id}`}>
                    <Link
                      href={e.kind === "block" ? url({ block: e.id }) : url({ booking: e.id })}
                      scroll={false}
                      className="flex flex-wrap items-start gap-4 p-4 hover:bg-[var(--a-hover)]"
                    >
                      <span className="w-28 flex-none text-sm tabular-nums">
                        <span className="a-serif block text-xl leading-tight">
                          {formatManilaTime(e.starts)}
                        </span>
                        <span className="text-xs text-neutral-500">
                          to {formatManilaTime(e.ends)}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{e.title}</span>
                          {e.kind === "booking" ? (
                            <StatusBadge status="confirmed" />
                          ) : (
                            <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs text-neutral-700">
                              Blocked
                            </span>
                          )}
                        </span>
                        {e.detail && <span className="block text-neutral-500">{e.detail}</span>}
                        {x?.venue && (
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                            <Icon name="pin" size={13} />
                            {x.venue}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {detail && <BookingDrawer detail={detail} closeHref={closeHref} />}

      {block && (
        <SidePanel
          id="block-panel"
          eyebrow="Blocked time"
          title="Blocked"
          closeHref={closeHref}
        >
          <div className="a-card flex flex-col gap-3 p-5 text-sm">
            <p>
              <span className="text-neutral-500">From </span>
              {formatManilaDate(block.starts)}, {formatManilaTime(block.starts)}
              <br />
              <span className="text-neutral-500">To </span>
              {formatManilaDate(block.ends)}, {formatManilaTime(block.ends)}
            </p>
            {block.detail && (
              <p>
                <span className="text-neutral-500">Reason: </span>
                {block.detail}
              </p>
            )}
            <p className="text-neutral-500">
              Clients cannot pick these times on the booking page.
            </p>
            <DeleteBlockButton blockId={block.id} />
          </div>
        </SidePanel>
      )}

      {sp.panel === "block" && (
        <SidePanel
          id="block-form-panel"
          eyebrow="Availability"
          title="Block dates"
          closeHref={closeHref}
        >
          <BlockForm today={today} />
        </SidePanel>
      )}
    </AdminShell>
  );
}