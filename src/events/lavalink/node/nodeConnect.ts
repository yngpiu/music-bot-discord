import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

class NodeConnectEvent extends LavalinkEvent {
  name = 'nodeConnect'

  async execute(bot: BotClient, node: LavalinkNode) {
  logger.info(`[Lavalink Node: ${node.id}] Successfully connected to audio server!`)
}
}

export default new NodeConnectEvent()
