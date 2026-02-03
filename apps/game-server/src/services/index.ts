/**
 * Game Server Services
 * Service exports for game server functionality
 */

// Zone Service
export {
  ZoneService,
  createZoneService,
  type ZoneState,
  type PlayerZoneState,
  type ZoneServiceOptions,
  type SendCallback,
} from './zone-service.js';

// Spawn Manager
export {
  SpawnManager,
  createSpawnManager,
  type SpawnLocation,
  type SpawnEntry,
  type SpawnTable,
  type ActiveSpawn,
  type SpawnConfig,
  type SpawnManagerOptions,
} from './spawn-manager.js';

// Creature Spawner
export {
  CreatureSpawner,
  createCreatureSpawner,
  FactionCrcs,
  type ActiveCreatureInfo,
  type CreatureSpawnerOptions,
  type CreatureAIState,
} from './creature-spawner.js';

// Lair Manager
export {
  LairManager,
  createLairManager,
  type ActiveLairInfo,
  type LairDestructionEvent,
  type LairManagerOptions,
  type LairDestructionCallback,
} from './lair-manager.js';

// Resource Manager
export {
  ResourceManager,
  createResourceManager,
  type ResourceSpawn,
  type ResourceSpawnData,
  type ResourceSpawnHistoryEntry,
  type ResourceSpawnHistory,
  type ResourceSpawnedCallback,
  type ResourceDespawnedCallback,
  type ResourcePersistenceProvider,
  type ResourceManagerOptions,
} from './resource-manager.js';

// Vendor Manager
export {
  VendorManager,
  createVendorManager,
  getVendorManager,
  type VendorSearchFilters,
  type VendorSearchResult,
  type VendorRegistration,
  type VendorCreationOptions,
  type MaintenanceTickResult,
  type VendorSaleNotification,
  type VendorSaleCallback,
  type VendorStatusCallback,
  type VendorManagerOptions,
} from './vendor-manager.js';
