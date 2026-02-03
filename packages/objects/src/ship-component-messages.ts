/**
 * Ship Component Network Messages
 * Message types for ship component system communication between client and server
 *
 * Ship Component Message Flow:
 * 1. Client sends ShipComponentInstallMessage to install a component
 * 2. Server validates and responds with ShipComponentInstallResponseMessage
 * 3. Server broadcasts ShipComponentStatusMessage to observers
 * 4. During combat, server sends ShipComponentDamageMessage for component damage
 * 5. Client sends ShipComponentRemoveMessage to uninstall a component
 */

import type { ObjectId } from '@swg/shared-types';
import {
  ShipComponentType,
  ComponentQuality,
  type ReactorStats,
  type EngineStats,
  type ShieldStats,
  type ArmorStats,
  type CapacitorStats,
  type BoosterStats,
  type DroidInterfaceStats,
  type WeaponStats,
} from './ship-component-types.js';

/**
 * Ship component message operation types
 */
export enum ShipComponentOperation {
  /** Install a component in a ship */
  Install = 0,
  /** Remove a component from a ship */
  Remove = 1,
  /** Update component status */
  Status = 2,
  /** Apply damage to a component */
  Damage = 3,
  /** Repair a component */
  Repair = 4,
  /** Request component info */
  Info = 5,
}

/**
 * Base interface for ship component messages
 */
interface BaseShipComponentMessage {
  /** Message operation type */
  operation: ShipComponentOperation;
  /** Player performing the action */
  playerId: ObjectId;
  /** Timestamp of the message */
  timestamp: number;
}

// ============================================
// Install Messages
// ============================================

/**
 * Client request to install a component in a ship
 */
export interface ShipComponentInstallMessage extends BaseShipComponentMessage {
  operation: ShipComponentOperation.Install;
  /** Component object ID to install */
  componentId: ObjectId;
  /** Ship object ID to install into */
  shipId: ObjectId;
  /** Slot index to install into */
  slotIndex: number;
}

/**
 * Create a component install request message
 */
export function createShipComponentInstallMessage(
  playerId: ObjectId,
  componentId: ObjectId,
  shipId: ObjectId,
  slotIndex: number
): ShipComponentInstallMessage {
  return {
    operation: ShipComponentOperation.Install,
    playerId,
    componentId,
    shipId,
    slotIndex,
    timestamp: Date.now(),
  };
}

/**
 * Server response to component installation request
 */
export interface ShipComponentInstallResponseMessage extends BaseShipComponentMessage {
  operation: ShipComponentOperation.Install;
  /** Component object ID that was installed */
  componentId: ObjectId;
  /** Ship object ID component was installed into */
  shipId: ObjectId;
  /** Slot index component was installed into */
  slotIndex: number;
  /** Whether the installation was successful */
  success: boolean;
  /** Error message if installation failed */
  errorMessage?: string;
  /** Error code for client handling */
  errorCode?: ShipComponentErrorCode;
}

/**
 * Create an install response message
 */
export function createShipComponentInstallResponse(
  playerId: ObjectId,
  componentId: ObjectId,
  shipId: ObjectId,
  slotIndex: number,
  success: boolean,
  errorMessage?: string,
  errorCode?: ShipComponentErrorCode
): ShipComponentInstallResponseMessage {
  return {
    operation: ShipComponentOperation.Install,
    playerId,
    componentId,
    shipId,
    slotIndex,
    success,
    errorMessage,
    errorCode,
    timestamp: Date.now(),
  };
}

// ============================================
// Remove Messages
// ============================================

/**
 * Client request to remove a component from a ship
 */
export interface ShipComponentRemoveMessage extends BaseShipComponentMessage {
  operation: ShipComponentOperation.Remove;
  /** Component object ID to remove */
  componentId: ObjectId;
  /** Ship object ID to remove from */
  shipId: ObjectId;
  /** Slot index to remove from */
  slotIndex: number;
}

/**
 * Create a component remove request message
 */
export function createShipComponentRemoveMessage(
  playerId: ObjectId,
  componentId: ObjectId,
  shipId: ObjectId,
  slotIndex: number
): ShipComponentRemoveMessage {
  return {
    operation: ShipComponentOperation.Remove,
    playerId,
    componentId,
    shipId,
    slotIndex,
    timestamp: Date.now(),
  };
}

/**
 * Server response to component removal request
 */
export interface ShipComponentRemoveResponseMessage extends BaseShipComponentMessage {
  operation: ShipComponentOperation.Remove;
  /** Component object ID that was removed */
  componentId: ObjectId;
  /** Ship object ID component was removed from */
  shipId: ObjectId;
  /** Slot index component was removed from */
  slotIndex: number;
  /** Whether the removal was successful */
  success: boolean;
  /** Error message if removal failed */
  errorMessage?: string;
  /** Error code for client handling */
  errorCode?: ShipComponentErrorCode;
}

/**
 * Create a remove response message
 */
export function createShipComponentRemoveResponse(
  playerId: ObjectId,
  componentId: ObjectId,
  shipId: ObjectId,
  slotIndex: number,
  success: boolean,
  errorMessage?: string,
  errorCode?: ShipComponentErrorCode
): ShipComponentRemoveResponseMessage {
  return {
    operation: ShipComponentOperation.Remove,
    playerId,
    componentId,
    shipId,
    slotIndex,
    success,
    errorMessage,
    errorCode,
    timestamp: Date.now(),
  };
}

// ============================================
// Status Messages
// ============================================

/**
 * Component status data for status messages
 */
export interface ComponentStatusData {
  /** Component object ID */
  componentId: ObjectId;
  /** Type of component */
  componentType: ShipComponentType;
  /** Quality tier */
  quality: ComponentQuality;
  /** Current hitpoints */
  hitpoints: number;
  /** Maximum hitpoints */
  maxHitpoints: number;
  /** Efficiency percentage (0.0 - 1.0) */
  efficiency: number;
  /** Slot index installed in */
  slotIndex: number;
  /** Type-specific stats */
  stats:
    | ReactorStats
    | EngineStats
    | ShieldStats
    | ArmorStats
    | CapacitorStats
    | BoosterStats
    | DroidInterfaceStats
    | WeaponStats
    | null;
}

/**
 * Server message with component status update
 * Sent when component state changes (damage, repair, installation)
 */
export interface ShipComponentStatusMessage extends BaseShipComponentMessage {
  operation: ShipComponentOperation.Status;
  /** Ship object ID */
  shipId: ObjectId;
  /** Component status data */
  componentStatus: ComponentStatusData;
}

/**
 * Create a component status message
 */
export function createShipComponentStatusMessage(
  playerId: ObjectId,
  shipId: ObjectId,
  componentStatus: ComponentStatusData
): ShipComponentStatusMessage {
  return {
    operation: ShipComponentOperation.Status,
    playerId,
    shipId,
    componentStatus,
    timestamp: Date.now(),
  };
}

/**
 * Full ship component status message
 * Sent when player enters ship or requests full status
 */
export interface ShipComponentFullStatusMessage extends BaseShipComponentMessage {
  operation: ShipComponentOperation.Status;
  /** Ship object ID */
  shipId: ObjectId;
  /** All installed component statuses */
  components: ComponentStatusData[];
  /** Total ship mass */
  totalMass: number;
  /** Total energy drain */
  totalEnergyDrain: number;
  /** Total energy generation */
  totalEnergyGeneration: number;
}

/**
 * Create a full ship status message
 */
export function createShipComponentFullStatusMessage(
  playerId: ObjectId,
  shipId: ObjectId,
  components: ComponentStatusData[],
  totalMass: number,
  totalEnergyDrain: number,
  totalEnergyGeneration: number
): ShipComponentFullStatusMessage {
  return {
    operation: ShipComponentOperation.Status,
    playerId,
    shipId,
    components,
    totalMass,
    totalEnergyDrain,
    totalEnergyGeneration,
    timestamp: Date.now(),
  };
}

// ============================================
// Damage Messages
// ============================================

/**
 * Damage source types for combat logging
 */
export enum DamageSourceType {
  /** Damage from enemy weapon */
  EnemyWeapon = 0,
  /** Damage from collision */
  Collision = 1,
  /** Damage from environmental hazard */
  Environmental = 2,
  /** Damage from system overload */
  Overload = 3,
  /** Damage from boarding action */
  Boarding = 4,
}

/**
 * Server message indicating component damage
 * Sent during combat when a component takes damage
 */
export interface ShipComponentDamageMessage extends BaseShipComponentMessage {
  operation: ShipComponentOperation.Damage;
  /** Ship object ID */
  shipId: ObjectId;
  /** Component object ID that was damaged */
  componentId: ObjectId;
  /** Slot index of damaged component */
  slotIndex: number;
  /** Component type */
  componentType: ShipComponentType;
  /** Amount of damage dealt */
  damageAmount: number;
  /** Hitpoints before damage */
  hitpointsBefore: number;
  /** Hitpoints after damage */
  hitpointsAfter: number;
  /** Maximum hitpoints */
  maxHitpoints: number;
  /** Source of the damage */
  damageSource: DamageSourceType;
  /** Attacker object ID (if applicable) */
  attackerId?: ObjectId;
  /** Whether the component was destroyed */
  componentDestroyed: boolean;
  /** New efficiency after damage */
  newEfficiency: number;
}

/**
 * Create a component damage message
 */
export function createShipComponentDamageMessage(
  playerId: ObjectId,
  shipId: ObjectId,
  componentId: ObjectId,
  slotIndex: number,
  componentType: ShipComponentType,
  damageAmount: number,
  hitpointsBefore: number,
  hitpointsAfter: number,
  maxHitpoints: number,
  damageSource: DamageSourceType,
  componentDestroyed: boolean,
  newEfficiency: number,
  attackerId?: ObjectId
): ShipComponentDamageMessage {
  return {
    operation: ShipComponentOperation.Damage,
    playerId,
    shipId,
    componentId,
    slotIndex,
    componentType,
    damageAmount,
    hitpointsBefore,
    hitpointsAfter,
    maxHitpoints,
    damageSource,
    attackerId,
    componentDestroyed,
    newEfficiency,
    timestamp: Date.now(),
  };
}

// ============================================
// Repair Messages
// ============================================

/**
 * Client request to repair a component
 */
export interface ShipComponentRepairMessage extends BaseShipComponentMessage {
  operation: ShipComponentOperation.Repair;
  /** Ship object ID */
  shipId: ObjectId;
  /** Component object ID to repair */
  componentId: ObjectId;
  /** Slot index of component */
  slotIndex: number;
  /** Amount to repair (0 = full repair) */
  repairAmount: number;
}

/**
 * Create a repair request message
 */
export function createShipComponentRepairMessage(
  playerId: ObjectId,
  shipId: ObjectId,
  componentId: ObjectId,
  slotIndex: number,
  repairAmount: number = 0
): ShipComponentRepairMessage {
  return {
    operation: ShipComponentOperation.Repair,
    playerId,
    shipId,
    componentId,
    slotIndex,
    repairAmount,
    timestamp: Date.now(),
  };
}

/**
 * Server response to repair request
 */
export interface ShipComponentRepairResponseMessage extends BaseShipComponentMessage {
  operation: ShipComponentOperation.Repair;
  /** Ship object ID */
  shipId: ObjectId;
  /** Component object ID that was repaired */
  componentId: ObjectId;
  /** Slot index of component */
  slotIndex: number;
  /** Whether repair was successful */
  success: boolean;
  /** Error message if repair failed */
  errorMessage?: string;
  /** Amount actually repaired */
  amountRepaired: number;
  /** Cost of the repair in credits */
  repairCost: number;
  /** New hitpoints after repair */
  newHitpoints: number;
  /** New efficiency after repair */
  newEfficiency: number;
}

/**
 * Create a repair response message
 */
export function createShipComponentRepairResponse(
  playerId: ObjectId,
  shipId: ObjectId,
  componentId: ObjectId,
  slotIndex: number,
  success: boolean,
  amountRepaired: number,
  repairCost: number,
  newHitpoints: number,
  newEfficiency: number,
  errorMessage?: string
): ShipComponentRepairResponseMessage {
  return {
    operation: ShipComponentOperation.Repair,
    playerId,
    shipId,
    componentId,
    slotIndex,
    success,
    errorMessage,
    amountRepaired,
    repairCost,
    newHitpoints,
    newEfficiency,
    timestamp: Date.now(),
  };
}

// ============================================
// Info Request Messages
// ============================================

/**
 * Client request for component info
 */
export interface ShipComponentInfoMessage extends BaseShipComponentMessage {
  operation: ShipComponentOperation.Info;
  /** Component object ID to get info for */
  componentId: ObjectId;
}

/**
 * Create an info request message
 */
export function createShipComponentInfoMessage(
  playerId: ObjectId,
  componentId: ObjectId
): ShipComponentInfoMessage {
  return {
    operation: ShipComponentOperation.Info,
    playerId,
    componentId,
    timestamp: Date.now(),
  };
}

/**
 * Server response with component info
 */
export interface ShipComponentInfoResponseMessage extends BaseShipComponentMessage {
  operation: ShipComponentOperation.Info;
  /** Component object ID */
  componentId: ObjectId;
  /** Whether info retrieval was successful */
  success: boolean;
  /** Error message if retrieval failed */
  errorMessage?: string;
  /** Component data */
  componentData?: {
    componentType: ShipComponentType;
    quality: ComponentQuality;
    hitpoints: number;
    maxHitpoints: number;
    mass: number;
    energyDrain: number;
    efficiency: number;
    installedShipId: ObjectId;
    installedSlot: number;
    certification: {
      requiredSkill: string;
      requiredLevel: number;
    };
    stats:
      | ReactorStats
      | EngineStats
      | ShieldStats
      | ArmorStats
      | CapacitorStats
      | BoosterStats
      | DroidInterfaceStats
      | WeaponStats
      | null;
  };
}

/**
 * Create an info response message
 */
export function createShipComponentInfoResponse(
  playerId: ObjectId,
  componentId: ObjectId,
  success: boolean,
  componentData?: ShipComponentInfoResponseMessage['componentData'],
  errorMessage?: string
): ShipComponentInfoResponseMessage {
  return {
    operation: ShipComponentOperation.Info,
    playerId,
    componentId,
    success,
    errorMessage,
    componentData,
    timestamp: Date.now(),
  };
}

// ============================================
// Error Codes
// ============================================

/**
 * Error codes for ship component operations
 */
export enum ShipComponentErrorCode {
  /** No error */
  None = 0,
  /** Component not found */
  ComponentNotFound = 1,
  /** Ship not found */
  ShipNotFound = 2,
  /** Invalid slot for component type */
  InvalidSlot = 3,
  /** Slot already occupied */
  SlotOccupied = 4,
  /** Component already installed */
  AlreadyInstalled = 5,
  /** Not installed in this ship */
  NotInstalled = 6,
  /** Insufficient certification */
  InsufficientCertification = 7,
  /** Ship is in flight */
  ShipInFlight = 8,
  /** Component is damaged */
  ComponentDamaged = 9,
  /** Insufficient funds for repair */
  InsufficientFunds = 10,
  /** Not owner of ship */
  NotOwner = 11,
  /** Component type mismatch */
  TypeMismatch = 12,
  /** Ship storage full */
  StorageFull = 13,
}

/**
 * Get error message for error code
 */
export function getShipComponentErrorMessage(code: ShipComponentErrorCode): string {
  switch (code) {
    case ShipComponentErrorCode.None:
      return '';
    case ShipComponentErrorCode.ComponentNotFound:
      return 'Component not found.';
    case ShipComponentErrorCode.ShipNotFound:
      return 'Ship not found.';
    case ShipComponentErrorCode.InvalidSlot:
      return 'Invalid slot for this component type.';
    case ShipComponentErrorCode.SlotOccupied:
      return 'That slot already has a component installed.';
    case ShipComponentErrorCode.AlreadyInstalled:
      return 'Component is already installed in a ship.';
    case ShipComponentErrorCode.NotInstalled:
      return 'Component is not installed in this ship.';
    case ShipComponentErrorCode.InsufficientCertification:
      return 'You lack the required certification to use this component.';
    case ShipComponentErrorCode.ShipInFlight:
      return 'Cannot modify components while ship is in flight.';
    case ShipComponentErrorCode.ComponentDamaged:
      return 'Component is too damaged to install.';
    case ShipComponentErrorCode.InsufficientFunds:
      return 'Insufficient credits for this operation.';
    case ShipComponentErrorCode.NotOwner:
      return 'You do not own this ship.';
    case ShipComponentErrorCode.TypeMismatch:
      return 'Component type does not match slot type.';
    case ShipComponentErrorCode.StorageFull:
      return 'Ship storage is full.';
    default:
      return 'Unknown error.';
  }
}

// ============================================
// Union Types
// ============================================

/**
 * Union type of all ship component request messages
 */
export type AnyShipComponentRequestMessage =
  | ShipComponentInstallMessage
  | ShipComponentRemoveMessage
  | ShipComponentRepairMessage
  | ShipComponentInfoMessage;

/**
 * Union type of all ship component response messages
 */
export type AnyShipComponentResponseMessage =
  | ShipComponentInstallResponseMessage
  | ShipComponentRemoveResponseMessage
  | ShipComponentStatusMessage
  | ShipComponentFullStatusMessage
  | ShipComponentDamageMessage
  | ShipComponentRepairResponseMessage
  | ShipComponentInfoResponseMessage;

/**
 * Union type of all ship component messages
 */
export type AnyShipComponentMessage =
  | AnyShipComponentRequestMessage
  | AnyShipComponentResponseMessage;

// ============================================
// Type Guards
// ============================================

/**
 * Check if message is an install request
 */
export function isShipComponentInstallMessage(
  message: AnyShipComponentMessage
): message is ShipComponentInstallMessage {
  return (
    message.operation === ShipComponentOperation.Install &&
    'componentId' in message &&
    !('success' in message)
  );
}

/**
 * Check if message is an install response
 */
export function isShipComponentInstallResponse(
  message: AnyShipComponentMessage
): message is ShipComponentInstallResponseMessage {
  return (
    message.operation === ShipComponentOperation.Install &&
    'success' in message
  );
}

/**
 * Check if message is a remove request
 */
export function isShipComponentRemoveMessage(
  message: AnyShipComponentMessage
): message is ShipComponentRemoveMessage {
  return (
    message.operation === ShipComponentOperation.Remove &&
    !('success' in message)
  );
}

/**
 * Check if message is a remove response
 */
export function isShipComponentRemoveResponse(
  message: AnyShipComponentMessage
): message is ShipComponentRemoveResponseMessage {
  return (
    message.operation === ShipComponentOperation.Remove &&
    'success' in message
  );
}

/**
 * Check if message is a status message
 */
export function isShipComponentStatusMessage(
  message: AnyShipComponentMessage
): message is ShipComponentStatusMessage {
  return (
    message.operation === ShipComponentOperation.Status &&
    'componentStatus' in message
  );
}

/**
 * Check if message is a full status message
 */
export function isShipComponentFullStatusMessage(
  message: AnyShipComponentMessage
): message is ShipComponentFullStatusMessage {
  return (
    message.operation === ShipComponentOperation.Status &&
    'components' in message
  );
}

/**
 * Check if message is a damage message
 */
export function isShipComponentDamageMessage(
  message: AnyShipComponentMessage
): message is ShipComponentDamageMessage {
  return message.operation === ShipComponentOperation.Damage;
}

/**
 * Check if message is a repair request
 */
export function isShipComponentRepairMessage(
  message: AnyShipComponentMessage
): message is ShipComponentRepairMessage {
  return (
    message.operation === ShipComponentOperation.Repair &&
    !('success' in message)
  );
}

/**
 * Check if message is a repair response
 */
export function isShipComponentRepairResponse(
  message: AnyShipComponentMessage
): message is ShipComponentRepairResponseMessage {
  return (
    message.operation === ShipComponentOperation.Repair &&
    'success' in message
  );
}

/**
 * Check if message is an info request
 */
export function isShipComponentInfoMessage(
  message: AnyShipComponentMessage
): message is ShipComponentInfoMessage {
  return (
    message.operation === ShipComponentOperation.Info &&
    !('success' in message)
  );
}

/**
 * Check if message is an info response
 */
export function isShipComponentInfoResponse(
  message: AnyShipComponentMessage
): message is ShipComponentInfoResponseMessage {
  return (
    message.operation === ShipComponentOperation.Info &&
    'success' in message
  );
}

// ============================================
// Message CRC Values
// ============================================

/**
 * Message CRC values for network serialization
 */
export const ShipComponentMessageCrc = {
  INSTALL_MESSAGE: 0x53434d49, // 'SCMI'
  INSTALL_RESPONSE: 0x53434952, // 'SCIR'
  REMOVE_MESSAGE: 0x5343524d, // 'SCRM'
  REMOVE_RESPONSE: 0x53435252, // 'SCRR'
  STATUS_MESSAGE: 0x53435354, // 'SCST'
  FULL_STATUS_MESSAGE: 0x53434653, // 'SCFS'
  DAMAGE_MESSAGE: 0x53434447, // 'SCDG'
  REPAIR_MESSAGE: 0x53435250, // 'SCRP'
  REPAIR_RESPONSE: 0x53434550, // 'SCEP'
  INFO_MESSAGE: 0x5343494e, // 'SCIN'
  INFO_RESPONSE: 0x53434952, // 'SCIR'
} as const;
