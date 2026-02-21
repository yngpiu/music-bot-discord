import { Player, Track } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'


export default async (bot: BotClient, player: Player, track: Track | null) => {
  logger.info(
    `[Lavalink:Engine] ${player.guildId} :: Finished playing track: ${track?.info?.title || 'Unknown'}.`
  )
}
