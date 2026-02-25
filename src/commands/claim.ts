import { ContainerBuilder, GuildMember, Message, VoiceChannel } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'
import { isDeveloperOrServerOwner } from '~/utils/permissionUtil.js'

const command: Command = {
  name: 'claim',
  aliases: ['c'],
  description: 'Lấy quyền kiểm soát player nếu người dùng trước đó đã rời kênh thoại.',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message) {
    if (!message.guild) return
    logger.info(`[Lệnh: claim] Người dùng ${message.author.tag} yêu cầu lấy quyền kiểm soát Player`)

    const member = message.member as GuildMember
    const vcId = member?.voice?.channelId
    if (!vcId) {
      throw new BotError('Bạn đang không ở kênh thoại nào cả.')
    }

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player) {
      throw new BotError('Tớ đang không phát nhạc ở server này.')
    }

    if (player.voiceChannelId !== vcId) {
      throw new BotError('Bạn không ở cùng kênh thoại với tớ.')
    }

    const currentOwnerId = player.get<string>('owner')

    // If there is no owner, just set it to the current user
    if (!currentOwnerId) {
      player.set('owner', message.author.id)

      const container = new ContainerBuilder().addTextDisplayComponents((t) =>
        t.setContent(
          `${EMOJI.ANIMATED_CAT_LOVE_YOU} Tớ chưa có người điều khiển, giờ bạn đang có quyền điều khiển cao nhất nha!`
        )
      )

      if (message.channel.isTextBased() && 'send' in message.channel) {
        const replyMessage = await message.channel
          .send({
            components: [container],
            flags: ['IsComponentsV2']
          })
           
          .catch((e) => {
            logger.warn('[Lệnh: claim] Lỗi gửi thông báo:', e)
            return null
          })

        if (replyMessage) {
          deleteMessage([replyMessage, message], TIME.MEDIUM)
        }
      }
      return
    }

    if (currentOwnerId === message.author.id) {
      throw new BotError('Bạn đang có quyền điều khiển cao nhất của player này rồi mà.')
    }

    // Checking if the owner is still in the voice channel
    const botVc = message.guild.channels.cache.get(player.voiceChannelId) as VoiceChannel
    if (botVc && botVc.members.has(currentOwnerId)) {
      // If the current user has higher permissions, they can claim
      if (!isDeveloperOrServerOwner(message)) {
        throw new BotError(
          'Người đang có quyền điều khiển cao nhất hiện tại vẫn đang ở trong kênh thoại này.'
        )
      }
    }

    player.set('owner', message.author.id)

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(`${EMOJI.ANIMATED_CAT_LOVE_YOU} Bạn đã lấy quyền kiểm soát player thành công!`)
    )

    if (message.channel.isTextBased() && 'send' in message.channel) {
      const replyMessage = await message.channel
        .send({
          components: [container],
          flags: ['IsComponentsV2']
        })
         
        .catch((e) => {
          logger.warn('[Lệnh: claim] Lỗi gửi thông báo:', e)
          return null
        })

      if (replyMessage) {
        deleteMessage([replyMessage, message], TIME.MEDIUM)
      }
    }
  }
}

export default command
