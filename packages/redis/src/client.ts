/**
 * @swg/redis - Redis Client Wrapper
 * Provides a singleton Redis client with connection management
 */

import { Redis, type RedisOptions } from 'ioredis';

/**
 * Configuration options for the Redis client
 */
export interface RedisClientConfig {
  host?: string;
  port?: number;
  password?: string | undefined;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  connectionName?: string;
  enableReadyCheck?: boolean;
  lazyConnect?: boolean;
}

/**
 * Redis connection status
 */
export type RedisConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/**
 * Event callback types
 */
export type ConnectionEventCallback = () => void;
export type ErrorEventCallback = (error: Error) => void;

/**
 * RedisClient wraps ioredis with connection management and error handling
 */
export class RedisClient {
  private readonly client: Redis;
  private readonly config: Required<RedisClientConfig>;
  private status: RedisConnectionStatus = 'disconnected';
  private connectionPromise: Promise<void> | null = null;

  constructor(config: RedisClientConfig = {}) {
    this.config = {
      host: config.host ?? process.env['REDIS_HOST'] ?? 'localhost',
      port: config.port ?? parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
      password: config.password ?? process.env['REDIS_PASSWORD'] ?? '',
      db: config.db ?? parseInt(process.env['REDIS_DB'] ?? '0', 10),
      keyPrefix: config.keyPrefix ?? process.env['REDIS_KEY_PREFIX'] ?? '',
      maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
      retryDelayMs: config.retryDelayMs ?? 50,
      maxRetryDelayMs: config.maxRetryDelayMs ?? 2000,
      connectionName: config.connectionName ?? 'swg-server',
      enableReadyCheck: config.enableReadyCheck ?? true,
      lazyConnect: config.lazyConnect ?? true,
    };

    const redisOptions: RedisOptions = {
      host: this.config.host,
      port: this.config.port,
      db: this.config.db,
      ...(this.config.keyPrefix ? { keyPrefix: this.config.keyPrefix } : {}),
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      enableReadyCheck: this.config.enableReadyCheck,
      lazyConnect: this.config.lazyConnect,
      connectionName: this.config.connectionName,
      retryStrategy: (times: number): number | null => {
        if (times > 10) {
          // Stop retrying after 10 attempts
          return null;
        }
        // Exponential backoff with max delay
        const delay = Math.min(
          this.config.retryDelayMs * Math.pow(2, times - 1),
          this.config.maxRetryDelayMs
        );
        return delay;
      },
      reconnectOnError: (err: Error): boolean | 1 | 2 => {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        if (targetErrors.some(e => err.message.includes(e))) {
          return true;
        }
        return false;
      },
    };

    // Only set password if provided and non-empty
    if (this.config.password) {
      redisOptions.password = this.config.password;
    }

    this.client = new Redis(redisOptions);
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers for connection lifecycle
   */
  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.status = 'connecting';
    });

    this.client.on('ready', () => {
      this.status = 'connected';
    });

    this.client.on('error', (error: Error) => {
      this.status = 'error';
      // Log error but don't crash - ioredis handles reconnection
      console.error('[Redis] Connection error:', error.message);
    });

    this.client.on('close', () => {
      this.status = 'disconnected';
    });

    this.client.on('reconnecting', () => {
      this.status = 'reconnecting';
    });

    this.client.on('end', () => {
      this.status = 'disconnected';
      this.connectionPromise = null;
    });
  }

  /**
   * Connect to Redis server
   * Returns a promise that resolves when connected
   */
  async connect(): Promise<void> {
    if (this.status === 'connected') {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      const onReady = (): void => {
        cleanup();
        resolve();
      };

      const onError = (error: Error): void => {
        cleanup();
        reject(error);
      };

      const cleanup = (): void => {
        this.client.removeListener('ready', onReady);
        this.client.removeListener('error', onError);
      };

      this.client.once('ready', onReady);
      this.client.once('error', onError);

      // If lazyConnect is true, we need to explicitly connect
      if (this.config.lazyConnect) {
        this.client.connect().catch(onError);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from Redis server
   * Gracefully closes the connection
   */
  async disconnect(): Promise<void> {
    if (this.status === 'disconnected') {
      return;
    }

    await this.client.quit();
    this.status = 'disconnected';
    this.connectionPromise = null;
  }

  /**
   * Force disconnect (immediate close without waiting for pending commands)
   */
  forceDisconnect(): void {
    this.client.disconnect();
    this.status = 'disconnected';
    this.connectionPromise = null;
  }

  /**
   * Get the current connection status
   */
  getStatus(): RedisConnectionStatus {
    return this.status;
  }

  /**
   * Check if the client is connected and ready
   */
  isConnected(): boolean {
    return this.status === 'connected';
  }

  /**
   * Get the underlying ioredis client for direct access
   * Use with caution - prefer using wrapper methods when available
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Ping the Redis server to check connectivity
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Register a callback for connection events
   */
  onConnect(callback: ConnectionEventCallback): void {
    this.client.on('ready', callback);
  }

  /**
   * Register a callback for disconnection events
   */
  onDisconnect(callback: ConnectionEventCallback): void {
    this.client.on('close', callback);
  }

  /**
   * Register a callback for error events
   */
  onError(callback: ErrorEventCallback): void {
    this.client.on('error', callback);
  }

  /**
   * Create a duplicate connection (useful for pub/sub)
   */
  duplicate(): Redis {
    return this.client.duplicate();
  }
}

// Singleton instance
let singletonInstance: RedisClient | null = null;

/**
 * Get the singleton Redis client instance
 * Creates a new instance if one doesn't exist
 */
export function getRedisClient(config?: RedisClientConfig): RedisClient {
  if (!singletonInstance) {
    singletonInstance = new RedisClient(config);
  }
  return singletonInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export async function resetRedisClient(): Promise<void> {
  if (singletonInstance) {
    await singletonInstance.disconnect();
    singletonInstance = null;
  }
}

/**
 * Create a new Redis client instance (non-singleton)
 */
export function createRedisClient(config?: RedisClientConfig): RedisClient {
  return new RedisClient(config);
}
