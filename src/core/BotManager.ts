import { EmbedBuilder, type TextChannel } from 'discord.js'
import { Redis } from 'ioredis'
import { LavalinkManager } from 'lavalink-client'
import { config } from '~/config/env.js'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { Loader } from '~/core/Loader.js'
import { RedisQueueStore } from '~/lib/QueueStore.js'
import { initSpotifyToken, setSpotifyRedisClient } from '~/lib/spotify/client.js'
import { initTrackService } from '~/lib/trackService.js'

import { logger } from '~/utils/logger.js'
import { getDeterministicIndexFromId } from '~/utils/numberUtil.js'
import { setRedisClient } from '~/utils/rateLimiter.js'
import { formatDuration, formatTrack } from '~/utils/stringUtil.js'

export class BotManager {
  public bots: BotClient[] = []
  private redis: Redis
  private messageDestinations = new Map<string, string>()

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
      setSpotifyRedisClient(this.redis)
      initTrackService(this.redis)
      await initSpotifyToken()
    } catch (err) {
      logger.error('[Hệ Thống] Lỗi kết nối Redis hoặc cấu hình Spotify:', err)
    }

    // Create bot clients
    for (let i = 0; i < config.bots.length; i++) {
      const botConfig = config.bots[i]
      const bot = new BotClient(i)
      bot.manager = this

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
          defaultSearchPlatform: 'dzsearch',
          onDisconnect: {
            autoReconnect: true,
            destroyPlayer: false
          },
          onEmptyQueue: {
            destroyAfterMs: 300000,
            autoPlayFunction: async (player, lastPlayedTrack) => {
              if (!player.get('autoplay')) {
                logger.debug('[Autoplay] Bỏ qua vì autoplay đang tắt.')
                return
              }
              if (!lastPlayedTrack) {
                logger.debug('[Autoplay] Bỏ qua vì không có bài hát vừa phát.')
                return
              }

              logger.info(
                `[Autoplay] Bắt đầu tìm kiếm bài hát autoplay dựa trên: ${lastPlayedTrack.info.title}`
              )

              let identifier: string | undefined = undefined

              // 1. If it's already a YouTube/YouTube Music track, we already have the identifier
              if (
                lastPlayedTrack.info.sourceName === 'youtube' ||
                lastPlayedTrack.info.sourceName === 'youtubemusic'
              ) {
                identifier = lastPlayedTrack.info.identifier
                logger.info(`[Autoplay] Dùng identifier trực tiếp từ YouTube: ${identifier}`)
              }
              // 2. If it's any other track (Spotify, SoundCloud, Apple Music etc), we first need to search YouTube to get a YouTube Video ID.
              else {
                const author = lastPlayedTrack.info.author
                const title = lastPlayedTrack.info.title

                let queryStr = title
                if (author && author !== 'Unknown Artist') {
                  queryStr = `${author} - ${title}`
                }

                logger.info(`[Autoplay] Tìm kiếm YouTube để lấy identifier cho: ${queryStr}`)

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
                  logger.info(`[Autoplay] Đã tìm thấy identifier từ YouTube: ${identifier}`)
                } else {
                  logger.warn(`[Autoplay] Không tìm thấy kết quả YouTube cho: ${queryStr}`)
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

                const fallbackQuery = `ytsearch:${searchStr}`
                logger.info(`[Autoplay] Dùng fallback search: ${fallbackQuery}`)

                const fallbackResponse = await player.search(
                  { query: fallbackQuery },
                  lastPlayedTrack.requester || player.LavalinkManager.options.client?.id
                )

                if (fallbackResponse && fallbackResponse.tracks.length > 0) {
                  const tracks = fallbackResponse.tracks.slice(0, 5)
                  const randomTrack = tracks[Math.floor(Math.random() * tracks.length)]
                  if (randomTrack) {
                    logger.info(`[Autoplay] Đã thêm bài hát từ fallback: ${randomTrack.info.title}`)
                    await player.queue.add(randomTrack)
                    if (!player.playing) await player.play()

                    await this.sendAutoplayEmbed(bot, player, [randomTrack])
                  }
                } else {
                  logger.warn(`[Autoplay] Fallback search không trả về kết quả nào.`)
                  try {
                    const channel = bot.channels.cache.get(player.textChannelId!)
                    if (channel?.isTextBased() && 'send' in channel) {
                      await channel.send({
                        content: `${EMOJI.ERROR} **Mất kết nối YouTube Music!** Không thể tìm thấy bài hát liên quan để gợi ý (hết nhạc tự động chèn). Bot sẽ dừng phát nhạc tại đây.`
                      })
                    }
                  } catch (e) {
                    logger.error('[Autoplay] Lỗi gửi thông báo fallback trống:', e)
                  }
                }
                return
              }

              // 4. Fetch the Youtube Mix playlist using the identifier
              try {
                logger.info(`[Autoplay] Tìm kiếm Youtube Mix cho: ${identifier}`)
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

                    logger.info(`[Autoplay] Đã thêm ${tracksToAdd.length} bài hát từ Youtube Mix`)
                    await player.queue.add(tracksToAdd)
                    if (!player.playing) await player.play()

                    await this.sendAutoplayEmbed(bot, player, tracksToAdd)
                  } else {
                    logger.warn(
                      `[Autoplay] Youtube Mix chỉ trả về bài hát hiện tại, không có bài mới.`
                    )
                  }
                } else {
                  logger.warn(`[Autoplay] Không tìm thấy Youtube Mix cho identifier: ${identifier}`)
                }
              } catch (err) {
                logger.error('[Player] Gặp sự cố khi tìm Youtube Mix cho autoplay:', err)
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
      logger.info(`[Hệ Thống] Đã đăng nhập thành công MusicBot #${i + 1} (${botConfig.clientId})`)
      this.bots.push(bot)
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
    options: { vcId?: string; messageId?: string; requiresVoice: boolean; targetBotId?: string }
  ): BotClient | null {
    const { vcId, messageId, requiresVoice, targetBotId } = options

    // Check cache first to avoid race conditions across different bot instances
    if (messageId && this.messageDestinations.has(messageId)) {
      const cachedBotId = this.messageDestinations.get(messageId)
      return this.bots.find((b) => b.user?.id === cachedBotId) ?? null
    }

    let chosenBot: BotClient | null = null

    if (requiresVoice) {
      if (targetBotId) {
        // Find the specific bot requested
        chosenBot = this.bots.find((b) => b.user?.id === targetBotId) ?? null
      }

      // Priority 1: bot already in user's VC
      if (!chosenBot && vcId) {
        for (const bot of this.bots) {
          const botVcId = bot.guilds.cache.get(guildId)?.members.me?.voice?.channelId
          if (botVcId && botVcId === vcId) {
            chosenBot = bot
            break
          }
        }
      }

      // Priority 2: any idle bot
      if (!chosenBot) {
        const idleBots = this.bots.filter((bot) => this.isIdle(bot, guildId))
        if (idleBots.length > 0) {
          const randomIndex = Math.floor(Math.random() * idleBots.length)
          chosenBot = idleBots[randomIndex]
        }
      }
    } else {
      // Non-voice: distribute using message ID hash
      const idx = getDeterministicIndexFromId(messageId, this.bots.length)
      chosenBot = this.bots[idx] ?? this.bots[0] ?? null
    }

    // Cache the decision to prevent duplicate bot replies
    if (chosenBot && messageId && chosenBot.user?.id) {
      this.messageDestinations.set(messageId, chosenBot.user.id)
      setTimeout(() => this.messageDestinations.delete(messageId), 30_000)
    }

    return chosenBot
  }

  /**
   * A bot is "idle" in a guild if it has no active/playing player.
   */
  isIdle(bot: BotClient, guildId: string): boolean {
    const player = bot.lavalink.getPlayer(guildId)
    return !player
  }

  /**
   * Helper to send an embed when autoplay adds new tracks
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async sendAutoplayEmbed(bot: BotClient, player: any, tracks: any[]) {
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
        iconURL: bot.user?.displayAvatarURL()
      })
      .setDescription(description)

    await channel.send({ embeds: [embed] }).catch((err) => {
      logger.error('[Player] Lỗi khi gửi tin nhắn thông báo Autoplay:', err)
    })
  }
}
