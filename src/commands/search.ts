import type { GuildMember, Message, VoiceChannel } from 'discord.js'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js'
import { UnresolvedTrack } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import type { BotClient } from '~/core/BotClient'
import { BotError } from '~/core/errors.js'
import { buildAddedItemEmbed } from '~/lib/embeds.js'
import { searchSpotify } from '~/lib/spotify/client.js'

import { logger } from '~/utils/logger.js'
import { formatDuration, lines } from '~/utils/stringUtil.js'

const command: Command = {
  name: 'search',
  description: 'Tìm kiếm một bài hát.',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, args: string[]) {
    if (!message.guild) return

    const member = message.member as GuildMember
    const vcId = member?.voice?.channelId
    if (!vcId) {
      throw new BotError('Bạn đang không ở kênh thoại nào cả.')
    }
    const vc = member.voice.channel as VoiceChannel
    if (!vc.joinable) throw new BotError('Tớ không thể vào kênh thoại của bạn.')

    const query = args.join(' ')
    if (!query) {
      throw new BotError('Vui lòng nhập tên/đường dẫn bài hát.')
    } // Block URLs
    if (/^https?:\/\//.test(query)) {
      throw new BotError('Lệnh tìm kiếm không hỗ trợ đường dẫn, vui lòng sử dụng lệnh `play`.')
    }

    // Get or create player
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

    if (!player.get('owner')) {
      player.set('owner', message.author.id)
    }

    // Default source is deezer, same as bot's default configuration if not specified
    const result = await player.search({ query, source: 'dzsearch' }, message.author)

    let tracks = result.tracks.slice(0, 10)

    let currentSource = 'dzsearch'

    // Helper to build components
    const getComponents = (disabled = false, activeSource = 'dzsearch') => {
      const isSelectDisabled = disabled || tracks.length === 0

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('search_select')
        .setPlaceholder('Chọn bài hát để phát...')

      if (tracks.length > 0) {
        selectMenu.addOptions(
          tracks.map((track, index) => {
            const label = track.info.title.substring(0, 100)
            const description = (track.info.author || 'Vô danh').substring(0, 100)
            return new StringSelectMenuOptionBuilder()
              .setLabel(label)
              .setDescription(description)
              .setValue(index.toString())
              .setEmoji('🎵')
          })
        )
      } else {
        selectMenu.addOptions([
          new StringSelectMenuOptionBuilder()
            .setLabel('Không có bài hát nào')
            .setValue('none')
            .setEmoji('😢')
        ])
      }
      selectMenu.setDisabled(isSelectDisabled)

      // Source buttons
      const sources = [
        { label: 'Deezer', id: 'dzsearch', emoji: EMOJI.DEEZER, style: ButtonStyle.Secondary },
        { label: 'YouTube', id: 'ytsearch', emoji: EMOJI.YOUTUBE, style: ButtonStyle.Secondary },
        {
          label: 'SoundCloud',
          id: 'scsearch',
          emoji: EMOJI.SOUNDCLOUD,
          style: ButtonStyle.Secondary
        },
        {
          label: 'Apple Music',
          id: 'amsearch',
          emoji: EMOJI.APPLE_MUSIC,
          style: ButtonStyle.Secondary
        },
        { label: 'Spotify', id: 'spsearch', emoji: EMOJI.SPOTIFY, style: ButtonStyle.Secondary }
      ]

      const buttons = sources.map((s) =>
        new ButtonBuilder()
          .setCustomId(s.id)
          .setEmoji(s.emoji)
          .setStyle(s.style)
          .setDisabled(disabled || s.id === activeSource)
      )

      return [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
        new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)
      ]
    }

    const sourceMap: Record<string, string> = {
      dzsearch: 'Deezer',
      ytsearch: 'YouTube',
      scsearch: 'SoundCloud',
      amsearch: 'Apple Music',
      spsearch: 'Spotify'
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildDescription = (trackList: any[], sourceId: string) => {
      if (trackList.length === 0) {
        return lines(
          'ㅤ',
          `**Không có kết quả nào** từ nguồn **${sourceMap[sourceId] || 'Không xác định'}**`,
          'ㅤ'
        )
      }

      return trackList
        .map((t, i) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const authorLink = (t as any).pluginInfo?.artistUrl
          const authorStr = authorLink
            ? `[**${t.info.author}**](${authorLink})`
            : `**${t.info.author}**`

          return `${i + 1}. **\\[${formatDuration(t.info.duration ?? 0)}\\]** **[${t.info.title}](${t.info.uri})** bởi ${authorStr}`
        })
        .join('\n')
    }

    const embed = new EmbedBuilder()
      .setTitle(`Kết quả tìm kiếm cho: "${query}"`)
      .setDescription(buildDescription(tracks, currentSource))
      .setFooter({ text: 'Hãy chọn bài hát hoặc đổi nguồn tìm kiếm (60s).' })

    const reply = await message.reply({
      embeds: [embed],
      components: getComponents(false, currentSource)
    })

    const collector = reply.createMessageComponentCollector({
      time: 60000,
      filter: (i) => i.user.id === message.author.id
    })

    collector.on('collect', async (interaction) => {
      // Handle Button (Source Switch)
      if (interaction.isButton()) {
        collector.resetTimer()
        const newSource = interaction.customId
        currentSource = newSource
        await interaction.deferUpdate()

        let newResult

        try {
          if (newSource === 'spsearch') {
            const spotifyTracks = await searchSpotify(query, 10)

            if (!spotifyTracks.length) {
              newResult = { loadType: 'empty', tracks: [] }
            } else {
              // Convert to UnresolvedTrack
              const tracks = spotifyTracks.map(
                (t) =>
                  player.LavalinkManager.utils.buildUnresolvedTrack(
                    {
                      title: t.name,
                      author: t.artists.map((a) => a.name).join(', '),
                      uri: `https://open.spotify.com/track/${t.id}`,
                      identifier: t.id,
                      artworkUrl: t.album.images[0]?.url ?? null,
                      duration: t.duration_ms,
                      isrc: t.isrc ?? null
                    },
                    message.author
                  ) as UnresolvedTrack
              )

              newResult = { loadType: 'search', tracks }
            }
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            newResult = await player.search({ query, source: newSource as any }, message.author)
          }

          if (newResult.loadType === 'error' || newResult.loadType === 'empty') {
            tracks = []
          } else {
            tracks = newResult.tracks.slice(0, 10)
          }

          embed.setDescription(buildDescription(tracks, newSource))

          await interaction.editReply({
            embeds: [embed],
            components: getComponents(false, currentSource)
          })
        } catch (error) {
          logger.error(`Error searching source ${newSource}:`, error)
          await interaction.followUp({
            content: `Lỗi khi tìm kiếm: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ephemeral: true
          })
        }
        return
      }

      // Handle Select Menu
      if (interaction.isStringSelectMenu()) {
        const index = parseInt(interaction.values[0])
        const track = tracks[index]

        if (!track) return

        await interaction.deferUpdate().catch((e) => logger.error(e))
        await interaction.message.delete().catch((e) => logger.error(e))

        await player.queue.add(track)

        const addedEmbed = buildAddedItemEmbed(
          'track',
          {
            title: track.info.title,
            tracks: [track],
            thumbnailUrl: track.info.artworkUrl ?? null,
            author: track.info.author,
            trackLink: track.info.uri ?? 'https://github.com/yngpiu',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            authorLink: (track as any).pluginInfo?.artistUrl ?? null
          },
          player,
          message.author,
          bot.user?.displayAvatarURL()
        )

        await message.reply(addedEmbed)

        if (!player.playing) await player.play()

        collector.stop('selected')
      }
    })

    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        await reply.delete().catch((e) => logger.error(e))
        await message.delete().catch((e) => logger.error(e))

        // Destroy player if not playing anything and queue is empty
        if (!player.playing && player.queue.tracks.length === 0) {
          await player.destroy()
        }
      } else if (reason !== 'selected') {
        await reply
          .edit({ components: getComponents(true, currentSource) })
          .catch((e) => logger.error(e))
      }
    })
  }
}

export default command
