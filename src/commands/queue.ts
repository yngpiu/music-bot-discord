import type { Message, User } from 'discord.js'
import { EmbedBuilder } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { formatDuration } from '~/utils/stringUtil.js'

const command: Command = {
  name: 'queue',
  aliases: ['q', 'list'],
  description: 'Hiển thị danh sách phát nhạc hiện tại',
  requiresVoice: false,

  async execute(bot: BotClient, message: Message) {
    if (!message.guild) return

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player || (!player.playing && !player.queue.current)) {
      throw new BotError('Tớ đang không phát bản nhạc nào cả.')
    }

    const { current, tracks } = player.queue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildTrackString = (track: any, indexStr: string) => {
      const authorLink = track.pluginInfo?.artistUrl
      const authorStr = authorLink
        ? `[**${track.info.author}**](${authorLink})`
        : `**${track.info.author}**`

      const requester = track.requester as User
      const requesterStr = requester?.id ? `<@${requester.id}>` : 'Không xác định'

      const firstLine = indexStr
        ? `${indexStr} **\\[${formatDuration(track.info.duration ?? 0)}\\]** **[${track.info.title}](${track.info.uri})** bởi ${authorStr}`
        : `**\\[${formatDuration(track.info.duration ?? 0)}\\]** **[${track.info.title}](${track.info.uri})** bởi ${authorStr}`

      return `${firstLine}\n${EMOJI.CORNER} Yêu cầu bởi: ${requesterStr}`
    }

    const descLines: string[] = []

    // Lấy tối đa 10 bài tiếp theo
    const nextTracksNum = Math.min(10, tracks.length)
    if (nextTracksNum > 0) {
      for (let i = 0; i < nextTracksNum; i++) {
        descLines.push(buildTrackString(tracks[i], `${i + 1}.`))
      }

      if (tracks.length > 10) {
        descLines.push(`\n*...và ${tracks.length - 10} bài hát nữa*`)
      }
    } else {
      descLines.push('Không có bài hát nào trong hàng đợi.')
    }

    // Current track
    if (current) {
      descLines.push('\n**0. Đang phát**')
      descLines.push(buildTrackString(current, ''))
    }

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setAuthor({
        name: `Danh sách chờ của ${message.guild.name} - [ ${tracks.length} bài hát ]`,
        iconURL: message.guild.iconURL() ?? undefined
      })
      .setDescription(descLines.join('\n'))

    let replyMessage
    if (message.channel.isTextBased() && 'send' in message.channel) {
      replyMessage = await message.channel.send({ embeds: [embed] }).catch(() => null)
    }

    if (replyMessage) {
      setTimeout(() => {
        replyMessage.delete().catch(() => {})
        message.delete().catch(() => {})
      }, 30000)
    }
  }
}

export default command
