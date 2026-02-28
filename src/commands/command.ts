// Command to manage per-user custom command aliases (add, remove, list).
import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  type Message,
  type MessageActionRowComponentBuilder
} from 'discord.js'
import {
  MAX_ALIASES,
  addAlias,
  hasReachedLimit,
  listAliases,
  removeAliasByNames
} from '~/services/aliasService.js'

import { EMOJI } from '~/constants/emoji'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessEmbed, replySuccessMessage } from '~/utils/messageUtil.js'
import { getBotAvatar } from '~/utils/stringUtil.js'

// Maximum allowed alias name length.
const MAX_ALIAS_LENGTH = 20
const ITEMS_PER_PAGE = 10

// Validates an alias name.
function isValidAliasName(name: string): boolean {
  if (name.length === 0 || name.length > MAX_ALIAS_LENGTH) return false
  if (/\s/.test(name)) return false
  if (/[<>@#`]/.test(name)) return false
  return /^[a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]+$/.test(name)
}

// Parses raw args into sorted unique positions. Supports individual numbers and ranges (e.g., "1-5").
function parsePositions(args: string[], maxLength: number): number[] {
  const positions = new Set<number>()

  for (const arg of args) {
    const rangeMatch = arg.match(/^(\d+)[–-](\d+)$/)
    if (rangeMatch) {
      const from = parseInt(rangeMatch[1], 10)
      const to = parseInt(rangeMatch[2], 10)
      if (from > to)
        throw new BotError(`Khoảng không hợp lệ: \`${arg}\` (số đầu phải nhỏ hơn số cuối).`)
      for (let i = from; i <= to; i++) positions.add(i)
      continue
    }

    const n = parseInt(arg, 10)
    if (isNaN(n)) throw new BotError(`\`${arg}\` không phải là số hợp lệ.`)
    positions.add(n)
  }

  for (const pos of positions) {
    if (pos < 1 || pos > maxLength) {
      throw new BotError(
        `Vị trí **${pos}** không hợp lệ, danh sách hiện có **${maxLength}** lệnh tắt.`
      )
    }
  }

  return [...positions].sort((a, b) => a - b)
}

// Command for managing user's custom command aliases.
class CommandAliasCommand extends BaseCommand {
  name = 'command'
  aliases = ['cmd', 'alias']
  description = 'Quản lý lệnh tắt cá nhân (add, remove, list).'
  requiresVoice = false

  async execute(bot: BotClient, message: Message, args: string[]): Promise<void> {
    const subcommand = args[0]?.toLowerCase()

    if (subcommand === 'add' || subcommand === 'set') {
      await this.handleAdd(bot, message, args.slice(1))
      return
    }

    if (subcommand === 'remove' || subcommand === 'rm' || subcommand === 'del') {
      await this.handleRemove(message, args.slice(1))
      return
    }

    // Default: show paginated list.
    await this.handleList(bot, message)
  }

  // Adds a new alias.
  private async handleAdd(bot: BotClient, message: Message, args: string[]): Promise<void> {
    await reactLoadingMessage(message)

    if (args.length < 2) {
      throw new BotError(
        `Cú pháp: \`command add <tên lệnh tắt> <lệnh gốc> [tham số]\`\nVD: \`command add noinaycoanh p nơi này có anh\``
      )
    }

    const aliasName = args[0].toLowerCase()
    const targetCommand = args[1].toLowerCase()
    const targetArgs = args.slice(2).join(' ')

    if (!isValidAliasName(aliasName)) {
      throw new BotError(
        `Tên lệnh tắt không hợp lệ. Chỉ chấp nhận chữ cái, số, dấu gạch dưới, tối đa ${MAX_ALIAS_LENGTH} ký tự.`
      )
    }

    if (bot.commands.has(aliasName)) {
      throw new BotError(`\`${aliasName}\` trùng với lệnh có sẵn của bot, vui lòng chọn tên khác.`)
    }

    if (!bot.commands.has(targetCommand)) {
      throw new BotError(`Lệnh \`${targetCommand}\` không tồn tại.`)
    }

    if (await hasReachedLimit(message.author.id)) {
      throw new BotError(`Bạn đã đạt giới hạn **${MAX_ALIASES}** lệnh tắt.`)
    }

    await addAlias(message.author.id, aliasName, targetCommand, targetArgs)
    logger.info(
      `[Command: command] User ${message.author.tag} added alias "${aliasName}" -> "${targetCommand} ${targetArgs}"`
    )
    await replySuccessMessage(
      message,
      `Đã tạo lệnh tắt \`${aliasName}\` → \`${targetCommand} ${targetArgs}\`.`
    )
  }

  // Removes aliases by position (supports range and multiple positions like remove.ts).
  private async handleRemove(message: Message, args: string[]): Promise<void> {
    await reactLoadingMessage(message)

    if (args.length === 0) {
      throw new BotError(
        `Cú pháp: \`command rm <vị trí>\`\nVD: \`command rm 1\` | \`command rm 2 7 4\` | \`command rm 2-7\``
      )
    }

    const aliases = await listAliases(message.author.id)
    if (aliases.length === 0) {
      throw new BotError('Bạn chưa có lệnh tắt nào.')
    }

    const positions = parsePositions(args, aliases.length)
    const toRemove = positions.map((p) => aliases[p - 1])

    const removedNames = toRemove.map((a) => a.aliasName)
    await removeAliasByNames(message.author.id, removedNames)

    logger.info(
      `[Command: command] User ${message.author.tag} removed aliases: ${removedNames.join(', ')}`
    )

    const isSingle = removedNames.length === 1
    const description = isSingle
      ? `đã xóa lệnh tắt \`${removedNames[0]}\`.`
      : `đã xóa **${removedNames.length}** lệnh tắt.`

    await replySuccessMessage(message, `**${message.author.displayName}**, ${description}`)
  }

  // Shows paginated list with navigation buttons.
  private async handleList(bot: BotClient, message: Message): Promise<void> {
    await reactLoadingMessage(message)
    const aliases = await listAliases(message.author.id)

    if (aliases.length === 0) {
      throw new BotError('Bạn chưa có lệnh tắt nào. Dùng `command add` để tạo.')
    }

    let currentPage = 0
    const totalPages = Math.ceil(aliases.length / ITEMS_PER_PAGE)

    const buildEmbed = (page: number) => {
      const start = page * ITEMS_PER_PAGE
      const paged = aliases.slice(start, start + ITEMS_PER_PAGE)

      const description = paged
        .map((a, i) => {
          const fullCmd = a.args ? `${a.command} ${a.args}` : a.command
          return `${start + i + 1}. \`${a.aliasName}\` : \`${fullCmd}\``
        })
        .join('\n')

      return new EmbedBuilder()
        .setColor(0x00c2e6)
        .setAuthor({
          name: `Lệnh tắt của ${message.author.displayName}`,
          iconURL: getBotAvatar(bot)
        })
        .setDescription(description)
        .setFooter({
          text: `Trang ${page + 1}/${totalPages} • ${aliases.length}/${MAX_ALIASES} lệnh tắt`
        })
    }

    const getButtons = (page: number, disabled = false) => {
      if (totalPages <= 1) return []

      const btnFirst = new ButtonBuilder()
        .setCustomId('cmd_first')
        .setEmoji(EMOJI.FIRST.trim())
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || page === 0)

      const btnPrev = new ButtonBuilder()
        .setCustomId('cmd_prev')
        .setEmoji(EMOJI.PREV.trim())
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || page === 0)

      const btnNext = new ButtonBuilder()
        .setCustomId('cmd_next')
        .setEmoji(EMOJI.NEXT.trim())
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || page >= totalPages - 1)

      const btnLast = new ButtonBuilder()
        .setCustomId('cmd_last')
        .setEmoji(EMOJI.LAST.trim())
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || page >= totalPages - 1)

      return [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
          btnFirst,
          btnPrev,
          btnNext,
          btnLast
        )
      ]
    }

    const reply = await replySuccessEmbed(
      message,
      buildEmbed(currentPage),
      getButtons(currentPage),
      60000
    )

    if (!reply || totalPages <= 1) return

    const collector = reply.createMessageComponentCollector({
      time: 60000,
      filter: (i) => i.user.id === message.author.id
    })

    collector.on('collect', async (interaction: ButtonInteraction) => {
      collector.resetTimer()
      await interaction.deferUpdate().catch(() => {})

      if (interaction.customId === 'cmd_first') currentPage = 0
      else if (interaction.customId === 'cmd_prev' && currentPage > 0) currentPage--
      else if (interaction.customId === 'cmd_next' && currentPage < totalPages - 1) currentPage++
      else if (interaction.customId === 'cmd_last') currentPage = totalPages - 1

      await interaction.message
        .edit({
          embeds: [buildEmbed(currentPage)],
          components: getButtons(currentPage)
        })
        .catch(() => {})
    })

    collector.on('end', async () => {
      await reply.edit({ components: getButtons(currentPage, true) }).catch(() => {})
    })
  }
}

export default new CommandAliasCommand()
