/**
 * @swg/objects - Delta Change Tracking
 *
 * Deltas are incremental updates sent to clients when object properties change.
 * Instead of resending the entire baseline, only changed properties are sent.
 *
 * Delta Structure:
 * - Object ID (8 bytes)
 * - Type CRC (4 bytes)
 * - Baseline Number (1 byte)
 * - Update Count (4 bytes)
 * - Updates (variable)
 *
 * Each update contains:
 * - Update Type (1 byte): ADD, REMOVE, CHANGE, CLEAR, etc.
 * - Operand Index (2 bytes): Which property changed
 * - Data (variable): The new value
 *
 * For lists/maps, additional data includes:
 * - List Index (2 bytes): Position in list
 * - Key (variable): Map key for map updates
 */

import { BufferWriter } from '@swg/protocol';

/**
 * Delta operation types
 * These define how a property or collection element has changed
 */
export enum DeltaType {
  /** No change */
  None = 0,
  /** Add a new element to a list/map */
  Add = 1,
  /** Remove an element from a list/map */
  Remove = 2,
  /** Change a value (scalar or element) */
  Change = 3,
  /** Clear all elements in a list/map */
  Clear = 4,
  /** Insert at a specific position */
  Insert = 5,
  /** Erase/delete at a specific position */
  Erase = 6,
  /** Set a specific element (used for arrays) */
  Set = 7,
}

/**
 * Interface for a tracked change
 */
export interface TrackedChange {
  /** The property index that changed */
  propertyIndex: number;
  /** The type of change */
  deltaType: DeltaType;
  /** Optional list/map index for collection changes */
  elementIndex?: number;
  /** Optional key for map changes */
  key?: unknown;
  /** The old value (for undo/logging) */
  oldValue?: unknown;
  /** The new value */
  newValue?: unknown;
  /** Timestamp of the change */
  timestamp: number;
}

/**
 * Interface for list/map delta tracking
 */
export interface ListDelta {
  /** The type of change */
  type: DeltaType;
  /** Index in the list (for indexed operations) */
  index?: number;
  /** Key (for map operations) */
  key?: unknown;
  /** Value being added/changed */
  value?: unknown;
}

/**
 * DeltaTracker - Tracks property changes for delta synchronization
 *
 * This class maintains a record of which properties have changed since
 * the last delta was sent to clients. It supports:
 * - Simple property changes
 * - List element additions/removals
 * - Map entry changes
 * - Batch operations (clear all)
 *
 * @example
 * ```typescript
 * const tracker = new DeltaTracker();
 * tracker.trackChange(PropertyIndex.CustomName, DeltaType.Change);
 * tracker.trackListAdd(PropertyIndex.Effects, 0, 'clienteffect/fire.cef');
 *
 * const changes = tracker.getChanges();
 * // Send delta message with changes...
 * tracker.clear();
 * ```
 */
export class DeltaTracker {
  /** Map of property index to change type and details */
  private changes: Map<number, TrackedChange[]>;

  /** Update counter for each tracked property (for baseline sync) */
  private updateCounters: Map<number, number>;

  /** Global update counter for this tracker */
  private globalUpdateCounter: number;

  /** Dirty bit flags for quick checking (up to 64 properties) */
  private dirtyFlags: bigint;

  /** Maximum number of changes to track per property before consolidation */
  private maxChangesPerProperty: number;

  /**
   * Create a new DeltaTracker
   * @param maxChangesPerProperty - Maximum changes to track before consolidation (default 100)
   */
  constructor(maxChangesPerProperty: number = 100) {
    this.changes = new Map();
    this.updateCounters = new Map();
    this.globalUpdateCounter = 0;
    this.dirtyFlags = 0n;
    this.maxChangesPerProperty = maxChangesPerProperty;
  }

  /**
   * Track a property change
   *
   * @param propertyIndex - The index of the property that changed
   * @param deltaType - The type of change
   * @param oldValue - Optional old value (for undo support)
   * @param newValue - Optional new value
   */
  trackChange(
    propertyIndex: number,
    deltaType: DeltaType,
    oldValue?: unknown,
    newValue?: unknown
  ): void {
    if (propertyIndex < 64) {
      this.dirtyFlags |= 1n << BigInt(propertyIndex);
    }

    const change: TrackedChange = {
      propertyIndex,
      deltaType,
      oldValue,
      newValue,
      timestamp: Date.now(),
    };

    let propertyChanges = this.changes.get(propertyIndex);
    if (!propertyChanges) {
      propertyChanges = [];
      this.changes.set(propertyIndex, propertyChanges);
    }

    propertyChanges.push(change);

    // Consolidate if too many changes
    if (propertyChanges.length > this.maxChangesPerProperty) {
      this.consolidateChanges(propertyIndex);
    }

    this.incrementUpdateCounter(propertyIndex);
    this.globalUpdateCounter++;
  }

  /**
   * Track a list element addition
   *
   * @param propertyIndex - The list property index
   * @param index - Position in the list
   * @param value - The value being added
   */
  trackListAdd(propertyIndex: number, index: number, value: unknown): void {
    if (propertyIndex < 64) {
      this.dirtyFlags |= 1n << BigInt(propertyIndex);
    }

    const change: TrackedChange = {
      propertyIndex,
      deltaType: DeltaType.Add,
      elementIndex: index,
      newValue: value,
      timestamp: Date.now(),
    };

    let propertyChanges = this.changes.get(propertyIndex);
    if (!propertyChanges) {
      propertyChanges = [];
      this.changes.set(propertyIndex, propertyChanges);
    }

    propertyChanges.push(change);
    this.incrementUpdateCounter(propertyIndex);
    this.globalUpdateCounter++;
  }

  /**
   * Track a list element removal
   *
   * @param propertyIndex - The list property index
   * @param index - Position in the list
   * @param value - The value being removed
   */
  trackListRemove(propertyIndex: number, index: number, value: unknown): void {
    if (propertyIndex < 64) {
      this.dirtyFlags |= 1n << BigInt(propertyIndex);
    }

    const change: TrackedChange = {
      propertyIndex,
      deltaType: DeltaType.Remove,
      elementIndex: index,
      oldValue: value,
      timestamp: Date.now(),
    };

    let propertyChanges = this.changes.get(propertyIndex);
    if (!propertyChanges) {
      propertyChanges = [];
      this.changes.set(propertyIndex, propertyChanges);
    }

    propertyChanges.push(change);
    this.incrementUpdateCounter(propertyIndex);
    this.globalUpdateCounter++;
  }

  /**
   * Track a list clear operation
   *
   * @param propertyIndex - The list property index
   */
  trackListClear(propertyIndex: number): void {
    if (propertyIndex < 64) {
      this.dirtyFlags |= 1n << BigInt(propertyIndex);
    }

    // Clear previous changes for this property and replace with a single clear
    this.changes.set(propertyIndex, [
      {
        propertyIndex,
        deltaType: DeltaType.Clear,
        timestamp: Date.now(),
      },
    ]);

    this.incrementUpdateCounter(propertyIndex);
    this.globalUpdateCounter++;
  }

  /**
   * Track a map entry change
   *
   * @param propertyIndex - The map property index
   * @param key - The map key
   * @param value - The new value
   * @param isNew - Whether this is a new key or update to existing
   */
  trackMapChange(
    propertyIndex: number,
    key: unknown,
    value: unknown,
    isNew: boolean
  ): void {
    if (propertyIndex < 64) {
      this.dirtyFlags |= 1n << BigInt(propertyIndex);
    }

    const change: TrackedChange = {
      propertyIndex,
      deltaType: isNew ? DeltaType.Add : DeltaType.Change,
      key,
      newValue: value,
      timestamp: Date.now(),
    };

    let propertyChanges = this.changes.get(propertyIndex);
    if (!propertyChanges) {
      propertyChanges = [];
      this.changes.set(propertyIndex, propertyChanges);
    }

    propertyChanges.push(change);
    this.incrementUpdateCounter(propertyIndex);
    this.globalUpdateCounter++;
  }

  /**
   * Track a map entry removal
   *
   * @param propertyIndex - The map property index
   * @param key - The map key being removed
   */
  trackMapRemove(propertyIndex: number, key: unknown): void {
    if (propertyIndex < 64) {
      this.dirtyFlags |= 1n << BigInt(propertyIndex);
    }

    const change: TrackedChange = {
      propertyIndex,
      deltaType: DeltaType.Remove,
      key,
      timestamp: Date.now(),
    };

    let propertyChanges = this.changes.get(propertyIndex);
    if (!propertyChanges) {
      propertyChanges = [];
      this.changes.set(propertyIndex, propertyChanges);
    }

    propertyChanges.push(change);
    this.incrementUpdateCounter(propertyIndex);
    this.globalUpdateCounter++;
  }

  /**
   * Check if a property has been modified
   *
   * @param propertyIndex - The property index to check
   * @returns True if the property has changes
   */
  isPropertyDirty(propertyIndex: number): boolean {
    if (propertyIndex < 64) {
      return (this.dirtyFlags & (1n << BigInt(propertyIndex))) !== 0n;
    }
    return this.changes.has(propertyIndex);
  }

  /**
   * Check if any properties have been modified
   */
  hasChanges(): boolean {
    return this.dirtyFlags !== 0n || this.changes.size > 0;
  }

  /**
   * Get all changes for a specific property
   *
   * @param propertyIndex - The property index
   * @returns Array of changes, or empty array if none
   */
  getPropertyChanges(propertyIndex: number): readonly TrackedChange[] {
    return this.changes.get(propertyIndex) ?? [];
  }

  /**
   * Get all tracked changes
   *
   * @returns Map of property indices to their changes
   */
  getAllChanges(): ReadonlyMap<number, readonly TrackedChange[]> {
    return this.changes as ReadonlyMap<number, readonly TrackedChange[]>;
  }

  /**
   * Get the dirty bit flags
   * Efficient for checking multiple properties at once
   */
  getDirtyFlags(): bigint {
    return this.dirtyFlags;
  }

  /**
   * Get the update counter for a property
   *
   * @param propertyIndex - The property index
   * @returns The current update counter value
   */
  getUpdateCounter(propertyIndex: number): number {
    return this.updateCounters.get(propertyIndex) ?? 0;
  }

  /**
   * Get the global update counter
   */
  getGlobalUpdateCounter(): number {
    return this.globalUpdateCounter;
  }

  /**
   * Clear all tracked changes
   */
  clear(): void {
    this.changes.clear();
    this.dirtyFlags = 0n;
  }

  /**
   * Clear changes for a specific property
   *
   * @param propertyIndex - The property index to clear
   */
  clearProperty(propertyIndex: number): void {
    this.changes.delete(propertyIndex);
    if (propertyIndex < 64) {
      this.dirtyFlags &= ~(1n << BigInt(propertyIndex));
    }
  }

  /**
   * Increment the update counter for a property
   */
  private incrementUpdateCounter(propertyIndex: number): void {
    const current = this.updateCounters.get(propertyIndex) ?? 0;
    this.updateCounters.set(propertyIndex, current + 1);
  }

  /**
   * Consolidate multiple changes into fewer entries
   * This is called when too many changes accumulate for a single property
   */
  private consolidateChanges(propertyIndex: number): void {
    const changes = this.changes.get(propertyIndex);
    if (!changes || changes.length <= 1) return;

    // For simple value changes, keep only the latest
    const lastChange = changes[changes.length - 1];
    if (lastChange && lastChange.deltaType === DeltaType.Change) {
      this.changes.set(propertyIndex, [lastChange]);
    }
    // For lists, we might want to consolidate adds/removes
    // This is a simplified version - production code would be smarter
  }
}

/**
 * Create a delta message for changed properties
 *
 * @param objectId - The object's 64-bit ID
 * @param baselineType - Four-character type code
 * @param baselineNumber - Baseline number (1, 3, 4, 6, 7, 8, or 9)
 * @param changes - Array of changes to include
 * @param serializeValue - Function to serialize values
 * @returns Buffer containing the delta message
 */
export function createDelta(
  objectId: bigint,
  baselineType: string,
  baselineNumber: number,
  changes: TrackedChange[],
  serializeValue: (writer: BufferWriter, change: TrackedChange) => void
): Uint8Array {
  const writer = new BufferWriter(256);

  // Object ID (8 bytes, little-endian)
  writer.writeUInt64LE(objectId);

  // Type CRC (4 bytes) - ASCII characters as 32-bit value
  const typeCrc =
    baselineType.charCodeAt(0) |
    (baselineType.charCodeAt(1) << 8) |
    (baselineType.charCodeAt(2) << 16) |
    (baselineType.charCodeAt(3) << 24);
  writer.writeUInt32LE(typeCrc);

  // Baseline number (1 byte)
  writer.writeUInt8(baselineNumber);

  // Update count (4 bytes) - number of updates in this delta
  writer.writeUInt32LE(changes.length);

  // Write each change
  for (const change of changes) {
    // Update type (1 byte)
    writer.writeUInt8(change.deltaType);

    // Operand index (2 bytes)
    writer.writeUInt16LE(change.propertyIndex);

    // Serialize the value using the provided function
    serializeValue(writer, change);
  }

  return writer.toBuffer();
}

/**
 * Create a simple scalar delta (single value change)
 *
 * @param objectId - The object's 64-bit ID
 * @param baselineType - Four-character type code
 * @param baselineNumber - Baseline number
 * @param propertyIndex - Which property changed
 * @param updateCounter - Update counter for this property
 * @param writeValue - Function to write the value
 * @returns Buffer containing the delta message
 */
export function createScalarDelta(
  objectId: bigint,
  baselineType: string,
  baselineNumber: number,
  propertyIndex: number,
  updateCounter: number,
  writeValue: (writer: BufferWriter) => void
): Uint8Array {
  const writer = new BufferWriter(64);

  // Object ID (8 bytes, little-endian)
  writer.writeUInt64LE(objectId);

  // Type CRC (4 bytes)
  const typeCrc =
    baselineType.charCodeAt(0) |
    (baselineType.charCodeAt(1) << 8) |
    (baselineType.charCodeAt(2) << 16) |
    (baselineType.charCodeAt(3) << 24);
  writer.writeUInt32LE(typeCrc);

  // Baseline number (1 byte)
  writer.writeUInt8(baselineNumber);

  // Update count (4 bytes) - always 1 for scalar
  writer.writeUInt32LE(1);

  // Operand index (2 bytes)
  writer.writeUInt16LE(propertyIndex);

  // Write the value
  writeValue(writer);

  return writer.toBuffer();
}

/**
 * Create a list delta (add/remove/change/clear operations)
 *
 * @param objectId - The object's 64-bit ID
 * @param baselineType - Four-character type code
 * @param baselineNumber - Baseline number
 * @param propertyIndex - Which list property changed
 * @param listSize - Current size of the list
 * @param updateCounter - Update counter for this list
 * @param deltas - Array of list deltas to apply
 * @param writeElement - Function to write list elements
 * @returns Buffer containing the delta message
 */
export function createListDelta(
  objectId: bigint,
  baselineType: string,
  baselineNumber: number,
  propertyIndex: number,
  listSize: number,
  updateCounter: number,
  deltas: ListDelta[],
  writeElement: (writer: BufferWriter, delta: ListDelta) => void
): Uint8Array {
  const writer = new BufferWriter(256);

  // Object ID (8 bytes, little-endian)
  writer.writeUInt64LE(objectId);

  // Type CRC (4 bytes)
  const typeCrc =
    baselineType.charCodeAt(0) |
    (baselineType.charCodeAt(1) << 8) |
    (baselineType.charCodeAt(2) << 16) |
    (baselineType.charCodeAt(3) << 24);
  writer.writeUInt32LE(typeCrc);

  // Baseline number (1 byte)
  writer.writeUInt8(baselineNumber);

  // Update count (4 bytes) - always 1 for list operations
  writer.writeUInt32LE(1);

  // Operand index (2 bytes)
  writer.writeUInt16LE(propertyIndex);

  // List header
  writer.writeUInt32LE(listSize); // Current list size
  writer.writeUInt32LE(updateCounter); // Update counter

  // Number of delta operations
  writer.writeUInt8(deltas.length);

  // Write each delta operation
  for (const delta of deltas) {
    writer.writeUInt8(delta.type);

    if (delta.type !== DeltaType.Clear) {
      writer.writeUInt16LE(delta.index ?? 0);
    }

    if (delta.type === DeltaType.Add || delta.type === DeltaType.Change) {
      writeElement(writer, delta);
    }
  }

  return writer.toBuffer();
}
