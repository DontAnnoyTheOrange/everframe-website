// Booking statuses, their labels, and which changes the admin screen offers.
// The database function admin_set_booking_status() is the real rule-keeper; this list only decides
// which buttons to show, so it must match booking_transition_allowed() in the SQL.

export const STATUSES = [
  "inquiry",
  "pending_confirmation",
  "confirmed",
  "rejected",
  "cancelled",
  "completed",
] as const;
export type BookingStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<BookingStatus, string> = {
  inquiry: "Inquiry",
  pending_confirmation: "Pending",
  confirmed: "Confirmed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  completed: "Completed",
};

export const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  inquiry: ["pending_confirmation", "rejected", "cancelled"],
  pending_confirmation: ["confirmed", "rejected", "cancelled"],
  confirmed: ["completed", "cancelled"],
  rejected: [],
  cancelled: [],
  completed: [],
};

export const ACTION_LABEL: Record<BookingStatus, string> = {
  inquiry: "Back to inquiry",
  pending_confirmation: "Mark as a request",
  confirmed: "Confirm booking",
  rejected: "Reject",
  cancelled: "Cancel",
  completed: "Mark completed",
};

export function isStatus(value: unknown): value is BookingStatus {
  return (
    typeof value === "string" && (STATUSES as readonly string[]).includes(value)
  );
}

export const FILTERS = [
  {
    key: "open",
    label: "Needs reply",
    statuses: ["inquiry", "pending_confirmation"],
  },
  { key: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
  {
    key: "closed",
    label: "Closed",
    statuses: ["completed", "cancelled", "rejected"],
  },
  { key: "all", label: "All", statuses: [...STATUSES] },
] as const;
export type FilterKey = (typeof FILTERS)[number]["key"];

export function filterFor(key: unknown) {
  return FILTERS.find((f) => f.key === key) ?? FILTERS[0];
}