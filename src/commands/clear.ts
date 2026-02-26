/**
 * @file clear.ts
 * @description Command to clear all tracks from the current music queue.
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
 * Command to empty the queue.
 */
class ClearCommand extends BaseCommand {
  name = 'clear'
  aliases = ['c', 'cq', 'empty']
  description = 'Xóa toàn bộ bài hát trong sách chờ.'
  requiresOwner = true

  /**
   * Removes all tracks from the player's queue.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Message} message - The command message.
   * @param {string[]} _args - Command arguments (unused).
   * @param {CommandContext} context - The command execution context.
   */
  async execute(bot: BotClient, message: Message, _args: string[], { player }: CommandContext): Promise<void> {
    logger.info(`[Command: clear] User ${message.author.tag} requested to clear queue`)

    if (player.queue.tracks.length === 0) {
      throw new BotError('Danh sách phát hiện tại đang trống.')
    }

    // Additional check to ensure the user has permission to clear the queue.
    const owner = player.get('owner')
    if (owner && message.author.id !== owner) {
      throw new BotError(
        'Chỉ **người đang có quyền điều khiển cao nhất** mới có quyền dùng lệnh này.'
      )
    }

    const trackCount = player.queue.tracks.length

    // Clear the queue.
    await player.queue.splice(0, trackCount)

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã dọn sạch **${trackCount}** bài hát khỏi hàng đợi.`
      )
    )

    const replyMessage = await message
      .reply({
        components: [container],
        flags: ['IsComponentsV2']
      })

      .catch((e) => {
        logger.warn('[Command: clear] Error sending notification:', e)
        return null
      })

    if (replyMessage) {
      deleteMessage([replyMessage, message], TIME.SHORT)
    }
  }
}

export default new ClearCommand()
