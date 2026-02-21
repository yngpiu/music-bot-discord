import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'


export default async (bot: BotClient, player: Player, suppress: boolean) => {
  logger.info(`[Lavalink:Player] ${player.guildId} :: Suppress status changed.`, { suppress })
}
