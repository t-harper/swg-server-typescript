/**
 * Vendor Manager Service
 * Manages player vendor lifecycle, inventory tracking, maintenance processing,
 * and vendor search functionality.
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  PlayerVendor,
  VendorType,
  VendorItem,
  MaintenanceStatus,
  generateObjectId,
  VENDOR_INVENTORY_SIZES,
  VENDOR_MAINTENANCE_COSTS,
} from '@swg/objects';

/**
 * Vendor search filters
 */
export interface VendorSearchFilters {
  /** Search vendor name */
  vendorName?: string;
  /** Search item descriptions */
  itemDescription?: string;
  /** Filter by owner name */
  ownerName?: string;
  /** Filter by vendor type */
  vendorType?: VendorType;
  /** Filter by region/planet */
  regionId?: string;
  /** Only show open vendors */
  openOnly?: boolean;
  /** Maximum results */
  limit?: number;
  /** Skip first N results */
  offset?: number;
}

/**
 * Vendor search result
 */
export interface VendorSearchResult {
  /** Vendor object ID */
  vendorId: ObjectId;
  /** Vendor name */
  vendorName: string;
  /** Owner name */
  ownerName: string;
  /** Vendor type */
  vendorType: VendorType;
  /** Region/planet ID */
  regionId: string;
  /** Number of items for sale */
  itemCount: number;
  /** Whether vendor is open */
  isOpen: boolean;
  /** Location coordinates */
  position: Vector3;
}

/**
 * Vendor registration data
 */
export interface VendorRegistration {
  /** Vendor object */
  vendor: PlayerVendor;
  /** Region/planet ID */
  regionId: string;
  /** Structure ID containing vendor */
  structureId: ObjectId;
  /** Registration timestamp */
  registeredAt: Date;
}

/**
 * Vendor creation options
 */
export interface VendorCreationOptions {
  /** Vendor type */
  vendorType?: VendorType;
  /** Initial vendor name */
  vendorName?: string;
  /** Initial description */
  description?: string;
  /** Quality tier (basic, standard, premium, elite) */
  quality?: keyof typeof VENDOR_INVENTORY_SIZES;
  /** Initial maintenance credits */
  initialMaintenance?: number;
}

/**
 * Maintenance tick result
 */
export interface MaintenanceTickResult {
  /** Number of vendors processed */
  vendorsProcessed: number;
  /** Number of vendors that became inactive */
  vendorsDeactivated: number;
  /** Number of vendors with warnings */
  vendorsWithWarnings: number;
}

/**
 * Vendor sale notification
 */
export interface VendorSaleNotification {
  /** Vendor that made the sale */
  vendorId: ObjectId;
  /** Owner to notify */
  ownerId: ObjectId;
  /** Item sold */
  itemId: ObjectId;
  /** Buyer ID */
  buyerId: ObjectId;
  /** Sale price */
  price: number;
  /** New vendor balance */
  newBalance: bigint;
  /** Timestamp */
  timestamp: number;
}

/**
 * Callback for vendor sale notifications
 */
export type VendorSaleCallback = (notification: VendorSaleNotification) => void;

/**
 * Callback for vendor status changes
 */
export type VendorStatusCallback = (vendorId: ObjectId, isOperational: boolean) => void;

/**
 * Vendor manager options
 */
export interface VendorManagerOptions {
  /** Maintenance tick interval in milliseconds (default: 1 hour) */
  maintenanceTickInterval?: number;
  /** Enable automatic maintenance ticking */
  enableAutoTick?: boolean;
  /** Maximum vendors per owner */
  maxVendorsPerOwner?: number;
  /** Maximum search results */
  maxSearchResults?: number;
}

/**
 * Vendor Manager Service
 * Central service for managing all player vendors
 */
export class VendorManager {
  /** All registered vendors by ID */
  private readonly vendors: Map<ObjectId, VendorRegistration>;

  /** Vendors indexed by owner */
  private readonly vendorsByOwner: Map<ObjectId, Set<ObjectId>>;

  /** Vendors indexed by region */
  private readonly vendorsByRegion: Map<string, Set<ObjectId>>;

  /** Configuration options */
  private readonly options: Required<VendorManagerOptions>;

  /** Maintenance tick timer */
  private maintenanceTimer: ReturnType<typeof setInterval> | undefined;

  /** Sale notification callbacks */
  private readonly saleCallbacks: Set<VendorSaleCallback>;

  /** Status change callbacks */
  private readonly statusCallbacks: Set<VendorStatusCallback>;

  /** Initialization flag */
  private initialized: boolean = false;

  constructor(options: VendorManagerOptions = {}) {
    this.vendors = new Map();
    this.vendorsByOwner = new Map();
    this.vendorsByRegion = new Map();
    this.saleCallbacks = new Set();
    this.statusCallbacks = new Set();

    this.options = {
      maintenanceTickInterval: options.maintenanceTickInterval ?? 60 * 60 * 1000, // 1 hour
      enableAutoTick: options.enableAutoTick ?? true,
      maxVendorsPerOwner: options.maxVendorsPerOwner ?? 10,
      maxSearchResults: options.maxSearchResults ?? 100,
    };
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the vendor manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[VendorManager] Initializing...');

    if (this.options.enableAutoTick) {
      this.startMaintenanceTicking();
    }

    this.initialized = true;
    console.log('[VendorManager] Initialized');
  }

  /**
   * Shutdown the vendor manager
   */
  async shutdown(): Promise<void> {
    console.log('[VendorManager] Shutting down...');

    this.stopMaintenanceTicking();

    this.vendors.clear();
    this.vendorsByOwner.clear();
    this.vendorsByRegion.clear();
    this.saleCallbacks.clear();
    this.statusCallbacks.clear();
    this.initialized = false;

    console.log('[VendorManager] Shutdown complete');
  }

  // ============================================
  // Vendor Registration
  // ============================================

  /**
   * Create and register a new vendor
   */
  createVendor(
    ownerId: ObjectId,
    ownerName: string,
    regionId: string,
    structureId: ObjectId,
    cellId: ObjectId,
    position: Vector3,
    options: VendorCreationOptions = {}
  ): PlayerVendor | null {
    // Check owner limit
    const ownerVendors = this.vendorsByOwner.get(ownerId);
    if (ownerVendors && ownerVendors.size >= this.options.maxVendorsPerOwner) {
      console.warn(`[VendorManager] Owner ${ownerId} has reached max vendor limit`);
      return null;
    }

    // Generate vendor ID and create vendor
    const vendorId = generateObjectId();
    const vendor = new PlayerVendor(vendorId, 0);

    // Configure vendor
    vendor.setOwnerInfo(ownerId, ownerName);
    vendor.setVendorType(options.vendorType ?? VendorType.Standard);
    vendor.setHireLocation(cellId);
    vendor.setPosition(position.x, position.y, position.z);

    if (options.vendorName) {
      vendor.setVendorName(options.vendorName);
    }
    if (options.description) {
      vendor.setDescription(options.description);
    }

    // Set quality-based properties
    const quality = options.quality ?? 'basic';
    vendor.setMaxInventorySize(VENDOR_INVENTORY_SIZES[quality]);
    vendor.setMaintenanceCost(VENDOR_MAINTENANCE_COSTS[quality]);

    // Add initial maintenance
    if (options.initialMaintenance) {
      vendor.addMaintenance(options.initialMaintenance);
    }

    // Register vendor
    this.registerVendor(vendor, regionId, structureId);

    console.log(
      `[VendorManager] Created vendor ${vendorId} for owner ${ownerName} in region ${regionId}`
    );

    return vendor;
  }

  /**
   * Register an existing vendor
   */
  registerVendor(vendor: PlayerVendor, regionId: string, structureId: ObjectId): void {
    const registration: VendorRegistration = {
      vendor,
      regionId,
      structureId,
      registeredAt: new Date(),
    };

    // Add to main registry
    this.vendors.set(vendor.vendorId, registration);

    // Add to owner index
    if (!this.vendorsByOwner.has(vendor.ownerId)) {
      this.vendorsByOwner.set(vendor.ownerId, new Set());
    }
    this.vendorsByOwner.get(vendor.ownerId)!.add(vendor.vendorId);

    // Add to region index
    if (!this.vendorsByRegion.has(regionId)) {
      this.vendorsByRegion.set(regionId, new Set());
    }
    this.vendorsByRegion.get(regionId)!.add(vendor.vendorId);

    console.log(`[VendorManager] Registered vendor ${vendor.vendorId}`);
  }

  /**
   * Unregister a vendor
   */
  unregisterVendor(vendorId: ObjectId): boolean {
    const registration = this.vendors.get(vendorId);
    if (!registration) {
      return false;
    }

    const { vendor, regionId } = registration;

    // Remove from owner index
    const ownerVendors = this.vendorsByOwner.get(vendor.ownerId);
    if (ownerVendors) {
      ownerVendors.delete(vendorId);
      if (ownerVendors.size === 0) {
        this.vendorsByOwner.delete(vendor.ownerId);
      }
    }

    // Remove from region index
    const regionVendors = this.vendorsByRegion.get(regionId);
    if (regionVendors) {
      regionVendors.delete(vendorId);
      if (regionVendors.size === 0) {
        this.vendorsByRegion.delete(regionId);
      }
    }

    // Remove from main registry
    this.vendors.delete(vendorId);

    console.log(`[VendorManager] Unregistered vendor ${vendorId}`);
    return true;
  }

  // ============================================
  // Vendor Queries
  // ============================================

  /**
   * Get a vendor by ID
   */
  getVendor(vendorId: ObjectId): PlayerVendor | undefined {
    return this.vendors.get(vendorId)?.vendor;
  }

  /**
   * Get vendor registration info
   */
  getVendorRegistration(vendorId: ObjectId): VendorRegistration | undefined {
    return this.vendors.get(vendorId);
  }

  /**
   * Get all vendors owned by a player
   */
  getVendorsByOwner(ownerId: ObjectId): PlayerVendor[] {
    const vendorIds = this.vendorsByOwner.get(ownerId);
    if (!vendorIds) {
      return [];
    }

    const result: PlayerVendor[] = [];
    for (const vendorId of vendorIds) {
      const registration = this.vendors.get(vendorId);
      if (registration) {
        result.push(registration.vendor);
      }
    }
    return result;
  }

  /**
   * Get all vendors in a region
   */
  getVendorsByRegion(regionId: string): PlayerVendor[] {
    const vendorIds = this.vendorsByRegion.get(regionId);
    if (!vendorIds) {
      return [];
    }

    const result: PlayerVendor[] = [];
    for (const vendorId of vendorIds) {
      const registration = this.vendors.get(vendorId);
      if (registration) {
        result.push(registration.vendor);
      }
    }
    return result;
  }

  /**
   * Check if a player owns a specific vendor
   */
  isVendorOwner(vendorId: ObjectId, playerId: ObjectId): boolean {
    const vendor = this.getVendor(vendorId);
    return vendor?.isOwner(playerId) ?? false;
  }

  /**
   * Get vendor count for an owner
   */
  getVendorCountForOwner(ownerId: ObjectId): number {
    return this.vendorsByOwner.get(ownerId)?.size ?? 0;
  }

  // ============================================
  // Vendor Search
  // ============================================

  /**
   * Search for vendors matching criteria
   */
  searchVendors(filters: VendorSearchFilters = {}): VendorSearchResult[] {
    const results: VendorSearchResult[] = [];
    const limit = Math.min(filters.limit ?? this.options.maxSearchResults, this.options.maxSearchResults);
    const offset = filters.offset ?? 0;

    let count = 0;
    let skipped = 0;

    for (const [vendorId, registration] of this.vendors) {
      const { vendor, regionId } = registration;

      // Skip vendors not enabled for search (unless searching by owner)
      if (!vendor.searchEnabled && !filters.ownerName) {
        continue;
      }

      // Filter: open only
      if (filters.openOnly && !vendor.isOpen) {
        continue;
      }

      // Filter: region
      if (filters.regionId && regionId !== filters.regionId) {
        continue;
      }

      // Filter: vendor type
      if (filters.vendorType !== undefined && vendor.vendorType !== filters.vendorType) {
        continue;
      }

      // Filter: vendor name
      if (filters.vendorName) {
        const searchName = filters.vendorName.toLowerCase();
        if (!vendor.vendorName.toLowerCase().includes(searchName)) {
          continue;
        }
      }

      // Filter: owner name
      if (filters.ownerName) {
        const searchOwner = filters.ownerName.toLowerCase();
        if (!vendor.ownerName.toLowerCase().includes(searchOwner)) {
          continue;
        }
      }

      // Filter: item description (search in any item)
      if (filters.itemDescription) {
        const searchDesc = filters.itemDescription.toLowerCase();
        let hasMatch = false;
        for (const item of vendor.inventory.values()) {
          if (item.description?.toLowerCase().includes(searchDesc)) {
            hasMatch = true;
            break;
          }
        }
        if (!hasMatch) {
          continue;
        }
      }

      // Handle pagination
      if (skipped < offset) {
        skipped++;
        continue;
      }

      if (count >= limit) {
        break;
      }

      results.push({
        vendorId,
        vendorName: vendor.getDisplayVendorName(),
        ownerName: vendor.ownerName,
        vendorType: vendor.vendorType,
        regionId,
        itemCount: vendor.getInventoryCount(),
        isOpen: vendor.isOpen,
        position: { ...vendor.position },
      });

      count++;
    }

    return results;
  }

  /**
   * Search for items across all vendors
   */
  searchVendorItems(
    query: string,
    regionId?: string,
    maxResults: number = 100
  ): Array<{ vendor: VendorSearchResult; item: VendorItem }> {
    const results: Array<{ vendor: VendorSearchResult; item: VendorItem }> = [];
    const lowerQuery = query.toLowerCase();

    for (const [vendorId, registration] of this.vendors) {
      const { vendor, regionId: vRegion } = registration;

      // Skip closed or non-searchable vendors
      if (!vendor.isOpen || !vendor.searchEnabled) {
        continue;
      }

      // Filter by region if specified
      if (regionId && vRegion !== regionId) {
        continue;
      }

      // Search items
      for (const item of vendor.inventory.values()) {
        if (item.description?.toLowerCase().includes(lowerQuery)) {
          results.push({
            vendor: {
              vendorId,
              vendorName: vendor.getDisplayVendorName(),
              ownerName: vendor.ownerName,
              vendorType: vendor.vendorType,
              regionId: vRegion,
              itemCount: vendor.getInventoryCount(),
              isOpen: vendor.isOpen,
              position: { ...vendor.position },
            },
            item,
          });

          if (results.length >= maxResults) {
            return results;
          }
        }
      }
    }

    return results;
  }

  // ============================================
  // Maintenance Processing
  // ============================================

  /**
   * Start automatic maintenance ticking
   */
  startMaintenanceTicking(): void {
    if (this.maintenanceTimer) {
      return;
    }

    this.maintenanceTimer = setInterval(() => {
      this.processMaintenanceTick();
    }, this.options.maintenanceTickInterval);

    console.log(
      `[VendorManager] Started maintenance ticking (interval: ${this.options.maintenanceTickInterval}ms)`
    );
  }

  /**
   * Stop automatic maintenance ticking
   */
  stopMaintenanceTicking(): void {
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
      this.maintenanceTimer = undefined;
      console.log('[VendorManager] Stopped maintenance ticking');
    }
  }

  /**
   * Process maintenance for all vendors
   */
  processMaintenanceTick(): MaintenanceTickResult {
    let vendorsProcessed = 0;
    let vendorsDeactivated = 0;
    let vendorsWithWarnings = 0;

    for (const [vendorId, registration] of this.vendors) {
      const { vendor } = registration;
      const wasOperational = vendor.isOperational();

      // Process maintenance payment
      vendor.payMaintenance();
      vendorsProcessed++;

      const status = vendor.checkMaintenance();

      // Check if vendor became inactive
      if (wasOperational && !status.isOperational) {
        vendor.close();
        vendorsDeactivated++;
        this.emitStatusChange(vendorId, false);
        console.log(`[VendorManager] Vendor ${vendorId} became inactive due to maintenance`);
      }

      // Check for low maintenance warning
      if (status.showWarning) {
        vendorsWithWarnings++;
      }
    }

    if (vendorsDeactivated > 0) {
      console.log(
        `[VendorManager] Maintenance tick: ${vendorsProcessed} processed, ` +
        `${vendorsDeactivated} deactivated, ${vendorsWithWarnings} warnings`
      );
    }

    return {
      vendorsProcessed,
      vendorsDeactivated,
      vendorsWithWarnings,
    };
  }

  /**
   * Get vendors needing maintenance (owner notification)
   */
  getVendorsNeedingMaintenance(ownerId: ObjectId): Array<{ vendor: PlayerVendor; status: MaintenanceStatus }> {
    const vendors = this.getVendorsByOwner(ownerId);
    const needingMaintenance: Array<{ vendor: PlayerVendor; status: MaintenanceStatus }> = [];

    for (const vendor of vendors) {
      const status = vendor.checkMaintenance();
      if (status.showWarning || !status.isOperational) {
        needingMaintenance.push({ vendor, status });
      }
    }

    return needingMaintenance;
  }

  // ============================================
  // Sale Processing
  // ============================================

  /**
   * Process a sale and emit notification
   */
  processSale(
    vendorId: ObjectId,
    buyerId: ObjectId,
    itemId: ObjectId
  ): { success: boolean; errorMessage?: string; price?: number } {
    const vendor = this.getVendor(vendorId);
    if (!vendor) {
      return { success: false, errorMessage: 'Vendor not found' };
    }

    const item = vendor.getItem(itemId);
    if (!item) {
      return { success: false, errorMessage: 'Item not found' };
    }

    const result = vendor.processSale(buyerId, itemId);

    if (result.success) {
      // Emit sale notification
      const notification: VendorSaleNotification = {
        vendorId,
        ownerId: vendor.ownerId,
        itemId,
        buyerId,
        price: result.price!,
        newBalance: result.newBalance!,
        timestamp: Date.now(),
      };
      this.emitSaleNotification(notification);
    }

    return result;
  }

  // ============================================
  // Event Callbacks
  // ============================================

  /**
   * Register callback for sale notifications
   */
  onSale(callback: VendorSaleCallback): void {
    this.saleCallbacks.add(callback);
  }

  /**
   * Unregister sale callback
   */
  offSale(callback: VendorSaleCallback): void {
    this.saleCallbacks.delete(callback);
  }

  /**
   * Register callback for status changes
   */
  onStatusChange(callback: VendorStatusCallback): void {
    this.statusCallbacks.add(callback);
  }

  /**
   * Unregister status callback
   */
  offStatusChange(callback: VendorStatusCallback): void {
    this.statusCallbacks.delete(callback);
  }

  /**
   * Emit sale notification to all callbacks
   */
  private emitSaleNotification(notification: VendorSaleNotification): void {
    for (const callback of this.saleCallbacks) {
      try {
        callback(notification);
      } catch (error) {
        console.error('[VendorManager] Error in sale callback:', error);
      }
    }
  }

  /**
   * Emit status change to all callbacks
   */
  private emitStatusChange(vendorId: ObjectId, isOperational: boolean): void {
    for (const callback of this.statusCallbacks) {
      try {
        callback(vendorId, isOperational);
      } catch (error) {
        console.error('[VendorManager] Error in status callback:', error);
      }
    }
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get vendor manager statistics
   */
  getStats(): {
    totalVendors: number;
    activeVendors: number;
    vendorsByRegion: Map<string, number>;
    totalItems: number;
    totalCreditsHeld: bigint;
  } {
    const vendorsByRegion = new Map<string, number>();
    let activeVendors = 0;
    let totalItems = 0;
    let totalCreditsHeld = 0n;

    for (const [, registration] of this.vendors) {
      const { vendor, regionId } = registration;

      // Count by region
      vendorsByRegion.set(regionId, (vendorsByRegion.get(regionId) ?? 0) + 1);

      // Count active
      if (vendor.isOpen && vendor.isOperational()) {
        activeVendors++;
      }

      // Count items and credits
      totalItems += vendor.getInventoryCount();
      totalCreditsHeld += vendor.credits;
    }

    return {
      totalVendors: this.vendors.size,
      activeVendors,
      vendorsByRegion,
      totalItems,
      totalCreditsHeld,
    };
  }
}

/**
 * Create a new VendorManager instance
 */
export function createVendorManager(options?: VendorManagerOptions): VendorManager {
  return new VendorManager(options);
}

/**
 * Singleton instance for global access
 */
let globalVendorManager: VendorManager | null = null;

/**
 * Get or create the global vendor manager instance
 */
export function getVendorManager(options?: VendorManagerOptions): VendorManager {
  if (!globalVendorManager) {
    globalVendorManager = new VendorManager(options);
  }
  return globalVendorManager;
}
