import { EmbedBuilder, type Message } from 'discord.js'

import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { formatDuration } from '~/utils/stringUtil.js'

function generateProgressBar(current: number, total: number, barLength = 20): string {
  if (total === 0) return `[${'🔘'.padEnd(barLength, '▬')}]`
  const progress = Math.min(Math.max(current / total, 0), 1)
  const pos = Math.round(progress * barLength)
  const before = '▬'.repeat(pos)
  const after = '▬'.repeat(barLength - pos)
  return `[${before}🔘${after}]`
}

const command: Command = {
  name: 'nowplaying',
  aliases: ['np', 'current'],
  description: 'Hiển thị bài hát đang phát cùng tiến trình nghe',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message) {
    if (!message.guild) return

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player || !player.queue.current) {
      throw new BotError('Tớ đang không phát bản nhạc nào cả.')
    }

    const currentTrack = player.queue.current
    const duration = currentTrack.info.duration ?? 0
    const position = player.position ?? 0

    const progressBar = generateProgressBar(position, duration)
    const timeDisplay = `${formatDuration(position)} / ${currentTrack.info.isStream ? 'LIVE' : formatDuration(duration)}`

    const embed = new EmbedBuilder()
      .setColor(0x00c2e6)
      .setAuthor({
        name: 'Đang phát hiện tại',
        iconURL: bot.user?.displayAvatarURL()
      })
      .setThumbnail(currentTrack.info.artworkUrl ?? null)
      .addFields(
        {
          name: 'Bài hát',
          value: `**[${currentTrack.info.title}](${currentTrack.info.uri ?? 'https://github.com/yngpiu'})**${
            currentTrack.info.author ? ` bởi **${currentTrack.info.author}**` : ''
          }`,
          inline: false
        },
        {
          name: 'Tiến trình',
          value: `\`${progressBar}\`\n${timeDisplay}`,
          inline: false
        }
      )

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
