import { EmbedBuilder, type Message } from 'discord.js'

import { TIME } from '~/constants/time.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'
import { formatTrack } from '~/utils/stringUtil.js'

const command: Command = {
  name: 'nowplaying',
  aliases: ['np', 'current'],
  description: 'Hiển thị thông tin bài hát đang phát.',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, _args: string[], { player }: CommandContext) {
    logger.info(`[Command: nowplaying] User ${message.author.tag} requested to view current track`)

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
        value: formatTrack({
          title: currentTrack.info.title,
          trackLink: currentTrack.info.uri ?? 'https://github.com/yngpiu',
          author: currentTrack.info.author
        }),
        inline: false
      })

    const replyMessage = await message
      .reply({
        embeds: [embed]
      })

      .catch((e) => {
        logger.warn(`[Command: nowplaying] Error sending notification:`, e)
        return null
      })

    if (replyMessage) {
      // Cho thời gian đọc board dài hơn (20s) trước khi xóa
      deleteMessage([replyMessage, message], TIME.MEDIUM)
    }
  }
}

export default command
