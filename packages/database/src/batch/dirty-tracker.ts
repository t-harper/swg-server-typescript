/**
 * Dirty Tracker
 * In-memory tracking of modified objects for efficient persistence
 */

/**
 * Dirty state for a single object
 */
interface DirtyState {
  /** Set of dirty field names */
  fields: Set<string>;
  /** When the object was first marked dirty */
  firstDirtyAt: number;
  /** When the object was last marked dirty */
  lastDirtyAt: number;
  /** Priority level for persistence */
  priority: number;
  /** Custom metadata */
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Configuration for DirtyTracker
 */
export interface DirtyTrackerConfig {
  /** Maximum number of objects to track (default: 100000) */
  maxTrackedObjects: number;
  /** Auto-cleanup interval in milliseconds (default: 60000) */
  cleanupInterval: number;
  /** Maximum age in milliseconds before auto-cleanup (default: 300000 / 5 minutes) */
  maxAge: number;
  /** Enable auto cleanup (default: false) */
  autoCleanup: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_DIRTY_TRACKER_CONFIG: DirtyTrackerConfig = {
  maxTrackedObjects: 100000,
  cleanupInterval: 60000,
  maxAge: 300000,
  autoCleanup: false,
};

/**
 * Information about a dirty object
 */
export interface DirtyObjectInfo {
  objectId: bigint;
  fields: string[];
  firstDirtyAt: number;
  lastDirtyAt: number;
  priority: number;
  age: number;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Dirty Tracker Statistics
 */
export interface DirtyTrackerStats {
  /** Total number of tracked dirty objects */
  totalDirty: number;
  /** Number of objects by priority */
  byPriority: Map<number, number>;
  /** Average dirty age in milliseconds */
  avgDirtyAge: number;
  /** Oldest dirty object age in milliseconds */
  maxDirtyAge: number;
  /** Total number of dirty fields across all objects */
  totalDirtyFields: number;
}

/**
 * DirtyTracker
 * Efficiently tracks which objects have been modified and need persistence
 * Optimized for frequent updates with minimal memory overhead
 */
export class DirtyTracker {
  private dirty: Map<bigint, DirtyState> = new Map();
  private config: DirtyTrackerConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<DirtyTrackerConfig> = {}) {
    this.config = { ...DEFAULT_DIRTY_TRACKER_CONFIG, ...config };

    if (this.config.autoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Mark an object as dirty
   * @param objectId - Object ID to mark
   * @param fields - Optional specific fields that changed
   * @param priority - Priority level (higher = more urgent)
   * @param metadata - Optional custom metadata
   */
  markDirty(
    objectId: bigint,
    fields?: string[],
    priority: number = 0,
    metadata?: Record<string, unknown>
  ): void {
    const now = Date.now();
    const existing = this.dirty.get(objectId);

    if (existing) {
      // Update existing dirty state
      if (fields) {
        for (const field of fields) {
          existing.fields.add(field);
        }
      }
      existing.lastDirtyAt = now;
      existing.priority = Math.max(existing.priority, priority);
      if (metadata) {
        existing.metadata = { ...existing.metadata, ...metadata };
      }
    } else {
      // Check if we're at capacity
      if (this.dirty.size >= this.config.maxTrackedObjects) {
        // Remove oldest low-priority entries
        this.evictOldest();
      }

      // Create new dirty state
      this.dirty.set(objectId, {
        fields: new Set(fields ?? []),
        firstDirtyAt: now,
        lastDirtyAt: now,
        priority,
        metadata,
      });
    }
  }

  /**
   * Mark specific fields as dirty for an object
   * @param objectId - Object ID
   * @param fields - Field names that changed
   */
  markFieldsDirty(objectId: bigint, ...fields: string[]): void {
    this.markDirty(objectId, fields);
  }

  /**
   * Check if an object is dirty
   * @param objectId - Object ID to check
   * @returns True if the object has dirty state
   */
  isDirty(objectId: bigint): boolean {
    return this.dirty.has(objectId);
  }

  /**
   * Check if a specific field is dirty
   * @param objectId - Object ID
   * @param field - Field name to check
   * @returns True if the field is marked dirty
   */
  isFieldDirty(objectId: bigint, field: string): boolean {
    const state = this.dirty.get(objectId);
    if (!state) {
      return false;
    }
    // If no specific fields tracked, assume all are dirty
    return state.fields.size === 0 || state.fields.has(field);
  }

  /**
   * Get dirty fields for an object
   * @param objectId - Object ID
   * @returns Array of dirty field names, or empty array if not dirty
   */
  getDirtyFields(objectId: bigint): string[] {
    const state = this.dirty.get(objectId);
    return state ? Array.from(state.fields) : [];
  }

  /**
   * Get information about a dirty object
   * @param objectId - Object ID
   * @returns Dirty object info or null if not dirty
   */
  getDirtyInfo(objectId: bigint): DirtyObjectInfo | null {
    const state = this.dirty.get(objectId);
    if (!state) {
      return null;
    }

    return {
      objectId,
      fields: Array.from(state.fields),
      firstDirtyAt: state.firstDirtyAt,
      lastDirtyAt: state.lastDirtyAt,
      priority: state.priority,
      age: Date.now() - state.firstDirtyAt,
      metadata: state.metadata,
    };
  }

  /**
   * Get all dirty objects
   * @param minPriority - Optional minimum priority filter
   * @param maxAge - Optional maximum age filter in milliseconds
   * @returns Array of dirty object info
   */
  getDirtyObjects(minPriority?: number, maxAge?: number): DirtyObjectInfo[] {
    const now = Date.now();
    const result: DirtyObjectInfo[] = [];

    for (const [objectId, state] of this.dirty) {
      const age = now - state.firstDirtyAt;

      // Apply filters
      if (minPriority !== undefined && state.priority < minPriority) {
        continue;
      }
      if (maxAge !== undefined && age > maxAge) {
        continue;
      }

      result.push({
        objectId,
        fields: Array.from(state.fields),
        firstDirtyAt: state.firstDirtyAt,
        lastDirtyAt: state.lastDirtyAt,
        priority: state.priority,
        age,
        metadata: state.metadata,
      });
    }

    return result;
  }

  /**
   * Get dirty object IDs only (more efficient than getDirtyObjects)
   * @param minPriority - Optional minimum priority filter
   * @returns Array of dirty object IDs
   */
  getDirtyObjectIds(minPriority?: number): bigint[] {
    if (minPriority === undefined) {
      return Array.from(this.dirty.keys());
    }

    const result: bigint[] = [];
    for (const [objectId, state] of this.dirty) {
      if (state.priority >= minPriority) {
        result.push(objectId);
      }
    }
    return result;
  }

  /**
   * Get dirty objects sorted by priority (highest first)
   * @param limit - Optional limit on number of results
   * @returns Sorted array of dirty object info
   */
  getDirtyObjectsByPriority(limit?: number): DirtyObjectInfo[] {
    const all = this.getDirtyObjects();
    all.sort((a, b) => b.priority - a.priority || a.firstDirtyAt - b.firstDirtyAt);

    if (limit !== undefined && limit > 0) {
      return all.slice(0, limit);
    }
    return all;
  }

  /**
   * Get dirty objects sorted by age (oldest first)
   * @param limit - Optional limit on number of results
   * @returns Sorted array of dirty object info
   */
  getDirtyObjectsByAge(limit?: number): DirtyObjectInfo[] {
    const all = this.getDirtyObjects();
    all.sort((a, b) => b.age - a.age);

    if (limit !== undefined && limit > 0) {
      return all.slice(0, limit);
    }
    return all;
  }

  /**
   * Clear dirty flag for an object
   * @param objectId - Object ID to clear
   * @param fields - Optional specific fields to clear (clears all if not specified)
   * @returns True if the object was dirty
   */
  clearDirty(objectId: bigint, fields?: string[]): boolean {
    const state = this.dirty.get(objectId);
    if (!state) {
      return false;
    }

    if (fields && fields.length > 0) {
      // Clear specific fields
      for (const field of fields) {
        state.fields.delete(field);
      }
      // If no dirty fields remain and we were tracking specific fields, remove entirely
      if (state.fields.size === 0) {
        this.dirty.delete(objectId);
      }
    } else {
      // Clear all
      this.dirty.delete(objectId);
    }

    return true;
  }

  /**
   * Clear dirty flags for multiple objects
   * @param objectIds - Object IDs to clear
   */
  clearDirtyBatch(objectIds: bigint[]): void {
    for (const objectId of objectIds) {
      this.dirty.delete(objectId);
    }
  }

  /**
   * Clear all dirty flags
   */
  clearAll(): void {
    this.dirty.clear();
  }

  /**
   * Get the total number of dirty objects
   */
  getDirtyCount(): number {
    return this.dirty.size;
  }

  /**
   * Get statistics about dirty tracking
   */
  getStats(): DirtyTrackerStats {
    const now = Date.now();
    const byPriority = new Map<number, number>();
    let totalAge = 0;
    let maxAge = 0;
    let totalFields = 0;

    for (const state of this.dirty.values()) {
      const age = now - state.firstDirtyAt;
      totalAge += age;
      maxAge = Math.max(maxAge, age);
      totalFields += state.fields.size || 1; // Count at least 1 if no specific fields

      const count = byPriority.get(state.priority) ?? 0;
      byPriority.set(state.priority, count + 1);
    }

    return {
      totalDirty: this.dirty.size,
      byPriority,
      avgDirtyAge: this.dirty.size > 0 ? totalAge / this.dirty.size : 0,
      maxDirtyAge: maxAge,
      totalDirtyFields: totalFields,
    };
  }

  /**
   * Update priority for a dirty object
   * @param objectId - Object ID
   * @param priority - New priority level
   * @returns True if the object was found and updated
   */
  updatePriority(objectId: bigint, priority: number): boolean {
    const state = this.dirty.get(objectId);
    if (!state) {
      return false;
    }
    state.priority = priority;
    return true;
  }

  /**
   * Evict oldest low-priority entries when at capacity
   */
  private evictOldest(): void {
    // Find lowest priority entries
    let lowestPriority = Infinity;
    for (const state of this.dirty.values()) {
      lowestPriority = Math.min(lowestPriority, state.priority);
    }

    // Collect candidates for eviction (lowest priority)
    const candidates: Array<{ objectId: bigint; age: number }> = [];
    const now = Date.now();

    for (const [objectId, state] of this.dirty) {
      if (state.priority === lowestPriority) {
        candidates.push({
          objectId,
          age: now - state.firstDirtyAt,
        });
      }
    }

    // Sort by age (oldest first) and remove oldest 10%
    candidates.sort((a, b) => b.age - a.age);
    const toRemove = Math.max(1, Math.floor(candidates.length * 0.1));

    for (let i = 0; i < toRemove && i < candidates.length; i++) {
      const candidate = candidates[i];
      if (candidate) {
        this.dirty.delete(candidate.objectId);
      }
    }
  }

  /**
   * Clean up entries older than maxAge
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [objectId, state] of this.dirty) {
      if (now - state.firstDirtyAt > this.config.maxAge) {
        this.dirty.delete(objectId);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Start automatic cleanup
   */
  startAutoCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Shutdown the dirty tracker
   */
  shutdown(): void {
    this.stopAutoCleanup();
    this.dirty.clear();
  }
}

/**
 * Create a new DirtyTracker instance
 * @param config - Optional configuration
 * @returns DirtyTracker instance
 */
export function createDirtyTracker(config?: Partial<DirtyTrackerConfig>): DirtyTracker {
  return new DirtyTracker(config);
}
