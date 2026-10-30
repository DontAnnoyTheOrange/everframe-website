import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/env";

const fetchWithTimeout: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(10000) });

// The client for a logged-in person. It uses the publishable key plus the login cookie, so the database
// treats every request as that person and Row Level Security decides what they may see or change.
// Use it in Server Components and Server Actions. Never use it in the browser.
export async function createSupabaseServerClient() {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  const store = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        // Server Components cannot write cookies. That is fine: the proxy refreshes the login cookie.
        try {
          for (const { name, value, options } of list)
            store.set(name, value, options);
        } catch {
          /* called from a Server Component */
        }
      },
    },
    global: { fetch: fetchWithTimeout },
  });
}