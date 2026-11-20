"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchPlaces, type FoundPlace } from "@/lib/maps/geoapify";
import {
  EMPTY_VENUE,
  VENUE_MAX,
  VENUE_MIN,
  type VenueValue,
} from "@/lib/booking/venue";

type Props = {
  id: string;
  value: VenueValue;
  onChange: (v: VenueValue) => void;
  mapsKey: string | null; // null = map search is not set up; the client types the address
  invalid?: boolean;
  describedBy?: string;
};

type Mode = "on" | "off";

const field =
  "border-line bg-ink-2 text-bone placeholder:text-mute w-full rounded-md border px-3 py-2.5";

// Venue box with map search (Geoapify). Choosing a suggestion saves its exact coordinates.
// Without a key (or if the search fails) it is a plain address box, so a booking is never blocked.
export default function VenueInput({
  id,
  value,
  onChange,
  mapsKey,
  invalid,
  describedBy,
}: Props) {
  const listId = useId();
  const [mode, setMode] = useState<Mode>(mapsKey ? "on" : "off");
  const [items, setItems] = useState<FoundPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [note, setNote] = useState("");
  const timerRef = useRef<number | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  async function search(q: string) {
    abortRef.current?.abort();
    if (!mapsKey || q.trim().length < 3) {
      setItems([]);
      setOpen(false);
      setNote("");
      return;
    }
    const ctl = new AbortController();
    abortRef.current = ctl;
    try {
      const found = await searchPlaces(mapsKey, q.trim(), ctl.signal);
      if (ctl.signal.aborted) return; // a newer search replaced this one
      setItems(found);
      setActive(-1);
      setOpen(true);
      setNote(found.length === 0 ? "No matching places found." : "");
    } catch {
      if (ctl.signal.aborted) return;
      setMode("off"); // key wrong, limit reached or offline: keep typing working
      setItems([]);
      setOpen(false);
    }
  }

  function onType(text: string) {
    // Typing after choosing a place clears the pin: the text no longer matches it.
    onChange({
      ...EMPTY_VENUE,
      text,
      source: mode === "off" && text.trim() ? "typed" : null,
    });
    window.clearTimeout(timerRef.current);
    if (mode === "on")
      timerRef.current = window.setTimeout(() => void search(text), 300);
  }

  function choose(place: FoundPlace) {
    setOpen(false);
    setItems([]);
    setNote("");
    onChange({
      text: place.text,
      source: "map",
      placeId: place.placeId,
      lat: place.lat,
      lng: place.lng,
    });
  }

  function keepTyped() {
    if (value.text.trim().length < VENUE_MIN) {
      setNote(
        `Please type the venue first (at least ${VENUE_MIN} characters).`,
      );
      return;
    }
    onChange({
      ...value,
      text: value.text.trim(),
      source: "typed",
      placeId: null,
      lat: null,
      lng: null,
    });
    setOpen(false);
    setNote("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && open && active >= 0 && items[active]) {
      e.preventDefault(); // choose the suggestion instead of submitting the form
      choose(items[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && mode === "on" && (items.length > 0 || note !== "");

  return (
    <div
      className="relative"
      onBlur={() => window.setTimeout(() => setOpen(false), 120)}
    >
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        required
        maxLength={VENUE_MAX}
        value={value.text}
        onChange={(e) => onType(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          mode === "off"
            ? "Venue name, street, barangay, city"
            : "Search for your venue"
        }
        className={field}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="border-line bg-ink-2 absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border shadow-lg"
        >
          {items.map((it, i) => (
            <li
              key={it.placeId}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(it);
              }}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-ink text-bone" : "text-stone"}`}
            >
              <span className="text-bone block">{it.main}</span>
              {it.secondary && (
                <span className="text-mute block text-xs">{it.secondary}</span>
              )}
            </li>
          ))}
          {note && items.length === 0 && (
            <li className="text-mute px-3 py-2 text-sm">{note}</li>
          )}
          <li className="border-line text-mute flex items-center justify-between gap-3 border-t px-3 py-2 text-xs">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                keepTyped();
              }}
              className="text-brass underline"
            >
              Use what I typed
            </button>
            <span>
              Search by{" "}
              <a
                href="https://www.geoapify.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Geoapify
              </a>{" "}
              · ©{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                OpenStreetMap contributors
              </a>
            </span>
          </li>
        </ul>
      )}

      <div aria-live="polite" className="mt-1 text-xs">
        {value.source === "map" ? (
          <p className="text-bone">
            ✓ Pinned location. We will see the exact spot.
          </p>
        ) : value.source === "typed" ? (
          <p className="text-stone">
            {mode === "off"
              ? "Saved as the address you typed."
              : "Saved as typed, not pinned on the map."}
          </p>
        ) : mode === "on" ? (
          <p className="text-mute">
            Start typing, then choose your venue from the list so we get the
            exact spot. Can&apos;t find it? Choose “Use what I typed”.
          </p>
        ) : (
          <p className="text-mute">
            Type the full address: venue name, street, barangay and city.
          </p>
        )}
        {mode === "on" &&
          value.source !== "map" &&
          note &&
          items.length === 0 &&
          !open && <p className="text-[#E8806A]">{note}</p>}
      </div>
    </div>
  );
}