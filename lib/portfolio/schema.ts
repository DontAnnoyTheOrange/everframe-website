import { z } from "zod";
import { PUBLIC_ID } from "../cloudinary/url";
import { isRealDate } from "../booking/manila";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Anna's Debut 🎉 (Tagaytay)" becomes "annas-debut-tagaytay". */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** The dropdown value that means "I will type a new category". */
export const NEW_CATEGORY = "__new__";
export const CATEGORY_NAME_MIN = 2;
export const CATEGORY_NAME_MAX = 60;

/** Tidies a typed category name: trims, collapses spaces, and checks the length. */
export function cleanCategoryName(
  raw: string,
): { ok: true; name: string; slug: string } | { ok: false; message: string } {
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < CATEGORY_NAME_MIN)
    return {
      ok: false,
      message: "Please type the new category name (at least 2 characters).",
    };
  if (name.length > CATEGORY_NAME_MAX)
    return {
      ok: false,
      message: `Please keep the category name under ${CATEGORY_NAME_MAX} characters.`,
    };
  const slug = slugify(name);
  if (!slug)
    return {
      ok: false,
      message: "The category name needs some letters or numbers.",
    };
  if (slug === "other" || slug === "others")
    return {
      ok: false,
      message:
        "“Others” is reserved for bookings. Please use a more specific name.",
    };
  return { ok: true, name, slug };
}

export const projectSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Please enter a title.")
    .max(160, "Please keep the title under 160 characters."),
  slug: z
    .string()
    .trim()
    .max(80, "Please keep the web address under 80 characters.")
    .refine((v) => v === "" || SLUG.test(v), {
      message:
        "Use lowercase letters, numbers and single dashes only, like anna-debut.",
    }),
  categoryId: z.union([z.uuid(), z.literal(NEW_CATEGORY)], {
    error: "Please choose a category.",
  }),
  // Only used when categoryId is NEW_CATEGORY (checked with cleanCategoryName).
  newCategory: z.string().max(200),
  description: z
    .string()
    .trim()
    .max(2000, "Please keep the description under 2000 characters."),
  shootDate: z.string().refine((v) => v === "" || isRealDate(v), {
    message: "Please pick a real date.",
  }),
  isPublished: z.boolean(),
});

export const uploadedImageSchema = z.object({
  publicId: z
    .string()
    .regex(PUBLIC_ID, "That image is not from our upload folder."),
  width: z.number().int().min(1).max(30000),
  height: z.number().int().min(1).max(30000),
});

export const imageTextSchema = z.object({
  alt: z
    .string()
    .trim()
    .max(300, "Please keep the description under 300 characters."),
  caption: z
    .string()
    .trim()
    .max(300, "Please keep the caption under 300 characters."),
});