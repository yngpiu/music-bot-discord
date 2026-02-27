// Command to manage favorite tracks (add, remove, list, play).
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Collection,
  EmbedBuilder,
  type Message,
  type MessageActionRowComponentBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  type VoiceChannel
} from 'discord.js'
import type { UnresolvedTrack } from 'lavalink-client'
import { config } from '~/config/env'

import { EMOJI } from '~/constants/emoji'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'
import prisma from '~/lib/prisma.js'

import { logger } from '~/utils/logger.js'
import {
  reactLoadingMessage,
  replySuccessEmbed,
  replySuccessMessage,
  sendFollowUpEphemeral,
  sendFollowUpMessage
} from '~/utils/messageUtil.js'
import { formatDuration, formatTrack } from '~/utils/stringUtil.js'

// Parses raw command arguments into a sorted list of unique queue positions. Supports individual numbers and ranges (e.g., "1-5").
function parsePositions(args: string[], maxLength: number): number[] {
  const positions = new Set<number>()

  for (const arg of args) {
    const rangeMatch = arg.match(/^(\d+)[–-](\d+)$/)
    if (rangeMatch) {
      const from = parseInt(rangeMatch[1], 10)
      const to = parseInt(rangeMatch[2], 10)
      if (from > to)
        throw new BotError(`Khoảng không hợp lệ: \`${arg}\` (số đầu phải nhỏ hơn số cuối).`)
      for (let i = from; i <= to; i++) positions.add(i)
      continue
    }

    const n = parseInt(arg, 10)
    if (isNaN(n)) throw new BotError(`\`${arg}\` không phải là số hợp lệ.`)
    positions.add(n)
  }

  for (const pos of positions) {
    if (pos < 1 || pos > maxLength) {
      throw new BotError(
        `Vị trí **${pos}** không hợp lệ, danh sách yêu thích hiện có **${maxLength}** bài.`
      )
    }
  }

  return [...positions].sort((a, b) => a - b)
}

// Command for managing user's favorite tracks.
class FavoriteCommand extends BaseCommand {
  name = 'favorite'
  aliases = ['fav']
  description = 'Quản lý bài hát yêu thích (add, remove, play hoặc xem danh sách).'
  requiresVoice = false // Subcommands handle their own voice requirements

  // Routes the command to the appropriate handler.
  async execute(bot: BotClient, message: Message, args: string[]): Promise<void> {
    await reactLoadingMessage(message)
    const subCommand = args[0]?.toLowerCase()

    if (subCommand === 'add') {
      return this.handleAdd(bot, message)
    }

    if (subCommand === 'remove' || subCommand === 'rm' || subCommand === 'del') {
      return this.handleRemove(message, args.slice(1))
    }

    if (subCommand === 'play' || subCommand === 'p') {
      return this.handlePlay(bot, message)
    }

    // Default: list favorites
    return this.handleList(bot, message)
  }

  private async handleAdd(bot: BotClient, message: Message): Promise<void> {
    if (!message.guildId) return

    const player = bot.lavalink.getPlayer(message.guildId)
    if (!player || !player.queue.current) {
      throw new BotError('Không có bài hát nào đang phát để thêm vào danh sách yêu thích.')
    }

    const currentTrack = player.queue.current.info

    try {
      await prisma.favoriteTrack.upsert({
        where: {
          userId_identifier_sourceName: {
            userId: message.author.id,
            identifier: currentTrack.identifier,
            sourceName: currentTrack.sourceName
          }
        },
        update: {},
        create: {
          userId: message.author.id,
          title: currentTrack.title,
          author: currentTrack.author,
          uri: currentTrack.uri,
          identifier: currentTrack.identifier,
          sourceName: currentTrack.sourceName,
          artworkUrl: currentTrack.artworkUrl,
          duration: currentTrack.duration,
          isrc: currentTrack.isrc
        }
      })

      await replySuccessMessage(
        message,
        `Đã thêm **${currentTrack.title}** vào danh sách yêu thích.`
      )
    } catch (error) {
      logger.error('[Command: favorite] Error adding favorite track:', error)
      throw new BotError('Đã có lỗi xảy ra khi thêm bài hát vào danh sách yêu thích.')
    }
  }

  private async handleRemove(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
      throw new BotError(
        `Cú pháp: \`${config.prefix}fav rm <vị trí>\`\nVD: \`${config.prefix}fav rm 1\` | \`${config.prefix}fav rm 1-3\` | \`${config.prefix}fav rm 1 3\``
      )
    }

    const favorites = await prisma.favoriteTrack.findMany({
      where: { userId: message.author.id },
      orderBy: { addedAt: 'asc' }
    })

    if (favorites.length === 0) {
      throw new BotError('Danh sách yêu thích của bạn đang trống.')
    }

    const positions = parsePositions(args, favorites.length)
    const tracksToRemove = positions.map((p) => favorites[p - 1])

    try {
      await prisma.favoriteTrack.deleteMany({
        where: {
          id: {
            in: tracksToRemove.map((t) => t.id)
          }
        }
      })

      const isSingle = tracksToRemove.length === 1
      const description = isSingle
        ? `đã xóa **${tracksToRemove[0].title}** khỏi danh sách yêu thích.`
        : `đã xóa **${tracksToRemove.length}** bài hát khỏi danh sách yêu thích.`

      await replySuccessMessage(message, `**${message.author.displayName}**, ${description}`)
    } catch (error) {
      logger.error('[Command: favorite] Error removing favorite tracks:', error)
      throw new BotError('Đã xảy ra lỗi khi xóa bài hát yêu thích.')
    }
  }

  private async handleList(bot: BotClient, message: Message): Promise<void> {
    const favorites = await prisma.favoriteTrack.findMany({
      where: { userId: message.author.id },
      orderBy: { addedAt: 'asc' }
    })

    if (favorites.length === 0) {
      throw new BotError('Danh sách yêu thích của bạn đang trống.')
    }

    let currentPage = 0
    const itemsPerPage = 10
    const totalPages = Math.ceil(favorites.length / itemsPerPage)

    const buildEmbed = (page: number) => {
      const start = page * itemsPerPage
      const pagedTracks = favorites.slice(start, start + itemsPerPage)

      const description = pagedTracks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any, i: number) => {
          const trackDisplay = formatTrack({
            title: t.title,
            trackLink: t.uri ?? '',
            author: t.author
          })
          return `${start + i + 1}. **\\[${formatDuration(t.duration)}\\]** ${trackDisplay}`
        })
        .join('\n')

      return new EmbedBuilder()
        .setColor(0x00c2e6)
        .setTitle(
          `Danh sách yêu thích của ${message.author.displayName} - Trang ${page + 1}/${totalPages}`
        )
        .setDescription(description)
        .setFooter({ text: 'Hãy chọn bài hát bạn muốn nghe (60s).' })
    }

    const getComponents = (page: number, disabled = false) => {
      const start = page * itemsPerPage
      const pagedTracks = favorites.slice(start, start + itemsPerPage)

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('fav_select')
        .setPlaceholder('Chọn bài hát để phát...')
        .setDisabled(disabled)

      if (pagedTracks.length > 0) {
        selectMenu.addOptions(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pagedTracks.map((track: any, index: number) => {
            const label = track.title.substring(0, 100)
            const descriptionOption = track.author ? track.author.substring(0, 100) : ''
            const option = new StringSelectMenuOptionBuilder()
              .setLabel(label)
              .setValue((start + index).toString())
              .setEmoji('🎵')

            if (descriptionOption) option.setDescription(descriptionOption)
            return option
          })
        )
      } else {
        selectMenu.addOptions([
          new StringSelectMenuOptionBuilder().setLabel('Không có bài hát nào').setValue('none')
        ])
        selectMenu.setDisabled(true)
      }

      const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          selectMenu
        ) as unknown as ActionRowBuilder<MessageActionRowComponentBuilder>
      ]

      if (totalPages > 1) {
        const btnPrev = new ButtonBuilder()
          .setCustomId('fav_prev')
          .setEmoji(EMOJI.PREV.trim() || '◀️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled || page === 0)

        const btnNext = new ButtonBuilder()
          .setCustomId('fav_next')
          .setEmoji(EMOJI.NEXT.trim() || '▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled || page >= totalPages - 1)

        rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(btnPrev, btnNext))
      }

      return rows
    }

    const reply = await replySuccessEmbed(
      message,
      buildEmbed(currentPage),
      getComponents(currentPage),
      60000
    )

    if (!reply) return

    const collector = reply.createMessageComponentCollector({
      time: 60000,
      filter: (i) => i.user.id === message.author.id
    })

    collector.on(
      'collect',
      async (interaction: ButtonInteraction | StringSelectMenuInteraction) => {
        if (interaction.isButton()) {
          collector.resetTimer()
          await interaction.deferUpdate().catch(() => {})

          if (interaction.customId === 'fav_prev' && currentPage > 0) {
            currentPage--
          } else if (interaction.customId === 'fav_next' && currentPage < totalPages - 1) {
            currentPage++
          }

          await interaction.message.edit({
            embeds: [buildEmbed(currentPage)],
            components: getComponents(currentPage)
          })
          return
        }

        if (interaction.isStringSelectMenu()) {
          const index = parseInt(interaction.values[0])
          const track = favorites[index]

          if (!track) return

          await interaction.deferUpdate().catch(() => {})

          const member = interaction.guild?.members.cache.get(interaction.user.id)
          const vcId = member?.voice.channelId
          if (!vcId) {
            await sendFollowUpEphemeral(interaction, 'Bạn đang không ở kênh thoại nào cả.')
            return
          }

          const vc = interaction.guild!.channels.cache.get(vcId) as VoiceChannel
          if (!vc?.joinable) throw new BotError('Tớ không thể vào kênh thoại của bạn.')

          const player =
            bot.lavalink.getPlayer(interaction.guildId!) ??
            bot.lavalink.createPlayer({
              guildId: interaction.guildId!,
              voiceChannelId: vcId,
              textChannelId: interaction.channelId!,
              selfDeaf: true,
              selfMute: false,
              volume: 100
            })

          if (!player.connected) await player.connect()
          if (player.voiceChannelId !== vcId) {
            await sendFollowUpEphemeral(interaction, 'Bạn không ở cùng kênh thoại với tớ.')
            return
          }

          const unresolvedTrack = player.LavalinkManager.utils.buildUnresolvedTrack(
            {
              title: track.title,
              author: track.author,
              uri: track.uri ?? undefined,
              identifier: track.identifier,
              sourceName: track.sourceName as import('lavalink-client').SourceNames,
              artworkUrl: track.artworkUrl ?? undefined,
              duration: track.duration,
              isrc: track.isrc ?? undefined
            },
            interaction.user
          )

          await player.queue.add(unresolvedTrack)

          const embed = new EmbedBuilder()
            .setColor(0x00c2e6)
            .setDescription(
              `${EMOJI.ANIMATED_CAT_DANCE} Đã thêm **${track.title}** từ danh sách yêu thích vào hàng đợi.`
            )
          await sendFollowUpMessage(interaction, embed, 60_000)

          if (!player.playing) await player.play()
        }
      }
    )

    collector.on(
      'end',
      async (collected: Collection<string, ButtonInteraction>, reason: string) => {
        if (reason === 'time') {
          const player = bot.lavalink.getPlayer(message.guildId!)
          if (player && !player.playing && player.queue.tracks.length === 0) {
            await player.destroy()
          }
        } else if (reason !== 'selected') {
          await reply.edit({ components: getComponents(currentPage, true) }).catch(() => {})
        }
      }
    )
  }

  private async handlePlay(bot: BotClient, message: Message): Promise<void> {
    if (!message.guild) return
    const vcId = message.guild.members.cache.get(message.author.id)?.voice.channelId

    if (!vcId) throw new BotError('Bạn đang không ở kênh thoại nào cả.')
    const vc = message.guild.channels.cache.get(vcId) as VoiceChannel
    if (!vc?.joinable) throw new BotError('Tớ không thể vào kênh thoại của bạn.')

    const favorites = await prisma.favoriteTrack.findMany({
      where: { userId: message.author.id },
      orderBy: { addedAt: 'asc' }
    })

    if (favorites.length === 0) {
      throw new BotError('Danh sách yêu thích của bạn đang trống.')
    }

    const player =
      bot.lavalink.getPlayer(message.guild.id) ??
      bot.lavalink.createPlayer({
        guildId: message.guild.id,
        voiceChannelId: vcId,
        textChannelId: message.channel.id,
        selfDeaf: true,
        selfMute: false,
        volume: 100,
        instaUpdateFiltersFix: true
      })

    if (!player.connected) await player.connect()
    if (player.voiceChannelId !== vcId) throw new BotError('Bạn không ở cùng kênh thoại với tớ.')

    const tracks = favorites.map(
      (
        track: any // eslint-disable-line @typescript-eslint/no-explicit-any
      ) =>
        player.LavalinkManager.utils.buildUnresolvedTrack(
          {
            title: track.title,
            author: track.author,
            uri: track.uri ?? undefined,
            identifier: track.identifier,
            sourceName: track.sourceName as import('lavalink-client').SourceNames,
            artworkUrl: track.artworkUrl ?? undefined,
            duration: track.duration,
            isrc: track.isrc ?? undefined
          },
          message.author
        ) as UnresolvedTrack
    )

    await player.queue.add(tracks)

    await replySuccessMessage(
      message,
      `Đã thêm **${tracks.length}** bài hát yêu thích vào danh sách chờ.`
    )

    if (!player.playing) await player.play()
  }
}

export default new FavoriteCommand()
