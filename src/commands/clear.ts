// Command to clear all tracks from the current music queue.
import type { Message } from 'discord.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessMessage } from '~/utils/messageUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Command to empty the queue.
class ClearCommand extends BaseCommand {
  name = 'clear'
  aliases = ['c', 'cq', 'empty']
  description = 'Xóa toàn bộ bài hát trong sách chờ.'
  requiresOwner = true

  // Removes all tracks from the player's queue.
  async execute(
    bot: BotClient,
    message: Message,
    _args: string[],
    { player }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(`[Command: clear] User ${message.author.tag} requested to clear queue`)

    if (player.queue.tracks.length === 0) {
      throw new BotError('Danh sách phát hiện tại đang trống.')
    }

    // Additional check to ensure the user has permission to clear the queue.
    const owner = player.get('owner')
    if (owner && message.author.id !== owner) {
      throw new BotError('Chỉ **Chủ xị** mới có quyền dùng lệnh này.')
    }

    const trackCount = player.queue.tracks.length

    // Clear the queue.
    await player.queue.splice(0, trackCount)

    await replySuccessMessage(
      message,
      `${getBotName(bot)} đã dọn sạch **${trackCount}** bài hát khỏi hàng đợi.`
    )
  }
}

export default new ClearCommand()
