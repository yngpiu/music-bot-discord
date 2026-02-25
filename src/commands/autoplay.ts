import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'
import { TIME } from '~/constants/time.js'

const command: Command = {
  name: 'autoplay',
  aliases: ['ap', 'endless'],
  description: 'Bật/tắt chế độ tự động phát nhạc đề xuất khi hết danh sách chờ.',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message) {
    if (!message.guild) return

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player) {
      throw new BotError('Tớ đang không hoạt động trong kênh nào cả.')
    }

    const currentAutoplay = player.get<boolean>('autoplay') ?? false
    // Đảo ngược trạng thái
    player.set('autoplay', !currentAutoplay)

    const isAutoplayEnabled = player.get<boolean>('autoplay')

    const actionText = isAutoplayEnabled
      ? '**bật** chế độ `Tự động phát`'
      : '**tắt** chế độ `Tự động phát`'

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã ${actionText}.`
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
