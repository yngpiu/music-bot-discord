import { ContainerBuilder, type GuildMember, type Message } from 'discord.js'

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
  requiresVoice: true,

  async execute(bot: BotClient, message: Message) {
    if (!message.guild) return
    logger.info(`[Lệnh: resume] Người dùng ${message.author.tag} yêu cầu tiếp tục phát nhạc`)

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
          logger.warn(`[Lệnh: resume] Lỗi gửi thông báo:`, e)
          return null
        })
    }

    if (replyMessage) {
      deleteMessage([message], TIME.SHORT)
    }
  }
}

export default command
