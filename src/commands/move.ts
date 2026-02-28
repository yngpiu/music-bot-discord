// Command to move a track from one position to another within the queue.
import type { Message } from 'discord.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessMessage } from '~/utils/messageUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Command to rearrange tracks in the music queue.
class MoveCommand extends BaseCommand {
  name = 'move'
  aliases = ['m', 'mv']
  description = 'Di chuyển vị trí của một bài hát trong danh sách chờ.'
  requiresVoice = true

  // Executes the move command, shifting a track to the specified target position.
  async execute(
    bot: BotClient,
    message: Message,
    args: string[],
    { player, prefix }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(
      `[Command: move] User ${message.author.tag} requested to move track ${args[0]} to position ${args[1] || 1}`
    )

    // Check if the queue has enough tracks to move.
    if (player.queue.tracks.length < 2) {
      throw new BotError('Danh sách chờ cần có ít nhất 2 bài hát.')
    }

    if (!args[0]) {
      throw new BotError(
        `Cú pháp: \`${prefix}move <vị trí cố định> [vị trí đích]\`\nVD: \`${prefix}move 5\` (đưa bài 5 lên đầu) | \`${prefix}move 5 2\` (đưa bài 5 lên vị trí 2)`
      )
    }

    const fromPos = parseInt(args[0], 10)
    let toPos = args[1] ? parseInt(args[1], 10) : 1

    const queueLength = player.queue.tracks.length

    // Validate the "from" position.
    if (isNaN(fromPos) || fromPos < 1 || fromPos > queueLength) {
      throw new BotError(`Vị trí bài hát cần di chuyển phải từ 1 đến ${queueLength}.`)
    }

    // Validate and clamp the "to" position.
    if (isNaN(toPos) || toPos < 1) {
      toPos = 1
    } else if (toPos > queueLength) {
      toPos = queueLength
    }

    if (fromPos === toPos) {
      throw new BotError('Bài hát đã ở sẵn vị trí đó rồi.')
    }

    const fromIndex = fromPos - 1
    const toIndex = toPos - 1

    const trackToMove = player.queue.tracks[fromIndex]

    // Use splice to move the track in-place within the queue.
    player.queue.splice(fromIndex, 1)
    player.queue.splice(toIndex, 0, trackToMove)

    await replySuccessMessage(
      message,
      `${getBotName(bot)} đã di chuyển bài hát **${trackToMove.info.title}** từ vị trí **${fromPos}** sang vị trí **${toPos}**.`
    )
  }
}

export default new MoveCommand()
