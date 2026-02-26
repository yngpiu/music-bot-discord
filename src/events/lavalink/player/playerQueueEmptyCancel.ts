/**
 * @file playerQueueEmptyCancel.ts
 * @description Event handler for when the queue-empty leave timer is cancelled due to new tracks being added.
 */
import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'playerQueueEmptyCancel' event.
 */
class PlayerQueueEmptyCancelEvent extends LavalinkEvent {
  name = 'playerQueueEmptyCancel'

  /**
   * Logs a message indicating that the leave timer has been cancelled.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Player} player - The Lavalink player instance.
   */
  async execute(bot: BotClient, player: Player) {
    logger.info(
      `[Player: ${player.guildId}] Cancelled leave channel schedule because a new track was added`
    )
  }
}

export default new PlayerQueueEmptyCancelEvent()
