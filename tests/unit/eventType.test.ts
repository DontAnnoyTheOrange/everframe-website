import { describe, expect, it } from "vitest";
import {
  cleanOtherLabel,
  validateOtherLabel,
} from "../../lib/booking/eventType";

describe("Others event type", () => {
  it("rejects an empty value", () => {
    expect(validateOtherLabel("").ok).toBe(false);
    expect(validateOtherLabel("     ").ok).toBe(false);
  });
  it("rejects too short and too long values", () => {
    expect(validateOtherLabel("a").ok).toBe(false);
    expect(validateOtherLabel("a".repeat(81)).ok).toBe(false);
    expect(validateOtherLabel("a".repeat(80)).ok).toBe(true);
  });
  it("rejects control characters", () => {
    expect(validateOtherLabel("Baby\u0007 shower").ok).toBe(false);
  });
  it("accepts and cleans a normal value", () => {
    const r = validateOtherLabel("  Baby   Shower ");
    expect(r).toEqual({ ok: true, value: "Baby Shower" });
    expect(cleanOtherLabel("  a   b ")).toBe("a b");
  });
  it("keeps Filipino and punctuation characters", () => {
    expect(validateOtherLabel("Pasasalamat ng Pamilya Reyes").ok).toBe(true);
    expect(validateOtherLabel("Tito's 60th (surprise)").ok).toBe(true);
  });
});