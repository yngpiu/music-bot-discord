import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

const command: Command = {
  name: 'volume',
  aliases: ['vol', 'v'],
  description: 'Chỉnh mức âm lượng của bot.',
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
        'Chỉ **người đang có quyền điều khiển cao nhất** mới có quyền dùng lệnh này.'
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
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã **điều chỉnh** âm lượng thành **${vol}%**  .`
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
      deleteMessage([replyMessage, message], TIME.SHORT)
    }
  }
}

export default command
