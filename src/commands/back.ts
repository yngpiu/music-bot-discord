import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

const command: Command = {
  name: 'back',
  aliases: ['b', 'previous', 'prev'],
  description: 'Quay lại bài hát trước đó.',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, _args: string[], { player }: CommandContext) {
    logger.info(`[Command: back] User ${message.author.tag} requested to play previous track`)

    if (!player.queue.previous || player.queue.previous.length === 0) {
      throw new BotError('Không có bài hát nào trước đó để quay lại.')
    }

    // Lấy bài trước đó ra khỏi lịch sử
    const previousTrack = await player.queue.shiftPrevious()

    if (!previousTrack) {
      throw new BotError('Không thể lấy bài hát trước đó.')
    }

    // Nếu đang phát dở 1 bài, đẩy nó ngược lại lên đầu danh sách chờ
    if (player.queue.current) {
      await player.queue.add(player.queue.current, 0)
    }

    // Yêu cầu player phát bài cũ
    await player.play({ clientTrack: previousTrack })

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đang phát lại bài **${previousTrack.info.title}**.`
      )
    )

    const replyMessage = await message
      .reply({
        components: [container],
        flags: ['IsComponentsV2']
      })

      .catch((e) => {
        logger.warn('[Command: back] Error sending notification:', e)
        return null
      })

    if (replyMessage) {
      deleteMessage([replyMessage, message], TIME.SHORT)
    }
  }
}

export default command
