// Command to skip to a specific track index in the queue.
import type { Message } from 'discord.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessMessage } from '~/utils/messageUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Command for jumping to a specific position in the queue.
class SkiptoCommand extends BaseCommand {
  name = 'skipto'
  aliases = ['st', 'nextto', 'nt']
  description = 'Chuyển đến một bài hát cụ thể trong danh sách chờ.'
  requiresVoice = true

  // Executes the skipto command.
  async execute(
    bot: BotClient,
    message: Message,
    args: string[],
    { player, prefix }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(
      `[Lệnh: skipto] Người dùng ${message.author.tag} yêu cầu chuyển tới bài số ${args[0] || 'trống'}`
    )

    if (!player.playing && !player.queue.current) {
      throw new BotError(`${getBotName(bot)} đang không phát bản nhạc nào cả.`)
    }

    if (!args[0]) {
      throw new BotError(
        `Cú pháp: \`${prefix}skipto <1-${player.queue.tracks.length}>\`\nVD: \`${prefix}skipto 5\``
      )
    }

    const position = parseInt(args[0], 10)

    // Validate the target position against the current queue length.
    if (isNaN(position) || position < 1 || position > player.queue.tracks.length) {
      throw new BotError(`Vui lòng nhập từ 1 đến ${player.queue.tracks.length}.`)
    }

    // Skip to the specified track. Original tracks before it will be removed.
    await player.skip(position)

    await replySuccessMessage(
      message,
      `${getBotName(bot)} đã **nhảy đến** bài thứ **${position}** trong hàng đợi.`
    )
  }
}

export default new SkiptoCommand()
