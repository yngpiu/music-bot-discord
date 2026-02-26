/**
 * @file nodeDestroy.ts
 * @description Event handler for when a Lavalink node instance is destroyed.
 */
import { LavalinkNode } from 'lavalink-client'

import type { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'nodeDestroy' event.
 */
class NodeDestroyEvent extends LavalinkEvent {
  name = 'nodeDestroy'

  /**
   * Logs a warning when a node is destroyed.
   * @param {BotClient} _bot - The Discord client instance (unused).
   * @param {LavalinkNode} node - The destroyed Lavalink node.
   */
  async execute(_bot: BotClient, node: LavalinkNode): Promise<void> {
    logger.warn(`[Lavalink Node: ${node.id}] Node has been destroyed`)
  }
}

export default new NodeDestroyEvent()
