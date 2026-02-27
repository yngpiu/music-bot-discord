// Command to disconnect the bot from its current voice channel.
import { type Message } from 'discord.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

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
    logger.info(`[Command: leave] User ${message.author.tag} requested bot to leave channel`)

    // Shutdown the player and disconnect from voice.
    await player.destroy()
  }
}

export default new LeaveCommand()
