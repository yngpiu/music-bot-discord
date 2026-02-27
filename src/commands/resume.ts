// Command to resume audio playback if it was previously paused.
import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Command to unpause the music player.
class ResumeCommand extends BaseCommand {
  name = 'resume'
  aliases = ['rs', 'unpause', 'continue']
  description = 'Tiếp tục phát nhạc đang tạm dừng.'
  requiresVoiceMatch = true

  // Sends a confirmation message after successfully resuming playback.
  private async sendConfirmation(bot: BotClient, message: Message): Promise<void> {
    if (!message.channel.isTextBased() || !('send' in message.channel)) return

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_DANCE} **${getBotName(bot)}** sẽ tiếp tục phát nhạc.`
      )
    )

    const replyMessage = await message.channel
      .send({ components: [container], flags: ['IsComponentsV2'] })
      .catch((e) => {
        logger.warn(`[Command: resume] Error sending notification:`, e)
        return null
      })

    if (replyMessage) deleteMessage([message], TIME.SHORT)
  }

  // Executes the resume command.
  async execute(bot: BotClient, message: Message, _args: string[], { player }: CommandContext): Promise<void> {
    logger.info(`[Command: resume] User ${message.author.tag} requested to resume track`)

    // Verify if the player is actually paused.
    if (!player.paused) throw new BotError('Nhạc vẫn đang phát mà.')

    await player.resume()
    await this.sendConfirmation(bot, message)
  }
}

export default new ResumeCommand()
