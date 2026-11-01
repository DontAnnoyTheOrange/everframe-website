"use client";

import { useActionState } from "react";
import {
  updateBooking,
  type EditState,
} from "@/app/(admin)/admin/bookings/[id]/edit/actions";

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

export type EditDefaults = {
  bookingId: string;
  name: string;
  email: string;
  phone: string;
  messenger: string;
  venue: string;
  date: string;
  time: string;
  hours: string;
  total: string;
  closed: boolean;
  pinned: boolean;
};

// Change a booking's contact details, venue, date, time, hours or agreed price.
export default function EditBookingForm({
  initial,
}: {
  initial: EditDefaults;
}) {
  const [state, action, pending] = useActionState<EditState, FormData>(
    updateBooking,
    {},
  );
  const v = state.values ?? {
    name: initial.name,
    email: initial.email,
    phone: initial.phone,
    messenger: initial.messenger,
    venue: initial.venue,
    date: initial.date,
    time: initial.time,
    hours: initial.hours,
    totalOverride: "",
  };
  const f = state.fields ?? {};
  return (
    <form
      key={state.nonce ?? "initial"}
      action={action}
      noValidate
      className="flex max-w-3xl flex-col gap-6"
    >
      <input type="hidden" name="bookingId" value={initial.bookingId} />
      {state.message && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">
          {state.message}
        </p>
      )}
      {f.contact && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">
          {f.contact}
        </p>
      )}

      <fieldset
        disabled={initial.closed}
        className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5 sm:grid-cols-3"
      >
        <legend className="px-1 text-sm font-semibold">Date and time</legend>
        <div>
          <label htmlFor="e-date" className={lab}>
            Event date
          </label>
          <input
            id="e-date"
            name="date"
            type="date"
            defaultValue={v.date}
            className={box}
          />
          <Err text={f.date} />
        </div>
        <div>
          <label htmlFor="e-time" className={lab}>
            Start time (Manila)
          </label>
          <input
            id="e-time"
            name="time"
            type="time"
            step={900}
            defaultValue={v.time}
            className={box}
          />
          <Err text={f.time} />
        </div>
        <div>
          <label htmlFor="e-hours" className={lab}>
            Hours
          </label>
          <input
            id="e-hours"
            name="hours"
            inputMode="numeric"
            defaultValue={v.hours}
            className={box}
          />
          <Err text={f.hours} />
        </div>
        <p className="text-xs text-neutral-500 sm:col-span-3">
          {initial.closed
            ? "This booking is closed, so its date and time cannot be changed."
            : "For a confirmed booking the new time must be free. Changing the hours does not change the price by itself: enter an agreed total below if it should change."}
        </p>
      </fieldset>

      <fieldset className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold">Client</legend>
        <div className="sm:col-span-2">
          <label htmlFor="e-name" className={lab}>
            Full name
          </label>
          <input
            id="e-name"
            name="name"
            maxLength={120}
            defaultValue={v.name}
            className={box}
          />
          <Err text={f.name} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="e-messenger" className={lab}>
            Messenger link
          </label>
          <input
            id="e-messenger"
            name="messenger"
            inputMode="url"
            placeholder="https://m.me/username"
            defaultValue={v.messenger}
            className={box}
          />
          <Err text={f.messenger} />
        </div>
        <div>
          <label htmlFor="e-phone" className={lab}>
            Mobile number
          </label>
          <input
            id="e-phone"
            name="phone"
            type="tel"
            defaultValue={v.phone}
            className={box}
          />
          <Err text={f.phone} />
        </div>
        <div>
          <label htmlFor="e-email" className={lab}>
            Email
          </label>
          <input
            id="e-email"
            name="email"
            type="email"
            defaultValue={v.email}
            className={box}
          />
          <Err text={f.email} />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold">Venue and price</legend>
        <div className="sm:col-span-2">
          <label htmlFor="e-venue" className={lab}>
            Venue
          </label>
          <input
            id="e-venue"
            name="venue"
            maxLength={200}
            defaultValue={v.venue}
            className={box}
          />
          {initial.pinned && (
            <p className="mt-1 text-xs text-amber-800">
              This venue is pinned on the map. If you change the text, the pin
              is removed so the map never points to the old place.
            </p>
          )}
          <Err text={f.venue} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="e-total" className={lab}>
            Agreed total in ₱ (leave empty to keep{" "}
            {initial.total || "the current price"})
          </label>
          <input
            id="e-total"
            name="totalOverride"
            inputMode="decimal"
            defaultValue={v.totalOverride}
            className={box}
          />
          <Err text={f.totalOverride} />
        </div>
      </fieldset>

      <div>
        <button
          disabled={pending}
          className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}