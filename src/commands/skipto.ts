import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

const command: Command = {
  name: 'skipto',
  aliases: ['st', 'nextto', 'nt'],
  description: 'Chuyển đến một bài hát cụ thể trong danh sách chờ.',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, args: string[]) {
    if (!message.guild) return
    logger.info(
      `[Lệnh: skipto] Người dùng ${message.author.tag} yêu cầu chuyển tới bài số ${args[0] || 'trống'}`
    )

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player) {
      throw new BotError('Tớ đang không hoạt động trong kênh nào cả.')
    }

    if (!player.playing && !player.queue.current) {
      throw new BotError(`Tớ đang không phát bản nhạc nào cả.`)
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
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã **nhảy đến** bài thứ **${position}** trong hàng đợi.`
      )
    )

    const replyMessage = await message
      .reply({
        components: [container],
        flags: ['IsComponentsV2']
      })
       
      .catch((e) => {
        logger.warn(`[Lệnh: skipto] Lỗi gửi thông báo:`, e)
        return null
      })

    if (replyMessage) {
      deleteMessage([replyMessage, message], TIME.SHORT)
    }
  }
}

export default command
