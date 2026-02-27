// Event handler for when the voice WebSocket connection is closed.
import { Player, WebSocketClosedEvent } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { sendContainerMessage } from '~/utils/messageUtil'
import { getBotName } from '~/utils/stringUtil.js'

// Event handler for the 'playerSocketClosed' event.
class PlayerSocketClosedEvent extends LavalinkEvent {
  name = 'playerSocketClosed'

  // Logs the error and notifies the text channel if the closure was unexpected (ignoring normal cleanups).
  async execute(bot: BotClient, player: Player, payload: WebSocketClosedEvent): Promise<void> {
    // 4014 usually means the bot was kicked or disconnected normally.
    if (payload.code === 4014) return

    logger.error(
      `[Player: ${player.guildId}] Voice WebSocket unexpectedly closed: Code ${payload.code}, Reason: ${payload.reason}`
    )
    const channel = bot.channels.cache.get(player.textChannelId!)

    await sendContainerMessage(
      channel,
      `${EMOJI.ANIMATED_CAT_BYE} **${getBotName(bot)}** đang gặp sự cố, hiện không thể tiếp tục phát nhạc.`
    )
  }
}

export default new PlayerSocketClosedEvent()
