/**
 * Message Pool Implementation
 * Provides pooled network message objects for fast message creation and recycling
 * Type-specific pools organized by message CRC
 */

import type { Poolable, PoolConfig, PoolStats } from './pool-types.js';
import { ObjectPool } from './object-pool.js';

/**
 * Base interface for poolable network messages
 */
export interface PoolableMessage extends Poolable {
  /**
   * Message type CRC identifier
   */
  readonly crc: number;

  /**
   * Message priority (for queue ordering)
   */
  priority: number;

  /**
   * Timestamp when message was created/acquired
   */
  timestamp: number;

  /**
   * Sequence number (for reliable messages)
   */
  sequenceNumber: number;

  /**
   * Whether this message requires reliable delivery
   */
  reliable: boolean;
}

/**
 * Factory function type for creating messages of a specific type
 */
export type MessageFactory<T extends PoolableMessage> = () => T;

/**
 * Message type registration data
 */
interface MessageTypeRegistration<T extends PoolableMessage> {
  crc: number;
  name: string;
  factory: MessageFactory<T>;
  pool: ObjectPool<T>;
}

/**
 * Message pool statistics including per-type stats
 */
export interface MessagePoolStats {
  /**
   * Total number of registered message types
   */
  registeredTypes: number;

  /**
   * Statistics per message type (by CRC)
   */
  typeStats: Map<number, PoolStats & { name: string }>;

  /**
   * Aggregate statistics across all pools
   */
  aggregate: PoolStats;
}

/**
 * Configuration for individual message type pools
 */
export interface MessageTypeConfig extends Partial<PoolConfig> {
  /**
   * Human-readable name for this message type
   */
  name: string;
}

/**
 * MessagePool - Manages pools for different network message types
 * Each message type (identified by CRC) has its own dedicated pool
 */
export class MessagePool {
  private readonly pools: Map<number, MessageTypeRegistration<PoolableMessage>> = new Map();
  private readonly defaultConfig: PoolConfig;

  /**
   * Create a new message pool manager
   * @param config - Default configuration for new message type pools
   */
  constructor(config: Partial<PoolConfig> = {}) {
    this.defaultConfig = {
      initialSize: 8,
      maxSize: 256,
      growthFactor: 2.0,
      ...config,
    };
  }

  /**
   * Register a message type with the pool
   * @param crc - Message type CRC identifier
   * @param factory - Factory function to create new messages
   * @param config - Optional configuration for this message type's pool
   */
  registerType<T extends PoolableMessage>(
    crc: number,
    factory: MessageFactory<T>,
    config: MessageTypeConfig
  ): void {
    if (this.pools.has(crc)) {
      throw new Error(`Message type with CRC 0x${crc.toString(16)} is already registered`);
    }

    const poolConfig: PoolConfig = {
      ...this.defaultConfig,
      ...config,
    };

    const pool = new ObjectPool<T>(
      `MessagePool_${config.name}_0x${crc.toString(16)}`,
      factory,
      poolConfig
    );

    this.pools.set(crc, {
      crc,
      name: config.name,
      factory: factory as MessageFactory<PoolableMessage>,
      pool: pool as ObjectPool<PoolableMessage>,
    });
  }

  /**
   * Acquire a message of the specified type
   * @param crc - Message type CRC identifier
   * @returns A message from the pool, or null if type is not registered
   */
  acquire<T extends PoolableMessage>(crc: number): T | null {
    const registration = this.pools.get(crc);
    if (!registration) {
      return null;
    }

    const message = registration.pool.acquire() as T;
    message.timestamp = Date.now();
    return message;
  }

  /**
   * Acquire a message, creating a new one if type is not registered
   * Useful for handling unknown message types gracefully
   * @param crc - Message type CRC identifier
   * @param fallbackFactory - Factory to use if type is not registered
   */
  acquireOrCreate<T extends PoolableMessage>(
    crc: number,
    fallbackFactory: MessageFactory<T>
  ): T {
    const existing = this.acquire<T>(crc);
    if (existing) {
      return existing;
    }

    // Create new message without pooling
    const message = fallbackFactory();
    message.timestamp = Date.now();
    return message;
  }

  /**
   * Release a message back to its pool
   * @param message - Message to release
   * @returns true if message was returned to a pool, false otherwise
   */
  release(message: PoolableMessage): boolean {
    const registration = this.pools.get(message.crc);
    if (!registration) {
      return false;
    }

    return registration.pool.release(message);
  }

  /**
   * Release multiple messages back to their pools
   * @param messages - Messages to release
   */
  releaseAll(...messages: PoolableMessage[]): void {
    for (const message of messages) {
      this.release(message);
    }
  }

  /**
   * Check if a message type is registered
   * @param crc - Message type CRC identifier
   */
  hasType(crc: number): boolean {
    return this.pools.has(crc);
  }

  /**
   * Get the name of a registered message type
   * @param crc - Message type CRC identifier
   */
  getTypeName(crc: number): string | undefined {
    return this.pools.get(crc)?.name;
  }

  /**
   * Get all registered message type CRCs
   */
  getRegisteredTypes(): number[] {
    return Array.from(this.pools.keys());
  }

  /**
   * Get comprehensive statistics for all pools
   */
  getStats(): MessagePoolStats {
    const typeStats = new Map<number, PoolStats & { name: string }>();
    let totalSize = 0;
    let totalAvailable = 0;
    let totalBorrowed = 0;
    let totalCreates = 0;
    let totalReuses = 0;

    for (const [crc, registration] of this.pools) {
      const stats = registration.pool.getStats();
      typeStats.set(crc, { ...stats, name: registration.name });

      totalSize += stats.size;
      totalAvailable += stats.available;
      totalBorrowed += stats.borrowed;
      totalCreates += stats.creates;
      totalReuses += stats.reuses;
    }

    const totalAcquires = totalReuses + totalCreates;
    const hitRate = totalAcquires > 0 ? totalReuses / totalAcquires : 1.0;

    return {
      registeredTypes: this.pools.size,
      typeStats,
      aggregate: {
        size: totalSize,
        available: totalAvailable,
        borrowed: totalBorrowed,
        creates: totalCreates,
        reuses: totalReuses,
        hitRate: Math.max(0, Math.min(1, hitRate)),
      },
    };
  }

  /**
   * Clear all pools
   */
  clear(): void {
    for (const registration of this.pools.values()) {
      registration.pool.clear();
    }
  }

  /**
   * Clear a specific message type's pool
   * @param crc - Message type CRC identifier
   */
  clearType(crc: number): boolean {
    const registration = this.pools.get(crc);
    if (registration) {
      registration.pool.clear();
      return true;
    }
    return false;
  }

  /**
   * Shrink all pools to their initial sizes
   */
  shrinkAll(): number {
    let totalRemoved = 0;
    for (const registration of this.pools.values()) {
      totalRemoved += registration.pool.shrink();
    }
    return totalRemoved;
  }

  /**
   * Unregister a message type (clears its pool)
   * @param crc - Message type CRC identifier
   */
  unregisterType(crc: number): boolean {
    const registration = this.pools.get(crc);
    if (registration) {
      registration.pool.clear();
      this.pools.delete(crc);
      return true;
    }
    return false;
  }
}

/**
 * Base class for creating poolable message types
 * Extend this class and implement reset() for specific message types
 */
export abstract class BasePoolableMessage implements PoolableMessage {
  abstract readonly crc: number;

  priority = 0;
  timestamp = 0;
  sequenceNumber = 0;
  reliable = false;

  /**
   * Reset message to initial state
   * Subclasses should override and call super.reset()
   */
  reset(): void {
    this.priority = 0;
    this.timestamp = 0;
    this.sequenceNumber = 0;
    this.reliable = false;
  }
}

/**
 * Global shared message pool instance
 * Register application-specific message types at startup
 */
export const globalMessagePool = new MessagePool({
  initialSize: 16,
  maxSize: 512,
});
