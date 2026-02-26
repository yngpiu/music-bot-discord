import { LavalinkNode } from 'lavalink-client'

import type { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

class NodeCreateEvent extends LavalinkEvent {
  name = 'nodeCreate'

  async execute(_bot: BotClient, node: LavalinkNode) {
    logger.info(`[Lavalink Node: ${node.id}] Initialized new node`)
  }
}

export default new NodeCreateEvent()
