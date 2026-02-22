import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

// IGNORE
export default async (bot: BotClient, player: Player) => {
  logger.info(
    `[Lavalink:Player] ${player.guildId} :: Queue no longer empty. Disconnect timer cancelled.`
  )
}
