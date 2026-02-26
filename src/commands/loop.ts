import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import type { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

const command: Command = {
  name: 'loop',
  aliases: ['l', 'repeat'],
  description: 'Bật/tắt chế độ lặp lại (lặp 1 bài, lặp toàn bộ hoặc tắt)',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, _args: string[], { player }: CommandContext) {
    logger.info(`[Command: loop] User ${message.author.tag} requested to toggle loop mode`)

    // Lavalink repeat modes: 'off' | 'track' | 'queue'
    const currentMode = player.repeatMode

    let nextMode: 'off' | 'track' | 'queue'
    let modeText: string

    if (currentMode === 'off') {
      nextMode = 'track'
      modeText = 'Lặp lại bài hát hiện tại'
    } else if (currentMode === 'track') {
      nextMode = 'queue'
      modeText = 'Lặp lại toàn bộ danh sách chờ'
    } else {
      nextMode = 'off'
      modeText = 'Tắt chế độ lặp'
    }

    await player.setRepeatMode(nextMode)

    let messageText = ''
    if (nextMode === 'track') {
      messageText = `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã **chuyển** chế độ lặp thành \`${modeText}\`.`
    } else if (nextMode === 'queue') {
      messageText = `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã **chuyển** chế độ lặp thành \`${modeText}\`.`
    } else {
      messageText = `${EMOJI.ANIMATED_CAT_NO_IDEA} **${bot.user?.displayName || 'tớ'}** đã **tắt** chế độ lặp.`
    }

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(messageText)
    )

    const replyMessage = await message
      .reply({
        components: [container],
        flags: ['IsComponentsV2']
      })

      .catch((e) => {
        logger.warn('[Command: loop] Error sending notification:', e)
        return null
      })

    if (replyMessage) {
      deleteMessage([replyMessage, message], TIME.SHORT)
    }
  }
}

export default command
