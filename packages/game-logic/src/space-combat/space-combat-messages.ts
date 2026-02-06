/**
 * Space Combat Network Messages
 * Protocol message types for space combat client-server communication
 *
 * Handles:
 * - WeaponFireMessage
 * - MissileTrackingMessage
 * - CountermeasureDeployMessage
 * - TargetLockMessage
 * - ShipHitMessage
 * - CriticalHitMessage
 * - ShipDestructionMessage
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  WeaponType,
  TargetLockState,
  DamageType,
  ShipHitLocation,
  type ComponentDamageResult,
} from './space-combat-types.js';

// ============================================
// Message Opcodes
// ============================================

/**
 * Space combat message opcodes
 */
export const SpaceCombatMessageOpcode = {
  /** Client request to fire weapon */
  WeaponFire: 0x5c001001,
  /** Server response to weapon fire */
  WeaponFireResponse: 0x5c001002,
  /** Server notification of projectile spawn */
  ProjectileSpawn: 0x5c001003,
  /** Server update of projectile position */
  ProjectileUpdate: 0x5c001004,
  /** Server notification of projectile despawn */
  ProjectileDespawn: 0x5c001005,
  /** Server notification of missile tracking update */
  MissileTracking: 0x5c001006,
  /** Client request to deploy countermeasure */
  CountermeasureDeploy: 0x5c001007,
  /** Server response to countermeasure deploy */
  CountermeasureDeployResponse: 0x5c001008,
  /** Server notification of countermeasure active */
  CountermeasureActive: 0x5c001009,
  /** Client request to acquire target lock */
  TargetLockRequest: 0x5c00100a,
  /** Server update on target lock status */
  TargetLockUpdate: 0x5c00100b,
  /** Server notification of ship being hit */
  ShipHit: 0x5c00100c,
  /** Server notification of critical hit */
  CriticalHit: 0x5c00100d,
  /** Server notification of component damage */
  ComponentDamage: 0x5c00100e,
  /** Server notification of ship destruction */
  ShipDestruction: 0x5c00100f,
  /** Server update of ship damage state */
  ShipDamageUpdate: 0x5c001010,
  /** Client request to launch missile */
  MissileLaunch: 0x5c001011,
  /** Server notification of missile lock warning */
  MissileLockWarning: 0x5c001012,
  /** Client request to fire turret */
  TurretFire: 0x5c001013,
  /** Server notification of turret status */
  TurretStatus: 0x5c001014,
} as const;

export type SpaceCombatMessageOpcodeType =
  (typeof SpaceCombatMessageOpcode)[keyof typeof SpaceCombatMessageOpcode];

// ============================================
// Weapon Fire Messages
// ============================================

/**
 * WeaponFireMessage - Client request to fire a weapon
 */
export interface WeaponFireMessage {
  opcode: typeof SpaceCombatMessageOpcode.WeaponFire;
  /** Ship firing the weapon */
  shipId: ObjectId;
  /** Weapon slot to fire */
  weaponSlot: number;
  /** Target ship ID */
  targetId: ObjectId;
  /** Weapon group (for linked fire) */
  weaponGroup: number;
}

/**
 * WeaponFireResponseMessage - Server response to weapon fire
 */
export interface WeaponFireResponseMessage {
  opcode: typeof SpaceCombatMessageOpcode.WeaponFireResponse;
  /** Whether the weapon fired */
  success: boolean;
  /** Projectile ID if created */
  projectileId: bigint;
  /** Weapon slot that fired */
  weaponSlot: number;
  /** Energy consumed */
  energyConsumed: number;
  /** Ammo consumed */
  ammoConsumed: number;
  /** Remaining ammo (-1 for energy weapons) */
  remainingAmmo: number;
  /** Remaining capacitor energy */
  remainingEnergy: number;
  /** Error message if failed */
  errorMessage: string;
}

/**
 * ProjectileSpawnMessage - Server notification of new projectile
 */
export interface ProjectileSpawnMessage {
  opcode: typeof SpaceCombatMessageOpcode.ProjectileSpawn;
  /** Unique projectile ID */
  projectileId: bigint;
  /** Ship that fired */
  sourceShipId: ObjectId;
  /** Weapon slot */
  weaponSlot: number;
  /** Weapon type */
  weaponType: WeaponType;
  /** Starting position */
  positionX: number;
  positionY: number;
  positionZ: number;
  /** Velocity */
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  /** Target ship ID */
  targetId: ObjectId;
  /** Whether this is a guided projectile */
  isGuided: boolean;
}

/**
 * ProjectileUpdateMessage - Server update of projectile position
 */
export interface ProjectileUpdateMessage {
  opcode: typeof SpaceCombatMessageOpcode.ProjectileUpdate;
  /** Projectile ID */
  projectileId: bigint;
  /** Current position */
  positionX: number;
  positionY: number;
  positionZ: number;
  /** Current velocity (for guided projectiles that changed course) */
  velocityX: number;
  velocityY: number;
  velocityZ: number;
}

/**
 * ProjectileDespawnMessage - Server notification of projectile removal
 */
export interface ProjectileDespawnMessage {
  opcode: typeof SpaceCombatMessageOpcode.ProjectileDespawn;
  /** Projectile ID */
  projectileId: bigint;
  /** Reason for despawn */
  reason: ProjectileDespawnReason;
}

/**
 * Reason for projectile despawn
 */
export enum ProjectileDespawnReason {
  /** Projectile hit a target */
  Hit = 0,
  /** Projectile reached max range */
  MaxRange = 1,
  /** Projectile ran out of fuel (missiles) */
  OutOfFuel = 2,
  /** Projectile was countered */
  Countered = 3,
  /** Projectile missed */
  Missed = 4,
}

// ============================================
// Missile Messages
// ============================================

/**
 * MissileLaunchMessage - Client request to launch a missile
 */
export interface MissileLaunchMessage {
  opcode: typeof SpaceCombatMessageOpcode.MissileLaunch;
  /** Ship launching the missile */
  shipId: ObjectId;
  /** Weapon slot */
  weaponSlot: number;
  /** Target ship ID */
  targetId: ObjectId;
}

/**
 * MissileTrackingMessage - Server update on missile tracking
 */
export interface MissileTrackingMessage {
  opcode: typeof SpaceCombatMessageOpcode.MissileTracking;
  /** Missile ID */
  missileId: bigint;
  /** Current position */
  positionX: number;
  positionY: number;
  positionZ: number;
  /** Current velocity */
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  /** Target ship ID */
  targetId: ObjectId;
  /** Remaining fuel percentage (0-1) */
  fuelRemaining: number;
  /** Whether actively tracking */
  isTracking: boolean;
  /** Distance to target */
  distanceToTarget: number;
}

/**
 * MissileLockWarningMessage - Server notification of incoming missile
 */
export interface MissileLockWarningMessage {
  opcode: typeof SpaceCombatMessageOpcode.MissileLockWarning;
  /** Target ship being warned */
  targetShipId: ObjectId;
  /** Attacker ship */
  attackerShipId: ObjectId;
  /** Missile ID */
  missileId: bigint;
  /** Estimated time to impact (ms) */
  estimatedImpact: number;
  /** Direction of incoming missile */
  directionX: number;
  directionY: number;
  directionZ: number;
}

// ============================================
// Countermeasure Messages
// ============================================

/**
 * CountermeasureDeployMessage - Client request to deploy countermeasure
 */
export interface CountermeasureDeployMessage {
  opcode: typeof SpaceCombatMessageOpcode.CountermeasureDeploy;
  /** Ship deploying */
  shipId: ObjectId;
}

/**
 * CountermeasureDeployResponseMessage - Server response to deploy
 */
export interface CountermeasureDeployResponseMessage {
  opcode: typeof SpaceCombatMessageOpcode.CountermeasureDeployResponse;
  /** Whether deployment succeeded */
  success: boolean;
  /** Countermeasure ID if created */
  countermeasureId: bigint;
  /** Remaining countermeasure ammo */
  remainingAmmo: number;
  /** Error message if failed */
  errorMessage: string;
}

/**
 * CountermeasureActiveMessage - Server notification of active countermeasure
 */
export interface CountermeasureActiveMessage {
  opcode: typeof SpaceCombatMessageOpcode.CountermeasureActive;
  /** Countermeasure ID */
  countermeasureId: bigint;
  /** Ship that deployed it */
  sourceShipId: ObjectId;
  /** Position */
  positionX: number;
  positionY: number;
  positionZ: number;
  /** Effect radius */
  effectRadius: number;
  /** Remaining duration (ms) */
  duration: number;
  /** Whether a missile was fooled */
  fooledMissile: boolean;
  /** ID of fooled missile (if any) */
  fooledMissileId: bigint;
}

// ============================================
// Target Lock Messages
// ============================================

/**
 * TargetLockRequestMessage - Client request to acquire target lock
 */
export interface TargetLockRequestMessage {
  opcode: typeof SpaceCombatMessageOpcode.TargetLockRequest;
  /** Ship acquiring lock */
  shipId: ObjectId;
  /** Target to lock onto */
  targetId: ObjectId;
  /** Whether to break current lock (if targetId is 0) */
  breakLock: boolean;
}

/**
 * TargetLockMessage - Server update on target lock status
 */
export interface TargetLockMessage {
  opcode: typeof SpaceCombatMessageOpcode.TargetLockUpdate;
  /** Ship with the lock */
  shipId: ObjectId;
  /** Target being locked */
  targetId: ObjectId;
  /** Current lock state */
  state: TargetLockState;
  /** Lock progress (0-1) */
  progress: number;
  /** Time until lock acquired (ms, 0 if locked) */
  timeRemaining: number;
  /** Whether lock was broken */
  lockBroken: boolean;
  /** Reason if lock was broken */
  breakReason: string;
}

// ============================================
// Ship Hit Messages
// ============================================

/**
 * ShipHitMessage - Server notification of ship being hit
 */
export interface ShipHitMessage {
  opcode: typeof SpaceCombatMessageOpcode.ShipHit;
  /** Ship that was hit */
  targetShipId: ObjectId;
  /** Ship that fired */
  attackerShipId: ObjectId;
  /** Projectile that hit (if applicable) */
  projectileId: bigint;
  /** Weapon type that hit */
  weaponType: WeaponType;
  /** Total damage dealt */
  totalDamage: number;
  /** Damage absorbed by shields */
  shieldDamage: number;
  /** Damage absorbed by armor */
  armorDamage: number;
  /** Damage to hull */
  hullDamage: number;
  /** Damage type */
  damageType: DamageType;
  /** Hit location */
  hitLocation: ShipHitLocation;
  /** Impact position (for visual effects) */
  impactX: number;
  impactY: number;
  impactZ: number;
  /** Whether target was destroyed */
  targetDestroyed: boolean;
}

/**
 * CriticalHitMessage - Server notification of critical hit
 */
export interface CriticalHitMessage {
  opcode: typeof SpaceCombatMessageOpcode.CriticalHit;
  /** Ship that was hit */
  targetShipId: ObjectId;
  /** Ship that fired */
  attackerShipId: ObjectId;
  /** Damage multiplier applied */
  damageMultiplier: number;
  /** Total damage after multiplier */
  totalDamage: number;
  /** Component that was critically damaged (if any) */
  criticalComponent: number;
  /** Hit location */
  hitLocation: ShipHitLocation;
}

/**
 * ComponentDamageMessage - Server notification of component damage
 */
export interface ComponentDamageMessage {
  opcode: typeof SpaceCombatMessageOpcode.ComponentDamage;
  /** Ship with damaged component */
  shipId: ObjectId;
  /** Component slot that was damaged */
  componentSlot: number;
  /** Damage dealt to component */
  damage: number;
  /** New component hitpoints */
  newHitpoints: number;
  /** New component efficiency (0-1) */
  newEfficiency: number;
  /** Whether component was destroyed */
  destroyed: boolean;
  /** Effect on ship (e.g., "Engine disabled", "Shields offline") */
  effectDescription: string;
}

// ============================================
// Ship Destruction Messages
// ============================================

/**
 * ShipDestructionMessage - Server notification of ship destruction
 */
export interface ShipDestructionMessage {
  opcode: typeof SpaceCombatMessageOpcode.ShipDestruction;
  /** Ship that was destroyed */
  destroyedShipId: ObjectId;
  /** Ship that dealt killing blow */
  killerShipId: ObjectId;
  /** Pilot of destroyed ship */
  destroyedPilotId: ObjectId;
  /** Position of destruction */
  positionX: number;
  positionY: number;
  positionZ: number;
  /** Zone where destruction occurred */
  zoneId: string;
  /** Destruction reason */
  reason: ShipDestructionReason;
  /** Whether pilot ejected */
  pilotEjected: boolean;
  /** Whether loot was generated */
  lootGenerated: boolean;
}

/**
 * Reason for ship destruction
 */
export enum ShipDestructionReason {
  /** Destroyed by enemy weapons */
  CombatDestruction = 0,
  /** Collision with object */
  Collision = 1,
  /** Self-destruct */
  SelfDestruct = 2,
  /** Environmental damage (nebula, asteroid) */
  Environmental = 3,
  /** Pilot disconnected/logged out */
  PilotLogout = 4,
}

/**
 * ShipDamageUpdateMessage - Server update of ship damage state
 */
export interface ShipDamageUpdateMessage {
  opcode: typeof SpaceCombatMessageOpcode.ShipDamageUpdate;
  /** Ship ID */
  shipId: ObjectId;
  /** Current front shields */
  shieldFront: number;
  /** Maximum front shields */
  shieldFrontMax: number;
  /** Current rear shields */
  shieldBack: number;
  /** Maximum rear shields */
  shieldBackMax: number;
  /** Current armor values */
  armorFront: number;
  armorBack: number;
  armorLeft: number;
  armorRight: number;
  /** Current hull */
  hull: number;
  /** Maximum hull */
  hullMax: number;
  /** Current capacitor energy */
  capacitorEnergy: number;
  /** Maximum capacitor energy */
  capacitorEnergyMax: number;
  /** Component statuses (slot -> efficiency) */
  componentEfficiencies: Array<{ slot: number; efficiency: number }>;
}

// ============================================
// Turret Messages
// ============================================

/**
 * TurretFireMessage - Client request to fire turret
 */
export interface TurretFireMessage {
  opcode: typeof SpaceCombatMessageOpcode.TurretFire;
  /** Ship with the turret */
  shipId: ObjectId;
  /** Turret index */
  turretIndex: number;
  /** Target ship ID */
  targetId: ObjectId;
}

/**
 * TurretStatusMessage - Server notification of turret status
 */
export interface TurretStatusMessage {
  opcode: typeof SpaceCombatMessageOpcode.TurretStatus;
  /** Ship with the turret */
  shipId: ObjectId;
  /** Turret index */
  turretIndex: number;
  /** Current gunner (0 if empty) */
  gunnerId: ObjectId;
  /** Current target (0 if none) */
  targetId: ObjectId;
  /** Whether turret is online */
  isOnline: boolean;
  /** Current yaw angle */
  currentYaw: number;
  /** Current pitch angle */
  currentPitch: number;
  /** Cooldown remaining (ms) */
  cooldownRemaining: number;
  /** Whether target is in arc */
  targetInArc: boolean;
}

// ============================================
// Union Types
// ============================================

/**
 * Union type of all space combat client messages
 */
export type SpaceCombatClientMessage =
  | WeaponFireMessage
  | MissileLaunchMessage
  | CountermeasureDeployMessage
  | TargetLockRequestMessage
  | TurretFireMessage;

/**
 * Union type of all space combat server messages
 */
export type SpaceCombatServerMessage =
  | WeaponFireResponseMessage
  | ProjectileSpawnMessage
  | ProjectileUpdateMessage
  | ProjectileDespawnMessage
  | MissileTrackingMessage
  | MissileLockWarningMessage
  | CountermeasureDeployResponseMessage
  | CountermeasureActiveMessage
  | TargetLockMessage
  | ShipHitMessage
  | CriticalHitMessage
  | ComponentDamageMessage
  | ShipDestructionMessage
  | ShipDamageUpdateMessage
  | TurretStatusMessage;

/**
 * Union type of all space combat messages
 */
export type SpaceCombatMessage = SpaceCombatClientMessage | SpaceCombatServerMessage;

// ============================================
// Helper Functions
// ============================================

/**
 * Check if an opcode is a valid space combat message opcode
 */
export function isSpaceCombatMessageOpcode(
  opcode: number
): opcode is SpaceCombatMessageOpcodeType {
  return Object.values(SpaceCombatMessageOpcode).includes(
    opcode as SpaceCombatMessageOpcodeType
  );
}

/**
 * Create a WeaponFireResponseMessage
 */
export function createWeaponFireResponse(
  success: boolean,
  weaponSlot: number,
  projectileId: bigint = 0n,
  energyConsumed: number = 0,
  ammoConsumed: number = 0,
  remainingAmmo: number = -1,
  remainingEnergy: number = 0,
  errorMessage: string = ''
): WeaponFireResponseMessage {
  return {
    opcode: SpaceCombatMessageOpcode.WeaponFireResponse,
    success,
    projectileId,
    weaponSlot,
    energyConsumed,
    ammoConsumed,
    remainingAmmo,
    remainingEnergy,
    errorMessage,
  };
}

/**
 * Create a ProjectileSpawnMessage
 */
export function createProjectileSpawnMessage(
  projectileId: bigint,
  sourceShipId: ObjectId,
  weaponSlot: number,
  weaponType: WeaponType,
  position: Vector3,
  velocity: Vector3,
  targetId: ObjectId,
  isGuided: boolean = false
): ProjectileSpawnMessage {
  return {
    opcode: SpaceCombatMessageOpcode.ProjectileSpawn,
    projectileId,
    sourceShipId,
    weaponSlot,
    weaponType,
    positionX: position.x,
    positionY: position.y,
    positionZ: position.z,
    velocityX: velocity.x,
    velocityY: velocity.y,
    velocityZ: velocity.z,
    targetId,
    isGuided,
  };
}

/**
 * Create a MissileTrackingMessage
 */
export function createMissileTrackingMessage(
  missileId: bigint,
  position: Vector3,
  velocity: Vector3,
  targetId: ObjectId,
  fuelRemaining: number,
  isTracking: boolean,
  distanceToTarget: number
): MissileTrackingMessage {
  return {
    opcode: SpaceCombatMessageOpcode.MissileTracking,
    missileId,
    positionX: position.x,
    positionY: position.y,
    positionZ: position.z,
    velocityX: velocity.x,
    velocityY: velocity.y,
    velocityZ: velocity.z,
    targetId,
    fuelRemaining,
    isTracking,
    distanceToTarget,
  };
}

/**
 * Create a MissileLockWarningMessage
 */
export function createMissileLockWarning(
  targetShipId: ObjectId,
  attackerShipId: ObjectId,
  missileId: bigint,
  estimatedImpact: number,
  direction: Vector3
): MissileLockWarningMessage {
  return {
    opcode: SpaceCombatMessageOpcode.MissileLockWarning,
    targetShipId,
    attackerShipId,
    missileId,
    estimatedImpact,
    directionX: direction.x,
    directionY: direction.y,
    directionZ: direction.z,
  };
}

/**
 * Create a TargetLockMessage
 */
export function createTargetLockMessage(
  shipId: ObjectId,
  targetId: ObjectId,
  state: TargetLockState,
  progress: number,
  timeRemaining: number = 0,
  lockBroken: boolean = false,
  breakReason: string = ''
): TargetLockMessage {
  return {
    opcode: SpaceCombatMessageOpcode.TargetLockUpdate,
    shipId,
    targetId,
    state,
    progress,
    timeRemaining,
    lockBroken,
    breakReason,
  };
}

/**
 * Create a ShipHitMessage
 */
export function createShipHitMessage(
  targetShipId: ObjectId,
  attackerShipId: ObjectId,
  projectileId: bigint,
  weaponType: WeaponType,
  totalDamage: number,
  shieldDamage: number,
  armorDamage: number,
  hullDamage: number,
  damageType: DamageType,
  hitLocation: ShipHitLocation,
  impact: Vector3,
  targetDestroyed: boolean = false
): ShipHitMessage {
  return {
    opcode: SpaceCombatMessageOpcode.ShipHit,
    targetShipId,
    attackerShipId,
    projectileId,
    weaponType,
    totalDamage,
    shieldDamage,
    armorDamage,
    hullDamage,
    damageType,
    hitLocation,
    impactX: impact.x,
    impactY: impact.y,
    impactZ: impact.z,
    targetDestroyed,
  };
}

/**
 * Create a CriticalHitMessage
 */
export function createCriticalHitMessage(
  targetShipId: ObjectId,
  attackerShipId: ObjectId,
  damageMultiplier: number,
  totalDamage: number,
  criticalComponent: number,
  hitLocation: ShipHitLocation
): CriticalHitMessage {
  return {
    opcode: SpaceCombatMessageOpcode.CriticalHit,
    targetShipId,
    attackerShipId,
    damageMultiplier,
    totalDamage,
    criticalComponent,
    hitLocation,
  };
}

/**
 * Create a ComponentDamageMessage
 */
export function createComponentDamageMessage(
  shipId: ObjectId,
  componentSlot: number,
  damage: number,
  newHitpoints: number,
  newEfficiency: number,
  destroyed: boolean,
  effectDescription: string = ''
): ComponentDamageMessage {
  return {
    opcode: SpaceCombatMessageOpcode.ComponentDamage,
    shipId,
    componentSlot,
    damage,
    newHitpoints,
    newEfficiency,
    destroyed,
    effectDescription,
  };
}

/**
 * Create a ShipDestructionMessage
 */
export function createShipDestructionMessage(
  destroyedShipId: ObjectId,
  killerShipId: ObjectId,
  destroyedPilotId: ObjectId,
  position: Vector3,
  zoneId: string,
  reason: ShipDestructionReason = ShipDestructionReason.CombatDestruction,
  pilotEjected: boolean = false,
  lootGenerated: boolean = false
): ShipDestructionMessage {
  return {
    opcode: SpaceCombatMessageOpcode.ShipDestruction,
    destroyedShipId,
    killerShipId,
    destroyedPilotId,
    positionX: position.x,
    positionY: position.y,
    positionZ: position.z,
    zoneId,
    reason,
    pilotEjected,
    lootGenerated,
  };
}

/**
 * Create a ShipDamageUpdateMessage
 */
export function createShipDamageUpdateMessage(
  shipId: ObjectId,
  shields: { front: number; frontMax: number; back: number; backMax: number },
  armor: { front: number; back: number; left: number; right: number },
  hull: number,
  hullMax: number,
  capacitor: { energy: number; max: number },
  componentEfficiencies: Array<{ slot: number; efficiency: number }>
): ShipDamageUpdateMessage {
  return {
    opcode: SpaceCombatMessageOpcode.ShipDamageUpdate,
    shipId,
    shieldFront: shields.front,
    shieldFrontMax: shields.frontMax,
    shieldBack: shields.back,
    shieldBackMax: shields.backMax,
    armorFront: armor.front,
    armorBack: armor.back,
    armorLeft: armor.left,
    armorRight: armor.right,
    hull,
    hullMax,
    capacitorEnergy: capacitor.energy,
    capacitorEnergyMax: capacitor.max,
    componentEfficiencies,
  };
}

/**
 * Create a TurretStatusMessage
 */
export function createTurretStatusMessage(
  shipId: ObjectId,
  turretIndex: number,
  gunnerId: ObjectId,
  targetId: ObjectId,
  isOnline: boolean,
  currentYaw: number,
  currentPitch: number,
  cooldownRemaining: number,
  targetInArc: boolean
): TurretStatusMessage {
  return {
    opcode: SpaceCombatMessageOpcode.TurretStatus,
    shipId,
    turretIndex,
    gunnerId,
    targetId,
    isOnline,
    currentYaw,
    currentPitch,
    cooldownRemaining,
    targetInArc,
  };
}

/**
 * Get display name for weapon type
 */
export function getWeaponTypeDisplayName(type: WeaponType): string {
  switch (type) {
    case WeaponType.BLASTER:
      return 'Blaster Cannon';
    case WeaponType.ION:
      return 'Ion Cannon';
    case WeaponType.MISSILE:
      return 'Concussion Missile';
    case WeaponType.TORPEDO:
      return 'Proton Torpedo';
    case WeaponType.MINE:
      return 'Space Mine';
    case WeaponType.COUNTERMEASURE:
      return 'Countermeasure';
    default:
      return 'Unknown Weapon';
  }
}

/**
 * Get display name for hit location
 */
export function getHitLocationDisplayName(location: ShipHitLocation): string {
  switch (location) {
    case ShipHitLocation.FRONT:
      return 'Forward';
    case ShipHitLocation.BACK:
      return 'Aft';
    case ShipHitLocation.LEFT:
      return 'Port';
    case ShipHitLocation.RIGHT:
      return 'Starboard';
    default:
      return 'Unknown';
  }
}

/**
 * Get display name for destruction reason
 */
export function getDestructionReasonDisplayName(reason: ShipDestructionReason): string {
  switch (reason) {
    case ShipDestructionReason.CombatDestruction:
      return 'Destroyed in combat';
    case ShipDestructionReason.Collision:
      return 'Collision';
    case ShipDestructionReason.SelfDestruct:
      return 'Self-destructed';
    case ShipDestructionReason.Environmental:
      return 'Environmental damage';
    case ShipDestructionReason.PilotLogout:
      return 'Pilot disconnected';
    default:
      return 'Unknown';
  }
}
