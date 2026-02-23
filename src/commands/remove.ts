import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'

const command: Command = {
  name: 'remove',
  aliases: ['rm', 'delete', 'del'],
  description: 'Xóa một bài hát khỏi danh sách chờ dựa theo vị trí',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, args: string[]) {
    if (!message.guild) return

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player || player.queue.tracks.length === 0) {
      throw new BotError('Danh sách chờ đang trống nên tớ không có bài nào để xóa cả.')
    }

    if (!args[0]) {
      throw new BotError('Vui lòng cung cấp vị trí bài hát muốn xóa. (VD: `!remove 1`)')
    }

    const position = parseInt(args[0], 10)

    if (isNaN(position) || position < 1 || position > player.queue.tracks.length) {
      throw new BotError(
        `Vị trí bài hát không hợp lệ, vui lòng nhập từ 1 đến ${player.queue.tracks.length}.`
      )
    }

    // Lavalink-client `remove` expects the 0-based index of the track in the queue array.
    const index = position - 1

    // `remove` returns an object with a `removed` array of tracks
    const result = await player.queue.remove(index)

    if (!result || !result.removed.length) {
      throw new BotError('Đã xảy ra lỗi khi cố xóa bài hát này khỏi thẻ điều phối.')
    }

    const removedTrackInfo = result.removed[0].info

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã xóa **[${removedTrackInfo.title}](${removedTrackInfo.uri})** khỏi hàng đợi.`
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
      setTimeout(() => {
        replyMessage.delete().catch((e: Error) => logger.error(e))
        message.delete().catch((e: Error) => logger.error(e))
      }, 10000)
    }
  }
}

export default command
