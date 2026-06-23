export interface RateLimitConfig {
  perMin: number
  perHour: number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfter: number // seconds; 0 when allowed
}

const MINUTE = 60_000
const HOUR = 3_600_000

/**
 * Records a request and decides whether it is allowed under a two-tier
 * (per-minute + per-hour) sliding window. Mutates `store` in place and
 * prunes this key's timestamps older than one hour.
 *
 * NOTE: this only prunes the key being touched. Keys for IPs that go quiet
 * are reclaimed by `sweepRateLimitStore` (called from the middleware), which
 * is what actually bounds the store by *active* IPs.
 */
export function consumeRateLimit(
  store: Map<string, number[]>,
  key: string,
  nowMs: number,
  config: RateLimitConfig
): RateLimitResult {
  const existing = store.get(key) ?? []
  const recent = existing.filter((t) => nowMs - t < HOUR)

  const inLastMin = recent.filter((t) => nowMs - t < MINUTE)

  if (inLastMin.length >= config.perMin) {
    store.set(key, recent)
    const oldestInMin = Math.min(...inLastMin)
    const retryAfter = Math.ceil((MINUTE - (nowMs - oldestInMin)) / 1000)
    return { allowed: false, retryAfter: Math.max(1, retryAfter) }
  }

  if (recent.length >= config.perHour) {
    store.set(key, recent)
    const oldest = Math.min(...recent)
    const retryAfter = Math.ceil((HOUR - (nowMs - oldest)) / 1000)
    return { allowed: false, retryAfter: Math.max(1, retryAfter) }
  }

  recent.push(nowMs)
  store.set(key, recent)
  return { allowed: true, retryAfter: 0 }
}

/**
 * Drops keys whose timestamps have all aged out of the one-hour window and
 * trims surviving keys to their recent timestamps. Bounds the store by the
 * number of *recently active* IPs rather than all IPs ever seen. Call
 * opportunistically (e.g. once the store grows past a threshold) — it is O(N)
 * over the store, so it should not run on every request.
 */
export function sweepRateLimitStore(
  store: Map<string, number[]>,
  nowMs: number
): void {
  for (const [key, timestamps] of store) {
    const recent = timestamps.filter((t) => nowMs - t < HOUR)
    if (recent.length === 0) store.delete(key)
    else if (recent.length !== timestamps.length) store.set(key, recent)
  }
}
