import test from 'node:test'
import assert from 'node:assert/strict'
import { consumeRateLimit, sweepRateLimitStore } from './rate-limit.ts'

const config = { perMin: 5, perHour: 20 }

test('allows requests under the per-minute limit', () => {
  const store = new Map<string, number[]>()
  const now = 1_000_000
  for (let i = 0; i < 5; i++) {
    const r = consumeRateLimit(store, 'ip1', now + i, config)
    assert.equal(r.allowed, true)
  }
})

test('denies the 6th request within a minute', () => {
  const store = new Map<string, number[]>()
  const now = 1_000_000
  for (let i = 0; i < 5; i++) consumeRateLimit(store, 'ip1', now + i, config)
  const r = consumeRateLimit(store, 'ip1', now + 6, config)
  assert.equal(r.allowed, false)
  assert.ok(r.retryAfter > 0)
})

test('separate IPs have independent budgets', () => {
  const store = new Map<string, number[]>()
  const now = 1_000_000
  for (let i = 0; i < 5; i++) consumeRateLimit(store, 'ip1', now + i, config)
  const r = consumeRateLimit(store, 'ip2', now + 6, config)
  assert.equal(r.allowed, true)
})

test('prunes entries older than an hour (memory bound)', () => {
  const store = new Map<string, number[]>()
  consumeRateLimit(store, 'ip1', 0, config)
  consumeRateLimit(store, 'ip1', 3_600_001, config)
  assert.equal(store.get('ip1')!.length, 1)
})

test('enforces the per-hour cap across minutes', () => {
  const store = new Map<string, number[]>()
  let allowed = 0
  for (let i = 0; i < 25; i++) {
    const r = consumeRateLimit(store, 'ip1', i * 60_000, config)
    if (r.allowed) allowed++
  }
  assert.equal(allowed, 20)
})

test('sweep deletes keys whose timestamps have fully aged out', () => {
  const store = new Map<string, number[]>()
  consumeRateLimit(store, 'idle', 0, config) // calls once, never returns
  consumeRateLimit(store, 'active', 3_600_000, config)
  assert.equal(store.size, 2)

  // just after the active call: idle's lone timestamp is now an hour stale
  sweepRateLimitStore(store, 3_600_001)

  assert.equal(store.has('idle'), false)
  assert.equal(store.has('active'), true)
})

test('sweep trims stale timestamps from surviving keys', () => {
  const store = new Map<string, number[]>()
  consumeRateLimit(store, 'ip1', 0, config) // goes stale within the sweep window
  consumeRateLimit(store, 'ip1', 100, config) // stays recent
  assert.equal(store.get('ip1')!.length, 2)

  sweepRateLimitStore(store, 3_600_001)

  assert.equal(store.get('ip1')!.length, 1)
})
