// Administrative command to broadcast a notification message to all active player text channels.
import { EmbedBuilder, type Message, type TextChannel } from 'discord.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage } from '~/utils/messageUtil.js'
import { isDeveloperOrServerOwner } from '~/utils/permissionUtil.js'

// Command for broadcasting announcements to active music bot instances.
class NotifyCommand extends BaseCommand {
  name = 'notify'
  aliases = ['thongbao']
  description = 'Gửi thông báo đến tất cả các kênh đang phát nhạc (Chỉ dành cho Owner).'
  requiresVoice = false

  // Executes the notification recruitment broadcast.
  async execute(bot: BotClient, message: Message, args: string[]): Promise<void> {
    await reactLoadingMessage(message)
    // Permission check: only developers or server owners can broadcast.
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

    const notifyEmbed = new EmbedBuilder()
      .setAuthor({
        name: `Thông báo từ ${message.author.displayName || message.author.username}`,
        iconURL: message.author.displayAvatarURL({ size: 128 })
      })
      .setDescription(content)
      .setTimestamp()

    let successCount = 0
    let failCount = 0

    // Iterate through all managed bots and send announcement to active player text channels.
    if (message.guildId) {
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

    // Feedback to the command user.
    const replyEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setDescription(
        `Đã gửi thông báo đến **${successCount}** kênh.` +
          (failCount > 0 ? ` (Lỗi ${failCount} kênh)` : '')
      )

    await message.reply({ embeds: [replyEmbed] })
  }
}

export default new NotifyCommand()
