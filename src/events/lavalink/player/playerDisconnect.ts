import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'


export default async (bot: BotClient, player: Player, voiceChannelId: string) => {
  logger.info(
    `[Lavalink:Player] ${player.guildId} :: Disconnected from voice channel <#${voiceChannelId}>.`
  )
}
