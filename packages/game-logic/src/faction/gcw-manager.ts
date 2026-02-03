/**
 * GCW Manager
 * Manages the Galactic Civil War regional control system
 *
 * Handles:
 * - Regional control percentages
 * - Zone control mechanics
 * - Base destruction and defense
 * - GCW point contributions
 * - Regional bonuses for controlling faction
 * - Weekly decay and reset mechanics
 */

import type { ObjectId } from '@swg/shared-types';
import {
  Faction,
  GCWRegionStatus,
  GCWContributionSource,
  WEEKLY_CONTROL_DECAY_PERCENT,
  type GCWRegion,
  type GCWContribution,
  type FactionBase,
  isGCWFaction,
  getOpposingFaction,
  getFactionName,
  calculateControlPercentage,
} from './faction-types.js';

// ============================================
// Constants
// ============================================

/** Minimum control percentage to claim a region */
export const CONTROL_THRESHOLD_PERCENT = 55;

/** Points required to flip control of a contested region */
export const CONTESTED_FLIP_THRESHOLD = 1000;

/** Base passive GCW point contribution per tick */
export const BASE_PASSIVE_CONTRIBUTION = 10;

/** Points awarded for base destruction */
export const BASE_DESTRUCTION_POINTS = 500;

/** Points awarded for successful base defense */
export const BASE_DEFENSE_POINTS = 250;

/** Base vulnerability window duration (hours) */
export const BASE_VULNERABILITY_HOURS = 3;

/** Time between passive contribution ticks (ms) */
export const PASSIVE_TICK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/** Maximum bases per region per faction */
export const MAX_BASES_PER_REGION = 10;

// ============================================
// Configuration
// ============================================

/**
 * GCW manager configuration
 */
export interface GCWManagerConfig {
  /** Enable detailed logging */
  enableLogging: boolean;
  /** Control threshold percentage */
  controlThreshold: number;
  /** Weekly decay percentage */
  weeklyDecayPercent: number;
  /** Base passive contribution per tick */
  basePassiveContribution: number;
  /** Points for base destruction */
  baseDestructionPoints: number;
  /** Points for base defense */
  baseDefensePoints: number;
}

/**
 * Default GCW manager configuration
 */
export const DEFAULT_GCW_CONFIG: GCWManagerConfig = {
  enableLogging: false,
  controlThreshold: CONTROL_THRESHOLD_PERCENT,
  weeklyDecayPercent: WEEKLY_CONTROL_DECAY_PERCENT,
  basePassiveContribution: BASE_PASSIVE_CONTRIBUTION,
  baseDestructionPoints: BASE_DESTRUCTION_POINTS,
  baseDefensePoints: BASE_DEFENSE_POINTS,
};

// ============================================
// Result Types
// ============================================

/**
 * Result of a GCW operation
 */
export interface GCWOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Informational message */
  message?: string;
}

/**
 * Result of contributing GCW points
 */
export interface ContributionResult extends GCWOperationResult {
  /** Points contributed */
  pointsContributed?: number;
  /** New regional control percentage for faction */
  newControlPercent?: number;
  /** Whether this caused a region flip */
  regionFlipped?: boolean;
  /** New region status if flipped */
  newRegionStatus?: GCWRegionStatus;
}

/**
 * Result of placing a base
 */
export interface BasePlacementResult extends GCWOperationResult {
  /** The placed base */
  base?: FactionBase;
}

/**
 * Result of destroying a base
 */
export interface BaseDestructionResult extends GCWOperationResult {
  /** Points awarded for destruction */
  pointsAwarded?: number;
  /** The destroyed base */
  destroyedBase?: FactionBase;
}

/**
 * Regional bonus information
 */
export interface RegionalBonus {
  /** Region the bonus applies to */
  regionId: string;
  /** Faction receiving the bonus */
  faction: Faction;
  /** XP bonus multiplier (1.0 = no bonus) */
  xpMultiplier: number;
  /** Faction point bonus multiplier */
  factionPointMultiplier: number;
  /** Vendor discount percentage */
  vendorDiscount: number;
  /** Whether fast travel is available */
  fastTravelAvailable: boolean;
  /** Respawn time reduction percentage */
  respawnReduction: number;
}

// ============================================
// Event Types
// ============================================

/**
 * Event emitted when a region's control changes
 */
export interface RegionControlChangedEvent {
  regionId: string;
  previousStatus: GCWRegionStatus;
  newStatus: GCWRegionStatus;
  imperialControl: number;
  rebelControl: number;
  timestamp: Date;
}

/**
 * Event emitted when a base is placed
 */
export interface BasePlacedEvent {
  base: FactionBase;
  regionId: string;
  timestamp: Date;
}

/**
 * Event emitted when a base is destroyed
 */
export interface BaseDestroyedEvent {
  base: FactionBase;
  regionId: string;
  destroyerId: ObjectId;
  timestamp: Date;
}

/**
 * Event emitted when GCW points are contributed
 */
export interface GCWPointsContributedEvent {
  playerId: ObjectId;
  regionId: string;
  faction: Faction;
  points: number;
  source: GCWContributionSource;
  timestamp: Date;
}

// ============================================
// Handler Types
// ============================================

export type RegionControlChangedHandler = (event: RegionControlChangedEvent) => void;
export type BasePlacedHandler = (event: BasePlacedEvent) => void;
export type BaseDestroyedHandler = (event: BaseDestroyedEvent) => void;
export type GCWPointsContributedHandler = (event: GCWPointsContributedEvent) => void;

// ============================================
// Repository Interface
// ============================================

/**
 * Expected interface for GCW data repository
 */
export interface GCWRepository {
  /** Get all GCW regions */
  getAllRegions(): Promise<GCWRegion[]>;

  /** Get a specific region */
  getRegion(regionId: string): Promise<GCWRegion | undefined>;

  /** Update a region */
  updateRegion(region: GCWRegion): Promise<void>;

  /** Get all bases in a region */
  getBasesInRegion(regionId: string): Promise<FactionBase[]>;

  /** Get bases by faction in a region */
  getBasesByFaction(regionId: string, faction: Faction): Promise<FactionBase[]>;

  /** Get a specific base */
  getBase(baseId: ObjectId): Promise<FactionBase | undefined>;

  /** Create a new base */
  createBase(base: Omit<FactionBase, 'baseId'>): Promise<FactionBase>;

  /** Update a base */
  updateBase(base: FactionBase): Promise<void>;

  /** Delete a base */
  deleteBase(baseId: ObjectId): Promise<void>;

  /** Record a GCW contribution */
  recordContribution(contribution: Omit<GCWContribution, 'timestamp'>): Promise<void>;

  /** Get total contributions for a region by faction */
  getRegionContributions(regionId: string, faction: Faction): Promise<number>;

  /** Get player contributions for a region */
  getPlayerContributions(playerId: ObjectId, regionId: string): Promise<number>;

  /** Get top contributors for a region */
  getTopContributors(regionId: string, faction: Faction, limit: number): Promise<Array<{ playerId: ObjectId; points: number }>>;

  /** Reset weekly contributions */
  resetWeeklyContributions(): Promise<void>;
}

// ============================================
// GCW Manager Class
// ============================================

/**
 * GCW Manager
 * Manages the Galactic Civil War regional control system
 */
export class GCWManager {
  private repository: GCWRepository;
  private config: GCWManagerConfig;

  /** Cached regions */
  private regionCache: Map<string, GCWRegion>;

  /** Event handlers */
  private regionControlChangedHandlers: Set<RegionControlChangedHandler>;
  private basePlacedHandlers: Set<BasePlacedHandler>;
  private baseDestroyedHandlers: Set<BaseDestroyedHandler>;
  private pointsContributedHandlers: Set<GCWPointsContributedHandler>;

  /** Passive tick interval handle */
  private passiveTickInterval: ReturnType<typeof setInterval> | null;

  /**
   * Create a new GCW Manager
   */
  constructor(
    repository: GCWRepository,
    config: Partial<GCWManagerConfig> = {}
  ) {
    this.repository = repository;
    this.config = { ...DEFAULT_GCW_CONFIG, ...config };
    this.regionCache = new Map();
    this.regionControlChangedHandlers = new Set();
    this.basePlacedHandlers = new Set();
    this.baseDestroyedHandlers = new Set();
    this.pointsContributedHandlers = new Set();
    this.passiveTickInterval = null;
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the GCW manager and load regions
   */
  async initialize(): Promise<void> {
    const regions = await this.repository.getAllRegions();
    for (const region of regions) {
      this.regionCache.set(region.regionId, region);
    }

    if (this.config.enableLogging) {
      console.log(`[GCWManager] Initialized with ${regions.length} regions`);
    }
  }

  /**
   * Start passive contribution ticks
   */
  startPassiveTicks(): void {
    if (this.passiveTickInterval) return;

    this.passiveTickInterval = setInterval(
      () => this.processPassiveTick(),
      PASSIVE_TICK_INTERVAL_MS
    );

    if (this.config.enableLogging) {
      console.log('[GCWManager] Started passive contribution ticks');
    }
  }

  /**
   * Stop passive contribution ticks
   */
  stopPassiveTicks(): void {
    if (this.passiveTickInterval) {
      clearInterval(this.passiveTickInterval);
      this.passiveTickInterval = null;
    }
  }

  /**
   * Shutdown the GCW manager
   */
  shutdown(): void {
    this.stopPassiveTicks();
    this.regionCache.clear();
  }

  // ============================================
  // Event Registration
  // ============================================

  onRegionControlChanged(handler: RegionControlChangedHandler): void {
    this.regionControlChangedHandlers.add(handler);
  }

  offRegionControlChanged(handler: RegionControlChangedHandler): void {
    this.regionControlChangedHandlers.delete(handler);
  }

  onBasePlaced(handler: BasePlacedHandler): void {
    this.basePlacedHandlers.add(handler);
  }

  offBasePlaced(handler: BasePlacedHandler): void {
    this.basePlacedHandlers.delete(handler);
  }

  onBaseDestroyed(handler: BaseDestroyedHandler): void {
    this.baseDestroyedHandlers.add(handler);
  }

  offBaseDestroyed(handler: BaseDestroyedHandler): void {
    this.baseDestroyedHandlers.delete(handler);
  }

  onPointsContributed(handler: GCWPointsContributedHandler): void {
    this.pointsContributedHandlers.add(handler);
  }

  offPointsContributed(handler: GCWPointsContributedHandler): void {
    this.pointsContributedHandlers.delete(handler);
  }

  // ============================================
  // Event Emission
  // ============================================

  private emitRegionControlChanged(event: RegionControlChangedEvent): void {
    for (const handler of this.regionControlChangedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[GCWManager] Error in region control changed handler:', error);
      }
    }
  }

  private emitBasePlaced(event: BasePlacedEvent): void {
    for (const handler of this.basePlacedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[GCWManager] Error in base placed handler:', error);
      }
    }
  }

  private emitBaseDestroyed(event: BaseDestroyedEvent): void {
    for (const handler of this.baseDestroyedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[GCWManager] Error in base destroyed handler:', error);
      }
    }
  }

  private emitPointsContributed(event: GCWPointsContributedEvent): void {
    for (const handler of this.pointsContributedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[GCWManager] Error in points contributed handler:', error);
      }
    }
  }

  // ============================================
  // Region Access
  // ============================================

  /**
   * Get a region by ID
   */
  async getRegion(regionId: string): Promise<GCWRegion | undefined> {
    let region = this.regionCache.get(regionId);
    if (!region) {
      region = await this.repository.getRegion(regionId);
      if (region) {
        this.regionCache.set(regionId, region);
      }
    }
    return region;
  }

  /**
   * Get all regions
   */
  async getAllRegions(): Promise<GCWRegion[]> {
    return Array.from(this.regionCache.values());
  }

  /**
   * Get regions by planet
   */
  async getRegionsByPlanet(planet: string): Promise<GCWRegion[]> {
    return Array.from(this.regionCache.values()).filter(
      (r) => r.planet.toLowerCase() === planet.toLowerCase()
    );
  }

  /**
   * Get contested regions
   */
  async getContestedRegions(): Promise<GCWRegion[]> {
    return Array.from(this.regionCache.values()).filter((r) => r.contested);
  }

  /**
   * Get regions controlled by a faction
   */
  async getRegionsControlledBy(faction: Faction): Promise<GCWRegion[]> {
    return Array.from(this.regionCache.values()).filter((r) => {
      if (faction === Faction.IMPERIAL) {
        return r.status === GCWRegionStatus.IMPERIAL_CONTROLLED;
      }
      if (faction === Faction.REBEL) {
        return r.status === GCWRegionStatus.REBEL_CONTROLLED;
      }
      return r.status === GCWRegionStatus.NEUTRAL;
    });
  }

  // ============================================
  // GCW Contributions
  // ============================================

  /**
   * Contribute GCW points to a region
   */
  async contributePoints(
    playerId: ObjectId,
    regionId: string,
    faction: Faction,
    points: number,
    source: GCWContributionSource
  ): Promise<ContributionResult> {
    if (!isGCWFaction(faction)) {
      return {
        success: false,
        error: 'Only Imperial and Rebel factions can contribute to GCW.',
      };
    }

    if (points <= 0) {
      return {
        success: false,
        error: 'Points must be positive.',
      };
    }

    const region = await this.getRegion(regionId);
    if (!region) {
      return {
        success: false,
        error: `Region ${regionId} not found.`,
      };
    }

    // Record the contribution
    await this.repository.recordContribution({
      playerId,
      regionId,
      faction,
      points,
      source,
    });

    // Update region control
    const previousStatus = region.status;

    if (faction === Faction.IMPERIAL) {
      region.imperialControl = Math.min(100, region.imperialControl + points / 100);
      region.rebelControl = Math.max(0, region.rebelControl - points / 200);
    } else {
      region.rebelControl = Math.min(100, region.rebelControl + points / 100);
      region.imperialControl = Math.max(0, region.imperialControl - points / 200);
    }

    region.totalPointsContributed += points;
    region.lastUpdate = new Date();

    // Determine new status
    const newStatus = this.calculateRegionStatus(region);
    region.status = newStatus;
    region.contested = newStatus === GCWRegionStatus.CONTESTED;

    this.regionCache.set(regionId, region);
    await this.repository.updateRegion(region);

    if (this.config.enableLogging) {
      console.log(
        `[GCWManager] ${getFactionName(faction)} contributed ${points} points to ${regionId} (${source})`
      );
    }

    this.emitPointsContributed({
      playerId,
      regionId,
      faction,
      points,
      source,
      timestamp: new Date(),
    });

    // Check for region flip
    const regionFlipped = previousStatus !== newStatus;
    if (regionFlipped) {
      this.emitRegionControlChanged({
        regionId,
        previousStatus,
        newStatus,
        imperialControl: region.imperialControl,
        rebelControl: region.rebelControl,
        timestamp: new Date(),
      });
    }

    return {
      success: true,
      pointsContributed: points,
      newControlPercent: faction === Faction.IMPERIAL ? region.imperialControl : region.rebelControl,
      regionFlipped,
      newRegionStatus: newStatus,
      message: `You contributed ${points} GCW points to ${region.name}.`,
    };
  }

  /**
   * Calculate region status based on control percentages
   */
  private calculateRegionStatus(region: GCWRegion): GCWRegionStatus {
    const threshold = this.config.controlThreshold;

    if (region.imperialControl >= threshold && region.rebelControl < threshold) {
      return GCWRegionStatus.IMPERIAL_CONTROLLED;
    }
    if (region.rebelControl >= threshold && region.imperialControl < threshold) {
      return GCWRegionStatus.REBEL_CONTROLLED;
    }
    if (region.imperialControl >= 25 && region.rebelControl >= 25) {
      return GCWRegionStatus.CONTESTED;
    }
    return GCWRegionStatus.NEUTRAL;
  }

  // ============================================
  // Base Management
  // ============================================

  /**
   * Place a faction base
   */
  async placeBase(
    ownerId: ObjectId,
    faction: Faction,
    regionId: string,
    worldX: number,
    worldY: number,
    worldZ: number,
    guildId?: ObjectId
  ): Promise<BasePlacementResult> {
    if (!isGCWFaction(faction)) {
      return {
        success: false,
        error: 'Only Imperial and Rebel factions can place bases.',
      };
    }

    const region = await this.getRegion(regionId);
    if (!region) {
      return {
        success: false,
        error: `Region ${regionId} not found.`,
      };
    }

    // Check base limit
    const factionBases = await this.repository.getBasesByFaction(regionId, faction);
    if (factionBases.length >= MAX_BASES_PER_REGION) {
      return {
        success: false,
        error: `Maximum bases per region (${MAX_BASES_PER_REGION}) reached.`,
      };
    }

    // Create the base
    const base = await this.repository.createBase({
      faction,
      regionId,
      ownerId,
      guildId,
      health: 100000,
      maxHealth: 100000,
      vulnerable: false,
      vulnerabilityStart: null,
      vulnerabilityEnd: null,
      gcwPointsContribution: this.config.basePassiveContribution,
      defenseRating: 100,
      npcDefenders: 10,
      placedAt: new Date(),
      worldX,
      worldY,
      worldZ,
    });

    // Update region base count
    if (faction === Faction.IMPERIAL) {
      region.imperialBases++;
    } else {
      region.rebelBases++;
    }
    await this.repository.updateRegion(region);
    this.regionCache.set(regionId, region);

    if (this.config.enableLogging) {
      console.log(`[GCWManager] Base placed in ${regionId} by ${ownerId}`);
    }

    this.emitBasePlaced({
      base,
      regionId,
      timestamp: new Date(),
    });

    return {
      success: true,
      base,
      message: 'Base has been placed successfully.',
    };
  }

  /**
   * Destroy a faction base
   */
  async destroyBase(baseId: ObjectId, destroyerId: ObjectId): Promise<BaseDestructionResult> {
    const base = await this.repository.getBase(baseId);
    if (!base) {
      return {
        success: false,
        error: 'Base not found.',
      };
    }

    const region = await this.getRegion(base.regionId);
    if (!region) {
      return {
        success: false,
        error: 'Region not found.',
      };
    }

    // Delete the base
    await this.repository.deleteBase(baseId);

    // Update region base count
    if (base.faction === Faction.IMPERIAL) {
      region.imperialBases = Math.max(0, region.imperialBases - 1);
    } else {
      region.rebelBases = Math.max(0, region.rebelBases - 1);
    }
    await this.repository.updateRegion(region);
    this.regionCache.set(base.regionId, region);

    if (this.config.enableLogging) {
      console.log(`[GCWManager] Base ${baseId} destroyed by ${destroyerId}`);
    }

    this.emitBaseDestroyed({
      base,
      regionId: base.regionId,
      destroyerId,
      timestamp: new Date(),
    });

    return {
      success: true,
      pointsAwarded: this.config.baseDestructionPoints,
      destroyedBase: base,
      message: `You destroyed an enemy base and earned ${this.config.baseDestructionPoints} GCW points!`,
    };
  }

  /**
   * Damage a base
   */
  async damageBase(baseId: ObjectId, damage: number): Promise<boolean> {
    const base = await this.repository.getBase(baseId);
    if (!base) return false;

    base.health = Math.max(0, base.health - damage);
    await this.repository.updateBase(base);

    return base.health <= 0;
  }

  /**
   * Repair a base
   */
  async repairBase(baseId: ObjectId, repairAmount: number): Promise<boolean> {
    const base = await this.repository.getBase(baseId);
    if (!base) return false;

    base.health = Math.min(base.maxHealth, base.health + repairAmount);
    await this.repository.updateBase(base);

    return true;
  }

  /**
   * Set base vulnerability window
   */
  async setBaseVulnerability(
    baseId: ObjectId,
    vulnerabilityStart: Date,
    durationHours: number = BASE_VULNERABILITY_HOURS
  ): Promise<boolean> {
    const base = await this.repository.getBase(baseId);
    if (!base) return false;

    base.vulnerabilityStart = vulnerabilityStart;
    base.vulnerabilityEnd = new Date(vulnerabilityStart.getTime() + durationHours * 60 * 60 * 1000);
    await this.repository.updateBase(base);

    return true;
  }

  /**
   * Check if base is currently vulnerable
   */
  async isBaseVulnerable(baseId: ObjectId): Promise<boolean> {
    const base = await this.repository.getBase(baseId);
    if (!base) return false;

    if (!base.vulnerabilityStart || !base.vulnerabilityEnd) return false;

    const now = new Date();
    return now >= base.vulnerabilityStart && now <= base.vulnerabilityEnd;
  }

  /**
   * Get bases in a region
   */
  async getBasesInRegion(regionId: string): Promise<FactionBase[]> {
    return this.repository.getBasesInRegion(regionId);
  }

  // ============================================
  // Regional Bonuses
  // ============================================

  /**
   * Get regional bonuses for a faction in a region
   */
  async getRegionalBonus(regionId: string, faction: Faction): Promise<RegionalBonus | null> {
    const region = await this.getRegion(regionId);
    if (!region) return null;

    // Check if faction controls the region
    const controlsFaction =
      (faction === Faction.IMPERIAL && region.status === GCWRegionStatus.IMPERIAL_CONTROLLED) ||
      (faction === Faction.REBEL && region.status === GCWRegionStatus.REBEL_CONTROLLED);

    if (!controlsFaction) {
      return {
        regionId,
        faction,
        xpMultiplier: 1.0,
        factionPointMultiplier: 1.0,
        vendorDiscount: 0,
        fastTravelAvailable: false,
        respawnReduction: 0,
      };
    }

    // Calculate bonus based on control percentage
    const controlPercent =
      faction === Faction.IMPERIAL ? region.imperialControl : region.rebelControl;

    // Higher control = better bonuses
    const bonusMultiplier = Math.min(1.0, (controlPercent - this.config.controlThreshold) / 45);

    return {
      regionId,
      faction,
      xpMultiplier: 1.0 + bonusMultiplier * 0.25, // Up to 25% XP bonus
      factionPointMultiplier: 1.0 + bonusMultiplier * 0.5, // Up to 50% faction point bonus
      vendorDiscount: Math.floor(bonusMultiplier * 15), // Up to 15% discount
      fastTravelAvailable: controlPercent >= 70, // Fast travel at 70%+ control
      respawnReduction: Math.floor(bonusMultiplier * 30), // Up to 30% respawn reduction
    };
  }

  // ============================================
  // Weekly Mechanics
  // ============================================

  /**
   * Apply weekly decay to all regions
   */
  async applyWeeklyDecay(): Promise<void> {
    const regions = await this.getAllRegions();
    const decayMultiplier = 1 - this.config.weeklyDecayPercent / 100;

    for (const region of regions) {
      const previousStatus = region.status;

      // Apply decay to both factions
      region.imperialControl = Math.max(0, region.imperialControl * decayMultiplier);
      region.rebelControl = Math.max(0, region.rebelControl * decayMultiplier);

      // Recalculate status
      region.status = this.calculateRegionStatus(region);
      region.contested = region.status === GCWRegionStatus.CONTESTED;
      region.lastUpdate = new Date();

      await this.repository.updateRegion(region);
      this.regionCache.set(region.regionId, region);

      if (previousStatus !== region.status) {
        this.emitRegionControlChanged({
          regionId: region.regionId,
          previousStatus,
          newStatus: region.status,
          imperialControl: region.imperialControl,
          rebelControl: region.rebelControl,
          timestamp: new Date(),
        });
      }
    }

    // Reset weekly contributions
    await this.repository.resetWeeklyContributions();

    if (this.config.enableLogging) {
      console.log('[GCWManager] Applied weekly decay to all regions');
    }
  }

  /**
   * Process passive contribution tick
   */
  private async processPassiveTick(): Promise<void> {
    const regions = await this.getAllRegions();

    for (const region of regions) {
      // Get all bases in the region
      const bases = await this.repository.getBasesInRegion(region.regionId);

      // Calculate contributions from bases
      let imperialContribution = 0;
      let rebelContribution = 0;

      for (const base of bases) {
        if (base.health > 0) {
          if (base.faction === Faction.IMPERIAL) {
            imperialContribution += base.gcwPointsContribution;
          } else {
            rebelContribution += base.gcwPointsContribution;
          }
        }
      }

      // Apply contributions
      if (imperialContribution > 0) {
        region.imperialControl = Math.min(100, region.imperialControl + imperialContribution / 100);
      }
      if (rebelContribution > 0) {
        region.rebelControl = Math.min(100, region.rebelControl + rebelContribution / 100);
      }

      if (imperialContribution > 0 || rebelContribution > 0) {
        region.totalPointsContributed += imperialContribution + rebelContribution;
        region.lastUpdate = new Date();

        const previousStatus = region.status;
        region.status = this.calculateRegionStatus(region);
        region.contested = region.status === GCWRegionStatus.CONTESTED;

        await this.repository.updateRegion(region);
        this.regionCache.set(region.regionId, region);

        if (previousStatus !== region.status) {
          this.emitRegionControlChanged({
            regionId: region.regionId,
            previousStatus,
            newStatus: region.status,
            imperialControl: region.imperialControl,
            rebelControl: region.rebelControl,
            timestamp: new Date(),
          });
        }
      }
    }
  }

  // ============================================
  // Leaderboards
  // ============================================

  /**
   * Get top contributors for a region
   */
  async getTopContributors(
    regionId: string,
    faction: Faction,
    limit: number = 10
  ): Promise<Array<{ playerId: ObjectId; points: number }>> {
    return this.repository.getTopContributors(regionId, faction, limit);
  }

  /**
   * Get player's contributions to a region
   */
  async getPlayerContributions(playerId: ObjectId, regionId: string): Promise<number> {
    return this.repository.getPlayerContributions(playerId, regionId);
  }

  // ============================================
  // Cache Management
  // ============================================

  /**
   * Clear the region cache
   */
  clearCache(): void {
    this.regionCache.clear();
  }

  /**
   * Refresh a region from the repository
   */
  async refreshRegion(regionId: string): Promise<void> {
    const region = await this.repository.getRegion(regionId);
    if (region) {
      this.regionCache.set(regionId, region);
    } else {
      this.regionCache.delete(regionId);
    }
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new GCW Manager instance
 */
export function createGCWManager(
  repository: GCWRepository,
  config?: Partial<GCWManagerConfig>
): GCWManager {
  return new GCWManager(repository, config);
}
