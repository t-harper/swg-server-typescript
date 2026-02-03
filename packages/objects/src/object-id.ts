/**
 * @swg/objects - Object ID Generation
 * Snowflake-style 64-bit ID generator for game objects
 *
 * ID Structure (64 bits):
 * - Bits 63-22 (42 bits): Timestamp (milliseconds since custom epoch)
 * - Bits 21-12 (10 bits): Worker/Server ID
 * - Bits 11-0  (12 bits): Sequence number
 *
 * This allows:
 * - ~139 years of timestamps from epoch
 * - 1024 unique workers/servers
 * - 4096 IDs per millisecond per worker
 */

import type { ObjectId } from '@swg/shared-types';

/**
 * Custom epoch for SWG object IDs
 * January 1, 2020 00:00:00 UTC
 */
const CUSTOM_EPOCH = 1577836800000n;

/**
 * Bit shifts and masks for ID components
 */
const TIMESTAMP_SHIFT = 22n;
const WORKER_ID_SHIFT = 12n;
const SEQUENCE_MASK = 0xfffn; // 12 bits
const WORKER_ID_MASK = 0x3ffn; // 10 bits
const MAX_WORKER_ID = 1023;
const MAX_SEQUENCE = 4095;

/**
 * Configuration options for the ObjectIdGenerator
 */
export interface ObjectIdGeneratorOptions {
  /** Worker/server identifier (0-1023) */
  workerId: number;
  /** Custom epoch timestamp in milliseconds (optional) */
  customEpoch?: bigint;
}

/**
 * ObjectIdGenerator - Thread-safe snowflake-style ID generator
 *
 * Generates unique 64-bit IDs that are:
 * - Roughly time-ordered (sortable by creation time)
 * - Unique across distributed workers
 * - Compact (fits in a bigint)
 *
 * @example
 * ```typescript
 * const generator = new ObjectIdGenerator({ workerId: 1 });
 * const id = generator.generate();
 * const parsed = generator.parse(id);
 * console.log(parsed.timestamp, parsed.workerId, parsed.sequence);
 * ```
 */
export class ObjectIdGenerator {
  private readonly workerId: bigint;
  private readonly customEpoch: bigint;

  private lastTimestamp: bigint = 0n;
  private sequence: bigint = 0n;

  /**
   * Create a new ObjectIdGenerator
   * @param options - Generator configuration
   * @throws Error if workerId is out of valid range
   */
  constructor(options: ObjectIdGeneratorOptions) {
    if (options.workerId < 0 || options.workerId > MAX_WORKER_ID) {
      throw new Error(
        `Worker ID must be between 0 and ${MAX_WORKER_ID}, got ${options.workerId}`
      );
    }

    this.workerId = BigInt(options.workerId);
    this.customEpoch = options.customEpoch ?? CUSTOM_EPOCH;
  }

  /**
   * Generate a new unique object ID
   *
   * This method is designed to be thread-safe in a single-threaded JavaScript
   * environment. It handles clock drift and sequence overflow by waiting for
   * the next millisecond when necessary.
   *
   * @returns A unique 64-bit object ID
   * @throws Error if sequence overflows within the same millisecond (extremely rare)
   */
  generate(): ObjectId {
    let timestamp = this.getCurrentTimestamp();

    if (timestamp === this.lastTimestamp) {
      // Same millisecond - increment sequence
      this.sequence = (this.sequence + 1n) & SEQUENCE_MASK;

      if (this.sequence === 0n) {
        // Sequence overflow - wait for next millisecond
        timestamp = this.waitNextMillis(this.lastTimestamp);
      }
    } else if (timestamp < this.lastTimestamp) {
      // Clock moved backwards - wait for last timestamp to catch up
      // This can happen due to NTP clock adjustments
      timestamp = this.waitNextMillis(this.lastTimestamp);
      this.sequence = 0n;
    } else {
      // New millisecond - reset sequence
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    // Construct the ID
    const id =
      (timestamp << TIMESTAMP_SHIFT) |
      (this.workerId << WORKER_ID_SHIFT) |
      this.sequence;

    return id;
  }

  /**
   * Parse an object ID into its components
   * @param id - The object ID to parse
   * @returns The parsed ID components
   */
  parse(id: ObjectId): ParsedObjectId {
    const timestamp = (id >> TIMESTAMP_SHIFT) + this.customEpoch;
    const workerId = Number((id >> WORKER_ID_SHIFT) & WORKER_ID_MASK);
    const sequence = Number(id & SEQUENCE_MASK);

    return {
      id,
      timestamp: new Date(Number(timestamp)),
      timestampMs: Number(timestamp),
      workerId,
      sequence,
    };
  }

  /**
   * Create an object ID from timestamp and optional components
   * Useful for creating IDs for historical data or testing
   *
   * @param timestamp - Unix timestamp in milliseconds
   * @param workerId - Optional worker ID (uses generator's worker ID if not specified)
   * @param sequence - Optional sequence number (defaults to 0)
   * @returns The constructed object ID
   */
  fromTimestamp(
    timestamp: number | bigint,
    workerId?: number,
    sequence: number = 0
  ): ObjectId {
    const ts = BigInt(timestamp) - this.customEpoch;
    const wid = BigInt(workerId ?? Number(this.workerId));
    const seq = BigInt(sequence);

    return (ts << TIMESTAMP_SHIFT) | (wid << WORKER_ID_SHIFT) | seq;
  }

  /**
   * Extract the creation timestamp from an object ID
   * @param id - The object ID
   * @returns The creation timestamp as a Date
   */
  getTimestamp(id: ObjectId): Date {
    const timestamp = (id >> TIMESTAMP_SHIFT) + this.customEpoch;
    return new Date(Number(timestamp));
  }

  /**
   * Extract the worker ID from an object ID
   * @param id - The object ID
   * @returns The worker ID
   */
  getWorkerId(id: ObjectId): number {
    return Number((id >> WORKER_ID_SHIFT) & WORKER_ID_MASK);
  }

  /**
   * Get the current worker ID for this generator
   */
  getCurrentWorkerId(): number {
    return Number(this.workerId);
  }

  /**
   * Get the current timestamp relative to the custom epoch
   */
  private getCurrentTimestamp(): bigint {
    return BigInt(Date.now()) - this.customEpoch;
  }

  /**
   * Wait until the next millisecond
   * Spin-waits in a tight loop (appropriate for single-threaded JS)
   */
  private waitNextMillis(lastTimestamp: bigint): bigint {
    let timestamp = this.getCurrentTimestamp();
    while (timestamp <= lastTimestamp) {
      timestamp = this.getCurrentTimestamp();
    }
    return timestamp;
  }
}

/**
 * Parsed components of an object ID
 */
export interface ParsedObjectId {
  /** The original object ID */
  id: ObjectId;
  /** The creation timestamp as a Date */
  timestamp: Date;
  /** The creation timestamp in milliseconds since Unix epoch */
  timestampMs: number;
  /** The worker/server ID that generated this ID */
  workerId: number;
  /** The sequence number within the same millisecond */
  sequence: number;
}

/**
 * Null object ID constant
 * Represents an invalid or unset object reference
 */
export const NULL_OBJECT_ID: ObjectId = 0n;

/**
 * Check if an object ID is null/invalid
 * @param id - The object ID to check
 * @returns True if the ID is null or invalid
 */
export function isNullObjectId(id: ObjectId | null | undefined): boolean {
  return id === null || id === undefined || id === 0n;
}

/**
 * Compare two object IDs for sorting
 * @param a - First object ID
 * @param b - Second object ID
 * @returns Negative if a < b, zero if a === b, positive if a > b
 */
export function compareObjectIds(a: ObjectId, b: ObjectId): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Convert an object ID to a string representation
 * @param id - The object ID
 * @returns String representation of the ID
 */
export function objectIdToString(id: ObjectId): string {
  return id.toString();
}

/**
 * Parse a string into an object ID
 * @param str - String representation of an object ID
 * @returns The parsed object ID
 * @throws Error if the string is not a valid object ID
 */
export function stringToObjectId(str: string): ObjectId {
  try {
    const id = BigInt(str);
    if (id < 0n) {
      throw new Error('Object ID cannot be negative');
    }
    return id;
  } catch (e) {
    throw new Error(`Invalid object ID string: ${str}`);
  }
}

/**
 * Default singleton generator instance
 * Worker ID defaults to 0 for single-server setups
 */
let defaultGenerator: ObjectIdGenerator | null = null;

/**
 * Initialize the default object ID generator
 * Must be called before using generateObjectId()
 *
 * @param workerId - The worker/server ID for this process
 */
export function initializeObjectIdGenerator(workerId: number): void {
  defaultGenerator = new ObjectIdGenerator({ workerId });
}

/**
 * Generate an object ID using the default generator
 * @returns A new unique object ID
 * @throws Error if the generator has not been initialized
 */
export function generateObjectId(): ObjectId {
  if (!defaultGenerator) {
    throw new Error(
      'Object ID generator not initialized. Call initializeObjectIdGenerator() first.'
    );
  }
  return defaultGenerator.generate();
}

/**
 * Get the default object ID generator
 * @returns The default generator or null if not initialized
 */
export function getDefaultGenerator(): ObjectIdGenerator | null {
  return defaultGenerator;
}
