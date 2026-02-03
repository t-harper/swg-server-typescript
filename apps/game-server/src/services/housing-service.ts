/**
 * Housing Service
 * Manages player housing, structure placement validation, and lot management
 *
 * This service handles:
 * - Lot allocation and tracking per player
 * - Structure placement validation (terrain, proximity, no-build zones)
 * - Building lifecycle (place, pack, destroy)
 * - City placement restrictions
 * - Integration with BuildingObject and CellObject
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  BuildingObject,
  BuildingType,
  CellObject,
  generateObjectId,
} from '@swg/objects';
import {
  type Lot,
  type PlacementValidationResult,
  type HousingLimits,
  type DeedTemplate,
  type NoBuildRegion,
  PlacementErrorCode,
  getPlacementErrorMessage,
  NO_BUILD_REGIONS,
  LOT_DISTANCE,
  STRUCTURE_MIN_DISTANCE,
  MAX_TERRAIN_SLOPE,
  HOUSING_ALLOWED_PLANETS,
  LOT_COSTS_BY_TYPE,
} from './housing-types.js';
import {
  calculateTotalLots,
  calculateUsedLots,
  getLotCost,
  performLotCalculation,
  type LotCalculationResult,
  type PlayerSkills,
} from './lot-calculator.js';

/**
 * Structure placement callback
 */
export type StructurePlacedCallback = (
  playerId: ObjectId,
  building: BuildingObject
) => void;

/**
 * Structure removal callback
 */
export type StructureRemovedCallback = (
  playerId: ObjectId,
  structureId: ObjectId,
  reason: 'packed' | 'destroyed'
) => void;

/**
 * Housing service options
 */
export interface HousingServiceOptions {
  /** Additional no-build regions to add to defaults */
  additionalNoBuildRegions?: NoBuildRegion[];
  /** Override default structure min distance */
  structureMinDistance?: number;
  /** Enable terrain validation */
  enableTerrainValidation?: boolean;
  /** Terrain height provider function */
  getTerrainHeight?: (planetId: string, x: number, z: number) => number;
  /** Terrain slope provider function */
  getTerrainSlope?: (planetId: string, x: number, z: number) => number;
  /** City lookup function - returns city ID if position is in a city */
  getCityAtPosition?: (planetId: string, x: number, z: number) => ObjectId | null;
  /** Get all structures near a position */
  getStructuresNear?: (
    planetId: string,
    x: number,
    z: number,
    radius: number
  ) => BuildingObject[];
}

/**
 * Result of a structure placement operation
 */
export interface PlaceStructureResult {
  success: boolean;
  building?: BuildingObject;
  errorCode?: PlacementErrorCode;
  errorMessage?: string;
}

/**
 * Result of a structure pack/destroy operation
 */
export interface StructureOperationResult {
  success: boolean;
  deedId?: ObjectId;
  errorMessage?: string;
}

/**
 * Housing Service
 * Central service for managing player housing and lots
 */
export class HousingService {
  /** Lots owned by each player */
  private readonly playerLots: Map<ObjectId, Set<Lot>>;

  /** Structures indexed by ID */
  private readonly structures: Map<ObjectId, BuildingObject>;

  /** Structures indexed by owner */
  private readonly structuresByOwner: Map<ObjectId, Set<ObjectId>>;

  /** Player skills cache (for lot calculation) */
  private readonly playerSkills: Map<ObjectId, Set<string>>;

  /** No-build regions */
  private readonly noBuildRegions: NoBuildRegion[];

  /** Configuration options */
  private readonly options: HousingServiceOptions;

  /** Structure min distance */
  private readonly structureMinDistance: number;

  /** Structure placed callbacks */
  private readonly placedCallbacks: Set<StructurePlacedCallback>;

  /** Structure removed callbacks */
  private readonly removedCallbacks: Set<StructureRemovedCallback>;

  /** Initialization flag */
  private initialized: boolean = false;

  constructor(options: HousingServiceOptions = {}) {
    this.playerLots = new Map();
    this.structures = new Map();
    this.structuresByOwner = new Map();
    this.playerSkills = new Map();
    this.placedCallbacks = new Set();
    this.removedCallbacks = new Set();
    this.options = options;

    this.structureMinDistance = options.structureMinDistance ?? STRUCTURE_MIN_DISTANCE;

    // Combine default no-build regions with any additional ones
    this.noBuildRegions = [
      ...NO_BUILD_REGIONS,
      ...(options.additionalNoBuildRegions ?? []),
    ];
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the housing service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[HousingService] Initializing...');

    this.initialized = true;
    console.log(
      `[HousingService] Initialized with ${this.noBuildRegions.length} no-build regions`
    );
  }

  /**
   * Shutdown the housing service
   */
  async shutdown(): Promise<void> {
    console.log('[HousingService] Shutting down...');

    this.playerLots.clear();
    this.structures.clear();
    this.structuresByOwner.clear();
    this.playerSkills.clear();
    this.placedCallbacks.clear();
    this.removedCallbacks.clear();
    this.initialized = false;

    console.log('[HousingService] Shutdown complete');
  }

  // ============================================
  // Player Skills Cache
  // ============================================

  /**
   * Update a player's skills (for lot calculation)
   */
  updatePlayerSkills(playerId: ObjectId, skills: Set<string>): void {
    this.playerSkills.set(playerId, new Set(skills));
  }

  /**
   * Get a player's cached skills
   */
  getPlayerSkills(playerId: ObjectId): Set<string> {
    return this.playerSkills.get(playerId) ?? new Set();
  }

  // ============================================
  // Lot Management
  // ============================================

  /**
   * Get all lots owned by a player
   */
  getPlayerLots(playerId: ObjectId): Lot[] {
    const lots = this.playerLots.get(playerId);
    return lots ? Array.from(lots) : [];
  }

  /**
   * Calculate available lots for a player
   */
  getAvailableLots(playerId: ObjectId): number {
    const skills = this.getPlayerSkills(playerId);
    const totalLots = calculateTotalLots(skills);
    const usedLots = this.getUsedLots(playerId);
    return Math.max(0, totalLots - usedLots);
  }

  /**
   * Calculate lots currently in use by a player
   */
  getUsedLots(playerId: ObjectId): number {
    const lots = this.getPlayerLots(playerId);
    return calculateUsedLots(lots);
  }

  /**
   * Get full lot calculation for a player
   */
  getLotCalculation(playerId: ObjectId): LotCalculationResult {
    const skills = this.getPlayerSkills(playerId);
    const lots = this.getPlayerLots(playerId);
    return performLotCalculation(skills, lots);
  }

  /**
   * Get housing limits for a player
   */
  getHousingLimits(playerId: ObjectId): HousingLimits {
    const skills = this.getPlayerSkills(playerId);
    const totalLots = calculateTotalLots(skills);

    // Find skills that grant extra lots
    const extraLotSkills: string[] = [];
    for (const skill of skills) {
      if (skill.includes('architect') || skill.includes('politician')) {
        extraLotSkills.push(skill);
      }
    }

    return {
      maxLots: totalLots,
      maxStructures: totalLots, // In SWG, max structures = max lots
      extraLotSkills,
    };
  }

  /**
   * Reserve a lot at a position
   */
  reserveLot(
    playerId: ObjectId,
    position: Vector3,
    planetId: string
  ): { success: boolean; lot?: Lot; errorMessage?: string } {
    // Check lot availability
    const available = this.getAvailableLots(playerId);
    if (available <= 0) {
      return {
        success: false,
        errorMessage: 'You do not have any available lots',
      };
    }

    // Create lot
    const lot: Lot = {
      ownerId: playerId,
      position: { ...position },
      planetId,
      reservedAt: new Date(),
    };

    // Add to player's lots
    if (!this.playerLots.has(playerId)) {
      this.playerLots.set(playerId, new Set());
    }
    this.playerLots.get(playerId)!.add(lot);

    console.log(
      `[HousingService] Reserved lot for player ${playerId} at ` +
      `(${position.x}, ${position.z}) on ${planetId}`
    );

    return { success: true, lot };
  }

  /**
   * Release a lot at a position
   */
  releaseLot(playerId: ObjectId, position: Vector3, planetId: string): boolean {
    const lots = this.playerLots.get(playerId);
    if (!lots) {
      return false;
    }

    // Find matching lot
    for (const lot of lots) {
      if (
        lot.planetId === planetId &&
        Math.abs(lot.position.x - position.x) < 1 &&
        Math.abs(lot.position.z - position.z) < 1
      ) {
        lots.delete(lot);
        console.log(
          `[HousingService] Released lot for player ${playerId} at ` +
          `(${position.x}, ${position.z}) on ${planetId}`
        );
        return true;
      }
    }

    return false;
  }

  // ============================================
  // Placement Validation
  // ============================================

  /**
   * Full validation for structure placement
   */
  validatePlacement(
    playerId: ObjectId,
    deedTemplate: DeedTemplate,
    position: Vector3,
    planetId: string
  ): PlacementValidationResult {
    // Check planet is allowed
    if (!HOUSING_ALLOWED_PLANETS.includes(planetId)) {
      return {
        valid: false,
        errorCode: PlacementErrorCode.InvalidPlanet,
        errorMessage: getPlacementErrorMessage(PlacementErrorCode.InvalidPlanet),
      };
    }

    // Check deed-specific planet restrictions
    if (
      deedTemplate.allowedPlanets &&
      deedTemplate.allowedPlanets.length > 0 &&
      !deedTemplate.allowedPlanets.includes(planetId)
    ) {
      return {
        valid: false,
        errorCode: PlacementErrorCode.InvalidPlanet,
        errorMessage: getPlacementErrorMessage(PlacementErrorCode.InvalidPlanet),
      };
    }

    // Check lot availability
    const lotCheck = this.checkLotAvailability(playerId, deedTemplate.lotCost);
    if (!lotCheck.valid) {
      return lotCheck;
    }

    // Check no-build zones
    const noBuildCheck = this.checkNoBuildZones(position, planetId);
    if (!noBuildCheck.valid) {
      return noBuildCheck;
    }

    // Check proximity to other structures
    const proximityCheck = this.checkProximity(position, planetId);
    if (!proximityCheck.valid) {
      return proximityCheck;
    }

    // Check city restrictions
    const cityCheck = this.checkCityRestrictions(
      position,
      planetId,
      deedTemplate.isCivicStructure ?? false
    );
    if (!cityCheck.valid) {
      return cityCheck;
    }

    // Check terrain suitability
    const terrainCheck = this.checkTerrainSuitability(
      position,
      planetId,
      deedTemplate.buildingType
    );
    if (!terrainCheck.valid) {
      return terrainCheck;
    }

    // Check required skill
    if (deedTemplate.requiredSkill) {
      const skills = this.getPlayerSkills(playerId);
      if (!skills.has(deedTemplate.requiredSkill)) {
        return {
          valid: false,
          errorCode: PlacementErrorCode.MissingSkill,
          errorMessage: getPlacementErrorMessage(PlacementErrorCode.MissingSkill),
        };
      }
    }

    return {
      valid: true,
      errorCode: PlacementErrorCode.Success,
    };
  }

  /**
   * Check if player has enough lots for the structure
   */
  checkLotAvailability(
    playerId: ObjectId,
    lotCost: number
  ): PlacementValidationResult {
    const available = this.getAvailableLots(playerId);

    if (available < lotCost) {
      return {
        valid: false,
        errorCode: PlacementErrorCode.NoLots,
        errorMessage: `You need ${lotCost} lots but only have ${available} available`,
      };
    }

    return {
      valid: true,
      errorCode: PlacementErrorCode.Success,
    };
  }

  /**
   * Check terrain suitability for structure placement
   */
  checkTerrainSuitability(
    position: Vector3,
    planetId: string,
    structureType: BuildingType
  ): PlacementValidationResult {
    // Skip if terrain validation is disabled
    if (!this.options.enableTerrainValidation) {
      return {
        valid: true,
        errorCode: PlacementErrorCode.Success,
      };
    }

    // Check slope if slope provider is available
    if (this.options.getTerrainSlope) {
      const slope = this.options.getTerrainSlope(planetId, position.x, position.z);

      if (slope > MAX_TERRAIN_SLOPE) {
        return {
          valid: false,
          errorCode: PlacementErrorCode.TerrainNotSuitable,
          errorMessage: `Terrain slope (${slope.toFixed(1)} degrees) is too steep`,
        };
      }
    }

    return {
      valid: true,
      errorCode: PlacementErrorCode.Success,
    };
  }

  /**
   * Check proximity to other structures
   */
  checkProximity(
    position: Vector3,
    planetId: string
  ): PlacementValidationResult {
    // If structure provider is not available, skip check
    if (!this.options.getStructuresNear) {
      return {
        valid: true,
        errorCode: PlacementErrorCode.Success,
      };
    }

    const nearbyStructures = this.options.getStructuresNear(
      planetId,
      position.x,
      position.z,
      LOT_DISTANCE
    );

    for (const structure of nearbyStructures) {
      const dx = structure.position.x - position.x;
      const dz = structure.position.z - position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < this.structureMinDistance) {
        return {
          valid: false,
          errorCode: PlacementErrorCode.TooCloseToStructure,
          errorMessage: `Too close to ${structure.getBuildingTypeName()}`,
        };
      }
    }

    return {
      valid: true,
      errorCode: PlacementErrorCode.Success,
    };
  }

  /**
   * Check if position is in a no-build zone
   */
  checkNoBuildZones(
    position: Vector3,
    planetId: string
  ): PlacementValidationResult {
    for (const region of this.noBuildRegions) {
      if (region.planetId !== planetId) {
        continue;
      }

      if (this.isInNoBuildRegion(position, region)) {
        return {
          valid: false,
          errorCode: PlacementErrorCode.InNoBuildZone,
          errorMessage: `Cannot build near ${region.reason}`,
        };
      }
    }

    return {
      valid: true,
      errorCode: PlacementErrorCode.Success,
    };
  }

  /**
   * Check if a position is within a no-build region
   */
  private isInNoBuildRegion(position: Vector3, region: NoBuildRegion): boolean {
    if (region.type === 'circle') {
      const dx = position.x - region.center.x;
      const dz = position.z - region.center.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      return distance < region.radius;
    } else if (region.type === 'rectangle') {
      return (
        position.x >= region.min.x &&
        position.x <= region.max.x &&
        position.z >= region.min.z &&
        position.z <= region.max.z
      );
    }
    return false;
  }

  /**
   * Check city placement restrictions
   */
  checkCityRestrictions(
    position: Vector3,
    planetId: string,
    isCivicStructure: boolean
  ): PlacementValidationResult {
    // If city lookup is not available, skip check
    if (!this.options.getCityAtPosition) {
      return {
        valid: true,
        errorCode: PlacementErrorCode.Success,
      };
    }

    const cityId = this.options.getCityAtPosition(planetId, position.x, position.z);

    // Civic structures must be placed in a city
    if (isCivicStructure && !cityId) {
      return {
        valid: false,
        errorCode: PlacementErrorCode.TooFarFromCity,
        errorMessage: getPlacementErrorMessage(PlacementErrorCode.TooFarFromCity),
      };
    }

    // Non-civic structures cannot be placed in city limits (unless owned by mayor)
    // This is a simplified check - full implementation would check ownership
    // For now, we allow placement in cities
    return {
      valid: true,
      errorCode: PlacementErrorCode.Success,
    };
  }

  // ============================================
  // Structure Lifecycle
  // ============================================

  /**
   * Place a structure at a position
   */
  placeStructure(
    playerId: ObjectId,
    deedId: ObjectId,
    deedTemplate: DeedTemplate,
    position: Vector3,
    orientation: { x: number; y: number; z: number; w: number },
    planetId: string,
    playerName: string
  ): PlaceStructureResult {
    // Validate placement
    const validation = this.validatePlacement(playerId, deedTemplate, position, planetId);
    if (!validation.valid) {
      return {
        success: false,
        errorCode: validation.errorCode,
        errorMessage: validation.errorMessage,
      };
    }

    // Reserve lot
    const lotResult = this.reserveLot(playerId, position, planetId);
    if (!lotResult.success) {
      return {
        success: false,
        errorCode: PlacementErrorCode.NoLots,
        errorMessage: lotResult.errorMessage,
      };
    }

    // Associate structure ID with lot
    const lot = lotResult.lot!;

    // Create building object
    const buildingId = generateObjectId();
    const building = new BuildingObject(buildingId, deedTemplate.templateCrc);

    // Configure building
    building.setBuildingType(deedTemplate.buildingType);
    building.setOwner(playerId, playerName);
    building.deedId = deedId;
    building.lotCost = deedTemplate.lotCost;
    building.setPosition(position.x, position.y, position.z);
    building.setOrientation(orientation.x, orientation.y, orientation.z, orientation.w);
    building.sceneId = planetId;
    building.placedAt = new Date();

    // Update lot with structure reference
    lot.structureId = buildingId;

    // Register structure
    this.structures.set(buildingId, building);
    if (!this.structuresByOwner.has(playerId)) {
      this.structuresByOwner.set(playerId, new Set());
    }
    this.structuresByOwner.get(playerId)!.add(buildingId);

    console.log(
      `[HousingService] Placed ${building.getBuildingTypeName()} for player ${playerId} ` +
      `at (${position.x}, ${position.z}) on ${planetId}`
    );

    // Emit callback
    this.emitStructurePlaced(playerId, building);

    return {
      success: true,
      building,
    };
  }

  /**
   * Pack a structure back into a deed
   */
  packStructure(
    structureId: ObjectId,
    playerId: ObjectId
  ): StructureOperationResult {
    const building = this.structures.get(structureId);
    if (!building) {
      return {
        success: false,
        errorMessage: 'Structure not found',
      };
    }

    // Check ownership
    if (!building.isOwner(playerId)) {
      return {
        success: false,
        errorMessage: 'You do not own this structure',
      };
    }

    // Check if structure can be packed
    const packResult = building.pack();
    if (!packResult.success) {
      return {
        success: false,
        errorMessage: packResult.message,
      };
    }

    // Release lot
    this.releaseLot(playerId, building.position, building.sceneId);

    // Unregister structure
    this.structures.delete(structureId);
    const ownerStructures = this.structuresByOwner.get(playerId);
    if (ownerStructures) {
      ownerStructures.delete(structureId);
    }

    console.log(
      `[HousingService] Packed structure ${structureId} for player ${playerId}`
    );

    // Emit callback
    this.emitStructureRemoved(playerId, structureId, 'packed');

    return {
      success: true,
      deedId: building.deedId,
    };
  }

  /**
   * Destroy a structure
   */
  destroyStructure(
    structureId: ObjectId,
    playerId: ObjectId
  ): StructureOperationResult {
    const building = this.structures.get(structureId);
    if (!building) {
      return {
        success: false,
        errorMessage: 'Structure not found',
      };
    }

    // Check ownership
    if (!building.isOwner(playerId)) {
      return {
        success: false,
        errorMessage: 'You do not own this structure',
      };
    }

    // Check if structure can be destroyed
    const destroyResult = building.destroy();
    if (!destroyResult.success) {
      return {
        success: false,
        errorMessage: destroyResult.message,
      };
    }

    // Release lot
    this.releaseLot(playerId, building.position, building.sceneId);

    // Unregister structure
    this.structures.delete(structureId);
    const ownerStructures = this.structuresByOwner.get(playerId);
    if (ownerStructures) {
      ownerStructures.delete(structureId);
    }

    console.log(
      `[HousingService] Destroyed structure ${structureId} for player ${playerId}`
    );

    // Emit callback
    this.emitStructureRemoved(playerId, structureId, 'destroyed');

    return {
      success: true,
    };
  }

  // ============================================
  // Structure Queries
  // ============================================

  /**
   * Get a structure by ID
   */
  getStructure(structureId: ObjectId): BuildingObject | undefined {
    return this.structures.get(structureId);
  }

  /**
   * Get all structures owned by a player
   */
  getPlayerStructures(playerId: ObjectId): BuildingObject[] {
    const structureIds = this.structuresByOwner.get(playerId);
    if (!structureIds) {
      return [];
    }

    const result: BuildingObject[] = [];
    for (const id of structureIds) {
      const building = this.structures.get(id);
      if (building) {
        result.push(building);
      }
    }
    return result;
  }

  /**
   * Get structure count for a player
   */
  getPlayerStructureCount(playerId: ObjectId): number {
    return this.structuresByOwner.get(playerId)?.size ?? 0;
  }

  /**
   * Check if a player owns a specific structure
   */
  isStructureOwner(structureId: ObjectId, playerId: ObjectId): boolean {
    const building = this.structures.get(structureId);
    return building?.isOwner(playerId) ?? false;
  }

  // ============================================
  // Callbacks
  // ============================================

  /**
   * Register callback for structure placement
   */
  onStructurePlaced(callback: StructurePlacedCallback): void {
    this.placedCallbacks.add(callback);
  }

  /**
   * Unregister structure placed callback
   */
  offStructurePlaced(callback: StructurePlacedCallback): void {
    this.placedCallbacks.delete(callback);
  }

  /**
   * Register callback for structure removal
   */
  onStructureRemoved(callback: StructureRemovedCallback): void {
    this.removedCallbacks.add(callback);
  }

  /**
   * Unregister structure removed callback
   */
  offStructureRemoved(callback: StructureRemovedCallback): void {
    this.removedCallbacks.delete(callback);
  }

  /**
   * Emit structure placed event
   */
  private emitStructurePlaced(playerId: ObjectId, building: BuildingObject): void {
    for (const callback of this.placedCallbacks) {
      try {
        callback(playerId, building);
      } catch (error) {
        console.error('[HousingService] Error in placed callback:', error);
      }
    }
  }

  /**
   * Emit structure removed event
   */
  private emitStructureRemoved(
    playerId: ObjectId,
    structureId: ObjectId,
    reason: 'packed' | 'destroyed'
  ): void {
    for (const callback of this.removedCallbacks) {
      try {
        callback(playerId, structureId, reason);
      } catch (error) {
        console.error('[HousingService] Error in removed callback:', error);
      }
    }
  }

  // ============================================
  // No-Build Zone Management
  // ============================================

  /**
   * Add a no-build region dynamically
   * Useful for player cities and temporary events
   */
  addNoBuildRegion(region: NoBuildRegion): void {
    this.noBuildRegions.push(region);
    console.log(
      `[HousingService] Added no-build region: ${region.reason} on ${region.planetId}`
    );
  }

  /**
   * Remove a no-build region
   */
  removeNoBuildRegion(planetId: string, reason: string): boolean {
    const index = this.noBuildRegions.findIndex(
      (r) => r.planetId === planetId && r.reason === reason
    );

    if (index !== -1) {
      this.noBuildRegions.splice(index, 1);
      console.log(
        `[HousingService] Removed no-build region: ${reason} on ${planetId}`
      );
      return true;
    }

    return false;
  }

  /**
   * Get all no-build regions for a planet
   */
  getNoBuildRegions(planetId: string): NoBuildRegion[] {
    return this.noBuildRegions.filter((r) => r.planetId === planetId);
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get housing service statistics
   */
  getStats(): {
    totalStructures: number;
    totalPlayers: number;
    structuresByType: Map<BuildingType, number>;
    structuresByPlanet: Map<string, number>;
  } {
    const structuresByType = new Map<BuildingType, number>();
    const structuresByPlanet = new Map<string, number>();

    for (const building of this.structures.values()) {
      // Count by type
      const typeCount = structuresByType.get(building.buildingType) ?? 0;
      structuresByType.set(building.buildingType, typeCount + 1);

      // Count by planet
      const planetCount = structuresByPlanet.get(building.sceneId) ?? 0;
      structuresByPlanet.set(building.sceneId, planetCount + 1);
    }

    return {
      totalStructures: this.structures.size,
      totalPlayers: this.structuresByOwner.size,
      structuresByType,
      structuresByPlanet,
    };
  }
}

/**
 * Create a new HousingService instance
 */
export function createHousingService(
  options?: HousingServiceOptions
): HousingService {
  return new HousingService(options);
}

/**
 * Singleton instance for global access
 */
let globalHousingService: HousingService | null = null;

/**
 * Get or create the global housing service instance
 */
export function getHousingService(
  options?: HousingServiceOptions
): HousingService {
  if (!globalHousingService) {
    globalHousingService = new HousingService(options);
  }
  return globalHousingService;
}

// Re-export types for convenience
export type {
  Lot,
  PlacementValidationResult,
  HousingLimits,
  DeedTemplate,
  NoBuildRegion,
  LotCalculationResult,
  PlayerSkills,
};

export {
  PlacementErrorCode,
  getPlacementErrorMessage,
  LOT_DISTANCE,
  STRUCTURE_MIN_DISTANCE,
};
