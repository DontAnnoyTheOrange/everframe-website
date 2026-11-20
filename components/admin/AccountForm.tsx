"use client";

import { useActionState } from "react";
import { updateAccount, type AccountState } from "@/app/(admin)/admin/account/actions";

const box = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm";
const lab = "mb-1 block text-sm font-medium text-neutral-800";

export function AccountForm({
  user,
  defaultName,
}: {
  user: { email?: string | null | undefined };
  defaultName: string;
}) {
  const [state, action, pending] = useActionState<AccountState, FormData>(
    updateAccount,
    {},
  );
  const f = state.fields ?? {};

  return (
    <form
      action={action}
      noValidate
      className="max-w-xl a-card p-5 space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={lab}>Your name</label>
          <input
            name="displayName"
            defaultValue={defaultName}
            className={box}
          />
          {f.displayName && (
            <p className="mt-1 text-sm text-red-700">{f.displayName}</p>
          )}
        </div>
        <div>
          <label className={lab}>Email</label>
          <input
            name="email"
            type="email"
            defaultValue={user.email ?? ""}
            className={box}
          />
          {f.email && <p className="mt-1 text-sm text-red-700">{f.email}</p>}
        </div>
      </div>
      <div>
        <label className={lab}>Current password</label>
        <input
          name="currentPassword"
          type="password"
          className={box}
        />
        {f.currentPassword && (
          <p className="mt-1 text-sm text-red-700">{f.currentPassword}</p>
        )}
      </div>
      <div>
        <label className={lab}>New password (leave blank to keep current)</label>
        <input
          name="newPassword"
          type="password"
          className={box}
        />
        {f.newPassword && <p className="mt-1 text-sm text-red-700">{f.newPassword}</p>}
      </div>
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}
        >
          {state.message}
        </p>
      )}
      {!state.ok && (
        <p className="text-xs text-neutral-500">
          Changing email or password requires your current password to confirm
          it is really you.
        </p>
      )}
      <button
        disabled={pending}
        className="a-btn a-btn-primary"
        type="submit"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
