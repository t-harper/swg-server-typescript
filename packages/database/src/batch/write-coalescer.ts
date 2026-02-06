/**
 * Write Coalescer
 * Combines multiple writes to the same object to reduce database round trips
 */

/**
 * Pending write data
 */
interface PendingWrite<T = Record<string, unknown>> {
  /** Accumulated data to write */
  data: T;
  /** When first write was queued */
  firstWriteAt: number;
  /** When last write was queued */
  lastWriteAt: number;
  /** Number of writes coalesced */
  writeCount: number;
  /** Write priority (highest wins) */
  priority: number;
  /** Optional callback when write completes */
  onComplete?: ((success: boolean, error?: Error) => void) | undefined;
}

/**
 * Configuration for WriteCoalescer
 */
export interface WriteCoalescerConfig {
  /** Time window in ms for coalescing writes (default: 100) */
  coalesceWindow: number;
  /** Maximum number of pending writes (default: 10000) */
  maxPendingWrites: number;
  /** Maximum writes to coalesce per object before forcing flush (default: 50) */
  maxCoalescedWrites: number;
  /** Auto-flush when window expires (default: true) */
  autoFlush: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_WRITE_COALESCER_CONFIG: WriteCoalescerConfig = {
  coalesceWindow: 100,
  maxPendingWrites: 10000,
  maxCoalescedWrites: 50,
  autoFlush: true,
};

/**
 * Coalesced write information
 */
export interface CoalescedWriteInfo<T = Record<string, unknown>> {
  objectId: bigint;
  tableName: string;
  key: Record<string, unknown>;
  data: T;
  firstWriteAt: number;
  lastWriteAt: number;
  writeCount: number;
  priority: number;
  age: number;
}

/**
 * Write coalescer statistics
 */
export interface WriteCoalescerStats {
  /** Number of pending writes */
  pendingCount: number;
  /** Total writes coalesced since creation */
  totalCoalesced: number;
  /** Total writes flushed */
  totalFlushed: number;
  /** Average writes coalesced per object */
  avgCoalescedPerObject: number;
  /** Objects waiting for flush */
  uniqueObjects: number;
}

/**
 * Flush result from write coalescer
 */
export interface CoalescerFlushResult<T = Record<string, unknown>> {
  writes: Array<CoalescedWriteInfo<T>>;
  totalCoalesced: number;
}

/**
 * WriteCoalescer
 * Combines multiple writes to the same object within a configurable time window
 * to reduce database operations and improve performance
 */
export class WriteCoalescer<T extends Record<string, unknown> = Record<string, unknown>> {
  private pending: Map<string, Map<string, PendingWrite<T>>> = new Map();
  private config: WriteCoalescerConfig;
  private flushTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private totalCoalesced: number = 0;
  private totalFlushed: number = 0;
  private onFlush?: ((writes: Array<CoalescedWriteInfo<T>>) => Promise<void>) | undefined;

  constructor(
    config: Partial<WriteCoalescerConfig> = {},
    onFlush?: (writes: Array<CoalescedWriteInfo<T>>) => Promise<void>
  ) {
    this.config = { ...DEFAULT_WRITE_COALESCER_CONFIG, ...config };
    this.onFlush = onFlush;
  }

  /**
   * Queue a write to be coalesced
   * @param tableName - Target table name
   * @param objectId - Object ID
   * @param key - Primary key for the record
   * @param data - Data to write
   * @param priority - Write priority (higher = more urgent)
   * @param onComplete - Optional callback when write completes
   */
  write(
    tableName: string,
    objectId: bigint,
    key: Record<string, unknown>,
    data: Partial<T>,
    priority: number = 0,
    onComplete?: (success: boolean, error?: Error) => void
  ): void {
    const now = Date.now();
    const objectKey = this.makeKey(tableName, objectId);

    // Get or create table map
    let tableWrites = this.pending.get(tableName);
    if (!tableWrites) {
      tableWrites = new Map();
      this.pending.set(tableName, tableWrites);
    }

    const existing = tableWrites.get(objectKey);

    if (existing) {
      // Coalesce with existing write
      existing.data = { ...existing.data, ...data } as T;
      existing.lastWriteAt = now;
      existing.writeCount++;
      existing.priority = Math.max(existing.priority, priority);
      this.totalCoalesced++;

      // Chain callbacks
      if (onComplete) {
        const prevCallback = existing.onComplete;
        existing.onComplete = (success, error) => {
          prevCallback?.(success, error);
          onComplete(success, error);
        };
      }

      // Check if we need to force flush due to max coalesced writes
      if (existing.writeCount >= this.config.maxCoalescedWrites) {
        void this.flushObject(tableName, objectId);
      }
    } else {
      // Check capacity
      if (this.getTotalPendingCount() >= this.config.maxPendingWrites) {
        // Force flush oldest writes
        void this.flushOldest();
      }

      // Create new pending write
      tableWrites.set(objectKey, {
        data: { ...data } as T,
        firstWriteAt: now,
        lastWriteAt: now,
        writeCount: 1,
        priority,
        onComplete,
      });

      // Schedule auto-flush if enabled
      if (this.config.autoFlush) {
        this.scheduleFlush(tableName, objectId);
      }
    }
  }

  /**
   * Make a unique key for an object
   */
  private makeKey(tableName: string, objectId: bigint): string {
    return `${tableName}:${objectId.toString()}`;
  }

  /**
   * Parse key back to components
   */
  private parseKey(key: string): { tableName: string; objectId: bigint } {
    const parts = key.split(':');
    const tableName = parts[0] ?? '';
    const objectIdStr = parts[1] ?? '0';
    return { tableName, objectId: BigInt(objectIdStr) };
  }

  /**
   * Schedule a flush for an object after the coalesce window
   */
  private scheduleFlush(tableName: string, objectId: bigint): void {
    const key = this.makeKey(tableName, objectId);

    // Clear any existing timer
    const existing = this.flushTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    // Schedule new flush
    const timer = setTimeout(() => {
      this.flushTimers.delete(key);
      void this.flushObject(tableName, objectId);
    }, this.config.coalesceWindow);

    this.flushTimers.set(key, timer);
  }

  /**
   * Flush a single object's pending writes
   */
  async flushObject(tableName: string, objectId: bigint): Promise<CoalescedWriteInfo<T> | null> {
    const objectKey = this.makeKey(tableName, objectId);
    const tableWrites = this.pending.get(tableName);

    if (!tableWrites) {
      return null;
    }

    const pending = tableWrites.get(objectKey);
    if (!pending) {
      return null;
    }

    // Remove from pending
    tableWrites.delete(objectKey);
    if (tableWrites.size === 0) {
      this.pending.delete(tableName);
    }

    // Cancel any pending timer
    const timer = this.flushTimers.get(objectKey);
    if (timer) {
      clearTimeout(timer);
      this.flushTimers.delete(objectKey);
    }

    const now = Date.now();
    const writeInfo: CoalescedWriteInfo<T> = {
      objectId,
      tableName,
      key: { objectId }, // Default key - caller should have proper key
      data: pending.data,
      firstWriteAt: pending.firstWriteAt,
      lastWriteAt: pending.lastWriteAt,
      writeCount: pending.writeCount,
      priority: pending.priority,
      age: now - pending.firstWriteAt,
    };

    this.totalFlushed++;

    // Call flush handler if provided
    if (this.onFlush) {
      try {
        await this.onFlush([writeInfo]);
        pending.onComplete?.(true);
      } catch (error) {
        pending.onComplete?.(false, error instanceof Error ? error : new Error(String(error)));
      }
    } else {
      pending.onComplete?.(true);
    }

    return writeInfo;
  }

  /**
   * Flush all pending writes for a table
   */
  async flushTable(tableName: string): Promise<CoalescerFlushResult<T>> {
    const tableWrites = this.pending.get(tableName);
    if (!tableWrites || tableWrites.size === 0) {
      return { writes: [], totalCoalesced: 0 };
    }

    const now = Date.now();
    const writes: Array<CoalescedWriteInfo<T>> = [];
    let totalCoalesced = 0;

    // Collect all pending writes
    for (const [objectKey, pending] of tableWrites) {
      const { objectId } = this.parseKey(objectKey);

      // Cancel any pending timer
      const timer = this.flushTimers.get(objectKey);
      if (timer) {
        clearTimeout(timer);
        this.flushTimers.delete(objectKey);
      }

      writes.push({
        objectId,
        tableName,
        key: { objectId },
        data: pending.data,
        firstWriteAt: pending.firstWriteAt,
        lastWriteAt: pending.lastWriteAt,
        writeCount: pending.writeCount,
        priority: pending.priority,
        age: now - pending.firstWriteAt,
      });

      totalCoalesced += pending.writeCount;
      this.totalFlushed++;
    }

    // Clear table pending writes
    this.pending.delete(tableName);

    // Call flush handler if provided
    if (this.onFlush && writes.length > 0) {
      try {
        await this.onFlush(writes);
        for (const [objectKey] of tableWrites) {
          const pending = tableWrites.get(objectKey);
          pending?.onComplete?.(true);
        }
      } catch (error) {
        for (const [objectKey] of tableWrites) {
          const pending = tableWrites.get(objectKey);
          pending?.onComplete?.(false, error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    return { writes, totalCoalesced };
  }

  /**
   * Flush all pending writes
   */
  async flush(): Promise<CoalescerFlushResult<T>> {
    const allWrites: Array<CoalescedWriteInfo<T>> = [];
    let totalCoalesced = 0;

    const tableNames = Array.from(this.pending.keys());

    for (const tableName of tableNames) {
      const result = await this.flushTable(tableName);
      allWrites.push(...result.writes);
      totalCoalesced += result.totalCoalesced;
    }

    return { writes: allWrites, totalCoalesced };
  }

  /**
   * Flush oldest pending writes (when at capacity)
   */
  private async flushOldest(): Promise<void> {
    // Find oldest writes across all tables
    const candidates: Array<{
      tableName: string;
      objectKey: string;
      firstWriteAt: number;
    }> = [];

    for (const [tableName, tableWrites] of this.pending) {
      for (const [objectKey, pending] of tableWrites) {
        candidates.push({
          tableName,
          objectKey,
          firstWriteAt: pending.firstWriteAt,
        });
      }
    }

    // Sort by age (oldest first) and flush oldest 10%
    candidates.sort((a, b) => a.firstWriteAt - b.firstWriteAt);
    const toFlush = Math.max(1, Math.floor(candidates.length * 0.1));

    for (let i = 0; i < toFlush && i < candidates.length; i++) {
      const candidate = candidates[i];
      if (!candidate) continue;
      const { objectKey } = candidate;
      const { tableName, objectId } = this.parseKey(objectKey);
      await this.flushObject(tableName, objectId);
    }
  }

  /**
   * Get pending write for an object
   */
  getPending(tableName: string, objectId: bigint): CoalescedWriteInfo<T> | null {
    const objectKey = this.makeKey(tableName, objectId);
    const tableWrites = this.pending.get(tableName);
    const pending = tableWrites?.get(objectKey);

    if (!pending) {
      return null;
    }

    const now = Date.now();
    return {
      objectId,
      tableName,
      key: { objectId },
      data: pending.data,
      firstWriteAt: pending.firstWriteAt,
      lastWriteAt: pending.lastWriteAt,
      writeCount: pending.writeCount,
      priority: pending.priority,
      age: now - pending.firstWriteAt,
    };
  }

  /**
   * Check if an object has pending writes
   */
  hasPending(tableName: string, objectId: bigint): boolean {
    const objectKey = this.makeKey(tableName, objectId);
    return this.pending.get(tableName)?.has(objectKey) ?? false;
  }

  /**
   * Get total pending write count across all tables
   */
  getTotalPendingCount(): number {
    let count = 0;
    for (const tableWrites of this.pending.values()) {
      count += tableWrites.size;
    }
    return count;
  }

  /**
   * Get pending write count for a table
   */
  getPendingCount(tableName: string): number {
    return this.pending.get(tableName)?.size ?? 0;
  }

  /**
   * Get statistics
   */
  getStats(): WriteCoalescerStats {
    let uniqueObjects = 0;
    let totalWrites = 0;

    for (const tableWrites of this.pending.values()) {
      uniqueObjects += tableWrites.size;
      for (const pending of tableWrites.values()) {
        totalWrites += pending.writeCount;
      }
    }

    return {
      pendingCount: this.getTotalPendingCount(),
      totalCoalesced: this.totalCoalesced,
      totalFlushed: this.totalFlushed,
      avgCoalescedPerObject: uniqueObjects > 0 ? totalWrites / uniqueObjects : 0,
      uniqueObjects,
    };
  }

  /**
   * Cancel pending write for an object without flushing
   */
  cancel(tableName: string, objectId: bigint): boolean {
    const objectKey = this.makeKey(tableName, objectId);
    const tableWrites = this.pending.get(tableName);

    if (!tableWrites) {
      return false;
    }

    const pending = tableWrites.get(objectKey);
    if (!pending) {
      return false;
    }

    // Remove from pending
    tableWrites.delete(objectKey);
    if (tableWrites.size === 0) {
      this.pending.delete(tableName);
    }

    // Cancel timer
    const timer = this.flushTimers.get(objectKey);
    if (timer) {
      clearTimeout(timer);
      this.flushTimers.delete(objectKey);
    }

    // Notify callback of cancellation
    pending.onComplete?.(false, new Error('Write cancelled'));

    return true;
  }

  /**
   * Clear all pending writes without flushing
   */
  clear(): void {
    // Cancel all timers
    for (const timer of this.flushTimers.values()) {
      clearTimeout(timer);
    }
    this.flushTimers.clear();

    // Notify all callbacks
    for (const tableWrites of this.pending.values()) {
      for (const pending of tableWrites.values()) {
        pending.onComplete?.(false, new Error('Coalescer cleared'));
      }
    }

    this.pending.clear();
  }

  /**
   * Shutdown the coalescer - flush all pending and stop
   */
  async shutdown(): Promise<CoalescerFlushResult<T>> {
    // Cancel all timers
    for (const timer of this.flushTimers.values()) {
      clearTimeout(timer);
    }
    this.flushTimers.clear();

    // Flush all pending
    return await this.flush();
  }

  /**
   * Set the flush handler
   */
  setFlushHandler(handler: (writes: Array<CoalescedWriteInfo<T>>) => Promise<void>): void {
    this.onFlush = handler;
  }
}

/**
 * Create a new WriteCoalescer instance
 * @param config - Optional configuration
 * @param onFlush - Optional flush handler
 * @returns WriteCoalescer instance
 */
export function createWriteCoalescer<T extends Record<string, unknown> = Record<string, unknown>>(
  config?: Partial<WriteCoalescerConfig>,
  onFlush?: (writes: Array<CoalescedWriteInfo<T>>) => Promise<void>
): WriteCoalescer<T> {
  return new WriteCoalescer(config, onFlush);
}
