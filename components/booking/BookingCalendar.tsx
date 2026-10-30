"use client";

import { useState } from "react";
import {
  MONTH_NAMES,
  addDays,
  addMonths,
  busyOnDay,
  dayIsFull,
  monthGrid,
  type Busy,
} from "@/lib/booking/manila";

const MONTHS_SHOWN = 12;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  todayKey: string; // today in Manila, "YYYY-MM-DD"
  maxDaysAhead: number;
  busy: Busy[];
  value: string;
  onChange: (key: string) => void;
  invalid?: boolean;
};

// A month calendar. Days that are today or earlier, too far ahead, or completely booked cannot be picked.
// Days that are partly booked can be picked: the form then shows which hours are taken.
export default function BookingCalendar({
  todayKey,
  maxDaysAhead,
  busy,
  value,
  onChange,
  invalid,
}: Props) {
  const startYear = Number(todayKey.slice(0, 4));
  const startMonth = Number(todayKey.slice(5, 7));
  const [offset, setOffset] = useState(0);
  const { year, month } = addMonths(startYear, startMonth, offset);
  const lastKey = addDays(todayKey, maxDaysAhead);
  const weeks = monthGrid(year, month);

  return (
    <div
      className={`border-line rounded-md border p-4 ${invalid ? "border-[#E8806A]" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={offset === 0}
          onClick={() => setOffset((o) => o - 1)}
          className="text-bone disabled:text-mute px-3 py-1"
        >
          ‹
        </button>
        <span className="text-bone font-serif text-lg" aria-live="polite">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          type="button"
          aria-label="Next month"
          disabled={offset >= MONTHS_SHOWN - 1}
          onClick={() => setOffset((o) => o + 1)}
          className="text-bone disabled:text-mute px-3 py-1"
        >
          ›
        </button>
      </div>

      <div className="text-mute grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="mt-1 flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((cell, ci) => {
              if (!cell) return <span key={ci} />;
              const outOfRange = cell.key <= todayKey || cell.key > lastKey;
              const full = !outOfRange && dayIsFull(cell.key, busy);
              const partly =
                !outOfRange && !full && busyOnDay(cell.key, busy).length > 0;
              const selected = cell.key === value;
              const disabled = outOfRange || full;
              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={`${MONTH_NAMES[month - 1]} ${cell.day}, ${year}${
                    full ? ", fully booked" : partly ? ", partly booked" : ""
                  }`}
                  onClick={() => onChange(cell.key)}
                  className={`focus-visible:outline-brass relative h-11 rounded-md text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    selected
                      ? "bg-brass text-brass-ink"
                      : disabled
                        ? "text-mute/50 cursor-not-allowed"
                        : "text-bone hover:bg-ink-2"
                  } ${full ? "line-through" : ""}`}
                >
                  {cell.day}
                  {partly && !selected && (
                    <span
                      aria-hidden="true"
                      className="bg-brass absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="text-mute mt-3 text-xs">
        <span
          aria-hidden="true"
          className="bg-brass mr-1 inline-block h-1.5 w-1.5 rounded-full"
        />
        Partly booked: some hours are taken. Crossed-out days are fully booked.
      </p>
    </div>
  );
}