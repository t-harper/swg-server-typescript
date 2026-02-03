/**
 * Ship Network Messages
 * Message types for JTL space gameplay communication between client and server
 *
 * Ship System Message Flow:
 * 1. Ship position updates -> ShipUpdateTransformMessage
 * 2. Component data sync -> ShipComponentDataMessage
 * 3. Damage events -> ShipDamageMessage
 * 4. Ship destruction -> ShipDestroyedMessage
 * 5. Docking/undocking -> ShipDockingMessage
 * 6. Weapon firing -> ShipWeaponFireMessage
 * 7. Target updates -> ShipTargetUpdateMessage
 * 8. Booster state -> ShipBoosterMessage
 */

import type { ObjectId, Vector3, Quaternion } from '@swg/shared-types';
import {
  ShipChassisType,
  ShipComponentSlot,
  ShipFaction,
  ShipConditionState,
  DamageDirection,
  type ComponentMount,
  type WeaponHardpoint,
} from './ship-types.js';

/**
 * Ship message operation types
 */
export enum ShipOperation {
  /** Transform/position update */
  UpdateTransform = 0,
  /** Component data synchronization */
  ComponentData = 1,
  /** Damage notification */
  Damage = 2,
  /** Ship destroyed notification */
  Destroyed = 3,
  /** Docking request/response */
  Docking = 4,
  /** Weapon fire event */
  WeaponFire = 5,
  /** Target update */
  TargetUpdate = 6,
  /** Booster activation/deactivation */
  Booster = 7,
  /** Shield balance adjustment */
  ShieldBalance = 8,
  /** Capacitor energy allocation */
  CapacitorAllocation = 9,
  /** Enter/exit hyperspace */
  Hyperspace = 10,
  /** Launch from station/ship */
  Launch = 11,
  /** Land on station/ship */
  Land = 12,
}

/**
 * Docking state enumeration
 */
export enum DockingState {
  /** Ship is undocked/in space */
  Undocked = 0,
  /** Ship is requesting dock */
  Requesting = 1,
  /** Ship is docking (animation) */
  Docking = 2,
  /** Ship is docked */
  Docked = 3,
  /** Ship is undocking (animation) */
  Undocking = 4,
}

/**
 * Base interface for ship messages
 */
interface BaseShipMessage {
  /** Message operation type */
  operation: ShipOperation;
  /** Ship object ID */
  shipId: ObjectId;
  /** Timestamp of the message */
  timestamp: number;
}

// ============================================
// Transform Update Messages
// ============================================

/**
 * Ship transform/position update message
 * Sent frequently to sync ship position and orientation
 */
export interface ShipUpdateTransformMessage extends BaseShipMessage {
  operation: ShipOperation.UpdateTransform;
  /** World position */
  position: Vector3;
  /** Orientation quaternion */
  orientation: Quaternion;
  /** Current velocity */
  velocity: Vector3;
  /** Angular velocity */
  angularVelocity: Vector3;
  /** Current speed */
  speed: number;
  /** Throttle position (0-1) */
  throttle: number;
  /** Sequence number for ordering */
  sequenceNumber: number;
}

/**
 * Create a ship transform update message
 */
export function createShipUpdateTransformMessage(
  shipId: ObjectId,
  position: Vector3,
  orientation: Quaternion,
  velocity: Vector3,
  angularVelocity: Vector3,
  speed: number,
  throttle: number,
  sequenceNumber: number
): ShipUpdateTransformMessage {
  return {
    operation: ShipOperation.UpdateTransform,
    shipId,
    timestamp: Date.now(),
    position,
    orientation,
    velocity,
    angularVelocity,
    speed,
    throttle,
    sequenceNumber,
  };
}

// ============================================
// Component Data Messages
// ============================================

/**
 * Ship component data synchronization message
 * Sent when component data changes (damage, installation, etc.)
 */
export interface ShipComponentDataMessage extends BaseShipMessage {
  operation: ShipOperation.ComponentData;
  /** Full component slot data */
  componentSlots?: Map<ShipComponentSlot, ComponentMount>;
  /** Single slot update (if not full sync) */
  updatedSlot?: ShipComponentSlot;
  /** Updated mount data */
  updatedMount?: ComponentMount;
  /** Weapon hardpoint data */
  weaponHardpoints?: WeaponHardpoint[];
  /** Ship chassis type */
  chassisType?: ShipChassisType;
  /** Ship faction */
  faction?: ShipFaction;
  /** Current condition state */
  conditionState?: ShipConditionState;
  /** Whether this is a full sync */
  isFullSync: boolean;
}

/**
 * Create a ship component data message (full sync)
 */
export function createShipComponentDataMessage(
  shipId: ObjectId,
  componentSlots: Map<ShipComponentSlot, ComponentMount>,
  weaponHardpoints: WeaponHardpoint[],
  chassisType: ShipChassisType,
  faction: ShipFaction,
  conditionState: ShipConditionState
): ShipComponentDataMessage {
  return {
    operation: ShipOperation.ComponentData,
    shipId,
    timestamp: Date.now(),
    componentSlots,
    weaponHardpoints,
    chassisType,
    faction,
    conditionState,
    isFullSync: true,
  };
}

/**
 * Create a ship component update message (single slot)
 */
export function createShipComponentUpdateMessage(
  shipId: ObjectId,
  slot: ShipComponentSlot,
  mount: ComponentMount
): ShipComponentDataMessage {
  return {
    operation: ShipOperation.ComponentData,
    shipId,
    timestamp: Date.now(),
    updatedSlot: slot,
    updatedMount: mount,
    isFullSync: false,
  };
}

// ============================================
// Damage Messages
// ============================================

/**
 * Ship damage notification message
 */
export interface ShipDamageMessage extends BaseShipMessage {
  operation: ShipOperation.Damage;
  /** Source of the damage (attacker ship ID) */
  attackerId: ObjectId;
  /** Raw damage amount */
  rawDamage: number;
  /** Actual damage dealt (after shields/armor) */
  actualDamage: number;
  /** Direction damage came from */
  direction: DamageDirection;
  /** Shield damage absorbed */
  shieldDamage: number;
  /** Armor damage absorbed */
  armorDamage: number;
  /** Hull damage dealt */
  hullDamage: number;
  /** Current front shield after damage */
  shieldFront: number;
  /** Current rear shield after damage */
  shieldBack: number;
  /** Current hull condition percent (0-1) */
  hullPercent: number;
  /** Whether a component was damaged */
  componentDamaged?: ShipComponentSlot;
  /** New condition state if changed */
  newConditionState?: ShipConditionState;
}

/**
 * Create a ship damage message
 */
export function createShipDamageMessage(
  shipId: ObjectId,
  attackerId: ObjectId,
  rawDamage: number,
  actualDamage: number,
  direction: DamageDirection,
  shieldDamage: number,
  armorDamage: number,
  hullDamage: number,
  shieldFront: number,
  shieldBack: number,
  hullPercent: number,
  componentDamaged?: ShipComponentSlot,
  newConditionState?: ShipConditionState
): ShipDamageMessage {
  return {
    operation: ShipOperation.Damage,
    shipId,
    timestamp: Date.now(),
    attackerId,
    rawDamage,
    actualDamage,
    direction,
    shieldDamage,
    armorDamage,
    hullDamage,
    shieldFront,
    shieldBack,
    hullPercent,
    componentDamaged,
    newConditionState,
  };
}

// ============================================
// Ship Destroyed Messages
// ============================================

/**
 * Ship destroyed notification message
 */
export interface ShipDestroyedMessage extends BaseShipMessage {
  operation: ShipOperation.Destroyed;
  /** ID of the ship/player that got the kill */
  killerId: ObjectId;
  /** Position where destruction occurred */
  position: Vector3;
  /** IDs of crew members who need to eject/respawn */
  crewIds: ObjectId[];
  /** Whether the ship was insured */
  wasInsured: boolean;
  /** Credits lost to destruction */
  creditsLost: number;
}

/**
 * Create a ship destroyed message
 */
export function createShipDestroyedMessage(
  shipId: ObjectId,
  killerId: ObjectId,
  position: Vector3,
  crewIds: ObjectId[],
  wasInsured: boolean,
  creditsLost: number
): ShipDestroyedMessage {
  return {
    operation: ShipOperation.Destroyed,
    shipId,
    timestamp: Date.now(),
    killerId,
    position,
    crewIds,
    wasInsured,
    creditsLost,
  };
}

// ============================================
// Docking Messages
// ============================================

/**
 * Ship docking request/response message
 */
export interface ShipDockingMessage extends BaseShipMessage {
  operation: ShipOperation.Docking;
  /** Station or POB ship ID to dock with */
  targetId: ObjectId;
  /** Current docking state */
  dockingState: DockingState;
  /** Whether this is a request (true) or response (false) */
  isRequest: boolean;
  /** Whether the request was approved */
  approved?: boolean;
  /** Error message if not approved */
  errorMessage?: string;
  /** Docking bay/slot number */
  dockingBay?: number;
}

/**
 * Create a docking request message
 */
export function createShipDockingRequestMessage(
  shipId: ObjectId,
  targetId: ObjectId
): ShipDockingMessage {
  return {
    operation: ShipOperation.Docking,
    shipId,
    timestamp: Date.now(),
    targetId,
    dockingState: DockingState.Requesting,
    isRequest: true,
  };
}

/**
 * Create a docking response message
 */
export function createShipDockingResponseMessage(
  shipId: ObjectId,
  targetId: ObjectId,
  approved: boolean,
  dockingBay?: number,
  errorMessage?: string
): ShipDockingMessage {
  return {
    operation: ShipOperation.Docking,
    shipId,
    timestamp: Date.now(),
    targetId,
    dockingState: approved ? DockingState.Docking : DockingState.Undocked,
    isRequest: false,
    approved,
    dockingBay,
    errorMessage,
  };
}

/**
 * Create a docking state update message
 */
export function createShipDockingStateMessage(
  shipId: ObjectId,
  targetId: ObjectId,
  state: DockingState,
  dockingBay?: number
): ShipDockingMessage {
  return {
    operation: ShipOperation.Docking,
    shipId,
    timestamp: Date.now(),
    targetId,
    dockingState: state,
    isRequest: false,
    approved: true,
    dockingBay,
  };
}

// ============================================
// Weapon Fire Messages
// ============================================

/**
 * Ship weapon fire event message
 */
export interface ShipWeaponFireMessage extends BaseShipMessage {
  operation: ShipOperation.WeaponFire;
  /** Weapon slot that fired */
  weaponSlot: number;
  /** Target ship ID */
  targetId: ObjectId;
  /** Fire position in world space */
  firePosition: Vector3;
  /** Target position (predicted) */
  targetPosition: Vector3;
  /** Whether the shot hit */
  hit: boolean;
  /** Damage dealt (if hit) */
  damage?: number;
  /** Weapon group that fired (0-3) */
  weaponGroup: number;
}

/**
 * Create a weapon fire message
 */
export function createShipWeaponFireMessage(
  shipId: ObjectId,
  weaponSlot: number,
  targetId: ObjectId,
  firePosition: Vector3,
  targetPosition: Vector3,
  hit: boolean,
  weaponGroup: number,
  damage?: number
): ShipWeaponFireMessage {
  return {
    operation: ShipOperation.WeaponFire,
    shipId,
    timestamp: Date.now(),
    weaponSlot,
    targetId,
    firePosition,
    targetPosition,
    hit,
    damage,
    weaponGroup,
  };
}

// ============================================
// Target Update Messages
// ============================================

/**
 * Ship target update message
 */
export interface ShipTargetUpdateMessage extends BaseShipMessage {
  operation: ShipOperation.TargetUpdate;
  /** New target ID (0n to clear target) */
  targetId: ObjectId;
  /** Target ship name (if any) */
  targetName?: string;
  /** Target chassis type */
  targetChassisType?: ShipChassisType;
  /** Target faction */
  targetFaction?: ShipFaction;
  /** Target distance */
  targetDistance?: number;
  /** Target hull percent (0-1) */
  targetHullPercent?: number;
}

/**
 * Create a target update message
 */
export function createShipTargetUpdateMessage(
  shipId: ObjectId,
  targetId: ObjectId,
  targetName?: string,
  targetChassisType?: ShipChassisType,
  targetFaction?: ShipFaction,
  targetDistance?: number,
  targetHullPercent?: number
): ShipTargetUpdateMessage {
  return {
    operation: ShipOperation.TargetUpdate,
    shipId,
    timestamp: Date.now(),
    targetId,
    targetName,
    targetChassisType,
    targetFaction,
    targetDistance,
    targetHullPercent,
  };
}

// ============================================
// Booster Messages
// ============================================

/**
 * Ship booster activation/deactivation message
 */
export interface ShipBoosterMessage extends BaseShipMessage {
  operation: ShipOperation.Booster;
  /** Whether booster is now active */
  active: boolean;
  /** Current booster energy */
  boosterEnergy: number;
  /** Maximum booster energy */
  boosterEnergyMax: number;
}

/**
 * Create a booster message
 */
export function createShipBoosterMessage(
  shipId: ObjectId,
  active: boolean,
  boosterEnergy: number,
  boosterEnergyMax: number
): ShipBoosterMessage {
  return {
    operation: ShipOperation.Booster,
    shipId,
    timestamp: Date.now(),
    active,
    boosterEnergy,
    boosterEnergyMax,
  };
}

// ============================================
// Shield Balance Messages
// ============================================

/**
 * Ship shield balance adjustment message
 */
export interface ShipShieldBalanceMessage extends BaseShipMessage {
  operation: ShipOperation.ShieldBalance;
  /** Front shield allocation (0-1, where 0.5 is balanced) */
  frontAllocation: number;
  /** Current front shield value */
  shieldFront: number;
  /** Current rear shield value */
  shieldBack: number;
  /** Max front shield value */
  shieldFrontMax: number;
  /** Max rear shield value */
  shieldBackMax: number;
}

/**
 * Create a shield balance message
 */
export function createShipShieldBalanceMessage(
  shipId: ObjectId,
  frontAllocation: number,
  shieldFront: number,
  shieldBack: number,
  shieldFrontMax: number,
  shieldBackMax: number
): ShipShieldBalanceMessage {
  return {
    operation: ShipOperation.ShieldBalance,
    shipId,
    timestamp: Date.now(),
    frontAllocation,
    shieldFront,
    shieldBack,
    shieldFrontMax,
    shieldBackMax,
  };
}

// ============================================
// Hyperspace Messages
// ============================================

/**
 * Ship hyperspace entry/exit message
 */
export interface ShipHyperspaceMessage extends BaseShipMessage {
  operation: ShipOperation.Hyperspace;
  /** Whether entering (true) or exiting (false) hyperspace */
  entering: boolean;
  /** Destination zone ID (if entering) */
  destinationZone?: string;
  /** Destination position (if entering) */
  destinationPosition?: Vector3;
  /** Current zone ID (if exiting) */
  currentZone?: string;
  /** Current position (if exiting) */
  currentPosition?: Vector3;
  /** Travel time in milliseconds */
  travelTime?: number;
}

/**
 * Create a hyperspace entry message
 */
export function createShipHyperspaceEntryMessage(
  shipId: ObjectId,
  destinationZone: string,
  destinationPosition: Vector3,
  travelTime: number
): ShipHyperspaceMessage {
  return {
    operation: ShipOperation.Hyperspace,
    shipId,
    timestamp: Date.now(),
    entering: true,
    destinationZone,
    destinationPosition,
    travelTime,
  };
}

/**
 * Create a hyperspace exit message
 */
export function createShipHyperspaceExitMessage(
  shipId: ObjectId,
  currentZone: string,
  currentPosition: Vector3
): ShipHyperspaceMessage {
  return {
    operation: ShipOperation.Hyperspace,
    shipId,
    timestamp: Date.now(),
    entering: false,
    currentZone,
    currentPosition,
  };
}

// ============================================
// Launch/Land Messages
// ============================================

/**
 * Ship launch message (from station/POB)
 */
export interface ShipLaunchMessage extends BaseShipMessage {
  operation: ShipOperation.Launch;
  /** Station/POB ID launching from */
  stationId: ObjectId;
  /** Launch position in space */
  launchPosition: Vector3;
  /** Launch orientation */
  launchOrientation: Quaternion;
  /** Zone ID launching into */
  zoneId: string;
}

/**
 * Create a ship launch message
 */
export function createShipLaunchMessage(
  shipId: ObjectId,
  stationId: ObjectId,
  launchPosition: Vector3,
  launchOrientation: Quaternion,
  zoneId: string
): ShipLaunchMessage {
  return {
    operation: ShipOperation.Launch,
    shipId,
    timestamp: Date.now(),
    stationId,
    launchPosition,
    launchOrientation,
    zoneId,
  };
}

/**
 * Ship land message (on station/POB)
 */
export interface ShipLandMessage extends BaseShipMessage {
  operation: ShipOperation.Land;
  /** Station/POB ID landing on */
  stationId: ObjectId;
  /** Landing bay/slot number */
  landingBay: number;
}

/**
 * Create a ship land message
 */
export function createShipLandMessage(
  shipId: ObjectId,
  stationId: ObjectId,
  landingBay: number
): ShipLandMessage {
  return {
    operation: ShipOperation.Land,
    shipId,
    timestamp: Date.now(),
    stationId,
    landingBay,
  };
}

// ============================================
// Union Types and Type Guards
// ============================================

/**
 * Union type of all ship messages
 */
export type AnyShipMessage =
  | ShipUpdateTransformMessage
  | ShipComponentDataMessage
  | ShipDamageMessage
  | ShipDestroyedMessage
  | ShipDockingMessage
  | ShipWeaponFireMessage
  | ShipTargetUpdateMessage
  | ShipBoosterMessage
  | ShipShieldBalanceMessage
  | ShipHyperspaceMessage
  | ShipLaunchMessage
  | ShipLandMessage;

/**
 * Check if message is a transform update
 */
export function isShipUpdateTransformMessage(
  msg: AnyShipMessage
): msg is ShipUpdateTransformMessage {
  return msg.operation === ShipOperation.UpdateTransform;
}

/**
 * Check if message is component data
 */
export function isShipComponentDataMessage(
  msg: AnyShipMessage
): msg is ShipComponentDataMessage {
  return msg.operation === ShipOperation.ComponentData;
}

/**
 * Check if message is damage notification
 */
export function isShipDamageMessage(msg: AnyShipMessage): msg is ShipDamageMessage {
  return msg.operation === ShipOperation.Damage;
}

/**
 * Check if message is ship destroyed
 */
export function isShipDestroyedMessage(
  msg: AnyShipMessage
): msg is ShipDestroyedMessage {
  return msg.operation === ShipOperation.Destroyed;
}

/**
 * Check if message is docking related
 */
export function isShipDockingMessage(msg: AnyShipMessage): msg is ShipDockingMessage {
  return msg.operation === ShipOperation.Docking;
}

/**
 * Check if message is weapon fire
 */
export function isShipWeaponFireMessage(
  msg: AnyShipMessage
): msg is ShipWeaponFireMessage {
  return msg.operation === ShipOperation.WeaponFire;
}

/**
 * Check if message is target update
 */
export function isShipTargetUpdateMessage(
  msg: AnyShipMessage
): msg is ShipTargetUpdateMessage {
  return msg.operation === ShipOperation.TargetUpdate;
}

/**
 * Check if message is booster related
 */
export function isShipBoosterMessage(msg: AnyShipMessage): msg is ShipBoosterMessage {
  return msg.operation === ShipOperation.Booster;
}

/**
 * Check if message is hyperspace related
 */
export function isShipHyperspaceMessage(
  msg: AnyShipMessage
): msg is ShipHyperspaceMessage {
  return msg.operation === ShipOperation.Hyperspace;
}

/**
 * Check if message requires pilot privileges
 */
export function requiresPilotPrivilege(msg: AnyShipMessage): boolean {
  return (
    msg.operation === ShipOperation.UpdateTransform ||
    msg.operation === ShipOperation.Booster ||
    msg.operation === ShipOperation.ShieldBalance ||
    msg.operation === ShipOperation.CapacitorAllocation ||
    msg.operation === ShipOperation.Hyperspace ||
    msg.operation === ShipOperation.Docking ||
    msg.operation === ShipOperation.Launch ||
    msg.operation === ShipOperation.Land
  );
}

/**
 * Check if message requires gunner privileges
 */
export function requiresGunnerPrivilege(msg: AnyShipMessage): boolean {
  return (
    msg.operation === ShipOperation.WeaponFire ||
    msg.operation === ShipOperation.TargetUpdate
  );
}

/**
 * Message CRC values for network serialization
 */
export const ShipMessageCrc = {
  SHIP_UPDATE_TRANSFORM: 0x45678900,
  SHIP_COMPONENT_DATA: 0x45678901,
  SHIP_DAMAGE: 0x45678902,
  SHIP_DESTROYED: 0x45678903,
  SHIP_DOCKING: 0x45678904,
  SHIP_WEAPON_FIRE: 0x45678905,
  SHIP_TARGET_UPDATE: 0x45678906,
  SHIP_BOOSTER: 0x45678907,
  SHIP_SHIELD_BALANCE: 0x45678908,
  SHIP_CAPACITOR_ALLOCATION: 0x45678909,
  SHIP_HYPERSPACE: 0x4567890a,
  SHIP_LAUNCH: 0x4567890b,
  SHIP_LAND: 0x4567890c,
} as const;
