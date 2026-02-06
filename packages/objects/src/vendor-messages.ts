/**
 * Vendor Network Messages
 * Message types for player vendor system communication between client and server
 *
 * Vendor System Message Flow:
 * 1. Client opens vendor -> VendorBrowseMessage
 * 2. Server responds with vendor inventory
 * 3. Client purchases item -> VendorBuyMessage
 * 4. Owner adds item -> VendorAddItemMessage
 * 5. Owner removes item -> VendorRemoveItemMessage
 * 6. Owner withdraws credits -> VendorWithdrawMessage
 * 7. Owner opens/closes vendor -> VendorStatusMessage
 */

import type { ObjectId } from '@swg/shared-types';
import type { VendorItem, VendorType, MaintenanceStatus } from './player-vendor.js';

/**
 * Vendor message operation types
 */
export enum VendorOperation {
  /** Browse vendor inventory */
  Browse = 0,
  /** Purchase item from vendor */
  Buy = 1,
  /** Owner adds item to vendor */
  AddItem = 2,
  /** Owner removes item from vendor */
  RemoveItem = 3,
  /** Owner withdraws credits */
  Withdraw = 4,
  /** Change vendor status (open/close) */
  Status = 5,
  /** Update item price */
  UpdatePrice = 6,
  /** Update vendor description */
  UpdateDescription = 7,
  /** Add maintenance credits */
  AddMaintenance = 8,
}

/**
 * Base interface for vendor messages
 */
interface BaseVendorMessage {
  /** Message operation type */
  operation: VendorOperation;
  /** Vendor object ID */
  vendorId: ObjectId;
  /** Player object ID */
  playerId: ObjectId;
  /** Timestamp of the message */
  timestamp: number;
}

// ============================================
// Browse Messages
// ============================================

/**
 * Client request to view vendor inventory
 */
export interface VendorBrowseMessage extends BaseVendorMessage {
  operation: VendorOperation.Browse;
  /** Optional page number for pagination */
  page?: number;
  /** Optional items per page */
  pageSize?: number;
  /** Optional sort field */
  sortBy?: 'price' | 'date' | 'name';
  /** Optional sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Create a vendor browse message
 */
export function createVendorBrowseMessage(
  playerId: ObjectId,
  vendorId: ObjectId,
  page?: number,
  pageSize?: number,
  sortBy?: 'price' | 'date' | 'name',
  sortOrder?: 'asc' | 'desc'
): VendorBrowseMessage {
  return {
    operation: VendorOperation.Browse,
    vendorId,
    playerId,
    timestamp: Date.now(),
    page,
    pageSize,
    sortBy,
    sortOrder,
  } as VendorBrowseMessage;
}

/**
 * Server response to browse request
 */
export interface VendorBrowseResponseMessage {
  operation: VendorOperation.Browse;
  vendorId: ObjectId;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Vendor display name */
  vendorName: string;
  /** Owner name */
  ownerName: string;
  /** Vendor description */
  description: string;
  /** Whether vendor is open */
  isOpen: boolean;
  /** Vendor type */
  vendorType: VendorType;
  /** Items for sale */
  items: VendorItem[];
  /** Total item count (for pagination) */
  totalItems: number;
  /** Current page */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Whether viewer is the owner */
  isOwner: boolean;
  /** Maintenance status (owner only) */
  maintenanceStatus?: MaintenanceStatus;
  /** Credit balance (owner only) */
  creditBalance?: bigint;
  timestamp: number;
}

/**
 * Create a vendor browse response
 */
export function createVendorBrowseResponse(
  playerId: ObjectId,
  vendorId: ObjectId,
  vendorName: string,
  ownerName: string,
  description: string,
  isOpen: boolean,
  vendorType: VendorType,
  items: VendorItem[],
  totalItems: number,
  page: number,
  pageSize: number,
  isOwner: boolean,
  maintenanceStatus?: MaintenanceStatus,
  creditBalance?: bigint,
  success: boolean = true,
  errorMessage?: string
): VendorBrowseResponseMessage {
  return {
    operation: VendorOperation.Browse,
    vendorId,
    playerId,
    success,
    errorMessage,
    vendorName,
    ownerName,
    description,
    isOpen,
    vendorType,
    items,
    totalItems,
    page,
    pageSize,
    isOwner,
    maintenanceStatus,
    creditBalance,
    timestamp: Date.now(),
  } as VendorBrowseResponseMessage;
}

// ============================================
// Buy Messages
// ============================================

/**
 * Client request to purchase item
 */
export interface VendorBuyMessage extends BaseVendorMessage {
  operation: VendorOperation.Buy;
  /** Item to purchase */
  itemId: ObjectId;
  /** Expected price (for validation) */
  expectedPrice: number;
}

/**
 * Create a vendor buy message
 */
export function createVendorBuyMessage(
  playerId: ObjectId,
  vendorId: ObjectId,
  itemId: ObjectId,
  expectedPrice: number
): VendorBuyMessage {
  return {
    operation: VendorOperation.Buy,
    vendorId,
    playerId,
    timestamp: Date.now(),
    itemId,
    expectedPrice,
  };
}

/**
 * Server response to buy request
 */
export interface VendorBuyResponseMessage {
  operation: VendorOperation.Buy;
  vendorId: ObjectId;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Item purchased (if successful) */
  itemId?: ObjectId;
  /** Price paid */
  pricePaid?: number;
  /** Buyer's new credit balance */
  newBalance?: number;
  timestamp: number;
}

/**
 * Create a vendor buy response
 */
export function createVendorBuyResponse(
  playerId: ObjectId,
  vendorId: ObjectId,
  itemId: ObjectId | undefined,
  pricePaid: number | undefined,
  newBalance: number | undefined,
  success: boolean = true,
  errorMessage?: string
): VendorBuyResponseMessage {
  return {
    operation: VendorOperation.Buy,
    vendorId,
    playerId,
    success,
    errorMessage,
    itemId,
    pricePaid,
    newBalance,
    timestamp: Date.now(),
  } as VendorBuyResponseMessage;
}

// ============================================
// Add Item Messages
// ============================================

/**
 * Owner request to add item to vendor
 */
export interface VendorAddItemMessage extends BaseVendorMessage {
  operation: VendorOperation.AddItem;
  /** Item to add */
  itemId: ObjectId;
  /** Sale price */
  price: number;
  /** Optional description */
  description?: string;
}

/**
 * Create a vendor add item message
 */
export function createVendorAddItemMessage(
  playerId: ObjectId,
  vendorId: ObjectId,
  itemId: ObjectId,
  price: number,
  description?: string
): VendorAddItemMessage {
  return {
    operation: VendorOperation.AddItem,
    vendorId,
    playerId,
    timestamp: Date.now(),
    itemId,
    price,
    description,
  } as VendorAddItemMessage;
}

/**
 * Server response to add item request
 */
export interface VendorAddItemResponseMessage {
  operation: VendorOperation.AddItem;
  vendorId: ObjectId;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Item added (if successful) */
  itemId?: ObjectId;
  /** New inventory count */
  inventoryCount?: number;
  /** Max inventory size */
  maxInventorySize?: number;
  timestamp: number;
}

/**
 * Create a vendor add item response
 */
export function createVendorAddItemResponse(
  playerId: ObjectId,
  vendorId: ObjectId,
  itemId: ObjectId | undefined,
  inventoryCount: number | undefined,
  maxInventorySize: number | undefined,
  success: boolean = true,
  errorMessage?: string
): VendorAddItemResponseMessage {
  return {
    operation: VendorOperation.AddItem,
    vendorId,
    playerId,
    success,
    errorMessage,
    itemId,
    inventoryCount,
    maxInventorySize,
    timestamp: Date.now(),
  } as VendorAddItemResponseMessage;
}

// ============================================
// Remove Item Messages
// ============================================

/**
 * Owner request to remove item from vendor
 */
export interface VendorRemoveItemMessage extends BaseVendorMessage {
  operation: VendorOperation.RemoveItem;
  /** Item to remove */
  itemId: ObjectId;
}

/**
 * Create a vendor remove item message
 */
export function createVendorRemoveItemMessage(
  playerId: ObjectId,
  vendorId: ObjectId,
  itemId: ObjectId
): VendorRemoveItemMessage {
  return {
    operation: VendorOperation.RemoveItem,
    vendorId,
    playerId,
    timestamp: Date.now(),
    itemId,
  };
}

/**
 * Server response to remove item request
 */
export interface VendorRemoveItemResponseMessage {
  operation: VendorOperation.RemoveItem;
  vendorId: ObjectId;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Item removed (if successful) */
  itemId?: ObjectId;
  /** New inventory count */
  inventoryCount?: number;
  timestamp: number;
}

/**
 * Create a vendor remove item response
 */
export function createVendorRemoveItemResponse(
  playerId: ObjectId,
  vendorId: ObjectId,
  itemId: ObjectId | undefined,
  inventoryCount: number | undefined,
  success: boolean = true,
  errorMessage?: string
): VendorRemoveItemResponseMessage {
  return {
    operation: VendorOperation.RemoveItem,
    vendorId,
    playerId,
    success,
    errorMessage,
    itemId,
    inventoryCount,
    timestamp: Date.now(),
  } as VendorRemoveItemResponseMessage;
}

// ============================================
// Withdraw Messages
// ============================================

/**
 * Owner request to withdraw credits
 */
export interface VendorWithdrawMessage extends BaseVendorMessage {
  operation: VendorOperation.Withdraw;
  /** Amount to withdraw (0 = all) */
  amount: bigint;
}

/**
 * Create a vendor withdraw message
 */
export function createVendorWithdrawMessage(
  playerId: ObjectId,
  vendorId: ObjectId,
  amount: bigint
): VendorWithdrawMessage {
  return {
    operation: VendorOperation.Withdraw,
    vendorId,
    playerId,
    timestamp: Date.now(),
    amount,
  };
}

/**
 * Server response to withdraw request
 */
export interface VendorWithdrawResponseMessage {
  operation: VendorOperation.Withdraw;
  vendorId: ObjectId;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Amount withdrawn */
  amountWithdrawn?: bigint;
  /** Remaining vendor balance */
  remainingBalance?: bigint;
  /** Player's new credit balance */
  playerBalance?: number;
  timestamp: number;
}

/**
 * Create a vendor withdraw response
 */
export function createVendorWithdrawResponse(
  playerId: ObjectId,
  vendorId: ObjectId,
  amountWithdrawn: bigint | undefined,
  remainingBalance: bigint | undefined,
  playerBalance: number | undefined,
  success: boolean = true,
  errorMessage?: string
): VendorWithdrawResponseMessage {
  return {
    operation: VendorOperation.Withdraw,
    vendorId,
    playerId,
    success,
    errorMessage,
    amountWithdrawn,
    remainingBalance,
    playerBalance,
    timestamp: Date.now(),
  } as VendorWithdrawResponseMessage;
}

// ============================================
// Status Messages
// ============================================

/**
 * Owner request to change vendor status
 */
export interface VendorStatusMessage extends BaseVendorMessage {
  operation: VendorOperation.Status;
  /** New open/closed status */
  isOpen: boolean;
  /** Optional new vendor name */
  vendorName?: string;
  /** Optional new description */
  description?: string;
  /** Optional search visibility */
  searchEnabled?: boolean;
}

/**
 * Create a vendor status message
 */
export function createVendorStatusMessage(
  playerId: ObjectId,
  vendorId: ObjectId,
  isOpen: boolean,
  vendorName?: string,
  description?: string,
  searchEnabled?: boolean
): VendorStatusMessage {
  return {
    operation: VendorOperation.Status,
    vendorId,
    playerId,
    timestamp: Date.now(),
    isOpen,
    vendorName,
    description,
    searchEnabled,
  } as VendorStatusMessage;
}

/**
 * Server response to status change
 */
export interface VendorStatusResponseMessage {
  operation: VendorOperation.Status;
  vendorId: ObjectId;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Current open status */
  isOpen?: boolean;
  /** Current vendor name */
  vendorName?: string;
  /** Current description */
  description?: string;
  /** Current search visibility */
  searchEnabled?: boolean;
  timestamp: number;
}

/**
 * Create a vendor status response
 */
export function createVendorStatusResponse(
  playerId: ObjectId,
  vendorId: ObjectId,
  isOpen: boolean | undefined,
  vendorName: string | undefined,
  description: string | undefined,
  searchEnabled: boolean | undefined,
  success: boolean = true,
  errorMessage?: string
): VendorStatusResponseMessage {
  return {
    operation: VendorOperation.Status,
    vendorId,
    playerId,
    success,
    errorMessage,
    isOpen,
    vendorName,
    description,
    searchEnabled,
    timestamp: Date.now(),
  } as VendorStatusResponseMessage;
}

// ============================================
// Update Price Messages
// ============================================

/**
 * Owner request to update item price
 */
export interface VendorUpdatePriceMessage extends BaseVendorMessage {
  operation: VendorOperation.UpdatePrice;
  /** Item to update */
  itemId: ObjectId;
  /** New price */
  newPrice: number;
}

/**
 * Create a vendor update price message
 */
export function createVendorUpdatePriceMessage(
  playerId: ObjectId,
  vendorId: ObjectId,
  itemId: ObjectId,
  newPrice: number
): VendorUpdatePriceMessage {
  return {
    operation: VendorOperation.UpdatePrice,
    vendorId,
    playerId,
    timestamp: Date.now(),
    itemId,
    newPrice,
  };
}

/**
 * Server response to price update
 */
export interface VendorUpdatePriceResponseMessage {
  operation: VendorOperation.UpdatePrice;
  vendorId: ObjectId;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Item updated */
  itemId?: ObjectId;
  /** New price */
  newPrice?: number;
  timestamp: number;
}

/**
 * Create a vendor update price response
 */
export function createVendorUpdatePriceResponse(
  playerId: ObjectId,
  vendorId: ObjectId,
  itemId: ObjectId | undefined,
  newPrice: number | undefined,
  success: boolean = true,
  errorMessage?: string
): VendorUpdatePriceResponseMessage {
  return {
    operation: VendorOperation.UpdatePrice,
    vendorId,
    playerId,
    success,
    errorMessage,
    itemId,
    newPrice,
    timestamp: Date.now(),
  } as VendorUpdatePriceResponseMessage;
}

// ============================================
// Add Maintenance Messages
// ============================================

/**
 * Owner request to add maintenance credits
 */
export interface VendorAddMaintenanceMessage extends BaseVendorMessage {
  operation: VendorOperation.AddMaintenance;
  /** Amount of credits to add */
  amount: number;
}

/**
 * Create a vendor add maintenance message
 */
export function createVendorAddMaintenanceMessage(
  playerId: ObjectId,
  vendorId: ObjectId,
  amount: number
): VendorAddMaintenanceMessage {
  return {
    operation: VendorOperation.AddMaintenance,
    vendorId,
    playerId,
    timestamp: Date.now(),
    amount,
  };
}

/**
 * Server response to add maintenance
 */
export interface VendorAddMaintenanceResponseMessage {
  operation: VendorOperation.AddMaintenance;
  vendorId: ObjectId;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Updated maintenance status */
  maintenanceStatus?: MaintenanceStatus;
  /** Player's new credit balance */
  playerBalance?: number;
  timestamp: number;
}

/**
 * Create a vendor add maintenance response
 */
export function createVendorAddMaintenanceResponse(
  playerId: ObjectId,
  vendorId: ObjectId,
  maintenanceStatus: MaintenanceStatus | undefined,
  playerBalance: number | undefined,
  success: boolean = true,
  errorMessage?: string
): VendorAddMaintenanceResponseMessage {
  return {
    operation: VendorOperation.AddMaintenance,
    vendorId,
    playerId,
    success,
    errorMessage,
    maintenanceStatus,
    playerBalance,
    timestamp: Date.now(),
  } as VendorAddMaintenanceResponseMessage;
}

// ============================================
// Union Types and Type Guards
// ============================================

/**
 * Union type of all vendor request messages
 */
export type AnyVendorRequestMessage =
  | VendorBrowseMessage
  | VendorBuyMessage
  | VendorAddItemMessage
  | VendorRemoveItemMessage
  | VendorWithdrawMessage
  | VendorStatusMessage
  | VendorUpdatePriceMessage
  | VendorAddMaintenanceMessage;

/**
 * Union type of all vendor response messages
 */
export type AnyVendorResponseMessage =
  | VendorBrowseResponseMessage
  | VendorBuyResponseMessage
  | VendorAddItemResponseMessage
  | VendorRemoveItemResponseMessage
  | VendorWithdrawResponseMessage
  | VendorStatusResponseMessage
  | VendorUpdatePriceResponseMessage
  | VendorAddMaintenanceResponseMessage;

/**
 * Check if message is a browse request
 */
export function isVendorBrowseMessage(msg: AnyVendorRequestMessage): msg is VendorBrowseMessage {
  return msg.operation === VendorOperation.Browse;
}

/**
 * Check if message is a buy request
 */
export function isVendorBuyMessage(msg: AnyVendorRequestMessage): msg is VendorBuyMessage {
  return msg.operation === VendorOperation.Buy;
}

/**
 * Check if message is an add item request
 */
export function isVendorAddItemMessage(msg: AnyVendorRequestMessage): msg is VendorAddItemMessage {
  return msg.operation === VendorOperation.AddItem;
}

/**
 * Check if message is a remove item request
 */
export function isVendorRemoveItemMessage(msg: AnyVendorRequestMessage): msg is VendorRemoveItemMessage {
  return msg.operation === VendorOperation.RemoveItem;
}

/**
 * Check if message is a withdraw request
 */
export function isVendorWithdrawMessage(msg: AnyVendorRequestMessage): msg is VendorWithdrawMessage {
  return msg.operation === VendorOperation.Withdraw;
}

/**
 * Check if message is a status change request
 */
export function isVendorStatusMessage(msg: AnyVendorRequestMessage): msg is VendorStatusMessage {
  return msg.operation === VendorOperation.Status;
}

/**
 * Check if message requires owner privileges
 */
export function requiresOwnerPrivilege(msg: AnyVendorRequestMessage): boolean {
  return (
    msg.operation === VendorOperation.AddItem ||
    msg.operation === VendorOperation.RemoveItem ||
    msg.operation === VendorOperation.Withdraw ||
    msg.operation === VendorOperation.Status ||
    msg.operation === VendorOperation.UpdatePrice ||
    msg.operation === VendorOperation.AddMaintenance
  );
}

/**
 * Message CRC values for network serialization
 */
export const VendorMessageCrc = {
  VENDOR_BROWSE_MESSAGE: 0x23456780,
  VENDOR_BROWSE_RESPONSE: 0x23456781,
  VENDOR_BUY_MESSAGE: 0x23456782,
  VENDOR_BUY_RESPONSE: 0x23456783,
  VENDOR_ADD_ITEM_MESSAGE: 0x23456784,
  VENDOR_ADD_ITEM_RESPONSE: 0x23456785,
  VENDOR_REMOVE_ITEM_MESSAGE: 0x23456786,
  VENDOR_REMOVE_ITEM_RESPONSE: 0x23456787,
  VENDOR_WITHDRAW_MESSAGE: 0x23456788,
  VENDOR_WITHDRAW_RESPONSE: 0x23456789,
  VENDOR_STATUS_MESSAGE: 0x2345678a,
  VENDOR_STATUS_RESPONSE: 0x2345678b,
  VENDOR_UPDATE_PRICE_MESSAGE: 0x2345678c,
  VENDOR_UPDATE_PRICE_RESPONSE: 0x2345678d,
  VENDOR_ADD_MAINTENANCE_MESSAGE: 0x2345678e,
  VENDOR_ADD_MAINTENANCE_RESPONSE: 0x2345678f,
} as const;
