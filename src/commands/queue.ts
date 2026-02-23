import type { Message, User } from 'discord.js'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { formatDuration } from '~/utils/stringUtil.js'

const command: Command = {
  name: 'queue',
  aliases: ['q', 'list'],
  description: 'Hiển thị danh sách phát nhạc hiện tại',
  requiresVoice: false,

  async execute(bot: BotClient, message: Message) {
    if (!message.guild) return
    console.log(bot, message)

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

    const totalPages = Math.ceil(tracks.length / 5) || 1
    let currentPage = 1

    const generateEmbed = (page: number) => {
      const descLines: string[] = []
      const start = (page - 1) * 5
      const end = start + 5
      const currentTracks = tracks.slice(start, end)

      if (currentTracks.length > 0) {
        for (let i = 0; i < currentTracks.length; i++) {
          descLines.push(buildTrackString(currentTracks[i], `${start + i + 1}.`))
        }
      } else {
        descLines.push('Không có bài hát nào trong hàng đợi.')
      }

      // Always show current track at the bottom
      if (current) {
        descLines.push('')
        descLines.push(
          `${EMOJI.ANIMATED_CAT_DANCE} **Đang phát...**\n${buildTrackString(current, '')}`
        )
      }

      return new EmbedBuilder()
        .setAuthor({
          name: `Danh sách chờ - ${tracks.length + (current ? 1 : 0)} bài hát`,
          iconURL: bot.user?.displayAvatarURL() || bot.user?.defaultAvatarURL
        })
        .setDescription(descLines.join('\n'))
        .setFooter({
          text: `Trang ${page}/${totalPages} • Yêu cầu bởi ${message.author.displayName}`
        })
    }

    const parseEmoji = (emoji: string) => {
      const match = emoji.match(/^<(a?):(\w+):(\d+)>$/)
      if (match) return { animated: !!match[1], name: match[2], id: match[3] }
      return emoji
    }

    const getRow = (page: number) => {
      const row = new ActionRowBuilder<ButtonBuilder>()
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('queue_first')
          .setEmoji(parseEmoji(EMOJI.FIRST))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId('queue_prev')
          .setEmoji(parseEmoji(EMOJI.PREV))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId('queue_next')
          .setEmoji(parseEmoji(EMOJI.NEXT))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages),
        new ButtonBuilder()
          .setCustomId('queue_last')
          .setEmoji(parseEmoji(EMOJI.LAST))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages)
      )
      return row
    }

    const replyMessage = await message
      .reply({
        embeds: [generateEmbed(currentPage)],
        components: totalPages > 1 ? [getRow(currentPage)] : []
      })
      .catch((e: Error) => {
        logger.error('Error sending queue message:', e)
        return null
      })

    if (!replyMessage) return

    if (totalPages > 1) {
      const collector = replyMessage.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 60000
      })

      collector.on('collect', async (i) => {
        if (i.customId === 'queue_first') currentPage = 1
        else if (i.customId === 'queue_prev') currentPage--
        else if (i.customId === 'queue_next') currentPage++
        else if (i.customId === 'queue_last') currentPage = totalPages

        await i.update({
          embeds: [generateEmbed(currentPage)],
          components: [getRow(currentPage)]
        })
      })

      collector.on('end', () => {
        replyMessage.delete().catch((e: Error) => logger.error(e))
        message.delete().catch(() => {}) // Ignore errors if already deleted
      })
    } else {
      setTimeout(() => {
        replyMessage.delete().catch((e: Error) => logger.error(e))
        message.delete().catch(() => {})
      }, 60000)
    }
  }
}

export default command
