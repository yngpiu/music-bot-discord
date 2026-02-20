import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export const name = 'nodeError'

export const execute = async (
  bot: BotClient,
  node: LavalinkNode,
  error: Error,
  payload: unknown
) => {
  logger.error(
    `[Lavalink: Node] ${node.id} :: ERRORED :: ${error} :: PAYLOAD :: ${JSON.stringify(payload)}`
  )
}
