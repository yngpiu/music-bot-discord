import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export const name = 'playerMove'

export const execute = async (
  bot: BotClient,
  player: Player,
  oldVoiceChannelId: string,
  newVoiceChannelId: string
) => {
  logger.info(
    `[Lavalink:Player] ${player.guildId} :: Moved from voice channel <#${oldVoiceChannelId}> to <#${newVoiceChannelId}>.`
  )
}
