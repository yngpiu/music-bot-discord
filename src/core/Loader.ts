import { Prisma } from '@prisma/client'
import { BaseInteraction, Message } from 'discord.js'
import { readdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time'
import { BotClient } from '~/core/BotClient.js'
import { BotManager } from '~/core/BotManager.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Error Helpers ────────────────────────────────────────────────────────────

type ReplyTarget = Message | BaseInteraction

function isPrismaError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientUnknownRequestError ||
    err instanceof Prisma.PrismaClientValidationError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientInitializationError
  )
}

async function replyError(target: ReplyTarget, text: string): Promise<void> {
  const content = `${EMOJI.ERROR} ${text}`

  if (target instanceof Message) {
    const reply = await target.reply(content).catch((error: Error) => {
      logger.error('[System] Error replying error message to user:', error.message)
      return null
    })
    if (reply) {
      setTimeout(() => {
        reply.delete().catch((error: Error) => {
          logger.error('[System] Error deleting error message:', error.message)
        })
        target.delete().catch((error: Error) => {
          logger.error('[System] Error deleting error message:', error.message)
        })
      }, TIME.VERY_SHORT)
    }
    return
  }

  // Interaction (button, modal, slash command...)
  if (target.isRepliable()) {
    if (target.deferred || target.replied) {
      await target.editReply({ content }).catch((err) => {
        logger.warn('[System] Error editReply error message to user:', err)
      })
    } else {
      await target.reply({ content, flags: ['Ephemeral'] }).catch((err) => {
        logger.warn('[System] Error reply error message to user:', err)
      })
    }
  }
}

/**
 * Finds a Discord Message or Interaction from the event arguments.
 * Used to auto-reply errors back to the user who triggered the action.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findReplyTarget(args: any[]): ReplyTarget | null {
  for (const arg of args) {
    if (arg instanceof Message) return arg
    if (arg instanceof BaseInteraction) return arg
  }
  return null
}

// ─── Safe Execute ─────────────────────────────────────────────────────────────

/**
 * Wraps any event handler with centralized error handling.
 *
 * - `BotError`  → reply error message to user (if Message/Interaction found)
 * - Prisma      → log DB error + reply generic DB message
 * - Unknown     → log unexpected error + reply generic system message
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeExecute(eventName: string, fn: (...args: any[]) => Promise<unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (...args: any[]) => {
    try {
      await fn(...args)
    } catch (err) {
      const target = findReplyTarget(args)

      // BotError: user-facing, just reply, no logging
      if (err instanceof BotError) {
        if (target) await replyError(target, err.message)
        return
      }

      // Log all non-BotError exceptions
      const label = isPrismaError(err) ? 'Database' : 'Hệ Thống'
      logger.error(`[${label}] Unknown error when executing event ${eventName}:`, err)

      // Reply to user if we have a reply target
      if (target) {
        const msg = isPrismaError(err)
          ? 'Cơ sở dữ liệu đã gặp sự cố, vui lòng thử lại hoặc liên hệ với **Ban quản lý** để được hỗ trợ.'
          : 'Hệ thống đã gặp sự cố, vui lòng thử lại hoặc liên hệ với **Ban quản lý** để được hỗ trợ.'
        await replyError(target, msg)
      }
    }
  }
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export class Loader {
  static async loadCommands(bot: BotClient) {
    const commandsPath = join(__dirname, '../commands')
    const files = readdirSync(commandsPath).filter((f) => f.endsWith('.ts') || f.endsWith('.js'))
    for (const file of files) {
      const mod = await import(join(commandsPath, file))
      const command = mod.default ?? mod
      bot.commands.set(command.name, command)
      if (command.aliases) {
        for (const alias of command.aliases) {
          bot.commands.set(alias, command)
        }
      }
    }
  }

  static async registerEvents(bot: BotClient, botManager: BotManager) {
    const eventsPath = join(__dirname, '../events')
    const files = readdirSync(eventsPath).filter(
      (f) => (f.endsWith('.ts') || f.endsWith('.js')) && !f.startsWith('lavalink')
    )
    for (const file of files) {
      const mod = await import(join(eventsPath, file))
      const event = mod.default ?? mod
      if (event.once) {
        bot.once(
          event.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          safeExecute(event.name, (...args: any[]) => event.execute(bot, botManager, ...args))
        )
      } else {
        bot.on(
          event.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          safeExecute(event.name, (...args: any[]) => event.execute(bot, botManager, ...args))
        )
      }
    }
  }

  static async registerLavalinkEvents(bot: BotClient) {
    const eventsPath = join(__dirname, '../events', 'lavalink')

    const getFiles = (dir: string): string[] => {
      const dirents = readdirSync(dir, { withFileTypes: true })
      const files = dirents.map((dirent) => {
        const res = join(dir, dirent.name)
        return dirent.isDirectory() ? getFiles(res) : res
      })
      return files.flat()
    }

    const eventFiles = getFiles(eventsPath).filter(
      (file) => file.endsWith('.js') || file.endsWith('.ts')
    )

    for (const filePath of eventFiles) {
      const event = await import(filePath)
      const execute = event.default || event

      if (typeof execute === 'function') {
        const eventName =
          filePath
            .split('/')
            .pop()
            ?.replace(/\.(js|ts)$/, '') || ''

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wrappedHandler = safeExecute(eventName, (...args: any[]) => execute(bot, ...args))

        if (filePath.includes('/node/')) {
          let nodeEventName = eventName.replace(/^node/, '')
          nodeEventName = nodeEventName.charAt(0).toLowerCase() + nodeEventName.slice(1)

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          bot.lavalink.nodeManager.on(nodeEventName as any, wrappedHandler)
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          bot.lavalink.on(eventName as any, wrappedHandler)
        }
      }
    }
  }

  static async loadInteractions(bot: BotClient) {
    const interactionsPath = join(__dirname, '../interactions')

    const dirs = [
      { folder: 'buttons', collection: bot.buttonHandlers },
      { folder: 'modals', collection: bot.modalHandlers },
      { folder: 'autocompletes', collection: bot.autocompleteHandlers }
    ] as const

    for (const { folder, collection } of dirs) {
      const dirPath = join(interactionsPath, folder)

      let files: string[]
      try {
        files = readdirSync(dirPath).filter((f) => f.endsWith('.ts') || f.endsWith('.js'))
      } catch {
        // Directory doesn't exist yet, skip
        continue
      }

      for (const file of files) {
        const mod = await import(join(dirPath, file))
        const handler = mod.default ?? mod

        if (typeof handler === 'object' && handler.customId && handler.execute) {
          // Format: { customId: 'xxx', execute: async (interaction, bot) => {...} }
          collection.set(handler.customId, handler.execute)
        }
      }
    }
  }
}
