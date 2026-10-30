import { describe, expect, it } from "vitest";
import { safeNext } from "../../lib/auth/safeNext";
import {
  formatManilaDate,
  formatManilaRange,
  formatManilaTime,
} from "../../lib/booking/manila";
import {
  ACTION_LABEL,
  FILTERS,
  STATUSES,
  TRANSITIONS,
  filterFor,
  isStatus,
} from "../../lib/booking/status";

describe("safe redirect after login", () => {
  it("allows admin pages", () => {
    expect(safeNext("/admin")).toBe("/admin");
    expect(safeNext("/admin/bookings")).toBe("/admin/bookings");
    expect(safeNext("/admin/bookings?status=open")).toBe(
      "/admin/bookings?status=open",
    );
  });
  it("blocks anything that leaves /admin", () => {
    expect(safeNext("https://evil.com")).toBe("/admin");
    expect(safeNext("//evil.com")).toBe("/admin");
    expect(safeNext("/admin//evil.com")).toBe("/admin//evil.com"); // still same-site path
    expect(safeNext("/adminevil")).toBe("/admin");
    expect(safeNext("/admin.evil.com")).toBe("/admin");
    expect(safeNext("/admin\\evil")).toBe("/admin");
    expect(safeNext("/")).toBe("/admin");
    expect(safeNext(undefined)).toBe("/admin");
    expect(safeNext(42)).toBe("/admin");
  });
});

describe("booking statuses", () => {
  it("knows the six statuses and rejects anything else", () => {
    expect(STATUSES).toHaveLength(6);
    expect(isStatus("confirmed")).toBe(true);
    expect(isStatus("approved")).toBe(false);
    expect(isStatus(null)).toBe(false);
  });
  it("matches the database rules (booking_transition_allowed)", () => {
    expect(TRANSITIONS.pending_confirmation).toEqual([
      "confirmed",
      "rejected",
      "cancelled",
    ]);
    expect(TRANSITIONS.confirmed).toEqual(["completed", "cancelled"]);
    expect(TRANSITIONS.inquiry).toEqual([
      "pending_confirmation",
      "rejected",
      "cancelled",
    ]);
    for (const closed of ["rejected", "cancelled", "completed"] as const)
      expect(TRANSITIONS[closed]).toEqual([]);
  });
  it("every reachable status has a button label", () => {
    for (const s of STATUSES)
      for (const t of TRANSITIONS[s]) expect(ACTION_LABEL[t]).toBeTruthy();
  });
  it("filters: unknown values fall back to 'needs reply'; every status is in 'all'", () => {
    expect(filterFor("nonsense").key).toBe("open");
    expect(filterFor(undefined).key).toBe("open");
    expect(filterFor("closed").statuses).toContain("rejected");
    expect(FILTERS.find((f) => f.key === "all")?.statuses).toHaveLength(6);
  });
});

describe("Manila display times", () => {
  it("shows a UTC timestamp as Manila time", () => {
    // 01:00 UTC is 9:00 AM in Manila
    expect(formatManilaTime("2026-11-28T01:00:00Z")).toBe("9:00 AM");
    expect(formatManilaDate("2026-11-28T01:00:00Z")).toBe("Sat, Nov 28, 2026");
  });
  it("rolls to the next Manila day after 4 PM UTC", () => {
    expect(formatManilaDate("2026-11-28T17:00:00Z")).toBe("Sun, Nov 29, 2026");
  });
  it("formats a range, and handles inquiries without a date", () => {
    expect(
      formatManilaRange("2026-11-28T01:00:00Z", "2026-11-28T05:00:00Z"),
    ).toBe("Sat, Nov 28, 2026, 9:00 AM to 1:00 PM");
    expect(formatManilaRange(null, null)).toBe("No date yet");
  });
});