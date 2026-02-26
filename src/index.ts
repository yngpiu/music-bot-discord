/**
 * @file index.ts
 * @description The entry point of the application. Initializes and starts the BotManager.
 */
import 'dotenv/config'

import { BotManager } from '~/core/BotManager'

import { logger } from '~/utils/logger.js'

// Initialize the BotManager responsible for managing bot clusters and shards.
const manager = new BotManager()

// Start the BotManager and handle any initialization errors.
manager.start().catch((err) => {
  logger.error('[System] BotManager failed to start:', err)
  process.exit(1)
})
