/**
 * Buffer Pool Implementation
 * Provides pooled buffers of various sizes to reduce allocations
 * Uses size-bucketed pools for efficient buffer reuse
 */

import type { PoolStats } from './pool-types.js';

/**
 * Standard buffer size buckets
 * Each bucket contains buffers of a specific size
 */
export const BUFFER_SIZES = [256, 1024, 4096, 16384, 65536] as const;
export type BufferSize = (typeof BUFFER_SIZES)[number];

/**
 * Buffer pool statistics including per-bucket stats
 */
export interface BufferPoolStats extends PoolStats {
  /**
   * Statistics per size bucket
   */
  buckets: Map<number, PoolStats>;

  /**
   * Total bytes currently allocated in pools
   */
  totalBytes: number;

  /**
   * Total bytes currently borrowed
   */
  borrowedBytes: number;
}

/**
 * Internal bucket for managing buffers of a specific size
 */
class BufferBucket {
  readonly size: number;
  private readonly pool: Uint8Array[] = [];
  private readonly maxCount: number;

  private borrowedCount = 0;
  private totalCreates = 0;
  private totalReuses = 0;

  constructor(size: number, initialCount: number, maxCount: number) {
    this.size = size;
    this.maxCount = maxCount;

    // Pre-allocate initial buffers
    for (let i = 0; i < initialCount; i++) {
      this.pool.push(new Uint8Array(size));
      this.totalCreates++;
    }
  }

  acquire(): Uint8Array {
    let buffer: Uint8Array;

    if (this.pool.length > 0) {
      buffer = this.pool.pop()!;
      this.totalReuses++;
    } else {
      buffer = new Uint8Array(this.size);
      this.totalCreates++;
    }

    this.borrowedCount++;
    return buffer;
  }

  release(buffer: Uint8Array): boolean {
    if (this.borrowedCount > 0) {
      this.borrowedCount--;
    }

    // Only accept buffers of the correct size
    if (buffer.length !== this.size) {
      return false;
    }

    if (this.pool.length < this.maxCount) {
      // Clear the buffer before returning to pool (security/determinism)
      buffer.fill(0);
      this.pool.push(buffer);
      return true;
    }

    return false;
  }

  getStats(): PoolStats {
    const totalAcquires = this.totalReuses + Math.max(0, this.totalCreates - this.pool.length);
    const hitRate = totalAcquires > 0 ? this.totalReuses / totalAcquires : 1.0;

    return {
      size: this.pool.length + this.borrowedCount,
      available: this.pool.length,
      borrowed: this.borrowedCount,
      creates: this.totalCreates,
      reuses: this.totalReuses,
      hitRate: Math.max(0, Math.min(1, hitRate)),
    };
  }

  clear(): void {
    this.pool.length = 0;
  }

  shrink(targetCount: number): number {
    const removeCount = Math.max(0, this.pool.length - targetCount);
    if (removeCount > 0) {
      this.pool.splice(this.pool.length - removeCount, removeCount);
    }
    return removeCount;
  }
}

/**
 * Configuration for buffer pool
 */
export interface BufferPoolConfig {
  /**
   * Initial count per size bucket
   * @default { 256: 32, 1024: 16, 4096: 8, 16384: 4, 65536: 2 }
   */
  initialCounts?: Partial<Record<BufferSize, number>>;

  /**
   * Maximum count per size bucket
   * @default { 256: 256, 1024: 128, 4096: 64, 16384: 32, 65536: 16 }
   */
  maxCounts?: Partial<Record<BufferSize, number>>;

  /**
   * Whether to clear buffers on release (security)
   * @default true
   */
  clearOnRelease?: boolean;
}

/**
 * Default initial counts per bucket size
 */
const DEFAULT_INITIAL_COUNTS: Record<BufferSize, number> = {
  256: 32,
  1024: 16,
  4096: 8,
  16384: 4,
  65536: 2,
};

/**
 * Default maximum counts per bucket size
 */
const DEFAULT_MAX_COUNTS: Record<BufferSize, number> = {
  256: 256,
  1024: 128,
  4096: 64,
  16384: 32,
  65536: 16,
};

/**
 * BufferPool - Size-bucketed pool for Uint8Array buffers
 * Automatically selects the smallest bucket that fits the requested size
 */
export class BufferPool {
  private readonly buckets: Map<BufferSize, BufferBucket> = new Map();
  private readonly clearOnRelease: boolean;

  /**
   * Create a new buffer pool
   * @param config - Optional configuration
   */
  constructor(config: BufferPoolConfig = {}) {
    this.clearOnRelease = config.clearOnRelease ?? true;

    const initialCounts = { ...DEFAULT_INITIAL_COUNTS, ...config.initialCounts };
    const maxCounts = { ...DEFAULT_MAX_COUNTS, ...config.maxCounts };

    // Initialize buckets for each standard size
    for (const size of BUFFER_SIZES) {
      this.buckets.set(
        size,
        new BufferBucket(size, initialCounts[size], maxCounts[size])
      );
    }
  }

  /**
   * Find the smallest bucket size that fits the requested size
   */
  private findBucketSize(minSize: number): BufferSize | null {
    for (const size of BUFFER_SIZES) {
      if (size >= minSize) {
        return size;
      }
    }
    return null;
  }

  /**
   * Acquire a buffer of at least the specified size
   * @param minSize - Minimum buffer size needed
   * @returns A buffer of at least minSize bytes, or exactly minSize if larger than all buckets
   */
  acquireBuffer(minSize: number): Uint8Array {
    const bucketSize = this.findBucketSize(minSize);

    if (bucketSize !== null) {
      const bucket = this.buckets.get(bucketSize)!;
      return bucket.acquire();
    }

    // Size larger than all buckets - create exact size (won't be pooled)
    return new Uint8Array(minSize);
  }

  /**
   * Acquire a buffer of exactly the specified bucket size
   * @param size - Exact bucket size to acquire
   */
  acquireExact(size: BufferSize): Uint8Array {
    const bucket = this.buckets.get(size);
    if (bucket) {
      return bucket.acquire();
    }
    throw new Error(`Invalid bucket size: ${size}`);
  }

  /**
   * Release a buffer back to the pool
   * @param buffer - Buffer to release
   * @returns true if buffer was returned to a pool, false otherwise
   */
  releaseBuffer(buffer: Uint8Array): boolean {
    const size = buffer.length as BufferSize;
    const bucket = this.buckets.get(size);

    if (bucket) {
      return bucket.release(buffer);
    }

    // Buffer size doesn't match any bucket - can't pool it
    return false;
  }

  /**
   * Get comprehensive pool statistics
   */
  getStats(): BufferPoolStats {
    const bucketStats = new Map<number, PoolStats>();
    let totalSize = 0;
    let totalAvailable = 0;
    let totalBorrowed = 0;
    let totalCreates = 0;
    let totalReuses = 0;
    let totalBytes = 0;
    let borrowedBytes = 0;

    for (const [size, bucket] of this.buckets) {
      const stats = bucket.getStats();
      bucketStats.set(size, stats);

      totalSize += stats.size;
      totalAvailable += stats.available;
      totalBorrowed += stats.borrowed;
      totalCreates += stats.creates;
      totalReuses += stats.reuses;
      totalBytes += stats.available * size;
      borrowedBytes += stats.borrowed * size;
    }

    const totalAcquires = totalReuses + totalCreates;
    const hitRate = totalAcquires > 0 ? totalReuses / totalAcquires : 1.0;

    return {
      size: totalSize,
      available: totalAvailable,
      borrowed: totalBorrowed,
      creates: totalCreates,
      reuses: totalReuses,
      hitRate: Math.max(0, Math.min(1, hitRate)),
      buckets: bucketStats,
      totalBytes,
      borrowedBytes,
    };
  }

  /**
   * Clear all buffers from all buckets
   */
  clear(): void {
    for (const bucket of this.buckets.values()) {
      bucket.clear();
    }
  }

  /**
   * Shrink all buckets to their initial sizes
   * @param targetCounts - Optional target counts per bucket
   */
  shrink(targetCounts?: Partial<Record<BufferSize, number>>): number {
    let totalRemoved = 0;
    const defaults = DEFAULT_INITIAL_COUNTS;

    for (const [size, bucket] of this.buckets) {
      const target = targetCounts?.[size] ?? defaults[size];
      totalRemoved += bucket.shrink(target);
    }

    return totalRemoved;
  }

  /**
   * Get all available bucket sizes
   */
  getBucketSizes(): readonly BufferSize[] {
    return BUFFER_SIZES;
  }
}

/**
 * Global shared buffer pool instance
 * Use for general-purpose buffer pooling across the application
 */
export const globalBufferPool = new BufferPool();
