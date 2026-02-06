/**
 * PlayerVendor - Player-owned vendor NPCs for selling items in shops
 * Extends TangibleObject with vendor-specific properties like inventory,
 * pricing, maintenance, and owner management.
 *
 * SWG vendor system features:
 * - Players can hire vendors to sell items in their shops
 * - Vendors have inventory limits based on quality
 * - Maintenance must be paid regularly or vendor goes inactive
 * - Credits from sales are held until owner withdrawal
 * - Vendors can be searched via the bazaar terminal if enabled
 *
 * Baseline Types:
 * - TANO3: Base tangible properties
 * - TANO6: Combat/defender data (inherited)
 * - Custom vendor properties tracked via delta system
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { TangibleObject } from './tangible-object.js';
import { ObjectType } from './scene-object.js';
import { DeltaTracker, DeltaType } from './deltas.js';

/**
 * Vendor type enumeration
 * Determines vendor appearance and some behavior
 */
export enum VendorType {
  /** Standard player vendor */
  Standard = 0,
  /** Junk dealer vendor (buys items from players) */
  Junk = 1,
  /** Bio-engineer vendor (for creature sales) */
  Bio = 2,
}

/**
 * Get display name for a vendor type
 */
export function getVendorTypeName(type: VendorType): string {
  switch (type) {
    case VendorType.Standard:
      return 'Vendor';
    case VendorType.Junk:
      return 'Junk Dealer';
    case VendorType.Bio:
      return 'Creature Vendor';
    default:
      return 'Unknown';
  }
}

/**
 * Item listed on a vendor
 */
export interface VendorItem {
  /** Object ID of the item for sale */
  itemId: ObjectId;
  /** Price in credits */
  price: number;
  /** Optional custom description */
  description?: string;
  /** When the item was listed */
  listedAt: Date;
}

/**
 * VNDR property indices for delta tracking
 */
export const VndrProperty = {
  VENDOR_ID: 0,
  OWNER_ID: 1,
  OWNER_NAME: 2,
  VENDOR_NAME: 3,
  VENDOR_TYPE: 4,
  HIRE_LOCATION: 5,
  INVENTORY: 6,
  MAX_INVENTORY_SIZE: 7,
  CREDITS: 8,
  MAINTENANCE_POOL: 9,
  MAINTENANCE_COST: 10,
  LAST_MAINTENANCE: 11,
  IS_OPEN: 12,
  DESCRIPTION: 13,
  SEARCH_ENABLED: 14,
} as const;

/**
 * Default inventory sizes based on vendor quality tier
 */
export const VENDOR_INVENTORY_SIZES = {
  basic: 25,
  standard: 50,
  premium: 100,
  elite: 200,
} as const;

/**
 * Default maintenance costs per day (in credits)
 */
export const VENDOR_MAINTENANCE_COSTS = {
  basic: 100,
  standard: 200,
  premium: 400,
  elite: 800,
} as const;

/**
 * Maintenance warning threshold in days
 */
export const MAINTENANCE_WARNING_DAYS = 7;

/**
 * Milliseconds per day for maintenance calculations
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Result of a vendor sale
 */
export interface VendorSaleResult {
  /** Whether the sale was successful */
  success: boolean;
  /** Error message if failed */
  errorMessage?: string;
  /** Price paid */
  price?: number;
  /** New vendor credit balance */
  newBalance?: bigint;
}

/**
 * Result of maintenance check
 */
export interface MaintenanceStatus {
  /** Whether vendor is operational */
  isOperational: boolean;
  /** Days until maintenance runs out (-1 if already inactive) */
  daysRemaining: number;
  /** Credits in maintenance pool */
  poolBalance: number;
  /** Daily maintenance cost */
  dailyCost: number;
  /** Whether low maintenance warning should be shown */
  showWarning: boolean;
}

/**
 * PlayerVendor - Vendor NPC for player shops
 */
export class PlayerVendor extends TangibleObject {
  // ============================================
  // Identity Properties
  // ============================================

  /** Unique vendor identifier */
  vendorId: ObjectId;

  /** Owner character ID */
  ownerId: ObjectId;

  /** Owner character name (cached for display) */
  ownerName: string;

  /** Custom vendor name */
  vendorName: string;

  /** Type of vendor */
  vendorType: VendorType;

  /** Structure cell ID where vendor is hired */
  hireLocation: ObjectId;

  // ============================================
  // Inventory Properties
  // ============================================

  /** Items currently for sale */
  inventory: Map<ObjectId, VendorItem>;

  /** Maximum number of items vendor can hold */
  maxInventorySize: number;

  // ============================================
  // Financial Properties
  // ============================================

  /** Credits held from sales (awaiting owner withdrawal) */
  credits: bigint;

  /** Credits in maintenance pool */
  maintenancePool: number;

  /** Maintenance cost per day */
  maintenanceCost: number;

  /** Last time maintenance was deducted */
  lastMaintenance: Date;

  // ============================================
  // Status Properties
  // ============================================

  /** Whether vendor is open for business */
  isOpen: boolean;

  /** Vendor description shown to customers */
  description: string;

  /** Whether vendor appears in bazaar searches */
  searchEnabled: boolean;

  // ============================================
  // Delta Tracking
  // ============================================

  /** Delta tracker for vendor properties */
  private deltaTrackerVndr: DeltaTracker;

  /**
   * Create a new PlayerVendor
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the object template
   */
  constructor(objectId: ObjectId, templateCrc: CrcValue = 0) {
    super(objectId, templateCrc);

    this.objectType = ObjectType.Tangible;

    // Initialize identity properties
    this.vendorId = objectId;
    this.ownerId = 0n;
    this.ownerName = '';
    this.vendorName = '';
    this.vendorType = VendorType.Standard;
    this.hireLocation = 0n;

    // Initialize inventory
    this.inventory = new Map();
    this.maxInventorySize = VENDOR_INVENTORY_SIZES.basic;

    // Initialize financials
    this.credits = 0n;
    this.maintenancePool = 0;
    this.maintenanceCost = VENDOR_MAINTENANCE_COSTS.basic;
    this.lastMaintenance = new Date();

    // Initialize status
    this.isOpen = false;
    this.description = '';
    this.searchEnabled = true;

    // Initialize delta tracker
    this.deltaTrackerVndr = new DeltaTracker();
  }

  /**
   * Get baseline type for vendor objects
   */
  override getBaselineType(): string {
    return 'VNDR';
  }

  // ============================================
  // Owner Management
  // ============================================

  /**
   * Set the vendor owner
   */
  setOwnerInfo(ownerId: ObjectId, ownerName: string): void {
    if (this.ownerId !== ownerId || this.ownerName !== ownerName) {
      this.ownerId = ownerId;
      this.ownerName = ownerName;
      this.deltaTrackerVndr.trackChange(VndrProperty.OWNER_ID, DeltaType.Change);
      this.deltaTrackerVndr.trackChange(VndrProperty.OWNER_NAME, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Check if a player is the owner
   */
  isOwner(playerId: ObjectId): boolean {
    return this.ownerId === playerId;
  }

  // ============================================
  // Vendor Name Management
  // ============================================

  /**
   * Set the vendor's custom name
   */
  setVendorName(name: string): void {
    if (this.vendorName !== name) {
      this.vendorName = name;
      this.setCustomName(name);
      this.deltaTrackerVndr.trackChange(VndrProperty.VENDOR_NAME, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Get the display name for this vendor
   */
  getDisplayVendorName(): string {
    return this.vendorName || `${this.ownerName}'s Vendor`;
  }

  // ============================================
  // Vendor Type Management
  // ============================================

  /**
   * Set the vendor type
   */
  setVendorType(type: VendorType): void {
    if (this.vendorType !== type) {
      this.vendorType = type;
      this.deltaTrackerVndr.trackChange(VndrProperty.VENDOR_TYPE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Get the vendor type display name
   */
  getVendorTypeName(): string {
    return getVendorTypeName(this.vendorType);
  }

  // ============================================
  // Location Management
  // ============================================

  /**
   * Set the hire location (structure cell)
   */
  setHireLocation(cellId: ObjectId): void {
    if (this.hireLocation !== cellId) {
      this.hireLocation = cellId;
      this.deltaTrackerVndr.trackChange(VndrProperty.HIRE_LOCATION, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Inventory Management
  // ============================================

  /**
   * Add an item for sale
   * @param itemId - Object ID of item to sell
   * @param price - Price in credits
   * @param description - Optional item description
   * @returns true if item was added, false if inventory full
   */
  addItem(itemId: ObjectId, price: number, description?: string): boolean {
    if (this.inventory.size >= this.maxInventorySize) {
      return false;
    }

    if (this.inventory.has(itemId)) {
      return false; // Item already listed
    }

    const vendorItem: VendorItem = {
      itemId,
      price: Math.max(1, Math.floor(price)),
      description,
      listedAt: new Date(),
    } as boolean;

    this.inventory.set(itemId, vendorItem);
    this.deltaTrackerVndr.trackChange(VndrProperty.INVENTORY, DeltaType.Add);
    this.markModified();
    return true;
  }

  /**
   * Remove an item from inventory
   * @param itemId - Object ID of item to remove
   * @returns The removed VendorItem or undefined if not found
   */
  removeItem(itemId: ObjectId): VendorItem | undefined {
    const item = this.inventory.get(itemId);
    if (item) {
      this.inventory.delete(itemId);
      this.deltaTrackerVndr.trackChange(VndrProperty.INVENTORY, DeltaType.Remove);
      this.markModified();
    }
    return item;
  }

  /**
   * Update the price of an item
   * @param itemId - Object ID of item
   * @param newPrice - New price in credits
   * @returns true if price was updated
   */
  updatePrice(itemId: ObjectId, newPrice: number): boolean {
    const item = this.inventory.get(itemId);
    if (!item) {
      return false;
    }

    item.price = Math.max(1, Math.floor(newPrice));
    this.deltaTrackerVndr.trackChange(VndrProperty.INVENTORY, DeltaType.Change);
    this.markModified();
    return true;
  }

  /**
   * Update item description
   */
  updateItemDescription(itemId: ObjectId, description: string): boolean {
    const item = this.inventory.get(itemId);
    if (!item) {
      return false;
    }

    item.description = description || undefined;
    this.deltaTrackerVndr.trackChange(VndrProperty.INVENTORY, DeltaType.Change);
    this.markModified();
    return true;
  }

  /**
   * Get an item by ID
   */
  getItem(itemId: ObjectId): VendorItem | undefined {
    return this.inventory.get(itemId);
  }

  /**
   * Check if vendor has an item
   */
  hasItem(itemId: ObjectId): boolean {
    return this.inventory.has(itemId);
  }

  /**
   * Get all items as array
   */
  getItems(): VendorItem[] {
    return Array.from(this.inventory.values());
  }

  /**
   * Get inventory count
   */
  getInventoryCount(): number {
    return this.inventory.size;
  }

  /**
   * Check if inventory is full
   */
  isInventoryFull(): boolean {
    return this.inventory.size >= this.maxInventorySize;
  }

  /**
   * Set maximum inventory size
   */
  setMaxInventorySize(size: number): void {
    const newSize = Math.max(1, size);
    if (this.maxInventorySize !== newSize) {
      this.maxInventorySize = newSize;
      this.deltaTrackerVndr.trackChange(VndrProperty.MAX_INVENTORY_SIZE, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Sales Processing
  // ============================================

  /**
   * Process a sale to a buyer
   * @param buyerId - Object ID of buyer
   * @param itemId - Object ID of item being purchased
   * @returns Sale result with success status and details
   */
  processSale(buyerId: ObjectId, itemId: ObjectId): VendorSaleResult {
    // Check if vendor is open
    if (!this.isOpen) {
      return {
        success: false,
        errorMessage: 'This vendor is currently closed.',
      };
    }

    // Check if vendor is operational (maintenance paid)
    if (!this.checkMaintenance().isOperational) {
      return {
        success: false,
        errorMessage: 'This vendor is out of maintenance funds.',
      };
    }

    // Get the item
    const item = this.inventory.get(itemId);
    if (!item) {
      return {
        success: false,
        errorMessage: 'Item not found on this vendor.',
      };
    }

    // Cannot buy own items
    if (buyerId === this.ownerId) {
      return {
        success: false,
        errorMessage: 'You cannot purchase your own items.',
      };
    }

    // Remove item from inventory
    this.inventory.delete(itemId);

    // Add credits to vendor balance
    this.credits += BigInt(item.price);
    this.deltaTrackerVndr.trackChange(VndrProperty.CREDITS, DeltaType.Change);
    this.deltaTrackerVndr.trackChange(VndrProperty.INVENTORY, DeltaType.Remove);
    this.markModified();

    return {
      success: true,
      price: item.price,
      newBalance: this.credits,
    };
  }

  // ============================================
  // Credit Management
  // ============================================

  /**
   * Get current credit balance
   */
  getCredits(): bigint {
    return this.credits;
  }

  /**
   * Withdraw credits to owner
   * @param amount - Amount to withdraw
   * @returns Amount actually withdrawn
   */
  withdrawCredits(amount: bigint): bigint {
    if (amount <= 0n) {
      return 0n;
    }

    const toWithdraw = amount > this.credits ? this.credits : amount;
    this.credits -= toWithdraw;
    this.deltaTrackerVndr.trackChange(VndrProperty.CREDITS, DeltaType.Change);
    this.markModified();
    return toWithdraw;
  }

  /**
   * Withdraw all credits
   */
  withdrawAllCredits(): bigint {
    return this.withdrawCredits(this.credits);
  }

  // ============================================
  // Maintenance Management
  // ============================================

  /**
   * Add credits to maintenance pool
   */
  addMaintenance(amount: number): void {
    if (amount > 0) {
      this.maintenancePool += amount;
      this.deltaTrackerVndr.trackChange(VndrProperty.MAINTENANCE_POOL, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set maintenance cost per day
   */
  setMaintenanceCost(cost: number): void {
    const newCost = Math.max(0, cost);
    if (this.maintenanceCost !== newCost) {
      this.maintenanceCost = newCost;
      this.deltaTrackerVndr.trackChange(VndrProperty.MAINTENANCE_COST, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Pay maintenance for elapsed time
   * Call this periodically (e.g., daily or on vendor access)
   */
  payMaintenance(): void {
    const now = new Date();
    const elapsed = now.getTime() - this.lastMaintenance.getTime();
    const daysPassed = elapsed / MS_PER_DAY;

    if (daysPassed >= 1) {
      const cost = Math.floor(daysPassed * this.maintenanceCost);
      this.maintenancePool = Math.max(0, this.maintenancePool - cost);
      this.lastMaintenance = now;
      this.deltaTrackerVndr.trackChange(VndrProperty.MAINTENANCE_POOL, DeltaType.Change);
      this.deltaTrackerVndr.trackChange(VndrProperty.LAST_MAINTENANCE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Check maintenance status
   * @returns Maintenance status information
   */
  checkMaintenance(): MaintenanceStatus {
    // First, process any pending maintenance
    this.payMaintenance();

    const daysRemaining = this.maintenanceCost > 0
      ? this.maintenancePool / this.maintenanceCost
      : Infinity;

    const isOperational = this.maintenancePool > 0 || this.maintenanceCost === 0;
    const showWarning = daysRemaining <= MAINTENANCE_WARNING_DAYS && daysRemaining > 0;

    return {
      isOperational,
      daysRemaining: isOperational ? daysRemaining : -1,
      poolBalance: this.maintenancePool,
      dailyCost: this.maintenanceCost,
      showWarning,
    };
  }

  /**
   * Check if vendor is operational
   */
  isOperational(): boolean {
    return this.checkMaintenance().isOperational;
  }

  // ============================================
  // Status Management
  // ============================================

  /**
   * Open the vendor for business
   */
  open(): boolean {
    if (!this.isOperational()) {
      return false; // Cannot open without maintenance
    }

    if (!this.isOpen) {
      this.isOpen = true;
      this.deltaTrackerVndr.trackChange(VndrProperty.IS_OPEN, DeltaType.Change);
      this.markModified();
    }
    return true;
  }

  /**
   * Close the vendor
   */
  close(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.deltaTrackerVndr.trackChange(VndrProperty.IS_OPEN, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Toggle vendor open/closed status
   */
  toggleOpen(): boolean {
    if (this.isOpen) {
      this.close();
      return false;
    } else {
      return this.open();
    }
  }

  /**
   * Set vendor description
   */
  setDescription(description: string): void {
    if (this.description !== description) {
      this.description = description;
      this.deltaTrackerVndr.trackChange(VndrProperty.DESCRIPTION, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set whether vendor appears in bazaar searches
   */
  setSearchEnabled(enabled: boolean): void {
    if (this.searchEnabled !== enabled) {
      this.searchEnabled = enabled;
      this.deltaTrackerVndr.trackChange(VndrProperty.SEARCH_ENABLED, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Search / Query
  // ============================================

  /**
   * Search inventory by item description
   */
  searchItems(query: string): VendorItem[] {
    const lowerQuery = query.toLowerCase();
    return this.getItems().filter(item =>
      item.description?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get items sorted by price (ascending)
   */
  getItemsByPrice(): VendorItem[] {
    return this.getItems().sort((a, b) => a.price - b.price);
  }

  /**
   * Get items sorted by listing date (newest first)
   */
  getItemsByDate(): VendorItem[] {
    return this.getItems().sort((a, b) => b.listedAt.getTime() - a.listedAt.getTime());
  }

  // ============================================
  // Delta Management
  // ============================================

  /**
   * Check if vendor properties have changes
   */
  hasVndrChanges(): boolean {
    return this.deltaTrackerVndr.hasChanges();
  }

  /**
   * Get the vendor delta tracker
   */
  getVndrDeltaTracker(): DeltaTracker {
    return this.deltaTrackerVndr;
  }

  /**
   * Clear all delta trackers
   */
  clearAllDeltas(): void {
    this.clearDirtyFlags();
    this.deltaTrackerVndr.clear();
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Clone vendor properties to another PlayerVendor
   */
  copyVendorPropertiesTo(target: PlayerVendor): void {
    // Copy TangibleObject properties
    this.copyPropertiesTo(target);

    // Copy vendor-specific properties
    target.vendorId = this.vendorId;
    target.ownerId = this.ownerId;
    target.ownerName = this.ownerName;
    target.vendorName = this.vendorName;
    target.vendorType = this.vendorType;
    target.hireLocation = this.hireLocation;
    target.maxInventorySize = this.maxInventorySize;
    target.credits = this.credits;
    target.maintenancePool = this.maintenancePool;
    target.maintenanceCost = this.maintenanceCost;
    target.lastMaintenance = new Date(this.lastMaintenance);
    target.isOpen = this.isOpen;
    target.description = this.description;
    target.searchEnabled = this.searchEnabled;

    // Copy inventory (deep copy)
    target.inventory = new Map();
    for (const [itemId, item] of this.inventory) {
      target.inventory.set(itemId, {
        itemId: item.itemId,
        price: item.price,
        description: item.description,
        listedAt: new Date(item.listedAt),
      });
    }
  }

  /**
   * Serialize to JSON for debugging/persistence
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      vendorId: this.vendorId.toString(),
      ownerId: this.ownerId.toString(),
      ownerName: this.ownerName,
      vendorName: this.vendorName,
      vendorType: this.vendorType,
      vendorTypeName: this.getVendorTypeName(),
      hireLocation: this.hireLocation.toString(),
      inventoryCount: this.inventory.size,
      maxInventorySize: this.maxInventorySize,
      credits: this.credits.toString(),
      maintenancePool: this.maintenancePool,
      maintenanceCost: this.maintenanceCost,
      lastMaintenance: this.lastMaintenance.toISOString(),
      isOpen: this.isOpen,
      description: this.description,
      searchEnabled: this.searchEnabled,
      inventory: Array.from(this.inventory.entries()).map(([id, item]) => ({
        itemId: id.toString(),
        price: item.price,
        description: item.description,
        listedAt: item.listedAt.toISOString(),
      })),
    };
  }
}
