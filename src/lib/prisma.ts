import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

// Giải quyết ${VAR} placeholders trong DATABASE_URL
function resolveEnvVars(str: string): string {
  return str.replace(/\$\{(\w+)\}/g, (_, key) => process.env[key] || '')
}

const connectionString = process.env.DATABASE_URL
  ? resolveEnvVars(process.env.DATABASE_URL)
  : undefined

const adapter = new PrismaPg({ connectionString })

const prisma = new PrismaClient({ adapter })

export default prisma
