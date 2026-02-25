import type { Redis } from 'ioredis'

import prisma from '~/lib/prisma.js'

import { logger } from '~/utils/logger.js'

// ─── Redis Buffer Config ──────────────────────────────────────────────────────

const REDIS_KEY = 'leaderboard:pending_plays'
const FLUSH_INTERVAL_MS = 30_000 // Flush mỗi 30 giây

let redis: Redis | null = null
let flushTimer: ReturnType<typeof setInterval> | null = null

/**
 * Inject Redis client và khởi động flush timer.
 * Gọi hàm này trong BotManager.start() sau khi connect Redis.
 */
export function initTrackService(redisClient: Redis) {
  redis = redisClient

  // Khởi động periodic flush
  if (flushTimer) clearInterval(flushTimer)
  flushTimer = setInterval(() => {
    flushPendingPlays().catch((e) => {
      logger.error('[Dịch vụ: TrackService] Lỗi khi flush dữ liệu play history lên DB:', e)
    })
  }, FLUSH_INTERVAL_MS)
}

// ─── Normalize ────────────────────────────────────────────────────────────────

function normalizeString(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(
      /[^a-z0-9가-힣\u3040-\u309f\u30a0-\u30ffàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/g,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Public API ───────────────────────────────────────────────────────────────

interface PlayRecord {
  sourceName: string
  identifier: string
  isrc?: string | null
  title: string
  author: string
  artworkUrl?: string | null
  uri?: string | null
  guildId: string
  userId: string
  botId: string
  playedAt: string // ISO string
}

/**
 * Ghi nhận 1 lượt phát vào Redis buffer.
 * Dữ liệu sẽ được flush vào PostgreSQL định kỳ.
 */
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
  userId: string,
  botId: string
): Promise<void> {
  if (!redis) {
    return
  }

  const record: PlayRecord = {
    ...trackInfo,
    guildId,
    userId,
    botId,
    playedAt: new Date().toISOString()
  }

  try {
    await redis.rpush(REDIS_KEY, JSON.stringify(record))
  } catch (e) {
    logger.error('[Dịch vụ: TrackService] Lỗi đẩy dữ liệu tracking lượt phát vào Redis buffer:', e)
  }
}

// ─── Flush Logic ──────────────────────────────────────────────────────────────

/**
 * Đọc toàn bộ records từ Redis buffer và batch-insert vào PostgreSQL.
 */
async function flushPendingPlays(): Promise<void> {
  if (!redis) return

  // Lấy số lượng records đang chờ
  const count = await redis.llen(REDIS_KEY)
  if (count === 0) return

  // Lấy tất cả records và xoá khỏi Redis (atomic)
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
      logger.error(`[Dịch vụ: TrackService] Lỗi upsert bản ghi phát nhạc: ${record.title}`, e)
    }
  }
}

/**
 * Cascading lookup + upsert cho 1 record.
 *   1. source:identifier
 *   2. ISRC
 *   3. normalizedTitle + normalizedArtist
 */
async function upsertPlayRecord(record: PlayRecord): Promise<void> {
  const sourceId = `${record.sourceName}:${record.identifier}`
  const normTitle = normalizeString(record.title)
  const normArtist = normalizeString(record.author)

  // Bước 1: source:identifier
  let track = await prisma.track.findUnique({ where: { id: sourceId } })

  // Bước 2: ISRC
  if (!track && record.isrc) {
    track = await prisma.track.findFirst({ where: { isrc: record.isrc } })
  }

  // Bước 3: normalizedTitle + normalizedArtist
  if (!track && normTitle && normArtist) {
    track = await prisma.track.findFirst({
      where: { normalizedTitle: normTitle, normalizedArtist: normArtist }
    })
  }

  // Tạo mới nếu chưa có
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

  // Ghi lịch sử phát
  await prisma.playHistory.create({
    data: {
      trackId: track.id,
      guildId: record.guildId,
      userId: record.userId,
      botId: record.botId,
      playedAt: new Date(record.playedAt)
    }
  })
}
