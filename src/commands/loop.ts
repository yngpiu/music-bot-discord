// Command to toggle the player's repeat mode (off, track, or queue).
import type { Message } from 'discord.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessMessage } from '~/utils/messageUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Command to cycle through repeat modes.
class LoopCommand extends BaseCommand {
  name = 'loop'
  aliases = ['l', 'repeat']
  description = 'Bật/tắt chế độ lặp lại (lặp 1 bài, lặp toàn bộ hoặc tắt)'
  requiresVoice = true

  // Executes the loop command, cycling the player's repeat mode.
  async execute(
    bot: BotClient,
    message: Message,
    _args: string[],
    { player }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(`[Command: loop] User ${message.author.tag} requested to toggle loop mode`)

    const currentMode = player.repeatMode

    let nextMode: 'off' | 'track' | 'queue'
    let modeText: string

    // Toggle logic for repeat modes.
    if (currentMode === 'off') {
      nextMode = 'track'
      modeText = 'Lặp lại bài hát hiện tại'
    } else if (currentMode === 'track') {
      nextMode = 'queue'
      modeText = 'Lặp lại toàn bộ danh sách chờ'
    } else {
      nextMode = 'off'
      modeText = 'Tắt chế độ lặp'
    }

    await player.setRepeatMode(nextMode)

    let messageText: string
    if (nextMode === 'track') {
      messageText = `${getBotName(bot)} đã **chuyển** chế độ lặp thành \`${modeText}\`.`
    } else if (nextMode === 'queue') {
      messageText = `${getBotName(bot)} đã **chuyển** chế độ lặp thành \`${modeText}\`.`
    } else {
      messageText = `${getBotName(bot)} đã **tắt** chế độ lặp.`
    }

    await replySuccessMessage(message, messageText)
  }
}

export default new LoopCommand()
