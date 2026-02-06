/**
 * Test Redis Utilities
 * Provides Redis container management for isolated integration testing
 */

import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import Redis from 'ioredis';

/**
 * Redis configuration for tests
 */
export interface TestRedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

/**
 * Test Redis instance with container and client
 */
export interface TestRedis {
  container: StartedTestContainer;
  config: TestRedisConfig;
  client: Redis;
  getClient(): Redis;
  flushAll(): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
}

/**
 * Default Redis container configuration
 */
const DEFAULT_REDIS_CONFIG = {
  image: 'redis:7-alpine',
  port: 6379,
};

/**
 * Create a test Redis container
 * @returns Promise resolving to TestRedis instance
 */
export async function createTestRedis(): Promise<TestRedis> {
  console.log('[TestRedis] Starting Redis container...');

  // Start Redis container
  const container = await new GenericContainer(DEFAULT_REDIS_CONFIG.image)
    .withExposedPorts(DEFAULT_REDIS_CONFIG.port)
    .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
    .withReuse()
    .start();

  const config: TestRedisConfig = {
    host: container.getHost(),
    port: container.getMappedPort(DEFAULT_REDIS_CONFIG.port),
  };

  console.log(`[TestRedis] Redis container started at ${config.host}:${config.port}`);

  // Create Redis client
  const client = new Redis({
    host: config.host,
    port: config.port,
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number): number | null => {
      if (times > 5) return null;
      return Math.min(times * 100, 1000);
    },
  });

  // Wait for connection
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Redis connection timeout'));
    }, 10000);

    client.once('ready', () => {
      clearTimeout(timeout);
      resolve();
    });

    client.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  console.log('[TestRedis] Redis client connected');

  return {
    container,
    config,
    client,

    getClient(): Redis {
      return client;
    },

    async flushAll(): Promise<void> {
      await client.flushall();
    },

    async keys(pattern: string): Promise<string[]> {
      return client.keys(pattern);
    },

    async get(key: string): Promise<string | null> {
      return client.get(key);
    },

    async set(key: string, value: string, ttl?: number): Promise<void> {
      if (ttl !== undefined) {
        await client.setex(key, ttl, value);
      } else {
        await client.set(key, value);
      }
    },

    async del(key: string): Promise<void> {
      await client.del(key);
    },
  };
}

/**
 * Clean all data from test Redis
 * @param testRedis - Test Redis instance
 */
export async function cleanRedis(testRedis: TestRedis): Promise<void> {
  console.log('[TestRedis] Flushing all data...');
  await testRedis.flushAll();
  console.log('[TestRedis] Redis cleaned');
}

/**
 * Clean up and stop the test Redis container
 * @param testRedis - Test Redis instance
 */
export async function cleanupRedis(testRedis: TestRedis): Promise<void> {
  console.log('[TestRedis] Cleaning up...');

  try {
    // Close the Redis client
    await testRedis.client.quit();
    console.log('[TestRedis] Client disconnected');
  } catch (error) {
    console.error('[TestRedis] Error disconnecting client:', error);
  }

  try {
    // Stop the container
    await testRedis.container.stop();
    console.log('[TestRedis] Container stopped');
  } catch (error) {
    console.error('[TestRedis] Error stopping container:', error);
  }
}

/**
 * Get Redis configuration from test Redis instance
 * Compatible with @swg/redis RedisClientConfig
 */
export function getRedisConfig(testRedis: TestRedis): TestRedisConfig {
  return { ...testRedis.config };
}

/**
 * Create a duplicate Redis client for pub/sub testing
 * @param testRedis - Test Redis instance
 * @returns New Redis client instance
 */
export function createDuplicateClient(testRedis: TestRedis): Redis {
  return new Redis({
    host: testRedis.config.host,
    port: testRedis.config.port,
    lazyConnect: false,
  });
}

/**
 * Helper to seed Redis with test data
 * @param testRedis - Test Redis instance
 * @param data - Map of key-value pairs to seed
 * @param ttl - Optional TTL in seconds
 */
export async function seedRedis(
  testRedis: TestRedis,
  data: Map<string, string>,
  ttl?: number
): Promise<void> {
  console.log(`[TestRedis] Seeding ${data.size} keys...`);

  const pipeline = testRedis.client.pipeline();

  for (const [key, value] of data) {
    if (ttl !== undefined) {
      pipeline.setex(key, ttl, value);
    } else {
      pipeline.set(key, value);
    }
  }

  await pipeline.exec();
  console.log('[TestRedis] Data seeded');
}
