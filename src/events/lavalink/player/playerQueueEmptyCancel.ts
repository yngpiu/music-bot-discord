import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, player: Player) => {
  logger.info(`[Player: ${player.guildId}] Đã huỷ lịch hẹn rời kênh do có nhạc mới được thêm`)
}
