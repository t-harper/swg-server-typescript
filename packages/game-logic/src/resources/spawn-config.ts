/**
 * Resource Spawn Configuration Types
 * Defines interfaces for resource spawning behavior in SWG
 */

/**
 * Configuration for how a resource class spawns in the game world
 */
export interface ResourceSpawnConfig {
  /** The resource class ID (e.g., 'iron', 'copper', 'petrochem_fuel') */
  resourceClassId: string;

  /** List of planet IDs where this resource can spawn */
  planets: string[];

  /** Minimum number of concurrent resource spawns of this class */
  minSpawnPool: number;

  /** Maximum number of concurrent resource spawns of this class */
  maxSpawnPool: number;

  /** Minimum lifespan in days before resource despawns */
  minLifespanDays: number;

  /** Maximum lifespan in days before resource despawns */
  maxLifespanDays: number;

  /** Relative spawn weight (higher = more likely to spawn) */
  spawnWeight: number;
}

/**
 * Planet-specific spawn configuration overrides
 */
export interface PlanetSpawnConfig {
  /** Planet ID (e.g., 'tatooine', 'naboo', 'corellia') */
  planetId: string;

  /** Display name for the planet */
  displayName: string;

  /** Planet-specific spawn weight multipliers by resource class */
  spawnWeightMultipliers: Map<string, number>;

  /** Resource classes that are exclusive to this planet */
  exclusiveResources: string[];

  /** Resource classes that cannot spawn on this planet */
  blacklistedResources: string[];

  /** Global spawn rate modifier for this planet (1.0 = normal) */
  globalSpawnRateModifier: number;

  /** Maximum total concurrent resource spawns on this planet */
  maxTotalSpawns: number;
}

/**
 * JSON-serializable version of PlanetSpawnConfig
 */
export interface PlanetSpawnConfigJson {
  planetId: string;
  displayName: string;
  spawnWeightMultipliers: Record<string, number>;
  exclusiveResources: string[];
  blacklistedResources: string[];
  globalSpawnRateModifier: number;
  maxTotalSpawns: number;
}

/**
 * Convert JSON representation to PlanetSpawnConfig
 */
export function parsePlanetSpawnConfig(json: PlanetSpawnConfigJson): PlanetSpawnConfig {
  return {
    planetId: json.planetId,
    displayName: json.displayName,
    spawnWeightMultipliers: new Map(Object.entries(json.spawnWeightMultipliers)),
    exclusiveResources: [...json.exclusiveResources],
    blacklistedResources: [...json.blacklistedResources],
    globalSpawnRateModifier: json.globalSpawnRateModifier,
    maxTotalSpawns: json.maxTotalSpawns,
  };
}

/**
 * Convert PlanetSpawnConfig to JSON representation
 */
export function serializePlanetSpawnConfig(config: PlanetSpawnConfig): PlanetSpawnConfigJson {
  return {
    planetId: config.planetId,
    displayName: config.displayName,
    spawnWeightMultipliers: Object.fromEntries(config.spawnWeightMultipliers),
    exclusiveResources: [...config.exclusiveResources],
    blacklistedResources: [...config.blacklistedResources],
    globalSpawnRateModifier: config.globalSpawnRateModifier,
    maxTotalSpawns: config.maxTotalSpawns,
  };
}

/**
 * Default spawn configuration values
 */
export const DEFAULT_SPAWN_CONFIG: Omit<ResourceSpawnConfig, 'resourceClassId' | 'planets'> = {
  minSpawnPool: 1,
  maxSpawnPool: 3,
  minLifespanDays: 6,
  maxLifespanDays: 22,
  spawnWeight: 100,
};

/**
 * Default planet spawn configuration values
 */
export const DEFAULT_PLANET_SPAWN_CONFIG: Omit<PlanetSpawnConfig, 'planetId' | 'displayName'> = {
  spawnWeightMultipliers: new Map(),
  exclusiveResources: [],
  blacklistedResources: [],
  globalSpawnRateModifier: 1.0,
  maxTotalSpawns: 200,
};

/**
 * SWG Planet IDs
 */
export const SWG_PLANETS = [
  'corellia',
  'dantooine',
  'dathomir',
  'endor',
  'lok',
  'naboo',
  'rori',
  'talus',
  'tatooine',
  'yavin4',
] as const;

export type SwgPlanetId = (typeof SWG_PLANETS)[number];

/**
 * Validate a ResourceSpawnConfig
 */
export function validateResourceSpawnConfig(config: ResourceSpawnConfig): string[] {
  const errors: string[] = [];

  if (!config.resourceClassId || typeof config.resourceClassId !== 'string') {
    errors.push('resourceClassId must be a non-empty string');
  }

  if (!Array.isArray(config.planets) || config.planets.length === 0) {
    errors.push('planets must be a non-empty array');
  }

  if (typeof config.minSpawnPool !== 'number' || config.minSpawnPool < 0) {
    errors.push('minSpawnPool must be a non-negative number');
  }

  if (typeof config.maxSpawnPool !== 'number' || config.maxSpawnPool < config.minSpawnPool) {
    errors.push('maxSpawnPool must be >= minSpawnPool');
  }

  if (typeof config.minLifespanDays !== 'number' || config.minLifespanDays < 1) {
    errors.push('minLifespanDays must be at least 1');
  }

  if (typeof config.maxLifespanDays !== 'number' || config.maxLifespanDays < config.minLifespanDays) {
    errors.push('maxLifespanDays must be >= minLifespanDays');
  }

  if (typeof config.spawnWeight !== 'number' || config.spawnWeight <= 0) {
    errors.push('spawnWeight must be a positive number');
  }

  return errors;
}

/**
 * Validate a PlanetSpawnConfig
 */
export function validatePlanetSpawnConfig(config: PlanetSpawnConfig): string[] {
  const errors: string[] = [];

  if (!config.planetId || typeof config.planetId !== 'string') {
    errors.push('planetId must be a non-empty string');
  }

  if (!config.displayName || typeof config.displayName !== 'string') {
    errors.push('displayName must be a non-empty string');
  }

  if (typeof config.globalSpawnRateModifier !== 'number' || config.globalSpawnRateModifier <= 0) {
    errors.push('globalSpawnRateModifier must be a positive number');
  }

  if (typeof config.maxTotalSpawns !== 'number' || config.maxTotalSpawns < 1) {
    errors.push('maxTotalSpawns must be at least 1');
  }

  return errors;
}
