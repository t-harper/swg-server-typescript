/**
 * Resource Spawn Tables Loader
 * Loads and manages spawn configuration data for resource spawning
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  ResourceSpawnConfig,
  PlanetSpawnConfig,
  PlanetSpawnConfigJson,
  parsePlanetSpawnConfig,
  validateResourceSpawnConfig,
  validatePlanetSpawnConfig,
  DEFAULT_SPAWN_CONFIG,
} from './spawn-config.js';

/**
 * Error thrown when spawn table loading fails
 */
export class SpawnTableLoadError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SpawnTableLoadError';
  }
}

/**
 * Spawn configuration file format
 */
interface SpawnConfigFile {
  version: number;
  spawnConfigs: ResourceSpawnConfig[];
}

/**
 * Planet spawn weights file format
 */
interface PlanetSpawnWeightsFile {
  version: number;
  planets: PlanetSpawnConfigJson[];
}

/**
 * Weighted probability entry for spawn calculations
 */
export interface SpawnProbability {
  resourceClassId: string;
  weight: number;
  probability: number;
  cumulativeProbability: number;
}

/**
 * Result of loading spawn tables
 */
export interface LoadSpawnTablesResult {
  /** Spawn configurations by resource class ID */
  spawnConfigs: Map<string, ResourceSpawnConfig>;
  /** Planet-specific spawn configurations */
  planetConfigs: Map<string, PlanetSpawnConfig>;
  /** Loading warnings */
  warnings: string[];
  /** Count of loaded configurations */
  configCount: number;
  /** Count of loaded planet configurations */
  planetCount: number;
}

/**
 * Loaded spawn tables cache
 */
let loadedSpawnConfigs: Map<string, ResourceSpawnConfig> = new Map();
let loadedPlanetConfigs: Map<string, PlanetSpawnConfig> = new Map();
let tablesLoaded = false;

/**
 * Load spawn configuration from a JSON file
 */
async function loadSpawnConfigFile(filePath: string): Promise<ResourceSpawnConfig[]> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as SpawnConfigFile;

    if (typeof data.version !== 'number') {
      throw new Error('Missing or invalid version field');
    }

    if (!Array.isArray(data.spawnConfigs)) {
      throw new Error('Missing or invalid spawnConfigs array');
    }

    return data.spawnConfigs;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new SpawnTableLoadError(`Invalid JSON in ${filePath}`, error);
    }
    throw new SpawnTableLoadError(
      `Failed to load ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Load planet spawn weights from a JSON file
 */
async function loadPlanetSpawnWeightsFile(filePath: string): Promise<PlanetSpawnConfigJson[]> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as PlanetSpawnWeightsFile;

    if (typeof data.version !== 'number') {
      throw new Error('Missing or invalid version field');
    }

    if (!Array.isArray(data.planets)) {
      throw new Error('Missing or invalid planets array');
    }

    return data.planets;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new SpawnTableLoadError(`Invalid JSON in ${filePath}`, error);
    }
    throw new SpawnTableLoadError(
      `Failed to load ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Options for loading spawn tables
 */
export interface LoadSpawnTablesOptions {
  /** Whether to validate configurations (default: true) */
  validate?: boolean;
  /** Whether to throw on validation errors (default: true) */
  strict?: boolean;
  /** Spawn config filename (default: 'spawn-config.json') */
  spawnConfigFile?: string;
  /** Planet spawn weights filename (default: 'planet-spawn-weights.json') */
  planetWeightsFile?: string;
}

/**
 * Load spawn tables from a data directory
 * @param dataPath - Path to directory containing spawn data JSON files
 * @param options - Loading options
 * @returns Loaded spawn tables result
 */
export async function loadSpawnTables(
  dataPath: string,
  options: LoadSpawnTablesOptions = {}
): Promise<LoadSpawnTablesResult> {
  const {
    validate = true,
    strict = true,
    spawnConfigFile = 'spawn-config.json',
    planetWeightsFile = 'planet-spawn-weights.json',
  } = options;

  const spawnConfigs = new Map<string, ResourceSpawnConfig>();
  const planetConfigs = new Map<string, PlanetSpawnConfig>();
  const warnings: string[] = [];

  // Load spawn configurations
  try {
    const spawnConfigPath = join(dataPath, spawnConfigFile);
    const configs = await loadSpawnConfigFile(spawnConfigPath);

    for (const config of configs) {
      // Apply defaults for missing fields
      const fullConfig: ResourceSpawnConfig = {
        ...DEFAULT_SPAWN_CONFIG,
        ...config,
      };

      if (validate) {
        const errors = validateResourceSpawnConfig(fullConfig);
        if (errors.length > 0) {
          if (strict) {
            throw new SpawnTableLoadError(
              `Invalid spawn config for '${config.resourceClassId}': ${errors.join('; ')}`
            );
          }
          warnings.push(`Config '${config.resourceClassId}': ${errors.join('; ')}`);
          continue;
        }
      }

      if (spawnConfigs.has(fullConfig.resourceClassId)) {
        warnings.push(`Duplicate spawn config for '${fullConfig.resourceClassId}', using latest`);
      }

      spawnConfigs.set(fullConfig.resourceClassId, fullConfig);
    }
  } catch (error) {
    if (error instanceof SpawnTableLoadError) {
      throw error;
    }
    throw new SpawnTableLoadError(
      `Failed to load spawn configs: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Load planet spawn weights
  try {
    const planetWeightsPath = join(dataPath, planetWeightsFile);
    const planets = await loadPlanetSpawnWeightsFile(planetWeightsPath);

    for (const planetJson of planets) {
      const config = parsePlanetSpawnConfig(planetJson);

      if (validate) {
        const errors = validatePlanetSpawnConfig(config);
        if (errors.length > 0) {
          if (strict) {
            throw new SpawnTableLoadError(
              `Invalid planet config for '${planetJson.planetId}': ${errors.join('; ')}`
            );
          }
          warnings.push(`Planet '${planetJson.planetId}': ${errors.join('; ')}`);
          continue;
        }
      }

      if (planetConfigs.has(config.planetId)) {
        warnings.push(`Duplicate planet config for '${config.planetId}', using latest`);
      }

      planetConfigs.set(config.planetId, config);
    }
  } catch (error) {
    if (error instanceof SpawnTableLoadError) {
      throw error;
    }
    throw new SpawnTableLoadError(
      `Failed to load planet weights: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Update cached data
  loadedSpawnConfigs = spawnConfigs;
  loadedPlanetConfigs = planetConfigs;
  tablesLoaded = true;

  return {
    spawnConfigs,
    planetConfigs,
    warnings,
    configCount: spawnConfigs.size,
    planetCount: planetConfigs.size,
  };
}

/**
 * Get spawn configuration for a specific resource class
 * @param classId - Resource class ID
 * @returns Spawn configuration or undefined if not found
 */
export function getSpawnConfigForClass(classId: string): ResourceSpawnConfig | undefined {
  return loadedSpawnConfigs.get(classId);
}

/**
 * Get all resource classes that can spawn on a specific planet
 * @param planetId - Planet ID
 * @returns Array of resource class IDs that can spawn on this planet
 */
export function getSpawnableResourcesForPlanet(planetId: string): string[] {
  const planetConfig = loadedPlanetConfigs.get(planetId);
  const spawnableClasses: string[] = [];

  for (const [classId, config] of loadedSpawnConfigs) {
    // Check if resource can spawn on this planet
    if (!config.planets.includes(planetId) && !config.planets.includes('all')) {
      continue;
    }

    // Check planet-specific blacklist
    if (planetConfig?.blacklistedResources.includes(classId)) {
      continue;
    }

    spawnableClasses.push(classId);
  }

  // Add planet-exclusive resources
  if (planetConfig) {
    for (const exclusiveClass of planetConfig.exclusiveResources) {
      if (!spawnableClasses.includes(exclusiveClass)) {
        spawnableClasses.push(exclusiveClass);
      }
    }
  }

  return spawnableClasses;
}

/**
 * Calculate weighted spawn probabilities for a planet
 * @param planetId - Planet ID
 * @returns Array of spawn probabilities sorted by weight
 */
export function calculateSpawnProbabilities(planetId: string): SpawnProbability[] {
  const spawnableClasses = getSpawnableResourcesForPlanet(planetId);
  const planetConfig = loadedPlanetConfigs.get(planetId);
  const globalModifier = planetConfig?.globalSpawnRateModifier ?? 1.0;

  const probabilities: SpawnProbability[] = [];
  let totalWeight = 0;

  // Calculate weights for each spawnable class
  for (const classId of spawnableClasses) {
    const config = loadedSpawnConfigs.get(classId);
    if (!config) continue;

    let weight = config.spawnWeight * globalModifier;

    // Apply planet-specific weight multiplier
    const multiplier = planetConfig?.spawnWeightMultipliers.get(classId);
    if (multiplier !== undefined) {
      weight *= multiplier;
    }

    totalWeight += weight;

    probabilities.push({
      resourceClassId: classId,
      weight,
      probability: 0, // Will be calculated below
      cumulativeProbability: 0, // Will be calculated below
    });
  }

  // Calculate probabilities and cumulative probabilities
  let cumulative = 0;
  for (const prob of probabilities) {
    prob.probability = totalWeight > 0 ? prob.weight / totalWeight : 0;
    cumulative += prob.probability;
    prob.cumulativeProbability = cumulative;
  }

  // Sort by weight descending
  probabilities.sort((a, b) => b.weight - a.weight);

  return probabilities;
}

/**
 * Select a random resource class based on spawn probabilities
 * @param planetId - Planet ID
 * @param random - Random value between 0 and 1 (optional, uses Math.random if not provided)
 * @returns Selected resource class ID or undefined if no resources available
 */
export function selectRandomResourceClass(
  planetId: string,
  random?: number
): string | undefined {
  const probabilities = calculateSpawnProbabilities(planetId);
  if (probabilities.length === 0) return undefined;

  const r = random ?? Math.random();

  // Use cumulative probability for weighted selection
  for (const prob of probabilities) {
    if (r <= prob.cumulativeProbability) {
      return prob.resourceClassId;
    }
  }

  // Fallback to last entry (handles floating point edge cases)
  return probabilities[probabilities.length - 1]?.resourceClassId;
}

/**
 * Get planet spawn configuration
 * @param planetId - Planet ID
 * @returns Planet spawn configuration or undefined
 */
export function getPlanetSpawnConfig(planetId: string): PlanetSpawnConfig | undefined {
  return loadedPlanetConfigs.get(planetId);
}

/**
 * Get all loaded spawn configurations
 * @returns Map of resource class ID to spawn configuration
 */
export function getAllSpawnConfigs(): Map<string, ResourceSpawnConfig> {
  return new Map(loadedSpawnConfigs);
}

/**
 * Get all loaded planet configurations
 * @returns Map of planet ID to planet spawn configuration
 */
export function getAllPlanetConfigs(): Map<string, PlanetSpawnConfig> {
  return new Map(loadedPlanetConfigs);
}

/**
 * Check if spawn tables have been loaded
 */
export function areSpawnTablesLoaded(): boolean {
  return tablesLoaded;
}

/**
 * Clear loaded spawn tables (useful for testing)
 */
export function clearSpawnTables(): void {
  loadedSpawnConfigs.clear();
  loadedPlanetConfigs.clear();
  tablesLoaded = false;
}

/**
 * Calculate the expected lifespan for a resource based on its configuration
 * @param classId - Resource class ID
 * @returns Random lifespan in days within the configured range
 */
export function calculateResourceLifespan(classId: string): number {
  const config = loadedSpawnConfigs.get(classId);
  if (!config) {
    return DEFAULT_SPAWN_CONFIG.minLifespanDays;
  }

  const range = config.maxLifespanDays - config.minLifespanDays;
  return config.minLifespanDays + Math.random() * range;
}

/**
 * Calculate the spawn pool size for a resource class
 * @param classId - Resource class ID
 * @returns Random pool size within the configured range
 */
export function calculateSpawnPoolSize(classId: string): number {
  const config = loadedSpawnConfigs.get(classId);
  if (!config) {
    return DEFAULT_SPAWN_CONFIG.minSpawnPool;
  }

  const range = config.maxSpawnPool - config.minSpawnPool;
  return Math.round(config.minSpawnPool + Math.random() * range);
}
