/**
 * @file nodeConnect.ts
 * @description Event handler for when a Lavalink node successfully connects to the audio server.
 */
import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'nodeConnect' event.
 */
class NodeConnectEvent extends LavalinkEvent {
  name = 'nodeConnect'

  /**
   * Logs a success message when a node connects.
   * @param {BotClient} bot - The Discord client instance.
   * @param {LavalinkNode} node - The connected Lavalink node.
   */
  async execute(bot: BotClient, node: LavalinkNode): Promise<void> {
    logger.info(`[Lavalink Node: ${node.id}] Successfully connected to audio server!`)
  }
}

export default new NodeConnectEvent()
