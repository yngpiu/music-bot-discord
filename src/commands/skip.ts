// Command to skip the current track and move to the next one in the queue.
import type { Message } from 'discord.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessMessage } from '~/utils/messageUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Command to skip the currently playing track.
class SkipCommand extends BaseCommand {
  name = 'skip'
  aliases = ['s', 'n', 'next']
  description = 'Bỏ qua bài hát hiện tại để phát bài tiếp theo.'
  requiresVoice = true

  // Executes the skip command.
  async execute(
    bot: BotClient,
    message: Message,
    _args: string[],
    { player }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(`[Command: skip] User ${message.author.tag} requested to skip track`)

    if (!player.playing && !player.queue.current) {
      throw new BotError(`\${getBotName(bot)} đang không phát bản nhạc nào cả.`)
    }

    await player.skip(0, false)

    await replySuccessMessage(message, `${getBotName(bot)} đã **bỏ qua** bài hát hiện tại.`)
  }
}

export default new SkipCommand()
