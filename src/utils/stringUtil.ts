export const lines = (...args: string[]) => args.join('\n')

export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000)

  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)

  const pad = (n: number) => n.toString().padStart(2, '0')

  // < 1 hour → mm:ss
  if (hours === 0) {
    return `${pad(minutes)}:${pad(seconds)}`
  }

  // >= 1 hour → hh:mm:ss
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function formatTrack(item: {
  title: string
  trackLink?: string | null
  author?: string | null
}) {
  const label = item.author ? `${item.title} - ${item.author}` : item.title

  return item.trackLink ? `**[${label}](${item.trackLink})**` : `**${label}**`
}
