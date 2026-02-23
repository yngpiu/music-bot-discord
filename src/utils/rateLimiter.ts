/**
 * Sliding-window rate limiter.
 *
 * Stores the timestamps of each invocation per user.
 * If a user has >= MAX_USES timestamps within the last WINDOW_MS,
 * they are rate-limited until the oldest timestamp expires.
 */

const WINDOW_MS = 10_000 // 10 seconds
const MAX_USES = 3 // max commands per window

// Key: userId → list of invocation timestamps (ms)
const userTimestamps = new Map<string, number[]>()

export function checkRateLimit(userId: string): { limited: boolean; remainingMs: number } {
  const now = Date.now()

  // Get and prune timestamps outside the window
  const timestamps = (userTimestamps.get(userId) ?? []).filter((t) => now - t < WINDOW_MS)

  if (timestamps.length >= MAX_USES) {
    // Oldest timestamp in window — wait until it slides out
    const oldestTs = timestamps[0]
    const remainingMs = WINDOW_MS - (now - oldestTs)
    userTimestamps.set(userId, timestamps)
    return { limited: true, remainingMs }
  }

  timestamps.push(now)
  userTimestamps.set(userId, timestamps)

  // Cleanup after the window expires so the Map doesn't grow forever
  setTimeout(() => {
    const stored = userTimestamps.get(userId) ?? []
    const pruned = stored.filter((t) => Date.now() - t < WINDOW_MS)
    if (pruned.length === 0) {
      userTimestamps.delete(userId)
    } else {
      userTimestamps.set(userId, pruned)
    }
  }, WINDOW_MS)

  return { limited: false, remainingMs: 0 }
}
