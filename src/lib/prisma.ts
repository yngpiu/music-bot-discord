/**
 * @file prisma.ts
 * @description Initializes the Prisma ORM client with a PostgreSQL adapter and environment variable resolution.
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

/**
 * Simple utility to resolve ${VAR_NAME} placeholders in strings.
 * @param {string} str - The string to process.
 * @returns {string} - The resolved string.
 */
function resolveEnvVars(str: string): string {
  return str.replace(/\$\{(\w+)\}/g, (_, key) => process.env[key] || '')
}

// Ensure the DATABASE_URL environment variable has all placeholders resolved.
const connectionString = process.env.DATABASE_URL
  ? resolveEnvVars(process.env.DATABASE_URL)
  : undefined

// Create the PostgreSQL adapter for Prisma.
const adapter = new PrismaPg({ connectionString })

/**
 * Shared PrismaClient instance for database access.
 */
const prisma = new PrismaClient({ adapter })

export default prisma
