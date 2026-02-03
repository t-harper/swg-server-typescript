/**
 * Housing Types and Constants
 * Type definitions for the player housing and lot management system
 *
 * The housing system manages:
 * - Lot ownership and allocation based on skills
 * - Structure placement validation
 * - No-build zone enforcement
 * - Proximity checks between structures
 * - City placement restrictions
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import { BuildingType } from '@swg/objects';

// ============================================
// Lot Management
// ============================================

/**
 * Represents a lot owned by a player
 */
export interface Lot {
  /** Player who owns this lot */
  ownerId: ObjectId;
  /** World position of the lot */
  position: Vector3;
  /** Planet/zone where the lot is located */
  planetId: string;
  /** Structure placed on this lot (if any) */
  structureId?: ObjectId;
  /** Timestamp when lot was reserved */
  reservedAt: Date;
}

/**
 * Result of a placement validation check
 */
export interface PlacementValidationResult {
  /** Whether placement is valid */
  valid: boolean;
  /** Error code if invalid */
  errorCode: PlacementErrorCode;
  /** Human-readable error message */
  errorMessage?: string;
}

/**
 * Limits and allocation for a player's housing
 */
export interface HousingLimits {
  /** Maximum number of lots the player can have */
  maxLots: number;
  /** Maximum number of structures the player can own */
  maxStructures: number;
  /** Skills that provide extra lots */
  extraLotSkills: string[];
}

// ============================================
// Placement Error Codes
// ============================================

/**
 * Error codes for structure placement validation
 */
export enum PlacementErrorCode {
  /** Placement is valid */
  Success = 0,
  /** Player has no available lots */
  NoLots = 1,
  /** Invalid location (out of bounds, water, etc.) */
  InvalidLocation = 2,
  /** Too close to another structure */
  TooCloseToStructure = 3,
  /** Within city limits (non-civic structures) */
  InCityLimits = 4,
  /** In a no-build zone */
  InNoBuildZone = 5,
  /** Terrain not suitable for this structure */
  TerrainNotSuitable = 6,
  /** Player does not own this location */
  NotOwned = 7,
  /** Structure already exists at this location */
  AlreadyOccupied = 8,
  /** Invalid structure type for this location */
  InvalidStructureType = 9,
  /** Player lacks required skill to place structure */
  MissingSkill = 10,
  /** Structure cannot be placed on this planet */
  InvalidPlanet = 11,
  /** Too far from city center (civic structures) */
  TooFarFromCity = 12,
  /** Structure placement is disabled */
  PlacementDisabled = 13,
  /** Deed is invalid or expired */
  InvalidDeed = 14,
  /** Player already owns maximum structures */
  MaxStructuresReached = 15,
}

/**
 * Get a human-readable message for a placement error code
 */
export function getPlacementErrorMessage(code: PlacementErrorCode): string {
  switch (code) {
    case PlacementErrorCode.Success:
      return 'Placement successful';
    case PlacementErrorCode.NoLots:
      return 'You do not have any available lots';
    case PlacementErrorCode.InvalidLocation:
      return 'This is not a valid location for placement';
    case PlacementErrorCode.TooCloseToStructure:
      return 'Too close to another structure';
    case PlacementErrorCode.InCityLimits:
      return 'Cannot place structures within city limits';
    case PlacementErrorCode.InNoBuildZone:
      return 'Cannot build in this area';
    case PlacementErrorCode.TerrainNotSuitable:
      return 'The terrain is not suitable for this structure';
    case PlacementErrorCode.NotOwned:
      return 'You do not own this location';
    case PlacementErrorCode.AlreadyOccupied:
      return 'A structure already exists at this location';
    case PlacementErrorCode.InvalidStructureType:
      return 'This structure type cannot be placed here';
    case PlacementErrorCode.MissingSkill:
      return 'You lack the required skill to place this structure';
    case PlacementErrorCode.InvalidPlanet:
      return 'This structure cannot be placed on this planet';
    case PlacementErrorCode.TooFarFromCity:
      return 'Civic structures must be placed near a city center';
    case PlacementErrorCode.PlacementDisabled:
      return 'Structure placement is currently disabled';
    case PlacementErrorCode.InvalidDeed:
      return 'The deed is invalid or has expired';
    case PlacementErrorCode.MaxStructuresReached:
      return 'You have reached the maximum number of structures';
    default:
      return 'Unknown error';
  }
}

// ============================================
// Deed Template Interface
// ============================================

/**
 * Deed template data for structure placement
 */
export interface DeedTemplate {
  /** Template CRC for the structure */
  templateCrc: number;
  /** Building type */
  buildingType: BuildingType;
  /** Lot cost for this structure */
  lotCost: number;
  /** Required skill to place (if any) */
  requiredSkill?: string;
  /** Minimum terrain slope allowed */
  minTerrainSlope?: number;
  /** Maximum terrain slope allowed */
  maxTerrainSlope?: number;
  /** Whether this is a civic structure (city only) */
  isCivicStructure?: boolean;
  /** Planets where this structure can be placed (empty = all) */
  allowedPlanets?: string[];
}

// ============================================
// No-Build Zone Types
// ============================================

/**
 * Circular no-build zone
 */
export interface NoBuildCircle {
  type: 'circle';
  planetId: string;
  center: { x: number; z: number };
  radius: number;
  reason: string;
}

/**
 * Rectangular no-build zone
 */
export interface NoBuildRectangle {
  type: 'rectangle';
  planetId: string;
  min: { x: number; z: number };
  max: { x: number; z: number };
  reason: string;
}

/**
 * No-build region (can be circle or rectangle)
 */
export type NoBuildRegion = NoBuildCircle | NoBuildRectangle;

// ============================================
// Constants
// ============================================

/**
 * Minimum distance between lot centers (in meters)
 */
export const LOT_DISTANCE = 64;

/**
 * Minimum distance between structure edges (in meters)
 */
export const STRUCTURE_MIN_DISTANCE = 10;

/**
 * Default distance from NPC cities for no-build zones (in meters)
 */
export const NPC_CITY_NO_BUILD_RADIUS = 500;

/**
 * Maximum terrain slope for structure placement (in degrees)
 */
export const MAX_TERRAIN_SLOPE = 10;

/**
 * Base lots for a new player
 */
export const BASE_LOT_COUNT = 10;

/**
 * Lots granted per Novice Architect skill
 */
export const ARCHITECT_LOTS_PER_SKILL = 1;

/**
 * Lots granted per Politician skill box
 */
export const POLITICIAN_LOTS_PER_SKILL = 1;

/**
 * Maximum lots a player can have
 */
export const MAX_LOTS = 25;

/**
 * Skills that provide additional lots
 */
export const LOT_GRANTING_SKILLS: Record<string, number> = {
  // Architect skills
  'crafting_architect_novice': 1,
  'crafting_architect_master': 2,
  // Politician skills
  'social_politician_novice': 1,
  'social_politician_city_01': 1,
  'social_politician_city_02': 1,
  'social_politician_city_03': 1,
  'social_politician_city_04': 1,
  'social_politician_master': 2,
};

/**
 * Lot costs by building type
 * Maps BuildingType enum to lot consumption
 */
export const LOT_COSTS_BY_TYPE: Record<BuildingType, number> = {
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
 * Pre-defined no-build regions for the game world
 * These typically include NPC cities, POIs, and restricted areas
 */
export const NO_BUILD_REGIONS: NoBuildRegion[] = [
  // Tatooine
  {
    type: 'circle',
    planetId: 'tatooine',
    center: { x: -2902, z: 2130 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Mos Eisley',
  },
  {
    type: 'circle',
    planetId: 'tatooine',
    center: { x: 3528, z: -4804 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Mos Espa',
  },
  {
    type: 'circle',
    planetId: 'tatooine',
    center: { x: -5045, z: -6552 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Anchorhead',
  },
  {
    type: 'circle',
    planetId: 'tatooine',
    center: { x: 1289, z: 3128 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Bestine',
  },
  // Naboo
  {
    type: 'circle',
    planetId: 'naboo',
    center: { x: -4856, z: 4162 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Theed',
  },
  {
    type: 'circle',
    planetId: 'naboo',
    center: { x: 4724, z: -4716 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Moenia',
  },
  {
    type: 'circle',
    planetId: 'naboo',
    center: { x: 1453, z: -3849 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Keren',
  },
  {
    type: 'circle',
    planetId: 'naboo',
    center: { x: -5485, z: -48 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Kaadara',
  },
  // Corellia
  {
    type: 'circle',
    planetId: 'corellia',
    center: { x: -137, z: -4723 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Coronet',
  },
  {
    type: 'circle',
    planetId: 'corellia',
    center: { x: 3349, z: 5525 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Tyrena',
  },
  {
    type: 'circle',
    planetId: 'corellia',
    center: { x: -5463, z: -2686 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Kor Vella',
  },
  {
    type: 'circle',
    planetId: 'corellia',
    center: { x: 6767, z: -5617 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Doaba Guerfel',
  },
  // Dantooine
  {
    type: 'circle',
    planetId: 'dantooine',
    center: { x: 1574, z: -6383 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Mining Outpost',
  },
  // Dathomir
  {
    type: 'circle',
    planetId: 'dathomir',
    center: { x: -72, z: -1587 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Trade Outpost',
  },
  // Endor
  {
    type: 'circle',
    planetId: 'endor',
    center: { x: -949, z: 1550 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Research Outpost',
  },
  // Lok
  {
    type: 'circle',
    planetId: 'lok',
    center: { x: 476, z: 5116 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Nym\'s Stronghold',
  },
  // Rori
  {
    type: 'circle',
    planetId: 'rori',
    center: { x: -5312, z: -2183 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Narmle',
  },
  {
    type: 'circle',
    planetId: 'rori',
    center: { x: 4439, z: -4706 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Restuss',
  },
  // Talus
  {
    type: 'circle',
    planetId: 'talus',
    center: { x: -2175, z: 2319 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Dearic',
  },
  {
    type: 'circle',
    planetId: 'talus',
    center: { x: 4432, z: 5347 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Nashal',
  },
  // Yavin4
  {
    type: 'circle',
    planetId: 'yavin4',
    center: { x: -6929, z: -5730 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Labor Outpost',
  },
  {
    type: 'circle',
    planetId: 'yavin4',
    center: { x: 4052, z: -6222 },
    radius: NPC_CITY_NO_BUILD_RADIUS,
    reason: 'Mining Outpost',
  },
];

/**
 * Planets where player housing is allowed
 */
export const HOUSING_ALLOWED_PLANETS: string[] = [
  'tatooine',
  'naboo',
  'corellia',
  'dantooine',
  'dathomir',
  'endor',
  'lok',
  'rori',
  'talus',
  'yavin4',
];

/**
 * Planets where player housing is NOT allowed
 */
export const HOUSING_DISALLOWED_PLANETS: string[] = [
  'kashyyyk',
  'mustafar',
  'tutorial',
  'space_*',
];
