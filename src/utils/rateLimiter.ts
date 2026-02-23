/**
 * Simple in-memory per-user/per-command rate limiter.
 * Key: `${userId}:${commandName}` → timestamp (ms) of last use.
 */
const cooldowns = new Map<string, number>()

const DEFAULT_COOLDOWN_MS = 2000 // 2 seconds

export function checkRateLimit(
  userId: string,
  commandName: string,
  cooldownMs = DEFAULT_COOLDOWN_MS
): { limited: boolean; remainingMs: number } {
  const key = `${userId}:${commandName}`
  const now = Date.now()
  const lastUsed = cooldowns.get(key)

  if (lastUsed !== undefined) {
    const elapsed = now - lastUsed
    if (elapsed < cooldownMs) {
      return { limited: true, remainingMs: cooldownMs - elapsed }
    }
  }

  cooldowns.set(key, now)

  // Expire old entries to avoid memory leak
  setTimeout(() => cooldowns.delete(key), cooldownMs)

  return { limited: false, remainingMs: 0 }
}
