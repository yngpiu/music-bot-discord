// Command to toggle the autoplay feature, which automatically adds recommended tracks when the queue is empty.
import { Message } from 'discord.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessMessage } from '~/utils/messageUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Command to enable or disable the autoplay mode.
class AutoplayCommand extends BaseCommand {
  name = 'autoplay'
  aliases = ['ap', 'endless']
  description = 'Bật/tắt chế độ tự động phát nhạc đề xuất khi hết danh sách chờ.'
  requiresVoice = true

  // Toggles the 'autoplay' state in the player's data store.
  async execute(
    bot: BotClient,
    message: Message,
    _args: string[],
    { player }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(`[Command: autoplay] User ${message.author.tag} requested to toggle autoplay state`)

    const currentAutoplay = player.get<boolean>('autoplay') ?? false

    // Toggle the state.
    player.set('autoplay', !currentAutoplay)

    const isAutoplayEnabled = player.get<boolean>('autoplay')

    const actionText = isAutoplayEnabled
      ? '**bật** chế độ `Tự động phát`'
      : '**tắt** chế độ `Tự động phát`'

    await replySuccessMessage(message, `${getBotName(bot)} đã ${actionText}.`)
  }
}

export default new AutoplayCommand()
