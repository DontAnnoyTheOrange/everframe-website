import { describe, expect, it } from "vitest";
import {
  blockRange,
  blockSchema,
  buildBookingPatch,
  checkEditBooking,
  checkManualBooking,
} from "../../lib/admin/schedule";

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const TODAY = "2026-11-01";

const block = (patch: object = {}) =>
  blockSchema.parse({
    startDate: "2026-11-10",
    endDate: "2026-11-10",
    allDay: true,
    startTime: "",
    endTime: "",
    reason: "",
    ...patch,
  });

describe("blocking dates", () => {
  it("all day = 12:00 AM on the first day to 12:00 AM after the last day (Manila)", () => {
    expect(blockRange(block(), TODAY)).toEqual({
      ok: true,
      start: "2026-11-10T00:00:00+08:00",
      end: "2026-11-11T00:00:00+08:00",
    });
    const r = blockRange(block({ endDate: "2026-11-12" }), TODAY);
    expect(r.ok && r.end).toBe("2026-11-13T00:00:00+08:00");
  });
  it("handles month and year ends", () => {
    const r = blockRange(
      block({ startDate: "2026-12-30", endDate: "2026-12-31" }),
      TODAY,
    );
    expect(r.ok && r.end).toBe("2027-01-01T00:00:00+08:00");
  });
  it("a time range uses the times given, and the end must be after the start", () => {
    const ok = blockRange(
      block({ allDay: false, startTime: "13:00", endTime: "17:30" }),
      TODAY,
    );
    expect(ok).toEqual({
      ok: true,
      start: "2026-11-10T13:00:00+08:00",
      end: "2026-11-10T17:30:00+08:00",
    });
    const bad = blockRange(
      block({ allDay: false, startTime: "17:00", endTime: "13:00" }),
      TODAY,
    );
    expect(bad.ok).toBe(false);
    expect(
      blockRange(block({ allDay: false, startTime: "", endTime: "" }), TODAY)
        .ok,
    ).toBe(false);
  });
  it("refuses a last day before the first, a period already over, and over a year", () => {
    expect(blockRange(block({ endDate: "2026-11-09" }), TODAY).ok).toBe(false);
    expect(
      blockRange(
        block({ startDate: "2026-10-01", endDate: "2026-10-05" }),
        TODAY,
      ).ok,
    ).toBe(false);
    expect(
      blockRange(
        block({ startDate: "2026-11-02", endDate: "2028-01-01" }),
        TODAY,
      ).ok,
    ).toBe(false);
  });
  it("refuses dates that do not exist", () => {
    expect(
      blockSchema.safeParse({
        startDate: "2026-02-31",
        endDate: "2026-03-01",
        allDay: true,
        startTime: "",
        endTime: "",
        reason: "",
      }).success,
    ).toBe(false);
  });
});

const manual = {
  categoryId: UUID,
  packageId: UUID,
  hours: 4,
  addonIds: [],
  outsideBase: false,
  eventTypeOther: "",
  date: "2026-12-05",
  time: "09:30",
  name: "Juan Dela Cruz",
  email: "",
  phone: "",
  messenger: "https://m.me/juan.delacruz",
  venue: "",
  source: "messenger",
  totalOverride: "",
  notes: "",
};

describe("manual booking", () => {
  const fields = (patch: object) => {
    const r = checkManualBooking({ ...manual, ...patch });
    return r.ok ? {} : r.fields;
  };
  it("accepts a booking with only a Messenger link", () => {
    expect(checkManualBooking(manual).ok).toBe(true);
  });
  it("needs at least one way to contact the client", () => {
    expect(fields({ messenger: "" }).contact).toMatch(/at least one/);
    expect(
      fields({ messenger: "", phone: "0917 123 4567" }).contact,
    ).toBeUndefined();
    expect(fields({ messenger: "", email: "a@b.co" }).contact).toBeUndefined();
  });
  it("reports every problem together", () => {
    const f = fields({
      name: "J",
      email: "nope",
      phone: "12",
      date: "x",
      time: "",
    });
    expect(Object.keys(f).sort()).toEqual([
      "date",
      "email",
      "name",
      "phone",
      "time",
    ]);
  });
  it("checks the Messenger link, source and price", () => {
    expect(
      fields({ messenger: "Juan Dela Cruz", phone: "09171234567" }).messenger,
    ).toBeTruthy();
    expect(fields({ source: "website" }).source).toBeTruthy();
    expect(fields({ totalOverride: "abc" }).totalOverride).toBeTruthy();
    expect(fields({ totalOverride: "-5" }).totalOverride).toBeTruthy();
    expect(fields({ totalOverride: "4500.50" }).totalOverride).toBeUndefined();
    expect(fields({ totalOverride: "" }).totalOverride).toBeUndefined();
  });
  it("limits hours and rejects odd ids", () => {
    expect(fields({ hours: 0 }).hours).toBeTruthy();
    expect(fields({ hours: 2.5 }).hours).toBeTruthy();
    expect(fields({ hours: 25 }).hours).toBeTruthy();
    expect(fields({ packageId: "x" }).packageId).toBeTruthy();
  });
});

const edit = {
  name: "Juan Dela Cruz",
  email: "",
  phone: "0917 123 4567",
  messenger: "https://m.me/juan.delacruz",
  venue: "Casa Real, Tagaytay",
  date: "2026-12-05",
  time: "09:30",
  hours: "4",
  totalOverride: "",
};
const current = {
  client_name: "Juan Dela Cruz",
  client_email: null,
  client_phone: "09171234567",
  client_messenger: "https://m.me/juan.delacruz",
  venue: "Casa Real, Tagaytay",
  starts_at: "2026-12-05T01:30:00+00:00", // 09:30 in Manila
  duration_hours: 4,
  total_price: 5000,
};

describe("editing a booking", () => {
  const fields = (patch: object) => {
    const r = checkEditBooking({ ...edit, ...patch });
    return r.ok ? {} : r.fields;
  };
  it("accepts the saved values and reports every problem together", () => {
    expect(checkEditBooking(edit).ok).toBe(true);
    const f = fields({ name: "J", email: "nope", phone: "12", hours: "0" });
    expect(Object.keys(f).sort()).toEqual(["email", "hours", "name", "phone"]);
  });
  it("keeps at least one way to contact the client", () => {
    expect(fields({ messenger: "", phone: "", email: "" }).contact).toMatch(
      /at least one/,
    );
    expect(
      fields({ messenger: "", phone: "", email: "a@b.co" }).contact,
    ).toBeUndefined();
  });
  it("date, time and hours go together (or are all empty for an inquiry)", () => {
    expect(fields({ date: "", time: "", hours: "" })).toEqual({});
    const f = fields({ date: "", time: "09:00", hours: "2" });
    expect(f.date).toMatch(/together/);
    expect(fields({ hours: "25" }).hours).toBeTruthy();
    expect(fields({ hours: "2.5" }).hours).toBeTruthy();
  });
  it("sends only what changed", () => {
    const same = checkEditBooking(edit);
    if (!same.ok) throw new Error("should be valid");
    expect(
      buildBookingPatch(current, same.data, "https://m.me/juan.delacruz"),
    ).toEqual({});
    const changed = checkEditBooking({
      ...edit,
      name: "Juan D. Cruz",
      phone: "+63 917 000 1111",
      venue: "Another Hall",
      time: "11:00",
      hours: "5",
      totalOverride: "5500",
    });
    if (!changed.ok) throw new Error("should be valid");
    expect(
      buildBookingPatch(current, changed.data, "https://m.me/juan.delacruz"),
    ).toEqual({
      client_name: "Juan D. Cruz",
      client_phone: "+639170001111",
      venue: "Another Hall",
      starts_at: "2026-12-05T11:00:00+08:00",
      duration_hours: 5,
      total_price: 5500,
    });
  });
  it("can clear email, phone and venue, and ignores an empty price box", () => {
    const r = checkEditBooking({
      ...edit,
      venue: "",
      phone: "",
      email: "x@y.co",
    });
    if (!r.ok) throw new Error("should be valid");
    expect(
      buildBookingPatch(current, r.data, "https://m.me/juan.delacruz"),
    ).toEqual({
      venue: null,
      client_phone: null,
      client_email: "x@y.co",
    });
  });
});