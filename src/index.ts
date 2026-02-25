import 'dotenv/config'

import { BotManager } from '~/core/BotManager'

import { logger } from '~/utils/logger.js'

const manager = new BotManager()

manager.start().catch((err) => {
  logger.error('[System] BotManager failed to start:', err)
  process.exit(1)
})
