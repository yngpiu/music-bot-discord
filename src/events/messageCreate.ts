import { ContainerBuilder, Events, GuildMember, Message } from 'discord.js'
import type { Player } from 'lavalink-client'
import { config } from '~/config/env.js'

import { EMOJI } from '~/constants/emoji'
import type { BotClient } from '~/core/BotClient'
import type { BotManager } from '~/core/BotManager'
import { BotError } from '~/core/errors.js'

import { getDeterministicIndexFromId } from '~/utils/numberUtil.js'
import { isDeveloperOrServerOwner } from '~/utils/permissionUtil.js'
import { checkRateLimit, getBanRemainingMs } from '~/utils/rateLimiter.js'
import { lines } from '~/utils/stringUtil'

export default {
  name: Events.MessageCreate,
  async execute(bot: BotClient, manager: BotManager, message: Message) {
    if (message.author.bot || !message.guild) return
    if (!message.content.startsWith(config.prefix)) return

    const args = message.content.slice(config.prefix.length).trim().split(/\s+/)
    const commandName = args.shift()?.toLowerCase()
    if (!commandName) return

    const command = bot.commands.get(commandName)
    if (!command) return

    // ─── Bot Routing (must run FIRST to avoid duplicate responses) ─────────
    const member = message.guild.members.cache.get(message.author.id) as GuildMember
    const vcId = member?.voice?.channelId ?? undefined

    const targetBotId =
      commandName === 'join' || commandName === 'j'
        ? message.mentions.users.filter((u) => u.bot).first()?.id
        : undefined

    const chosenBot = manager.getOrAssignBot(message.guild.id, {
      vcId,
      messageId: message.id,
      requiresVoice:
        command.requiresVoice ?? command.requiresVoiceMatch ?? command.requiresOwner ?? false,
      targetBotId
    })

    if (!chosenBot) {
      if (targetBotId) {
        const container = new ContainerBuilder().addTextDisplayComponents((t) =>
          t.setContent(`${EMOJI.ANIMATED_CAT_NO_IDEA} Đó không phải là **bot** đâu nhé...`)
        )
        const randomBotIndex = getDeterministicIndexFromId(message.id, manager.bots.length)
        if (bot.botIndex === randomBotIndex) {
          await message.reply({ components: [container], flags: ['IsComponentsV2'] })
        }
        return
      }

      const container = new ContainerBuilder().addTextDisplayComponents((t) =>
        t.setContent(
          lines(`${EMOJI.ANIMATED_CAT_CRYING} Chúng tớ đang bận hết rồi, bạn thử lại sau nhé.`)
        )
      )
      const randomBotIndex = getDeterministicIndexFromId(message.id, manager.bots.length)
      if (bot.botIndex === randomBotIndex) {
        await message.reply({ components: [container], flags: ['IsComponentsV2'] })
      }
      return
    }

    // Not the chosen bot — skip entirely (no rate limit, no reply)
    if (chosenBot.user?.id !== bot.user?.id) return

    // ─── Owner bypass — skip rate limit & ban checks ──────────────────────
    const isOwner = isDeveloperOrServerOwner(message)

    // ─── Ban check ────────────────────────────────────────────────────────────
    if (!isOwner) {
      const banRemainingMs = await getBanRemainingMs(message.author.id)
      if (banRemainingMs > 0) {
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
        return
      }
    }

    // ─── Rate Limit ───────────────────────────────────────────────────────────
    if (!isOwner) {
      const { limited, remainingMs } = await checkRateLimit(message.author.id)
      if (limited) {
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
        return
      }
    }

    // ─── Command Guards ────────────────────────────────────────────────────────
    let player: Player | null = null
    let userVcId: string | null = null

    // requiresVoice / requiresVoiceMatch / requiresOwner all need an active player
    if (command.requiresVoice || command.requiresVoiceMatch || command.requiresOwner) {
      player = bot.lavalink.getPlayer(message.guild.id) ?? null
      if (!player) throw new BotError('Tớ đang không hoạt động trong kênh nào cả.')
    }

    // requiresVoiceMatch: user must be in a voice channel and same as bot
    if (command.requiresVoiceMatch) {
      userVcId = member?.voice?.channelId ?? null
      if (!userVcId) throw new BotError('Bạn đang không ở kênh thoại nào cả.')
      if (player!.voiceChannelId !== userVcId)
        throw new BotError('Bạn không ở cùng kênh thoại với tớ.')
    }

    // requiresOwner: caller must own the player session
    if (command.requiresOwner) {
      const sessionOwner = player!.get<string | null>('owner')
      if (sessionOwner && message.author.id !== sessionOwner)
        throw new BotError(
          'Chỉ **người đang có quyền điều khiển cao nhất** mới có quyền dùng lệnh này.'
        )
    }

    // Build context — safe casts: middleware above guarantees these are set
    // when the corresponding flags are true
    const ctx: CommandContext = {
      player: player as Player,
      vcId: userVcId as string
    }

    await command.execute(bot, message, args, ctx)
  }
}
