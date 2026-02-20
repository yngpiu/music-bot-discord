import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export const name = 'playerDisconnect'

export const execute = async (bot: BotClient, player: Player, voiceChannelId: string) => {
  logger.info(`[Lavalink: Player] ${player.guildId} :: DISCONNECTED :: from VC: ${voiceChannelId}`)
}
