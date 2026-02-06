/**
 * Vector3 Object Pool
 * Specialized pool for 3D vector objects commonly used in game math
 */

import type { Poolable, PoolConfig, PoolStats } from './pool-types.js';
import { ObjectPool } from './object-pool.js';

/**
 * Poolable Vector3 implementation
 * Mutable vector class optimized for pooling
 */
export class PoolableVector3 implements Poolable {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Set vector components
   */
  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  /**
   * Copy values from another vector
   */
  copy(other: { x: number; y: number; z: number }): this {
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;
    return this;
  }

  /**
   * Add another vector to this one
   */
  add(other: { x: number; y: number; z: number }): this {
    this.x += other.x;
    this.y += other.y;
    this.z += other.z;
    return this;
  }

  /**
   * Subtract another vector from this one
   */
  sub(other: { x: number; y: number; z: number }): this {
    this.x -= other.x;
    this.y -= other.y;
    this.z -= other.z;
    return this;
  }

  /**
   * Multiply by a scalar
   */
  scale(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }

  /**
   * Calculate squared length (avoids sqrt)
   */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  /**
   * Calculate length
   */
  length(): number {
    return Math.sqrt(this.lengthSquared());
  }

  /**
   * Normalize the vector (make unit length)
   */
  normalize(): this {
    const len = this.length();
    if (len > 0) {
      this.scale(1 / len);
    }
    return this;
  }

  /**
   * Calculate dot product with another vector
   */
  dot(other: { x: number; y: number; z: number }): number {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  /**
   * Calculate cross product with another vector (modifies this vector)
   */
  cross(other: { x: number; y: number; z: number }): this {
    const x = this.y * other.z - this.z * other.y;
    const y = this.z * other.x - this.x * other.z;
    const z = this.x * other.y - this.y * other.x;
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  /**
   * Calculate squared distance to another vector
   */
  distanceSquaredTo(other: { x: number; y: number; z: number }): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dz = this.z - other.z;
    return dx * dx + dy * dy + dz * dz;
  }

  /**
   * Calculate distance to another vector
   */
  distanceTo(other: { x: number; y: number; z: number }): number {
    return Math.sqrt(this.distanceSquaredTo(other));
  }

  /**
   * Linear interpolation towards another vector
   */
  lerp(other: { x: number; y: number; z: number }, t: number): this {
    this.x += (other.x - this.x) * t;
    this.y += (other.y - this.y) * t;
    this.z += (other.z - this.z) * t;
    return this;
  }

  /**
   * Reset to zero vector (Poolable interface)
   */
  reset(): void {
    this.x = 0;
    this.y = 0;
    this.z = 0;
  }

  /**
   * Clone this vector (creates new instance, not pooled)
   */
  clone(): PoolableVector3 {
    return new PoolableVector3(this.x, this.y, this.z);
  }

  /**
   * Check equality with another vector
   */
  equals(other: { x: number; y: number; z: number }, epsilon = 1e-6): boolean {
    return (
      Math.abs(this.x - other.x) < epsilon &&
      Math.abs(this.y - other.y) < epsilon &&
      Math.abs(this.z - other.z) < epsilon
    );
  }

  /**
   * Convert to plain object (for serialization)
   */
  toObject(): { x: number; y: number; z: number } {
    return { x: this.x, y: this.y, z: this.z };
  }

  /**
   * String representation
   */
  toString(): string {
    return `Vector3(${this.x.toFixed(3)}, ${this.y.toFixed(3)}, ${this.z.toFixed(3)})`;
  }
}

/**
 * Vector3 Pool - Specialized pool for Vector3 objects
 * Provides convenient methods for acquiring pre-initialized vectors
 */
export class Vector3Pool {
  private readonly pool: ObjectPool<PoolableVector3>;

  /**
   * Create a new Vector3 pool
   * @param config - Optional pool configuration
   */
  constructor(config: Partial<PoolConfig> = {}) {
    this.pool = new ObjectPool<PoolableVector3>(
      'Vector3Pool',
      () => new PoolableVector3(),
      {
        initialSize: 64,
        maxSize: 4096,
        ...config,
      }
    );
  }

  /**
   * Acquire a vector initialized to zero
   */
  acquire(): PoolableVector3 {
    return this.pool.acquire();
  }

  /**
   * Acquire a vector with specified values
   * @param x - X component
   * @param y - Y component
   * @param z - Z component
   */
  create(x: number, y: number, z: number): PoolableVector3 {
    const vec = this.pool.acquire();
    vec.set(x, y, z);
    return vec;
  }

  /**
   * Acquire a vector copied from another vector
   */
  createFrom(other: { x: number; y: number; z: number }): PoolableVector3 {
    const vec = this.pool.acquire();
    vec.copy(other);
    return vec;
  }

  /**
   * Release a vector back to the pool
   * @param vector - Vector to release
   */
  release(vector: PoolableVector3): void {
    this.pool.release(vector);
  }

  /**
   * Release multiple vectors back to the pool
   * @param vectors - Vectors to release
   */
  releaseAll(...vectors: PoolableVector3[]): void {
    for (const vec of vectors) {
      this.pool.release(vec);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    return this.pool.getStats();
  }

  /**
   * Pre-allocate additional vectors
   * @param count - Number of vectors to pre-allocate
   */
  grow(count: number): void {
    this.pool.grow(count);
  }

  /**
   * Shrink the pool
   * @param targetSize - Target pool size
   */
  shrink(targetSize?: number): number {
    return this.pool.shrink(targetSize);
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool.clear();
  }
}

/**
 * Global shared Vector3 pool instance
 * Use for general-purpose vector pooling across the application
 */
export const globalVector3Pool = new Vector3Pool({
  initialSize: 256,
  maxSize: 8192,
});
