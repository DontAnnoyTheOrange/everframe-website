"use client";

import { useTheme } from "@/components/admin/ThemeProvider";
import Link from "next/link";

const THEMES: { key: "light" | "dark" | "dark-blue"; label: string }[] = [
  { key: "light", label: "Light mode" },
  { key: "dark", label: "Dark mode" },
  { key: "dark-blue", label: "Dark blue mode" },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-xl a-card p-5 space-y-4">
      <p className="text-sm text-neutral-600">
        Your choice is saved in your browser and applies to the admin only.
      </p>
      <div className="grid gap-3">
        {THEMES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTheme(t.key)}
            className={`a-btn flex items-center justify-between ${
              theme === t.key
                ? "a-btn-primary"
                : "border-neutral-300 bg-white text-neutral-700"
            }`}
          >
            <span>{t.label}</span>
            {theme === t.key && "Active"}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Link href="/admin/settings" className="text-sm text-neutral-500 underline">
          Back to website content
        </Link>
      </div>
    </div>
  );
}
