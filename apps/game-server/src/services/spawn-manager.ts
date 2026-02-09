/**
 * Spawn Manager
 * Manages NPC/creature spawning, spawn tables, and respawn timers
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import { CreatureObject, generateObjectId } from '@swg/objects';
import type { ZoneService } from './zone-service.js';

/**
 * Spawn location definition
 */
export interface SpawnLocation {
  /** Spawn point ID */
  id: string;
  /** Zone/scene ID */
  sceneId: string;
  /** Spawn position */
  position: Vector3;
  /** Spawn radius for randomization */
  radius: number;
  /** Heading in radians */
  heading?: number;
}

/**
 * Spawn entry in a spawn table
 */
export interface SpawnEntry {
  /** Template CRC or name */
  templateCrc: number;
  /** Template path for reference */
  templatePath?: string;
  /** Spawn weight (for random selection) */
  weight: number;
  /** Minimum level */
  minLevel: number;
  /** Maximum level */
  maxLevel: number;
  /** Display name */
  name?: string;
}

/**
 * Spawn table definition
 */
export interface SpawnTable {
  /** Table ID */
  id: string;
  /** Table name */
  name: string;
  /** Spawn entries */
  entries: SpawnEntry[];
  /** Total weight for random selection */
  totalWeight: number;
}

/**
 * Active spawn point
 */
export interface ActiveSpawn {
  /** Spawn location */
  location: SpawnLocation;
  /** Spawn table to use */
  tableId: string;
  /** Currently spawned object IDs */
  spawnedObjects: Set<bigint>;
  /** Maximum spawn count */
  maxSpawns: number;
  /** Current spawn count */
  currentSpawns: number;
  /** Respawn delay in milliseconds */
  respawnDelay: number;
  /** Pending respawn timers */
  respawnTimers: Map<bigint, ReturnType<typeof setTimeout>>;
  /** Whether this spawn point is active */
  active: boolean;
}

/**
 * Spawn configuration
 */
export interface SpawnConfig {
  /** Spawn location */
  location: SpawnLocation;
  /** Spawn table ID */
  tableId: string;
  /** Maximum concurrent spawns */
  maxSpawns: number;
  /** Respawn delay in milliseconds */
  respawnDelay: number;
}

/**
 * Spawn manager options
 */
export interface SpawnManagerOptions {
  /** Default respawn delay in milliseconds */
  defaultRespawnDelay?: number;
  /** Enable spawn tick processing */
  enableTicking?: boolean;
  /** Tick interval in milliseconds */
  tickInterval?: number;
}

/**
 * Spawn Manager
 * Handles creature/NPC spawning, spawn tables, and respawn logic
 */
export class SpawnManager {
  private readonly zoneService: ZoneService;
  private readonly spawnTables: Map<string, SpawnTable>;
  private readonly activeSpawns: Map<string, ActiveSpawn>;
  private readonly objectToSpawn: Map<bigint, string>;
  private readonly defaultRespawnDelay: number;
  private tickTimer: ReturnType<typeof setInterval> | undefined;
  private initialized: boolean = false;

  constructor(zoneService: ZoneService, options: SpawnManagerOptions = {}) {
    this.zoneService = zoneService;
    this.spawnTables = new Map();
    this.activeSpawns = new Map();
    this.objectToSpawn = new Map();
    this.defaultRespawnDelay = options.defaultRespawnDelay ?? 300000; // 5 minutes
  }

  /**
   * Initialize the spawn manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[SpawnManager] Initializing...');

    // Load default spawn tables
    this.loadDefaultSpawnTables();

    this.initialized = true;
    console.log('[SpawnManager] Initialized');
  }

  /**
   * Shutdown the spawn manager
   */
  async shutdown(): Promise<void> {
    console.log('[SpawnManager] Shutting down...');

    // Stop tick timer
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = undefined;
    }

    // Clear all respawn timers
    for (const spawn of this.activeSpawns.values()) {
      for (const timer of spawn.respawnTimers.values()) {
        clearTimeout(timer);
      }
      spawn.respawnTimers.clear();
    }

    // Despawn all active spawns
    for (const spawn of this.activeSpawns.values()) {
      for (const objectId of spawn.spawnedObjects) {
        await this.zoneService.despawnObject(objectId);
      }
    }

    this.activeSpawns.clear();
    this.objectToSpawn.clear();
    this.initialized = false;

    console.log('[SpawnManager] Shutdown complete');
  }

  // ============================================
  // Spawn Table Management
  // ============================================

  /**
   * Load default spawn tables.
   * Static world objects are now loaded from buildout datatables by ZoneService.
   * Dynamic spawn tables can be registered at runtime via registerSpawnTable().
   */
  private loadDefaultSpawnTables(): void {
    console.log('[SpawnManager] Ready for dynamic spawn table registration');
  }

  /**
   * Register a spawn table
   */
  registerSpawnTable(table: SpawnTable): void {
    // Recalculate total weight
    table.totalWeight = table.entries.reduce((sum, e) => sum + e.weight, 0);
    this.spawnTables.set(table.id, table);
  }

  /**
   * Get a spawn table by ID
   */
  getSpawnTable(tableId: string): SpawnTable | undefined {
    return this.spawnTables.get(tableId);
  }

  /**
   * Select a random entry from a spawn table
   */
  selectFromTable(tableId: string): SpawnEntry | undefined {
    const table = this.spawnTables.get(tableId);
    if (!table || table.entries.length === 0) {
      return undefined;
    }

    // Weighted random selection
    let roll = Math.random() * table.totalWeight;
    for (const entry of table.entries) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry;
      }
    }

    // Fallback to first entry
    return table.entries[0];
  }

  // ============================================
  // Spawn Point Management
  // ============================================

  /**
   * Create and register a spawn point
   */
  createSpawnPoint(config: SpawnConfig): ActiveSpawn {
    const spawnId = `${config.location.sceneId}:${config.location.id}`;

    if (this.activeSpawns.has(spawnId)) {
      throw new Error(`Spawn point already exists: ${spawnId}`);
    }

    const spawn: ActiveSpawn = {
      location: config.location,
      tableId: config.tableId,
      spawnedObjects: new Set(),
      maxSpawns: config.maxSpawns,
      currentSpawns: 0,
      respawnDelay: config.respawnDelay ?? this.defaultRespawnDelay,
      respawnTimers: new Map(),
      active: true,
    };

    this.activeSpawns.set(spawnId, spawn);
    return spawn;
  }

  /**
   * Activate a spawn point
   */
  async activateSpawnPoint(spawnId: string): Promise<void> {
    const spawn = this.activeSpawns.get(spawnId);
    if (!spawn) {
      throw new Error(`Spawn point not found: ${spawnId}`);
    }

    spawn.active = true;

    // Initial spawn to max capacity
    while (spawn.currentSpawns < spawn.maxSpawns) {
      await this.spawnCreature(spawn);
    }

    console.log(
      `[SpawnManager] Activated spawn point ${spawnId} with ${spawn.currentSpawns} creatures`
    );
  }

  /**
   * Deactivate a spawn point
   */
  async deactivateSpawnPoint(spawnId: string): Promise<void> {
    const spawn = this.activeSpawns.get(spawnId);
    if (!spawn) {
      return;
    }

    spawn.active = false;

    // Clear respawn timers
    for (const timer of spawn.respawnTimers.values()) {
      clearTimeout(timer);
    }
    spawn.respawnTimers.clear();

    // Despawn all creatures
    for (const objectId of spawn.spawnedObjects) {
      await this.zoneService.despawnObject(objectId);
      this.objectToSpawn.delete(objectId);
    }
    spawn.spawnedObjects.clear();
    spawn.currentSpawns = 0;

    console.log(`[SpawnManager] Deactivated spawn point ${spawnId}`);
  }

  /**
   * Remove a spawn point
   */
  async removeSpawnPoint(spawnId: string): Promise<void> {
    await this.deactivateSpawnPoint(spawnId);
    this.activeSpawns.delete(spawnId);
  }

  // ============================================
  // Spawning
  // ============================================

  /**
   * Spawn a creature at a spawn point
   */
  private async spawnCreature(spawn: ActiveSpawn): Promise<bigint | null> {
    if (!spawn.active || spawn.currentSpawns >= spawn.maxSpawns) {
      return null;
    }

    // Select creature from table
    const entry = this.selectFromTable(spawn.tableId);
    if (!entry) {
      console.warn(
        `[SpawnManager] No valid entry in spawn table ${spawn.tableId}`
      );
      return null;
    }

    // Generate random position within spawn radius
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * spawn.location.radius;
    const position: Vector3 = {
      x: spawn.location.position.x + Math.cos(angle) * distance,
      y: spawn.location.position.y,
      z: spawn.location.position.z + Math.sin(angle) * distance,
    };

    // Create creature object
    const objectId = generateObjectId();
    const creature = new CreatureObject(objectId, entry.templateCrc);

    // Set level (random within range)
    const level =
      entry.minLevel +
      Math.floor(Math.random() * (entry.maxLevel - entry.minLevel + 1));
    creature.setLevel(level);

    // Set position
    creature.setPosition(position.x, position.y, position.z);
    if (spawn.location.heading !== undefined) {
      creature.setHeading(spawn.location.heading);
    } else {
      creature.setHeading(Math.random() * Math.PI * 2);
    }

    // Activate the creature
    creature.isActive = true;
    creature.sceneId = spawn.location.sceneId;

    try {
      // Spawn in zone
      await this.zoneService.spawnObject(creature, spawn.location.sceneId);

      // Track the spawn
      const spawnId = `${spawn.location.sceneId}:${spawn.location.id}`;
      spawn.spawnedObjects.add(objectId);
      spawn.currentSpawns++;
      this.objectToSpawn.set(objectId, spawnId);

      console.log(
        `[SpawnManager] Spawned ${entry.name ?? 'creature'} (${objectId}) at ${spawn.location.sceneId} (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`
      );

      return objectId;
    } catch (error) {
      console.error(`[SpawnManager] Failed to spawn creature:`, error);
      return null;
    }
  }

  /**
   * Handle creature death
   * Call this when a spawned creature dies
   */
  async onCreatureDeath(objectId: bigint): Promise<void> {
    const spawnId = this.objectToSpawn.get(objectId);
    if (!spawnId) {
      return; // Not a managed spawn
    }

    const spawn = this.activeSpawns.get(spawnId);
    if (!spawn) {
      this.objectToSpawn.delete(objectId);
      return;
    }

    // Remove from tracking
    spawn.spawnedObjects.delete(objectId);
    spawn.currentSpawns--;
    this.objectToSpawn.delete(objectId);

    // Schedule respawn if active
    if (spawn.active) {
      const timer = setTimeout(async () => {
        spawn.respawnTimers.delete(objectId);
        if (spawn.active) {
          await this.spawnCreature(spawn);
        }
      }, spawn.respawnDelay);

      spawn.respawnTimers.set(objectId, timer);
      console.log(
        `[SpawnManager] Creature ${objectId} died, respawn in ${spawn.respawnDelay}ms`
      );
    }
  }

  /**
   * Force respawn at a spawn point
   */
  async forceRespawn(spawnId: string): Promise<void> {
    const spawn = this.activeSpawns.get(spawnId);
    if (!spawn || !spawn.active) {
      return;
    }

    // Clear existing respawn timers
    for (const timer of spawn.respawnTimers.values()) {
      clearTimeout(timer);
    }
    spawn.respawnTimers.clear();

    // Spawn up to max
    while (spawn.currentSpawns < spawn.maxSpawns) {
      await this.spawnCreature(spawn);
    }
  }

  // ============================================
  // Buildout Creature Loading
  // ============================================

  /**
   * Register a single buildout creature as a spawn point
   * Creates a spawn table with one entry and a spawn point at the buildout position
   */
  loadBuildoutCreature(info: {
    templateCrc: number;
    templatePath: string;
    position: Vector3;
    heading: number;
    sceneId: string;
  }): void {
    const spawnId = `buildout_${info.sceneId}_${info.templateCrc}_${info.position.x.toFixed(0)}_${info.position.z.toFixed(0)}_${this.activeSpawns.size}`;

    // Create a single-entry spawn table
    const tableId = `buildout_table_${spawnId}`;
    this.registerSpawnTable({
      id: tableId,
      name: info.templatePath,
      entries: [{
        templateCrc: info.templateCrc,
        templatePath: info.templatePath,
        weight: 1,
        minLevel: 1,
        maxLevel: 1,
        name: info.templatePath.split('/').pop()?.replace('shared_', '').replace('.iff', ''),
      }],
      totalWeight: 1,
    });

    // Create spawn point at buildout position
    this.createSpawnPoint({
      location: {
        id: spawnId,
        sceneId: info.sceneId,
        position: info.position,
        radius: 0,
        heading: info.heading,
      },
      tableId,
      maxSpawns: 1,
      respawnDelay: this.defaultRespawnDelay,
    });
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get spawn statistics
   */
  getStats(): {
    totalSpawnPoints: number;
    activeSpawnPoints: number;
    totalSpawnedCreatures: number;
    pendingRespawns: number;
  } {
    let activeCount = 0;
    let totalCreatures = 0;
    let pendingRespawns = 0;

    for (const spawn of this.activeSpawns.values()) {
      if (spawn.active) {
        activeCount++;
      }
      totalCreatures += spawn.currentSpawns;
      pendingRespawns += spawn.respawnTimers.size;
    }

    return {
      totalSpawnPoints: this.activeSpawns.size,
      activeSpawnPoints: activeCount,
      totalSpawnedCreatures: totalCreatures,
      pendingRespawns,
    };
  }

  /**
   * Get all active spawns
   */
  getActiveSpawns(): ActiveSpawn[] {
    return Array.from(this.activeSpawns.values());
  }
}

/**
 * Create a new SpawnManager instance
 */
export function createSpawnManager(
  zoneService: ZoneService,
  options?: SpawnManagerOptions
): SpawnManager {
  return new SpawnManager(zoneService, options);
}
