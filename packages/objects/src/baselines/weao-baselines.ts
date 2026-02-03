/**
 * WEAO Baseline Serialization
 * Handles serialization of WeaponObject data for client synchronization
 *
 * SWG baselines are packets that synchronize object state between server and client.
 * Weapon objects (WEAO) use baselines 3 and 6 for their specific data.
 *
 * Baseline 3: Shared weapon data (visible to all observers)
 *   - Damage properties (min, max, type, elemental)
 *   - Speed and wound chance
 *   - Range properties
 *   - Weapon type and armor piercing
 *   - Damage radius (AOE)
 *
 * Baseline 6: Server weapon data (combat modifiers, powerups)
 *   - Attack/defense modifiers
 *   - Special attack cost
 *   - Powerup slots and attached powerups
 *   - Required certification
 */

import { BufferWriter, BufferReader } from '@swg/protocol';
import { WeaponObject, WeaoProperty } from '../weapon-object.js';
import type { ObjectId } from '@swg/shared-types';

/** WEAO type identifier (CRC of "WEAO") */
export const WEAO_TYPE_CRC = 0x5745414f; // "WEAO" in ASCII little-endian

/**
 * Delta operation types for list updates
 */
export enum WeaoDeltaOperation {
  Add = 0,
  Remove = 1,
  Change = 2,
  Clear = 3,
  Set = 4,
}

/**
 * Serialize WEAO Baseline 3 (shared weapon data)
 * This baseline contains data visible to all players observing the weapon
 */
export function serializeWeaoBaseline3(obj: WeaponObject): Uint8Array {
  const writer = new BufferWriter(256);

  // Baseline header
  writer.writeUInt32LE(WEAO_TYPE_CRC); // Object type
  writer.writeUInt8(3); // Baseline number

  // Variable count for this baseline
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0); // Placeholder, will update

  let variableCount = 0;

  // ==== WEAO3 Variables ====

  // 0: Minimum damage
  writer.writeUInt32LE(Math.floor(obj.minDamage));
  variableCount++;

  // 1: Maximum damage
  writer.writeUInt32LE(Math.floor(obj.maxDamage));
  variableCount++;

  // 2: Damage type (bitmask)
  writer.writeUInt32LE(obj.damageType);
  variableCount++;

  // 3: Elemental type
  writer.writeUInt32LE(obj.elementalType);
  variableCount++;

  // 4: Elemental damage
  writer.writeUInt32LE(Math.floor(obj.elementalDamage));
  variableCount++;

  // 5: Attack speed (float)
  writer.writeFloatLE(obj.attackSpeed);
  variableCount++;

  // 6: Wound chance (float, 0.0 - 1.0)
  writer.writeFloatLE(obj.woundChance);
  variableCount++;

  // 7: Minimum range (float)
  writer.writeFloatLE(obj.minRange);
  variableCount++;

  // 8: Maximum range (float)
  writer.writeFloatLE(obj.maxRange);
  variableCount++;

  // 9: Ideal range (float)
  writer.writeFloatLE(obj.idealRange);
  variableCount++;

  // 10: Weapon type
  writer.writeUInt32LE(obj.weaponType);
  variableCount++;

  // 11: Armor piercing
  writer.writeUInt32LE(obj.armorPiercing);
  variableCount++;

  // 12: Damage radius (AOE) (float)
  writer.writeFloatLE(obj.damageRadius);
  variableCount++;

  // 13: Hit type
  writer.writeUInt8(obj.hitType);
  variableCount++;

  // Update variable count
  const endPos = writer.getPosition();
  writer.setPosition(variableCountPos);
  writer.writeUInt16LE(variableCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Serialize WEAO Baseline 6 (server weapon data)
 * This baseline contains combat modifiers, powerups, and certification
 */
export function serializeWeaoBaseline6(obj: WeaponObject): Uint8Array {
  const writer = new BufferWriter(256);

  // Baseline header
  writer.writeUInt32LE(WEAO_TYPE_CRC); // Object type
  writer.writeUInt8(6); // Baseline number

  // Variable count placeholder
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let variableCount = 0;

  // ==== WEAO6 Variables ====

  // 0: Attack modifiers
  writer.writeInt32LE(obj.attackMods);
  variableCount++;

  // 1: Defense modifiers
  writer.writeInt32LE(obj.defenseMods);
  variableCount++;

  // 2: Special attack cost
  writer.writeUInt32LE(obj.specialAttackCost);
  variableCount++;

  // 3: Powerup slots
  writer.writeUInt8(obj.powerupSlots);
  variableCount++;

  // 4: Attached powerups list
  writer.writeUInt32LE(obj.attachedPowerups.length); // List size
  writer.writeUInt32LE(0); // Update counter (0 for full baseline)
  for (const powerupId of obj.attachedPowerups) {
    writer.writeUInt64LE(powerupId);
  }
  variableCount++;

  // 5: Required certification (ASCII string)
  writeAsciiString(writer, obj.requiredCertification);
  variableCount++;

  // 6: Condition (current/max from TangibleObject)
  writer.writeUInt32LE(obj.condition);
  variableCount++;

  // 7: Max condition
  writer.writeUInt32LE(obj.maxCondition);
  variableCount++;

  // Update variable count
  const endPos = writer.getPosition();
  writer.setPosition(variableCountPos);
  writer.writeUInt16LE(variableCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Generate a delta message for WEAO Baseline 3 changes
 */
export function generateWeaoBaseline3Delta(
  obj: WeaponObject,
  changedProperties: string[]
): Uint8Array | null {
  if (changedProperties.length === 0) {
    return null;
  }

  const writer = new BufferWriter(128);

  // Delta header
  writer.writeUInt32LE(WEAO_TYPE_CRC);
  writer.writeUInt8(3);

  // Count of updates
  const updateCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let updateCount = 0;

  for (const prop of changedProperties) {
    switch (prop) {
      case 'minDamage':
        writer.writeUInt16LE(WeaoProperty.MIN_DAMAGE);
        writer.writeUInt32LE(Math.floor(obj.minDamage));
        updateCount++;
        break;

      case 'maxDamage':
        writer.writeUInt16LE(WeaoProperty.MAX_DAMAGE);
        writer.writeUInt32LE(Math.floor(obj.maxDamage));
        updateCount++;
        break;

      case 'damageType':
        writer.writeUInt16LE(WeaoProperty.DAMAGE_TYPE);
        writer.writeUInt32LE(obj.damageType);
        updateCount++;
        break;

      case 'elementalType':
        writer.writeUInt16LE(WeaoProperty.ELEMENTAL_TYPE);
        writer.writeUInt32LE(obj.elementalType);
        updateCount++;
        break;

      case 'elementalDamage':
        writer.writeUInt16LE(WeaoProperty.ELEMENTAL_DAMAGE);
        writer.writeUInt32LE(Math.floor(obj.elementalDamage));
        updateCount++;
        break;

      case 'attackSpeed':
        writer.writeUInt16LE(WeaoProperty.ATTACK_SPEED);
        writer.writeFloatLE(obj.attackSpeed);
        updateCount++;
        break;

      case 'woundChance':
        writer.writeUInt16LE(WeaoProperty.WOUND_CHANCE);
        writer.writeFloatLE(obj.woundChance);
        updateCount++;
        break;

      case 'minRange':
        writer.writeUInt16LE(WeaoProperty.MIN_RANGE);
        writer.writeFloatLE(obj.minRange);
        updateCount++;
        break;

      case 'maxRange':
        writer.writeUInt16LE(WeaoProperty.MAX_RANGE);
        writer.writeFloatLE(obj.maxRange);
        updateCount++;
        break;

      case 'idealRange':
        writer.writeUInt16LE(WeaoProperty.IDEAL_RANGE);
        writer.writeFloatLE(obj.idealRange);
        updateCount++;
        break;

      case 'weaponType':
        writer.writeUInt16LE(WeaoProperty.WEAPON_TYPE);
        writer.writeUInt32LE(obj.weaponType);
        updateCount++;
        break;

      case 'armorPiercing':
        writer.writeUInt16LE(WeaoProperty.ARMOR_PIERCING);
        writer.writeUInt32LE(obj.armorPiercing);
        updateCount++;
        break;

      case 'damageRadius':
        writer.writeUInt16LE(WeaoProperty.DAMAGE_RADIUS);
        writer.writeFloatLE(obj.damageRadius);
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
 * Generate a delta message for WEAO Baseline 6 changes
 */
export function generateWeaoBaseline6Delta(
  obj: WeaponObject,
  changedProperties: string[]
): Uint8Array | null {
  if (changedProperties.length === 0) {
    return null;
  }

  const writer = new BufferWriter(128);

  // Delta header
  writer.writeUInt32LE(WEAO_TYPE_CRC);
  writer.writeUInt8(6);

  // Count of updates
  const updateCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let updateCount = 0;

  for (const prop of changedProperties) {
    switch (prop) {
      case 'attackMods':
        writer.writeUInt16LE(WeaoProperty.ATTACK_MODS);
        writer.writeInt32LE(obj.attackMods);
        updateCount++;
        break;

      case 'defenseMods':
        writer.writeUInt16LE(WeaoProperty.DEFENSE_MODS);
        writer.writeInt32LE(obj.defenseMods);
        updateCount++;
        break;

      case 'specialAttackCost':
        writer.writeUInt16LE(WeaoProperty.SPECIAL_ATTACK_COST);
        writer.writeUInt32LE(obj.specialAttackCost);
        updateCount++;
        break;

      case 'powerupSlots':
        writer.writeUInt16LE(WeaoProperty.POWERUP_SLOTS);
        writer.writeUInt8(obj.powerupSlots);
        updateCount++;
        break;

      case 'requiredCertification':
        writer.writeUInt16LE(WeaoProperty.REQUIRED_CERTIFICATION);
        writeAsciiString(writer, obj.requiredCertification);
        updateCount++;
        break;

      case 'condition':
        writer.writeUInt16LE(6); // Condition index
        writer.writeUInt32LE(obj.condition);
        updateCount++;
        break;

      case 'maxCondition':
        writer.writeUInt16LE(7); // Max condition index
        writer.writeUInt32LE(obj.maxCondition);
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
 * Generate delta for powerups list changes
 */
export function generatePowerupsListDelta(
  obj: WeaponObject,
  operation: WeaoDeltaOperation,
  powerupId?: ObjectId,
  index?: number
): Uint8Array {
  const writer = new BufferWriter(64);

  // Delta header
  writer.writeUInt32LE(WEAO_TYPE_CRC);
  writer.writeUInt8(6);
  writer.writeUInt16LE(1); // One update

  // Variable index for powerups list
  writer.writeUInt16LE(WeaoProperty.ATTACHED_POWERUPS);

  // List delta format
  writer.writeUInt32LE(obj.attachedPowerups.length); // Current list size
  writer.writeUInt32LE(obj.baselineVersion); // Update counter

  writer.writeUInt8(1); // Number of list operations
  writer.writeUInt8(operation);

  switch (operation) {
    case WeaoDeltaOperation.Add:
      if (powerupId !== undefined) {
        writer.writeUInt64LE(powerupId);
      }
      break;

    case WeaoDeltaOperation.Remove:
      if (index !== undefined) {
        writer.writeUInt16LE(index);
      }
      break;

    case WeaoDeltaOperation.Clear:
      // No additional data needed
      break;
  }

  return writer.toBuffer();
}

/**
 * Deserialize WEAO Baseline 3 data into a WeaponObject
 */
export function deserializeWeaoBaseline3(obj: WeaponObject, data: Uint8Array): void {
  const reader = new BufferReader(data);

  // Skip header (type CRC + baseline number)
  reader.skip(5);

  // Read variable count
  const variableCount = reader.readUInt16LE();

  if (variableCount >= 1) {
    obj.minDamage = reader.readUInt32LE();
  }

  if (variableCount >= 2) {
    obj.maxDamage = reader.readUInt32LE();
  }

  if (variableCount >= 3) {
    obj.damageType = reader.readUInt32LE();
  }

  if (variableCount >= 4) {
    obj.elementalType = reader.readUInt32LE();
  }

  if (variableCount >= 5) {
    obj.elementalDamage = reader.readUInt32LE();
  }

  if (variableCount >= 6) {
    obj.attackSpeed = reader.readFloatLE();
  }

  if (variableCount >= 7) {
    obj.woundChance = reader.readFloatLE();
  }

  if (variableCount >= 8) {
    obj.minRange = reader.readFloatLE();
  }

  if (variableCount >= 9) {
    obj.maxRange = reader.readFloatLE();
  }

  if (variableCount >= 10) {
    obj.idealRange = reader.readFloatLE();
  }

  if (variableCount >= 11) {
    obj.weaponType = reader.readUInt32LE();
  }

  if (variableCount >= 12) {
    obj.armorPiercing = reader.readUInt32LE();
  }

  if (variableCount >= 13) {
    obj.damageRadius = reader.readFloatLE();
  }

  if (variableCount >= 14) {
    obj.hitType = reader.readUInt8();
  }
}

/**
 * Deserialize WEAO Baseline 6 data into a WeaponObject
 */
export function deserializeWeaoBaseline6(obj: WeaponObject, data: Uint8Array): void {
  const reader = new BufferReader(data);

  // Skip header
  reader.skip(5);

  const variableCount = reader.readUInt16LE();

  if (variableCount >= 1) {
    obj.attackMods = reader.readInt32LE();
  }

  if (variableCount >= 2) {
    obj.defenseMods = reader.readInt32LE();
  }

  if (variableCount >= 3) {
    obj.specialAttackCost = reader.readUInt32LE();
  }

  if (variableCount >= 4) {
    obj.powerupSlots = reader.readUInt8();
  }

  if (variableCount >= 5) {
    // Powerups list
    const powerupsSize = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.attachedPowerups = [];
    for (let i = 0; i < powerupsSize; i++) {
      obj.attachedPowerups.push(reader.readUInt64LE());
    }
  }

  if (variableCount >= 6) {
    obj.requiredCertification = readAsciiString(reader);
  }

  if (variableCount >= 7) {
    obj.condition = reader.readUInt32LE();
  }

  if (variableCount >= 8) {
    obj.maxCondition = reader.readUInt32LE();
  }
}

/**
 * Create all baselines for a WeaponObject
 */
export function createWeaoBaselines(obj: WeaponObject): Uint8Array[] {
  return [serializeWeaoBaseline3(obj), serializeWeaoBaseline6(obj)];
}

/**
 * Create a full baseline packet for sending to client
 */
export function createWeaoBaselinePacket(objectId: bigint, baseline: Uint8Array): Uint8Array {
  const writer = new BufferWriter(baseline.length + 16);

  // Message header
  writer.writeUInt64LE(objectId);
  writer.writeBytes(baseline);

  return writer.toBuffer();
}

/**
 * Create a delta packet for sending to client
 */
export function createWeaoDeltaPacket(objectId: bigint, delta: Uint8Array): Uint8Array {
  const writer = new BufferWriter(delta.length + 16);

  // Message header
  writer.writeUInt64LE(objectId);
  writer.writeBytes(delta);

  return writer.toBuffer();
}

// ==== Helper Functions ====

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
