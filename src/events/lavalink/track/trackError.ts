/**
 * @file trackError.ts
 * @description Event handler for when a track encounters an error during playback.
 */
import { ContainerBuilder } from 'discord.js'
import { Player, Track, TrackExceptionEvent, UnresolvedTrack } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { formatTrack, lines } from '~/utils/stringUtil.js'

/**
 * Event handler for the 'trackError' event.
 */
class TrackErrorEvent extends LavalinkEvent {
  name = 'trackError'

  /**
   * Logs the error and notifies the text channel about the failure.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Player} player - The Lavalink player instance.
   * @param {Track | UnresolvedTrack | null} track - The track that errored.
   * @param {TrackExceptionEvent | Error} payload - The error details or exception object.
   */
  async execute(
    bot: BotClient,
    player: Player,
    track: Track | UnresolvedTrack | null,
    payload: TrackExceptionEvent | Error
  ): Promise<void> {
    logger.error(
      `[Player: ${player.guildId}] Error playing track: ${track?.info?.title || 'Unknown'}`,
      payload
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
        logger.warn(`[Player: ${player.guildId}] Error sending track error notification:`, e)
        return null
      })
  }
}

export default new TrackErrorEvent()
