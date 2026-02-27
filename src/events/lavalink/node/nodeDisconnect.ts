// Event handler for when a Lavalink node disconnects from the audio server.
import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

// Event handler for the 'nodeDisconnect' event.
class NodeDisconnectEvent extends LavalinkEvent {
  name = 'nodeDisconnect'

  // Logs a warning when a node disconnects, including the reason and error code if available.
  async execute(bot: BotClient, node: LavalinkNode, reason: { code?: number; reason?: string }): Promise<void> {
    logger.warn(
      `[Lavalink Node: ${node.id}] Node disconnected. Reason: ${reason.reason || 'Unknown'} (Code: ${reason.code || 'None'})`
    )
  }
}

export default new NodeDisconnectEvent()
