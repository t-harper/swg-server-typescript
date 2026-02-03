/**
 * HarvesterInstallation - Resource extractors players can place in the world
 * Extends TangibleObject with properties for automated resource harvesting.
 *
 * SWG harvesters are player-placed installations that:
 * - Automatically extract resources from the ground over time
 * - Require power and maintenance to operate
 * - Store extracted resources in a hopper until collected
 * - Have different types for different resource categories
 * - Extract at rates based on BER (Base Extraction Rate) and local concentration
 *
 * Baseline Types:
 * - TANO3/6: Base tangible properties (inherited from TangibleObject)
 * - INST3/6: Installation-specific properties (harvester data)
 */

import type { ObjectId, CrcValue, Vector3 } from '@swg/shared-types';
import { TangibleObject } from './tangible-object.js';
import { ObjectType } from './scene-object.js';
import { DeltaTracker, DeltaType } from './deltas.js';
import {
  HarvesterType,
  HarvesterSize,
  BerTier,
  HarvesterResultCode,
  type HarvesterResultCodeType,
  HOPPER_CAPACITIES,
  BASE_EXTRACTION_RATES,
  POWER_COSTS,
  MAINTENANCE_COSTS,
  DEFAULT_POWER_POOLS,
  DEFAULT_MAINTENANCE_POOLS,
  EXTRACTION_TICK_INTERVAL,
  MAINTENANCE_TICK_INTERVAL,
  getHarvesterTypeName,
  getHarvesterSizeName,
  canHarvestResourceClass,
  calculateEffectiveExtractionRate,
} from './harvester-types.js';

// Re-export types for convenience
export {
  HarvesterType,
  HarvesterSize,
  BerTier,
  HarvesterResultCode,
  type HarvesterResultCodeType,
} from './harvester-types.js';

/**
 * INST property indices for delta tracking (Baseline 3 - shared)
 */
export const InstProperty = {
  // Installation shared properties
  HARVESTER_TYPE: 0,
  HARVESTER_SIZE: 1,
  OWNER_ID: 2,
  INSTALLED_AT: 3,
  POSITION: 4,
  PLANET_ID: 5,
  HOPPER_CAPACITY: 6,
  BASE_EXTRACTION_RATE: 7,
  BER_TIER: 8,
  MAINTENANCE_COST: 9,
  POWER_COST: 10,
  IS_ACTIVE: 11,
  CUSTOM_NAME: 12,
} as const;

/**
 * INST property indices for delta tracking (Baseline 6 - server)
 */
export const InstProperty6 = {
  // Installation server properties
  ACTIVE_RESOURCE: 0,
  HOPPER_CONTENTS: 1,
  MAINTENANCE_POOL: 2,
  POWER_POOL: 3,
  LAST_EXTRACTION_TIME: 4,
  LAST_MAINTENANCE_TIME: 5,
  EXTRACTION_PROGRESS: 6,
} as const;

/**
 * Interface for hopper content entry
 */
export interface HopperContentEntry {
  resourceId: bigint;
  quantity: number;
}

/**
 * Interface for resource manager access
 * This allows the harvester to query concentration without direct dependency
 */
export interface ResourceManagerAccess {
  /** Get concentration at a specific position for a resource */
  getConcentrationAt(resourceId: bigint, x: number, z: number): number | null;
  /** Get interpolated concentration (smoother) */
  getInterpolatedConcentrationAt?(resourceId: bigint, x: number, z: number): number | null;
  /** Get resource spawn by ID */
  getResourceById?(resourceId: bigint): { resourceInstance: { resourceClass: { classId: string } } } | undefined;
}

/**
 * Interface for inventory/container access for collecting hopper contents
 */
export interface InventoryAccess {
  /** Add resources to character inventory */
  addResource(characterId: ObjectId, resourceId: bigint, quantity: number): boolean;
  /** Check if character can receive resources */
  canReceiveResource(characterId: ObjectId, resourceId: bigint, quantity: number): boolean;
}

/**
 * Result of a harvester operation
 */
export interface HarvesterOperationResult {
  success: boolean;
  code: HarvesterResultCodeType;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * HarvesterInstallation - Player-placed resource extractor
 */
export class HarvesterInstallation extends TangibleObject {
  // ============================================
  // Core Harvester Properties
  // ============================================

  /** Unique harvester ID (same as objectId typically) */
  harvesterId: ObjectId;

  /** Owner character ID */
  ownerId: ObjectId;

  /** Type of harvester (determines resource types it can extract) */
  harvesterType: HarvesterType;

  /** Size classification (affects capacity and extraction rate) */
  harvesterSize: HarvesterSize;

  /** When the harvester was installed/placed */
  installedAt: Date;

  /** World position of the harvester */
  position: Vector3;

  /** Planet/zone where the harvester is placed */
  planetId: string;

  // ============================================
  // Resource Extraction Properties
  // ============================================

  /** Currently harvested resource ID (null if not harvesting) */
  activeResource: bigint | null;

  /** Resources stored in hopper (resourceId -> quantity) */
  hopperContents: Map<bigint, number>;

  /** Maximum hopper capacity (units) */
  hopperCapacity: number;

  /** Base extraction rate (units per tick before modifiers) */
  extractionRate: number;

  /** Base Extraction Rate tier (1-4, affects actual extraction rate) */
  berTier: BerTier;

  // ============================================
  // Maintenance and Power Properties
  // ============================================

  /** Current maintenance credits in pool */
  maintenancePool: number;

  /** Maintenance cost per cycle (credits) */
  maintenanceCost: number;

  /** Current power units remaining */
  powerPool: number;

  /** Power cost per extraction cycle */
  powerCost: number;

  // ============================================
  // State Properties
  // ============================================

  /** Whether the harvester is currently active (extracting) */
  isActive: boolean;

  /** Timestamp of last extraction cycle */
  lastExtractionTime: number;

  /** Timestamp of last maintenance deduction */
  lastMaintenanceTime: number;

  /** Partial extraction progress (accumulates between ticks) */
  extractionProgress: number;

  // ============================================
  // Delta Tracking
  // ============================================

  /** Delta tracker for INST baseline 3 (shared) */
  private deltaTrackerInst3: DeltaTracker;

  /** Delta tracker for INST baseline 6 (server) */
  private deltaTrackerInst6: DeltaTracker;

  /** Update counter for hopper contents list */
  private hopperUpdateCounter: number;

  /**
   * Create a new HarvesterInstallation
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the object template
   */
  constructor(objectId: ObjectId, templateCrc: CrcValue = 0) {
    super(objectId, templateCrc);

    this.objectType = ObjectType.Installation;
    this.harvesterId = objectId;

    // Initialize core properties
    this.ownerId = 0n;
    this.harvesterType = HarvesterType.Mineral;
    this.harvesterSize = HarvesterSize.Small;
    this.installedAt = new Date();
    this.position = { x: 0, y: 0, z: 0 };
    this.planetId = '';

    // Initialize extraction properties with defaults for small harvester
    this.activeResource = null;
    this.hopperContents = new Map();
    this.hopperCapacity = HOPPER_CAPACITIES[HarvesterSize.Small];
    this.extractionRate = BASE_EXTRACTION_RATES[HarvesterSize.Small];
    this.berTier = BerTier.Basic;

    // Initialize maintenance and power with defaults
    this.maintenancePool = DEFAULT_MAINTENANCE_POOLS[HarvesterSize.Small];
    this.maintenanceCost = MAINTENANCE_COSTS[HarvesterSize.Small];
    this.powerPool = DEFAULT_POWER_POOLS[HarvesterSize.Small];
    this.powerCost = POWER_COSTS[HarvesterSize.Small];

    // Initialize state
    this.isActive = false;
    this.lastExtractionTime = 0;
    this.lastMaintenanceTime = Date.now();
    this.extractionProgress = 0;

    // Initialize delta trackers
    this.deltaTrackerInst3 = new DeltaTracker();
    this.deltaTrackerInst6 = new DeltaTracker();
    this.hopperUpdateCounter = 0;
  }

  /**
   * Get baseline type for harvester objects
   */
  override getBaselineType(): string {
    return 'INST';
  }

  // ============================================
  // Harvester Type Management
  // ============================================

  /**
   * Set the harvester type
   */
  setHarvesterType(type: HarvesterType): void {
    if (this.harvesterType !== type) {
      this.harvesterType = type;
      this.deltaTrackerInst3.trackChange(InstProperty.HARVESTER_TYPE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set the harvester size and update related properties
   */
  setHarvesterSize(size: HarvesterSize): void {
    if (this.harvesterSize !== size) {
      this.harvesterSize = size;

      // Update size-dependent properties
      this.hopperCapacity = HOPPER_CAPACITIES[size];
      this.extractionRate = BASE_EXTRACTION_RATES[size];
      this.powerCost = POWER_COSTS[size];
      this.maintenanceCost = MAINTENANCE_COSTS[size];

      this.deltaTrackerInst3.trackChange(InstProperty.HARVESTER_SIZE, DeltaType.Change);
      this.deltaTrackerInst3.trackChange(InstProperty.HOPPER_CAPACITY, DeltaType.Change);
      this.deltaTrackerInst3.trackChange(InstProperty.BASE_EXTRACTION_RATE, DeltaType.Change);
      this.deltaTrackerInst3.trackChange(InstProperty.POWER_COST, DeltaType.Change);
      this.deltaTrackerInst3.trackChange(InstProperty.MAINTENANCE_COST, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set the BER tier
   */
  setBerTier(tier: BerTier): void {
    if (this.berTier !== tier) {
      this.berTier = tier;
      this.deltaTrackerInst3.trackChange(InstProperty.BER_TIER, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Get the display name for this harvester type
   */
  getHarvesterTypeName(): string {
    return getHarvesterTypeName(this.harvesterType);
  }

  /**
   * Get the display name for this harvester size
   */
  getHarvesterSizeName(): string {
    return getHarvesterSizeName(this.harvesterSize);
  }

  // ============================================
  // Placement Management
  // ============================================

  /**
   * Install the harvester at a position
   */
  install(
    position: Vector3,
    planetId: string,
    ownerId: ObjectId
  ): void {
    this.position = { ...position };
    this.planetId = planetId;
    this.ownerId = ownerId;
    this.installedAt = new Date();

    // Update the scene object position
    this.setPosition(position.x, position.y, position.z);

    // Track changes
    this.deltaTrackerInst3.trackChange(InstProperty.POSITION, DeltaType.Change);
    this.deltaTrackerInst3.trackChange(InstProperty.PLANET_ID, DeltaType.Change);
    this.deltaTrackerInst3.trackChange(InstProperty.OWNER_ID, DeltaType.Change);
    this.deltaTrackerInst3.trackChange(InstProperty.INSTALLED_AT, DeltaType.Change);

    this.markModified();
  }

  /**
   * Check if the harvester is installed
   */
  isInstalled(): boolean {
    return this.ownerId !== 0n && this.planetId !== '';
  }

  /**
   * Get the installation position
   */
  getPosition(): Vector3 {
    return { ...this.position };
  }

  // ============================================
  // Activation/Deactivation
  // ============================================

  /**
   * Activate the harvester to start extracting a specific resource
   * @param resourceId - The resource to extract
   * @param resourceManager - Optional resource manager for validation
   */
  activate(
    resourceId: bigint,
    resourceManager?: ResourceManagerAccess
  ): HarvesterOperationResult {
    // Check if already active
    if (this.isActive) {
      return {
        success: false,
        code: HarvesterResultCode.AlreadyActive,
        message: 'Harvester is already active',
      };
    }

    // Check power
    if (this.powerPool < this.powerCost) {
      return {
        success: false,
        code: HarvesterResultCode.NoPower,
        message: 'Insufficient power to activate harvester',
      };
    }

    // Check maintenance
    if (this.maintenancePool < this.maintenanceCost) {
      return {
        success: false,
        code: HarvesterResultCode.NoMaintenance,
        message: 'Insufficient maintenance to activate harvester',
      };
    }

    // Validate resource if resource manager is provided
    if (resourceManager) {
      const spawn = resourceManager.getResourceById?.(resourceId);
      if (!spawn) {
        return {
          success: false,
          code: HarvesterResultCode.ResourceNotFound,
          message: 'Resource not found',
        };
      }

      // Check if harvester type matches resource type
      const resourceClass = spawn.resourceInstance.resourceClass.classId;
      if (!canHarvestResourceClass(this.harvesterType, resourceClass)) {
        return {
          success: false,
          code: HarvesterResultCode.InvalidResourceType,
          message: `This harvester cannot extract ${resourceClass}`,
        };
      }

      // Check concentration at position
      const concentration = resourceManager.getConcentrationAt(
        resourceId,
        this.position.x,
        this.position.z
      );
      if (concentration === null || concentration <= 0) {
        return {
          success: false,
          code: HarvesterResultCode.ResourceNotFound,
          message: 'No extractable concentration at this location',
        };
      }
    }

    // Activate
    this.activeResource = resourceId;
    this.isActive = true;
    this.lastExtractionTime = Date.now();
    this.extractionProgress = 0;

    this.deltaTrackerInst3.trackChange(InstProperty.IS_ACTIVE, DeltaType.Change);
    this.deltaTrackerInst6.trackChange(InstProperty6.ACTIVE_RESOURCE, DeltaType.Change);
    this.deltaTrackerInst6.trackChange(InstProperty6.LAST_EXTRACTION_TIME, DeltaType.Change);

    this.markModified();

    return {
      success: true,
      code: HarvesterResultCode.Success,
      message: 'Harvester activated',
    };
  }

  /**
   * Deactivate the harvester (stop extracting)
   */
  deactivate(): HarvesterOperationResult {
    if (!this.isActive) {
      return {
        success: false,
        code: HarvesterResultCode.AlreadyInactive,
        message: 'Harvester is already inactive',
      };
    }

    this.isActive = false;
    this.extractionProgress = 0;

    this.deltaTrackerInst3.trackChange(InstProperty.IS_ACTIVE, DeltaType.Change);
    this.deltaTrackerInst6.trackChange(InstProperty6.EXTRACTION_PROGRESS, DeltaType.Change);

    this.markModified();

    return {
      success: true,
      code: HarvesterResultCode.Success,
      message: 'Harvester deactivated',
    };
  }

  // ============================================
  // Extraction Processing
  // ============================================

  /**
   * Process an extraction tick
   * @param deltaTime - Time since last tick in milliseconds
   * @param resourceManager - Resource manager for concentration queries
   * @returns Amount extracted this tick
   */
  tick(deltaTime: number, resourceManager: ResourceManagerAccess): number {
    if (!this.isActive || this.activeResource === null) {
      return 0;
    }

    // Check power and maintenance
    if (this.powerPool < this.powerCost) {
      this.deactivate();
      return 0;
    }

    if (this.maintenancePool <= 0) {
      this.deactivate();
      return 0;
    }

    // Check hopper capacity
    const currentHopperAmount = this.getTotalHopperContents();
    if (currentHopperAmount >= this.hopperCapacity) {
      return 0; // Hopper full, but stay active
    }

    // Get concentration at current position
    const concentration = resourceManager.getInterpolatedConcentrationAt
      ? resourceManager.getInterpolatedConcentrationAt(
          this.activeResource,
          this.position.x,
          this.position.z
        )
      : resourceManager.getConcentrationAt(
          this.activeResource,
          this.position.x,
          this.position.z
        );

    if (concentration === null || concentration <= 0) {
      // Resource depleted or moved, deactivate
      this.deactivate();
      return 0;
    }

    // Calculate extraction amount based on time elapsed
    const tickFraction = deltaTime / EXTRACTION_TICK_INTERVAL;
    const effectiveRate = this.getEffectiveExtractionRate(concentration);
    const extractionAmount = effectiveRate * tickFraction;

    // Add to progress
    this.extractionProgress += extractionAmount;

    // Extract whole units from progress
    const unitsToExtract = Math.floor(this.extractionProgress);
    if (unitsToExtract > 0) {
      // Limit to available hopper space
      const availableSpace = this.hopperCapacity - currentHopperAmount;
      const actualExtracted = Math.min(unitsToExtract, availableSpace);

      if (actualExtracted > 0) {
        // Add to hopper
        this.addToHopper(this.activeResource, actualExtracted);

        // Consume power proportionally
        const powerConsumed = Math.ceil((actualExtracted / effectiveRate) * this.powerCost);
        this.consumePower(powerConsumed);

        // Update progress (keep fractional part)
        this.extractionProgress -= actualExtracted;

        this.lastExtractionTime = Date.now();
        this.deltaTrackerInst6.trackChange(InstProperty6.LAST_EXTRACTION_TIME, DeltaType.Change);
        this.deltaTrackerInst6.trackChange(InstProperty6.EXTRACTION_PROGRESS, DeltaType.Change);

        this.markModified();

        return actualExtracted;
      }
    }

    return 0;
  }

  /**
   * Process maintenance deduction
   * Called less frequently than extraction ticks
   */
  processMaintenance(): void {
    const now = Date.now();
    const elapsed = now - this.lastMaintenanceTime;

    if (elapsed >= MAINTENANCE_TICK_INTERVAL) {
      const tickCount = Math.floor(elapsed / MAINTENANCE_TICK_INTERVAL);
      const maintenanceToDeduct = this.maintenanceCost * tickCount;

      this.maintenancePool = Math.max(0, this.maintenancePool - maintenanceToDeduct);
      this.lastMaintenanceTime = now;

      this.deltaTrackerInst6.trackChange(InstProperty6.MAINTENANCE_POOL, DeltaType.Change);
      this.deltaTrackerInst6.trackChange(InstProperty6.LAST_MAINTENANCE_TIME, DeltaType.Change);

      this.markModified();

      // Auto-deactivate if maintenance depleted
      if (this.maintenancePool <= 0 && this.isActive) {
        this.deactivate();
      }
    }
  }

  /**
   * Get the effective extraction rate considering all modifiers
   * @param concentration - Current resource concentration (0-100)
   */
  getEffectiveExtractionRate(concentration?: number): number {
    const conc = concentration ?? 50; // Default to 50% if not provided
    return calculateEffectiveExtractionRate(
      this.extractionRate,
      this.berTier,
      conc
    );
  }

  /**
   * Query concentration at the harvester's position
   * @param resourceManager - Resource manager to query
   */
  getConcentrationAtPosition(resourceManager: ResourceManagerAccess): number | null {
    if (this.activeResource === null) {
      return null;
    }

    return resourceManager.getConcentrationAt(
      this.activeResource,
      this.position.x,
      this.position.z
    );
  }

  // ============================================
  // Hopper Management
  // ============================================

  /**
   * Add resources to the hopper
   */
  private addToHopper(resourceId: bigint, quantity: number): void {
    const current = this.hopperContents.get(resourceId) ?? 0;
    this.hopperContents.set(resourceId, current + quantity);
    this.hopperUpdateCounter++;

    this.deltaTrackerInst6.trackMapChange(
      InstProperty6.HOPPER_CONTENTS,
      resourceId,
      current + quantity,
      current === 0
    );
  }

  /**
   * Get total resources in hopper
   */
  getTotalHopperContents(): number {
    let total = 0;
    for (const quantity of this.hopperContents.values()) {
      total += quantity;
    }
    return total;
  }

  /**
   * Get hopper contents as an array
   */
  getHopperContentsArray(): HopperContentEntry[] {
    const entries: HopperContentEntry[] = [];
    for (const [resourceId, quantity] of this.hopperContents) {
      entries.push({ resourceId, quantity });
    }
    return entries;
  }

  /**
   * Get remaining hopper capacity
   */
  getRemainingHopperCapacity(): number {
    return this.hopperCapacity - this.getTotalHopperContents();
  }

  /**
   * Get hopper fill percentage
   */
  getHopperFillPercent(): number {
    if (this.hopperCapacity <= 0) return 100;
    return (this.getTotalHopperContents() / this.hopperCapacity) * 100;
  }

  /**
   * Collect all hopper contents
   * @param characterId - Character collecting the resources
   * @param inventory - Inventory access for adding resources
   * @returns Result with collected quantities
   */
  collectHopper(
    characterId: ObjectId,
    inventory?: InventoryAccess
  ): HarvesterOperationResult {
    // Check ownership
    if (characterId !== this.ownerId) {
      return {
        success: false,
        code: HarvesterResultCode.NotOwner,
        message: 'Only the owner can collect from this harvester',
      };
    }

    const contents = this.getHopperContentsArray();
    if (contents.length === 0) {
      return {
        success: true,
        code: HarvesterResultCode.Success,
        message: 'Hopper is empty',
        data: { collected: [] },
      };
    }

    const collected: Array<{ resourceId: string; quantity: number }> = [];
    const failed: Array<{ resourceId: string; quantity: number; reason: string }> = [];

    for (const entry of contents) {
      if (inventory) {
        // Check if character can receive
        if (!inventory.canReceiveResource(characterId, entry.resourceId, entry.quantity)) {
          failed.push({
            resourceId: entry.resourceId.toString(),
            quantity: entry.quantity,
            reason: 'Inventory full',
          });
          continue;
        }

        // Transfer to inventory
        const transferred = inventory.addResource(characterId, entry.resourceId, entry.quantity);
        if (transferred) {
          collected.push({
            resourceId: entry.resourceId.toString(),
            quantity: entry.quantity,
          });
          this.hopperContents.delete(entry.resourceId);
        } else {
          failed.push({
            resourceId: entry.resourceId.toString(),
            quantity: entry.quantity,
            reason: 'Transfer failed',
          });
        }
      } else {
        // No inventory provided, just clear hopper (for testing/admin)
        collected.push({
          resourceId: entry.resourceId.toString(),
          quantity: entry.quantity,
        });
        this.hopperContents.delete(entry.resourceId);
      }
    }

    if (collected.length > 0) {
      this.hopperUpdateCounter++;
      this.deltaTrackerInst6.trackListClear(InstProperty6.HOPPER_CONTENTS);
      this.markModified();
    }

    return {
      success: true,
      code: HarvesterResultCode.Success,
      message: `Collected ${collected.length} resource type(s)`,
      data: { collected, failed },
    };
  }

  // ============================================
  // Maintenance Management
  // ============================================

  /**
   * Add maintenance credits to the pool
   * @param credits - Amount of credits to add
   */
  addMaintenance(credits: number): void {
    if (credits <= 0) return;

    this.maintenancePool += credits;
    this.deltaTrackerInst6.trackChange(InstProperty6.MAINTENANCE_POOL, DeltaType.Change);
    this.markModified();
  }

  /**
   * Get maintenance pool status
   */
  getMaintenanceStatus(): {
    current: number;
    costPerCycle: number;
    cyclesRemaining: number;
    hoursRemaining: number;
  } {
    const cyclesRemaining = this.maintenanceCost > 0
      ? Math.floor(this.maintenancePool / this.maintenanceCost)
      : Infinity;
    const hoursRemaining = cyclesRemaining * (MAINTENANCE_TICK_INTERVAL / 3600000);

    return {
      current: this.maintenancePool,
      costPerCycle: this.maintenanceCost,
      cyclesRemaining,
      hoursRemaining,
    };
  }

  // ============================================
  // Power Management
  // ============================================

  /**
   * Add power to the pool
   * @param units - Power units to add
   */
  addPower(units: number): void {
    if (units <= 0) return;

    this.powerPool += units;
    this.deltaTrackerInst6.trackChange(InstProperty6.POWER_POOL, DeltaType.Change);
    this.markModified();
  }

  /**
   * Consume power
   */
  private consumePower(units: number): void {
    this.powerPool = Math.max(0, this.powerPool - units);
    this.deltaTrackerInst6.trackChange(InstProperty6.POWER_POOL, DeltaType.Change);
  }

  /**
   * Get power status
   */
  getPowerStatus(): {
    current: number;
    costPerCycle: number;
    cyclesRemaining: number;
    extractionCyclesRemaining: number;
  } {
    const cyclesRemaining = this.powerCost > 0
      ? Math.floor(this.powerPool / this.powerCost)
      : Infinity;

    return {
      current: this.powerPool,
      costPerCycle: this.powerCost,
      cyclesRemaining,
      extractionCyclesRemaining: cyclesRemaining,
    };
  }

  // ============================================
  // Ownership
  // ============================================

  /**
   * Check if a player is the owner
   */
  isOwner(playerId: ObjectId): boolean {
    return this.ownerId === playerId;
  }

  /**
   * Transfer ownership
   */
  transferOwnership(newOwnerId: ObjectId): void {
    if (this.ownerId !== newOwnerId) {
      this.ownerId = newOwnerId;
      this.deltaTrackerInst3.trackChange(InstProperty.OWNER_ID, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Delta Management
  // ============================================

  /**
   * Check if INST baseline 3 has changes
   */
  hasInst3Changes(): boolean {
    return this.deltaTrackerInst3.hasChanges();
  }

  /**
   * Check if INST baseline 6 has changes
   */
  hasInst6Changes(): boolean {
    return this.deltaTrackerInst6.hasChanges();
  }

  /**
   * Get INST baseline 3 delta tracker
   */
  getInst3DeltaTracker(): DeltaTracker {
    return this.deltaTrackerInst3;
  }

  /**
   * Get INST baseline 6 delta tracker
   */
  getInst6DeltaTracker(): DeltaTracker {
    return this.deltaTrackerInst6;
  }

  /**
   * Get hopper update counter
   */
  getHopperUpdateCounter(): number {
    return this.hopperUpdateCounter;
  }

  /**
   * Clear all delta trackers
   */
  override clearAllDeltas(): void {
    this.deltaTrackerInst3.clear();
    this.deltaTrackerInst6.clear();
    this.clearDirtyFlags();
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Serialize to JSON for debugging/persistence
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      harvesterId: this.harvesterId.toString(),
      ownerId: this.ownerId.toString(),
      harvesterType: this.harvesterType,
      harvesterTypeName: this.getHarvesterTypeName(),
      harvesterSize: this.harvesterSize,
      harvesterSizeName: this.getHarvesterSizeName(),
      installedAt: this.installedAt.toISOString(),
      position: this.position,
      planetId: this.planetId,
      activeResource: this.activeResource?.toString() ?? null,
      hopperContents: this.getHopperContentsArray().map((e) => ({
        resourceId: e.resourceId.toString(),
        quantity: e.quantity,
      })),
      hopperCapacity: this.hopperCapacity,
      hopperFillPercent: this.getHopperFillPercent(),
      extractionRate: this.extractionRate,
      berTier: this.berTier,
      maintenancePool: this.maintenancePool,
      maintenanceCost: this.maintenanceCost,
      powerPool: this.powerPool,
      powerCost: this.powerCost,
      isActive: this.isActive,
      lastExtractionTime: this.lastExtractionTime,
      lastMaintenanceTime: this.lastMaintenanceTime,
    };
  }
}
