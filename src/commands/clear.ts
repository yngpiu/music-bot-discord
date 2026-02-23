import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'

const command: Command = {
  name: 'clear',
  aliases: ['c', 'empty'],
  description: 'Xóa toàn bộ bài hát trong sách chờ (Yêu cầu quyền người gọi lệnh)',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message) {
    if (!message.guild) return

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player || player.queue.tracks.length === 0) {
      throw new BotError('Danh sách chờ đang trống sẵn rồi.')
    }

    const owner = player.get('owner')
    if (owner && message.author.id !== owner) {
      throw new BotError('Chỉ có người gọi tớ vào phòng mới được quyền xóa toàn bộ hàng đợi.')
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
