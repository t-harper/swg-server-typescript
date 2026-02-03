/**
 * GCW Mechanics
 * Extended Galactic Civil War functionality including base placement,
 * invasions, NPC spawning, zone bonuses, and weekly cycles
 *
 * Handles:
 * - Base placement rules and validation
 * - Base destruction mechanics and vulnerability windows
 * - Regional invasion events
 * - Faction NPC spawning based on control level
 * - Control zone benefits and buffs
 * - Weekly GCW cycles with point decay and rewards
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  Faction,
  GCWRegionStatus,
  GCWContributionSource,
  type GCWRegion,
  type FactionBase,
  isGCWFaction,
  getOpposingFaction,
  getFactionName,
} from './faction-types.js';
import {
  GCWManager,
  type GCWRepository,
  BASE_VULNERABILITY_HOURS,
} from './gcw-manager.js';
import { FactionManager } from './faction-manager.js';
import { InvasionEvent, InvasionPhase, type InvasionConfig } from './invasion-event.js';
import { FactionNPCSpawner, type NPCSpawnerConfig } from './faction-npc-spawner.js';

// ============================================
// Constants
// ============================================

/** Minimum distance from city center for base placement (meters) */
export const MIN_DISTANCE_FROM_CITY = 500;

/** Minimum distance between faction bases (meters) */
export const MIN_DISTANCE_BETWEEN_BASES = 200;

/** Minimum distance from enemy base for placement (meters) */
export const MIN_DISTANCE_FROM_ENEMY_BASE = 300;

/** Default base health points */
export const DEFAULT_BASE_HEALTH = 100000;

/** Base damage reduction per defense rating point */
export const DEFENSE_RATING_DAMAGE_REDUCTION = 0.001;

/** Maximum defense rating a base can have */
export const MAX_DEFENSE_RATING = 500;

/** Points required to trigger an invasion */
export const INVASION_TRIGGER_THRESHOLD = 2000;

/** Control percentage change required to trigger invasion */
export const INVASION_CONTROL_CHANGE_THRESHOLD = 15;

/** Weekly point decay percentage */
export const WEEKLY_POINT_DECAY_PERCENT = 10;

/** Top contributor reward bonus multiplier */
export const TOP_CONTRIBUTOR_BONUS = 1.5;

/** Weekly cycle duration in milliseconds (7 days) */
export const WEEKLY_CYCLE_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================
// Zone Bonus Configuration
// ============================================

/**
 * Zone bonus tier thresholds
 */
export const ZONE_BONUS_TIERS = {
  /** Basic bonus at 55% control */
  TIER_1: { control: 55, xpBonus: 0.05, factionBonus: 0.10, discount: 5 },
  /** Enhanced bonus at 70% control */
  TIER_2: { control: 70, xpBonus: 0.10, factionBonus: 0.20, discount: 10 },
  /** Superior bonus at 85% control */
  TIER_3: { control: 85, xpBonus: 0.15, factionBonus: 0.30, discount: 15 },
  /** Maximum bonus at 95% control */
  TIER_4: { control: 95, xpBonus: 0.25, factionBonus: 0.50, discount: 20 },
} as const;

// ============================================
// Types
// ============================================

/**
 * Base placement validation result
 */
export interface BasePlacementValidation {
  /** Whether placement is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Warning messages (placement allowed but not ideal) */
  warnings: string[];
}

/**
 * Base defensive capabilities
 */
export interface BaseDefenses {
  /** Base ID */
  baseId: ObjectId;
  /** Current health */
  health: number;
  /** Maximum health */
  maxHealth: number;
  /** Defense rating (damage reduction) */
  defenseRating: number;
  /** Damage reduction percentage */
  damageReduction: number;
  /** Number of NPC defenders */
  npcDefenders: number;
  /** Whether base is vulnerable */
  isVulnerable: boolean;
  /** Time until vulnerability opens (ms, null if already vulnerable or not scheduled) */
  timeUntilVulnerable: number | null;
  /** Time remaining in vulnerability window (ms, null if not vulnerable) */
  vulnerabilityTimeRemaining: number | null;
  /** Turret count */
  turretCount: number;
  /** Shield strength (0-100) */
  shieldStrength: number;
}

/**
 * Zone bonuses for a player
 */
export interface ZoneBonuses {
  /** Region ID */
  regionId: string;
  /** Player's faction */
  playerFaction: Faction;
  /** Controlling faction */
  controllingFaction: Faction;
  /** Whether player's faction controls the zone */
  hasControl: boolean;
  /** XP bonus multiplier (0 = no bonus) */
  xpBonus: number;
  /** Faction point bonus multiplier */
  factionPointBonus: number;
  /** Vendor discount percentage */
  vendorDiscount: number;
  /** Respawn time reduction percentage */
  respawnReduction: number;
  /** Whether fast travel is available */
  fastTravelAvailable: boolean;
  /** Combat buff tier (0 = none, 1-4 = buff level) */
  combatBuffTier: number;
  /** Whether cloning is available */
  cloningAvailable: boolean;
}

/**
 * Weekly cycle rewards
 */
export interface WeeklyCycleRewards {
  /** Player ID */
  playerId: ObjectId;
  /** Faction */
  faction: Faction;
  /** Base reward points */
  baseReward: number;
  /** Bonus for contribution ranking */
  rankingBonus: number;
  /** Bonus for bases maintained */
  baseMaintenanceBonus: number;
  /** Total reward */
  totalReward: number;
  /** Contribution rank (1 = top contributor) */
  contributionRank: number;
  /** Total contributions this week */
  weeklyContributions: number;
}

/**
 * City location for placement validation
 */
export interface CityLocation {
  /** City name */
  name: string;
  /** Planet */
  planet: string;
  /** Center coordinates */
  center: Vector3;
  /** City radius */
  radius: number;
}

/**
 * GCW Mechanics configuration
 */
export interface GCWMechanicsConfig {
  /** Enable detailed logging */
  enableLogging: boolean;
  /** Minimum distance from city */
  minDistanceFromCity: number;
  /** Minimum distance between bases */
  minDistanceBetweenBases: number;
  /** Minimum distance from enemy base */
  minDistanceFromEnemyBase: number;
  /** Weekly point decay percentage */
  weeklyDecayPercent: number;
  /** Invasion trigger threshold */
  invasionTriggerThreshold: number;
  /** Invasion configuration */
  invasionConfig: Partial<InvasionConfig>;
  /** NPC spawner configuration */
  npcSpawnerConfig: Partial<NPCSpawnerConfig>;
}

/**
 * Default GCW Mechanics configuration
 */
export const DEFAULT_MECHANICS_CONFIG: GCWMechanicsConfig = {
  enableLogging: false,
  minDistanceFromCity: MIN_DISTANCE_FROM_CITY,
  minDistanceBetweenBases: MIN_DISTANCE_BETWEEN_BASES,
  minDistanceFromEnemyBase: MIN_DISTANCE_FROM_ENEMY_BASE,
  weeklyDecayPercent: WEEKLY_POINT_DECAY_PERCENT,
  invasionTriggerThreshold: INVASION_TRIGGER_THRESHOLD,
  invasionConfig: {},
  npcSpawnerConfig: {},
};

// ============================================
// Event Types
// ============================================

/**
 * Event emitted when an invasion starts
 */
export interface InvasionStartedEvent {
  regionId: string;
  attackingFaction: Faction;
  defendingFaction: Faction;
  timestamp: Date;
}

/**
 * Event emitted when weekly cycle resets
 */
export interface WeeklyCycleResetEvent {
  timestamp: Date;
  regionsAffected: string[];
  totalPointsDecayed: number;
}

/**
 * Event emitted when base vulnerability changes
 */
export interface BaseVulnerabilityChangedEvent {
  baseId: ObjectId;
  regionId: string;
  faction: Faction;
  isVulnerable: boolean;
  vulnerabilityStart: Date | null;
  vulnerabilityEnd: Date | null;
  timestamp: Date;
}

// ============================================
// Handler Types
// ============================================

export type InvasionStartedHandler = (event: InvasionStartedEvent) => void;
export type WeeklyCycleResetHandler = (event: WeeklyCycleResetEvent) => void;
export type BaseVulnerabilityChangedHandler = (event: BaseVulnerabilityChangedEvent) => void;

// ============================================
// GCW Mechanics Class
// ============================================

/**
 * GCW Mechanics
 * Extended functionality for Galactic Civil War mechanics
 */
export class GCWMechanics {
  private gcwManager: GCWManager;
  private factionManager: FactionManager;
  private repository: GCWRepository;
  private config: GCWMechanicsConfig;

  /** Active invasions by region */
  private activeInvasions: Map<string, InvasionEvent>;

  /** NPC spawners by region */
  private npcSpawners: Map<string, FactionNPCSpawner>;

  /** City locations for placement validation */
  private cityLocations: CityLocation[];

  /** Weekly cycle timer */
  private weeklyCycleTimer: ReturnType<typeof setInterval> | null;

  /** Last weekly reset timestamp */
  private lastWeeklyReset: Date;

  /** Event handlers */
  private invasionStartedHandlers: Set<InvasionStartedHandler>;
  private weeklyCycleResetHandlers: Set<WeeklyCycleResetHandler>;
  private baseVulnerabilityChangedHandlers: Set<BaseVulnerabilityChangedHandler>;

  /**
   * Create a new GCW Mechanics instance
   */
  constructor(
    gcwManager: GCWManager,
    factionManager: FactionManager,
    repository: GCWRepository,
    config: Partial<GCWMechanicsConfig> = {}
  ) {
    this.gcwManager = gcwManager;
    this.factionManager = factionManager;
    this.repository = repository;
    this.config = { ...DEFAULT_MECHANICS_CONFIG, ...config };

    this.activeInvasions = new Map();
    this.npcSpawners = new Map();
    this.cityLocations = [];
    this.weeklyCycleTimer = null;
    this.lastWeeklyReset = new Date();

    this.invasionStartedHandlers = new Set();
    this.weeklyCycleResetHandlers = new Set();
    this.baseVulnerabilityChangedHandlers = new Set();

    // Subscribe to GCW manager events
    this.setupEventListeners();
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the GCW mechanics system
   */
  async initialize(cityLocations: CityLocation[] = []): Promise<void> {
    this.cityLocations = cityLocations;

    // Initialize NPC spawners for all regions
    const regions = await this.gcwManager.getAllRegions();
    for (const region of regions) {
      await this.initializeRegionSpawner(region);
    }

    if (this.config.enableLogging) {
      console.log(`[GCWMechanics] Initialized with ${regions.length} regions`);
    }
  }

  /**
   * Start weekly cycle timer
   */
  startWeeklyCycle(): void {
    if (this.weeklyCycleTimer) return;

    // Calculate time until next weekly reset (every Monday 00:00 UTC)
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + (8 - now.getUTCDay()) % 7);
    nextMonday.setUTCHours(0, 0, 0, 0);

    const msUntilReset = nextMonday.getTime() - now.getTime();

    // Set up initial timer to next reset
    setTimeout(() => {
      this.processWeeklyCycle();
      // Then set up weekly interval
      this.weeklyCycleTimer = setInterval(
        () => this.processWeeklyCycle(),
        WEEKLY_CYCLE_MS
      );
    }, msUntilReset);

    if (this.config.enableLogging) {
      console.log(`[GCWMechanics] Weekly cycle started, next reset in ${Math.round(msUntilReset / 3600000)}h`);
    }
  }

  /**
   * Stop weekly cycle timer
   */
  stopWeeklyCycle(): void {
    if (this.weeklyCycleTimer) {
      clearInterval(this.weeklyCycleTimer);
      this.weeklyCycleTimer = null;
    }
  }

  /**
   * Shutdown the GCW mechanics system
   */
  shutdown(): void {
    this.stopWeeklyCycle();

    // End all active invasions
    for (const invasion of this.activeInvasions.values()) {
      invasion.forceEnd();
    }
    this.activeInvasions.clear();

    // Stop all spawners
    for (const spawner of this.npcSpawners.values()) {
      spawner.shutdown();
    }
    this.npcSpawners.clear();
  }

  // ============================================
  // Event Registration
  // ============================================

  onInvasionStarted(handler: InvasionStartedHandler): void {
    this.invasionStartedHandlers.add(handler);
  }

  offInvasionStarted(handler: InvasionStartedHandler): void {
    this.invasionStartedHandlers.delete(handler);
  }

  onWeeklyCycleReset(handler: WeeklyCycleResetHandler): void {
    this.weeklyCycleResetHandlers.add(handler);
  }

  offWeeklyCycleReset(handler: WeeklyCycleResetHandler): void {
    this.weeklyCycleResetHandlers.delete(handler);
  }

  onBaseVulnerabilityChanged(handler: BaseVulnerabilityChangedHandler): void {
    this.baseVulnerabilityChangedHandlers.add(handler);
  }

  offBaseVulnerabilityChanged(handler: BaseVulnerabilityChangedHandler): void {
    this.baseVulnerabilityChangedHandlers.delete(handler);
  }

  // ============================================
  // Event Emission
  // ============================================

  private emitInvasionStarted(event: InvasionStartedEvent): void {
    for (const handler of this.invasionStartedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[GCWMechanics] Error in invasion started handler:', error);
      }
    }
  }

  private emitWeeklyCycleReset(event: WeeklyCycleResetEvent): void {
    for (const handler of this.weeklyCycleResetHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[GCWMechanics] Error in weekly cycle reset handler:', error);
      }
    }
  }

  private emitBaseVulnerabilityChanged(event: BaseVulnerabilityChangedEvent): void {
    for (const handler of this.baseVulnerabilityChangedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[GCWMechanics] Error in base vulnerability changed handler:', error);
      }
    }
  }

  // ============================================
  // Base Placement
  // ============================================

  /**
   * Validate base placement at a position
   */
  async canPlaceBase(
    position: Vector3,
    faction: Faction,
    zoneId: string
  ): Promise<BasePlacementValidation> {
    const warnings: string[] = [];

    // Check faction is valid
    if (!isGCWFaction(faction)) {
      return {
        valid: false,
        error: 'Only Imperial and Rebel factions can place bases.',
        warnings,
      };
    }

    // Check region exists
    const region = await this.gcwManager.getRegion(zoneId);
    if (!region) {
      return {
        valid: false,
        error: `Region ${zoneId} not found.`,
        warnings,
      };
    }

    // Check distance from cities
    for (const city of this.cityLocations) {
      if (city.planet.toLowerCase() === region.planet.toLowerCase()) {
        const distance = this.calculateDistance(position, city.center);
        if (distance < this.config.minDistanceFromCity) {
          return {
            valid: false,
            error: `Too close to ${city.name}. Must be at least ${this.config.minDistanceFromCity}m from cities.`,
            warnings,
          };
        }
        if (distance < this.config.minDistanceFromCity * 1.5) {
          warnings.push(`Base is relatively close to ${city.name}.`);
        }
      }
    }

    // Get all bases in region
    const basesInRegion = await this.gcwManager.getBasesInRegion(zoneId);

    // Check distance from friendly bases
    const friendlyBases = basesInRegion.filter(b => b.faction === faction);
    for (const base of friendlyBases) {
      const distance = this.calculateDistance(position, { x: base.worldX, y: base.worldY, z: base.worldZ });
      if (distance < this.config.minDistanceBetweenBases) {
        return {
          valid: false,
          error: `Too close to friendly base. Must be at least ${this.config.minDistanceBetweenBases}m from other ${getFactionName(faction)} bases.`,
          warnings,
        };
      }
    }

    // Check distance from enemy bases
    const enemyFaction = getOpposingFaction(faction);
    const enemyBases = basesInRegion.filter(b => b.faction === enemyFaction);
    for (const base of enemyBases) {
      const distance = this.calculateDistance(position, { x: base.worldX, y: base.worldY, z: base.worldZ });
      if (distance < this.config.minDistanceFromEnemyBase) {
        return {
          valid: false,
          error: `Too close to enemy base. Must be at least ${this.config.minDistanceFromEnemyBase}m from ${getFactionName(enemyFaction)} bases.`,
          warnings,
        };
      }
      if (distance < this.config.minDistanceFromEnemyBase * 2) {
        warnings.push('Base is in contested territory near enemy installations.');
      }
    }

    // Check if region is contested
    if (region.contested) {
      warnings.push('Region is actively contested. Base may be attacked frequently.');
    }

    // Check if enemy controls the region
    if ((faction === Faction.IMPERIAL && region.status === GCWRegionStatus.REBEL_CONTROLLED) ||
        (faction === Faction.REBEL && region.status === GCWRegionStatus.IMPERIAL_CONTROLLED)) {
      warnings.push('Enemy faction controls this region. Base placement is risky.');
    }

    return {
      valid: true,
      warnings,
    };
  }

  // ============================================
  // Base Destruction
  // ============================================

  /**
   * Calculate base defensive capabilities
   */
  async calculateBaseDefenses(baseId: ObjectId): Promise<BaseDefenses | null> {
    const base = await this.repository.getBase(baseId);
    if (!base) return null;

    const now = new Date();
    let isVulnerable = false;
    let timeUntilVulnerable: number | null = null;
    let vulnerabilityTimeRemaining: number | null = null;

    if (base.vulnerabilityStart && base.vulnerabilityEnd) {
      if (now >= base.vulnerabilityStart && now <= base.vulnerabilityEnd) {
        isVulnerable = true;
        vulnerabilityTimeRemaining = base.vulnerabilityEnd.getTime() - now.getTime();
      } else if (now < base.vulnerabilityStart) {
        timeUntilVulnerable = base.vulnerabilityStart.getTime() - now.getTime();
      }
    }

    const damageReduction = Math.min(
      base.defenseRating * DEFENSE_RATING_DAMAGE_REDUCTION,
      MAX_DEFENSE_RATING * DEFENSE_RATING_DAMAGE_REDUCTION
    );

    return {
      baseId,
      health: base.health,
      maxHealth: base.maxHealth,
      defenseRating: base.defenseRating,
      damageReduction,
      npcDefenders: base.npcDefenders,
      isVulnerable,
      timeUntilVulnerable,
      vulnerabilityTimeRemaining,
      turretCount: Math.floor(base.defenseRating / 50),
      shieldStrength: Math.min(100, base.defenseRating / 5),
    };
  }

  /**
   * Process base vulnerability window
   */
  async processBaseVulnerability(baseId: ObjectId): Promise<boolean> {
    const base = await this.repository.getBase(baseId);
    if (!base) return false;

    const now = new Date();
    const wasVulnerable = base.vulnerable;

    // Check if entering vulnerability window
    if (base.vulnerabilityStart && base.vulnerabilityEnd) {
      const isNowVulnerable = now >= base.vulnerabilityStart && now <= base.vulnerabilityEnd;

      if (isNowVulnerable !== wasVulnerable) {
        base.vulnerable = isNowVulnerable;
        await this.repository.updateBase(base);

        this.emitBaseVulnerabilityChanged({
          baseId,
          regionId: base.regionId,
          faction: base.faction,
          isVulnerable: isNowVulnerable,
          vulnerabilityStart: base.vulnerabilityStart,
          vulnerabilityEnd: base.vulnerabilityEnd,
          timestamp: now,
        });

        if (this.config.enableLogging) {
          console.log(`[GCWMechanics] Base ${baseId} vulnerability changed to ${isNowVulnerable}`);
        }

        return true;
      }
    }

    return false;
  }

  /**
   * Schedule vulnerability window for a base
   */
  async scheduleVulnerabilityWindow(
    baseId: ObjectId,
    startTime: Date,
    durationHours: number = BASE_VULNERABILITY_HOURS
  ): Promise<boolean> {
    const base = await this.repository.getBase(baseId);
    if (!base) return false;

    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

    base.vulnerabilityStart = startTime;
    base.vulnerabilityEnd = endTime;
    await this.repository.updateBase(base);

    this.emitBaseVulnerabilityChanged({
      baseId,
      regionId: base.regionId,
      faction: base.faction,
      isVulnerable: false,
      vulnerabilityStart: startTime,
      vulnerabilityEnd: endTime,
      timestamp: new Date(),
    });

    return true;
  }

  // ============================================
  // Invasion Events
  // ============================================

  /**
   * Initiate an invasion event in a region
   */
  async initiateInvasion(
    regionId: string,
    attackingFaction: Faction
  ): Promise<InvasionEvent | null> {
    // Check for existing invasion
    if (this.activeInvasions.has(regionId)) {
      if (this.config.enableLogging) {
        console.log(`[GCWMechanics] Invasion already active in ${regionId}`);
      }
      return null;
    }

    const region = await this.gcwManager.getRegion(regionId);
    if (!region) return null;

    if (!isGCWFaction(attackingFaction)) return null;

    const defendingFaction = getOpposingFaction(attackingFaction);

    // Create invasion event
    const invasion = new InvasionEvent(
      regionId,
      region.name,
      attackingFaction,
      defendingFaction,
      this.config.invasionConfig
    );

    // Set up invasion event handlers
    invasion.onPhaseChange((phase, data) => {
      if (this.config.enableLogging) {
        console.log(`[GCWMechanics] Invasion in ${regionId} phase changed to ${phase}`);
      }
    });

    invasion.onComplete(async (result) => {
      await this.handleInvasionComplete(regionId, result);
    });

    // Start the invasion
    invasion.start();
    this.activeInvasions.set(regionId, invasion);

    this.emitInvasionStarted({
      regionId,
      attackingFaction,
      defendingFaction,
      timestamp: new Date(),
    });

    if (this.config.enableLogging) {
      console.log(`[GCWMechanics] Invasion started in ${regionId} by ${getFactionName(attackingFaction)}`);
    }

    return invasion;
  }

  /**
   * Get active invasion in a region
   */
  getActiveInvasion(regionId: string): InvasionEvent | undefined {
    return this.activeInvasions.get(regionId);
  }

  /**
   * Get all active invasions
   */
  getAllActiveInvasions(): InvasionEvent[] {
    return Array.from(this.activeInvasions.values());
  }

  /**
   * Handle invasion completion
   */
  private async handleInvasionComplete(
    regionId: string,
    result: { winner: Faction; attackerScore: number; defenderScore: number }
  ): Promise<void> {
    this.activeInvasions.delete(regionId);

    const region = await this.gcwManager.getRegion(regionId);
    if (!region) return;

    // Apply control changes based on invasion result
    const controlChange = 10 + Math.floor(Math.abs(result.attackerScore - result.defenderScore) / 100);

    if (result.winner === Faction.IMPERIAL) {
      region.imperialControl = Math.min(100, region.imperialControl + controlChange);
      region.rebelControl = Math.max(0, region.rebelControl - controlChange / 2);
    } else if (result.winner === Faction.REBEL) {
      region.rebelControl = Math.min(100, region.rebelControl + controlChange);
      region.imperialControl = Math.max(0, region.imperialControl - controlChange / 2);
    }

    await this.repository.updateRegion(region);

    // Update NPC spawns based on new control
    await this.updateRegionSpawner(region);

    if (this.config.enableLogging) {
      console.log(`[GCWMechanics] Invasion in ${regionId} complete. Winner: ${getFactionName(result.winner)}`);
    }
  }

  // ============================================
  // NPC Spawning
  // ============================================

  /**
   * Spawn faction NPCs in a region based on control level
   */
  async spawnFactionNPCs(regionId: string): Promise<number> {
    const spawner = this.npcSpawners.get(regionId);
    if (!spawner) {
      await this.initializeRegionSpawner(await this.gcwManager.getRegion(regionId));
      return 0;
    }

    const region = await this.gcwManager.getRegion(regionId);
    if (!region) return 0;

    // Determine controlling faction and control level
    let controllingFaction: Faction = Faction.NEUTRAL;
    let controlLevel = 0;

    if (region.status === GCWRegionStatus.IMPERIAL_CONTROLLED) {
      controllingFaction = Faction.IMPERIAL;
      controlLevel = region.imperialControl;
    } else if (region.status === GCWRegionStatus.REBEL_CONTROLLED) {
      controllingFaction = Faction.REBEL;
      controlLevel = region.rebelControl;
    } else if (region.contested) {
      // In contested regions, spawn NPCs for both factions
      controllingFaction = region.imperialControl > region.rebelControl
        ? Faction.IMPERIAL
        : Faction.REBEL;
      controlLevel = Math.max(region.imperialControl, region.rebelControl);
    }

    if (controllingFaction === Faction.NEUTRAL) return 0;

    return spawner.spawnWave(controllingFaction, controlLevel);
  }

  /**
   * Initialize NPC spawner for a region
   */
  private async initializeRegionSpawner(region: GCWRegion | undefined): Promise<void> {
    if (!region) return;

    const spawner = new FactionNPCSpawner(
      region.regionId,
      region.planet,
      this.config.npcSpawnerConfig
    );

    this.npcSpawners.set(region.regionId, spawner);
  }

  /**
   * Update NPC spawner based on control changes
   */
  private async updateRegionSpawner(region: GCWRegion): Promise<void> {
    const spawner = this.npcSpawners.get(region.regionId);
    if (!spawner) return;

    // Despawn NPCs if control changed significantly
    let newControllingFaction: Faction = Faction.NEUTRAL;
    if (region.status === GCWRegionStatus.IMPERIAL_CONTROLLED) {
      newControllingFaction = Faction.IMPERIAL;
    } else if (region.status === GCWRegionStatus.REBEL_CONTROLLED) {
      newControllingFaction = Faction.REBEL;
    }

    spawner.handleControlChange(newControllingFaction);
  }

  // ============================================
  // Zone Bonuses
  // ============================================

  /**
   * Get zone bonuses for a player in a zone
   */
  async getZoneBonuses(playerId: ObjectId, zoneId: string): Promise<ZoneBonuses | null> {
    const region = await this.gcwManager.getRegion(zoneId);
    if (!region) return null;

    const playerData = await this.factionManager.getPlayerData(playerId);
    const playerFaction = playerData.currentFaction;

    // Determine controlling faction
    let controllingFaction: Faction = Faction.NEUTRAL;
    let controlLevel = 0;

    if (region.status === GCWRegionStatus.IMPERIAL_CONTROLLED) {
      controllingFaction = Faction.IMPERIAL;
      controlLevel = region.imperialControl;
    } else if (region.status === GCWRegionStatus.REBEL_CONTROLLED) {
      controllingFaction = Faction.REBEL;
      controlLevel = region.rebelControl;
    }

    const hasControl = isGCWFaction(playerFaction) && playerFaction === controllingFaction;

    // Calculate bonuses based on control level
    let xpBonus = 0;
    let factionPointBonus = 0;
    let vendorDiscount = 0;
    let combatBuffTier = 0;

    if (hasControl) {
      if (controlLevel >= ZONE_BONUS_TIERS.TIER_4.control) {
        xpBonus = ZONE_BONUS_TIERS.TIER_4.xpBonus;
        factionPointBonus = ZONE_BONUS_TIERS.TIER_4.factionBonus;
        vendorDiscount = ZONE_BONUS_TIERS.TIER_4.discount;
        combatBuffTier = 4;
      } else if (controlLevel >= ZONE_BONUS_TIERS.TIER_3.control) {
        xpBonus = ZONE_BONUS_TIERS.TIER_3.xpBonus;
        factionPointBonus = ZONE_BONUS_TIERS.TIER_3.factionBonus;
        vendorDiscount = ZONE_BONUS_TIERS.TIER_3.discount;
        combatBuffTier = 3;
      } else if (controlLevel >= ZONE_BONUS_TIERS.TIER_2.control) {
        xpBonus = ZONE_BONUS_TIERS.TIER_2.xpBonus;
        factionPointBonus = ZONE_BONUS_TIERS.TIER_2.factionBonus;
        vendorDiscount = ZONE_BONUS_TIERS.TIER_2.discount;
        combatBuffTier = 2;
      } else if (controlLevel >= ZONE_BONUS_TIERS.TIER_1.control) {
        xpBonus = ZONE_BONUS_TIERS.TIER_1.xpBonus;
        factionPointBonus = ZONE_BONUS_TIERS.TIER_1.factionBonus;
        vendorDiscount = ZONE_BONUS_TIERS.TIER_1.discount;
        combatBuffTier = 1;
      }
    }

    return {
      regionId: zoneId,
      playerFaction,
      controllingFaction,
      hasControl,
      xpBonus,
      factionPointBonus,
      vendorDiscount,
      respawnReduction: hasControl ? Math.floor(controlLevel / 5) : 0,
      fastTravelAvailable: hasControl && controlLevel >= 70,
      combatBuffTier,
      cloningAvailable: hasControl && controlLevel >= 60,
    };
  }

  // ============================================
  // Weekly Cycle
  // ============================================

  /**
   * Process weekly GCW cycle
   */
  async processWeeklyCycle(): Promise<void> {
    const now = new Date();
    const regions = await this.gcwManager.getAllRegions();
    const regionsAffected: string[] = [];
    let totalPointsDecayed = 0;

    for (const region of regions) {
      // Apply decay to control percentages
      const decayAmount = region.imperialControl * (this.config.weeklyDecayPercent / 100) +
                         region.rebelControl * (this.config.weeklyDecayPercent / 100);

      region.imperialControl = Math.max(0, region.imperialControl * (1 - this.config.weeklyDecayPercent / 100));
      region.rebelControl = Math.max(0, region.rebelControl * (1 - this.config.weeklyDecayPercent / 100));

      totalPointsDecayed += decayAmount;
      regionsAffected.push(region.regionId);

      await this.repository.updateRegion(region);

      // Update spawner based on potential control change
      await this.updateRegionSpawner(region);
    }

    // Reset weekly contributions
    await this.repository.resetWeeklyContributions();

    this.lastWeeklyReset = now;

    this.emitWeeklyCycleReset({
      timestamp: now,
      regionsAffected,
      totalPointsDecayed,
    });

    if (this.config.enableLogging) {
      console.log(`[GCWMechanics] Weekly cycle processed. ${regionsAffected.length} regions affected.`);
    }
  }

  /**
   * Calculate weekly rewards for a player
   */
  async calculateWeeklyRewards(playerId: ObjectId): Promise<WeeklyCycleRewards | null> {
    const playerData = await this.factionManager.getPlayerData(playerId);
    if (!isGCWFaction(playerData.currentFaction)) return null;

    const faction = playerData.currentFaction;
    const weeklyContributions = playerData.weeklyGCWPoints;

    // Get player's rank among contributors
    // This would need to query all players' contributions - simplified here
    const contributionRank = 1; // Placeholder

    // Calculate rewards
    let baseReward = Math.floor(weeklyContributions * 0.1);
    let rankingBonus = 0;

    if (contributionRank <= 10) {
      rankingBonus = Math.floor(baseReward * TOP_CONTRIBUTOR_BONUS);
    } else if (contributionRank <= 50) {
      rankingBonus = Math.floor(baseReward * 0.5);
    } else if (contributionRank <= 100) {
      rankingBonus = Math.floor(baseReward * 0.25);
    }

    // Base maintenance bonus
    const regions = await this.gcwManager.getAllRegions();
    let baseMaintenanceBonus = 0;
    for (const region of regions) {
      const bases = await this.repository.getBasesByFaction(region.regionId, faction);
      for (const base of bases) {
        if (base.ownerId === playerId) {
          baseMaintenanceBonus += 50;
        }
      }
    }

    const totalReward = baseReward + rankingBonus + baseMaintenanceBonus;

    return {
      playerId,
      faction,
      baseReward,
      rankingBonus,
      baseMaintenanceBonus,
      totalReward,
      contributionRank,
      weeklyContributions,
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Calculate distance between two points
   */
  private calculateDistance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Set up event listeners for GCW manager
   */
  private setupEventListeners(): void {
    // Listen for region control changes to potentially trigger invasions
    this.gcwManager.onRegionControlChanged(async (event) => {
      const controlChange = Math.abs(
        (event.imperialControl - event.rebelControl) -
        (event.previousStatus === GCWRegionStatus.IMPERIAL_CONTROLLED ? 10 : -10)
      );

      if (controlChange >= INVASION_CONTROL_CHANGE_THRESHOLD) {
        // Determine attacking faction
        const attackingFaction = event.newStatus === GCWRegionStatus.REBEL_CONTROLLED ||
                                 (event.newStatus === GCWRegionStatus.CONTESTED && event.rebelControl > event.imperialControl)
          ? Faction.REBEL
          : Faction.IMPERIAL;

        // Consider initiating an invasion
        if (!this.activeInvasions.has(event.regionId)) {
          if (this.config.enableLogging) {
            console.log(`[GCWMechanics] Control change threshold reached in ${event.regionId}, considering invasion`);
          }
        }
      }

      // Update NPC spawner
      const region = await this.gcwManager.getRegion(event.regionId);
      if (region) {
        await this.updateRegionSpawner(region);
      }
    });
  }

  /**
   * Get last weekly reset timestamp
   */
  getLastWeeklyReset(): Date {
    return this.lastWeeklyReset;
  }

  /**
   * Get time until next weekly reset (ms)
   */
  getTimeUntilNextReset(): number {
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + (8 - now.getUTCDay()) % 7);
    nextMonday.setUTCHours(0, 0, 0, 0);
    return nextMonday.getTime() - now.getTime();
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new GCW Mechanics instance
 */
export function createGCWMechanics(
  gcwManager: GCWManager,
  factionManager: FactionManager,
  repository: GCWRepository,
  config?: Partial<GCWMechanicsConfig>
): GCWMechanics {
  return new GCWMechanics(gcwManager, factionManager, repository, config);
}
