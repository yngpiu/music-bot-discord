import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

const command: Command = {
  name: 'shuffle',
  aliases: ['sh', 'mix', 'random'],
  description: 'Trộn ngẫu nhiên các bài hát trong danh sách chờ.',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, _args: string[], { player }: CommandContext) {
    logger.info(`[Command: shuffle] User ${message.author.tag} requested to shuffle queue`)

    if (player.queue.tracks.length < 2) {
      throw new BotError('Danh sách chờ cần có ít nhất 2 bài hát.')
    }

    await player.queue.shuffle()

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã **trộn lẫn lộn** **${player.queue.tracks.length}** bài hát trong hàng chờ.`
      )
    )

    const replyMessage = await message
      .reply({
        components: [container],
        flags: ['IsComponentsV2']
      })

      .catch((e) => {
        logger.warn('[Command: shuffle] Error sending notification:', e)
        return null
      })

    if (replyMessage) {
      deleteMessage([replyMessage, message], TIME.SHORT)
    }
  }
}

export default command
