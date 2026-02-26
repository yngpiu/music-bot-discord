import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

class PlayerQueueEmptyCancelEvent extends LavalinkEvent {
  name = 'playerQueueEmptyCancel'

  async execute(bot: BotClient, player: Player) {
  logger.info(
    `[Player: ${player.guildId}] Cancelled leave channel schedule because a new track was added`
  )
}
}

export default new PlayerQueueEmptyCancelEvent()
