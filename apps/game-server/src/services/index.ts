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

// Guild Permission Service
export {
  GuildPermissionService,
  GuildPermissionError,
  createGuildPermissionService,
  type PermissionCheckResult,
} from './guild-permission-service.js';

// Guild Manager
export {
  GuildManager,
  createGuildManager,
  getGuildManager,
  type GuildPersistenceData,
  type GuildMemberPersistenceData,
  type GuildWarPersistenceData,
  type GuildPersistenceProvider,
  type GuildMessageCallback,
  type GuildManagerOptions,
} from './guild-manager.js';

// Structure Permission Service
export {
  StructurePermissionService,
  createStructurePermissionService,
  getStructurePermissionService,
  type PermissionOperationResult,
  type EffectivePermissions,
  type PermissionListEntry,
  type CellPermissionEntry,
  type PermissionChangeEvent,
  type PermissionChangeCallback,
  type StructurePermissionServiceOptions,
} from './structure-permission-service.js';

// Permission Validator
export {
  validatePermissionGrant,
  validatePermissionRevoke,
  validateBan,
  validateUnban,
  validateSetPublic,
  canTransferOwnership,
  getRequiredPrivilegeLevel,
  hasPrivilegeLevel,
  validResult,
  invalidResult,
  PrivilegeLevel,
  PermissionErrorCode,
  type PermissionValidationResult,
} from './permission-validator.js';

// Housing Types
export {
  PlacementErrorCode,
  getPlacementErrorMessage,
  LOT_DISTANCE,
  STRUCTURE_MIN_DISTANCE,
  NPC_CITY_NO_BUILD_RADIUS,
  MAX_TERRAIN_SLOPE,
  BASE_LOT_COUNT,
  ARCHITECT_LOTS_PER_SKILL,
  POLITICIAN_LOTS_PER_SKILL,
  MAX_LOTS,
  LOT_GRANTING_SKILLS,
  LOT_COSTS_BY_TYPE,
  NO_BUILD_REGIONS,
  HOUSING_ALLOWED_PLANETS,
  HOUSING_DISALLOWED_PLANETS,
  type Lot,
  type PlacementValidationResult,
  type HousingLimits,
  type DeedTemplate,
  type NoBuildCircle,
  type NoBuildRectangle,
  type NoBuildRegion,
} from './housing-types.js';

// Lot Calculator
export {
  calculateBaseLots,
  calculateArchitectBonus,
  calculatePoliticianBonus,
  calculateBonusLots,
  calculateTotalLots,
  calculateUsedLots,
  calculateStructureLotUsage,
  getLotCost,
  hasEnoughLots,
  performLotCalculation,
  getMissingLotSkills,
  formatLotCalculation,
  isSmallStructure,
  isMediumStructure,
  isLargeStructure,
  STRUCTURE_LOT_CATEGORIES,
  type PlayerSkills,
  type LotCalculationResult,
} from './lot-calculator.js';

// Housing Service
export {
  HousingService,
  createHousingService,
  getHousingService,
  type HousingServiceOptions,
  type PlaceStructureResult,
  type StructureOperationResult,
  type StructurePlacedCallback,
  type StructureRemovedCallback,
} from './housing-service.js';

// City Service
export {
  CityService,
  createCityService,
  getCityService,
  type CityServiceOptions,
  type CityPersistenceProvider,
  type CityFoundedEvent,
  type CityDisbandedEvent,
  type ElectionResultEvent,
  type TaxCollectionEvent,
  type CityFoundedCallback,
  type CityDisbandedCallback,
  type ElectionResultCallback,
  type TaxCollectionCallback,
} from './city-service.js';

// City Election Processor
export {
  CityElectionProcessor,
  createCityElectionProcessor,
  ElectionPhase,
  ElectionAnnouncementType,
  type ElectionAnnouncement,
  type CandidateValidationResult,
  type ElectionProcessingResult,
  type TiedElectionResult,
  type ElectionAnnouncementCallback,
} from './city-election-processor.js';
