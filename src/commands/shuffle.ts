// Command to randomly reorder the tracks in the current music queue.
import type { Message } from 'discord.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessMessage } from '~/utils/messageUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Command to shuffle the queue.
class ShuffleCommand extends BaseCommand {
  name = 'shuffle'
  aliases = ['sh', 'mix', 'random']
  description = 'Trộn ngẫu nhiên các bài hát trong danh sách chờ.'
  requiresVoice = true

  // Executes the shuffle command.
  async execute(
    bot: BotClient,
    message: Message,
    _args: string[],
    { player }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(`[Command: shuffle] User ${message.author.tag} requested to shuffle queue`)

    if (player.queue.tracks.length < 2) {
      throw new BotError('Danh sách chờ cần có ít nhất 2 bài hát.')
    }

    await player.queue.shuffle()

    await replySuccessMessage(
      message,
      `${getBotName(bot)} đã **trộn** **${player.queue.tracks.length} bài hát** trong hàng chờ.`
    )
  }
}

export default new ShuffleCommand()
