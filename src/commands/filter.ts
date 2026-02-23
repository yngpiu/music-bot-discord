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
      switch (filterArg) {
        case 'bassboost':
          if (player.filterManager.equalizerBands.some((b) => b.band === 0 && b.gain === 0.25)) {
            await player.filterManager.clearEQ()
            actionText = 'tắt bộ chỉnh âm (EQ)'
          } else {
            await player.filterManager.setEQ([
              { band: 0, gain: 0.25 },
              { band: 1, gain: 0.15 },
              { band: 2, gain: 0.05 }
            ])
            actionText = 'bật 🎧 **Bassboost**'
          }
          break

        case 'nightcore':
          await player.filterManager.toggleNightcore()
          actionText = player.filterManager.filters.nightcore
            ? 'bật 🐿️ **Nightcore** (nhanh & cao)'
            : 'tắt 🐿️ **Nightcore**'
          break

        case 'vaporwave':
          await player.filterManager.toggleVaporwave()
          actionText = player.filterManager.filters.vaporwave
            ? 'bật 🌆 **Vaporwave** (chậm & vang)'
            : 'tắt 🌆 **Vaporwave**'
          break

        case 'karaoke':
          await player.filterManager.toggleKaraoke()
          actionText = player.filterManager.filters.karaoke
            ? 'bật 🎤 **Karaoke** (lọc giọng)'
            : 'tắt 🎤 **Karaoke**'
          break

        case 'rotation':
        case '3d':
        case '8d':
          await player.filterManager.toggleRotation()
          actionText = player.filterManager.filters.rotation
            ? 'bật 🌀 **8D Audio** (âm thanh xoay vòng)'
            : 'tắt 🌀 **8D Audio**'
          break

        case 'tremolo':
          await player.filterManager.toggleTremolo()
          actionText = player.filterManager.filters.tremolo
            ? 'bật 〰️ **Tremolo** (rung âm lượng)'
            : 'tắt 〰️ **Tremolo**'
          break

        case 'vibrato':
          await player.filterManager.toggleVibrato()
          actionText = player.filterManager.filters.vibrato
            ? 'bật ♒ **Vibrato** (rung cao độ)'
            : 'tắt ♒ **Vibrato**'
          break

        case 'lowpass':
          await player.filterManager.toggleLowPass()
          actionText = player.filterManager.filters.lowPass
            ? 'bật 📻 **LowPass** (âm thanh qua tường)'
            : 'tắt 📻 **LowPass**'
          break

        case 'clear':
        case 'off':
          await player.filterManager.resetFilters()
          await player.filterManager.clearEQ()
          actionText = 'xoá sạch toàn bộ hiệu ứng, quay về nguyên bản bản ✨'
          break
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
