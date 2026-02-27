// Command to jump/seek to a specific time in the currently playing track.
import type { Message } from 'discord.js'
import { config } from '~/config/env'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { reactLoadingMessage, replySuccessMessage } from '~/utils/messageUtil.js'
import { formatDuration, getBotName } from '~/utils/stringUtil.js'

// Parses a time string (e.g., "1:30" or "90") into milliseconds.
function parseTime(timeStr: string): number {
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':')
    const m = parseInt(parts[0], 10) || 0
    const s = parseInt(parts[1], 10) || 0
    return (m * 60 + s) * 1000
  }
  return parseInt(timeStr, 10) * 1000
}

// Command to move the playback position.
class SeekCommand extends BaseCommand {
  name = 'seek'
  aliases = ['fw', 'rw']
  description = 'Tua bài hát đến một thời gian cụ thể'
  requiresVoice = true

  // Executes the seek command.
  async execute(
    bot: BotClient,
    message: Message,
    args: string[],
    { player }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    if (!player.queue.current) {
      throw new BotError('Danh sách phát hiện tại đang trống.')
    }

    if (!args[0]) {
      throw new BotError(
        `Cú pháp: \`${config.prefix}seek <thời gian>\`\nVD: \`${config.prefix}seek 1:30\` | \`${config.prefix}seek 90\``
      )
    }

    const currentTrack = player.queue.current

    // Check if the current track supports seeking (e.g., skip livestreams).
    if (!currentTrack.info.isSeekable) {
      throw new BotError('Bài hát này (có thể là Livestream) không hỗ trợ tua.')
    }

    const seekMs = parseTime(args[0])
    if (isNaN(seekMs)) {
      throw new BotError('Định dạng thời gian không hợp lệ.')
    }

    const duration = currentTrack.info.duration ?? 0

    // Ensure the seek target is within the track's duration.
    if (seekMs < 0 || seekMs > duration) {
      throw new BotError(`Thời gian tua phải nằm từ 1 đến ${formatDuration(duration)}.`)
    }

    await player.seek(seekMs)

    await replySuccessMessage(
      message,
      `${getBotName(bot)} đã tua bài hát đến mốc **${formatDuration(seekMs)}**.`
    )
  }
}

export default new SeekCommand()
