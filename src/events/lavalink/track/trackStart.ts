import { ContainerBuilder } from 'discord.js'
import { Player, Track } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { formatDuration, lines } from '~/utils/stringUtil'

export default async (bot: BotClient, player: Player, track: Track) => {
  logger.info(
    `[Lavalink:Engine] ${player.guildId} :: Started playing track: ${track.info?.title || 'Unknown'}.`
  )

  if (!track || !player.textChannelId) return

  const channel = bot.channels.cache.get(player.textChannelId)

  if (!channel?.isTextBased() || !('send' in channel)) return

  const trackLink = track?.info?.uri || 'https://github.com/yngpiu'
  const authorLink = track?.pluginInfo?.artistUrl || null
  let stringDuration = ''
  if (track.info.duration) {
    stringDuration = formatDuration(track.info.duration)
  }

  const container = new ContainerBuilder().addTextDisplayComponents((t) =>
    t.setContent(
      lines(
        `${EMOJI.ANIMATED_CAT_DANCE} Bắt đầu phát **[[${stringDuration}] ${track.info.title}](${trackLink})**${authorLink ? ` bởi **[${track.info.author}](${authorLink})**` : ''}`
      )
    )
  )

  await channel
    .send({
      components: [container],
      flags: ['IsComponentsV2', 'SuppressNotifications']
    })
    .catch((e) => { logger.error(e); return null })
}
