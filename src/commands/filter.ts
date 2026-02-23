import { ContainerBuilder, type Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'

const availableFilters = [
  'bassboost',
  'nightcore',
  'vaporwave',
  'karaoke',
  'rotation',
  'tremolo',
  'vibrato',
  'lowpass',
  'clear',
  'off'
]

const command: Command = {
  name: 'filter',
  aliases: ['f', 'effects', 'fx'],
  description: 'Bật/tắt các hiệu ứng âm thanh (bassboost, nightcore, vaporwave, karaoke, 3d, ...)',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, args: string[]) {
    if (!message.guild) return

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player) {
      throw new BotError('Tớ đang không phát bản nhạc nào cả.')
    }

    const filterArg = args[0]?.toLowerCase()

    if (!filterArg || !availableFilters.includes(filterArg)) {
      throw new BotError(`Vui lòng chọn một hiệu ứng hợp lệ:\n\`${availableFilters.join(', ')}\``)
    }

    let actionText = ''

    try {
      if (['clear', 'off'].includes(filterArg)) {
        await player.filterManager.resetFilters()
        await player.filterManager.clearEQ()
        actionText = 'xoá sạch toàn bộ hiệu ứng, quay về nguyên bản bản ✨'
      } else {
        // Handle Bassboost (EQ)
        if (filterArg === 'bassboost') {
          const isBassboosted = player.filterManager.equalizerBands.some(
            (b) => b.band === 0 && b.gain === 0.25
          )

          await player.filterManager.resetFilters()
          await player.filterManager.clearEQ()

          if (isBassboosted) {
            actionText = 'tắt bộ chỉnh âm (EQ)'
          } else {
            await player.filterManager.setEQ([
              { band: 0, gain: 0.25 },
              { band: 1, gain: 0.15 },
              { band: 2, gain: 0.05 }
            ])
            actionText = 'bật 🎧 **Bassboost**'
          }
        } else {
          // Check if the requested filter is currently active
          const filterKey = (
            filterArg === 'rotation' || filterArg === '3d' || filterArg === '8d'
              ? 'rotation'
              : filterArg === 'lowpass'
                ? 'lowPass'
                : filterArg
          ) as keyof typeof player.filterManager.filters

          const isCurrentlyActive = !!player.filterManager.filters[filterKey]

          // Always clear everything first so they don't stack
          await player.filterManager.resetFilters()
          await player.filterManager.clearEQ()

          // If it was already active, we just leave it cleared (toggle OFF)
          // If it was not active, we turn it ON
          if (isCurrentlyActive) {
            actionText = `tắt hiệu ứng **${filterArg}**`
          } else {
            switch (filterArg) {
              case 'nightcore':
                await player.filterManager.toggleNightcore()
                actionText = 'bật 🐿️ **Nightcore** (nhanh & cao)'
                break
              case 'vaporwave':
                await player.filterManager.toggleVaporwave()
                actionText = 'bật 🌆 **Vaporwave** (chậm & vang)'
                break
              case 'karaoke':
                await player.filterManager.toggleKaraoke()
                actionText = 'bật 🎤 **Karaoke** (lọc giọng)'
                break
              case 'rotation':
              case '3d':
              case '8d':
                await player.filterManager.toggleRotation()
                actionText = 'bật 🌀 **8D Audio** (âm thanh xoay vòng)'
                break
              case 'tremolo':
                await player.filterManager.toggleTremolo()
                actionText = 'bật 〰️ **Tremolo** (rung âm lượng)'
                break
              case 'vibrato':
                await player.filterManager.toggleVibrato()
                actionText = 'bật ♒ **Vibrato** (rung cao độ)'
                break
              case 'lowpass':
                await player.filterManager.toggleLowPass()
                actionText = 'bật 📻 **LowPass** (âm thanh qua tường)'
                break
            }
          }
        }
      }
    } catch (e) {
      throw new BotError(
        `Không thể áp dụng hiệu ứng này: ${e instanceof Error ? e.message : 'Lỗi không xác định'}`
      )
    }

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** đã ${actionText}.`
      )
    )

    const replyMessage = await message
      .reply({
        components: [container],
        flags: ['IsComponentsV2']
      })
      .catch((e) => {
        logger.error(e)
        return null
      })

    if (replyMessage) {
      setTimeout(() => {
        replyMessage.delete().catch((e: Error) => logger.error(e))
        message.delete().catch((e: Error) => logger.error(e))
      }, 15000)
    }
  }
}

export default command
