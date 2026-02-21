import { LavalinkNode, LavalinkPlayer } from 'lavalink-client'

import { logger } from '~/utils/logger.js'


export default async (
  node: LavalinkNode,
  payload: { resumed: boolean; sessionId: string; op: 'ready' },
  players: LavalinkPlayer[]
) => {
  logger.info(
    `[Lavalink:Node] ${node.id} :: RESUMED :: ${Array.isArray(players) ? players.length : players} PLAYERS STILL PLAYING ::`
  )
}
