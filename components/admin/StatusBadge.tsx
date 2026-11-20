import {
  STATUS_LABEL,
  isStatus,
  type BookingStatus,
} from "@/lib/booking/status";

// Colour is never the only signal: every badge also carries the status word.
const COLOR: Record<BookingStatus, { pill: string; dot: string }> = {
  inquiry: { pill: "bg-neutral-200 text-neutral-800", dot: "bg-neutral-500" },
  pending_confirmation: {
    pill: "bg-[var(--a-copper-soft)] text-[var(--a-copper-d)]",
    dot: "bg-[var(--a-copper)]",
  },
  confirmed: {
    pill: "bg-[var(--a-olive-soft)] text-[#454a32]",
    dot: "bg-[var(--a-olive)]",
  },
  rejected: { pill: "bg-red-100 text-red-900", dot: "bg-red-600" },
  cancelled: { pill: "bg-neutral-200 text-neutral-600", dot: "bg-neutral-400" },
  completed: { pill: "bg-blue-100 text-blue-900", dot: "bg-blue-600" },
};

export default function StatusBadge({ status }: { status: string }) {
  if (!isStatus(status)) return <span>{status}</span>;
  const c = COLOR[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${c.pill}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}