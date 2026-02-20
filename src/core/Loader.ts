import { readdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { BotClient } from '~/core/BotClient.js'
import { BotManager } from '~/core/BotManager.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bot.once(event.name, (...args: any[]) => event.execute(bot, botManager, ...args))
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bot.on(event.name, (...args: any[]) => event.execute(bot, botManager, ...args))
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
      if (event.name && event.execute) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bot.lavalink.on(event.name, (...args: any[]) => event.execute(bot, ...args))
      }
    }
  }
}
