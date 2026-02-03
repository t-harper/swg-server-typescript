/**
 * @swg/redis - Cache Utilities
 * Generic caching with namespacing support
 */

import type { Redis } from 'ioredis';
import { getRedisClient, type RedisClient } from './client.js';

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /** Key prefix for namespacing (default: 'cache:') */
  prefix?: string;
  /** Default TTL in seconds (default: 300 = 5 minutes) */
  defaultTtlSeconds?: number;
  /** Enable JSON serialization (default: true) */
  serialize?: boolean;
}

/**
 * Result type for cache get with metadata
 */
export interface CacheResult<T> {
  value: T;
  ttl: number;
}

/**
 * Cache class provides generic caching with type support
 */
export class Cache {
  private readonly redis: Redis;
  private readonly config: Required<CacheConfig>;

  constructor(redisClient?: RedisClient, config: CacheConfig = {}) {
    const client = redisClient ?? getRedisClient();
    this.redis = client.getClient();

    this.config = {
      prefix: config.prefix ?? 'cache:',
      defaultTtlSeconds: config.defaultTtlSeconds ?? 300,
      serialize: config.serialize ?? true,
    };
  }

  /**
   * Get the full key with prefix
   */
  private getKey(key: string): string {
    return `${this.config.prefix}${key}`;
  }

  /**
   * Serialize a value for storage
   */
  private serialize<T>(value: T): string {
    if (!this.config.serialize) {
      return String(value);
    }

    // Handle bigint serialization
    return JSON.stringify(value, (_key, val) => {
      if (typeof val === 'bigint') {
        return { __bigint__: val.toString() };
      }
      return val as unknown;
    });
  }

  /**
   * Deserialize a value from storage
   */
  private deserialize<T>(value: string): T {
    if (!this.config.serialize) {
      return value as T;
    }

    try {
      return JSON.parse(value, (_key, val) => {
        if (val && typeof val === 'object' && '__bigint__' in val) {
          return BigInt((val as { __bigint__: string }).__bigint__);
        }
        return val as unknown;
      }) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * Get a value from cache
   * @param key - Cache key (without prefix)
   * @returns The cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getKey(key);
    const value = await this.redis.get(fullKey);

    if (value === null) {
      return null;
    }

    return this.deserialize<T>(value);
  }

  /**
   * Get a value with metadata (TTL)
   * @param key - Cache key (without prefix)
   * @returns Cache result with value and TTL, or null if not found
   */
  async getWithTtl<T>(key: string): Promise<CacheResult<T> | null> {
    const fullKey = this.getKey(key);

    // Use pipeline for atomic get + ttl
    const pipeline = this.redis.pipeline();
    pipeline.get(fullKey);
    pipeline.ttl(fullKey);
    const results = await pipeline.exec();

    if (!results || results.length < 2) {
      return null;
    }

    const [getResult, ttlResult] = results;
    const value = getResult?.[1] as string | null;
    const ttl = ttlResult?.[1] as number;

    if (value === null) {
      return null;
    }

    return {
      value: this.deserialize<T>(value),
      ttl,
    };
  }

  /**
   * Set a value in cache
   * @param key - Cache key (without prefix)
   * @param value - Value to cache
   * @param ttlSeconds - TTL in seconds (uses default if not provided)
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const fullKey = this.getKey(key);
    const serialized = this.serialize(value);
    const ttl = ttlSeconds ?? this.config.defaultTtlSeconds;

    if (ttl > 0) {
      await this.redis.setex(fullKey, ttl, serialized);
    } else {
      await this.redis.set(fullKey, serialized);
    }
  }

  /**
   * Set a value only if it doesn't exist
   * @param key - Cache key (without prefix)
   * @param value - Value to cache
   * @param ttlSeconds - TTL in seconds
   * @returns True if the value was set, false if key already exists
   */
  async setIfNotExists<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    const fullKey = this.getKey(key);
    const serialized = this.serialize(value);
    const ttl = ttlSeconds ?? this.config.defaultTtlSeconds;

    let result: 'OK' | null;
    if (ttl > 0) {
      result = await this.redis.set(fullKey, serialized, 'EX', ttl, 'NX');
    } else {
      result = await this.redis.set(fullKey, serialized, 'NX');
    }

    return result === 'OK';
  }

  /**
   * Delete a value from cache
   * @param key - Cache key (without prefix)
   * @returns True if the key existed and was deleted
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.getKey(key);
    const result = await this.redis.del(fullKey);
    return result === 1;
  }

  /**
   * Delete multiple keys from cache
   * @param keys - Array of cache keys (without prefix)
   * @returns Number of keys deleted
   */
  async deleteMany(keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }

    const fullKeys = keys.map(k => this.getKey(k));
    return this.redis.del(...fullKeys);
  }

  /**
   * Check if a key exists in cache
   * @param key - Cache key (without prefix)
   * @returns True if the key exists
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.getKey(key);
    const result = await this.redis.exists(fullKey);
    return result === 1;
  }

  /**
   * Get the remaining TTL for a key
   * @param key - Cache key (without prefix)
   * @returns TTL in seconds, -1 if no expiry, -2 if key doesn't exist
   */
  async getTtl(key: string): Promise<number> {
    const fullKey = this.getKey(key);
    return this.redis.ttl(fullKey);
  }

  /**
   * Update the TTL for a key
   * @param key - Cache key (without prefix)
   * @param ttlSeconds - New TTL in seconds
   * @returns True if the key exists and TTL was updated
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const fullKey = this.getKey(key);
    const result = await this.redis.expire(fullKey, ttlSeconds);
    return result === 1;
  }

  /**
   * Remove the expiration from a key (make it persistent)
   * @param key - Cache key (without prefix)
   * @returns True if the key exists and expiration was removed
   */
  async persist(key: string): Promise<boolean> {
    const fullKey = this.getKey(key);
    const result = await this.redis.persist(fullKey);
    return result === 1;
  }

  // ============ Set Operations ============

  /**
   * Add members to a set
   * @param key - Set key (without prefix)
   * @param members - Members to add
   * @returns Number of members added (not including existing members)
   */
  async setAdd(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) {
      return 0;
    }

    const fullKey = this.getKey(key);
    return this.redis.sadd(fullKey, ...members);
  }

  /**
   * Get all members of a set
   * @param key - Set key (without prefix)
   * @returns Array of set members
   */
  async setMembers(key: string): Promise<string[]> {
    const fullKey = this.getKey(key);
    return this.redis.smembers(fullKey);
  }

  /**
   * Remove a member from a set
   * @param key - Set key (without prefix)
   * @param member - Member to remove
   * @returns True if the member was removed
   */
  async setRemove(key: string, member: string): Promise<boolean> {
    const fullKey = this.getKey(key);
    const result = await this.redis.srem(fullKey, member);
    return result === 1;
  }

  /**
   * Remove multiple members from a set
   * @param key - Set key (without prefix)
   * @param members - Members to remove
   * @returns Number of members removed
   */
  async setRemoveMany(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) {
      return 0;
    }

    const fullKey = this.getKey(key);
    return this.redis.srem(fullKey, ...members);
  }

  /**
   * Check if a member exists in a set
   * @param key - Set key (without prefix)
   * @param member - Member to check
   * @returns True if the member exists in the set
   */
  async setIsMember(key: string, member: string): Promise<boolean> {
    const fullKey = this.getKey(key);
    const result = await this.redis.sismember(fullKey, member);
    return result === 1;
  }

  /**
   * Get the number of members in a set
   * @param key - Set key (without prefix)
   * @returns Number of members in the set
   */
  async setCount(key: string): Promise<number> {
    const fullKey = this.getKey(key);
    return this.redis.scard(fullKey);
  }

  /**
   * Get a random member from a set
   * @param key - Set key (without prefix)
   * @returns Random member or null if set is empty
   */
  async setRandomMember(key: string): Promise<string | null> {
    const fullKey = this.getKey(key);
    return this.redis.srandmember(fullKey);
  }

  /**
   * Pop (remove and return) a random member from a set
   * @param key - Set key (without prefix)
   * @returns Removed member or null if set is empty
   */
  async setPop(key: string): Promise<string | null> {
    const fullKey = this.getKey(key);
    return this.redis.spop(fullKey);
  }

  // ============ Hash Operations ============

  /**
   * Set a field in a hash
   * @param key - Hash key (without prefix)
   * @param field - Field name
   * @param value - Field value
   */
  async hashSet<T>(key: string, field: string, value: T): Promise<void> {
    const fullKey = this.getKey(key);
    const serialized = this.serialize(value);
    await this.redis.hset(fullKey, field, serialized);
  }

  /**
   * Set multiple fields in a hash
   * @param key - Hash key (without prefix)
   * @param fields - Object with field-value pairs
   */
  async hashSetMultiple<T>(key: string, fields: Record<string, T>): Promise<void> {
    const fullKey = this.getKey(key);
    const serialized: Record<string, string> = {};

    for (const [field, value] of Object.entries(fields)) {
      serialized[field] = this.serialize(value);
    }

    await this.redis.hset(fullKey, serialized);
  }

  /**
   * Get a field from a hash
   * @param key - Hash key (without prefix)
   * @param field - Field name
   * @returns Field value or null if not found
   */
  async hashGet<T>(key: string, field: string): Promise<T | null> {
    const fullKey = this.getKey(key);
    const value = await this.redis.hget(fullKey, field);

    if (value === null) {
      return null;
    }

    return this.deserialize<T>(value);
  }

  /**
   * Get all fields and values from a hash
   * @param key - Hash key (without prefix)
   * @returns Object with all field-value pairs
   */
  async hashGetAll<T>(key: string): Promise<Record<string, T>> {
    const fullKey = this.getKey(key);
    const data = await this.redis.hgetall(fullKey);
    const result: Record<string, T> = {};

    for (const [field, value] of Object.entries(data)) {
      result[field] = this.deserialize<T>(value);
    }

    return result;
  }

  /**
   * Delete a field from a hash
   * @param key - Hash key (without prefix)
   * @param field - Field name
   * @returns True if the field was deleted
   */
  async hashDelete(key: string, field: string): Promise<boolean> {
    const fullKey = this.getKey(key);
    const result = await this.redis.hdel(fullKey, field);
    return result === 1;
  }

  /**
   * Check if a field exists in a hash
   * @param key - Hash key (without prefix)
   * @param field - Field name
   * @returns True if the field exists
   */
  async hashExists(key: string, field: string): Promise<boolean> {
    const fullKey = this.getKey(key);
    const result = await this.redis.hexists(fullKey, field);
    return result === 1;
  }

  // ============ Increment/Decrement ============

  /**
   * Increment a numeric value
   * @param key - Cache key (without prefix)
   * @param amount - Amount to increment (default: 1)
   * @returns New value after increment
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    const fullKey = this.getKey(key);
    if (Number.isInteger(amount)) {
      return this.redis.incrby(fullKey, amount);
    }
    const result = await this.redis.incrbyfloat(fullKey, amount);
    return parseFloat(result);
  }

  /**
   * Decrement a numeric value
   * @param key - Cache key (without prefix)
   * @param amount - Amount to decrement (default: 1)
   * @returns New value after decrement
   */
  async decrement(key: string, amount: number = 1): Promise<number> {
    const fullKey = this.getKey(key);
    if (Number.isInteger(amount)) {
      return this.redis.decrby(fullKey, amount);
    }
    const result = await this.redis.incrbyfloat(fullKey, -amount);
    return parseFloat(result);
  }

  // ============ Utility Methods ============

  /**
   * Get all keys matching a pattern
   * @param pattern - Glob pattern (e.g., 'user:*')
   * @returns Array of matching keys (without prefix)
   */
  async keys(pattern: string): Promise<string[]> {
    const fullPattern = this.getKey(pattern);
    const keys = await this.redis.keys(fullPattern);
    const prefixLength = this.config.prefix.length;
    return keys.map(k => k.substring(prefixLength));
  }

  /**
   * Delete all keys matching a pattern
   * @param pattern - Glob pattern (e.g., 'user:*')
   * @returns Number of keys deleted
   */
  async deletePattern(pattern: string): Promise<number> {
    const fullPattern = this.getKey(pattern);
    const keys = await this.redis.keys(fullPattern);

    if (keys.length === 0) {
      return 0;
    }

    return this.redis.del(...keys);
  }

  /**
   * Flush all keys with this cache's prefix
   * Use with caution!
   * @returns Number of keys deleted
   */
  async flush(): Promise<number> {
    return this.deletePattern('*');
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ keyCount: number; prefix: string }> {
    const keys = await this.keys('*');
    return {
      keyCount: keys.length,
      prefix: this.config.prefix,
    };
  }
}

/**
 * Create a new Cache instance
 */
export function createCache(redisClient?: RedisClient, config?: CacheConfig): Cache {
  return new Cache(redisClient, config);
}

/**
 * Create a namespaced cache (shorthand for creating a cache with a specific prefix)
 */
export function createNamespacedCache(
  namespace: string,
  redisClient?: RedisClient,
  config?: Omit<CacheConfig, 'prefix'>
): Cache {
  return new Cache(redisClient, {
    ...config,
    prefix: `${namespace}:`,
  });
}
