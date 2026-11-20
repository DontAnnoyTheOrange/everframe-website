import type { Metadata } from "next";
import Link from "next/link";
import ActivityChart from "@/components/admin/ActivityChart";
import AdminShell from "@/components/admin/AdminShell";
import Icon, { type IconName } from "@/components/admin/Icon";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  Card,
  EmptyState,
  ErrorNote,
  ThumbFallback,
} from "@/components/admin/ui";
import CloudImage from "@/components/portfolio/CloudImage";
import {
  RANGES,
  activitySeries,
  firstName,
  greetingFor,
  rangeFor,
} from "@/lib/admin/dashboard";
import { requireAdmin } from "@/lib/auth/dal";
import {
  formatManilaDate,
  formatManilaTime,
  nowIso,
  todayInManila,
  dayKey,
} from "@/lib/booking/manila";
import { getCloudinaryConfig } from "@/lib/cloudinary/server";
import { formatPeso } from "@/lib/format";

export const metadata: Metadata = {
  title: "Overview",
  robots: { index: false, follow: false },
};

type B = {
  id: string;
  reference_code: string;
  status: string;
  client_name: string;
  category_id: string;
  event_type_other: string | null;
  starts_at: string | null;
  ends_at: string | null;
  venue: string | null;
  package_name_snapshot: string | null;
  total_price: number | null;
  created_at: string;
};
const COLS =
  "id,reference_code,status,client_name,category_id,event_type_other,starts_at,ends_at,venue,package_name_snapshot,total_price,created_at";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { supabase, displayName } = await requireAdmin();
  const range = rangeFor((await searchParams).range);
  const now = nowIso();
  const today = todayInManila();

  const [bookingsRes, projectsRes, imagesRes, catsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select(COLS)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("portfolio_projects")
      .select("id,title,category_id,is_published,is_featured,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("portfolio_images")
      .select("project_id,cloudinary_public_id,width,height,is_cover")
      .limit(3000),
    supabase.from("event_categories").select("id,name"),
  ]);
  const failed =
    bookingsRes.error ?? projectsRes.error ?? imagesRes.error ?? catsRes.error;
  if (failed) console.error("dashboard failed:", failed.message);

  const bookings = (bookingsRes.data ?? []) as B[];
  const cats = new Map(
    (catsRes.data ?? []).map((c) => [c.id as string, c.name as string]),
  );
  const eventLabel = (b: B) =>
    b.event_type_other
      ? `Others: ${b.event_type_other}`
      : (cats.get(b.category_id) ?? "Event");

  const pending = bookings.filter((b) =>
    ["inquiry", "pending_confirmation"].includes(b.status),
  );
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const upcoming = confirmed
    .filter((b) => b.ends_at && b.ends_at >= now)
    .sort((a, b) => Date.parse(a.starts_at ?? "") - Date.parse(b.starts_at ?? ""));
  const projects = projectsRes.data ?? [];
  const published = projects.filter((p) => p.is_published === true).length;

  const series = activitySeries(bookings, range, today);
  const rangeLabel = RANGES.find((r) => r.key === range)!.label;

  // Portfolio: photo count and cover per project.
  const counts = new Map<string, number>();
  const covers = new Map<
    string,
    { publicId: string; width: number; height: number }
  >();
  for (const i of imagesRes.data ?? []) {
    const pid = i.project_id as string;
    counts.set(pid, (counts.get(pid) ?? 0) + 1);
    if (i.is_cover === true || !covers.has(pid))
      covers.set(pid, {
        publicId: i.cloudinary_public_id as string,
        width: i.width as number,
        height: i.height as number,
      });
  }
  const cfg = getCloudinaryConfig();
  const cloud =
    cfg?.cloudName ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ?? "";

  const name = firstName(displayName);
  const greeting = `${greetingFor(Date.parse(now))}${name ? `, ${name}` : ""}`;

  const stats: {
    label: string;
    value: number;
    note: string;
    icon: IconName;
    href: string;
    tone: "copper" | "olive";
  }[] = [
    {
      label: "Pending requests",
      value: pending.length,
      note: pending.length > 0 ? "Waiting for your reply" : "All caught up",
      icon: "clock",
      href: "/admin/bookings?status=open",
      tone: "copper",
    },
    {
      label: "Confirmed bookings",
      value: confirmed.length,
      note: "Locked into your calendar",
      icon: "check",
      href: "/admin/bookings?status=confirmed",
      tone: "olive",
    },
    {
      label: "Upcoming shoots",
      value: upcoming.length,
      note: upcoming[0]?.starts_at
        ? `Next: ${formatManilaDate(upcoming[0].starts_at)}`
        : "Nothing scheduled",
      icon: "calendar",
      href: "/admin/schedule",
      tone: "olive",
    },
    {
      label: "Portfolio projects",
      value: projects.length,
      note: `${published} published`,
      icon: "portfolio",
      href: "/admin/portfolio",
      tone: "olive",
    },
  ];

  return (
    <AdminShell name={displayName} current="dashboard">
      <div className="mb-8">
        <p className="a-eyebrow mb-1.5">Studio overview</p>
        <h1>{greeting}</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-500">
          Here is where your studio stands today: requests to answer, shoots
          coming up and the work you have published.
        </p>
      </div>

      {failed && (
        <ErrorNote>
          Could not load the latest numbers. Check your connection and refresh.
        </ErrorNote>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="a-card group flex items-start justify-between gap-3 p-4 hover:border-[var(--a-olive)] sm:p-5"
          >
            <div>
              <p className="a-eyebrow">{s.label}</p>
              <p className="a-serif mt-2 text-4xl leading-none tabular-nums">
                {s.value}
              </p>
              <p
                className={`mt-2 flex items-center gap-1.5 text-xs ${
                  s.tone === "copper" && s.value > 0
                    ? "text-[var(--a-copper-d)]"
                    : "text-neutral-500"
                }`}
              >
                {s.tone === "copper" && s.value > 0 && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-[var(--a-copper)]"
                  />
                )}
                {s.note}
              </p>
            </div>
            <span
              className={`hidden h-10 w-10 flex-none place-items-center rounded-full sm:grid ${
                s.tone === "copper"
                  ? "bg-[var(--a-copper-soft)] text-[var(--a-copper-d)]"
                  : "bg-[var(--a-olive-soft)] text-[var(--a-olive-d)]"
              }`}
            >
              <Icon name={s.icon} />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card
          title="Booking activity"
          action={
            <nav aria-label="Chart range" className="flex flex-wrap gap-1.5">
              {RANGES.map((r) => (
                <Link
                  key={r.key}
                  href={`/admin?range=${r.key}`}
                  scroll={false}
                  aria-current={r.key === range ? "page" : undefined}
                  className="a-chip !min-h-8 !px-3 !text-xs"
                >
                  {r.label}
                </Link>
              ))}
            </nav>
          }
        >
          {bookings.length === 0 ? (
            <EmptyState
              icon="bookings"
              title="No bookings yet"
              text="When clients send requests, you will see how they arrive over time here."
            />
          ) : (
            <ActivityChart
              buckets={series}
              title={`Booking activity, ${rangeLabel.toLowerCase()}`}
            />
          )}
        </Card>

        <Card
          title="Today & upcoming"
          action={
            <Link href="/admin/schedule" className="text-sm underline">
              Calendar
            </Link>
          }
        >
          {upcoming.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No confirmed sessions ahead"
              text="Confirmed bookings appear here with their date, time and venue."
              href="/admin/bookings?status=open"
              action="Review requests"
            />
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--a-line)]">
              {upcoming.slice(0, 5).map((b) => {
                const isToday = b.starts_at
                  ? dayKey(Date.parse(b.starts_at)) === today
                  : false;
                const d = b.starts_at ? new Date(b.starts_at) : null;
                return (
                  <li key={b.id}>
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="flex gap-3 py-3 hover:bg-[#faf9f5]"
                    >
                      <span className="grid h-14 w-14 flex-none place-items-center rounded-md bg-[var(--a-olive-soft)] text-center leading-none text-[var(--a-olive-d)]">
                        <span>
                          <span className="a-serif block text-2xl">
                            {d
                              ? new Intl.DateTimeFormat("en-US", {
                                  timeZone: "Asia/Manila",
                                  day: "numeric",
                                }).format(d)
                              : "-"}
                          </span>
                          <span className="a-eyebrow block !text-[0.6rem] !text-inherit">
                            {d
                              ? new Intl.DateTimeFormat("en-US", {
                                  timeZone: "Asia/Manila",
                                  month: "short",
                                }).format(d)
                              : ""}
                          </span>
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium">
                            {b.client_name}
                          </span>
                          {isToday && (
                            <span className="rounded bg-[var(--a-copper-soft)] px-1.5 py-0.5 text-[0.7rem] font-medium text-[var(--a-copper-d)]">
                              Today
                            </span>
                          )}
                        </span>
                        <span className="block text-neutral-500">
                          {eventLabel(b)}
                          {b.starts_at && b.ends_at
                            ? ` · ${formatManilaTime(b.starts_at)} to ${formatManilaTime(b.ends_at)}`
                            : ""}
                        </span>
                        {b.venue && (
                          <span className="flex items-center gap-1 truncate text-xs text-neutral-500">
                            <Icon name="pin" size={13} />
                            {b.venue}
                          </span>
                        )}
                      </span>
                      <span className="flex-none self-start">
                        <StatusBadge status={b.status} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card
          title="Recent booking requests"
          action={
            <Link href="/admin/bookings?status=all" className="text-sm underline">
              View all
            </Link>
          }
        >
          {bookings.length === 0 ? (
            <EmptyState
              icon="bookings"
              title="No requests yet"
              text="New requests from the website and the ones you add by hand will show up here."
              href="/admin/bookings/new"
              action="Add a booking"
            />
          ) : (
            <div className="-mx-5 overflow-x-auto">
              <table className="a-table w-full text-left text-sm">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Event</th>
                    <th>Date</th>
                    <th className="text-right">Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 6).map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link
                          href={`/admin/bookings?view=${b.id}&status=all`}
                          className="font-medium hover:underline"
                        >
                          {b.client_name}
                        </Link>
                        <div className="text-xs text-neutral-500">
                          {b.reference_code}
                        </div>
                      </td>
                      <td>{eventLabel(b)}</td>
                      <td className="whitespace-nowrap">
                        {b.starts_at ? formatManilaDate(b.starts_at) : "No date yet"}
                      </td>
                      <td className="text-right tabular-nums">
                        {b.total_price !== null ? formatPeso(b.total_price) : "-"}
                      </td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Recently updated portfolio"
          action={
            <Link href="/admin/portfolio" className="text-sm underline">
              View all
            </Link>
          }
        >
          {projects.length === 0 ? (
            <EmptyState
              icon="portfolio"
              title="No projects yet"
              text="Create a project and upload photographs to show your work on the website."
              href="/admin/portfolio/new"
              action="New project"
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {projects.slice(0, 4).map((p) => {
                const cover = covers.get(p.id as string);
                return (
                  <li key={p.id as string}>
                    <Link
                      href={`/admin/portfolio/${p.id as string}`}
                      className="flex items-center gap-3 rounded-md p-1 hover:bg-[#faf9f5]"
                    >
                      <span className="block h-14 w-16 flex-none overflow-hidden rounded-md">
                        {cover && cloud ? (
                          <CloudImage
                            cloud={cloud}
                            publicId={cover.publicId}
                            width={cover.width}
                            height={cover.height}
                            alt=""
                            sizes="64px"
                            className="h-14 w-16 object-cover"
                          />
                        ) : (
                          <ThumbFallback className="h-14 w-16" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block truncate font-medium">
                          {p.title as string}
                        </span>
                        <span className="block text-xs text-neutral-500">
                          {cats.get(p.category_id as string) ?? "-"} ·{" "}
                          {counts.get(p.id as string) ?? 0} photos
                        </span>
                      </span>
                      <span className="flex flex-none flex-col items-end gap-1 text-[0.7rem]">
                        <span
                          className={`rounded px-1.5 py-0.5 ${p.is_published ? "bg-green-100 text-green-900" : "bg-neutral-200 text-neutral-700"}`}
                        >
                          {p.is_published ? "Published" : "Hidden"}
                        </span>
                        {p.is_featured === true && (
                          <span className="rounded bg-[var(--a-copper-soft)] px-1.5 py-0.5 text-[var(--a-copper-d)]">
                            Featured
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}