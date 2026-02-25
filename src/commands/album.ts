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
import { fetchAlbum, searchSpotifyAlbums } from '~/lib/spotify/client.js'

import { logger } from '~/utils/logger.js'

const command: Command = {
  name: 'album',
  description: 'Tìm kiếm một album nhạc từ Spotify.',
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
      throw new BotError('Vui lòng nhập tên album bạn muốn tìm.')
    }
    if (/^https?:\/\//.test(query)) {
      throw new BotError(
        'Lệnh tìm kiếm album không hỗ trợ đường dẫn, vui lòng sử dụng lệnh `play`.'
      )
    }

    // Lấy hoặc tạo player
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
      } catch (error) {
        logger.error('Error fetching spotify albums:', error)
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
          const description = // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (album.artists.map((a: any) => a.name).join(', ') || 'Vô danh').substring(0, 100)
          return new StringSelectMenuOptionBuilder()
            .setLabel(label)
            .setDescription(description)
            .setValue(index.toString())
            .setEmoji('💽')
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
          const albumLink = `[${a.name.replace(/([[\]])/g, '\\$1')}](https://open.spotify.com/album/${a.id})`
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const artists = a.artists.map((art: any) => art.name).join(', ') || 'Vô danh'
          return `${start + i + 1}. **💽 ${albumLink}** - ${artists}`
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
        await interaction.deferUpdate().catch((e) => logger.error(e))

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

        await interaction.deferUpdate().catch((e) => logger.error(e))
        await interaction.message.delete().catch((e) => logger.error(e))

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

          if (!player.playing)
            await player
              .play()
              .catch((e: Error | unknown) => logger.warn('player.play() error:', e))
          collector.stop('selected')
        } catch (error) {
          logger.error('Error fetching album tracks: ', error)
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
}

export default command
