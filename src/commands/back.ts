// Command to play the previous track in the queue history.

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessMessage } from '~/utils/messageUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Command to navigate back to the previous track.
class BackCommand extends BaseCommand {
  name = 'back'
  aliases = ['b', 'previous', 'prev']
  description = 'Quay lại bài hát trước đó.'
  requiresVoice = true

  // Executes the back command, moving the current track to the front of the queue and playing the previous one.
  async execute(
    bot: BotClient,
    message: Message,
    _args: string[],
    { player }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(`[Command: back] User ${message.author.tag} requested to play previous track`)

    if (!player.queue.previous || player.queue.previous.length === 0) {
      throw new BotError('Không có bài hát nào trước đó để quay lại.')
    }

    // Retrieve and remove the last track from history.
    const previousTrack = await player.queue.shiftPrevious()

    if (!previousTrack) {
      throw new BotError('Không thể lấy bài hát trước đó.')
    }

    // Push the current track back to the start of the queue so it can be played again later.
    if (player.queue.current) {
      await player.queue.add(player.queue.current, 0)
    }

    // Play the previous track.
    await player.play({ clientTrack: previousTrack })

    await replySuccessMessage(
      message,
      `**${getBotName(bot)}** đang phát lại bài **${previousTrack.info.title}**.`
    )
  }
}

export default new BackCommand()
