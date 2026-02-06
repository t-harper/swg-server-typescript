/**
 * Object Pooling System
 * Provides efficient object reuse to reduce garbage collection pressure
 *
 * @module @swg/shared-types/pooling
 */

// Core types and interfaces
export type {
  Poolable,
  PoolConfig,
  PoolStats,
  PoolFactory,
  PoolEvent,
  PoolEventCallback,
} from './pool-types.js';

export { DEFAULT_POOL_CONFIG, PoolEventType } from './pool-types.js';

// Generic object pool
export { ObjectPool } from './object-pool.js';

// Vector3 pooling
export {
  PoolableVector3,
  Vector3Pool,
  globalVector3Pool,
} from './vector-pool.js';

// Buffer pooling
export type { BufferPoolStats, BufferPoolConfig } from './buffer-pool.js';
export {
  BufferPool,
  BUFFER_SIZES,
  globalBufferPool,
} from './buffer-pool.js';
export type { BufferSize } from './buffer-pool.js';

// Message pooling
export type {
  PoolableMessage,
  MessageFactory,
  MessagePoolStats,
  MessageTypeConfig,
} from './message-pool.js';
export {
  MessagePool,
  BasePoolableMessage,
  globalMessagePool,
} from './message-pool.js';

// Pool manager
export type {
  GlobalPoolStats,
  PoolManagerConfig,
} from './pool-manager.js';
export {
  PoolManager,
  MemoryPressureLevel,
  getPoolManager,
} from './pool-manager.js';
