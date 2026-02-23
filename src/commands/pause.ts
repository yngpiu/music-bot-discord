import type { GuildMember, Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

const command: Command = {
  name: 'pause',
  aliases: ['stop'],
  description: 'Tạm dừng bài hát hiện tại',
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

    if (!player.playing && !player.paused) {
      throw new BotError('Không có bài hát nào đang được phát.')
    }

    if (player.paused) {
      throw new BotError('Nhạc đang được tạm dừng rồi mà!')
    }

    await player.pause()

    await message.reply(
      `${EMOJI.ANIMATED_CAT_NO_IDEA} **${bot.user?.displayName || 'tớ'}** đã tạm dừng bản/danh sách nhạc hiện tại. Bạn có thể dùng \`!resume\` để tiếp tục.`
    )
  }
}

export default command
