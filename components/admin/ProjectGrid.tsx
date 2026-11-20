"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  moveProject,
  reorderProjects,
  toggleFeatured,
  togglePublished,
} from "@/app/(admin)/admin/portfolio/actions";
import Icon from "@/components/admin/Icon";
import { ThumbFallback } from "@/components/admin/ui";
import CloudImage from "@/components/portfolio/CloudImage";

export type GridProject = {
  id: string;
  title: string;
  category: string;
  photos: number;
  published: boolean;
  featured: boolean;
  cover: { publicId: string; width: number; height: number } | null;
};

// The photo grid. Drag a card to a new place (or use the arrow buttons) to change the order visitors see.
export default function ProjectGrid({
  projects,
  cloud,
}: {
  projects: GridProject[];
  cloud: string;
}) {
  const [order, setOrder] = useState(projects);
  const [seen, setSeen] = useState(projects);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  // New data from the server (after a button was used): show it.
  if (seen !== projects) {
    setSeen(projects);
    setOrder(projects);
  }

  function drop(targetId: string) {
    setOver(null);
    if (!drag || drag === targetId) return setDrag(null);
    const from = order.findIndex((p) => p.id === drag);
    const to = order.findIndex((p) => p.id === targetId);
    setDrag(null);
    if (from < 0 || to < 0) return;
    const before = order;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
    setNote(null);
    start(async () => {
      const r = await reorderProjects(next.map((p) => p.id));
      if (!r.ok) setOrder(before);
      setNote({ ok: r.ok, text: r.message });
    });
  }

  return (
    <div>
      <div className="mb-3 min-h-6 text-sm" aria-live="polite">
        {pending && <span className="text-neutral-500">Saving order…</span>}
        {!pending && note && (
          <span className={note.ok ? "text-green-800" : "text-red-700"} role={note.ok ? "status" : "alert"}>
            {note.text}
          </span>
        )}
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {order.map((p, idx) => (
          <li
            key={p.id}
            draggable
            onDragStart={(e) => {
              setDrag(p.id);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", p.id);
            }}
            onDragOver={(e) => {
              if (!drag) return;
              e.preventDefault();
              setOver(p.id);
            }}
            onDragLeave={() => setOver((o) => (o === p.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              drop(p.id);
            }}
            onDragEnd={() => {
              setDrag(null);
              setOver(null);
            }}
            data-project={p.id}
            className={`a-card group flex flex-col overflow-hidden transition-shadow hover:shadow-md ${
              drag === p.id ? "opacity-40" : ""
            } ${over === p.id && drag !== p.id ? "ring-2 ring-[var(--a-olive)]" : ""}`}
          >
            <Link
              href={`/admin/portfolio/${p.id}`}
              className="relative block aspect-[4/3] overflow-hidden bg-[var(--a-olive-soft)]"
              draggable={false}
            >
              {p.cover && cloud ? (
                <CloudImage
                  cloud={cloud}
                  publicId={p.cover.publicId}
                  width={p.cover.width}
                  height={p.cover.height}
                  alt={`Cover photo of ${p.title}`}
                  sizes="(min-width:1536px) 22vw, (min-width:1280px) 28vw, (min-width:640px) 45vw, 92vw"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <ThumbFallback className="h-full w-full" />
              )}
              <span className="absolute top-2 left-2 flex flex-wrap gap-1.5 text-[0.7rem] font-medium">
                <span
                  className={`rounded px-1.5 py-0.5 shadow-sm ${p.published ? "bg-white/95 text-green-900" : "bg-neutral-800/90 text-white"}`}
                >
                  {p.published ? "Published" : "Hidden"}
                </span>
                {p.featured && (
                  <span className="rounded bg-[var(--a-copper)] px-1.5 py-0.5 text-white shadow-sm">
                    Featured
                  </span>
                )}
              </span>
              <span className="absolute top-2 right-2 rounded bg-white/90 px-1.5 py-0.5 text-[0.7rem] text-neutral-700 tabular-nums shadow-sm">
                {idx + 1}
              </span>
            </Link>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div>
                <h3 className="a-serif text-xl leading-tight">{p.title}</h3>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {p.category || "No category"} · {p.photos}{" "}
                  {p.photos === 1 ? "photo" : "photos"}
                </p>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-1.5">
                <Link href={`/admin/portfolio/${p.id}`} className="a-btn !min-h-9 !px-3 !text-xs">
                  Edit
                </Link>
                <form action={toggleFeatured}>
                  <input type="hidden" name="projectId" value={p.id} />
                  <input type="hidden" name="on" value={p.featured ? "0" : "1"} />
                  <button
                    aria-pressed={p.featured}
                    className="a-btn !min-h-9 !px-3 !text-xs"
                    title={p.featured ? "Remove from featured" : "Mark as featured"}
                  >
                    <Icon name="star" size={14} />
                    {p.featured ? "Featured" : "Feature"}
                  </button>
                </form>
                <form action={togglePublished}>
                  <input type="hidden" name="projectId" value={p.id} />
                  <input type="hidden" name="on" value={p.published ? "0" : "1"} />
                  <button
                    className="a-btn !min-h-9 !px-3 !text-xs"
                    title={p.published ? "Hide from the website" : "Show on the website"}
                  >
                    <Icon name="eye" size={14} />
                    {p.published ? "Hide" : "Show"}
                  </button>
                </form>
                <span className="ml-auto flex gap-1">
                  {(["up", "down"] as const).map((dir) => (
                    <form key={dir} action={moveProject}>
                      <input type="hidden" name="projectId" value={p.id} />
                      <input type="hidden" name="dir" value={dir} />
                      <button
                        disabled={dir === "up" ? idx === 0 : idx === order.length - 1}
                        aria-label={`Move ${p.title} ${dir === "up" ? "earlier" : "later"}`}
                        className="a-btn !min-h-9 !min-w-9 !px-0 disabled:opacity-30"
                      >
                        {dir === "up" ? "←" : "→"}
                      </button>
                    </form>
                  ))}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}