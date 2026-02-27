// Command to manage audio filters and effects like Bassboost, Nightcore, etc.
import type { Message } from 'discord.js'
import type { FilterManager } from 'lavalink-client'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessMessage } from '~/utils/messageUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Mapping of filter keys to their toggle methods and display labels.
const FILTER_MAP = {
  nightcore: { toggle: 'toggleNightcore', label: '🐿️ Nightcore (nhanh & cao)' },
  vaporwave: { toggle: 'toggleVaporwave', label: '🌆 Vaporwave (chậm & vang)' },
  karaoke: { toggle: 'toggleKaraoke', label: '🎤 Karaoke (lọc giọng)' },
  rotation: { toggle: 'toggleRotation', label: '🌀 8D Audio (âm thanh xoay vòng)' },
  tremolo: { toggle: 'toggleTremolo', label: '〰️ Tremolo (rung âm lượng)' },
  vibrato: { toggle: 'toggleVibrato', label: '♒ Vibrato (rung cao độ)' },
  lowpass: { toggle: 'toggleLowPass', label: '📻 LowPass (âm thanh qua tường)' }
} as const

type FilterKey = keyof typeof FILTER_MAP

// Aliases for specific filter names.
const FILTER_ALIASES: Record<string, FilterKey> = {
  '3d': 'rotation',
  '8d': 'rotation'
}

const RESET_ARGS = new Set(['clear', 'off'])

const AVAILABLE_FILTERS = [
  ...Object.keys(FILTER_MAP),
  'bassboost',
  ...Object.keys(FILTER_ALIASES),
  'clear',
  'off'
]

// Resets all active filters and equalizers.
async function resetAll(filterManager: FilterManager): Promise<void> {
  await filterManager.resetFilters()
  await filterManager.clearEQ()
}

// Applies or removes the Bassboost effect.
async function applyBassboost(filterManager: FilterManager): Promise<string> {
  // Check if Bassboost (Bands 0, 1, 2) is already active.
  const isActive = filterManager.equalizerBands.some((b) => b.band === 0 && b.gain === 0.25)

  await resetAll(filterManager)

  if (isActive) return '**tắt** bộ chỉnh âm (EQ).'

  await filterManager.setEQ([
    { band: 0, gain: 0.25 },
    { band: 1, gain: 0.15 },
    { band: 2, gain: 0.05 }
  ])
  return '**bật** hiệu ứng `🎧 Bassboost 🎧`'
}

// Toggles a specific filter by its key.
async function applyFilter(filterManager: FilterManager, key: FilterKey): Promise<string> {
  const { toggle, label } = FILTER_MAP[key]
  const filterStateKey = key === 'lowpass' ? 'lowPass' : key
  const isActive = !!filterManager.filters[filterStateKey]

  await resetAll(filterManager)

  if (isActive) return `**tắt** hiệu ứng \`${key}\``

  // Dynamically call the toggle method on the filter manager.
  await (filterManager[toggle] as unknown as () => Promise<void>)()
  return `**bật** hiệu ứng ${label}`
}

// Command to apply various audio filters to the current track.
class FilterCommand extends BaseCommand {
  name = 'filter'
  aliases = ['f', 'effects', 'fx']
  description = 'Bật/tắt các hiệu ứng âm thanh (bassboost, nightcore, vaporwave, karaoke, 8d, ...).'
  requiresVoice = true

  // Validates that the provided filter name is supported.
  private validateInput(input: string | undefined): string {
    if (!input || !AVAILABLE_FILTERS.includes(input)) {
      throw new BotError(`Vui lòng chọn một hiệu ứng hợp lệ:\n\`${AVAILABLE_FILTERS.join(', ')}\`.`)
    }
    return input
  }

  // Applies the chosen effect to the player.
  private async applyEffect(filterManager: FilterManager, input: string): Promise<string> {
    try {
      if (RESET_ARGS.has(input)) {
        await resetAll(filterManager)
        return 'xoá sạch toàn bộ hiệu ứng, quay về nguyên bản.'
      }
      if (input === 'bassboost') return applyBassboost(filterManager)
      const key = (FILTER_ALIASES[input] ?? input) as FilterKey
      return applyFilter(filterManager, key)
    } catch (e) {
      logger.error('[Command: filter] Error applying filter:', e)
      throw new BotError(
        `Không thể áp dụng hiệu ứng: ${e instanceof Error ? e.message : 'Lỗi không xác định'}.`
      )
    }
  }

  // Sends a follow-up message confirming the filter change.
  private async sendConfirmation(
    bot: BotClient,
    message: Message,
    actionText: string
  ): Promise<void> {
    await replySuccessMessage(message, `**${getBotName(bot)}** đã ${actionText}.`)
  }

  // Executes the filter command.
  async execute(
    bot: BotClient,
    message: Message,
    args: string[],
    { player }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(
      `[Command: filter] User ${message.author.tag} requested to toggle effect: ${args[0] ?? 'empty'}`
    )

    const input = this.validateInput(args[0]?.toLowerCase())
    const actionText = await this.applyEffect(player.filterManager, input)
    await this.sendConfirmation(bot, message, actionText)
  }
}

export default new FilterCommand()
