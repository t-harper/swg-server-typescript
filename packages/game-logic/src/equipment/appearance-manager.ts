/**
 * Appearance Manager
 * Handles visual updates for equipped items and character appearance
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import type { TangibleObject } from '@swg/objects';
import { BufferWriter } from '@swg/protocol';
import {
  EquipmentSlot,
  type EquipmentSlotType,
  type EquippedItem,
  isSpecialSlot,
  getVisibleSlots,
  SLOT_ARRANGEMENTS,
} from './equipment-slots.js';

/**
 * Appearance data for a character
 */
export interface CharacterAppearance {
  /** Player's object ID */
  playerId: ObjectId;
  /** Equipped visible items */
  visibleItems: EquippedItem[];
  /** Costume/appearance-only items */
  costumeItems: EquippedItem[];
  /** Current weapon appearance */
  weaponAppearance: WeaponAppearance | null;
  /** Hair style template CRC */
  hairStyleCrc: CrcValue;
  /** Customization data (skin color, hair color, etc.) */
  customization: Uint8Array;
}

/**
 * Weapon appearance data
 */
export interface WeaponAppearance {
  /** Weapon object ID */
  weaponId: ObjectId;
  /** Weapon template CRC */
  templateCrc: CrcValue;
  /** Which slot the weapon is in */
  slot: EquipmentSlotType;
  /** Custom appearance data */
  appearanceData?: Uint8Array | undefined;
}

/**
 * Appearance update message types
 */
export const AppearanceUpdateType = {
  /** Full appearance update */
  FULL: 0,
  /** Single item equipped */
  ITEM_EQUIPPED: 1,
  /** Single item unequipped */
  ITEM_UNEQUIPPED: 2,
  /** Weapon changed */
  WEAPON_CHANGED: 3,
  /** Costume changed */
  COSTUME_CHANGED: 4,
  /** Customization changed */
  CUSTOMIZATION_CHANGED: 5,
} as const;

export type AppearanceUpdateTypeValue =
  (typeof AppearanceUpdateType)[keyof typeof AppearanceUpdateType];

/**
 * Appearance update message
 */
export interface AppearanceUpdateMessage {
  /** Type of update */
  type: AppearanceUpdateTypeValue;
  /** Player ID */
  playerId: ObjectId;
  /** Update timestamp */
  timestamp: number;
  /** Serialized update data */
  data: Uint8Array;
}

/**
 * Get appearance data for a player
 */
export function getAppearanceData(
  playerId: ObjectId,
  equippedItems: Map<EquipmentSlotType, ObjectId>,
  costumeItems: Map<EquipmentSlotType, ObjectId>,
  customization: Uint8Array,
  hairStyleCrc: CrcValue,
  getItemDetails: (itemId: ObjectId) => TangibleObject | undefined
): CharacterAppearance {
  const visibleItems: EquippedItem[] = [];
  const costumeEquipped: EquippedItem[] = [];
  let weaponAppearance: WeaponAppearance | null = null;

  // Process equipped items
  for (const [slot, itemId] of equippedItems) {
    // Skip special slots that aren't visible
    if (isSpecialSlot(slot)) {
      continue;
    }

    const item = getItemDetails(itemId);
    const equippedItem: EquippedItem = {
      objectId: itemId,
      slot,
      templateCrc: item?.templateCrc ?? 0,
      appearanceData: item?.appearanceData,
    };

    visibleItems.push(equippedItem);

    // Track weapon appearance separately
    if (slot === EquipmentSlot.RIGHT_HAND || slot === EquipmentSlot.LEFT_HAND) {
      weaponAppearance = {
        weaponId: itemId,
        templateCrc: item?.templateCrc ?? 0,
        slot,
        appearanceData: item?.appearanceData,
      };
    }
  }

  // Process costume items (appearance tab overrides)
  for (const [slot, itemId] of costumeItems) {
    if (isSpecialSlot(slot)) {
      continue;
    }

    const item = getItemDetails(itemId);
    costumeEquipped.push({
      objectId: itemId,
      slot,
      templateCrc: item?.templateCrc ?? 0,
      appearanceData: item?.appearanceData,
    });
  }

  return {
    playerId,
    visibleItems,
    costumeItems: costumeEquipped,
    weaponAppearance,
    hairStyleCrc,
    customization,
  };
}

/**
 * Get list of worn (visible) items
 */
export function getWornItems(
  equippedItems: Map<EquipmentSlotType, ObjectId>,
  costumeItems: Map<EquipmentSlotType, ObjectId>,
  getItemDetails: (itemId: ObjectId) => TangibleObject | undefined
): EquippedItem[] {
  const wornItems: EquippedItem[] = [];
  const visibleSlots = getVisibleSlots();

  for (const slot of visibleSlots) {
    // Costume items override regular equipment appearance
    const costumeItemId = costumeItems.get(slot);
    if (costumeItemId) {
      const item = getItemDetails(costumeItemId);
      wornItems.push({
        objectId: costumeItemId,
        slot,
        templateCrc: item?.templateCrc ?? 0,
        appearanceData: item?.appearanceData,
      });
      continue;
    }

    // Fall back to regular equipped item
    const equippedItemId = equippedItems.get(slot);
    if (equippedItemId) {
      const item = getItemDetails(equippedItemId);
      wornItems.push({
        objectId: equippedItemId,
        slot,
        templateCrc: item?.templateCrc ?? 0,
        appearanceData: item?.appearanceData,
      });
    }
  }

  return wornItems;
}

/**
 * Create an appearance update message for broadcasting
 */
export function updateAppearance(
  playerId: ObjectId,
  type: AppearanceUpdateTypeValue,
  appearance: CharacterAppearance
): AppearanceUpdateMessage {
  const data = serializeAppearanceUpdate(type, appearance);

  return {
    type,
    playerId,
    timestamp: Date.now(),
    data,
  };
}

/**
 * Serialize a full appearance update
 */
function serializeAppearanceUpdate(
  type: AppearanceUpdateTypeValue,
  appearance: CharacterAppearance
): Uint8Array {
  const writer = new BufferWriter(1024);

  // Update type
  writer.writeUInt8(type);

  // Player ID
  writer.writeUInt64LE(appearance.playerId);

  switch (type) {
    case AppearanceUpdateType.FULL:
      serializeFullAppearance(writer, appearance);
      break;

    case AppearanceUpdateType.ITEM_EQUIPPED:
    case AppearanceUpdateType.ITEM_UNEQUIPPED:
      // For single item updates, include just the affected item
      if (appearance.visibleItems.length > 0) {
        serializeEquippedItem(writer, appearance.visibleItems[0]!);
      }
      break;

    case AppearanceUpdateType.WEAPON_CHANGED:
      serializeWeaponAppearance(writer, appearance.weaponAppearance);
      break;

    case AppearanceUpdateType.COSTUME_CHANGED:
      serializeCostumeItems(writer, appearance.costumeItems);
      break;

    case AppearanceUpdateType.CUSTOMIZATION_CHANGED:
      serializeCustomization(writer, appearance.customization);
      break;
  }

  return writer.toBuffer();
}

/**
 * Serialize full appearance data
 */
function serializeFullAppearance(
  writer: BufferWriter,
  appearance: CharacterAppearance
): void {
  // Hair style
  writer.writeUInt32LE(appearance.hairStyleCrc);

  // Customization data
  serializeCustomization(writer, appearance.customization);

  // Visible items count
  writer.writeUInt32LE(appearance.visibleItems.length);

  // Serialize each visible item
  for (const item of appearance.visibleItems) {
    serializeEquippedItem(writer, item);
  }

  // Costume items count
  writer.writeUInt32LE(appearance.costumeItems.length);

  // Serialize each costume item
  for (const item of appearance.costumeItems) {
    serializeEquippedItem(writer, item);
  }

  // Weapon appearance
  serializeWeaponAppearance(writer, appearance.weaponAppearance);
}

/**
 * Serialize a single equipped item
 */
function serializeEquippedItem(writer: BufferWriter, item: EquippedItem): void {
  // Object ID
  writer.writeUInt64LE(item.objectId);

  // Slot
  writer.writeInt32LE(item.slot);

  // Template CRC
  writer.writeUInt32LE(item.templateCrc);

  // Appearance data
  if (item.appearanceData && item.appearanceData.length > 0) {
    writer.writeUInt16LE(item.appearanceData.length);
    for (let i = 0; i < item.appearanceData.length; i++) {
      writer.writeUInt8(item.appearanceData[i]!);
    }
  } else {
    writer.writeUInt16LE(0);
  }
}

/**
 * Serialize weapon appearance
 */
function serializeWeaponAppearance(
  writer: BufferWriter,
  weapon: WeaponAppearance | null
): void {
  if (weapon) {
    writer.writeUInt8(1); // Has weapon
    writer.writeUInt64LE(weapon.weaponId);
    writer.writeUInt32LE(weapon.templateCrc);
    writer.writeInt32LE(weapon.slot);

    if (weapon.appearanceData && weapon.appearanceData.length > 0) {
      writer.writeUInt16LE(weapon.appearanceData.length);
      for (let i = 0; i < weapon.appearanceData.length; i++) {
        writer.writeUInt8(weapon.appearanceData[i]!);
      }
    } else {
      writer.writeUInt16LE(0);
    }
  } else {
    writer.writeUInt8(0); // No weapon
  }
}

/**
 * Serialize costume items
 */
function serializeCostumeItems(
  writer: BufferWriter,
  costumeItems: EquippedItem[]
): void {
  writer.writeUInt32LE(costumeItems.length);

  for (const item of costumeItems) {
    serializeEquippedItem(writer, item);
  }
}

/**
 * Serialize customization data
 */
function serializeCustomization(
  writer: BufferWriter,
  customization: Uint8Array
): void {
  writer.writeUInt16LE(customization.length);
  for (let i = 0; i < customization.length; i++) {
    writer.writeUInt8(customization[i]!);
  }
}

/**
 * Create equipment baseline delta for CREO6
 * Used when equipment changes need to be sent to clients
 */
export function createEquipmentDelta(
  objectId: ObjectId,
  equippedItems: Map<EquipmentSlotType, ObjectId>,
  updateCounter: number,
  getItemDetails: (itemId: ObjectId) => TangibleObject | undefined
): Uint8Array {
  const writer = new BufferWriter(512);

  // Delta header
  const CREO_TYPE_CRC = 0x4352454f; // "CREO"
  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(6); // Baseline 6
  writer.writeUInt16LE(1); // One update

  // Variable index for equipment list
  writer.writeUInt16LE(4);

  // List size
  writer.writeUInt32LE(equippedItems.size);

  // Update counter
  writer.writeUInt32LE(updateCounter);

  // Write equipment entries
  for (const [slot, itemId] of equippedItems) {
    const item = getItemDetails(itemId);

    // Appearance data length (0 for now)
    writer.writeUInt16LE(0);

    // Arrangement index (slot)
    writer.writeInt32LE(slot);

    // Object ID
    writer.writeUInt64LE(itemId);

    // Template CRC
    writer.writeUInt32LE(item?.templateCrc ?? 0);
  }

  return writer.toBuffer();
}

/**
 * Create equipment list add delta
 */
export function createEquipmentAddDelta(
  objectId: ObjectId,
  item: EquippedItem,
  listSize: number,
  updateCounter: number
): Uint8Array {
  const writer = new BufferWriter(128);

  // Delta header
  const CREO_TYPE_CRC = 0x4352454f;
  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(6);
  writer.writeUInt16LE(1);

  // Variable index for equipment
  writer.writeUInt16LE(4);

  // List header
  writer.writeUInt32LE(listSize);
  writer.writeUInt32LE(updateCounter);

  // Operation count
  writer.writeUInt8(1);

  // Add operation
  writer.writeUInt8(0); // 0 = Add

  // Equipment entry
  if (item.appearanceData && item.appearanceData.length > 0) {
    writer.writeUInt16LE(item.appearanceData.length);
    for (let i = 0; i < item.appearanceData.length; i++) {
      writer.writeUInt8(item.appearanceData[i]!);
    }
  } else {
    writer.writeUInt16LE(0);
  }

  writer.writeInt32LE(item.slot);
  writer.writeUInt64LE(item.objectId);
  writer.writeUInt32LE(item.templateCrc);

  return writer.toBuffer();
}

/**
 * Create equipment list remove delta
 */
export function createEquipmentRemoveDelta(
  objectId: ObjectId,
  slot: EquipmentSlotType,
  listSize: number,
  updateCounter: number,
  index: number
): Uint8Array {
  const writer = new BufferWriter(64);

  // Delta header
  const CREO_TYPE_CRC = 0x4352454f;
  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(6);
  writer.writeUInt16LE(1);

  // Variable index for equipment
  writer.writeUInt16LE(4);

  // List header
  writer.writeUInt32LE(listSize);
  writer.writeUInt32LE(updateCounter);

  // Operation count
  writer.writeUInt8(1);

  // Remove operation
  writer.writeUInt8(1); // 1 = Remove
  writer.writeUInt16LE(index);

  return writer.toBuffer();
}

/**
 * Get slot visibility priority for rendering
 * Higher priority items are rendered on top
 */
export function getSlotRenderPriority(slot: EquipmentSlotType): number {
  const arrangement = SLOT_ARRANGEMENTS[slot];
  return arrangement?.layer ?? 0;
}

/**
 * Sort equipped items by render priority
 */
export function sortByRenderPriority(items: EquippedItem[]): EquippedItem[] {
  return [...items].sort((a, b) => {
    return getSlotRenderPriority(a.slot) - getSlotRenderPriority(b.slot);
  });
}
