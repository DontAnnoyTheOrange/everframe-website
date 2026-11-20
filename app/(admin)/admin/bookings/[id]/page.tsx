import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import AdminShell from "@/components/admin/AdminShell";
import BookingPanel from "@/components/admin/BookingPanel";
import StatusBadge from "@/components/admin/StatusBadge";
import { loadBookingDetail } from "@/lib/admin/bookingDetail";
import { requireAdmin } from "@/lib/auth/dal";
import { formatManilaDate, formatManilaTime } from "@/lib/booking/manila";
import { SOURCE_LABEL } from "@/lib/types/admin";

export const metadata: Metadata = {
  title: "Booking",
  robots: { index: false, follow: false },
};

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const { supabase, displayName } = await requireAdmin();
  const { id } = await params;
  const { updated } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  const detail = await loadBookingDetail(supabase, id);
  if (!detail) notFound();
  const b = detail.booking;

  return (
    <AdminShell name={displayName} current="bookings">
      <p className="text-sm">
        <Link href="/admin/bookings" className="underline">
          ← All bookings
        </Link>
      </p>
      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1>{b.reference_code}</h1>
        <StatusBadge status={b.status} />
        <span className="text-sm text-neutral-500">
          {SOURCE_LABEL[b.source] ?? b.source} · received{" "}
          {formatManilaDate(b.created_at)} {formatManilaTime(b.created_at)}
        </span>
        <Link
          href={`/admin/bookings/${id}/edit`}
          className="a-btn a-btn-copper ml-auto"
        >
          Edit details
        </Link>
      </div>
      {updated === "1" && (
        <p
          role="status"
          className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          Changes saved.
        </p>
      )}
      <div className="max-w-3xl">
        <BookingPanel detail={detail} />
      </div>
    </AdminShell>
  );
}