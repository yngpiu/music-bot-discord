import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export const name = 'playerVoiceLeave'

 
export const execute = async (bot: BotClient, player: Player, userId: string) => {
  logger.info(`[Lavalink:Player] ${player.guildId} :: playerVoiceLeave :: user ${userId}`)
}
