import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import AdminShell from "@/components/admin/AdminShell";
import EditBookingForm from "@/components/admin/EditBookingForm";
import StatusBadge from "@/components/admin/StatusBadge";
import { requireAdmin } from "@/lib/auth/dal";
import { MANILA_OFFSET_MS, dayKey } from "@/lib/booking/manila";
import { formatPeso } from "@/lib/format";

export const metadata: Metadata = {
  title: "Edit booking",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, displayName } = await requireAdmin();
  const { data: b } = await supabase
    .from("bookings")
    .select(
      "id,reference_code,status,client_name,client_email,client_phone,client_messenger,venue,venue_place_id,starts_at,duration_hours,total_price",
    )
    .eq("id", id)
    .maybeSingle();
  if (!b) notFound();

  const start = b.starts_at ? Date.parse(b.starts_at as string) : null;
  return (
    <AdminShell name={displayName} current="bookings">
      <Link href={`/admin/bookings/${id}`} className="text-sm underline">
        ← Back to the booking
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">
          Edit {b.reference_code as string}
        </h1>
        <StatusBadge status={b.status as string} />
      </div>
      <EditBookingForm
        initial={{
          bookingId: id,
          name: b.client_name as string,
          email: (b.client_email as string | null) ?? "",
          phone: (b.client_phone as string | null) ?? "",
          messenger: (b.client_messenger as string | null) ?? "",
          venue: (b.venue as string | null) ?? "",
          date: start === null ? "" : dayKey(start),
          time:
            start === null
              ? ""
              : new Date(start + MANILA_OFFSET_MS).toISOString().slice(11, 16),
          hours:
            b.duration_hours === null ? "" : String(Number(b.duration_hours)),
          total:
            b.total_price === null ? "" : formatPeso(Number(b.total_price)),
          closed: ["completed", "cancelled", "rejected"].includes(
            b.status as string,
          ),
          pinned: Boolean(b.venue_place_id),
        }}
      />
    </AdminShell>
  );
}