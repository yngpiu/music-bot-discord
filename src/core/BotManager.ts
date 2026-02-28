// The central coordinator for multiple bot instances, Redis connection, and Lavalink integration.
import { EmbedBuilder, type TextChannel } from 'discord.js'
import { Redis } from 'ioredis'
import { LavalinkManager } from 'lavalink-client'
import { config } from '~/config/env.js'
import { initTrackService } from '~/services/trackService.js'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time'
import { BotClient } from '~/core/BotClient.js'
import { Loader } from '~/core/Loader.js'
import { RedisQueueStore } from '~/lib/QueueStore.js'
import { initSpotifyToken, setSpotifyRedisClient } from '~/lib/spotify/client.js'

import { logger } from '~/utils/logger.js'
import { sendContainerMessage } from '~/utils/messageUtil'
import { getDeterministicIndexFromId } from '~/utils/numberUtil.js'
import { setRedisClient } from '~/utils/rateLimiter.js'
import { formatDuration, formatTrack, getBotAvatar, getBotName } from '~/utils/stringUtil.js'

// Manages the lifecycle of multiple bot clients and shared connections (Redis, Lavalink).
export class BotManager {
  // Array of active bot client instances.
  public bots: BotClient[] = []
  // Shared Redis client for state management.
  private redis: Redis
  // Tracks which bot is handling specific message contexts.
  private messageDestinations = new Map<string, string>()

  constructor() {
    // Initialize Redis connection using environment variables or defaults.
    this.redis = new Redis({
      host: config.redis.url ? new URL(config.redis.url).hostname : 'localhost',
      port: config.redis.url ? parseInt(new URL(config.redis.url).port || '6379') : 6379,
      password: config.redis.password,
      lazyConnect: true
    })
  }

  // Connects to Redis, initializes plugins, and spawns bot instances.
  async start(): Promise<void> {
    try {
      await this.redis.connect()
      setRedisClient(this.redis)
      setSpotifyRedisClient(this.redis)
      initTrackService(this.redis)
      await initSpotifyToken()
    } catch (err) {
      logger.error('[System] Redis connection or Spotify configuration error:', err)
    }

    for (let i = 0; i < config.bots.length; i++) {
      const botConfig = config.bots[i]
      const bot = new BotClient(i)
      bot.manager = this

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
          defaultSearchPlatform: 'dzsearch',
          onDisconnect: {
            autoReconnect: true,
            destroyPlayer: false
          },
          onEmptyQueue: {
            destroyAfterMs: 300000,
            autoPlayFunction: async (player, lastPlayedTrack) => {
              if (!player.get('autoplay')) {
                logger.debug('[Autoplay] Skipped because autoplay is disabled.')
                return
              }
              if (!lastPlayedTrack) {
                logger.debug('[Autoplay] Skipped because there is no previous track.')
                return
              }

              logger.info(
                `[Autoplay] Starting to search for autoplay track based on: ${lastPlayedTrack.info.title}`
              )

              let identifier: string | undefined = undefined

              if (
                lastPlayedTrack.info.sourceName === 'youtube' ||
                lastPlayedTrack.info.sourceName === 'youtubemusic'
              ) {
                identifier = lastPlayedTrack.info.identifier
                logger.info(`[Autoplay] Using direct identifier from YouTube: ${identifier}`)
              } else {
                const author = lastPlayedTrack.info.author
                const title = lastPlayedTrack.info.title

                let queryStr = title
                if (author && author !== 'Unknown Artist') {
                  queryStr = `${author} - ${title}`
                }

                logger.info(`[Autoplay] Searching YouTube to get identifier for: ${queryStr}`)

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
                  logger.info(`[Autoplay] Found identifier from YouTube: ${identifier}`)
                } else {
                  logger.warn(`[Autoplay] No YouTube results found for: ${queryStr}`)
                }
              }

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

                const fallbackQuery = `ytsearch:${searchStr}`
                logger.info(`[Autoplay] Using fallback search: ${fallbackQuery}`)

                const fallbackResponse = await player.search(
                  { query: fallbackQuery },
                  lastPlayedTrack.requester || player.LavalinkManager.options.client?.id
                )

                if (fallbackResponse && fallbackResponse.tracks.length > 0) {
                  const tracks = fallbackResponse.tracks.slice(0, 5)
                  const randomTrack = tracks[Math.floor(Math.random() * tracks.length)]
                  if (randomTrack) {
                    logger.info(`[Autoplay] Added track from fallback: ${randomTrack.info.title}`)
                    await player.queue.add(randomTrack)
                    if (!player.playing) await player.play()

                    await this.sendAutoplayEmbed(bot, player, [randomTrack])
                  }
                } else {
                  logger.warn(`[Autoplay] Fallback search returned no results.`)
                  player.set('autoplay', false)
                  await sendContainerMessage(
                    bot.channels.cache.get(player.textChannelId!),
                    `${EMOJI.ERROR} ${getBotName(bot)} đã tự động tắt **Tự động phát** vì không tìm thấy bài hát đề xuất.`,
                    TIME.SHORT
                  )
                }
                return
              }

              try {
                logger.info(`[Autoplay] Searching Youtube Mix for: ${identifier}`)
                const mixResponse = await player.search(
                  {
                    query: `https://www.youtube.com/watch?v=${identifier}&list=RD${identifier}`,
                    source: 'youtube'
                  },
                  lastPlayedTrack.requester || player.LavalinkManager.options.client?.id
                )

                if (mixResponse && mixResponse.tracks.length > 0) {
                  const filteredTracks = mixResponse.tracks.filter(
                    (track) => track.info.identifier !== lastPlayedTrack.info.identifier
                  )

                  if (filteredTracks.length > 0) {
                    const tracksToAdd = filteredTracks.slice(0, 5).map((track) => {
                      track.pluginInfo = track.pluginInfo || {}
                      track.pluginInfo.clientData = {
                        ...(track.pluginInfo.clientData || {}),
                        fromAutoplay: true
                      }
                      return track
                    })

                    logger.info(`[Autoplay] Added ${tracksToAdd.length} tracks from Youtube Mix`)
                    await player.queue.add(tracksToAdd)
                    if (!player.playing) await player.play()

                    await this.sendAutoplayEmbed(bot, player, tracksToAdd)
                  } else {
                    logger.warn(
                      `[Autoplay] Youtube Mix only returned the current track, no new tracks.`
                    )
                  }
                } else {
                  logger.warn(`[Autoplay] Youtube Mix not found for identifier: ${identifier}`)
                }
              } catch (err) {
                logger.error(
                  '[Player] Encountered an issue while finding Youtube Mix for autoplay:',
                  err
                )
              }
            }
          }
        },
        queueOptions: {
          maxPreviousTracks: 10,
          queueStore: new RedisQueueStore(this.redis)
        }
      })

      await Loader.loadCommands(bot)

      await Loader.loadInteractions(bot)

      await Loader.registerEvents(bot, this)

      await Loader.registerLavalinkEvents(bot)

      await bot.login(botConfig.token)
      logger.info(`[System] Successfully logged in MusicBot #${i + 1} (${botConfig.clientId})`)
      this.bots.push(bot)
    }
  }

  // Retrieves an existing bot instance or assigns an idle one based on context.
  getOrAssignBot(
    guildId: string,
    options: { vcId?: string; messageId?: string; requiresVoice: boolean; targetBotId?: string }
  ): BotClient | null {
    const { vcId, messageId, requiresVoice, targetBotId } = options

    // Check if a bot was already assigned to this message context recently.
    if (messageId && this.messageDestinations.has(messageId)) {
      const cachedBotId = this.messageDestinations.get(messageId)
      return this.bots.find((b) => b.user?.id === cachedBotId) ?? null
    }

    let chosenBot: BotClient | null = null

    // If a specific bot ID is requested, try to find it.
    if (targetBotId) {
      chosenBot = this.bots.find((b) => b.user?.id === targetBotId) ?? null
    }

    // If no bot is chosen and a voice channel ID is provided, find the bot already in that channel.
    if (!chosenBot && vcId) {
      for (const bot of this.bots) {
        const botVcId = bot.guilds.cache.get(guildId)?.members.me?.voice?.channelId
        if (botVcId && botVcId === vcId) {
          chosenBot = bot
          break
        }
      }
    }

    // If still no bot, pick an idle one for voice commands or use deterministic selection for others.
    if (!chosenBot) {
      if (requiresVoice) {
        const idleBots = this.bots.filter((bot) => this.isIdle(bot, guildId))
        if (idleBots.length > 0) {
          const randomIndex = Math.floor(Math.random() * idleBots.length)
          chosenBot = idleBots[randomIndex]
        }
      } else {
        const idx = getDeterministicIndexFromId(messageId, this.bots.length)
        chosenBot = this.bots[idx] ?? this.bots[0] ?? null
      }
    }

    // Cache the assignment for 30 seconds to maintain consistency in interactions.
    if (chosenBot && messageId && chosenBot.user?.id) {
      this.messageDestinations.set(messageId, chosenBot.user.id)
      setTimeout(() => this.messageDestinations.delete(messageId), 30_000)
    }

    return chosenBot
  }

  // Checks if a bot instance is currently idle (no active player) in a guild.
  isIdle(bot: BotClient, guildId: string): boolean {
    const player = bot.lavalink.getPlayer(guildId)
    return !player
  }

  // Sends a beautiful embed notification for tracks added via autoplay.
  private async sendAutoplayEmbed(
    bot: BotClient,
    player: import('lavalink-client').Player,
    tracks: (import('lavalink-client').Track | import('lavalink-client').UnresolvedTrack)[]
  ): Promise<void> {
    const channel = (
      player.textChannelId ? bot.channels.cache.get(player.textChannelId) : undefined
    ) as TextChannel | undefined

    if (!channel || tracks.length === 0) return

    const description = tracks
      .map((t, i) => {
        const trackDisplay = formatTrack({
          title: t.info.title,
          trackLink: t.info.uri,
          author: t.info.author
        })
        return `${i + 1}. **\\[${formatDuration(t.info.duration ?? 0)}\\]** ${trackDisplay}`
      })
      .join('\n')

    const embed = new EmbedBuilder()
      .setColor(0x00c2e6)
      .setAuthor({
        name: 'Thêm tự động',
        iconURL: getBotAvatar(bot)
      })
      .setDescription(description)

    await channel.send({ embeds: [embed] }).catch((err) => {
      logger.error('[Player] Error sending Autoplay notification message:', err)
    })
  }
}
