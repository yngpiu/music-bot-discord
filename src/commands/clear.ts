import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

class ClearCommand extends BaseCommand {
  name = 'clear'
  aliases = ['c', 'cq', 'empty']
  description = 'Xóa toàn bộ bài hát trong sách chờ.'
  requiresOwner = true

  async execute(bot: BotClient, message: Message, _args: string[], { player }: CommandContext) {
    logger.info(`[Command: clear] User ${message.author.tag} requested to clear queue`)

    if (player.queue.tracks.length === 0) {
      throw new BotError('Danh sách phát hiện tại đang trống.')
    }

    const owner = player.get('owner')
    if (owner && message.author.id !== owner) {
      throw new BotError(
        'Chỉ **người đang có quyền điều khiển cao nhất** mới có quyền dùng lệnh này.'
      )
    }

    const trackCount = player.queue.tracks.length
    // Xóa toàn bộ tracks
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
