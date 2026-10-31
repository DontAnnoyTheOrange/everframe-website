"use client";

import { deleteProject } from "@/app/(admin)/admin/portfolio/actions";

export default function DeleteProject({ projectId }: { projectId: string }) {
  return (
    <form
      action={deleteProject}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Delete this project and all of its photos? This cannot be undone.",
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <button className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50">
        Delete project
      </button>
    </form>
  );
}