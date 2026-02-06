/**
 * @swg/world - Zone Manager
 * Singleton manager for all zones in the game world
 */

import type { Vector3 } from '@swg/shared-types';
import { Zone, type SceneObject } from './zone.js';
import { ZONE_CONFIGS, getZoneConfig, type ZoneConfig } from './zone-config.js';

/**
 * Result of an object transfer between zones.
 */
export interface TransferResult {
  success: boolean;
  error?: string;
  sourceZone?: string;
  targetZone?: string;
}

/**
 * Zone loading status.
 */
export interface ZoneLoadStatus {
  sceneId: string;
  loaded: boolean;
  objectCount: number;
  loadTime?: number;
  error?: string;
}

/**
 * Callback for zone lifecycle events.
 */
export type ZoneEventHandler = (zone: Zone) => void;

/**
 * ZoneManager singleton - manages all zones in the game world.
 *
 * Responsibilities:
 * - Loading and unloading zones
 * - Zone lookup and enumeration
 * - Object transfer between zones
 * - Zone lifecycle events
 *
 * @example
 * ```typescript
 * const manager = ZoneManager.getInstance();
 * await manager.loadZone('tatooine');
 * const zone = manager.getZone('tatooine');
 * ```
 */
export class ZoneManager {
  private static instance: ZoneManager | null = null;

  /** Loaded zones by scene ID */
  private readonly zones: Map<string, Zone>;

  /** Zone loading promises for deduplication */
  private readonly loadingPromises: Map<string, Promise<Zone>>;

  /** Event handlers for zone load */
  private readonly onLoadHandlers: Set<ZoneEventHandler>;

  /** Event handlers for zone unload */
  private readonly onUnloadHandlers: Set<ZoneEventHandler>;

  /**
   * Private constructor - use getInstance() instead.
   */
  private constructor() {
    this.zones = new Map();
    this.loadingPromises = new Map();
    this.onLoadHandlers = new Set();
    this.onUnloadHandlers = new Set();
  }

  /**
   * Gets the singleton instance of ZoneManager.
   */
  static getInstance(): ZoneManager {
    if (!ZoneManager.instance) {
      ZoneManager.instance = new ZoneManager();
    }
    return ZoneManager.instance;
  }

  /**
   * Resets the singleton instance (primarily for testing).
   */
  static resetInstance(): void {
    if (ZoneManager.instance) {
      ZoneManager.instance.unloadAllZones();
      ZoneManager.instance = null;
    }
  }

  /**
   * Loads a zone by scene ID.
   *
   * @param sceneId - The scene identifier (e.g., 'tatooine')
   * @returns Promise resolving to the loaded Zone
   * @throws Error if zone configuration not found
   */
  async loadZone(sceneId: string): Promise<Zone> {
    // Return existing zone if already loaded
    const existing = this.zones.get(sceneId);
    if (existing) {
      return existing;
    }

    // Return existing loading promise if in progress
    const loading = this.loadingPromises.get(sceneId);
    if (loading) {
      return loading;
    }

    // Start loading
    const loadPromise = this.doLoadZone(sceneId);
    this.loadingPromises.set(sceneId, loadPromise);

    try {
      const zone = await loadPromise;
      return zone;
    } finally {
      this.loadingPromises.delete(sceneId);
    }
  }

  /**
   * Internal zone loading implementation.
   */
  private async doLoadZone(sceneId: string): Promise<Zone> {
    const startTime = performance.now();

    const config = getZoneConfig(sceneId);
    if (!config) {
      throw new Error(`Zone configuration not found: ${sceneId}`);
    }

    if (!config.enabled) {
      throw new Error(`Zone is disabled: ${sceneId}`);
    }

    // Create the zone
    const zone = new Zone(config);

    // TODO: Load zone data from database/files
    // - Static objects (buildings, decorations)
    // - Spawn points
    // - Region definitions
    // - No-build zones
    // For now, we just create an empty zone

    // Simulate some async loading time for now
    await this.loadZoneData(zone, config);

    // Store and activate
    this.zones.set(sceneId, zone);
    zone.activate();

    const loadTime = performance.now() - startTime;
    console.log(`Zone ${sceneId} loaded in ${loadTime.toFixed(2)}ms`);

    // Notify handlers
    for (const handler of this.onLoadHandlers) {
      try {
        handler(zone);
      } catch (error) {
        console.error(`Error in zone load handler for ${sceneId}:`, error);
      }
    }

    return zone;
  }

  /**
   * Loads zone data (static objects, regions, etc.).
   * Override this in production to load from database/files.
   */
  protected async loadZoneData(_zone: Zone, _config: ZoneConfig): Promise<void> {
    // Base implementation does nothing
    // Subclasses can override to load actual data
  }

  /**
   * Unloads a zone by scene ID.
   *
   * @param sceneId - The scene identifier
   */
  unloadZone(sceneId: string): void {
    const zone = this.zones.get(sceneId);
    if (!zone) {
      return;
    }

    // Notify handlers before unload
    for (const handler of this.onUnloadHandlers) {
      try {
        handler(zone);
      } catch (error) {
        console.error(`Error in zone unload handler for ${sceneId}:`, error);
      }
    }

    zone.deactivate();
    zone.clear();
    this.zones.delete(sceneId);

    console.log(`Zone ${sceneId} unloaded`);
  }

  /**
   * Unloads all zones.
   */
  unloadAllZones(): void {
    for (const sceneId of this.zones.keys()) {
      this.unloadZone(sceneId);
    }
  }

  /**
   * Gets a zone by scene ID.
   *
   * @param sceneId - The scene identifier
   * @returns The Zone or undefined if not loaded
   */
  getZone(sceneId: string): Zone | undefined {
    return this.zones.get(sceneId);
  }

  /**
   * Gets a zone, throwing if not found.
   *
   * @param sceneId - The scene identifier
   * @returns The Zone
   * @throws Error if zone not loaded
   */
  getZoneOrThrow(sceneId: string): Zone {
    const zone = this.zones.get(sceneId);
    if (!zone) {
      throw new Error(`Zone not loaded: ${sceneId}`);
    }
    return zone;
  }

  /**
   * Checks if a zone is loaded.
   *
   * @param sceneId - The scene identifier
   */
  isZoneLoaded(sceneId: string): boolean {
    return this.zones.has(sceneId);
  }

  /**
   * Gets all loaded zones.
   *
   * @returns Array of all loaded zones
   */
  getAllZones(): Zone[] {
    return Array.from(this.zones.values());
  }

  /**
   * Gets the scene IDs of all loaded zones.
   *
   * @returns Array of scene IDs
   */
  getLoadedZoneIds(): string[] {
    return Array.from(this.zones.keys());
  }

  /**
   * Transfers an object from one zone to another.
   *
   * @param objectId - The object ID to transfer
   * @param fromZoneId - Source zone scene ID
   * @param toZoneId - Target zone scene ID
   * @param position - Target position in the new zone
   * @returns Transfer result
   */
  async transferObject(
    objectId: bigint,
    fromZoneId: string,
    toZoneId: string,
    position: Vector3
  ): Promise<TransferResult> {
    // Get source zone
    const fromZone = this.zones.get(fromZoneId);
    if (!fromZone) {
      return {
        success: false,
        error: `Source zone not loaded: ${fromZoneId}`,
      };
    }

    // Get object from source zone
    const object = fromZone.getObject(objectId);
    if (!object) {
      return {
        success: false,
        error: `Object ${objectId} not found in zone ${fromZoneId}`,
      };
    }

    // Load or get target zone
    let toZone: Zone;
    try {
      toZone = await this.loadZone(toZoneId);
    } catch (error) {
      return {
        success: false,
        error: `Failed to load target zone ${toZoneId}: ${error}`,
      };
    }

    // Validate target position
    if (!toZone.isValidPosition(position.x, position.y)) {
      return {
        success: false,
        error: `Target position (${position.x}, ${position.y}) is out of bounds for zone ${toZoneId}`,
      };
    }

    // Remove from source zone
    fromZone.removeObject(objectId);

    // Update position and add to target zone
    const transferredObject: SceneObject = {
      ...object,
      x: position.x,
      y: position.y,
      z: position.z,
    };

    try {
      toZone.addObject(transferredObject);
    } catch (error) {
      // Rollback - add back to source zone
      fromZone.addObject(object);
      return {
        success: false,
        error: `Failed to add object to target zone: ${error}`,
      };
    }

    return {
      success: true,
      sourceZone: fromZoneId,
      targetZone: toZoneId,
    };
  }

  /**
   * Finds which zone contains an object.
   *
   * @param objectId - The object ID to find
   * @returns The zone containing the object, or undefined
   */
  findObjectZone(objectId: bigint): Zone | undefined {
    for (const zone of this.zones.values()) {
      if (zone.hasObject(objectId)) {
        return zone;
      }
    }
    return undefined;
  }

  /**
   * Registers a handler for zone load events.
   *
   * @param handler - The handler function
   */
  onZoneLoad(handler: ZoneEventHandler): void {
    this.onLoadHandlers.add(handler);
  }

  /**
   * Unregisters a zone load handler.
   *
   * @param handler - The handler function
   */
  offZoneLoad(handler: ZoneEventHandler): void {
    this.onLoadHandlers.delete(handler);
  }

  /**
   * Registers a handler for zone unload events.
   *
   * @param handler - The handler function
   */
  onZoneUnload(handler: ZoneEventHandler): void {
    this.onUnloadHandlers.add(handler);
  }

  /**
   * Unregisters a zone unload handler.
   *
   * @param handler - The handler function
   */
  offZoneUnload(handler: ZoneEventHandler): void {
    this.onUnloadHandlers.delete(handler);
  }

  /**
   * Gets the status of all zones.
   *
   * @returns Array of zone status objects
   */
  getZoneStatus(): ZoneLoadStatus[] {
    const status: ZoneLoadStatus[] = [];

    // Include all configured zones
    for (const [sceneId, _config] of Object.entries(ZONE_CONFIGS)) {
      const zone = this.zones.get(sceneId);
      status.push({
        sceneId,
        loaded: zone !== undefined,
        objectCount: zone?.objectCount ?? 0,
      });
    }

    return status;
  }

  /**
   * Loads multiple zones in parallel.
   *
   * @param sceneIds - Array of scene IDs to load
   * @returns Array of loaded zones
   */
  async loadZones(sceneIds: string[]): Promise<Zone[]> {
    const promises = sceneIds.map((id) => this.loadZone(id));
    return Promise.all(promises);
  }

  /**
   * Gets aggregate statistics across all zones.
   */
  getAggregateStats(): {
    totalZones: number;
    totalObjects: number;
    zoneStats: Array<ReturnType<Zone['getStats']>>;
  } {
    const zoneStats = this.getAllZones().map((zone) => zone.getStats());
    const totalObjects = zoneStats.reduce(
      (sum, stats) => sum + stats.objectCount,
      0
    );

    return {
      totalZones: this.zones.size,
      totalObjects,
      zoneStats,
    };
  }
}
