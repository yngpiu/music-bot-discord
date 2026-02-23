import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'

const command: Command = {
  name: 'skipto',
  aliases: ['st', 'nextto', 'nt'],
  description: 'Chuyển đến một bài hát cụ thể trong danh sách chờ',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, args: string[]) {
    if (!message.guild) return

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player || (!player.playing && !player.queue.current)) {
      throw new BotError('Tớ đang không phát bản nhạc nào cả.')
    }

    if (!args[0]) {
      throw new BotError('Vui lòng cung cấp vị trí bài hát muốn chuyển tới.')
    }

    const position = parseInt(args[0], 10)

    if (isNaN(position) || position < 1 || position > player.queue.tracks.length) {
      throw new BotError(
        `Vị trí bài hát không hợp lệ, vui lòng nhập từ 1 đến ${player.queue.tracks.length}.`
      )
    }

    // Lavalink-client `skipTo` actually expects the 1-based position (number of tracks to skip).
    // e.g. position 2 corresponds to skipping 1 track and playing the 2nd.
    await player.skip(position)

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã nhảy đến bài thứ **${position}** trong hàng đợi.`
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
