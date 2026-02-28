// Service for managing per-user custom command aliases with Redis caching.
import type { Redis } from 'ioredis'

import prisma from '~/lib/prisma.js'

import { logger } from '~/utils/logger.js'

// Maximum number of aliases a user can create.
const MAX_ALIASES = 25

// Redis key prefix for alias cache.
const CACHE_PREFIX = 'alias:'
const CACHE_TTL = 600 // 10 minutes

let redis: Redis | null = null

// Sets the Redis client for the alias service.
export function setAliasRedisClient(client: Redis): void {
  redis = client
}

// Resolved alias result.
export interface AliasResult {
  command: string
  args: string[]
}

// Resolves a custom alias for a user, returning the target command and args.
export async function resolveAlias(userId: string, aliasName: string): Promise<AliasResult | null> {
  try {
    // Try Redis cache first.
    if (redis) {
      const cached = await redis.hget(`${CACHE_PREFIX}${userId}`, aliasName)
      if (cached !== null) {
        if (cached === '__none__') return null
        return parseStoredAlias(cached)
      }
    }

    // Fallback to DB.
    const alias = await prisma.customAlias.findUnique({
      where: { userId_aliasName: { userId, aliasName } }
    })

    if (!alias) {
      // Cache miss.
      if (redis) await redis.hset(`${CACHE_PREFIX}${userId}`, aliasName, '__none__')
      if (redis) await redis.expire(`${CACHE_PREFIX}${userId}`, CACHE_TTL)
      return null
    }

    const value = `${alias.command} ${alias.args}`.trim()
    if (redis) {
      await redis.hset(`${CACHE_PREFIX}${userId}`, aliasName, value)
      await redis.expire(`${CACHE_PREFIX}${userId}`, CACHE_TTL)
    }

    return { command: alias.command, args: alias.args ? alias.args.split(/\s+/) : [] }
  } catch (err) {
    logger.error('[AliasService] Error resolving alias:', err)
    return null
  }
}

// Adds a new alias for a user.
export async function addAlias(
  userId: string,
  aliasName: string,
  command: string,
  args: string
): Promise<void> {
  await prisma.customAlias.upsert({
    where: { userId_aliasName: { userId, aliasName } },
    update: { command, args },
    create: { userId, aliasName, command, args }
  })
  await invalidateCache(userId)
}

// Removes an alias for a user.
export async function removeAlias(userId: string, aliasName: string): Promise<boolean> {
  try {
    await prisma.customAlias.delete({
      where: { userId_aliasName: { userId, aliasName } }
    })
    await invalidateCache(userId)
    return true
  } catch {
    return false
  }
}

// Removes multiple aliases by their names for a user.
export async function removeAliasByNames(userId: string, aliasNames: string[]): Promise<void> {
  await prisma.customAlias.deleteMany({
    where: {
      userId,
      aliasName: { in: aliasNames }
    }
  })
  await invalidateCache(userId)
}

// Lists all aliases for a user.
export async function listAliases(
  userId: string
): Promise<{ aliasName: string; command: string; args: string }[]> {
  return prisma.customAlias.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { aliasName: true, command: true, args: true }
  })
}

// Returns the number of aliases a user has.
export async function countAliases(userId: string): Promise<number> {
  return prisma.customAlias.count({ where: { userId } })
}

// Checks if a user has reached the alias limit.
export async function hasReachedLimit(userId: string): Promise<boolean> {
  const count = await countAliases(userId)
  return count >= MAX_ALIASES
}

// Maximum aliases constant exported.
export { MAX_ALIASES }

// Parses a stored alias string ("command arg1 arg2") into AliasResult.
function parseStoredAlias(stored: string): AliasResult {
  const parts = stored.trim().split(/\s+/)
  const command = parts[0]
  const args = parts.slice(1)
  return { command, args }
}

// Invalidates the Redis cache for a user's aliases.
async function invalidateCache(userId: string): Promise<void> {
  if (redis) {
    await redis.del(`${CACHE_PREFIX}${userId}`)
  }
}
