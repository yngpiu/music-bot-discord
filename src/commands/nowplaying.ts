/**
 * @file nowplaying.ts
 * @description Command to display information about the track currently being played.
 */
import { EmbedBuilder, type Message } from 'discord.js'

import { TIME } from '~/constants/time.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'
import { formatTrack } from '~/utils/stringUtil.js'

/**
 * Command to show currently playing track details.
 */
class NowplayingCommand extends BaseCommand {
  name = 'nowplaying'
  aliases = ['np', 'current']
  description = 'Hiển thị thông tin bài hát đang phát.'
  requiresVoice = true

  /**
   * Executes the nowplaying command, fetching and displaying current track info.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Message} message - The command message.
   * @param {string[]} _args - Command arguments (unused).
   * @param {CommandContext} context - The command execution context.
   */
  async execute(bot: BotClient, message: Message, _args: string[], { player }: CommandContext): Promise<void> {
    logger.info(`[Command: nowplaying] User ${message.author.tag} requested to view current track`)

    // Check if there is a track currently in the queue being played.
    if (!player.queue.current) {
      throw new BotError('Danh sách phát hiện tại đang trống.')
    }

    const currentTrack = player.queue.current

    // Construct embed with track metadata.
    const embed = new EmbedBuilder()
      .setColor(0x00c2e6)
      .setAuthor({
        name: 'Đang phát hiện tại',
        iconURL: bot.user?.displayAvatarURL()
      })
      .setThumbnail(currentTrack.info.artworkUrl ?? null)
      .addFields({
        name: 'Bài hát',
        value: formatTrack({
          title: currentTrack.info.title,
          trackLink: currentTrack.info.uri ?? 'https://github.com/yngpiu',
          author: currentTrack.info.author
        }),
        inline: false
      })

    const replyMessage = await message
      .reply({
        embeds: [embed]
      })

      .catch((e) => {
        logger.warn(`[Command: nowplaying] Error sending notification:`, e)
        return null
      })

    if (replyMessage) {
      deleteMessage([replyMessage, message], TIME.MEDIUM)
    }
  }
}

export default new NowplayingCommand()
