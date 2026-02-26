/**
 * @file messageCreate.ts
 * @description The core command processor. Handles prefix parsing, bot routing, permission checks, rate limiting, and command execution.
 */
import { ContainerBuilder, Events, GuildMember, Message } from 'discord.js'
import type { Player } from 'lavalink-client'
import { config } from '~/config/env.js'

import { EMOJI } from '~/constants/emoji'
import type { BaseCommand } from '~/core/BaseCommand'
import type { BotClient } from '~/core/BotClient'
import { BotEvent } from '~/core/BotEvent.js'
import type { BotManager } from '~/core/BotManager'
import { BotError } from '~/core/errors.js'

import { getDeterministicIndexFromId } from '~/utils/numberUtil.js'
import { isDeveloperOrServerOwner } from '~/utils/permissionUtil.js'
import { checkRateLimit, getBanRemainingMs } from '~/utils/rateLimiter.js'
import { lines } from '~/utils/stringUtil'

/**
 * Event handler for when a message is created.
 * Responsible for delegating logic to the appropriate command and bot instance.
 */
class MessageCreateEvent extends BotEvent {
  name = Events.MessageCreate

  /**
   * Attempts to parse a command and its arguments from a message.
   * @param {BotClient} bot - The bot client instance.
   * @param {Message} message - The received message.
   * @returns {object | null} - Parsed command data or null if not a command.
   */
  private parseCommand(
    bot: BotClient,
    message: Message
  ): { command: BaseCommand; args: string[]; commandName: string } | null {
    if (message.author.bot || !message.guild) return null
    if (!message.content.startsWith(config.prefix)) return null

    const args = message.content.slice(config.prefix.length).trim().split(/\s+/)
    const commandName = args.shift()?.toLowerCase()
    if (!commandName) return null

    const command = bot.commands.get(commandName)
    if (!command) return null

    return { command, args, commandName }
  }

  /**
   * Routes the command request to the appropriate bot instance in a multi-bot environment.
   * @param {BotClient} bot - The current bot client instance processing the event.
   * @param {BotManager} manager - The central bot manager.
   * @param {Message} message - The original command message.
   * @param {BaseCommand} command - The command to be executed.
   * @param {string} commandName - The name used to invoke the command.
   * @returns {Promise<BotClient | null>} - The chosen bot instance or null if all are busy.
   */
  private async routeBot(
    bot: BotClient,
    manager: BotManager,
    message: Message,
    command: BaseCommand,
    commandName: string
  ): Promise<BotClient | null> {
    const member = message.guild!.members.cache.get(message.author.id) as GuildMember
    const vcId = member?.voice?.channelId ?? undefined

    // Special logic for joining commands to prefer a specific bot if mentioned.
    const targetBotId =
      commandName === 'join' || commandName === 'j'
        ? message.mentions.users.filter((u) => u.bot).first()?.id
        : undefined

    const chosenBot = manager.getOrAssignBot(message.guild!.id, {
      vcId,
      messageId: message.id,
      requiresVoice:
        command.requiresVoice ?? command.requiresVoiceMatch ?? command.requiresOwner ?? false,
      targetBotId
    })

    if (!chosenBot) {
      await this.replyAllBusy(bot, manager, message, targetBotId)
      return null
    }

    return chosenBot
  }

  /**
   * Sends a "busy" response if no bot instances are available.
   */
  private async replyAllBusy(
    bot: BotClient,
    manager: BotManager,
    message: Message,
    targetBotId: string | undefined
  ): Promise<void> {
    const randomBotIndex = getDeterministicIndexFromId(message.id, manager.bots.length)
    if (bot.botIndex !== randomBotIndex) return

    const text = targetBotId
      ? `${EMOJI.ANIMATED_CAT_NO_IDEA} Đó không phải là **bot** đâu nhé...`
      : lines(`${EMOJI.ANIMATED_CAT_CRYING} Chúng tớ đang bận hết rồi, bạn thử lại sau nhé.`)

    const container = new ContainerBuilder().addTextDisplayComponents((t) => t.setContent(text))
    await message.reply({ components: [container], flags: ['IsComponentsV2'] })
  }

  /**
   * Checks if a user is currently banned from using the bot.
   * @param {Message} message - The message context.
   * @returns {Promise<boolean>} - True if the user is banned.
   */
  private async checkBan(message: Message): Promise<boolean> {
    const banRemainingMs = await getBanRemainingMs(message.author.id)
    if (banRemainingMs <= 0) return false

    const banHours = (banRemainingMs / 3_600_000).toFixed(1)
    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ERROR} Bạn đã bị cấm sử dụng bot trong **${banHours} tiếng** nữa do spam lệnh quá mức.`
      )
    )
    const reply = await message
      .reply({ components: [container], flags: ['IsComponentsV2'] })
      .catch(() => null)

    if (reply) {
      setTimeout(() => {
        reply.delete().catch(() => {})
        message.delete().catch(() => {})
      }, 10000)
    }
    return true
  }

  /**
   * Checks if a user has exceeded the command rate limit.
   * @param {Message} message - The message context.
   * @returns {Promise<boolean>} - True if the user is rate limited.
   */
  private async checkRateLimit(message: Message): Promise<boolean> {
    const { limited, remainingMs } = await checkRateLimit(message.author.id)
    if (!limited) return false

    const remaining = (remainingMs / 1000).toFixed(1)
    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ERROR} Bạn đang dùng lệnh quá nhanh! Vui lòng chờ **${remaining}s** trước khi thử lại.`
      )
    )
    const reply = await message
      .reply({ components: [container], flags: ['IsComponentsV2'] })
      .catch(() => null)

    if (reply) {
      setTimeout(() => {
        reply.delete().catch(() => {})
        message.delete().catch(() => {})
      }, remainingMs)
    }
    return true
  }

  /**
   * Validates voice channel requirements and builds the command execution context.
   * @param {BotClient} bot - The bot client instance.
   * @param {Message} message - The message context.
   * @param {BaseCommand} command - The command being executed.
   * @returns {CommandContext} - The built execution context.
   */
  private buildCommandContext(
    bot: BotClient,
    message: Message,
    command: BaseCommand
  ): CommandContext {
    const member = message.guild!.members.cache.get(message.author.id) as GuildMember
    const player: Player | null = bot.lavalink.getPlayer(message.guild!.id) ?? null
    const userVcId: string | null = member?.voice?.channelId ?? null

    // Enforce voice channel requirements.
    if (command.requiresVoice || command.requiresVoiceMatch || command.requiresOwner) {
      if (!player) throw new BotError('Tớ đang không hoạt động trong kênh nào cả.')
    }

    if (command.requiresVoiceMatch) {
      if (!userVcId) throw new BotError('Bạn đang không ở kênh thoại nào cả.')
      if (player!.voiceChannelId !== userVcId)
        throw new BotError('Bạn không ở cùng kênh thoại với tớ.')
    }

    // Enforce session ownership for sensitive commands.
    if (command.requiresOwner) {
      const sessionOwner = player!.get<string | null>('owner')
      if (sessionOwner && message.author.id !== sessionOwner)
        throw new BotError(
          'Chỉ **người đang có quyền điều khiển cao nhất** mới có quyền dùng lệnh này.'
        )
    }

    return {
      player: player as Player,
      vcId: userVcId as string
    }
  }

  /**
   * Main execution entry for the messageCreate event.
   * @param {BotClient} bot - The original bot client instance.
   * @param {BotManager} manager - The bot manager.
   * @param {Message} message - The received message.
   */
  async execute(bot: BotClient, manager: BotManager, message: Message) {
    const parsed = this.parseCommand(bot, message)
    if (!parsed) return

    const { command, args, commandName } = parsed

    const chosenBot = await this.routeBot(bot, manager, message, command, commandName)
    if (!chosenBot) return
    // Only the chosen bot should proceed with execution.
    if (chosenBot.user?.id !== bot.user?.id) return

    const isOwner = isDeveloperOrServerOwner(message)

    // Bypass anti-spam for developers/owners.
    if (!isOwner && (await this.checkBan(message))) return
    if (!isOwner && (await this.checkRateLimit(message))) return

    try {
      const ctx = this.buildCommandContext(bot, message, command)
      await command.execute(bot, message, args, ctx)
    } catch (err) {
      // safeExecute in Loader.ts handles the actual error response.
      throw err
    }
  }
}

export default new MessageCreateEvent()
