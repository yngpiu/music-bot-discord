import { EmbedBuilder, type Message, type TextChannel } from 'discord.js'

import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { isDeveloperOrServerOwner } from '~/utils/permissionUtil.js'

const command: Command = {
  name: 'notify',
  aliases: ['thongbao'],
  description: 'Gửi thông báo đến tất cả các kênh đang phát nhạc (Chỉ dành cho Owner).',
  requiresVoice: false,

  async execute(bot: BotClient, message: Message, args: string[]) {
    // Kiểm tra quyền Owner
    if (!isDeveloperOrServerOwner(message)) {
      throw new BotError('Bạn không có quyền sử dụng lệnh này.')
    }

    const content = args.join(' ')
    if (!content) {
      throw new BotError('Vui lòng nhập nội dung thông báo.')
    }
    logger.info(
      `[Command: notify] Owner ${message.author.tag} requested to send notification: ${content.substring(0, 50)}...`
    )

    // Tạo embed thông báo
    const notifyEmbed = new EmbedBuilder()
      .setAuthor({
        name: `Thông báo từ ${message.author.displayName || message.author.username}`,
        iconURL: message.author.displayAvatarURL({ size: 128 })
      })
      .setDescription(content)
      .setTimestamp()

    let successCount = 0
    let failCount = 0

    if (message.guildId) {
      // Chỉ gửi thông báo đến các bot đang phát nhạc TẠI SERVER HIỆN TẠI
      for (const b of bot.manager.bots) {
        const player = b.lavalink.getPlayer(message.guildId)
        if (!player || !player.textChannelId) continue

        const channel = b.channels.cache.get(player.textChannelId) as TextChannel | undefined
        if (channel && channel.isTextBased()) {
          try {
            await channel.send({ embeds: [notifyEmbed] })
            successCount++
          } catch (err) {
            logger.error(
              `[Command: notify] Error sending notification to channel ${channel.id}:`,
              err
            )
            failCount++
          }
        }
      }
    }

    const replyEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setDescription(
        `Đã gửi thông báo đến **${successCount}** kênh.` +
          (failCount > 0 ? ` (Lỗi ${failCount} kênh)` : '')
      )

    await message.reply({ embeds: [replyEmbed] })
  }
}

export default command
