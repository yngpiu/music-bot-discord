/**
 * Redis-backed sliding-window rate limiter.
 *
 * Uses a Redis LIST per user:
 *   Key: ratelimit:<userId>
 *   Value: list of invocation timestamps (ms as strings)
 *
 * Algorithm:
 *  1. Remove entries older than WINDOW_MS (via LRANGE then LSET/LTRIM equivalent via pipeline).
 *  2. Count remaining entries.
 *  3. If count >= MAX_USES → rate limited, return how long until the oldest entry expires.
 *  4. Otherwise push current timestamp, set key TTL.
 */
import type { Redis } from 'ioredis'

const WINDOW_MS = 10_000 // 10 seconds
const MAX_USES = 3 // max commands per window

let redis: Redis | null = null

export function setRedisClient(client: Redis) {
  redis = client
}

export function checkRateLimit(userId: string): { limited: boolean; remainingMs: number } {
  if (!redis) {
    // Fallback in case Redis isn't ready yet — let the command through
    return { limited: false, remainingMs: 0 }
  }

  return _checkRateLimitAsync(userId) as unknown as { limited: boolean; remainingMs: number }
}

async function _checkRateLimitAsync(
  userId: string
): Promise<{ limited: boolean; remainingMs: number }> {
  const key = `ratelimit:${userId}`
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  // Atomic pipeline: get current entries, push new one, trim, set expiry
  const timestamps: string[] = await redis!.lrange(key, 0, -1)

  // Keep only entries within the window
  const recent = timestamps.map(Number).filter((t) => t > windowStart)

  if (recent.length >= MAX_USES) {
    const oldest = recent[0]
    const remainingMs = WINDOW_MS - (now - oldest)
    return { limited: true, remainingMs }
  }

  // Add current timestamp and update window
  const pipeline = redis!.pipeline()
  pipeline.del(key)
  for (const t of recent) {
    pipeline.rpush(key, String(t))
  }
  pipeline.rpush(key, String(now))
  pipeline.pexpire(key, WINDOW_MS)
  await pipeline.exec()

  return { limited: false, remainingMs: 0 }
}
