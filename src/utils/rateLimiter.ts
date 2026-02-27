// Sliding-window rate limiter using Redis to prevent spam and implement progressive banning.
import type { Redis } from 'ioredis'

// Time window for rate limiting (2 seconds).
const WINDOW_MS = 2_000
// Maximum allowed uses within the time window.
const MAX_USES = 1

// Progressive ban tiers: [violation_count, duration_ms].
const BAN_TIERS: [number, number][] = [
  [30, 12 * 60 * 60 * 1000], // 12 hours
  [20, 6 * 60 * 60 * 1000], // 6 hours
  [10, 1 * 60 * 60 * 1000] // 1 hour
]

let redis: Redis | null = null

// Sets the Redis client instance to be used by the rate limiter.
export function setRedisClient(client: Redis): void {
  redis = client
}

// Returns the remaining ban duration for a user.
export async function getBanRemainingMs(userId: string): Promise<number> {
  if (!redis) return 0
  const ttl = await redis.pttl(`ban:${userId}`)
  return ttl > 0 ? ttl : 0
}

// Checks if a user is rate-limited and handles progressive banning logic.
export async function checkRateLimit(
  userId: string
): Promise<{ limited: boolean; remainingMs: number }> {
  if (!redis) {
    return { limited: false, remainingMs: 0 }
  }

  const key = `ratelimit:${userId}`
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  // Fetch recent request timestamps from the sliding window.
  const timestamps: string[] = await redis.lrange(key, 0, -1)
  const recent = timestamps.map(Number).filter((t) => t > windowStart)

  if (recent.length >= MAX_USES) {
    const oldest = recent[0]
    const remainingMs = WINDOW_MS - (now - oldest)

    // Log a violation and check for automatic banning.
    const violationsKey = `violations:${userId}`
    const violations = await redis.incr(violationsKey)

    await redis.expire(violationsKey, 24 * 60 * 60)

    for (const [threshold, banMs] of BAN_TIERS) {
      if (violations > threshold) {
        await redis.set(`ban:${userId}`, '1', 'PX', banMs)
        break
      }
    }

    return { limited: true, remainingMs }
  }

  // Update request timestamps in Redis.
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
