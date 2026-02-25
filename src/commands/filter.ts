import { ContainerBuilder, type Message } from 'discord.js'
// --- Helpers ---

import type { FilterManager } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'

// --- Config ---

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

async function resetAll(filterManager: FilterManager) {
  await filterManager.resetFilters()
  await filterManager.clearEQ()
}

async function applyBassboost(filterManager: FilterManager): Promise<string> {
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

async function applyFilter(filterManager: FilterManager, key: FilterKey): Promise<string> {
  const { toggle, label } = FILTER_MAP[key]
  const filterStateKey = key === 'lowpass' ? 'lowPass' : key
  const isActive = !!filterManager.filters[filterStateKey]

  await resetAll(filterManager)

  if (isActive) return `**tắt** hiệu ứng \`${key}\``

  await (filterManager[toggle] as unknown as () => Promise<void>)()
  return `**bật** hiệu ứng ${label}`
}

// --- Command ---

const command: Command = {
  name: 'filter',
  aliases: ['f', 'effects', 'fx'],
  description: 'Bật/tắt các hiệu ứng âm thanh (bassboost, nightcore, vaporwave, karaoke, 8d, ...).',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, args: string[]) {
    if (!message.guild) return
    logger.info(
      `[Lệnh: filter] Người dùng ${message.author.tag} yêu cầu chuyển đổi hiệu ứng: ${args[0] ?? 'trống'}`
    )

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player) {
      throw new BotError('Tớ đang không hoạt động trong kênh nào cả.')
    }
    const input = args[0]?.toLowerCase()
    if (!input || !AVAILABLE_FILTERS.includes(input)) {
      throw new BotError(`Vui lòng chọn một hiệu ứng hợp lệ:\n\`${AVAILABLE_FILTERS.join(', ')}\`.`)
    }

    const { filterManager } = player

    let actionText: string

    try {
      if (RESET_ARGS.has(input)) {
        await resetAll(filterManager)
        actionText = 'xoá sạch toàn bộ hiệu ứng, quay về nguyên bản.'
      } else if (input === 'bassboost') {
        actionText = await applyBassboost(filterManager)
      } else {
        const key = (FILTER_ALIASES[input] ?? input) as FilterKey
        actionText = await applyFilter(filterManager, key)
      }
    } catch (e) {
      logger.error('[Lệnh: filter] Lỗi áp dụng filter:', e)
      throw new BotError(
        `Không thể áp dụng hiệu ứng: ${e instanceof Error ? e.message : 'Lỗi không xác định'}.`
      )
    }

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName ?? 'Tớ'}** đã ${actionText}.`
      )
    )

    const reply = await message
      .reply({ components: [container], flags: ['IsComponentsV2'] })
       
      .catch((e) => {
        logger.warn('[Lệnh: filter] Lỗi gửi thông báo:', e)
        return null
      })

    if (reply) {
      setTimeout(() => {
        reply.delete().catch(() => {})
        message.delete().catch(() => {})
      }, 15_000)
    }
  }
}

export default command
