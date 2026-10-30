"use client";

import { useActionState } from "react";
import {
  saveNotes,
  setBookingStatus,
  type ActionState,
} from "@/app/(admin)/admin/bookings/actions";
import { ACTION_LABEL, TRANSITIONS, isStatus } from "@/lib/booking/status";

const box =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm";

function Message({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`text-sm ${state.ok ? "text-green-800" : "text-red-700"}`}
    >
      {state.message}
    </p>
  );
}

// The status buttons. Only moves the database allows from the current status are shown.
export function StatusActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    setBookingStatus,
    {},
  );
  const next = isStatus(status) ? TRANSITIONS[status] : [];
  if (next.length === 0) {
    // Keep showing the result message (for example "Status updated.") after the last allowed change.
    return (
      <div className="flex flex-col gap-2">
        <Message state={state} />
        <p className="text-sm text-neutral-600">
          This booking is closed, so no further changes are possible.
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label className="text-sm text-neutral-700" htmlFor="status-note">
        Note (optional, saved in the history)
      </label>
      <input id="status-note" name="note" maxLength={500} className={box} />
      <div className="flex flex-wrap gap-2">
        {next.map((s) => (
          <button
            key={s}
            name="status"
            value={s}
            disabled={pending}
            className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60 ${
              s === "confirmed"
                ? "bg-green-700 text-white"
                : s === "completed"
                  ? "bg-blue-700 text-white"
                  : "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100"
            }`}
          >
            {ACTION_LABEL[s]}
          </button>
        ))}
      </div>
      <Message state={state} />
    </form>
  );
}

export function NotesForm({
  bookingId,
  notes,
}: {
  bookingId: string;
  notes: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveNotes,
    {},
  );
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label className="text-sm text-neutral-700" htmlFor="notes">
        Private notes (the client never sees these)
      </label>
      <textarea
        id="notes"
        name="notes"
        rows={4}
        maxLength={4000}
        defaultValue={notes}
        className={box}
      />
      <div>
        <button
          disabled={pending}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-100 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save notes"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}