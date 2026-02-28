// Command to display information about the track currently being played.
import { EmbedBuilder, type Message } from 'discord.js'

import { TIME } from '~/constants/time'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessEmbed } from '~/utils/messageUtil.js'
import { formatTrack, getBotAvatar } from '~/utils/stringUtil.js'

// Command to show currently playing track details.
class NowplayingCommand extends BaseCommand {
  name = 'nowplaying'
  aliases = ['np', 'current']
  description = 'Hiển thị thông tin bài hát đang phát.'
  requiresVoice = true

  // Executes the nowplaying command, fetching and displaying current track info.
  async execute(
    bot: BotClient,
    message: Message,
    _args: string[],
    { player }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
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
        iconURL: getBotAvatar(bot)
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
    await replySuccessEmbed(message, embed, undefined, TIME.MEDIUM)
  }
}

export default new NowplayingCommand()
