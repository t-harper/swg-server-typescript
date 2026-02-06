/**
 * Batch Update Operations
 * Optimized batch update handling using CASE WHEN syntax
 */

import { sql } from 'drizzle-orm';
import type { MySqlTable } from 'drizzle-orm/mysql-core';
import {
  BatchOperation,
  type BatchConfig,
  type BatchResult,
  DEFAULT_BATCH_CONFIG,
  createEmptyBatchResult,
} from './batch-types.js';
import { getDb, executeRaw, type Database } from '../connection.js';

/**
 * Pending update item
 */
interface PendingUpdate<T = Record<string, unknown>> {
  table: MySqlTable;
  tableName: string;
  key: Record<string, unknown>;
  data: T;
  queuedAt: number;
}

/**
 * Coalesced update data (merged updates for same key)
 */
interface CoalescedUpdate {
  key: Record<string, unknown>;
  data: Record<string, unknown>;
  firstQueuedAt: number;
  lastQueuedAt: number;
  updateCount: number;
}

/**
 * BatchUpdater
 * Handles batch update operations using CASE WHEN syntax for efficiency
 */
export class BatchUpdater {
  private pending: PendingUpdate[] = [];
  private config: Pick<BatchConfig, 'updateChunkSize' | 'maxRetries' | 'retryDelay'>;
  private db: Database;

  constructor(
    config: Partial<Pick<BatchConfig, 'updateChunkSize' | 'maxRetries' | 'retryDelay'>> = {},
    db?: Database
  ) {
    this.config = {
      updateChunkSize: config.updateChunkSize ?? DEFAULT_BATCH_CONFIG.updateChunkSize,
      maxRetries: config.maxRetries ?? DEFAULT_BATCH_CONFIG.maxRetries,
      retryDelay: config.retryDelay ?? DEFAULT_BATCH_CONFIG.retryDelay,
    };
    this.db = db ?? getDb();
  }

  /**
   * Add an update operation to the batch
   * @param table - Target table
   * @param tableName - Table name for grouping
   * @param key - Primary key value(s)
   * @param data - Data to update
   */
  addUpdate<T extends Record<string, unknown>>(
    table: MySqlTable,
    tableName: string,
    key: Record<string, unknown>,
    data: T
  ): void {
    this.pending.push({
      table,
      tableName,
      key,
      data,
      queuedAt: Date.now(),
    });
  }

  /**
   * Add multiple update operations at once
   * @param table - Target table
   * @param tableName - Table name for grouping
   * @param updates - Array of key-data pairs
   */
  addUpdates<T extends Record<string, unknown>>(
    table: MySqlTable,
    tableName: string,
    updates: Array<{ key: Record<string, unknown>; data: T }>
  ): void {
    for (const { key, data } of updates) {
      this.addUpdate(table, tableName, key, data);
    }
  }

  /**
   * Get the number of pending updates
   */
  getPendingCount(): number {
    return this.pending.length;
  }

  /**
   * Get pending updates for a specific table
   */
  getPendingForTable(tableName: string): number {
    return this.pending.filter((p) => p.tableName === tableName).length;
  }

  /**
   * Flush all pending updates
   * @param coalesce - Whether to coalesce multiple updates to same row (default: true)
   * @returns Batch result with operation statistics
   */
  async flush(coalesce: boolean = true): Promise<BatchResult> {
    if (this.pending.length === 0) {
      return createEmptyBatchResult();
    }

    const result: BatchResult = createEmptyBatchResult();
    const startTime = Date.now();

    // Group by table
    const byTable = this.groupByTable();

    for (const [tableName, items] of byTable) {
      // Optionally coalesce updates to same row
      const processedItems = coalesce
        ? this.coalesceUpdates(items)
        : items.map((item) => ({
            key: item.key,
            data: item.data,
            firstQueuedAt: item.queuedAt,
            lastQueuedAt: item.queuedAt,
            updateCount: 1,
          }));

      const firstItem = items[0];
      if (!firstItem) continue;
      const tableResult = await this.flushTable(tableName, firstItem.table, processedItems);
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
   * Group pending updates by table name
   */
  private groupByTable(): Map<string, PendingUpdate[]> {
    const byTable = new Map<string, PendingUpdate[]>();

    for (const item of this.pending) {
      const existing = byTable.get(item.tableName) ?? [];
      existing.push(item);
      byTable.set(item.tableName, existing);
    }

    return byTable;
  }

  /**
   * Coalesce multiple updates to the same row into a single update
   * Later updates override earlier ones (last write wins)
   */
  private coalesceUpdates(items: PendingUpdate[]): CoalescedUpdate[] {
    const byKey = new Map<string, CoalescedUpdate>();

    for (const item of items) {
      const keyStr = this.keyToString(item.key);
      const existing = byKey.get(keyStr);

      if (existing) {
        // Merge data - later values override earlier ones
        existing.data = { ...existing.data, ...item.data };
        existing.lastQueuedAt = item.queuedAt;
        existing.updateCount++;
      } else {
        byKey.set(keyStr, {
          key: item.key,
          data: { ...item.data },
          firstQueuedAt: item.queuedAt,
          lastQueuedAt: item.queuedAt,
          updateCount: 1,
        });
      }
    }

    return Array.from(byKey.values());
  }

  /**
   * Convert a key object to a string for comparison
   */
  private keyToString(key: Record<string, unknown>): string {
    const sortedEntries = Object.entries(key).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(sortedEntries);
  }

  /**
   * Flush updates for a specific table using CASE WHEN syntax
   */
  private async flushTable(
    tableName: string,
    table: MySqlTable,
    updates: CoalescedUpdate[]
  ): Promise<BatchResult> {
    const result: BatchResult = createEmptyBatchResult();

    if (updates.length === 0) {
      return result;
    }

    // Split into chunks
    const chunks = this.chunkArray(updates, this.config.updateChunkSize);

    for (const chunk of chunks) {
      const chunkResult = await this.executeUpdateChunk(tableName, table, chunk);
      result.affected += chunkResult.affected;
      result.successCount += chunkResult.successCount;
      result.failureCount += chunkResult.failureCount;
      result.errors.push(...chunkResult.errors);
      result.success = result.success && chunkResult.success;
    }

    return result;
  }

  /**
   * Execute a chunk of updates using CASE WHEN syntax
   * UPDATE table SET
   *   col1 = CASE key_col WHEN val1 THEN new1 WHEN val2 THEN new2 ELSE col1 END,
   *   col2 = CASE key_col WHEN val1 THEN new3 WHEN val2 THEN new4 ELSE col2 END
   * WHERE key_col IN (val1, val2)
   */
  private async executeUpdateChunk(
    tableName: string,
    table: MySqlTable,
    updates: CoalescedUpdate[]
  ): Promise<BatchResult> {
    const result: BatchResult = createEmptyBatchResult();
    let lastError: Error | undefined;

    // Collect all columns being updated and the primary key column(s)
    const columnsToUpdate = new Set<string>();
    const keyColumns = new Set<string>();

    for (const update of updates) {
      for (const col of Object.keys(update.data)) {
        columnsToUpdate.add(col);
      }
      for (const keyCol of Object.keys(update.key)) {
        keyColumns.add(keyCol);
      }
    }

    // For simplicity, assume single-column primary key (most common case)
    // Multi-column PK support would require more complex WHERE clause building
    const keyColumnArray = Array.from(keyColumns);
    const primaryKeyCol = keyColumnArray[0];

    if (!primaryKeyCol || keyColumnArray.length > 1) {
      // Fall back to individual updates for multi-column keys
      return await this.executeIndividualUpdates(tableName, table, updates);
    }

    // Build CASE WHEN SQL
    const setClauses: string[] = [];
    const keyValues: unknown[] = updates.map((u) => u.key[primaryKeyCol]);
    const params: unknown[] = [];

    for (const column of columnsToUpdate) {
      let caseClause = `\`${column}\` = CASE \`${primaryKeyCol}\``;

      for (const update of updates) {
        if (column in update.data) {
          caseClause += ` WHEN ? THEN ?`;
          params.push(update.key[primaryKeyCol], update.data[column]);
        }
      }

      caseClause += ` ELSE \`${column}\` END`;
      setClauses.push(caseClause);
    }

    // Build WHERE IN clause
    const placeholders = keyValues.map(() => '?').join(', ');
    const whereClause = `\`${primaryKeyCol}\` IN (${placeholders})`;
    params.push(...keyValues);

    const sqlQuery = `UPDATE \`${tableName}\` SET ${setClauses.join(', ')} WHERE ${whereClause}`;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const queryResult = await executeRaw<{ affectedRows: number }>(sqlQuery, params);
        const affected = queryResult?.affectedRows ?? updates.length;

        result.affected = affected;
        result.successCount = updates.length;
        result.success = true;
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * (attempt + 1));
        }
      }
    }

    // All retries failed
    result.success = false;
    result.failureCount = updates.length;
    result.errors.push({
      operation: BatchOperation.UPDATE,
      tableName,
      message: lastError?.message ?? 'Update failed',
      originalError: lastError,
      retryAttempts: this.config.maxRetries,
    });

    return result;
  }

  /**
   * Execute individual updates (fallback for complex keys)
   */
  private async executeIndividualUpdates(
    tableName: string,
    table: MySqlTable,
    updates: CoalescedUpdate[]
  ): Promise<BatchResult> {
    const result: BatchResult = createEmptyBatchResult();

    for (const update of updates) {
      try {
        // Build WHERE conditions
        const whereConditions = Object.entries(update.key)
          .map(([col, val]) => `\`${col}\` = ?`)
          .join(' AND ');

        const setClause = Object.keys(update.data)
          .map((col) => `\`${col}\` = ?`)
          .join(', ');

        const params = [
          ...Object.values(update.data),
          ...Object.values(update.key),
        ];

        const sqlQuery = `UPDATE \`${tableName}\` SET ${setClause} WHERE ${whereConditions}`;
        const queryResult = await executeRaw<{ affectedRows: number }>(sqlQuery, params);

        result.affected += queryResult?.affectedRows ?? 1;
        result.successCount++;
      } catch (error) {
        result.success = false;
        result.failureCount++;
        result.errors.push({
          operation: BatchOperation.UPDATE,
          tableName,
          key: update.key,
          message: error instanceof Error ? error.message : String(error),
          originalError: error instanceof Error ? error : undefined,
          retryAttempts: 0,
        });
      }
    }

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
   * Clear all pending updates without executing
   */
  clear(): void {
    this.pending = [];
  }

  /**
   * Flush and return only operations for a specific table
   */
  async flushTable$(tableName: string, coalesce: boolean = true): Promise<BatchResult> {
    const items = this.pending.filter((p) => p.tableName === tableName);
    if (items.length === 0) {
      return createEmptyBatchResult();
    }

    // Remove flushed items from pending
    this.pending = this.pending.filter((p) => p.tableName !== tableName);

    const processedItems = coalesce
      ? this.coalesceUpdates(items)
      : items.map((item) => ({
          key: item.key,
          data: item.data,
          firstQueuedAt: item.queuedAt,
          lastQueuedAt: item.queuedAt,
          updateCount: 1,
        }));

    const firstItem = items[0];
    if (!firstItem) return createEmptyBatchResult();
    return await this.flushTable(tableName, firstItem.table, processedItems);
  }
}

/**
 * Create a new BatchUpdater instance
 * @param config - Optional configuration override
 * @param db - Optional database instance
 * @returns BatchUpdater instance
 */
export function createBatchUpdater(
  config?: Partial<Pick<BatchConfig, 'updateChunkSize' | 'maxRetries' | 'retryDelay'>>,
  db?: Database
): BatchUpdater {
  return new BatchUpdater(config, db);
}

/**
 * Execute a one-off batch update
 * @param table - Target table
 * @param tableName - Table name for error reporting
 * @param updates - Array of key-data pairs
 * @param db - Optional database instance
 * @returns Batch result
 */
export async function batchUpdate<T extends Record<string, unknown>>(
  table: MySqlTable,
  tableName: string,
  updates: Array<{ key: Record<string, unknown>; data: T }>,
  db?: Database
): Promise<BatchResult> {
  const updater = createBatchUpdater({}, db);
  updater.addUpdates(table, tableName, updates);
  return await updater.flush();
}
