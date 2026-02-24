import { Redis } from 'ioredis'
import { LavalinkManager } from 'lavalink-client'
import { config } from '~/config/env.js'

import { BotClient } from '~/core/BotClient.js'
import { Loader } from '~/core/Loader.js'
import { RedisQueueStore } from '~/lib/QueueStore.js'

import { logger } from '~/utils/logger.js'
import { getDeterministicIndexFromId } from '~/utils/numberUtil.js'
import { setRedisClient } from '~/utils/rateLimiter.js'

export class BotManager {
  public bots: BotClient[] = []
  private redis: Redis

  constructor() {
    this.redis = new Redis({
      host: config.redis.url ? new URL(config.redis.url).hostname : 'localhost',
      port: config.redis.url ? parseInt(new URL(config.redis.url).port || '6379') : 6379,
      password: config.redis.password,
      lazyConnect: true
    })
  }

  async start() {
    // Connect Redis
    try {
      await this.redis.connect()
      setRedisClient(this.redis)
      logger.info('[Boot] Successfully established connection to Redis Server.')
    } catch {
      logger.warn('[Boot] Failed to connect to Redis. Falling back to in-memory store.')
    }

    // Create bot clients
    for (let i = 0; i < config.bots.length; i++) {
      const botConfig = config.bots[i]
      const bot = new BotClient(i)

      // Setup LavalinkManager for this bot
      bot.lavalink = new LavalinkManager({
        nodes: [
          {
            id: `node_${i}`,
            host: config.lavalink.host,
            port: config.lavalink.port,
            authorization: config.lavalink.password,
            secure: config.lavalink.secure,
            retryAmount: 5,
            retryDelay: 5000
          }
        ],
        sendToShard: (guildId, payload) => bot.guilds.cache.get(guildId)?.shard?.send(payload),
        client: {
          id: botConfig.clientId,
          username: `MusicBot #${i + 1}`
        },
        autoSkip: true,
        playerOptions: {
          defaultSearchPlatform: 'ytsearch',
          onDisconnect: {
            autoReconnect: true,
            destroyPlayer: false
          },
          onEmptyQueue: {
            destroyAfterMs: 300000,
            autoPlayFunction: async (player, lastPlayedTrack) => {
              if (!player.get('autoplay')) return
              if (!lastPlayedTrack) return

              let identifier: string | undefined = undefined

              // 1. If it's already a YouTube/YouTube Music track, we already have the identifier
              if (
                lastPlayedTrack.info.sourceName === 'youtube' ||
                lastPlayedTrack.info.sourceName === 'youtubemusic'
              ) {
                identifier = lastPlayedTrack.info.identifier
              }
              // 2. If it's any other track (Spotify, SoundCloud, Apple Music etc), we first need to search YouTube to get a YouTube Video ID.
              else {
                const author = lastPlayedTrack.info.author
                const title = lastPlayedTrack.info.title

                let queryStr = title
                if (author && author !== 'Unknown Artist') {
                  queryStr = `${author} - ${title}`
                }

                const ytSearchRes = await player.search(
                  {
                    query: queryStr,
                    source: 'ytsearch'
                  },
                  {
                    requester:
                      lastPlayedTrack.requester || player.LavalinkManager.options.client?.id
                  }
                )

                if (ytSearchRes.tracks.length > 0) {
                  identifier = ytSearchRes.tracks[0].info.identifier
                }
              }

              // 3. Fallback: If we couldn't get an identifier via Spotify or direct YT match, do a generic search
              if (!identifier) {
                let searchStr: string
                if (
                  lastPlayedTrack.info.author &&
                  lastPlayedTrack.info.author !== 'Unknown Artist'
                ) {
                  searchStr = `${lastPlayedTrack.info.author} track`
                } else {
                  searchStr = `${lastPlayedTrack.info.title} other track`
                }

                const fallbackQuery = `ytmsearch:${searchStr}`
                const fallbackResponse = await player.search(
                  { query: fallbackQuery },
                  lastPlayedTrack.requester || player.LavalinkManager.options.client?.id
                )

                if (fallbackResponse && fallbackResponse.tracks.length > 0) {
                  const tracks = fallbackResponse.tracks.slice(0, 5)
                  const randomTrack = tracks[Math.floor(Math.random() * tracks.length)]
                  if (randomTrack) {
                    await player.queue.add(randomTrack)
                    if (!player.playing) {
                      await player.play()
                    }
                  }
                }
                return
              }

              // 4. Fetch the Youtube Mix playlist using the identifier
              try {
                const mixResponse = await player.search(
                  {
                    query: `https://www.youtube.com/watch?v=${identifier}&list=RD${identifier}`,
                    source: 'youtube'
                  },
                  lastPlayedTrack.requester || player.LavalinkManager.options.client?.id
                )

                if (mixResponse && mixResponse.tracks.length > 0) {
                  // Filter out the original track to prevent exact repetiton
                  const filteredTracks = mixResponse.tracks.filter(
                    (track) => track.info.identifier !== lastPlayedTrack.info.identifier
                  )

                  if (filteredTracks.length > 0) {
                    const tracksToAdd = filteredTracks.slice(0, 5).map((track) => {
                      // Mark tracked as autoplayed
                      track.pluginInfo = track.pluginInfo || {}
                      track.pluginInfo.clientData = {
                        ...(track.pluginInfo.clientData || {}),
                        fromAutoplay: true
                      }
                      return track
                    })

                    await player.queue.add(tracksToAdd)
                    if (!player.playing) {
                      await player.play()
                    }
                  }
                }
              } catch {
                // Ignore search errors or warn quietly
              }
            }
          }
        },
        queueOptions: {
          maxPreviousTracks: 10,
          queueStore: new RedisQueueStore(this.redis)
        }
      })

      // Load commands
      await Loader.loadCommands(bot)

      // Load interactions (buttons, modals, autocompletes)
      await Loader.loadInteractions(bot)

      // Register events
      await Loader.registerEvents(bot, this)

      // Register lavalink events
      await Loader.registerLavalinkEvents(bot)

      // Login
      await bot.login(botConfig.token)
      this.bots.push(bot)
      logger.info(`[Boot] Bot instance ${i + 1}/${config.bots.length} authenticated successfully.`)
    }
  }

  /**
   * Core routing — follows bots_flow.md:
   *
   * Voice commands:
   *   Priority 1 — Bot already in user's VC
   *   Priority 2 — Any idle bot
   *   Fallback    — null (all busy)
   *
   * Non-voice commands:
   *   Distribute evenly using message ID hash (no state needed)
   */
  getOrAssignBot(
    guildId: string,
    options: { vcId?: string; messageId?: string; requiresVoice: boolean }
  ): BotClient | null {
    const { vcId, messageId, requiresVoice } = options

    if (requiresVoice) {
      // Priority 1: bot already in user's VC
      if (vcId) {
        for (const bot of this.bots) {
          const botVcId = bot.guilds.cache.get(guildId)?.members.me?.voice?.channelId
          if (botVcId && botVcId === vcId) return bot
        }
      }

      // Priority 2: any idle bot
      for (const bot of this.bots) {
        if (this.isIdle(bot, guildId)) return bot
      }

      return null // all bots busy
    }

    // Non-voice: distribute using message ID hash
    const idx = getDeterministicIndexFromId(messageId, this.bots.length)
    return this.bots[idx] ?? this.bots[0] ?? null
  }

  /**
   * A bot is "idle" in a guild if it has no active/playing player.
   */
  isIdle(bot: BotClient, guildId: string): boolean {
    const player = bot.lavalink.getPlayer(guildId)
    return !player
  }
}
