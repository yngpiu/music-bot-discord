import { ContainerBuilder } from 'discord.js'
import { Player, WebSocketClosedEvent } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, player: Player, payload: WebSocketClosedEvent) => {
  logger.error(
    `[Lavalink:Player] ${player.guildId} :: ERROR: Websocket closed unexpectedly. Code: ${payload.code}, Reason: ${payload.reason} ${JSON.stringify(payload)}`
  )

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  const container = new ContainerBuilder().addTextDisplayComponents((t) =>
    t.setContent(
      `${EMOJI.ANIMATED_IDK} Gặp sự cố kết nối với Lavalink Server! (Code: ${payload.code})`
    )
  )

  await channel
    .send({
      components: [container],
      flags: ['IsComponentsV2', 'SuppressNotifications']
    })
    .catch(() => null)
}
