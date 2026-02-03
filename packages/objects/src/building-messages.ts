/**
 * Building Network Messages
 * Message types for player structure system communication between client and server
 *
 * Building System Message Flow:
 * 1. Client places structure -> StructurePlaceMessage
 * 2. Server responds with placement result
 * 3. Client manages permissions -> StructurePermissionUpdateMessage
 * 4. Client pays maintenance -> StructurePayMaintenanceMessage
 * 5. Client requests status -> StructureStatusMessage
 * 6. Client packs structure -> StructurePackMessage
 * 7. Client destroys structure -> StructureDestroyMessage
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import type {
  BuildingType,
  StructureConditionState,
  BuildingPermission,
  MaintenanceStatus,
  PowerStatus,
} from './building-types.js';

/**
 * Structure message operation types
 */
export enum StructureOperation {
  /** Place a new structure */
  Place = 0,
  /** Get/update permission list */
  PermissionList = 1,
  /** Update individual permission */
  PermissionUpdate = 2,
  /** Get structure status */
  Status = 3,
  /** Pay maintenance */
  PayMaintenance = 4,
  /** Pack structure into deed */
  Pack = 5,
  /** Destroy structure */
  Destroy = 6,
  /** Update sign text */
  Sign = 7,
  /** Transfer ownership */
  Transfer = 8,
}

/**
 * Base interface for structure messages
 */
interface BaseStructureMessage {
  /** Message operation type */
  operation: StructureOperation;
  /** Structure object ID (0 for place operations) */
  structureId: ObjectId;
  /** Player object ID */
  playerId: ObjectId;
  /** Timestamp of the message */
  timestamp: number;
}

// ============================================
// Place Structure Messages
// ============================================

/**
 * Client request to place a structure
 */
export interface StructurePlaceMessage extends BaseStructureMessage {
  operation: StructureOperation.Place;
  /** Deed object ID being used */
  deedId: ObjectId;
  /** Position to place structure */
  position: Vector3;
  /** Heading in radians */
  heading: number;
  /** Planet/scene ID */
  sceneId: string;
}

/**
 * Create a structure place message
 */
export function createStructurePlaceMessage(
  playerId: ObjectId,
  deedId: ObjectId,
  position: Vector3,
  heading: number,
  sceneId: string
): StructurePlaceMessage {
  return {
    operation: StructureOperation.Place,
    structureId: 0n,
    playerId,
    timestamp: Date.now(),
    deedId,
    position: { ...position },
    heading,
    sceneId,
  };
}

/**
 * Server response to place request
 */
export interface StructurePlaceResponseMessage {
  operation: StructureOperation.Place;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Newly created structure ID (if successful) */
  structureId?: ObjectId;
  /** Building type placed */
  buildingType?: BuildingType;
  /** Lots consumed */
  lotsConsumed?: number;
  /** Remaining lots */
  remainingLots?: number;
  timestamp: number;
}

/**
 * Create a structure place response
 */
export function createStructurePlaceResponse(
  playerId: ObjectId,
  structureId: ObjectId | undefined,
  buildingType: BuildingType | undefined,
  lotsConsumed: number | undefined,
  remainingLots: number | undefined,
  success: boolean = true,
  errorMessage?: string
): StructurePlaceResponseMessage {
  return {
    operation: StructureOperation.Place,
    playerId,
    success,
    errorMessage,
    structureId,
    buildingType,
    lotsConsumed,
    remainingLots,
    timestamp: Date.now(),
  };
}

// ============================================
// Permission List Messages
// ============================================

/**
 * Permission entry for message transmission
 */
export interface PermissionEntryData {
  characterId: ObjectId;
  characterName: string;
  permissions: BuildingPermission[];
}

/**
 * Client request for permission list
 */
export interface StructurePermissionListMessage extends BaseStructureMessage {
  operation: StructureOperation.PermissionList;
}

/**
 * Create a permission list request message
 */
export function createStructurePermissionListMessage(
  playerId: ObjectId,
  structureId: ObjectId
): StructurePermissionListMessage {
  return {
    operation: StructureOperation.PermissionList,
    structureId,
    playerId,
    timestamp: Date.now(),
  };
}

/**
 * Server response with permission list
 */
export interface StructurePermissionListResponseMessage {
  operation: StructureOperation.PermissionList;
  structureId: ObjectId;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Permission entries */
  entries?: PermissionEntryData[];
  /** Banned player IDs */
  bannedPlayers?: ObjectId[];
  /** Whether structure is public */
  isPublic?: boolean;
  /** Requester's permission level */
  requesterIsOwner?: boolean;
  requesterIsAdmin?: boolean;
  timestamp: number;
}

/**
 * Create a permission list response
 */
export function createStructurePermissionListResponse(
  playerId: ObjectId,
  structureId: ObjectId,
  entries: PermissionEntryData[] | undefined,
  bannedPlayers: ObjectId[] | undefined,
  isPublic: boolean | undefined,
  requesterIsOwner: boolean,
  requesterIsAdmin: boolean,
  success: boolean = true,
  errorMessage?: string
): StructurePermissionListResponseMessage {
  return {
    operation: StructureOperation.PermissionList,
    structureId,
    playerId,
    success,
    errorMessage,
    entries,
    bannedPlayers,
    isPublic,
    requesterIsOwner,
    requesterIsAdmin,
    timestamp: Date.now(),
  };
}

// ============================================
// Permission Update Messages
// ============================================

/**
 * Permission update action types
 */
export enum PermissionUpdateAction {
  /** Grant permissions */
  Grant = 0,
  /** Revoke permissions */
  Revoke = 1,
  /** Ban player */
  Ban = 2,
  /** Unban player */
  Unban = 3,
  /** Set public/private */
  SetPublic = 4,
}

/**
 * Client request to update permissions
 */
export interface StructurePermissionUpdateMessage extends BaseStructureMessage {
  operation: StructureOperation.PermissionUpdate;
  /** Action to perform */
  action: PermissionUpdateAction;
  /** Target character ID (for grant/revoke/ban/unban) */
  targetId?: ObjectId;
  /** Target character name (for grant) */
  targetName?: string;
  /** Permissions to grant/revoke */
  permissions?: BuildingPermission[];
  /** Public flag (for SetPublic action) */
  isPublic?: boolean;
}

/**
 * Create a permission update message
 */
export function createStructurePermissionUpdateMessage(
  playerId: ObjectId,
  structureId: ObjectId,
  action: PermissionUpdateAction,
  targetId?: ObjectId,
  targetName?: string,
  permissions?: BuildingPermission[],
  isPublic?: boolean
): StructurePermissionUpdateMessage {
  return {
    operation: StructureOperation.PermissionUpdate,
    structureId,
    playerId,
    timestamp: Date.now(),
    action,
    targetId,
    targetName,
    permissions,
    isPublic,
  };
}

/**
 * Server response to permission update
 */
export interface StructurePermissionUpdateResponseMessage {
  operation: StructureOperation.PermissionUpdate;
  structureId: ObjectId;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Action performed */
  action?: PermissionUpdateAction;
  /** Updated permission list size */
  permissionListSize?: number;
  /** Updated ban list size */
  banListSize?: number;
  timestamp: number;
}

/**
 * Create a permission update response
 */
export function createStructurePermissionUpdateResponse(
  playerId: ObjectId,
  structureId: ObjectId,
  action: PermissionUpdateAction | undefined,
  permissionListSize: number | undefined,
  banListSize: number | undefined,
  success: boolean = true,
  errorMessage?: string
): StructurePermissionUpdateResponseMessage {
  return {
    operation: StructureOperation.PermissionUpdate,
    structureId,
    playerId,
    success,
    errorMessage,
    action,
    permissionListSize,
    banListSize,
    timestamp: Date.now(),
  };
}

// ============================================
// Status Messages
// ============================================

/**
 * Client request for structure status
 */
export interface StructureStatusMessage extends BaseStructureMessage {
  operation: StructureOperation.Status;
}

/**
 * Create a structure status message
 */
export function createStructureStatusMessage(
  playerId: ObjectId,
  structureId: ObjectId
): StructureStatusMessage {
  return {
    operation: StructureOperation.Status,
    structureId,
    playerId,
    timestamp: Date.now(),
  };
}

/**
 * Server response with structure status
 */
export interface StructureStatusResponseMessage {
  operation: StructureOperation.Status;
  structureId: ObjectId;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Structure name */
  structureName?: string;
  /** Owner name */
  ownerName?: string;
  /** Building type */
  buildingType?: BuildingType;
  /** Condition state */
  conditionState?: StructureConditionState;
  /** Condition percentage (0-100) */
  conditionPercent?: number;
  /** Maintenance status */
  maintenance?: MaintenanceStatus;
  /** Power status */
  power?: PowerStatus;
  /** Number of lots used */
  lotCost?: number;
  /** Whether structure is public */
  isPublic?: boolean;
  /** Cell count */
  cellCount?: number;
  /** Sign text */
  sign?: string;
  /** When structure was placed */
  placedAt?: string;
  timestamp: number;
}

/**
 * Create a structure status response
 */
export function createStructureStatusResponse(
  playerId: ObjectId,
  structureId: ObjectId,
  structureName: string | undefined,
  ownerName: string | undefined,
  buildingType: BuildingType | undefined,
  conditionState: StructureConditionState | undefined,
  conditionPercent: number | undefined,
  maintenance: MaintenanceStatus | undefined,
  power: PowerStatus | undefined,
  lotCost: number | undefined,
  isPublic: boolean | undefined,
  cellCount: number | undefined,
  sign: string | undefined,
  placedAt: string | undefined,
  success: boolean = true,
  errorMessage?: string
): StructureStatusResponseMessage {
  return {
    operation: StructureOperation.Status,
    structureId,
    playerId,
    success,
    errorMessage,
    structureName,
    ownerName,
    buildingType,
    conditionState,
    conditionPercent,
    maintenance,
    power,
    lotCost,
    isPublic,
    cellCount,
    sign,
    placedAt,
    timestamp: Date.now(),
  };
}

// ============================================
// Pay Maintenance Messages
// ============================================

/**
 * Client request to pay maintenance
 */
export interface StructurePayMaintenanceMessage extends BaseStructureMessage {
  operation: StructureOperation.PayMaintenance;
  /** Amount to pay */
  amount: number;
}

/**
 * Create a pay maintenance message
 */
export function createStructurePayMaintenanceMessage(
  playerId: ObjectId,
  structureId: ObjectId,
  amount: number
): StructurePayMaintenanceMessage {
  return {
    operation: StructureOperation.PayMaintenance,
    structureId,
    playerId,
    timestamp: Date.now(),
    amount,
  };
}

/**
 * Server response to pay maintenance
 */
export interface StructurePayMaintenanceResponseMessage {
  operation: StructureOperation.PayMaintenance;
  structureId: ObjectId;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Amount paid */
  amountPaid?: number;
  /** New maintenance pool balance */
  newPool?: number;
  /** Days remaining */
  daysRemaining?: number;
  /** Player's new credit balance */
  playerBalance?: number;
  timestamp: number;
}

/**
 * Create a pay maintenance response
 */
export function createStructurePayMaintenanceResponse(
  playerId: ObjectId,
  structureId: ObjectId,
  amountPaid: number | undefined,
  newPool: number | undefined,
  daysRemaining: number | undefined,
  playerBalance: number | undefined,
  success: boolean = true,
  errorMessage?: string
): StructurePayMaintenanceResponseMessage {
  return {
    operation: StructureOperation.PayMaintenance,
    structureId,
    playerId,
    success,
    errorMessage,
    amountPaid,
    newPool,
    daysRemaining,
    playerBalance,
    timestamp: Date.now(),
  };
}

// ============================================
// Pack Structure Messages
// ============================================

/**
 * Client request to pack structure
 */
export interface StructurePackMessage extends BaseStructureMessage {
  operation: StructureOperation.Pack;
}

/**
 * Create a pack structure message
 */
export function createStructurePackMessage(
  playerId: ObjectId,
  structureId: ObjectId
): StructurePackMessage {
  return {
    operation: StructureOperation.Pack,
    structureId,
    playerId,
    timestamp: Date.now(),
  };
}

/**
 * Server response to pack request
 */
export interface StructurePackResponseMessage {
  operation: StructureOperation.Pack;
  structureId: ObjectId;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Deed object ID created */
  deedId?: ObjectId;
  /** Lots returned */
  lotsReturned?: number;
  /** New lot count */
  newLotCount?: number;
  timestamp: number;
}

/**
 * Create a pack structure response
 */
export function createStructurePackResponse(
  playerId: ObjectId,
  structureId: ObjectId,
  deedId: ObjectId | undefined,
  lotsReturned: number | undefined,
  newLotCount: number | undefined,
  success: boolean = true,
  errorMessage?: string
): StructurePackResponseMessage {
  return {
    operation: StructureOperation.Pack,
    structureId,
    playerId,
    success,
    errorMessage,
    deedId,
    lotsReturned,
    newLotCount,
    timestamp: Date.now(),
  };
}

// ============================================
// Destroy Structure Messages
// ============================================

/**
 * Client request to destroy structure
 */
export interface StructureDestroyMessage extends BaseStructureMessage {
  operation: StructureOperation.Destroy;
  /** Confirmation code (to prevent accidents) */
  confirmationCode: string;
}

/**
 * Create a destroy structure message
 */
export function createStructureDestroyMessage(
  playerId: ObjectId,
  structureId: ObjectId,
  confirmationCode: string
): StructureDestroyMessage {
  return {
    operation: StructureOperation.Destroy,
    structureId,
    playerId,
    timestamp: Date.now(),
    confirmationCode,
  };
}

/**
 * Server response to destroy request
 */
export interface StructureDestroyResponseMessage {
  operation: StructureOperation.Destroy;
  structureId: ObjectId;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Lots returned */
  lotsReturned?: number;
  /** New lot count */
  newLotCount?: number;
  timestamp: number;
}

/**
 * Create a destroy structure response
 */
export function createStructureDestroyResponse(
  playerId: ObjectId,
  structureId: ObjectId,
  lotsReturned: number | undefined,
  newLotCount: number | undefined,
  success: boolean = true,
  errorMessage?: string
): StructureDestroyResponseMessage {
  return {
    operation: StructureOperation.Destroy,
    structureId,
    playerId,
    success,
    errorMessage,
    lotsReturned,
    newLotCount,
    timestamp: Date.now(),
  };
}

// ============================================
// Sign Messages
// ============================================

/**
 * Client request to update structure sign
 */
export interface StructureSignMessage extends BaseStructureMessage {
  operation: StructureOperation.Sign;
  /** New sign text (empty to clear) */
  signText: string;
}

/**
 * Create a sign update message
 */
export function createStructureSignMessage(
  playerId: ObjectId,
  structureId: ObjectId,
  signText: string
): StructureSignMessage {
  return {
    operation: StructureOperation.Sign,
    structureId,
    playerId,
    timestamp: Date.now(),
    signText,
  };
}

/**
 * Server response to sign update
 */
export interface StructureSignResponseMessage {
  operation: StructureOperation.Sign;
  structureId: ObjectId;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** New sign text */
  signText?: string;
  timestamp: number;
}

/**
 * Create a sign update response
 */
export function createStructureSignResponse(
  playerId: ObjectId,
  structureId: ObjectId,
  signText: string | undefined,
  success: boolean = true,
  errorMessage?: string
): StructureSignResponseMessage {
  return {
    operation: StructureOperation.Sign,
    structureId,
    playerId,
    success,
    errorMessage,
    signText,
    timestamp: Date.now(),
  };
}

// ============================================
// Transfer Messages
// ============================================

/**
 * Client request to transfer structure ownership
 */
export interface StructureTransferMessage extends BaseStructureMessage {
  operation: StructureOperation.Transfer;
  /** New owner character ID */
  newOwnerId: ObjectId;
  /** New owner character name */
  newOwnerName: string;
}

/**
 * Create a transfer message
 */
export function createStructureTransferMessage(
  playerId: ObjectId,
  structureId: ObjectId,
  newOwnerId: ObjectId,
  newOwnerName: string
): StructureTransferMessage {
  return {
    operation: StructureOperation.Transfer,
    structureId,
    playerId,
    timestamp: Date.now(),
    newOwnerId,
    newOwnerName,
  };
}

/**
 * Server response to transfer request
 */
export interface StructureTransferResponseMessage {
  operation: StructureOperation.Transfer;
  structureId: ObjectId;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** New owner ID */
  newOwnerId?: ObjectId;
  /** New owner name */
  newOwnerName?: string;
  timestamp: number;
}

/**
 * Create a transfer response
 */
export function createStructureTransferResponse(
  playerId: ObjectId,
  structureId: ObjectId,
  newOwnerId: ObjectId | undefined,
  newOwnerName: string | undefined,
  success: boolean = true,
  errorMessage?: string
): StructureTransferResponseMessage {
  return {
    operation: StructureOperation.Transfer,
    structureId,
    playerId,
    success,
    errorMessage,
    newOwnerId,
    newOwnerName,
    timestamp: Date.now(),
  };
}

// ============================================
// Union Types and Type Guards
// ============================================

/**
 * Union type of all structure request messages
 */
export type AnyStructureRequestMessage =
  | StructurePlaceMessage
  | StructurePermissionListMessage
  | StructurePermissionUpdateMessage
  | StructureStatusMessage
  | StructurePayMaintenanceMessage
  | StructurePackMessage
  | StructureDestroyMessage
  | StructureSignMessage
  | StructureTransferMessage;

/**
 * Union type of all structure response messages
 */
export type AnyStructureResponseMessage =
  | StructurePlaceResponseMessage
  | StructurePermissionListResponseMessage
  | StructurePermissionUpdateResponseMessage
  | StructureStatusResponseMessage
  | StructurePayMaintenanceResponseMessage
  | StructurePackResponseMessage
  | StructureDestroyResponseMessage
  | StructureSignResponseMessage
  | StructureTransferResponseMessage;

/**
 * Type guard for place message
 */
export function isStructurePlaceMessage(msg: AnyStructureRequestMessage): msg is StructurePlaceMessage {
  return msg.operation === StructureOperation.Place;
}

/**
 * Type guard for permission list message
 */
export function isStructurePermissionListMessage(msg: AnyStructureRequestMessage): msg is StructurePermissionListMessage {
  return msg.operation === StructureOperation.PermissionList;
}

/**
 * Type guard for permission update message
 */
export function isStructurePermissionUpdateMessage(msg: AnyStructureRequestMessage): msg is StructurePermissionUpdateMessage {
  return msg.operation === StructureOperation.PermissionUpdate;
}

/**
 * Type guard for status message
 */
export function isStructureStatusMessage(msg: AnyStructureRequestMessage): msg is StructureStatusMessage {
  return msg.operation === StructureOperation.Status;
}

/**
 * Type guard for pay maintenance message
 */
export function isStructurePayMaintenanceMessage(msg: AnyStructureRequestMessage): msg is StructurePayMaintenanceMessage {
  return msg.operation === StructureOperation.PayMaintenance;
}

/**
 * Type guard for pack message
 */
export function isStructurePackMessage(msg: AnyStructureRequestMessage): msg is StructurePackMessage {
  return msg.operation === StructureOperation.Pack;
}

/**
 * Type guard for destroy message
 */
export function isStructureDestroyMessage(msg: AnyStructureRequestMessage): msg is StructureDestroyMessage {
  return msg.operation === StructureOperation.Destroy;
}

/**
 * Type guard for sign message
 */
export function isStructureSignMessage(msg: AnyStructureRequestMessage): msg is StructureSignMessage {
  return msg.operation === StructureOperation.Sign;
}

/**
 * Type guard for transfer message
 */
export function isStructureTransferMessage(msg: AnyStructureRequestMessage): msg is StructureTransferMessage {
  return msg.operation === StructureOperation.Transfer;
}

/**
 * Check if message requires owner privileges
 */
export function requiresOwnerPrivilege(msg: AnyStructureRequestMessage): boolean {
  return (
    msg.operation === StructureOperation.Pack ||
    msg.operation === StructureOperation.Destroy ||
    msg.operation === StructureOperation.Transfer
  );
}

/**
 * Check if message requires admin or owner privileges
 */
export function requiresAdminPrivilege(msg: AnyStructureRequestMessage): boolean {
  return (
    msg.operation === StructureOperation.PermissionUpdate ||
    msg.operation === StructureOperation.Sign ||
    msg.operation === StructureOperation.PayMaintenance
  );
}

/**
 * Message CRC values for network serialization
 */
export const StructureMessageCrc = {
  STRUCTURE_PLACE_MESSAGE: 0x34567890,
  STRUCTURE_PLACE_RESPONSE: 0x34567891,
  STRUCTURE_PERMISSION_LIST_MESSAGE: 0x34567892,
  STRUCTURE_PERMISSION_LIST_RESPONSE: 0x34567893,
  STRUCTURE_PERMISSION_UPDATE_MESSAGE: 0x34567894,
  STRUCTURE_PERMISSION_UPDATE_RESPONSE: 0x34567895,
  STRUCTURE_STATUS_MESSAGE: 0x34567896,
  STRUCTURE_STATUS_RESPONSE: 0x34567897,
  STRUCTURE_PAY_MAINTENANCE_MESSAGE: 0x34567898,
  STRUCTURE_PAY_MAINTENANCE_RESPONSE: 0x34567899,
  STRUCTURE_PACK_MESSAGE: 0x3456789a,
  STRUCTURE_PACK_RESPONSE: 0x3456789b,
  STRUCTURE_DESTROY_MESSAGE: 0x3456789c,
  STRUCTURE_DESTROY_RESPONSE: 0x3456789d,
  STRUCTURE_SIGN_MESSAGE: 0x3456789e,
  STRUCTURE_SIGN_RESPONSE: 0x3456789f,
  STRUCTURE_TRANSFER_MESSAGE: 0x345678a0,
  STRUCTURE_TRANSFER_RESPONSE: 0x345678a1,
} as const;
