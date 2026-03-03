// Command to disconnect the bot from its current voice channel.
import { type Message, TextChannel } from 'discord.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import {
  reactLoadingMessage,
  safeDeleteMessageNow,
  safeReplySuccessMessage
} from '~/utils/messageUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Command to make the bot leave the voice channel and clear its state.
class LeaveCommand extends BaseCommand {
  name = 'leave'
  aliases = ['lv', 'dc', 'disconnect', 'stop']
  description = 'Yêu cầu bot rời khỏi kênh thoại hiện tại.'
  requiresVoiceMatch = true
  requiresOwner = true

  // Destroys the player and sends a goodbye message.
  async execute(
    bot: BotClient,
    message: Message,
    _args: string[],
    { player }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(`[Command: leave] User ${message.author.tag} requested bot to leave channel`)

    // Delete queue empty message if exists
    const queueEmptyMessageId = player.get<string | null>('queueEmptyMessageId')
    if (queueEmptyMessageId) {
      const channel = bot.channels.cache.get(player.textChannelId!)
      if (channel?.isTextBased()) {
        const msg = await (channel as TextChannel).messages
          .fetch(queueEmptyMessageId)
          .catch(() => null)
        if (msg) await safeDeleteMessageNow(msg)
      }
      player.set('queueEmptyMessageId', null)
    }

    // Shutdown the player and disconnect from voice.
    await player.destroy()
    await safeReplySuccessMessage(message, `${getBotName(bot)} đã rời khỏi kênh thoại.`)
  }
}

export default new LeaveCommand()
