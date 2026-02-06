/**
 * Pool Types for Object Pooling System
 * Defines interfaces for poolable objects and pool configuration
 */

/**
 * Interface for objects that can be pooled
 * Objects must implement reset() to clear state when returned to pool
 */
export interface Poolable {
  /**
   * Reset the object to its initial state
   * Called when the object is returned to the pool
   */
  reset(): void;
}

/**
 * Configuration options for object pools
 */
export interface PoolConfig {
  /**
   * Initial number of objects to pre-allocate
   * @default 16
   */
  initialSize: number;

  /**
   * Maximum number of objects the pool can hold
   * Objects acquired beyond this limit will be created but not returned to pool
   * @default 1024
   */
  maxSize: number;

  /**
   * Growth factor when pool needs to expand
   * Pool grows by ceil(currentSize * growthFactor) objects
   * @default 2.0
   */
  growthFactor: number;
}

/**
 * Statistics about pool usage
 */
export interface PoolStats {
  /**
   * Current total size of the pool (available + borrowed)
   */
  size: number;

  /**
   * Number of objects currently available in the pool
   */
  available: number;

  /**
   * Number of objects currently borrowed/in use
   */
  borrowed: number;

  /**
   * Total number of objects created by this pool
   */
  creates: number;

  /**
   * Total number of times an object was reused from the pool
   */
  reuses: number;

  /**
   * Hit rate: reuses / (reuses + creates beyond initial)
   */
  hitRate: number;
}

/**
 * Default pool configuration values
 */
export const DEFAULT_POOL_CONFIG: PoolConfig = {
  initialSize: 16,
  maxSize: 1024,
  growthFactor: 2.0,
};

/**
 * Factory function type for creating poolable objects
 */
export type PoolFactory<T extends Poolable> = () => T;

/**
 * Pool event types for monitoring
 */
export enum PoolEventType {
  Acquire = 'acquire',
  Release = 'release',
  Grow = 'grow',
  Shrink = 'shrink',
  Clear = 'clear',
  Overflow = 'overflow',
}

/**
 * Pool event data for monitoring callbacks
 */
export interface PoolEvent {
  type: PoolEventType;
  poolName: string;
  timestamp: number;
  stats: PoolStats;
}

/**
 * Callback type for pool events
 */
export type PoolEventCallback = (event: PoolEvent) => void;
