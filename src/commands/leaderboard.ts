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
import type { BotClient } from '~/core/BotClient'
import prisma from '~/lib/prisma.js'

import { logger } from '~/utils/logger.js'
import { formatTrack } from '~/utils/stringUtil.js'

// ─── Types ────────────────────────────────────────────────────────────────────

type LeaderboardView = 'personal' | 'tracks' | 'listeners' | 'bots'

interface TrackEntry {
  title: string
  artist: string
  uri: string | null
  playCount: number
}

interface BotEntry {
  botId: string
  botName: string
  playCount: number
}

interface UserEntry {
  userId: string
  userName: string
  playCount: number
}

// ─── DB Queries ───────────────────────────────────────────────────────────────

async function getPersonalTopTracks(
  limit: number,
  guildId: string,
  userId: string
): Promise<TrackEntry[]> {
  const results = await prisma.$queryRaw<
    { title: string; artist: string; uri: string | null; playCount: bigint }[]
  >`
    SELECT t."title", t."artist", t."uri", COUNT(ph."id")::bigint AS "playCount"
    FROM "PlayHistory" ph
    JOIN "Track" t ON t."id" = ph."trackId"
    WHERE ph."guildId" = ${guildId} AND ph."userId" = ${userId}
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

async function getTopListeners(
  limit: number,
  guildId: string
): Promise<{ userId: string; playCount: number }[]> {
  const results = await prisma.$queryRaw<{ userId: string; playCount: bigint }[]>`
    SELECT "userId", COUNT("id")::bigint AS "playCount"
    FROM "PlayHistory"
    WHERE "guildId" = ${guildId}
    GROUP BY "userId"
    ORDER BY "playCount" DESC
    LIMIT ${limit}
  `
  return results.map((r) => ({
    userId: r.userId,
    playCount: Number(r.playCount)
  }))
}

// ─── UI Builders ──────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10
const MAX_ITEMS = 100

function buildNavButtons(page: number, totalPages: number, disabled = false) {
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

function buildViewSelect(currentView: LeaderboardView, disabled = false) {
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

function buildTrackEmbed(
  entries: TrackEntry[],
  page: number,
  totalPages: number,
  guild: Guild,
  title: string
) {
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

function buildBotEmbed(entries: BotEntry[], page: number, totalPages: number, guild: Guild) {
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

function buildUserEmbed(entries: UserEntry[], page: number, totalPages: number, guild: Guild) {
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

const command: Command = {
  name: 'leaderboard',
  aliases: ['lb', 'top'],
  description: 'Xem bảng xếp hạng bài hát và bot.',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message) {
    let currentView: LeaderboardView = 'personal' // default: cá nhân
    let currentPage = 0

    const guild = message.guild!
    const userId = message.author.id
    logger.info(
      `[Lệnh: leaderboard] Người dùng ${message.author.tag} yêu cầu xem bảng xếp hạng ở server ${guild.id}`
    )
    // Cache data per view
    let personalEntries: TrackEntry[] = []
    let trackEntries: TrackEntry[] = []
    let listenerEntries: UserEntry[] = []
    let botEntries: BotEntry[] = []

    // Fetch personal data upfront (default view)
    personalEntries = await getPersonalTopTracks(MAX_ITEMS, guild.id, userId)

    const getEntries = () => {
      if (currentView === 'personal') return personalEntries
      if (currentView === 'tracks') return trackEntries
      if (currentView === 'listeners') return listenerEntries
      return botEntries
    }

    const getTotalPages = () => Math.max(1, Math.ceil(getEntries().length / ITEMS_PER_PAGE))

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

      // Navigation buttons
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

      // View select menu
      if (interaction.isStringSelectMenu() && interaction.customId === 'lb_view') {
        const newView = interaction.values[0] as LeaderboardView
        if (newView !== currentView) {
          currentView = newView
          currentPage = 0

          // Lazy-load on first switch
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
                  // Fallback to ID
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
                  // Fallback to ID
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
      await reply.edit({ components: getComponents(true) }).catch((err) => {
        logger.warn('[Lệnh: leaderboard] Lỗi vô hiệu hoá nút bấm khi hết giờ:', err)
      })
    })
  }
}

export default command
