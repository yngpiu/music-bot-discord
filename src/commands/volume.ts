/**
 * @file volume.ts
 * @description Command to adjust the bot's audio volume level.
 */
import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

/**
 * Command for setting the player's volume (0-100).
 */
class VolumeCommand extends BaseCommand {
  name = 'volume'
  aliases = ['vol', 'v']
  description = 'Chỉnh mức âm lượng của bot.'
  requiresOwner = true

  /**
   * Executes the volume command.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Message} message - The command message.
   * @param {string[]} args - Command arguments containing the target volume percentage.
   * @param {CommandContext} context - The command execution context.
   */
  async execute(bot: BotClient, message: Message, args: string[], { player }: CommandContext) {
    logger.info(`[Command: volume] User ${message.author.tag} requested to change volume`)

    // If no argument is provided, show current volume.
    if (!args[0]) {
      throw new BotError(
        `Âm lượng hiện tại đang là **${player.volume}%**. Cú pháp: \`!volume <0-100>\``
      )
    }

    const vol = parseInt(args[0], 10)

    // Validate the volume level.
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
        logger.warn(`[Command: volume] Error sending notification:`, e)
        return null
      })

    if (replyMessage) {
      deleteMessage([replyMessage, message], TIME.SHORT)
    }
  }
}

export default new VolumeCommand()
