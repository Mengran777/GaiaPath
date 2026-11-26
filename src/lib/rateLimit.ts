// Simple fixed-window rate limiter for guest (signed-out) use of the AI routes.
//
// Kept in memory, so each server instance counts on its own and counts reset on
// a cold start. That is enough to stop casual abuse of the AI quota; move this
// to a shared store (e.g. Redis / Vercel KV) if guest traffic grows.
import type { NextRequest } from "next/server";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

/**
 * Counts one hit for `key` and reports whether it is still within `limit`
 * hits per `windowMs`. Returns seconds until the window resets when blocked.
 */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // Opportunistic cleanup so the map can't grow without bound
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  b.count += 1;
  return { ok: true, retryAfter: 0 };
}

const HOUR = 60 * 60 * 1000;

/** Per-route guest limits (signed-in users are not limited here). */
export const GUEST_LIMITS = {
  generate: { limit: 5, windowMs: HOUR },
  modify: { limit: 15, windowMs: HOUR },
  describe: { limit: 120, windowMs: HOUR },
  image: { limit: 200, windowMs: HOUR },
} as const;
