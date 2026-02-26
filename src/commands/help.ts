import {
  ActionRowBuilder,
  EmbedBuilder,
  type Message,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js'
import { config } from '~/config/env.js'

import { TIME } from '~/constants/time.js'
import type { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

export const commandsByCategory = {
  Track: [
    {
      name: 'play',
      args: '<tên bài/link>',
      desc: 'Phát nhạc từ tên bài hát hoặc link.'
    },
    {
      name: 'search',
      args: '[(album|alb|ab)/(playlist|pls|pl)] <tên>',
      desc: 'Tìm và chọn bài hát, album hoặc playlist.'
    },
    { name: 'pause', args: '', desc: 'Tạm dừng nhạc.' },
    {
      name: 'resume',
      args: '',
      desc: 'Tiếp tục phát nhạc.'
    },
    {
      name: 'skipto',
      args: '<vị trí>',
      desc: 'Bỏ qua đến bài số X.'
    },
    { name: 'skip', args: '', desc: 'Bỏ qua bài hiện tại.' },
    { name: 'back', args: '', desc: 'Phát lại bài trước đó.' },
    {
      name: 'seek',
      args: '<thời gian>',
      desc: 'Tua đến thời gian cụ thể (vd: 1:20).'
    },
    { name: 'replay', args: '', desc: 'Phát lại bài hiện tại từ đầu.' },
    {
      name: 'volume',
      args: '[0-100]',
      desc: 'Xem hoặc điều chỉnh âm lượng.'
    },
    {
      name: 'filter',
      args: '[(bassboost, 8d, echo, flanger, karaoke, nightcore, vaporwave) | (clear, off)]',
      desc: 'Hiển thị/chọn hiệu ứng âm thanh.'
    },
    {
      name: 'nowplaying',
      args: '',
      desc: 'Hiển thị bài hát đang phát.'
    },
    { name: 'status', args: '', desc: 'Xem trạng thái của player.' }
  ],
  Queue: [
    { name: 'queue', args: '[trang]', desc: 'Xem danh sách chờ.' },
    {
      name: 'clear',
      args: '',
      desc: 'Xóa toàn bộ nhạc trong hàng chờ.'
    },
    {
      name: 'loop',
      args: '[off/track/queue]',
      desc: 'Thiết lập chế độ lặp lại.'
    },
    {
      name: 'shuffle',
      args: '',
      desc: 'Trộn bài trong hàng chờ.'
    },
    {
      name: 'move',
      args: '<từ> <đến>',
      desc: 'Di chuyển một bài hát trong hàng chờ.'
    },
    {
      name: 'remove',
      args: '<vị trí> | <vị trí> <vị trí> ... | <từ> <đến>',
      desc: 'Xóa một bài hát khỏi hàng chờ.'
    },
    {
      name: 'insert',
      args: '<tên bài/link>',
      desc: 'Chèn bài hát lên ngay sau bài hiện tại.'
    },
    {
      name: 'autoplay',
      args: '',
      desc: 'Bật/tắt tự động phát nhạc tương tự.'
    }
  ],
  General: [
    {
      name: 'join',
      args: '<tag bot>',
      desc: 'Gọi bot vào kênh thoại, nếu không tag thì tự động chọn bot.'
    },
    {
      name: 'leave',
      args: '',
      desc: 'Đuổi bot khỏi kênh thoại và dừng nhạc.'
    },
    { name: 'help', args: '', desc: 'Hiển thị danh sách lệnh.' },
    {
      name: 'leaderboard',
      args: '',
      desc: 'Xem bảng xếp hạng bài hát và bot.'
    }
  ]
}

const command: Command = {
  name: 'help',
  aliases: ['h'],
  description: 'Hiển thị danh sách hướng dẫn lệnh.',
  requiresVoice: false,

  async execute(bot: BotClient, message: Message) {
    logger.info(`[Command: help] User ${message.author.tag} requested to view commands list`)
    const embed = new EmbedBuilder()
      .setColor(0x00c2e6)
      .setAuthor({
        name: 'Danh sách hướng dẫn',
        iconURL: bot.user?.displayAvatarURL()
      })
      .setDescription(
        'Vui lòng chọn một danh mục lệnh ở bên dưới để xem chi tiết nhé.\nBạn có thể xem danh sách lệnh và các sử dụng chi tiết hơn tại trang https://6music.edgeone.app.'
      )
      .setFooter({ text: `Prefix mặc định: \`${config.prefix}\`` })

    const select = new StringSelectMenuBuilder()
      .setCustomId('help_category_select')
      .setPlaceholder('Chọn một danh mục...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Lệnh Bài hát (Track)')
          .setDescription('Các lệnh thao tác với bài hát hiện tại.')
          .setValue('Track'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Lệnh Hàng chờ (Queue)')
          .setDescription('Các lệnh điều hướng và quản lý hàng chờ.')
          .setValue('Queue'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Lệnh Khác (General)')
          .setDescription('Các lệnh gọi/đuổi bot và hỗ trợ.')
          .setValue('General')
      )

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)

    const reply = await message.reply({ embeds: [embed], components: [row] })

    const collector = reply.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 120000
    })

    collector.on('collect', async (interaction) => {
      if (!interaction.isStringSelectMenu()) return
      if (interaction.customId !== 'help_category_select') return

      const selectedCategory = interaction.values[0] as keyof typeof commandsByCategory

      const cmds = commandsByCategory[selectedCategory]

      const desc = cmds
        .map((cmd, index) => {
          let str = `${index + 1}. **${cmd.name}**`
          if (cmd.args) str += ` ${cmd.args}`
          str += `\n> ${cmd.desc}`
          return str
        })
        .join('\n\n')

      const updatedEmbed = new EmbedBuilder()
        .setColor(0x00c2e6)
        .setAuthor({
          name: `Các lệnh thuộc danh mục ${selectedCategory}`,
          iconURL: bot.user?.displayAvatarURL()
        })
        .setDescription(desc)
        .setFooter({ text: `[ ] : Tùy chọn | < > : Bắt buộc` })

      await interaction.update({ embeds: [updatedEmbed], components: [row] })
    })

    collector.on('end', async () => {
      select.setDisabled(true)
      await reply
        .edit({
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)]
        })
        .catch(() => {})

      deleteMessage([reply, message], TIME.SHORT)
    })
  }
}

export default command
