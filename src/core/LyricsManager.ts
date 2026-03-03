/**
 * LyricsManager — Centralized lyrics message lifecycle management.
 *
 * Handles creating, updating, and deleting the live-lyrics embed message for a
 * single player.  All message operations are serialised through a queue so that
 * concurrent Lavalink events (LyricsFound, LyricsLine, LyricsNotFound) never
 * race against each other.
 *
 * Usage:
 *   const mgr = LyricsManager.for(player, bot)
 *   mgr.sendOrUpdate(embed)
 *   mgr.notifyNotFound(title)
 *   mgr.resetForNewTrack(channelId)
 *   mgr.cleanup()
 */
import { EmbedBuilder, type Message, type TextChannel } from 'discord.js'
import type { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { TIME } from '~/constants/time.js'

import { logger } from '~/utils/logger.js'
import { safeDeleteMessageNow, safeSendMessageWithContainer } from '~/utils/messageUtil'

import type { BotClient } from './BotClient.js'

// ─── Private symbol key stored on the player ──────────────────────────────────
const LYRICS_MGR_KEY = '__lyricsManager'

export class LyricsManager {
  private bot: BotClient
  private player: Player
  private channelId: string | null = null
  private messageId: string | null = null
  private notFoundSent = false

  /** Serialisation queue – every message operation is chained here. */
  private queue: Promise<void> = Promise.resolve()

  private constructor(bot: BotClient, player: Player) {
    this.bot = bot
    this.player = player
  }

  /**
   * Retrieve (or create) the LyricsManager instance bound to a given player.
   * Safe to call from any event handler — always returns the same instance for
   * the same player.
   */
  static for(player: Player, bot: BotClient): LyricsManager {
    let mgr = player.get<LyricsManager | null>(LYRICS_MGR_KEY)
    if (!mgr) {
      mgr = new LyricsManager(bot, player)
      player.set(LYRICS_MGR_KEY, mgr)
    }
    return mgr
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Set which channel the lyrics embed lives in. */
  setChannel(channelId: string): void {
    this.channelId = channelId
  }

  /** Whether the live-lyrics feature is currently enabled. */
  get isEnabled(): boolean {
    return this.player.get<boolean>('liveLyrics') ?? false
  }

  /**
   * Create a new embed message or edit the existing one.
   * All calls are queued so concurrent events simply wait their turn.
   */
  sendOrUpdate(embed: EmbedBuilder): void {
    this.enqueue(async () => {
      const channel = this.getChannel()
      if (!channel) return

      // Try to edit existing message first
      if (this.messageId) {
        const msg = await this.fetchMessage(channel, this.messageId)
        if (msg) {
          await msg.edit({ content: '', embeds: [embed] }).catch(() => {})
          return
        }
        // Message was deleted externally — fall through to create a new one
        this.messageId = null
      }

      // Send a new message
      const sent = await channel.send({ content: '', embeds: [embed] }).catch(() => undefined)
      if (sent) {
        this.messageId = sent.id
      }
    })
  }

  /**
   * Send a "lyrics not found" notification.
   * Guaranteed to fire only once per track.
   */
  notifyNotFound(title: string): void {
    this.enqueue(async () => {
      if (this.notFoundSent) return
      this.notFoundSent = true

      const channel = this.getChannel()
      if (!channel) return

      logger.warn(`[LyricsManager: ${this.player.guildId}] Lyrics not found for: ${title}`)

      await safeSendMessageWithContainer(
        channel,
        `${EMOJI.ERROR} Không tìm thấy lời bài hát **${title}**.`,
        TIME.SHORT
      )
    })
  }

  /**
   * Call when a new track starts playing.
   * Deletes the previous embed (if any) and resets internal state so the next
   * LyricsFound/LyricsLine creates a fresh embed in the given channel.
   */
  resetForNewTrack(channelId: string): void {
    const oldMessageId = this.messageId
    const oldChannelId = this.channelId

    // Reset immediately so new events use the fresh state
    this.messageId = null
    this.notFoundSent = false
    this.channelId = channelId

    // Delete the old embed in the background via the queue
    if (oldMessageId && oldChannelId) {
      this.enqueue(async () => {
        const ch = this.bot.channels.cache.get(oldChannelId)
        if (!ch?.isTextBased()) return
        const msg = await this.fetchMessage(ch as TextChannel, oldMessageId)
        if (msg) await safeDeleteMessageNow(msg)
      })
    }
  }

  /**
   * Call when live-lyrics is turned off or the player is destroyed.
   * Deletes the current embed and resets all state.
   */
  async cleanup(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.enqueue(async () => {
        // Delete the lyrics embed if it still exists
        if (this.messageId && this.channelId) {
          const channel = this.getChannel()
          if (channel) {
            const msg = await this.fetchMessage(channel, this.messageId)
            if (msg) await safeDeleteMessageNow(msg)
          }
        }

        this.messageId = null
        this.channelId = null
        this.notFoundSent = false

        resolve()
      })
    })
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  private getChannel(): TextChannel | null {
    if (!this.channelId) return null
    const ch = this.bot.channels.cache.get(this.channelId)
    if (ch?.isTextBased()) return ch as TextChannel
    return null
  }

  private async fetchMessage(channel: TextChannel, id: string): Promise<Message | undefined> {
    return (
      channel.messages.cache.get(id) ?? (await channel.messages.fetch(id).catch(() => undefined))
    )
  }

  /** Queue an async operation so everything runs sequentially. */
  private enqueue(op: () => Promise<void>): void {
    this.queue = this.queue.then(op).catch((err) => {
      logger.error(`[LyricsManager: ${this.player.guildId}] Queue error:`, err)
    })
  }
}
