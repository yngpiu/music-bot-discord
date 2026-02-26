import type { Message, VoiceChannel } from 'discord.js'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js'
import { Player, UnresolvedTrack } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient'
import { BotError } from '~/core/errors.js'
import { buildAddedItemEmbed } from '~/lib/embeds.js'
import {
  fetchAlbum,
  fetchPlaylist,
  searchSpotify,
  searchSpotifyAlbums,
  searchSpotifyPlaylists
} from '~/lib/spotify/client.js'

import { logger } from '~/utils/logger.js'
import { formatDuration, formatTrack, lines } from '~/utils/stringUtil.js'

class SearchCommand extends BaseCommand {
  name = 'search'
  description = 'Tìm kiếm bài hát, album, hoặc playlist.'

  // ─── Private Handlers ──────────────────────────────────────────────────

  private async handleTrackSearch(bot: BotClient, message: Message, query: string, player: Player) {
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
            const description = track.info.author ? track.info.author.substring(0, 100) : ''
            const option = new StringSelectMenuOptionBuilder()
              .setLabel(label)
              .setValue(index.toString())
              .setEmoji('🎵')

            if (description) {
              option.setDescription(description)
            }
            return option
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
          const trackDisplay = formatTrack({
            title: t.info.title,
            trackLink: t.info.uri,
            author: t.info.author
          })

          return `${i + 1}. **\\[${formatDuration(t.info.duration ?? 0)}\\]** ${trackDisplay}`
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
              const mappedTracks = spotifyTracks.map(
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

              newResult = { loadType: 'search', tracks: mappedTracks }
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

        await interaction.deferUpdate().catch(() => {})
        await interaction.message.delete().catch(() => {})

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
        await reply.delete().catch(() => {})
        await message.delete().catch(() => {})

        // Destroy player if not playing anything and queue is empty
        if (!player.playing && player.queue.tracks.length === 0) {
          await player.destroy()
        }
      } else if (reason !== 'selected') {
        await reply.edit({ components: getComponents(true, currentSource) }).catch(() => {})
      }
    })
  }

  private async handleAlbumSearch(bot: BotClient, message: Message, query: string, player: Player) {
    // Lấy album từ Spotify Client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let albums: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageCache = new Map<number, any[]>()

    const fetchPage = async (page: number) => {
      if (pageCache.has(page)) {
        albums = pageCache.get(page)!
        return
      }

      try {
        albums = await searchSpotifyAlbums(query, 10, page * 10)
        pageCache.set(page, albums)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        throw new BotError(
          'Đã có lỗi xảy ra khi lấy danh sách album, vui lòng liên hệ **Ban quản lý**.'
        )
      }
    }

    await fetchPage(0)

    // Nếu không có album nào
    if (albums.length === 0) {
      throw new BotError('Không tìm thấy album nào.')
    }

    let currentPage = 0
    const itemsPerPage = 10

    // Helper tạo select menu hiển thị album
    const getComponents = (page: number, disabled = false) => {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('search_album_select')
        .setPlaceholder('Chọn album...')

      selectMenu.addOptions(
        albums.map((album, index) => {
          const label = album.name.substring(0, 100)
          const description = album.artists
            .map((a: { name: string }) => a.name)
            .join(', ')
            .substring(0, 100)

          const option = new StringSelectMenuOptionBuilder()
            .setLabel(label)
            .setValue(index.toString())
            .setEmoji('💽')

          if (description) {
            option.setDescription(description)
          }
          return option
        })
      )

      selectMenu.setDisabled(disabled || albums.length === 0)

      const btnPrev = new ButtonBuilder()
        .setCustomId('prev_page')
        .setEmoji(EMOJI.PREV.trim() || '◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || page === 0)

      const btnNext = new ButtonBuilder()
        .setCustomId('next_page')
        .setEmoji(EMOJI.NEXT.trim() || '▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || albums.length < itemsPerPage)

      return [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
        new ActionRowBuilder<ButtonBuilder>().addComponents(btnPrev, btnNext)
      ]
    }

    // Xây dựng đoạn giới thiệu về các album
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildDescription = (albumList: any[], page: number) => {
      const start = page * itemsPerPage

      return albumList
        .map((a, i) => {
          const albumLink = `[${a.name.replace(/(\[\])/g, '\\$1')}](https://open.spotify.com/album/${a.id})`
          return `${start + i + 1}. **${albumLink}**`
        })
        .join('\n')
    }

    const buildEmbed = (page: number) => {
      return new EmbedBuilder()
        .setTitle(`Album tìm kiếm: "${query}" - Trang ${page + 1}`)
        .setThumbnail(albums[0]?.images[0]?.url || null)
        .setDescription(buildDescription(albums, page))
        .setColor('#1DB954')
        .setFooter({ text: 'Hãy chọn album bạn muốn nghe trong vòng 60s.' })
    }

    const reply = await message.reply({
      embeds: [buildEmbed(currentPage)],
      components: getComponents(currentPage, false)
    })

    const collector = reply.createMessageComponentCollector({
      time: 60000,
      filter: (i) => i.user.id === message.author.id
    })

    collector.on('collect', async (interaction) => {
      if (interaction.isButton()) {
        collector.resetTimer()
        await interaction.deferUpdate().catch(() => {})

        if (interaction.customId === 'prev_page' && currentPage > 0) {
          currentPage--
          await fetchPage(currentPage)
        } else if (interaction.customId === 'next_page' && albums.length === itemsPerPage) {
          currentPage++
          await fetchPage(currentPage)
        }

        await interaction.message.edit({
          embeds: [buildEmbed(currentPage)],
          components: getComponents(currentPage, false)
        })
        return
      }

      if (interaction.isStringSelectMenu()) {
        const index = parseInt(interaction.values[0])
        const album = albums[index]

        if (!album) return

        await interaction.deferUpdate().catch(() => {})
        await interaction.message.delete().catch(() => {})

        // Tạo tin nhắn "đang tải"
        const loadingQuery = `https://open.spotify.com/album/${album.id}`
        const loadingMessage = await message.reply(`⏳ Đang tải album **${album.name}**...`)

        try {
          const spotifyAlbum = await fetchAlbum(album.id)

          if (!spotifyAlbum.tracks.items.length) {
            await loadingMessage.edit(
              `❌ Không thể tải album **${album.name}**. Có thể album này trống hoặc là album độc quyền quốc gia.`
            )
            return
          }

          const tracks = spotifyAlbum.tracks.items.map(
            (t) =>
              player.LavalinkManager.utils.buildUnresolvedTrack(
                {
                  title: t.name,
                  author: t.artists.map((a) => a.name).join(', '),
                  uri: `https://open.spotify.com/track/${t.id}`,
                  identifier: t.id,
                  artworkUrl: t.album?.images[0]?.url ?? album.images[0]?.url ?? null,
                  duration: t.duration_ms,
                  isrc: t.isrc ?? null
                },
                message.author
              ) as UnresolvedTrack
          )

          await player.queue.add(tracks)

          const addedEmbed = buildAddedItemEmbed(
            'playlist', // Lavalink uses playlist type for albums anyway inside buildAddedItemEmbed
            {
              title: spotifyAlbum.name || album.name,
              tracks: tracks,
              thumbnailUrl: spotifyAlbum.images[0]?.url ?? album.images[0]?.url ?? null,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              author: album.artists.map((a: any) => a.name).join(', ') || undefined,
              trackLink: loadingQuery
            },
            player,
            message.author,
            bot.user?.displayAvatarURL()
          )

          await loadingMessage.edit({ content: '', ...addedEmbed })

          if (!player.playing) await player.play().catch(() => {})
          collector.stop('selected')
        } catch (error) {
          logger.error('[Command: search] Error loading album details:', error)
          await loadingMessage.edit(`❌ Đã có lỗi xảy ra khi tải album.`)
        }
      }
    })

    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        await reply.delete().catch(() => {})
        await message.delete().catch(() => {})

        if (!player.playing && player.queue.tracks.length === 0) {
          await player.destroy()
        }
      } else if (reason !== 'selected') {
        await reply.edit({ components: getComponents(currentPage, true) }).catch(() => {})
      }
    })
  }

  private async handlePlaylistSearch(
    bot: BotClient,
    message: Message,
    query: string,
    player: Player
  ) {
    // Lấy playlist từ Spotify Client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let playlists: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageCache = new Map<number, any[]>()

    const fetchPage = async (page: number) => {
      if (pageCache.has(page)) {
        playlists = pageCache.get(page)!
        return
      }

      try {
        playlists = await searchSpotifyPlaylists(query, 10, page * 10)
        pageCache.set(page, playlists)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        throw new BotError(
          'Đã có lỗi xảy ra khi lấy danh sách phát, vui lòng liên hệ **Ban quản lý**.'
        )
      }
    }

    await fetchPage(0)

    // Nếu không có playlist nào
    if (playlists.length === 0) {
      throw new BotError('Không tìm thấy danh sách phát nào.')
    }

    let currentPage = 0
    const itemsPerPage = 10

    // Helper tạo select menu hiển thị playlist
    const getComponents = (page: number, disabled = false) => {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('search_playlist_select')
        .setPlaceholder('Chọn danh sách phát...')

      selectMenu.addOptions(
        playlists.map((playlist, index) => {
          const label = playlist.name.substring(0, 100)
          const option = new StringSelectMenuOptionBuilder()
            .setLabel(label)
            .setValue(index.toString())
            .setEmoji('💽')

          if (playlist.description) {
            option.setDescription(playlist.description.substring(0, 100))
          }

          return option
        })
      )

      selectMenu.setDisabled(disabled || playlists.length === 0)

      const btnPrev = new ButtonBuilder()
        .setCustomId('prev_page')
        .setEmoji(EMOJI.PREV.trim() || '◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || page === 0)

      const btnNext = new ButtonBuilder()
        .setCustomId('next_page')
        .setEmoji(EMOJI.NEXT.trim() || '▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || playlists.length < itemsPerPage)

      return [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
        new ActionRowBuilder<ButtonBuilder>().addComponents(btnPrev, btnNext)
      ]
    }

    // Xây dựng đoạn giới thiệu về các playlist
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildDescription = (playlistList: any[], page: number) => {
      const start = page * itemsPerPage

      return playlistList
        .map((p, i) => {
          const playlistLink = `[${p.name.replace(/(\[\])/g, '\\$1')}](https://open.spotify.com/playlist/${p.id})`
          return `${start + i + 1}. **${playlistLink}**`
        })
        .join('\n')
    }

    const buildEmbed = (page: number) => {
      return new EmbedBuilder()
        .setTitle(`Playlist tìm kiếm: "${query}" - Trang ${page + 1}`)
        .setThumbnail(playlists[0]?.images[0]?.url || null)
        .setDescription(buildDescription(playlists, page))
        .setColor('#1DB954')
        .setFooter({ text: 'Hãy chọn danh sách phát bạn muốn nghe trong vòng 60s.' })
    }

    const reply = await message.reply({
      embeds: [buildEmbed(currentPage)],
      components: getComponents(currentPage, false)
    })

    const collector = reply.createMessageComponentCollector({
      time: 60000,
      filter: (i) => i.user.id === message.author.id
    })

    collector.on('collect', async (interaction) => {
      if (interaction.isButton()) {
        collector.resetTimer()
        await interaction.deferUpdate().catch(() => {})

        if (interaction.customId === 'prev_page' && currentPage > 0) {
          currentPage--
          await fetchPage(currentPage)
        } else if (interaction.customId === 'next_page' && playlists.length === itemsPerPage) {
          currentPage++
          await fetchPage(currentPage)
        }

        await interaction.message.edit({
          embeds: [buildEmbed(currentPage)],
          components: getComponents(currentPage, false)
        })
        return
      }

      if (interaction.isStringSelectMenu()) {
        const index = parseInt(interaction.values[0])
        const playlist = playlists[index]

        if (!playlist) return

        await interaction.deferUpdate().catch(() => {})
        await interaction.message.delete().catch(() => {})

        // Tạo tin nhắn "đang tải"
        const loadingQuery = `https://open.spotify.com/playlist/${playlist.id}`
        const loadingMessage = await message.reply(
          `⏳ Đang tải danh sách phát **${playlist.name}**...`
        )

        try {
          const spotifyPlaylist = await fetchPlaylist(playlist.id)

          if (!spotifyPlaylist.tracks.items.length) {
            await loadingMessage.edit(
              `❌ Không thể tải danh sách phát **${playlist.name}**. Có thể danh sách phát trống hoặc riêng tư.`
            )
            return
          }

          const tracks = spotifyPlaylist.tracks.items.map(
            (t) =>
              player.LavalinkManager.utils.buildUnresolvedTrack(
                {
                  title: t.name,
                  author: t.artists.map((a) => a.name).join(', '),
                  uri: `https://open.spotify.com/track/${t.id}`,
                  identifier: t.id,
                  artworkUrl: t.album?.images[0]?.url ?? null,
                  duration: t.duration_ms,
                  isrc: t.isrc ?? null
                },
                message.author
              ) as UnresolvedTrack
          )

          await player.queue.add(tracks)

          const addedEmbed = buildAddedItemEmbed(
            'playlist',
            {
              title: spotifyPlaylist.name || playlist.name,
              tracks: tracks,
              thumbnailUrl: spotifyPlaylist.images[0]?.url ?? playlist.images[0]?.url ?? null,
              author: undefined, // Mặc định không có owner authorLink ở loadType playlist
              trackLink: loadingQuery
            },
            player,
            message.author,
            bot.user?.displayAvatarURL()
          )

          await loadingMessage.edit({ content: '', ...addedEmbed })

          if (!player.playing) await player.play().catch(() => {})
          collector.stop('selected')
        } catch (error) {
          logger.error('[Command: search] Error loading playlist details:', error)
          await loadingMessage.edit(`❌ Đã có lỗi xảy ra khi tải danh sách phát.`)
        }
      }
    })

    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        await reply.delete().catch(() => {})
        await message.delete().catch(() => {})

        if (!player.playing && player.queue.tracks.length === 0) {
          await player.destroy()
        }
      } else if (reason !== 'selected') {
        await reply.edit({ components: getComponents(currentPage, true) }).catch(() => {})
      }
    })
  }

  // ─── Execute ────────────────────────────────────────────────────────────

  async execute(
    bot: BotClient,
    message: Message,
    args: string[],
    { vcId, player: existingPlayer }: CommandContext
  ) {
    if (!message.guild) return
    logger.info(
      `[Command: search] User ${message.author.tag} requested to search: ${args.join(' ')}`
    )

    if (!vcId) throw new BotError('Bạn đang không ở kênh thoại nào cả.')

    const vc = message.guild.channels.cache.get(vcId) as VoiceChannel
    if (!vc?.joinable) throw new BotError('Tớ không thể vào kênh thoại của bạn.')

    const prefix = args[0]?.toLowerCase()
    let mode: 'album' | 'playlist' | 'track' = 'track'
    let queryArgs = args

    if (['album', 'alb', 'ab'].includes(prefix)) {
      mode = 'album'
      queryArgs = args.slice(1)
    } else if (['playlist', 'pls', 'pll'].includes(prefix)) {
      mode = 'playlist'
      queryArgs = args.slice(1)
    }

    const query = queryArgs.join(' ')
    if (!query) {
      if (mode === 'album') throw new BotError('Vui lòng nhập tên album bạn muốn tìm.')
      if (mode === 'playlist') throw new BotError('Vui lòng nhập tên danh sách phát bạn muốn tìm.')
      throw new BotError('Vui lòng nhập tên/đường dẫn bài hát.')
    }

    if (/^https?:\/\//.test(query)) {
      throw new BotError('Lệnh tìm kiếm không hỗ trợ đường dẫn, vui lòng sử dụng lệnh `play`.')
    }

    // Get or create player
    const player =
      existingPlayer ??
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

    if (mode === 'album') return this.handleAlbumSearch(bot, message, query, player)
    if (mode === 'playlist') return this.handlePlaylistSearch(bot, message, query, player)
    return this.handleTrackSearch(bot, message, query, player)
  }
}

export default new SearchCommand()
