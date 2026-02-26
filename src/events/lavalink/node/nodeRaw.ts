/**
 * @file nodeRaw.ts
 * @description Event handler for raw payloads received from a Lavalink node.
 */
import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'nodeRaw' event.
 */
class NodeRawEvent extends LavalinkEvent {
  name = 'nodeRaw'

  /**
   * Logs raw payloads for debugging purposes.
   * @param {BotClient} bot - The Discord client instance.
   * @param {LavalinkNode} node - The Lavalink node that sent the payload.
   * @param {unknown} payload - The raw payload data.
   */
  async execute(bot: BotClient, node: LavalinkNode, payload: unknown): Promise<void> {
    logger.debug(`[Lavalink Node: ${node.id}] Received raw payload:`, payload)
  }
}

export default new NodeRawEvent()
