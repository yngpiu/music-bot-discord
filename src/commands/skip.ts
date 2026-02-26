/**
 * @file skip.ts
 * @description Command to skip the current track and move to the next one in the queue.
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
 * Command to skip the currently playing track.
 */
class SkipCommand extends BaseCommand {
  name = 'skip'
  aliases = ['s', 'n', 'next']
  description = 'Bỏ qua bài hát hiện tại để phát bài tiếp theo.'
  requiresVoice = true

  /**
   * Executes the skip command.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Message} message - The command message.
   * @param {string[]} _args - Command arguments (unused).
   * @param {CommandContext} context - The command execution context.
   */
  async execute(bot: BotClient, message: Message, _args: string[], { player }: CommandContext): Promise<void> {
    logger.info(`[Command: skip] User ${message.author.tag} requested to skip track`)

    // Verify if there is currently a track to skip.
    if (!player.playing && !player.queue.current) {
      throw new BotError(`Tớ đang không phát bản nhạc nào cả.`)
    }

    const currentTrack = player.queue.current

    // Trigger the skip in the player.
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

export default new SkipCommand()
