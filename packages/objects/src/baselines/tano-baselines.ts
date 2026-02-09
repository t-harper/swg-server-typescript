/**
 * TANO Baseline Serialization
 * Handles serialization of TangibleObject data for client synchronization
 *
 * Variable lists derived from C++ Packager.cpp (swg-source-docker):
 *   TANO1 (authClientServer, 2 vars): SO only
 *   TANO3 (shared, 13 vars): SO + TO
 *   TANO4 (authClientServer_np, 0 vars): empty
 *   TANO6 (shared_np, 8 vars): SO + TO
 *   TANO8 (firstParentAuthClientServer, 0 vars): empty
 *   TANO9 (firstParentAuthClientServer_np, 0 vars): empty
 *
 * Inheritance chain: ServerObject -> TangibleObject
 */

import { BufferWriter } from '@swg/protocol';
import { TangibleObject } from '../tangible-object.js';

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

// ============================================
// Helper Functions
// ============================================

/** Write ASCII string with 16-bit LE length prefix */
function writeAsciiString(writer: BufferWriter, str: string): void {
  writer.writeUInt16LE(str.length);
  for (let i = 0; i < str.length; i++) {
    writer.writeUInt8(str.charCodeAt(i) & 0xff);
  }
}

/** Write Unicode string with 32-bit LE char count + UTF-16LE bytes */
function writeUnicodeString(writer: BufferWriter, str: string): void {
  writer.writeUInt32LE(str.length);
  for (let i = 0; i < str.length; i++) {
    writer.writeUInt16LE(str.charCodeAt(i));
  }
}

/**
 * Write StringId: table(string) + textIndex(u32) + text(string)
 * C++ format from StringIdArchive.cpp
 */
function writeStringId(
  writer: BufferWriter,
  table: string,
  textIndex: number,
  text: string
): void {
  writeAsciiString(writer, table);
  writer.writeUInt32LE(textIndex);
  writeAsciiString(writer, text);
}

/** Write an empty AutoDeltaVector/Set/Map: size(0) + counter(0) */
function writeEmptyList(writer: BufferWriter): void {
  writer.writeUInt32LE(0);
  writer.writeUInt32LE(0);
}

// ============================================
// TANO Baseline 1 (authClientServer) - 2 vars
// SO: bankBalance, cashBalance
// ============================================

export function serializeTanoBaseline1(obj: TangibleObject): Uint8Array {
  const writer = new BufferWriter(32);

  writer.writeUInt32LE(TANO_TYPE_CRC);
  writer.writeUInt8(1);
  writer.writeUInt16LE(2); // variable count

  // 0: bankBalance (int) - ServerObject
  writer.writeInt32LE(0);

  // 1: cashBalance (int) - ServerObject
  writer.writeInt32LE(0);

  return writer.toBuffer();
}

// ============================================
// TANO Baseline 3 (shared) - 13 vars
// SO: complexity, nameStringId, objectName, volume
// TO: pvpFaction, pvpType, appearanceData, components,
//     condition, count, damageTaken, maxHitPoints, visible
// ============================================

export function serializeTanoBaseline3(obj: TangibleObject): Uint8Array {
  const writer = new BufferWriter(256);

  writer.writeUInt32LE(TANO_TYPE_CRC);
  writer.writeUInt8(3);
  writer.writeUInt16LE(13); // variable count

  // -- ServerObject shared (4 vars) --

  // 0: complexity (float)
  writer.writeFloatLE(obj.complexity);

  // 1: nameStringId (StringId) - table + textIndex + text
  writeStringId(writer, obj.objectNameStfFile, 0, obj.objectNameStfName);

  // 2: objectName (Unicode::String) - custom display name
  writeUnicodeString(writer, obj.customName);

  // 3: volume (int)
  writer.writeInt32LE(obj.volume);

  // -- TangibleObject shared (9 vars) --

  // 4: pvpFaction (uint32)
  writer.writeUInt32LE(obj.pvpFaction);

  // 5: pvpType (int) - PvP status flags
  writer.writeInt32LE(obj.pvpStatus);

  // 6: appearanceData (string) - customization data
  writer.writeUInt16LE(obj.appearanceData.length);
  if (obj.appearanceData.length > 0) {
    writer.writeBytes(obj.appearanceData);
  }

  // 7: components (AutoDeltaSet<int>)
  writeEmptyList(writer);

  // 8: condition (int)
  writer.writeInt32LE(obj.condition);

  // 9: count (int)
  writer.writeInt32LE(obj.count);

  // 10: damageTaken (int)
  writer.writeInt32LE(Math.max(0, obj.maxCondition - obj.condition));

  // 11: maxHitPoints (int)
  writer.writeInt32LE(obj.maxHitPoints || obj.maxCondition);

  // 12: visible (bool)
  writer.writeUInt8(obj.visible ? 1 : 0);

  return writer.toBuffer();
}

// ============================================
// TANO Baseline 4 (authClientServer_np) - 0 vars
// Neither SO nor TO has authClientServer_np variables
// ============================================

export function serializeTanoBaseline4(): Uint8Array {
  const writer = new BufferWriter(16);

  writer.writeUInt32LE(TANO_TYPE_CRC);
  writer.writeUInt8(4);
  writer.writeUInt16LE(0); // variable count

  return writer.toBuffer();
}

// ============================================
// TANO Baseline 6 (shared_np) - 8 vars
// SO: authServerProcessId, descriptionStringId
// TO: inCombat, passiveRevealPlayerCharacter,
//     mapColorOverride, accessList, guildAccessList, effectsMap
// ============================================

export function serializeTanoBaseline6(obj: TangibleObject): Uint8Array {
  const writer = new BufferWriter(128);

  writer.writeUInt32LE(TANO_TYPE_CRC);
  writer.writeUInt8(6);
  writer.writeUInt16LE(8); // variable count

  // -- ServerObject shared_np (2 vars) --

  // 0: authServerProcessId (uint32)
  writer.writeUInt32LE(0);

  // 1: descriptionStringId (StringId)
  writeStringId(writer, obj.detailStfFile || '', 0, obj.detailStfName || '');

  // -- TangibleObject shared_np (6 vars) --

  // 2: inCombat (bool)
  writer.writeUInt8(obj.inCombat ? 1 : 0);

  // 3: passiveRevealPlayerCharacter (AutoDeltaSet<NetworkId>)
  writeEmptyList(writer);

  // 4: mapColorOverride (uint32)
  writer.writeUInt32LE(0);

  // 5: accessList (AutoDeltaSet<NetworkId>)
  writeEmptyList(writer);

  // 6: guildAccessList (AutoDeltaSet<int>)
  writeEmptyList(writer);

  // 7: effectsMap (AutoDeltaMap<pair<Tag,string>, int>)
  writeEmptyList(writer);

  return writer.toBuffer();
}

// ============================================
// TANO Baseline 8 (firstParentAuthClientServer) - 0 vars
// ============================================

export function serializeTanoBaseline8(): Uint8Array {
  const writer = new BufferWriter(16);

  writer.writeUInt32LE(TANO_TYPE_CRC);
  writer.writeUInt8(8);
  writer.writeUInt16LE(0); // variable count

  return writer.toBuffer();
}

// ============================================
// TANO Baseline 9 (firstParentAuthClientServer_np) - 0 vars
// ============================================

export function serializeTanoBaseline9(): Uint8Array {
  const writer = new BufferWriter(16);

  writer.writeUInt32LE(TANO_TYPE_CRC);
  writer.writeUInt8(9);
  writer.writeUInt16LE(0); // variable count

  return writer.toBuffer();
}
