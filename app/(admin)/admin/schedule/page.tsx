import type { Metadata } from "next";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { BlockForm, DeleteBlockButton } from "@/components/admin/BlockForm";
import { requireAdmin } from "@/lib/auth/dal";
import {
  dayKey,
  formatManilaDate,
  formatManilaRange,
  nowIso,
  todayInManila,
} from "@/lib/booking/manila";

export const metadata: Metadata = {
  title: "Schedule",
  robots: { index: false, follow: false },
};

type Entry =
  | {
      kind: "booking";
      id: string;
      starts: string;
      ends: string;
      title: string;
      detail: string;
    }
  | {
      kind: "block";
      id: string;
      starts: string;
      ends: string;
      title: string;
      detail: string;
    };

// Everything that takes up time from now on: confirmed bookings and blocked periods, in date order.
export default async function SchedulePage() {
  const { supabase, displayName } = await requireAdmin();
  const now = nowIso();

  const [bookingsRes, blocksRes, pendingRes] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id,reference_code,client_name,starts_at,ends_at,package_name_snapshot,venue",
      )
      .eq("status", "confirmed")
      .gte("ends_at", now)
      .order("starts_at")
      .limit(300),
    supabase
      .from("availability_blocks")
      .select("id,starts_at,ends_at,reason")
      .gte("ends_at", now)
      .order("starts_at")
      .limit(300),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("status", ["inquiry", "pending_confirmation"]),
  ]);

  const failed = bookingsRes.error ?? blocksRes.error;
  if (failed) console.error("schedule load failed:", failed.message);

  const entries: Entry[] = [
    ...(bookingsRes.data ?? []).map((b): Entry => ({
      kind: "booking",
      id: b.id as string,
      starts: b.starts_at as string,
      ends: b.ends_at as string,
      title: `${b.client_name as string} (${b.reference_code as string})`,
      detail: [b.package_name_snapshot, b.venue].filter(Boolean).join(" · "),
    })),
    ...(blocksRes.data ?? []).map((b): Entry => ({
      kind: "block",
      id: b.id as string,
      starts: b.starts_at as string,
      ends: b.ends_at as string,
      title: "Blocked",
      detail: (b.reason as string | null) ?? "",
    })),
  ].sort((a, b) => Date.parse(a.starts) - Date.parse(b.starts));

  // Group by the Manila day the entry starts on.
  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = dayKey(Date.parse(e.starts));
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const pending = pendingRes.count ?? 0;

  return (
    <AdminShell name={displayName} current="schedule">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <Link
          href="/admin/bookings/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          + New booking
        </Link>
      </div>
      <p className="mt-2 text-sm text-neutral-600">
        Confirmed bookings and blocked dates from now on. Pending requests do
        not take up time until you confirm them
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
      </p>

      {failed && (
        <p
          role="alert"
          className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800"
        >
          Could not load the schedule. Check your connection and refresh.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          {groups.size === 0 && !failed && (
            <p className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
              Nothing scheduled yet. Confirmed bookings and blocked dates will
              appear here.
            </p>
          )}
          {[...groups.entries()].map(([key, list]) => (
            <section key={key} aria-label={key}>
              <h2 className="mb-2 text-sm font-semibold text-neutral-700">
                {formatManilaDate(`${key}T12:00:00+08:00`)}
                {key === todayInManila() && (
                  <span className="ml-2 rounded bg-neutral-900 px-1.5 py-0.5 text-xs font-normal text-white">
                    Today
                  </span>
                )}
              </h2>
              <ul className="flex flex-col gap-2">
                {list.map((e) => (
                  <li
                    key={`${e.kind}-${e.id}`}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4"
                  >
                    <div>
                      <span
                        className={`mr-2 rounded px-1.5 py-0.5 text-xs ${e.kind === "booking" ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-700"}`}
                      >
                        {e.kind === "booking" ? "Booking" : "Blocked"}
                      </span>
                      {e.kind === "booking" ? (
                        <Link
                          href={`/admin/bookings/${e.id}`}
                          className="font-medium underline"
                        >
                          {e.title}
                        </Link>
                      ) : (
                        <span className="font-medium">{e.title}</span>
                      )}
                      <p className="mt-1 text-sm text-neutral-600">
                        {formatManilaRange(e.starts, e.ends)}
                      </p>
                      {e.detail && (
                        <p className="text-sm text-neutral-500">{e.detail}</p>
                      )}
                    </div>
                    {e.kind === "block" && <DeleteBlockButton blockId={e.id} />}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div>
          <BlockForm today={todayInManila()} />
        </div>
      </div>
    </AdminShell>
  );
}