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

import type { BotClient } from '~/core/BotClient'
import { BotError } from '~/core/errors.js'
import { buildAddedTrackEmbed } from '~/lib/embeds.js'
import { searchSpotify } from '~/lib/spotify/client.js'

import { logger } from '~/utils/logger.js'

const command: Command = {
  name: 'search',
  description: 'Search for a song',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, args: string[]) {
    if (!message.guild) return

    const member = message.member as GuildMember
    const vcId = member?.voice?.channelId
    if (!vcId) throw new BotError('Bạn phải vào kênh voice trước!')

    const vc = member.voice.channel as VoiceChannel
    if (!vc.joinable) throw new BotError('Tôi không thể vào kênh voice của bạn!')

    const query = args.join(' ')
    if (!query) throw new BotError('Vui lòng nhập tên bài hát!')

    // Block URLs
    if (/^https?:\/\//.test(query)) {
      throw new BotError('Lệnh tìm kiếm không hỗ trợ link! Vui lòng dùng lệnh !play để phát link.')
    }

    // Get or create player
    const player =
      bot.lavalink.getPlayer(message.guild.id) ??
      (await bot.lavalink.createPlayer({
        guildId: message.guild.id,
        voiceChannelId: vcId,
        textChannelId: message.channel.id,
        selfDeaf: true,
        selfMute: false,
        volume: 80,
        instaUpdateFiltersFix: true
      }))

    if (!player.connected) await player.connect()
    if (player.voiceChannelId !== vcId) throw new BotError('Bạn phải ở trong kênh voice của tôi!')

    if (!player.get('owner')) {
      player.set('owner', message.author.id)
    }

    const result = await player.search({ query }, message.author)

    if (result.loadType === 'error' || result.loadType === 'empty') {
      throw new BotError('Không tìm thấy kết quả!')
    }

    let tracks = result.tracks.slice(0, 10)

    // Helper to build components
    const getComponents = (disabled = false) => {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('search_select')
        .setPlaceholder('Chọn bài hát để phát...')
        .addOptions(
          tracks.map((track, index) => {
            const label = track.info.title.substring(0, 100)
            const description = (track.info.author || 'Unknown Artist').substring(0, 100)
            return new StringSelectMenuOptionBuilder()
              .setLabel(label)
              .setDescription(description)
              .setValue(index.toString())
              .setEmoji('🎵')
          })
        )
        .setDisabled(disabled)

      // Source buttons
      const sources = [
        { label: 'Deezer', id: 'dzsearch', style: ButtonStyle.Primary },
        { label: 'YouTube', id: 'ytsearch', style: ButtonStyle.Danger },
        { label: 'SoundCloud', id: 'scsearch', style: ButtonStyle.Secondary },
        { label: 'Apple Music', id: 'amsearch', style: ButtonStyle.Secondary },
        { label: 'Spotify', id: 'spsearch', style: ButtonStyle.Success }
      ]

      const buttons = sources.map((s) =>
        new ButtonBuilder()
          .setCustomId(s.id)
          .setLabel(s.label)
          .setStyle(s.style)
          .setDisabled(disabled)
      )

      return [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
        new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)
      ]
    }

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(`Kết quả tìm kiếm cho: "${query}"`)
      .setDescription(
        tracks
          .map((t, i) => `**${i + 1}.** [${t.info.title}](${t.info.uri}) - ${t.info.author}`)
          .join('\n')
      )
      .setFooter({ text: 'Chọn bài hát hoặc đổi nguồn phát (30s)' })

    const reply = await message.reply({ embeds: [embed], components: getComponents() })

    const collector = reply.createMessageComponentCollector({
      time: 30000,
      filter: (i) => i.user.id === message.author.id
    })

    collector.on('collect', async (interaction) => {
      // Handle Button (Source Switch)
      if (interaction.isButton()) {
        const newSource = interaction.customId
        await interaction.deferUpdate()

        let newResult

        try {
          if (newSource === 'spsearch') {
            const spotifyTracks = await searchSpotify(query, 10)

            if (!spotifyTracks.length) {
              await interaction.followUp({
                content: `Không tìm thấy kết quả bên Spotify!`,
                ephemeral: true
              })
              return
            }

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
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            newResult = await player.search({ query, source: newSource as any }, message.author)
          }

          if (newResult.loadType === 'error' || newResult.loadType === 'empty') {
            await interaction.followUp({
              content: `Không tìm thấy kết quả bên ${newSource}!`,
              ephemeral: true
            })
            return
          }

          // Update tracks and components
          tracks = newResult.tracks.slice(0, 10)

          embed.setDescription(
            tracks
              .map((t, i) => `**${i + 1}.** [${t.info.title}](${t.info.uri}) - ${t.info.author}`)
              .join('\n')
          )

          await interaction.editReply({ embeds: [embed], components: getComponents() })
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

        await player.queue.add(track)

        if (!player.playing) await player.play()

        const addedEmbed = buildAddedTrackEmbed(track, player, message.author)

        await interaction.update({
          content: `Đã chọn: **${track.info.title}**`,
          embeds: addedEmbed.embeds,
          files: addedEmbed.files,
          components: []
        })

        collector.stop('selected')
      }
    })

    collector.on('end', async (collected, reason) => {
      if (reason !== 'selected') {
        await reply.edit({ components: getComponents(true) }).catch(() => {})
      }
    })
  }
}

export default command
