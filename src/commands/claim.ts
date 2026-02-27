// Command to take ownership of the music player in a guild.
import { ContainerBuilder, Message, VoiceChannel } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'
import { isDeveloperOrServerOwner } from '~/utils/permissionUtil.js'

// Command to claim player ownership. Useful when the previous owner has left the channel.
class ClaimCommand extends BaseCommand {
  name = 'claim'
  aliases = ['c']
  description = 'Lấy quyền kiểm soát player nếu người dùng trước đó đã rời kênh thoại.'
  requiresVoiceMatch = true

  // Transfers player ownership to the command executor if the current owner is no longer present or if the executor has elevated permissions.
  async execute(
    bot: BotClient,
    message: Message,
    _args: string[],
    { player }: CommandContext
  ): Promise<void> {
    logger.info(`[Command: claim] User ${message.author.tag} requested to claim player control`)

    const currentOwnerId = player.get<string>('owner')

    // If there is no current owner, just take it.
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
            logger.warn('[Command: claim] Error sending notification:', e)
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

    const botVc = message.guild?.channels.cache.get(player.voiceChannelId!) as
      | VoiceChannel
      | undefined

    // Check if the current owner is still in the voice channel.
    if (botVc && botVc.members.has(currentOwnerId)) {
      // Developers and server owners can override the claim.
      if (!isDeveloperOrServerOwner(message)) {
        throw new BotError(
          'Người đang có quyền điều khiển cao nhất hiện tại vẫn đang ở trong kênh thoại này.'
        )
      }
    }

    // Transfer ownership.
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
          logger.warn('[Command: claim] Error sending notification:', e)
          return null
        })

      if (replyMessage) {
        deleteMessage([replyMessage, message], TIME.MEDIUM)
      }
    }
  }
}

export default new ClaimCommand()
