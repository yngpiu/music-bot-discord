/**
 * Redis-backed sliding-window rate limiter.
 *
 * Uses a Redis LIST per user:
 *   Key: ratelimit:<userId>
 *   Value: list of invocation timestamps (ms as strings)
 *
 * Algorithm:
 *  1. LRANGE to get all timestamps, filter those inside the window.
 *  2. If count >= MAX_USES → rate limited, return remaining ms until oldest expires.
 *  3. Otherwise push current timestamp, rebuild list, set TTL.
 */
import type { Redis } from 'ioredis'

const WINDOW_MS = 10_000 // 10 seconds
const MAX_USES = 3 // max commands per window

let redis: Redis | null = null

export function setRedisClient(client: Redis) {
  redis = client
}

export async function checkRateLimit(
  userId: string
): Promise<{ limited: boolean; remainingMs: number }> {
  if (!redis) {
    // Fallback if Redis isn't ready yet — let the command through
    return { limited: false, remainingMs: 0 }
  }

  const key = `ratelimit:${userId}`
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  const timestamps: string[] = await redis.lrange(key, 0, -1)

  // Keep only entries within the window
  const recent = timestamps.map(Number).filter((t) => t > windowStart)

  if (recent.length >= MAX_USES) {
    const oldest = recent[0]
    const remainingMs = WINDOW_MS - (now - oldest)
    return { limited: true, remainingMs }
  }

  // Rebuild the list with current timestamp appended, reset TTL
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
