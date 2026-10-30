import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/env";

const fetchWithTimeout: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(10000) });

// The "server key" client. It bypasses Row Level Security, so it must only be used inside
// Server Actions and route handlers, and only for jobs the public cannot do themselves
// (here: saving a booking request). The key lives in .env.local as SUPABASE_SERVICE_ROLE_KEY
// and never reaches the browser, because this file imports "server-only".
export function createAdminClient(): SupabaseClient | null {
  const env = getSupabasePublicEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !key || key.startsWith("YOUR-")) return null;
  return createClient(env.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout },
  });
}