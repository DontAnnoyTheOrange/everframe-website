"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { parseMessengerLink } from "@/lib/booking/messenger";
import {
  SOCIALS,
  cleanCount,
  cleanEmailSetting,
  cleanPhoneSetting,
  cleanSocialUrl,
} from "@/lib/site/links";

export type SettingsState = {
  ok?: boolean;
  message?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
  nonce?: string;
};

type Db = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

// Saves one setting. An empty value removes the row, so the matching section is hidden on the site.
async function saveSetting(
  db: Db,
  key: string,
  value: unknown | null,
): Promise<boolean> {
  if (value === null) {
    const { error } = await db.from("site_settings").delete().eq("key", key);
    return !error;
  }
  const upd = await db
    .from("site_settings")
    .update({ value, is_public: true })
    .eq("key", key)
    .select("key");
  if (upd.error) return false;
  if ((upd.data ?? []).length > 0) return true;
  const ins = await db
    .from("site_settings")
    .insert({ key, value, is_public: true });
  return !ins.error;
}

const FIELDS = [
  "messenger",
  "email",
  "phone",
  "serviceArea",
  "aboutText",
  "eventsShot",
  "yearsExperience",
  ...SOCIALS.map((s) => s.key),
];

// The contact details, social links, and numbers shown on the homepage and Contact page.
export async function saveSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const r = await run(formData);
  return r.values ? { ...r, nonce: crypto.randomUUID() } : r;
}

async function run(formData: FormData): Promise<SettingsState> {
  const { supabase } = await requireAdmin();
  const s = (k: string) => String(formData.get(k) ?? "");
  const values: Record<string, string> = {};
  for (const k of FIELDS) values[k] = s(k);
  const fields: Record<string, string> = {};

  let messenger = "";
  if (values.messenger.trim() !== "") {
    const m = parseMessengerLink(values.messenger);
    if (m.ok) messenger = m.url;
    else fields.messenger = m.message;
  }
  const email = cleanEmailSetting(values.email);
  if (!email.ok) fields.email = email.message;
  const phone = cleanPhoneSetting(values.phone);
  if (!phone.ok) fields.phone = phone.message;
  const socials: Record<string, string> = {};
  for (const p of SOCIALS) {
    const c = cleanSocialUrl(p.key, values[p.key]);
    if (!c.ok) fields[p.key] = c.message;
    else if (c.url) socials[p.key] = c.url;
  }
  const area = z
    .string()
    .trim()
    .max(200, "Please keep it under 200 characters.")
    .safeParse(values.serviceArea);
  if (!area.success) fields.serviceArea = area.error.issues[0].message;
  const about = z
    .string()
    .trim()
    .max(1200, "Please keep it under 1200 characters.")
    .safeParse(values.aboutText);
  if (!about.success) fields.aboutText = about.error.issues[0].message;
  const events = cleanCount(values.eventsShot, 100000, "Events shot");
  if (!events.ok) fields.eventsShot = events.message;
  const years = cleanCount(values.yearsExperience, 80, "Years of experience");
  if (!years.ok) fields.yearsExperience = years.message;

  if (Object.keys(fields).length > 0)
    return { message: "Please check the highlighted fields.", fields, values };

  const results = await Promise.all([
    saveSetting(supabase, "messenger_url", messenger || null),
    saveSetting(
      supabase,
      "contact_email",
      email.ok && email.value ? email.value : null,
    ),
    saveSetting(
      supabase,
      "contact_phone",
      phone.ok && phone.value ? phone.value : null,
    ),
    saveSetting(
      supabase,
      "socials",
      Object.keys(socials).length ? socials : null,
    ),
    saveSetting(
      supabase,
      "service_area",
      area.success && area.data ? area.data : null,
    ),
    saveSetting(
      supabase,
      "about_text",
      about.success && about.data ? about.data : null,
    ),
    saveSetting(supabase, "events_shot", events.ok ? events.value : null),
    saveSetting(supabase, "years_experience", years.ok ? years.value : null),
  ]);
  if (results.some((ok) => !ok))
    return {
      message: "Some changes could not be saved. Please try again.",
      values,
    };
  revalidatePath("/", "layout");
  // Show what was really saved (the cleaned Messenger link, https:// added to social links).
  const saved: Record<string, string> = {
    ...values,
    messenger,
    email: email.ok ? email.value : values.email,
    ...socials,
  };
  for (const p of SOCIALS) saved[p.key] = socials[p.key] ?? "";
  return { ok: true, message: "Saved. The website is updated.", values: saved };
}

// ---------- Testimonials ----------

export type TestimonialState = {
  ok?: boolean;
  message?: string;
  fields?: Record<string, string>;
  nonce?: string;
};

const testimonialSchema = z.object({
  quote: z
    .string()
    .trim()
    .min(10, "Please enter the quote (at least 10 characters).")
    .max(600, "Please keep the quote under 600 characters."),
  author: z
    .string()
    .trim()
    .min(2, "Please enter who said it.")
    .max(120, "Please keep the name under 120 characters."),
  isPublished: z.boolean(),
});

export async function addTestimonial(
  _prev: TestimonialState,
  formData: FormData,
): Promise<TestimonialState> {
  const { supabase } = await requireAdmin();
  const parsed = testimonialSchema.safeParse({
    quote: String(formData.get("quote") ?? ""),
    author: String(formData.get("author") ?? ""),
    isPublished: formData.get("isPublished") === "on",
  });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0]);
      if (!(k in fields)) fields[k] = i.message;
    }
    return { message: "Please check the highlighted fields.", fields };
  }
  const { data: last } = await supabase
    .from("testimonials")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const next = ((last?.[0]?.sort_order as number | undefined) ?? 0) + 1;
  const { error } = await supabase.from("testimonials").insert({
    quote: parsed.data.quote,
    author: parsed.data.author,
    is_published: parsed.data.isPublished,
    sort_order: next,
  });
  if (error) {
    console.error("add testimonial failed:", error.message);
    return { message: "Could not save the testimonial. Please try again." };
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return {
    ok: true,
    message: "Testimonial added.",
    nonce: crypto.randomUUID(),
  };
}

const idSchema = z.uuid();

export async function setTestimonialPublished(
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!idSchema.safeParse(id).success) return;
  const publish = formData.get("publish") === "1";
  await supabase
    .from("testimonials")
    .update({ is_published: publish })
    .eq("id", id);
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
}

export async function deleteTestimonial(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!idSchema.safeParse(id).success) return;
  await supabase.from("testimonials").delete().eq("id", id);
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
}