import { Player, WebSocketClosedEvent } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export const name = 'playerSocketClosed'

export const execute = async (bot: BotClient, player: Player, payload: WebSocketClosedEvent) => {
  logger.error(
    `[Lavalink:Player] ${player.guildId} :: Websocket closed unexpectedly. Code: ${payload.code}, Reason: ${payload.reason}`,
    payload
  )
}
