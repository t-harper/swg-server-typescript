/**
 * Space Combat Types
 * Defines types for the JTL space combat system
 *
 * Jump to Lightspeed (JTL) space combat features:
 * - Energy weapons (blasters), ion weapons, missiles, torpedoes
 * - Tracking missiles and countermeasures
 * - Target locking with acquisition time
 * - Directional shields and armor
 * - Component damage and critical hits
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';

// ============================================
// Weapon Types
// ============================================

/**
 * Space weapon types
 */
export enum WeaponType {
  /** Standard energy blaster - rapid fire, low damage */
  BLASTER = 0,
  /** Ion cannon - disables components, low hull damage */
  ION = 1,
  /** Guided missile - tracking, moderate damage */
  MISSILE = 2,
  /** Heavy torpedo - high damage, slow reload */
  TORPEDO = 3,
  /** Space mine - deployable area denial */
  MINE = 4,
  /** Countermeasure - missile defense */
  COUNTERMEASURE = 5,
}

/**
 * Target lock state for weapon systems
 */
export enum TargetLockState {
  /** No lock attempt */
  NONE = 0,
  /** Lock acquisition in progress */
  ACQUIRING = 1,
  /** Target is locked */
  LOCKED = 2,
  /** Lock is being jammed */
  JAMMING = 3,
}

/**
 * Damage types for space combat
 */
export enum DamageType {
  /** Standard energy weapon damage */
  ENERGY = 0,
  /** Kinetic/physical damage (missiles, torpedoes) */
  KINETIC = 1,
  /** Ion damage - effective vs components, shields */
  ION = 2,
}

// ============================================
// Hit Location for Ships
// ============================================

/**
 * Ship hit location for damage direction calculation
 */
export enum ShipHitLocation {
  /** Hit from the front */
  FRONT = 0,
  /** Hit from the rear */
  BACK = 1,
  /** Hit from the left side */
  LEFT = 2,
  /** Hit from the right side */
  RIGHT = 3,
}

// ============================================
// Combat Result Interfaces
// ============================================

/**
 * Result of a space combat attack
 */
export interface CombatResult {
  /** Whether the attack hit the target */
  hit: boolean;
  /** Total damage dealt */
  damage: number;
  /** Damage absorbed by shields */
  shieldDamage: number;
  /** Damage absorbed by armor */
  armorDamage: number;
  /** Damage dealt to hull */
  hullDamage: number;
  /** Damage dealt to components (if any) */
  componentDamage: ComponentDamageResult[];
  /** Whether this was a critical hit */
  criticalHit: boolean;
  /** Direction the attack came from */
  hitLocation: ShipHitLocation;
  /** Type of damage dealt */
  damageType: DamageType;
}

/**
 * Result of damage to a specific component
 */
export interface ComponentDamageResult {
  /** Component slot that was damaged */
  slot: number;
  /** Damage dealt to the component */
  damage: number;
  /** Whether the component was destroyed */
  destroyed: boolean;
  /** Component efficiency after damage (0-1) */
  newEfficiency: number;
}

/**
 * Create an empty combat result
 */
export function createEmptyCombatResult(): CombatResult {
  return {
    hit: false,
    damage: 0,
    shieldDamage: 0,
    armorDamage: 0,
    hullDamage: 0,
    componentDamage: [],
    criticalHit: false,
    hitLocation: ShipHitLocation.FRONT,
    damageType: DamageType.ENERGY,
  };
}

// ============================================
// Projectile State
// ============================================

/**
 * State of a projectile in flight (blaster bolts, unguided ordnance)
 */
export interface ProjectileState {
  /** Unique projectile identifier */
  id: bigint;
  /** Ship that fired this projectile */
  sourceShipId: ObjectId;
  /** Weapon slot that fired */
  weaponSlot: number;
  /** Current position in space */
  position: Vector3;
  /** Velocity vector (direction and speed) */
  velocity: Vector3;
  /** Target ship ID (for hit detection) */
  targetId: ObjectId;
  /** Time this projectile has been in flight (ms) */
  travelTime: number;
  /** Maximum travel time before despawn (ms) */
  maxTravelTime: number;
  /** Weapon type that created this projectile */
  weaponType: WeaponType;
  /** Damage this projectile will deal on hit */
  damage: number;
  /** Damage type */
  damageType: DamageType;
}

/**
 * Create a new projectile state
 */
export function createProjectileState(
  id: bigint,
  sourceShipId: ObjectId,
  weaponSlot: number,
  position: Vector3,
  velocity: Vector3,
  targetId: ObjectId,
  weaponType: WeaponType,
  damage: number,
  damageType: DamageType,
  maxTravelTime: number = 5000
): ProjectileState {
  return {
    id,
    sourceShipId,
    weaponSlot,
    position: { ...position },
    velocity: { ...velocity },
    targetId,
    travelTime: 0,
    maxTravelTime,
    weaponType,
    damage,
    damageType,
  };
}

// ============================================
// Missile State
// ============================================

/**
 * State of a guided missile in flight
 * Extends projectile with tracking capabilities
 */
export interface MissileState extends ProjectileState {
  /** Tracking strength (0-1, higher = better tracking) */
  trackingStrength: number;
  /** Remaining fuel (determines tracking duration) */
  fuel: number;
  /** Maximum fuel capacity */
  maxFuel: number;
  /** Resistance to countermeasures (0-1) */
  countermeasureResistance: number;
  /** Whether the missile is actively tracking */
  isTracking: boolean;
  /** Turn rate in radians per second */
  turnRate: number;
  /** Arming distance (missile won't detonate within this range of launch) */
  armingDistance: number;
  /** Distance traveled since launch */
  distanceTraveled: number;
}

/**
 * Create a new missile state
 */
export function createMissileState(
  id: bigint,
  sourceShipId: ObjectId,
  weaponSlot: number,
  position: Vector3,
  velocity: Vector3,
  targetId: ObjectId,
  damage: number,
  trackingStrength: number = 0.8,
  fuel: number = 10000,
  countermeasureResistance: number = 0.3,
  turnRate: number = Math.PI / 4 // 45 degrees per second
): MissileState {
  return {
    id,
    sourceShipId,
    weaponSlot,
    position: { ...position },
    velocity: { ...velocity },
    targetId,
    travelTime: 0,
    maxTravelTime: 15000,
    weaponType: WeaponType.MISSILE,
    damage,
    damageType: DamageType.KINETIC,
    trackingStrength,
    fuel,
    maxFuel: fuel,
    countermeasureResistance,
    isTracking: true,
    turnRate,
    armingDistance: 100,
    distanceTraveled: 0,
  };
}

/**
 * Check if a projectile state is a missile
 */
export function isMissileState(projectile: ProjectileState): projectile is MissileState {
  return 'trackingStrength' in projectile;
}

// ============================================
// Countermeasure State
// ============================================

/**
 * State of a deployed countermeasure
 */
export interface CountermeasureState {
  /** Unique countermeasure identifier */
  id: bigint;
  /** Ship that deployed this countermeasure */
  sourceShipId: ObjectId;
  /** Current position in space */
  position: Vector3;
  /** Effectiveness against missiles (0-1) */
  effectiveness: number;
  /** Remaining duration before despawn (ms) */
  remainingDuration: number;
  /** Maximum effect radius */
  effectRadius: number;
}

/**
 * Create a new countermeasure state
 */
export function createCountermeasureState(
  id: bigint,
  sourceShipId: ObjectId,
  position: Vector3,
  effectiveness: number = 0.7,
  duration: number = 5000,
  effectRadius: number = 500
): CountermeasureState {
  return {
    id,
    sourceShipId,
    position: { ...position },
    effectiveness,
    remainingDuration: duration,
    effectRadius,
  };
}

// ============================================
// Target Lock State
// ============================================

/**
 * Target lock information for a ship
 */
export interface TargetLockInfo {
  /** ID of the ship being locked onto */
  targetId: ObjectId;
  /** Current lock state */
  state: TargetLockState;
  /** Lock acquisition progress (0-1) */
  progress: number;
  /** Time to acquire lock (ms) */
  acquisitionTime: number;
  /** Time lock has been held (ms) */
  lockHeldTime: number;
  /** Whether lock was broken by jamming */
  jammed: boolean;
}

/**
 * Create a new target lock info
 */
export function createTargetLockInfo(
  targetId: ObjectId,
  acquisitionTime: number = 2000
): TargetLockInfo {
  return {
    targetId,
    state: TargetLockState.ACQUIRING,
    progress: 0,
    acquisitionTime,
    lockHeldTime: 0,
    jammed: false,
  };
}

// ============================================
// Weapon Stats
// ============================================

/**
 * Space weapon statistics
 */
export interface SpaceWeaponStats {
  /** Weapon type */
  type: WeaponType;
  /** Minimum damage per hit */
  minDamage: number;
  /** Maximum damage per hit */
  maxDamage: number;
  /** Projectile speed in m/s */
  projectileSpeed: number;
  /** Effective range in meters */
  effectiveRange: number;
  /** Maximum range in meters */
  maxRange: number;
  /** Refire rate in shots per second */
  refireRate: number;
  /** Energy cost per shot */
  energyCost: number;
  /** Damage type */
  damageType: DamageType;
  /** Tracking strength for guided weapons (0-1) */
  trackingStrength: number;
  /** Current ammunition (-1 for energy weapons) */
  ammoCount: number;
  /** Maximum ammunition (-1 for energy weapons) */
  maxAmmo: number;
}

/**
 * Create default weapon stats for a weapon type
 */
export function createDefaultWeaponStats(type: WeaponType): SpaceWeaponStats {
  switch (type) {
    case WeaponType.BLASTER:
      return {
        type,
        minDamage: 50,
        maxDamage: 100,
        projectileSpeed: 1000,
        effectiveRange: 500,
        maxRange: 800,
        refireRate: 4.0,
        energyCost: 15,
        damageType: DamageType.ENERGY,
        trackingStrength: 0,
        ammoCount: -1,
        maxAmmo: -1,
      };
    case WeaponType.ION:
      return {
        type,
        minDamage: 30,
        maxDamage: 60,
        projectileSpeed: 800,
        effectiveRange: 400,
        maxRange: 600,
        refireRate: 2.0,
        energyCost: 30,
        damageType: DamageType.ION,
        trackingStrength: 0,
        ammoCount: -1,
        maxAmmo: -1,
      };
    case WeaponType.MISSILE:
      return {
        type,
        minDamage: 200,
        maxDamage: 400,
        projectileSpeed: 200,
        effectiveRange: 1000,
        maxRange: 1500,
        refireRate: 0.33,
        energyCost: 0,
        damageType: DamageType.KINETIC,
        trackingStrength: 0.8,
        ammoCount: 20,
        maxAmmo: 20,
      };
    case WeaponType.TORPEDO:
      return {
        type,
        minDamage: 500,
        maxDamage: 1000,
        projectileSpeed: 150,
        effectiveRange: 1500,
        maxRange: 2000,
        refireRate: 0.2,
        energyCost: 0,
        damageType: DamageType.KINETIC,
        trackingStrength: 0.6,
        ammoCount: 8,
        maxAmmo: 8,
      };
    case WeaponType.MINE:
      return {
        type,
        minDamage: 300,
        maxDamage: 600,
        projectileSpeed: 0,
        effectiveRange: 100,
        maxRange: 100,
        refireRate: 0.5,
        energyCost: 0,
        damageType: DamageType.KINETIC,
        trackingStrength: 0,
        ammoCount: 10,
        maxAmmo: 10,
      };
    case WeaponType.COUNTERMEASURE:
      return {
        type,
        minDamage: 0,
        maxDamage: 0,
        projectileSpeed: 50,
        effectiveRange: 500,
        maxRange: 500,
        refireRate: 0.5,
        energyCost: 10,
        damageType: DamageType.ENERGY,
        trackingStrength: 0,
        ammoCount: 20,
        maxAmmo: 20,
      };
    default:
      return createDefaultWeaponStats(WeaponType.BLASTER);
  }
}

// ============================================
// Combat Configuration
// ============================================

/**
 * Space combat configuration constants
 */
export interface SpaceCombatConfig {
  /** Base hit chance at optimal range (0-1) */
  baseHitChance: number;
  /** Hit chance reduction per 100m beyond effective range */
  rangeHitPenalty: number;
  /** Hit chance reduction based on target speed (per 100 m/s) */
  speedHitPenalty: number;
  /** Base critical hit chance (0-1) */
  baseCriticalChance: number;
  /** Critical hit damage multiplier */
  criticalDamageMultiplier: number;
  /** Shield damage reduction factor for energy weapons */
  shieldEnergyAbsorption: number;
  /** Shield damage reduction factor for kinetic weapons */
  shieldKineticAbsorption: number;
  /** Ion damage multiplier vs shields */
  ionShieldMultiplier: number;
  /** Ion damage multiplier vs components */
  ionComponentMultiplier: number;
  /** Chance to hit a component when hull is damaged (0-1) */
  componentHitChance: number;
  /** Target lock acquisition time base (ms) */
  baseLockTime: number;
  /** Missile tracking update interval (ms) */
  missileTrackingInterval: number;
  /** Projectile update interval (ms) */
  projectileUpdateInterval: number;
}

/**
 * Default space combat configuration
 */
export const DEFAULT_SPACE_COMBAT_CONFIG: SpaceCombatConfig = {
  baseHitChance: 0.85,
  rangeHitPenalty: 0.1,
  speedHitPenalty: 0.05,
  baseCriticalChance: 0.05,
  criticalDamageMultiplier: 2.0,
  shieldEnergyAbsorption: 1.0,
  shieldKineticAbsorption: 0.8,
  ionShieldMultiplier: 1.5,
  ionComponentMultiplier: 2.0,
  componentHitChance: 0.15,
  baseLockTime: 2000,
  missileTrackingInterval: 100,
  projectileUpdateInterval: 50,
};

// ============================================
// Ship Combat Stats
// ============================================

/**
 * Combat-relevant stats for a ship
 */
export interface ShipCombatStats {
  /** Ship object ID */
  shipId: ObjectId;
  /** Current front shield HP */
  shieldFront: number;
  /** Maximum front shield HP */
  shieldFrontMax: number;
  /** Current rear shield HP */
  shieldBack: number;
  /** Maximum rear shield HP */
  shieldBackMax: number;
  /** Current armor values by direction */
  armor: {
    front: number;
    back: number;
    left: number;
    right: number;
  };
  /** Maximum armor values by direction */
  armorMax: {
    front: number;
    back: number;
    left: number;
    right: number;
  };
  /** Current hull HP */
  hull: number;
  /** Maximum hull HP */
  hullMax: number;
  /** Current capacitor energy */
  capacitorEnergy: number;
  /** Maximum capacitor energy */
  capacitorEnergyMax: number;
  /** Ship's current speed */
  speed: number;
  /** Ship's maximum speed */
  maxSpeed: number;
  /** Ship's size factor (affects hit chance) */
  sizeFactor: number;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get weapon type display name
 */
export function getWeaponTypeName(type: WeaponType): string {
  switch (type) {
    case WeaponType.BLASTER:
      return 'Blaster';
    case WeaponType.ION:
      return 'Ion Cannon';
    case WeaponType.MISSILE:
      return 'Missile';
    case WeaponType.TORPEDO:
      return 'Torpedo';
    case WeaponType.MINE:
      return 'Mine';
    case WeaponType.COUNTERMEASURE:
      return 'Countermeasure';
    default:
      return 'Unknown';
  }
}

/**
 * Get damage type display name
 */
export function getDamageTypeName(type: DamageType): string {
  switch (type) {
    case DamageType.ENERGY:
      return 'Energy';
    case DamageType.KINETIC:
      return 'Kinetic';
    case DamageType.ION:
      return 'Ion';
    default:
      return 'Unknown';
  }
}

/**
 * Get target lock state display name
 */
export function getTargetLockStateName(state: TargetLockState): string {
  switch (state) {
    case TargetLockState.NONE:
      return 'No Lock';
    case TargetLockState.ACQUIRING:
      return 'Acquiring';
    case TargetLockState.LOCKED:
      return 'Locked';
    case TargetLockState.JAMMING:
      return 'Jammed';
    default:
      return 'Unknown';
  }
}

/**
 * Calculate hit location based on attack direction
 */
export function calculateHitLocation(
  attackerPosition: Vector3,
  targetPosition: Vector3,
  targetHeading: number
): ShipHitLocation {
  // Calculate direction from target to attacker
  const dx = attackerPosition.x - targetPosition.x;
  const dz = attackerPosition.z - targetPosition.z;
  const angleToAttacker = Math.atan2(dx, dz);

  // Calculate relative angle (0 = front, PI = back)
  let relativeAngle = angleToAttacker - targetHeading;

  // Normalize to -PI to PI
  while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
  while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

  // Convert to absolute angle
  const absAngle = Math.abs(relativeAngle);

  // Determine hit location based on angle
  if (absAngle < Math.PI / 4) {
    return ShipHitLocation.FRONT;
  } else if (absAngle > (3 * Math.PI) / 4) {
    return ShipHitLocation.BACK;
  } else if (relativeAngle > 0) {
    return ShipHitLocation.RIGHT;
  } else {
    return ShipHitLocation.LEFT;
  }
}

/**
 * Check if a weapon requires ammunition
 */
export function weaponRequiresAmmo(type: WeaponType): boolean {
  return (
    type === WeaponType.MISSILE ||
    type === WeaponType.TORPEDO ||
    type === WeaponType.MINE ||
    type === WeaponType.COUNTERMEASURE
  );
}

/**
 * Check if a weapon is a guided/tracking weapon
 */
export function isGuidedWeapon(type: WeaponType): boolean {
  return type === WeaponType.MISSILE || type === WeaponType.TORPEDO;
}

/**
 * Calculate 3D distance between two points
 */
export function distance3D(a: Vector3, b: Vector3): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Normalize a vector
 */
export function normalizeVector(v: Vector3): Vector3 {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (length === 0) return { x: 0, y: 0, z: 1 };
  return {
    x: v.x / length,
    y: v.y / length,
    z: v.z / length,
  };
}

/**
 * Calculate dot product of two vectors
 */
export function dotProduct(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
