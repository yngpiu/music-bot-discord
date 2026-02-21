import { LavalinkNode } from 'lavalink-client'

import { logger } from '~/utils/logger.js'


export default async (node: LavalinkNode) => {
  logger.warn(`[Lavalink:Node] ${node.id} :: Node has been destroyed and removed from the manager.`)
}
