// Command to remove one or multiple tracks from the music queue using indices or ranges.
import type { Message } from 'discord.js'
import { config } from '~/config/env'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessMessage } from '~/utils/messageUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Parses raw command arguments into a sorted list of unique queue positions. Supports individual numbers and ranges (e.g., "1-5").
function parsePositions(args: string[], maxLength: number): number[] {
  const positions = new Set<number>()

  for (const arg of args) {
    const rangeMatch = arg.match(/^(\d+)[–-](\d+)$/)
    if (rangeMatch) {
      const from = parseInt(rangeMatch[1], 10)
      const to = parseInt(rangeMatch[2], 10)
      if (from > to)
        throw new BotError(`Khoảng không hợp lệ: \`${arg}\` (số đầu phải nhỏ hơn số cuối).`)
      for (let i = from; i <= to; i++) positions.add(i)
      continue
    }

    const n = parseInt(arg, 10)
    if (isNaN(n)) throw new BotError(`\`${arg}\` không phải là số hợp lệ.`)
    positions.add(n)
  }

  // Validate that all requested positions are within bounds.
  for (const pos of positions) {
    if (pos < 1 || pos > maxLength) {
      throw new BotError(
        `Vị trí **${pos}** không hợp lệ, danh sách chờ hiện có **${maxLength}** bài.`
      )
    }
  }

  return [...positions].sort((a, b) => a - b)
}

// Command to remove tracks from the queue.
class RemoveCommand extends BaseCommand {
  name = 'remove'
  aliases = ['rm', 'delete', 'del']
  description = 'Xóa bài hát khỏi danh sách chờ (VD: `remove 1`, `remove 2 7 4`, `remove 2-7`).'
  requiresVoice = true

  // Executes the remove command.
  async execute(
    bot: BotClient,
    message: Message,
    args: string[],
    { player }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(`[Command: remove] User ${message.author.tag} requested to remove track from queue`)

    if (player.queue.tracks.length === 0) {
      throw new BotError('Danh sách phát hiện tại đang trống.')
    }

    if (!args[0]) {
      throw new BotError(
        `Cú pháp: \`${config.prefix}remove <vị trí>\`\nVD: \`${config.prefix}remove 1\` | \`${config.prefix}remove 2 7 4\` | \`${config.prefix}remove 2-7\``
      )
    }

    const queueLength = player.queue.tracks.length
    const positions = parsePositions(args, queueLength)

    const removedTitles: string[] = []

    // Remove tracks in reverse order to avoid index shifts during deletion.
    for (const pos of [...positions].reverse()) {
      const result = await player.queue.remove(pos - 1)
      if (result?.removed.length) {
        removedTitles.unshift(result.removed[0].info.title)
      }
    }

    if (removedTitles.length === 0) {
      throw new BotError('Đã xảy ra lỗi khi xóa bài hát.')
    }

    const isSingle = removedTitles.length === 1
    const description = isSingle
      ? `đã xóa **${removedTitles[0]}** khỏi hàng đợi.`
      : `đã xóa **${removedTitles.length}** bài hát khỏi hàng đợi:\n\`${removedTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}\``

    await replySuccessMessage(message, `${getBotName(bot)} ${description}`)
  }
}

export default new RemoveCommand()
