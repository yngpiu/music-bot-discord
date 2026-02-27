// Command to pause the current audio playback.
import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Command to pause the Lavalink player.
class PauseCommand extends BaseCommand {
  name = 'pause'
  aliases = ['ps']
  description = 'Tạm dừng bài hát hiện tại.'
  requiresVoiceMatch = true

  // Executes the pause command.
  async execute(bot: BotClient, message: Message, _args: string[], { player }: CommandContext): Promise<void> {
    logger.info(`[Command: pause] User ${message.author.tag} requested to pause track`)

    // Verify player state before attempting to pause.
    if (!player.playing && !player.paused) {
      throw new BotError('Không có bài hát nào đang được phát.')
    }

    if (player.paused) {
      throw new BotError('Nhạc đang được tạm dừng rồi mà.')
    }

    await player.pause()

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_NO_IDEA} **${getBotName(bot)}** đã tạm dừng phát nhạc.`
      )
    )

    let replyMessage
    if (message.channel.isTextBased() && 'send' in message.channel) {
      replyMessage = await message.channel
        .send({
          components: [container],
          flags: ['IsComponentsV2']
        })

        .catch((e) => {
          logger.warn(`[Command: pause] Error sending notification:`, e)
          return null
        })
    }

    if (replyMessage) {
      deleteMessage([message], TIME.SHORT)
    }
  }
}

export default new PauseCommand()
