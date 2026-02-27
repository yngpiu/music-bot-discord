// Event handler for when a track encounters an error during playback.
import { Player, Track, TrackExceptionEvent, UnresolvedTrack } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { sendContainerMessage } from '~/utils/messageUtil'
import { formatTrack, getBotName } from '~/utils/stringUtil.js'

// Event handler for the 'trackError' event.
class TrackErrorEvent extends LavalinkEvent {
  name = 'trackError'

  // Logs the error and notifies the text channel about the failure.
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

    const trackDisplay = formatTrack({
      title: track.info.title,
      trackLink: track.info.uri,
      author: track.info.author
    })

    await sendContainerMessage(
      channel,
      `${EMOJI.ERROR} ${getBotName(bot)} đã bỏ qua ${trackDisplay} do lỗi phát nhạc.`
    )
  }
}

export default new TrackErrorEvent()
