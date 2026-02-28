// Command to view and manage per-guild and per-user command prefixes.
import { type Message } from 'discord.js'
import { config } from '~/config/env.js'
import {
  getGuildPrefix,
  getUserPrefix,
  resetGuildPrefix,
  resetUserPrefix,
  setGuildPrefix,
  setUserPrefix
} from '~/services/prefixService.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors'

import { logger } from '~/utils/logger.js'
import { replySuccessMessage } from '~/utils/messageUtil.js'

// Maximum allowed prefix length.
const MAX_PREFIX_LENGTH = 5

// Validates a prefix string.
function isValidPrefix(prefix: string): boolean {
  if (prefix.length === 0 || prefix.length > MAX_PREFIX_LENGTH) return false
  if (/\s/.test(prefix)) return false
  if (/<@|<#|<:|<a:/.test(prefix)) return false
  return true
}

// Command for managing prefix configuration.
class PrefixCommand extends BaseCommand {
  name = 'prefix'
  aliases = ['px']
  description = 'Xem hoặc thay đổi prefix của bot.'
  requiresVoice = false

  async execute(bot: BotClient, message: Message, args: string[]): Promise<void> {
    const subcommand = args[0]?.toLowerCase()

    // No arguments: show current prefix info.
    if (!subcommand) {
      await this.showPrefixInfo(message)
      return
    }

    // User prefix commands.
    if (subcommand === 'set') {
      await this.handleUserSet(message, args.slice(1))
      return
    }

    if (subcommand === 'reset') {
      await this.handleUserReset(message)
      return
    }

    // Guild prefix commands.
    if (subcommand === 'server' || subcommand === 'guild') {
      await this.handleServer(message, args.slice(1))
      return
    }

    // If single arg doesn't match any subcommand, treat as a shortcut for `prefix set <value>`.
    await this.handleUserSet(message, args)
  }

  // Shows the current prefix configuration.
  private async showPrefixInfo(message: Message): Promise<void> {
    const guildId = message.guild!.id
    const userId = message.author.id

    const guildPrefix = await getGuildPrefix(guildId)
    const userPrefix = await getUserPrefix(userId)

    const repliedMessage = `Prefix hiện tại của bạn là \`${userPrefix ?? guildPrefix ?? config.prefix}\`.`

    await replySuccessMessage(message, repliedMessage)
  }

  // Sets the user's personal prefix.
  private async handleUserSet(message: Message, args: string[]): Promise<void> {
    const newPrefix = args[0]

    if (!newPrefix) {
      throw new BotError(`Cú pháp: \`prefix set <prefix>\`\nVD: \`prefix set !\``)
    }

    if (!isValidPrefix(newPrefix)) {
      throw new BotError(
        `Prefix không hợp lệ. Prefix phải từ 1-${MAX_PREFIX_LENGTH} ký tự, không chứa khoảng trắng hoặc mention.`
      )
    }

    logger.info(
      `[Command: prefix] User ${message.author.tag} set personal prefix to "${newPrefix}"`
    )
    await setUserPrefix(message.author.id, newPrefix)
    await replySuccessMessage(message, `Đã đặt prefix cá nhân của bạn thành \`${newPrefix}\``)
  }

  // Resets the user's personal prefix.
  private async handleUserReset(message: Message): Promise<void> {
    await resetUserPrefix(message.author.id)
    logger.info(`[Command: prefix] User ${message.author.tag} reset personal prefix`)
    await replySuccessMessage(message, 'Đã xóa prefix cá nhân và sử dụng prefix của máy chủ.')
  }

  // Handles guild-level prefix commands.
  private async handleServer(message: Message, args: string[]): Promise<void> {
    // Check admin permissions.
    const isOwner = message.author.id === message.guild!.ownerId

    if (!isOwner) {
      throw new BotError(`Chủ có người sở hữu máy chủ mới có thể thay đổi prefix của máy chủ.`)
    }

    const action = args[0]?.toLowerCase()

    if (action === 'reset') {
      await resetGuildPrefix(message.guild!.id)
      logger.info(
        `[Command: prefix] User ${message.author.tag} reset guild prefix for ${message.guild!.id}`
      )
      await replySuccessMessage(
        message,
        `Đã xóa prefix server, máy chủ sẽ dùng prefix mặc định \`${config.prefix}\`.`
      )
      return
    }

    if (!action) {
      throw new BotError(`Cú pháp: \`prefix server <prefix>\` hoặc \`prefix server reset\`.`)
    }

    if (!isValidPrefix(action)) {
      throw new BotError(
        `Prefix không hợp lệ. Prefix phải từ 1-${MAX_PREFIX_LENGTH} ký tự, không chứa khoảng trắng hoặc mention.`
      )
    }

    await setGuildPrefix(message.guild!.id, action)
    logger.info(
      `[Command: prefix] User ${message.author.tag} set guild prefix to "${action}" for ${message.guild!.id}`
    )
    await replySuccessMessage(message, `Đã đặt prefix server thành \`${action}\`.`)
  }
}

export default new PrefixCommand()
