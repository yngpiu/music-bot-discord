import { ContainerBuilder } from 'discord.js'
import { Player, Track, TrackStuckEvent } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { formatTrack, lines } from '~/utils/stringUtil.js'

export default async (
  bot: BotClient,
  player: Player,
  track: Track | null,

  payload: TrackStuckEvent
) => {
  logger.error(
    `[Player: ${player.guildId}] Bài hát bị kẹt: ${track?.info?.title || 'Không rõ'} (Ngưỡng kẹt: ${payload.thresholdMs}ms)`
  )

  if (!track || !player.textChannelId) return

  const channel = bot.channels.cache.get(player.textChannelId)

  if (!channel?.isTextBased() || !('send' in channel)) return

  const trackDisplay = formatTrack({
    title: track.info.title,
    trackLink: track.info.uri,
    author: track.info.author
  })

  const container = new ContainerBuilder().addTextDisplayComponents((t) =>
    t.setContent(
      lines(
        `${EMOJI.ANIMATED_CAT_CRYING} **${bot.user?.displayName || 'tớ'}** đã bỏ qua ${trackDisplay} do lỗi.`
      )
    )
  )

  await channel
    .send({
      components: [container],
      flags: ['IsComponentsV2']
    })

    .catch((e) => {
      logger.warn(`[Player: ${player.guildId}] Lỗi gửi thông báo track stuck:`, e)
      return null
    })

  // Skip the stuck track
  await player.skip()
}
