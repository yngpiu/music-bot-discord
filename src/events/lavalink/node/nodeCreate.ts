import { logger } from '~/utils/logger.js'
import { LavalinkNode } from 'lavalink-client'



export default async (node: LavalinkNode) => {
  logger.info(`[Lavalink:Node] ${node.id} :: Node initialized in memory. Preparing connection...`)
}
