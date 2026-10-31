import "server-only";
import { createPublicClient } from "@/lib/supabase/public";

export type PortfolioImage = {
  id: string;
  project_id: string;
  cloudinary_public_id: string;
  width: number;
  height: number;
  alt_text: string;
  caption: string | null;
  sort_order: number;
  is_cover: boolean;
};

export type PortfolioProject = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  shoot_date: string | null;
  category_id: string;
  category_name: string;
  category_slug: string;
};

export type PortfolioCard = PortfolioProject & {
  cover: PortfolioImage | null;
  imageCount: number;
};

const IMAGE_COLS =
  "id,project_id,cloudinary_public_id,width,height,alt_text,caption,sort_order,is_cover";
const PROJECT_COLS =
  "id,slug,title,description,shoot_date,category_id,sort_order,created_at";

async function categories() {
  const db = createPublicClient();
  if (!db) return null;
  const { data, error } = await db
    .from("event_categories")
    .select("id,slug,name,sort_order,is_other")
    .eq("is_published", true)
    .order("sort_order");
  if (error) {
    console.error("portfolio categories failed:", error.message);
    return null;
  }
  return data as {
    id: string;
    slug: string;
    name: string;
    sort_order: number;
    is_other: boolean;
  }[];
}

/** Published projects with their cover photo, for the portfolio page. Null if the database is unreachable. */
export async function getPortfolio(): Promise<{
  cards: PortfolioCard[];
  categories: { slug: string; name: string }[];
} | null> {
  const db = createPublicClient();
  const cats = await categories();
  if (!db || !cats) return null;

  const { data: projects, error } = await db
    .from("portfolio_projects")
    .select(PROJECT_COLS)
    .eq("is_published", true)
    .order("sort_order")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("portfolio projects failed:", error.message);
    return null;
  }
  const list = projects ?? [];
  const ids = list.map((p) => p.id as string);
  const images = new Map<string, PortfolioImage[]>();
  if (ids.length > 0) {
    const { data: imgs, error: e2 } = await db
      .from("portfolio_images")
      .select(IMAGE_COLS)
      .in("project_id", ids)
      .order("sort_order")
      .limit(3000);
    if (e2) {
      console.error("portfolio images failed:", e2.message);
      return null;
    }
    for (const i of (imgs ?? []) as PortfolioImage[])
      images.set(i.project_id, [...(images.get(i.project_id) ?? []), i]);
  }
  const catById = new Map(cats.map((c) => [c.id, c]));
  const cards: PortfolioCard[] = [];
  for (const p of list) {
    const cat = catById.get(p.category_id as string);
    if (!cat) continue;
    const imgs = images.get(p.id as string) ?? [];
    cards.push({
      id: p.id as string,
      slug: p.slug as string,
      title: p.title as string,
      description: (p.description as string | null) ?? null,
      shoot_date: (p.shoot_date as string | null) ?? null,
      category_id: cat.id,
      category_name: cat.name,
      category_slug: cat.slug,
      cover: imgs.find((i) => i.is_cover) ?? imgs[0] ?? null,
      imageCount: imgs.length,
    });
  }
  return {
    cards,
    categories: cats
      .filter((c) => !c.is_other)
      .map((c) => ({ slug: c.slug, name: c.name })),
  };
}

/** One published project with all its photos in order. Returns "missing" for an unknown or unpublished slug. */
export async function getProject(
  slug: string,
): Promise<
  { project: PortfolioProject; images: PortfolioImage[] } | "missing" | null
> {
  const db = createPublicClient();
  const cats = await categories();
  if (!db || !cats) return null;
  const { data, error } = await db
    .from("portfolio_projects")
    .select(PROJECT_COLS)
    .eq("slug", slug)
    .eq("is_published", true)
    .limit(1);
  if (error) {
    console.error("portfolio project failed:", error.message);
    return null;
  }
  const p = data?.[0];
  if (!p) return "missing";
  const cat = cats.find((c) => c.id === p.category_id);
  const { data: imgs, error: e2 } = await db
    .from("portfolio_images")
    .select(IMAGE_COLS)
    .eq("project_id", p.id as string)
    .order("sort_order")
    .limit(500);
  if (e2) {
    console.error("portfolio images failed:", e2.message);
    return null;
  }
  return {
    project: {
      id: p.id as string,
      slug: p.slug as string,
      title: p.title as string,
      description: (p.description as string | null) ?? null,
      shoot_date: (p.shoot_date as string | null) ?? null,
      category_id: (p.category_id as string) ?? "",
      category_name: cat?.name ?? "",
      category_slug: cat?.slug ?? "",
    },
    images: (imgs ?? []) as PortfolioImage[],
  };
}