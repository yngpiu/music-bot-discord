import { LavalinkNode } from 'lavalink-client'

import { logger } from '~/utils/logger.js'

export const name = 'nodeCreate'

export const execute = async (node: LavalinkNode) => {
  logger.info(`[Lavalink:Node] ${node.id} :: Node initialized in memory. Preparing connection...`)
}
