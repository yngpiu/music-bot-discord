// Command to adjust the bot's audio volume level.
import type { Message } from 'discord.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessMessage } from '~/utils/messageUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Command for setting the player's volume (0-100).
class VolumeCommand extends BaseCommand {
  name = 'volume'
  aliases = ['vol', 'v']
  description = 'Chỉnh mức âm lượng của bot.'
  requiresOwner = true

  // Executes the volume command.
  async execute(
    bot: BotClient,
    message: Message,
    args: string[],
    { player, prefix }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(`[Command: volume] User ${message.author.tag} requested to change volume`)

    // If no argument is provided, show current volume.
    if (!args[0]) {
      throw new BotError(`Cú pháp: \`${prefix}volume <0-100>\`\nVD: \`${prefix}volume 50\``)
    }

    const vol = parseInt(args[0], 10)

    // Validate the volume level.
    if (isNaN(vol) || vol < 0 || vol > 100) {
      throw new BotError('Vui lòng nhập mức âm lượng từ 0 đến 100.')
    }

    await player.setVolume(vol)

    await replySuccessMessage(
      message,
      `${getBotName(bot)} đã **điều chỉnh** âm lượng thành **${vol}%**.`
    )
  }
}

export default new VolumeCommand()
