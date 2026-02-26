/**
 * @file loop.ts
 * @description Command to toggle the player's repeat mode (off, track, or queue).
 */
import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

/**
 * Command to cycle through repeat modes.
 */
class LoopCommand extends BaseCommand {
  name = 'loop'
  aliases = ['l', 'repeat']
  description = 'Bật/tắt chế độ lặp lại (lặp 1 bài, lặp toàn bộ hoặc tắt)'
  requiresVoice = true

  /**
   * Executes the loop command, cycling the player's repeat mode.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Message} message - The command message.
   * @param {string[]} _args - Command arguments (unused).
   * @param {CommandContext} context - The command execution context.
   */
  async execute(bot: BotClient, message: Message, _args: string[], { player }: CommandContext): Promise<void> {
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

    let messageText = ''
    if (nextMode === 'track') {
      messageText = `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã **chuyển** chế độ lặp thành \`${modeText}\`.`
    } else if (nextMode === 'queue') {
      messageText = `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã **chuyển** chế độ lặp thành \`${modeText}\`.`
    } else {
      messageText = `${EMOJI.ANIMATED_CAT_NO_IDEA} **${bot.user?.displayName || 'tớ'}** đã **tắt** chế độ lặp.`
    }

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(messageText)
    )

    const replyMessage = await message
      .reply({
        components: [container],
        flags: ['IsComponentsV2']
      })

      .catch((e) => {
        logger.warn('[Command: loop] Error sending notification:', e)
        return null
      })

    if (replyMessage) {
      deleteMessage([replyMessage, message], TIME.SHORT)
    }
  }
}

export default new LoopCommand()
