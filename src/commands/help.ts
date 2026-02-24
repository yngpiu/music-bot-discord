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
    { name: 'pause', aliases: ['ps'], args: '', desc: 'Tạm dừng nhạc.' },
    {
      name: 'resume',
      aliases: ['rs', 'unpause', 'continue'],
      args: '',
      desc: 'Tiếp tục phát nhạc.'
    },
    {
      name: 'skipto',
      aliases: ['st', 'nextto', 'nt'],
      args: '<vị trí>',
      desc: 'Bỏ qua đến bài số X.'
    },
    { name: 'skip', aliases: ['s', 'n', 'next'], args: '', desc: 'Bỏ qua bài hiện tại.' },
    { name: 'back', aliases: ['b', 'prev', 'previous'], args: '', desc: 'Phát lại bài trước đó.' },
    {
      name: 'seek',
      aliases: ['fw', 'rw'],
      args: '<thời gian>',
      desc: 'Tua đến thời gian cụ thể (vd: 1:20).'
    },
    { name: 'replay', aliases: ['rp', 'restart'], args: '', desc: 'Phát lại bài hiện tại từ đầu.' },
    {
      name: 'volume',
      aliases: ['v', 'vol'],
      args: '[0-100]',
      desc: 'Xem hoặc điều chỉnh âm lượng.'
    },
    {
      name: 'filter',
      aliases: ['f', 'fx', 'effects'],
      args: '[(bassboost, 8d, echo, flanger, karaoke, nightcore, vaporwave) | (clear, off)]',
      desc: 'Hiển thị/chọn hiệu ứng âm thanh.'
    },
    {
      name: 'nowplaying',
      aliases: ['np', 'current'],
      args: '',
      desc: 'Hiển thị bài hát đang phát.'
    },
    { name: 'status', aliases: ['state', 'info'], args: '', desc: 'Xem trạng thái của player.' }
  ],
  Queue: [
    { name: 'queue', aliases: ['q', 'list'], args: '[trang]', desc: 'Xem danh sách chờ.' },
    {
      name: 'clear',
      aliases: ['c', 'cq', 'empty'],
      args: '',
      desc: 'Xóa toàn bộ nhạc trong hàng chờ.'
    },
    {
      name: 'loop',
      aliases: ['l', 'repeat'],
      args: '[off/track/queue]',
      desc: 'Thiết lập chế độ lặp lại.'
    },
    {
      name: 'shuffle',
      aliases: ['sh', 'mix', 'random'],
      args: '',
      desc: 'Trộn bài trong hàng chờ.'
    },
    {
      name: 'move',
      aliases: ['m'],
      args: '<từ> <đến>',
      desc: 'Di chuyển một bài hát trong hàng chờ.'
    },
    {
      name: 'remove',
      aliases: ['rm', 'del', 'delete'],
      args: '<vị trí> | <vị trí> <vị trí> ... | <từ> <đến>',
      desc: 'Xóa một bài hát khỏi hàng chờ.'
    },
    {
      name: 'insert',
      aliases: ['i', 'add', 'playnext', 'pn'],
      args: '<tên bài/link>',
      desc: 'Chèn bài hát lên ngay sau bài hiện tại.'
    },
    {
      name: 'autoplay',
      aliases: ['ap', 'endless'],
      args: '',
      desc: 'Bật/tắt tự động phát nhạc tương tự.'
    }
  ],
  General: [
    {
      name: 'join',
      aliases: ['j'],
      args: '<tag bot>',
      desc: 'Gọi bot vào kênh thoại, nếu không tag thì tự động chọn bot.'
    },
    {
      name: 'leave',
      aliases: ['lv', 'dc', 'disconnect', 'stop'],
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
        name: 'Danh sách hướng dẫn',
        iconURL: bot.user?.displayAvatarURL()
      })
      .setDescription('Vui lòng chọn một danh mục lệnh ở bên dưới để xem chi tiết nhé.')
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
          if (cmd.aliases.length > 0) str += ` (${cmd.aliases.map((a) => a).join(', ')})`
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

      setTimeout(() => {
        reply.delete().catch(() => {})
        message.delete().catch(() => {})
      }, 10000)
    })
  }
}

export default command
