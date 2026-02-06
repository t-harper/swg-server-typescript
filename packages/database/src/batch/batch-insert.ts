/**
 * Batch Insert Operations
 * Optimized batch insert handling for database operations
 */

import type { MySqlTable } from 'drizzle-orm/mysql-core';
import {
  BatchOperation,
  type BatchConfig,
  type BatchResult,
  type BatchError,
  DEFAULT_BATCH_CONFIG,
  createEmptyBatchResult,
} from './batch-types.js';
import { getDb, type Database } from '../connection.js';

/**
 * Pending insert item
 */
interface PendingInsert<T = Record<string, unknown>> {
  table: MySqlTable;
  tableName: string;
  data: T;
  queuedAt: number;
}

/**
 * BatchInserter
 * Handles batch insert operations using INSERT ... VALUES (x), (y), (z) syntax
 */
export class BatchInserter {
  private pending: PendingInsert[] = [];
  private config: Pick<BatchConfig, 'insertChunkSize' | 'maxRetries' | 'retryDelay'>;
  private db: Database;

  constructor(
    config: Partial<Pick<BatchConfig, 'insertChunkSize' | 'maxRetries' | 'retryDelay'>> = {},
    db?: Database
  ) {
    this.config = {
      insertChunkSize: config.insertChunkSize ?? DEFAULT_BATCH_CONFIG.insertChunkSize,
      maxRetries: config.maxRetries ?? DEFAULT_BATCH_CONFIG.maxRetries,
      retryDelay: config.retryDelay ?? DEFAULT_BATCH_CONFIG.retryDelay,
    };
    this.db = db ?? getDb();
  }

  /**
   * Add an insert operation to the batch
   * @param table - Target table
   * @param tableName - Table name for grouping
   * @param data - Data to insert
   */
  addInsert<T extends Record<string, unknown>>(
    table: MySqlTable,
    tableName: string,
    data: T
  ): void {
    this.pending.push({
      table,
      tableName,
      data,
      queuedAt: Date.now(),
    });
  }

  /**
   * Add multiple insert operations at once
   * @param table - Target table
   * @param tableName - Table name for grouping
   * @param dataList - Array of data to insert
   */
  addInserts<T extends Record<string, unknown>>(
    table: MySqlTable,
    tableName: string,
    dataList: T[]
  ): void {
    for (const data of dataList) {
      this.addInsert(table, tableName, data);
    }
  }

  /**
   * Get the number of pending inserts
   */
  getPendingCount(): number {
    return this.pending.length;
  }

  /**
   * Get pending inserts for a specific table
   */
  getPendingForTable(tableName: string): number {
    return this.pending.filter((p) => p.tableName === tableName).length;
  }

  /**
   * Flush all pending inserts
   * @returns Batch result with operation statistics
   */
  async flush(): Promise<BatchResult> {
    if (this.pending.length === 0) {
      return createEmptyBatchResult();
    }

    const result: BatchResult = createEmptyBatchResult();
    const startTime = Date.now();

    // Group by table
    const byTable = this.groupByTable();

    for (const [tableName, items] of byTable) {
      const tableResult = await this.flushTable(tableName, items);
      result.affected += tableResult.affected;
      result.successCount += tableResult.successCount;
      result.failureCount += tableResult.failureCount;
      result.errors.push(...tableResult.errors);
      result.success = result.success && tableResult.success;
    }

    // Clear pending after flush
    this.pending = [];

    result.processingTime = Date.now() - startTime;
    return result;
  }

  /**
   * Group pending inserts by table name
   */
  private groupByTable(): Map<string, PendingInsert[]> {
    const byTable = new Map<string, PendingInsert[]>();

    for (const item of this.pending) {
      const existing = byTable.get(item.tableName) ?? [];
      existing.push(item);
      byTable.set(item.tableName, existing);
    }

    return byTable;
  }

  /**
   * Flush inserts for a specific table
   */
  private async flushTable(
    tableName: string,
    items: PendingInsert[]
  ): Promise<BatchResult> {
    const result: BatchResult = createEmptyBatchResult();

    if (items.length === 0) {
      return result;
    }

    const firstItem = items[0];
    if (!firstItem) return result;
    const table = firstItem.table;
    const allData = items.map((item) => item.data);

    // Split into chunks
    const chunks = this.chunkArray(allData, this.config.insertChunkSize);

    for (const chunk of chunks) {
      const chunkResult = await this.executeInsertChunk(table, tableName, chunk);
      result.affected += chunkResult.affected;
      result.successCount += chunkResult.successCount;
      result.failureCount += chunkResult.failureCount;
      result.errors.push(...chunkResult.errors);
      result.success = result.success && chunkResult.success;
    }

    return result;
  }

  /**
   * Execute a single chunk of inserts
   */
  private async executeInsertChunk(
    table: MySqlTable,
    tableName: string,
    data: Record<string, unknown>[]
  ): Promise<BatchResult> {
    const result: BatchResult = createEmptyBatchResult();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Use Drizzle's batch insert
        // INSERT INTO table VALUES (...), (...), (...)
        const insertResult = await this.db.insert(table).values(data);

        // MySQL returns affectedRows in the result
        const affected = (insertResult[0] as { affectedRows?: number })?.affectedRows ?? data.length;

        result.affected = affected;
        result.successCount = data.length;
        result.success = true;
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.maxRetries) {
          // Wait before retry
          await this.delay(this.config.retryDelay * (attempt + 1));
        }
      }
    }

    // All retries failed
    result.success = false;
    result.failureCount = data.length;
    result.errors.push({
      operation: BatchOperation.INSERT,
      tableName,
      message: lastError?.message ?? 'Insert failed',
      originalError: lastError,
      retryAttempts: this.config.maxRetries,
    });

    return result;
  }

  /**
   * Split an array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear all pending inserts without executing
   */
  clear(): void {
    this.pending = [];
  }

  /**
   * Flush and return only operations for a specific table
   */
  async flushTable$(tableName: string): Promise<BatchResult> {
    const items = this.pending.filter((p) => p.tableName === tableName);
    if (items.length === 0) {
      return createEmptyBatchResult();
    }

    // Remove flushed items from pending
    this.pending = this.pending.filter((p) => p.tableName !== tableName);

    return await this.flushTable(tableName, items);
  }
}

/**
 * Create a new BatchInserter instance
 * @param config - Optional configuration override
 * @param db - Optional database instance
 * @returns BatchInserter instance
 */
export function createBatchInserter(
  config?: Partial<Pick<BatchConfig, 'insertChunkSize' | 'maxRetries' | 'retryDelay'>>,
  db?: Database
): BatchInserter {
  return new BatchInserter(config, db);
}

/**
 * Execute a one-off batch insert
 * Useful for inserting multiple records without managing a BatchInserter instance
 * @param table - Target table
 * @param tableName - Table name for error reporting
 * @param data - Array of data to insert
 * @param db - Optional database instance
 * @returns Batch result
 */
export async function batchInsert<T extends Record<string, unknown>>(
  table: MySqlTable,
  tableName: string,
  data: T[],
  db?: Database
): Promise<BatchResult> {
  const inserter = createBatchInserter({}, db);
  inserter.addInserts(table, tableName, data);
  return await inserter.flush();
}
