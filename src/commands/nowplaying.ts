import { EmbedBuilder, type Message } from 'discord.js'

import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'

const command: Command = {
  name: 'nowplaying',
  aliases: ['np', 'current'],
  description: 'Hiển thị thông tin bài hát đang phát.',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message) {
    if (!message.guild) return

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player) {
      throw new BotError('Tớ đang không hoạt động trong kênh nào cả.')
    }

    if (!player.queue.current) {
      throw new BotError('Danh sách phát hiện tại đang trống.')
    }

    const currentTrack = player.queue.current

    const embed = new EmbedBuilder()
      .setColor(0x00c2e6)
      .setAuthor({
        name: 'Đang phát hiện tại',
        iconURL: bot.user?.displayAvatarURL()
      })
      .setThumbnail(currentTrack.info.artworkUrl ?? null)
      .addFields({
        name: 'Bài hát',
        value: `**[${currentTrack.info.title}](${currentTrack.info.uri ?? 'https://github.com/yngpiu'})**${
          currentTrack.info.author ? ` bởi **${currentTrack.info.author}**` : ''
        }`,
        inline: false
      })

    const replyMessage = await message
      .reply({
        embeds: [embed]
      })
      .catch((e) => {
        logger.error(e)
        return null
      })

    if (replyMessage) {
      // Cho thời gian đọc board dài hơn (20s) trước khi xóa
      setTimeout(() => {
        replyMessage.delete().catch((e: Error) => logger.error(e))
        message.delete().catch((e: Error) => logger.error(e))
      }, 20000)
    }
  }
}

export default command
