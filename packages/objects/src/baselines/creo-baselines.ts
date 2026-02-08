/**
 * CREO Baseline Serialization
 * Handles serialization of CreatureObject data for client synchronization
 *
 * Variable lists derived from C++ Packager.cpp (swg-source-docker):
 *   CREO1 (authClientServer, 4 vars): SO + CO
 *   CREO3 (shared, 19 vars): SO + TO + CO
 *   CREO4 (authClientServer_np, 16 vars): CO only
 *   CREO6 (shared_np, 35 vars): SO + TO + CO
 */

import { BufferWriter, BufferReader } from '@swg/protocol';
import type { ObjectId } from '@swg/shared-types';
import {
  CreatureObject,
  HAM_ATTRIBUTE_COUNT,
  CreoProperty,
  type EquipmentSlotType,
  type CreatureBuff,
  type PostureType,
  type LocomotionType,
} from '../creature-object.js';

/** CREO type identifier (CRC of "CREO") */
export const CREO_TYPE_CRC = 0x4352454f; // "CREO" in ASCII

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

/** Read ASCII string with 16-bit LE length prefix */
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

/** Write an empty BitArray: numBytes(0) + numBits(0) */
function writeEmptyBitArray(writer: BufferWriter): void {
  writer.writeInt32LE(0);
  writer.writeInt32LE(0);
}

/**
 * Write an empty PlayerAndShipPair:
 * pair<pair<NetworkId, string>, NetworkId>
 * = NetworkId(0) + string("") + NetworkId(0)
 */
function writeEmptyPlayerAndShipPair(writer: BufferWriter): void {
  writer.writeUInt64LE(0n); // first.first (playerId)
  writeAsciiString(writer, ''); // first.second (playerName)
  writer.writeUInt64LE(0n); // second (shipId)
}

// ============================================
// CREO Baseline 1 (authClientServer) - 4 vars
// SO: bankBalance, cashBalance
// CO: maxAttributes, skills
// ============================================

export function serializeCreoBaseline1(obj: CreatureObject): Uint8Array {
  const writer = new BufferWriter(512);

  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(1);
  writer.writeUInt16LE(4); // variable count

  // 0: bankBalance (int) - ServerObject
  writer.writeInt32LE(obj.bankCredits);

  // 1: cashBalance (int) - ServerObject
  writer.writeInt32LE(obj.cashCredits);

  // 2: maxAttributes (AutoDeltaVector<int>) - CreatureObject
  // 9 HAM max values: Health, Str, Con, Action, Quick, Stam, Mind, Focus, Will
  const hamMax = obj.getHamMaxArray();
  writer.writeUInt32LE(HAM_ATTRIBUTE_COUNT); // size
  writer.writeUInt32LE(0); // update counter
  for (const val of hamMax) {
    writer.writeInt32LE(val);
  }

  // 3: skills (AutoDeltaSet<string>) - CreatureObject
  // AutoDeltaSet baseline: size + counter + [u8(ADD) + element]*
  writer.writeUInt32LE(obj.skills.size);
  writer.writeUInt32LE(0); // update counter
  for (const skillName of obj.skills) {
    writer.writeUInt8(0); // ADD command
    writeAsciiString(writer, skillName);
  }

  return writer.toBuffer();
}

// ============================================
// CREO Baseline 3 (shared) - 19 vars
// SO: complexity, nameStringId, objectName, volume
// TO: pvpFaction, pvpType, appearanceData, components,
//     condition, count, damageTaken, maxHitPoints, visible
// CO: posture, rank, masterId, scaleFactor, shockWounds, states
// ============================================

export function serializeCreoBaseline3(obj: CreatureObject): Uint8Array {
  const writer = new BufferWriter(2048);

  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(3);
  writer.writeUInt16LE(19); // variable count

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
  // Serialize Uint8Array as string: u16LE(length) + raw bytes
  writer.writeUInt16LE(obj.appearanceData.length);
  if (obj.appearanceData.length > 0) {
    writer.writeBytes(obj.appearanceData);
  }

  // 7: components (AutoDeltaSet<int>) - crafted component CRCs
  writeEmptyList(writer); // empty for players

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

  // -- CreatureObject shared (6 vars) --

  // 13: posture (Postures::Enumerator / uint8)
  writer.writeUInt8(obj.posture);

  // 14: rank (uint8) - faction rank
  writer.writeUInt8(obj.factionRank);

  // 15: masterId (NetworkId)
  writer.writeUInt64LE(obj.masterId);

  // 16: scaleFactor (float) - character height/scale
  writer.writeFloatLE(obj.height);

  // 17: shockWounds (int) - battle fatigue
  writer.writeInt32LE(obj.battleFatigue);

  // 18: states (uint64) - creature state bitmask
  writer.writeUInt64LE(obj.stateBitmask);

  return writer.toBuffer();
}

// ============================================
// CREO Baseline 4 (authClientServer_np) - 16 vars
// CO only: movement, skill mods, commands
// ============================================

export function serializeCreoBaseline4(obj: CreatureObject): Uint8Array {
  const writer = new BufferWriter(2048);

  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(4);
  writer.writeUInt16LE(16); // variable count

  // 0: accelPercent (float) - acceleration multiplier base
  writer.writeFloatLE(obj.accelMultiplierBase);

  // 1: accelScale (float) - acceleration scale
  writer.writeFloatLE(obj.accelScale);

  // 2: attribBonus (AutoDeltaVector<int>) - HAM attribute bonuses (9 values)
  writer.writeUInt32LE(0); // empty for now
  writer.writeUInt32LE(0);

  // 3: modMap (AutoDeltaMap<string, pair<int,int>>) - skill mods
  // Each entry: u8(0) + string(name) + i32(base) + i32(modifier)
  writer.writeUInt32LE(obj.skillMods.size);
  writer.writeUInt32LE(obj.getListUpdateCounter('skillMods'));
  for (const [modName, value] of obj.skillMods) {
    writer.writeUInt8(0); // ADD command
    writeAsciiString(writer, modName);
    writer.writeInt32LE(value); // base value
    writer.writeInt32LE(0); // modifier (bonus)
  }

  // 4: movementPercent (float) - speed multiplier base
  writer.writeFloatLE(obj.speedMultiplierBase);

  // 5: movementScale (float) - speed multiplier mod
  writer.writeFloatLE(obj.speedMultiplierMod);

  // 6: performanceListenTarget (NetworkId)
  writer.writeUInt64LE(obj.listenToId);

  // 7: runSpeed (float)
  writer.writeFloatLE(obj.runSpeed);

  // 8: slopeModAngle (float)
  writer.writeFloatLE(obj.slopeModeAngle);

  // 9: slopeModPercent (float)
  writer.writeFloatLE(obj.slopeModPercent);

  // 10: turnScale (float) - turn rate
  writer.writeFloatLE(obj.turnRate);

  // 11: walkSpeed (float)
  writer.writeFloatLE(obj.walkSpeed);

  // 12: waterModPercent (float)
  writer.writeFloatLE(obj.waterModPercent);

  // 13: groupMissionCriticalObjectSet (AutoDeltaSet<pair<NetworkId,NetworkId>>)
  writeEmptyList(writer);

  // 14: commands (AutoDeltaMap<string,int>) - command queue
  writeEmptyList(writer);

  // 15: totalLevelXp (int)
  writer.writeInt32LE(0);

  return writer.toBuffer();
}

// ============================================
// CREO Baseline 6 (shared_np) - 35 vars
// SO: authServerProcessId, descriptionStringId
// TO: inCombat, passiveRevealPlayerCharacter, mapColorOverride,
//     accessList, guildAccessList, effectsMap
// CO: level, levelHealthGranted, animatingSkillData, animationMood,
//     currentWeapon, group, groupInviter, guildId, lookAtTarget,
//     intendedTarget, mood, performanceStartTime, performanceType,
//     totalAttributes, totalMaxAttributes, wearableData,
//     alternateAppearanceSharedObjectTemplateName, coverVisibility,
//     buffs, clientUsesAnimationLocomotion, difficulty, hologramType,
//     visibleOnMapAndRadar, isBeast, forceShowHam,
//     wearableAppearanceData, decoyOrigin
// ============================================

export function serializeCreoBaseline6(obj: CreatureObject): Uint8Array {
  const writer = new BufferWriter(4096);

  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(6);
  writer.writeUInt16LE(35); // variable count

  // -- ServerObject shared_np (2 vars) --

  // 0: authServerProcessId (uint32) - server process ID
  writer.writeUInt32LE(0);

  // 1: descriptionStringId (StringId) - detail description
  writeStringId(writer, obj.detailStfFile, 0, obj.detailStfName);

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

  // 7: effectsMap (AutoDeltaMap<string, ...>)
  writeEmptyList(writer);

  // -- CreatureObject shared_np (27 vars) --

  // 8: level (int16)
  writer.writeInt16LE(obj.level);

  // 9: levelHealthGranted (int)
  writer.writeInt32LE(obj.grantedHealth);

  // 10: animatingSkillData (string) - currently playing skill animation
  writeAsciiString(writer, '');

  // 11: animationMood (string) - mood animation name
  writeAsciiString(writer, obj.mood || 'neutral');

  // 12: currentWeapon (CachedNetworkId / NetworkId)
  writer.writeUInt64LE(obj.weaponId);

  // 13: group (CachedNetworkId / NetworkId)
  writer.writeUInt64LE(obj.groupId);

  // 14: groupInviter (PlayerAndShipPair = pair<pair<NetworkId,string>, NetworkId>)
  writer.writeUInt64LE(obj.inviteSenderId); // inviter player ID
  writeAsciiString(writer, ''); // inviter name
  writer.writeUInt64LE(0n); // inviter ship ID

  // 15: guildId (int)
  writer.writeInt32LE(obj.guildId);

  // 16: lookAtTarget (NetworkId)
  writer.writeUInt64LE(obj.targetId);

  // 17: intendedTarget (NetworkId)
  writer.writeUInt64LE(0n);

  // 18: mood (unsigned char)
  writer.writeUInt8(obj.moodId & 0xff);

  // 19: performanceStartTime (int)
  writer.writeInt32LE(obj.performanceStartTime);

  // 20: performanceType (int) - performance ID
  writer.writeInt32LE(obj.performanceId);

  // 21: totalAttributes (AutoDeltaVector<int>) - HAM current values (9 ints)
  const hamCurrent = obj.getHamCurrentArray();
  writer.writeUInt32LE(HAM_ATTRIBUTE_COUNT);
  writer.writeUInt32LE(0);
  for (const val of hamCurrent) {
    writer.writeInt32LE(val);
  }

  // 22: totalMaxAttributes (AutoDeltaVector<int>) - HAM max values (9 ints)
  const hamMax = obj.getHamMaxArray();
  writer.writeUInt32LE(HAM_ATTRIBUTE_COUNT);
  writer.writeUInt32LE(0);
  for (const val of hamMax) {
    writer.writeInt32LE(val);
  }

  // 23: wearableData (AutoDeltaVector<WearableEntry>)
  // WearableEntry: string + i32(arrangement) + NetworkId + i32(templateCRC) + bool(isWeapon)
  // Send equipped items as wearable data
  const wearableCount = obj.equippedItems.size;
  writer.writeUInt32LE(wearableCount);
  writer.writeUInt32LE(0);
  for (const [slot, itemId] of obj.equippedItems) {
    writeAsciiString(writer, ''); // customization string (empty)
    writer.writeInt32LE(slot); // arrangement index
    writer.writeUInt64LE(itemId); // network ID
    writer.writeInt32LE(0); // template CRC (would need lookup)
    writer.writeUInt8(0); // isWeapon = false
  }

  // 24: alternateAppearanceSharedObjectTemplateName (string)
  writeAsciiString(writer, '');

  // 25: coverVisibility (bool)
  writer.writeUInt8(0);

  // 26: buffs (AutoDeltaMap<uint32, PackedBuff>)
  // PackedBuff: u32(endtime) + float(value) + u32(duration) + NetworkId(caster) + u32(stackCount)
  writer.writeUInt32LE(obj.buffs.size);
  writer.writeUInt32LE(0);
  for (const [crc, buff] of obj.buffs) {
    writer.writeUInt8(0); // ADD command
    writer.writeUInt32LE(crc); // key: buff CRC
    writer.writeUInt32LE(Math.floor(buff.duration)); // endtime
    writer.writeFloatLE(0); // value
    writer.writeUInt32LE(Math.floor(buff.duration)); // duration
    writer.writeUInt64LE(buff.casterId); // caster
    writer.writeUInt32LE(1); // stack count
  }

  // 27: clientUsesAnimationLocomotion (bool)
  writer.writeUInt8(0);

  // 28: difficulty (unsigned char)
  writer.writeUInt8(obj.difficulty);

  // 29: hologramType (int32)
  writer.writeInt32LE(0);

  // 30: visibleOnMapAndRadar (bool)
  writer.writeUInt8(1); // true for players

  // 31: isBeast (bool)
  writer.writeUInt8(0);

  // 32: forceShowHam (bool)
  writer.writeUInt8(0);

  // 33: wearableAppearanceData (AutoDeltaVector<WearableEntry>)
  writeEmptyList(writer); // empty for now

  // 34: decoyOrigin (NetworkId)
  writer.writeUInt64LE(0n);

  return writer.toBuffer();
}

// ============================================
// CREO Baseline 8 (firstParentAuthClientServer) - 0 vars
// TangibleObject has no firstParentAuthClientServer variables,
// but the client expects this package to exist. Send empty.
// ============================================

export function serializeCreoBaseline8(_obj: CreatureObject): Uint8Array {
  const writer = new BufferWriter(16);
  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(8);
  writer.writeUInt16LE(0); // variable count = 0
  return writer.toBuffer();
}

// ============================================
// CREO Baseline 9 (firstParentAuthClientServer_np) - 0 vars
// TangibleObject has no firstParentAuthClientServer_np variables,
// but the client expects this package to exist. Send empty.
// ============================================

export function serializeCreoBaseline9(_obj: CreatureObject): Uint8Array {
  const writer = new BufferWriter(16);
  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(9);
  writer.writeUInt16LE(0); // variable count = 0
  return writer.toBuffer();
}

// ============================================
// Delta Generators (stubs - not needed for zone-in)
// ============================================

export function generateCreoBaseline1Delta(
  _obj: CreatureObject,
  _changedProperties: number[]
): Uint8Array | null {
  return null;
}

export function generateCreoBaseline3Delta(
  _obj: CreatureObject,
  _changedProperties: number[]
): Uint8Array | null {
  return null;
}

export function generateCreoBaseline4Delta(
  _obj: CreatureObject,
  _changedProperties: number[]
): Uint8Array | null {
  return null;
}

export function generateCreoBaseline6Delta(
  _obj: CreatureObject,
  _changedProperties: number[]
): Uint8Array | null {
  return null;
}

export function generateHamCurrentDelta(
  _obj: CreatureObject,
  _attributeIndex: number
): Uint8Array {
  return new Uint8Array(0);
}

export function generateSkillsDelta(
  _obj: CreatureObject,
  _operation: number,
  _skillName?: string,
  _index?: number
): Uint8Array {
  return new Uint8Array(0);
}

export function generateDefendersDelta(
  _obj: CreatureObject,
  _operation: number,
  _defenderId?: ObjectId,
  _index?: number
): Uint8Array {
  return new Uint8Array(0);
}

// ============================================
// Deserializers (stubs - not needed for zone-in)
// ============================================

export function deserializeCreoBaseline1(_obj: CreatureObject, _data: Uint8Array): void {}
export function deserializeCreoBaseline3(_obj: CreatureObject, _data: Uint8Array): void {}
export function deserializeCreoBaseline4(_obj: CreatureObject, _data: Uint8Array): void {}
export function deserializeCreoBaseline6(_obj: CreatureObject, _data: Uint8Array): void {}

// ============================================
// Create All Baselines
// ============================================

export function createCreoBaselines(obj: CreatureObject): Uint8Array[] {
  return [
    serializeCreoBaseline1(obj),
    serializeCreoBaseline3(obj),
    serializeCreoBaseline4(obj),
    serializeCreoBaseline6(obj),
    serializeCreoBaseline8(obj),
    serializeCreoBaseline9(obj),
  ];
}
