import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export const name = 'playerMuteChange'

export const execute = async (
  bot: BotClient,
  player: Player,
  selfMuted: boolean,
  serverMuted: boolean
) => {
  logger.info(`[Lavalink:Player] ${player.guildId} :: playerMuteChange ::`, {
    selfMuted,
    serverMuted
  })

  if (serverMuted) {
    player.set('paused_of_servermute', true)
    if (!player.paused) await player.pause()
  } else {
    if (player.get('paused_of_servermute')) {
      if (player.paused) await player.resume()
      player.set('paused_of_servermute', false)
    }
  }
}
