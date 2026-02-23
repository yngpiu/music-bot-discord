/**
 * Redis-backed sliding-window rate limiter with progressive ban.
 *
 * Rate limit: 3 commands per 10 seconds (per user).
 * Progressive ban (applied when user spams while already rate-limited):
 *   > 10 violations → banned 1 hour
 *   > 20 violations → banned 6 hours
 *   > 30 violations → banned 12 hours
 *
 * Redis keys:
 *   ratelimit:<userId>   — LIST of invocation timestamps (ms)
 *   violations:<userId>  — INT counter of rate-limit-hit events
 *   ban:<userId>         — STRING "1" present while user is banned; TTL = ban duration
 */
import type { Redis } from 'ioredis'

const WINDOW_MS = 10_000 // 10 seconds
const MAX_USES = 3 // max commands per window

// Progressive ban thresholds (violation count → ban duration in ms)
const BAN_TIERS: [number, number][] = [
  [30, 12 * 60 * 60 * 1000], // > 30 → 12h
  [20, 6 * 60 * 60 * 1000], // > 20 → 6h
  [10, 1 * 60 * 60 * 1000] // > 10 → 1h
]

let redis: Redis | null = null

export function setRedisClient(client: Redis) {
  redis = client
}

/** Returns remaining ban duration in ms, or 0 if not banned. */
export async function getBanRemainingMs(userId: string): Promise<number> {
  if (!redis) return 0
  const ttl = await redis.pttl(`ban:${userId}`)
  return ttl > 0 ? ttl : 0
}

/** Check sliding-window rate limit. Also handles progressive banning on repeated violations. */
export async function checkRateLimit(
  userId: string
): Promise<{ limited: boolean; remainingMs: number }> {
  if (!redis) {
    return { limited: false, remainingMs: 0 }
  }

  const key = `ratelimit:${userId}`
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  const timestamps: string[] = await redis.lrange(key, 0, -1)
  const recent = timestamps.map(Number).filter((t) => t > windowStart)

  if (recent.length >= MAX_USES) {
    const oldest = recent[0]
    const remainingMs = WINDOW_MS - (now - oldest)

    // Increment violation counter
    const violationsKey = `violations:${userId}`
    const violations = await redis.incr(violationsKey)
    // Keep violation counter alive for 24 hours from last violation
    await redis.expire(violationsKey, 24 * 60 * 60)

    // Apply progressive ban if threshold crossed
    for (const [threshold, banMs] of BAN_TIERS) {
      if (violations > threshold) {
        await redis.set(`ban:${userId}`, '1', 'PX', banMs)
        break
      }
    }

    return { limited: true, remainingMs }
  }

  // Rebuild list with new timestamp
  const pipeline = redis.pipeline()
  pipeline.del(key)
  for (const t of recent) {
    pipeline.rpush(key, String(t))
  }
  pipeline.rpush(key, String(now))
  pipeline.pexpire(key, WINDOW_MS)
  await pipeline.exec()

  return { limited: false, remainingMs: 0 }
}
