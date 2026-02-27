// Event handler for when the bot's deafen status changes in a voice channel.
import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

// Event handler for the 'playerDeafChange' event.
class PlayerDeafChangeEvent extends LavalinkEvent {
  name = 'playerDeafChange'

  // Sends a notification message when the bot is deafened or undeafened by a server admin.
  async execute(
    bot: BotClient,
    player: Player,
    _selfDeaf: boolean,
    _serverDeaf: boolean
  ): Promise<void> {
    logger.debug(
      `[Player: ${player.guildId}] playerDeafChange event triggered. selfDeaf: ${_selfDeaf}, serverDeaf: ${_serverDeaf}`
    )
  }
}

export default new PlayerDeafChangeEvent()
