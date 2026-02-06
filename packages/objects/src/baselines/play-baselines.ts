/**
 * PLAY Baseline Serialization
 * Handles serialization of PlayerObject data for client synchronization
 *
 * SWG baselines are packets that synchronize object state between server and client.
 * Player objects (PLAY) use baselines 3, 6, 8, and 9 for their specific data.
 *
 * Baseline 3: Station ID, flags, biography, born date, title
 * Baseline 6: Admin level, XP types, waypoints, crafting stage, quests
 * Baseline 8: Food/drink fill, GCW points, home region
 * Baseline 9: Played time, profession, friends, ignore
 */

import { BufferWriter, BufferReader } from '@swg/protocol';
import type { ObjectId, CrcValue } from '@swg/shared-types';
import {
  PlayerObject,
  PlayProperty,
  type Waypoint,
  type QuestState,
  type AdminLevelType,
  type CraftingStageType,
} from '../player-object.js';

/** PLAY type identifier (CRC of "PLAY") */
export const PLAY_TYPE_CRC = 0x504c4159; // "PLAY" in ASCII

/**
 * Serialize PLAY Baseline 3 (station ID, flags, biography, born date)
 */
export function serializePlayBaseline3(obj: PlayerObject): Uint8Array {
  const writer = new BufferWriter(512);

  // Baseline header
  writer.writeUInt32LE(PLAY_TYPE_CRC);
  writer.writeUInt8(3);

  // Variable count placeholder
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let variableCount = 0;

  // 0: Station ID (ASCII string)
  writeAsciiString(writer, obj.stationId);
  variableCount++;

  // 1: Player flags (64-bit)
  writer.writeUInt64LE(obj.playerFlags);
  variableCount++;

  // 2: Biography (Unicode string)
  writeUnicodeString(writer, obj.biography);
  variableCount++;

  // 3: Born date (timestamp)
  writer.writeUInt32LE(Math.floor(obj.birthDate / 1000)); // Convert to seconds
  variableCount++;

  // 4: Current title (ASCII string)
  writeAsciiString(writer, obj.title);
  variableCount++;

  // Update variable count
  const endPos = writer.getPosition();
  writer.setPosition(variableCountPos);
  writer.writeUInt16LE(variableCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Serialize PLAY Baseline 6 (admin level, XP, waypoints, crafting, quests)
 */
export function serializePlayBaseline6(obj: PlayerObject): Uint8Array {
  const writer = new BufferWriter(2048);

  // Baseline header
  writer.writeUInt32LE(PLAY_TYPE_CRC);
  writer.writeUInt8(6);

  // Variable count placeholder
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let variableCount = 0;

  // 0: Admin level
  writer.writeUInt8(obj.adminLevel);
  variableCount++;

  // 1: Experience map
  writer.writeUInt32LE(obj.experience.size);
  writer.writeUInt32LE(obj.getPlayListUpdateCounter('experience'));
  for (const [type, amount] of obj.experience) {
    writer.writeUInt8(0); // Flag for add operation
    writeAsciiString(writer, type);
    writer.writeInt32LE(amount);
  }
  variableCount++;

  // 2: Waypoints map
  writer.writeUInt32LE(obj.waypoints.size);
  writer.writeUInt32LE(obj.getPlayListUpdateCounter('waypoints'));
  for (const [id, waypoint] of obj.waypoints) {
    writer.writeUInt8(0); // Flag for add operation
    writeWaypointEntry(writer, waypoint);
  }
  variableCount++;

  // 3: Crafting stage
  writer.writeUInt32LE(obj.craftingStage);
  variableCount++;

  // 4: Crafting schematic CRC
  writer.writeUInt32LE(obj.craftingSchematic);
  variableCount++;

  // 5: Nearest crafting station ID
  writer.writeUInt64LE(obj.nearestCraftingStation);
  variableCount++;

  // 6: Draft schematics list
  writer.writeUInt32LE(obj.schematicsGranted.size);
  writer.writeUInt32LE(obj.getPlayListUpdateCounter('schematics'));
  for (const crc of obj.schematicsGranted) {
    writer.writeUInt32LE(crc);
  }
  variableCount++;

  // 7: Active quests map
  writer.writeUInt32LE(obj.activeQuests.size);
  writer.writeUInt32LE(obj.getPlayListUpdateCounter('activeQuests'));
  for (const [crc, state] of obj.activeQuests) {
    writer.writeUInt8(0); // Flag for add operation
    writeQuestEntry(writer, state);
  }
  variableCount++;

  // 8: Completed quests list
  writer.writeUInt32LE(obj.completedQuests.size);
  writer.writeUInt32LE(obj.getPlayListUpdateCounter('completedQuests'));
  for (const crc of obj.completedQuests) {
    writer.writeUInt32LE(crc);
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
 * Serialize PLAY Baseline 8 (food/drink fill, GCW points, home region)
 */
export function serializePlayBaseline8(obj: PlayerObject): Uint8Array {
  const writer = new BufferWriter(256);

  // Baseline header
  writer.writeUInt32LE(PLAY_TYPE_CRC);
  writer.writeUInt8(8);

  // Variable count placeholder
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let variableCount = 0;

  // 0: Food fill current
  writer.writeUInt32LE(obj.foodFillCurrent);
  variableCount++;

  // 1: Food fill max
  writer.writeUInt32LE(obj.foodFillMax);
  variableCount++;

  // 2: Drink fill current
  writer.writeUInt32LE(obj.drinkFillCurrent);
  variableCount++;

  // 3: Drink fill max
  writer.writeUInt32LE(obj.drinkFillMax);
  variableCount++;

  // 4: GCW points
  writer.writeUInt32LE(obj.gcwPoints);
  variableCount++;

  // 5: PvP kills
  writer.writeUInt32LE(obj.pvpKills);
  variableCount++;

  // 6: Lifetime GCW points
  writer.writeUInt32LE(obj.lifetimeGcwPoints);
  variableCount++;

  // 7: Home region CRC
  writer.writeUInt32LE(obj.homeRegion);
  variableCount++;

  // Update variable count
  const endPos = writer.getPosition();
  writer.setPosition(variableCountPos);
  writer.writeUInt16LE(variableCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Serialize PLAY Baseline 9 (played time, profession, friends, ignore)
 */
export function serializePlayBaseline9(obj: PlayerObject): Uint8Array {
  const writer = new BufferWriter(1024);

  // Baseline header
  writer.writeUInt32LE(PLAY_TYPE_CRC);
  writer.writeUInt8(9);

  // Variable count placeholder
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let variableCount = 0;

  // 0: Played time (seconds)
  writer.writeUInt32LE(obj.playedTime);
  variableCount++;

  // 1: Profession title
  writeAsciiString(writer, obj.professionTitle);
  variableCount++;

  // 2: Friends list
  writer.writeUInt32LE(obj.friends.size);
  writer.writeUInt32LE(obj.getPlayListUpdateCounter('friends'));
  for (const name of obj.friends) {
    writeAsciiString(writer, name);
  }
  variableCount++;

  // 3: Ignore list
  writer.writeUInt32LE(obj.ignore.size);
  writer.writeUInt32LE(obj.getPlayListUpdateCounter('ignore'));
  for (const name of obj.ignore) {
    writeAsciiString(writer, name);
  }
  variableCount++;

  // 4: Matchmaking flags
  writer.writeUInt32LE(obj.matchMakingFlags);
  variableCount++;

  // 5: Chat flags
  writer.writeUInt32LE(obj.chatFlags);
  variableCount++;

  // Update variable count
  const endPos = writer.getPosition();
  writer.setPosition(variableCountPos);
  writer.writeUInt16LE(variableCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Generate delta for PLAY Baseline 3 changes
 */
export function generatePlayBaseline3Delta(
  obj: PlayerObject,
  changedProperties: number[]
): Uint8Array | null {
  if (changedProperties.length === 0) {
    return null;
  }

  const writer = new BufferWriter(256);

  // Delta header
  writer.writeUInt32LE(PLAY_TYPE_CRC);
  writer.writeUInt8(3);

  const updateCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let updateCount = 0;

  for (const prop of changedProperties) {
    switch (prop) {
      case PlayProperty.STATION_ID:
        writer.writeUInt16LE(0);
        writeAsciiString(writer, obj.stationId);
        updateCount++;
        break;

      case PlayProperty.PLAYER_FLAGS:
        writer.writeUInt16LE(1);
        writer.writeUInt64LE(obj.playerFlags);
        updateCount++;
        break;

      case PlayProperty.BIOGRAPHY:
        writer.writeUInt16LE(2);
        writeUnicodeString(writer, obj.biography);
        updateCount++;
        break;

      case PlayProperty.BORN_DATE:
        writer.writeUInt16LE(3);
        writer.writeUInt32LE(Math.floor(obj.birthDate / 1000));
        updateCount++;
        break;

      case PlayProperty.CURRENT_TITLE:
        writer.writeUInt16LE(4);
        writeAsciiString(writer, obj.title);
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
 * Generate delta for PLAY Baseline 6 changes
 */
export function generatePlayBaseline6Delta(
  obj: PlayerObject,
  changedProperties: number[]
): Uint8Array | null {
  if (changedProperties.length === 0) {
    return null;
  }

  const writer = new BufferWriter(256);

  // Delta header
  writer.writeUInt32LE(PLAY_TYPE_CRC);
  writer.writeUInt8(6);

  const updateCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let updateCount = 0;

  for (const prop of changedProperties) {
    switch (prop) {
      case PlayProperty.ADMIN_LEVEL:
        writer.writeUInt16LE(0);
        writer.writeUInt8(obj.adminLevel);
        updateCount++;
        break;

      case PlayProperty.CRAFTING_STAGE:
        writer.writeUInt16LE(3);
        writer.writeUInt32LE(obj.craftingStage);
        updateCount++;
        break;

      case PlayProperty.CRAFTING_SCHEMATIC:
        writer.writeUInt16LE(4);
        writer.writeUInt32LE(obj.craftingSchematic);
        updateCount++;
        break;

      case PlayProperty.NEAREST_CRAFTING_STATION:
        writer.writeUInt16LE(5);
        writer.writeUInt64LE(obj.nearestCraftingStation);
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
 * Generate delta for PLAY Baseline 8 changes
 */
export function generatePlayBaseline8Delta(
  obj: PlayerObject,
  changedProperties: number[]
): Uint8Array | null {
  if (changedProperties.length === 0) {
    return null;
  }

  const writer = new BufferWriter(64);

  // Delta header
  writer.writeUInt32LE(PLAY_TYPE_CRC);
  writer.writeUInt8(8);

  const updateCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let updateCount = 0;

  for (const prop of changedProperties) {
    switch (prop) {
      case PlayProperty.FOOD_FILL_CURRENT:
        writer.writeUInt16LE(0);
        writer.writeUInt32LE(obj.foodFillCurrent);
        updateCount++;
        break;

      case PlayProperty.FOOD_FILL_MAX:
        writer.writeUInt16LE(1);
        writer.writeUInt32LE(obj.foodFillMax);
        updateCount++;
        break;

      case PlayProperty.DRINK_FILL_CURRENT:
        writer.writeUInt16LE(2);
        writer.writeUInt32LE(obj.drinkFillCurrent);
        updateCount++;
        break;

      case PlayProperty.DRINK_FILL_MAX:
        writer.writeUInt16LE(3);
        writer.writeUInt32LE(obj.drinkFillMax);
        updateCount++;
        break;

      case PlayProperty.GCW_POINTS:
        writer.writeUInt16LE(4);
        writer.writeUInt32LE(obj.gcwPoints);
        updateCount++;
        break;

      case PlayProperty.PVP_KILLS:
        writer.writeUInt16LE(5);
        writer.writeUInt32LE(obj.pvpKills);
        updateCount++;
        break;

      case PlayProperty.LIFETIME_GCW_POINTS:
        writer.writeUInt16LE(6);
        writer.writeUInt32LE(obj.lifetimeGcwPoints);
        updateCount++;
        break;

      case PlayProperty.HOME_REGION:
        writer.writeUInt16LE(7);
        writer.writeUInt32LE(obj.homeRegion);
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
 * Generate delta for PLAY Baseline 9 changes
 */
export function generatePlayBaseline9Delta(
  obj: PlayerObject,
  changedProperties: number[]
): Uint8Array | null {
  if (changedProperties.length === 0) {
    return null;
  }

  const writer = new BufferWriter(64);

  // Delta header
  writer.writeUInt32LE(PLAY_TYPE_CRC);
  writer.writeUInt8(9);

  const updateCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let updateCount = 0;

  for (const prop of changedProperties) {
    switch (prop) {
      case PlayProperty.PLAYED_TIME:
        writer.writeUInt16LE(0);
        writer.writeUInt32LE(obj.playedTime);
        updateCount++;
        break;

      case PlayProperty.PROFESSION_TITLE:
        writer.writeUInt16LE(1);
        writeAsciiString(writer, obj.professionTitle);
        updateCount++;
        break;

      case PlayProperty.MATCHMAKING_FLAGS:
        writer.writeUInt16LE(4);
        writer.writeUInt32LE(obj.matchMakingFlags);
        updateCount++;
        break;

      case PlayProperty.CHAT_FLAGS:
        writer.writeUInt16LE(5);
        writer.writeUInt32LE(obj.chatFlags);
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
 * Generate delta for experience map
 */
export function generateExperienceDelta(
  obj: PlayerObject,
  operation: number,
  xpType: string,
  amount?: number
): Uint8Array {
  const writer = new BufferWriter(128);

  // Delta header
  writer.writeUInt32LE(PLAY_TYPE_CRC);
  writer.writeUInt8(6);
  writer.writeUInt16LE(1);

  // Variable index for experience
  writer.writeUInt16LE(1);

  // Map delta
  writer.writeUInt32LE(obj.experience.size);
  writer.writeUInt32LE(obj.getPlayListUpdateCounter('experience'));

  writer.writeUInt8(1); // One operation
  writer.writeUInt8(operation);

  if (operation === 0 || operation === 2) {
    // Add or Change
    writeAsciiString(writer, xpType);
    writer.writeInt32LE(amount ?? 0);
  } else if (operation === 1) {
    // Remove
    writeAsciiString(writer, xpType);
  }

  return writer.toBuffer();
}

/**
 * Generate delta for waypoints map
 */
export function generateWaypointsDelta(
  obj: PlayerObject,
  operation: number,
  waypoint?: Waypoint,
  waypointId?: ObjectId
): Uint8Array {
  const writer = new BufferWriter(256);

  // Delta header
  writer.writeUInt32LE(PLAY_TYPE_CRC);
  writer.writeUInt8(6);
  writer.writeUInt16LE(1);

  // Variable index for waypoints
  writer.writeUInt16LE(2);

  // Map delta
  writer.writeUInt32LE(obj.waypoints.size);
  writer.writeUInt32LE(obj.getPlayListUpdateCounter('waypoints'));

  writer.writeUInt8(1); // One operation
  writer.writeUInt8(operation);

  if ((operation === 0 || operation === 2) && waypoint) {
    // Add or Change
    writeWaypointEntry(writer, waypoint);
  } else if (operation === 1 && waypointId !== undefined) {
    // Remove
    writer.writeUInt64LE(waypointId);
  }

  return writer.toBuffer();
}

/**
 * Generate delta for friends list
 */
export function generateFriendsDelta(
  obj: PlayerObject,
  operation: number,
  name?: string,
  index?: number
): Uint8Array {
  const writer = new BufferWriter(128);

  // Delta header
  writer.writeUInt32LE(PLAY_TYPE_CRC);
  writer.writeUInt8(9);
  writer.writeUInt16LE(1);

  // Variable index for friends
  writer.writeUInt16LE(2);

  // List delta
  writer.writeUInt32LE(obj.friends.size);
  writer.writeUInt32LE(obj.getPlayListUpdateCounter('friends'));

  writer.writeUInt8(1);
  writer.writeUInt8(operation);

  if (operation === 0 && name !== undefined) {
    // Add
    writeAsciiString(writer, name);
  } else if (operation === 1 && index !== undefined) {
    // Remove
    writer.writeUInt16LE(index);
  }

  return writer.toBuffer();
}

/**
 * Generate delta for ignore list
 */
export function generateIgnoreDelta(
  obj: PlayerObject,
  operation: number,
  name?: string,
  index?: number
): Uint8Array {
  const writer = new BufferWriter(128);

  // Delta header
  writer.writeUInt32LE(PLAY_TYPE_CRC);
  writer.writeUInt8(9);
  writer.writeUInt16LE(1);

  // Variable index for ignore
  writer.writeUInt16LE(3);

  // List delta
  writer.writeUInt32LE(obj.ignore.size);
  writer.writeUInt32LE(obj.getPlayListUpdateCounter('ignore'));

  writer.writeUInt8(1);
  writer.writeUInt8(operation);

  if (operation === 0 && name !== undefined) {
    // Add
    writeAsciiString(writer, name);
  } else if (operation === 1 && index !== undefined) {
    // Remove
    writer.writeUInt16LE(index);
  }

  return writer.toBuffer();
}

/**
 * Deserialize PLAY Baseline 3
 */
export function deserializePlayBaseline3(obj: PlayerObject, data: Uint8Array): void {
  const reader = new BufferReader(data);

  // Skip header
  reader.skip(5);

  const variableCount = reader.readUInt16LE();

  if (variableCount >= 1) {
    obj.stationId = readAsciiString(reader);
  }

  if (variableCount >= 2) {
    obj.playerFlags = reader.readUInt64LE();
  }

  if (variableCount >= 3) {
    obj.biography = readUnicodeString(reader);
  }

  if (variableCount >= 4) {
    obj.birthDate = reader.readUInt32LE() * 1000; // Convert to ms
  }

  if (variableCount >= 5) {
    obj.title = readAsciiString(reader);
  }
}

/**
 * Deserialize PLAY Baseline 6
 */
export function deserializePlayBaseline6(obj: PlayerObject, data: Uint8Array): void {
  const reader = new BufferReader(data);

  // Skip header
  reader.skip(5);

  const variableCount = reader.readUInt16LE();

  if (variableCount >= 1) {
    obj.adminLevel = reader.readUInt8() as AdminLevelType;
  }

  if (variableCount >= 2) {
    const xpCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.experience.clear();
    for (let i = 0; i < xpCount; i++) {
      reader.readUInt8(); // Operation flag
      const xpType = readAsciiString(reader);
      const amount = reader.readInt32LE();
      obj.experience.set(xpType, amount);
    }
  }

  if (variableCount >= 3) {
    const waypointCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.waypoints.clear();
    for (let i = 0; i < waypointCount; i++) {
      reader.readUInt8(); // Operation flag
      const waypoint = readWaypointEntry(reader);
      obj.waypoints.set(waypoint.objectId, waypoint);
    }
  }

  if (variableCount >= 4) {
    obj.craftingStage = reader.readUInt32LE() as CraftingStageType;
  }

  if (variableCount >= 5) {
    obj.craftingSchematic = reader.readUInt32LE();
  }

  if (variableCount >= 6) {
    obj.nearestCraftingStation = reader.readUInt64LE();
  }

  if (variableCount >= 7) {
    const schematicCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.schematicsGranted.clear();
    for (let i = 0; i < schematicCount; i++) {
      obj.schematicsGranted.add(reader.readUInt32LE());
    }
  }

  if (variableCount >= 8) {
    const questCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.activeQuests.clear();
    for (let i = 0; i < questCount; i++) {
      reader.readUInt8(); // Operation flag
      const quest = readQuestEntry(reader);
      obj.activeQuests.set(quest.questCrc, quest);
    }
  }

  if (variableCount >= 9) {
    const completedCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.completedQuests.clear();
    for (let i = 0; i < completedCount; i++) {
      obj.completedQuests.add(reader.readUInt32LE());
    }
  }
}

/**
 * Deserialize PLAY Baseline 8
 */
export function deserializePlayBaseline8(obj: PlayerObject, data: Uint8Array): void {
  const reader = new BufferReader(data);

  // Skip header
  reader.skip(5);

  const variableCount = reader.readUInt16LE();

  if (variableCount >= 1) {
    obj.foodFillCurrent = reader.readUInt32LE();
  }

  if (variableCount >= 2) {
    obj.foodFillMax = reader.readUInt32LE();
  }

  if (variableCount >= 3) {
    obj.drinkFillCurrent = reader.readUInt32LE();
  }

  if (variableCount >= 4) {
    obj.drinkFillMax = reader.readUInt32LE();
  }

  if (variableCount >= 5) {
    obj.gcwPoints = reader.readUInt32LE();
  }

  if (variableCount >= 6) {
    obj.pvpKills = reader.readUInt32LE();
  }

  if (variableCount >= 7) {
    obj.lifetimeGcwPoints = reader.readUInt32LE();
  }

  if (variableCount >= 8) {
    obj.homeRegion = reader.readUInt32LE();
  }
}

/**
 * Deserialize PLAY Baseline 9
 */
export function deserializePlayBaseline9(obj: PlayerObject, data: Uint8Array): void {
  const reader = new BufferReader(data);

  // Skip header
  reader.skip(5);

  const variableCount = reader.readUInt16LE();

  if (variableCount >= 1) {
    obj.playedTime = reader.readUInt32LE();
  }

  if (variableCount >= 2) {
    obj.professionTitle = readAsciiString(reader);
  }

  if (variableCount >= 3) {
    const friendsCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.friends.clear();
    for (let i = 0; i < friendsCount; i++) {
      obj.friends.add(readAsciiString(reader));
    }
  }

  if (variableCount >= 4) {
    const ignoreCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.ignore.clear();
    for (let i = 0; i < ignoreCount; i++) {
      obj.ignore.add(readAsciiString(reader));
    }
  }

  if (variableCount >= 5) {
    obj.matchMakingFlags = reader.readUInt32LE();
  }

  if (variableCount >= 6) {
    obj.chatFlags = reader.readUInt32LE();
  }
}

/**
 * Create all PLAY baselines for an object
 */
export function createPlayBaselines(obj: PlayerObject): Uint8Array[] {
  return [
    serializePlayBaseline3(obj),
    serializePlayBaseline6(obj),
    serializePlayBaseline8(obj),
    serializePlayBaseline9(obj),
  ];
}

// ============================================
// Helper Functions
// ============================================

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

/**
 * Write Unicode string with 32-bit length prefix (UTF-16LE)
 */
function writeUnicodeString(writer: BufferWriter, str: string): void {
  writer.writeUInt32LE(str.length);
  for (let i = 0; i < str.length; i++) {
    writer.writeUInt16LE(str.charCodeAt(i));
  }
}

/**
 * Read Unicode string with 32-bit length prefix (UTF-16LE)
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
 * Write waypoint entry
 */
function writeWaypointEntry(writer: BufferWriter, waypoint: Waypoint): void {
  // Object ID
  writer.writeUInt64LE(waypoint.objectId);
  // Cell ID (always 0 for world waypoints)
  writer.writeUInt32LE(0);
  // Position
  writer.writeFloatLE(waypoint.x);
  writer.writeFloatLE(waypoint.y);
  writer.writeFloatLE(waypoint.z);
  // Planet name (ASCII string)
  writeAsciiString(writer, waypoint.planetName);
  // Waypoint name (Unicode string)
  writeUnicodeString(writer, waypoint.name);
  // Color
  writer.writeUInt8(waypoint.color);
  // Active flag
  writer.writeUInt8(waypoint.active ? 1 : 0);
}

/**
 * Read waypoint entry
 */
function readWaypointEntry(reader: BufferReader): Waypoint {
  const objectId = reader.readUInt64LE();
  reader.readUInt32LE(); // Cell ID (ignored)
  const x = reader.readFloatLE();
  const y = reader.readFloatLE();
  const z = reader.readFloatLE();
  const planetName = readAsciiString(reader);
  const name = readUnicodeString(reader);
  const color = reader.readUInt8();
  const active = reader.readUInt8() !== 0;

  return {
    objectId,
    name,
    planetName,
    x,
    y,
    z,
    color,
    active,
  };
}

/**
 * Write quest entry
 */
function writeQuestEntry(writer: BufferWriter, quest: QuestState): void {
  writer.writeUInt32LE(quest.questCrc);
  writer.writeUInt8(quest.active ? 1 : 0);
  writer.writeUInt16LE(quest.stage);
  // Write counters as a simple list
  writer.writeUInt32LE(quest.counters.size);
  for (const [key, value] of quest.counters) {
    writeAsciiString(writer, key);
    writer.writeInt32LE(value);
  }
}

/**
 * Read quest entry
 */
function readQuestEntry(reader: BufferReader): QuestState {
  const questCrc = reader.readUInt32LE();
  const active = reader.readUInt8() !== 0;
  const stage = reader.readUInt16LE();

  const counters = new Map<string, number>();
  const counterCount = reader.readUInt32LE();
  for (let i = 0; i < counterCount; i++) {
    const key = readAsciiString(reader);
    const value = reader.readInt32LE();
    counters.set(key, value);
  }

  return {
    questCrc,
    active,
    stage,
    acceptedAt: Date.now(),
    counters,
  };
}
