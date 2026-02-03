/**
 * FactoryObject - Manufacturing installation for mass production of crafted items
 *
 * Factories in SWG are placeable installations that allow crafters to mass-produce
 * items from factory schematics. They automatically consume ingredients from an
 * input hopper and produce identical items into an output hopper.
 *
 * Key Features:
 * - Input hopper for ingredients (resources, components)
 * - Output hopper for completed items
 * - Factory schematic system for locked attributes
 * - Manufacturing time based on item complexity
 * - Power and maintenance requirements
 * - Crate stacking for output items
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { TangibleObject } from './tangible-object.js';
import { ObjectType } from './scene-object.js';
import { DeltaTracker, DeltaType } from './deltas.js';

/**
 * Factory type enumeration
 * Each factory type can only produce items of matching categories
 */
export enum FactoryType {
  /** Weapon factory - produces weapons */
  Weapon = 0,
  /** Armor factory - produces armor pieces */
  Armor = 1,
  /** Clothing factory - produces clothing */
  Clothing = 2,
  /** Food factory - produces food and drinks */
  Food = 3,
  /** Structure factory - produces structure deeds */
  Structure = 4,
  /** Droid factory - produces droids and droid modules */
  Droid = 5,
  /** Generic factory - produces miscellaneous items */
  Generic = 6,
  /** Furniture factory - produces furniture */
  Furniture = 7,
  /** Component factory - produces crafting components */
  Component = 8,
  /** Chemical factory - produces chemicals and medicines */
  Chemical = 9,
  /** Electronics factory - produces electronics */
  Electronics = 10,
}

/**
 * Factory state enumeration
 */
export enum FactoryState {
  /** Factory is idle (not running) */
  Idle = 0,
  /** Factory is currently manufacturing */
  Running = 1,
  /** Factory is paused (out of power/maintenance) */
  Paused = 2,
  /** Factory is waiting for ingredients */
  WaitingForIngredients = 3,
  /** Output hopper is full */
  OutputFull = 4,
}

/**
 * FCTY property indices for delta tracking
 * Factory-specific property indices
 */
export const FctyProperty = {
  // FCTY3 (shared) properties
  FACTORY_TYPE: 0,
  OWNER_ID: 1,
  ACTIVE_SCHEMATIC_ID: 2,
  IS_RUNNING: 3,
  MANUFACTURE_COUNT: 4,
  ITEMS_COMPLETED: 5,
  MANUFACTURING_PROGRESS: 6,
  MANUFACTURING_TIME: 7,
  INPUT_HOPPER_COUNT: 8,
  OUTPUT_HOPPER_COUNT: 9,
  // FCTY6 (server) properties
  MAINTENANCE_POOL: 0,
  POWER_POOL: 1,
  LAST_UPDATE_TIME: 2,
} as const;

/**
 * Factory configuration constants
 */
export const FACTORY_DEFAULTS = {
  /** Default input hopper capacity */
  INPUT_HOPPER_CAPACITY: 100,
  /** Default output hopper capacity */
  OUTPUT_HOPPER_CAPACITY: 100,
  /** Default maintenance pool (in credits) */
  INITIAL_MAINTENANCE: 0,
  /** Default power pool */
  INITIAL_POWER: 0,
  /** Maintenance cost per item manufactured */
  MAINTENANCE_PER_ITEM: 5,
  /** Power cost per manufacturing cycle */
  POWER_PER_CYCLE: 10,
  /** Maximum crate stack size */
  MAX_CRATE_STACK: 25,
} as const;

/**
 * Input hopper entry - tracks items/resources waiting to be consumed
 */
export interface InputHopperEntry {
  /** Object ID of the item or resource */
  objectId: ObjectId;
  /** Quantity of this item/resource */
  quantity: number;
  /** Template CRC for type identification */
  templateCrc: CrcValue;
  /** Resource type (if this is a resource) */
  resourceType?: string;
  /** Resource quality (0-1000 scale, if this is a resource) */
  resourceQuality?: number;
}

/**
 * Output hopper entry - tracks completed items
 */
export interface OutputHopperEntry {
  /** Object ID of the completed item or crate */
  objectId: ObjectId;
  /** Whether this is a factory crate */
  isCrate: boolean;
  /** Current stack count (if crate) */
  stackCount: number;
  /** Template CRC of the item */
  templateCrc: CrcValue;
}

/**
 * FactoryObject - Manufacturing installation for mass production
 */
export class FactoryObject extends TangibleObject {
  // ============================================
  // Factory Identity
  // ============================================

  /** Unique factory identifier */
  factoryId: ObjectId;

  /** Owner character ID */
  factoryOwnerId: ObjectId;

  /** Type of factory (determines what it can produce) */
  factoryType: FactoryType;

  // ============================================
  // Hopper Configuration
  // ============================================

  /** Input hopper - items and resources waiting to be consumed */
  inputHopper: Map<ObjectId, InputHopperEntry>;

  /** Output hopper - completed items */
  outputHopper: OutputHopperEntry[];

  /** Maximum items in input hopper */
  inputHopperCapacity: number;

  /** Maximum items in output hopper */
  outputHopperCapacity: number;

  // ============================================
  // Manufacturing State
  // ============================================

  /** Currently loaded factory schematic ID (null if none) */
  activeSchematicId: ObjectId | null;

  /** Total items to manufacture (0 = unlimited until resources depleted) */
  manufactureCount: number;

  /** Items completed in current run */
  itemsCompleted: number;

  /** Progress on current item (0-100%) */
  manufacturingProgress: number;

  /** Seconds required per item */
  manufacturingTime: number;

  /** Whether the factory is currently running */
  isRunning: boolean;

  /** Current factory state */
  factoryState: FactoryState;

  // ============================================
  // Resource Pools
  // ============================================

  /** Maintenance pool (credits) */
  maintenancePool: number;

  /** Power pool */
  powerPool: number;

  /** Last time the factory was updated (for time-based calculations) */
  lastUpdateTime: number;

  // ============================================
  // Delta Tracking
  // ============================================

  /** Delta tracker for factory-specific properties (baseline 3) */
  private deltaTrackerFcty3: DeltaTracker;

  /** Delta tracker for factory-specific properties (baseline 6) */
  private deltaTrackerFcty6: DeltaTracker;

  /** Update counter for input hopper */
  private inputHopperUpdateCounter: number;

  /** Update counter for output hopper */
  private outputHopperUpdateCounter: number;

  /**
   * Create a new FactoryObject
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the object template
   */
  constructor(objectId: ObjectId, templateCrc: CrcValue = 0) {
    super(objectId, templateCrc);

    // Override object type
    this.objectType = ObjectType.Tangible;

    // Initialize factory identity
    this.factoryId = objectId;
    this.factoryOwnerId = 0n;
    this.factoryType = FactoryType.Generic;

    // Initialize hoppers
    this.inputHopper = new Map();
    this.outputHopper = [];
    this.inputHopperCapacity = FACTORY_DEFAULTS.INPUT_HOPPER_CAPACITY;
    this.outputHopperCapacity = FACTORY_DEFAULTS.OUTPUT_HOPPER_CAPACITY;

    // Initialize manufacturing state
    this.activeSchematicId = null;
    this.manufactureCount = 0;
    this.itemsCompleted = 0;
    this.manufacturingProgress = 0;
    this.manufacturingTime = 0;
    this.isRunning = false;
    this.factoryState = FactoryState.Idle;

    // Initialize resource pools
    this.maintenancePool = FACTORY_DEFAULTS.INITIAL_MAINTENANCE;
    this.powerPool = FACTORY_DEFAULTS.INITIAL_POWER;
    this.lastUpdateTime = Date.now();

    // Initialize delta trackers
    this.deltaTrackerFcty3 = new DeltaTracker();
    this.deltaTrackerFcty6 = new DeltaTracker();
    this.inputHopperUpdateCounter = 0;
    this.outputHopperUpdateCounter = 0;
  }

  /**
   * Get baseline type for factory objects
   */
  override getBaselineType(): string {
    return 'FCTY';
  }

  // ============================================
  // Factory Type Management
  // ============================================

  /**
   * Set the factory type
   */
  setFactoryType(type: FactoryType): void {
    if (this.factoryType !== type) {
      this.factoryType = type;
      this.deltaTrackerFcty3.trackChange(FctyProperty.FACTORY_TYPE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Get the display name for the factory type
   */
  getFactoryTypeName(): string {
    switch (this.factoryType) {
      case FactoryType.Weapon:
        return 'Weapon Factory';
      case FactoryType.Armor:
        return 'Armor Factory';
      case FactoryType.Clothing:
        return 'Clothing Factory';
      case FactoryType.Food:
        return 'Food Factory';
      case FactoryType.Structure:
        return 'Structure Factory';
      case FactoryType.Droid:
        return 'Droid Factory';
      case FactoryType.Generic:
        return 'Generic Factory';
      case FactoryType.Furniture:
        return 'Furniture Factory';
      case FactoryType.Component:
        return 'Component Factory';
      case FactoryType.Chemical:
        return 'Chemical Factory';
      case FactoryType.Electronics:
        return 'Electronics Factory';
      default:
        return 'Unknown Factory';
    }
  }

  // ============================================
  // Ownership Management
  // ============================================

  /**
   * Set the factory owner
   */
  setFactoryOwner(ownerId: ObjectId): void {
    if (this.factoryOwnerId !== ownerId) {
      this.factoryOwnerId = ownerId;
      this.deltaTrackerFcty3.trackChange(FctyProperty.OWNER_ID, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Check if a player owns this factory
   */
  isFactoryOwner(playerId: ObjectId): boolean {
    return this.factoryOwnerId === playerId;
  }

  // ============================================
  // Schematic Management
  // ============================================

  /**
   * Set the active factory schematic
   */
  setActiveSchematic(schematicId: ObjectId | null): void {
    if (this.activeSchematicId !== schematicId) {
      this.activeSchematicId = schematicId;
      this.deltaTrackerFcty3.trackChange(FctyProperty.ACTIVE_SCHEMATIC_ID, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Check if a schematic is currently loaded
   */
  hasActiveSchematic(): boolean {
    return this.activeSchematicId !== null;
  }

  /**
   * Clear the active schematic
   */
  clearActiveSchematic(): void {
    this.setActiveSchematic(null);
    this.manufacturingProgress = 0;
    this.manufacturingTime = 0;
  }

  // ============================================
  // Input Hopper Management
  // ============================================

  /**
   * Get the current input hopper count
   */
  getInputHopperCount(): number {
    return this.inputHopper.size;
  }

  /**
   * Check if the input hopper can accept more items
   */
  canAddToInputHopper(): boolean {
    return this.inputHopper.size < this.inputHopperCapacity;
  }

  /**
   * Add an item to the input hopper
   */
  addToInputHopper(entry: InputHopperEntry): boolean {
    if (!this.canAddToInputHopper()) {
      return false;
    }

    // Check if this item already exists (merge quantities)
    const existing = this.inputHopper.get(entry.objectId);
    if (existing) {
      existing.quantity += entry.quantity;
    } else {
      this.inputHopper.set(entry.objectId, { ...entry });
    }

    this.inputHopperUpdateCounter++;
    this.deltaTrackerFcty3.trackChange(FctyProperty.INPUT_HOPPER_COUNT, DeltaType.Change);
    this.markModified();
    return true;
  }

  /**
   * Remove an item from the input hopper
   */
  removeFromInputHopper(objectId: ObjectId, quantity?: number): InputHopperEntry | undefined {
    const entry = this.inputHopper.get(objectId);
    if (!entry) {
      return undefined;
    }

    if (quantity !== undefined && quantity < entry.quantity) {
      // Partial removal
      entry.quantity -= quantity;
      const removed: InputHopperEntry = {
        ...entry,
        quantity,
      };
      this.inputHopperUpdateCounter++;
      this.deltaTrackerFcty3.trackChange(FctyProperty.INPUT_HOPPER_COUNT, DeltaType.Change);
      this.markModified();
      return removed;
    }

    // Full removal
    this.inputHopper.delete(objectId);
    this.inputHopperUpdateCounter++;
    this.deltaTrackerFcty3.trackChange(FctyProperty.INPUT_HOPPER_COUNT, DeltaType.Change);
    this.markModified();
    return entry;
  }

  /**
   * Get an input hopper entry
   */
  getInputHopperEntry(objectId: ObjectId): InputHopperEntry | undefined {
    return this.inputHopper.get(objectId);
  }

  /**
   * Get all input hopper entries
   */
  getInputHopperContents(): InputHopperEntry[] {
    return Array.from(this.inputHopper.values());
  }

  /**
   * Clear the input hopper
   */
  clearInputHopper(): InputHopperEntry[] {
    const contents = this.getInputHopperContents();
    this.inputHopper.clear();
    this.inputHopperUpdateCounter++;
    this.deltaTrackerFcty3.trackChange(FctyProperty.INPUT_HOPPER_COUNT, DeltaType.Change);
    this.markModified();
    return contents;
  }

  // ============================================
  // Output Hopper Management
  // ============================================

  /**
   * Get the current output hopper count
   */
  getOutputHopperCount(): number {
    return this.outputHopper.length;
  }

  /**
   * Check if the output hopper can accept more items
   */
  canAddToOutputHopper(): boolean {
    return this.outputHopper.length < this.outputHopperCapacity;
  }

  /**
   * Add an item to the output hopper
   */
  addToOutputHopper(entry: OutputHopperEntry): boolean {
    if (!this.canAddToOutputHopper()) {
      return false;
    }

    this.outputHopper.push({ ...entry });
    this.outputHopperUpdateCounter++;
    this.deltaTrackerFcty3.trackChange(FctyProperty.OUTPUT_HOPPER_COUNT, DeltaType.Change);
    this.markModified();
    return true;
  }

  /**
   * Remove an item from the output hopper by object ID
   */
  removeFromOutputHopper(objectId: ObjectId): OutputHopperEntry | undefined {
    const index = this.outputHopper.findIndex((e) => e.objectId === objectId);
    if (index === -1) {
      return undefined;
    }

    const removed = this.outputHopper.splice(index, 1)[0];
    this.outputHopperUpdateCounter++;
    this.deltaTrackerFcty3.trackChange(FctyProperty.OUTPUT_HOPPER_COUNT, DeltaType.Change);
    this.markModified();
    return removed;
  }

  /**
   * Get all output hopper entries
   */
  getOutputHopperContents(): OutputHopperEntry[] {
    return [...this.outputHopper];
  }

  /**
   * Clear the output hopper
   */
  clearOutputHopper(): OutputHopperEntry[] {
    const contents = [...this.outputHopper];
    this.outputHopper = [];
    this.outputHopperUpdateCounter++;
    this.deltaTrackerFcty3.trackChange(FctyProperty.OUTPUT_HOPPER_COUNT, DeltaType.Change);
    this.markModified();
    return contents;
  }

  /**
   * Find a crate in the output hopper that can accept more items
   */
  findAvailableCrate(templateCrc: CrcValue): OutputHopperEntry | undefined {
    return this.outputHopper.find(
      (entry) =>
        entry.isCrate &&
        entry.templateCrc === templateCrc &&
        entry.stackCount < FACTORY_DEFAULTS.MAX_CRATE_STACK
    );
  }

  // ============================================
  // Manufacturing State Management
  // ============================================

  /**
   * Set the manufacturing count
   */
  setManufactureCount(count: number): void {
    const newCount = Math.max(0, count);
    if (this.manufactureCount !== newCount) {
      this.manufactureCount = newCount;
      this.deltaTrackerFcty3.trackChange(FctyProperty.MANUFACTURE_COUNT, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Increment items completed
   */
  incrementItemsCompleted(): void {
    this.itemsCompleted++;
    this.deltaTrackerFcty3.trackChange(FctyProperty.ITEMS_COMPLETED, DeltaType.Change);
    this.markModified();
  }

  /**
   * Reset items completed counter
   */
  resetItemsCompleted(): void {
    if (this.itemsCompleted !== 0) {
      this.itemsCompleted = 0;
      this.deltaTrackerFcty3.trackChange(FctyProperty.ITEMS_COMPLETED, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set the manufacturing progress
   */
  setManufacturingProgress(progress: number): void {
    const newProgress = Math.max(0, Math.min(100, progress));
    if (this.manufacturingProgress !== newProgress) {
      this.manufacturingProgress = newProgress;
      this.deltaTrackerFcty3.trackChange(FctyProperty.MANUFACTURING_PROGRESS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set the manufacturing time per item
   */
  setManufacturingTime(seconds: number): void {
    const newTime = Math.max(0, seconds);
    if (this.manufacturingTime !== newTime) {
      this.manufacturingTime = newTime;
      this.deltaTrackerFcty3.trackChange(FctyProperty.MANUFACTURING_TIME, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Start the factory
   */
  start(): boolean {
    if (this.isRunning || !this.activeSchematicId) {
      return false;
    }

    this.isRunning = true;
    this.factoryState = FactoryState.Running;
    this.lastUpdateTime = Date.now();
    this.deltaTrackerFcty3.trackChange(FctyProperty.IS_RUNNING, DeltaType.Change);
    this.markModified();
    return true;
  }

  /**
   * Stop the factory
   */
  stop(): void {
    if (this.isRunning) {
      this.isRunning = false;
      this.factoryState = FactoryState.Idle;
      this.deltaTrackerFcty3.trackChange(FctyProperty.IS_RUNNING, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Pause the factory (retains progress)
   */
  pause(reason: FactoryState): void {
    if (this.isRunning) {
      this.isRunning = false;
      this.factoryState = reason;
      this.deltaTrackerFcty3.trackChange(FctyProperty.IS_RUNNING, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Check if the factory has completed its run
   */
  isRunComplete(): boolean {
    return this.manufactureCount > 0 && this.itemsCompleted >= this.manufactureCount;
  }

  // ============================================
  // Resource Pool Management
  // ============================================

  /**
   * Add maintenance credits
   */
  addMaintenance(amount: number): void {
    if (amount > 0) {
      this.maintenancePool += amount;
      this.deltaTrackerFcty6.trackChange(FctyProperty.MAINTENANCE_POOL, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Deduct maintenance credits
   */
  deductMaintenance(amount: number): boolean {
    if (this.maintenancePool >= amount) {
      this.maintenancePool -= amount;
      this.deltaTrackerFcty6.trackChange(FctyProperty.MAINTENANCE_POOL, DeltaType.Change);
      this.markModified();
      return true;
    }
    return false;
  }

  /**
   * Check if there's enough maintenance
   */
  hasEnoughMaintenance(amount: number): boolean {
    return this.maintenancePool >= amount;
  }

  /**
   * Add power
   */
  addPower(amount: number): void {
    if (amount > 0) {
      this.powerPool += amount;
      this.deltaTrackerFcty6.trackChange(FctyProperty.POWER_POOL, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Deduct power
   */
  deductPower(amount: number): boolean {
    if (this.powerPool >= amount) {
      this.powerPool -= amount;
      this.deltaTrackerFcty6.trackChange(FctyProperty.POWER_POOL, DeltaType.Change);
      this.markModified();
      return true;
    }
    return false;
  }

  /**
   * Check if there's enough power
   */
  hasEnoughPower(amount: number): boolean {
    return this.powerPool >= amount;
  }

  /**
   * Update the last update timestamp
   */
  updateLastUpdateTime(): void {
    this.lastUpdateTime = Date.now();
    this.deltaTrackerFcty6.trackChange(FctyProperty.LAST_UPDATE_TIME, DeltaType.Change);
  }

  // ============================================
  // Delta Management
  // ============================================

  /**
   * Check if factory baseline 3 has changes
   */
  hasFcty3Changes(): boolean {
    return this.deltaTrackerFcty3.hasChanges();
  }

  /**
   * Check if factory baseline 6 has changes
   */
  hasFcty6Changes(): boolean {
    return this.deltaTrackerFcty6.hasChanges();
  }

  /**
   * Get factory baseline 3 delta tracker
   */
  getFcty3DeltaTracker(): DeltaTracker {
    return this.deltaTrackerFcty3;
  }

  /**
   * Get factory baseline 6 delta tracker
   */
  getFcty6DeltaTracker(): DeltaTracker {
    return this.deltaTrackerFcty6;
  }

  /**
   * Get input hopper update counter
   */
  getInputHopperUpdateCounter(): number {
    return this.inputHopperUpdateCounter;
  }

  /**
   * Get output hopper update counter
   */
  getOutputHopperUpdateCounter(): number {
    return this.outputHopperUpdateCounter;
  }

  /**
   * Clear all delta trackers
   */
  override clearDirtyFlags(): void {
    super.clearDirtyFlags();
    this.deltaTrackerFcty3.clear();
    this.deltaTrackerFcty6.clear();
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Copy factory properties to another FactoryObject
   */
  copyFactoryPropertiesTo(target: FactoryObject): void {
    this.copyPropertiesTo(target);

    target.factoryId = this.factoryId;
    target.factoryOwnerId = this.factoryOwnerId;
    target.factoryType = this.factoryType;
    target.inputHopperCapacity = this.inputHopperCapacity;
    target.outputHopperCapacity = this.outputHopperCapacity;
    target.activeSchematicId = this.activeSchematicId;
    target.manufactureCount = this.manufactureCount;
    target.itemsCompleted = this.itemsCompleted;
    target.manufacturingProgress = this.manufacturingProgress;
    target.manufacturingTime = this.manufacturingTime;
    target.isRunning = this.isRunning;
    target.factoryState = this.factoryState;
    target.maintenancePool = this.maintenancePool;
    target.powerPool = this.powerPool;
    target.lastUpdateTime = this.lastUpdateTime;

    // Copy hoppers
    target.inputHopper = new Map(this.inputHopper);
    target.outputHopper = [...this.outputHopper];
  }

  /**
   * Serialize to JSON for debugging/persistence
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      factoryId: this.factoryId.toString(),
      factoryOwnerId: this.factoryOwnerId.toString(),
      factoryType: this.factoryType,
      factoryTypeName: this.getFactoryTypeName(),
      inputHopperCount: this.inputHopper.size,
      inputHopperCapacity: this.inputHopperCapacity,
      outputHopperCount: this.outputHopper.length,
      outputHopperCapacity: this.outputHopperCapacity,
      activeSchematicId: this.activeSchematicId?.toString() ?? null,
      manufactureCount: this.manufactureCount,
      itemsCompleted: this.itemsCompleted,
      manufacturingProgress: this.manufacturingProgress,
      manufacturingTime: this.manufacturingTime,
      isRunning: this.isRunning,
      factoryState: this.factoryState,
      maintenancePool: this.maintenancePool,
      powerPool: this.powerPool,
      lastUpdateTime: this.lastUpdateTime,
    };
  }
}

/**
 * Factory type to schematic category mapping
 */
export const FACTORY_TO_SCHEMATIC_CATEGORY: Record<FactoryType, string[]> = {
  [FactoryType.Weapon]: ['weapon'],
  [FactoryType.Armor]: ['armor'],
  [FactoryType.Clothing]: ['clothing'],
  [FactoryType.Food]: ['food'],
  [FactoryType.Structure]: ['structure'],
  [FactoryType.Droid]: ['droid'],
  [FactoryType.Generic]: ['misc', 'tool'],
  [FactoryType.Furniture]: ['furniture'],
  [FactoryType.Component]: ['component'],
  [FactoryType.Chemical]: ['chemical', 'medicine'],
  [FactoryType.Electronics]: ['electronics'],
};

/**
 * Check if a factory type can manufacture a schematic category
 */
export function canFactoryManufactureCategory(
  factoryType: FactoryType,
  schematicCategory: string
): boolean {
  const allowedCategories = FACTORY_TO_SCHEMATIC_CATEGORY[factoryType];
  return allowedCategories.includes(schematicCategory.toLowerCase());
}

/**
 * Get the factory type required for a schematic category
 */
export function getFactoryTypeForCategory(schematicCategory: string): FactoryType | null {
  const category = schematicCategory.toLowerCase();
  for (const [factoryType, categories] of Object.entries(FACTORY_TO_SCHEMATIC_CATEGORY)) {
    if (categories.includes(category)) {
      return parseInt(factoryType, 10) as FactoryType;
    }
  }
  return null;
}
