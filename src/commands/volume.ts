import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'

const command: Command = {
  name: 'volume',
  aliases: ['vol', 'v'],
  description: 'Chỉnh mức âm lượng của bot (từ 0 đến 100, yêu cầu quyền Chủ xị)',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, args: string[]) {
    if (!message.guild) return

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player) {
      throw new BotError('Tớ đang không hoạt động trong kênh nào cả.')
    }

    const owner = player.get('owner')
    if (owner && message.author.id !== owner) {
      throw new BotError(
        'Chỉ Chủ xị (người mời bot) mới được quyền tinh chỉnh âm lượng chung của cả động.'
      )
    }

    if (!args[0]) {
      throw new BotError(
        `Âm lượng hiện tại đang là **${player.volume}%**. Cú pháp: \`!volume <0-100>\``
      )
    }

    const vol = parseInt(args[0], 10)

    if (isNaN(vol) || vol < 0 || vol > 100) {
      throw new BotError('Vui lòng nhập mức âm lượng từ 0 đến 100.')
    }

    await player.setVolume(vol)

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã điều chỉnh âm lượng thành **${vol}%** theo lệnh Chủ xị 🔊.`
      )
    )

    const replyMessage = await message
      .reply({
        components: [container],
        flags: ['IsComponentsV2']
      })
      .catch((e) => {
        logger.error(e)
        return null
      })

    if (replyMessage) {
      setTimeout(() => {
        replyMessage.delete().catch((e: Error) => logger.error(e))
        message.delete().catch((e: Error) => logger.error(e))
      }, 10000)
    }
  }
}

export default command
