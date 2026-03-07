import type { Redis } from 'ioredis'

import { logger } from '~/utils/logger.js'

let redis: Redis | null = null

export function setKpopRadarRedisClient(client: Redis): void {
  redis = client
}

export interface KpopRadarSns {
  name: string
  url: string
  totalCount: number
  incCount: number
  incRatio: string
  // other fields omitted for brevity
}

export interface KpopRadarYoutubeTask {
  songName: string
  playCount: number
  incCount: number
}

let isFetchingInfo = false
let infoMemCache: KpopRadarSns[] | null = null
let infoMemCacheExpiry = 0

let isFetchingYoutube = false
let youtubeMemCache: KpopRadarYoutubeTask[] | null = null
let youtubeMemCacheExpiry = 0

function getSecondsUntilNext1AMUTC(): number {
  const now = new Date()
  const nextTarget = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 1, 0, 0, 0)
  )
  if (now.getTime() >= nextTarget.getTime()) {
    nextTarget.setUTCDate(nextTarget.getUTCDate() + 1)
  }
  return Math.floor((nextTarget.getTime() - now.getTime()) / 1000)
}

export async function getKpopRadarYoutubeRealtimeData(): Promise<KpopRadarYoutubeTask[]> {
  const cacheKey = 'kpopradar:nmixx:youtube_realtime'

  const now = Date.now()
  if (now < youtubeMemCacheExpiry && youtubeMemCache) {
    return youtubeMemCache
  }

  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        youtubeMemCache = parsed
        youtubeMemCacheExpiry = now + 60_000
        return parsed
      }
    } catch (err) {
      logger.error('[KpopRadar] Failed to fetch or parse cached youtube data from Redis:', err)
    }
  }

  if (isFetchingYoutube) return youtubeMemCache || []

  isFetchingYoutube = true
  try {
    const url = `https://s.kpop-radar.com/api/artist/realtimeDataNew?artistId=2298&sortType=1&orderCountInPage=30&lastOrderNo=0`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
    const json = await res.json()
    const tasks = json?.data?.tasks

    if (Array.isArray(tasks)) {
      if (redis) {
        // Cache for 1 hour (3600 seconds)
        await redis.setex(cacheKey, 3600, JSON.stringify(tasks))
      }
      youtubeMemCache = tasks
      youtubeMemCacheExpiry = now + 60_000
      return tasks as KpopRadarYoutubeTask[]
    }
  } catch (err) {
    logger.error('[KpopRadar] Error fetching Youtube Realtime API data:', err)
  } finally {
    isFetchingYoutube = false
  }

  return youtubeMemCache || []
}

export async function getKpopRadarData(): Promise<KpopRadarSns[]> {
  const cacheKey = 'kpopradar:nmixx'

  // Fast path: memory cache
  const now = Date.now()
  if (now < infoMemCacheExpiry && infoMemCache) {
    return infoMemCache
  }

  // Redis cache
  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        infoMemCache = parsed
        // Refresh from Redis again after 1 minute or at next 1 AM UTC
        infoMemCacheExpiry = now + 60_000
        return parsed
      }
    } catch (err) {
      logger.error('[KpopRadar] Failed to fetch or parse cached data from Redis:', err)
    }
  }

  if (isFetchingInfo) {
    return infoMemCache || []
  }

  isFetchingInfo = true
  try {
    const res = await fetch('https://s.kpop-radar.com/api/artist/getArtistInfo?artistPath=NMIXX')
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
    const json = await res.json()
    const snsData = json?.data?.sns

    if (Array.isArray(snsData)) {
      if (redis) {
        const ttl = getSecondsUntilNext1AMUTC()
        await redis.setex(cacheKey, ttl, JSON.stringify(snsData))
      }
      infoMemCache = snsData
      infoMemCacheExpiry = now + 60_000
      return snsData as KpopRadarSns[]
    }
  } catch (err) {
    logger.error('[KpopRadar] Error fetching API data:', err)
  } finally {
    isFetchingInfo = false
  }

  return infoMemCache || []
}
