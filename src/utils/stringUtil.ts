export const lines = (...args: string[]) => args.join('\n')

export const formatDuration = (ms: number): string => {
  if (ms === 0) return '0s'

  const seconds = Math.floor((ms / 1000) % 60)
  const minutes = Math.floor((ms / (1000 * 60)) % 60)
  const hours = Math.floor(ms / (1000 * 60 * 60))

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (hours > 0 || minutes > 0) parts.push(`${minutes}m`)

  parts.push(`${seconds}s`)

  return parts.join('')
}
