/**
 * Movement Constants
 * Speed values and modifiers for player movement in SWG
 */

/**
 * Base movement speeds in meters per second
 * These values match the original SWG client expectations
 */
export const MovementSpeed = {
  /** Walking speed (default slow movement) */
  WALK: 1.549,
  /** Running speed (default fast movement) */
  RUN: 5.376,
  /** Burst run speed (sprint ability) */
  BURST_RUN: 8.0,
  /** Swimming speed */
  SWIM: 2.0,
  /** Crawling speed (prone movement) */
  CRAWL: 1.0,
  /** Crouched movement speed */
  CROUCH: 2.5,
  /** Sneaking speed (stealth movement) */
  SNEAK: 2.5,
  /** Climbing speed */
  CLIMB: 1.0,
} as const;

export type MovementSpeedType = (typeof MovementSpeed)[keyof typeof MovementSpeed];

/**
 * Species-specific movement modifiers
 * Applied multiplicatively to base speeds
 */
export const SpeciesModifier = {
  /** Human - baseline */
  HUMAN: 1.0,
  /** Rodian */
  RODIAN: 1.0,
  /** Trandoshan */
  TRANDOSHAN: 1.0,
  /** Mon Calamari */
  MON_CALAMARI: 1.0,
  /** Wookiee - taller, longer legs */
  WOOKIEE: 1.11,
  /** Bothan */
  BOTHAN: 1.0,
  /** Twilek */
  TWILEK: 1.0,
  /** Zabrak */
  ZABRAK: 1.0,
  /** Ithorian */
  ITHORIAN: 1.0,
  /** Sullustan */
  SULLUSTAN: 0.95,
} as const;

export type SpeciesModifierType =
  (typeof SpeciesModifier)[keyof typeof SpeciesModifier];

/**
 * Mount movement speeds
 */
export const MountSpeed = {
  /** Base creature mount speed */
  CREATURE_BASE: 10.0,
  /** Swoop bike base speed */
  SWOOP_BASE: 20.0,
  /** Speeder bike base speed */
  SPEEDER_BASE: 15.0,
  /** AT-ST walking speed */
  ATST_BASE: 8.0,
} as const;

export type MountSpeedType = (typeof MountSpeed)[keyof typeof MountSpeed];

/**
 * Vehicle movement speeds
 */
export const VehicleSpeed = {
  /** Landspeeder base speed */
  LANDSPEEDER: 15.0,
  /** Swoop racing speed */
  SWOOP_RACING: 35.0,
  /** AV-21 base speed */
  AV21: 18.0,
  /** Flash speeder */
  FLASH_SPEEDER: 20.0,
} as const;

export type VehicleSpeedType = (typeof VehicleSpeed)[keyof typeof VehicleSpeed];

/**
 * Terrain movement modifiers
 * Applied when moving over different terrain types
 */
export const TerrainModifier = {
  /** Normal ground */
  NORMAL: 1.0,
  /** Sand (Tatooine deserts) */
  SAND: 0.9,
  /** Mud (Naboo swamps) */
  MUD: 0.7,
  /** Water (shallow) */
  WATER_SHALLOW: 0.8,
  /** Water (deep) - requires swimming */
  WATER_DEEP: 0.5,
  /** Ice/Snow */
  ICE: 0.85,
  /** Rocky terrain */
  ROCKY: 0.9,
  /** Road/Path (faster travel) */
  ROAD: 1.1,
} as const;

export type TerrainModifierType =
  (typeof TerrainModifier)[keyof typeof TerrainModifier];

/**
 * Movement validation constants
 */
export const MovementValidation = {
  /** Maximum allowed speed tolerance (for anti-cheat) */
  SPEED_TOLERANCE: 1.2,
  /** Maximum teleport distance before flagging */
  MAX_TELEPORT_DISTANCE: 50.0,
  /** Minimum time between position updates (ms) */
  MIN_UPDATE_INTERVAL: 50,
  /** Maximum time between position updates before timeout (ms) */
  MAX_UPDATE_INTERVAL: 5000,
  /** Position interpolation threshold */
  INTERPOLATION_THRESHOLD: 0.5,
} as const;

/**
 * Calculate effective movement speed
 * @param baseSpeed - Base movement speed
 * @param speciesModifier - Species-specific modifier
 * @param terrainModifier - Terrain modifier
 * @param postureModifier - Posture modifier (from posture.ts)
 * @returns Effective movement speed in meters per second
 */
export function calculateEffectiveSpeed(
  baseSpeed: number,
  speciesModifier: number = 1.0,
  terrainModifier: number = 1.0,
  postureModifier: number = 1.0
): number {
  return baseSpeed * speciesModifier * terrainModifier * postureModifier;
}

/**
 * Calculate maximum allowed speed for anti-cheat validation
 * @param baseSpeed - Base movement speed
 * @param speciesModifier - Species-specific modifier
 * @returns Maximum allowed speed with tolerance
 */
export function calculateMaxAllowedSpeed(
  baseSpeed: number,
  speciesModifier: number = 1.0
): number {
  return baseSpeed * speciesModifier * MovementValidation.SPEED_TOLERANCE;
}

/**
 * Calculate distance between two 3D points
 * @param x1 - First point X
 * @param y1 - First point Y
 * @param z1 - First point Z
 * @param x2 - Second point X
 * @param y2 - Second point Y
 * @param z2 - Second point Z
 * @returns Distance in meters
 */
export function calculateDistance3D(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate distance between two 2D points (ignoring Y/height)
 * @param x1 - First point X
 * @param z1 - First point Z
 * @param x2 - Second point X
 * @param z2 - Second point Z
 * @returns Distance in meters
 */
export function calculateDistance2D(
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Normalize an angle to [-PI, PI] range
 * @param angle - Angle in radians
 * @returns Normalized angle
 */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Calculate the angular difference between two yaw values
 * @param yaw1 - First yaw angle in radians
 * @param yaw2 - Second yaw angle in radians
 * @returns Angular difference in radians
 */
export function calculateYawDifference(yaw1: number, yaw2: number): number {
  const diff = normalizeAngle(yaw2 - yaw1);
  return Math.abs(diff);
}
