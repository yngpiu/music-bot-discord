// Command to display a list of available bot commands categorized by function.
import {
  ActionRowBuilder,
  EmbedBuilder,
  type Message,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js'
import { config } from '~/config/env.js'

import { TIME } from '~/constants/time'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage, reactLoadingMessage, replySuccessEmbed } from '~/utils/messageUtil.js'
import { getBotAvatar } from '~/utils/stringUtil.js'

// Commands grouped by category for display in the help menu.
export const commandsByCategory = {
  Track: [
    {
      name: 'play',
      args: '<tên bài/link>',
      desc: 'Phát nhạc từ tên bài hát hoặc link.'
    },
    {
      name: 'search',
      args: '[(album|alb|ab)/(playlist|pls|pll)] <tên>',
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
    { name: 'status', args: '', desc: 'Xem trạng thái của player.' },
    {
      name: 'favorite',
      args: '[add/remove/play]',
      desc: 'Quản lý danh sách nhạc yêu thích.'
    }
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
    },
    {
      name: 'permission',
      args: '[claim/transfer <người dùng>]',
      desc: 'Quản lý quyền hạn (vd: xem/lấy/chuyển chức danh **Chủ xị**).'
    },
    {
      name: 'notify',
      args: '<nội dung>',
      desc: 'Gửi thông báo tới các kênh đang phát (Owner).'
    }
  ]
}

// Command to show help information with an interactive select menu.
class HelpCommand extends BaseCommand {
  name = 'help'
  aliases = ['h']
  description = 'Hiển thị danh sách hướng dẫn lệnh.'
  requiresVoice = false

  // Builds the main landing embed for the help command.
  private buildMainEmbed(bot: BotClient): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0x00c2e6)
      .setAuthor({ name: 'Danh sách hướng dẫn', iconURL: getBotAvatar(bot) })
      .setDescription(
        '- Vui lòng chọn một danh mục lệnh ở bên dưới để xem chi tiết nhé.\n- Bạn có thể xem danh sách lệnh và các sử dụng chi tiết hơn tại **[TRANG HƯỚNG DẪN CHI TIẾT](https://yngpiu.github.io/music-bot-discord/docs/help.html)**.'
      )
      .setFooter({ text: `Prefix mặc định: \`${config.prefix}\`` })
  }

  // Builds an embed featuring commands from a specific category.
  private buildCategoryEmbed(
    bot: BotClient,
    category: keyof typeof commandsByCategory
  ): EmbedBuilder {
    const cmds = commandsByCategory[category]
    const desc = cmds
      .map((cmd, index) => {
        let str = `${index + 1}. **${cmd.name}**`
        if (cmd.args) str += ` ${cmd.args}`
        str += `\n> ${cmd.desc}`
        return str
      })
      .join('\n\n')

    return new EmbedBuilder()
      .setColor(0x00c2e6)
      .setAuthor({
        name: `Các lệnh thuộc danh mục ${category}`,
        iconURL: getBotAvatar(bot)
      })
      .setDescription(desc)
      .setFooter({ text: `[ ] : Tùy chọn | < > : Bắt buộc` })
  }

  // Constructs the select menu for choosing help categories.
  private buildSelectMenu(): {
    select: StringSelectMenuBuilder
    row: ActionRowBuilder<StringSelectMenuBuilder>
  } {
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
    return { select, row }
  }

  // Starts a collector to handle category selection from the select menu.
  private startCollector(
    bot: BotClient,
    message: Message,
    reply: Message,
    select: StringSelectMenuBuilder,
    row: ActionRowBuilder<StringSelectMenuBuilder>
  ): void {
    const collector = reply.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 120000
    })

    collector.on('collect', async (interaction) => {
      if (!interaction.isStringSelectMenu()) return
      if (interaction.customId !== 'help_category_select') return

      const category = interaction.values[0] as keyof typeof commandsByCategory
      const updatedEmbed = this.buildCategoryEmbed(bot, category)
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

  // Executes the help command.
  async execute(bot: BotClient, message: Message): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(`[Command: help] User ${message.author.tag} requested to view commands list`)

    const { select, row } = this.buildSelectMenu()
    const embed = this.buildMainEmbed(bot)
    const reply = await replySuccessEmbed(message, embed, [row], 60000)
    if (reply) {
      this.startCollector(bot, message, reply, select, row)
    }
  }
}

export default new HelpCommand()
