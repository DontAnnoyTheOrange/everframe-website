import { describe, expect, it } from "vitest";
import { themeFor } from "./theme";
import {
  emailSchema,
  fieldErrors,
  nameSchema,
  passwordSchema,
  pickDisplayName,
} from "./account";

describe("account rules", () => {
  it("checks the name", () => {
    expect(nameSchema.safeParse({ name: "  Ian Arzaga " }).data?.name).toBe(
      "Ian Arzaga",
    );
    expect(nameSchema.safeParse({ name: "I" }).success).toBe(false);
    expect(nameSchema.safeParse({ name: "x".repeat(61) }).success).toBe(false);
  });
  it("checks and lowercases the email", () => {
    expect(
      emailSchema.safeParse({ email: " Ian@Example.COM " }).data?.email,
    ).toBe("ian@example.com");
    expect(emailSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
  it("checks the password change", () => {
    const ok = passwordSchema.safeParse({
      current: "oldpassword1",
      next: "a-new-password",
      confirm: "a-new-password",
    });
    expect(ok.success).toBe(true);
    const short = passwordSchema.safeParse({
      current: "x",
      next: "short",
      confirm: "short",
    });
    expect(short.success).toBe(false);
    const mismatch = passwordSchema.safeParse({
      current: "x",
      next: "a-new-password",
      confirm: "another-one-here",
    });
    expect(!mismatch.success && fieldErrors(mismatch.error).confirm).toMatch(
      /do not match/,
    );
    const same = passwordSchema.safeParse({
      current: "same-password-1",
      next: "same-password-1",
      confirm: "same-password-1",
    });
    expect(!same.success && fieldErrors(same.error).next).toMatch(/different/);
    const noCurrent = passwordSchema.safeParse({
      current: "",
      next: "a-new-password",
      confirm: "a-new-password",
    });
    expect(
      !noCurrent.success && fieldErrors(noCurrent.error).current,
    ).toBeTruthy();
  });
  it("picks a display name", () => {
    expect(pickDisplayName("Ian", "Owner", "a@b.c")).toBe("Ian");
    expect(pickDisplayName("  ", "Owner", "a@b.c")).toBe("Owner");
    expect(pickDisplayName(undefined, null, "a@b.c")).toBe("a@b.c");
    expect(pickDisplayName(undefined, null, undefined)).toBe("Admin");
  });
  it("falls back to the light theme", () => {
    expect(themeFor("navy")).toBe("navy");
    expect(themeFor("dark")).toBe("dark");
    expect(themeFor("purple")).toBe("light");
    expect(themeFor(undefined)).toBe("light");
  });
});