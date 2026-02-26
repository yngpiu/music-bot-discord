import { DebugEvents } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

class PlayerDebugEvent extends LavalinkEvent {
  name = 'playerDebug'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async execute(_bot: BotClient, eventKey: string, eventData: any) {
    // skip specific log
    if (
      eventKey === DebugEvents.NoAudioDebug &&
      eventData.message === 'Manager is not initated yet'
    )
      return
    // skip specific event log of a log-level-state "log"
    if (eventKey === DebugEvents.PlayerUpdateSuccess && eventData.state === 'log') return

    logger.debug(`[Lavalink Debug: ${eventKey}]`, eventData)
  }
}

export default new PlayerDebugEvent()
