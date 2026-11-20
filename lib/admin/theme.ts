// The admin colour themes. The choice is kept in a cookie so the server can paint the right colours at once.
export const THEMES = [
  { key: "light", label: "Light", blurb: "Warm ivory with olive accents." },
  {
    key: "dark",
    label: "Dark",
    blurb: "Soft charcoal, easy on the eyes at night.",
  },
  {
    key: "navy",
    label: "Dark blue",
    blurb: "Deep navy with cool blue accents.",
  },
] as const;
export type ThemeKey = (typeof THEMES)[number]["key"];
export const THEME_COOKIE = "ef-admin-theme";

export function themeFor(value: unknown): ThemeKey {
  return THEMES.find((t) => t.key === value)?.key ?? "light";
}