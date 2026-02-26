import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

class NodeRawEvent extends LavalinkEvent {
  name = 'nodeRaw'

  async execute(bot: BotClient, node: LavalinkNode, payload: unknown) {
  logger.debug(`[Lavalink Node: ${node.id}] Received raw payload:`, payload)
}
}

export default new NodeRawEvent()
