import { ContainerBuilder, type GuildMember, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

const command: Command = {
  name: 'leave',
  aliases: ['l', 'dc', 'disconnect'],
  description: 'Yêu cầu bot rời khỏi kênh thoại',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message) {
    if (!message.guild) return

    const member = message.member as GuildMember
    const vcId = member?.voice?.channelId
    if (!vcId) throw new BotError('Bạn phải tham gia kênh thoại của tớ trước.')

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player) throw new BotError('Tớ đang không phát nhạc ở kênh nào cả.')

    if (player.voiceChannelId !== vcId) {
      throw new BotError('Bạn không ở cùng kênh thoại với tớ.')
    }

    await player.destroy()

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_BYE} **${bot.user?.displayName || 'tớ'}** đã bị đuổi khỏi kênh...`
      )
    )

    if (message.channel.isTextBased() && 'send' in message.channel) {
      await message.channel.send({
        components: [container],
        flags: ['IsComponentsV2']
      })
    }
  }
}

export default command
