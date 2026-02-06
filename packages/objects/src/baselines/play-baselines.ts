/**
 * PLAY Baseline Serialization
 * Handles serialization of PlayerObject data for client synchronization
 *
 * Variable lists derived from C++ Packager.cpp (swg-source-docker):
 *   PLAY3 (shared, 20 vars): SO(4) + IO(1) + PO(15)
 *   PLAY6 (shared_np, 17 vars): SO(2) + PO(15) — NO IntangibleObject vars!
 *   PLAY8 (firstParentAuthClientServer, 9 vars): PO only
 *   PLAY9 (firstParentAuthClientServer_np, 29 vars): PO only
 */

import { BufferWriter } from '@swg/protocol';
import type { ObjectId } from '@swg/shared-types';
import {
  PlayerObject,
  type Waypoint,
} from '../player-object.js';

/** PLAY type identifier (CRC of "PLAY") */
export const PLAY_TYPE_CRC = 0x504c4159; // "PLAY" in ASCII

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

/** Write an empty BitArray: numBytes(0) + numBits(0) */
function writeEmptyBitArray(writer: BufferWriter): void {
  writer.writeInt32LE(0);
  writer.writeInt32LE(0);
}

/**
 * Write an empty MatchMakingId: vector<int> format
 * C++ MatchMakingId is bitset<128>, serialized as vector<int>
 * Empty = i32(0) (no int elements)
 */
function writeEmptyMatchMakingId(writer: BufferWriter): void {
  writer.writeInt32LE(0);
}

/**
 * Write pair<string, pair<bool, bool>> for GCW defender regions
 * C++ format: string + bool + bool
 */
function writeStringBoolBoolPair(
  writer: BufferWriter,
  str: string,
  b1: boolean,
  b2: boolean
): void {
  writeAsciiString(writer, str);
  writer.writeUInt8(b1 ? 1 : 0);
  writer.writeUInt8(b2 ? 1 : 0);
}

/**
 * Write WaypointDataBase for baseline serialization
 * C++ format: u32(appearanceCrc) + Location(Vector+NetworkId+u32) + Unicode(name) + NetworkId(legacy) + u8(color) + bool(active)
 * Location = Vector(x,y,z floats) + NetworkId(cell) + sceneIdCrc(u32)
 */
function writeWaypointDataBase(writer: BufferWriter, waypoint: Waypoint): void {
  // appearanceNameCrc (usually 0)
  writer.writeUInt32LE(0);
  // Location: Vector (x,y,z)
  writer.writeFloatLE(waypoint.x);
  writer.writeFloatLE(waypoint.y);
  writer.writeFloatLE(waypoint.z);
  // Location: cell NetworkId (0 for world waypoints)
  writer.writeUInt64LE(0n);
  // Location: sceneIdCrc (CRC of planet name - use 0 for now, proper CRC lookup needed)
  writer.writeUInt32LE(0);
  // Waypoint name (Unicode)
  writeUnicodeString(writer, waypoint.name);
  // Legacy NetworkId (always cms_invalid = 0)
  writer.writeUInt64LE(0n);
  // Color
  writer.writeUInt8(waypoint.color);
  // Active
  writer.writeUInt8(waypoint.active ? 1 : 0);
}

// ============================================
// PLAY Baseline 3 (shared) - 20 vars
// SO: complexity, nameStringId, objectName, volume
// IO: count
// PO: matchMakingCharacterProfileId, matchMakingPersonalProfileId,
//     skillTitle, bornDate, playedTime, roleIconChoice, skillTemplate,
//     currentGcwPoints, currentPvpKills, lifetimeGcwPoints, lifetimePvpKills,
//     collections, collections2, showBackpack, showHelmet
// ============================================

export function serializePlayBaseline3(obj: PlayerObject): Uint8Array {
  const writer = new BufferWriter(1024);

  writer.writeUInt32LE(PLAY_TYPE_CRC);
  writer.writeUInt8(3);
  writer.writeUInt16LE(20); // variable count

  // -- ServerObject shared (4 vars) --

  // 0: complexity (float)
  writer.writeFloatLE(obj.complexity);

  // 1: nameStringId (StringId) - table + textIndex + text
  writeStringId(writer, obj.objectNameStfFile, 0, obj.objectNameStfName);

  // 2: objectName (Unicode::String) - custom display name
  writeUnicodeString(writer, obj.customName);

  // 3: volume (int)
  writer.writeInt32LE(obj.volume);

  // -- IntangibleObject shared (1 var) --

  // 4: count (int) - IntangibleObject's count field
  writer.writeInt32LE(0);

  // -- PlayerObject shared (15 vars) --

  // 5: matchMakingCharacterProfileId (MatchMakingId = vector<int>)
  writeEmptyMatchMakingId(writer);

  // 6: matchMakingPersonalProfileId (MatchMakingId = vector<int>)
  writeEmptyMatchMakingId(writer);

  // 7: skillTitle (string)
  writeAsciiString(writer, obj.title);

  // 8: bornDate (int) - epoch seconds
  writer.writeInt32LE(Math.floor(obj.birthDate / 1000));

  // 9: playedTime (int) - total seconds played
  writer.writeInt32LE(obj.playedTime);

  // 10: roleIconChoice (int)
  writer.writeInt32LE(0);

  // 11: skillTemplate (string) - profession template name
  writeAsciiString(writer, obj.professionTitle);

  // 12: currentGcwPoints (int)
  writer.writeInt32LE(obj.gcwPoints);

  // 13: currentPvpKills (int)
  writer.writeInt32LE(obj.pvpKills);

  // 14: lifetimeGcwPoints (int)
  writer.writeInt32LE(obj.lifetimeGcwPoints);

  // 15: lifetimePvpKills (int)
  writer.writeInt32LE(obj.pvpKills);

  // 16: collections (BitArray)
  writeEmptyBitArray(writer);

  // 17: collections2 (BitArray)
  writeEmptyBitArray(writer);

  // 18: showBackpack (bool)
  writer.writeUInt8((obj.playerFlags & 64n) !== 0n ? 1 : 0); // PlayerFlags.SHOW_BACKPACK = 1n << 6n

  // 19: showHelmet (bool)
  writer.writeUInt8((obj.playerFlags & 1n) !== 0n ? 1 : 0); // PlayerFlags.SHOW_HELMET = 1n << 0n

  return writer.toBuffer();
}

// ============================================
// PLAY Baseline 6 (shared_np) - 17 vars
// SO: authServerProcessId, descriptionStringId
// (NO IntangibleObject vars - all are server-only!)
// PO: privledgedTitle, currentGcwRank, currentGcwRankProgress,
//     maxGcwImperialRank, maxGcwRebelRank, gcwRatingActualCalcTime,
//     citizenshipCity, citizenshipType, cityGcwDefenderRegion,
//     guildGcwDefenderRegion, squelchedById, squelchedByName,
//     squelchExpireTime, environmentFlags, defaultAttackOverride
// ============================================

export function serializePlayBaseline6(obj: PlayerObject): Uint8Array {
  const writer = new BufferWriter(512);

  writer.writeUInt32LE(PLAY_TYPE_CRC);
  writer.writeUInt8(6);
  writer.writeUInt16LE(17); // variable count

  // -- ServerObject shared_np (2 vars) --

  // 0: authServerProcessId (uint32)
  writer.writeUInt32LE(0);

  // 1: descriptionStringId (StringId) - detail description
  writeStringId(writer, obj.detailStfFile, 0, obj.detailStfName);

  // -- PlayerObject shared_np (15 vars) --

  // 2: privledgedTitle (int8) - admin level
  writer.writeInt8(obj.adminLevel);

  // 3: currentGcwRank (int)
  writer.writeInt32LE(0);

  // 4: currentGcwRankProgress (float)
  writer.writeFloatLE(0);

  // 5: maxGcwImperialRank (int)
  writer.writeInt32LE(0);

  // 6: maxGcwRebelRank (int)
  writer.writeInt32LE(0);

  // 7: gcwRatingActualCalcTime (int32) - epoch time
  writer.writeInt32LE(0);

  // 8: citizenshipCity (string)
  writeAsciiString(writer, '');

  // 9: citizenshipType (int)
  writer.writeInt32LE(0);

  // 10: cityGcwDefenderRegion (pair<string, pair<bool, bool>>)
  writeStringBoolBoolPair(writer, '', false, false);

  // 11: guildGcwDefenderRegion (pair<string, pair<bool, bool>>)
  writeStringBoolBoolPair(writer, '', false, false);

  // 12: squelchedById (NetworkId)
  writer.writeUInt64LE(0n);

  // 13: squelchedByName (string)
  writeAsciiString(writer, '');

  // 14: squelchExpireTime (int32) - epoch time
  writer.writeInt32LE(0);

  // 15: environmentFlags (int)
  writer.writeInt32LE(0);

  // 16: defaultAttackOverride (string)
  writeAsciiString(writer, '');

  return writer.toBuffer();
}

// ============================================
// PLAY Baseline 8 (firstParentAuthClientServer) - 9 vars
// PO: experiencePoints, waypoints, forcePower, maxForcePower,
//     completedQuests, activeQuests, currentQuest, quests, workingSkill
// ============================================

export function serializePlayBaseline8(obj: PlayerObject): Uint8Array {
  const writer = new BufferWriter(2048);

  writer.writeUInt32LE(PLAY_TYPE_CRC);
  writer.writeUInt8(8);
  writer.writeUInt16LE(9); // variable count

  // 0: experiencePoints (AutoDeltaMap<string, int>)
  writer.writeUInt32LE(obj.experience.size);
  writer.writeUInt32LE(0); // update counter
  for (const [xpType, amount] of obj.experience) {
    writer.writeUInt8(0); // ADD command
    writeAsciiString(writer, xpType);
    writer.writeInt32LE(amount);
  }

  // 1: waypoints (AutoDeltaMap<NetworkId, WaypointDataBase>)
  writer.writeUInt32LE(obj.waypoints.size);
  writer.writeUInt32LE(0); // update counter
  for (const [waypointId, waypoint] of obj.waypoints) {
    writer.writeUInt8(0); // ADD command
    writer.writeUInt64LE(waypointId); // key: NetworkId
    writeWaypointDataBase(writer, waypoint); // value
  }

  // 2: forcePower (int)
  writer.writeInt32LE(0);

  // 3: maxForcePower (int)
  writer.writeInt32LE(0);

  // 4: completedQuests (BitArray) - old quest system
  writeEmptyBitArray(writer);

  // 5: activeQuests (BitArray) - old quest system
  writeEmptyBitArray(writer);

  // 6: currentQuest (uint32)
  writer.writeUInt32LE(0);

  // 7: quests (AutoDeltaPackedMap<uint32, PlayerQuestData>)
  // PlayerQuestData: NetworkId(questGiver) + u16(activeTasks) + u16(completedTasks) + bool(completed) + u32(relativeAgeIndex) + bool(hasReceivedReward)
  writeEmptyList(writer); // empty for now

  // 8: workingSkill (string)
  writeAsciiString(writer, '');

  return writer.toBuffer();
}

// ============================================
// PLAY Baseline 9 (firstParentAuthClientServer_np) - 29 vars
// PO: craftingLevel, craftingStage, craftingStation, draftSchematics,
//     craftingComponentBioLink, experimentPoints, expModified,
//     friendList, ignoreList, spokenLanguage, food, maxFood, drink,
//     maxDrink, meds, maxMeds, groupWaypoints, playerHateList,
//     killMeter, accountNumLotsOverLimitSpam, petId, petCommandList,
//     petToggledCommands, guildRank, citizenRank, galacticReserveDeposit,
//     pgcRatingCount, pgcRatingTotal, pgcLastRatingTime
// ============================================

export function serializePlayBaseline9(obj: PlayerObject): Uint8Array {
  const writer = new BufferWriter(2048);

  writer.writeUInt32LE(PLAY_TYPE_CRC);
  writer.writeUInt8(9);
  writer.writeUInt16LE(29); // variable count

  // 0: craftingLevel (int)
  writer.writeInt32LE(0);

  // 1: craftingStage (int)
  writer.writeInt32LE(obj.craftingStage);

  // 2: craftingStation (NetworkId)
  writer.writeUInt64LE(obj.nearestCraftingStation);

  // 3: draftSchematics (AutoDeltaMap<pair<uint32,uint32>, int>)
  // key: pair<u32(serverCrc), u32(clientCrc)>, value: i32(count)
  writer.writeUInt32LE(obj.schematicsGranted.size);
  writer.writeUInt32LE(0); // update counter
  for (const crc of obj.schematicsGranted) {
    writer.writeUInt8(0); // ADD command
    writer.writeUInt32LE(crc); // server CRC
    writer.writeUInt32LE(crc); // client CRC (same for now)
    writer.writeInt32LE(1); // count
  }

  // 4: craftingComponentBioLink (NetworkId)
  writer.writeUInt64LE(0n);

  // 5: experimentPoints (int)
  writer.writeInt32LE(0);

  // 6: expModified (int)
  writer.writeInt32LE(0);

  // 7: friendList (AutoDeltaSet<string>)
  writer.writeUInt32LE(obj.friends.size);
  writer.writeUInt32LE(0); // update counter
  for (const name of obj.friends) {
    writer.writeUInt8(0); // ADD command
    writeAsciiString(writer, name);
  }

  // 8: ignoreList (AutoDeltaSet<string>)
  writer.writeUInt32LE(obj.ignore.size);
  writer.writeUInt32LE(0); // update counter
  for (const name of obj.ignore) {
    writer.writeUInt8(0); // ADD command
    writeAsciiString(writer, name);
  }

  // 9: spokenLanguage (int)
  writer.writeInt32LE(0);

  // 10: food (int)
  writer.writeInt32LE(obj.foodFillCurrent);

  // 11: maxFood (int)
  writer.writeInt32LE(obj.foodFillMax);

  // 12: drink (int)
  writer.writeInt32LE(obj.drinkFillCurrent);

  // 13: maxDrink (int)
  writer.writeInt32LE(obj.drinkFillMax);

  // 14: meds (int)
  writer.writeInt32LE(0);

  // 15: maxMeds (int)
  writer.writeInt32LE(0);

  // 16: groupWaypoints (AutoDeltaMap<string, NetworkId>)
  writeEmptyList(writer);

  // 17: playerHateList (AutoDeltaSet<NetworkId>)
  writeEmptyList(writer);

  // 18: killMeter (int)
  writer.writeInt32LE(0);

  // 19: accountNumLotsOverLimitSpam (int)
  writer.writeInt32LE(0);

  // 20: petId (NetworkId)
  writer.writeUInt64LE(0n);

  // 21: petCommandList (AutoDeltaVector<string>)
  writeEmptyList(writer);

  // 22: petToggledCommands (AutoDeltaVector<string>)
  writeEmptyList(writer);

  // 23: guildRank (string)
  writeAsciiString(writer, '');

  // 24: citizenRank (string)
  writeAsciiString(writer, '');

  // 25: galacticReserveDeposit (int)
  writer.writeInt32LE(0);

  // 26: pgcRatingCount (int)
  writer.writeInt32LE(0);

  // 27: pgcRatingTotal (int)
  writer.writeInt32LE(0);

  // 28: pgcLastRatingTime (int)
  writer.writeInt32LE(0);

  return writer.toBuffer();
}

// ============================================
// Delta Generators (stubs - not needed for zone-in)
// ============================================

export function generatePlayBaseline3Delta(
  _obj: PlayerObject,
  _changedProperties: number[]
): Uint8Array | null {
  return null;
}

export function generatePlayBaseline6Delta(
  _obj: PlayerObject,
  _changedProperties: number[]
): Uint8Array | null {
  return null;
}

export function generatePlayBaseline8Delta(
  _obj: PlayerObject,
  _changedProperties: number[]
): Uint8Array | null {
  return null;
}

export function generatePlayBaseline9Delta(
  _obj: PlayerObject,
  _changedProperties: number[]
): Uint8Array | null {
  return null;
}

export function generateExperienceDelta(
  _obj: PlayerObject,
  _operation: number,
  _xpType: string,
  _amount?: number
): Uint8Array {
  return new Uint8Array(0);
}

export function generateWaypointsDelta(
  _obj: PlayerObject,
  _operation: number,
  _waypoint?: Waypoint,
  _waypointId?: ObjectId
): Uint8Array {
  return new Uint8Array(0);
}

export function generateFriendsDelta(
  _obj: PlayerObject,
  _operation: number,
  _name?: string,
  _index?: number
): Uint8Array {
  return new Uint8Array(0);
}

export function generateIgnoreDelta(
  _obj: PlayerObject,
  _operation: number,
  _name?: string,
  _index?: number
): Uint8Array {
  return new Uint8Array(0);
}

// ============================================
// Deserializers (stubs - not needed for zone-in)
// ============================================

export function deserializePlayBaseline3(_obj: PlayerObject, _data: Uint8Array): void {}
export function deserializePlayBaseline6(_obj: PlayerObject, _data: Uint8Array): void {}
export function deserializePlayBaseline8(_obj: PlayerObject, _data: Uint8Array): void {}
export function deserializePlayBaseline9(_obj: PlayerObject, _data: Uint8Array): void {}

// ============================================
// Create All Baselines
// ============================================

export function createPlayBaselines(obj: PlayerObject): Uint8Array[] {
  return [
    serializePlayBaseline3(obj),
    serializePlayBaseline6(obj),
    serializePlayBaseline8(obj),
    serializePlayBaseline9(obj),
  ];
}
