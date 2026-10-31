"use client";

import { useActionState } from "react";
import {
  createProject,
  updateProject,
  type ProjectState,
} from "@/app/(admin)/admin/portfolio/actions";

const box =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm";
const lab = "mb-1 block text-sm text-neutral-700";

function Err({ text }: { text?: string }) {
  return text ? (
    <p role="alert" className="mt-1 text-sm text-red-700">
      {text}
    </p>
  ) : null;
}

export type ProjectDefaults = {
  id?: string;
  title: string;
  slug: string;
  categoryId: string;
  description: string;
  shootDate: string;
  isPublished: boolean;
};

// Title, category, description and whether the project is visible on the public site.
export default function ProjectForm({
  categories,
  initial,
}: {
  categories: { id: string; name: string }[];
  initial: ProjectDefaults;
}) {
  const editing = Boolean(initial.id);
  const [state, action, pending] = useActionState<ProjectState, FormData>(
    editing ? updateProject : createProject,
    {},
  );
  const v = state.values ?? {
    title: initial.title,
    slug: initial.slug,
    categoryId: initial.categoryId,
    description: initial.description,
    shootDate: initial.shootDate,
    isPublished: initial.isPublished ? "on" : "",
  };
  const f = state.fields ?? {};
  return (
    <form
      key={state.nonce ?? "initial"}
      action={action}
      noValidate
      className="flex max-w-2xl flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-5"
    >
      {initial.id && (
        <input type="hidden" name="projectId" value={initial.id} />
      )}
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`rounded p-3 text-sm ${state.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
        >
          {state.message}
        </p>
      )}
      <div>
        <label htmlFor="p-title" className={lab}>
          Title
        </label>
        <input
          id="p-title"
          name="title"
          maxLength={160}
          defaultValue={v.title}
          className={box}
        />
        <Err text={f.title} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="p-category" className={lab}>
            Category
          </label>
          <select
            id="p-category"
            name="categoryId"
            defaultValue={v.categoryId || categories[0]?.id}
            className={box}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Err text={f.categoryId} />
        </div>
        <div>
          <label htmlFor="p-date" className={lab}>
            Shoot date (optional)
          </label>
          <input
            id="p-date"
            name="shootDate"
            type="date"
            defaultValue={v.shootDate}
            className={box}
          />
          <Err text={f.shootDate} />
        </div>
      </div>
      <div>
        <label htmlFor="p-slug" className={lab}>
          Web address (optional)
        </label>
        <input
          id="p-slug"
          name="slug"
          maxLength={80}
          placeholder="Leave empty to make it from the title"
          defaultValue={v.slug}
          className={box}
        />
        <p className="mt-1 text-xs text-neutral-500">
          The page will be at /portfolio/<em>this-address</em>.
        </p>
        <Err text={f.slug} />
      </div>
      <div>
        <label htmlFor="p-desc" className={lab}>
          Description (optional)
        </label>
        <textarea
          id="p-desc"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={v.description}
          className={box}
        />
        <Err text={f.description} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isPublished"
          defaultChecked={v.isPublished === "on"}
        />
        Show this project on the public Portfolio page
      </label>
      <div>
        <button
          disabled={pending}
          className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : editing ? "Save changes" : "Create project"}
        </button>
        {!editing && (
          <p className="mt-2 text-xs text-neutral-500">
            After creating the project you can upload its photos.
          </p>
        )}
      </div>
    </form>
  );
}