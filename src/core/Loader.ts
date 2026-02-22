import { Prisma } from '@prisma/client'
import { Message } from 'discord.js'
import { readdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { BotManager } from '~/core/BotManager.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Error Helpers ────────────────────────────────────────────────────────────

function isPrismaError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientUnknownRequestError ||
    err instanceof Prisma.PrismaClientValidationError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientInitializationError
  )
}

async function replyError(message: Message, text: string): Promise<void> {
  await message.reply(`${EMOJI.ERROR} ${text}`).catch(() => {})
}

/**
 * Finds a Discord Message instance from the event arguments.
 * Used to auto-reply errors back to the user who triggered the command.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findMessage(args: any[]): Message | null {
  for (const arg of args) {
    if (arg instanceof Message) return arg
  }
  return null
}

// ─── Safe Execute ─────────────────────────────────────────────────────────────

/**
 * Wraps any event handler with centralized error handling.
 *
 * - `BotError`  → reply error message to user (if Message found in args)
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
      const message = findMessage(args)

      // BotError: user-facing, just reply, no logging
      if (err instanceof BotError) {
        if (message) await replyError(message, err.message)
        return
      }

      // Log all non-BotError exceptions
      const label = isPrismaError(err) ? 'DATABASE ERROR' : 'UNEXPECTED ERROR'
      logger.error(`[Event:${eventName}] [${label}]:`, err)

      // Reply to user if we have a message context
      if (message) {
        const msg = isPrismaError(err)
          ? 'Cơ sở dữ liệu đã gặp sự cố, vui lòng thử lại hoặc liên hệ với **Ban quản lý** để được hỗ trợ.'
          : 'Hệ thống đã gặp sự cố, vui lòng thử lại hoặc liên hệ với **Ban quản lý** để được hỗ trợ.'
        await replyError(message, msg)
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
}
