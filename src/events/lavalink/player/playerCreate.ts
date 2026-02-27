// Event handler for when a new Lavalink player is initialized for a guild. Sets up initial state and SponsorBlock.
import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

// Event handler for the 'playerCreate' event.
class PlayerCreateEvent extends LavalinkEvent {
  name = 'playerCreate'

  // Initializes player settings such as voice state ignore and SponsorBlock segments.
  async execute(bot: BotClient, player: Player): Promise<void> {
    logger.info(`[Player: ${player.guildId}] Initialized player for server`)

    // Temporary ignore voice state updates during initialization to prevent race conditions.
    player.set('ignore_voice_state', true)
    setTimeout(() => {
      if (player) player.set('ignore_voice_state', false)
    }, 3000)

    // Enable SponsorBlock to skip non-music segments.
    try {
      await player.setSponsorBlock([
        'sponsor',
        'selfpromo',
        'interaction',
        'intro',
        'outro',
        'preview',
        'music_offtopic',
        'filler'
      ])
    } catch (e) {
      logger.warn(`[Player: ${player.guildId}] Error enabling SponsorBlock:`, e)
    }
  }
}

export default new PlayerCreateEvent()
