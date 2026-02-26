import { LavalinkNode } from 'lavalink-client'

import type { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

class NodeDestroyEvent extends LavalinkEvent {
  name = 'nodeDestroy'

  async execute(_bot: BotClient, node: LavalinkNode) {
    logger.warn(`[Lavalink Node: ${node.id}] Node has been destroyed`)
  }
}

export default new NodeDestroyEvent()
