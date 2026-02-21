import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (
  bot: BotClient,
  node: LavalinkNode,
  reason: { code?: number; reason?: string }
) => {
  logger.warn(
    `[Lavalink:Node] ${node.id} :: Disconnected from the Lavalink server. Code: ${reason.code ?? 'Unknown'}, Reason: ${reason.reason ?? 'No reason provided'}.`
  )
}
