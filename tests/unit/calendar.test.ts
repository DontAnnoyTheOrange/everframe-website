import { describe, expect, it } from "vitest";
import {
  dateOr,
  dayFullyBlocked,
  eventsByDay,
  onDay,
  shiftDate,
  viewFor,
  visibleDays,
  type CalEvent,
} from "@/lib/admin/calendar";

const ev = (kind: CalEvent["kind"], starts: string, ends: string): CalEvent => ({
  kind,
  id: `${kind}-${starts}`,
  starts,
  ends,
  title: "t",
  detail: "",
});

describe("calendar helpers", () => {
  it("validates view and date input", () => {
    expect(viewFor("week")).toBe("week");
    expect(viewFor("agenda")).toBe("month");
    expect(dateOr("2026-02-30", "2026-11-19")).toBe("2026-11-19");
    expect(dateOr("2026-11-05", "2026-11-19")).toBe("2026-11-05");
    expect(dateOr(undefined, "2026-11-19")).toBe("2026-11-19");
  });

  it("builds a month grid of whole Monday-first weeks", () => {
    const d = visibleDays("month", "2026-11-19");
    expect(d[0]).toBe("2026-10-26"); // Nov 1 2026 is a Sunday, so the grid starts the Monday before
    expect(d.at(-1)).toBe("2026-12-06"); // Nov 30 is a Monday, so its week ends Dec 6
    expect(d.length % 7).toBe(0);
    expect(visibleDays("week", "2026-11-19")).toHaveLength(7);
    expect(visibleDays("day", "2026-11-19")).toEqual(["2026-11-19"]);
  });

  it("moves between periods, including across years", () => {
    expect(shiftDate("month", "2026-12-15", 1)).toBe("2027-01-01");
    expect(shiftDate("month", "2026-01-15", -1)).toBe("2025-12-01");
    expect(shiftDate("week", "2026-11-19", 1)).toBe("2026-11-26");
    expect(shiftDate("day", "2026-11-01", -1)).toBe("2026-10-31");
  });

  it("puts events on the Manila days they cover", () => {
    const shoot = ev("booking", "2026-11-19T09:00:00+08:00", "2026-11-19T13:00:00+08:00");
    expect(onDay(shoot, "2026-11-19")).toBe(true);
    expect(onDay(shoot, "2026-11-20")).toBe(false);
    // a block ending exactly at midnight does not leak into the next day
    const block = ev("block", "2026-11-19T00:00:00+08:00", "2026-11-20T00:00:00+08:00");
    expect(onDay(block, "2026-11-19")).toBe(true);
    expect(onDay(block, "2026-11-20")).toBe(false);
    expect(dayFullyBlocked([block], "2026-11-19")).toBe(true);
    expect(dayFullyBlocked([shoot], "2026-11-19")).toBe(false);
    const part = ev("block", "2026-11-19T08:00:00+08:00", "2026-11-19T12:00:00+08:00");
    expect(dayFullyBlocked([part], "2026-11-19")).toBe(false);
    const map = eventsByDay([shoot, block], ["2026-11-19", "2026-11-20"]);
    expect(map.get("2026-11-19")).toHaveLength(2);
    expect(map.get("2026-11-20")).toHaveLength(0);
  });
});