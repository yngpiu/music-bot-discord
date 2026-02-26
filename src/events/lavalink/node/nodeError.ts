import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

class NodeErrorEvent extends LavalinkEvent {
  name = 'nodeError'

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_bot: BotClient, node: LavalinkNode, error: Error, _payload: unknown) {
    logger.error(`[Lavalink Node: ${node.id}] Node error:`, error)
  }
}

export default new NodeErrorEvent()
