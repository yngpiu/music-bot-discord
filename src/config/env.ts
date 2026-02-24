import 'dotenv/config'

export interface BotConfig {
  clientId: string
  token: string
  ownerId?: string
}

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing env var: ${key}`)
  return val
}

const bots: BotConfig[] = []
const limit = process.env.NUMBER_OF_BOTS ? parseInt(process.env.NUMBER_OF_BOTS) : 6

for (let i = 1; i <= limit; i++) {
  const clientId = process.env[`BOT_${i}_CLIENT_ID`]
  const token = process.env[`BOT_${i}_DISCORD_TOKEN`]
  if (clientId && token) {
    bots.push({ clientId, token })
  }
}

if (bots.length === 0) {
  throw new Error('No bots configured! Set BOT_1_CLIENT_ID and BOT_1_DISCORD_TOKEN at minimum.')
}

export const config = {
  prefix: process.env.DEFAULT_PREFIX ?? 'm',
  DEVELOPERS: process.env.DEVELOPERS ? process.env.DEVELOPERS.split(',') : [],
  bots,
  lavalink: {
    host: process.env.LAVALINK_HOST ?? 'localhost',
    port: parseInt(process.env.LAVALINK_PORT ?? '2333'),
    password: requireEnv('LAVALINK_SERVER_PASSWORD'),
    secure: process.env.LAVALINK_SECURE === 'true'
  },
  redis: {
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD
  }
}
