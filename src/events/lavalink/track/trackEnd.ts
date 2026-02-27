// Event handler for when a track finishes playing.
import { Player, Track, TrackEndEvent } from 'lavalink-client'
import { captureTrackPlay } from '~/services/trackService.js'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

// Event handler for the 'trackEnd' event.
class TrackEndHandler extends LavalinkEvent {
  name = 'trackEnd'

  // Logs the event and records the track play in the database.
  async execute(
    bot: BotClient,
    player: Player,
    track: Track | null,
    payload: TrackEndEvent
  ): Promise<void> {
    logger.debug(
      `[Player: ${player.guildId}] Track ended: ${track?.info?.title || 'Unknown'} (Reason: ${payload.reason})`
    )

    if (payload.reason !== 'finished' || !track) return

    captureTrackPlay(bot, player, track)
  }
}

export default new TrackEndHandler()
