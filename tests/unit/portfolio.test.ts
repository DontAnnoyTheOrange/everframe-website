import { describe, expect, it } from "vitest";
import { signParams } from "../../lib/cloudinary/signature";
import { PUBLIC_ID, cloudinaryUrl } from "../../lib/cloudinary/url";
import {
  NEW_CATEGORY,
  cleanCategoryName,
  imageTextSchema,
  projectSchema,
  slugify,
  uploadedImageSchema,
} from "../../lib/portfolio/schema";
import { parseVideoUrl, videoFromStored } from "../../lib/portfolio/video";

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
    newCategory: "",
    description: "",
    shootDate: "",
    isPublished: false,
    isFeatured: false,
    videoUrl: "",
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
  it("accepts the 'Other' choice and checks the typed category name", () => {
    expect(
      projectSchema.safeParse({
        ...ok,
        categoryId: NEW_CATEGORY,
        newCategory: "Pre-nup",
      }).success,
    ).toBe(true);
    expect(cleanCategoryName("  Pre-Nup   Shoot ")).toEqual({
      ok: true,
      name: "Pre-Nup Shoot",
      slug: "pre-nup-shoot",
    });
    for (const bad of ["", " a ", "x".repeat(61), "!!!", "Others", "other"])
      expect(cleanCategoryName(bad).ok, bad).toBe(false);
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

describe("video links", () => {
  const yt = "dQw4w9WgXcQ";
  it("accepts the YouTube links people copy", () => {
    for (const u of [
      `https://www.youtube.com/watch?v=${yt}`,
      `https://youtu.be/${yt}?si=abc`,
      `youtube.com/shorts/${yt}`,
      `https://m.youtube.com/embed/${yt}`,
    ]) {
      const r = parseVideoUrl(u);
      expect(r.ok && r.video?.embedSrc).toBe(
        `https://www.youtube-nocookie.com/embed/${yt}?rel=0`,
      );
    }
  });
  it("accepts Vimeo and turns it into a player link", () => {
    const r = parseVideoUrl("https://vimeo.com/123456789");
    expect(r.ok && r.video?.embedSrc).toBe(
      "https://player.vimeo.com/video/123456789",
    );
  });
  it("keeps Facebook as a link that opens on Facebook", () => {
    const r = parseVideoUrl("https://www.facebook.com/everframe/videos/12345");
    expect(r.ok && r.video?.provider).toBe("facebook");
    expect(r.ok && r.video?.embedSrc).toBeNull();
  });
  it("allows empty", () => {
    expect(parseVideoUrl("  ")).toEqual({ ok: true, video: null });
  });
  it("refuses other sites, scripts, http, look-alikes", () => {
    for (const bad of [
      "javascript:alert(1)",
      "http://youtu.be/dQw4w9WgXcQ",
      "https://evil.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=short",
      "https://user:pw@youtube.com/watch?v=dQw4w9WgXcQ",
      "https://vimeo.com/channels/staffpicks",
      "https://facebook.com",
    ])
      expect(parseVideoUrl(bad).ok).toBe(false);
  });
  it("re-checks stored values before showing", () => {
    expect(videoFromStored("javascript:alert(1)")).toBeNull();
    expect(videoFromStored(null)).toBeNull();
    expect(videoFromStored(`https://youtu.be/${yt}`)?.provider).toBe("youtube");
  });
});