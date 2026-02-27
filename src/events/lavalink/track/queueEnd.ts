// Event handler for when the queue has completely finished playing (last track ended).
import { Player, Track, TrackEndEvent } from 'lavalink-client'
import { captureTrackPlay } from '~/services/trackService.js'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

// Event handler for the 'queueEnd' event.
class QueueEndEvent extends LavalinkEvent {
  name = 'queueEnd'

  // Records the final track play and performs cleanup when the queue ends.
  async execute(
    bot: BotClient,
    player: Player,
    track: Track | null,
    payload: TrackEndEvent
  ): Promise<void> {
    logger.debug(
      `[Player: ${player.guildId}] queueEnd event triggered because the last track finished`
    )

    if (payload?.reason !== 'finished' || !track) return

    captureTrackPlay(bot, player, track)
  }
}

export default new QueueEndEvent()
