/**
 * @file playerDebug.ts
 * @description Forwards Lavalink player-level debug events to the application logger.
 */
import { DebugEvents } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for player debug messages.
 */
class PlayerDebugEvent extends LavalinkEvent {
  name = 'playerDebug'

  /**
   * Filters and logs debug information from the Lavalink client.
   * @param {BotClient} _bot - The Discord client instance (unused).
   * @param {string} eventKey - The type of debug event.
   * @param {any} eventData - The associated debug data.
   */
  async execute(_bot: BotClient, eventKey: string, eventData: any): Promise<void> {
    // Suppress noisy startup warnings.
    if (
      eventKey === DebugEvents.NoAudioDebug &&
      eventData.message === 'Manager is not initated yet'
    )
      return

    // Suppress redundant successful update logs.
    if (eventKey === DebugEvents.PlayerUpdateSuccess && eventData.state === 'log') return

    logger.debug(`[Lavalink Debug: ${eventKey}]`, eventData)
  }
}

export default new PlayerDebugEvent()
