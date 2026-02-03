/**
 * Zone Service
 * Manages zone lifecycle, player transitions, and object spawning
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  Zone,
  ZoneManager,
  type SceneObject as WorldSceneObject,
  getZoneConfig,
  getEnabledZoneIds,
} from '@swg/world';
import { SceneObject } from '@swg/objects';
import { ObjectRepository } from '@swg/database';
import {
  createCmdStartScene,
  serializeCmdStartScene,
  createSceneCreateObjectByCrc,
  serializeSceneCreateObjectByCrc,
  createSceneDestroyObject,
  serializeSceneDestroyObject,
  createSceneEndBaselines,
  serializeSceneEndBaselines,
  createUpdateContainment,
  serializeUpdateContainment,
  createServerTimeMessage,
  serializeServerTimeMessage,
  getTerrainFileName,
} from '@swg/protocol/swg/messages/zone-messages.js';
import type { PlayerObject, GameSession } from '../handlers/movement-handler.js';

/**
 * Zone state for cross-server synchronization
 */
export interface ZoneState {
  sceneId: string;
  playerCount: number;
  objectCount: number;
  lastUpdate: number;
}

/**
 * Player zone state tracking
 */
export interface PlayerZoneState {
  sceneId: string;
  position: Vector3;
  visibleObjects: Set<bigint>;
  loadComplete: boolean;
  lastUpdate: number;
}

/**
 * Zone service options
 */
export interface ZoneServiceOptions {
  /** View distance for object visibility (meters) */
  viewDistance?: number;
  /** Auto-load these zones on startup */
  autoLoadZones?: string[];
  /** Enable auto-save for zone objects */
  enableAutoSave?: boolean;
  /** Auto-save interval in milliseconds */
  autoSaveInterval?: number;
}

/**
 * Callback for sending data to a player
 */
export type SendCallback = (objectId: bigint, data: Uint8Array) => void;

/**
 * Zone Service
 * Central service for managing zones, player transitions, and object lifecycle
 */
export class ZoneService {
  private readonly zoneManager: ZoneManager;
  private readonly objectRepository: ObjectRepository;
  private readonly playerZoneStates: Map<bigint, PlayerZoneState>;
  private readonly viewDistance: number;
  private readonly autoSaveInterval: number;
  private readonly enableAutoSave: boolean;
  private sendCallback?: SendCallback;
  private autoSaveTimer?: ReturnType<typeof setInterval>;
  private initialized: boolean = false;

  constructor(
    objectRepository: ObjectRepository,
    options: ZoneServiceOptions = {}
  ) {
    this.zoneManager = ZoneManager.getInstance();
    this.objectRepository = objectRepository;
    this.playerZoneStates = new Map();
    this.viewDistance = options.viewDistance ?? 192;
    this.autoSaveInterval = options.autoSaveInterval ?? 300000; // 5 minutes
    this.enableAutoSave = options.enableAutoSave ?? true;
  }

  /**
   * Initialize the zone service
   * @param autoLoadZones - Zone IDs to load on startup
   */
  async initialize(autoLoadZones?: string[]): Promise<void> {
    if (this.initialized) {
      console.warn('[ZoneService] Already initialized');
      return;
    }

    console.log('[ZoneService] Initializing...');

    // Load specified zones or default set
    const zonesToLoad = autoLoadZones ?? ['tatooine', 'naboo', 'corellia'];

    for (const sceneId of zonesToLoad) {
      try {
        await this.loadZone(sceneId);
      } catch (error) {
        console.error(`[ZoneService] Failed to load zone ${sceneId}:`, error);
      }
    }

    // Start auto-save timer if enabled
    if (this.enableAutoSave) {
      this.startAutoSave();
    }

    this.initialized = true;
    console.log(`[ZoneService] Initialized with ${zonesToLoad.length} zones`);
  }

  /**
   * Shutdown the zone service
   */
  async shutdown(): Promise<void> {
    console.log('[ZoneService] Shutting down...');

    // Stop auto-save
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }

    // Save all zone objects
    for (const zone of this.zoneManager.getAllZones()) {
      try {
        await this.saveZoneObjects(zone.sceneId);
      } catch (error) {
        console.error(
          `[ZoneService] Failed to save zone ${zone.sceneId}:`,
          error
        );
      }
    }

    // Unload all zones
    this.zoneManager.unloadAllZones();
    this.playerZoneStates.clear();
    this.initialized = false;

    console.log('[ZoneService] Shutdown complete');
  }

  /**
   * Set the callback for sending data to players
   */
  setSendCallback(callback: SendCallback): void {
    this.sendCallback = callback;
  }

  // ============================================
  // Zone Management
  // ============================================

  /**
   * Get a zone by scene ID
   */
  getZone(sceneId: string): Zone | undefined {
    return this.zoneManager.getZone(sceneId);
  }

  /**
   * Load a zone
   */
  async loadZone(sceneId: string): Promise<Zone> {
    const config = getZoneConfig(sceneId);
    if (!config) {
      throw new Error(`Zone configuration not found: ${sceneId}`);
    }

    if (!config.enabled) {
      throw new Error(`Zone is disabled: ${sceneId}`);
    }

    console.log(`[ZoneService] Loading zone: ${sceneId}`);

    // Load the zone via zone manager
    const zone = await this.zoneManager.loadZone(sceneId);

    // Load persistent objects from database
    await this.loadZoneObjects(sceneId);

    console.log(
      `[ZoneService] Zone ${sceneId} loaded with ${zone.objectCount} objects`
    );

    return zone;
  }

  /**
   * Unload a zone
   */
  async unloadZone(sceneId: string): Promise<void> {
    console.log(`[ZoneService] Unloading zone: ${sceneId}`);

    // Save objects before unloading
    await this.saveZoneObjects(sceneId);

    // Remove all players from the zone first
    for (const [playerId, state] of this.playerZoneStates) {
      if (state.sceneId === sceneId) {
        // Send player to a default zone (tatooine) or disconnect
        // For now, just clear their state
        this.playerZoneStates.delete(playerId);
      }
    }

    // Unload the zone
    this.zoneManager.unloadZone(sceneId);

    console.log(`[ZoneService] Zone ${sceneId} unloaded`);
  }

  /**
   * Check if a zone is loaded
   */
  isZoneLoaded(sceneId: string): boolean {
    return this.zoneManager.isZoneLoaded(sceneId);
  }

  /**
   * Get all loaded zones
   */
  getLoadedZones(): Zone[] {
    return this.zoneManager.getAllZones();
  }

  // ============================================
  // Player Zone Transitions
  // ============================================

  /**
   * Enter a zone
   * Handles the full zone entry process for a player
   */
  async enterZone(
    player: PlayerObject,
    sceneId: string,
    position: Vector3
  ): Promise<void> {
    console.log(
      `[ZoneService] Player ${player.objectId} entering zone ${sceneId}`
    );

    // Ensure zone is loaded
    if (!this.isZoneLoaded(sceneId)) {
      await this.loadZone(sceneId);
    }

    const zone = this.getZone(sceneId);
    if (!zone) {
      throw new Error(`Failed to load zone: ${sceneId}`);
    }

    // Validate position
    if (!zone.isValidPosition(position.x, position.y)) {
      const clamped = zone.clampPosition(position.x, position.y);
      position = { x: clamped.x, y: clamped.y, z: position.z };
      console.warn(
        `[ZoneService] Clamped player ${player.objectId} position to zone bounds`
      );
    }

    // Create player zone state
    const playerState: PlayerZoneState = {
      sceneId,
      position,
      visibleObjects: new Set(),
      loadComplete: false,
      lastUpdate: Date.now(),
    };
    this.playerZoneStates.set(player.objectId, playerState);

    // Add player as scene object to zone
    const sceneObject: WorldSceneObject = {
      id: player.objectId,
      x: position.x,
      y: position.y,
      z: position.z,
      active: true,
    };
    zone.addObject(sceneObject);

    // Update player zone info
    player.zoneId = sceneId;
    player.position = position;
    player.gridX = Math.floor(position.x / 64);
    player.gridZ = Math.floor(position.z / 64);

    // Send scene start message to client
    if (this.sendCallback) {
      const terrainFile = getTerrainFileName(sceneId);
      const startScene = createCmdStartScene(
        player.objectId,
        terrainFile,
        position.x,
        position.y,
        position.z
      );
      this.sendCallback(player.objectId, serializeCmdStartScene(startScene));

      // Send server time
      const serverTime = createServerTimeMessage();
      this.sendCallback(
        player.objectId,
        serializeServerTimeMessage(serverTime)
      );
    }

    console.log(
      `[ZoneService] Player ${player.objectId} entered zone ${sceneId} at (${position.x}, ${position.y}, ${position.z})`
    );
  }

  /**
   * Handle client scene ready
   * Called when client signals it's ready to receive scene data
   */
  async onSceneReady(player: PlayerObject): Promise<void> {
    const state = this.playerZoneStates.get(player.objectId);
    if (!state) {
      console.warn(
        `[ZoneService] onSceneReady: No zone state for player ${player.objectId}`
      );
      return;
    }

    const zone = this.getZone(state.sceneId);
    if (!zone) {
      console.warn(
        `[ZoneService] onSceneReady: Zone ${state.sceneId} not loaded`
      );
      return;
    }

    console.log(
      `[ZoneService] Player ${player.objectId} scene ready in ${state.sceneId}`
    );

    // Send nearby objects to player
    await this.updateVisibleObjects(player);

    state.loadComplete = true;
  }

  /**
   * Exit current zone
   */
  async exitZone(player: PlayerObject): Promise<void> {
    const state = this.playerZoneStates.get(player.objectId);
    if (!state) {
      return;
    }

    console.log(
      `[ZoneService] Player ${player.objectId} exiting zone ${state.sceneId}`
    );

    const zone = this.getZone(state.sceneId);
    if (zone) {
      // Remove player from zone spatial index
      zone.removeObject(player.objectId);

      // Notify nearby players that this player is leaving
      this.broadcastObjectDespawn(state.sceneId, player.objectId);
    }

    // Clear visible objects for this player
    state.visibleObjects.clear();
    this.playerZoneStates.delete(player.objectId);
  }

  /**
   * Teleport player to a new location
   * Can be same zone or different zone
   */
  async teleportPlayer(
    player: PlayerObject,
    sceneId: string,
    position: Vector3
  ): Promise<void> {
    const currentState = this.playerZoneStates.get(player.objectId);

    if (currentState && currentState.sceneId !== sceneId) {
      // Cross-zone teleport
      await this.exitZone(player);
      await this.enterZone(player, sceneId, position);
    } else if (currentState) {
      // Same-zone teleport
      const zone = this.getZone(sceneId);
      if (zone) {
        zone.updatePositionVec(player.objectId, position);
        currentState.position = position;
        player.position = position;
        player.gridX = Math.floor(position.x / 64);
        player.gridZ = Math.floor(position.z / 64);

        // Update visible objects
        await this.updateVisibleObjects(player);
      }
    } else {
      // Player not in any zone, just enter
      await this.enterZone(player, sceneId, position);
    }
  }

  /**
   * Get player's current zone state
   */
  getPlayerZoneState(playerId: bigint): PlayerZoneState | undefined {
    return this.playerZoneStates.get(playerId);
  }

  // ============================================
  // Object Spawning
  // ============================================

  /**
   * Spawn an object in a zone
   */
  async spawnObject(object: SceneObject, sceneId: string): Promise<void> {
    const zone = this.getZone(sceneId);
    if (!zone) {
      throw new Error(`Zone not loaded: ${sceneId}`);
    }

    // Add to zone spatial index
    const worldObject: WorldSceneObject = {
      id: object.objectId,
      x: object.position.x,
      y: object.position.y,
      z: object.position.z,
      templateId: object.templateCrc,
      active: object.isActive,
    };
    zone.addObject(worldObject);

    // Update object's scene ID
    object.sceneId = sceneId;

    // Broadcast spawn to nearby players
    this.broadcastObjectSpawn(sceneId, object);

    console.log(
      `[ZoneService] Spawned object ${object.objectId} in ${sceneId}`
    );
  }

  /**
   * Despawn an object from all zones
   */
  async despawnObject(objectId: ObjectId): Promise<void> {
    // Find which zone contains the object
    const zone = this.zoneManager.findObjectZone(objectId);
    if (!zone) {
      console.warn(
        `[ZoneService] Cannot despawn: Object ${objectId} not found in any zone`
      );
      return;
    }

    // Remove from zone
    zone.removeObject(objectId);

    // Broadcast despawn to nearby players
    this.broadcastObjectDespawn(zone.sceneId, objectId);

    console.log(
      `[ZoneService] Despawned object ${objectId} from ${zone.sceneId}`
    );
  }

  /**
   * Update an object's position in the zone
   */
  updateObjectPosition(objectId: bigint, position: Vector3): void {
    const zone = this.zoneManager.findObjectZone(objectId);
    if (zone) {
      zone.updatePositionVec(objectId, position);
    }
  }

  // ============================================
  // Persistence Integration
  // ============================================

  /**
   * Load all persistent objects for a zone
   */
  async loadZoneObjects(sceneId: string): Promise<SceneObject[]> {
    const zone = this.getZone(sceneId);
    if (!zone) {
      console.warn(`[ZoneService] Cannot load objects: Zone ${sceneId} not loaded`);
      return [];
    }

    try {
      const objects = await this.objectRepository.loadByZone(sceneId);

      for (const object of objects) {
        // Add to zone spatial index
        const worldObject: WorldSceneObject = {
          id: object.objectId,
          x: object.position.x,
          y: object.position.y,
          z: object.position.z,
          templateId: object.templateCrc,
          active: object.isActive,
        };
        zone.addObject(worldObject);
      }

      console.log(
        `[ZoneService] Loaded ${objects.length} objects for zone ${sceneId}`
      );
      return objects;
    } catch (error) {
      console.error(
        `[ZoneService] Error loading objects for zone ${sceneId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Save all objects in a zone
   */
  async saveZoneObjects(sceneId: string): Promise<void> {
    const zone = this.getZone(sceneId);
    if (!zone) {
      return;
    }

    try {
      const savedCount = await this.objectRepository.saveDirtyObjects();
      if (savedCount > 0) {
        console.log(
          `[ZoneService] Saved ${savedCount} dirty objects for zone ${sceneId}`
        );
      }
    } catch (error) {
      console.error(
        `[ZoneService] Error saving objects for zone ${sceneId}:`,
        error
      );
    }
  }

  // ============================================
  // Broadcasting
  // ============================================

  /**
   * Broadcast a message to all players in a zone
   */
  broadcastToZone(sceneId: string, message: Uint8Array): void {
    if (!this.sendCallback) {
      return;
    }

    for (const [playerId, state] of this.playerZoneStates) {
      if (state.sceneId === sceneId && state.loadComplete) {
        this.sendCallback(playerId, message);
      }
    }
  }

  /**
   * Broadcast a message to players near a position
   */
  broadcastToNearby(
    sceneId: string,
    position: Vector3,
    radius: number,
    message: Uint8Array,
    excludeId?: bigint
  ): void {
    if (!this.sendCallback) {
      return;
    }

    const zone = this.getZone(sceneId);
    if (!zone) {
      return;
    }

    // Get nearby objects from zone
    const nearbyObjects = zone.getObjectsNear(position.x, position.y, radius);

    for (const obj of nearbyObjects) {
      const state = this.playerZoneStates.get(obj.id);
      if (state && state.loadComplete && obj.id !== excludeId) {
        this.sendCallback(obj.id, message);
      }
    }
  }

  /**
   * Broadcast object spawn to nearby players
   */
  private broadcastObjectSpawn(sceneId: string, object: SceneObject): void {
    if (!this.sendCallback) {
      return;
    }

    const zone = this.getZone(sceneId);
    if (!zone) {
      return;
    }

    const spawnMessage = createSceneCreateObjectByCrc(
      object.objectId,
      object.templateCrc,
      object.position.x,
      object.position.y,
      object.position.z,
      object.orientation.x,
      object.orientation.y,
      object.orientation.z,
      object.orientation.w
    );
    const spawnData = serializeSceneCreateObjectByCrc(spawnMessage);

    const endBaselines = createSceneEndBaselines(object.objectId);
    const endData = serializeSceneEndBaselines(endBaselines);

    // Get nearby players
    const nearbyObjects = zone.getObjectsNear(
      object.position.x,
      object.position.y,
      this.viewDistance
    );

    for (const obj of nearbyObjects) {
      const state = this.playerZoneStates.get(obj.id);
      if (state && state.loadComplete && obj.id !== object.objectId) {
        state.visibleObjects.add(object.objectId);
        this.sendCallback(obj.id, spawnData);
        // TODO: Send baseline messages here
        this.sendCallback(obj.id, endData);
      }
    }
  }

  /**
   * Broadcast object despawn to nearby players
   */
  private broadcastObjectDespawn(sceneId: string, objectId: bigint): void {
    if (!this.sendCallback) {
      return;
    }

    const despawnMessage = createSceneDestroyObject(objectId);
    const despawnData = serializeSceneDestroyObject(despawnMessage);

    for (const [playerId, state] of this.playerZoneStates) {
      if (
        state.sceneId === sceneId &&
        state.visibleObjects.has(objectId) &&
        playerId !== objectId
      ) {
        state.visibleObjects.delete(objectId);
        this.sendCallback(playerId, despawnData);
      }
    }
  }

  /**
   * Update visible objects for a player
   * Sends spawn/despawn messages as needed
   */
  private async updateVisibleObjects(player: PlayerObject): Promise<void> {
    const state = this.playerZoneStates.get(player.objectId);
    if (!state || !this.sendCallback) {
      return;
    }

    const zone = this.getZone(state.sceneId);
    if (!zone) {
      return;
    }

    // Get currently visible objects
    const nearbyObjects = zone.getObjectsNear(
      state.position.x,
      state.position.y,
      this.viewDistance
    );
    const nearbyIds = new Set(nearbyObjects.map((o) => o.id));

    // Find objects that left view
    for (const visibleId of state.visibleObjects) {
      if (!nearbyIds.has(visibleId) && visibleId !== player.objectId) {
        // Object left view, send despawn
        const despawnMessage = createSceneDestroyObject(visibleId);
        this.sendCallback(
          player.objectId,
          serializeSceneDestroyObject(despawnMessage)
        );
        state.visibleObjects.delete(visibleId);
      }
    }

    // Find objects that entered view
    for (const obj of nearbyObjects) {
      if (!state.visibleObjects.has(obj.id) && obj.id !== player.objectId) {
        // Object entered view, send spawn
        const spawnMessage = createSceneCreateObjectByCrc(
          obj.id,
          obj.templateId ?? 0,
          obj.x,
          obj.y,
          obj.z
        );
        this.sendCallback(
          player.objectId,
          serializeSceneCreateObjectByCrc(spawnMessage)
        );

        const endBaselines = createSceneEndBaselines(obj.id);
        this.sendCallback(
          player.objectId,
          serializeSceneEndBaselines(endBaselines)
        );

        state.visibleObjects.add(obj.id);
      }
    }
  }

  // ============================================
  // Auto-Save
  // ============================================

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      return;
    }

    this.autoSaveTimer = setInterval(async () => {
      console.log('[ZoneService] Running auto-save...');
      for (const zone of this.zoneManager.getAllZones()) {
        await this.saveZoneObjects(zone.sceneId);
      }
    }, this.autoSaveInterval);

    console.log(
      `[ZoneService] Auto-save enabled (interval: ${this.autoSaveInterval}ms)`
    );
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get zone statistics
   */
  getZoneStats(): ZoneState[] {
    return this.zoneManager.getAllZones().map((zone) => {
      const playerCount = Array.from(this.playerZoneStates.values()).filter(
        (s) => s.sceneId === zone.sceneId
      ).length;

      return {
        sceneId: zone.sceneId,
        playerCount,
        objectCount: zone.objectCount,
        lastUpdate: Date.now(),
      };
    });
  }

  /**
   * Get aggregate statistics
   */
  getStats(): {
    loadedZones: number;
    totalPlayers: number;
    totalObjects: number;
  } {
    const stats = this.zoneManager.getAggregateStats();
    return {
      loadedZones: stats.totalZones,
      totalPlayers: this.playerZoneStates.size,
      totalObjects: stats.totalObjects,
    };
  }
}

/**
 * Create a new ZoneService instance
 */
export function createZoneService(
  objectRepository: ObjectRepository,
  options?: ZoneServiceOptions
): ZoneService {
  return new ZoneService(objectRepository, options);
}
