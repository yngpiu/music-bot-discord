import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

const command: Command = {
  name: 'resume',
  aliases: ['rs', 'unpause', 'continue'],
  description: 'Tiếp tục phát nhạc đang tạm dừng.',
  requiresVoiceMatch: true,

  async execute(bot: BotClient, message: Message, _args: string[], { player }: CommandContext) {
    logger.info(`[Command: resume] User ${message.author.tag} requested to resume track`)

    if (!player.paused) {
      throw new BotError('Nhạc vẫn đang phát mà.')
    }

    await player.resume()

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** sẽ tiếp tục phát nhạc.`
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
          logger.warn(`[Command: resume] Error sending notification:`, e)
          return null
        })
    }

    if (replyMessage) {
      deleteMessage([message], TIME.SHORT)
    }
  }
}

export default command
