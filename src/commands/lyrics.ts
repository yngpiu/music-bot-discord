import { EmbedBuilder, type Message } from 'discord.js'

import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'

const command: Command = {
  name: 'lyrics',
  aliases: ['ly', 'lyric'],
  description: 'Hiển thị lời bài hát đang phát (nếu có)',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message) {
    if (!message.guild) return

    const player = bot.lavalink.getPlayer(message.guild.id)
    if (!player || !player.queue.current) {
      throw new BotError('Tớ đang không phát bản nhạc nào cả để tìm lời.')
    }

    const currentTrack = player.queue.current

    // Bắt đầu chờ tải lời bài hát
    const m = await message
      .reply({
        content: `${EMOJI.ANIMATED_CAT_DANCE} Đang lục tìm lời bài hát **${currentTrack.info.title}** từ kho dữ liệu...`
      })
      .catch(() => null)

    try {
      const baseLyrics = await player.getCurrentLyrics(false)
      const lyrics = baseLyrics as NodeLinkLyricsPlain | NodeLinkLyricsSynced | null

      if (
        !lyrics ||
        (lyrics.type === 'text' && !lyrics.text) ||
        (lyrics.type === 'synced' && !lyrics.lines.length)
      ) {
        throw new BotError(
          `Rất tiếc tớ không tìm thấy lời cho bài hát **${currentTrack.info.title}** 😥.`
        )
      }

      const displayEmbeds: EmbedBuilder[] = []

      if (lyrics.type === 'text') {
        const textLyrics = lyrics.text
        if (textLyrics) {
          const chunks = textLyrics.match(/[\s\S]{1,2000}/g) || []
          for (let i = 0; i < chunks.length; i++) {
            const embed = new EmbedBuilder()
              .setColor('#FFB8D0')
              .setTitle(`🎤 Lời bài hát: ${currentTrack.info.title}`)
              .setDescription(chunks[i])
              .setFooter({
                text: `Nguồn: ${lyrics.sourceName || 'LavaLyrics'} | Trang ${i + 1}/${chunks.length}`
              })
            displayEmbeds.push(embed)
          }
        }
      } else if (lyrics.type === 'synced') {
        let fullText = ''
        for (const line of lyrics.lines) {
          const totalSeconds = Math.floor(line.line.start / 1000)
          const minutes = Math.floor(totalSeconds / 60)
          const seconds = totalSeconds % 60
          const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

          fullText += `\`[${timeString}]\` ${line.line.line}\n`
        }

        const chunks = fullText.match(/[\s\S]{1,2000}/g) || []
        for (let i = 0; i < chunks.length; i++) {
          const embed = new EmbedBuilder()
            .setColor('#1DB954')
            .setTitle(`🎤 Karaoke: ${currentTrack.info.title}`)
            .setDescription(chunks[i])
            .setFooter({
              text: `Nguồn: ${lyrics.sourceName || 'LavaLyrics'} | Trang ${i + 1}/${chunks.length}`
            })
          displayEmbeds.push(embed)
        }
      }

      if (!displayEmbeds.length) {
        throw new BotError(`Lỗi định dạng lời bài hát của bài **${currentTrack.info.title}**.`)
      }

      // Instead of Container Builder since it was incorrectly used, we manually send the first embed
      // Pagination can be added later if needed. For now, limit to 10 embeds or send the first page
      if (m) {
        await m
          .edit({
            content: '',
            embeds: [displayEmbeds[0]],
            components: []
          })
          .catch(() => null)
      } else {
        await message
          .reply({
            embeds: [displayEmbeds[0]]
          })
          .catch((e) => logger.error(e))
      }
    } catch (e) {
      if (e instanceof BotError) {
        if (m) {
          await m.edit({ content: `${EMOJI.ERROR} ${e.message}` }).catch(() => null)
        } else {
          throw e
        }
      } else {
        logger.error('[Lyrics Error]', e)
        const errorMsg = `${EMOJI.ERROR} Xảy ra lỗi khi kết nối tới máy chủ Lavalink để lấy lời.`
        if (m) {
          await m.edit({ content: errorMsg }).catch(() => null)
        } else {
          throw new BotError(errorMsg)
        }
      }
    }
  }
}

export default command
