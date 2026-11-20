"use client";

import { useActionState, useState } from "react";
import {
  changeEmail,
  changePassword,
  saveName,
  type AccountState,
} from "@/app/(admin)/admin/account/actions";
import { MIN_PASSWORD } from "@/lib/admin/account";

const box =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm";
const lab = "mb-1 block text-sm font-medium text-neutral-800";
const hint = "mt-1 text-xs text-neutral-500";

function Err({ text }: { text?: string }) {
  return text ? (
    <p role="alert" className="mt-1 text-sm text-red-700">
      {text}
    </p>
  ) : null;
}

function Result({ state }: { state: AccountState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}
    >
      {state.message}
    </p>
  );
}

export function NameForm({ initial }: { initial: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(
    saveName,
    {},
  );
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <div>
        <label htmlFor="acc-name" className={lab}>
          Display name
        </label>
        <input
          id="acc-name"
          name="name"
          defaultValue={initial}
          autoComplete="name"
          maxLength={60}
          className={box}
        />
        <p className={hint}>
          Shown in the sidebar and in the greeting on the Overview.
        </p>
        <Err text={state.fields?.name} />
      </div>
      <Result state={state} />
      <button disabled={pending} className="a-btn a-btn-primary self-start">
        {pending ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}

export function EmailForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(
    changeEmail,
    {},
  );
  return (
    <form
      key={state.nonce ?? "initial"}
      action={action}
      noValidate
      className="flex flex-col gap-3"
    >
      <p className="text-sm text-neutral-500">
        You sign in with{" "}
        <span className="font-medium text-neutral-800">{current}</span>.
      </p>
      <div>
        <label htmlFor="acc-email" className={lab}>
          New sign-in email
        </label>
        <input
          id="acc-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          className={box}
        />
        <p className={hint}>
          We email a confirmation link. Your sign-in email changes only after
          you open it.
        </p>
        <Err text={state.fields?.email} />
      </div>
      <Result state={state} />
      <button disabled={pending} className="a-btn a-btn-primary self-start">
        {pending ? "Sending…" : "Change email"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(
    changePassword,
    {},
  );
  const [show, setShow] = useState(false);
  const type = show ? "text" : "password";
  const f = state.fields ?? {};
  return (
    <form
      key={state.nonce ?? "initial"}
      action={action}
      noValidate
      className="flex flex-col gap-3"
    >
      <div>
        <label htmlFor="acc-cur" className={lab}>
          Current password
        </label>
        <input
          id="acc-cur"
          name="current"
          type={type}
          autoComplete="current-password"
          className={box}
        />
        <Err text={f.current} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="acc-new" className={lab}>
            New password
          </label>
          <input
            id="acc-new"
            name="next"
            type={type}
            autoComplete="new-password"
            className={box}
          />
          <p className={hint}>At least {MIN_PASSWORD} characters.</p>
          <Err text={f.next} />
        </div>
        <div>
          <label htmlFor="acc-conf" className={lab}>
            Repeat new password
          </label>
          <input
            id="acc-conf"
            name="confirm"
            type={type}
            autoComplete="new-password"
            className={box}
          />
          <Err text={f.confirm} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => setShow(e.target.checked)}
        />{" "}
        Show passwords
      </label>
      <Result state={state} />
      <button disabled={pending} className="a-btn a-btn-primary self-start">
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}