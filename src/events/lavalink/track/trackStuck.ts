import { ContainerBuilder } from 'discord.js'
import { Player, Track, TrackStuckEvent } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { lines } from '~/utils/stringUtil'


export default async (
  bot: BotClient,
  player: Player,
  track: Track | null,
  payload: TrackStuckEvent
) => {
  logger.error(
    `[Lavalink:Engine] ${player.guildId} :: Track is permanently stuck. System will skip. Details:`,
    payload
  )

  if (!track || !player.textChannelId) return

  const channel = bot.channels.cache.get(player.textChannelId)

  if (!channel?.isTextBased() || !('send' in channel)) return
  const trackLink = track?.info?.uri || 'https://github.com/yngpiu'

  const container = new ContainerBuilder().addTextDisplayComponents((t) =>
    t.setContent(
      lines(
        `${EMOJI.ANIMATED_IDK} [${track.info.title}](${trackLink}) đang bị kẹt do lỗi, mình sẽ bỏ qua bài này.`
      )
    )
  )

  await channel.send({
    components: [container],
    flags: ['IsComponentsV2', 'SuppressNotifications']
  })
}
