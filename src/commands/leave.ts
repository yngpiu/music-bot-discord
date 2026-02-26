/**
 * @file leave.ts
 * @description Command to disconnect the bot from its current voice channel.
 */
import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

/**
 * Command to make the bot leave the voice channel and clear its state.
 */
class LeaveCommand extends BaseCommand {
  name = 'leave'
  aliases = ['lv', 'dc', 'disconnect', 'stop']
  description = 'Yêu cầu bot rời khỏi kênh thoại hiện tại.'
  requiresVoiceMatch = true
  requiresOwner = true

  /**
   * Destroys the player and sends a goodbye message.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Message} message - The command message.
   * @param {string[]} _args - Command arguments (unused).
   * @param {CommandContext} context - The command execution context.
   */
  async execute(bot: BotClient, message: Message, _args: string[], { player }: CommandContext): Promise<void> {
    logger.info(`[Command: leave] User ${message.author.tag} requested bot to leave channel`)

    // Shutdown the player and disconnect from voice.
    await player.destroy()

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_BYE} Bạn đã đuổi **${bot.user?.displayName || 'tớ'}** ra khỏi kênh.`
      )
    )

    if (message.channel.isTextBased() && 'send' in message.channel) {
      const replyMessage = await message.channel
        .send({
          components: [container],
          flags: ['IsComponentsV2']
        })

        .catch((e) => {
          logger.warn('[Command: leave] Error sending notification:', e)
          return null
        })
      if (replyMessage) {
        deleteMessage([message], TIME.SHORT)
      }
    }
  }
}

export default new LeaveCommand()
