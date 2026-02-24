import type { GuildMember, Message, VoiceChannel } from 'discord.js'
import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js'
import { UnresolvedTrack } from 'lavalink-client'

import type { BotClient } from '~/core/BotClient'
import { BotError } from '~/core/errors.js'
import { buildAddedItemEmbed } from '~/lib/embeds.js'
import { fetchPlaylist, searchSpotifyPlaylists } from '~/lib/spotify/client.js'

import { logger } from '~/utils/logger.js'

const command: Command = {
  name: 'playlist',
  description: 'Tìm kiếm một playlist nhạc từ Spotify.',
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
      throw new BotError('Vui lòng nhập tên danh sách phát bạn muốn tìm.')
    }
    if (/^https?:\/\//.test(query)) {
      throw new BotError(
        'Lệnh tìm kiếm danh sách phát không hỗ trợ đường dẫn, vui lòng sử dụng lệnh `play`.'
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

    // Lấy playlist từ Spotify Client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let playlists: any[] = []
    try {
      playlists = await searchSpotifyPlaylists(query, 10)
    } catch (error) {
      logger.error('Error fetching spotify playlists:', error)
      throw new BotError(
        'Đã có lỗi xảy ra khi lấy danh sách phát, vui lòng liên hệ **Ban quản lý**.'
      )
    }

    // Nếu không có playlist nào
    if (playlists.length === 0) {
      throw new BotError('Không tìm thấy danh sách phát nào.')
    }

    // Helper tạo select menu hiển thị playlist
    const getComponents = (disabled = false) => {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('search_playlist_select')
        .setPlaceholder('Chọn danh sách phát...')

      selectMenu.addOptions(
        playlists.map((playlist, index) => {
          const label = playlist.name.substring(0, 100)
          const description = (playlist.description || 'Danh sách phát trên Spotify').substring(
            0,
            100
          )
          return new StringSelectMenuOptionBuilder()
            .setLabel(label)
            .setDescription(description)
            .setValue(index.toString())
            .setEmoji('💽')
        })
      )

      selectMenu.setDisabled(disabled)

      return [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)]
    }

    // Xây dựng đoạn giới thiệu về các playlist
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildDescription = (playlistList: any[]) => {
      return playlistList
        .map((p, i) => {
          const playlistLink = `[${p.name.replace(/([[\]])/g, '\\$1')}](https://open.spotify.com/playlist/${p.id})`
          return `${i + 1}. **💽 ${playlistLink}**\nㅤ*${p.description || 'Không có mô tả'}*`
        })
        .join('\n\n')
    }

    const embed = new EmbedBuilder()
      .setTitle(`Playlist tìm kiếm: "${query}"`)
      .setThumbnail(playlists[0]?.images[0]?.url || null)
      .setDescription(buildDescription(playlists))
      .setColor('#1DB954')
      .setFooter({ text: 'Hãy chọn danh sách phát bạn muốn nghe trong vòng 60s.' })

    const reply = await message.reply({
      embeds: [embed],
      components: getComponents(false)
    })

    const collector = reply.createMessageComponentCollector({
      time: 60000,
      filter: (i) => i.user.id === message.author.id
    })

    collector.on('collect', async (interaction) => {
      if (interaction.isStringSelectMenu()) {
        const index = parseInt(interaction.values[0])
        const playlist = playlists[index]

        if (!playlist) return

        await interaction.deferUpdate().catch((e) => logger.error(e))
        await interaction.message.delete().catch((e) => logger.error(e))

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

          if (!player.playing) await player.play()
          collector.stop('selected')
        } catch (error) {
          logger.error('Error fetching playlist tracks: ', error)
          await loadingMessage.edit(`❌ Đã có lỗi xảy ra khi tải danh sách phát.`)
        }
      }
    })

    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        await reply.delete().catch((e) => logger.error(e))
        await message.delete().catch((e) => logger.error(e))

        if (!player.playing && player.queue.tracks.length === 0) {
          await player.destroy()
        }
      } else if (reason !== 'selected') {
        await reply.edit({ components: getComponents(true) }).catch((e) => logger.error(e))
      }
    })
  }
}

export default command
