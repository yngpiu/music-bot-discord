import { logger } from '~/utils/logger.js'
import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'



export default async (
  bot: BotClient,
  player: Player,
  oldVoiceChannelId: string,
  newVoiceChannelId: string
) => {
  logger.info(`[Lavalink:Player] ${player.guildId} :: Moved from voice channel <#${oldVoiceChannelId}> to <#${newVoiceChannelId}>.`)
}
