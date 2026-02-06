/**
 * Pool Manager - Centralized Object Pool Management
 * Provides global pool coordination, statistics, and cleanup
 */

import type { PoolStats, PoolEventCallback, PoolEvent } from './pool-types.js';
import type { ObjectPool } from './object-pool.js';
import type { Vector3Pool } from './vector-pool.js';
import type { BufferPool, BufferPoolStats } from './buffer-pool.js';
import type { MessagePool, MessagePoolStats } from './message-pool.js';
import { PoolEventType } from './pool-types.js';

/**
 * Memory pressure levels for adaptive pool management
 */
export enum MemoryPressureLevel {
  /** Normal operation - pools can grow freely */
  Normal = 'normal',
  /** Moderate pressure - restrict growth, consider shrinking */
  Moderate = 'moderate',
  /** High pressure - aggressively shrink pools */
  High = 'high',
  /** Critical pressure - clear non-essential pools */
  Critical = 'critical',
}

/**
 * Aggregate statistics for all managed pools
 */
export interface GlobalPoolStats {
  /**
   * Total number of managed pools
   */
  totalPools: number;

  /**
   * Total objects across all pools
   */
  totalObjects: number;

  /**
   * Total available objects across all pools
   */
  totalAvailable: number;

  /**
   * Total borrowed objects across all pools
   */
  totalBorrowed: number;

  /**
   * Overall hit rate across all pools
   */
  overallHitRate: number;

  /**
   * Current memory pressure level
   */
  memoryPressure: MemoryPressureLevel;

  /**
   * Individual pool statistics
   */
  pools: Map<string, PoolStats>;

  /**
   * Buffer pool statistics (if registered)
   */
  bufferPool?: BufferPoolStats | undefined;

  /**
   * Message pool statistics (if registered)
   */
  messagePool?: MessagePoolStats | undefined;

  /**
   * Timestamp of last cleanup
   */
  lastCleanup: number;
}

/**
 * Configuration for the pool manager
 */
export interface PoolManagerConfig {
  /**
   * Interval in milliseconds for periodic cleanup
   * @default 60000 (1 minute)
   */
  cleanupInterval: number;

  /**
   * Memory usage threshold (0-1) for moderate pressure
   * @default 0.7
   */
  moderatePressureThreshold: number;

  /**
   * Memory usage threshold (0-1) for high pressure
   * @default 0.85
   */
  highPressureThreshold: number;

  /**
   * Memory usage threshold (0-1) for critical pressure
   * @default 0.95
   */
  criticalPressureThreshold: number;

  /**
   * Whether to enable automatic memory pressure monitoring
   * @default true
   */
  enableMemoryMonitoring: boolean;

  /**
   * Interval in milliseconds for memory pressure checks
   * @default 5000 (5 seconds)
   */
  memoryCheckInterval: number;
}

/**
 * Default pool manager configuration
 */
const DEFAULT_CONFIG: PoolManagerConfig = {
  cleanupInterval: 60000,
  moderatePressureThreshold: 0.7,
  highPressureThreshold: 0.85,
  criticalPressureThreshold: 0.95,
  enableMemoryMonitoring: true,
  memoryCheckInterval: 5000,
};

/**
 * PoolManager - Singleton for centralized pool management
 * Coordinates multiple object pools and provides global operations
 */
export class PoolManager {
  private static instance: PoolManager | null = null;

  private readonly config: PoolManagerConfig;
  private readonly genericPools: Map<string, ObjectPool<any>> = new Map();
  private readonly vectorPools: Map<string, Vector3Pool> = new Map();

  private bufferPool: BufferPool | null = null;
  private messagePool: MessagePool | null = null;

  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private memoryCheckTimer: ReturnType<typeof setInterval> | null = null;

  private memoryPressure: MemoryPressureLevel = MemoryPressureLevel.Normal;
  private lastCleanup = 0;

  private eventCallbacks: Set<PoolEventCallback> = new Set();

  /**
   * Private constructor for singleton pattern
   */
  private constructor(config: Partial<PoolManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the singleton instance
   * @param config - Optional configuration (only used on first call)
   */
  static getInstance(config?: Partial<PoolManagerConfig>): PoolManager {
    if (!PoolManager.instance) {
      PoolManager.instance = new PoolManager(config);
    }
    return PoolManager.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   */
  static resetInstance(): void {
    if (PoolManager.instance) {
      PoolManager.instance.shutdown();
      PoolManager.instance = null;
    }
  }

  /**
   * Register a generic object pool
   * @param name - Unique name for the pool
   * @param pool - The pool to register
   */
  registerPool<T extends { reset(): void }>(
    name: string,
    pool: ObjectPool<T>
  ): void {
    if (this.genericPools.has(name)) {
      throw new Error(`Pool with name '${name}' is already registered`);
    }
    this.genericPools.set(name, pool);
  }

  /**
   * Register a Vector3 pool
   * @param name - Unique name for the pool
   * @param pool - The pool to register
   */
  registerVector3Pool(name: string, pool: Vector3Pool): void {
    if (this.vectorPools.has(name)) {
      throw new Error(`Vector3Pool with name '${name}' is already registered`);
    }
    this.vectorPools.set(name, pool);
  }

  /**
   * Register the global buffer pool
   * @param pool - The buffer pool to register
   */
  registerBufferPool(pool: BufferPool): void {
    this.bufferPool = pool;
  }

  /**
   * Register the global message pool
   * @param pool - The message pool to register
   */
  registerMessagePool(pool: MessagePool): void {
    this.messagePool = pool;
  }

  /**
   * Unregister a generic pool
   * @param name - Name of the pool to unregister
   */
  unregisterPool(name: string): boolean {
    const pool = this.genericPools.get(name);
    if (pool) {
      pool.clear();
      this.genericPools.delete(name);
      return true;
    }
    return false;
  }

  /**
   * Get a registered generic pool
   * @param name - Name of the pool
   */
  getPool<T extends { reset(): void }>(name: string): ObjectPool<T> | undefined {
    return this.genericPools.get(name);
  }

  /**
   * Get a registered Vector3 pool
   * @param name - Name of the pool
   */
  getVector3Pool(name: string): Vector3Pool | undefined {
    return this.vectorPools.get(name);
  }

  /**
   * Get the registered buffer pool
   */
  getBufferPool(): BufferPool | null {
    return this.bufferPool;
  }

  /**
   * Get the registered message pool
   */
  getMessagePool(): MessagePool | null {
    return this.messagePool;
  }

  /**
   * Add an event callback for pool events
   * @param callback - Callback function
   */
  addEventCallback(callback: PoolEventCallback): void {
    this.eventCallbacks.add(callback);
  }

  /**
   * Remove an event callback
   * @param callback - Callback function to remove
   */
  removeEventCallback(callback: PoolEventCallback): void {
    this.eventCallbacks.delete(callback);
  }

  /**
   * Start periodic cleanup and memory monitoring
   */
  start(): void {
    // Start cleanup timer
    if (!this.cleanupTimer && this.config.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.performCleanup();
      }, this.config.cleanupInterval);
    }

    // Start memory monitoring
    if (!this.memoryCheckTimer && this.config.enableMemoryMonitoring) {
      this.memoryCheckTimer = setInterval(() => {
        this.checkMemoryPressure();
      }, this.config.memoryCheckInterval);
    }
  }

  /**
   * Stop periodic cleanup and memory monitoring
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.memoryCheckTimer) {
      clearInterval(this.memoryCheckTimer);
      this.memoryCheckTimer = null;
    }
  }

  /**
   * Perform cleanup based on current memory pressure
   */
  performCleanup(): void {
    this.lastCleanup = Date.now();

    switch (this.memoryPressure) {
      case MemoryPressureLevel.Critical:
        this.aggressiveCleanup();
        break;
      case MemoryPressureLevel.High:
        this.moderateCleanup();
        break;
      case MemoryPressureLevel.Moderate:
        this.lightCleanup();
        break;
      default:
        // Normal - no action needed
        break;
    }
  }

  /**
   * Light cleanup - shrink oversized pools
   */
  private lightCleanup(): void {
    for (const pool of this.genericPools.values()) {
      const stats = pool.getStats();
      // Only shrink if pool is more than 50% empty
      if (stats.available > stats.borrowed * 2) {
        pool.shrink();
      }
    }

    for (const pool of this.vectorPools.values()) {
      const stats = pool.getStats();
      if (stats.available > stats.borrowed * 2) {
        pool.shrink();
      }
    }

    this.bufferPool?.shrink();
    this.messagePool?.shrinkAll();
  }

  /**
   * Moderate cleanup - shrink all pools to initial sizes
   */
  private moderateCleanup(): void {
    for (const pool of this.genericPools.values()) {
      pool.shrink();
    }

    for (const pool of this.vectorPools.values()) {
      pool.shrink();
    }

    this.bufferPool?.shrink();
    this.messagePool?.shrinkAll();
  }

  /**
   * Aggressive cleanup - clear all pools
   */
  private aggressiveCleanup(): void {
    for (const pool of this.genericPools.values()) {
      pool.clear();
    }

    for (const pool of this.vectorPools.values()) {
      pool.clear();
    }

    this.bufferPool?.clear();
    this.messagePool?.clear();
  }

  /**
   * Check memory pressure and update level
   * Uses Node.js process.memoryUsage() if available
   */
  private checkMemoryPressure(): void {
    // Get memory usage ratio
    const memoryRatio = this.getMemoryUsageRatio();

    let newLevel: MemoryPressureLevel;

    if (memoryRatio >= this.config.criticalPressureThreshold) {
      newLevel = MemoryPressureLevel.Critical;
    } else if (memoryRatio >= this.config.highPressureThreshold) {
      newLevel = MemoryPressureLevel.High;
    } else if (memoryRatio >= this.config.moderatePressureThreshold) {
      newLevel = MemoryPressureLevel.Moderate;
    } else {
      newLevel = MemoryPressureLevel.Normal;
    }

    // If pressure increased, trigger cleanup
    if (this.pressureLevelToNumber(newLevel) > this.pressureLevelToNumber(this.memoryPressure)) {
      this.memoryPressure = newLevel;
      this.performCleanup();
    } else {
      this.memoryPressure = newLevel;
    }
  }

  /**
   * Convert pressure level to numeric value for comparison
   */
  private pressureLevelToNumber(level: MemoryPressureLevel): number {
    switch (level) {
      case MemoryPressureLevel.Normal:
        return 0;
      case MemoryPressureLevel.Moderate:
        return 1;
      case MemoryPressureLevel.High:
        return 2;
      case MemoryPressureLevel.Critical:
        return 3;
    }
  }

  /**
   * Get current memory usage ratio (0-1)
   * Attempts to use Node.js API, falls back to estimate
   */
  private getMemoryUsageRatio(): number {
    // Check for Node.js environment
    if (typeof process !== 'undefined' && process.memoryUsage) {
      try {
        const usage = process.memoryUsage();
        // Use heapUsed / heapTotal as primary metric
        return usage.heapUsed / usage.heapTotal;
      } catch {
        // Fall through to default
      }
    }

    // Default to normal (can't determine memory usage)
    return 0.5;
  }

  /**
   * Manually set memory pressure level (for testing or external signals)
   * @param level - New pressure level
   */
  setMemoryPressure(level: MemoryPressureLevel): void {
    const oldLevel = this.memoryPressure;
    this.memoryPressure = level;

    if (this.pressureLevelToNumber(level) > this.pressureLevelToNumber(oldLevel)) {
      this.performCleanup();
    }
  }

  /**
   * Get current memory pressure level
   */
  getMemoryPressure(): MemoryPressureLevel {
    return this.memoryPressure;
  }

  /**
   * Get comprehensive statistics for all managed pools
   */
  getStats(): GlobalPoolStats {
    const pools = new Map<string, PoolStats>();
    let totalObjects = 0;
    let totalAvailable = 0;
    let totalBorrowed = 0;
    let totalReuses = 0;
    let totalCreates = 0;

    // Collect generic pool stats
    for (const [name, pool] of this.genericPools) {
      const stats = pool.getStats();
      pools.set(name, stats);
      totalObjects += stats.size;
      totalAvailable += stats.available;
      totalBorrowed += stats.borrowed;
      totalReuses += stats.reuses;
      totalCreates += stats.creates;
    }

    // Collect vector pool stats
    for (const [name, pool] of this.vectorPools) {
      const stats = pool.getStats();
      pools.set(`Vector3_${name}`, stats);
      totalObjects += stats.size;
      totalAvailable += stats.available;
      totalBorrowed += stats.borrowed;
      totalReuses += stats.reuses;
      totalCreates += stats.creates;
    }

    const totalAcquires = totalReuses + totalCreates;
    const overallHitRate = totalAcquires > 0 ? totalReuses / totalAcquires : 1.0;

    return {
      totalPools: this.genericPools.size + this.vectorPools.size,
      totalObjects,
      totalAvailable,
      totalBorrowed,
      overallHitRate: Math.max(0, Math.min(1, overallHitRate)),
      memoryPressure: this.memoryPressure,
      pools,
      bufferPool: this.bufferPool?.getStats(),
      messagePool: this.messagePool?.getStats(),
      lastCleanup: this.lastCleanup,
    };
  }

  /**
   * Clear all managed pools
   */
  clearAll(): void {
    for (const pool of this.genericPools.values()) {
      pool.clear();
    }

    for (const pool of this.vectorPools.values()) {
      pool.clear();
    }

    this.bufferPool?.clear();
    this.messagePool?.clear();
  }

  /**
   * Shutdown the pool manager
   * Stops timers and clears all pools
   */
  shutdown(): void {
    this.stop();
    this.clearAll();
    this.genericPools.clear();
    this.vectorPools.clear();
    this.bufferPool = null;
    this.messagePool = null;
    this.eventCallbacks.clear();
  }
}

/**
 * Global pool manager singleton accessor
 * Convenience function for getting the singleton instance
 */
export function getPoolManager(config?: Partial<PoolManagerConfig>): PoolManager {
  return PoolManager.getInstance(config);
}
