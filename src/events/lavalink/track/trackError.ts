import { ContainerBuilder } from 'discord.js'
import { Player, Track, TrackExceptionEvent, UnresolvedTrack } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { formatTrack, lines } from '~/utils/stringUtil.js'

export default async (
  bot: BotClient,
  player: Player,
  track: Track | UnresolvedTrack | null,
  payload: TrackExceptionEvent | Error
) => {
  logger.error(
    `[Player: ${player.guildId}] Lỗi phát bài hát: ${track?.info?.title || 'Không rõ'}`,
    payload
  )
  if (payload instanceof Error && payload.message === 'No closest Track found') {
    // eslint-disable-next-line no-empty
  } else {
  }

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
      logger.warn(`[Player: ${player.guildId}] Lỗi gửi thông báo track error:`, e)
      return null
    })
}
