import { describe, expect, it } from "vitest";
import {
  coverageLabel,
  fitsHours,
  limitNote,
  resolvePackage,
  tiersFor,
} from "../../lib/pricing/packageRules";
import { PACKAGES } from "./fixtures";

const photo = tiersFor(PACKAGES, "photo");
const video = tiersFor(PACKAGES, "video");
const combo = tiersFor(PACKAGES, "photo_video");
const pick = (tiers: typeof photo, chosen: string, hours: number) =>
  resolvePackage(tiers, chosen, hours).slug;

describe("Photo service", () => {
  it("keeps Basic Events at 1 and 2 hours", () => {
    expect(pick(photo, "photo-basic", 1)).toBe("photo-basic");
    expect(pick(photo, "photo-basic", 2)).toBe("photo-basic");
  });
  it("switches to Any Events above 2 hours", () => {
    expect(pick(photo, "photo-basic", 3)).toBe("photo-any");
    expect(pick(photo, "photo-basic", 12)).toBe("photo-any");
  });
  it("never leaves Basic Events with more than 2 hours", () => {
    for (let h = 1; h <= 12; h++) {
      const slug = pick(photo, "photo-basic", h);
      expect(slug === "photo-basic" ? h <= 2 : true).toBe(true);
    }
  });
  it("shows Whole Event for Any Events, hours for Basic Events", () => {
    const any = photo.find((x) => x.slug === "photo-any")!;
    const basic = photo.find((x) => x.slug === "photo-basic")!;
    expect(coverageLabel(any, 3)).toBe("Whole Event");
    expect(coverageLabel(basic, 2)).toBe("2 hours");
    expect(coverageLabel(basic, 1)).toBe("1 hour");
  });
  it("has no extra-hour charge on Basic Events", () => {
    expect(photo[0].extra_hour_rate).toBeNull();
  });
});

describe("Video service", () => {
  it("Basic stays Basic at 2 and 3 hours (3 hours = 1 extra hour)", () => {
    expect(pick(video, "video-basic", 2)).toBe("video-basic");
    expect(pick(video, "video-basic", 3)).toBe("video-basic");
  });
  it("Basic moves to Standard above 3 hours", () => {
    expect(pick(video, "video-basic", 4)).toBe("video-standard");
  });
  it("Standard stays at 5 hours, moves to Premium above 5", () => {
    expect(pick(video, "video-standard", 5)).toBe("video-standard");
    expect(pick(video, "video-standard", 6)).toBe("video-premium");
  });
  it("Basic can jump two tiers when hours are far past its limit", () => {
    expect(pick(video, "video-basic", 8)).toBe("video-premium");
  });
  it("Premium never moves up (it is the top tier)", () => {
    expect(pick(video, "video-premium", 12)).toBe("video-premium");
  });
});

describe("Photo + Video service", () => {
  it("Standard stays at 5 hours", () => {
    expect(pick(combo, "combo-standard", 4)).toBe("combo-standard");
    expect(pick(combo, "combo-standard", 5)).toBe("combo-standard");
  });
  it("moves to Premium above 5 hours", () => {
    expect(pick(combo, "combo-standard", 6)).toBe("combo-premium");
    expect(pick(combo, "combo-standard", 7)).toBe("combo-premium");
  });
  it("Premium keeps its 500-per-hour rule beyond 6 hours (still Premium)", () => {
    expect(pick(combo, "combo-premium", 9)).toBe("combo-premium");
    expect(combo[1].max_hours).toBe(6);
    expect(combo[1].extra_hour_rate).toBe(500);
  });
});

describe("Decreasing hours and repeated changes", () => {
  it("goes back to the picked package when hours drop again", () => {
    expect(pick(photo, "photo-basic", 3)).toBe("photo-any");
    expect(pick(photo, "photo-basic", 2)).toBe("photo-basic");
    expect(pick(video, "video-basic", 6)).toBe("video-premium");
    expect(pick(video, "video-basic", 4)).toBe("video-standard");
    expect(pick(video, "video-basic", 3)).toBe("video-basic");
  });
  it("never goes below the package the customer picked", () => {
    expect(pick(video, "video-premium", 1)).toBe("video-premium");
    expect(pick(photo, "photo-any", 1)).toBe("photo-any");
  });
  it("gives the same answer every time for the same input", () => {
    const runs = Array.from({ length: 50 }, () =>
      pick(video, "video-basic", 5),
    );
    expect(new Set(runs).size).toBe(1);
  });
  it("walking hours up then down returns to the start", () => {
    const seen: string[] = [];
    for (let h = 1; h <= 8; h++) seen.push(pick(video, "video-basic", h));
    for (let h = 8; h >= 1; h--) seen.push(pick(video, "video-basic", h));
    expect(seen.slice(0, 8)).toEqual(seen.slice(8).reverse());
  });
  it("an unknown picked id falls back to the first tier", () => {
    expect(pick(video, "does-not-exist", 2)).toBe("video-basic");
  });
});

describe("Switching service", () => {
  it("each service only offers its own tiers", () => {
    expect(photo.map((x) => x.slug)).toEqual(["photo-basic", "photo-any"]);
    expect(video.map((x) => x.slug)).toEqual([
      "video-basic",
      "video-standard",
      "video-premium",
    ]);
    expect(combo.map((x) => x.slug)).toEqual([
      "combo-standard",
      "combo-premium",
    ]);
  });
  it("a package from another service is never returned", () => {
    expect(resolvePackage(video, "photo-basic", 2).service_type).toBe("video");
  });
});

describe("fitsHours and notes", () => {
  it("fitsHours follows upgrade_above_hours", () => {
    const basic = photo[0];
    expect(fitsHours(basic, 2)).toBe(true);
    expect(fitsHours(basic, 3)).toBe(false);
    expect(fitsHours(photo[1], 99)).toBe(true);
  });
  it("explains the limit in plain words", () => {
    expect(limitNote(photo[0], photo[1])).toContain("switch you to Any Events");
    expect(limitNote(video[0], video[1])).toContain("₱500");
    expect(limitNote(video[2], undefined)).toContain("beyond 6");
    expect(limitNote(photo[1], undefined)).toContain("Whole-event");
  });
});