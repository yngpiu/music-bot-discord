import type { Redis } from 'ioredis'
import { QueueStoreManager, StoredQueue } from 'lavalink-client'

export class RedisQueueStore implements QueueStoreManager {
  constructor(private redis: Redis) {}

  async get(guildId: string): Promise<string | StoredQueue | undefined> {
    const data = await this.redis.get(this.key(guildId))
    return data ?? undefined
  }

  async set(guildId: string, stringifiedQueueData: string | StoredQueue): Promise<boolean> {
    // redis.set expects string | number | Buffer
    const val =
      typeof stringifiedQueueData === 'string'
        ? stringifiedQueueData
        : JSON.stringify(stringifiedQueueData)
    const res = await this.redis.set(this.key(guildId), val)
    return res === 'OK'
  }

  async delete(guildId: string): Promise<boolean> {
    const res = await this.redis.del(this.key(guildId))
    return res > 0
  }

  async parse(stringifiedQueueData: string | StoredQueue): Promise<Partial<StoredQueue>> {
    const data =
      typeof stringifiedQueueData === 'string'
        ? JSON.parse(stringifiedQueueData)
        : stringifiedQueueData
    return data as Partial<StoredQueue>
  }

  async stringify(parsedQueueData: string | StoredQueue): Promise<string | StoredQueue> {
    return typeof parsedQueueData === 'object' ? JSON.stringify(parsedQueueData) : parsedQueueData
  }

  private key(guildId: string): string {
    return `lavaqueue:${guildId}`
  }
}
