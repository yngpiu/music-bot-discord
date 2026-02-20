import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export const name = 'nodeDisconnect'

export const execute = async (
  bot: BotClient,
  node: LavalinkNode,
  reason: { code?: number; reason?: string }
) => {
  logger.info(`[Lavalink: Node] ${node.id} :: DISCONNECT :: \nReason: ${JSON.stringify(reason)}`)
}
