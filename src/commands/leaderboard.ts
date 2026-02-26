/**
 * @file leaderboard.ts
 * @description Command to display various music-related leaderboards (top tracks, listeners, bots).
 */
import type { Guild, Message } from 'discord.js'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient'
import prisma from '~/lib/prisma.js'

import { logger } from '~/utils/logger.js'
import { formatTrack } from '~/utils/stringUtil.js'

/**
 * Types of leaderboard views available.
 */
type LeaderboardView = 'personal' | 'tracks' | 'listeners' | 'bots'

/**
 * Represents a track entry in the leaderboard.
 */
interface TrackEntry {
  title: string
  artist: string
  uri: string | null
  playCount: number
}

/**
 * Represents a bot entry in the leaderboard.
 */
interface BotEntry {
  botId: string
  botName: string
  playCount: number
}

/**
 * Represents a user entry in the leaderboard.
 */
interface UserEntry {
  userId: string
  userName: string
  playCount: number
}

/**
 * Fetches the top tracks for a specific user in a guild.
 * @param {number} limit - Maximum number of entries to return.
 * @param {string} guildId - The ID of the guild.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<TrackEntry[]>} - A list of top tracks.
 */
async function getPersonalTopTracks(
  limit: number,
  guildId: string,
  userId: string
): Promise<TrackEntry[]> {
  const results = await prisma.$queryRaw<
    { title: string; artist: string; uri: string | null; playCount: bigint }[]
  >`
    SELECT t."title", t."artist", t."uri", COUNT(pl."id")::bigint AS "playCount"
    FROM "PlayListener" pl
    JOIN "PlayHistory" ph ON ph."id" = pl."historyId"
    JOIN "Track" t ON t."id" = ph."trackId"
    WHERE ph."guildId" = ${guildId} AND pl."userId" = ${userId}
    GROUP BY t."id", t."title", t."artist", t."uri"
    ORDER BY "playCount" DESC
    LIMIT ${limit}
  `

  return results.map((r) => ({
    title: r.title,
    artist: r.artist,
    uri: r.uri,
    playCount: Number(r.playCount)
  }))
}

/**
 * Fetches the overall top tracks in a guild.
 * @param {number} limit - Maximum number of entries to return.
 * @param {string} guildId - The ID of the guild.
 * @returns {Promise<TrackEntry[]>} - A list of top tracks.
 */
async function getTopTracks(limit: number, guildId: string): Promise<TrackEntry[]> {
  const results = await prisma.$queryRaw<
    { title: string; artist: string; uri: string | null; playCount: bigint }[]
  >`
    SELECT t."title", t."artist", t."uri", COUNT(ph."id")::bigint AS "playCount"
    FROM "PlayHistory" ph
    JOIN "Track" t ON t."id" = ph."trackId"
    WHERE ph."guildId" = ${guildId}
    GROUP BY t."id", t."title", t."artist", t."uri"
    ORDER BY "playCount" DESC
    LIMIT ${limit}
  `

  return results.map((r) => ({
    title: r.title,
    artist: r.artist,
    uri: r.uri,
    playCount: Number(r.playCount)
  }))
}

/**
 * Fetches the top-performing bots in a guild.
 * @param {number} limit - Maximum number of entries to return.
 * @param {string} guildId - The ID of the guild.
 * @returns {Promise<{ botId: string, playCount: number }[]>} - A list of top bots.
 */
async function getTopBots(
  limit: number,
  guildId: string
): Promise<{ botId: string; playCount: number }[]> {
  const results = await prisma.$queryRaw<{ botId: string; playCount: bigint }[]>`
    SELECT "botId", COUNT("id")::bigint AS "playCount"
    FROM "PlayHistory"
    WHERE "guildId" = ${guildId}
    GROUP BY "botId"
    ORDER BY "playCount" DESC
    LIMIT ${limit}
  `

  return results.map((r) => ({
    botId: r.botId,
    playCount: Number(r.playCount)
  }))
}

/**
 * Fetches the most active listeners in a guild.
 * @param {number} limit - Maximum number of entries to return.
 * @param {string} guildId - The ID of the guild.
 * @returns {Promise<{ userId: string, playCount: number }[]>} - A list of top listeners.
 */
async function getTopListeners(
  limit: number,
  guildId: string
): Promise<{ userId: string; playCount: number }[]> {
  const results = await prisma.$queryRaw<{ userId: string; playCount: bigint }[]>`
    SELECT pl."userId", COUNT(pl."id")::bigint AS "playCount"
    FROM "PlayListener" pl
    JOIN "PlayHistory" ph ON ph."id" = pl."historyId"
    WHERE ph."guildId" = ${guildId}
    GROUP BY pl."userId"
    ORDER BY "playCount" DESC
    LIMIT ${limit}
  `
  return results.map((r) => ({
    userId: r.userId,
    playCount: Number(r.playCount)
  }))
}

const ITEMS_PER_PAGE = 10
const MAX_ITEMS = 100

/**
 * Builds the navigation buttons (first, prev, next, last) for the leaderboard.
 * @param {number} page - Current page index.
 * @param {number} totalPages - Total number of pages.
 * @param {boolean} disabled - Whether the buttons should be disabled.
 * @returns {ActionRowBuilder<ButtonBuilder>} - The buttons action row.
 */
function buildNavButtons(
  page: number,
  totalPages: number,
  disabled = false
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('lb_first')
      .setEmoji(EMOJI.FIRST.trim())
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId('lb_prev')
      .setEmoji(EMOJI.PREV.trim())
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId('lb_next')
      .setEmoji(EMOJI.NEXT.trim())
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId('lb_last')
      .setEmoji(EMOJI.LAST.trim())
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page >= totalPages - 1)
  )
}

/**
 * Builds the select menu for switching between leaderboard views.
 * @param {LeaderboardView} currentView - The active view.
 * @param {boolean} disabled - Whether the menu should be disabled.
 * @returns {ActionRowBuilder<StringSelectMenuBuilder>} - The select menu action row.
 */
function buildViewSelect(
  currentView: LeaderboardView,
  disabled = false
): ActionRowBuilder<StringSelectMenuBuilder> {
  const select = new StringSelectMenuBuilder()
    .setCustomId('lb_view')
    .setPlaceholder('Chọn bảng xếp hạng...')
    .setDisabled(disabled)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('BXH bài hát bạn nghe nhiều nhất')
        .setValue('personal')
        .setEmoji('👤')
        .setDefault(currentView === 'personal'),
      new StringSelectMenuOptionBuilder()
        .setLabel('BXH bài hát được phát nhiều nhất')
        .setValue('tracks')
        .setEmoji('🎵')
        .setDefault(currentView === 'tracks'),
      new StringSelectMenuOptionBuilder()
        .setLabel('BXH người nghe nhiều nhất')
        .setValue('listeners')
        .setEmoji('👥')
        .setDefault(currentView === 'listeners'),
      new StringSelectMenuOptionBuilder()
        .setLabel('BXH bot có số lần phát nhiều nhất')
        .setValue('bots')
        .setEmoji('🤖')
        .setDefault(currentView === 'bots')
    )

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)
}

/**
 * Builds an embed for track-based leaderboards.
 * @param {TrackEntry[]} entries - The list of tracks.
 * @param {number} page - The current page.
 * @param {number} totalPages - Total pages.
 * @param {Guild} guild - The guild object.
 * @param {string} title - The embed title.
 * @returns {EmbedBuilder} - The constructed embed.
 */
function buildTrackEmbed(
  entries: TrackEntry[],
  page: number,
  totalPages: number,
  guild: Guild,
  title: string
): EmbedBuilder {
  const start = page * ITEMS_PER_PAGE
  const pageEntries = entries.slice(start, start + ITEMS_PER_PAGE)

  const description =
    pageEntries.length > 0
      ? pageEntries
          .map((e, i) => {
            const rank = start + i + 1
            const medal = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `${rank}.`
            const track = formatTrack({ title: e.title, trackLink: e.uri, author: e.artist })
            return `${medal} ${track} • \`${e.playCount} lần\``
          })
          .join('\n')
      : '*Chưa có dữ liệu nào.*'

  return new EmbedBuilder()
    .setAuthor({
      name: title,
      iconURL: guild.iconURL() ?? undefined
    })
    .setDescription(description)
    .setColor(0xffd700)
    .setFooter({ text: `Trang ${page + 1}/${totalPages || 1}` })
}

/**
 * Builds an embed for the bot leaderboard.
 * @param {BotEntry[]} entries - The list of bots.
 * @param {number} page - The current page.
 * @param {number} totalPages - Total pages.
 * @param {Guild} guild - The guild object.
 * @returns {EmbedBuilder} - The constructed embed.
 */
function buildBotEmbed(
  entries: BotEntry[],
  page: number,
  totalPages: number,
  guild: Guild
): EmbedBuilder {
  const start = page * ITEMS_PER_PAGE
  const pageEntries = entries.slice(start, start + ITEMS_PER_PAGE)

  const description =
    pageEntries.length > 0
      ? pageEntries
          .map((e, i) => {
            const rank = start + i + 1
            const medal = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `${rank}.`
            return `${medal} **${e.botName}** • \`${e.playCount} lần\``
          })
          .join('\n')
      : '*Chưa có dữ liệu nào.*'

  return new EmbedBuilder()
    .setAuthor({
      name: `BXH bot theo tổng lượt phát ở ${guild.name}`,
      iconURL: guild.iconURL() ?? undefined
    })
    .setDescription(description)
    .setColor(0x00c2e6)
    .setFooter({ text: `Trang ${page + 1}/${totalPages || 1}` })
}

/**
 * Builds an embed for the user listener leaderboard.
 * @param {UserEntry[]} entries - The list of users.
 * @param {number} page - The current page.
 * @param {number} totalPages - Total pages.
 * @param {Guild} guild - The guild object.
 * @returns {EmbedBuilder} - The constructed embed.
 */
function buildUserEmbed(
  entries: UserEntry[],
  page: number,
  totalPages: number,
  guild: Guild
): EmbedBuilder {
  const start = page * ITEMS_PER_PAGE
  const pageEntries = entries.slice(start, start + ITEMS_PER_PAGE)

  const description =
    pageEntries.length > 0
      ? pageEntries
          .map((e, i) => {
            const rank = start + i + 1
            const medal = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `${rank}.`
            return `${medal} **${e.userName}** • \`${e.playCount} lần\``
          })
          .join('\n')
      : '*Chưa có dữ liệu nào.*'

  return new EmbedBuilder()
    .setAuthor({
      name: `BXH người nghe nhiều nhất ở ${guild.name}`,
      iconURL: guild.iconURL() ?? undefined
    })
    .setDescription(description)
    .setColor(0x9b59b6)
    .setFooter({ text: `Trang ${page + 1}/${totalPages || 1}` })
}

/**
 * Command to display music statistics and leaderboards.
 */
class LeaderboardCommand extends BaseCommand {
  name = 'leaderboard'
  aliases = ['lb', 'top']
  description = 'Xem bảng xếp hạng bài hát và bot.'

  /**
   * Executes the leaderboard command, handling interactions for pagination and view switching.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Message} message - The command message.
   */
  async execute(bot: BotClient, message: Message): Promise<void> {
    let currentView: LeaderboardView = 'personal'
    let currentPage = 0

    const guild = message.guild!
    const userId = message.author.id
    logger.info(
      `[Command: leaderboard] User ${message.author.tag} requested to view leaderboard in server ${guild.id}`
    )

    let personalEntries: TrackEntry[] = []
    let trackEntries: TrackEntry[] = []
    let listenerEntries: UserEntry[] = []
    let botEntries: BotEntry[] = []

    // Fetch initial data for personal top tracks.
    personalEntries = await getPersonalTopTracks(MAX_ITEMS, guild.id, userId)

    /**
     * Gets the entries for the active view.
     */
    const getEntries = () => {
      if (currentView === 'personal') return personalEntries
      if (currentView === 'tracks') return trackEntries
      if (currentView === 'listeners') return listenerEntries
      return botEntries
    }

    /**
     * Calculates total pages for the current data set.
     */
    const getTotalPages = () => Math.max(1, Math.ceil(getEntries().length / ITEMS_PER_PAGE))

    /**
     * Generates the appropriate embed based on current view and page.
     */
    const getEmbed = () => {
      const totalPages = getTotalPages()
      if (currentView === 'personal') {
        return buildTrackEmbed(
          personalEntries,
          currentPage,
          totalPages,
          guild,
          `BXH cá nhân theo tổng lượt phát ở ${guild.name}`
        )
      }
      if (currentView === 'tracks') {
        return buildTrackEmbed(
          trackEntries,
          currentPage,
          totalPages,
          guild,
          `BXH bài hát được phát nhiều nhất ở ${guild.name}`
        )
      }
      if (currentView === 'listeners') {
        return buildUserEmbed(listenerEntries, currentPage, totalPages, guild)
      }
      return buildBotEmbed(botEntries, currentPage, totalPages, guild)
    }

    /**
     * Retrieves the UI components (buttons and select menu).
     */
    const getComponents = (disabled = false) => [
      buildNavButtons(currentPage, getTotalPages(), disabled),
      buildViewSelect(currentView, disabled)
    ]

    const reply = await message.reply({
      embeds: [getEmbed()],
      components: getComponents()
    })

    const collector = reply.createMessageComponentCollector({
      time: 120_000,
      filter: (i) => i.user.id === userId
    })

    collector.on('collect', async (interaction) => {
      collector.resetTimer()
      await interaction.deferUpdate()

      // Handle pagination buttons.
      if (interaction.isButton()) {
        const totalPages = getTotalPages()
        switch (interaction.customId) {
          case 'lb_first':
            currentPage = 0
            break
          case 'lb_prev':
            currentPage = Math.max(0, currentPage - 1)
            break
          case 'lb_next':
            currentPage = Math.min(totalPages - 1, currentPage + 1)
            break
          case 'lb_last':
            currentPage = totalPages - 1
            break
        }
      }

      // Handle view switching.
      if (interaction.isStringSelectMenu() && interaction.customId === 'lb_view') {
        const newView = interaction.values[0] as LeaderboardView
        if (newView !== currentView) {
          currentView = newView
          currentPage = 0

          // Lazy-load data only when the view is selected.
          if (currentView === 'tracks' && trackEntries.length === 0) {
            trackEntries = await getTopTracks(MAX_ITEMS, guild.id)
          }

          if (currentView === 'listeners' && listenerEntries.length === 0) {
            const rawListeners = await getTopListeners(MAX_ITEMS, guild.id)
            listenerEntries = await Promise.all(
              rawListeners.map(async (entry) => {
                let userName = `User (${entry.userId})`
                try {
                  const member = await guild.members.fetch(entry.userId)
                  userName = member.displayName || member.user.username
                } catch {
                  /* ignore */
                }
                return { ...entry, userName }
              })
            )
          }

          if (currentView === 'bots' && botEntries.length === 0) {
            const rawBots = await getTopBots(MAX_ITEMS, guild.id)
            botEntries = await Promise.all(
              rawBots.map(async (entry) => {
                let botName = `Bot (${entry.botId})`
                try {
                  const user = await bot.users.fetch(entry.botId)
                  botName = user.displayName || user.username
                } catch {
                  /* ignore */
                }
                return { ...entry, botName }
              })
            )
          }
        }
      }

      await interaction.editReply({
        embeds: [getEmbed()],
        components: getComponents()
      })
    })

    collector.on('end', async () => {
      // Disable components upon timeout.
      await reply.edit({ components: getComponents(true) }).catch((err) => {
        logger.warn('[Command: leaderboard] Error disabling buttons on timeout:', err)
      })
    })
  }
}

export default new LeaderboardCommand()
