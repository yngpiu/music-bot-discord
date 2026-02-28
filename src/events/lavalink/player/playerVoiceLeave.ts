import type { Player } from 'lavalink-client'

import type { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

// Event handler for the 'playerVoiceLeave' event.
class PlayerVoiceLeaveEvent extends LavalinkEvent {
  name = 'playerVoiceLeave'

  // Clears the "Chủ xị" if they leave the voice channel.
  async execute(bot: BotClient, player: Player, userId: string): Promise<void> {
    const currentOwnerId = player.get<string>('owner')

    if (currentOwnerId === userId) {
      player.set('owner', null)
      logger.info(
        `[Player: ${player.guildId}] Owner ${userId} left the voice channel. "Chủ xị" status cleared.`
      )
    }
  }
}

export default new PlayerVoiceLeaveEvent()
