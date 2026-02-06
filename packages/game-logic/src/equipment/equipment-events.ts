/**
 * Equipment Events
 * Event types for equipment system changes
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import type { EquipmentSlotType } from './equipment-slots.js';

/**
 * Event type identifiers
 */
export const EquipmentEventType = {
  /** An item was equipped */
  ITEM_EQUIPPED: 'equipment:item_equipped',
  /** An item was unequipped */
  ITEM_UNEQUIPPED: 'equipment:item_unequipped',
  /** The active weapon changed */
  WEAPON_CHANGED: 'equipment:weapon_changed',
  /** Equipment encumbrance changed */
  ENCUMBRANCE_CHANGED: 'equipment:encumbrance_changed',
  /** Appearance updated */
  APPEARANCE_CHANGED: 'equipment:appearance_changed',
  /** Equipment slot unlocked */
  SLOT_UNLOCKED: 'equipment:slot_unlocked',
} as const;

export type EquipmentEventTypeValue =
  (typeof EquipmentEventType)[keyof typeof EquipmentEventType];

/**
 * Base event interface
 */
export interface BaseEquipmentEvent {
  /** Event type identifier */
  type: EquipmentEventTypeValue;
  /** Player/creature who owns the equipment */
  playerId: ObjectId;
  /** Timestamp when the event occurred */
  timestamp: number;
}

/**
 * Event emitted when an item is equipped
 */
export interface ItemEquippedEvent extends BaseEquipmentEvent {
  type: typeof EquipmentEventType.ITEM_EQUIPPED;
  /** The item that was equipped */
  itemId: ObjectId;
  /** The slot the item was equipped to */
  slot: EquipmentSlotType;
  /** Template CRC of the item */
  templateCrc: CrcValue;
  /** Item's appearance data (for visual update) */
  appearanceData?: Uint8Array | undefined;
}

/**
 * Event emitted when an item is unequipped
 */
export interface ItemUnequippedEvent extends BaseEquipmentEvent {
  type: typeof EquipmentEventType.ITEM_UNEQUIPPED;
  /** The item that was unequipped */
  itemId: ObjectId;
  /** The slot the item was unequipped from */
  slot: EquipmentSlotType;
  /** Whether the item was returned to inventory */
  returnedToInventory: boolean;
}

/**
 * Event emitted when the active weapon changes
 */
export interface WeaponChangedEvent extends BaseEquipmentEvent {
  type: typeof EquipmentEventType.WEAPON_CHANGED;
  /** Previous weapon ID (0 if none) */
  previousWeaponId: ObjectId;
  /** New weapon ID (0 if none) */
  newWeaponId: ObjectId;
  /** Slot of the new weapon */
  slot: EquipmentSlotType;
  /** New weapon template CRC */
  templateCrc?: CrcValue | undefined;
}

/**
 * Event emitted when encumbrance changes
 */
export interface EncumbranceChangedEvent extends BaseEquipmentEvent {
  type: typeof EquipmentEventType.ENCUMBRANCE_CHANGED;
  /** Previous health encumbrance */
  previousHealthEncumbrance: number;
  /** New health encumbrance */
  newHealthEncumbrance: number;
  /** Previous action encumbrance */
  previousActionEncumbrance: number;
  /** New action encumbrance */
  newActionEncumbrance: number;
  /** Previous mind encumbrance */
  previousMindEncumbrance: number;
  /** New mind encumbrance */
  newMindEncumbrance: number;
}

/**
 * Event emitted when appearance changes
 */
export interface AppearanceChangedEvent extends BaseEquipmentEvent {
  type: typeof EquipmentEventType.APPEARANCE_CHANGED;
  /** Slots that changed */
  changedSlots: EquipmentSlotType[];
  /** Whether this is a full appearance update */
  fullUpdate: boolean;
}

/**
 * Event emitted when an equipment slot is unlocked
 */
export interface SlotUnlockedEvent extends BaseEquipmentEvent {
  type: typeof EquipmentEventType.SLOT_UNLOCKED;
  /** The slot that was unlocked */
  slot: EquipmentSlotType;
  /** Skill that unlocked the slot */
  unlockedBySkill: string;
}

/**
 * Union type of all equipment events
 */
export type EquipmentEvent =
  | ItemEquippedEvent
  | ItemUnequippedEvent
  | WeaponChangedEvent
  | EncumbranceChangedEvent
  | AppearanceChangedEvent
  | SlotUnlockedEvent;

/**
 * Create an item equipped event
 */
export function createItemEquippedEvent(
  playerId: ObjectId,
  itemId: ObjectId,
  slot: EquipmentSlotType,
  templateCrc: CrcValue,
  appearanceData?: Uint8Array
): ItemEquippedEvent {
  return {
    type: EquipmentEventType.ITEM_EQUIPPED,
    playerId,
    timestamp: Date.now(),
    itemId,
    slot,
    templateCrc,
    appearanceData,
  };
}

/**
 * Create an item unequipped event
 */
export function createItemUnequippedEvent(
  playerId: ObjectId,
  itemId: ObjectId,
  slot: EquipmentSlotType,
  returnedToInventory: boolean = true
): ItemUnequippedEvent {
  return {
    type: EquipmentEventType.ITEM_UNEQUIPPED,
    playerId,
    timestamp: Date.now(),
    itemId,
    slot,
    returnedToInventory,
  };
}

/**
 * Create a weapon changed event
 */
export function createWeaponChangedEvent(
  playerId: ObjectId,
  previousWeaponId: ObjectId,
  newWeaponId: ObjectId,
  slot: EquipmentSlotType,
  templateCrc?: CrcValue
): WeaponChangedEvent {
  return {
    type: EquipmentEventType.WEAPON_CHANGED,
    playerId,
    timestamp: Date.now(),
    previousWeaponId,
    newWeaponId,
    slot,
    templateCrc,
  };
}

/**
 * Create an encumbrance changed event
 */
export function createEncumbranceChangedEvent(
  playerId: ObjectId,
  previousHealth: number,
  newHealth: number,
  previousAction: number,
  newAction: number,
  previousMind: number,
  newMind: number
): EncumbranceChangedEvent {
  return {
    type: EquipmentEventType.ENCUMBRANCE_CHANGED,
    playerId,
    timestamp: Date.now(),
    previousHealthEncumbrance: previousHealth,
    newHealthEncumbrance: newHealth,
    previousActionEncumbrance: previousAction,
    newActionEncumbrance: newAction,
    previousMindEncumbrance: previousMind,
    newMindEncumbrance: newMind,
  };
}

/**
 * Create an appearance changed event
 */
export function createAppearanceChangedEvent(
  playerId: ObjectId,
  changedSlots: EquipmentSlotType[],
  fullUpdate: boolean = false
): AppearanceChangedEvent {
  return {
    type: EquipmentEventType.APPEARANCE_CHANGED,
    playerId,
    timestamp: Date.now(),
    changedSlots,
    fullUpdate,
  };
}

/**
 * Create a slot unlocked event
 */
export function createSlotUnlockedEvent(
  playerId: ObjectId,
  slot: EquipmentSlotType,
  unlockedBySkill: string
): SlotUnlockedEvent {
  return {
    type: EquipmentEventType.SLOT_UNLOCKED,
    playerId,
    timestamp: Date.now(),
    slot,
    unlockedBySkill,
  };
}

/**
 * Event handler type for equipment events
 */
export type EquipmentEventHandler<T extends EquipmentEvent = EquipmentEvent> = (
  event: T
) => void | Promise<void>;

/**
 * Equipment event emitter interface
 */
export interface EquipmentEventEmitter {
  /** Register an event handler */
  on<T extends EquipmentEvent>(
    type: T['type'],
    handler: EquipmentEventHandler<T>
  ): void;

  /** Remove an event handler */
  off<T extends EquipmentEvent>(
    type: T['type'],
    handler: EquipmentEventHandler<T>
  ): void;

  /** Emit an event */
  emit(event: EquipmentEvent): void;
}

/**
 * Simple equipment event emitter implementation
 */
export class SimpleEquipmentEventEmitter implements EquipmentEventEmitter {
  private handlers: Map<string, Set<EquipmentEventHandler>> = new Map();

  on<T extends EquipmentEvent>(
    type: T['type'],
    handler: EquipmentEventHandler<T>
  ): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as EquipmentEventHandler);
  }

  off<T extends EquipmentEvent>(
    type: T['type'],
    handler: EquipmentEventHandler<T>
  ): void {
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.delete(handler as EquipmentEventHandler);
    }
  }

  emit(event: EquipmentEvent): void {
    const typeHandlers = this.handlers.get(event.type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in equipment event handler for ${event.type}:`, error);
        }
      }
    }
  }

  /**
   * Remove all handlers
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Remove all handlers for a specific event type
   */
  clearType(type: EquipmentEventTypeValue): void {
    this.handlers.delete(type);
  }
}

/**
 * Create a new equipment event emitter
 */
export function createEquipmentEventEmitter(): EquipmentEventEmitter {
  return new SimpleEquipmentEventEmitter();
}
