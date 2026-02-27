// Provides static methods for hot-loading commands, events, and interactions.
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
import { createContainerMessage } from '~/utils/messageUtil'

const __dirname = dirname(fileURLToPath(import.meta.url))

type ReplyTarget = Message | BaseInteraction

// Checks if an error is a Prisma-related database error.
function isPrismaError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientUnknownRequestError ||
    err instanceof Prisma.PrismaClientValidationError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientInitializationError
  )
}

// Sends an error message to a user and handles cleanup.
async function replyError(target: ReplyTarget, text: string): Promise<void> {
  const content = createContainerMessage(`${EMOJI.ERROR} ${text}`)

  if (target instanceof Message) {
    await target.reactions.removeAll().catch(() => {})
    const reply = await target
      .reply({ components: [content], flags: ['IsComponentsV2', 'SuppressNotifications'] })
      .catch((error: Error) => {
        logger.error('[System] Error replying error message to user:', error.message)
        return null
      })
    setTimeout(() => {
      if (reply) {
        reply.delete().catch((error: Error) => {
          logger.error('[System] Error deleting error message:', error.message)
        })
      }
      target.delete().catch((error: Error) => {
        logger.error('[System] Error deleting error message:', error.message)
      })
    }, TIME.VERY_SHORT)
    return
  }

  if (target.isRepliable()) {
    if (target.deferred || target.replied) {
      await target.editReply({ components: [content], flags: ['IsComponentsV2'] }).catch((err) => {
        logger.warn('[System] Error editReply error message to user:', err)
      })
    } else {
      await target
        .reply({ components: [content], flags: ['IsComponentsV2', 'SuppressNotifications'] })
        .catch((err) => {
          logger.warn('[System] Error reply error message to user:', err)
        })
    }
  }
}

// Helper function to find a replyable target from a list of arguments.
function findReplyTarget(args: unknown[]): ReplyTarget | null {
  for (const arg of args) {
    if (arg instanceof Message) return arg
    if (arg instanceof BaseInteraction) return arg
  }
  return null
}

// Wraps a function with a global error handler that notifies users and logs errors.
function safeExecute(
  eventName: string,
  fn: (...args: unknown[]) => Promise<unknown>
): (...args: unknown[]) => Promise<void> {
  return async (...args: unknown[]) => {
    try {
      await fn(...args)
    } catch (err) {
      const target = findReplyTarget(args)

      // Handle custom bot errors by showing the message directly to the user.
      if (err instanceof BotError) {
        if (target) await replyError(target, err.message)
        return
      }

      // Handle database and system errors with generic users-friendly messages.
      const label = isPrismaError(err) ? 'Database' : 'Hệ Thống'
      logger.error(`[${label}] Unknown error when executing event ${eventName}:`, err)

      if (target) {
        const msg = isPrismaError(err)
          ? 'Cơ sở dữ liệu đã gặp sự cố, vui lòng thử lại hoặc liên hệ với **Ban quản lý** để được hỗ trợ.'
          : 'Hệ thống đã gặp sự cố, vui lòng thử lại hoặc liên hệ với **Ban quản lý** để được hỗ trợ.'
        await replyError(target, msg)
      }
    }
  }
}

export class Loader {
  // Dynamically loads all command files from the commands directory.
  static async loadCommands(bot: BotClient): Promise<void> {
    const commandsPath = join(__dirname, '../commands')
    const files = readdirSync(commandsPath).filter((f) => f.endsWith('.ts') || f.endsWith('.js'))
    for (const file of files) {
      const mod = await import(join(commandsPath, file))
      const command = mod.default ?? mod
      bot.commands.set(command.name, command)
      // Register aliases if present.
      if (command.aliases) {
        for (const alias of command.aliases) {
          bot.commands.set(alias, command)
        }
      }
    }
  }

  // Dynamically registers all standard Discord events from the events directory.
  static async registerEvents(bot: BotClient, botManager: BotManager): Promise<void> {
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
          safeExecute(event.name, (...args: unknown[]) => event.execute(bot, botManager, ...args))
        )
      } else {
        bot.on(
          event.name,
          safeExecute(event.name, (...args: unknown[]) => event.execute(bot, botManager, ...args))
        )
      }
    }
  }

  // Recursively discovers and registers all Lavalink manager and node events.
  static async registerLavalinkEvents(bot: BotClient): Promise<void> {
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
      const mod = await import(filePath)
      const instance = mod.default ?? mod

      const eventName = instance.name

      const wrappedHandler = safeExecute(eventName, (...args: unknown[]) =>
        instance.execute(bot, ...args)
      )

      // Node events are slightly different and handled by nodeManager.
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

  // Dynamically loads interaction handlers (buttons, modals, autocompletes).
  static async loadInteractions(bot: BotClient): Promise<void> {
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
        continue
      }

      for (const file of files) {
        const mod = await import(join(dirPath, file))
        const handler = mod.default ?? mod

        if (typeof handler === 'object' && handler.customId && handler.execute) {
          collection.set(handler.customId, handler.execute)
        }
      }
    }
  }
}
