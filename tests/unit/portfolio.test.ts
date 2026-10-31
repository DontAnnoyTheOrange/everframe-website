import { describe, expect, it } from "vitest";
import { signParams } from "../../lib/cloudinary/signature";
import { PUBLIC_ID, cloudinaryUrl } from "../../lib/cloudinary/url";
import {
  imageTextSchema,
  projectSchema,
  slugify,
  uploadedImageSchema,
} from "../../lib/portfolio/schema";

const UUID = "123e4567-e89b-42d3-a456-426614174000";

describe("Cloudinary signing", () => {
  it("sorts the parameters, adds the secret and takes the SHA-1 (values checked independently)", () => {
    expect(
      signParams(
        {
          timestamp: 1700000000,
          folder: "everframe/portfolio",
          allowed_formats: "jpg,png",
        },
        "SECRET",
      ),
    ).toBe("6e3de4d216ba11042cc0a97bb8951baf5a1f4494");
    expect(
      signParams(
        { timestamp: 1700000000, public_id: "everframe/portfolio/abcd" },
        "SECRET",
      ),
    ).toBe("66cb3cad46d406abbf6c8d50c6e0b3fc62f2c4b6");
  });
  it("does not depend on the order the parameters are written in", () => {
    expect(signParams({ a: 1, b: 2 }, "s")).toBe(
      signParams({ b: 2, a: 1 }, "s"),
    );
  });
});

describe("Cloudinary links and ids", () => {
  it("builds a resized delivery link", () => {
    expect(cloudinaryUrl("demo", "everframe/portfolio/abc_123", 800)).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_800/everframe/portfolio/abc_123",
    );
  });
  it("keeps the width in a sensible range and encodes odd characters", () => {
    expect(cloudinaryUrl("demo", "a/b", 99999)).toContain("w_4000");
    expect(cloudinaryUrl("demo", "a/b", 1)).toContain("w_16");
    expect(cloudinaryUrl("de mo", "a b/c", 100)).toContain("de%20mo");
    expect(cloudinaryUrl("demo", "a b/c", 100)).toContain("/a%20b/c");
  });
  it("only accepts ids from our own upload folder", () => {
    expect(PUBLIC_ID.test("everframe/portfolio/abc123XYZ")).toBe(true);
    for (const bad of [
      "other/folder/abc123",
      "everframe/portfolio/",
      "everframe/portfolio/a b",
      "everframe/portfolio/../x1234",
      "everframe/portfolio/abc/def1",
      "everframe/portfolio/abc<script>",
    ])
      expect(PUBLIC_ID.test(bad), bad).toBe(false);
  });
});

describe("portfolio rules", () => {
  it("makes a clean web address from a title", () => {
    expect(slugify("Anna's Debut 🎉 (Tagaytay)")).toBe("annas-debut-tagaytay");
    expect(slugify("  Peña & Niño — Wedding  ")).toBe("pena-nino-wedding");
    expect(slugify("!!!")).toBe("");
    expect(slugify("a".repeat(120)).length).toBe(80);
  });
  const ok = {
    title: "Anna's Debut",
    slug: "",
    categoryId: UUID,
    description: "",
    shootDate: "",
    isPublished: false,
  };
  it("accepts a project and reports every problem at once", () => {
    expect(projectSchema.safeParse(ok).success).toBe(true);
    const r = projectSchema.safeParse({
      ...ok,
      title: "",
      slug: "Bad Slug",
      categoryId: "x",
      shootDate: "2026-02-31",
    });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(r.error.issues.map((i) => i.path[0]).sort()).toEqual([
        "categoryId",
        "shootDate",
        "slug",
        "title",
      ]);
  });
  it("checks uploaded photo details and text", () => {
    const good = {
      publicId: "everframe/portfolio/abcd1234",
      width: 4000,
      height: 3000,
    };
    expect(uploadedImageSchema.safeParse(good).success).toBe(true);
    expect(
      uploadedImageSchema.safeParse({ ...good, publicId: "x/y/zzzz" }).success,
    ).toBe(false);
    expect(uploadedImageSchema.safeParse({ ...good, width: 0 }).success).toBe(
      false,
    );
    expect(
      uploadedImageSchema.safeParse({ ...good, height: 1.5 }).success,
    ).toBe(false);
    expect(
      imageTextSchema.safeParse({ alt: "x".repeat(301), caption: "" }).success,
    ).toBe(false);
    expect(
      imageTextSchema.safeParse({ alt: "Bride and groom", caption: "" })
        .success,
    ).toBe(true);
  });
});