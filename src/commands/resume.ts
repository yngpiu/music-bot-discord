import { ContainerBuilder, type GuildMember, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'
import { logger } from '~/utils/logger.js'

const command: Command = {
  name: 'resume',
  aliases: ['unpause', 'continue'],
  description: 'Tiếp tục phát nhạc đang tạm dừng',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message) {
    if (!message.guild) return

    const member = message.member as GuildMember
    const vcId = member?.voice?.channelId
    if (!vcId) throw new BotError('Bạn phải tham gia kênh thoại của tớ trước.')

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player) throw new BotError('Tớ đang không làm việc ở kênh nào cả.')

    if (player.voiceChannelId !== vcId) {
      throw new BotError('Bạn không ở cùng kênh thoại với tớ.')
    }

    if (!player.paused) {
      throw new BotError('Nhạc có đang tạm dừng đâu nhỉ?')
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
        .catch((e) => { logger.error(e); return null })
    }

    if (replyMessage) {
      setTimeout(() => {
        message.delete().catch((e) => logger.error(e))
      }, 10000)
    }
  }
}

export default command
