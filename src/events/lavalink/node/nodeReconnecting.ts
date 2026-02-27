// Event handler for when a Lavalink node is attempting to reconnect.
import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

// Event handler for the 'nodeReconnecting' event.
class NodeReconnectingEvent extends LavalinkEvent {
  name = 'nodeReconnecting'

  // Logs a message when a node starts reconnecting.
  async execute(bot: BotClient, node: LavalinkNode): Promise<void> {
    logger.info(`[Lavalink Node: ${node.id}] Reconnecting...`)
  }
}

export default new NodeReconnectingEvent()
