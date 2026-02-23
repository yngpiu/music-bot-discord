import { ContainerBuilder } from 'discord.js'
import { Player, WebSocketClosedEvent } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, player: Player, payload: WebSocketClosedEvent) => {
  logger.error(
    `[Lavalink:Player] ${player.guildId} :: ERROR: Websocket closed unexpectedly. Code: ${payload.code}, Reason: ${payload.reason} ${JSON.stringify(payload)}`
  )

  // Code 4014 means Discord disconnected the Voice WebSocket. This happens naturally
  // during playerMove and playerDisconnect. We should ignore it to prevent spam.
  if (payload.code === 4014) return

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  const container = new ContainerBuilder().addTextDisplayComponents((t) =>
    t.setContent(
      `${EMOJI.ANIMATED_CAT_BYE} **${bot.user?.displayName || 'tớ'}** đang gặp sự cố, hiện không thể tiếp tục phát nhạc.`
    )
  )

  await channel
    .send({
      components: [container],
      flags: ['IsComponentsV2']
    })
    .catch((e) => { logger.error(e); return null })
}
