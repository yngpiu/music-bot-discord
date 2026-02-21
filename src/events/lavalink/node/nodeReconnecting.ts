import { logger } from '~/utils/logger.js'
import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'



export default async (bot: BotClient, node: LavalinkNode) => {
  logger.info(`[Lavalink:Node] ${node.id} :: Reconnecting to the Lavalink server...`)
}
