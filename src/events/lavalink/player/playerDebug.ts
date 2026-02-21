import { DebugEvents } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

// import { logger } from '~/utils/logger.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async (_bot: BotClient, eventKey: string, eventData: any) => {
  // skip specific log
  if (eventKey === DebugEvents.NoAudioDebug && eventData.message === 'Manager is not initated yet')
    return
  // skip specific event log of a log-level-state "log"
  if (eventKey === DebugEvents.PlayerUpdateSuccess && eventData.state === 'log') return

  return
  // logger.debug(`[Lavalink-Client-Debug] [${eventKey}]`, eventData)
}
