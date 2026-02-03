/**
 * Resource Manager Service
 * Central service for managing resource spawning, rotation, and distribution in the SWG server
 *
 * This service manages:
 * - Active resource spawns across all planets
 * - Resource rotation (weekly spawn/despawn cycles)
 * - Concentration maps for resource density distribution
 * - Events for spawn/despawn notifications
 * - Persistence integration for saving/loading spawn state
 */

import {
  ResourceInstance,
  ResourceClass,
  Planet,
  ALL_PLANETS,
  PLANET_ADJECTIVES,
  ConcentrationMap,
  generateConcentrationMap,
  createResourceInstance,
  generateResourceName,
  generateRandomAttributes,
  loadSpawnTables,
  loadResourceTree,
  getSpawnConfigForClass,
  getSpawnableResourcesForPlanet,
  selectRandomResourceClass,
  calculateResourceLifespan,
  areSpawnTablesLoaded,
  isResourceTreeLoaded,
  ResourceSpawnConfig,
  PlanetSpawnConfig,
  getAllSpawnConfigs,
  getAllPlanetConfigs,
  getTreeClass,
  resourceInstanceToData,
  dataToResourceInstance,
  ResourceInstanceData,
  ConcentrationMapData,
} from '@swg/game-logic/resources';

/**
 * Resource spawn interface combining instance with concentration map
 */
export interface ResourceSpawn {
  /** The resource instance with attributes */
  resourceInstance: ResourceInstance;
  /** Concentration map for density distribution */
  concentrationMap: ConcentrationMap;
  /** When this resource was spawned */
  spawnedAt: Date;
  /** When this resource will expire */
  expiresAt: Date;
  /** Planet where this resource is spawned */
  planetId: string;
}

/**
 * Serializable resource spawn data for persistence
 */
export interface ResourceSpawnData {
  resourceInstance: ResourceInstanceData;
  concentrationMap: ConcentrationMapData;
  spawnedAt: string;
  expiresAt: string;
  planetId: string;
}

/**
 * History entry for tracking spawn patterns
 */
export interface ResourceSpawnHistoryEntry {
  /** When the resource was spawned */
  spawnedAt: Date;
  /** When the resource was despawned */
  despawnedAt: Date | null;
  /** Average attribute values */
  averageQuality: number;
  /** Planet where it spawned */
  planetId: string;
}

/**
 * Spawn history for a resource class
 */
export interface ResourceSpawnHistory {
  /** Resource class ID */
  classId: string;
  /** History entries */
  entries: ResourceSpawnHistoryEntry[];
  /** Total spawn count */
  totalSpawns: number;
  /** Last spawn time */
  lastSpawnedAt: Date | null;
}

/**
 * Callback for resource spawned events
 */
export type ResourceSpawnedCallback = (spawn: ResourceSpawn) => void;

/**
 * Callback for resource despawned events
 */
export type ResourceDespawnedCallback = (resourceId: bigint, reason: 'expired' | 'manual' | 'rotation') => void;

/**
 * Persistence provider interface for saving/loading spawn state
 */
export interface ResourcePersistenceProvider {
  /** Save all active spawns */
  saveActiveSpawns(spawns: ResourceSpawnData[]): Promise<void>;
  /** Load all active spawns */
  loadActiveSpawns(): Promise<ResourceSpawnData[]>;
  /** Save spawn history */
  saveSpawnHistory(history: Map<string, ResourceSpawnHistory>): Promise<void>;
  /** Load spawn history */
  loadSpawnHistory(): Promise<Map<string, ResourceSpawnHistory>>;
  /** Cache a resource spawn in Redis (optional) */
  cacheResourceSpawn?(resourceId: bigint, spawn: ResourceSpawnData, ttlSeconds: number): Promise<void>;
  /** Get cached resource spawn from Redis (optional) */
  getCachedResourceSpawn?(resourceId: bigint): Promise<ResourceSpawnData | null>;
  /** Invalidate cached resource spawn (optional) */
  invalidateCachedSpawn?(resourceId: bigint): Promise<void>;
}

/**
 * Options for ResourceManager initialization
 */
export interface ResourceManagerOptions {
  /** Persistence provider for saving/loading state */
  persistenceProvider?: ResourcePersistenceProvider;
  /** Enable automatic rotation processing */
  enableAutoRotation?: boolean;
  /** Rotation check interval in milliseconds (default: 1 hour) */
  rotationCheckInterval?: number;
  /** Server ID for multi-server setups */
  serverId?: string;
  /** Minimum resources per planet */
  minResourcesPerPlanet?: number;
  /** Maximum resources per planet */
  maxResourcesPerPlanet?: number;
}

/**
 * ID generator state for resource instances
 */
let nextResourceId = BigInt(Date.now()) << BigInt(20);

/**
 * Generate a unique resource ID
 */
function generateResourceId(): bigint {
  return nextResourceId++;
}

/**
 * Resource Manager
 * Central service for managing resource spawning in the SWG server
 */
export class ResourceManager {
  /** Currently active resource spawns indexed by resource ID */
  private activeResources: Map<bigint, ResourceSpawn> = new Map();

  /** Resources indexed by planet */
  private planetResources: Map<string, Set<bigint>> = new Map();

  /** Spawn history indexed by class ID */
  private spawnHistory: Map<string, ResourceSpawnHistory> = new Map();

  /** Event callbacks for resource spawned */
  private onSpawnedCallbacks: Set<ResourceSpawnedCallback> = new Set();

  /** Event callbacks for resource despawned */
  private onDespawnedCallbacks: Set<ResourceDespawnedCallback> = new Set();

  /** Persistence provider */
  private persistenceProvider?: ResourcePersistenceProvider;

  /** Auto rotation timer */
  private rotationTimer?: ReturnType<typeof setInterval>;

  /** Initialization state */
  private initialized = false;

  /** Configuration options */
  private readonly options: Required<Omit<ResourceManagerOptions, 'persistenceProvider'>> & Pick<ResourceManagerOptions, 'persistenceProvider'>;

  /** Last rotation timestamp */
  private lastRotationTime: Date | null = null;

  constructor(options: ResourceManagerOptions = {}) {
    this.options = {
      persistenceProvider: options.persistenceProvider,
      enableAutoRotation: options.enableAutoRotation ?? true,
      rotationCheckInterval: options.rotationCheckInterval ?? 60 * 60 * 1000, // 1 hour
      serverId: options.serverId ?? 'default',
      minResourcesPerPlanet: options.minResourcesPerPlanet ?? 20,
      maxResourcesPerPlanet: options.maxResourcesPerPlanet ?? 50,
    };

    this.persistenceProvider = options.persistenceProvider;

    // Initialize planet resource sets
    for (const planet of ALL_PLANETS) {
      this.planetResources.set(planet, new Set());
    }
  }

  // ============================================
  // Initialization
  // ============================================

  /**
   * Initialize the resource manager
   * @param dataPath - Path to directory containing spawn data files
   */
  async initialize(dataPath: string): Promise<void> {
    if (this.initialized) {
      console.warn('[ResourceManager] Already initialized');
      return;
    }

    console.log('[ResourceManager] Initializing...');

    // Load spawn tables if not already loaded
    if (!areSpawnTablesLoaded()) {
      try {
        const result = await loadSpawnTables(dataPath, { strict: false });
        console.log(`[ResourceManager] Loaded ${result.configCount} spawn configs, ${result.planetCount} planet configs`);
        if (result.warnings.length > 0) {
          console.warn('[ResourceManager] Spawn table warnings:', result.warnings);
        }
      } catch (error) {
        console.error('[ResourceManager] Failed to load spawn tables:', error);
        // Continue with empty tables
      }
    }

    // Load resource tree if not already loaded
    if (!isResourceTreeLoaded()) {
      try {
        const result = await loadResourceTree(dataPath, { strict: false });
        console.log(`[ResourceManager] Loaded ${result.count} resource classes`);
        if (result.warnings.length > 0) {
          console.warn('[ResourceManager] Resource tree warnings:', result.warnings);
        }
      } catch (error) {
        console.error('[ResourceManager] Failed to load resource tree:', error);
        // Continue with empty tree
      }
    }

    // Load persisted state if provider is available
    if (this.persistenceProvider) {
      try {
        const savedSpawns = await this.persistenceProvider.loadActiveSpawns();
        for (const spawnData of savedSpawns) {
          const spawn = this.deserializeSpawn(spawnData);
          if (spawn && new Date() < spawn.expiresAt) {
            this.activeResources.set(spawn.resourceInstance.resourceId, spawn);
            const planetSet = this.planetResources.get(spawn.planetId);
            if (planetSet) {
              planetSet.add(spawn.resourceInstance.resourceId);
            }
          }
        }
        console.log(`[ResourceManager] Restored ${this.activeResources.size} active resources`);

        const savedHistory = await this.persistenceProvider.loadSpawnHistory();
        this.spawnHistory = savedHistory;
        console.log(`[ResourceManager] Restored spawn history for ${this.spawnHistory.size} classes`);
      } catch (error) {
        console.error('[ResourceManager] Failed to load persisted state:', error);
      }
    }

    // Start auto rotation if enabled
    if (this.options.enableAutoRotation) {
      this.startAutoRotation();
    }

    this.initialized = true;
    console.log('[ResourceManager] Initialized');
  }

  /**
   * Shutdown the resource manager
   */
  async shutdown(): Promise<void> {
    console.log('[ResourceManager] Shutting down...');

    // Stop auto rotation
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = undefined;
    }

    // Persist state
    if (this.persistenceProvider) {
      try {
        const spawns = Array.from(this.activeResources.values()).map((s) => this.serializeSpawn(s));
        await this.persistenceProvider.saveActiveSpawns(spawns);
        await this.persistenceProvider.saveSpawnHistory(this.spawnHistory);
        console.log('[ResourceManager] State persisted');
      } catch (error) {
        console.error('[ResourceManager] Failed to persist state:', error);
      }
    }

    this.activeResources.clear();
    for (const set of this.planetResources.values()) {
      set.clear();
    }
    this.onSpawnedCallbacks.clear();
    this.onDespawnedCallbacks.clear();

    this.initialized = false;
    console.log('[ResourceManager] Shutdown complete');
  }

  // ============================================
  // Tick Processing
  // ============================================

  /**
   * Process resource manager tick
   * @param deltaTime - Time since last tick in milliseconds
   */
  tick(deltaTime: number): void {
    if (!this.initialized) {
      return;
    }

    const now = new Date();

    // Check for expired resources
    const expiredResources: bigint[] = [];
    for (const [resourceId, spawn] of this.activeResources) {
      if (now >= spawn.expiresAt) {
        expiredResources.push(resourceId);
      }
    }

    // Despawn expired resources
    for (const resourceId of expiredResources) {
      this.despawnResource(resourceId, 'expired');
    }
  }

  // ============================================
  // Spawning
  // ============================================

  /**
   * Spawn a new resource
   * @param classId - Resource class ID
   * @param planetId - Planet to spawn on
   * @param options - Optional spawn options
   * @returns The spawned resource or null if spawning failed
   */
  spawnResource(
    classId: string,
    planetId: string,
    options: Partial<{
      lifespanDays: number;
      seed: number;
      resourceName: string;
    }> = {}
  ): ResourceSpawn | null {
    // Get spawn configuration
    const spawnConfig = getSpawnConfigForClass(classId);
    const treeClass = getTreeClass(classId);

    if (!spawnConfig && !treeClass) {
      console.warn(`[ResourceManager] Unknown resource class: ${classId}`);
      return null;
    }

    // Validate planet
    if (!this.planetResources.has(planetId)) {
      console.warn(`[ResourceManager] Unknown planet: ${planetId}`);
      return null;
    }

    // Calculate lifespan
    const lifespanDays = options.lifespanDays ?? calculateResourceLifespan(classId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + lifespanDays * 24 * 60 * 60 * 1000);

    // Generate resource ID
    const resourceId = generateResourceId();

    // Create a minimal resource class for the instance
    const resourceClass: ResourceClass = {
      classId,
      className: treeClass?.displayName ?? classId,
      parentClass: treeClass?.parentClassId ?? null,
      resourceType: 'mineral' as any, // Will be determined by tree class
      resourceCategory: treeClass?.category === 'organic' ? 'organic' : 'inorganic' as any,
      applicableAttributes: (treeClass?.attributes ?? []).map((a) => a.name) as any[],
      minAttributeValues: new Map(
        (treeClass?.attributes ?? []).map((a) => [a.name as any, a.minValue])
      ),
      maxAttributeValues: new Map(
        (treeClass?.attributes ?? []).map((a) => [a.name as any, a.maxValue])
      ),
      planetRestrictions: [],
      isSpawnable: true,
    };

    // Generate resource name
    const resourceName = options.resourceName ?? generateResourceName(
      resourceClass,
      planetId as Planet,
      options.seed
    );

    // Create resource instance
    const resourceInstance = createResourceInstance(
      resourceId,
      resourceClass,
      planetId as Planet,
      {
        resourceName,
        spawnedAt: now,
        expiresAt,
        isActive: true,
        serverId: this.options.serverId,
        seed: options.seed,
      }
    );

    // Generate concentration map
    const concentrationMap = generateConcentrationMap(
      planetId,
      resourceId.toString(),
      {
        seed: options.seed ?? Math.floor(Math.random() * 0xffffffff),
      }
    );

    // Create spawn object
    const spawn: ResourceSpawn = {
      resourceInstance,
      concentrationMap,
      spawnedAt: now,
      expiresAt,
      planetId,
    };

    // Store in active resources
    this.activeResources.set(resourceId, spawn);
    const planetSet = this.planetResources.get(planetId);
    if (planetSet) {
      planetSet.add(resourceId);
    }

    // Update spawn history
    this.recordSpawnHistory(classId, spawn);

    // Cache if provider supports it
    if (this.persistenceProvider?.cacheResourceSpawn) {
      const ttl = Math.ceil((expiresAt.getTime() - now.getTime()) / 1000);
      this.persistenceProvider.cacheResourceSpawn(resourceId, this.serializeSpawn(spawn), ttl).catch((err) => {
        console.error('[ResourceManager] Failed to cache spawn:', err);
      });
    }

    // Fire event
    for (const callback of this.onSpawnedCallbacks) {
      try {
        callback(spawn);
      } catch (err) {
        console.error('[ResourceManager] Spawn callback error:', err);
      }
    }

    console.log(
      `[ResourceManager] Spawned ${resourceName} (${classId}) on ${planetId}, ` +
      `expires in ${lifespanDays.toFixed(1)} days`
    );

    return spawn;
  }

  /**
   * Despawn a resource
   * @param resourceId - Resource ID to despawn
   * @param reason - Reason for despawning
   * @returns True if resource was despawned
   */
  despawnResource(resourceId: bigint, reason: 'expired' | 'manual' | 'rotation' = 'manual'): boolean {
    const spawn = this.activeResources.get(resourceId);
    if (!spawn) {
      return false;
    }

    // Remove from active resources
    this.activeResources.delete(resourceId);
    const planetSet = this.planetResources.get(spawn.planetId);
    if (planetSet) {
      planetSet.delete(resourceId);
    }

    // Update spawn history
    const classId = spawn.resourceInstance.resourceClass.classId;
    const history = this.spawnHistory.get(classId);
    if (history && history.entries.length > 0) {
      const lastEntry = history.entries[history.entries.length - 1];
      if (lastEntry.despawnedAt === null) {
        lastEntry.despawnedAt = new Date();
      }
    }

    // Invalidate cache if provider supports it
    if (this.persistenceProvider?.invalidateCachedSpawn) {
      this.persistenceProvider.invalidateCachedSpawn(resourceId).catch((err) => {
        console.error('[ResourceManager] Failed to invalidate cache:', err);
      });
    }

    // Fire event
    for (const callback of this.onDespawnedCallbacks) {
      try {
        callback(resourceId, reason);
      } catch (err) {
        console.error('[ResourceManager] Despawn callback error:', err);
      }
    }

    console.log(
      `[ResourceManager] Despawned ${spawn.resourceInstance.resourceName} (${resourceId}) - ${reason}`
    );

    return true;
  }

  // ============================================
  // Resource Queries
  // ============================================

  /**
   * Get active resources for a planet
   * @param planetId - Planet ID
   * @returns Array of active resource spawns
   */
  getActiveResourcesForPlanet(planetId: string): ResourceSpawn[] {
    const resourceIds = this.planetResources.get(planetId);
    if (!resourceIds) {
      return [];
    }

    const resources: ResourceSpawn[] = [];
    for (const resourceId of resourceIds) {
      const spawn = this.activeResources.get(resourceId);
      if (spawn) {
        resources.push(spawn);
      }
    }

    return resources;
  }

  /**
   * Get a specific resource by ID
   * @param resourceId - Resource ID
   * @returns Resource spawn or undefined
   */
  getResourceById(resourceId: bigint): ResourceSpawn | undefined {
    return this.activeResources.get(resourceId);
  }

  /**
   * Get concentration at a specific position
   * @param resourceId - Resource ID
   * @param x - World X coordinate
   * @param z - World Z coordinate
   * @returns Concentration value (0-100) or null if resource not found
   */
  getConcentrationAt(resourceId: bigint, x: number, z: number): number | null {
    const spawn = this.activeResources.get(resourceId);
    if (!spawn) {
      return null;
    }

    return spawn.concentrationMap.getConcentration(x, z);
  }

  /**
   * Get interpolated concentration at a specific position (smoother)
   * @param resourceId - Resource ID
   * @param x - World X coordinate
   * @param z - World Z coordinate
   * @returns Interpolated concentration value (0-100) or null if resource not found
   */
  getInterpolatedConcentrationAt(resourceId: bigint, x: number, z: number): number | null {
    const spawn = this.activeResources.get(resourceId);
    if (!spawn) {
      return null;
    }

    return spawn.concentrationMap.getInterpolatedConcentration(x, z);
  }

  /**
   * Get all active resources of a specific class
   * @param classId - Resource class ID
   * @returns Array of active resource spawns
   */
  getActiveResourcesByClass(classId: string): ResourceSpawn[] {
    const resources: ResourceSpawn[] = [];
    for (const spawn of this.activeResources.values()) {
      if (spawn.resourceInstance.resourceClass.classId === classId) {
        resources.push(spawn);
      }
    }
    return resources;
  }

  /**
   * Get total count of active resources
   */
  getActiveResourceCount(): number {
    return this.activeResources.size;
  }

  /**
   * Get resource count by planet
   */
  getResourceCountByPlanet(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const [planetId, resourceIds] of this.planetResources) {
      counts.set(planetId, resourceIds.size);
    }
    return counts;
  }

  // ============================================
  // Rotation System
  // ============================================

  /**
   * Check if rotation should occur
   */
  checkRotation(): boolean {
    if (!this.lastRotationTime) {
      return true;
    }

    // SWG rotated resources weekly (every 7 days)
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    const timeSinceRotation = Date.now() - this.lastRotationTime.getTime();

    return timeSinceRotation >= weekInMs;
  }

  /**
   * Select resources for despawning from a planet
   * @param planetId - Planet ID
   * @param count - Number of resources to select
   * @returns Array of resource IDs to despawn
   */
  selectResourcesForDespawn(planetId: string, count: number): bigint[] {
    const resources = this.getActiveResourcesForPlanet(planetId);

    // Sort by spawn time (oldest first)
    resources.sort((a, b) => a.spawnedAt.getTime() - b.spawnedAt.getTime());

    // Select oldest resources up to count
    return resources.slice(0, count).map((r) => r.resourceInstance.resourceId);
  }

  /**
   * Select resource classes for spawning on a planet
   * @param planetId - Planet ID
   * @param count - Number of classes to select
   * @returns Array of resource class IDs to spawn
   */
  selectResourcesForSpawn(planetId: string, count: number): string[] {
    const selectedClasses: string[] = [];

    for (let i = 0; i < count; i++) {
      const classId = selectRandomResourceClass(planetId);
      if (classId) {
        selectedClasses.push(classId);
      }
    }

    return selectedClasses;
  }

  /**
   * Process weekly rotation for a single planet
   * @param planetId - Planet ID
   */
  processPlanetRotation(planetId: string): void {
    console.log(`[ResourceManager] Processing rotation for ${planetId}...`);

    const currentCount = this.planetResources.get(planetId)?.size ?? 0;
    const targetMin = this.options.minResourcesPerPlanet;
    const targetMax = this.options.maxResourcesPerPlanet;

    // Determine how many to despawn and spawn
    // Despawn ~20-30% of resources
    const despawnCount = Math.floor(currentCount * (0.2 + Math.random() * 0.1));
    const resourcesToDespawn = this.selectResourcesForDespawn(planetId, despawnCount);

    // Despawn selected resources
    for (const resourceId of resourcesToDespawn) {
      this.despawnResource(resourceId, 'rotation');
    }

    // Determine spawn count to maintain target range
    const newCount = currentCount - resourcesToDespawn.length;
    const spawnTarget = Math.floor(targetMin + Math.random() * (targetMax - targetMin));
    const spawnCount = Math.max(0, spawnTarget - newCount);

    // Spawn new resources
    const classesToSpawn = this.selectResourcesForSpawn(planetId, spawnCount);
    for (const classId of classesToSpawn) {
      this.spawnResource(classId, planetId);
    }

    console.log(
      `[ResourceManager] Rotation complete for ${planetId}: ` +
      `despawned ${resourcesToDespawn.length}, spawned ${classesToSpawn.length}, ` +
      `total: ${this.planetResources.get(planetId)?.size ?? 0}`
    );
  }

  /**
   * Process weekly rotation for all planets
   */
  processWeeklyRotation(): void {
    console.log('[ResourceManager] Processing weekly rotation...');

    for (const planetId of ALL_PLANETS) {
      this.processPlanetRotation(planetId);
    }

    this.lastRotationTime = new Date();

    // Persist updated state
    if (this.persistenceProvider) {
      const spawns = Array.from(this.activeResources.values()).map((s) => this.serializeSpawn(s));
      this.persistenceProvider.saveActiveSpawns(spawns).catch((err) => {
        console.error('[ResourceManager] Failed to persist rotation:', err);
      });
    }

    console.log(
      `[ResourceManager] Weekly rotation complete. ` +
      `Total active resources: ${this.activeResources.size}`
    );
  }

  /**
   * Start automatic rotation processing
   */
  private startAutoRotation(): void {
    if (this.rotationTimer) {
      return;
    }

    this.rotationTimer = setInterval(() => {
      if (this.checkRotation()) {
        this.processWeeklyRotation();
      }
    }, this.options.rotationCheckInterval);

    console.log(
      `[ResourceManager] Auto rotation enabled, checking every ${this.options.rotationCheckInterval / 1000}s`
    );
  }

  /**
   * Force initial spawn for all planets
   * Call this after initialization if no persisted state exists
   */
  forceInitialSpawn(): void {
    console.log('[ResourceManager] Forcing initial spawn for all planets...');

    for (const planetId of ALL_PLANETS) {
      const currentCount = this.planetResources.get(planetId)?.size ?? 0;
      const targetCount = Math.floor(
        this.options.minResourcesPerPlanet +
        Math.random() * (this.options.maxResourcesPerPlanet - this.options.minResourcesPerPlanet)
      );
      const spawnCount = Math.max(0, targetCount - currentCount);

      const classesToSpawn = this.selectResourcesForSpawn(planetId, spawnCount);
      for (const classId of classesToSpawn) {
        this.spawnResource(classId, planetId);
      }

      console.log(`[ResourceManager] Initial spawn for ${planetId}: ${classesToSpawn.length} resources`);
    }

    this.lastRotationTime = new Date();
  }

  // ============================================
  // Event Subscriptions
  // ============================================

  /**
   * Register callback for resource spawned events
   * @param callback - Callback function
   * @returns Unsubscribe function
   */
  onResourceSpawned(callback: ResourceSpawnedCallback): () => void {
    this.onSpawnedCallbacks.add(callback);
    return () => {
      this.onSpawnedCallbacks.delete(callback);
    };
  }

  /**
   * Register callback for resource despawned events
   * @param callback - Callback function
   * @returns Unsubscribe function
   */
  onResourceDespawned(callback: ResourceDespawnedCallback): () => void {
    this.onDespawnedCallbacks.add(callback);
    return () => {
      this.onDespawnedCallbacks.delete(callback);
    };
  }

  // ============================================
  // History & Statistics
  // ============================================

  /**
   * Record spawn in history
   */
  private recordSpawnHistory(classId: string, spawn: ResourceSpawn): void {
    let history = this.spawnHistory.get(classId);
    if (!history) {
      history = {
        classId,
        entries: [],
        totalSpawns: 0,
        lastSpawnedAt: null,
      };
      this.spawnHistory.set(classId, history);
    }

    // Calculate average quality
    const attrs = Array.from(spawn.resourceInstance.attributes.values());
    const avgQuality = attrs.length > 0
      ? Math.round(attrs.reduce((a, b) => a + b, 0) / attrs.length)
      : 0;

    history.entries.push({
      spawnedAt: spawn.spawnedAt,
      despawnedAt: null,
      averageQuality: avgQuality,
      planetId: spawn.planetId,
    });

    history.totalSpawns++;
    history.lastSpawnedAt = spawn.spawnedAt;

    // Keep only last 100 entries per class
    if (history.entries.length > 100) {
      history.entries = history.entries.slice(-100);
    }
  }

  /**
   * Get spawn history for a class
   */
  getSpawnHistory(classId: string): ResourceSpawnHistory | undefined {
    return this.spawnHistory.get(classId);
  }

  /**
   * Get overall statistics
   */
  getStatistics(): {
    totalActiveResources: number;
    resourcesByPlanet: Map<string, number>;
    classesWithHistory: number;
    totalHistoricalSpawns: number;
    lastRotation: Date | null;
  } {
    let totalHistoricalSpawns = 0;
    for (const history of this.spawnHistory.values()) {
      totalHistoricalSpawns += history.totalSpawns;
    }

    return {
      totalActiveResources: this.activeResources.size,
      resourcesByPlanet: this.getResourceCountByPlanet(),
      classesWithHistory: this.spawnHistory.size,
      totalHistoricalSpawns,
      lastRotation: this.lastRotationTime,
    };
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Serialize a spawn for persistence
   */
  private serializeSpawn(spawn: ResourceSpawn): ResourceSpawnData {
    return {
      resourceInstance: resourceInstanceToData(spawn.resourceInstance),
      concentrationMap: spawn.concentrationMap.serialize(),
      spawnedAt: spawn.spawnedAt.toISOString(),
      expiresAt: spawn.expiresAt.toISOString(),
      planetId: spawn.planetId,
    };
  }

  /**
   * Deserialize a spawn from persistence
   */
  private deserializeSpawn(data: ResourceSpawnData): ResourceSpawn | null {
    try {
      return {
        resourceInstance: dataToResourceInstance(data.resourceInstance),
        concentrationMap: ConcentrationMap.deserialize(data.concentrationMap),
        spawnedAt: new Date(data.spawnedAt),
        expiresAt: new Date(data.expiresAt),
        planetId: data.planetId,
      };
    } catch (err) {
      console.error('[ResourceManager] Failed to deserialize spawn:', err);
      return null;
    }
  }
}

/**
 * Create a new ResourceManager instance
 */
export function createResourceManager(options?: ResourceManagerOptions): ResourceManager {
  return new ResourceManager(options);
}
