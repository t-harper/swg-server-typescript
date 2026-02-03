/**
 * Building Types and Constants
 * Types, enums, and interfaces for player-placed structures in SWG
 *
 * Player structures (buildings) are placeable objects that:
 * - Consume lots from the player's lot allowance
 * - Require maintenance payments to avoid decay
 * - Can have permission lists for access control
 * - Support public/private entry modes
 * - Contain cells for interior organization
 */

import type { ObjectId } from '@swg/shared-types';

/**
 * Building type enumeration
 * Determines the functionality and purpose of the structure
 */
export enum BuildingType {
  /** Player housing - residential structures */
  PlayerHouse = 0,
  /** Guild hall - for guild operations and storage */
  GuildHall = 1,
  /** City hall - for player city governance */
  CityHall = 2,
  /** Cantina - entertainment venue */
  Cantina = 3,
  /** Medical center - healing and buffs */
  MedicalCenter = 4,
  /** Shuttle port - travel hub for player cities */
  ShuttlePort = 5,
  /** Cloning facility - respawn point */
  Cloner = 6,
  /** Factory - manufacturing installation */
  Factory = 7,
  /** Harvester - resource extraction installation */
  Harvester = 8,
  /** Generator - power generation for installations */
  Generator = 9,
}

/**
 * Structure condition state enumeration
 * Represents the decay state of a building
 */
export enum StructureConditionState {
  /** Structure is in good condition (100-75% condition) */
  Good = 0,
  /** Structure is damaged (74-50% condition) */
  Damaged = 1,
  /** Structure is in critical condition (49-25% condition) */
  Critical = 2,
  /** Structure is destroyed (below 25% or no maintenance) */
  Destroyed = 3,
}

/**
 * Building permission flags
 * Defines what actions a player can perform on a structure
 */
export enum BuildingPermission {
  /** Can enter the structure */
  Enter = 1 << 0,
  /** Has full administrative access */
  Admin = 1 << 1,
  /** Can use vendor terminals */
  Vendor = 1 << 2,
  /** Can access hoppers on installations */
  Hopper = 1 << 3,
  /** Can access storage containers */
  Storage = 1 << 4,
}

/**
 * Permission entry for a character on a structure
 */
export interface PermissionEntry {
  /** Character object ID */
  characterId: ObjectId;
  /** Character name for display */
  characterName: string;
  /** Set of permissions granted */
  permissions: Set<BuildingPermission>;
}

/**
 * Maintenance status for a structure
 */
export interface MaintenanceStatus {
  /** Current credits in maintenance pool */
  pool: number;
  /** Daily maintenance cost in credits */
  costPerDay: number;
  /** Timestamp of last maintenance payment */
  lastPayment: Date;
  /** Estimated days of maintenance remaining */
  daysRemaining: number;
}

/**
 * Power status for installations that require power
 */
export interface PowerStatus {
  /** Current power units available */
  currentPower: number;
  /** Power units required for operation */
  requiredPower: number;
  /** Whether the structure has sufficient power */
  isPowered: boolean;
}

// ============================================
// Constants
// ============================================

/**
 * Maximum number of entries in a structure's permission list
 */
export const MAX_PERMISSION_LIST = 50;

/**
 * Structure decay rate (condition loss per day when out of maintenance)
 * Expressed as percentage points per day
 */
export const STRUCTURE_DECAY_RATE = 5;

/**
 * Default maintenance costs by building type (credits per day)
 */
export const DEFAULT_MAINTENANCE_COSTS: Record<BuildingType, number> = {
  [BuildingType.PlayerHouse]: 100,
  [BuildingType.GuildHall]: 500,
  [BuildingType.CityHall]: 1000,
  [BuildingType.Cantina]: 300,
  [BuildingType.MedicalCenter]: 400,
  [BuildingType.ShuttlePort]: 800,
  [BuildingType.Cloner]: 600,
  [BuildingType.Factory]: 200,
  [BuildingType.Harvester]: 150,
  [BuildingType.Generator]: 100,
};

/**
 * Default lot costs by building type
 */
export const DEFAULT_LOT_COSTS: Record<BuildingType, number> = {
  [BuildingType.PlayerHouse]: 1,
  [BuildingType.GuildHall]: 5,
  [BuildingType.CityHall]: 10,
  [BuildingType.Cantina]: 3,
  [BuildingType.MedicalCenter]: 3,
  [BuildingType.ShuttlePort]: 5,
  [BuildingType.Cloner]: 2,
  [BuildingType.Factory]: 1,
  [BuildingType.Harvester]: 1,
  [BuildingType.Generator]: 1,
};

/**
 * Default power requirements by building type
 */
export const DEFAULT_POWER_REQUIREMENTS: Record<BuildingType, number> = {
  [BuildingType.PlayerHouse]: 0,
  [BuildingType.GuildHall]: 0,
  [BuildingType.CityHall]: 100,
  [BuildingType.Cantina]: 50,
  [BuildingType.MedicalCenter]: 75,
  [BuildingType.ShuttlePort]: 200,
  [BuildingType.Cloner]: 100,
  [BuildingType.Factory]: 100,
  [BuildingType.Harvester]: 50,
  [BuildingType.Generator]: 0,
};

/**
 * Get display name for a building type
 */
export function getBuildingTypeName(type: BuildingType): string {
  switch (type) {
    case BuildingType.PlayerHouse:
      return 'Player House';
    case BuildingType.GuildHall:
      return 'Guild Hall';
    case BuildingType.CityHall:
      return 'City Hall';
    case BuildingType.Cantina:
      return 'Cantina';
    case BuildingType.MedicalCenter:
      return 'Medical Center';
    case BuildingType.ShuttlePort:
      return 'Shuttle Port';
    case BuildingType.Cloner:
      return 'Cloning Facility';
    case BuildingType.Factory:
      return 'Factory';
    case BuildingType.Harvester:
      return 'Harvester';
    case BuildingType.Generator:
      return 'Generator';
    default:
      return 'Unknown Structure';
  }
}

/**
 * Get display name for a condition state
 */
export function getConditionStateName(state: StructureConditionState): string {
  switch (state) {
    case StructureConditionState.Good:
      return 'Good';
    case StructureConditionState.Damaged:
      return 'Damaged';
    case StructureConditionState.Critical:
      return 'Critical';
    case StructureConditionState.Destroyed:
      return 'Destroyed';
    default:
      return 'Unknown';
  }
}

/**
 * Get condition state from condition percentage
 */
export function getConditionStateFromPercent(conditionPercent: number): StructureConditionState {
  if (conditionPercent >= 75) {
    return StructureConditionState.Good;
  } else if (conditionPercent >= 50) {
    return StructureConditionState.Damaged;
  } else if (conditionPercent >= 25) {
    return StructureConditionState.Critical;
  }
  return StructureConditionState.Destroyed;
}

/**
 * Check if a permission flag is set
 */
export function hasPermission(permissions: Set<BuildingPermission>, permission: BuildingPermission): boolean {
  return permissions.has(permission);
}

/**
 * Create a permission set from flags
 */
export function createPermissionSet(...permissions: BuildingPermission[]): Set<BuildingPermission> {
  return new Set(permissions);
}
