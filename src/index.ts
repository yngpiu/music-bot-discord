import 'dotenv/config'

import { BotManager } from '~/core/BotManager'

import { logger } from '~/utils/logger.js'

const manager = new BotManager()

manager.start().catch((err) => {
  logger.error('Fatal error starting bots:', err)
  process.exit(1)
})
