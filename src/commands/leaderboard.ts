import type { Message } from 'discord.js'
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

import { formatTrack } from '~/utils/stringUtil.js'

// ─── Types ────────────────────────────────────────────────────────────────────

type LeaderboardView = 'tracks' | 'bots'

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

// ─── DB Queries ───────────────────────────────────────────────────────────────

async function getTopTracks(limit: number): Promise<TrackEntry[]> {
  const results = await prisma.$queryRaw<
    { title: string; artist: string; uri: string | null; playCount: bigint }[]
  >`
    SELECT t."title", t."artist", t."uri", COUNT(ph."id")::bigint AS "playCount"
    FROM "PlayHistory" ph
    JOIN "Track" t ON t."id" = ph."trackId"
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

async function getTopBots(limit: number): Promise<{ botId: string; playCount: number }[]> {
  const results = await prisma.$queryRaw<{ botId: string; playCount: bigint }[]>`
    SELECT "botId", COUNT("id")::bigint AS "playCount"
    FROM "PlayHistory"
    GROUP BY "botId"
    ORDER BY "playCount" DESC
    LIMIT ${limit}
  `

  return results.map((r) => ({
    botId: r.botId,
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
        .setLabel('Bài hát được nghe nhiều nhất')
        .setValue('tracks')
        .setEmoji('🎵')
        .setDefault(currentView === 'tracks'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Bot có nhiều lượt phát nhất')
        .setValue('bots')
        .setEmoji('🤖')
        .setDefault(currentView === 'bots')
    )

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)
}

function buildTrackEmbed(entries: TrackEntry[], page: number, totalPages: number, bot: BotClient) {
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
      name: 'Bài hát được nghe nhiều nhất',
      iconURL: bot.user?.displayAvatarURL()
    })
    .setDescription(description)
    .setColor(0xffd700)
    .setFooter({ text: `Trang ${page + 1}/${totalPages || 1}` })
}

function buildBotEmbed(entries: BotEntry[], page: number, totalPages: number, bot: BotClient) {
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
      name: 'Bot có nhiều lượt phát nhất',
      iconURL: bot.user?.displayAvatarURL()
    })
    .setDescription(description)
    .setColor(0x00c2e6)
    .setFooter({ text: `Trang ${page + 1}/${totalPages || 1}` })
}

// ─── Command ──────────────────────────────────────────────────────────────────

const command: Command = {
  name: 'leaderboard',
  aliases: ['lb', 'top'],
  description: 'Xem bảng xếp hạng bài hát và bot.',

  async execute(bot: BotClient, message: Message) {
    let currentView: LeaderboardView = 'tracks'
    let currentPage = 0

    // Cache data
    let trackEntries: TrackEntry[] = []
    let botEntries: BotEntry[] = []

    // Fetch tracks data
    trackEntries = await getTopTracks(MAX_ITEMS)

    const getTotalPages = () => {
      const entries = currentView === 'tracks' ? trackEntries : botEntries
      return Math.max(1, Math.ceil(entries.length / ITEMS_PER_PAGE))
    }

    const getEmbed = () => {
      const totalPages = getTotalPages()
      if (currentView === 'tracks') {
        return buildTrackEmbed(trackEntries, currentPage, totalPages, bot)
      }
      return buildBotEmbed(botEntries, currentPage, totalPages, bot)
    }

    const getComponents = (disabled = false) => {
      const totalPages = getTotalPages()
      return [
        buildNavButtons(currentPage, totalPages, disabled),
        buildViewSelect(currentView, disabled)
      ]
    }

    const reply = await message.reply({
      embeds: [getEmbed()],
      components: getComponents()
    })

    const collector = reply.createMessageComponentCollector({
      time: 120_000,
      filter: (i) => i.user.id === message.author.id
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

          // Lazy-load bots data on first switch
          if (currentView === 'bots' && botEntries.length === 0) {
            const rawBots = await getTopBots(MAX_ITEMS)
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
      await reply.edit({ components: getComponents(true) }).catch(() => {})
    })
  }
}

export default command
