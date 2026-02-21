import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export const name = 'playerDeafChange'

 
export const execute = async (
  bot: BotClient,
  player: Player,
  selfDeaf: boolean,
  serverDeaf: boolean
) => {
  logger.info(`[Lavalink:Player] ${player.guildId} :: playerDeafChange ::`, {
    selfDeaf,
    serverDeaf
  })
}
