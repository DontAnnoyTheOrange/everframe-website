import { describe, expect, it } from "vitest";
import { cleanQuery } from "@/lib/admin/search";

describe("cleanQuery", () => {
  it("keeps names and references", () => {
    expect(cleanQuery("Maria Santos")).toBe("Maria Santos");
    expect(cleanQuery("EF-2026-0042")).toBe("EF-2026-0042");
    expect(cleanQuery("Peña")).toBe("Peña");
  });
  it("removes characters that could change the filter", () => {
    expect(cleanQuery("a,client_name.eq.x")).toBe("a client_name.eq.x");
    expect(cleanQuery("x%(y)*")).toBe("x y");
  });
  it("handles empty and long input", () => {
    expect(cleanQuery(undefined)).toBe("");
    expect(cleanQuery("   ")).toBe("");
    expect(cleanQuery("a".repeat(200))).toHaveLength(60);
  });
});