/**
 * Batch Queue
 * Queue management for batch database operations
 */

import { sql, eq } from 'drizzle-orm';
import type { MySqlTable } from 'drizzle-orm/mysql-core';
import {
  BatchOperation,
  BatchPriority,
  BatchEventType,
  type BatchItem,
  type BatchConfig,
  type BatchResult,
  type BatchQueueStats,
  type FlushOptions,
  type BatchEvent,
  type BatchEventListener,
  DEFAULT_BATCH_CONFIG,
  createEmptyBatchResult,
  mergeBatchResults,
} from './batch-types.js';
import { BatchInserter } from './batch-insert.js';
import { BatchUpdater } from './batch-update.js';
import { getDb, executeRaw, type Database } from '../connection.js';

/**
 * BatchQueue
 * Manages queuing and flushing of batch database operations
 */
export class BatchQueue {
  private items: BatchItem[] = [];
  private config: BatchConfig;
  private db: Database;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private lastFlushTime: number = Date.now();
  private totalProcessed: number = 0;
  private totalErrors: number = 0;
  private processingTimes: number[] = [];
  private eventListeners: Map<BatchEventType, Set<BatchEventListener>> = new Map();
  private isFlushing: boolean = false;
  private inserter: BatchInserter;
  private updater: BatchUpdater;

  constructor(config: Partial<BatchConfig> = {}, db?: Database) {
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
    this.db = db ?? getDb();
    this.inserter = new BatchInserter(
      { insertChunkSize: this.config.insertChunkSize },
      this.db
    );
    this.updater = new BatchUpdater(
      { updateChunkSize: this.config.updateChunkSize },
      this.db
    );

    if (this.config.autoFlush) {
      this.startAutoFlush();
    }
  }

  /**
   * Add an operation to the queue
   * @param operation - The batch operation type
   * @param table - The target table
   * @param tableName - Table name string for grouping
   * @param data - The data for the operation
   * @param key - Primary key for update/delete operations
   * @param priority - Priority level (default: NORMAL)
   * @param onComplete - Optional callback when operation completes
   */
  queue<T extends Record<string, unknown>>(
    operation: BatchOperation,
    table: MySqlTable,
    tableName: string,
    data: T,
    key?: Record<string, unknown>,
    priority: BatchPriority = BatchPriority.NORMAL,
    onComplete?: (success: boolean, error?: Error) => void
  ): void {
    const item: BatchItem<T> = {
      operation,
      table,
      tableName,
      data,
      key,
      priority,
      queuedAt: Date.now(),
      onComplete,
    };

    this.items.push(item as BatchItem);

    // Check if we need to flush due to size threshold
    if (this.items.length >= this.config.maxSize) {
      this.emitEvent(BatchEventType.THRESHOLD_REACHED, {
        queueSize: this.items.length,
        threshold: this.config.maxSize,
      });
      void this.flush({ force: true });
    }

    // Critical priority triggers immediate flush
    if (priority === BatchPriority.CRITICAL) {
      void this.flush({ force: true, minPriority: BatchPriority.CRITICAL });
    }
  }

  /**
   * Queue an insert operation
   */
  queueInsert<T extends Record<string, unknown>>(
    table: MySqlTable,
    tableName: string,
    data: T,
    priority?: BatchPriority,
    onComplete?: (success: boolean, error?: Error) => void
  ): void {
    this.queue(
      BatchOperation.INSERT,
      table,
      tableName,
      data,
      undefined,
      priority,
      onComplete
    );
  }

  /**
   * Queue an update operation
   */
  queueUpdate<T extends Record<string, unknown>>(
    table: MySqlTable,
    tableName: string,
    key: Record<string, unknown>,
    data: T,
    priority?: BatchPriority,
    onComplete?: (success: boolean, error?: Error) => void
  ): void {
    this.queue(BatchOperation.UPDATE, table, tableName, data, key, priority, onComplete);
  }

  /**
   * Queue a delete operation
   */
  queueDelete(
    table: MySqlTable,
    tableName: string,
    key: Record<string, unknown>,
    priority?: BatchPriority,
    onComplete?: (success: boolean, error?: Error) => void
  ): void {
    this.queue(BatchOperation.DELETE, table, tableName, {}, key, priority, onComplete);
  }

  /**
   * Flush all queued operations
   * @param options - Flush options
   * @returns Batch result with operation statistics
   */
  async flush(options: FlushOptions = {}): Promise<BatchResult> {
    if (this.isFlushing) {
      // Already flushing, return empty result
      return createEmptyBatchResult();
    }

    const itemsToFlush = this.getItemsToFlush(options);
    if (itemsToFlush.length === 0) {
      return createEmptyBatchResult();
    }

    this.isFlushing = true;
    const startTime = Date.now();

    this.emitEvent(BatchEventType.FLUSH_START, {
      itemCount: itemsToFlush.length,
    });

    try {
      // Remove items from queue
      this.items = this.items.filter((item) => !itemsToFlush.includes(item));

      // Group items by operation type and table
      const inserts = itemsToFlush.filter(
        (item) => item.operation === BatchOperation.INSERT
      );
      const updates = itemsToFlush.filter(
        (item) => item.operation === BatchOperation.UPDATE
      );
      const deletes = itemsToFlush.filter(
        (item) => item.operation === BatchOperation.DELETE
      );

      const results: BatchResult[] = [];

      // Process inserts
      if (inserts.length > 0) {
        const insertResult = await this.processInserts(inserts);
        results.push(insertResult);
      }

      // Process updates
      if (updates.length > 0) {
        const updateResult = await this.processUpdates(updates);
        results.push(updateResult);
      }

      // Process deletes
      if (deletes.length > 0) {
        const deleteResult = await this.processDeletes(deletes);
        results.push(deleteResult);
      }

      const result = mergeBatchResults(results);
      result.processingTime = Date.now() - startTime;

      // Update statistics
      this.lastFlushTime = Date.now();
      this.totalProcessed += result.successCount;
      this.totalErrors += result.failureCount;
      this.processingTimes.push(result.processingTime);

      // Keep only last 100 processing times for average calculation
      if (this.processingTimes.length > 100) {
        this.processingTimes = this.processingTimes.slice(-100);
      }

      // Notify callbacks
      for (const item of itemsToFlush) {
        if (item.onComplete) {
          const itemError = result.errors.find(
            (e) =>
              e.tableName === item.tableName &&
              JSON.stringify(e.key) === JSON.stringify(item.key)
          );
          item.onComplete(!itemError, itemError?.originalError);
        }
      }

      this.emitEvent(BatchEventType.FLUSH_COMPLETE, {
        result,
      });

      return result;
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Get items to flush based on options
   */
  private getItemsToFlush(options: FlushOptions): BatchItem[] {
    let items = [...this.items];

    // Filter by priority
    if (options.minPriority !== undefined) {
      items = items.filter(
        (item) => (item.priority ?? BatchPriority.NORMAL) >= options.minPriority!
      );
    }

    // Filter by tables
    if (options.tables && options.tables.length > 0) {
      items = items.filter((item) => options.tables!.includes(item.tableName));
    }

    // Sort by priority (descending) then by queue time (ascending)
    items.sort((a, b) => {
      const priorityDiff =
        (b.priority ?? BatchPriority.NORMAL) - (a.priority ?? BatchPriority.NORMAL);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return a.queuedAt - b.queuedAt;
    });

    // Limit items if specified
    if (options.maxItems && options.maxItems > 0) {
      items = items.slice(0, options.maxItems);
    }

    return items;
  }

  /**
   * Process insert operations
   */
  private async processInserts(items: BatchItem[]): Promise<BatchResult> {
    // Group by table
    const byTable = new Map<string, BatchItem[]>();
    for (const item of items) {
      const existing = byTable.get(item.tableName) ?? [];
      existing.push(item);
      byTable.set(item.tableName, existing);
    }

    const results: BatchResult[] = [];

    for (const [tableName, tableItems] of byTable) {
      const firstItem = tableItems[0];
      if (!firstItem) continue;
      const table = firstItem.table;

      for (const item of tableItems) {
        this.inserter.addInsert(table, tableName, item.data);
      }

      const result = await this.inserter.flush();
      results.push(result);
    }

    return mergeBatchResults(results);
  }

  /**
   * Process update operations
   */
  private async processUpdates(items: BatchItem[]): Promise<BatchResult> {
    // Group by table
    const byTable = new Map<string, BatchItem[]>();
    for (const item of items) {
      const existing = byTable.get(item.tableName) ?? [];
      existing.push(item);
      byTable.set(item.tableName, existing);
    }

    const results: BatchResult[] = [];

    for (const [tableName, tableItems] of byTable) {
      const firstItem = tableItems[0];
      if (!firstItem) continue;
      const table = firstItem.table;

      for (const item of tableItems) {
        if (item.key) {
          this.updater.addUpdate(table, tableName, item.key, item.data);
        }
      }

      const result = await this.updater.flush();
      results.push(result);
    }

    return mergeBatchResults(results);
  }

  /**
   * Process delete operations
   */
  private async processDeletes(items: BatchItem[]): Promise<BatchResult> {
    const result: BatchResult = createEmptyBatchResult();
    const startTime = Date.now();

    // Group by table
    const byTable = new Map<string, BatchItem[]>();
    for (const item of items) {
      const existing = byTable.get(item.tableName) ?? [];
      existing.push(item);
      byTable.set(item.tableName, existing);
    }

    for (const [tableName, tableItems] of byTable) {
      const firstItem = tableItems[0];
      if (!firstItem) continue;
      const table = firstItem.table;
      const keys = tableItems.map((item) => item.key).filter(Boolean);

      if (keys.length === 0) {
        continue;
      }

      try {
        // For deletes, we need to execute individually or use IN clause
        // This is a simplified version - in production you'd want optimized batch deletes
        for (const item of tableItems) {
          if (!item.key) {
            continue;
          }

          // Build WHERE clause from key
          const keyEntries = Object.entries(item.key);
          if (keyEntries.length === 0) {
            continue;
          }

          // Use raw SQL for batch delete with dynamic conditions
          const firstEntry = keyEntries[0];
          if (!firstEntry) continue;
          const keyColumn = firstEntry[0];
          const keyValue = firstEntry[1];

          const whereConditions = keyEntries.map(([col]) => `\`${col}\` = ?`).join(' AND ');
          const params = keyEntries.map(([, val]) => val);
          const sqlQuery = `DELETE FROM \`${tableName}\` WHERE ${whereConditions}`;
          await executeRaw(sqlQuery, params);

          result.affected++;
          result.successCount++;
        }
      } catch (error) {
        result.success = false;
        result.failureCount += tableItems.length;
        result.errors.push({
          operation: BatchOperation.DELETE,
          tableName,
          message: error instanceof Error ? error.message : String(error),
          originalError: error instanceof Error ? error : undefined,
          retryAttempts: 0,
        });

        this.emitEvent(BatchEventType.OPERATION_FAILED, {
          operation: BatchOperation.DELETE,
          tableName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    result.processingTime = Date.now() - startTime;
    return result;
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.items.length;
  }

  /**
   * Get queue statistics
   */
  getStats(): BatchQueueStats {
    const pendingInserts = this.items.filter(
      (item) => item.operation === BatchOperation.INSERT
    ).length;
    const pendingUpdates = this.items.filter(
      (item) => item.operation === BatchOperation.UPDATE
    ).length;
    const pendingDeletes = this.items.filter(
      (item) => item.operation === BatchOperation.DELETE
    ).length;

    const avgProcessingTime =
      this.processingTimes.length > 0
        ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
        : 0;

    return {
      queueSize: this.items.length,
      pendingInserts,
      pendingUpdates,
      pendingDeletes,
      totalProcessed: this.totalProcessed,
      totalErrors: this.totalErrors,
      avgProcessingTime,
      timeSinceLastFlush: Date.now() - this.lastFlushTime,
    };
  }

  /**
   * Start automatic periodic flushing
   */
  startAutoFlush(): void {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setInterval(() => {
      if (this.items.length > 0) {
        void this.flush();
      }
    }, this.config.flushInterval);
  }

  /**
   * Stop automatic flushing
   */
  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Clear all queued operations without executing them
   */
  clear(): void {
    // Notify callbacks of cancellation
    for (const item of this.items) {
      if (item.onComplete) {
        item.onComplete(false, new Error('Queue cleared'));
      }
    }
    this.items = [];
  }

  /**
   * Shutdown the batch queue gracefully
   * Flushes all remaining operations and stops auto-flush
   */
  async shutdown(): Promise<BatchResult> {
    this.stopAutoFlush();
    return await this.flush({ force: true });
  }

  /**
   * Add an event listener
   */
  on(eventType: BatchEventType, listener: BatchEventListener): void {
    const listeners = this.eventListeners.get(eventType) ?? new Set();
    listeners.add(listener);
    this.eventListeners.set(eventType, listeners);
  }

  /**
   * Remove an event listener
   */
  off(eventType: BatchEventType, listener: BatchEventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(type: BatchEventType, data?: Record<string, unknown>): void {
    const event: BatchEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          // Ignore listener errors
          console.error('Batch event listener error:', error);
        }
      }
    }
  }
}

/**
 * Create a new BatchQueue instance
 * @param config - Optional configuration override
 * @param db - Optional database instance
 * @returns BatchQueue instance
 */
export function createBatchQueue(
  config?: Partial<BatchConfig>,
  db?: Database
): BatchQueue {
  return new BatchQueue(config, db);
}
