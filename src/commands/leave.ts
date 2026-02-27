// Command to disconnect the bot from its current voice channel.
import { type Message } from 'discord.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessMessage } from '~/utils/messageUtil.js'

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

    // Shutdown the player and disconnect from voice.
    await player.destroy()
    await replySuccessMessage(message, `\${getBotName(bot)} đã rời khỏi kênh thoại.`)
  }
}

export default new LeaveCommand()
