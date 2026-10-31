"use client";

import { useActionState, useState } from "react";
import {
  createManualBooking,
  type ManualState,
} from "@/app/(admin)/admin/bookings/new/actions";
import { SERVICE_LABEL, formatPeso } from "@/lib/format";
import type { AddonRow, CategoryRow, PackageRow } from "@/lib/types/db";

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

// Adds a booking for a client who booked by Messenger or phone. Saved as confirmed.
export default function ManualBookingForm({
  categories,
  packages,
  addons,
}: {
  categories: CategoryRow[];
  packages: PackageRow[];
  addons: AddonRow[];
}) {
  const [state, action, pending] = useActionState<ManualState, FormData>(
    createManualBooking,
    {},
  );
  const v = state.values ?? {};
  const f = state.fields ?? {};
  const [catId, setCatId] = useState<string | null>(null);
  const shownCat = catId ?? (v.categoryId || categories[0]?.id || "");
  const isOther = categories.find((c) => c.id === shownCat)?.is_other === true;
  const picked = new Set((v.addonIds ?? "").split(",").filter(Boolean));

  return (
    <form
      key={state.nonce ?? "new"}
      action={action}
      noValidate
      className="flex max-w-3xl flex-col gap-6"
    >
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          tabIndex={-1}
          className={`rounded p-3 text-sm ${state.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
        >
          {state.message}
        </p>
      )}
      {f.contact && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">
          {f.contact}
        </p>
      )}

      <fieldset className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold">Event</legend>
        <div>
          <label htmlFor="m-category" className={lab}>
            Event type
          </label>
          <select
            id="m-category"
            name="categoryId"
            defaultValue={shownCat}
            onChange={(e) => setCatId(e.target.value)}
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
        {isOther && (
          <div>
            <label htmlFor="m-other" className={lab}>
              Describe the event type
            </label>
            <input
              id="m-other"
              name="eventTypeOther"
              maxLength={80}
              defaultValue={v.eventTypeOther ?? ""}
              className={box}
            />
            <Err text={f.eventTypeOther} />
          </div>
        )}
        <div>
          <label htmlFor="m-package" className={lab}>
            Package
          </label>
          <select
            id="m-package"
            name="packageId"
            defaultValue={v.packageId ?? packages[0]?.id}
            className={box}
          >
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {SERVICE_LABEL[p.service_type]} · {p.name} (
                {formatPeso(p.price)},{" "}
                {p.max_hours === null
                  ? "whole event"
                  : `up to ${p.max_hours} hours`}
                )
              </option>
            ))}
          </select>
          <Err text={f.packageId} />
        </div>
        <div>
          <label htmlFor="m-hours" className={lab}>
            Hours of coverage
          </label>
          <input
            id="m-hours"
            name="hours"
            type="number"
            min={1}
            max={24}
            step={1}
            defaultValue={v.hours ?? "4"}
            className={box}
          />
          <Err text={f.hours} />
        </div>
        <div>
          <label htmlFor="m-date" className={lab}>
            Event date
          </label>
          <input
            id="m-date"
            name="date"
            type="date"
            defaultValue={v.date ?? ""}
            className={box}
          />
          <Err text={f.date} />
        </div>
        <div>
          <label htmlFor="m-time" className={lab}>
            Start time (Manila)
          </label>
          <input
            id="m-time"
            name="time"
            type="time"
            step={900}
            defaultValue={v.time ?? ""}
            className={box}
          />
          <Err text={f.time} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="m-venue" className={lab}>
            Venue (optional)
          </label>
          <input
            id="m-venue"
            name="venue"
            maxLength={200}
            defaultValue={v.venue ?? ""}
            className={box}
          />
          <Err text={f.venue} />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-sm text-neutral-700">Add-ons</span>
          {addons.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="addonIds"
                value={a.id}
                defaultChecked={picked.has(a.id)}
              />
              {a.name} ({formatPeso(a.price)}
              {a.per_hour ? " per hour" : ""})
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="outsideBase"
              defaultChecked={v.outsideBase === "on"}
            />
            Outside Dasmariñas (adds the transport fee)
          </label>
        </div>
      </fieldset>

      <fieldset className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold">Client</legend>
        <div className="sm:col-span-2">
          <label htmlFor="m-name" className={lab}>
            Full name
          </label>
          <input
            id="m-name"
            name="name"
            maxLength={120}
            defaultValue={v.name ?? ""}
            className={box}
          />
          <Err text={f.name} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="m-messenger" className={lab}>
            Messenger link
          </label>
          <input
            id="m-messenger"
            name="messenger"
            inputMode="url"
            placeholder="https://m.me/username"
            defaultValue={v.messenger ?? ""}
            className={box}
          />
          <Err text={f.messenger} />
        </div>
        <div>
          <label htmlFor="m-phone" className={lab}>
            Mobile number
          </label>
          <input
            id="m-phone"
            name="phone"
            type="tel"
            defaultValue={v.phone ?? ""}
            className={box}
          />
          <Err text={f.phone} />
        </div>
        <div>
          <label htmlFor="m-email" className={lab}>
            Email
          </label>
          <input
            id="m-email"
            name="email"
            type="email"
            defaultValue={v.email ?? ""}
            className={box}
          />
          <Err text={f.email} />
        </div>
        <p className="text-xs text-neutral-500 sm:col-span-2">
          Add at least one: Messenger link, mobile number or email.
        </p>
      </fieldset>

      <fieldset className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold">Booking</legend>
        <div>
          <label htmlFor="m-source" className={lab}>
            Booked through
          </label>
          <select
            id="m-source"
            name="source"
            defaultValue={v.source ?? "messenger"}
            className={box}
          >
            <option value="messenger">Messenger</option>
            <option value="phone">Phone</option>
            <option value="other">Other</option>
          </select>
          <Err text={f.source} />
        </div>
        <div>
          <label htmlFor="m-total" className={lab}>
            Agreed total in ₱ (optional)
          </label>
          <input
            id="m-total"
            name="totalOverride"
            inputMode="decimal"
            placeholder="Leave empty to use the package price"
            defaultValue={v.totalOverride ?? ""}
            className={box}
          />
          <Err text={f.totalOverride} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="m-notes" className={lab}>
            Internal notes (only you see these)
          </label>
          <textarea
            id="m-notes"
            name="notes"
            rows={3}
            maxLength={2000}
            defaultValue={v.notes ?? ""}
            className={box}
          />
          <Err text={f.notes} />
        </div>
      </fieldset>

      <div>
        <button
          disabled={pending}
          className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save as confirmed booking"}
        </button>
        <p className="mt-2 text-xs text-neutral-500">
          The time must be free (the buffer between events is included). The
          price comes from the package unless you enter an agreed total.
        </p>
      </div>
    </form>
  );
}