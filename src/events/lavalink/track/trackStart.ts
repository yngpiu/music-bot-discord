import { ContainerBuilder } from 'discord.js'
import { Player, Track } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { formatDuration, formatTrack, lines } from '~/utils/stringUtil'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

class TrackStartEvent extends LavalinkEvent {
  name = 'trackStart'

  async execute(bot: BotClient, player: Player, track: Track) {
  logger.info(`[Player: ${player.guildId}] Started playing track: ${track?.info?.title}`)
  if (!track || !player.textChannelId) return

  const channel = bot.channels.cache.get(player.textChannelId)

  if (!channel?.isTextBased() || !('send' in channel)) return

  let stringDuration = ''
  if (track.info.duration) {
    stringDuration = formatDuration(track.info.duration)
  }

  const trackDisplay = formatTrack({
    title: track.info.title,
    trackLink: track.info.uri,
    author: track.info.author
  })

  const container = new ContainerBuilder().addTextDisplayComponents((t) =>
    t.setContent(
      lines(`${EMOJI.ANIMATED_CAT_DANCE} Bắt đầu phát **\\[${stringDuration}\\]** ${trackDisplay}`)
    )
  )

  await channel
    .send({
      components: [container],
      flags: ['IsComponentsV2', 'SuppressNotifications']
    })

    .catch((e) => {
      logger.warn(`[Player: ${player.guildId}] Error sending track start notification:`, e)
      return null
    })
}
}

export default new TrackStartEvent()
