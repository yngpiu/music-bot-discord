import type { Message } from 'discord.js'
import { config } from '~/config/env.js'

/**
 * Kiểm tra xem người dùng có phải là Developer (có trong list DEVELOPERS)
 * hoặc là Owner của Server hiện tại hay không.
 */
export function isDeveloperOrServerOwner(message: Message): boolean {
  if (config.DEVELOPERS.includes(message.author.id)) return true
  if (message.guild && message.author.id === message.guild.ownerId) return true
  return false
}
