/**
 * @file trackStart.ts
 * @description Event handler for when a track starts playing.
 */
import { ContainerBuilder } from 'discord.js'
import { Player, Track } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { formatDuration, formatTrack, lines } from '~/utils/stringUtil'

/**
 * Event handler for the 'trackStart' event.
 */
class TrackStartEvent extends LavalinkEvent {
  name = 'trackStart'

  /**
   * Logs the start of playback and sends a "Now Playing" notification to the text channel.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Player} player - The Lavalink player instance.
   * @param {Track} track - The track that started playing.
   */
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
        lines(
          `${EMOJI.ANIMATED_CAT_DANCE} Bắt đầu phát **\\[${stringDuration}\\]** ${trackDisplay}`
        )
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
