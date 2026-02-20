import { Prisma } from '@prisma/client'
import {
  type ButtonInteraction,
  type ChannelSelectMenuInteraction,
  type MentionableSelectMenuInteraction,
  Message,
  type ModalSubmitInteraction,
  type RoleSelectMenuInteraction,
  type StringSelectMenuInteraction,
  type UserSelectMenuInteraction
} from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RepliableInteraction =
  | ButtonInteraction
  | ModalSubmitInteraction
  | StringSelectMenuInteraction
  | ChannelSelectMenuInteraction
  | RoleSelectMenuInteraction
  | UserSelectMenuInteraction
  | MentionableSelectMenuInteraction

// ─── Error reply helpers ──────────────────────────────────────────────────────

async function replyError(target: Message | RepliableInteraction, text: string): Promise<void> {
  if (target instanceof Message) {
    await target.reply(`${EMOJI.ERROR} ${text}`).catch(() => {})
    return
  }
  if (target.replied || target.deferred) {
    await target.editReply({ content: `${EMOJI.ERROR} ${text}` }).catch(() => {})
  } else {
    await target.reply({ content: `${EMOJI.ERROR} ${text}`, flags: ['Ephemeral'] }).catch(() => {})
  }
}

function isPrismaError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientUnknownRequestError ||
    err instanceof Prisma.PrismaClientValidationError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientInitializationError
  )
}

function logUnexpected(
  bot: BotClient,
  err: unknown,
  context: { name: string; userId: string; userTag: string }
): void {
  const label = isPrismaError(err) ? 'DATABASE ERROR' : 'UNEXPECTED ERROR'
  logger.error(
    `[Bot #${bot.botIndex + 1}] [${label}] Exception caught during "${context.name}" execution.\nTriggered by: ${context.userTag} (ID: ${context.userId})\nError Details:`,
    err
  )
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * Wraps a prefix command execute function with centralized error handling.
 * - `BotError` → reply with the error message (no logging)
 * - Unknown    → log to console + reply generic (prevents crash)
 *
 * @example
 * const command: Command = {
 *   name: 'play',
 *   execute: asyncMessageHandler(async (bot, message, args) => {
 *     if (!args.length) throw new BotError('Provide a query!')
 *   }),
 * }
 */
export function asyncMessageHandler(
  fn: (bot: BotClient, message: Message, args: string[]) => Promise<unknown>
) {
  return async (bot: BotClient, message: Message, args: string[]): Promise<void> => {
    try {
      await fn(bot, message, args)
    } catch (err) {
      if (err instanceof BotError) {
        await replyError(message, err.message)
      } else {
        logUnexpected(bot, err, {
          name: message.content.split(' ')[0] ?? 'unknown',
          userId: message.author.id,
          userTag: message.author.tag
        })
        const msg = isPrismaError(err)
          ? 'Cơ sở dữ liệu đã gặp sự cố, vui lòng thử lại hoặc liên hệ với **Ban quản lý** để được hỗ trợ.'
          : 'Hệ thống đã gặp sự cố, vui lòng thử lại hoặc liên hệ với **Ban quản lý** để được hỗ trợ.'
        await replyError(message, msg)
      }
    }
  }
}

/**
 * Wraps a component/modal interaction handler with centralized error handling.
 * Replies ephemerally on error so only the triggering user sees it.
 *
 * @example
 * // In an interactionCreate event:
 * if (interaction.isButton()) {
 *   await asyncInteractionHandler(async (i, bot) => {
 *     throw new BotError('Not allowed!')
 *   })(interaction, bot)
 * }
 */
export function asyncInteractionHandler<T extends RepliableInteraction>(
  fn: (interaction: T, bot: BotClient) => Promise<unknown>
) {
  return async (interaction: T, bot: BotClient): Promise<void> => {
    try {
      await fn(interaction, bot)
    } catch (err) {
      if (err instanceof BotError) {
        await replyError(interaction, err.message)
      } else {
        logUnexpected(bot, err, {
          name: 'customId' in interaction ? String(interaction.customId) : 'unknown',
          userId: interaction.user.id,
          userTag: interaction.user.tag
        })
        const msg = isPrismaError(err)
          ? 'Cơ sở dữ liệu đã gặp sự cố, vui lòng thử lại hoặc liên hệ với **Ban quản lý** để được hỗ trợ.'
          : 'Hệ thống đã gặp sự cố, vui lòng thử lại hoặc liên hệ với **Ban quản lý** để được hỗ trợ.'
        await replyError(interaction, msg)
      }
    }
  }
}
