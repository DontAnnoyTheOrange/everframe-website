"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { createUploadSignature, destroyImage } from "@/lib/cloudinary/server";
import {
  NEW_CATEGORY,
  cleanCategoryName,
  imageTextSchema,
  projectSchema,
  slugify,
  uploadedImageSchema,
} from "@/lib/portfolio/schema";
import { parseVideoUrl } from "@/lib/portfolio/video";

export type ProjectState = {
  ok?: boolean;
  message?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
  nonce?: string;
};

export type ImageResult = { ok: boolean; message: string };

function refresh(projectId?: string) {
  revalidatePath("/portfolio", "layout");
  revalidatePath("/booking"); // a new category is also a booking event type
  revalidatePath("/pricing");
  revalidatePath("/admin/portfolio");
  if (projectId) revalidatePath(`/admin/portfolio/${projectId}`);
}

const idSchema = z.uuid();

// ---------- Projects ----------

function readProject(formData: FormData) {
  const s = (k: string) => String(formData.get(k) ?? "");
  const values: Record<string, string> = {
    title: s("title"),
    slug: s("slug"),
    categoryId: s("categoryId"),
    newCategory: s("newCategory"),
    description: s("description"),
    shootDate: s("shootDate"),
    videoUrl: s("videoUrl"),
    isPublished: formData.get("isPublished") === "on" ? "on" : "",
    isFeatured: formData.get("isFeatured") === "on" ? "on" : "",
  };
  const parsed = projectSchema.safeParse({
    ...values,
    isPublished: values.isPublished === "on",
    isFeatured: values.isFeatured === "on",
  });
  return { values, parsed };
}

function problems(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const i of error.issues) {
    const k = String(i.path[0] ?? "form");
    if (!(k in fields)) fields[k] = i.message;
  }
  return fields;
}

type Db = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

// "Other": creates the category the admin typed (or reuses one with the same name), so it shows up
// in the portfolio filters and as an event type on the booking page. It is placed just before
// "Others", which always stays last.
async function resolveNewCategory(
  supabase: Db,
  rawName: string,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const clean = cleanCategoryName(rawName);
  if (!clean.ok) return clean;
  const { data, error } = await supabase
    .from("event_categories")
    .select("id,slug,name,sort_order,is_other")
    .limit(200);
  if (error)
    return {
      ok: false,
      message: "Could not read the categories. Please try again.",
    };
  const all = (data ?? []) as {
    id: string;
    slug: string;
    name: string;
    sort_order: number;
    is_other: boolean;
  }[];
  const same = all.find(
    (c) =>
      !c.is_other && (c.slug === clean.slug || slugify(c.name) === clean.slug),
  );
  if (same) return { ok: true, id: same.id }; // already exists: use it, never duplicate
  const others = all.find((c) => c.is_other);
  const sortOrder =
    others?.sort_order ??
    all.reduce((m, c) => Math.max(m, c.sort_order), 0) + 1;
  for (let n = 0; n < 4; n++) {
    const slug = n === 0 ? clean.slug : `${clean.slug}-${n + 1}`;
    const res = await supabase
      .from("event_categories")
      .insert({
        slug,
        name: clean.name,
        sort_order: sortOrder,
        is_published: true,
        is_other: false,
      })
      .select("id")
      .single();
    if (!res.error) {
      if (others)
        await supabase
          .from("event_categories")
          .update({ sort_order: sortOrder + 1 })
          .eq("id", others.id);
      return { ok: true, id: (res.data as { id: string }).id };
    }
    if (res.error.code !== "23505") {
      console.error("create category failed:", res.error.message);
      return {
        ok: false,
        message: "Could not create the category. Please try again.",
      };
    }
  }
  return {
    ok: false,
    message: "Could not create the category. Please try another name.",
  };
}

async function saveProject(
  mode: "create" | "update",
  formData: FormData,
): Promise<ProjectState> {
  const { supabase } = await requireAdmin();
  const { values, parsed } = readProject(formData);
  if (!parsed.success)
    return {
      message: "Please check the highlighted fields.",
      fields: problems(parsed.error),
      values,
    };
  const v = parsed.data;
  const video = parseVideoUrl(v.videoUrl);
  if (!video.ok)
    return {
      message: "Please check the highlighted fields.",
      fields: { videoUrl: video.message },
      values,
    };
  let categoryId = v.categoryId;
  if (categoryId === NEW_CATEGORY) {
    const made = await resolveNewCategory(supabase, v.newCategory);
    if (!made.ok)
      return {
        message: "Please check the highlighted fields.",
        fields: { newCategory: made.message },
        values,
      };
    categoryId = made.id;
  }
  const slug = v.slug || slugify(v.title);
  if (!slug)
    return {
      message: "Please check the highlighted fields.",
      fields: { slug: "Please type a web address, like anna-debut." },
      values,
    };

  const row = {
    title: v.title,
    slug,
    category_id: categoryId,
    description: v.description || null,
    shoot_date: v.shootDate || null,
    is_published: v.isPublished,
    is_featured: v.isFeatured,
    video_url: video.video?.url ?? null,
  };

  let id: string | undefined;
  let error;
  if (mode === "create") {
    const res = await supabase
      .from("portfolio_projects")
      .insert(row)
      .select("id")
      .single();
    error = res.error;
    id = (res.data as { id?: string } | null)?.id;
  } else {
    id = String(formData.get("projectId") ?? "");
    if (!idSchema.safeParse(id).success)
      return { message: "Something went wrong. Please refresh.", values };
    const res = await supabase
      .from("portfolio_projects")
      .update(row)
      .eq("id", id);
    error = res.error;
  }
  if (error) {
    if (error.code === "23505")
      return {
        message: "That web address is already used by another project.",
        fields: { slug: "Please choose a different web address." },
        values,
      };
    if (error.code === "42501")
      return { message: "You are not allowed to do that.", values };
    console.error("save project failed:", error.message);
    return { message: "Could not save the project. Please try again.", values };
  }
  refresh(id);
  if (mode === "create" && id) redirect(`/admin/portfolio/${id}`);
  return { ok: true, message: "Saved.", values };
}

export async function createProject(
  _prev: ProjectState,
  formData: FormData,
): Promise<ProjectState> {
  const r = await saveProject("create", formData);
  return r.values && !r.ok ? { ...r, nonce: crypto.randomUUID() } : r;
}

export async function updateProject(
  _prev: ProjectState,
  formData: FormData,
): Promise<ProjectState> {
  const r = await saveProject("update", formData);
  return r.values ? { ...r, nonce: crypto.randomUUID() } : r;
}

// Moves a project one place earlier or later in the public Portfolio. Every project is renumbered
// 1, 2, 3... in the order the visitors see (manual order first, then newest), then two are swapped.
export async function moveProject(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("projectId") ?? "");
  const dir = formData.get("dir") === "up" ? -1 : 1;
  if (!idSchema.safeParse(id).success) return;
  const { data } = await supabase
    .from("portfolio_projects")
    .select("id,sort_order")
    .order("sort_order")
    .order("created_at", { ascending: false })
    .limit(500);
  const order = (data ?? []) as { id: string; sort_order: number }[];
  const i = order.findIndex((p) => p.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  for (let k = 0; k < order.length; k++) {
    if (order[k].sort_order === k + 1) continue;
    const { error } = await supabase
      .from("portfolio_projects")
      .update({ sort_order: k + 1 })
      .eq("id", order[k].id);
    if (error) {
      console.error("move project failed:", error.message);
      break;
    }
  }
  refresh();
  revalidatePath("/", "layout");
}

// Quick on/off for "featured" from the project list.
export async function toggleFeatured(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("projectId") ?? "");
  if (!idSchema.safeParse(id).success) return;
  await supabase
    .from("portfolio_projects")
    .update({ is_featured: formData.get("on") === "1" })
    .eq("id", id);
  refresh(id);
  revalidatePath("/", "layout");
}

// Deletes the project and its photos (database rows first, then the files in Cloudinary).
export async function deleteProject(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("projectId") ?? "");
  if (!idSchema.safeParse(id).success) return;
  const { data: imgs } = await supabase
    .from("portfolio_images")
    .select("cloudinary_public_id")
    .eq("project_id", id)
    .limit(500);
  const { error } = await supabase
    .from("portfolio_projects")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("delete project failed:", error.message);
    redirect(`/admin/portfolio/${id}?error=delete`);
  }
  for (const i of imgs ?? [])
    await destroyImage(i.cloudinary_public_id as string);
  refresh();
  redirect("/admin/portfolio");
}

// ---------- Photos ----------

/** Gives the browser a signed permission slip to upload photos straight to Cloudinary. */
export async function getUploadSignature(): Promise<
  | { ok: true; sig: NonNullable<ReturnType<typeof createUploadSignature>> }
  | { ok: false; message: string }
> {
  await requireAdmin();
  const sig = createUploadSignature();
  if (!sig)
    return {
      ok: false,
      message:
        "Photo upload is not set up yet. Add the three Cloudinary values to .env.local and restart.",
    };
  return { ok: true, sig };
}

// Saves the photos the browser just uploaded. The first photo of a project becomes its cover.
export async function addImages(
  projectId: string,
  uploaded: unknown,
): Promise<ImageResult> {
  const { supabase } = await requireAdmin();
  const list = z.array(uploadedImageSchema).min(1).max(50).safeParse(uploaded);
  if (!idSchema.safeParse(projectId).success || !list.success)
    return { ok: false, message: "Those photos could not be saved." };

  const { data: existing, error: e1 } = await supabase
    .from("portfolio_images")
    .select("sort_order,is_cover")
    .eq("project_id", projectId)
    .limit(500);
  if (e1) return { ok: false, message: "Could not read the project's photos." };
  const rows = existing ?? [];
  const next =
    rows.reduce((m, r) => Math.max(m, r.sort_order as number), 0) + 1;
  const hasCover = rows.some((r) => r.is_cover === true);

  const insert = list.data.map((p, i) => ({
    project_id: projectId,
    cloudinary_public_id: p.publicId,
    width: p.width,
    height: p.height,
    sort_order: next + i,
    is_cover: !hasCover && i === 0,
  }));
  const { error } = await supabase.from("portfolio_images").insert(insert);
  if (error) {
    if (error.code === "23505")
      return { ok: false, message: "One of those photos is already saved." };
    console.error("add images failed:", error.message);
    return {
      ok: false,
      message: "Could not save the photos. Please try again.",
    };
  }
  refresh(projectId);
  return {
    ok: true,
    message: `${insert.length} ${insert.length === 1 ? "photo" : "photos"} added.`,
  };
}

export async function updateImageText(
  imageId: string,
  alt: string,
  caption: string,
): Promise<ImageResult> {
  const { supabase } = await requireAdmin();
  const t = imageTextSchema.safeParse({ alt, caption });
  if (!idSchema.safeParse(imageId).success)
    return { ok: false, message: "Something went wrong. Please refresh." };
  if (!t.success)
    return {
      ok: false,
      message: t.error.issues[0]?.message ?? "Please check the text.",
    };
  const { data, error } = await supabase
    .from("portfolio_images")
    .update({ alt_text: t.data.alt, caption: t.data.caption || null })
    .eq("id", imageId)
    .select("project_id")
    .single();
  if (error) return { ok: false, message: "Could not save the description." };
  refresh((data as { project_id: string }).project_id);
  return { ok: true, message: "Description saved." };
}

async function siblings(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  imageId: string,
) {
  const { data: img } = await supabase
    .from("portfolio_images")
    .select("id,project_id")
    .eq("id", imageId)
    .single();
  if (!img) return null;
  const projectId = (img as { project_id: string }).project_id;
  const { data } = await supabase
    .from("portfolio_images")
    .select("id,sort_order,is_cover,cloudinary_public_id")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("created_at")
    .limit(500);
  return {
    projectId,
    list: (data ?? []) as {
      id: string;
      sort_order: number;
      is_cover: boolean;
      cloudinary_public_id: string;
    }[],
  };
}

export async function moveImage(
  imageId: string,
  direction: "up" | "down",
): Promise<ImageResult> {
  const { supabase } = await requireAdmin();
  if (!idSchema.safeParse(imageId).success)
    return { ok: false, message: "Something went wrong. Please refresh." };
  const s = await siblings(supabase, imageId);
  if (!s) return { ok: false, message: "That photo no longer exists." };
  const i = s.list.findIndex((x) => x.id === imageId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= s.list.length) return { ok: true, message: "" };
  const order = [...s.list];
  [order[i], order[j]] = [order[j], order[i]];
  // Rewrite positions as 1, 2, 3... so equal numbers can never leave two photos stuck.
  for (let k = 0; k < order.length; k++) {
    if (order[k].sort_order === k + 1) continue;
    const { error } = await supabase
      .from("portfolio_images")
      .update({ sort_order: k + 1 })
      .eq("id", order[k].id);
    if (error) return { ok: false, message: "Could not change the order." };
  }
  refresh(s.projectId);
  return { ok: true, message: "" };
}

export async function makeCover(imageId: string): Promise<ImageResult> {
  const { supabase } = await requireAdmin();
  if (!idSchema.safeParse(imageId).success)
    return { ok: false, message: "Something went wrong. Please refresh." };
  const s = await siblings(supabase, imageId);
  if (!s) return { ok: false, message: "That photo no longer exists." };
  // Only one cover is allowed per project, so clear the old one first.
  const clear = await supabase
    .from("portfolio_images")
    .update({ is_cover: false })
    .eq("project_id", s.projectId);
  const set = clear.error
    ? clear
    : await supabase
        .from("portfolio_images")
        .update({ is_cover: true })
        .eq("id", imageId);
  if (set.error)
    return { ok: false, message: "Could not set the cover photo." };
  refresh(s.projectId);
  return { ok: true, message: "Cover photo updated." };
}

export async function removeImage(imageId: string): Promise<ImageResult> {
  const { supabase } = await requireAdmin();
  if (!idSchema.safeParse(imageId).success)
    return { ok: false, message: "Something went wrong. Please refresh." };
  const s = await siblings(supabase, imageId);
  if (!s) return { ok: false, message: "That photo no longer exists." };
  const gone = s.list.find((x) => x.id === imageId);
  const { error } = await supabase
    .from("portfolio_images")
    .delete()
    .eq("id", imageId);
  if (error) return { ok: false, message: "Could not remove the photo." };
  if (gone) await destroyImage(gone.cloudinary_public_id);
  // If the cover was removed, the first remaining photo becomes the cover.
  if (gone?.is_cover) {
    const first = s.list.find((x) => x.id !== imageId);
    if (first)
      await supabase
        .from("portfolio_images")
        .update({ is_cover: true })
        .eq("id", first.id);
  }
  refresh(s.projectId);
  return { ok: true, message: "Photo removed." };
}