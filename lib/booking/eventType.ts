// Rules for the "Others" event type. The browser uses this for quick feedback;
// the database (resolve_event_type in migration 005) enforces the same rules again.
export const OTHER_LABEL_MIN = 2;
export const OTHER_LABEL_MAX = 80;

export type OtherLabelResult =
  { ok: true; value: string } | { ok: false; message: string };

/** Collapse repeated spaces and trim, the same way the database does. */
export function cleanOtherLabel(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** Check what the customer typed after choosing "Others". */
export function validateOtherLabel(raw: string): OtherLabelResult {
  const value = cleanOtherLabel(raw);
  if (value.length === 0)
    return { ok: false, message: "Please tell us what kind of event this is." };
  if (value.length < OTHER_LABEL_MIN)
    return {
      ok: false,
      message: `Please use at least ${OTHER_LABEL_MIN} characters.`,
    };
  if (value.length > OTHER_LABEL_MAX)
    return {
      ok: false,
      message: `Please keep it under ${OTHER_LABEL_MAX} characters.`,
    };
  if (/[\u0000-\u001f\u007f]/.test(value))
    return { ok: false, message: "Please use letters and numbers only." };
  return { ok: true, value };
}