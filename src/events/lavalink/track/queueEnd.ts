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
    `[Lavalink:Player] ${player.guildId} :: Player queue finished. Last track: ${track?.info?.title || 'Unknown'}. Reason: ${payload?.reason || 'unknown'}`
  )

  // Khi queue hết và bài cuối phát xong → ghi nhận lượt phát
  // (lavalink-client không emit trackEnd khi queue trống, mà gọi thẳng queueEnd)
  if (payload?.reason !== 'finished' || !track) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requester = track.requester as any
  const userId: string = requester?.id || requester?.toString?.() || 'unknown'

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
