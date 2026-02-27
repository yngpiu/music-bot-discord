// Command to restart the current track from the beginning.
import type { Message } from 'discord.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessMessage } from '~/utils/messageUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Command to replay the current track.
class ReplayCommand extends BaseCommand {
  name = 'replay'
  aliases = ['restart', 'rp']
  description = 'Phát lại bài hát hiện tại từ đầu (0:00).'
  requiresVoice = true

  // Executes the replay command by seeking the player to position 0.
  async execute(
    bot: BotClient,
    message: Message,
    _args: string[],
    { player }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(`[Command: replay] User ${message.author.tag} requested to replay track`)

    if (!player.queue.current) {
      throw new BotError('Danh sách phát hiện tại đang trống.')
    }

    const currentTrack = player.queue.current

    // Verify that the track supports seeking.
    if (currentTrack.info.isStream || !currentTrack.info.isSeekable) {
      throw new BotError('Không thể phát lại từ đầu đối với luồng Livestream/Radio.')
    }

    await player.seek(0)

    await replySuccessMessage(
      message,
      `${getBotName(bot)} đã **tua lại** bài hát **${currentTrack.info.title}** từ đầu.`
    )
  }
}

export default new ReplayCommand()
