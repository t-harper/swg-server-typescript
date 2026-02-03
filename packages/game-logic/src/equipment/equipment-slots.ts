/**
 * Equipment Slot System
 * Extends and re-exports equipment slots from @swg/objects with additional
 * utility functions for slot management, capacities, and paper doll UI arrangement.
 */

import type { ObjectId } from '@swg/shared-types';
import { EquipmentSlot, type EquipmentSlotType } from '@swg/objects';

// Re-export the core EquipmentSlot from @swg/objects
export { EquipmentSlot, type EquipmentSlotType } from '@swg/objects';

/**
 * Extended equipment slots for weapon handling
 * These map to the RIGHT_HAND and LEFT_HAND slots for weapons
 */
export const WeaponSlot = {
  /** Primary weapon slot (uses RIGHT_HAND) */
  PRIMARY: EquipmentSlot.RIGHT_HAND,
  /** Secondary weapon slot (uses LEFT_HAND) */
  SECONDARY: EquipmentSlot.LEFT_HAND,
} as const;

/**
 * Slot capacity configuration
 * Defines how many items can be equipped in each slot type
 */
export interface SlotCapacity {
  /** The slot this capacity applies to */
  slot: EquipmentSlotType;
  /** Maximum number of items that can be equipped in this slot */
  maxItems: number;
  /** Whether this slot can hold multiple item types */
  multiType: boolean;
}

/**
 * Default slot capacities for all equipment slots
 */
export const DEFAULT_SLOT_CAPACITIES: Partial<Record<EquipmentSlotType, SlotCapacity>> = {
  [EquipmentSlot.HEAD]: { slot: EquipmentSlot.HEAD, maxItems: 1, multiType: true },
  [EquipmentSlot.CHEST]: { slot: EquipmentSlot.CHEST, maxItems: 1, multiType: true },
  [EquipmentSlot.LEGS]: { slot: EquipmentSlot.LEGS, maxItems: 1, multiType: true },
  [EquipmentSlot.FEET]: { slot: EquipmentSlot.FEET, maxItems: 1, multiType: true },
  [EquipmentSlot.HANDS]: { slot: EquipmentSlot.HANDS, maxItems: 1, multiType: true },
  [EquipmentSlot.BACK]: { slot: EquipmentSlot.BACK, maxItems: 1, multiType: true },
  [EquipmentSlot.RIGHT_HAND]: { slot: EquipmentSlot.RIGHT_HAND, maxItems: 1, multiType: true },
  [EquipmentSlot.LEFT_HAND]: { slot: EquipmentSlot.LEFT_HAND, maxItems: 1, multiType: true },
  [EquipmentSlot.NECKLACE]: { slot: EquipmentSlot.NECKLACE, maxItems: 1, multiType: false },
  [EquipmentSlot.RING_LEFT]: { slot: EquipmentSlot.RING_LEFT, maxItems: 1, multiType: false },
  [EquipmentSlot.RING_RIGHT]: { slot: EquipmentSlot.RING_RIGHT, maxItems: 1, multiType: false },
  [EquipmentSlot.EARRING_LEFT]: { slot: EquipmentSlot.EARRING_LEFT, maxItems: 1, multiType: false },
  [EquipmentSlot.EARRING_RIGHT]: { slot: EquipmentSlot.EARRING_RIGHT, maxItems: 1, multiType: false },
  [EquipmentSlot.BRACELET_LEFT]: { slot: EquipmentSlot.BRACELET_LEFT, maxItems: 1, multiType: false },
  [EquipmentSlot.BRACELET_RIGHT]: { slot: EquipmentSlot.BRACELET_RIGHT, maxItems: 1, multiType: false },
  [EquipmentSlot.BICEP_LEFT]: { slot: EquipmentSlot.BICEP_LEFT, maxItems: 1, multiType: false },
  [EquipmentSlot.BICEP_RIGHT]: { slot: EquipmentSlot.BICEP_RIGHT, maxItems: 1, multiType: false },
  [EquipmentSlot.BELT]: { slot: EquipmentSlot.BELT, maxItems: 1, multiType: false },
  [EquipmentSlot.CLOAK]: { slot: EquipmentSlot.CLOAK, maxItems: 1, multiType: false },
  [EquipmentSlot.UTILITY_BELT]: { slot: EquipmentSlot.UTILITY_BELT, maxItems: 1, multiType: false },
  [EquipmentSlot.BANK]: { slot: EquipmentSlot.BANK, maxItems: 1, multiType: false },
  [EquipmentSlot.DATAPAD]: { slot: EquipmentSlot.DATAPAD, maxItems: 1, multiType: false },
  [EquipmentSlot.MISSION_BAG]: { slot: EquipmentSlot.MISSION_BAG, maxItems: 1, multiType: false },
};

/**
 * Slot arrangement position for paper doll UI
 */
export interface SlotArrangement {
  /** The equipment slot */
  slot: EquipmentSlotType;
  /** X position on paper doll (0-100) */
  x: number;
  /** Y position on paper doll (0-100) */
  y: number;
  /** Display width */
  width: number;
  /** Display height */
  height: number;
  /** Display order (higher = on top) */
  layer: number;
  /** Human-readable slot name */
  displayName: string;
}

/**
 * Paper doll slot arrangements
 * Positions slots on the character equipment UI
 */
export const SLOT_ARRANGEMENTS: Partial<Record<EquipmentSlotType, SlotArrangement>> = {
  // Head area
  [EquipmentSlot.HEAD]: {
    slot: EquipmentSlot.HEAD,
    x: 50,
    y: 5,
    width: 20,
    height: 15,
    layer: 10,
    displayName: 'Head',
  },
  [EquipmentSlot.EARRING_LEFT]: {
    slot: EquipmentSlot.EARRING_LEFT,
    x: 30,
    y: 8,
    width: 8,
    height: 8,
    layer: 11,
    displayName: 'Left Earring',
  },
  [EquipmentSlot.EARRING_RIGHT]: {
    slot: EquipmentSlot.EARRING_RIGHT,
    x: 70,
    y: 8,
    width: 8,
    height: 8,
    layer: 11,
    displayName: 'Right Earring',
  },

  // Neck area
  [EquipmentSlot.NECKLACE]: {
    slot: EquipmentSlot.NECKLACE,
    x: 50,
    y: 20,
    width: 12,
    height: 8,
    layer: 12,
    displayName: 'Necklace',
  },

  // Torso area
  [EquipmentSlot.CHEST]: {
    slot: EquipmentSlot.CHEST,
    x: 50,
    y: 35,
    width: 25,
    height: 20,
    layer: 5,
    displayName: 'Chest',
  },
  [EquipmentSlot.BACK]: {
    slot: EquipmentSlot.BACK,
    x: 85,
    y: 30,
    width: 12,
    height: 18,
    layer: 3,
    displayName: 'Back',
  },
  [EquipmentSlot.CLOAK]: {
    slot: EquipmentSlot.CLOAK,
    x: 85,
    y: 20,
    width: 12,
    height: 12,
    layer: 2,
    displayName: 'Cloak',
  },

  // Arm area
  [EquipmentSlot.BRACELET_LEFT]: {
    slot: EquipmentSlot.BRACELET_LEFT,
    x: 20,
    y: 45,
    width: 10,
    height: 12,
    layer: 6,
    displayName: 'Left Bracer',
  },
  [EquipmentSlot.BRACELET_RIGHT]: {
    slot: EquipmentSlot.BRACELET_RIGHT,
    x: 80,
    y: 45,
    width: 10,
    height: 12,
    layer: 6,
    displayName: 'Right Bracer',
  },
  [EquipmentSlot.BICEP_LEFT]: {
    slot: EquipmentSlot.BICEP_LEFT,
    x: 25,
    y: 32,
    width: 10,
    height: 10,
    layer: 7,
    displayName: 'Left Bicep',
  },
  [EquipmentSlot.BICEP_RIGHT]: {
    slot: EquipmentSlot.BICEP_RIGHT,
    x: 75,
    y: 32,
    width: 10,
    height: 10,
    layer: 7,
    displayName: 'Right Bicep',
  },

  // Hand area
  [EquipmentSlot.HANDS]: {
    slot: EquipmentSlot.HANDS,
    x: 50,
    y: 55,
    width: 10,
    height: 10,
    layer: 8,
    displayName: 'Gloves',
  },
  [EquipmentSlot.LEFT_HAND]: {
    slot: EquipmentSlot.LEFT_HAND,
    x: 15,
    y: 55,
    width: 10,
    height: 10,
    layer: 8,
    displayName: 'Left Hand',
  },
  [EquipmentSlot.RIGHT_HAND]: {
    slot: EquipmentSlot.RIGHT_HAND,
    x: 85,
    y: 55,
    width: 10,
    height: 10,
    layer: 8,
    displayName: 'Right Hand',
  },
  [EquipmentSlot.RING_LEFT]: {
    slot: EquipmentSlot.RING_LEFT,
    x: 10,
    y: 58,
    width: 6,
    height: 6,
    layer: 9,
    displayName: 'Left Ring',
  },
  [EquipmentSlot.RING_RIGHT]: {
    slot: EquipmentSlot.RING_RIGHT,
    x: 90,
    y: 58,
    width: 6,
    height: 6,
    layer: 9,
    displayName: 'Right Ring',
  },

  // Waist area
  [EquipmentSlot.BELT]: {
    slot: EquipmentSlot.BELT,
    x: 50,
    y: 55,
    width: 20,
    height: 8,
    layer: 6,
    displayName: 'Belt',
  },
  [EquipmentSlot.UTILITY_BELT]: {
    slot: EquipmentSlot.UTILITY_BELT,
    x: 50,
    y: 60,
    width: 20,
    height: 8,
    layer: 7,
    displayName: 'Utility Belt',
  },

  // Leg area
  [EquipmentSlot.LEGS]: {
    slot: EquipmentSlot.LEGS,
    x: 50,
    y: 68,
    width: 22,
    height: 18,
    layer: 4,
    displayName: 'Legs',
  },

  // Foot area
  [EquipmentSlot.FEET]: {
    slot: EquipmentSlot.FEET,
    x: 50,
    y: 90,
    width: 20,
    height: 10,
    layer: 5,
    displayName: 'Boots',
  },

  // Special slots (inventory panel)
  [EquipmentSlot.BANK]: {
    slot: EquipmentSlot.BANK,
    x: 95,
    y: 70,
    width: 10,
    height: 10,
    layer: 1,
    displayName: 'Bank',
  },
  [EquipmentSlot.DATAPAD]: {
    slot: EquipmentSlot.DATAPAD,
    x: 95,
    y: 82,
    width: 10,
    height: 10,
    layer: 1,
    displayName: 'Datapad',
  },
  [EquipmentSlot.MISSION_BAG]: {
    slot: EquipmentSlot.MISSION_BAG,
    x: 95,
    y: 94,
    width: 10,
    height: 10,
    layer: 1,
    displayName: 'Mission Bag',
  },
};

/**
 * Get slot capacity for a specific slot
 */
export function getSlotCapacity(slot: EquipmentSlotType): SlotCapacity | undefined {
  return DEFAULT_SLOT_CAPACITIES[slot];
}

/**
 * Get slot arrangement for a specific slot
 */
export function getSlotArrangement(slot: EquipmentSlotType): SlotArrangement | undefined {
  return SLOT_ARRANGEMENTS[slot];
}

/**
 * Get human-readable name for a slot
 */
export function getSlotDisplayName(slot: EquipmentSlotType): string {
  return SLOT_ARRANGEMENTS[slot]?.displayName ?? 'Unknown';
}

/**
 * Check if a slot is a weapon slot
 */
export function isWeaponSlot(slot: EquipmentSlotType): boolean {
  return slot === EquipmentSlot.RIGHT_HAND || slot === EquipmentSlot.LEFT_HAND;
}

/**
 * Check if a slot is an armor slot
 */
export function isArmorSlot(slot: EquipmentSlotType): boolean {
  const armorSlots: EquipmentSlotType[] = [
    EquipmentSlot.HEAD,
    EquipmentSlot.CHEST,
    EquipmentSlot.LEGS,
    EquipmentSlot.FEET,
    EquipmentSlot.HANDS,
    EquipmentSlot.BRACELET_LEFT,
    EquipmentSlot.BRACELET_RIGHT,
    EquipmentSlot.BICEP_LEFT,
    EquipmentSlot.BICEP_RIGHT,
  ];
  return armorSlots.includes(slot);
}

/**
 * Check if a slot is a jewelry slot
 */
export function isJewelrySlot(slot: EquipmentSlotType): boolean {
  const jewelrySlots: EquipmentSlotType[] = [
    EquipmentSlot.NECKLACE,
    EquipmentSlot.EARRING_LEFT,
    EquipmentSlot.EARRING_RIGHT,
    EquipmentSlot.RING_LEFT,
    EquipmentSlot.RING_RIGHT,
  ];
  return jewelrySlots.includes(slot);
}

/**
 * Check if a slot is a special/container slot
 */
export function isSpecialSlot(slot: EquipmentSlotType): boolean {
  return (
    slot === EquipmentSlot.BANK ||
    slot === EquipmentSlot.DATAPAD ||
    slot === EquipmentSlot.MISSION_BAG
  );
}

/**
 * Get all visible slots (excluding special slots and inventory)
 */
export function getVisibleSlots(): EquipmentSlotType[] {
  return Object.values(EquipmentSlot).filter(
    (slot) =>
      typeof slot === 'number' &&
      slot !== EquipmentSlot.INVENTORY &&
      !isSpecialSlot(slot as EquipmentSlotType)
  ) as EquipmentSlotType[];
}

/**
 * Get paired slot (for left/right equipment)
 */
export function getPairedSlot(slot: EquipmentSlotType): EquipmentSlotType | null {
  const pairs: Record<number, EquipmentSlotType> = {
    [EquipmentSlot.BRACELET_LEFT]: EquipmentSlot.BRACELET_RIGHT,
    [EquipmentSlot.BRACELET_RIGHT]: EquipmentSlot.BRACELET_LEFT,
    [EquipmentSlot.BICEP_LEFT]: EquipmentSlot.BICEP_RIGHT,
    [EquipmentSlot.BICEP_RIGHT]: EquipmentSlot.BICEP_LEFT,
    [EquipmentSlot.RING_LEFT]: EquipmentSlot.RING_RIGHT,
    [EquipmentSlot.RING_RIGHT]: EquipmentSlot.RING_LEFT,
    [EquipmentSlot.EARRING_LEFT]: EquipmentSlot.EARRING_RIGHT,
    [EquipmentSlot.EARRING_RIGHT]: EquipmentSlot.EARRING_LEFT,
    [EquipmentSlot.LEFT_HAND]: EquipmentSlot.RIGHT_HAND,
    [EquipmentSlot.RIGHT_HAND]: EquipmentSlot.LEFT_HAND,
  };
  return pairs[slot] ?? null;
}

/**
 * Equipped item entry with slot information
 */
export interface EquippedItem {
  /** The item's object ID */
  objectId: ObjectId;
  /** The slot the item is equipped in */
  slot: EquipmentSlotType;
  /** Template CRC of the item */
  templateCrc: number;
  /** Custom appearance data */
  appearanceData?: Uint8Array;
}
