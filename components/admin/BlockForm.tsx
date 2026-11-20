"use client";

import { useActionState, useState } from "react";
import {
  createBlock,
  deleteBlock,
  type BlockState,
} from "@/app/(admin)/admin/schedule/actions";

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

// "Block dates": a day off or any period when you cannot shoot. Clients cannot pick blocked times.
export function BlockForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<BlockState, FormData>(
    createBlock,
    {},
  );
  const [allDay, setAllDay] = useState(true);
  const f = state.fields ?? {};
  return (
    <form
      action={action}
      noValidate
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-5"
    >
      <h2 className="font-semibold">Block dates</h2>
      <p className="text-sm text-neutral-600">
        Use this for a day off or a personal commitment. Clients will not be
        able to pick these times.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="b-start" className={lab}>
            From
          </label>
          <input
            id="b-start"
            name="startDate"
            type="date"
            min={today}
            className={box}
          />
          <Err text={f.startDate} />
        </div>
        <div>
          <label htmlFor="b-end" className={lab}>
            To (last day)
          </label>
          <input
            id="b-end"
            name="endDate"
            type="date"
            min={today}
            className={box}
          />
          <Err text={f.endDate} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="allDay"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
        />
        All day
      </label>
      {!allDay && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="b-from" className={lab}>
              Start time
            </label>
            <input id="b-from" name="startTime" type="time" className={box} />
            <Err text={f.startTime} />
          </div>
          <div>
            <label htmlFor="b-to" className={lab}>
              End time
            </label>
            <input id="b-to" name="endTime" type="time" className={box} />
            <Err text={f.endTime} />
          </div>
        </div>
      )}
      <div>
        <label htmlFor="b-reason" className={lab}>
          Reason (optional, only you see it)
        </label>
        <input id="b-reason" name="reason" maxLength={200} className={box} />
        <Err text={f.reason} />
      </div>
      <button
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Blocking…" : "Block these dates"}
      </button>
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`text-sm ${state.ok ? "text-green-800" : "text-red-700"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

export function DeleteBlockButton({ blockId }: { blockId: string }) {
  const [state, action, pending] = useActionState<BlockState, FormData>(
    deleteBlock,
    {},
  );
  const [asking, setAsking] = useState(false);
  // Removing a block frees those times for clients, so it asks first (two steps, no pop-up).
  if (!asking)
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
        >
          Remove block
        </button>
        {state.message && !state.ok && (
          <span role="alert" className="text-xs text-red-700">
            {state.message}
          </span>
        )}
      </div>
    );
  return (
    <form action={action} className="flex flex-col gap-2" role="alertdialog" aria-label="Confirm removing the block">
      <input type="hidden" name="blockId" value={blockId} />
      <p className="text-sm">
        Remove this block? Clients will be able to pick these times again.
      </p>
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="rounded-md bg-red-700 px-3 py-1.5 text-sm text-white disabled:opacity-60"
        >
          {pending ? "Removing…" : "Yes, remove it"}
        </button>
        <button
          type="button"
          onClick={() => setAsking(false)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          Keep it
        </button>
      </div>
    </form>
  );
}