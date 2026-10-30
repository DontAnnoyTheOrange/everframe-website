import {
  STATUS_LABEL,
  isStatus,
  type BookingStatus,
} from "@/lib/booking/status";

const COLOR: Record<BookingStatus, string> = {
  inquiry: "bg-neutral-200 text-neutral-800",
  pending_confirmation: "bg-amber-100 text-amber-900",
  confirmed: "bg-green-100 text-green-900",
  rejected: "bg-red-100 text-red-900",
  cancelled: "bg-neutral-200 text-neutral-600",
  completed: "bg-blue-100 text-blue-900",
};

export default function StatusBadge({ status }: { status: string }) {
  if (!isStatus(status)) return <span>{status}</span>;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}