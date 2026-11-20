/** Keeps a search to plain words, so it cannot change how the database filter is read. */
export function cleanQuery(q: string | undefined): string {
  return (q ?? "")
    .replace(/[^\p{L}\p{N} .'@_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}