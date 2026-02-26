/**
 * @file playerUpdate.ts
 * @description Event handler for periodic player state updates from Lavalink.
 */
import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

/**
 * Event handler for the 'playerUpdate' event.
 */
class PlayerUpdateEvent extends LavalinkEvent {
  name = 'playerUpdate'

  /**
   * Placeholder for handling periodic player state updates (position, etc.).
   * @param {BotClient} _bot - The Discord client instance.
   * @param {Player} _player - The Lavalink player instance.
   */
  async execute(_bot: BotClient, _player: Player) {}
}

export default new PlayerUpdateEvent()
