/**
 * @file stringUtil.ts
 * @description Utilities for string manipulation, duration formatting, and display optimization.
 */

/**
 * Joins multiple strings with newlines.
 * @param {...string[]} args - Strings to join.
 * @returns {string} - Combined string.
 */
export const lines = (...args: string[]): string => args.join('\n')

/**
 * Formats a duration in milliseconds to a human-readable HH:MM:SS or MM:SS format.
 * @param {number} ms - Duration in milliseconds.
 * @returns {string} - Formatted duration string.
 */
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

/**
 * Formats a track's metadata into a consistent display string (Markdown link or bold text).
 * @param {object} item - Track metadata object.
 * @param {string} item.title - Track title.
 * @param {string} [item.trackLink] - Optional URL for the track.
 * @param {string} [item.author] - Optional author name.
 * @returns {string} - Formatted track string.
 */
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
