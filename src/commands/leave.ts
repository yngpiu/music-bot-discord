import { ContainerBuilder, type GuildMember, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

const command: Command = {
  name: 'leave',
  aliases: ['lv', 'dc', 'disconnect', 'stop'],
  description: 'Yêu cầu bot rời khỏi kênh thoại hiện tại.',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message) {
    if (!message.guild) return
    logger.info(`[Command: leave] User ${message.author.tag} requested bot to leave channel`)

    const member = message.member as GuildMember
    const vcId = member?.voice?.channelId
    if (!vcId) {
      throw new BotError('Bạn đang không ở kênh thoại nào cả.')
    }
    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player) {
      throw new BotError('Tớ đang không hoạt động trong kênh nào cả.')
    }
    if (player.voiceChannelId !== vcId) {
      throw new BotError('Bạn không ở cùng kênh thoại với tớ.')
    }

    const owner = player.get('owner')
    if (owner && message.author.id !== owner) {
      throw new BotError(
        'Chỉ **người đang có quyền điều khiển cao nhất** mới có quyền dùng lệnh này.'
      )
    }

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

export default command
