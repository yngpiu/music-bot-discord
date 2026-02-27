// Utilities for string manipulation, duration formatting, and display optimization.
import { Guild } from 'discord.js'

import { type BotClient } from '~/core/BotClient'

// Joins multiple strings with newlines.
export const lines = (...args: string[]): string => args.join('\n')

// Formats a duration in milliseconds to a human-readable HH:MM:SS or MM:SS format.
export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000)

  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)

  const pad = (n: number) => n.toString().padStart(2, '0')

  if (hours === 0) {
    return `${pad(minutes)}:${pad(seconds)}`
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

// Formats a track's metadata into a consistent display string (Markdown link or bold text).
export function formatTrack(item: {
  title: string
  trackLink?: string | null
  author?: string | null
}): string {
  const isYouTube =
    item.trackLink &&
    (item.trackLink.includes('youtube.com') || item.trackLink.includes('youtu.be'))

  const label = item.author && !isYouTube ? `${item.title} - ${item.author}` : item.title

  return item.trackLink ? `**[${label}](${item.trackLink})**` : `**${label}**`
}

export function getBotName(bot: BotClient): string {
  return bot.user?.displayName || bot.user?.username || 'Tớ'
}

export function getBotAvatar(bot: BotClient): string {
  return bot.user?.displayAvatarURL() || bot.user?.avatarURL() || ''
}

export function getGuildIcon(guild: Guild): string | undefined {
  return guild.iconURL() ?? undefined
}
