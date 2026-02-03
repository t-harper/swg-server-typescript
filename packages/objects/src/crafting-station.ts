/**
 * CraftingStation - Placed crafting stations that provide enhanced crafting capabilities
 * Extends CraftingTool with placement logic, permissions, and station-specific features.
 *
 * SWG crafting stations are placeable objects that:
 * - Provide bonuses over handheld tools
 * - Can be placed in buildings or the world
 * - Support permission management for shared access
 * - Have fixed positions and orientations
 *
 * Baseline Types:
 * - TANO3/6: Base tangible properties (inherited from TangibleObject)
 * - CRFT: Crafting tool properties (inherited from CraftingTool)
 * - Custom station properties tracked via delta system
 */

import type { ObjectId, CrcValue, Vector3 } from '@swg/shared-types';
import { CraftingTool, CrftProperty } from './crafting-tool.js';
import { ObjectType } from './scene-object.js';
import { DeltaTracker, DeltaType } from './deltas.js';
import {
  StationType,
  CraftingToolType,
  STATION_TO_TOOL_TYPE,
  STATION_EFFECTIVENESS_BONUS,
  STATION_EXPERIMENTATION_BONUS,
  getStationTypeName,
} from './crafting-tool-types.js';

/**
 * STNO property indices for delta tracking
 * Station-specific property indices
 */
export const StnoProperty = {
  // Station specific properties
  STATION_TYPE: 0,
  PLACED_POSITION: 1,
  ROTATION: 2,
  PLACED_IN_CELL: 3,
  IS_PUBLIC: 4,
  ALLOWED_USERS: 5,
  PLACED_BY: 6,
  PLACEMENT_TIME: 7,
} as const;

/**
 * Station placement rules
 */
export interface PlacementRules {
  /** Whether the station can be placed outdoors */
  allowOutdoor: boolean;
  /** Whether the station can be placed indoors */
  allowIndoor: boolean;
  /** Minimum distance from other stations (in meters) */
  minDistanceFromStations: number;
  /** Maximum number of this station type per building */
  maxPerBuilding: number;
  /** Required lot size (0 = no lot required) */
  requiredLotSize: number;
}

/**
 * Default placement rules for stations
 */
export const DEFAULT_PLACEMENT_RULES: PlacementRules = {
  allowOutdoor: false,
  allowIndoor: true,
  minDistanceFromStations: 2.0,
  maxPerBuilding: 10,
  requiredLotSize: 0,
};

/**
 * CraftingStation - Placed crafting stations
 * Provides enhanced crafting capabilities with placement and permission management
 */
export class CraftingStation extends CraftingTool {
  // ============================================
  // Station Type
  // ============================================

  /** Type of crafting station */
  stationType: StationType;

  // ============================================
  // Placement Properties
  // ============================================

  /** World position where the station is placed */
  placedPosition: Vector3;

  /** Rotation of the station (in radians around Y axis) */
  rotation: number;

  /** ID of the cell this station is placed in (null if in world) */
  placedInCell: ObjectId | null;

  /** ID of the player who placed this station */
  placedBy: ObjectId;

  /** Timestamp when the station was placed */
  placementTime: number;

  // ============================================
  // Permission Properties
  // ============================================

  /** Whether this station is publicly accessible */
  isPublic: boolean;

  /** Set of player IDs allowed to use this station (when not public) */
  allowedUsers: Set<ObjectId>;

  // ============================================
  // Placement Rules
  // ============================================

  /** Placement rules for this station */
  placementRules: PlacementRules;

  // ============================================
  // Delta Tracking
  // ============================================

  /** Delta tracker for station-specific properties */
  private deltaTrackerStno: DeltaTracker;

  /** Update counter for allowed users list */
  private allowedUsersUpdateCounter: number;

  /**
   * Create a new CraftingStation
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the object template
   */
  constructor(objectId: ObjectId, templateCrc: CrcValue = 0) {
    super(objectId, templateCrc);

    // Override object type (keep as CraftingTool since that's the baseline type)
    this.objectType = ObjectType.CraftingTool;

    // Mark as station
    this.isStation = true;

    // Initialize station type
    this.stationType = StationType.Generic;

    // Initialize placement properties
    this.placedPosition = { x: 0, y: 0, z: 0 };
    this.rotation = 0;
    this.placedInCell = null;
    this.placedBy = 0n;
    this.placementTime = 0;

    // Initialize permission properties
    this.isPublic = true;
    this.allowedUsers = new Set();

    // Initialize placement rules
    this.placementRules = { ...DEFAULT_PLACEMENT_RULES };

    // Initialize delta tracker
    this.deltaTrackerStno = new DeltaTracker();
    this.allowedUsersUpdateCounter = 0;

    // Apply station bonuses
    this.applyStationBonuses();
  }

  /**
   * Apply the standard station bonuses
   */
  private applyStationBonuses(): void {
    // Stations get additional effectiveness and experimentation bonuses
    this.setAssemblyBonus(STATION_EFFECTIVENESS_BONUS);
    this.setExperimentationBonus(STATION_EXPERIMENTATION_BONUS);
  }

  /**
   * Get baseline type for station objects
   */
  override getBaselineType(): string {
    return 'STNO';
  }

  // ============================================
  // Station Type Management
  // ============================================

  /**
   * Set the station type
   * This also updates the crafting tool type to match
   */
  setStationType(type: StationType): void {
    if (this.stationType !== type) {
      this.stationType = type;

      // Update the crafting tool type to match the station type
      const toolType = STATION_TO_TOOL_TYPE[type] ?? CraftingToolType.Generic;
      this.setCraftingToolType(toolType);

      this.deltaTrackerStno.trackChange(StnoProperty.STATION_TYPE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Get the display name for this station type
   */
  getStationTypeName(): string {
    return getStationTypeName(this.stationType);
  }

  // ============================================
  // Placement Management
  // ============================================

  /**
   * Place the station at a position
   * @param position - World position
   * @param rotation - Rotation in radians
   * @param cellId - Cell ID if placing inside a building (null for outdoors)
   * @param placedBy - ID of the player placing the station
   */
  place(
    position: Vector3,
    rotation: number,
    cellId: ObjectId | null,
    placedBy: ObjectId
  ): void {
    this.placedPosition = { ...position };
    this.rotation = rotation;
    this.placedInCell = cellId;
    this.placedBy = placedBy;
    this.placementTime = Date.now();

    // Update the scene object position
    this.setPosition(position.x, position.y, position.z);
    this.setHeading(rotation);

    // Track changes
    this.deltaTrackerStno.trackChange(StnoProperty.PLACED_POSITION, DeltaType.Change);
    this.deltaTrackerStno.trackChange(StnoProperty.ROTATION, DeltaType.Change);
    this.deltaTrackerStno.trackChange(StnoProperty.PLACED_IN_CELL, DeltaType.Change);
    this.deltaTrackerStno.trackChange(StnoProperty.PLACED_BY, DeltaType.Change);
    this.deltaTrackerStno.trackChange(StnoProperty.PLACEMENT_TIME, DeltaType.Change);

    this.markModified();
  }

  /**
   * Pick up the station (unplace it)
   */
  pickup(): void {
    this.placedPosition = { x: 0, y: 0, z: 0 };
    this.rotation = 0;
    this.placedInCell = null;
    this.placementTime = 0;

    this.deltaTrackerStno.trackChange(StnoProperty.PLACED_POSITION, DeltaType.Change);
    this.deltaTrackerStno.trackChange(StnoProperty.ROTATION, DeltaType.Change);
    this.deltaTrackerStno.trackChange(StnoProperty.PLACED_IN_CELL, DeltaType.Change);
    this.deltaTrackerStno.trackChange(StnoProperty.PLACEMENT_TIME, DeltaType.Change);

    this.markModified();
  }

  /**
   * Check if the station is currently placed
   */
  isPlaced(): boolean {
    return this.placementTime > 0;
  }

  /**
   * Check if the station is placed indoors
   */
  isIndoors(): boolean {
    return this.placedInCell !== null;
  }

  /**
   * Check if the station is placed outdoors
   */
  isOutdoors(): boolean {
    return this.isPlaced() && this.placedInCell === null;
  }

  /**
   * Get the position where the station is placed
   */
  getPlacedPosition(): Vector3 {
    return { ...this.placedPosition };
  }

  /**
   * Set the rotation of the station
   */
  setStationRotation(rotation: number): void {
    if (this.rotation !== rotation) {
      this.rotation = rotation;
      this.setHeading(rotation);
      this.deltaTrackerStno.trackChange(StnoProperty.ROTATION, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Permission Management
  // ============================================

  /**
   * Set whether this station is publicly accessible
   */
  setPublic(isPublic: boolean): void {
    if (this.isPublic !== isPublic) {
      this.isPublic = isPublic;
      this.deltaTrackerStno.trackChange(StnoProperty.IS_PUBLIC, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Check if a player can use this station
   * @param playerId - The player's object ID
   */
  canUse(playerId: ObjectId): boolean {
    // Owner can always use
    if (playerId === this.placedBy) {
      return true;
    }

    // If public, anyone can use
    if (this.isPublic) {
      return true;
    }

    // Check if player is in the allowed list
    return this.allowedUsers.has(playerId);
  }

  /**
   * Add a player to the allowed users list
   * @param playerId - The player's object ID
   */
  addAllowedUser(playerId: ObjectId): void {
    if (!this.allowedUsers.has(playerId)) {
      this.allowedUsers.add(playerId);
      this.allowedUsersUpdateCounter++;

      this.deltaTrackerStno.trackListAdd(
        StnoProperty.ALLOWED_USERS,
        this.allowedUsers.size - 1,
        playerId
      );
      this.markModified();
    }
  }

  /**
   * Remove a player from the allowed users list
   * @param playerId - The player's object ID
   * @returns true if the player was removed
   */
  removeAllowedUser(playerId: ObjectId): boolean {
    if (this.allowedUsers.has(playerId)) {
      // Find the index before deletion for delta tracking
      const usersArray = Array.from(this.allowedUsers);
      const index = usersArray.indexOf(playerId);

      this.allowedUsers.delete(playerId);
      this.allowedUsersUpdateCounter++;

      this.deltaTrackerStno.trackListRemove(
        StnoProperty.ALLOWED_USERS,
        index,
        playerId
      );
      this.markModified();
      return true;
    }
    return false;
  }

  /**
   * Clear all allowed users
   */
  clearAllowedUsers(): void {
    if (this.allowedUsers.size > 0) {
      this.allowedUsers.clear();
      this.allowedUsersUpdateCounter++;
      this.deltaTrackerStno.trackListClear(StnoProperty.ALLOWED_USERS);
      this.markModified();
    }
  }

  /**
   * Get all allowed users
   */
  getAllowedUsers(): ObjectId[] {
    return Array.from(this.allowedUsers);
  }

  /**
   * Check if a player is in the allowed users list
   */
  isAllowedUser(playerId: ObjectId): boolean {
    return this.allowedUsers.has(playerId);
  }

  /**
   * Get the number of allowed users
   */
  getAllowedUserCount(): number {
    return this.allowedUsers.size;
  }

  // ============================================
  // Placement Validation
  // ============================================

  /**
   * Check if the station can be placed at a location
   * @param position - The proposed position
   * @param isIndoor - Whether the location is indoors
   * @returns true if placement is valid
   */
  canPlaceAt(position: Vector3, isIndoor: boolean): boolean {
    // Check indoor/outdoor rules
    if (isIndoor && !this.placementRules.allowIndoor) {
      return false;
    }
    if (!isIndoor && !this.placementRules.allowOutdoor) {
      return false;
    }

    return true;
  }

  /**
   * Get the reason why placement would fail at a location
   * @returns Error message or null if placement is allowed
   */
  getPlacementError(position: Vector3, isIndoor: boolean): string | null {
    if (isIndoor && !this.placementRules.allowIndoor) {
      return 'This station cannot be placed indoors';
    }
    if (!isIndoor && !this.placementRules.allowOutdoor) {
      return 'This station cannot be placed outdoors';
    }
    return null;
  }

  /**
   * Set custom placement rules
   */
  setPlacementRules(rules: Partial<PlacementRules>): void {
    this.placementRules = {
      ...this.placementRules,
      ...rules,
    };
  }

  // ============================================
  // Ownership
  // ============================================

  /**
   * Check if a player is the owner of this station
   */
  isOwner(playerId: ObjectId): boolean {
    return this.placedBy === playerId;
  }

  /**
   * Transfer ownership to another player
   */
  transferOwnership(newOwnerId: ObjectId): void {
    if (this.placedBy !== newOwnerId) {
      this.placedBy = newOwnerId;
      this.deltaTrackerStno.trackChange(StnoProperty.PLACED_BY, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Enhanced Bonuses
  // ============================================

  /**
   * Get the total assembly bonus (includes station bonus)
   * Override to include station-specific bonuses
   */
  override getAssemblyBonus(): number {
    const baseBonus = super.getAssemblyBonus();
    // Station is already factored into assemblyBonus via applyStationBonuses()
    return baseBonus;
  }

  /**
   * Get the total experimentation bonus (includes station bonus)
   * Override to include station-specific bonuses
   */
  override getExperimentationBonus(): number {
    const baseBonus = super.getExperimentationBonus();
    // Station is already factored into experimentationBonus via applyStationBonuses()
    return baseBonus;
  }

  // ============================================
  // Delta Management
  // ============================================

  /**
   * Check if station-specific properties have changes
   */
  hasStnoChanges(): boolean {
    return this.deltaTrackerStno.hasChanges();
  }

  /**
   * Get the station delta tracker
   */
  getStnoDeltaTracker(): DeltaTracker {
    return this.deltaTrackerStno;
  }

  /**
   * Get the allowed users update counter
   */
  getAllowedUsersUpdateCounter(): number {
    return this.allowedUsersUpdateCounter;
  }

  /**
   * Clear all delta trackers
   */
  override clearAllDeltas(): void {
    super.clearAllDeltas();
    this.deltaTrackerStno.clear();
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Clone station properties to another CraftingStation
   */
  copyStationPropertiesTo(target: CraftingStation): void {
    // Copy crafting tool properties
    this.copyCraftingToolPropertiesTo(target);

    // Copy station-specific properties
    target.stationType = this.stationType;
    target.placedPosition = { ...this.placedPosition };
    target.rotation = this.rotation;
    target.placedInCell = this.placedInCell;
    target.placedBy = this.placedBy;
    target.placementTime = this.placementTime;
    target.isPublic = this.isPublic;
    target.allowedUsers = new Set(this.allowedUsers);
    target.placementRules = { ...this.placementRules };
  }

  /**
   * Serialize to JSON for debugging/persistence
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      stationType: this.stationType,
      stationTypeName: this.getStationTypeName(),
      placedPosition: this.placedPosition,
      rotation: this.rotation,
      placedInCell: this.placedInCell?.toString() ?? null,
      placedBy: this.placedBy.toString(),
      placementTime: this.placementTime,
      isPlaced: this.isPlaced(),
      isIndoors: this.isIndoors(),
      isPublic: this.isPublic,
      allowedUsers: Array.from(this.allowedUsers).map((id) => id.toString()),
      allowedUserCount: this.allowedUsers.size,
      placementRules: this.placementRules,
    };
  }
}
