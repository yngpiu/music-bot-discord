/**
 * @file nodeError.ts
 * @description Event handler for when a Lavalink node encounters an error.
 */
import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'nodeError' event.
 */
class NodeErrorEvent extends LavalinkEvent {
  name = 'nodeError'

  /**
   * Logs an error message when a node encounters an issue.
   * @param {BotClient} _bot - The Discord client instance (unused).
   * @param {LavalinkNode} node - The Lavalink node that errored.
   * @param {Error} error - The error object.
   * @param {unknown} _payload - Additional error payload (unused).
   */
  async execute(_bot: BotClient, node: LavalinkNode, error: Error, _payload: unknown) {
    logger.error(`[Lavalink Node: ${node.id}] Node error:`, error)
  }
}

export default new NodeErrorEvent()
