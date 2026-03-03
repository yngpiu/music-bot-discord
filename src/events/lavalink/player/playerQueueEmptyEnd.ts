// Event handler for when the bot actually leaves the voice channel after the queue-empty timer expires.
import { TextChannel } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { safeDeleteMessageNow, safeSendMessageWithContainer } from '~/utils/messageUtil'
import { getBotName } from '~/utils/stringUtil.js'

// Event handler for the 'playerQueueEmptyEnd' event.
class PlayerQueueEmptyEndEvent extends LavalinkEvent {
  name = 'playerQueueEmptyEnd'

  // Deletes the timer notification and sends a final goodbye message.
  async execute(bot: BotClient, player: Player): Promise<void> {
    logger.info(`[Player: ${player.guildId}] No new tracks, leaving channel`)

    const channel = bot.channels.cache.get(player.textChannelId!)
    if (!channel?.isTextBased() || !('send' in channel)) return

    const msgId = player.get<string | null>('queueEmptyMessageId')

    if (msgId) {
      const msg = await (channel as TextChannel).messages.fetch(msgId).catch(() => null)
      if (msg) await safeDeleteMessageNow([msg])
      player.set('queueEmptyMessageId', null)
    }

    await safeSendMessageWithContainer(
      channel,
      `${EMOJI.ANIMATED_CAT_BYE} Không thấy yêu cầu nào nữa, ${getBotName(bot)} đã rời đi.`
    )
  }
}

export default new PlayerQueueEmptyEndEvent()
