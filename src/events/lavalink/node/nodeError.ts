// Event handler for when a Lavalink node encounters an error.
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

// Event handler for the 'nodeError' event.
class NodeErrorEvent extends LavalinkEvent {
  name = 'nodeError'

  // Logs an error message when a node encounters an issue.
  async execute(
    _bot: BotClient,
    node: import('lavalink-client').LavalinkNode,
    error: Error
  ): Promise<void> {
    logger.error(`[Lavalink Node: ${node.id}] Node error:`, error)
  }
}

export default new NodeErrorEvent()
