/**
 * FactoryCrate - Container for identical items produced by factories
 * Factory crates hold stacks of identical items with shared attributes.
 * Items are extracted one at a time, creating copies with the same properties.
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { Container, ContProperty } from './container.js';
import { ContainerType, TransferResultCode, createFailureResult } from './container-types.js';
import { DeltaType } from '../deltas.js';

/**
 * FCRT property indices for delta tracking
 * These match the variable indices in FCRT baselines
 */
export const FcrtProperty = {
  // FCRT3 (shared)
  ITEM_TEMPLATE_CRC: 0,
  ITEM_ATTRIBUTES: 1,
  STACK_SIZE: 2,
  MAX_STACK_SIZE: 3,
  ITEM_NAME: 4,
  CRAFTER_NAME: 5,
  SERIAL_NUMBER: 6,
  // FCRT6 (server)
  QUALITY: 0,
  HITPOINTS: 1,
} as const;

/**
 * Default maximum stack size for factory crates
 */
export const DEFAULT_MAX_STACK_SIZE = 25;

/**
 * Item attributes stored on a factory crate
 * These are applied to each item extracted from the crate
 */
export interface FactoryCrateItemAttributes {
  /** Condition/durability */
  condition?: number | undefined;
  /** Maximum condition */
  maxCondition?: number | undefined;
  /** Item quality (0-1) */
  quality?: number | undefined;
  /** Hit points */
  hitPoints?: number | undefined;
  /** Custom attributes (key-value pairs) */
  customAttributes?: Map<string, number | string> | undefined;
}

/**
 * FactoryCrate - Container for factory-produced identical items
 */
export class FactoryCrate extends Container {
  // ============================================
  // Factory Crate Properties
  // ============================================

  /** CRC of the item template all items in this crate share */
  protected _itemTemplateCrc: CrcValue;

  /** Shared attributes for all items in the crate */
  protected _itemAttributes: FactoryCrateItemAttributes;

  /** Current number of items in the stack */
  protected _stackSize: number;

  /** Maximum number of items this crate can hold */
  protected _maxStackSize: number;

  /** Display name of the items in this crate */
  protected _itemName: string;

  /** Name of the crafter who made these items */
  protected _crafterName: string;

  /**
   * Create a new FactoryCrate
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the crate template
   * @param itemTemplateCrc - CRC32 of the items in this crate
   */
  constructor(
    objectId: ObjectId,
    templateCrc: CrcValue = 0,
    itemTemplateCrc: CrcValue = 0
  ) {
    super(objectId, templateCrc, ContainerType.Crate);

    this._itemTemplateCrc = itemTemplateCrc;
    this._itemAttributes = {};
    this._stackSize = 0;
    this._maxStackSize = DEFAULT_MAX_STACK_SIZE;
    this._itemName = '';
    this._crafterName = '';
    this.serialNumber = 0n;

    // Factory crates have capacity of 1 (one stack)
    this.setMaxCapacity(1);
  }

  /**
   * Get baseline type for factory crate objects
   */
  override getBaselineType(): string {
    return 'FCRT';
  }

  // ============================================
  // Getters
  // ============================================

  /** Get item template CRC */
  get itemTemplateCrc(): CrcValue {
    return this._itemTemplateCrc;
  }

  /** Get item attributes */
  get itemAttributes(): Readonly<FactoryCrateItemAttributes> {
    return this._itemAttributes;
  }

  /** Get current stack size */
  get stackSize(): number {
    return this._stackSize;
  }

  /** Get maximum stack size */
  get maxStackSize(): number {
    return this._maxStackSize;
  }

  /** Get item name */
  get itemName(): string {
    return this._itemName;
  }

  /** Get crafter name */
  get crafterName(): string {
    return this._crafterName;
  }

  // ============================================
  // Stack Management
  // ============================================

  /**
   * Set the item template CRC
   */
  setItemTemplateCrc(crc: CrcValue): void {
    if (this._itemTemplateCrc !== crc) {
      this._itemTemplateCrc = crc;
      this.deltaTrackerCont3.trackChange(FcrtProperty.ITEM_TEMPLATE_CRC, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set item attributes
   */
  setItemAttributes(attributes: FactoryCrateItemAttributes): void {
    this._itemAttributes = { ...attributes };
    if (attributes.customAttributes) {
      this._itemAttributes.customAttributes = new Map(attributes.customAttributes);
    }
    this.deltaTrackerCont3.trackChange(FcrtProperty.ITEM_ATTRIBUTES, DeltaType.Change);
    this.markModified();
  }

  /**
   * Set a specific item attribute
   */
  setItemAttribute<K extends keyof FactoryCrateItemAttributes>(
    key: K,
    value: FactoryCrateItemAttributes[K]
  ): void {
    this._itemAttributes[key] = value;
    this.deltaTrackerCont3.trackChange(FcrtProperty.ITEM_ATTRIBUTES, DeltaType.Change);
    this.markModified();
  }

  /**
   * Set a custom attribute
   */
  setCustomAttribute(key: string, value: number | string): void {
    if (!this._itemAttributes.customAttributes) {
      this._itemAttributes.customAttributes = new Map();
    }
    this._itemAttributes.customAttributes.set(key, value);
    this.deltaTrackerCont3.trackChange(FcrtProperty.ITEM_ATTRIBUTES, DeltaType.Change);
    this.markModified();
  }

  /**
   * Get a custom attribute
   */
  getCustomAttribute(key: string): number | string | undefined {
    return this._itemAttributes.customAttributes?.get(key);
  }

  /**
   * Set stack size
   */
  setStackSize(size: number): void {
    const clamped = Math.max(0, Math.min(size, this._maxStackSize));
    if (this._stackSize !== clamped) {
      this._stackSize = clamped;
      this.deltaTrackerCont3.trackChange(FcrtProperty.STACK_SIZE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set maximum stack size
   */
  setMaxStackSize(maxSize: number): void {
    const clamped = Math.max(1, maxSize);
    if (this._maxStackSize !== clamped) {
      this._maxStackSize = clamped;
      // Clamp current stack size if needed
      if (this._stackSize > clamped) {
        this._stackSize = clamped;
        this.deltaTrackerCont3.trackChange(FcrtProperty.STACK_SIZE, DeltaType.Change);
      }
      this.deltaTrackerCont3.trackChange(FcrtProperty.MAX_STACK_SIZE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set item name
   */
  setItemName(name: string): void {
    if (this._itemName !== name) {
      this._itemName = name;
      this.deltaTrackerCont3.trackChange(FcrtProperty.ITEM_NAME, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set crafter name
   */
  setCrafterName(name: string): void {
    if (this._crafterName !== name) {
      this._crafterName = name;
      this.deltaTrackerCont3.trackChange(FcrtProperty.CRAFTER_NAME, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set serial number
   */
  setSerialNumber(serial: bigint): void {
    if (this.serialNumber !== serial) {
      this.serialNumber = serial;
      this.deltaTrackerCont3.trackChange(FcrtProperty.SERIAL_NUMBER, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Add items to the stack
   * @returns Number of items actually added
   */
  addToStack(count: number): number {
    const available = this._maxStackSize - this._stackSize;
    const toAdd = Math.min(count, available);

    if (toAdd > 0) {
      this.setStackSize(this._stackSize + toAdd);
    }

    return toAdd;
  }

  /**
   * Remove items from the stack
   * @returns Number of items actually removed
   */
  removeFromStack(count: number): number {
    const toRemove = Math.min(count, this._stackSize);

    if (toRemove > 0) {
      this.setStackSize(this._stackSize - toRemove);
    }

    return toRemove;
  }

  /**
   * Check if the stack is full
   */
  isStackFull(): boolean {
    return this._stackSize >= this._maxStackSize;
  }

  /**
   * Check if the stack is empty
   */
  isStackEmpty(): boolean {
    return this._stackSize === 0;
  }

  /**
   * Get available stack space
   */
  getAvailableStackSpace(): number {
    return Math.max(0, this._maxStackSize - this._stackSize);
  }

  // ============================================
  // Item Extraction
  // ============================================

  /**
   * Extract one item from the crate
   * Returns the attributes that should be applied to the new item object
   * @returns Item attributes for the extracted item, or undefined if empty
   */
  extractItem(): FactoryCrateItemAttributes | undefined {
    if (this._stackSize === 0) {
      return undefined;
    }

    this.setStackSize(this._stackSize - 1);

    // Return a copy of the attributes
    const attributes: FactoryCrateItemAttributes = {
      condition: this._itemAttributes.condition,
      maxCondition: this._itemAttributes.maxCondition,
      quality: this._itemAttributes.quality,
      hitPoints: this._itemAttributes.hitPoints,
    };

    if (this._itemAttributes.customAttributes) {
      attributes.customAttributes = new Map(this._itemAttributes.customAttributes);
    }

    return attributes;
  }

  /**
   * Extract multiple items from the crate
   * @returns Array of item attributes for extracted items
   */
  extractItems(count: number): FactoryCrateItemAttributes[] {
    const results: FactoryCrateItemAttributes[] = [];
    const toExtract = Math.min(count, this._stackSize);

    for (let i = 0; i < toExtract; i++) {
      const attrs = this.extractItem();
      if (attrs) {
        results.push(attrs);
      }
    }

    return results;
  }

  // ============================================
  // Stacking Operations
  // ============================================

  /**
   * Check if this crate can stack with another crate
   * Crates can only stack if they have the same item template and attributes
   */
  canStackWith(other: FactoryCrate): boolean {
    // Must be same item template
    if (this._itemTemplateCrc !== other._itemTemplateCrc) {
      return false;
    }

    // Must have same crafter
    if (this._crafterName !== other._crafterName) {
      return false;
    }

    // Must have compatible attributes
    if (!this.attributesMatch(other._itemAttributes)) {
      return false;
    }

    // Must have room for at least one item
    if (this.isStackFull()) {
      return false;
    }

    return true;
  }

  /**
   * Check if attributes match another crate's attributes
   */
  private attributesMatch(other: FactoryCrateItemAttributes): boolean {
    if (this._itemAttributes.condition !== other.condition) return false;
    if (this._itemAttributes.maxCondition !== other.maxCondition) return false;
    if (this._itemAttributes.quality !== other.quality) return false;
    if (this._itemAttributes.hitPoints !== other.hitPoints) return false;

    // Check custom attributes
    const thisCustom = this._itemAttributes.customAttributes;
    const otherCustom = other.customAttributes;

    if (thisCustom && otherCustom) {
      if (thisCustom.size !== otherCustom.size) return false;
      for (const [key, value] of thisCustom) {
        if (otherCustom.get(key) !== value) return false;
      }
    } else if (thisCustom || otherCustom) {
      // One has custom attributes, the other doesn't
      const existing = thisCustom ?? otherCustom;
      if (existing && existing.size > 0) return false;
    }

    return true;
  }

  /**
   * Merge another crate's contents into this crate
   * @returns Number of items merged
   */
  mergeFrom(other: FactoryCrate): number {
    if (!this.canStackWith(other)) {
      return 0;
    }

    const toMerge = Math.min(other._stackSize, this.getAvailableStackSpace());
    if (toMerge > 0) {
      this.addToStack(toMerge);
      other.removeFromStack(toMerge);
    }

    return toMerge;
  }

  /**
   * Split this crate into two crates
   * @param count - Number of items to split off
   * @param newCrateId - Object ID for the new crate
   * @returns New crate with split items, or undefined if split failed
   */
  split(count: number, newCrateId: ObjectId): FactoryCrate | undefined {
    if (count <= 0 || count >= this._stackSize) {
      return undefined;
    }

    // Create new crate
    const newCrate = new FactoryCrate(
      newCrateId,
      this.templateCrc,
      this._itemTemplateCrc
    );

    // Copy properties
    newCrate.setItemAttributes(this._itemAttributes);
    newCrate.setItemName(this._itemName);
    newCrate.setCrafterName(this._crafterName);
    newCrate.setMaxStackSize(this._maxStackSize);

    // Transfer items
    this.removeFromStack(count);
    newCrate.setStackSize(count);

    return newCrate;
  }

  // ============================================
  // Override Container Methods
  // ============================================

  /**
   * Factory crates don't use standard item addition
   */
  override canAddItem(): ReturnType<Container['canAddItem']> {
    return createFailureResult(
      TransferResultCode.SlotRestriction,
      'Factory crates use stack operations, not standard item addition'
    );
  }

  /**
   * Factory crates don't use standard item addition
   */
  override addItem(): ReturnType<Container['addItem']> {
    return createFailureResult(
      TransferResultCode.SlotRestriction,
      'Factory crates use stack operations, not standard item addition'
    );
  }

  /**
   * Override current count to return stack size
   */
  override getCurrentCount(): number {
    return this._stackSize;
  }

  /**
   * Override available capacity
   */
  override getAvailableCapacity(): number {
    return this.getAvailableStackSpace();
  }

  /**
   * Override isFull
   */
  override isFull(): boolean {
    return this.isStackFull();
  }

  /**
   * Override isEmpty
   */
  override isEmpty(): boolean {
    return this.isStackEmpty();
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Serialize to JSON for debugging/persistence
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      itemTemplateCrc: this._itemTemplateCrc,
      itemAttributes: {
        condition: this._itemAttributes.condition,
        maxCondition: this._itemAttributes.maxCondition,
        quality: this._itemAttributes.quality,
        hitPoints: this._itemAttributes.hitPoints,
        customAttributes: this._itemAttributes.customAttributes
          ? Object.fromEntries(this._itemAttributes.customAttributes)
          : undefined,
      },
      stackSize: this._stackSize,
      maxStackSize: this._maxStackSize,
      itemName: this._itemName,
      crafterName: this._crafterName,
      serialNumber: this.serialNumber.toString(),
    };
  }
}
