/**
 * Batch Database Operations
 * Optimized batch processing for database operations
 */

// Types and constants
export {
  BatchOperation,
  BatchPriority,
  BatchEventType,
  type BatchItem,
  type BatchConfig,
  type BatchResult,
  type BatchError,
  type BatchQueueStats,
  type FlushOptions,
  type BatchEvent,
  type BatchEventListener,
  DEFAULT_BATCH_CONFIG,
  isBatchItem,
  createEmptyBatchResult,
  mergeBatchResults,
} from './batch-types.js';

// Batch Queue
export {
  BatchQueue,
  createBatchQueue,
} from './batch-queue.js';

// Batch Insert
export {
  BatchInserter,
  createBatchInserter,
  batchInsert,
} from './batch-insert.js';

// Batch Update
export {
  BatchUpdater,
  createBatchUpdater,
  batchUpdate,
} from './batch-update.js';

// Dirty Tracker
export {
  DirtyTracker,
  createDirtyTracker,
  type DirtyTrackerConfig,
  type DirtyObjectInfo,
  type DirtyTrackerStats,
} from './dirty-tracker.js';

// Write Coalescer
export {
  WriteCoalescer,
  createWriteCoalescer,
  type WriteCoalescerConfig,
  type CoalescedWriteInfo,
  type WriteCoalescerStats,
  type CoalescerFlushResult,
} from './write-coalescer.js';

// Async Flush Queue
export {
  AsyncFlushQueue,
  createAsyncFlushQueue,
  type AsyncFlushQueueConfig,
  type AsyncFlushQueueStats,
} from './async-flush-queue.js';
