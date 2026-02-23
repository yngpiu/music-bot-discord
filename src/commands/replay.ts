import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'

const command: Command = {
  name: 'replay',
  aliases: ['restart', 'rp'],
  description: 'Phát lại bài hát hiện tại từ đầu (0:00)',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message) {
    if (!message.guild) return

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player || !player.queue.current) {
      throw new BotError('Tớ đang không phát bản nhạc nào cả.')
    }

    const currentTrack = player.queue.current
    if (currentTrack.info.isStream || !currentTrack.info.isSeekable) {
      throw new BotError('Không thể phát lại từ đầu đối với luồng Livestream/Radio.')
    }

    await player.seek(0)

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã tua lại bài hát **${currentTrack.info.title}** từ đầu 🔄.`
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
