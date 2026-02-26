/**
 * @file nodeResumed.ts
 * @description Event handler for when a Lavalink node session is successfully resumed.
 */
import { LavalinkNode, LavalinkPlayer } from 'lavalink-client'

import type { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'nodeResumed' event.
 */
class NodeResumedEvent extends LavalinkEvent {
  name = 'nodeResumed'

  /**
   * Logs a message when a session is successfully resumed.
   * @param {BotClient} _bot - The Discord client instance (unused).
   * @param {LavalinkNode} node - The Lavalink node.
   * @param {object} payload - Resume confirmation payload.
   * @param {LavalinkPlayer[]} _players - List of players associated with the node (unused).
   */
  async execute(
    _bot: BotClient,
    node: LavalinkNode,
    payload: { resumed: boolean; sessionId: string; op: 'ready' },

    _players: LavalinkPlayer[]
  ): Promise<void> {
    logger.info(`[Lavalink Node: ${node.id}] Successfully resumed session: ${payload.sessionId}`)
  }
}

export default new NodeResumedEvent()
