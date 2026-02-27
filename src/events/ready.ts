// Initializes Lavalink and logs bot status when the Discord client is ready.
import { ActivityType, Events } from 'discord.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { BotClient } from '~/core/BotClient'
import { BotEvent } from '~/core/BotEvent.js'

import { logger } from '~/utils/logger.js'

// Event handler for the ClientReady event.
class ReadyEvent extends BotEvent {
  name = Events.ClientReady
  once = true

  // Initializes Lavalink and sets up the rotating lyric status for the bot instance.
  async execute(bot: BotClient): Promise<void> {
    await bot.lavalink.init({ ...bot.user!, shards: 'auto' })

    // Load lyrics from the JSON file.
    const lyricsPath = join(process.cwd(), 'data', 'lyrics.json')
    try {
      const lyricsData = JSON.parse(readFileSync(lyricsPath, 'utf8'))
      const songKeys = Object.keys(lyricsData)

      if (songKeys.length > 0) {
        // Assign a unique song to each bot based on its index.
        const songKey = songKeys[bot.botIndex % songKeys.length]
        const songLyrics = lyricsData[songKey]

        if (Array.isArray(songLyrics) && songLyrics.length > 0) {
          let currentLine = 0

          // Function to update the bot's status with the current lyric line.
          const updateStatus = () => {
            bot.user?.setActivity({
              name: songLyrics[currentLine],
              type: ActivityType.Custom
            })
            currentLine = (currentLine + 1) % songLyrics.length
          }

          // Initial status set and interval for subsequent updates.
          updateStatus()
          setInterval(updateStatus, 5_000) // Update every 10 seconds.

          logger.info(`[System] Bot ${bot.user?.tag} assigned song: ${songKey}`)
        }
      }
    } catch (err) {
      logger.error(`[System] Failed to load lyrics for bot ${bot.user?.tag}:`, err)

      // Fallback status if lyrics fail to load.
      bot.user?.setActivity({
        name: '.help',
        type: ActivityType.Listening
      })
    }

    logger.info(`[System] Bot ${bot.user?.tag} is ready and successfully initialized Lavalink!`)
  }
}

export default new ReadyEvent()
