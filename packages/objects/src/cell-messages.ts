/**
 * Cell Network Messages
 * Message types for cell system communication between client and server
 *
 * Cell System Message Flow:
 * 1. Player approaches portal -> CellEnterMessage sent
 * 2. Server validates access and responds with success/failure
 * 3. On entry, server sends CellUpdateContentsMessage with current objects
 * 4. When objects are added/removed, delta updates are sent
 * 5. Portal state changes trigger CellPortalStateMessage
 * 6. Permission changes trigger CellPermissionMessage
 *
 * The cell message system is critical for player housing interiors,
 * where each room must independently track its contents and state.
 */

import type { ObjectId } from '@swg/shared-types';
import type { CellLighting } from './cell-types.js';

/**
 * Cell message operation types
 */
export enum CellOperation {
  /** Player entering a cell */
  Enter = 0,
  /** Player leaving a cell */
  Leave = 1,
  /** Update cell contents (objects added/removed) */
  UpdateContents = 2,
  /** Portal state changed (open/closed/locked) */
  PortalState = 3,
  /** Cell permission update */
  Permission = 4,
  /** Cell lighting update */
  Lighting = 5,
}

/**
 * Base interface for cell messages
 */
interface BaseCellMessage {
  /** Message operation type */
  operation: CellOperation;
  /** Building object ID */
  buildingId: ObjectId;
  /** Cell index within the building */
  cellIndex: number;
  /** Timestamp of the message */
  timestamp: number;
}

// ============================================
// Cell Enter/Leave Messages
// ============================================

/**
 * Message sent when a player enters a cell
 */
export interface CellEnterMessage extends BaseCellMessage {
  operation: CellOperation.Enter;
  /** Player object ID entering the cell */
  playerId: ObjectId;
  /** Portal ID used to enter (if any) */
  portalId?: number;
  /** Source cell index (if coming from another cell) */
  fromCellIndex?: number;
}

/**
 * Create a cell enter message
 */
export function createCellEnterMessage(
  buildingId: ObjectId,
  cellIndex: number,
  playerId: ObjectId,
  portalId?: number,
  fromCellIndex?: number
): CellEnterMessage {
  return {
    operation: CellOperation.Enter,
    buildingId,
    cellIndex,
    playerId,
    portalId,
    fromCellIndex,
    timestamp: Date.now(),
  };
}

/**
 * Response to a cell enter request
 */
export interface CellEnterResponseMessage {
  operation: CellOperation.Enter;
  buildingId: ObjectId;
  cellIndex: number;
  playerId: ObjectId;
  /** Whether entry was successful */
  success: boolean;
  /** Error message if entry failed */
  errorMessage?: string;
  /** Cell display name */
  cellName?: string;
  /** Initial object IDs in the cell (on successful entry) */
  contents?: ObjectId[];
  /** Current lighting configuration */
  lighting?: CellLighting;
  timestamp: number;
}

/**
 * Create a cell enter response message
 */
export function createCellEnterResponse(
  buildingId: ObjectId,
  cellIndex: number,
  playerId: ObjectId,
  success: boolean,
  cellName?: string,
  contents?: ObjectId[],
  lighting?: CellLighting,
  errorMessage?: string
): CellEnterResponseMessage {
  return {
    operation: CellOperation.Enter,
    buildingId,
    cellIndex,
    playerId,
    success,
    errorMessage,
    cellName,
    contents,
    lighting,
    timestamp: Date.now(),
  };
}

/**
 * Message sent when a player leaves a cell
 */
export interface CellLeaveMessage extends BaseCellMessage {
  operation: CellOperation.Leave;
  /** Player object ID leaving the cell */
  playerId: ObjectId;
  /** Portal ID used to exit (if any) */
  portalId?: number;
  /** Destination cell index (if going to another cell) */
  toCellIndex?: number;
}

/**
 * Create a cell leave message
 */
export function createCellLeaveMessage(
  buildingId: ObjectId,
  cellIndex: number,
  playerId: ObjectId,
  portalId?: number,
  toCellIndex?: number
): CellLeaveMessage {
  return {
    operation: CellOperation.Leave,
    buildingId,
    cellIndex,
    playerId,
    portalId,
    toCellIndex,
    timestamp: Date.now(),
  };
}

/**
 * Response to a cell leave request
 */
export interface CellLeaveResponseMessage {
  operation: CellOperation.Leave;
  buildingId: ObjectId;
  cellIndex: number;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  timestamp: number;
}

/**
 * Create a cell leave response message
 */
export function createCellLeaveResponse(
  buildingId: ObjectId,
  cellIndex: number,
  playerId: ObjectId,
  success: boolean,
  errorMessage?: string
): CellLeaveResponseMessage {
  return {
    operation: CellOperation.Leave,
    buildingId,
    cellIndex,
    playerId,
    success,
    errorMessage,
    timestamp: Date.now(),
  };
}

// ============================================
// Cell Contents Update Messages
// ============================================

/**
 * Delta update for cell contents
 * Sent when objects are added or removed from a cell
 */
export interface CellUpdateContentsMessage extends BaseCellMessage {
  operation: CellOperation.UpdateContents;
  /** Object IDs added to the cell */
  added: ObjectId[];
  /** Object IDs removed from the cell */
  removed: ObjectId[];
  /** Current total object count */
  totalCount: number;
}

/**
 * Create a cell contents update message
 */
export function createCellUpdateContentsMessage(
  buildingId: ObjectId,
  cellIndex: number,
  added: ObjectId[],
  removed: ObjectId[],
  totalCount: number
): CellUpdateContentsMessage {
  return {
    operation: CellOperation.UpdateContents,
    buildingId,
    cellIndex,
    added,
    removed,
    totalCount,
    timestamp: Date.now(),
  };
}

// ============================================
// Portal State Messages
// ============================================

/**
 * Portal state change notification
 * Sent when a door is opened, closed, locked, or unlocked
 */
export interface CellPortalStateMessage extends BaseCellMessage {
  operation: CellOperation.PortalState;
  /** Portal ID that changed */
  portalId: number;
  /** Connected cell index */
  connectedCellIndex: number;
  /** Whether the portal is open */
  isOpen: boolean;
  /** Whether the portal is locked */
  isLocked: boolean;
  /** Player who changed the state (if any) */
  changedBy?: ObjectId;
}

/**
 * Create a portal state message
 */
export function createCellPortalStateMessage(
  buildingId: ObjectId,
  cellIndex: number,
  portalId: number,
  connectedCellIndex: number,
  isOpen: boolean,
  isLocked: boolean,
  changedBy?: ObjectId
): CellPortalStateMessage {
  return {
    operation: CellOperation.PortalState,
    buildingId,
    cellIndex,
    portalId,
    connectedCellIndex,
    isOpen,
    isLocked,
    changedBy,
    timestamp: Date.now(),
  };
}

// ============================================
// Cell Permission Messages
// ============================================

/**
 * Permission change types
 */
export enum CellPermissionChangeType {
  /** Grant access to a player */
  Grant = 0,
  /** Revoke access from a player */
  Revoke = 1,
  /** Set cell as public */
  SetPublic = 2,
  /** Set cell as private */
  SetPrivate = 3,
  /** Clear all permission overrides */
  ClearOverrides = 4,
}

/**
 * Cell permission change message
 * Sent when cell access permissions are modified
 */
export interface CellPermissionMessage extends BaseCellMessage {
  operation: CellOperation.Permission;
  /** Type of permission change */
  changeType: CellPermissionChangeType;
  /** Player ID affected (for Grant/Revoke) */
  targetPlayerId?: ObjectId;
  /** Player who made the change */
  changedBy: ObjectId;
  /** New public access state (after change) */
  isPublic: boolean;
  /** Current list of players with permission overrides */
  permissionOverrides?: ObjectId[];
}

/**
 * Create a cell permission message
 */
export function createCellPermissionMessage(
  buildingId: ObjectId,
  cellIndex: number,
  changeType: CellPermissionChangeType,
  changedBy: ObjectId,
  isPublic: boolean,
  targetPlayerId?: ObjectId,
  permissionOverrides?: ObjectId[]
): CellPermissionMessage {
  return {
    operation: CellOperation.Permission,
    buildingId,
    cellIndex,
    changeType,
    targetPlayerId,
    changedBy,
    isPublic,
    permissionOverrides,
    timestamp: Date.now(),
  };
}

/**
 * Response to a permission change request
 */
export interface CellPermissionResponseMessage {
  operation: CellOperation.Permission;
  buildingId: ObjectId;
  cellIndex: number;
  success: boolean;
  errorMessage?: string;
  changeType: CellPermissionChangeType;
  changedBy: ObjectId;
  isPublic: boolean;
  permissionOverrides?: ObjectId[];
  timestamp: number;
}

/**
 * Create a cell permission response message
 */
export function createCellPermissionResponse(
  buildingId: ObjectId,
  cellIndex: number,
  changeType: CellPermissionChangeType,
  changedBy: ObjectId,
  isPublic: boolean,
  success: boolean,
  permissionOverrides?: ObjectId[],
  errorMessage?: string
): CellPermissionResponseMessage {
  return {
    operation: CellOperation.Permission,
    buildingId,
    cellIndex,
    success,
    errorMessage,
    changeType,
    changedBy,
    isPublic,
    permissionOverrides,
    timestamp: Date.now(),
  };
}

// ============================================
// Cell Lighting Messages
// ============================================

/**
 * Cell lighting update message
 * Sent when the lighting configuration of a cell changes
 */
export interface CellLightingMessage extends BaseCellMessage {
  operation: CellOperation.Lighting;
  /** New lighting configuration */
  lighting: CellLighting;
  /** Player who changed the lighting */
  changedBy: ObjectId;
}

/**
 * Create a cell lighting message
 */
export function createCellLightingMessage(
  buildingId: ObjectId,
  cellIndex: number,
  lighting: CellLighting,
  changedBy: ObjectId
): CellLightingMessage {
  return {
    operation: CellOperation.Lighting,
    buildingId,
    cellIndex,
    lighting,
    changedBy,
    timestamp: Date.now(),
  };
}

// ============================================
// Union Types and Type Guards
// ============================================

/**
 * Union type of all cell request messages
 */
export type AnyCellRequestMessage =
  | CellEnterMessage
  | CellLeaveMessage
  | CellPermissionMessage
  | CellLightingMessage;

/**
 * Union type of all cell response/notification messages
 */
export type AnyCellResponseMessage =
  | CellEnterResponseMessage
  | CellLeaveResponseMessage
  | CellUpdateContentsMessage
  | CellPortalStateMessage
  | CellPermissionResponseMessage
  | CellLightingMessage;

/**
 * Union type of all cell messages
 */
export type AnyCellMessage =
  | CellEnterMessage
  | CellEnterResponseMessage
  | CellLeaveMessage
  | CellLeaveResponseMessage
  | CellUpdateContentsMessage
  | CellPortalStateMessage
  | CellPermissionMessage
  | CellPermissionResponseMessage
  | CellLightingMessage;

/**
 * Check if message is a cell enter message
 */
export function isCellEnterMessage(msg: AnyCellMessage): msg is CellEnterMessage {
  return msg.operation === CellOperation.Enter && 'playerId' in msg && !('success' in msg);
}

/**
 * Check if message is a cell enter response
 */
export function isCellEnterResponse(msg: AnyCellMessage): msg is CellEnterResponseMessage {
  return msg.operation === CellOperation.Enter && 'success' in msg;
}

/**
 * Check if message is a cell leave message
 */
export function isCellLeaveMessage(msg: AnyCellMessage): msg is CellLeaveMessage {
  return msg.operation === CellOperation.Leave && 'playerId' in msg && !('success' in msg);
}

/**
 * Check if message is a cell leave response
 */
export function isCellLeaveResponse(msg: AnyCellMessage): msg is CellLeaveResponseMessage {
  return msg.operation === CellOperation.Leave && 'success' in msg;
}

/**
 * Check if message is a cell contents update
 */
export function isCellUpdateContentsMessage(msg: AnyCellMessage): msg is CellUpdateContentsMessage {
  return msg.operation === CellOperation.UpdateContents;
}

/**
 * Check if message is a portal state message
 */
export function isCellPortalStateMessage(msg: AnyCellMessage): msg is CellPortalStateMessage {
  return msg.operation === CellOperation.PortalState;
}

/**
 * Check if message is a permission message
 */
export function isCellPermissionMessage(msg: AnyCellMessage): msg is CellPermissionMessage {
  return msg.operation === CellOperation.Permission && !('success' in msg);
}

/**
 * Check if message is a permission response
 */
export function isCellPermissionResponse(msg: AnyCellMessage): msg is CellPermissionResponseMessage {
  return msg.operation === CellOperation.Permission && 'success' in msg;
}

/**
 * Check if message is a lighting message
 */
export function isCellLightingMessage(msg: AnyCellMessage): msg is CellLightingMessage {
  return msg.operation === CellOperation.Lighting;
}

/**
 * Message CRC values for network serialization
 */
export const CellMessageCrc = {
  CELL_ENTER_MESSAGE: 0x34567890,
  CELL_ENTER_RESPONSE: 0x34567891,
  CELL_LEAVE_MESSAGE: 0x34567892,
  CELL_LEAVE_RESPONSE: 0x34567893,
  CELL_UPDATE_CONTENTS_MESSAGE: 0x34567894,
  CELL_PORTAL_STATE_MESSAGE: 0x34567895,
  CELL_PERMISSION_MESSAGE: 0x34567896,
  CELL_PERMISSION_RESPONSE: 0x34567897,
  CELL_LIGHTING_MESSAGE: 0x34567898,
} as const;
