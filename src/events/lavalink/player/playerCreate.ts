import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, player: Player) => {
  const owner = player.get<string | null>('owner')
  logger.info(
    `[Lavalink:Player] ${player.guildId} :: Player instance created for the guild. Owner: ${owner || 'None'}.`
  )
}
