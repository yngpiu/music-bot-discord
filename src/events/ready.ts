// Initializes Lavalink and logs bot status when the Discord client is ready.
import { ActivityType, Events } from 'discord.js'
import { getKpopRadarData, getKpopRadarYoutubeRealtimeData } from '~/services/kpopRadarService.js'

import type { BotClient } from '~/core/BotClient'
import { BotEvent } from '~/core/BotEvent.js'

import { logger } from '~/utils/logger.js'

// Event handler for the ClientReady event.
class ReadyEvent extends BotEvent {
  name = Events.ClientReady
  once = true

  // Initializes Lavalink and sets up the rotating stat status for the bot instance.
  async execute(bot: BotClient): Promise<void> {
    await bot.lavalink.init({ ...bot.user!, shards: 'auto' })

    const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num)
    let currentLine = 0

    const updateStatus = async () => {
      try {
        if (bot.botIndex === 0) {
          const ytTasks = await getKpopRadarYoutubeRealtimeData()
          if (ytTasks && ytTasks.length > 0) {
            const songIndex = currentLine % ytTasks.length
            const botYoutubeSong = ytTasks[songIndex]

            if (botYoutubeSong) {
              const statusStr = `${botYoutubeSong.songName} - ${formatNumber(botYoutubeSong.playCount)} lượt xem`

              bot.user?.setActivity({
                name: statusStr,
                type: ActivityType.Custom
              })

              currentLine = currentLine + 1
              return
            }
          }
        } else {
          // Other bots display SNS stats
          const snsData = await getKpopRadarData()
          if (snsData && snsData.length > 0) {
            // Shift index back 1 to use 0-indexed positions
            const botPlatform = snsData[(bot.botIndex - 1) % snsData.length]

            if (botPlatform) {
              const platformName =
                botPlatform.name.charAt(0).toUpperCase() + botPlatform.name.slice(1)
              const line1 = `${platformName} - ${formatNumber(botPlatform.totalCount)} người theo dõi`

              let line2 = ''
              if (botPlatform.incCount > 0) {
                const ratio = parseFloat(botPlatform.incRatio).toFixed(2)
                line2 = `${platformName} - Tăng ${formatNumber(botPlatform.incCount)} (${ratio}%) so với hôm qua`
              } else if (botPlatform.incCount < 0) {
                const ratio = parseFloat(botPlatform.incRatio).toFixed(2)
                // Avoid negative signs in Giảm text
                line2 = `${platformName} - Giảm ${formatNumber(Math.abs(botPlatform.incCount))} (${Math.abs(parseFloat(ratio))}%) so với hôm qua`
              } else {
                line2 = `${platformName} - Không đổi so với hôm qua`
              }

              const statusLines = [line1, line2]
              const lineToShow = statusLines[currentLine % statusLines.length]

              bot.user?.setActivity({
                name: lineToShow,
                type: ActivityType.Custom
              })

              currentLine = currentLine + 1
              return
            }
          }
        }
      } catch {
        // Log silently
      }

      // Fallback status if data fails to load.
      bot.user?.setActivity({
        name: '.help',
        type: ActivityType.Listening
      })
    }

    // Initial status set and interval for subsequent updates.
    await updateStatus()
    setInterval(updateStatus, 5_000) // Update every 5 seconds.

    logger.info(`[System] Bot ${bot.user?.tag} is ready and successfully initialized Lavalink!`)
  }
}

export default new ReadyEvent()
