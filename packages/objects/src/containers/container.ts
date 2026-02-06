/**
 * Container - Base class for all container objects
 * Provides core container functionality including capacity management,
 * item storage, named slots, and network delta tracking.
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { TangibleObject } from '../tangible-object.js';
import { ObjectType } from '../scene-object.js';
import { DeltaTracker, DeltaType } from '../deltas.js';
import {
  ContainerType,
  ContainerPermission,
  type ContainedItem,
  type SlotDefinition,
  type TransferResult,
  TransferResultCode,
  createSuccessResult,
  createFailureResult,
  DEFAULT_CONTAINER_CAPACITIES,
  DEFAULT_CONTAINER_VOLUMES,
  ContainerChangeType,
  type ContainerChangeEvent,
  SlotRestriction,
} from './container-types.js';

/**
 * CONT property indices for delta tracking
 * These match the variable indices in CONT baselines
 */
export const ContProperty = {
  // CONT3 (shared)
  CONTAINER_TYPE: 0,
  MAX_CAPACITY: 1,
  MAX_VOLUME: 2,
  CURRENT_VOLUME: 3,
  PERMISSIONS: 4,
  OWNER_ID: 5,
  CONTENTS_LIST: 6,
  SLOTS_MAP: 7,
  LOCKED: 8,
  // CONT6 (server)
  ARRANGEMENT_MAP: 0,
  SLOT_DEFINITIONS: 1,
} as const;

/**
 * Container - Base class for containers that hold items
 * Extends TangibleObject with container-specific functionality
 */
export class Container extends TangibleObject {
  // ============================================
  // Container Properties
  // ============================================

  /** Type of container */
  protected _containerType: ContainerType;

  /** Maximum number of items this container can hold */
  protected _maxCapacity: number;

  /** Maximum total volume of items this container can hold */
  protected _maxVolume: number;

  /** Map of item IDs to contained item info */
  protected _contents: Map<ObjectId, ContainedItem>;

  /** Map of slot names to item IDs */
  protected _slots: Map<string, ObjectId>;

  /** Access permission level */
  protected _permissions: ContainerPermission;

  /** Owner object ID */
  protected _containerOwnerId: ObjectId;

  /** Whether the container is locked */
  protected _locked: boolean;

  /** Slot definitions for named slots */
  protected _slotDefinitions: Map<string, SlotDefinition>;

  /** Next arrangement index */
  protected _nextArrangementIndex: number;

  // ============================================
  // Delta Tracking
  // ============================================

  /** Delta tracker for CONT3 */
  protected deltaTrackerCont3: DeltaTracker;

  /** Delta tracker for CONT6 */
  protected deltaTrackerCont6: DeltaTracker;

  /** Update counter for contents list */
  protected contentsUpdateCounter: number;

  /** Update counter for slots map */
  protected slotsUpdateCounter: number;

  /** Change event listeners */
  protected changeListeners: ((event: ContainerChangeEvent) => void)[];

  /**
   * Create a new Container
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the object template
   * @param containerType - Type of container
   */
  constructor(
    objectId: ObjectId,
    templateCrc: CrcValue = 0,
    containerType: ContainerType = ContainerType.Generic
  ) {
    super(objectId, templateCrc);

    this.objectType = ObjectType.Container;
    this._containerType = containerType;

    // Initialize capacity from defaults
    this._maxCapacity = DEFAULT_CONTAINER_CAPACITIES[containerType];
    this._maxVolume = DEFAULT_CONTAINER_VOLUMES[containerType];

    // Initialize storage
    this._contents = new Map();
    this._slots = new Map();
    this._slotDefinitions = new Map();

    // Initialize permissions
    this._permissions = ContainerPermission.Owner;
    this._containerOwnerId = 0n;
    this._locked = false;

    // Initialize arrangement
    this._nextArrangementIndex = 0;

    // Initialize delta tracking
    this.deltaTrackerCont3 = new DeltaTracker();
    this.deltaTrackerCont6 = new DeltaTracker();
    this.contentsUpdateCounter = 0;
    this.slotsUpdateCounter = 0;

    // Initialize listeners
    this.changeListeners = [];
  }

  /**
   * Get baseline type for container objects
   */
  override getBaselineType(): string {
    return 'CONT';
  }

  // ============================================
  // Getters
  // ============================================

  /** Get container type */
  get containerType(): ContainerType {
    return this._containerType;
  }

  /** Get maximum capacity */
  get maxCapacity(): number {
    return this._maxCapacity;
  }

  /** Get maximum volume */
  get maxVolume(): number {
    return this._maxVolume;
  }

  /** Get permissions */
  get permissions(): ContainerPermission {
    return this._permissions;
  }

  /** Get container owner ID */
  get containerOwnerId(): ObjectId {
    return this._containerOwnerId;
  }

  /** Get locked state */
  get locked(): boolean {
    return this._locked;
  }

  /** Get contents map (read-only) */
  get contents(): ReadonlyMap<ObjectId, ContainedItem> {
    return this._contents;
  }

  /** Get slots map (read-only) */
  get slots(): ReadonlyMap<string, ObjectId> {
    return this._slots;
  }

  // ============================================
  // Capacity Management
  // ============================================

  /**
   * Set maximum capacity
   */
  setMaxCapacity(capacity: number): void {
    if (this._maxCapacity !== capacity) {
      this._maxCapacity = Math.max(0, capacity);
      this.deltaTrackerCont3.trackChange(ContProperty.MAX_CAPACITY, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set maximum volume
   */
  setMaxVolume(volume: number): void {
    if (this._maxVolume !== volume) {
      this._maxVolume = Math.max(0, volume);
      this.deltaTrackerCont3.trackChange(ContProperty.MAX_VOLUME, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Get current item count
   */
  getCurrentCount(): number {
    return this._contents.size;
  }

  /**
   * Get current total volume of all items
   */
  getCurrentVolume(): number {
    let total = 0;
    for (const item of this._contents.values()) {
      total += item.volume;
    }
    return total;
  }

  /**
   * Get available capacity (remaining slots)
   */
  getAvailableCapacity(): number {
    return Math.max(0, this._maxCapacity - this._contents.size);
  }

  /**
   * Get available volume
   */
  getAvailableVolume(): number {
    return Math.max(0, this._maxVolume - this.getCurrentVolume());
  }

  /**
   * Check if container is full (by count)
   */
  isFull(): boolean {
    return this._contents.size >= this._maxCapacity;
  }

  /**
   * Check if container is empty
   */
  isEmpty(): boolean {
    return this._contents.size === 0;
  }

  // ============================================
  // Permission Management
  // ============================================

  /**
   * Set container permissions
   */
  setPermissions(permissions: ContainerPermission): void {
    if (this._permissions !== permissions) {
      this._permissions = permissions;
      this.deltaTrackerCont3.trackChange(ContProperty.PERMISSIONS, DeltaType.Change);
      this.emitChangeEvent({
        type: ContainerChangeType.PermissionChanged,
        containerId: this.objectId,
        timestamp: Date.now(),
      });
      this.markModified();
    }
  }

  /**
   * Set container owner
   */
  setContainerOwner(ownerId: ObjectId): void {
    if (this._containerOwnerId !== ownerId) {
      this._containerOwnerId = ownerId;
      // Also set the TangibleObject ownerId
      this.setOwner(ownerId);
      this.deltaTrackerCont3.trackChange(ContProperty.OWNER_ID, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set locked state
   */
  setLocked(locked: boolean): void {
    if (this._locked !== locked) {
      this._locked = locked;
      this.deltaTrackerCont3.trackChange(ContProperty.LOCKED, DeltaType.Change);
      this.emitChangeEvent({
        type: ContainerChangeType.LockStateChanged,
        containerId: this.objectId,
        timestamp: Date.now(),
      });
      this.markModified();
    }
  }

  /**
   * Check if an actor has permission to access this container
   */
  hasPermission(actorId: ObjectId, _actorGroupId?: ObjectId, _actorGuildId?: ObjectId): boolean {
    if (this._locked) {
      return false;
    }

    switch (this._permissions) {
      case ContainerPermission.None:
        return false;
      case ContainerPermission.Owner:
        return actorId === this._containerOwnerId;
      case ContainerPermission.Group:
        // Would need to check group membership
        return actorId === this._containerOwnerId;
      case ContainerPermission.Guild:
        // Would need to check guild membership
        return actorId === this._containerOwnerId;
      case ContainerPermission.Public:
        return true;
      case ContainerPermission.Admin:
        // Would need to check admin status
        return false;
      default:
        return actorId === this._containerOwnerId;
    }
  }

  // ============================================
  // Slot Definitions
  // ============================================

  /**
   * Add a slot definition
   */
  addSlotDefinition(definition: SlotDefinition): void {
    this._slotDefinitions.set(definition.name, definition);
    this.deltaTrackerCont6.trackMapChange(
      ContProperty.SLOT_DEFINITIONS,
      definition.name,
      definition,
      true
    );
    this.markModified();
  }

  /**
   * Remove a slot definition
   */
  removeSlotDefinition(slotName: string): void {
    if (this._slotDefinitions.has(slotName)) {
      this._slotDefinitions.delete(slotName);
      this.deltaTrackerCont6.trackMapRemove(ContProperty.SLOT_DEFINITIONS, slotName);
      this.markModified();
    }
  }

  /**
   * Get a slot definition
   */
  getSlotDefinition(slotName: string): SlotDefinition | undefined {
    return this._slotDefinitions.get(slotName);
  }

  /**
   * Get all slot definitions
   */
  getSlotDefinitions(): readonly SlotDefinition[] {
    return Array.from(this._slotDefinitions.values());
  }

  /**
   * Check if a slot exists
   */
  hasSlot(slotName: string): boolean {
    return this._slotDefinitions.has(slotName);
  }

  /**
   * Check if a slot is occupied
   */
  isSlotOccupied(slotName: string): boolean {
    return this._slots.has(slotName);
  }

  /**
   * Get item in a slot
   */
  getItemInSlot(slotName: string): ObjectId | undefined {
    return this._slots.get(slotName);
  }

  // ============================================
  // Item Management
  // ============================================

  /**
   * Check if an item can be added to this container
   */
  canAddItem(
    itemId: ObjectId,
    itemVolume: number,
    itemTemplateCrc: CrcValue,
    slot?: string
  ): TransferResult {
    // Check if container is locked
    if (this._locked) {
      return createFailureResult(
        TransferResultCode.ContainerLocked,
        'Container is locked',
        itemId,
        undefined,
        this.objectId
      );
    }

    // Check if item is already in this container
    if (this._contents.has(itemId)) {
      return createFailureResult(
        TransferResultCode.SameContainer,
        'Item is already in this container',
        itemId,
        this.objectId,
        this.objectId
      );
    }

    // Check slot if specified
    if (slot !== undefined) {
      const slotDef = this._slotDefinitions.get(slot);
      if (!slotDef) {
        return createFailureResult(
          TransferResultCode.InvalidSlot,
          `Slot '${slot}' does not exist`,
          itemId,
          undefined,
          this.objectId
        );
      }

      if (this._slots.has(slot)) {
        return createFailureResult(
          TransferResultCode.SlotOccupied,
          `Slot '${slot}' is already occupied`,
          itemId,
          undefined,
          this.objectId
        );
      }

      // Check slot restrictions
      if (!this.checkSlotRestriction(slotDef, itemTemplateCrc)) {
        return createFailureResult(
          TransferResultCode.SlotRestriction,
          `Item cannot be placed in slot '${slot}'`,
          itemId,
          undefined,
          this.objectId
        );
      }
    } else {
      // No slot specified, check general capacity
      if (this._contents.size >= this._maxCapacity) {
        return createFailureResult(
          TransferResultCode.TargetFull,
          'Container is full',
          itemId,
          undefined,
          this.objectId
        );
      }
    }

    // Check volume
    if (this.getCurrentVolume() + itemVolume > this._maxVolume) {
      return createFailureResult(
        TransferResultCode.VolumeExceeded,
        'Item is too large for this container',
        itemId,
        undefined,
        this.objectId
      );
    }

    return createSuccessResult(itemId, 0n, this.objectId, slot);
  }

  /**
   * Check if an item meets slot restrictions
   */
  protected checkSlotRestriction(slotDef: SlotDefinition, itemTemplateCrc: CrcValue): boolean {
    switch (slotDef.restriction) {
      case SlotRestriction.None:
        return true;
      case SlotRestriction.TemplateCrc:
        return slotDef.allowedTemplateCrcs?.includes(itemTemplateCrc) ?? false;
      case SlotRestriction.ObjectType:
        // Would need to check object type from template
        return true;
      default:
        // Other restrictions would need additional item info
        return true;
    }
  }

  /**
   * Add an item to this container
   */
  addItem(
    itemId: ObjectId,
    itemVolume: number,
    itemTemplateCrc: CrcValue,
    slot?: string
  ): TransferResult {
    // Validate the add
    const checkResult = this.canAddItem(itemId, itemVolume, itemTemplateCrc, slot);
    if (!checkResult.success) {
      return checkResult;
    }

    // Create contained item info
    const containedItem: ContainedItem = {
      itemId,
      templateCrc: itemTemplateCrc,
      volume: itemVolume,
      slot,
      arrangementIndex: this._nextArrangementIndex++,
      addedAt: Date.now(),
    };

    // Add to contents
    this._contents.set(itemId, containedItem);
    this.contentsUpdateCounter++;
    this.deltaTrackerCont3.trackMapChange(
      ContProperty.CONTENTS_LIST,
      itemId,
      containedItem,
      true
    );

    // Add to slot if specified
    if (slot !== undefined) {
      this._slots.set(slot, itemId);
      this.slotsUpdateCounter++;
      this.deltaTrackerCont3.trackMapChange(ContProperty.SLOTS_MAP, slot, itemId, true);
    }

    // Track current volume change
    this.deltaTrackerCont3.trackChange(ContProperty.CURRENT_VOLUME, DeltaType.Change);

    // Emit change event
    this.emitChangeEvent({
      type: ContainerChangeType.ItemAdded,
      containerId: this.objectId,
      itemId,
      slot,
      timestamp: Date.now(),
    });

    this.markModified();

    return createSuccessResult(itemId, 0n, this.objectId, slot);
  }

  /**
   * Remove an item from this container
   */
  removeItem(itemId: ObjectId): TransferResult {
    const containedItem = this._contents.get(itemId);
    if (!containedItem) {
      return createFailureResult(
        TransferResultCode.ItemNotFound,
        'Item not found in container',
        itemId,
        this.objectId
      );
    }

    // Check if container is locked
    if (this._locked) {
      return createFailureResult(
        TransferResultCode.ContainerLocked,
        'Container is locked',
        itemId,
        this.objectId
      );
    }

    const previousSlot = containedItem.slot;

    // Remove from slot if applicable
    if (previousSlot !== undefined) {
      this._slots.delete(previousSlot);
      this.slotsUpdateCounter++;
      this.deltaTrackerCont3.trackMapRemove(ContProperty.SLOTS_MAP, previousSlot);
    }

    // Remove from contents
    this._contents.delete(itemId);
    this.contentsUpdateCounter++;
    this.deltaTrackerCont3.trackMapRemove(ContProperty.CONTENTS_LIST, itemId);

    // Track current volume change
    this.deltaTrackerCont3.trackChange(ContProperty.CURRENT_VOLUME, DeltaType.Change);

    // Emit change event
    this.emitChangeEvent({
      type: ContainerChangeType.ItemRemoved,
      containerId: this.objectId,
      itemId,
      previousSlot,
      timestamp: Date.now(),
    });

    this.markModified();

    return createSuccessResult(itemId, this.objectId, 0n, undefined, previousSlot);
  }

  /**
   * Transfer an item to another container
   */
  transferTo(
    targetContainer: Container,
    itemId: ObjectId,
    targetSlot?: string
  ): TransferResult {
    // Get the item
    const containedItem = this._contents.get(itemId);
    if (!containedItem) {
      return createFailureResult(
        TransferResultCode.ItemNotFound,
        'Item not found in source container',
        itemId,
        this.objectId,
        targetContainer.objectId
      );
    }

    // Check if same container
    if (targetContainer.objectId === this.objectId) {
      // Same container - move between slots
      return this.moveToSlot(itemId, targetSlot);
    }

    // Check if target can accept the item
    const canAdd = targetContainer.canAddItem(
      itemId,
      containedItem.volume,
      containedItem.templateCrc,
      targetSlot
    );
    if (!canAdd.success) {
      return canAdd;
    }

    // Remove from this container
    const removeResult = this.removeItem(itemId);
    if (!removeResult.success) {
      return removeResult;
    }

    // Add to target container
    const addResult = targetContainer.addItem(
      itemId,
      containedItem.volume,
      containedItem.templateCrc,
      targetSlot
    );

    if (!addResult.success) {
      // Rollback - add back to this container
      this.addItem(
        itemId,
        containedItem.volume,
        containedItem.templateCrc,
        containedItem.slot
      );
      return addResult;
    }

    return createSuccessResult(
      itemId,
      this.objectId,
      targetContainer.objectId,
      targetSlot,
      removeResult.previousSlot
    );
  }

  /**
   * Move an item to a different slot within this container
   */
  moveToSlot(itemId: ObjectId, newSlot?: string): TransferResult {
    const containedItem = this._contents.get(itemId);
    if (!containedItem) {
      return createFailureResult(
        TransferResultCode.ItemNotFound,
        'Item not found in container',
        itemId,
        this.objectId,
        this.objectId
      );
    }

    const previousSlot = containedItem.slot;

    // Same slot - no change needed
    if (previousSlot === newSlot) {
      return createSuccessResult(itemId, this.objectId, this.objectId, newSlot, previousSlot);
    }

    // Check new slot
    if (newSlot !== undefined) {
      const slotDef = this._slotDefinitions.get(newSlot);
      if (!slotDef) {
        return createFailureResult(
          TransferResultCode.InvalidSlot,
          `Slot '${newSlot}' does not exist`,
          itemId,
          this.objectId,
          this.objectId
        );
      }

      if (this._slots.has(newSlot)) {
        return createFailureResult(
          TransferResultCode.SlotOccupied,
          `Slot '${newSlot}' is already occupied`,
          itemId,
          this.objectId,
          this.objectId
        );
      }

      if (!this.checkSlotRestriction(slotDef, containedItem.templateCrc)) {
        return createFailureResult(
          TransferResultCode.SlotRestriction,
          `Item cannot be placed in slot '${newSlot}'`,
          itemId,
          this.objectId,
          this.objectId
        );
      }
    }

    // Remove from old slot
    if (previousSlot !== undefined) {
      this._slots.delete(previousSlot);
      this.deltaTrackerCont3.trackMapRemove(ContProperty.SLOTS_MAP, previousSlot);
    }

    // Add to new slot
    if (newSlot !== undefined) {
      this._slots.set(newSlot, itemId);
      this.deltaTrackerCont3.trackMapChange(ContProperty.SLOTS_MAP, newSlot, itemId, true);
    }

    // Update contained item
    containedItem.slot = newSlot;
    this.slotsUpdateCounter++;

    // Emit change event
    this.emitChangeEvent({
      type: ContainerChangeType.ItemMoved,
      containerId: this.objectId,
      itemId,
      slot: newSlot,
      previousSlot,
      timestamp: Date.now(),
    });

    this.markModified();

    return createSuccessResult(itemId, this.objectId, this.objectId, newSlot, previousSlot);
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Get all contents as an array
   */
  getContents(): readonly ContainedItem[] {
    return Array.from(this._contents.values());
  }

  /**
   * Get all item IDs
   */
  getItemIds(): ObjectId[] {
    return Array.from(this._contents.keys());
  }

  /**
   * Check if container has an item
   */
  hasItem(itemId: ObjectId): boolean {
    return this._contents.has(itemId);
  }

  /**
   * Get contained item info
   */
  getItem(itemId: ObjectId): ContainedItem | undefined {
    return this._contents.get(itemId);
  }

  /**
   * Find items matching a predicate
   */
  findItem(predicate: (item: ContainedItem) => boolean): ContainedItem | undefined {
    for (const item of this._contents.values()) {
      if (predicate(item)) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * Find all items matching a predicate
   */
  findItems(predicate: (item: ContainedItem) => boolean): ContainedItem[] {
    const results: ContainedItem[] = [];
    for (const item of this._contents.values()) {
      if (predicate(item)) {
        results.push(item);
      }
    }
    return results;
  }

  /**
   * Find item by template CRC
   */
  findItemByTemplate(templateCrc: CrcValue): ContainedItem | undefined {
    return this.findItem((item) => item.templateCrc === templateCrc);
  }

  /**
   * Find all items by template CRC
   */
  findItemsByTemplate(templateCrc: CrcValue): ContainedItem[] {
    return this.findItems((item) => item.templateCrc === templateCrc);
  }

  /**
   * Count items by template CRC
   */
  countItemsByTemplate(templateCrc: CrcValue): number {
    let count = 0;
    for (const item of this._contents.values()) {
      if (item.templateCrc === templateCrc) {
        count++;
      }
    }
    return count;
  }

  // ============================================
  // Change Event System
  // ============================================

  /**
   * Add a change listener
   */
  addChangeListener(listener: (event: ContainerChangeEvent) => void): void {
    this.changeListeners.push(listener);
  }

  /**
   * Remove a change listener
   */
  removeChangeListener(listener: (event: ContainerChangeEvent) => void): void {
    const index = this.changeListeners.indexOf(listener);
    if (index !== -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  /**
   * Emit a change event to all listeners
   */
  protected emitChangeEvent(event: ContainerChangeEvent): void {
    for (const listener of this.changeListeners) {
      try {
        listener(event);
      } catch (error) {
        // Ignore listener errors
      }
    }
  }

  // ============================================
  // Delta Tracking
  // ============================================

  /**
   * Check if CONT3 has changes
   */
  hasCont3Changes(): boolean {
    return this.deltaTrackerCont3.hasChanges();
  }

  /**
   * Check if CONT6 has changes
   */
  hasCont6Changes(): boolean {
    return this.deltaTrackerCont6.hasChanges();
  }

  /**
   * Get CONT3 delta tracker
   */
  getCont3DeltaTracker(): DeltaTracker {
    return this.deltaTrackerCont3;
  }

  /**
   * Get CONT6 delta tracker
   */
  getCont6DeltaTracker(): DeltaTracker {
    return this.deltaTrackerCont6;
  }

  /**
   * Get contents update counter
   */
  getContentsUpdateCounter(): number {
    return this.contentsUpdateCounter;
  }

  /**
   * Get slots update counter
   */
  getSlotsUpdateCounter(): number {
    return this.slotsUpdateCounter;
  }

  /**
   * Clear all delta trackers
   */
  clearAllContainerDeltas(): void {
    this.deltaTrackerCont3.clear();
    this.deltaTrackerCont6.clear();
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
      containerType: this._containerType,
      maxCapacity: this._maxCapacity,
      maxVolume: this._maxVolume,
      currentCount: this.getCurrentCount(),
      currentVolume: this.getCurrentVolume(),
      permissions: this._permissions,
      containerOwnerId: this._containerOwnerId.toString(),
      locked: this._locked,
      contents: Array.from(this._contents.values()).map((item) => ({
        itemId: item.itemId.toString(),
        templateCrc: item.templateCrc,
        volume: item.volume,
        slot: item.slot,
        arrangementIndex: item.arrangementIndex,
        addedAt: item.addedAt,
      })),
      slots: Object.fromEntries(
        Array.from(this._slots.entries()).map(([k, v]) => [k, v.toString()])
      ),
      slotDefinitions: Array.from(this._slotDefinitions.values()),
    };
  }
}
