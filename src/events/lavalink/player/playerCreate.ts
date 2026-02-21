import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export const name = 'playerCreate'

export const execute = async (bot: BotClient, player: Player) => {
  logger.info(`[Lavalink:Player] ${player.guildId} :: Player instance created for the guild.`)
}
