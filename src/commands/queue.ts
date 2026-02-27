// Command to view the current music queue with interactive pagination.
import type { Message, User } from 'discord.js'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js'
import type { Player } from 'lavalink-client'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage, reactLoadingMessage } from '~/utils/messageUtil.js'
import { formatDuration, formatTrack, getBotAvatar } from '~/utils/stringUtil.js'

// Command to display and navigate through the music queue.
class QueueCommand extends BaseCommand {
  name = 'queue'
  aliases = ['q', 'list']
  description = 'Hiển thị danh sách phát nhạc hiện tại'
  requiresVoice = true

  // Helper to format a single track entry in the queue list.
  private buildTrackString(
    track: import('lavalink-client').Track | import('lavalink-client').UnresolvedTrack,
    indexStr: string
  ): string {
    const trackDisplay = formatTrack({
      title: track.info.title,
      trackLink: track.info.uri,
      author: track.info.author
    })

    const requester = track.requester as User
    const requesterStr = requester?.id ? `<@${requester.id}>` : 'Không xác định'

    const firstLine = indexStr
      ? `${indexStr} **\\[${formatDuration(track.info.duration ?? 0)}\\]** ${trackDisplay}`
      : `**\\[${formatDuration(track.info.duration ?? 0)}\\]** ${trackDisplay}`

    return `${firstLine}\n${EMOJI.CORNER} ${requesterStr}`
  }

  // Parses custom emoji strings into a format usable by ButtonBuilder.
  private parseEmoji(emoji: string): string | { animated: boolean; name: string; id: string } {
    const match = emoji.match(/^<(a?):(\w+):(\d+)>$/)
    if (match) return { animated: !!match[1], name: match[2], id: match[3] }
    return emoji
  }

  // Builds the embed representing a specific page of the queue.
  private buildEmbed(
    bot: BotClient,
    player: Player,
    page: number,
    totalPages: number
  ): EmbedBuilder {
    const { current, tracks } = player.queue
    const start = (page - 1) * 5
    const currentTracks = tracks.slice(start, start + 5)

    const descLines: string[] = currentTracks.length
      ? currentTracks.map((t, i: number) => this.buildTrackString(t, `${start + i + 1}.`))
      : ['Không có bài hát nào...']

    // Include the currently playing track in the description.
    if (current) {
      descLines.push('')
      descLines.push(
        `${EMOJI.ANIMATED_CAT_DANCE} **Đang phát...**\n${this.buildTrackString(current, '')}`
      )
    }

    return new EmbedBuilder()
      .setAuthor({
        name: `Danh sách chờ - ${tracks.length + (current ? 1 : 0)} bài hát`,
        iconURL: getBotAvatar(bot)
      })
      .setDescription(descLines.join('\n'))
      .setFooter({ text: `Trang ${page}/${totalPages}` })
  }

  // Constructs the action row containing pagination buttons.
  private buildNavRow(page: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('queue_first')
        .setEmoji(this.parseEmoji(EMOJI.FIRST))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId('queue_prev')
        .setEmoji(this.parseEmoji(EMOJI.PREV))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId('queue_next')
        .setEmoji(this.parseEmoji(EMOJI.NEXT))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages),
      new ButtonBuilder()
        .setCustomId('queue_last')
        .setEmoji(this.parseEmoji(EMOJI.LAST))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages)
    )
  }

  // Starts a collector to handle interaction with the pagination buttons.
  private startPageCollector(
    bot: BotClient,
    message: Message,
    replyMessage: Message,
    player: Player,
    totalPages: number
  ): void {
    let currentPage = 1

    const collector = replyMessage.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      idle: 60000
    })

    collector.on('collect', async (i) => {
      // Navigate pages based on custom ID.
      if (i.customId === 'queue_first') currentPage = 1
      else if (i.customId === 'queue_prev') currentPage--
      else if (i.customId === 'queue_next') currentPage++
      else if (i.customId === 'queue_last') currentPage = totalPages

      await i
        .update({
          embeds: [this.buildEmbed(bot, player, currentPage, totalPages)],
          components: [this.buildNavRow(currentPage, totalPages)]
        })
        .catch((err) => logger.warn(`[Command: queue] Error updating queue page:`, err))
    })

    collector.on('end', (_collected, reason) => {
      // Cleanup: delete messages if the collector timed out or idled.
      if (reason === 'idle' || reason === 'time') {
        replyMessage.delete().catch(() => {})
        message.delete().catch(() => {})
      }
    })
  }

  // Executes the queue command.
  async execute(
    bot: BotClient,
    message: Message,
    _args: string[],
    { player }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(`[Command: queue] User ${message.author.tag} requested to view queue`)

    if (!player.playing && !player.queue.current) {
      throw new BotError(`Tớ đang không phát bản nhạc nào cả.`)
    }

    const totalPages = Math.ceil(player.queue.tracks.length / 5) || 1

    const replyMessage = await message
      .reply({
        embeds: [this.buildEmbed(bot, player, 1, totalPages)],
        components: totalPages > 1 ? [this.buildNavRow(1, totalPages)] : []
      })
      .catch((e: Error) => {
        logger.warn(`[Command: queue] Error sending notification:`, e)
        return null
      })

    if (!replyMessage) return

    // Initialize interactive navigation if there is more than one page.
    if (totalPages > 1) {
      this.startPageCollector(bot, message, replyMessage, player, totalPages)
    } else {
      deleteMessage([replyMessage, message], TIME.VERY_LONG)
    }
  }
}

export default new QueueCommand()
