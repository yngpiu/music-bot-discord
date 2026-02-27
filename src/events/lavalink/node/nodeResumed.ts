// Event handler for when a Lavalink node session is successfully resumed.
import { LavalinkNode } from 'lavalink-client'

import type { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

// Event handler for the 'nodeResumed' event.
class NodeResumedEvent extends LavalinkEvent {
  name = 'nodeResumed'

  // Logs a message when a session is successfully resumed.
  async execute(
    _bot: BotClient,
    node: LavalinkNode,
    payload: { resumed: boolean; sessionId: string; op: 'ready' }
  ): Promise<void> {
    logger.info(`[Lavalink Node: ${node.id}] Successfully resumed session: ${payload.sessionId}`)
  }
}

export default new NodeResumedEvent()
