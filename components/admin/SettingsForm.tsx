"use client";

import { useActionState } from "react";
import {
  addTestimonial,
  saveSettings,
  type SettingsState,
  type TestimonialState,
} from "@/app/(admin)/admin/settings/actions";
import { SOCIALS } from "@/lib/site/links";

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

export type SettingsValues = Record<string, string>;

// Contact details and numbers shown on the homepage and Contact page. Leave a box empty to hide it.
export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    saveSettings,
    {},
  );
  const v = state.values ?? initial;
  const f = state.fields ?? {};
  // Remount after each save so the boxes show what was saved (React 19 resets forms after an action).
  return (
    <form
      key={state.nonce ?? "initial"}
      action={action}
      noValidate
      className="flex flex-col gap-5 rounded-lg border border-neutral-200 bg-white p-5"
    >
      <h2 className="font-semibold">Contact details</h2>
      <div>
        <label htmlFor="s-messenger" className={lab}>
          Messenger link
        </label>
        <input
          id="s-messenger"
          name="messenger"
          defaultValue={v.messenger}
          placeholder="https://m.me/yourname"
          className={box}
        />
        <p className={hint}>
          The main &quot;Message us&quot; button. Paste your Messenger or
          Facebook profile link.
        </p>
        <Err text={f.messenger} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="s-email" className={lab}>
            Email
          </label>
          <input
            id="s-email"
            name="email"
            type="email"
            defaultValue={v.email}
            className={box}
          />
          <Err text={f.email} />
        </div>
        <div>
          <label htmlFor="s-phone" className={lab}>
            Mobile number
          </label>
          <input
            id="s-phone"
            name="phone"
            type="tel"
            defaultValue={v.phone}
            placeholder="0917 123 4567"
            className={box}
          />
          <Err text={f.phone} />
        </div>
      </div>

      <h2 className="mt-2 font-semibold">Social pages</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {SOCIALS.map((p) => (
          <div key={p.key}>
            <label htmlFor={`s-${p.key}`} className={lab}>
              {p.label}
            </label>
            <input
              id={`s-${p.key}`}
              name={p.key}
              defaultValue={v[p.key]}
              placeholder={`https://${p.hosts[0]}/...`}
              className={box}
            />
            <Err text={f[p.key]} />
          </div>
        ))}
      </div>

      <h2 className="mt-2 font-semibold">About the studio</h2>
      <div>
        <label htmlFor="s-about" className={lab}>
          Short introduction
        </label>
        <textarea
          id="s-about"
          name="aboutText"
          rows={4}
          defaultValue={v.aboutText}
          className={box}
        />
        <p className={hint}>Shown on the homepage. Up to 1200 characters.</p>
        <Err text={f.aboutText} />
      </div>
      <div>
        <label htmlFor="s-area" className={lab}>
          Areas you cover
        </label>
        <input
          id="s-area"
          name="serviceArea"
          defaultValue={v.serviceArea}
          placeholder="Cavite, Metro Manila, Laguna and nearby provinces"
          className={box}
        />
        <Err text={f.serviceArea} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="s-events" className={lab}>
            Events shot
          </label>
          <input
            id="s-events"
            name="eventsShot"
            inputMode="numeric"
            defaultValue={v.eventsShot}
            className={box}
          />
          <p className={hint}>
            Only enter a number that is true. Empty hides it.
          </p>
          <Err text={f.eventsShot} />
        </div>
        <div>
          <label htmlFor="s-years" className={lab}>
            Years of experience
          </label>
          <input
            id="s-years"
            name="yearsExperience"
            inputMode="numeric"
            defaultValue={v.yearsExperience}
            className={box}
          />
          <Err text={f.yearsExperience} />
        </div>
      </div>

      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}
        >
          {state.message}
        </p>
      )}
      <button
        disabled={pending}
        className="self-start rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}

export function TestimonialForm() {
  const [state, action, pending] = useActionState<TestimonialState, FormData>(
    addTestimonial,
    {},
  );
  const f = state.fields ?? {};
  return (
    <form
      key={state.nonce ?? "initial"}
      action={action}
      noValidate
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-5"
    >
      <h2 className="font-semibold">Add a client review</h2>
      <p className="text-sm text-neutral-600">
        Only add words a real client said or wrote, with their permission.
      </p>
      <div>
        <label htmlFor="t-quote" className={lab}>
          What they said
        </label>
        <textarea id="t-quote" name="quote" rows={3} className={box} />
        <Err text={f.quote} />
      </div>
      <div>
        <label htmlFor="t-author" className={lab}>
          Who said it
        </label>
        <input
          id="t-author"
          name="author"
          placeholder="Maria and Paolo, wedding"
          className={box}
        />
        <Err text={f.author} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" defaultChecked />
        Show on the website
      </label>
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}
        >
          {state.message}
        </p>
      )}
      <button
        disabled={pending}
        className="self-start rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Adding..." : "Add review"}
      </button>
    </form>
  );
}