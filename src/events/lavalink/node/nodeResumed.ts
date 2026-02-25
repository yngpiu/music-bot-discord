import { LavalinkNode, LavalinkPlayer } from 'lavalink-client'

import { logger } from '~/utils/logger.js'

export default async (
  node: LavalinkNode,
  payload: { resumed: boolean; sessionId: string; op: 'ready' },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  players: LavalinkPlayer[]
) => {
  logger.info(
    `[Lavalink Node: ${node.id}] Đã khôi phục kết nối thành công với session: ${payload.sessionId}`
  )
}
