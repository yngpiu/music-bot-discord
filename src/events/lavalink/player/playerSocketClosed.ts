import { ContainerBuilder } from 'discord.js'
import { Player, WebSocketClosedEvent } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

class PlayerSocketClosedEvent extends LavalinkEvent {
  name = 'playerSocketClosed'

  async execute(bot: BotClient, player: Player, payload: WebSocketClosedEvent) {
  // Code 4014 means Discord disconnected the Voice WebSocket. This happens naturally
  // during playerMove and playerDisconnect. We should ignore it to prevent spam.
  if (payload.code === 4014) return
  logger.error(
    `[Player: ${player.guildId}] Voice WebSocket unexpectedly closed: Code ${payload.code}, Reason: ${payload.reason}`
  )
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

    .catch((e) => {
      logger.warn(`[Player: ${player.guildId}] Error announcing WebSocket issue:`, e)
      return null
    })
}
}

export default new PlayerSocketClosedEvent()
