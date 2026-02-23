import type { Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'

const command: Command = {
  name: 'skip',
  aliases: ['s'],
  description: 'Bỏ qua bài hát hiện tại để phát bài tiếp theo',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message) {
    if (!message.guild) return

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player || (!player.playing && !player.queue.current)) {
      throw new BotError('Tớ đang không phát bản nhạc nào cả.')
    }

    const currentTrack = player.queue.current
    await player.skip()

    const replyMessage = await message
      .reply(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã bỏ qua bài hát **${currentTrack?.info.title || 'hiện tại'}**!`
      )
      .catch((e: Error) => {
        logger.error(e)
        return null
      })

    if (replyMessage) {
      setTimeout(() => {
        replyMessage.delete().catch((e: Error) => logger.error(e))
        message.delete().catch(() => {})
      }, 60000)
    }
  }
}

export default command
