import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, node: LavalinkNode, payload: unknown) => {
  logger.debug(`[Lavalink Node: ${node.id}] Nhận raw payload:`, payload)
}
