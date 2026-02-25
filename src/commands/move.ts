import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'
import { TIME } from '~/constants/time.js'

const command: Command = {
  name: 'move',
  aliases: ['m', 'mv'],
  description: 'Di chuyển vị trí của một bài hát trong danh sách chờ.',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, args: string[]) {
    if (!message.guild) return

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player) {
      throw new BotError('Tớ đang không hoạt động trong kênh nào cả.')
    }

    if (player.queue.tracks.length < 2) {
      throw new BotError('Danh sách chờ cần có ít nhất 2 bài hát.')
    }

    if (!args[0]) {
      throw new BotError(
        'Cú pháp không hợp lệ. Ví dụ: `move 5` (đưa bài 5 lên đầu) hoặc `move 5 2` (đưa bài 5 lên vị trí 2)'
      )
    }

    const fromPos = parseInt(args[0], 10)
    let toPos = args[1] ? parseInt(args[1], 10) : 1

    const queueLength = player.queue.tracks.length

    if (isNaN(fromPos) || fromPos < 1 || fromPos > queueLength) {
      throw new BotError(`Vị trí bài hát cần di chuyển phải từ 1 đến ${queueLength}.`)
    }

    if (isNaN(toPos) || toPos < 1) {
      toPos = 1
    } else if (toPos > queueLength) {
      toPos = queueLength
    }

    if (fromPos === toPos) {
      throw new BotError('Bài hát đã ở sẵn vị trí đó rồi.')
    }

    const fromIndex = fromPos - 1
    const toIndex = toPos - 1

    const trackToMove = player.queue.tracks[fromIndex]

    // Cắt bài hát ra khỏi mảng
    player.queue.splice(fromIndex, 1)

    // Nhét bài hát vào vị trí mới
    player.queue.splice(toIndex, 0, trackToMove)

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã di chuyển bài hát **${trackToMove.info.title}** từ vị trí **${fromPos}** sang vị trí **${toPos}**.`
      )
    )

    const replyMessage = await message
      .reply({
        components: [container],
        flags: ['IsComponentsV2']
      })
      .catch((e) => {
        logger.error(e)
        return null
      })

    if (replyMessage) {
      deleteMessage([replyMessage, message], TIME.SHORT)
    }
  }
}

export default command
