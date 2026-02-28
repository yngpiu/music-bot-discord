// Service for managing per-guild and per-user command prefixes with Redis caching.
import type { Redis } from 'ioredis'
import { config } from '~/config/env.js'

import prisma from '~/lib/prisma.js'

import { logger } from '~/utils/logger.js'

let redis: Redis | null = null

// Redis key prefixes for caching.
const GUILD_PREFIX_KEY = 'prefix:guild:'
const USER_PREFIX_KEY = 'prefix:user:'
// Cache TTL in seconds (1 hour).
const CACHE_TTL = 3600

// Sets the Redis client instance to be used by the prefix service.
export function setPrefixRedisClient(client: Redis): void {
  redis = client
}

// Resolves the effective prefix for a user in a guild.
// Priority: User prefix > Guild prefix > Default prefix.
export async function resolvePrefix(guildId: string, userId: string): Promise<string> {
  const userPrefix = await getUserPrefix(userId)
  if (userPrefix) return userPrefix

  const guildPrefix = await getGuildPrefix(guildId)
  if (guildPrefix) return guildPrefix

  return config.prefix
}

// Gets the custom prefix for a guild, or null if not set.
export async function getGuildPrefix(guildId: string): Promise<string | null> {
  // Try Redis cache first.
  if (redis) {
    const cached = await redis.get(GUILD_PREFIX_KEY + guildId)
    if (cached === '__none__') return null
    if (cached) return cached
  }

  try {
    const guildConfig = await prisma.guildConfig.findUnique({ where: { guildId } })
    const prefix = guildConfig?.prefix ?? null

    // Cache result in Redis.
    if (redis) {
      await redis.set(GUILD_PREFIX_KEY + guildId, prefix ?? '__none__', 'EX', CACHE_TTL)
    }

    return prefix
  } catch (e) {
    logger.error(`[Service: PrefixService] Error fetching guild prefix for ${guildId}:`, e)
    return null
  }
}

// Sets a custom prefix for a guild.
export async function setGuildPrefix(guildId: string, prefix: string): Promise<void> {
  await prisma.guildConfig.upsert({
    where: { guildId },
    update: { prefix },
    create: { guildId, prefix }
  })

  if (redis) {
    await redis.set(GUILD_PREFIX_KEY + guildId, prefix, 'EX', CACHE_TTL)
  }
}

// Resets a guild's prefix back to the default.
export async function resetGuildPrefix(guildId: string): Promise<void> {
  // Delete the guild config record entirely if it exists.
  await prisma.guildConfig.deleteMany({ where: { guildId } })

  if (redis) {
    await redis.del(GUILD_PREFIX_KEY + guildId)
  }
}

// Gets the custom prefix for a user, or null if not set.
export async function getUserPrefix(userId: string): Promise<string | null> {
  // Try Redis cache first.
  if (redis) {
    const cached = await redis.get(USER_PREFIX_KEY + userId)
    if (cached === '__none__') return null
    if (cached) return cached
  }

  try {
    const userConfig = await prisma.userConfig.findUnique({ where: { userId } })
    const prefix = userConfig?.prefix ?? null

    // Cache result in Redis.
    if (redis) {
      await redis.set(USER_PREFIX_KEY + userId, prefix ?? '__none__', 'EX', CACHE_TTL)
    }

    return prefix
  } catch (e) {
    logger.error(`[Service: PrefixService] Error fetching user prefix for ${userId}:`, e)
    return null
  }
}

// Sets a custom prefix for a user.
export async function setUserPrefix(userId: string, prefix: string): Promise<void> {
  await prisma.userConfig.upsert({
    where: { userId },
    update: { prefix },
    create: { userId, prefix }
  })

  if (redis) {
    await redis.set(USER_PREFIX_KEY + userId, prefix, 'EX', CACHE_TTL)
  }
}

// Resets a user's prefix back to the default.
export async function resetUserPrefix(userId: string): Promise<void> {
  // Delete the user config record entirely if it exists.
  await prisma.userConfig.deleteMany({ where: { userId } })

  if (redis) {
    await redis.del(USER_PREFIX_KEY + userId)
  }
}
