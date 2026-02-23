import type { Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'

const command: Command = {
  name: 'skipto',
  aliases: ['st'],
  description: 'Chuyển đến một bài hát cụ thể trong danh sách chờ',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, args: string[]) {
    if (!message.guild) return

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player || (!player.playing && !player.queue.current)) {
      throw new BotError('Tớ đang không phát bản nhạc nào cả.')
    }

    if (!args[0]) {
      throw new BotError('Vui lòng cung cấp vị trí bài hát muốn chuyển tới (VD: `!skipto 3`).')
    }

    const position = parseInt(args[0], 10)

    if (isNaN(position) || position < 1 || position > player.queue.tracks.length) {
      throw new BotError(
        `Vị trí bài hát không hợp lệ. Vui lòng nhập từ 1 đến ${player.queue.tracks.length}.`
      )
    }

    // Lavalink-client `skipTo` expects the 0-based index of the track in the queue array.
    // e.g. position 1 corresponds to `player.queue.tracks[0]`, so we skip to index 0.
    const index = position - 1
    await player.skip(index)

    const replyMessage = await message
      .reply(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã nhảy đến bài thứ **${position}** trong hàng đợi!`
      )
      .catch((e: Error) => {
        logger.error(e)
        return null
      })

    if (replyMessage) {
      setTimeout(() => {
        replyMessage.delete().catch((e: Error) => logger.error(e))
        message.delete().catch(() => {})
      }, 60000)
    }
  }
}

export default command
