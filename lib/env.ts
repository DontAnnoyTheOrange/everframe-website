// Reads the public Supabase settings. Returns null when they are missing so pages can show a friendly message.
export function getSupabasePublicEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (
    !url ||
    !key ||
    url.includes("YOUR-PROJECT-REF") ||
    key.startsWith("YOUR-")
  )
    return null;
  return { url, key };
}