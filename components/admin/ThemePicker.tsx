"use client";

import { useState, useTransition } from "react";
import { setTheme } from "@/app/(admin)/admin/account/actions";
import { THEMES, type ThemeKey } from "@/lib/admin/theme";

const SWATCH: Record<
  ThemeKey,
  { bg: string; side: string; card: string; accent: string; ink: string }
> = {
  light: {
    bg: "#f8f7f3",
    side: "#f0eee7",
    card: "#ffffff",
    accent: "#73785a",
    ink: "#25251f",
  },
  dark: {
    bg: "#161613",
    side: "#1d1d19",
    card: "#201f1b",
    accent: "#a3aa7f",
    ink: "#ecebe4",
  },
  navy: {
    bg: "#0c1424",
    side: "#09101d",
    card: "#131f36",
    accent: "#86aeea",
    ink: "#e4ebf7",
  },
};

// Three theme cards. Picking one changes the colours right away and remembers the choice on this browser.
export default function ThemePicker({ initial }: { initial: ThemeKey }) {
  const [value, setValue] = useState<ThemeKey>(initial);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function pick(k: ThemeKey) {
    setValue(k);
    setSaved(false);
    document
      .querySelector<HTMLElement>(".admin-root")
      ?.setAttribute("data-theme", k);
    start(async () => {
      await setTheme(k);
      setSaved(true);
    });
  }

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Admin appearance"
        className="grid gap-4 sm:grid-cols-3"
      >
        {THEMES.map((t) => {
          const c = SWATCH[t.key];
          const on = value === t.key;
          return (
            <label
              key={t.key}
              className={`a-card block cursor-pointer overflow-hidden transition-shadow hover:shadow-md ${on ? "!border-[var(--a-olive)] ring-2 ring-[var(--a-olive)]" : ""}`}
            >
              <input
                type="radio"
                name="theme"
                value={t.key}
                checked={on}
                onChange={() => pick(t.key)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="flex h-24 border-b border-[var(--a-line)]"
                style={{ background: c.bg }}
              >
                <span className="w-1/4" style={{ background: c.side }} />
                <span className="flex flex-1 flex-col gap-1.5 p-2.5">
                  <span
                    className="h-2 w-1/2 rounded"
                    style={{ background: c.ink, opacity: 0.8 }}
                  />
                  <span className="flex flex-1 gap-1.5">
                    <span
                      className="flex-1 rounded"
                      style={{ background: c.card }}
                    />
                    <span
                      className="flex-1 rounded"
                      style={{ background: c.card }}
                    />
                  </span>
                  <span
                    className="h-2 w-1/3 rounded"
                    style={{ background: c.accent }}
                  />
                </span>
              </span>
              <span className="flex items-start justify-between gap-2 p-4">
                <span>
                  <span className="a-card-title block">{t.label}</span>
                  <span className="text-sm text-neutral-500">{t.blurb}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`mt-1 grid h-5 w-5 flex-none place-items-center rounded-full border ${on ? "border-[var(--a-olive)] bg-[var(--a-olive-d)] text-white" : "border-neutral-300"}`}
                >
                  {on && "✓"}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <p className="mt-3 min-h-5 text-sm text-neutral-500" aria-live="polite">
        {pending ? "Saving…" : saved ? "Saved on this browser." : ""}
      </p>
    </div>
  );
}