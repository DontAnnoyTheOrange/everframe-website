import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/env";

const fetchWithTimeout: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(8000) });

// Runs in proxy.ts on every /admin request. It asks Supabase who the visitor is (this also renews the
// login cookie when it is about to expire) and hands back the response that carries the renewed cookie.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getSupabasePublicEnv();
  if (!env) return { response, signedIn: false };

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list)
          response.cookies.set(name, value, options);
      },
    },
    global: { fetch: fetchWithTimeout },
  });

  // getUser() asks the Supabase server, so a forged or revoked cookie is not trusted.
  const { data } = await supabase.auth.getUser();
  return { response, signedIn: !!data.user };
}