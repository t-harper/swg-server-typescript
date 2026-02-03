/**
 * Container Type Definitions
 * Defines container types, slot definitions, permissions, and transfer results
 * for the SWG inventory and container management system.
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';

/**
 * Container type enumeration
 * Identifies the type of container for specific handling and UI behavior
 */
export enum ContainerType {
  /** Generic container (default) */
  Generic = 0,
  /** Player inventory (80 slots default) */
  Inventory = 1,
  /** Backpack (wearable storage) */
  Backpack = 2,
  /** Chest (world storage, player-placed) */
  Chest = 3,
  /** Crate (stacked identical items) */
  Crate = 4,
  /** Datapad (missions, waypoints, vehicles) */
  Datapad = 5,
  /** Bank (persistent storage) */
  Bank = 6,
  /** Corpse loot container */
  Corpse = 7,
  /** Treasure chest (spawned loot) */
  TreasureChest = 8,
  /** Vehicle storage */
  Vehicle = 9,
  /** Structure storage */
  Structure = 10,
  /** Vendor inventory */
  Vendor = 11,
  /** Trade container (secure trade) */
  Trade = 12,
  /** Crafting station */
  CraftingStation = 13,
  /** Resource container (stacked resources) */
  ResourceContainer = 14,
  /** Equipped items container */
  Equipment = 15,
  /** Appearance (clothing) container */
  Appearance = 16,
  /** Droid storage */
  Droid = 17,
  /** Mission bag */
  MissionBag = 18,
}

/**
 * Container permission levels
 * Controls who can access and modify container contents
 */
export enum ContainerPermission {
  /** No access (locked) */
  None = 0,
  /** Only the owner can access */
  Owner = 1,
  /** Owner and group members can access */
  Group = 2,
  /** Owner and guild members can access */
  Guild = 3,
  /** Anyone can access (public) */
  Public = 4,
  /** Anyone in the same faction can access */
  Faction = 5,
  /** Admin-only access */
  Admin = 6,
}

/**
 * Item restriction types for slot definitions
 * Used to restrict what types of items can be placed in specific slots
 */
export enum SlotRestriction {
  /** No restrictions */
  None = 0,
  /** Only weapons allowed */
  Weapon = 1,
  /** Only armor allowed */
  Armor = 2,
  /** Only clothing allowed */
  Clothing = 3,
  /** Only resources allowed */
  Resource = 4,
  /** Only crafting components allowed */
  Component = 5,
  /** Only datapads/electronics allowed */
  Electronic = 6,
  /** Only food/drink allowed */
  Consumable = 7,
  /** Only mission objects allowed */
  Mission = 8,
  /** Only vehicle deeds/keys allowed */
  Vehicle = 9,
  /** Only pets allowed */
  Pet = 10,
  /** Only attachments/mods allowed */
  Attachment = 11,
  /** Matches by template CRC */
  TemplateCrc = 12,
  /** Matches by object type */
  ObjectType = 13,
}

/**
 * Slot definition for named slots within containers
 * Named slots allow specific items to be placed in specific positions
 */
export interface SlotDefinition {
  /** Unique name for the slot (e.g., "head", "chest", "right_hand") */
  name: string;
  /** Display name for UI */
  displayName: string;
  /** Restriction type for this slot */
  restriction: SlotRestriction;
  /** Template CRCs allowed (if restriction is TemplateCrc) */
  allowedTemplateCrcs?: CrcValue[];
  /** Object types allowed (if restriction is ObjectType) */
  allowedObjectTypes?: number[];
  /** Whether this slot is required (cannot be empty) */
  required: boolean;
  /** Whether this slot is visible in UI */
  visible: boolean;
  /** Slot index for baseline serialization */
  index: number;
}

/**
 * Transfer result codes
 */
export enum TransferResultCode {
  /** Transfer succeeded */
  Success = 0,
  /** Source container not found */
  SourceNotFound = 1,
  /** Target container not found */
  TargetNotFound = 2,
  /** Item not found in source */
  ItemNotFound = 3,
  /** Target container is full (capacity) */
  TargetFull = 4,
  /** Target container volume exceeded */
  VolumeExceeded = 5,
  /** Item does not fit in slot */
  SlotRestriction = 6,
  /** Permission denied */
  PermissionDenied = 7,
  /** Item is not transferable (no-trade) */
  ItemNotTransferable = 8,
  /** Slot already occupied */
  SlotOccupied = 9,
  /** Invalid slot name */
  InvalidSlot = 10,
  /** Item too heavy */
  TooHeavy = 11,
  /** Container is locked */
  ContainerLocked = 12,
  /** Same container (cannot transfer to self) */
  SameContainer = 13,
  /** Generic failure */
  Failed = 99,
}

/**
 * Result of a container transfer operation
 */
export interface TransferResult {
  /** Whether the transfer succeeded */
  success: boolean;
  /** Result code */
  code: TransferResultCode;
  /** Human-readable error message */
  message: string;
  /** ID of the item that was transferred (if successful) */
  itemId?: ObjectId;
  /** Source container ID */
  sourceContainerId?: ObjectId;
  /** Target container ID */
  targetContainerId?: ObjectId;
  /** Slot the item was placed in (if any) */
  slot?: string;
  /** Previous slot the item was in (if any) */
  previousSlot?: string;
}

/**
 * Information about an item contained within a container
 */
export interface ContainedItem {
  /** The item's object ID */
  itemId: ObjectId;
  /** The item's template CRC */
  templateCrc: CrcValue;
  /** The item's volume */
  volume: number;
  /** Named slot this item occupies (undefined if in general storage) */
  slot?: string;
  /** Arrangement index within container */
  arrangementIndex: number;
  /** Timestamp when item was added */
  addedAt: number;
}

/**
 * Container change event types
 */
export enum ContainerChangeType {
  /** Item added to container */
  ItemAdded = 0,
  /** Item removed from container */
  ItemRemoved = 1,
  /** Item moved to different slot */
  ItemMoved = 2,
  /** Container permission changed */
  PermissionChanged = 3,
  /** Container capacity changed */
  CapacityChanged = 4,
  /** Container locked/unlocked */
  LockStateChanged = 5,
}

/**
 * Container change event
 */
export interface ContainerChangeEvent {
  /** Type of change */
  type: ContainerChangeType;
  /** Container ID */
  containerId: ObjectId;
  /** Item ID (if applicable) */
  itemId?: ObjectId;
  /** Slot name (if applicable) */
  slot?: string;
  /** Previous slot (for moves) */
  previousSlot?: string;
  /** Timestamp of the change */
  timestamp: number;
  /** Actor who caused the change (player ID) */
  actorId?: ObjectId;
}

/**
 * Default container capacities by type
 */
export const DEFAULT_CONTAINER_CAPACITIES: Record<ContainerType, number> = {
  [ContainerType.Generic]: 50,
  [ContainerType.Inventory]: 80,
  [ContainerType.Backpack]: 50,
  [ContainerType.Chest]: 100,
  [ContainerType.Crate]: 1, // Factory crates hold one stack
  [ContainerType.Datapad]: 30,
  [ContainerType.Bank]: 100,
  [ContainerType.Corpse]: 50,
  [ContainerType.TreasureChest]: 25,
  [ContainerType.Vehicle]: 25,
  [ContainerType.Structure]: 400,
  [ContainerType.Vendor]: 200,
  [ContainerType.Trade]: 20,
  [ContainerType.CraftingStation]: 10,
  [ContainerType.ResourceContainer]: 1, // Resource containers hold one type
  [ContainerType.Equipment]: 20,
  [ContainerType.Appearance]: 10,
  [ContainerType.Droid]: 30,
  [ContainerType.MissionBag]: 10,
};

/**
 * Default container volumes by type
 */
export const DEFAULT_CONTAINER_VOLUMES: Record<ContainerType, number> = {
  [ContainerType.Generic]: 1000,
  [ContainerType.Inventory]: 100000, // Very large for player inventory
  [ContainerType.Backpack]: 5000,
  [ContainerType.Chest]: 10000,
  [ContainerType.Crate]: 100,
  [ContainerType.Datapad]: 1000,
  [ContainerType.Bank]: 100000,
  [ContainerType.Corpse]: 10000,
  [ContainerType.TreasureChest]: 5000,
  [ContainerType.Vehicle]: 5000,
  [ContainerType.Structure]: 100000,
  [ContainerType.Vendor]: 50000,
  [ContainerType.Trade]: 5000,
  [ContainerType.CraftingStation]: 2000,
  [ContainerType.ResourceContainer]: 100000, // Large for resource stacks
  [ContainerType.Equipment]: 10000,
  [ContainerType.Appearance]: 5000,
  [ContainerType.Droid]: 5000,
  [ContainerType.MissionBag]: 1000,
};

/**
 * Create a successful transfer result
 */
export function createSuccessResult(
  itemId: ObjectId,
  sourceContainerId: ObjectId,
  targetContainerId: ObjectId,
  slot?: string,
  previousSlot?: string
): TransferResult {
  return {
    success: true,
    code: TransferResultCode.Success,
    message: 'Transfer successful',
    itemId,
    sourceContainerId,
    targetContainerId,
    slot,
    previousSlot,
  };
}

/**
 * Create a failure transfer result
 */
export function createFailureResult(
  code: TransferResultCode,
  message: string,
  itemId?: ObjectId,
  sourceContainerId?: ObjectId,
  targetContainerId?: ObjectId
): TransferResult {
  return {
    success: false,
    code,
    message,
    itemId,
    sourceContainerId,
    targetContainerId,
  };
}

/**
 * Get human-readable name for a transfer result code
 */
export function getTransferResultMessage(code: TransferResultCode): string {
  switch (code) {
    case TransferResultCode.Success:
      return 'Transfer successful';
    case TransferResultCode.SourceNotFound:
      return 'Source container not found';
    case TransferResultCode.TargetNotFound:
      return 'Target container not found';
    case TransferResultCode.ItemNotFound:
      return 'Item not found in container';
    case TransferResultCode.TargetFull:
      return 'Target container is full';
    case TransferResultCode.VolumeExceeded:
      return 'Item is too large for the container';
    case TransferResultCode.SlotRestriction:
      return 'Item cannot be placed in that slot';
    case TransferResultCode.PermissionDenied:
      return 'You do not have permission to access this container';
    case TransferResultCode.ItemNotTransferable:
      return 'This item cannot be transferred';
    case TransferResultCode.SlotOccupied:
      return 'That slot is already occupied';
    case TransferResultCode.InvalidSlot:
      return 'Invalid slot specified';
    case TransferResultCode.TooHeavy:
      return 'Item is too heavy';
    case TransferResultCode.ContainerLocked:
      return 'Container is locked';
    case TransferResultCode.SameContainer:
      return 'Cannot transfer to the same container';
    case TransferResultCode.Failed:
    default:
      return 'Transfer failed';
  }
}
