// A small "too many tries" guard for the booking form.
// It remembers how many requests each visitor (by IP address) made recently, in the server's memory.
// Limits of this version: on Vercel each server instance has its own memory, so this slows down
// spam but is not a perfect wall. The database still refuses double bookings no matter what.

export type Limiter = {
  /** Returns true when the visitor may go ahead, false when they must wait. */
  allow(key: string, now?: number): boolean;
};

export function createLimiter(max: number, windowMs: number): Limiter {
  const hits = new Map<string, number[]>();
  return {
    allow(key, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      // Keep memory small: forget old visitors once the table grows.
      if (hits.size > 5000) {
        for (const [k, v] of hits) {
          if (v.every((t) => now - t >= windowMs)) hits.delete(k);
        }
      }
      return true;
    },
  };
}