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
    `[Lavalink:Player] ${player.guildId} :: Track is permanently stuck. System will skip. Details:`,
    payload
  )

  if (!track || !player.textChannelId) return

  const channel = bot.channels.cache.get(player.textChannelId)

  if (!channel?.isTextBased() || !('send' in channel)) return

  const trackDisplay = formatTrack({
    title: track.info.title,
    trackLink: track.info.uri
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
      logger.error(e)
      return null
    })
}
