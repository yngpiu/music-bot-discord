// Event handler for when a track gets stuck during playback.
import { Player, Track, TrackStuckEvent } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { sendContainerMessage } from '~/utils/messageUtil'
import { formatTrack, getBotName } from '~/utils/stringUtil.js'

// Event handler for the 'trackStuck' event.
class TrackStuckHandler extends LavalinkEvent {
  name = 'trackStuck'

  // Logs the issue, notifies the text channel, and forces a skip to the next track.
  async execute(
    bot: BotClient,
    player: Player,
    track: Track | null,
    payload: TrackStuckEvent
  ): Promise<void> {
    logger.error(
      `[Player: ${player.guildId}] Track stuck: ${track?.info?.title || 'Unknown'} (Stuck threshold: ${payload.thresholdMs}ms)`
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

export default new TrackStuckHandler()
