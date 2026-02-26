/**
 * @file env.ts
 * @description Loads and validates environment variables, and exports the application configuration.
 */
import 'dotenv/config'

/**
 * Configuration for a single Discord bot instance.
 */
export interface BotConfig {
  /** The Discord application's client ID. */
  clientId: string
  /** The Discord bot's token. */
  token: string
  /** Optional ID of the bot owner. */
  ownerId?: string
}

/**
 * Ensures an environment variable is set.
 * @param {string} key - The name of the environment variable.
 * @returns {string} - The value of the environment variable.
 * @throws {Error} - If the environment variable is missing.
 */
function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing env var: ${key}`)
  return val
}

const bots: BotConfig[] = []
// Limit the number of bots to be loaded, defaulting to 6.
const limit = process.env.NUMBER_OF_BOTS ? parseInt(process.env.NUMBER_OF_BOTS) : 6

// Loop through environment variables to load multiple bot configurations.
for (let i = 1; i <= limit; i++) {
  const clientId = process.env[`BOT_${i}_CLIENT_ID`]
  const token = process.env[`BOT_${i}_DISCORD_TOKEN`]
  if (clientId && token) {
    bots.push({ clientId, token })
  }
}

// Ensure at least one bot is configured.
if (bots.length === 0) {
  throw new Error('No bots configured! Set BOT_1_CLIENT_ID and BOT_1_DISCORD_TOKEN at minimum.')
}

/**
 * Global configuration object for the application.
 */
export const config = {
  /** Default command prefix. */
  prefix: process.env.DEFAULT_PREFIX ?? 'm',
  /** List of developer IDs allowed to use owner-only commands. */
  DEVELOPERS: process.env.DEVELOPERS ? process.env.DEVELOPERS.split(',') : [],
  /** Array of bot instances to run. */
  bots,
  /** Lavalink server connection settings. */
  lavalink: {
    host: process.env.LAVALINK_HOST ?? 'localhost',
    port: parseInt(process.env.LAVALINK_PORT ?? '2333'),
    password: requireEnv('LAVALINK_SERVER_PASSWORD'),
    secure: process.env.LAVALINK_SECURE === 'true'
  },
  /** Redis connection settings for persistent storage. */
  redis: {
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD
  }
}
