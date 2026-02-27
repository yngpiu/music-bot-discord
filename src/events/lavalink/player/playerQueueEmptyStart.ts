// Event handler for when the bot's queue becomes empty. Starts a countdown to leave the voice channel.
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { TIME } from '~/constants/time'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { sendContainerMessage } from '~/utils/messageUtil'
import { getBotName } from '~/utils/stringUtil.js'

// Event handler for the 'playerQueueEmptyStart' event.
class PlayerQueueEmptyStartEvent extends LavalinkEvent {
  name = 'playerQueueEmptyStart'

  // Notifies the server about the upcoming departure and stores the message ID for later deletion.
  async execute(bot: BotClient, player: Player, delayMs: number): Promise<void> {
    logger.info(
      `[Player: ${player.guildId}] Queue empty, starting timer to leave channel (${delayMs}ms)`
    )

    const channel = bot.channels.cache.get(player.textChannelId!)

    // Reset any existing message ID.
    player.set('queueEmptyMessageId', null)

    const message = await sendContainerMessage(
      channel,
      `
      ${EMOJI.ANIMATED_CAT_BLINK} Hết nhạc rồi, **${getBotName(bot)}** sẽ rời đi trong <t:${Math.round((Date.now() + delayMs) / 1000)}:R> nếu không thấy yêu cầu nào.
    `,
      TIME.VERY_LONG
    )

    if (message) {
      player.set('queueEmptyMessageId', message.id)
    }
  }
}

export default new PlayerQueueEmptyStartEvent()
