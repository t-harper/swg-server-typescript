/**
 * Batch Operation Types
 * Type definitions for batch database operations
 */

import type { MySqlTable } from 'drizzle-orm/mysql-core';

/**
 * Batch operation types
 */
export enum BatchOperation {
  /** Insert new records */
  INSERT = 'INSERT',
  /** Update existing records */
  UPDATE = 'UPDATE',
  /** Delete existing records */
  DELETE = 'DELETE',
}

/**
 * Priority levels for batch operations
 */
export enum BatchPriority {
  /** Low priority - can wait for periodic flush */
  LOW = 0,
  /** Normal priority - standard processing */
  NORMAL = 1,
  /** High priority - flush sooner */
  HIGH = 2,
  /** Critical priority - flush immediately */
  CRITICAL = 3,
}

/**
 * Represents a single batch operation item
 */
export interface BatchItem<T = Record<string, unknown>> {
  /** Type of operation to perform */
  operation: BatchOperation;
  /** Target table for the operation */
  table: MySqlTable;
  /** Table name as string for grouping */
  tableName: string;
  /** Data to insert or update */
  data: T;
  /** Primary key value(s) for update/delete operations */
  key?: Record<string, unknown> | undefined;
  /** Priority level for this operation */
  priority?: BatchPriority | undefined;
  /** Timestamp when the operation was queued */
  queuedAt: number;
  /** Optional callback when operation completes */
  onComplete?: ((success: boolean, error?: Error) => void) | undefined;
}

/**
 * Configuration for batch operations
 */
export interface BatchConfig {
  /** Maximum number of items before automatic flush (default: 100) */
  maxSize: number;
  /** Interval in milliseconds between periodic flushes (default: 5000) */
  flushInterval: number;
  /** Maximum number of retry attempts for failed operations (default: 3) */
  maxRetries: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay: number;
  /** Maximum chunk size for batch inserts (default: 500) */
  insertChunkSize: number;
  /** Maximum chunk size for batch updates (default: 100) */
  updateChunkSize: number;
  /** Coalesce window in milliseconds for combining writes (default: 100) */
  coalesceWindow: number;
  /** Enable automatic background flushing (default: true) */
  autoFlush: boolean;
}

/**
 * Default batch configuration
 */
export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  maxSize: 100,
  flushInterval: 5000,
  maxRetries: 3,
  retryDelay: 1000,
  insertChunkSize: 500,
  updateChunkSize: 100,
  coalesceWindow: 100,
  autoFlush: true,
};

/**
 * Result of a batch operation
 */
export interface BatchResult {
  /** Whether all operations succeeded */
  success: boolean;
  /** Total number of rows affected */
  affected: number;
  /** Number of successful operations */
  successCount: number;
  /** Number of failed operations */
  failureCount: number;
  /** Errors that occurred during batch processing */
  errors: BatchError[];
  /** Time taken to process the batch in milliseconds */
  processingTime: number;
}

/**
 * Error information for a failed batch operation
 */
export interface BatchError {
  /** The operation that failed */
  operation: BatchOperation;
  /** Table name where the error occurred */
  tableName: string;
  /** Primary key of the affected record */
  key?: Record<string, unknown> | undefined;
  /** Error message */
  message: string;
  /** Original error object */
  originalError?: Error | undefined;
  /** Number of retry attempts made */
  retryAttempts: number;
}

/**
 * Statistics for batch queue monitoring
 */
export interface BatchQueueStats {
  /** Current number of items in the queue */
  queueSize: number;
  /** Number of inserts pending */
  pendingInserts: number;
  /** Number of updates pending */
  pendingUpdates: number;
  /** Number of deletes pending */
  pendingDeletes: number;
  /** Total operations processed */
  totalProcessed: number;
  /** Total errors encountered */
  totalErrors: number;
  /** Average processing time per batch */
  avgProcessingTime: number;
  /** Time since last flush in milliseconds */
  timeSinceLastFlush: number;
}

/**
 * Options for flushing the batch queue
 */
export interface FlushOptions {
  /** Force flush even if below maxSize threshold */
  force?: boolean;
  /** Only flush operations at or above this priority */
  minPriority?: BatchPriority;
  /** Only flush operations for specific tables */
  tables?: string[];
  /** Maximum number of items to flush (default: all) */
  maxItems?: number;
}

/**
 * Event types emitted by batch operations
 */
export enum BatchEventType {
  /** Batch flush started */
  FLUSH_START = 'flush_start',
  /** Batch flush completed */
  FLUSH_COMPLETE = 'flush_complete',
  /** Batch operation failed */
  OPERATION_FAILED = 'operation_failed',
  /** Queue size threshold reached */
  THRESHOLD_REACHED = 'threshold_reached',
  /** Retry attempt started */
  RETRY_START = 'retry_start',
}

/**
 * Event data for batch events
 */
export interface BatchEvent {
  /** Type of event */
  type: BatchEventType;
  /** Timestamp of the event */
  timestamp: number;
  /** Event-specific data */
  data?: Record<string, unknown> | undefined;
}

/**
 * Listener function for batch events
 */
export type BatchEventListener = (event: BatchEvent) => void;

/**
 * Type guard for checking if a value is a BatchItem
 */
export function isBatchItem(value: unknown): value is BatchItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item['operation'] === 'string' &&
    Object.values(BatchOperation).includes(item['operation'] as BatchOperation) &&
    typeof item['tableName'] === 'string' &&
    typeof item['data'] === 'object' &&
    typeof item['queuedAt'] === 'number'
  );
}

/**
 * Create an empty batch result
 */
export function createEmptyBatchResult(): BatchResult {
  return {
    success: true,
    affected: 0,
    successCount: 0,
    failureCount: 0,
    errors: [],
    processingTime: 0,
  };
}

/**
 * Merge multiple batch results into one
 */
export function mergeBatchResults(results: BatchResult[]): BatchResult {
  const merged: BatchResult = {
    success: true,
    affected: 0,
    successCount: 0,
    failureCount: 0,
    errors: [],
    processingTime: 0,
  };

  for (const result of results) {
    merged.success = merged.success && result.success;
    merged.affected += result.affected;
    merged.successCount += result.successCount;
    merged.failureCount += result.failureCount;
    merged.errors.push(...result.errors);
    merged.processingTime += result.processingTime;
  }

  return merged;
}
