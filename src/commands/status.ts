import { EmbedBuilder, type Message } from 'discord.js'

import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { formatTrack } from '~/utils/stringUtil'

const command: Command = {
  name: 'status',
  aliases: ['state', 'info'],
  description: 'Hiển thị các trạng thái của trình phát nhạc (lặp, tự động phát, âm lượng, ...).',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message) {
    if (!message.guild) return

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player) {
      throw new BotError('Tớ đang không hoạt động trong kênh nào cả.')
    }

    const currentMode = player.repeatMode
    const isAutoplayEnabled = player.get<boolean>('autoplay') ?? false
    const isPaused = player.paused
    const volume = player.volume

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

    const embed = new EmbedBuilder()
      .setColor(0x00c2e6)
      .setAuthor({
        name: 'Trạng thái Trình phát',
        iconURL: bot.user?.displayAvatarURL()
      })
      .addFields(
        { name: 'Trạng thái', value: isPaused ? 'Tạm dừng' : 'Đang phát', inline: true },
        { name: 'Âm lượng', value: `${volume}%`, inline: true },
        { name: 'Hiệu ứng', value: activeFilter, inline: true },
        { name: 'Chế độ lặp', value: repeatText, inline: true },
        { name: 'Tự động phát', value: isAutoplayEnabled ? 'Bật' : 'Tắt', inline: true }
      )

    if (player.queue.current) {
      embed.setDescription(
        `**Đang phát:** ${formatTrack({
          title: player.queue.current.info.title,
          trackLink: player.queue.current.info.uri
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
        logger.error(e)
        return null
      })

    if (replyMessage) {
      setTimeout(() => {
        replyMessage.delete().catch((e: Error) => logger.error(e))
        message.delete().catch((e: Error) => logger.error(e))
      }, 20000)
    }
  }
}

export default command
