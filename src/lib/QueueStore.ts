// Custom Redis-based queue storage implementation for Lavalink-client.
import type { Redis } from 'ioredis'
import { QueueStoreManager, StoredQueue } from 'lavalink-client'

// Implementation of the QueueStoreManager using Redis for persistence. Allows player queues to survive bot restarts.
export class RedisQueueStore implements QueueStoreManager {
  
  constructor(private redis: Redis) {}

  // Retrieves the stringified queue data for a guild.
  async get(guildId: string): Promise<string | StoredQueue | undefined> {
    const data = await this.redis.get(this.key(guildId))
    return data ?? undefined
  }

  // Saves the stringified queue data for a guild.
  async set(guildId: string, stringifiedQueueData: string | StoredQueue): Promise<boolean> {
    const val =
      typeof stringifiedQueueData === 'string'
        ? stringifiedQueueData
        : JSON.stringify(stringifiedQueueData)
    const res = await this.redis.set(this.key(guildId), val)
    return res === 'OK'
  }

  // Deletes the queue data for a guild.
  async delete(guildId: string): Promise<boolean> {
    const res = await this.redis.del(this.key(guildId))
    return res > 0
  }

  // Parses raw queue data into a structured object.
  async parse(stringifiedQueueData: string | StoredQueue): Promise<Partial<StoredQueue>> {
    const data =
      typeof stringifiedQueueData === 'string'
        ? JSON.parse(stringifiedQueueData)
        : stringifiedQueueData
    return data as Partial<StoredQueue>
  }

  // Converts a queue object back into a string for storage.
  async stringify(parsedQueueData: string | StoredQueue): Promise<string | StoredQueue> {
    return typeof parsedQueueData === 'object' ? JSON.stringify(parsedQueueData) : parsedQueueData
  }

  // Generates a Redis key for a specific guild's queue.
  private key(guildId: string): string {
    return `lavaqueue:${guildId}`
  }
}
