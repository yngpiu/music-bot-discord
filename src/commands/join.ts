import { ContainerBuilder, type GuildMember, type Message, type VoiceChannel } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

const command: Command = {
  name: 'join',
  aliases: ['j'],
  description: 'Gọi bot vào kênh thoại hiện tại.',

  async execute(bot: BotClient, message: Message) {
    if (!message.guild) return
    logger.info(`[Command: join] User ${message.author.tag} requested bot to join channel`)

    const member = message.member as GuildMember
    const vcId = member?.voice?.channelId
    if (!vcId) {
      throw new BotError('Bạn đang không ở kênh thoại nào cả.')
    }
    const vc = member.voice.channel as VoiceChannel
    if (!vc.joinable) throw new BotError('Tớ không thể vào kênh thoại của bạn.')

    const existingPlayer = bot.lavalink.getPlayer(message.guild.id)

    if (existingPlayer && existingPlayer.voiceChannelId === vcId) {
      throw new BotError('Tớ đang ở trong kênh thoại này rồi mà.')
    }

    if (existingPlayer && existingPlayer.voiceChannelId !== vcId) {
      const isTargeted = message.mentions.users.has(bot.user!.id)
      if (isTargeted) {
        throw new BotError('Tớ đang bận phục vụ ở kênh khác rồi.')
      }
      throw new BotError('Tớ đang bận phục vụ ở kênh thoại khác mất rồi.')
    }

    // Get or create player
    const player =
      existingPlayer ??
      bot.lavalink.createPlayer({
        guildId: message.guild.id,
        voiceChannelId: vcId,
        textChannelId: message.channel.id,
        selfDeaf: true,
        selfMute: false,
        volume: 100,
        instaUpdateFiltersFix: true
      })

    if (!player.connected) await player.connect()

    if (!player.get('owner')) {
      player.set('owner', message.author.id)
    }

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_LOVE_YOU} **${bot.user?.displayName || 'tớ'}** đã sẵn sàng phát nhạc ở kênh này.`
      )
    )

    if (message.channel.isTextBased() && 'send' in message.channel) {
      const replyMessage = await message.channel
        .send({
          components: [container],
          flags: ['IsComponentsV2']
        })

        .catch((e) => {
          logger.warn('[Command: join] Error sending notification:', e)
          return null
        })

      if (replyMessage) {
        deleteMessage([message], TIME.SHORT)
      }
    }
  }
}

export default command
