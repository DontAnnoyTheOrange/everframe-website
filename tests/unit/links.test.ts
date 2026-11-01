import { describe, expect, it } from "vitest";
import {
  cleanCount,
  cleanEmailSetting,
  cleanPhoneSetting,
  cleanSocialUrl,
  emailHref,
  phoneHref,
  socialHref,
} from "../../lib/site/links";

describe("social links", () => {
  it("accepts a real page and adds https", () => {
    const r = cleanSocialUrl("facebook", "facebook.com/everframe");
    expect(r).toEqual({ ok: true, url: "https://facebook.com/everframe" });
  });
  it("allows empty", () => {
    expect(cleanSocialUrl("instagram", "  ")).toEqual({ ok: true, url: "" });
  });
  it("refuses other websites, look-alikes and scripts", () => {
    for (const bad of [
      "https://evil.com/facebook.com",
      "https://facebook.com.evil.com/x",
      "javascript:alert(1)",
      "http://facebook.com/x",
      "https://user:pw@facebook.com/x",
      "https://facebook.com:8080/x",
    ])
      expect(cleanSocialUrl("facebook", bad).ok).toBe(false);
  });
  it("refuses a bare home page", () => {
    expect(cleanSocialUrl("tiktok", "https://tiktok.com").ok).toBe(false);
  });
  it("does not accept another platform's link", () => {
    expect(cleanSocialUrl("instagram", "https://facebook.com/x").ok).toBe(
      false,
    );
  });
  it("re-checks stored values before showing", () => {
    expect(socialHref("youtube", "javascript:alert(1)")).toBeNull();
    expect(socialHref("youtube", 5)).toBeNull();
    expect(socialHref("youtube", "https://youtube.com/@everframe")).toBe(
      "https://youtube.com/@everframe",
    );
  });
});

describe("email, phone and counts", () => {
  it("validates email", () => {
    expect(cleanEmailSetting("a@b.com").ok).toBe(true);
    expect(cleanEmailSetting("nope").ok).toBe(false);
    expect(emailHref("a@b.com")).toBe("mailto:a@b.com");
    expect(emailHref("x")).toBeNull();
  });
  it("validates phone", () => {
    expect(cleanPhoneSetting("0917 123 4567")).toEqual({
      ok: true,
      value: "09171234567",
    });
    expect(cleanPhoneSetting("12").ok).toBe(false);
    expect(phoneHref("javascript:1")).toBeNull();
  });
  it("validates counts", () => {
    expect(cleanCount("", 10, "X")).toEqual({ ok: true, value: null });
    expect(cleanCount("7", 10, "X")).toEqual({ ok: true, value: 7 });
    expect(cleanCount("11", 10, "X").ok).toBe(false);
    expect(cleanCount("-1", 10, "X").ok).toBe(false);
    expect(cleanCount("1.5", 10, "X").ok).toBe(false);
  });
});