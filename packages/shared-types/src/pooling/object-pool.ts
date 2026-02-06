/**
 * Generic Object Pool Implementation
 * Provides efficient object reuse to reduce garbage collection pressure
 */

import type {
  Poolable,
  PoolConfig,
  PoolStats,
  PoolFactory,
  PoolEventCallback,
  PoolEvent,
} from './pool-types.js';
import { DEFAULT_POOL_CONFIG, PoolEventType } from './pool-types.js';

/**
 * Generic object pool for reusing objects
 * Thread-safety note: This implementation is designed for single-threaded use.
 * For multi-threaded scenarios, external synchronization is required.
 */
export class ObjectPool<T extends Poolable> {
  private readonly pool: T[] = [];
  private readonly factory: PoolFactory<T>;
  private readonly config: PoolConfig;
  private readonly name: string;

  private borrowedCount = 0;
  private totalCreates = 0;
  private totalReuses = 0;

  private eventCallback: PoolEventCallback | undefined;

  /**
   * Create a new object pool
   * @param name - Unique name for this pool (used in stats/logging)
   * @param factory - Factory function to create new objects
   * @param config - Optional pool configuration
   */
  constructor(
    name: string,
    factory: PoolFactory<T>,
    config: Partial<PoolConfig> = {}
  ) {
    this.name = name;
    this.factory = factory;
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };

    // Pre-allocate initial objects
    this.grow(this.config.initialSize);
  }

  /**
   * Set an event callback for monitoring pool activity
   */
  setEventCallback(callback: PoolEventCallback | undefined): void {
    this.eventCallback = callback;
  }

  /**
   * Acquire an object from the pool
   * If pool is empty, creates a new object
   * @returns An object from the pool or a newly created object
   */
  acquire(): T {
    let obj: T;

    if (this.pool.length > 0) {
      // Reuse from pool - pop is O(1) and avoids array shifting
      obj = this.pool.pop()!;
      this.totalReuses++;
    } else {
      // Pool exhausted, create new object
      obj = this.factory();
      this.totalCreates++;
    }

    this.borrowedCount++;
    this.emitEvent(PoolEventType.Acquire);

    return obj;
  }

  /**
   * Release an object back to the pool
   * The object's reset() method is called before returning to pool
   * @param obj - The object to release
   * @returns true if object was returned to pool, false if pool is full
   */
  release(obj: T): boolean {
    if (this.borrowedCount > 0) {
      this.borrowedCount--;
    }

    // Reset object state
    obj.reset();

    // Only return to pool if under max size
    if (this.pool.length < this.config.maxSize) {
      this.pool.push(obj);
      this.emitEvent(PoolEventType.Release);
      return true;
    }

    // Pool is full, object will be garbage collected
    this.emitEvent(PoolEventType.Overflow);
    return false;
  }

  /**
   * Pre-allocate objects to grow the pool
   * @param count - Number of objects to pre-allocate
   */
  grow(count: number): void {
    const targetSize = Math.min(
      this.pool.length + count,
      this.config.maxSize
    );
    const actualGrowth = targetSize - this.pool.length;

    for (let i = 0; i < actualGrowth; i++) {
      const obj = this.factory();
      this.totalCreates++;
      this.pool.push(obj);
    }

    if (actualGrowth > 0) {
      this.emitEvent(PoolEventType.Grow);
    }
  }

  /**
   * Automatically grow the pool based on growth factor
   */
  autoGrow(): void {
    const currentSize = this.pool.length + this.borrowedCount;
    const growthAmount = Math.ceil(currentSize * (this.config.growthFactor - 1));
    this.grow(Math.max(1, growthAmount));
  }

  /**
   * Shrink the pool by removing unused objects
   * Only removes objects that are not currently borrowed
   * @param targetSize - Target pool size (default: initialSize)
   * @returns Number of objects removed
   */
  shrink(targetSize?: number): number {
    const target = targetSize ?? this.config.initialSize;
    const removeCount = Math.max(0, this.pool.length - target);

    if (removeCount > 0) {
      // Remove from the end (most recently returned objects)
      this.pool.splice(this.pool.length - removeCount, removeCount);
      this.emitEvent(PoolEventType.Shrink);
    }

    return removeCount;
  }

  /**
   * Get current pool statistics
   */
  getStats(): PoolStats {
    const totalAcquires = this.totalReuses + (this.totalCreates - this.config.initialSize);
    const hitRate = totalAcquires > 0
      ? this.totalReuses / totalAcquires
      : 1.0;

    return {
      size: this.pool.length + this.borrowedCount,
      available: this.pool.length,
      borrowed: this.borrowedCount,
      creates: this.totalCreates,
      reuses: this.totalReuses,
      hitRate: Math.max(0, Math.min(1, hitRate)),
    };
  }

  /**
   * Clear all objects from the pool
   * Warning: Does not affect borrowed objects
   */
  clear(): void {
    this.pool.length = 0;
    this.emitEvent(PoolEventType.Clear);
  }

  /**
   * Get the pool name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get the pool configuration
   */
  getConfig(): Readonly<PoolConfig> {
    return this.config;
  }

  /**
   * Check if the pool is empty
   */
  isEmpty(): boolean {
    return this.pool.length === 0;
  }

  /**
   * Check if the pool is at maximum capacity
   */
  isFull(): boolean {
    return this.pool.length >= this.config.maxSize;
  }

  /**
   * Emit a pool event if callback is registered
   */
  private emitEvent(type: PoolEventType): void {
    if (this.eventCallback) {
      const event: PoolEvent = {
        type,
        poolName: this.name,
        timestamp: Date.now(),
        stats: this.getStats(),
      };
      this.eventCallback(event);
    }
  }
}
