import type { Metadata } from "next";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import ManualBookingForm from "@/components/admin/ManualBookingForm";
import { requireAdmin } from "@/lib/auth/dal";
import { getCatalog } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "New booking",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
  const { displayName } = await requireAdmin();
  const catalog = await getCatalog();
  return (
    <AdminShell name={displayName} current="bookings">
      <Link href="/admin/bookings" className="text-sm underline">
        ← Back to bookings
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">New booking</h1>
      <p className="mt-1 mb-6 text-sm text-neutral-600">
        For clients who booked through Messenger or phone. It is saved as
        confirmed and blocks that time on the public calendar.
      </p>
      {catalog ? (
        <ManualBookingForm
          categories={catalog.categories}
          packages={catalog.packages}
          addons={catalog.addons}
        />
      ) : (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">
          Could not load packages. Check your connection and refresh.
        </p>
      )}
    </AdminShell>
  );
}