// Command to manage per-user custom command aliases (add, remove, list).
import { EmbedBuilder, type Message } from 'discord.js'
import {
  MAX_ALIASES,
  addAlias,
  hasReachedLimit,
  listAliases,
  removeAlias
} from '~/services/aliasService.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessEmbed, replySuccessMessage } from '~/utils/messageUtil.js'
import { getBotAvatar } from '~/utils/stringUtil.js'

// Maximum allowed alias name length.
const MAX_ALIAS_LENGTH = 20

// Validates an alias name.
function isValidAliasName(name: string): boolean {
  if (name.length === 0 || name.length > MAX_ALIAS_LENGTH) return false
  if (/\s/.test(name)) return false
  if (/[<>@#`]/.test(name)) return false
  return /^[a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]+$/.test(name)
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

    if (subcommand === 'list' || subcommand === 'ls' || !subcommand) {
      await this.handleList(bot, message)
      return
    }

    throw new BotError(
      `Cú pháp: \`command add <tên> <lệnh> [args]\` | \`command rm <tên>\` | \`command list\``
    )
  }

  // Adds a new alias.
  private async handleAdd(bot: BotClient, message: Message, args: string[]): Promise<void> {
    await reactLoadingMessage(message)
    // command add <aliasName> <targetCommand> [args...]
    if (args.length < 2) {
      throw new BotError(
        `Cú pháp: \`command add <tên lệnh tắt> <lệnh gốc> [tham số]\`\nVD: \`command add noinaycoanh p nơi này có anh\``
      )
    }

    const aliasName = args[0].toLowerCase()
    const targetCommand = args[1].toLowerCase()
    const targetArgs = args.slice(2).join(' ')

    // Validate alias name.
    if (!isValidAliasName(aliasName)) {
      throw new BotError(
        `Tên lệnh tắt không hợp lệ. Chỉ chấp nhận chữ cái, số, dấu gạch dưới, tối đa ${MAX_ALIAS_LENGTH} ký tự.`
      )
    }

    // Prevent overriding built-in commands.
    if (bot.commands.has(aliasName)) {
      throw new BotError(`\`${aliasName}\` trùng với lệnh có sẵn của bot, vui lòng chọn tên khác.`)
    }

    // Validate that the target command exists.
    if (!bot.commands.has(targetCommand)) {
      throw new BotError(`Lệnh \`${targetCommand}\` không tồn tại.`)
    }

    // Check alias limit.
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

  // Removes an alias.
  private async handleRemove(message: Message, args: string[]): Promise<void> {
    await reactLoadingMessage(message)
    if (!args[0]) {
      throw new BotError(`Cú pháp: \`command rm <tên lệnh tắt>\``)
    }

    const aliasName = args[0].toLowerCase()
    const removed = await removeAlias(message.author.id, aliasName)

    if (!removed) {
      throw new BotError(`Không tìm thấy lệnh tắt \`${aliasName}\`.`)
    }

    logger.info(`[Command: command] User ${message.author.tag} removed alias "${aliasName}"`)
    await replySuccessMessage(message, `Đã xóa lệnh tắt \`${aliasName}\`.`)
  }

  // Lists all aliases.
  private async handleList(bot: BotClient, message: Message): Promise<void> {
    await reactLoadingMessage(message)
    const aliases = await listAliases(message.author.id)

    if (aliases.length === 0) {
      throw new BotError('Bạn chưa có lệnh tắt nào. Dùng `command add` để tạo.')
    }

    const description = aliases
      .map((a, i) => {
        const fullCmd = a.args ? `${a.command} ${a.args}` : a.command
        return `${i + 1}. \`${a.aliasName}\` → \`${fullCmd}\``
      })
      .join('\n')

    const embed = new EmbedBuilder()
      .setColor(0x00c2e6)
      .setAuthor({
        name: `Lệnh tắt của ${message.author.displayName}`,
        iconURL: getBotAvatar(bot)
      })
      .setDescription(description)
      .setFooter({ text: `${aliases.length}/${MAX_ALIASES} lệnh tắt` })

    await replySuccessEmbed(message, embed)
  }
}

export default new CommandAliasCommand()
