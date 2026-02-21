import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export const name = 'nodeConnect'

export const execute = async (bot: BotClient, node: LavalinkNode) => {
  logger.info(
    `[Lavalink:Node] ${node.id} :: Successfully connected to the Lavalink server. Ready to process audio.`
  )
}
