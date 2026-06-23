import {
  consumeRateLimit,
  sweepRateLimitStore,
  type RateLimitConfig
} from '../utils/rate-limit'

const store = new Map<string, number[]>()

const config: RateLimitConfig = {
  perMin: Number(process.env.RATE_LIMIT_PER_MIN) || 5,
  perHour: Number(process.env.RATE_LIMIT_PER_HOUR) || 20
}

const MAX_BODY_BYTES = 10 * 1024 * 1024 // 10MB

// Only trust the client-supplied X-Forwarded-For when explicitly told we sit
// behind a trusted proxy (e.g. the nginx in docker-compose). Otherwise XFF is
// spoofable and an attacker could mint a fresh per-IP budget per request.
const TRUST_PROXY = process.env.TRUST_PROXY === 'true'

// Reclaim idle keys once the store grows past this many distinct IPs, so the
// in-memory map is bounded by recently-active IPs, not all IPs ever seen.
const SWEEP_THRESHOLD = 10_000

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  if (url.pathname !== '/api/parse') return

  const contentLength = Number(getRequestHeader(event, 'content-length') || 0)
  if (contentLength > MAX_BODY_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Payload Too Large',
      message: 'File size cannot exceed 10MB'
    })
  }

  const now = Date.now()
  if (store.size > SWEEP_THRESHOLD) sweepRateLimitStore(store, now)

  const ip = getRequestIP(event, { xForwardedFor: TRUST_PROXY }) || 'unknown'
  const result = consumeRateLimit(store, ip, now, config)
  if (!result.allowed) {
    setResponseHeader(event, 'Retry-After', result.retryAfter)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Too many requests — please wait a moment and try again'
    })
  }
})
