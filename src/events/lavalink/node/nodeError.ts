import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async (bot: BotClient, node: LavalinkNode, error: Error, payload: unknown) => {
  logger.error(`[Lavalink Node: ${node.id}] Node error:`, error)
}
