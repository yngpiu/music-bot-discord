import { LavalinkNode, LavalinkPlayer } from 'lavalink-client'

import type { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

class NodeResumedEvent extends LavalinkEvent {
  name = 'nodeResumed'

  async execute(
    _bot: BotClient,
    node: LavalinkNode,
    payload: { resumed: boolean; sessionId: string; op: 'ready' },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _players: LavalinkPlayer[]
  ) {
    logger.info(`[Lavalink Node: ${node.id}] Successfully resumed session: ${payload.sessionId}`)
  }
}

export default new NodeResumedEvent()
