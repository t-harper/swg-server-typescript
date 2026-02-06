/**
 * Async Flush Queue
 * Background processing for database flushes with priority support
 */

import type { MySqlTable } from 'drizzle-orm/mysql-core';
import {
  BatchOperation,
  BatchPriority,
  type BatchResult,
  type BatchConfig,
  DEFAULT_BATCH_CONFIG,
  createEmptyBatchResult,
  mergeBatchResults,
} from './batch-types.js';
import { BatchInserter, createBatchInserter } from './batch-insert.js';
import { BatchUpdater, createBatchUpdater } from './batch-update.js';
import { getDb, type Database } from '../connection.js';

/**
 * Queue item for async processing
 */
interface QueueItem<T = Record<string, unknown>> {
  id: string;
  operation: BatchOperation;
  table: MySqlTable;
  tableName: string;
  data: T;
  key?: Record<string, unknown> | undefined;
  priority: BatchPriority;
  queuedAt: number;
  retryCount: number;
  resolve: (result: BatchResult) => void;
  reject: (error: Error) => void;
}

/**
 * Configuration for AsyncFlushQueue
 */
export interface AsyncFlushQueueConfig {
  /** Maximum concurrent flush operations (default: 3) */
  maxConcurrent: number;
  /** Processing interval in milliseconds (default: 50) */
  processInterval: number;
  /** Maximum queue size before blocking (default: 10000) */
  maxQueueSize: number;
  /** Maximum retries for failed operations (default: 3) */
  maxRetries: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay: number;
  /** Batch size for grouping operations (default: 100) */
  batchSize: number;
  /** Flush timeout in milliseconds (default: 30000) */
  flushTimeout: number;
}

/**
 * Default configuration
 */
const DEFAULT_ASYNC_FLUSH_CONFIG: AsyncFlushQueueConfig = {
  maxConcurrent: 3,
  processInterval: 50,
  maxQueueSize: 10000,
  maxRetries: 3,
  retryDelay: 1000,
  batchSize: 100,
  flushTimeout: 30000,
};

/**
 * AsyncFlushQueue statistics
 */
export interface AsyncFlushQueueStats {
  /** Items currently in queue */
  queueSize: number;
  /** Items currently being processed */
  processing: number;
  /** Total items processed */
  totalProcessed: number;
  /** Total failed items */
  totalFailed: number;
  /** Items by priority */
  byPriority: Record<BatchPriority, number>;
  /** Average processing time in ms */
  avgProcessingTime: number;
  /** Queue is accepting new items */
  isAccepting: boolean;
  /** Queue is shutting down */
  isShuttingDown: boolean;
}

/**
 * AsyncFlushQueue
 * Provides background processing for database operations with priority support
 */
export class AsyncFlushQueue {
  private queue: QueueItem[] = [];
  private config: AsyncFlushQueueConfig;
  private db: Database;
  private inserter: BatchInserter;
  private updater: BatchUpdater;
  private isRunning: boolean = false;
  private isShuttingDown: boolean = false;
  private processing: number = 0;
  private processTimer: ReturnType<typeof setInterval> | null = null;
  private totalProcessed: number = 0;
  private totalFailed: number = 0;
  private processingTimes: number[] = [];
  private itemIdCounter: number = 0;
  private retryQueue: Map<string, QueueItem> = new Map();

  constructor(config: Partial<AsyncFlushQueueConfig> = {}, db?: Database) {
    this.config = { ...DEFAULT_ASYNC_FLUSH_CONFIG, ...config };
    this.db = db ?? getDb();
    this.inserter = createBatchInserter(
      { insertChunkSize: this.config.batchSize },
      this.db
    );
    this.updater = createBatchUpdater(
      { updateChunkSize: this.config.batchSize },
      this.db
    );
  }

  /**
   * Start the background processing loop
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.processTimer = setInterval(() => {
      void this.processQueue();
    }, this.config.processInterval);
  }

  /**
   * Stop the background processing (does not flush remaining)
   */
  stop(): void {
    this.isRunning = false;
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }
  }

  /**
   * Queue an insert operation
   * @returns Promise that resolves when the operation completes
   */
  async queueInsert<T extends Record<string, unknown>>(
    table: MySqlTable,
    tableName: string,
    data: T,
    priority: BatchPriority = BatchPriority.NORMAL
  ): Promise<BatchResult> {
    return this.enqueue(BatchOperation.INSERT, table, tableName, data, undefined, priority);
  }

  /**
   * Queue an update operation
   * @returns Promise that resolves when the operation completes
   */
  async queueUpdate<T extends Record<string, unknown>>(
    table: MySqlTable,
    tableName: string,
    key: Record<string, unknown>,
    data: T,
    priority: BatchPriority = BatchPriority.NORMAL
  ): Promise<BatchResult> {
    return this.enqueue(BatchOperation.UPDATE, table, tableName, data, key, priority);
  }

  /**
   * Queue a delete operation
   * @returns Promise that resolves when the operation completes
   */
  async queueDelete(
    table: MySqlTable,
    tableName: string,
    key: Record<string, unknown>,
    priority: BatchPriority = BatchPriority.NORMAL
  ): Promise<BatchResult> {
    return this.enqueue(BatchOperation.DELETE, table, tableName, {}, key, priority);
  }

  /**
   * Internal method to enqueue an operation
   */
  private enqueue<T extends Record<string, unknown>>(
    operation: BatchOperation,
    table: MySqlTable,
    tableName: string,
    data: T,
    key: Record<string, unknown> | undefined,
    priority: BatchPriority
  ): Promise<BatchResult> {
    if (this.isShuttingDown) {
      return Promise.reject(new Error('Queue is shutting down'));
    }

    if (this.queue.length >= this.config.maxQueueSize) {
      return Promise.reject(new Error('Queue is full'));
    }

    return new Promise<BatchResult>((resolve, reject) => {
      const item: QueueItem<T> = {
        id: `${++this.itemIdCounter}`,
        operation,
        table,
        tableName,
        data,
        key,
        priority,
        queuedAt: Date.now(),
        retryCount: 0,
        resolve,
        reject,
      };

      // Insert maintaining priority order
      this.insertByPriority(item as QueueItem);

      // Auto-start if not running
      if (!this.isRunning) {
        this.start();
      }
    });
  }

  /**
   * Insert item into queue maintaining priority order
   */
  private insertByPriority(item: QueueItem): void {
    // Find insertion point - higher priority items come first
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const queueItem = this.queue[i];
      if (queueItem && queueItem.priority < item.priority) {
        insertIndex = i;
        break;
      }
    }
    this.queue.splice(insertIndex, 0, item);
  }

  /**
   * Process items from the queue
   */
  private async processQueue(): Promise<void> {
    if (!this.isRunning || this.processing >= this.config.maxConcurrent) {
      return;
    }

    // Check for items to retry
    await this.processRetries();

    // Process regular queue
    while (
      this.isRunning &&
      this.processing < this.config.maxConcurrent &&
      this.queue.length > 0
    ) {
      const batch = this.takeBatch();
      if (batch.length === 0) {
        break;
      }

      this.processing++;
      void this.processBatch(batch).finally(() => {
        this.processing--;
      });
    }
  }

  /**
   * Take a batch of items from the queue
   */
  private takeBatch(): QueueItem[] {
    const batch: QueueItem[] = [];
    const batchByTable = new Map<string, QueueItem[]>();

    // Group by table and operation, respecting batch size
    while (batch.length < this.config.batchSize && this.queue.length > 0) {
      const item = this.queue.shift()!;
      const key = `${item.tableName}:${item.operation}`;

      const existing = batchByTable.get(key) ?? [];
      existing.push(item);
      batchByTable.set(key, existing);
      batch.push(item);
    }

    return batch;
  }

  /**
   * Process a batch of items
   */
  private async processBatch(batch: QueueItem[]): Promise<void> {
    const startTime = Date.now();

    // Group by operation type and table
    const inserts = new Map<string, QueueItem[]>();
    const updates = new Map<string, QueueItem[]>();
    const deletes = new Map<string, QueueItem[]>();

    for (const item of batch) {
      const key = item.tableName;
      switch (item.operation) {
        case BatchOperation.INSERT:
          inserts.set(key, [...(inserts.get(key) ?? []), item]);
          break;
        case BatchOperation.UPDATE:
          updates.set(key, [...(updates.get(key) ?? []), item]);
          break;
        case BatchOperation.DELETE:
          deletes.set(key, [...(deletes.get(key) ?? []), item]);
          break;
      }
    }

    const results: BatchResult[] = [];

    // Process inserts
    for (const [tableName, items] of inserts) {
      const result = await this.processInserts(tableName, items);
      results.push(result);
    }

    // Process updates
    for (const [tableName, items] of updates) {
      const result = await this.processUpdates(tableName, items);
      results.push(result);
    }

    // Process deletes
    for (const [tableName, items] of deletes) {
      const result = await this.processDeletes(tableName, items);
      results.push(result);
    }

    const finalResult = mergeBatchResults(results);

    // Update statistics
    this.totalProcessed += finalResult.successCount;
    this.totalFailed += finalResult.failureCount;
    this.processingTimes.push(Date.now() - startTime);

    // Keep only last 100 processing times
    if (this.processingTimes.length > 100) {
      this.processingTimes = this.processingTimes.slice(-100);
    }
  }

  /**
   * Process insert operations
   */
  private async processInserts(tableName: string, items: QueueItem[]): Promise<BatchResult> {
    const firstItem = items[0];
    if (!firstItem) return createEmptyBatchResult();
    const table = firstItem.table;

    for (const item of items) {
      this.inserter.addInsert(table, tableName, item.data);
    }

    try {
      const result = await this.withTimeout(this.inserter.flush());

      // Resolve all item promises
      for (const item of items) {
        item.resolve(result);
      }

      return result;
    } catch (error) {
      return this.handleBatchError(items, error);
    }
  }

  /**
   * Process update operations
   */
  private async processUpdates(tableName: string, items: QueueItem[]): Promise<BatchResult> {
    const firstItem = items[0];
    if (!firstItem) return createEmptyBatchResult();
    const table = firstItem.table;

    for (const item of items) {
      if (item.key) {
        this.updater.addUpdate(table, tableName, item.key, item.data);
      }
    }

    try {
      const result = await this.withTimeout(this.updater.flush());

      // Resolve all item promises
      for (const item of items) {
        item.resolve(result);
      }

      return result;
    } catch (error) {
      return this.handleBatchError(items, error);
    }
  }

  /**
   * Process delete operations
   */
  private async processDeletes(tableName: string, items: QueueItem[]): Promise<BatchResult> {
    const result: BatchResult = createEmptyBatchResult();

    for (const item of items) {
      if (!item.key) {
        item.reject(new Error('Delete operation requires key'));
        result.failureCount++;
        continue;
      }

      try {
        // Build WHERE clause
        const keyEntries = Object.entries(item.key);
        const whereConditions = keyEntries.map(([col]) => `\`${col}\` = ?`).join(' AND ');
        const params = keyEntries.map(([, val]) => val);

        const sqlQuery = `DELETE FROM \`${tableName}\` WHERE ${whereConditions}`;
        const pool = this.db as unknown as { execute: (sql: string, params: unknown[]) => Promise<[{ affectedRows: number }]> };

        await this.withTimeout(
          (async () => {
            // Use raw query for delete
            const { executeRaw } = await import('../connection.js');
            return executeRaw<{ affectedRows: number }>(sqlQuery, params);
          })()
        );

        result.affected++;
        result.successCount++;
        item.resolve(result);
      } catch (error) {
        const itemResult = this.handleItemError(item, error);
        result.failureCount++;
        result.success = false;
        result.errors.push(...itemResult.errors);
      }
    }

    return result;
  }

  /**
   * Handle batch error with retry logic
   */
  private handleBatchError(items: QueueItem[], error: unknown): BatchResult {
    const result: BatchResult = createEmptyBatchResult();
    result.success = false;

    for (const item of items) {
      const itemResult = this.handleItemError(item, error);
      result.failureCount += itemResult.failureCount;
      result.errors.push(...itemResult.errors);
    }

    return result;
  }

  /**
   * Handle individual item error with retry logic
   */
  private handleItemError(item: QueueItem, error: unknown): BatchResult {
    const result: BatchResult = createEmptyBatchResult();
    result.success = false;

    const err = error instanceof Error ? error : new Error(String(error));

    if (item.retryCount < this.config.maxRetries) {
      // Queue for retry
      item.retryCount++;
      const retryTime = Date.now() + this.config.retryDelay * item.retryCount;
      this.retryQueue.set(`${item.id}:${retryTime}`, item);
    } else {
      // Max retries reached
      result.failureCount++;
      result.errors.push({
        operation: item.operation,
        tableName: item.tableName,
        key: item.key,
        message: err.message,
        originalError: err,
        retryAttempts: item.retryCount,
      });
      item.reject(err);
    }

    return result;
  }

  /**
   * Process retry queue
   */
  private async processRetries(): Promise<void> {
    const now = Date.now();
    const toRetry: QueueItem[] = [];

    for (const [key, item] of this.retryQueue) {
      const parts = key.split(':');
      const retryTimeStr = parts[1] ?? '0';
      const retryTime = parseInt(retryTimeStr, 10);

      if (now >= retryTime) {
        toRetry.push(item);
        this.retryQueue.delete(key);
      }
    }

    // Re-insert items into main queue
    for (const item of toRetry) {
      this.insertByPriority(item);
    }
  }

  /**
   * Wrap a promise with timeout
   */
  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.config.flushTimeout}ms`));
      }, this.config.flushTimeout);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Get queue statistics
   */
  getStats(): AsyncFlushQueueStats {
    const byPriority: Record<BatchPriority, number> = {
      [BatchPriority.LOW]: 0,
      [BatchPriority.NORMAL]: 0,
      [BatchPriority.HIGH]: 0,
      [BatchPriority.CRITICAL]: 0,
    };

    for (const item of this.queue) {
      byPriority[item.priority]++;
    }

    const avgProcessingTime =
      this.processingTimes.length > 0
        ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
        : 0;

    return {
      queueSize: this.queue.length,
      processing: this.processing,
      totalProcessed: this.totalProcessed,
      totalFailed: this.totalFailed,
      byPriority,
      avgProcessingTime,
      isAccepting: !this.isShuttingDown && this.queue.length < this.config.maxQueueSize,
      isShuttingDown: this.isShuttingDown,
    };
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0 && this.processing === 0 && this.retryQueue.size === 0;
  }

  /**
   * Wait for queue to become empty
   * @param timeout - Maximum time to wait in milliseconds
   */
  async waitForEmpty(timeout: number = 60000): Promise<boolean> {
    const startTime = Date.now();

    while (!this.isEmpty()) {
      if (Date.now() - startTime > timeout) {
        return false;
      }
      await this.delay(100);
    }

    return true;
  }

  /**
   * Graceful shutdown - flush all remaining items and stop
   * @param timeout - Maximum time to wait for flush
   */
  async shutdown(timeout: number = 30000): Promise<BatchResult> {
    this.isShuttingDown = true;

    // Process remaining items with elevated priority
    const startTime = Date.now();

    while (!this.isEmpty() && Date.now() - startTime < timeout) {
      await this.processQueue();
      await this.delay(50);
    }

    this.stop();

    // Reject any remaining items
    const result: BatchResult = createEmptyBatchResult();

    for (const item of this.queue) {
      item.reject(new Error('Queue shutdown before processing'));
      result.failureCount++;
    }

    for (const item of this.retryQueue.values()) {
      item.reject(new Error('Queue shutdown before retry'));
      result.failureCount++;
    }

    this.queue = [];
    this.retryQueue.clear();
    result.success = result.failureCount === 0;

    return result;
  }

  /**
   * Force flush all items immediately
   * @returns Combined result of all flush operations
   */
  async forceFlush(): Promise<BatchResult> {
    const results: BatchResult[] = [];

    while (this.queue.length > 0 || this.retryQueue.size > 0) {
      // Move all retry items to main queue
      for (const item of this.retryQueue.values()) {
        this.insertByPriority(item);
      }
      this.retryQueue.clear();

      // Process all items
      const batch = this.queue.splice(0, this.config.batchSize);
      if (batch.length === 0) {
        break;
      }

      this.processing++;
      try {
        await this.processBatch(batch);
      } finally {
        this.processing--;
      }
    }

    return mergeBatchResults(results);
  }

  /**
   * Clear all pending items without processing
   */
  clear(): void {
    for (const item of this.queue) {
      item.reject(new Error('Queue cleared'));
    }
    for (const item of this.retryQueue.values()) {
      item.reject(new Error('Queue cleared'));
    }

    this.queue = [];
    this.retryQueue.clear();
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a new AsyncFlushQueue instance
 * @param config - Optional configuration
 * @param db - Optional database instance
 * @returns AsyncFlushQueue instance
 */
export function createAsyncFlushQueue(
  config?: Partial<AsyncFlushQueueConfig>,
  db?: Database
): AsyncFlushQueue {
  return new AsyncFlushQueue(config, db);
}
