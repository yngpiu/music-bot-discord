/**
 * @file skipto.ts
 * @description Command to skip to a specific track index in the queue.
 */
import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

/**
 * Command for jumping to a specific position in the queue.
 */
class SkiptoCommand extends BaseCommand {
  name = 'skipto'
  aliases = ['st', 'nextto', 'nt']
  description = 'Chuyển đến một bài hát cụ thể trong danh sách chờ.'
  requiresVoice = true

  /**
   * Executes the skipto command.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Message} message - The command message.
   * @param {string[]} args - Command arguments containing the target position.
   * @param {CommandContext} context - The command execution context.
   */
  async execute(bot: BotClient, message: Message, args: string[], { player }: CommandContext) {
    logger.info(
      `[Lệnh: skipto] Người dùng ${message.author.tag} yêu cầu chuyển tới bài số ${args[0] || 'trống'}`
    )

    if (!player.playing && !player.queue.current) {
      throw new BotError(`Tớ đang không phát bản nhạc nào cả.`)
    }

    if (!args[0]) {
      throw new BotError('Vui lòng cung cấp vị trí bài hát muốn chuyển tới.')
    }

    const position = parseInt(args[0], 10)

    // Validate the target position against the current queue length.
    if (isNaN(position) || position < 1 || position > player.queue.tracks.length) {
      throw new BotError(
        `Vị trí bài hát không hợp lệ, vui lòng nhập từ 1 đến ${player.queue.tracks.length}.`
      )
    }

    // Skip to the specified track. Original tracks before it will be removed.
    await player.skip(position)

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã **nhảy đến** bài thứ **${position}** trong hàng đợi.`
      )
    )

    const replyMessage = await message
      .reply({
        components: [container],
        flags: ['IsComponentsV2']
      })

      .catch((e) => {
        logger.warn(`[Command: skipto] Error sending notification:`, e)
        return null
      })

    if (replyMessage) {
      deleteMessage([replyMessage, message], TIME.SHORT)
    }
  }
}

export default new SkiptoCommand()
