import { Player, Track, TrackEndEvent } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { recordTrackPlay } from '~/lib/trackService.js'

import { logger } from '~/utils/logger.js'

export default async (
  bot: BotClient,
  player: Player,
  track: Track | null,
  payload: TrackEndEvent
) => {
  logger.info(
    `[Lavalink:Player] ${player.guildId} :: Finished playing track: ${track?.info?.title || 'Unknown'}. Reason: ${payload.reason}`
  )

  // Chỉ ghi nhận khi bài hát phát xong hoàn toàn
  if (payload.reason !== 'finished' || !track) return

  // Lấy userId từ requester (được set lúc gọi player.search() hoặc queue.add())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requester = track.requester as any
  const userId: string = requester?.id || requester?.toString?.() || 'unknown'

  // Fire-and-forget: ghi nhận lượt phát, không block player
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
    userId,
    bot.user!.id
  )
}
