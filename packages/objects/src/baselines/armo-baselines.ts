/**
 * ARMO Baseline Serialization
 * Handles serialization of ArmorObject data for client synchronization
 *
 * SWG baselines are packets that synchronize object state between server and client.
 * Armor objects (ARMO) use baselines 3 and 6 for their specific data.
 *
 * Baseline 3: Effectiveness values, encumbrance, armor layer
 * Baseline 6: Sockets, condition, special protection, requirements
 */

import { BufferWriter, BufferReader } from '@swg/protocol';
import type { ObjectId } from '@swg/shared-types';
import { ArmorObject, ArmoProperty } from '../armor-object.js';
import type { EquipmentSlotType } from '../creature-object.js';

/** ARMO type identifier (CRC of "ARMO") */
export const ARMO_TYPE_CRC = 0x41524d4f; // "ARMO" in ASCII

/**
 * Delta operation types for list updates
 */
export enum ArmoDeltaOperation {
  Add = 0,
  Remove = 1,
  Change = 2,
  Clear = 3,
}

/**
 * Serialize ARMO Baseline 3 (shared armor data)
 * Contains effectiveness values, encumbrance, and layer information
 */
export function serializeArmoBaseline3(obj: ArmorObject): Uint8Array {
  const writer = new BufferWriter(256);

  // Baseline header
  writer.writeUInt32LE(ARMO_TYPE_CRC);
  writer.writeUInt8(3);

  // Variable count placeholder
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let variableCount = 0;

  // ==== ARMO3 Variables ====

  // 0: Armor rating
  writer.writeUInt8(obj.armorRating);
  variableCount++;

  // 1: Kinetic effectiveness
  writer.writeFloatLE(obj.kineticEffectiveness);
  variableCount++;

  // 2: Energy effectiveness
  writer.writeFloatLE(obj.energyEffectiveness);
  variableCount++;

  // 3: Blast effectiveness
  writer.writeFloatLE(obj.blastEffectiveness);
  variableCount++;

  // 4: Stun effectiveness
  writer.writeFloatLE(obj.stunEffectiveness);
  variableCount++;

  // 5: Heat effectiveness
  writer.writeFloatLE(obj.heatEffectiveness);
  variableCount++;

  // 6: Cold effectiveness
  writer.writeFloatLE(obj.coldEffectiveness);
  variableCount++;

  // 7: Acid effectiveness
  writer.writeFloatLE(obj.acidEffectiveness);
  variableCount++;

  // 8: Electricity effectiveness
  writer.writeFloatLE(obj.electricityEffectiveness);
  variableCount++;

  // 9: Lightsaber resistance
  writer.writeFloatLE(obj.lightsaberResist);
  variableCount++;

  // 10: Health encumbrance
  writer.writeUInt32LE(obj.healthEncumbrance);
  variableCount++;

  // 11: Action encumbrance
  writer.writeUInt32LE(obj.actionEncumbrance);
  variableCount++;

  // 12: Mind encumbrance
  writer.writeUInt32LE(obj.mindEncumbrance);
  variableCount++;

  // 13: Armor layer
  writer.writeUInt8(obj.armorLayer);
  variableCount++;

  // 14: Coverage slots list
  writer.writeUInt32LE(obj.coverageSlots.length);
  writer.writeUInt32LE(obj.getListUpdateCounter('coverageSlots'));
  for (const slot of obj.coverageSlots) {
    writer.writeInt32LE(slot);
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
 * Serialize ARMO Baseline 6 (server armor data)
 * Contains socket information, special protection, and requirements
 */
export function serializeArmoBaseline6(obj: ArmorObject): Uint8Array {
  const writer = new BufferWriter(128);

  // Baseline header
  writer.writeUInt32LE(ARMO_TYPE_CRC);
  writer.writeUInt8(6);

  // Variable count placeholder
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let variableCount = 0;

  // ==== ARMO6 Variables ====

  // 0: Socket slots
  writer.writeUInt8(obj.socketSlots);
  variableCount++;

  // 1: Attached mods list
  writer.writeUInt32LE(obj.attachedMods.length);
  writer.writeUInt32LE(obj.getListUpdateCounter('attachedMods'));
  for (const modId of obj.attachedMods) {
    writer.writeUInt64LE(modId);
  }
  variableCount++;

  // 2: Special protection
  writer.writeFloatLE(obj.specialProtection);
  variableCount++;

  // 3: Protection type (ASCII string)
  writeAsciiString(writer, obj.protectionType);
  variableCount++;

  // 4: Required certification (ASCII string)
  writeAsciiString(writer, obj.requiredCertification);
  variableCount++;

  // Update variable count
  const endPos = writer.getPosition();
  writer.setPosition(variableCountPos);
  writer.writeUInt16LE(variableCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Generate a delta message for ARMO Baseline 3 changes
 */
export function generateArmoBaseline3Delta(
  obj: ArmorObject,
  changedProperties: number[]
): Uint8Array | null {
  if (changedProperties.length === 0) {
    return null;
  }

  const writer = new BufferWriter(128);

  // Delta header
  writer.writeUInt32LE(ARMO_TYPE_CRC);
  writer.writeUInt8(3);

  const updateCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let updateCount = 0;

  for (const prop of changedProperties) {
    switch (prop) {
      case ArmoProperty.ARMOR_RATING:
        writer.writeUInt16LE(0);
        writer.writeUInt8(obj.armorRating);
        updateCount++;
        break;

      case ArmoProperty.KINETIC_EFFECTIVENESS:
        writer.writeUInt16LE(1);
        writer.writeFloatLE(obj.kineticEffectiveness);
        updateCount++;
        break;

      case ArmoProperty.ENERGY_EFFECTIVENESS:
        writer.writeUInt16LE(2);
        writer.writeFloatLE(obj.energyEffectiveness);
        updateCount++;
        break;

      case ArmoProperty.BLAST_EFFECTIVENESS:
        writer.writeUInt16LE(3);
        writer.writeFloatLE(obj.blastEffectiveness);
        updateCount++;
        break;

      case ArmoProperty.STUN_EFFECTIVENESS:
        writer.writeUInt16LE(4);
        writer.writeFloatLE(obj.stunEffectiveness);
        updateCount++;
        break;

      case ArmoProperty.HEAT_EFFECTIVENESS:
        writer.writeUInt16LE(5);
        writer.writeFloatLE(obj.heatEffectiveness);
        updateCount++;
        break;

      case ArmoProperty.COLD_EFFECTIVENESS:
        writer.writeUInt16LE(6);
        writer.writeFloatLE(obj.coldEffectiveness);
        updateCount++;
        break;

      case ArmoProperty.ACID_EFFECTIVENESS:
        writer.writeUInt16LE(7);
        writer.writeFloatLE(obj.acidEffectiveness);
        updateCount++;
        break;

      case ArmoProperty.ELECTRICITY_EFFECTIVENESS:
        writer.writeUInt16LE(8);
        writer.writeFloatLE(obj.electricityEffectiveness);
        updateCount++;
        break;

      case ArmoProperty.LIGHTSABER_RESIST:
        writer.writeUInt16LE(9);
        writer.writeFloatLE(obj.lightsaberResist);
        updateCount++;
        break;

      case ArmoProperty.HEALTH_ENCUMBRANCE:
        writer.writeUInt16LE(10);
        writer.writeUInt32LE(obj.healthEncumbrance);
        updateCount++;
        break;

      case ArmoProperty.ACTION_ENCUMBRANCE:
        writer.writeUInt16LE(11);
        writer.writeUInt32LE(obj.actionEncumbrance);
        updateCount++;
        break;

      case ArmoProperty.MIND_ENCUMBRANCE:
        writer.writeUInt16LE(12);
        writer.writeUInt32LE(obj.mindEncumbrance);
        updateCount++;
        break;

      case ArmoProperty.ARMOR_LAYER:
        writer.writeUInt16LE(13);
        writer.writeUInt8(obj.armorLayer);
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
 * Generate a delta message for ARMO Baseline 6 changes
 */
export function generateArmoBaseline6Delta(
  obj: ArmorObject,
  changedProperties: number[]
): Uint8Array | null {
  if (changedProperties.length === 0) {
    return null;
  }

  const writer = new BufferWriter(128);

  // Delta header
  writer.writeUInt32LE(ARMO_TYPE_CRC);
  writer.writeUInt8(6);

  const updateCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let updateCount = 0;

  for (const prop of changedProperties) {
    switch (prop) {
      case ArmoProperty.SOCKET_SLOTS:
        writer.writeUInt16LE(0);
        writer.writeUInt8(obj.socketSlots);
        updateCount++;
        break;

      case ArmoProperty.SPECIAL_PROTECTION:
        writer.writeUInt16LE(2);
        writer.writeFloatLE(obj.specialProtection);
        updateCount++;
        break;

      case ArmoProperty.PROTECTION_TYPE:
        writer.writeUInt16LE(3);
        writeAsciiString(writer, obj.protectionType);
        updateCount++;
        break;

      case ArmoProperty.REQUIRED_CERTIFICATION:
        writer.writeUInt16LE(4);
        writeAsciiString(writer, obj.requiredCertification);
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
 * Generate delta for attached mods list changes
 */
export function generateAttachedModsDelta(
  obj: ArmorObject,
  operation: ArmoDeltaOperation,
  modId?: ObjectId,
  index?: number
): Uint8Array {
  const writer = new BufferWriter(64);

  // Delta header
  writer.writeUInt32LE(ARMO_TYPE_CRC);
  writer.writeUInt8(6);
  writer.writeUInt16LE(1);

  // Variable index for attached mods
  writer.writeUInt16LE(1);

  // List delta format
  writer.writeUInt32LE(obj.attachedMods.length);
  writer.writeUInt32LE(obj.getListUpdateCounter('attachedMods'));

  writer.writeUInt8(1); // One operation
  writer.writeUInt8(operation);

  switch (operation) {
    case ArmoDeltaOperation.Add:
      if (modId !== undefined) {
        writer.writeUInt64LE(modId);
      }
      break;

    case ArmoDeltaOperation.Remove:
      if (index !== undefined) {
        writer.writeUInt16LE(index);
      }
      break;

    case ArmoDeltaOperation.Clear:
      // No additional data
      break;
  }

  return writer.toBuffer();
}

/**
 * Generate delta for coverage slots list changes
 */
export function generateCoverageSlotsDelta(
  obj: ArmorObject,
  operation: ArmoDeltaOperation,
  slot?: EquipmentSlotType,
  index?: number
): Uint8Array {
  const writer = new BufferWriter(64);

  // Delta header
  writer.writeUInt32LE(ARMO_TYPE_CRC);
  writer.writeUInt8(3);
  writer.writeUInt16LE(1);

  // Variable index for coverage slots
  writer.writeUInt16LE(14);

  // List delta format
  writer.writeUInt32LE(obj.coverageSlots.length);
  writer.writeUInt32LE(obj.getListUpdateCounter('coverageSlots'));

  writer.writeUInt8(1); // One operation
  writer.writeUInt8(operation);

  switch (operation) {
    case ArmoDeltaOperation.Add:
      if (slot !== undefined) {
        writer.writeInt32LE(slot);
      }
      break;

    case ArmoDeltaOperation.Remove:
      if (index !== undefined) {
        writer.writeUInt16LE(index);
      }
      break;

    case ArmoDeltaOperation.Clear:
      // No additional data
      break;
  }

  return writer.toBuffer();
}

/**
 * Deserialize ARMO Baseline 3 data into an ArmorObject
 */
export function deserializeArmoBaseline3(obj: ArmorObject, data: Uint8Array): void {
  const reader = new BufferReader(data);

  // Skip header
  reader.skip(5);

  const variableCount = reader.readUInt16LE();

  if (variableCount >= 1) {
    obj.armorRating = reader.readUInt8();
  }

  if (variableCount >= 2) {
    obj.kineticEffectiveness = reader.readFloatLE();
  }

  if (variableCount >= 3) {
    obj.energyEffectiveness = reader.readFloatLE();
  }

  if (variableCount >= 4) {
    obj.blastEffectiveness = reader.readFloatLE();
  }

  if (variableCount >= 5) {
    obj.stunEffectiveness = reader.readFloatLE();
  }

  if (variableCount >= 6) {
    obj.heatEffectiveness = reader.readFloatLE();
  }

  if (variableCount >= 7) {
    obj.coldEffectiveness = reader.readFloatLE();
  }

  if (variableCount >= 8) {
    obj.acidEffectiveness = reader.readFloatLE();
  }

  if (variableCount >= 9) {
    obj.electricityEffectiveness = reader.readFloatLE();
  }

  if (variableCount >= 10) {
    obj.lightsaberResist = reader.readFloatLE();
  }

  if (variableCount >= 11) {
    obj.healthEncumbrance = reader.readUInt32LE();
  }

  if (variableCount >= 12) {
    obj.actionEncumbrance = reader.readUInt32LE();
  }

  if (variableCount >= 13) {
    obj.mindEncumbrance = reader.readUInt32LE();
  }

  if (variableCount >= 14) {
    obj.armorLayer = reader.readUInt8();
  }

  if (variableCount >= 15) {
    const slotsCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.coverageSlots = [];
    for (let i = 0; i < slotsCount; i++) {
      obj.coverageSlots.push(reader.readInt32LE() as EquipmentSlotType);
    }
  }
}

/**
 * Deserialize ARMO Baseline 6 data into an ArmorObject
 */
export function deserializeArmoBaseline6(obj: ArmorObject, data: Uint8Array): void {
  const reader = new BufferReader(data);

  // Skip header
  reader.skip(5);

  const variableCount = reader.readUInt16LE();

  if (variableCount >= 1) {
    obj.socketSlots = reader.readUInt8();
  }

  if (variableCount >= 2) {
    const modsCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.attachedMods = [];
    for (let i = 0; i < modsCount; i++) {
      obj.attachedMods.push(reader.readUInt64LE());
    }
  }

  if (variableCount >= 3) {
    obj.specialProtection = reader.readFloatLE();
  }

  if (variableCount >= 4) {
    obj.protectionType = readAsciiString(reader);
  }

  if (variableCount >= 5) {
    obj.requiredCertification = readAsciiString(reader);
  }
}

/**
 * Create all ARMO baselines for an object
 */
export function createArmoBaselines(obj: ArmorObject): Uint8Array[] {
  return [serializeArmoBaseline3(obj), serializeArmoBaseline6(obj)];
}

/**
 * Create a full baseline packet for sending to client
 */
export function createArmoBaselinePacket(objectId: bigint, baseline: Uint8Array): Uint8Array {
  const writer = new BufferWriter(baseline.length + 16);

  writer.writeUInt64LE(objectId);
  writer.writeBytes(baseline);

  return writer.toBuffer();
}

/**
 * Create a delta packet for sending to client
 */
export function createArmoDeltaPacket(objectId: bigint, delta: Uint8Array): Uint8Array {
  const writer = new BufferWriter(delta.length + 16);

  writer.writeUInt64LE(objectId);
  writer.writeBytes(delta);

  return writer.toBuffer();
}

// ==== Helper Functions ====

/**
 * Write ASCII string with 16-bit length prefix
 */
function writeAsciiString(writer: BufferWriter, str: string): void {
  writer.writeUInt16LE(str.length);
  for (let i = 0; i < str.length; i++) {
    writer.writeUInt8(str.charCodeAt(i) & 0xff);
  }
}

/**
 * Read ASCII string with 16-bit length prefix
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
