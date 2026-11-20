import { describe, expect, it } from "vitest";
import {
  activitySeries,
  firstName,
  greetingFor,
  rangeFor,
  weekStart,
} from "@/lib/admin/dashboard";

describe("dashboard helpers", () => {
  it("falls back to this month for unknown ranges", () => {
    expect(rangeFor("week")).toBe("week");
    expect(rangeFor("decade")).toBe("month");
    expect(rangeFor(undefined)).toBe("month");
  });

  it("finds the Monday of a week", () => {
    expect(weekStart("2026-11-19")).toBe("2026-11-16"); // Thursday
    expect(weekStart("2026-11-22")).toBe("2026-11-16"); // Sunday
    expect(weekStart("2026-11-16")).toBe("2026-11-16");
  });

  it("counts requests per day for the week, in Manila time", () => {
    const rows = [
      { status: "confirmed", created_at: "2026-11-17T01:00:00+08:00" },
      { status: "inquiry", created_at: "2026-11-17T23:30:00+08:00" },
      // 16:30 UTC on the 17th is already 00:30 on the 18th in Manila
      { status: "rejected", created_at: "2026-11-17T16:30:00Z" },
      { status: "inquiry", created_at: "2026-10-01T10:00:00+08:00" }, // outside the week
    ];
    const s = activitySeries(rows, "week", "2026-11-19");
    expect(s).toHaveLength(7);
    expect(s[1]).toMatchObject({ key: "2026-11-17", received: 2, confirmed: 1 });
    expect(s[2]).toMatchObject({ key: "2026-11-18", received: 1, confirmed: 0 });
    expect(s.reduce((n, b) => n + b.received, 0)).toBe(3);
  });

  it("has one bar per day of the month and one per month of the year", () => {
    expect(activitySeries([], "month", "2026-02-10")).toHaveLength(28);
    expect(activitySeries([], "month", "2028-02-10")).toHaveLength(29);
    const y = activitySeries(
      [{ status: "completed", created_at: "2026-03-05T10:00:00+08:00" }],
      "year",
      "2026-11-19",
    );
    expect(y).toHaveLength(12);
    expect(y[2]).toMatchObject({ label: "Mar", received: 1, confirmed: 1 });
  });

  it("greets by Manila time", () => {
    expect(greetingFor(Date.parse("2026-11-19T08:00:00+08:00"))).toBe(
      "Good morning",
    );
    expect(greetingFor(Date.parse("2026-11-19T14:00:00+08:00"))).toBe(
      "Good afternoon",
    );
    expect(greetingFor(Date.parse("2026-11-19T20:00:00+08:00"))).toBe(
      "Good evening",
    );
  });

  it("uses a first name only when the account has a real name", () => {
    expect(firstName("Ian Arzaga")).toBe("Ian");
    expect(firstName("owner@example.com")).toBe("");
    expect(firstName("  ")).toBe("");
  });
});