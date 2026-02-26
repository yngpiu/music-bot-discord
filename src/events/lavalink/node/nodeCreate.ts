/**
 * @file nodeCreate.ts
 * @description Event handler for when a new Lavalink node instance is created.
 */
import { LavalinkNode } from 'lavalink-client'

import type { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'nodeCreate' event.
 */
class NodeCreateEvent extends LavalinkEvent {
  name = 'nodeCreate'

  /**
   * Logs a message when a new node is initialized.
   * @param {BotClient} _bot - The Discord client instance (unused).
   * @param {LavalinkNode} node - The created Lavalink node.
   */
  async execute(_bot: BotClient, node: LavalinkNode) {
    logger.info(`[Lavalink Node: ${node.id}] Initialized new node`)
  }
}

export default new NodeCreateEvent()
