import { EmbedBuilder, type Message } from 'discord.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { LyricsManager } from '~/core/LyricsManager.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import {
  safeReplyMessage,
  safeReplySuccessMessage,
  sendTypingMessage
} from '~/utils/messageUtil.js'
import { getBotAvatar } from '~/utils/stringUtil.js'

// Command to fetch static lyrics or enable live lyrics.
class LyricsCommand extends BaseCommand {
  name = 'lyrics'
  aliases = ['ly']
  description =
    'Xem lời tĩnh hoặc bật/tắt chế độ Live Lyrics (Karaoke) (`!lyrics on` | `!lyrics off`)'
  requiresVoice = true

  async execute(
    bot: BotClient,
    message: Message,
    args: string[],
    { player }: CommandContext
  ): Promise<void> {
    await sendTypingMessage(message)
    logger.info(`[Command: lyrics] User ${message.author.tag} requested lyrics. Args: ${args}`)

    if (!player.queue.current) {
      throw new BotError('Danh sách phát hiện tại đang trống.')
    }

    const commandArg = args[0]?.toLowerCase()
    const mgr = LyricsManager.for(player, bot)

    // Toggle live lyrics ON
    if (commandArg === 'on') {
      if (mgr.isEnabled) {
        throw new BotError('Chế độ **Live Lyrics** đã được bật sẵn.')
      }

      player.set('liveLyrics', true)
      mgr.setChannel(message.channel.id)

      await player.subscribeLyrics().catch(() => {})
      await safeReplySuccessMessage(message, 'Đã **bật** chế độ **Live Lyrics**.')
      return
    }

    // Toggle live lyrics OFF
    if (commandArg === 'off') {
      if (!mgr.isEnabled) {
        throw new BotError('Chế độ **Live Lyrics** đang không được bật.')
      }

      player.set('liveLyrics', false)
      await player.unsubscribeLyrics().catch(() => {})
      await mgr.cleanup()

      await safeReplySuccessMessage(message, 'Đã **tắt** chế độ **Live Lyrics**.')
      return
    }

    // Fetch static lyrics
    const lyrics = await player.getCurrentLyrics().catch(() => null)

    if (!lyrics) {
      throw new BotError('Không tìm thấy lời cho bài hát này.')
    }

    let description: string
    if (lyrics.lines && lyrics.lines.length > 0) {
      description = lyrics.lines.map((l) => l.line).join('\n')
    } else if (lyrics.text) {
      description = lyrics.text
    } else {
      throw new BotError('Không tìm thấy lời cho bài hát này.')
    }

    // If lyrics are too long, split them into chunks. Discord max embed description is 4096.
    const maxLen = 4000
    const chunks: string[] = []
    let remaining = description

    while (remaining.length > 0) {
      if (remaining.length > maxLen) {
        // Try to split at the last newline before maxLen
        let splitIndex = remaining.lastIndexOf('\n', maxLen)
        if (splitIndex === -1) {
          splitIndex = maxLen
        }
        chunks.push(remaining.substring(0, splitIndex))
        remaining = remaining.substring(splitIndex).trimStart()
      } else {
        chunks.push(remaining)
        break
      }
    }

    const embeds = chunks.map((chunk, index) => {
      const embed = new EmbedBuilder().setColor('#1DB954').setDescription(chunk)

      if (index === 0) {
        embed.setAuthor({
          name: `Lời bài hát: ${player.queue.current!.info.title}`,
          iconURL: getBotAvatar(bot)
        })
      }

      if (index === chunks.length - 1) {
        embed.setFooter({ text: `Nguồn: ${lyrics.provider || lyrics.sourceName}` })
      }

      return embed
    })

    // Take up to 10 chunks to avoid Discord embed limit
    await safeReplyMessage(message, {
      embeds: embeds.slice(0, 10),
      flags: ['SuppressNotifications']
    })
  }
}

export default new LyricsCommand()
