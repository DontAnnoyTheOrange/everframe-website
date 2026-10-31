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
  categoryId: z.uuid({ error: "Please choose a category." }),
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