import { blue, bold, cyan, gray, magenta, red, yellow } from 'colorette'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import util from 'util'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

const logDir = path.join(process.cwd(), 'logs')
if (!existsSync(logDir)) {
  mkdirSync(logDir)
}

const levelColors: Record<string, (text: string) => string> = {
  error: red,
  warn: yellow,
  info: cyan,
  http: magenta,
  debug: blue,
  silly: gray
}

const extractTags = (message: string) => {
  const tagRegex = /^(\[\s*[^\]]+\s*\]\s*)+/
  const match = message.match(tagRegex)
  if (!match) return { tags: '', content: message }

  const tagsRaw = match[0]
  const content = message.slice(tagsRaw.length)

  const tagsColorized = tagsRaw
    .split(']')
    .filter((t) => t.trim().length > 0)
    .map((t) => magenta(bold(t + ']')))
    .join(' ')

  return { tags: tagsColorized + ' ', content }
}

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const timeStr = gray(`[${timestamp}]`)

    const colorizer = levelColors[level] || String
    const levelStr = colorizer(bold(level.toUpperCase().padEnd(5)))

    const msgString = stack
      ? String(stack)
      : typeof message === 'object'
        ? util.inspect(message)
        : String(message)
    const { tags, content } = extractTags(msgString)

    const hasMeta = Object.keys(meta).length > 0
    let metaStr = ''
    if (hasMeta) {
      metaStr = '\n' + util.inspect(meta, { showHidden: false, depth: null, colors: true })
    }

    return `${timeStr} ${levelStr} │ ${tags}${content}${metaStr}`
  })
)

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const msg = stack || message
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : ''
    return `[${timestamp}] ${level.toUpperCase().padEnd(5)} | ${msg}${metaStr}`
  })
)

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.errors({ stack: true }), winston.format.splat()),
  transports: [
    new winston.transports.Console({
      format: consoleFormat
    }),

    new DailyRotateFile({
      dirname: logDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d',
      format: fileFormat,
      zippedArchive: true
    }),

    new DailyRotateFile({
      dirname: logDir,
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      format: fileFormat,
      zippedArchive: true
    })
  ]
})
