import { LavalinkNode } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, node: LavalinkNode) => {
  logger.info(`[Lavalink Node: ${node.id}] Đã kết nối thành công tới server âm thanh!`)
}
