import { describe, expect, it } from "vitest";
import {
  bookingInputSchema,
  fieldErrors,
  normalizePhone,
} from "../../lib/booking/bookingSchema";
import {
  addDays,
  addMonths,
  busyOnDay,
  dayIsFull,
  dayKey,
  isRealDate,
  manilaIso,
  manilaMs,
  monthGrid,
  overlapsAny,
  startTimes,
  timeLabel,
} from "../../lib/booking/manila";
import { messengerHref, parseMessengerLink } from "../../lib/booking/messenger";
import { createLimiter } from "../../lib/booking/rateLimit";
import { resolveSelection } from "../../lib/booking/selection";
import { PACKAGES } from "./fixtures";

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const valid = {
  packageId: UUID,
  hours: 4,
  addonIds: [],
  outsideBase: false,
  categoryId: UUID,
  eventTypeOther: "",
  date: "2026-12-05",
  time: "09:00",
  name: "Maria Santos",
  email: "maria@example.com",
  phone: "",
  messenger: "https://m.me/maria.santos",
  venue: "",
  message: "",
  website: "",
};

describe("Manila date helpers", () => {
  it("joins a date and time into Manila time (+08:00)", () => {
    expect(manilaIso("2026-12-05", "09:00")).toBe("2026-12-05T09:00:00+08:00");
    expect(manilaMs("2026-12-05", "08:00")).toBe(Date.UTC(2026, 11, 5, 0, 0));
  });
  it("reads the Manila calendar day, even late at night UTC", () => {
    // 2026-12-04 17:00 UTC is already 2026-12-05 01:00 in Manila
    expect(dayKey(Date.UTC(2026, 11, 4, 17, 0))).toBe("2026-12-05");
    expect(dayKey(Date.UTC(2026, 11, 4, 15, 59))).toBe("2026-12-04");
  });
  it("rejects dates that do not exist", () => {
    expect(isRealDate("2026-02-31")).toBe(false);
    expect(isRealDate("2026-13-01")).toBe(false);
    expect(isRealDate("hello")).toBe(false);
    expect(isRealDate("2028-02-29")).toBe(true);
  });
  it("adds days and months across year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addMonths(2026, 11, 2)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2026, 1, 0)).toEqual({ year: 2026, month: 1 });
  });
  it("builds half-hour start times from 6:00 AM to 10:00 PM", () => {
    const t = startTimes();
    expect(t[0]).toBe("06:00");
    expect(t[t.length - 1]).toBe("22:00");
    expect(t).toContain("12:30");
    expect(timeLabel("00:00")).toBe("12:00 AM");
    expect(timeLabel("13:30")).toBe("1:30 PM");
  });
  it("lays a month out in weeks of seven, Sunday first", () => {
    const weeks = monthGrid(2026, 11); // 1 Nov 2026 is a Sunday
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0]).toEqual({ key: "2026-11-01", day: 1 });
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });
});

describe("busy times", () => {
  const busy = [
    { s: manilaMs("2026-12-05", "13:00"), e: manilaMs("2026-12-05", "19:00") },
  ];
  it("detects overlap but not touching ends", () => {
    const start = manilaMs("2026-12-05", "09:00");
    expect(overlapsAny(start, start + 4 * 3600000, busy)).toBe(false); // ends 13:00 exactly
    expect(overlapsAny(start, start + 5 * 3600000, busy)).toBe(true);
  });
  it("lists the busy windows on a day, and none on a free day", () => {
    expect(busyOnDay("2026-12-05", busy)).toHaveLength(1);
    expect(busyOnDay("2026-12-06", busy)).toHaveLength(0);
  });
  it("marks a day full only when no start time is free", () => {
    expect(dayIsFull("2026-12-05", busy)).toBe(false);
    const wholeDay = [
      {
        s: manilaMs("2026-12-05", "00:00"),
        e: manilaMs("2026-12-06", "00:00"),
      },
    ];
    expect(dayIsFull("2026-12-05", wholeDay)).toBe(true);
  });
  it("clips a booking that runs past midnight into the next day", () => {
    const late = [
      {
        s: manilaMs("2026-12-05", "20:00"),
        e: manilaMs("2026-12-06", "02:00"),
      },
    ];
    expect(busyOnDay("2026-12-06", late)).toHaveLength(1);
  });
});

describe("booking form rules", () => {
  it("accepts a valid request", () => {
    expect(bookingInputSchema.safeParse(valid).success).toBe(true);
  });
  it("requires a Messenger link, and a plain name is not enough", () => {
    const missing = bookingInputSchema.safeParse({ ...valid, messenger: "" });
    expect(missing.success).toBe(false);
    if (!missing.success)
      expect(fieldErrors(missing.error).messenger).toMatch(/Messenger link/);
    const nameOnly = bookingInputSchema.safeParse({
      ...valid,
      messenger: "Maria Santos",
    });
    expect(nameOnly.success).toBe(false);
  });
  it("email and mobile are optional once a Messenger link is given", () => {
    expect(
      bookingInputSchema.safeParse({ ...valid, email: "", phone: "" }).success,
    ).toBe(true);
    expect(
      bookingInputSchema.safeParse({
        ...valid,
        email: "",
        phone: "0917 123 4567",
      }).success,
    ).toBe(true);
  });
  it("rejects a bad email, bad phone, bad date and bad time", () => {
    const bad = (patch: object) =>
      bookingInputSchema.safeParse({ ...valid, ...patch }).success;
    expect(bad({ email: "not-an-email" })).toBe(false);
    expect(bad({ phone: "12" })).toBe(false);
    expect(bad({ date: "2026-02-31" })).toBe(false);
    expect(bad({ time: "09:15" })).toBe(false);
    expect(bad({ name: "M" })).toBe(false);
    expect(bad({ hours: 2.5 })).toBe(false);
    expect(bad({ hours: 0 })).toBe(false);
    expect(bad({ packageId: "nope" })).toBe(false);
  });
  it("cleans phone numbers", () => {
    expect(normalizePhone("+63 (917) 123-4567")).toBe("+639171234567");
    expect(normalizePhone("0917 123 4567")).toBe("09171234567");
  });
});

describe("rate limit", () => {
  it("lets 3 through then blocks, and frees up after the window", () => {
    const l = createLimiter(3, 1000);
    expect([1, 2, 3, 4].map(() => l.allow("a", 0))).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(l.allow("b", 0)).toBe(true); // a different visitor is unaffected
    expect(l.allow("a", 1001)).toBe(true);
  });
});

describe("link from the pricing page", () => {
  const categories = [
    {
      id: "c1",
      slug: "weddings",
      name: "Wedding",
      short_story: null,
      sort_order: 1,
      is_other: false,
    },
    {
      id: "c5",
      slug: "other",
      name: "Others",
      short_story: null,
      sort_order: 5,
      is_other: true,
    },
  ];
  const addons = [
    {
      id: "a1",
      name: "Priority editing",
      price: 700,
      per_hour: false,
      sort_order: 1,
    },
  ];

  it("returns null when the package is missing or unknown", () => {
    expect(resolveSelection(PACKAGES, categories, addons, {})).toBeNull();
    expect(
      resolveSelection(PACKAGES, categories, addons, { package: "nope" }),
    ).toBeNull();
  });
  it("moves up a tier when the hours do not fit the picked package", () => {
    const s = resolveSelection(PACKAGES, categories, addons, {
      package: "photo-basic",
      hours: "3",
    });
    expect(s?.pkg.slug).toBe("photo-any");
  });
  it("falls back to the package's own hours for a bad hours value", () => {
    expect(
      resolveSelection(PACKAGES, categories, addons, {
        package: "video-standard",
        hours: "abc",
      })?.hours,
    ).toBe(4);
    expect(
      resolveSelection(PACKAGES, categories, addons, {
        package: "video-standard",
        hours: "99",
      })?.hours,
    ).toBe(4);
  });
  it("keeps the Others label only for the Others type, and drops unknown add-ons", () => {
    const a = resolveSelection(PACKAGES, categories, addons, {
      package: "photo-basic",
      category: "other",
      other: "  Baby   shower ",
      addons: "a1,zzz,a1",
      outside: "1",
    });
    expect(a?.other).toBe("Baby shower");
    expect(a?.addonIds).toEqual(["a1"]);
    expect(a?.outsideBase).toBe(true);
    const b = resolveSelection(PACKAGES, categories, addons, {
      package: "photo-basic",
      category: "weddings",
      other: "x",
    });
    expect(b?.other).toBe("");
  });
});

describe("Messenger links", () => {
  const url = (raw: string) => {
    const r = parseMessengerLink(raw);
    return r.ok ? r.url : `ERROR: ${r.message}`;
  };
  it("turns the common link shapes into one clean m.me link", () => {
    expect(url("https://m.me/juan.delacruz")).toBe(
      "https://m.me/juan.delacruz",
    );
    expect(url("m.me/juan.delacruz")).toBe("https://m.me/juan.delacruz");
    expect(url("https://www.messenger.com/t/juan.delacruz")).toBe(
      "https://m.me/juan.delacruz",
    );
    expect(url("https://www.facebook.com/juan.delacruz")).toBe(
      "https://m.me/juan.delacruz",
    );
    expect(url("https://m.facebook.com/juan.delacruz?mibextid=abc#x")).toBe(
      "https://m.me/juan.delacruz",
    );
    expect(url("http://facebook.com/juan.delacruz/")).toBe(
      "https://m.me/juan.delacruz",
    );
    expect(url("https://www.facebook.com/profile.php?id=100012345678901")).toBe(
      "https://m.me/100012345678901",
    );
    expect(
      url("https://www.facebook.com/people/Juan-Dela-Cruz/100012345678901/"),
    ).toBe("https://m.me/100012345678901");
    expect(url("  https://m.me/juan?ref=abc  ")).toBe("https://m.me/juan");
  });
  it("keeps a Facebook share link as it is (m.me cannot read it)", () => {
    expect(url("https://www.facebook.com/share/1AbCdEfGh/?mibextid=x")).toBe(
      "https://www.facebook.com/share/1AbCdEfGh/",
    );
  });
  it("refuses other websites, scripts, posts, groups and plain names", () => {
    for (const bad of [
      "",
      "Juan Dela Cruz",
      "juan",
      "https://evil.com/m.me/juan",
      "https://m.me.evil.com/juan",
      "https://facebook.com.evil.com/juan.delacruz",
      "javascript:alert(1)",
      "data:text/html,hi",
      "https://user:pw@m.me/juan",
      "https://www.facebook.com/groups/12345",
      "https://www.facebook.com/photo.php?fbid=1",
      "https://www.facebook.com/",
      "https://m.me/j/abcdef",
      "https://www.messenger.com/",
    ]) {
      expect(parseMessengerLink(bad).ok, bad).toBe(false);
    }
  });
  it("messengerHref only returns a link that passes the same check", () => {
    expect(messengerHref("https://m.me/juan.delacruz")).toBe(
      "https://m.me/juan.delacruz",
    );
    expect(messengerHref("Maria from Facebook")).toBeNull();
    expect(messengerHref("javascript:alert(1)")).toBeNull();
    expect(messengerHref(null)).toBeNull();
  });
});