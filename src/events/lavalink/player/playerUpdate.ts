/**
 * @file playerUpdate.ts
 * @description Event handler for periodic player state updates from Lavalink.
 */
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
  async execute(): Promise<void> {}
}

export default new PlayerUpdateEvent()
