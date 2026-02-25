import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, player: Player) => {
  logger.info(
    `[Player: ${player.guildId}] Cancelled leave channel schedule because a new track was added`
  )
}
