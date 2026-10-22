// Runs once when the Next.js server starts.
// Prefer IPv4 for outgoing connections. Some networks cannot reach Supabase over IPv6,
// which makes server-side requests hang and fail with "fetch failed".
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const dns = await import("node:dns");
    dns.setDefaultResultOrder("ipv4first");
  }
}