// Forwards Lavalink player-level debug events to the application logger.
import { DebugEvents } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'


// Event handler for player debug messages.
class PlayerDebugEvent extends LavalinkEvent {
  name = 'playerDebug'

  // Filters and logs debug information from the Lavalink client.
  async execute(_bot: BotClient, eventKey: string, eventData: unknown): Promise<void> {
    const data = eventData as Record<string, unknown>
    // Suppress noisy startup warnings.
    if (eventKey === DebugEvents.NoAudioDebug && data.message === 'Manager is not initated yet')
      return

    // Suppress redundant successful update logs.
    if (eventKey === DebugEvents.PlayerUpdateSuccess && data.state === 'log') return

    // logger.debug(`[Lavalink Debug: ${eventKey}]`, eventData)
  }
}

export default new PlayerDebugEvent()
