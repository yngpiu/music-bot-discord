import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

const command: Command = {
  name: 'skip',
  aliases: ['s', 'n', 'next'],
  description: 'Bỏ qua bài hát hiện tại để phát bài tiếp theo.',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, _args: string[], { player }: CommandContext) {
    logger.info(`[Command: skip] User ${message.author.tag} requested to skip track`)

    if (!player.playing && !player.queue.current) {
      throw new BotError(`Tớ đang không phát bản nhạc nào cả.`)
    }

    const currentTrack = player.queue.current
    await player.skip(0, false)

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã **bỏ qua** bài hát **${currentTrack?.info.title || 'hiện tại'}**.`
      )
    )

    const replyMessage = await message
      .reply({
        components: [container],
        flags: ['IsComponentsV2']
      })

      .catch((e) => {
        logger.warn(`[Command: skip] Error sending notification:`, e)
        return null
      })

    if (replyMessage) {
      deleteMessage([replyMessage, message], TIME.SHORT)
    }
  }
}

export default command
