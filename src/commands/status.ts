// Command to display the current status of the music player, including volume, filters, and repeat mode.
import { EmbedBuilder, type Message } from 'discord.js'

import { TIME } from '~/constants/time.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'
import { formatTrack, getBotAvatar } from '~/utils/stringUtil.js'

// Command to show comprehensive player information.
class StatusCommand extends BaseCommand {
  name = 'status'
  aliases = ['state', 'info']
  description = 'Hiển thị các trạng thái của trình phát nhạc (lặp, tự động phát, âm lượng, ...).'
  requiresVoice = true

  // Executes the status command, gathering state from the player instance.
  async execute(bot: BotClient, message: Message, _args: string[], { player }: CommandContext): Promise<void> {
    logger.info(`[Command: status] User ${message.author.tag} requested bot status`)

    const currentMode = player.repeatMode
    const isAutoplayEnabled = player.get<boolean>('autoplay') ?? false
    const isPaused = player.paused
    const volume = player.volume

    // Determine the active audio filter.
    const fm = player.filterManager
    let activeFilter = 'Không'
    if (fm.equalizerBands.some((b) => b.band === 0 && b.gain === 0.25)) activeFilter = 'Bassboost'
    else if (fm.filters.nightcore) activeFilter = 'Nightcore'
    else if (fm.filters.vaporwave) activeFilter = 'Vaporwave'
    else if (fm.filters.karaoke) activeFilter = 'Karaoke'
    else if (fm.filters.rotation) activeFilter = '8D Audio'
    else if (fm.filters.tremolo) activeFilter = 'Tremolo'
    else if (fm.filters.vibrato) activeFilter = 'Vibrato'
    else if (fm.filters.lowPass) activeFilter = 'LowPass'

    let repeatText = 'Tắt'
    if (currentMode === 'track') repeatText = 'Lặp 1 bài'
    else if (currentMode === 'queue') repeatText = 'Lặp toàn bộ'

    // Construct status embed.
    const embed = new EmbedBuilder()
      .setColor(0x00c2e6)
      .setAuthor({
        name: 'Trạng thái Trình phát',
        iconURL: getBotAvatar(bot)})
      .addFields(
        { name: 'Trạng thái', value: isPaused ? 'Tạm dừng' : 'Đang phát', inline: true },
        { name: 'Âm lượng', value: `${volume}%`, inline: true },
        { name: 'Hiệu ứng', value: activeFilter, inline: true },
        { name: 'Chế độ lặp', value: repeatText, inline: true },
        { name: 'Tự động phát', value: isAutoplayEnabled ? 'Bật' : 'Tắt', inline: true }
      )

    // Add current track info if available.
    if (player.queue.current) {
      embed.setDescription(
        `**Đang phát:** ${formatTrack({
          title: player.queue.current.info.title,
          trackLink: player.queue.current.info.uri,
          author: player.queue.current.info.author
        })}`
      )
    } else {
      embed.setDescription('Không có bài hát nào đang phát.')
    }

    const replyMessage = await message
      .reply({
        embeds: [embed]
      })

      .catch((e) => {
        logger.warn(`[Command: status] Error sending notification:`, e)
        return null
      })

    if (replyMessage) {
      deleteMessage([replyMessage, message], TIME.MEDIUM)
    }
  }
}

export default new StatusCommand()
