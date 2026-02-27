// Service for tracking track play history, buffering data in Redis before batch-inserting into the DB.
import type { Redis } from 'ioredis'
import { Player, Track } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import prisma from '~/lib/prisma.js'

import { logger } from '~/utils/logger.js'

// Redis key used for buffering play records.
const REDIS_KEY = 'leaderboard:pending_plays'
// Interval for flushing buffered data to the database (30 seconds).
const FLUSH_INTERVAL_MS = 30_000

let redis: Redis | null = null
let flushTimer: ReturnType<typeof setInterval> | null = null

// Initializes the track tracking service.
export function initTrackService(redisClient: Redis): void {
  redis = redisClient

  if (flushTimer) clearInterval(flushTimer)
  flushTimer = setInterval(() => {
    flushPendingPlays().catch((e) => {
      logger.error('[Service: TrackService] Error flushing play history data to DB:', e)
    })
  }, FLUSH_INTERVAL_MS)
}

// Normalizes title and author strings for fuzzy database matching.
function normalizeString(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '') // Remove parentheses and brackets.
    .replace(
      /[^a-z0-9가-힣\u3040-\u309f\u30a0-\u30ffàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/g,
      ''
    ) // Keep alphanumeric and multi-language characters.
    .replace(/\s+/g, ' ') // Collapse multiple spaces.
    .trim()
}

// Internal record structure for track play tracking.
interface PlayRecord {
  sourceName: string
  identifier: string
  isrc?: string | null
  title: string
  author: string
  artworkUrl?: string | null
  uri?: string | null
  guildId: string
  listenerIds: string[]
  botId: string
  playedAt: string
}

// Records a track play by pushing it into the Redis buffer.
export async function recordTrackPlay(
  trackInfo: {
    sourceName: string
    identifier: string
    isrc?: string | null
    title: string
    author: string
    artworkUrl?: string | null
    uri?: string | null
  },
  guildId: string,
  listenerIds: string[],
  botId: string
): Promise<void> {
  if (!redis) {
    return
  }

  const record: PlayRecord = {
    ...trackInfo,
    guildId,
    listenerIds,
    botId,
    playedAt: new Date().toISOString()
  }

  try {
    await redis.rpush(REDIS_KEY, JSON.stringify(record))
  } catch (e) {
    logger.error('[Service: TrackService] Error pushing play tracking data to Redis buffer:', e)
  }
}

// Helper to extract voice channel members and capture play statistics for a track.
export function captureTrackPlay(bot: BotClient, player: Player, track: Track): void {
  const listenerIds: string[] = []
  try {
    const guild = bot.guilds.cache.get(player.guildId)
    const voiceChannel = guild?.channels.cache.get(player.voiceChannelId!)
    if (voiceChannel?.isVoiceBased()) {
      voiceChannel.members.forEach((member) => {
        if (!member.user.bot) {
          listenerIds.push(member.id)
        }
      })
    }
  } catch (e) {
    logger.warn(`[Player: ${player.guildId}] Could not get VC member list:`, e)
  }

  // Capture play statistics for the track.
  recordTrackPlay(
    {
      sourceName: track.info.sourceName,
      identifier: track.info.identifier,
      isrc: track.info.isrc,
      title: track.info.title,
      author: track.info.author,
      artworkUrl: track.info.artworkUrl,
      uri: track.info.uri
    },
    player.guildId,
    listenerIds,
    bot.user?.id || ''
  )
}

// Flushes all pending play records from Redis and persists them to the PostgreSQL database.
async function flushPendingPlays(): Promise<void> {
  if (!redis) return

  const count = await redis.llen(REDIS_KEY)
  if (count === 0) return

  // Atomically fetch and clear the buffer.
  const pipeline = redis.pipeline()
  pipeline.lrange(REDIS_KEY, 0, -1)
  pipeline.del(REDIS_KEY)
  const results = await pipeline.exec()

  if (!results || !results[0] || results[0][1] === null) return

  const rawRecords = results[0][1] as string[]
  const records: PlayRecord[] = rawRecords
    .map((r) => {
      try {
        return JSON.parse(r) as PlayRecord
      } catch {
        return null
      }
    })
    .filter((r): r is PlayRecord => r !== null)

  if (records.length === 0) return

  for (const record of records) {
    try {
      await upsertPlayRecord(record)
    } catch (e) {
      logger.error(`[Service: TrackService] Error upserting play record: ${record.title}`, e)
    }
  }
}

// Updates or inserts a play record, handling track normalization and listener association.
async function upsertPlayRecord(record: PlayRecord): Promise<void> {
  const sourceId = `${record.sourceName}:${record.identifier}`
  const normTitle = normalizeString(record.title)
  const normArtist = normalizeString(record.author)

  // Try to find the track by source ID, ISRC, or normalized title/artist.
  let track = await prisma.track.findUnique({ where: { id: sourceId } })

  if (!track && record.isrc) {
    track = await prisma.track.findFirst({ where: { isrc: record.isrc } })
  }

  if (!track && normTitle && normArtist) {
    track = await prisma.track.findFirst({
      where: { normalizedTitle: normTitle, normalizedArtist: normArtist }
    })
  }

  // Create the track entry if it doesn't exist.
  if (!track) {
    track = await prisma.track.create({
      data: {
        id: sourceId,
        sourceName: record.sourceName,
        identifier: record.identifier,
        isrc: record.isrc || null,
        title: record.title,
        artist: record.author,
        normalizedTitle: normTitle,
        normalizedArtist: normArtist,
        artworkUrl: record.artworkUrl || null,
        uri: record.uri || null
      }
    })
  }

  // Create the play history entry linked to the track.
  const playHistory = await prisma.playHistory.create({
    data: {
      trackId: track.id,
      guildId: record.guildId,
      botId: record.botId,
      playedAt: new Date(record.playedAt)
    }
  })

  // Record who was listening to this play.
  if (record.listenerIds.length > 0) {
    await prisma.playListener.createMany({
      data: record.listenerIds.map((userId) => ({
        historyId: playHistory.id,
        userId
      })),
      skipDuplicates: true
    })
  }
}
