/**
 * BuildingObject - Player-placed structures in the game world
 * Extends TangibleObject with properties for structures, houses, and installations.
 *
 * SWG buildings are player-placeable structures that:
 * - Consume lots from the player's lot allowance
 * - Have maintenance costs that must be paid regularly
 * - Support permission lists for access control
 * - Can contain cells (rooms) as child objects
 * - May require power to function
 * - Can be packed back into deeds for relocation
 *
 * Baseline Types:
 * - TANO3/6: Base tangible properties (inherited from TangibleObject)
 * - BUIO3/6: Building-specific properties
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { TangibleObject } from './tangible-object.js';
import { ObjectType } from './scene-object.js';
import { DeltaTracker, DeltaType } from './deltas.js';
import {
  BuildingType,
  StructureConditionState,
  BuildingPermission,
  type PermissionEntry,
  type MaintenanceStatus,
  type PowerStatus,
  MAX_PERMISSION_LIST,
  STRUCTURE_DECAY_RATE,
  DEFAULT_MAINTENANCE_COSTS,
  DEFAULT_LOT_COSTS,
  DEFAULT_POWER_REQUIREMENTS,
  getBuildingTypeName,
  getConditionStateFromPercent,
  hasPermission,
} from './building-types.js';

// Re-export types for convenience
export {
  BuildingType,
  StructureConditionState,
  BuildingPermission,
  type PermissionEntry,
  type MaintenanceStatus,
  type PowerStatus,
  MAX_PERMISSION_LIST,
  STRUCTURE_DECAY_RATE,
} from './building-types.js';

/**
 * BUIO property indices for delta tracking (Baseline 3 - shared)
 */
export const BuioProperty = {
  // Building shared properties
  BUILDING_TYPE: 0,
  OWNER_ID: 1,
  OWNER_NAME: 2,
  DEED_ID: 3,
  LOT_COST: 4,
  IS_PUBLIC: 5,
  CONDITION_STATE: 6,
  PLACED_AT: 7,
  SIGN_TEXT: 8,
  CELL_COUNT: 9,
} as const;

/**
 * BUIO property indices for delta tracking (Baseline 6 - server)
 */
export const BuioProperty6 = {
  // Building server properties
  PERMISSION_LIST: 0,
  BAN_LIST: 1,
  MAINTENANCE_POOL: 2,
  MAINTENANCE_COST_PER_DAY: 3,
  LAST_MAINTENANCE_PAYMENT: 4,
  CURRENT_POWER: 5,
  REQUIRED_POWER: 6,
} as const;

/**
 * Result of a building operation
 */
export interface BuildingOperationResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * BuildingObject - Player-placed structure in the game world
 */
export class BuildingObject extends TangibleObject {
  // ============================================
  // Building Identity
  // ============================================

  /** Type of building */
  buildingType: BuildingType;

  /** Owner character ID */
  override ownerId: ObjectId;

  /** Owner character name for display */
  ownerName: string;

  /** Original deed object ID (for packing) */
  deedId: ObjectId;

  /** Number of lots this structure consumes */
  lotCost: number;

  // ============================================
  // Cell Management
  // ============================================

  /** Cell IDs by index (CellObject references) */
  cells: Map<number, ObjectId>;

  // ============================================
  // Access Control
  // ============================================

  /** Whether anyone can enter this structure */
  isPublic: boolean;

  /** Permission list (characterId -> PermissionEntry) */
  permissionList: Map<ObjectId, PermissionEntry>;

  /** Set of banned player IDs */
  banList: Set<ObjectId>;

  // ============================================
  // Maintenance and Power
  // ============================================

  /** Maintenance status */
  maintenance: MaintenanceStatus;

  /** Power status */
  power: PowerStatus;

  // ============================================
  // Structure State
  // ============================================

  /** Current condition state */
  conditionState: StructureConditionState;

  /** When the structure was placed */
  placedAt: Date;

  /** Structure sign text (optional) */
  sign?: string;

  // ============================================
  // Delta Tracking
  // ============================================

  /** Delta tracker for BUIO baseline 3 (shared) */
  private deltaTrackerBuio3: DeltaTracker;

  /** Delta tracker for BUIO baseline 6 (server) */
  private deltaTrackerBuio6: DeltaTracker;

  /** Update counter for permission list */
  private permissionListUpdateCounter: number;

  /** Update counter for ban list */
  private banListUpdateCounter: number;

  /** Update counter for cells */
  private cellsUpdateCounter: number;

  /**
   * Create a new BuildingObject
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the object template
   */
  constructor(objectId: ObjectId, templateCrc: CrcValue = 0) {
    super(objectId, templateCrc);

    // Override object type
    this.objectType = ObjectType.Building;

    // Initialize building identity
    this.buildingType = BuildingType.PlayerHouse;
    this.ownerId = 0n;
    this.ownerName = '';
    this.deedId = 0n;
    this.lotCost = DEFAULT_LOT_COSTS[BuildingType.PlayerHouse];

    // Initialize cells
    this.cells = new Map();

    // Initialize access control
    this.isPublic = false;
    this.permissionList = new Map();
    this.banList = new Set();

    // Initialize maintenance
    this.maintenance = {
      pool: 0,
      costPerDay: DEFAULT_MAINTENANCE_COSTS[BuildingType.PlayerHouse],
      lastPayment: new Date(),
      daysRemaining: 0,
    };

    // Initialize power
    this.power = {
      currentPower: 0,
      requiredPower: DEFAULT_POWER_REQUIREMENTS[BuildingType.PlayerHouse],
      isPowered: true, // Houses don't need power
    };

    // Initialize state
    this.conditionState = StructureConditionState.Good;
    this.placedAt = new Date();
    delete this.sign;

    // Initialize delta trackers
    this.deltaTrackerBuio3 = new DeltaTracker();
    this.deltaTrackerBuio6 = new DeltaTracker();
    this.permissionListUpdateCounter = 0;
    this.banListUpdateCounter = 0;
    this.cellsUpdateCounter = 0;
  }

  /**
   * Get baseline type for building objects
   */
  override getBaselineType(): string {
    return 'BUIO';
  }

  // ============================================
  // Building Type Management
  // ============================================

  /**
   * Set the building type and update related properties
   */
  setBuildingType(type: BuildingType): void {
    if (this.buildingType !== type) {
      this.buildingType = type;

      // Update type-dependent defaults
      this.lotCost = DEFAULT_LOT_COSTS[type];
      this.maintenance.costPerDay = DEFAULT_MAINTENANCE_COSTS[type];
      this.power.requiredPower = DEFAULT_POWER_REQUIREMENTS[type];
      this.updatePowerStatus();

      this.deltaTrackerBuio3.trackChange(BuioProperty.BUILDING_TYPE, DeltaType.Change);
      this.deltaTrackerBuio3.trackChange(BuioProperty.LOT_COST, DeltaType.Change);
      this.deltaTrackerBuio6.trackChange(BuioProperty6.MAINTENANCE_COST_PER_DAY, DeltaType.Change);
      this.deltaTrackerBuio6.trackChange(BuioProperty6.REQUIRED_POWER, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Get the display name for this building type
   */
  getBuildingTypeName(): string {
    return getBuildingTypeName(this.buildingType);
  }

  // ============================================
  // Ownership Management
  // ============================================

  /**
   * Set the building owner
   */
  override setOwner(ownerId: ObjectId, ownerName?: string): void {
    this.ownerId = ownerId;
    if (ownerName !== undefined) {
      this.ownerName = ownerName;
      this.deltaTrackerBuio3.trackChange(BuioProperty.OWNER_NAME, DeltaType.Change);
    }
    this.deltaTrackerBuio3.trackChange(BuioProperty.OWNER_ID, DeltaType.Change);
    this.markModified();
  }

  /**
   * Check if a player is the owner
   */
  isOwner(playerId: ObjectId): boolean {
    return this.ownerId === playerId;
  }

  // ============================================
  // Access Control Methods
  // ============================================

  /**
   * Check if a player can enter this structure
   */
  canEnter(characterId: ObjectId): boolean {
    // Owner can always enter
    if (this.isOwner(characterId)) {
      return true;
    }

    // Banned players cannot enter
    if (this.banList.has(characterId)) {
      return false;
    }

    // Public buildings allow everyone (except banned)
    if (this.isPublic) {
      return true;
    }

    // Check permission list for Enter permission
    const entry = this.permissionList.get(characterId);
    if (entry && hasPermission(entry.permissions, BuildingPermission.Enter)) {
      return true;
    }

    return false;
  }

  /**
   * Grant permissions to a character
   */
  grantPermission(
    characterId: ObjectId,
    characterName: string,
    permissions: Set<BuildingPermission>,
    granterId: ObjectId
  ): BuildingOperationResult {
    // Only owner or admin can grant permissions
    if (!this.isOwner(granterId) && !this.isAdmin(granterId)) {
      return {
        success: false,
        message: 'You do not have permission to modify the permission list',
      };
    }

    // Check permission list limit
    if (!this.permissionList.has(characterId) && this.permissionList.size >= MAX_PERMISSION_LIST) {
      return {
        success: false,
        message: `Permission list is full (maximum ${MAX_PERMISSION_LIST} entries)`,
      };
    }

    // Cannot grant permissions to the owner
    if (this.isOwner(characterId)) {
      return {
        success: false,
        message: 'Cannot modify owner permissions',
      };
    }

    // Add or update permission entry
    const existingEntry = this.permissionList.get(characterId);
    if (existingEntry) {
      // Merge permissions
      for (const perm of permissions) {
        existingEntry.permissions.add(perm);
      }
    } else {
      this.permissionList.set(characterId, {
        characterId,
        characterName,
        permissions: new Set(permissions),
      });
    }

    // Remove from ban list if present
    this.banList.delete(characterId);

    this.permissionListUpdateCounter++;
    this.deltaTrackerBuio6.trackChange(BuioProperty6.PERMISSION_LIST, DeltaType.Change);
    this.markModified();

    return {
      success: true,
      message: `Permissions granted to ${characterName}`,
    };
  }

  /**
   * Revoke all permissions from a character
   */
  revokePermission(characterId: ObjectId, revokerId: ObjectId): BuildingOperationResult {
    // Only owner or admin can revoke permissions
    if (!this.isOwner(revokerId) && !this.isAdmin(revokerId)) {
      return {
        success: false,
        message: 'You do not have permission to modify the permission list',
      };
    }

    // Cannot revoke owner permissions
    if (this.isOwner(characterId)) {
      return {
        success: false,
        message: 'Cannot revoke owner permissions',
      };
    }

    const entry = this.permissionList.get(characterId);
    if (!entry) {
      return {
        success: false,
        message: 'Character not found in permission list',
      };
    }

    const name = entry.characterName;
    this.permissionList.delete(characterId);
    this.permissionListUpdateCounter++;
    this.deltaTrackerBuio6.trackChange(BuioProperty6.PERMISSION_LIST, DeltaType.Change);
    this.markModified();

    return {
      success: true,
      message: `Permissions revoked from ${name}`,
    };
  }

  /**
   * Ban a player from the structure
   */
  ban(characterId: ObjectId, bannerId: ObjectId): BuildingOperationResult {
    // Only owner or admin can ban
    if (!this.isOwner(bannerId) && !this.isAdmin(bannerId)) {
      return {
        success: false,
        message: 'You do not have permission to ban players',
      };
    }

    // Cannot ban the owner
    if (this.isOwner(characterId)) {
      return {
        success: false,
        message: 'Cannot ban the owner',
      };
    }

    // Cannot ban yourself
    if (characterId === bannerId) {
      return {
        success: false,
        message: 'Cannot ban yourself',
      };
    }

    // Remove from permission list
    this.permissionList.delete(characterId);
    this.permissionListUpdateCounter++;

    // Add to ban list
    this.banList.add(characterId);
    this.banListUpdateCounter++;

    this.deltaTrackerBuio6.trackChange(BuioProperty6.PERMISSION_LIST, DeltaType.Change);
    this.deltaTrackerBuio6.trackChange(BuioProperty6.BAN_LIST, DeltaType.Change);
    this.markModified();

    return {
      success: true,
      message: 'Player banned from structure',
    };
  }

  /**
   * Unban a player from the structure
   */
  unban(characterId: ObjectId): BuildingOperationResult {
    if (!this.banList.has(characterId)) {
      return {
        success: false,
        message: 'Player is not banned',
      };
    }

    this.banList.delete(characterId);
    this.banListUpdateCounter++;
    this.deltaTrackerBuio6.trackChange(BuioProperty6.BAN_LIST, DeltaType.Change);
    this.markModified();

    return {
      success: true,
      message: 'Player unbanned from structure',
    };
  }

  /**
   * Check if a player has admin permission
   */
  isAdmin(characterId: ObjectId): boolean {
    // Owner is always admin
    if (this.isOwner(characterId)) {
      return true;
    }

    const entry = this.permissionList.get(characterId);
    return entry !== undefined && hasPermission(entry.permissions, BuildingPermission.Admin);
  }

  /**
   * Check if a player has a specific permission
   */
  hasPermission(characterId: ObjectId, permission: BuildingPermission): boolean {
    // Owner has all permissions
    if (this.isOwner(characterId)) {
      return true;
    }

    const entry = this.permissionList.get(characterId);
    return entry !== undefined && hasPermission(entry.permissions, permission);
  }

  /**
   * Set public access status
   */
  setPublic(isPublic: boolean, actorId: ObjectId): BuildingOperationResult {
    // Only owner or admin can change public status
    if (!this.isOwner(actorId) && !this.isAdmin(actorId)) {
      return {
        success: false,
        message: 'You do not have permission to change public access',
      };
    }

    if (this.isPublic === isPublic) {
      return {
        success: true,
        message: `Structure is already ${isPublic ? 'public' : 'private'}`,
      };
    }

    this.isPublic = isPublic;
    this.deltaTrackerBuio3.trackChange(BuioProperty.IS_PUBLIC, DeltaType.Change);
    this.markModified();

    return {
      success: true,
      message: `Structure is now ${isPublic ? 'public' : 'private'}`,
    };
  }

  // ============================================
  // Maintenance Methods
  // ============================================

  /**
   * Pay maintenance (add credits to the pool)
   */
  payMaintenance(amount: number): BuildingOperationResult {
    if (amount <= 0) {
      return {
        success: false,
        message: 'Invalid maintenance amount',
      };
    }

    this.maintenance.pool += amount;
    this.maintenance.lastPayment = new Date();
    this.updateMaintenanceDaysRemaining();

    this.deltaTrackerBuio6.trackChange(BuioProperty6.MAINTENANCE_POOL, DeltaType.Change);
    this.deltaTrackerBuio6.trackChange(BuioProperty6.LAST_MAINTENANCE_PAYMENT, DeltaType.Change);
    this.markModified();

    return {
      success: true,
      message: `${amount} credits added to maintenance pool`,
      data: {
        newPool: this.maintenance.pool,
        daysRemaining: this.maintenance.daysRemaining,
      },
    };
  }

  /**
   * Consume maintenance for elapsed days
   */
  consumeMaintenance(days: number): BuildingOperationResult {
    if (days <= 0) {
      return {
        success: true,
        message: 'No maintenance consumed',
      };
    }

    const cost = days * this.maintenance.costPerDay;
    const actualDeducted = Math.min(cost, this.maintenance.pool);
    this.maintenance.pool -= actualDeducted;
    this.updateMaintenanceDaysRemaining();

    this.deltaTrackerBuio6.trackChange(BuioProperty6.MAINTENANCE_POOL, DeltaType.Change);
    this.markModified();

    const deficit = cost - actualDeducted;
    if (deficit > 0) {
      return {
        success: false,
        message: `Insufficient maintenance. ${deficit} credits short.`,
        data: {
          consumed: actualDeducted,
          deficit,
          newPool: this.maintenance.pool,
        },
      };
    }

    return {
      success: true,
      message: `${actualDeducted} credits consumed from maintenance pool`,
      data: {
        consumed: actualDeducted,
        newPool: this.maintenance.pool,
      },
    };
  }

  /**
   * Check and apply maintenance decay
   * Call this periodically to check if the structure should decay
   */
  checkMaintenanceDecay(): BuildingOperationResult {
    // Calculate days since last payment
    const now = new Date();
    const daysSincePayment = Math.floor(
      (now.getTime() - this.maintenance.lastPayment.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (daysSincePayment <= 0) {
      return {
        success: true,
        message: 'No decay check needed',
      };
    }

    // Consume maintenance for elapsed days
    const consumeResult = this.consumeMaintenance(daysSincePayment);
    this.maintenance.lastPayment = now;
    this.deltaTrackerBuio6.trackChange(BuioProperty6.LAST_MAINTENANCE_PAYMENT, DeltaType.Change);

    // If there was a deficit, apply decay
    if (!consumeResult.success && consumeResult.data) {
      const deficit = consumeResult.data.deficit as number;
      const daysWithoutMaintenance = Math.ceil(deficit / this.maintenance.costPerDay);
      const decayAmount = daysWithoutMaintenance * STRUCTURE_DECAY_RATE;

      // Apply decay to condition
      const oldCondition = this.condition;
      this.setCondition(this.condition - decayAmount);
      this.updateConditionState();

      return {
        success: false,
        message: `Structure decayed due to insufficient maintenance`,
        data: {
          conditionLost: oldCondition - this.condition,
          newCondition: this.condition,
          conditionState: this.conditionState,
        },
      };
    }

    return {
      success: true,
      message: 'Maintenance consumed successfully',
    };
  }

  /**
   * Update days remaining calculation
   */
  private updateMaintenanceDaysRemaining(): void {
    if (this.maintenance.costPerDay <= 0) {
      this.maintenance.daysRemaining = Infinity;
    } else {
      this.maintenance.daysRemaining = Math.floor(
        this.maintenance.pool / this.maintenance.costPerDay
      );
    }
  }

  /**
   * Update condition state based on current condition
   */
  private updateConditionState(): void {
    const conditionPercent = this.getConditionPercent() * 100;
    const newState = getConditionStateFromPercent(conditionPercent);

    if (this.conditionState !== newState) {
      this.conditionState = newState;
      this.deltaTrackerBuio3.trackChange(BuioProperty.CONDITION_STATE, DeltaType.Change);
    }
  }

  /**
   * Update power status
   */
  private updatePowerStatus(): void {
    this.power.isPowered = this.power.currentPower >= this.power.requiredPower ||
                          this.power.requiredPower === 0;
  }

  // ============================================
  // Power Management
  // ============================================

  /**
   * Add power to the structure
   */
  addPower(amount: number): void {
    if (amount > 0) {
      this.power.currentPower += amount;
      this.updatePowerStatus();
      this.deltaTrackerBuio6.trackChange(BuioProperty6.CURRENT_POWER, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Consume power from the structure
   */
  consumePower(amount: number): boolean {
    if (this.power.currentPower >= amount) {
      this.power.currentPower -= amount;
      this.updatePowerStatus();
      this.deltaTrackerBuio6.trackChange(BuioProperty6.CURRENT_POWER, DeltaType.Change);
      this.markModified();
      return true;
    }
    return false;
  }

  // ============================================
  // Structure Actions
  // ============================================

  /**
   * Pack the structure back into a deed (if allowed)
   */
  pack(): BuildingOperationResult {
    // Check if structure can be packed (must be in good condition)
    if (this.conditionState !== StructureConditionState.Good) {
      return {
        success: false,
        message: 'Structure must be in good condition to pack',
      };
    }

    // Check if there are items inside
    if (this.containedObjects.size > 0) {
      return {
        success: false,
        message: 'Structure must be empty before packing',
      };
    }

    // Mark as ready to pack (actual deed creation handled by housing system)
    return {
      success: true,
      message: 'Structure ready to pack',
      data: {
        deedId: this.deedId,
        buildingType: this.buildingType,
        maintenancePool: this.maintenance.pool,
      },
    };
  }

  /**
   * Destroy the structure
   */
  destroy(): BuildingOperationResult {
    // Check if there are items inside
    if (this.containedObjects.size > 0) {
      return {
        success: false,
        message: 'Structure contains items. Remove all items before destroying.',
      };
    }

    // Mark for destruction
    this.conditionState = StructureConditionState.Destroyed;
    this.setCondition(0);
    this.deltaTrackerBuio3.trackChange(BuioProperty.CONDITION_STATE, DeltaType.Change);
    this.markModified();

    return {
      success: true,
      message: 'Structure marked for destruction',
      data: {
        lotsReturned: this.lotCost,
      },
    };
  }

  // ============================================
  // Cell Management
  // ============================================

  /**
   * Get a cell by index
   */
  getCell(cellIndex: number): ObjectId | undefined {
    return this.cells.get(cellIndex);
  }

  /**
   * Add a cell to the building
   */
  addCell(cellIndex: number, cellId: ObjectId): void {
    this.cells.set(cellIndex, cellId);
    this.cellsUpdateCounter++;
    this.deltaTrackerBuio3.trackChange(BuioProperty.CELL_COUNT, DeltaType.Change);
    this.markModified();
  }

  /**
   * Remove a cell from the building
   */
  removeCell(cellIndex: number): ObjectId | undefined {
    const cellId = this.cells.get(cellIndex);
    if (cellId !== undefined) {
      this.cells.delete(cellIndex);
      this.cellsUpdateCounter++;
      this.deltaTrackerBuio3.trackChange(BuioProperty.CELL_COUNT, DeltaType.Change);
      this.markModified();
    }
    return cellId;
  }

  /**
   * Get all cell IDs
   */
  getAllCells(): ObjectId[] {
    return Array.from(this.cells.values());
  }

  /**
   * Get cell count
   */
  getCellCount(): number {
    return this.cells.size;
  }

  // ============================================
  // Sign Management
  // ============================================

  /**
   * Set the structure sign text
   */
  setSign(text: string | undefined, actorId: ObjectId): BuildingOperationResult {
    // Only owner or admin can change sign
    if (!this.isOwner(actorId) && !this.isAdmin(actorId)) {
      return {
        success: false,
        message: 'You do not have permission to change the sign',
      };
    }

    if (text !== undefined) {
      this.sign = text;
    } else {
      delete this.sign;
    }
    this.deltaTrackerBuio3.trackChange(BuioProperty.SIGN_TEXT, DeltaType.Change);
    this.markModified();

    return {
      success: true,
      message: text ? 'Sign updated' : 'Sign cleared',
    };
  }

  // ============================================
  // Delta Management
  // ============================================

  /**
   * Check if BUIO baseline 3 has changes
   */
  hasBuio3Changes(): boolean {
    return this.deltaTrackerBuio3.hasChanges();
  }

  /**
   * Check if BUIO baseline 6 has changes
   */
  hasBuio6Changes(): boolean {
    return this.deltaTrackerBuio6.hasChanges();
  }

  /**
   * Get BUIO baseline 3 delta tracker
   */
  getBuio3DeltaTracker(): DeltaTracker {
    return this.deltaTrackerBuio3;
  }

  /**
   * Get BUIO baseline 6 delta tracker
   */
  getBuio6DeltaTracker(): DeltaTracker {
    return this.deltaTrackerBuio6;
  }

  /**
   * Get permission list update counter
   */
  getPermissionListUpdateCounter(): number {
    return this.permissionListUpdateCounter;
  }

  /**
   * Get ban list update counter
   */
  getBanListUpdateCounter(): number {
    return this.banListUpdateCounter;
  }

  /**
   * Get cells update counter
   */
  getCellsUpdateCounter(): number {
    return this.cellsUpdateCounter;
  }

  /**
   * Clear all delta trackers
   */
  override clearDirtyFlags(): void {
    super.clearDirtyFlags();
    this.deltaTrackerBuio3.clear();
    this.deltaTrackerBuio6.clear();
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Copy building properties to another BuildingObject
   */
  copyBuildingPropertiesTo(target: BuildingObject): void {
    this.copyPropertiesTo(target);

    target.buildingType = this.buildingType;
    target.ownerId = this.ownerId;
    target.ownerName = this.ownerName;
    target.deedId = this.deedId;
    target.lotCost = this.lotCost;
    target.isPublic = this.isPublic;
    target.conditionState = this.conditionState;
    target.placedAt = new Date(this.placedAt);
    if (this.sign !== undefined) {
      target.sign = this.sign;
    } else {
      delete target.sign;
    }

    // Copy cells
    target.cells = new Map(this.cells);

    // Copy permission list
    target.permissionList = new Map();
    for (const [id, entry] of this.permissionList) {
      target.permissionList.set(id, {
        characterId: entry.characterId,
        characterName: entry.characterName,
        permissions: new Set(entry.permissions),
      });
    }

    // Copy ban list
    target.banList = new Set(this.banList);

    // Copy maintenance
    target.maintenance = {
      pool: this.maintenance.pool,
      costPerDay: this.maintenance.costPerDay,
      lastPayment: new Date(this.maintenance.lastPayment),
      daysRemaining: this.maintenance.daysRemaining,
    };

    // Copy power
    target.power = {
      currentPower: this.power.currentPower,
      requiredPower: this.power.requiredPower,
      isPowered: this.power.isPowered,
    };
  }

  /**
   * Serialize to JSON for debugging/persistence
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      buildingType: this.buildingType,
      buildingTypeName: this.getBuildingTypeName(),
      ownerId: this.ownerId.toString(),
      ownerName: this.ownerName,
      deedId: this.deedId.toString(),
      lotCost: this.lotCost,
      cellCount: this.cells.size,
      cells: Array.from(this.cells.entries()).map(([index, id]) => ({
        index,
        objectId: id.toString(),
      })),
      isPublic: this.isPublic,
      permissionListSize: this.permissionList.size,
      banListSize: this.banList.size,
      maintenance: {
        pool: this.maintenance.pool,
        costPerDay: this.maintenance.costPerDay,
        lastPayment: this.maintenance.lastPayment.toISOString(),
        daysRemaining: this.maintenance.daysRemaining,
      },
      power: {
        currentPower: this.power.currentPower,
        requiredPower: this.power.requiredPower,
        isPowered: this.power.isPowered,
      },
      conditionState: this.conditionState,
      placedAt: this.placedAt.toISOString(),
      sign: this.sign,
    };
  }
}
