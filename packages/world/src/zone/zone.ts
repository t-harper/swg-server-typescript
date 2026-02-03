/**
 * @swg/world - Zone Class
 * Represents a single zone (planet or space region) in the game world
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import { QuadTree, type Spatial } from '../spatial/quad-tree.js';
import {
  BoundingBox,
  fromCenterRadius,
  createBoundingBox,
} from '../spatial/bounding-box.js';
import type { TerrainInfo, ZoneConfig, ZoneProperties } from './zone-config.js';

/**
 * Interface for objects that can exist in a zone.
 * Must have position and ID for spatial indexing.
 */
export interface SceneObject extends Spatial {
  /** Unique object identifier */
  id: bigint;
  /** X coordinate (horizontal position) */
  x: number;
  /** Y coordinate (depth/forward position) - SWG uses Y for horizontal */
  y: number;
  /** Z coordinate (height/vertical position) */
  z: number;
  /** Object template CRC or type identifier */
  templateId?: number;
  /** Whether this object is active/visible */
  active: boolean;
}

/**
 * Message that can be broadcast to objects in a zone.
 */
export interface ZoneMessage {
  /** Message type identifier */
  type: string;
  /** Source object ID (if any) */
  sourceId?: bigint;
  /** Message payload */
  payload: unknown;
  /** Range for broadcast (-1 for zone-wide) */
  range: number;
  /** Center point for ranged broadcasts */
  origin?: { x: number; y: number };
}

/**
 * Callback type for message handlers.
 */
export type MessageHandler = (message: ZoneMessage, objects: SceneObject[]) => void;

/**
 * Represents a single zone in the game world.
 *
 * Zones manage:
 * - Spatial indexing of objects via QuadTree
 * - Object lifecycle (add, remove, update position)
 * - Range queries for nearby objects
 * - Message broadcasting to objects in range
 *
 * @example
 * ```typescript
 * const zone = new Zone(ZONE_CONFIGS.tatooine);
 * zone.addObject({ id: 1n, x: 100, y: 200, z: 0, active: true });
 * const nearby = zone.getObjectsNear(100, 200, 50);
 * ```
 */
export class Zone {
  /** Unique scene identifier */
  readonly sceneId: string;

  /** Human-readable display name */
  readonly displayName: string;

  /** Terrain information */
  readonly terrain: TerrainInfo;

  /** Zone properties (PvP, building, etc.) */
  readonly properties: ZoneProperties;

  /** Spatial index for efficient range queries */
  private readonly spatialIndex: QuadTree<SceneObject>;

  /** All objects in this zone by ID */
  private readonly objects: Map<bigint, SceneObject>;

  /** Message handlers */
  private readonly messageHandlers: Map<string, Set<MessageHandler>>;

  /** Whether the zone is currently active/loaded */
  private _active: boolean = false;

  /**
   * Creates a new Zone from configuration.
   *
   * @param config - Zone configuration
   */
  constructor(config: ZoneConfig) {
    this.sceneId = config.sceneId;
    this.displayName = config.displayName;
    this.terrain = config.terrain;
    this.properties = config.properties;

    this.objects = new Map();
    this.messageHandlers = new Map();

    // Create spatial index with zone bounds
    // Max 10 objects per node, max depth 8 for O(log n) queries
    this.spatialIndex = new QuadTree<SceneObject>(
      this.terrain.bounds,
      10, // maxObjects
      8   // maxDepth
    );
  }

  /**
   * Whether the zone is currently active.
   */
  get active(): boolean {
    return this._active;
  }

  /**
   * Gets the number of objects in this zone.
   */
  get objectCount(): number {
    return this.objects.size;
  }

  /**
   * Gets the zone bounds.
   */
  get bounds(): BoundingBox {
    return this.terrain.bounds;
  }

  /**
   * Activates the zone.
   */
  activate(): void {
    this._active = true;
  }

  /**
   * Deactivates the zone.
   */
  deactivate(): void {
    this._active = false;
  }

  /**
   * Adds an object to the zone.
   *
   * @param object - The object to add
   * @throws Error if object already exists or is out of bounds
   */
  addObject(object: SceneObject): void {
    if (this.objects.has(object.id)) {
      throw new Error(`Object ${object.id} already exists in zone ${this.sceneId}`);
    }

    this.objects.set(object.id, object);
    this.spatialIndex.insert(object);
  }

  /**
   * Removes an object from the zone.
   *
   * @param id - The ID of the object to remove
   * @returns true if the object was found and removed
   */
  removeObject(id: bigint): boolean {
    const object = this.objects.get(id);
    if (!object) {
      return false;
    }

    this.objects.delete(id);
    this.spatialIndex.remove(id);
    return true;
  }

  /**
   * Gets an object by ID.
   *
   * @param id - The object ID
   * @returns The object or undefined if not found
   */
  getObject(id: bigint): SceneObject | undefined {
    return this.objects.get(id);
  }

  /**
   * Checks if an object exists in this zone.
   *
   * @param id - The object ID
   */
  hasObject(id: bigint): boolean {
    return this.objects.has(id);
  }

  /**
   * Updates an object's position in the zone.
   *
   * @param id - The object ID
   * @param x - New X coordinate
   * @param y - New Y coordinate
   * @param z - New Z coordinate (optional)
   * @throws Error if object not found
   */
  updatePosition(id: bigint, x: number, y: number, z?: number): void {
    const object = this.objects.get(id);
    if (!object) {
      throw new Error(`Object ${id} not found in zone ${this.sceneId}`);
    }

    // Update Z if provided (not tracked by QuadTree)
    if (z !== undefined) {
      object.z = z;
    }

    // Update spatial index (handles X/Y)
    this.spatialIndex.update(id, x, y);
  }

  /**
   * Updates an object's position using a Vector3.
   *
   * @param id - The object ID
   * @param position - New position
   */
  updatePositionVec(id: bigint, position: Vector3): void {
    this.updatePosition(id, position.x, position.y, position.z);
  }

  /**
   * Gets all objects within a rectangular range.
   *
   * @param bounds - The bounding box to query
   * @returns Array of objects within the bounds
   */
  getObjectsInRange(bounds: BoundingBox): SceneObject[] {
    return this.spatialIndex.queryRange(bounds);
  }

  /**
   * Gets all objects within a circular radius.
   *
   * @param x - Center X coordinate
   * @param y - Center Y coordinate
   * @param radius - Search radius in meters
   * @returns Array of objects within the radius
   */
  getObjectsNear(x: number, y: number, radius: number): SceneObject[] {
    return this.spatialIndex.queryRadius(x, y, radius);
  }

  /**
   * Gets objects near a specific object.
   *
   * @param id - The object ID to search around
   * @param radius - Search radius in meters
   * @param includeSource - Whether to include the source object
   * @returns Array of nearby objects
   */
  getObjectsNearObject(
    id: bigint,
    radius: number,
    includeSource: boolean = false
  ): SceneObject[] {
    const object = this.objects.get(id);
    if (!object) {
      return [];
    }

    const results = this.spatialIndex.queryRadius(object.x, object.y, radius);

    if (!includeSource) {
      return results.filter((obj) => obj.id !== id);
    }
    return results;
  }

  /**
   * Gets the N nearest objects to a point.
   *
   * @param x - Query point X coordinate
   * @param y - Query point Y coordinate
   * @param count - Maximum number of results
   * @returns Array of nearest objects
   */
  getNearestObjects(x: number, y: number, count: number): SceneObject[] {
    return this.spatialIndex.queryNearest(x, y, count);
  }

  /**
   * Gets all objects in the zone.
   *
   * @returns Array of all objects
   */
  getAllObjects(): SceneObject[] {
    return Array.from(this.objects.values());
  }

  /**
   * Gets all active objects in the zone.
   *
   * @returns Array of active objects
   */
  getActiveObjects(): SceneObject[] {
    return Array.from(this.objects.values()).filter((obj) => obj.active);
  }

  /**
   * Registers a message handler.
   *
   * @param type - Message type to handle
   * @param handler - Handler function
   */
  onMessage(type: string, handler: MessageHandler): void {
    let handlers = this.messageHandlers.get(type);
    if (!handlers) {
      handlers = new Set();
      this.messageHandlers.set(type, handlers);
    }
    handlers.add(handler);
  }

  /**
   * Unregisters a message handler.
   *
   * @param type - Message type
   * @param handler - Handler function to remove
   */
  offMessage(type: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Broadcasts a message to objects in range.
   *
   * @param message - The message to broadcast
   */
  broadcast(message: ZoneMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (!handlers || handlers.size === 0) {
      return;
    }

    let targetObjects: SceneObject[];

    if (message.range < 0 || !message.origin) {
      // Zone-wide broadcast
      targetObjects = this.getAllObjects();
    } else {
      // Ranged broadcast
      targetObjects = this.getObjectsNear(
        message.origin.x,
        message.origin.y,
        message.range
      );
    }

    for (const handler of handlers) {
      handler(message, targetObjects);
    }
  }

  /**
   * Broadcasts a message from a specific object.
   *
   * @param sourceId - The source object ID
   * @param type - Message type
   * @param payload - Message payload
   * @param range - Broadcast range (-1 for zone-wide)
   */
  broadcastFromObject(
    sourceId: bigint,
    type: string,
    payload: unknown,
    range: number = -1
  ): void {
    const source = this.objects.get(sourceId);

    this.broadcast({
      type,
      sourceId,
      payload,
      range,
      origin: source ? { x: source.x, y: source.y } : undefined,
    });
  }

  /**
   * Clears all objects from the zone.
   */
  clear(): void {
    this.objects.clear();
    this.spatialIndex.clear();
  }

  /**
   * Gets statistics about the zone.
   */
  getStats(): {
    sceneId: string;
    objectCount: number;
    active: boolean;
    spatialStats: ReturnType<QuadTree<SceneObject>['getStats']>;
  } {
    return {
      sceneId: this.sceneId,
      objectCount: this.objects.size,
      active: this._active,
      spatialStats: this.spatialIndex.getStats(),
    };
  }

  /**
   * Validates that a position is within zone bounds.
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns true if position is valid
   */
  isValidPosition(x: number, y: number): boolean {
    const bounds = this.terrain.bounds;
    return (
      x >= bounds.minX &&
      x <= bounds.maxX &&
      y >= bounds.minY &&
      y <= bounds.maxY
    );
  }

  /**
   * Clamps a position to zone bounds.
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Clamped position
   */
  clampPosition(x: number, y: number): { x: number; y: number } {
    const bounds = this.terrain.bounds;
    return {
      x: Math.max(bounds.minX, Math.min(x, bounds.maxX)),
      y: Math.max(bounds.minY, Math.min(y, bounds.maxY)),
    };
  }
}
