import { LavalinkNode } from 'lavalink-client'

import { logger } from '~/utils/logger.js'


export default async (node: LavalinkNode) => {
  logger.info(`[Lavalink:Node] ${node.id} :: Node initialized in memory. Preparing connection...`)
}
