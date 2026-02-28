// Command to manage permissions and ownership of the music player.
import { Message, VoiceChannel } from 'discord.js'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessMessage } from '~/utils/messageUtil.js'
import { isDeveloperOrServerOwner } from '~/utils/permissionUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Command for managing player permissions (e.g., claiming ownership).
class PermissionCommand extends BaseCommand {
  name = 'permission'
  aliases = ['perms', 'pms']
  description = 'Quản lý quyền hạn **Chủ xị** (claim, transfer).'
  requiresVoiceMatch = false // Subcommands handle their own voice requirements

  async execute(
    bot: BotClient,
    message: Message,
    args: string[],
    ctx: CommandContext
  ): Promise<void> {
    const subCommand = args[0]?.toLowerCase()

    if (!subCommand) {
      const currentOwnerId = ctx.player?.get<string>('owner')
      await reactLoadingMessage(message)
      if (!currentOwnerId) {
        await replySuccessMessage(message, `**Chủ xị** hiện chưa được thiết lập.`)
        return
      }
      await replySuccessMessage(message, `**Chủ xị** hiện tại là <@${currentOwnerId}>.`)
      return
    }

    if (subCommand === 'claim' || subCommand === 'c') {
      if (!ctx.player) throw new BotError(`${getBotName(bot)} hiện không hoạt động.`)
      return this.handleClaim(bot, message, ctx)
    }

    if (subCommand === 'transfer' || subCommand === 'tf') {
      if (!ctx.player) throw new BotError(`${getBotName(bot)} hiện không hoạt động.`)
      return this.handleTransfer(bot, message, args.slice(1), ctx)
    }

    throw new BotError(
      'Vui lòng nhập lệnh con hợp lệ (vd: `permission claim`, `permission transfer`).'
    )
  }

  // Handles the 'claim' subcommand to take ownership of the player.
  private async handleClaim(
    bot: BotClient,
    message: Message,
    { player }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    logger.info(
      `[Command: permission claim] User ${message.author.tag} requested to claim player control`
    )

    const currentOwnerId = player.get<string>('owner')

    // If there is no current owner, just take it.
    if (!currentOwnerId) {
      player.set('owner', message.author.id)

      await replySuccessMessage(
        message,
        `${getBotName(bot)} chưa có **Chủ xị**, giờ bạn đang là **Chủ xị** nha.`
      )
      return
    }

    if (currentOwnerId === message.author.id) {
      throw new BotError('Bạn đã là **Chủ xị** của phiên này rồi mà.')
    }

    const botVc = message.guild?.channels.cache.get(player.voiceChannelId!) as
      | VoiceChannel
      | undefined

    // Check if the current owner is still in the voice channel.
    if (botVc && botVc.members.has(currentOwnerId)) {
      // Developers and server owners can override the claim.
      if (!isDeveloperOrServerOwner(message)) {
        throw new BotError('**Chủ xị** hiện tại vẫn đang ở trong kênh thoại này.')
      }
    }

    // Transfer ownership.
    player.set('owner', message.author.id)

    await replySuccessMessage(message, `Bạn đã trở thành **Chủ xị** thành công.`)
  }

  // Handles the 'transfer' subcommand to give ownership to another user.
  private async handleTransfer(
    bot: BotClient,
    message: Message,
    args: string[],
    { player }: CommandContext
  ): Promise<void> {
    await reactLoadingMessage(message)
    const currentOwnerId = player.get<string>('owner')

    // Only the current owner, developers, or server owners can transfer.
    if (currentOwnerId !== message.author.id && !isDeveloperOrServerOwner(message)) {
      throw new BotError('Bạn không có quyền chuyển nhượng chức danh **Chủ xị** của phiên này.')
    }

    const targetUser =
      message.mentions.users.first() ||
      (args[0] ? await bot.users.fetch(args[0]).catch(() => null) : null)

    if (!targetUser) {
      throw new BotError('Vui lòng tag hoặc nhập ID người dùng bạn muốn chuyển quyền.')
    }

    if (targetUser.bot) {
      throw new BotError('Bạn không thể chuyển chức danh **Chủ xị** cho bot.')
    }

    if (targetUser.id === currentOwnerId) {
      throw new BotError('Người dùng này đã là **Chủ xị** của phiên rồi rồi.')
    }

    // Check if the target user is in the voice channel.
    const botVc = message.guild?.channels.cache.get(player.voiceChannelId!) as
      | VoiceChannel
      | undefined
    if (botVc && !botVc.members.has(targetUser.id)) {
      throw new BotError('Người nhận quyền phải ở trong cùng kênh thoại với bot.')
    }

    player.set('owner', targetUser.id)
    logger.info(
      `[Command: permission transfer] Owner transferred from ${message.author.tag} to ${targetUser.tag}`
    )

    await replySuccessMessage(
      message,
      `Đã chuyển chức danh **Chủ xị** sang cho **<@${targetUser.id}>**.`
    )
  }
}

export default new PermissionCommand()
