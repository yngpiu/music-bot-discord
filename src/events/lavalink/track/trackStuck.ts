/**
 * @file trackStuck.ts
 * @description Event handler for when a track gets stuck during playback.
 */
import { ContainerBuilder } from 'discord.js'
import { Player, Track, TrackStuckEvent } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { formatTrack, lines } from '~/utils/stringUtil.js'

/**
 * Event handler for the 'trackStuck' event.
 */
class TrackStuckHandler extends LavalinkEvent {
  name = 'trackStuck'

  /**
   * Logs the issue, notifies the text channel, and forces a skip to the next track.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Player} player - The Lavalink player instance.
   * @param {Track | null} track - The track that is stuck.
   * @param {TrackStuckEvent} payload - Details about the threshold and duration of the stuck track.
   */
  async execute(bot: BotClient, player: Player, track: Track | null, payload: TrackStuckEvent) {
    logger.error(
      `[Player: ${player.guildId}] Track stuck: ${track?.info?.title || 'Unknown'} (Stuck threshold: ${payload.thresholdMs}ms)`
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
        logger.warn(`[Player: ${player.guildId}] Error sending track stuck notification:`, e)
        return null
      })

    // Force skip to prevent the bot from staying in a stuck state.
    await player.skip()
  }
}

export default new TrackStuckHandler()
