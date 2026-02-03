/**
 * TANO Baseline Serialization
 * Handles serialization of TangibleObject data for client synchronization
 *
 * SWG baselines are packets that synchronize object state between server and client.
 * Each object type has multiple baselines (typically 1, 3, 4, 6, 7, 8, 9).
 * Tangible objects (TANO) use baselines 3 and 6 for their specific data.
 *
 * Baseline 3: Shared tangible data (visible to all observers)
 * Baseline 6: Server tangible data (combat, defenders, etc.)
 */

import { BufferWriter, BufferReader } from '@swg/protocol';
import { TangibleObject } from '../tangible-object.js';
import type { ObjectId } from '@swg/shared-types';

/** TANO type identifier (CRC of "TANO") */
export const TANO_TYPE_CRC = 0x54414e4f; // "TANO" in ASCII

/**
 * Delta operation types for list updates
 */
export enum DeltaOperation {
  Add = 0,
  Remove = 1,
  Change = 2,
  Clear = 3,
  Set = 4,
}

/**
 * Serialize TANO Baseline 3 (shared tangible data)
 * This baseline contains data visible to all players observing the object
 */
export function serializeTanoBaseline3(obj: TangibleObject): Uint8Array {
  const writer = new BufferWriter(256);

  // Baseline header
  writer.writeUInt32LE(TANO_TYPE_CRC); // Object type
  writer.writeUInt8(3); // Baseline number

  // Variable count for this baseline (number of variables being sent)
  // TANO3 has approximately 15 variables
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0); // Placeholder, will update

  let variableCount = 0;

  // ==== TANO3 Variables ====

  // 0: Appearance customization data (variable length)
  writer.writeUInt16LE(obj.appearanceData.length);
  if (obj.appearanceData.length > 0) {
    writer.writeBytes(obj.appearanceData);
  }
  variableCount++;

  // 1: Component bitmask
  writer.writeUInt32LE(obj.componentBitmask);
  variableCount++;

  // 2: Condition damage (maxCondition - condition)
  writer.writeUInt32LE(obj.maxCondition - obj.condition);
  variableCount++;

  // 3: Max condition
  writer.writeUInt32LE(obj.maxCondition);
  variableCount++;

  // 4: Visible flag
  writer.writeUInt8(obj.visible ? 1 : 0);
  variableCount++;

  // 5: PvP status bitmask
  writer.writeUInt32LE(obj.pvpStatus);
  variableCount++;

  // 6: PvP faction CRC
  writer.writeUInt32LE(obj.pvpFaction);
  variableCount++;

  // 7: Options bitmask (insured, magic, etc.)
  writer.writeUInt32LE(obj.optionsBitmask);
  variableCount++;

  // 8: Count (for stackable items)
  writer.writeUInt32LE(obj.count);
  variableCount++;

  // 9: Owner ID
  writer.writeUInt64LE(obj.ownerId);
  variableCount++;

  // 10: Custom name (Unicode string)
  writeUnicodeString(writer, obj.customName);
  variableCount++;

  // 11: Object effects list
  writer.writeUInt32LE(obj.objectEffects.length); // List size
  writer.writeUInt32LE(0); // Update counter (0 for full baseline)
  for (const effect of obj.objectEffects) {
    writeAsciiString(writer, effect);
  }
  variableCount++;

  // 12: Volume
  writer.writeUInt32LE(obj.volume);
  variableCount++;

  // 13: Max hit points
  writer.writeUInt32LE(obj.maxHitPoints);
  variableCount++;

  // Update variable count
  const endPos = writer.getPosition();
  writer.setPosition(variableCountPos);
  writer.writeUInt16LE(variableCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Serialize TANO Baseline 6 (server tangible data)
 * This baseline contains combat and defender information
 */
export function serializeTanoBaseline6(obj: TangibleObject): Uint8Array {
  const writer = new BufferWriter(128);

  // Baseline header
  writer.writeUInt32LE(TANO_TYPE_CRC); // Object type
  writer.writeUInt8(6); // Baseline number

  // Variable count placeholder
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let variableCount = 0;

  // ==== TANO6 Variables ====

  // 0: In combat flag
  writer.writeUInt8(obj.inCombat ? 1 : 0);
  variableCount++;

  // 1: Defenders list (objects attacking this one)
  writer.writeUInt32LE(obj.defenders.size); // List size
  writer.writeUInt32LE(0); // Update counter
  for (const defenderId of obj.defenders) {
    writer.writeUInt64LE(defenderId);
  }
  variableCount++;

  // Update variable count
  const endPos = writer.getPosition();
  writer.setPosition(variableCountPos);
  writer.writeUInt16LE(variableCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Generate a delta message for TANO Baseline 3 changes
 * Deltas are incremental updates sent when specific properties change
 */
export function generateTanoBaseline3Delta(
  obj: TangibleObject,
  changedProperties: string[]
): Uint8Array | null {
  if (changedProperties.length === 0) {
    return null;
  }

  const writer = new BufferWriter(128);

  // Delta header
  writer.writeUInt32LE(TANO_TYPE_CRC);
  writer.writeUInt8(3);

  // Count of updates
  const updateCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let updateCount = 0;

  for (const prop of changedProperties) {
    switch (prop) {
      case 'appearanceData':
        writer.writeUInt16LE(0); // Variable index
        writer.writeUInt16LE(obj.appearanceData.length);
        if (obj.appearanceData.length > 0) {
          writer.writeBytes(obj.appearanceData);
        }
        updateCount++;
        break;

      case 'componentBitmask':
        writer.writeUInt16LE(1);
        writer.writeUInt32LE(obj.componentBitmask);
        updateCount++;
        break;

      case 'condition':
        writer.writeUInt16LE(2);
        writer.writeUInt32LE(obj.maxCondition - obj.condition);
        updateCount++;
        break;

      case 'maxCondition':
        writer.writeUInt16LE(3);
        writer.writeUInt32LE(obj.maxCondition);
        updateCount++;
        break;

      case 'visible':
        writer.writeUInt16LE(4);
        writer.writeUInt8(obj.visible ? 1 : 0);
        updateCount++;
        break;

      case 'pvpStatus':
        writer.writeUInt16LE(5);
        writer.writeUInt32LE(obj.pvpStatus);
        updateCount++;
        break;

      case 'pvpFaction':
        writer.writeUInt16LE(6);
        writer.writeUInt32LE(obj.pvpFaction);
        updateCount++;
        break;

      case 'optionsBitmask':
        writer.writeUInt16LE(7);
        writer.writeUInt32LE(obj.optionsBitmask);
        updateCount++;
        break;

      case 'count':
        writer.writeUInt16LE(8);
        writer.writeUInt32LE(obj.count);
        updateCount++;
        break;

      case 'ownerId':
        writer.writeUInt16LE(9);
        writer.writeUInt64LE(obj.ownerId);
        updateCount++;
        break;

      case 'customName':
        writer.writeUInt16LE(10);
        writeUnicodeString(writer, obj.customName);
        updateCount++;
        break;

      case 'volume':
        writer.writeUInt16LE(12);
        writer.writeUInt32LE(obj.volume);
        updateCount++;
        break;

      case 'maxHitPoints':
        writer.writeUInt16LE(13);
        writer.writeUInt32LE(obj.maxHitPoints);
        updateCount++;
        break;
    }
  }

  if (updateCount === 0) {
    return null;
  }

  // Update the count
  const endPos = writer.getPosition();
  writer.setPosition(updateCountPos);
  writer.writeUInt16LE(updateCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Generate delta for object effects list changes
 */
export function generateEffectsListDelta(
  obj: TangibleObject,
  operation: DeltaOperation,
  effectName?: string,
  index?: number
): Uint8Array {
  const writer = new BufferWriter(64);

  // Delta header
  writer.writeUInt32LE(TANO_TYPE_CRC);
  writer.writeUInt8(3);
  writer.writeUInt16LE(1); // One update

  // Variable index for effects list
  writer.writeUInt16LE(11);

  // List delta format
  writer.writeUInt32LE(obj.objectEffects.length); // Current list size
  writer.writeUInt32LE(obj.baselineVersion); // Update counter

  writer.writeUInt8(1); // Number of list operations
  writer.writeUInt8(operation);

  switch (operation) {
    case DeltaOperation.Add:
      if (effectName !== undefined) {
        writeAsciiString(writer, effectName);
      }
      break;

    case DeltaOperation.Remove:
      if (index !== undefined) {
        writer.writeUInt16LE(index);
      }
      break;

    case DeltaOperation.Clear:
      // No additional data needed
      break;
  }

  return writer.toBuffer();
}

/**
 * Generate a delta message for TANO Baseline 6 changes
 */
export function generateTanoBaseline6Delta(
  obj: TangibleObject,
  changedProperties: string[]
): Uint8Array | null {
  if (changedProperties.length === 0) {
    return null;
  }

  const writer = new BufferWriter(64);

  // Delta header
  writer.writeUInt32LE(TANO_TYPE_CRC);
  writer.writeUInt8(6);

  const updateCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let updateCount = 0;

  for (const prop of changedProperties) {
    switch (prop) {
      case 'inCombat':
        writer.writeUInt16LE(0);
        writer.writeUInt8(obj.inCombat ? 1 : 0);
        updateCount++;
        break;
    }
  }

  if (updateCount === 0) {
    return null;
  }

  const endPos = writer.getPosition();
  writer.setPosition(updateCountPos);
  writer.writeUInt16LE(updateCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Generate delta for defenders list changes
 */
export function generateDefendersListDelta(
  obj: TangibleObject,
  operation: DeltaOperation,
  defenderId?: ObjectId,
  index?: number
): Uint8Array {
  const writer = new BufferWriter(64);

  // Delta header
  writer.writeUInt32LE(TANO_TYPE_CRC);
  writer.writeUInt8(6);
  writer.writeUInt16LE(1); // One update

  // Variable index for defenders list
  writer.writeUInt16LE(1);

  // List delta format
  writer.writeUInt32LE(obj.defenders.size);
  writer.writeUInt32LE(obj.baselineVersion);

  writer.writeUInt8(1); // Number of list operations
  writer.writeUInt8(operation);

  switch (operation) {
    case DeltaOperation.Add:
      if (defenderId !== undefined) {
        writer.writeUInt64LE(defenderId);
      }
      break;

    case DeltaOperation.Remove:
      if (index !== undefined) {
        writer.writeUInt16LE(index);
      }
      break;

    case DeltaOperation.Clear:
      // No additional data needed
      break;
  }

  return writer.toBuffer();
}

/**
 * Deserialize TANO Baseline 3 data into a TangibleObject
 */
export function deserializeTanoBaseline3(obj: TangibleObject, data: Uint8Array): void {
  const reader = new BufferReader(data);

  // Skip header (type CRC + baseline number)
  reader.skip(5);

  // Read variable count
  const variableCount = reader.readUInt16LE();

  if (variableCount >= 1) {
    // 0: Appearance data
    const appearanceLength = reader.readUInt16LE();
    if (appearanceLength > 0) {
      obj.appearanceData = reader.readBytes(appearanceLength);
    } else {
      obj.appearanceData = new Uint8Array(0);
    }
  }

  if (variableCount >= 2) {
    // 1: Component bitmask
    obj.componentBitmask = reader.readUInt32LE();
  }

  if (variableCount >= 3) {
    // 2: Condition damage
    const conditionDamage = reader.readUInt32LE();
    // Condition is calculated later with maxCondition
    obj.condition = -conditionDamage; // Temporary negative, fixed below
  }

  if (variableCount >= 4) {
    // 3: Max condition
    obj.maxCondition = reader.readUInt32LE();
    // Now fix condition (was stored as negative damage)
    obj.condition = obj.maxCondition + obj.condition;
  }

  if (variableCount >= 5) {
    // 4: Visible
    obj.visible = reader.readUInt8() !== 0;
  }

  if (variableCount >= 6) {
    // 5: PvP status
    obj.pvpStatus = reader.readUInt32LE();
  }

  if (variableCount >= 7) {
    // 6: PvP faction
    obj.pvpFaction = reader.readUInt32LE();
  }

  if (variableCount >= 8) {
    // 7: Options bitmask
    obj.optionsBitmask = reader.readUInt32LE();
  }

  if (variableCount >= 9) {
    // 8: Count
    obj.count = reader.readUInt32LE();
  }

  if (variableCount >= 10) {
    // 9: Owner ID
    obj.ownerId = reader.readUInt64LE();
  }

  if (variableCount >= 11) {
    // 10: Custom name
    obj.customName = readUnicodeString(reader);
  }

  if (variableCount >= 12) {
    // 11: Object effects list
    const effectsSize = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter (ignored for full baseline)
    obj.objectEffects = [];
    for (let i = 0; i < effectsSize; i++) {
      obj.objectEffects.push(readAsciiString(reader));
    }
  }

  if (variableCount >= 13) {
    // 12: Volume
    obj.volume = reader.readUInt32LE();
  }

  if (variableCount >= 14) {
    // 13: Max hit points
    obj.maxHitPoints = reader.readUInt32LE();
  }
}

/**
 * Deserialize TANO Baseline 6 data into a TangibleObject
 */
export function deserializeTanoBaseline6(obj: TangibleObject, data: Uint8Array): void {
  const reader = new BufferReader(data);

  // Skip header
  reader.skip(5);

  const variableCount = reader.readUInt16LE();

  if (variableCount >= 1) {
    // 0: In combat
    obj.inCombat = reader.readUInt8() !== 0;
  }

  if (variableCount >= 2) {
    // 1: Defenders list
    const defendersSize = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.defenders.clear();
    for (let i = 0; i < defendersSize; i++) {
      obj.defenders.add(reader.readUInt64LE());
    }
  }
}

// ==== Helper Functions ====

/**
 * Write a Unicode (UTF-16LE) string with 32-bit length prefix
 */
function writeUnicodeString(writer: BufferWriter, str: string): void {
  writer.writeUInt32LE(str.length);
  for (let i = 0; i < str.length; i++) {
    writer.writeUInt16LE(str.charCodeAt(i));
  }
}

/**
 * Read a Unicode (UTF-16LE) string with 32-bit length prefix
 */
function readUnicodeString(reader: BufferReader): string {
  const length = reader.readUInt32LE();
  if (length === 0) return '';

  let result = '';
  for (let i = 0; i < length; i++) {
    result += String.fromCharCode(reader.readUInt16LE());
  }
  return result;
}

/**
 * Write an ASCII string with 16-bit length prefix
 */
function writeAsciiString(writer: BufferWriter, str: string): void {
  writer.writeUInt16LE(str.length);
  for (let i = 0; i < str.length; i++) {
    writer.writeUInt8(str.charCodeAt(i) & 0xff);
  }
}

/**
 * Read an ASCII string with 16-bit length prefix
 */
function readAsciiString(reader: BufferReader): string {
  const length = reader.readUInt16LE();
  if (length === 0) return '';

  const bytes = reader.readBytes(length);
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i] ?? 0);
  }
  return result;
}

/**
 * Create a full baseline packet for sending to client
 */
export function createBaselinePacket(objectId: bigint, baseline: Uint8Array): Uint8Array {
  const writer = new BufferWriter(baseline.length + 16);

  // Message header (SceneBaselinesMessage opcode would be added by message layer)
  writer.writeUInt64LE(objectId);
  writer.writeBytes(baseline);

  return writer.toBuffer();
}

/**
 * Create a delta packet for sending to client
 */
export function createDeltaPacket(objectId: bigint, delta: Uint8Array): Uint8Array {
  const writer = new BufferWriter(delta.length + 16);

  // Message header (SceneDeltasMessage opcode would be added by message layer)
  writer.writeUInt64LE(objectId);
  writer.writeBytes(delta);

  return writer.toBuffer();
}
