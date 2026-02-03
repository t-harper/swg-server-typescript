/**
 * InventoryContainer - Player inventory container
 * Handles player inventory with default capacity of 80 slots,
 * bank integration, and overflow handling.
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { Container, ContProperty } from './container.js';
import {
  ContainerType,
  ContainerPermission,
  type ContainedItem,
  type TransferResult,
  TransferResultCode,
  createFailureResult,
  createSuccessResult,
  SlotDefinition,
  SlotRestriction,
} from './container-types.js';
import { DeltaType } from '../deltas.js';

/**
 * Default player inventory capacity
 */
export const DEFAULT_INVENTORY_CAPACITY = 80;

/**
 * Default inventory volume (very large to not restrict normal items)
 */
export const DEFAULT_INVENTORY_VOLUME = 100000;

/**
 * Inventory property indices for delta tracking
 */
export const InvProperty = {
  // INV3 (shared)
  BANK_ID: 0,
  OVERFLOW_ENABLED: 1,
  OVERFLOW_COUNT: 2,
  ENCUMBRANCE_HEALTH: 3,
  ENCUMBRANCE_ACTION: 4,
  ENCUMBRANCE_MIND: 5,
  // INV6 (server)
  EQUIPPED_ITEMS: 0,
  CREDITS: 1,
  BANK_CREDITS: 2,
} as const;

/**
 * Standard equipment slot names
 */
export const EquipmentSlotNames = {
  HEAD: 'head',
  CHEST: 'chest',
  BACK: 'back',
  BICEP_L: 'bicep_l',
  BICEP_R: 'bicep_r',
  BRACER_L: 'bracer_l',
  BRACER_R: 'bracer_r',
  GLOVES: 'gloves',
  UTILITY_BELT: 'utility_belt',
  PANTS: 'pants',
  SHOES: 'shoes',
  RING_L: 'ring_l',
  RING_R: 'ring_r',
  NECKLACE: 'necklace',
  CLOAK: 'cloak',
  HAIR: 'hair',
  EARRING_L: 'earring_l',
  EARRING_R: 'earring_r',
  // Weapon slots
  WEAPON_PRIMARY: 'weapon_primary',
  WEAPON_SECONDARY: 'weapon_secondary',
  // Appearance slots
  APP_HEAD: 'app_head',
  APP_CHEST: 'app_chest',
  APP_PANTS: 'app_pants',
  APP_SHOES: 'app_shoes',
} as const;

/**
 * Overflow item - item that couldn't fit in inventory
 */
export interface OverflowItem {
  /** Item ID */
  itemId: ObjectId;
  /** Template CRC */
  templateCrc: CrcValue;
  /** Volume */
  volume: number;
  /** When it was added to overflow */
  addedAt: number;
  /** Expiration timestamp (when it will be deleted) */
  expiresAt: number;
}

/**
 * InventoryContainer - Player inventory with bank integration
 */
export class InventoryContainer extends Container {
  // ============================================
  // Inventory Properties
  // ============================================

  /** Player ID this inventory belongs to */
  protected _playerId: ObjectId;

  /** Linked bank container ID */
  protected _bankId: ObjectId;

  /** Whether overflow is enabled */
  protected _overflowEnabled: boolean;

  /** Items in overflow (couldn't fit in inventory) */
  protected _overflowItems: Map<ObjectId, OverflowItem>;

  /** Maximum time in overflow before items are deleted (milliseconds) */
  protected _overflowExpirationMs: number;

  /** Current HAM encumbrance from equipped items */
  protected _encumbranceHealth: number;
  protected _encumbranceAction: number;
  protected _encumbranceMind: number;

  /** Credits on hand */
  protected _credits: number;

  /** Credits in bank */
  protected _bankCredits: number;

  /** Max credits on hand */
  protected _maxCredits: number;

  /** Max bank credits */
  protected _maxBankCredits: number;

  /** Equipped item IDs (subset of contents that are equipped) */
  protected _equippedItems: Set<ObjectId>;

  /**
   * Create a new InventoryContainer
   * @param objectId - Unique 64-bit identifier
   * @param playerId - Player ID this inventory belongs to
   */
  constructor(objectId: ObjectId, playerId: ObjectId) {
    super(objectId, 0, ContainerType.Inventory);

    this._playerId = playerId;
    this._bankId = 0n;
    this._overflowEnabled = true;
    this._overflowItems = new Map();
    this._overflowExpirationMs = 24 * 60 * 60 * 1000; // 24 hours

    // Initialize encumbrance
    this._encumbranceHealth = 0;
    this._encumbranceAction = 0;
    this._encumbranceMind = 0;

    // Initialize credits
    this._credits = 0;
    this._bankCredits = 0;
    this._maxCredits = 2_000_000_000; // 2 billion
    this._maxBankCredits = 2_000_000_000;

    // Initialize equipped items tracking
    this._equippedItems = new Set();

    // Set default capacity
    this.setMaxCapacity(DEFAULT_INVENTORY_CAPACITY);
    this.setMaxVolume(DEFAULT_INVENTORY_VOLUME);

    // Owner is the player
    this.setContainerOwner(playerId);
    this.setPermissions(ContainerPermission.Owner);

    // Initialize equipment slots
    this.initializeEquipmentSlots();
  }

  /**
   * Initialize standard equipment slot definitions
   */
  private initializeEquipmentSlots(): void {
    const createSlot = (
      name: string,
      displayName: string,
      index: number,
      restriction: SlotRestriction = SlotRestriction.None
    ): SlotDefinition => ({
      name,
      displayName,
      restriction,
      required: false,
      visible: true,
      index,
    });

    // Armor/clothing slots
    this.addSlotDefinition(createSlot(EquipmentSlotNames.HEAD, 'Head', 0, SlotRestriction.Armor));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.CHEST, 'Chest', 1, SlotRestriction.Armor));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.BACK, 'Back', 2, SlotRestriction.Clothing));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.BICEP_L, 'Left Bicep', 3, SlotRestriction.Armor));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.BICEP_R, 'Right Bicep', 4, SlotRestriction.Armor));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.BRACER_L, 'Left Bracer', 5, SlotRestriction.Armor));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.BRACER_R, 'Right Bracer', 6, SlotRestriction.Armor));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.GLOVES, 'Gloves', 7, SlotRestriction.Armor));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.UTILITY_BELT, 'Utility Belt', 8, SlotRestriction.Clothing));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.PANTS, 'Pants', 9, SlotRestriction.Armor));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.SHOES, 'Shoes', 10, SlotRestriction.Armor));

    // Jewelry slots
    this.addSlotDefinition(createSlot(EquipmentSlotNames.RING_L, 'Left Ring', 11));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.RING_R, 'Right Ring', 12));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.NECKLACE, 'Necklace', 13));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.EARRING_L, 'Left Earring', 14));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.EARRING_R, 'Right Earring', 15));

    // Other slots
    this.addSlotDefinition(createSlot(EquipmentSlotNames.CLOAK, 'Cloak', 16, SlotRestriction.Clothing));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.HAIR, 'Hair', 17));

    // Weapon slots
    this.addSlotDefinition(createSlot(EquipmentSlotNames.WEAPON_PRIMARY, 'Primary Weapon', 18, SlotRestriction.Weapon));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.WEAPON_SECONDARY, 'Secondary Weapon', 19, SlotRestriction.Weapon));

    // Appearance slots
    this.addSlotDefinition(createSlot(EquipmentSlotNames.APP_HEAD, 'Appearance Head', 20, SlotRestriction.Clothing));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.APP_CHEST, 'Appearance Chest', 21, SlotRestriction.Clothing));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.APP_PANTS, 'Appearance Pants', 22, SlotRestriction.Clothing));
    this.addSlotDefinition(createSlot(EquipmentSlotNames.APP_SHOES, 'Appearance Shoes', 23, SlotRestriction.Clothing));
  }

  /**
   * Get baseline type for inventory objects
   */
  override getBaselineType(): string {
    return 'INVY';
  }

  // ============================================
  // Getters
  // ============================================

  /** Get player ID */
  get playerId(): ObjectId {
    return this._playerId;
  }

  /** Get bank ID */
  get bankId(): ObjectId {
    return this._bankId;
  }

  /** Get overflow enabled */
  get overflowEnabled(): boolean {
    return this._overflowEnabled;
  }

  /** Get overflow items */
  get overflowItems(): ReadonlyMap<ObjectId, OverflowItem> {
    return this._overflowItems;
  }

  /** Get health encumbrance */
  get encumbranceHealth(): number {
    return this._encumbranceHealth;
  }

  /** Get action encumbrance */
  get encumbranceAction(): number {
    return this._encumbranceAction;
  }

  /** Get mind encumbrance */
  get encumbranceMind(): number {
    return this._encumbranceMind;
  }

  /** Get credits on hand */
  get credits(): number {
    return this._credits;
  }

  /** Get bank credits */
  get bankCredits(): number {
    return this._bankCredits;
  }

  /** Get total credits (hand + bank) */
  get totalCredits(): number {
    return this._credits + this._bankCredits;
  }

  // ============================================
  // Bank Integration
  // ============================================

  /**
   * Set the linked bank container ID
   */
  setBankId(bankId: ObjectId): void {
    if (this._bankId !== bankId) {
      this._bankId = bankId;
      this.deltaTrackerCont3.trackChange(InvProperty.BANK_ID, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set overflow enabled
   */
  setOverflowEnabled(enabled: boolean): void {
    if (this._overflowEnabled !== enabled) {
      this._overflowEnabled = enabled;
      this.deltaTrackerCont3.trackChange(InvProperty.OVERFLOW_ENABLED, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set overflow expiration time
   */
  setOverflowExpirationMs(ms: number): void {
    this._overflowExpirationMs = Math.max(0, ms);
  }

  // ============================================
  // Overflow Handling
  // ============================================

  /**
   * Add an item to overflow
   */
  addToOverflow(itemId: ObjectId, templateCrc: CrcValue, volume: number): void {
    const now = Date.now();
    const overflowItem: OverflowItem = {
      itemId,
      templateCrc,
      volume,
      addedAt: now,
      expiresAt: now + this._overflowExpirationMs,
    };

    this._overflowItems.set(itemId, overflowItem);
    this.deltaTrackerCont3.trackChange(InvProperty.OVERFLOW_COUNT, DeltaType.Change);
    this.markModified();
  }

  /**
   * Remove an item from overflow
   */
  removeFromOverflow(itemId: ObjectId): boolean {
    if (this._overflowItems.has(itemId)) {
      this._overflowItems.delete(itemId);
      this.deltaTrackerCont3.trackChange(InvProperty.OVERFLOW_COUNT, DeltaType.Change);
      this.markModified();
      return true;
    }
    return false;
  }

  /**
   * Get overflow count
   */
  getOverflowCount(): number {
    return this._overflowItems.size;
  }

  /**
   * Check if there are items in overflow
   */
  hasOverflow(): boolean {
    return this._overflowItems.size > 0;
  }

  /**
   * Process expired overflow items
   * @returns Array of expired item IDs that were removed
   */
  processExpiredOverflow(): ObjectId[] {
    const now = Date.now();
    const expired: ObjectId[] = [];

    for (const [itemId, item] of this._overflowItems) {
      if (item.expiresAt <= now) {
        expired.push(itemId);
      }
    }

    for (const itemId of expired) {
      this._overflowItems.delete(itemId);
    }

    if (expired.length > 0) {
      this.deltaTrackerCont3.trackChange(InvProperty.OVERFLOW_COUNT, DeltaType.Change);
      this.markModified();
    }

    return expired;
  }

  /**
   * Try to move items from overflow to inventory
   * @returns Array of item IDs that were successfully moved
   */
  processOverflow(): ObjectId[] {
    const moved: ObjectId[] = [];

    for (const [itemId, item] of this._overflowItems) {
      // Check if we have room
      if (this.getCurrentCount() >= this.maxCapacity) {
        break;
      }

      if (this.getCurrentVolume() + item.volume > this.maxVolume) {
        continue; // Try next item
      }

      // Move from overflow to inventory
      const result = this.addItem(itemId, item.volume, item.templateCrc);
      if (result.success) {
        this._overflowItems.delete(itemId);
        moved.push(itemId);
      }
    }

    if (moved.length > 0) {
      this.deltaTrackerCont3.trackChange(InvProperty.OVERFLOW_COUNT, DeltaType.Change);
      this.markModified();
    }

    return moved;
  }

  // ============================================
  // Override Add Item for Overflow
  // ============================================

  /**
   * Override addItem to handle overflow
   */
  override addItem(
    itemId: ObjectId,
    itemVolume: number,
    itemTemplateCrc: CrcValue,
    slot?: string
  ): TransferResult {
    // Try normal add first
    const result = super.addItem(itemId, itemVolume, itemTemplateCrc, slot);

    if (result.success) {
      return result;
    }

    // If failed due to capacity and overflow is enabled, add to overflow
    if (
      this._overflowEnabled &&
      (result.code === TransferResultCode.TargetFull ||
        result.code === TransferResultCode.VolumeExceeded)
    ) {
      this.addToOverflow(itemId, itemTemplateCrc, itemVolume);
      return createSuccessResult(
        itemId,
        0n,
        this.objectId,
        undefined,
        undefined
      );
    }

    return result;
  }

  // ============================================
  // Equipment Management
  // ============================================

  /**
   * Equip an item to a slot
   */
  equipItem(itemId: ObjectId, slot: string): TransferResult {
    // Check if item is in inventory
    const containedItem = this.getItem(itemId);
    if (!containedItem) {
      return createFailureResult(
        TransferResultCode.ItemNotFound,
        'Item not found in inventory',
        itemId,
        this.objectId,
        this.objectId
      );
    }

    // Move to slot
    const moveResult = this.moveToSlot(itemId, slot);
    if (!moveResult.success) {
      return moveResult;
    }

    // Track as equipped
    this._equippedItems.add(itemId);
    this.deltaTrackerCont6.trackListAdd(
      InvProperty.EQUIPPED_ITEMS,
      this._equippedItems.size - 1,
      itemId
    );

    return moveResult;
  }

  /**
   * Unequip an item from a slot
   */
  unequipItem(itemId: ObjectId): TransferResult {
    // Check if item is equipped
    if (!this._equippedItems.has(itemId)) {
      return createFailureResult(
        TransferResultCode.ItemNotFound,
        'Item is not equipped',
        itemId,
        this.objectId,
        this.objectId
      );
    }

    // Move to general inventory (no slot)
    const moveResult = this.moveToSlot(itemId, undefined);
    if (!moveResult.success) {
      return moveResult;
    }

    // Remove from equipped
    this._equippedItems.delete(itemId);
    this.deltaTrackerCont6.trackListRemove(
      InvProperty.EQUIPPED_ITEMS,
      0,
      itemId
    );

    return moveResult;
  }

  /**
   * Check if an item is equipped
   */
  isEquipped(itemId: ObjectId): boolean {
    return this._equippedItems.has(itemId);
  }

  /**
   * Get all equipped item IDs
   */
  getEquippedItems(): ObjectId[] {
    return Array.from(this._equippedItems);
  }

  /**
   * Get equipped item in a specific slot
   */
  getEquippedInSlot(slot: string): ObjectId | undefined {
    const itemId = this.getItemInSlot(slot);
    if (itemId && this._equippedItems.has(itemId)) {
      return itemId;
    }
    return undefined;
  }

  // ============================================
  // Encumbrance Management
  // ============================================

  /**
   * Set health encumbrance
   */
  setEncumbranceHealth(value: number): void {
    const clamped = Math.max(0, value);
    if (this._encumbranceHealth !== clamped) {
      this._encumbranceHealth = clamped;
      this.deltaTrackerCont3.trackChange(InvProperty.ENCUMBRANCE_HEALTH, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set action encumbrance
   */
  setEncumbranceAction(value: number): void {
    const clamped = Math.max(0, value);
    if (this._encumbranceAction !== clamped) {
      this._encumbranceAction = clamped;
      this.deltaTrackerCont3.trackChange(InvProperty.ENCUMBRANCE_ACTION, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set mind encumbrance
   */
  setEncumbranceMind(value: number): void {
    const clamped = Math.max(0, value);
    if (this._encumbranceMind !== clamped) {
      this._encumbranceMind = clamped;
      this.deltaTrackerCont3.trackChange(InvProperty.ENCUMBRANCE_MIND, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set all encumbrance values
   */
  setEncumbrance(health: number, action: number, mind: number): void {
    this.setEncumbranceHealth(health);
    this.setEncumbranceAction(action);
    this.setEncumbranceMind(mind);
  }

  /**
   * Get total encumbrance
   */
  getTotalEncumbrance(): number {
    return this._encumbranceHealth + this._encumbranceAction + this._encumbranceMind;
  }

  // ============================================
  // Credit Management
  // ============================================

  /**
   * Set credits on hand
   */
  setCredits(amount: number): void {
    const clamped = Math.max(0, Math.min(amount, this._maxCredits));
    if (this._credits !== clamped) {
      this._credits = clamped;
      this.deltaTrackerCont6.trackChange(InvProperty.CREDITS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Add credits on hand
   */
  addCredits(amount: number): number {
    const oldCredits = this._credits;
    this.setCredits(this._credits + amount);
    return this._credits - oldCredits;
  }

  /**
   * Remove credits on hand
   * @returns Actual amount removed
   */
  removeCredits(amount: number): number {
    const toRemove = Math.min(amount, this._credits);
    this.setCredits(this._credits - toRemove);
    return toRemove;
  }

  /**
   * Check if player has enough credits on hand
   */
  hasCredits(amount: number): boolean {
    return this._credits >= amount;
  }

  /**
   * Set bank credits
   */
  setBankCredits(amount: number): void {
    const clamped = Math.max(0, Math.min(amount, this._maxBankCredits));
    if (this._bankCredits !== clamped) {
      this._bankCredits = clamped;
      this.deltaTrackerCont6.trackChange(InvProperty.BANK_CREDITS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Deposit credits to bank
   * @returns Actual amount deposited
   */
  depositCredits(amount: number): number {
    const toDeposit = Math.min(amount, this._credits, this._maxBankCredits - this._bankCredits);
    if (toDeposit > 0) {
      this.setCredits(this._credits - toDeposit);
      this.setBankCredits(this._bankCredits + toDeposit);
    }
    return toDeposit;
  }

  /**
   * Withdraw credits from bank
   * @returns Actual amount withdrawn
   */
  withdrawCredits(amount: number): number {
    const toWithdraw = Math.min(amount, this._bankCredits, this._maxCredits - this._credits);
    if (toWithdraw > 0) {
      this.setBankCredits(this._bankCredits - toWithdraw);
      this.setCredits(this._credits + toWithdraw);
    }
    return toWithdraw;
  }

  /**
   * Check if player has enough credits (combined)
   */
  hasTotalCredits(amount: number): boolean {
    return this.totalCredits >= amount;
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
      playerId: this._playerId.toString(),
      bankId: this._bankId.toString(),
      overflowEnabled: this._overflowEnabled,
      overflowCount: this._overflowItems.size,
      overflowItems: Array.from(this._overflowItems.values()).map((item) => ({
        itemId: item.itemId.toString(),
        templateCrc: item.templateCrc,
        volume: item.volume,
        addedAt: item.addedAt,
        expiresAt: item.expiresAt,
      })),
      encumbrance: {
        health: this._encumbranceHealth,
        action: this._encumbranceAction,
        mind: this._encumbranceMind,
      },
      credits: this._credits,
      bankCredits: this._bankCredits,
      totalCredits: this.totalCredits,
      equippedItems: Array.from(this._equippedItems).map((id) => id.toString()),
    };
  }
}
