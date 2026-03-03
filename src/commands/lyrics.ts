import { EmbedBuilder, type Message, TextChannel } from 'discord.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import {
  reactLoadingMessage,
  safeReplyErrorMessage,
  safeReplyMessage,
  safeReplySuccessMessage
} from '~/utils/messageUtil.js'
import { getBotAvatar } from '~/utils/stringUtil.js'

// Command to fetch static lyrics or enable live lyrics.
class LyricsCommand extends BaseCommand {
  name = 'lyrics'
  aliases = ['ly']
  description = 'Xem lời bài hát hoặc bật chế độ Live Lyrics (Karaoke) (`!lyrics live`)'
  requiresVoice = true

  async execute(
    bot: BotClient,
    message: Message,
    args: string[],
    { player }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(`[Command: lyrics] User ${message.author.tag} requested lyrics. Args: ${args}`)

    if (!player.queue.current) {
      throw new BotError('Danh sách phát hiện tại đang trống.')
    }

    // Toggle live lyrics
    if (args[0]?.toLowerCase() === 'live') {
      const isLive = player.get<boolean>('liveLyrics')

      if (isLive) {
        player.set('liveLyrics', false)
        await player.unsubscribeLyrics().catch(() => {})
        await safeReplySuccessMessage(message, 'Đã **tắt** chế độ Live Lyrics.')
      } else {
        player.set('liveLyrics', true)

        // Setup initial message
        if (message.channel.isTextBased()) {
          const msg = await (message.channel as TextChannel).send({
            content: '🎤 Đang tìm lời bài hát (Live)...'
          })
          player.set('lyricsMessageId', msg.id)
          player.set('lyricsChannelId', message.channel.id)
        }

        await player.subscribeLyrics().catch(() => {})
        await safeReplySuccessMessage(
          message,
          'Đã **bật** chế độ Live Lyrics. Lời bài hát sẽ hiển thị khi có (yêu cầu bài hát có hỗ trợ synced lyrics).'
        )
      }
      return
    }

    // Fetch static lyrics
    const lyrics = await player.getCurrentLyrics().catch(() => null)

    if (!lyrics) {
      await safeReplyErrorMessage(message, 'Không tìm thấy lời cho bài hát này.')
      return
    }

    let description: string
    if (lyrics.lines && lyrics.lines.length > 0) {
      description = lyrics.lines.map((l) => l.line).join('\n')
    } else if (lyrics.text) {
      description = lyrics.text
    } else {
      await safeReplyErrorMessage(message, 'Không tìm thấy lời cho bài hát này.')
      return
    }

    // If lyrics are too long, Discord max embed description is 4096.
    // We can truncate it or send chunks. Let's truncate for simplicity.
    const maxLen = 4000
    if (description.length > maxLen) {
      description = description.substring(0, maxLen) + '\n... (còn tiếp)'
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `Lời bài hát: ${player.queue.current.info.title}`,
        iconURL: getBotAvatar(bot)
      })
      .setDescription(description)
      .setFooter({ text: `Nguồn: ${lyrics.provider || lyrics.sourceName}` })

    await safeReplyMessage(message, {
      embeds: [embed],
      flags: ['SuppressNotifications']
    })
  }
}

export default new LyricsCommand()
