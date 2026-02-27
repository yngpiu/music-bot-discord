// Utilities for validating user permissions against bot-specific developer and owner roles.
import type { Message } from 'discord.js'
import { config } from '~/config/env.js'

// Checks if a user is a configured developer or the owner of the guild.
export function isDeveloperOrServerOwner(message: Message): boolean {
  if (config.DEVELOPERS.includes(message.author.id)) return true
  if (message.guild && message.author.id === message.guild.ownerId) return true
  return false
}
