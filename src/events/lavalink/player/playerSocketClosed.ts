/**
 * @file playerSocketClosed.ts
 * @description Event handler for when the voice WebSocket connection is closed.
 */
import { ContainerBuilder } from 'discord.js'
import { Player, WebSocketClosedEvent } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'playerSocketClosed' event.
 */
class PlayerSocketClosedEvent extends LavalinkEvent {
  name = 'playerSocketClosed'

  /**
   * Logs the error and notifies the text channel if the closure was unexpected (ignoring normal cleanups).
   * @param {BotClient} bot - The Discord client instance.
   * @param {Player} player - The Lavalink player instance.
   * @param {WebSocketClosedEvent} payload - The WebSocket close event payload.
   */
  async execute(bot: BotClient, player: Player, payload: WebSocketClosedEvent) {
    // 4014 usually means the bot was kicked or disconnected normally.
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
