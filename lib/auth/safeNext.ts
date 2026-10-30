/** Only allow sending someone back to a page inside /admin (stops "open redirect" tricks). */
export function safeNext(next: unknown): string {
  if (typeof next !== "string") return "/admin";
  if (
    !next.startsWith("/admin") ||
    next.startsWith("//") ||
    next.includes("\\")
  )
    return "/admin";
  // "/adminfoo" and "/admin.evil.com" are not admin pages.
  if (
    next !== "/admin" &&
    !next.startsWith("/admin/") &&
    !next.startsWith("/admin?")
  )
    return "/admin";
  return next;
}