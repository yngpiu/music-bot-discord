import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

class LeaveCommand extends BaseCommand {
  name = 'leave'
  aliases = ['lv', 'dc', 'disconnect', 'stop']
  description = 'Yêu cầu bot rời khỏi kênh thoại hiện tại.'
  requiresVoiceMatch = true
  requiresOwner = true

  async execute(bot: BotClient, message: Message, _args: string[], { player }: CommandContext) {
    logger.info(`[Command: leave] User ${message.author.tag} requested bot to leave channel`)

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
