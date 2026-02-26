import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

class NodeReconnectingEvent extends LavalinkEvent {
  name = 'nodeReconnecting'

  async execute(bot: BotClient, node: LavalinkNode) {
  logger.info(`[Lavalink Node: ${node.id}] Reconnecting...`)
}
}

export default new NodeReconnectingEvent()
