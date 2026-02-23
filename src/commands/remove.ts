import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'

/**
 * Parse args into a sorted, deduplicated, 1-based list of positions.
 * Supports:
 *   single:  "3"
 *   multiple: "1 3 7 2"
 *   range:    "2-7"  (or "2–7")
 */
function parsePositions(args: string[], maxLength: number): number[] {
  const positions = new Set<number>()

  for (const arg of args) {
    // Range: "2-7" or "2–7"
    const rangeMatch = arg.match(/^(\d+)[–-](\d+)$/)
    if (rangeMatch) {
      const from = parseInt(rangeMatch[1], 10)
      const to = parseInt(rangeMatch[2], 10)
      if (from > to)
        throw new BotError(`Khoảng không hợp lệ: \`${arg}\` (số đầu phải nhỏ hơn số cuối).`)
      for (let i = from; i <= to; i++) positions.add(i)
      continue
    }

    // Single number
    const n = parseInt(arg, 10)
    if (isNaN(n)) throw new BotError(`\`${arg}\` không phải là số hợp lệ.`)
    positions.add(n)
  }

  // Validate all positions
  for (const pos of positions) {
    if (pos < 1 || pos > maxLength) {
      throw new BotError(
        `Vị trí **${pos}** không hợp lệ, danh sách chờ hiện có **${maxLength}** bài.`
      )
    }
  }

  return [...positions].sort((a, b) => a - b)
}

const command: Command = {
  name: 'remove',
  aliases: ['rm', 'delete', 'del'],
  description: 'Xóa bài hát khỏi danh sách chờ (VD: `remove 1`, `remove 2 7 4`, `remove 2-7`).',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, args: string[]) {
    if (!message.guild) return

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player) {
      throw new BotError('Tớ đang không hoạt động trong kênh nào cả.')
    }

    if (player.queue.tracks.length === 0) {
      throw new BotError('Danh sách phát hiện tại đang trống.')
    }

    if (!args[0]) {
      throw new BotError(
        'Vui lòng cung cấp vị trí bài hát muốn xóa.\nVD: `remove 1` · `remove 2 7 4` · `remove 2-7`'
      )
    }

    const queueLength = player.queue.tracks.length
    const positions = parsePositions(args, queueLength)

    // Remove from highest index first so earlier indexes aren't shifted
    const removedTitles: string[] = []
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

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** ${description}`
      )
    )

    const replyMessage = await message
      .reply({ components: [container], flags: ['IsComponentsV2'] })
      .catch((e) => {
        logger.error(e)
        return null
      })

    if (replyMessage) {
      setTimeout(() => {
        replyMessage.delete().catch((e: Error) => logger.error(e))
        message.delete().catch((e: Error) => logger.error(e))
      }, 10000)
    }
  }
}

export default command
