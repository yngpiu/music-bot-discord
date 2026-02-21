import { logger } from '~/utils/logger.js'
import { LavalinkNode } from 'lavalink-client'



export default async (node: LavalinkNode) => {
  logger.info(`[Lavalink:Node] ${node.id} :: Node has been destroyed and removed from the manager.`)
}
