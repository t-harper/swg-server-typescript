/**
 * Survey Service
 * Core service for resource surveying and sampling operations
 *
 * Handles:
 * - Survey execution and concentration calculation
 * - Sample extraction with yield calculations
 * - Resource availability queries
 * - Survey waypoint management
 *
 * The survey system uses a Perlin noise-like algorithm to generate
 * reproducible concentration maps for each resource spawn.
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import type {
  SurveyResult,
  SampleResult,
  ResourceSpawnData,
  SurveyableResource,
  SurveyWaypoint,
} from '@swg/objects';
import {
  SurveyTool,
  SurveyToolType,
  SURVEY_TOOL_RESOURCE_CLASSES,
  MAX_SURVEY_RESULTS,
  MIN_REPORTABLE_CONCENTRATION,
  DEFAULT_SURVEY_COOLDOWN,
  DEFAULT_SAMPLE_COOLDOWN,
} from '@swg/objects';

// ============================================
// Types
// ============================================

/**
 * Player interface for survey operations
 */
export interface SurveyPlayer {
  objectId: ObjectId;
  position: Vector3;
  sceneId: string;
  getSkillMod(name: string): number;
  hasSkill?(skillName: string): boolean;
  skills?: Set<string>;
}

/**
 * Resource spawn provider interface
 * Implemented by the game server's resource system
 */
export interface ResourceSpawnProvider {
  /** Get all active resource spawns for a planet */
  getActiveSpawns(planetId: string): ResourceSpawnData[];
  /** Get a specific resource spawn by ID */
  getSpawn(resourceId: bigint): ResourceSpawnData | undefined;
  /** Check if a resource spawn is still active */
  isSpawnActive(resourceId: bigint): boolean;
  /** Get concentration at a specific point */
  getConcentration(resourceId: bigint, x: number, z: number): number;
}

/**
 * Survey service configuration
 */
export interface SurveyServiceConfig {
  /** Default survey range multiplier */
  rangeMultiplier: number;
  /** Default accuracy multiplier */
  accuracyMultiplier: number;
  /** Default sample yield multiplier */
  sampleYieldMultiplier: number;
  /** XP per successful sample */
  sampleXp: number;
  /** XP per survey */
  surveyXp: number;
  /** Enable detailed logging */
  enableLogging: boolean;
}

/**
 * Default survey service configuration
 */
export const DEFAULT_SURVEY_CONFIG: SurveyServiceConfig = {
  rangeMultiplier: 1.0,
  accuracyMultiplier: 1.0,
  sampleYieldMultiplier: 1.0,
  sampleXp: 15,
  surveyXp: 5,
  enableLogging: false,
};

/**
 * Survey execution result
 */
export interface SurveyExecutionResult {
  success: boolean;
  results: SurveyResult[];
  errorMessage?: string;
  effectiveRange: number;
  effectiveAccuracy: number;
  xpGained: number;
}

/**
 * Sample execution result
 */
export interface SampleExecutionResult {
  success: boolean;
  result: SampleResult;
  errorMessage?: string;
  effectiveSampleSize: number;
}

// ============================================
// Survey Service Class
// ============================================

/**
 * Survey Service
 * Manages all survey and sampling operations
 */
export class SurveyService {
  /** Resource spawn provider */
  private resourceProvider: ResourceSpawnProvider;

  /** Service configuration */
  private config: SurveyServiceConfig;

  /** Player's last surveyed resources (for UI caching) */
  private playerSurveyCache: Map<ObjectId, Map<bigint, SurveyResult[]>>;

  /** Player's survey cooldowns */
  private surveyCooldowns: Map<ObjectId, number>;

  /** Player's sample cooldowns */
  private sampleCooldowns: Map<ObjectId, number>;

  /**
   * Create a new Survey Service
   * @param resourceProvider - Provider for resource spawn data
   * @param config - Optional configuration overrides
   */
  constructor(
    resourceProvider: ResourceSpawnProvider,
    config: Partial<SurveyServiceConfig> = {}
  ) {
    this.resourceProvider = resourceProvider;
    this.config = { ...DEFAULT_SURVEY_CONFIG, ...config };
    this.playerSurveyCache = new Map();
    this.surveyCooldowns = new Map();
    this.sampleCooldowns = new Map();
  }

  // ============================================
  // Survey Operations
  // ============================================

  /**
   * Perform a survey operation
   * @param player - Player performing the survey
   * @param tool - Survey tool being used
   * @param resourceId - Specific resource to survey
   * @returns Survey execution result
   */
  performSurvey(
    player: SurveyPlayer,
    tool: SurveyTool,
    resourceId: bigint
  ): SurveyExecutionResult {
    const result: SurveyExecutionResult = {
      success: false,
      results: [],
      effectiveRange: 0,
      effectiveAccuracy: 0,
      xpGained: 0,
    };

    // Check if tool can be used
    const canSurvey = tool.canSurvey(player);
    if (!canSurvey.canSurvey) {
      result.errorMessage = canSurvey.reason;
      return result;
    }

    // Check cooldown
    const lastSurvey = this.surveyCooldowns.get(player.objectId) ?? 0;
    const cooldownRemaining = Math.max(0, tool.cooldown - (Date.now() - lastSurvey));
    if (cooldownRemaining > 0) {
      result.errorMessage = `Survey tool is recharging (${Math.ceil(cooldownRemaining / 1000)}s)`;
      return result;
    }

    // Get the resource spawn
    const spawn = this.resourceProvider.getSpawn(resourceId);
    if (!spawn) {
      result.errorMessage = 'Resource is no longer available';
      return result;
    }

    // Verify resource is on same planet
    if (spawn.planetId !== player.sceneId) {
      result.errorMessage = 'Resource is not available on this planet';
      return result;
    }

    // Verify tool can survey this resource type
    if (!tool.canSurveyResource(spawn.resourceClass)) {
      result.errorMessage = `This tool cannot survey ${spawn.resourceClass} resources`;
      return result;
    }

    // Calculate effective range and accuracy
    const effectiveRange =
      tool.calculateEffectiveRange(player) * this.config.rangeMultiplier;
    const effectiveAccuracy =
      tool.calculateEffectiveAccuracy(player) * this.config.accuracyMultiplier;

    result.effectiveRange = effectiveRange;
    result.effectiveAccuracy = effectiveAccuracy;

    // Generate survey results for points within range
    const surveyResults = this.generateSurveyResults(
      player,
      resourceId,
      spawn,
      effectiveRange,
      effectiveAccuracy
    );

    result.results = surveyResults;

    // Mark tool as used and set cooldown
    tool.markUsed();
    tool.setActiveSurveyResource(resourceId);
    this.surveyCooldowns.set(player.objectId, Date.now());

    // Cache results for player
    this.cachePlayerSurvey(player.objectId, resourceId, surveyResults);

    // Award XP
    result.xpGained = this.config.surveyXp;

    result.success = true;

    if (this.config.enableLogging) {
      console.log(
        `[SurveyService] Survey: player=${player.objectId}, resource=${resourceId}, results=${surveyResults.length}`
      );
    }

    return result;
  }

  /**
   * Generate survey results for points around the player
   */
  private generateSurveyResults(
    player: SurveyPlayer,
    resourceId: bigint,
    spawn: ResourceSpawnData,
    range: number,
    accuracy: number
  ): SurveyResult[] {
    const results: SurveyResult[] = [];
    const playerX = player.position.x;
    const playerZ = player.position.z;

    // Sample points in a grid pattern within range
    const numSamples = 8; // Sample points per axis
    const step = (range * 2) / numSamples;

    const readings: Array<{
      x: number;
      z: number;
      concentration: number;
      distance: number;
    }> = [];

    for (let i = 0; i <= numSamples; i++) {
      for (let j = 0; j <= numSamples; j++) {
        const x = playerX - range + i * step;
        const z = playerZ - range + j * step;

        // Check if point is within circular range
        const dx = x - playerX;
        const dz = z - playerZ;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance > range) continue;

        // Get concentration at this point
        const concentration = this.calculateConcentrationAtPosition(
          resourceId,
          x,
          z,
          player.sceneId
        );

        if (concentration >= MIN_REPORTABLE_CONCENTRATION) {
          readings.push({ x, z, concentration, distance });
        }
      }
    }

    // Sort by concentration (highest first) and take top results
    readings.sort((a, b) => b.concentration - a.concentration);
    const topReadings = readings.slice(0, MAX_SURVEY_RESULTS);

    // Convert to survey results with accuracy variation
    for (const reading of topReadings) {
      // Apply accuracy variation to concentration reading
      const accuracyVariation = (100 - accuracy) / 100;
      const variation = (Math.random() - 0.5) * 2 * accuracyVariation * reading.concentration;
      const reportedConcentration = Math.max(
        0,
        Math.min(100, reading.concentration + variation)
      );

      // Calculate direction from player
      const dx = reading.x - playerX;
      const dz = reading.z - playerZ;
      const direction = Math.atan2(dz, dx);

      results.push({
        resourceId,
        resourceName: spawn.name,
        resourceClass: spawn.resourceClass,
        concentration: Math.round(reportedConcentration),
        position: {
          x: Math.round(reading.x),
          z: Math.round(reading.z),
        },
        accuracy: Math.round(accuracy),
        distance: Math.round(reading.distance),
        direction,
      });
    }

    return results;
  }

  /**
   * Calculate resource concentration at a specific position
   * @param resourceId - Resource spawn ID
   * @param x - World X coordinate
   * @param z - World Z coordinate
   * @param planetId - Planet/scene ID
   * @returns Concentration percentage (0-100)
   */
  calculateConcentrationAtPosition(
    resourceId: bigint,
    x: number,
    z: number,
    planetId: string
  ): number {
    // Get spawn data
    const spawn = this.resourceProvider.getSpawn(resourceId);
    if (!spawn || spawn.planetId !== planetId) {
      return 0;
    }

    // Check if spawn is still active
    if (!this.resourceProvider.isSpawnActive(resourceId)) {
      return 0;
    }

    // Use provider's concentration calculation if available
    const providerConcentration = this.resourceProvider.getConcentration(resourceId, x, z);
    if (providerConcentration >= 0) {
      return providerConcentration;
    }

    // Fallback: Generate concentration using spawn seed and position
    return this.generateConcentration(spawn, x, z);
  }

  /**
   * Generate concentration using pseudo-random noise based on spawn seed
   * This creates a reproducible concentration map for each resource
   */
  private generateConcentration(spawn: ResourceSpawnData, x: number, z: number): number {
    // Use spawn seed to generate reproducible noise
    const seed = spawn.spawnSeed;

    // Scale coordinates for noise frequency
    const scale = 0.005; // Controls concentration "blob" size
    const nx = x * scale;
    const nz = z * scale;

    // Simple hash-based noise (deterministic)
    const hash1 = this.hashNoise(seed, Math.floor(nx), Math.floor(nz));
    const hash2 = this.hashNoise(seed + 1, Math.floor(nx) + 1, Math.floor(nz));
    const hash3 = this.hashNoise(seed + 2, Math.floor(nx), Math.floor(nz) + 1);
    const hash4 = this.hashNoise(seed + 3, Math.floor(nx) + 1, Math.floor(nz) + 1);

    // Bilinear interpolation
    const fx = nx - Math.floor(nx);
    const fz = nz - Math.floor(nz);

    const interp1 = hash1 * (1 - fx) + hash2 * fx;
    const interp2 = hash3 * (1 - fx) + hash4 * fx;
    const noise = interp1 * (1 - fz) + interp2 * fz;

    // Scale noise to concentration range
    const concentration = noise * spawn.baseConcentration;

    return Math.max(0, Math.min(100, concentration));
  }

  /**
   * Simple hash function for deterministic noise
   */
  private hashNoise(seed: number, x: number, z: number): number {
    // Combine seed and coordinates into a hash
    let h = seed;
    h ^= x * 374761393;
    h ^= z * 668265263;
    h = (h ^ (h >>> 13)) * 1274126177;
    h ^= h >>> 16;

    // Normalize to 0-1 range
    return ((h & 0x7fffffff) / 0x7fffffff);
  }

  // ============================================
  // Resource List Operations
  // ============================================

  /**
   * Get surveyable resources in range
   * @param tool - Survey tool being used
   * @param position - Player position
   * @param planetId - Planet/scene ID
   * @returns Array of surveyable resources
   */
  getResourcesInRange(
    tool: SurveyTool,
    position: Vector3,
    planetId: string
  ): SurveyableResource[] {
    const resources: SurveyableResource[] = [];

    // Get all active spawns on this planet
    const spawns = this.resourceProvider.getActiveSpawns(planetId);

    // Get resource classes this tool can survey
    const surveyableClasses = tool.getSurveyableResourceTypes();

    for (const spawn of spawns) {
      // Check if this tool can survey this resource class
      const canSurvey = surveyableClasses.some(
        (cls) =>
          spawn.resourceClass.toLowerCase().includes(cls) ||
          spawn.parentClass.toLowerCase().includes(cls)
      );

      if (canSurvey) {
        resources.push({
          resourceId: spawn.resourceId,
          name: spawn.name,
          resourceClass: spawn.resourceClass,
          previouslySurveyed: false, // Would need player history tracking
        });
      }
    }

    // Sort by name
    resources.sort((a, b) => a.name.localeCompare(b.name));

    return resources;
  }

  // ============================================
  // Sample Operations
  // ============================================

  /**
   * Perform a sample extraction operation
   * @param player - Player performing the sampling
   * @param tool - Survey tool being used
   * @param resourceId - Resource to sample
   * @returns Sample execution result
   */
  performSample(
    player: SurveyPlayer,
    tool: SurveyTool,
    resourceId: bigint
  ): SampleExecutionResult {
    const result: SampleExecutionResult = {
      success: false,
      result: {
        resourceId,
        resourceName: '',
        quantity: 0,
        success: false,
        concentration: 0,
      },
      effectiveSampleSize: 0,
    };

    // Check if tool can be used
    const canSurvey = tool.canSurvey(player);
    if (!canSurvey.canSurvey) {
      result.errorMessage = canSurvey.reason;
      result.result.errorMessage = canSurvey.reason;
      return result;
    }

    // Check sample cooldown
    const lastSample = this.sampleCooldowns.get(player.objectId) ?? 0;
    const cooldownRemaining = Math.max(0, DEFAULT_SAMPLE_COOLDOWN - (Date.now() - lastSample));
    if (cooldownRemaining > 0) {
      result.errorMessage = `Must wait ${Math.ceil(cooldownRemaining / 1000)}s before sampling again`;
      result.result.errorMessage = result.errorMessage;
      return result;
    }

    // Get the resource spawn
    const spawn = this.resourceProvider.getSpawn(resourceId);
    if (!spawn) {
      result.errorMessage = 'Resource is no longer available';
      result.result.errorMessage = result.errorMessage;
      return result;
    }

    // Verify resource is on same planet
    if (spawn.planetId !== player.sceneId) {
      result.errorMessage = 'Resource is not available on this planet';
      result.result.errorMessage = result.errorMessage;
      return result;
    }

    // Calculate concentration at player's position
    const concentration = this.calculateConcentrationAtPosition(
      resourceId,
      player.position.x,
      player.position.z,
      player.sceneId
    );

    // Check minimum concentration for sampling
    if (concentration < MIN_REPORTABLE_CONCENTRATION) {
      result.errorMessage = 'Concentration too low to sample at this location';
      result.result.errorMessage = result.errorMessage;
      return result;
    }

    // Calculate sample yield
    const sampleYield = this.calculateSampleYield(tool, concentration, player);
    result.effectiveSampleSize = sampleYield;

    // Mark tool as used and set cooldown
    tool.markUsed();
    this.sampleCooldowns.set(player.objectId, Date.now());

    // Create sample result
    result.result = {
      resourceId,
      resourceName: spawn.name,
      quantity: sampleYield,
      success: true,
      concentration: Math.round(concentration),
      xpGained: this.config.sampleXp,
    };

    result.success = true;

    if (this.config.enableLogging) {
      console.log(
        `[SurveyService] Sample: player=${player.objectId}, resource=${resourceId}, yield=${sampleYield}`
      );
    }

    return result;
  }

  /**
   * Calculate sample yield based on tool, concentration, and player skill
   * @param tool - Survey tool being used
   * @param concentration - Resource concentration at sample point
   * @param player - Player performing the sampling
   * @returns Number of units to extract
   */
  calculateSampleYield(
    tool: SurveyTool,
    concentration: number,
    player: SurveyPlayer
  ): number {
    // Get effective sample size from tool
    const effectiveSize = tool.calculateEffectiveSampleSize(player, concentration);

    // Apply server multiplier
    const yield_ = effectiveSize * this.config.sampleYieldMultiplier;

    // Add some randomness (80% to 120% of calculated yield)
    const variance = 0.8 + Math.random() * 0.4;
    const finalYield = yield_ * variance;

    return Math.max(1, Math.floor(finalYield));
  }

  // ============================================
  // Cache Management
  // ============================================

  /**
   * Cache survey results for a player
   */
  private cachePlayerSurvey(
    playerId: ObjectId,
    resourceId: bigint,
    results: SurveyResult[]
  ): void {
    let playerCache = this.playerSurveyCache.get(playerId);
    if (!playerCache) {
      playerCache = new Map();
      this.playerSurveyCache.set(playerId, playerCache);
    }
    playerCache.set(resourceId, results);
  }

  /**
   * Get cached survey results for a player
   */
  getCachedSurvey(playerId: ObjectId, resourceId: bigint): SurveyResult[] | undefined {
    const playerCache = this.playerSurveyCache.get(playerId);
    return playerCache?.get(resourceId);
  }

  /**
   * Clear cached survey results for a player
   */
  clearPlayerCache(playerId: ObjectId): void {
    this.playerSurveyCache.delete(playerId);
  }

  // ============================================
  // Waypoint Operations
  // ============================================

  /**
   * Create survey waypoint data from a survey result
   * @param result - Survey result to create waypoint from
   * @returns Waypoint data
   */
  createSurveyWaypoint(result: SurveyResult): SurveyWaypoint {
    return {
      resourceId: result.resourceId,
      resourceName: `${result.resourceName} (${result.concentration}%)`,
      x: result.position.x,
      z: result.position.z,
      concentration: result.concentration,
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get remaining survey cooldown for a player
   */
  getSurveyCooldownRemaining(playerId: ObjectId, toolCooldown: number): number {
    const lastSurvey = this.surveyCooldowns.get(playerId) ?? 0;
    return Math.max(0, toolCooldown - (Date.now() - lastSurvey));
  }

  /**
   * Get remaining sample cooldown for a player
   */
  getSampleCooldownRemaining(playerId: ObjectId): number {
    const lastSample = this.sampleCooldowns.get(playerId) ?? 0;
    return Math.max(0, DEFAULT_SAMPLE_COOLDOWN - (Date.now() - lastSample));
  }

  /**
   * Check if a resource is currently spawned
   */
  isResourceAvailable(resourceId: bigint): boolean {
    return this.resourceProvider.isSpawnActive(resourceId);
  }

  /**
   * Get configuration
   */
  getConfig(): SurveyServiceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<SurveyServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Survey Service
 * @param resourceProvider - Provider for resource spawn data
 * @param config - Optional configuration
 * @returns New Survey Service instance
 */
export function createSurveyService(
  resourceProvider: ResourceSpawnProvider,
  config?: Partial<SurveyServiceConfig>
): SurveyService {
  return new SurveyService(resourceProvider, config);
}
