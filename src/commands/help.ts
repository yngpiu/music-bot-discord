import {
  ActionRowBuilder,
  EmbedBuilder,
  type Message,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js'
import { config } from '~/config/env.js'

import type { BotClient } from '~/core/BotClient.js'

export const commandsByCategory = {
  Track: [
    {
      name: 'play',
      aliases: ['p'],
      args: '<tên bài/link>',
      desc: 'Phát nhạc từ tên bài hát hoặc link.'
    },
    { name: 'search', aliases: ['find'], args: '<tên bài>', desc: 'Tìm và chọn nhạc.' },
    { name: 'pause', aliases: [], args: '', desc: 'Tạm dừng nhạc.' },
    { name: 'resume', aliases: [], args: '', desc: 'Tiếp tục phát nhạc.' },
    { name: 'skipto', aliases: ['st', 'jump'], args: '<vị trí>', desc: 'Bỏ qua đến bài số X.' },
    { name: 'skip', aliases: ['s'], args: '', desc: 'Bỏ qua bài hiện tại.' },
    {
      name: 'seek',
      aliases: [],
      args: '<thời gian>',
      desc: 'Tua đến thời gian cụ thể (vd: 1:20).'
    },
    { name: 'replay', aliases: [], args: '', desc: 'Phát lại bài hiện tại từ đầu.' },
    {
      name: 'volume',
      aliases: ['v', 'vol'],
      args: '[0-100]',
      desc: 'Xem hoặc điều chỉnh âm lượng.'
    },
    { name: 'filter', aliases: [], args: '[hiệu ứng]', desc: 'Hiển thị/chọn hiệu ứng âm thanh.' },
    { name: 'nowplaying', aliases: ['np'], args: '', desc: 'Hiển thị bài hát đang phát.' },
    { name: 'status', aliases: ['state', 'info'], args: '', desc: 'Xem trạng thái của player.' }
  ],
  Queue: [
    { name: 'queue', aliases: ['q'], args: '[trang]', desc: 'Xem danh sách chờ.' },
    { name: 'clear', aliases: ['c'], args: '', desc: 'Xóa toàn bộ nhạc trong hàng chờ.' },
    { name: 'loop', aliases: ['l'], args: '[off/track/queue]', desc: 'Thiết lập chế độ lặp lại.' },
    { name: 'shuffle', aliases: ['sh'], args: '', desc: 'Trộn bài trong hàng chờ.' },
    {
      name: 'move',
      aliases: ['m'],
      args: '<từ> <đến>',
      desc: 'Di chuyển một bài hát trong hàng chờ.'
    },
    { name: 'remove', aliases: ['rm'], args: '<vị trí>', desc: 'Xóa một bài hát khỏi hàng chờ.' },
    {
      name: 'insert',
      aliases: [],
      args: '<tên bài/link>',
      desc: 'Chèn bài hát lên ngay sau bài hiện tại.'
    },
    { name: 'autoplay', aliases: ['ap'], args: '', desc: 'Bật/tắt tự động phát nhạc tương tự.' }
  ],
  General: [
    { name: 'join', aliases: ['j'], args: '', desc: 'Gọi bot vào kênh thoại.' },
    {
      name: 'leave',
      aliases: ['dc', 'stop'],
      args: '',
      desc: 'Đuổi bot khỏi kênh thoại và dừng nhạc.'
    },
    { name: 'help', aliases: ['h'], args: '', desc: 'Hiển thị danh sách lệnh.' }
  ]
}

const command: Command = {
  name: 'help',
  aliases: ['h'],
  description: 'Hiển thị danh sách hướng dẫn lệnh.',
  requiresVoice: false,

  async execute(bot: BotClient, message: Message) {
    const embed = new EmbedBuilder()
      .setColor(0x00c2e6)
      .setAuthor({
        name: 'Danh sách Hướng dẫn',
        iconURL: bot.user?.displayAvatarURL()
      })
      .setDescription('Vui lòng chọn một danh mục lệnh ở menu bên dưới để xem chi tiết nhé!')
      .setThumbnail(bot.user?.displayAvatarURL() || null)
      .setFooter({ text: `Prefix hiện tại: ${config.prefix}` })

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
        .map((cmd) => {
          let str = `**${config.prefix}${cmd.name}**`
          if (cmd.aliases.length > 0)
            str += ` (${cmd.aliases.map((a) => config.prefix + a).join(', ')})`
          if (cmd.args) str += ` ${cmd.args}`
          str += `\n> ${cmd.desc}`
          return str
        })
        .join('\n\n')

      const updatedEmbed = new EmbedBuilder()
        .setColor(0x00c2e6)
        .setAuthor({
          name: `Lệnh Danh mục: ${selectedCategory}`,
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

      setTimeout(() => {
        reply.delete().catch(() => {})
        message.delete().catch(() => {})
      }, 10000)
    })
  }
}

export default command
