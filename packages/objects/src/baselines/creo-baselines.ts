/**
 * CREO Baseline Serialization
 * Handles serialization of CreatureObject data for client synchronization
 *
 * SWG baselines are packets that synchronize object state between server and client.
 * Creature objects (CREO) use baselines 1, 3, 4, and 6 for their specific data.
 *
 * Baseline 1: Credits (bank and cash)
 * Baseline 3: Posture, faction, species, HAM wounds, skills
 * Baseline 4: Movement, acceleration, skill mods, group, locomotion
 * Baseline 6: Level, HAM, equipment, buffs, mood, target, defenders
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

/**
 * Serialize CREO Baseline 1 (credits)
 * This baseline contains bank and cash credits
 */
export function serializeCreoBaseline1(obj: CreatureObject): Uint8Array {
  const writer = new BufferWriter(64);

  // Baseline header
  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(1);

  // Variable count placeholder
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let variableCount = 0;

  // 0: Bank credits
  writer.writeUInt32LE(obj.bankCredits);
  variableCount++;

  // 1: Cash credits
  writer.writeUInt32LE(obj.cashCredits);
  variableCount++;

  // Update variable count
  const endPos = writer.getPosition();
  writer.setPosition(variableCountPos);
  writer.writeUInt16LE(variableCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Serialize CREO Baseline 3 (shared creature data)
 * This baseline contains posture, faction, species, wounds, skills
 */
export function serializeCreoBaseline3(obj: CreatureObject): Uint8Array {
  const writer = new BufferWriter(512);

  // Baseline header
  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(3);

  // Variable count placeholder
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let variableCount = 0;

  // 0: Posture
  writer.writeUInt8(obj.posture);
  variableCount++;

  // 1: Faction rank
  writer.writeUInt8(obj.factionRank);
  variableCount++;

  // 2: Owner/master ID
  writer.writeUInt64LE(obj.masterId);
  variableCount++;

  // 3: Height (scale)
  writer.writeFloatLE(obj.height);
  variableCount++;

  // 4: Battle fatigue
  writer.writeUInt32LE(obj.battleFatigue);
  variableCount++;

  // 5: State bitmask (64-bit)
  writer.writeUInt64LE(obj.stateBitmask);
  variableCount++;

  // 6: HAM wounds list
  writer.writeUInt32LE(HAM_ATTRIBUTE_COUNT);
  writer.writeUInt32LE(obj.getListUpdateCounter('hamWounds'));
  for (let i = 0; i < HAM_ATTRIBUTE_COUNT; i++) {
    writer.writeUInt32LE(obj.hamWounds[i] ?? 0);
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
 * Serialize CREO Baseline 4 (movement and group data)
 */
export function serializeCreoBaseline4(obj: CreatureObject): Uint8Array {
  const writer = new BufferWriter(1024);

  // Baseline header
  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(4);

  // Variable count placeholder
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let variableCount = 0;

  // 0: Acceleration scale
  writer.writeFloatLE(obj.accelScale);
  variableCount++;

  // 1: Acceleration multiplier (base)
  writer.writeFloatLE(obj.accelMultiplierBase);
  variableCount++;

  // 2: Acceleration multiplier (mod)
  writer.writeFloatLE(obj.accelMultiplierMod);
  variableCount++;

  // 3: HAM encumbrance list
  writer.writeUInt32LE(HAM_ATTRIBUTE_COUNT);
  writer.writeUInt32LE(obj.getListUpdateCounter('hamEncumbrance'));
  for (let i = 0; i < HAM_ATTRIBUTE_COUNT; i++) {
    writer.writeUInt32LE(obj.hamEncumbrance[i] ?? 0);
  }
  variableCount++;

  // 4: Skill mods map
  writer.writeUInt32LE(obj.skillMods.size);
  writer.writeUInt32LE(obj.getListUpdateCounter('skillMods'));
  for (const [modName, value] of obj.skillMods) {
    writer.writeUInt8(0); // Flag for add operation
    writeAsciiString(writer, modName);
    writer.writeInt32LE(value);
  }
  variableCount++;

  // 5: Speed multiplier (base)
  writer.writeFloatLE(obj.speedMultiplierBase);
  variableCount++;

  // 6: Speed multiplier (mod)
  writer.writeFloatLE(obj.speedMultiplierMod);
  variableCount++;

  // 7: Listen to ID
  writer.writeUInt64LE(obj.listenToId);
  variableCount++;

  // 8: Run speed
  writer.writeFloatLE(obj.runSpeed);
  variableCount++;

  // 9: Slope mod angle
  writer.writeFloatLE(obj.slopeModeAngle);
  variableCount++;

  // 10: Slope mod percent
  writer.writeFloatLE(obj.slopeModPercent);
  variableCount++;

  // 11: Turn rate
  writer.writeFloatLE(obj.turnRate);
  variableCount++;

  // 12: Walk speed
  writer.writeFloatLE(obj.walkSpeed);
  variableCount++;

  // 13: Water mod percent
  writer.writeFloatLE(obj.waterModPercent);
  variableCount++;

  // 14: Group invites list
  writer.writeUInt32LE(obj.groupInvites.length);
  writer.writeUInt32LE(obj.getListUpdateCounter('groupInvites'));
  for (const inviterId of obj.groupInvites) {
    writer.writeUInt64LE(inviterId);
  }
  variableCount++;

  // 15: Guild ID
  writer.writeUInt32LE(obj.guildId);
  variableCount++;

  // 16: Weapon ID
  writer.writeUInt64LE(obj.weaponId);
  variableCount++;

  // 17: Group ID
  writer.writeUInt64LE(obj.groupId);
  variableCount++;

  // 18: Invite sender ID
  writer.writeUInt64LE(obj.inviteSenderId);
  variableCount++;

  // 19: Invite counter
  writer.writeUInt32LE(obj.inviteCounter);
  variableCount++;

  // 20: Locomotion
  writer.writeUInt8(obj.locomotion);
  variableCount++;

  // 21: Performance counter
  writer.writeUInt8(obj.performanceCounter);
  variableCount++;

  // 22: Performance ID
  writer.writeUInt32LE(obj.performanceId);
  variableCount++;

  // Update variable count
  const endPos = writer.getPosition();
  writer.setPosition(variableCountPos);
  writer.writeUInt16LE(variableCount);
  writer.setPosition(endPos);

  return writer.toBuffer();
}

/**
 * Serialize CREO Baseline 6 (combat and HAM data)
 */
export function serializeCreoBaseline6(obj: CreatureObject): Uint8Array {
  const writer = new BufferWriter(2048);

  // Baseline header
  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(6);

  // Variable count placeholder
  const variableCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let variableCount = 0;

  // 0: Level
  writer.writeUInt16LE(obj.level);
  variableCount++;

  // 1: Granted health
  writer.writeUInt32LE(obj.grantedHealth);
  variableCount++;

  // 2: Current weapon (string)
  writeAsciiString(writer, ''); // Usually empty, weapon is tracked by ID
  variableCount++;

  // 3: Max level
  writer.writeUInt16LE(obj.maxLevel);
  variableCount++;

  // 4: Equipment list
  writer.writeUInt32LE(obj.equippedItems.size);
  writer.writeUInt32LE(obj.getListUpdateCounter('equipment'));
  for (const [slot, itemId] of obj.equippedItems) {
    writeEquipmentEntry(writer, slot, itemId);
  }
  variableCount++;

  // 5: Costume/appearance equipment
  writer.writeUInt32LE(obj.costumeItems.length);
  writer.writeUInt32LE(obj.getListUpdateCounter('costume'));
  for (const itemId of obj.costumeItems) {
    writer.writeUInt64LE(itemId);
  }
  variableCount++;

  // 6: Visible flag
  writer.writeUInt8(obj.visible ? 1 : 0);
  variableCount++;

  // 7: Buffs list
  writer.writeUInt32LE(obj.buffs.size);
  writer.writeUInt32LE(obj.getListUpdateCounter('buffs'));
  for (const [crc, buff] of obj.buffs) {
    writeBuffEntry(writer, buff);
  }
  variableCount++;

  // 8: Performing flag
  writer.writeUInt8(obj.performing ? 1 : 0);
  variableCount++;

  // 9: Difficulty class
  writer.writeUInt8(obj.difficulty);
  variableCount++;

  // 10: HAM current list
  const hamCurrent = obj.getHamCurrentArray();
  writer.writeUInt32LE(HAM_ATTRIBUTE_COUNT);
  writer.writeUInt32LE(obj.getListUpdateCounter('hamCurrent'));
  for (const value of hamCurrent) {
    writer.writeUInt32LE(value);
  }
  variableCount++;

  // 11: HAM max list
  const hamMax = obj.getHamMaxArray();
  writer.writeUInt32LE(HAM_ATTRIBUTE_COUNT);
  writer.writeUInt32LE(obj.getListUpdateCounter('hamMax'));
  for (const value of hamMax) {
    writer.writeUInt32LE(value);
  }
  variableCount++;

  // 12: Skills list
  writer.writeUInt32LE(obj.skills.size);
  writer.writeUInt32LE(obj.getListUpdateCounter('skills'));
  for (const skillName of obj.skills) {
    writeAsciiString(writer, skillName);
  }
  variableCount++;

  // 13: Mood ID
  writer.writeUInt32LE(obj.moodId);
  variableCount++;

  // 14: Performance start time
  writer.writeUInt32LE(obj.performanceStartTime);
  variableCount++;

  // 15: Performance listen target
  writer.writeUInt64LE(obj.listenToId);
  variableCount++;

  // 16: Current target ID
  writer.writeUInt64LE(obj.targetId);
  variableCount++;

  // 17: Defenders list
  writer.writeUInt32LE(obj.defenders.size);
  writer.writeUInt32LE(obj.baselineVersion);
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
 * Generate delta for CREO Baseline 1 changes
 */
export function generateCreoBaseline1Delta(
  obj: CreatureObject,
  changedProperties: number[]
): Uint8Array | null {
  if (changedProperties.length === 0) {
    return null;
  }

  const writer = new BufferWriter(64);

  // Delta header
  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(1);

  const updateCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let updateCount = 0;

  for (const prop of changedProperties) {
    switch (prop) {
      case CreoProperty.BANK_CREDITS:
        writer.writeUInt16LE(0);
        writer.writeUInt32LE(obj.bankCredits);
        updateCount++;
        break;

      case CreoProperty.CASH_CREDITS:
        writer.writeUInt16LE(1);
        writer.writeUInt32LE(obj.cashCredits);
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
 * Generate delta for CREO Baseline 3 changes
 */
export function generateCreoBaseline3Delta(
  obj: CreatureObject,
  changedProperties: number[]
): Uint8Array | null {
  if (changedProperties.length === 0) {
    return null;
  }

  const writer = new BufferWriter(256);

  // Delta header
  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(3);

  const updateCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let updateCount = 0;

  for (const prop of changedProperties) {
    switch (prop) {
      case CreoProperty.POSTURE:
        writer.writeUInt16LE(0);
        writer.writeUInt8(obj.posture);
        updateCount++;
        break;

      case CreoProperty.FACTION_RANK:
        writer.writeUInt16LE(1);
        writer.writeUInt8(obj.factionRank);
        updateCount++;
        break;

      case CreoProperty.OWNER_ID:
        writer.writeUInt16LE(2);
        writer.writeUInt64LE(obj.masterId);
        updateCount++;
        break;

      case CreoProperty.HEIGHT:
        writer.writeUInt16LE(3);
        writer.writeFloatLE(obj.height);
        updateCount++;
        break;

      case CreoProperty.BATTLE_FATIGUE:
        writer.writeUInt16LE(4);
        writer.writeUInt32LE(obj.battleFatigue);
        updateCount++;
        break;

      case CreoProperty.STATE_BITMASK:
        writer.writeUInt16LE(5);
        writer.writeUInt64LE(obj.stateBitmask);
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
 * Generate delta for CREO Baseline 4 changes
 */
export function generateCreoBaseline4Delta(
  obj: CreatureObject,
  changedProperties: number[]
): Uint8Array | null {
  if (changedProperties.length === 0) {
    return null;
  }

  const writer = new BufferWriter(256);

  // Delta header
  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(4);

  const updateCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let updateCount = 0;

  for (const prop of changedProperties) {
    switch (prop) {
      case CreoProperty.ACCEL_SCALE:
        writer.writeUInt16LE(0);
        writer.writeFloatLE(obj.accelScale);
        updateCount++;
        break;

      case CreoProperty.RUN_SPEED:
        writer.writeUInt16LE(8);
        writer.writeFloatLE(obj.runSpeed);
        updateCount++;
        break;

      case CreoProperty.TURN_RATE:
        writer.writeUInt16LE(11);
        writer.writeFloatLE(obj.turnRate);
        updateCount++;
        break;

      case CreoProperty.WALK_SPEED:
        writer.writeUInt16LE(12);
        writer.writeFloatLE(obj.walkSpeed);
        updateCount++;
        break;

      case CreoProperty.GUILD_ID:
        writer.writeUInt16LE(15);
        writer.writeUInt32LE(obj.guildId);
        updateCount++;
        break;

      case CreoProperty.WEAPON_ID:
        writer.writeUInt16LE(16);
        writer.writeUInt64LE(obj.weaponId);
        updateCount++;
        break;

      case CreoProperty.GROUP_ID:
        writer.writeUInt16LE(17);
        writer.writeUInt64LE(obj.groupId);
        updateCount++;
        break;

      case CreoProperty.LOCOMOTION:
        writer.writeUInt16LE(20);
        writer.writeUInt8(obj.locomotion);
        updateCount++;
        break;

      case CreoProperty.PERFORMANCE_ID:
        writer.writeUInt16LE(22);
        writer.writeUInt32LE(obj.performanceId);
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
 * Generate delta for CREO Baseline 6 changes
 */
export function generateCreoBaseline6Delta(
  obj: CreatureObject,
  changedProperties: number[]
): Uint8Array | null {
  if (changedProperties.length === 0) {
    return null;
  }

  const writer = new BufferWriter(256);

  // Delta header
  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(6);

  const updateCountPos = writer.getPosition();
  writer.writeUInt16LE(0);

  let updateCount = 0;

  for (const prop of changedProperties) {
    switch (prop) {
      case CreoProperty.LEVEL:
        writer.writeUInt16LE(0);
        writer.writeUInt16LE(obj.level);
        updateCount++;
        break;

      case CreoProperty.MOOD_ID:
        writer.writeUInt16LE(13);
        writer.writeUInt32LE(obj.moodId);
        updateCount++;
        break;

      case CreoProperty.TARGET_ID:
        writer.writeUInt16LE(16);
        writer.writeUInt64LE(obj.targetId);
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
 * Generate delta for HAM current list
 */
export function generateHamCurrentDelta(
  obj: CreatureObject,
  attributeIndex: number
): Uint8Array {
  const writer = new BufferWriter(64);

  // Delta header
  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(6);
  writer.writeUInt16LE(1); // One update

  // Variable index for HAM current
  writer.writeUInt16LE(10);

  // List delta format
  const hamCurrent = obj.getHamCurrentArray();
  writer.writeUInt32LE(HAM_ATTRIBUTE_COUNT);
  writer.writeUInt32LE(obj.getListUpdateCounter('hamCurrent'));

  writer.writeUInt8(1); // Number of list operations
  writer.writeUInt8(2); // Change operation
  writer.writeUInt16LE(attributeIndex);
  writer.writeUInt32LE(hamCurrent[attributeIndex] ?? 0);

  return writer.toBuffer();
}

/**
 * Generate delta for skills list
 */
export function generateSkillsDelta(
  obj: CreatureObject,
  operation: number,
  skillName?: string,
  index?: number
): Uint8Array {
  const writer = new BufferWriter(128);

  // Delta header
  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(6);
  writer.writeUInt16LE(1);

  // Variable index for skills
  writer.writeUInt16LE(12);

  // List delta
  writer.writeUInt32LE(obj.skills.size);
  writer.writeUInt32LE(obj.getListUpdateCounter('skills'));

  writer.writeUInt8(1); // One operation
  writer.writeUInt8(operation);

  if (operation === 0 && skillName !== undefined) {
    // Add
    writeAsciiString(writer, skillName);
  } else if (operation === 1 && index !== undefined) {
    // Remove
    writer.writeUInt16LE(index);
  }

  return writer.toBuffer();
}

/**
 * Generate delta for defenders list
 */
export function generateDefendersDelta(
  obj: CreatureObject,
  operation: number,
  defenderId?: ObjectId,
  index?: number
): Uint8Array {
  const writer = new BufferWriter(64);

  // Delta header
  writer.writeUInt32LE(CREO_TYPE_CRC);
  writer.writeUInt8(6);
  writer.writeUInt16LE(1);

  // Variable index for defenders
  writer.writeUInt16LE(17);

  // List delta
  writer.writeUInt32LE(obj.defenders.size);
  writer.writeUInt32LE(obj.baselineVersion);

  writer.writeUInt8(1);
  writer.writeUInt8(operation);

  if (operation === 0 && defenderId !== undefined) {
    // Add
    writer.writeUInt64LE(defenderId);
  } else if (operation === 1 && index !== undefined) {
    // Remove
    writer.writeUInt16LE(index);
  }

  return writer.toBuffer();
}

/**
 * Deserialize CREO Baseline 1
 */
export function deserializeCreoBaseline1(obj: CreatureObject, data: Uint8Array): void {
  const reader = new BufferReader(data);

  // Skip header
  reader.skip(5);

  const variableCount = reader.readUInt16LE();

  if (variableCount >= 1) {
    obj.bankCredits = reader.readUInt32LE();
  }

  if (variableCount >= 2) {
    obj.cashCredits = reader.readUInt32LE();
  }
}

/**
 * Deserialize CREO Baseline 3
 */
export function deserializeCreoBaseline3(obj: CreatureObject, data: Uint8Array): void {
  const reader = new BufferReader(data);

  // Skip header
  reader.skip(5);

  const variableCount = reader.readUInt16LE();

  if (variableCount >= 1) {
    obj.posture = reader.readUInt8() as PostureType;
  }

  if (variableCount >= 2) {
    obj.factionRank = reader.readUInt8();
  }

  if (variableCount >= 3) {
    obj.masterId = reader.readUInt64LE();
  }

  if (variableCount >= 4) {
    obj.height = reader.readFloatLE();
  }

  if (variableCount >= 5) {
    obj.battleFatigue = reader.readUInt32LE();
  }

  if (variableCount >= 6) {
    obj.stateBitmask = reader.readUInt64LE();
  }

  if (variableCount >= 7) {
    const woundsCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    for (let i = 0; i < woundsCount && i < HAM_ATTRIBUTE_COUNT; i++) {
      obj.hamWounds[i] = reader.readUInt32LE();
    }
  }
}

/**
 * Deserialize CREO Baseline 4
 */
export function deserializeCreoBaseline4(obj: CreatureObject, data: Uint8Array): void {
  const reader = new BufferReader(data);

  // Skip header
  reader.skip(5);

  const variableCount = reader.readUInt16LE();

  if (variableCount >= 1) {
    obj.accelScale = reader.readFloatLE();
  }

  if (variableCount >= 2) {
    obj.accelMultiplierBase = reader.readFloatLE();
  }

  if (variableCount >= 3) {
    obj.accelMultiplierMod = reader.readFloatLE();
  }

  if (variableCount >= 4) {
    const encumbranceCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    for (let i = 0; i < encumbranceCount && i < HAM_ATTRIBUTE_COUNT; i++) {
      obj.hamEncumbrance[i] = reader.readUInt32LE();
    }
  }

  if (variableCount >= 5) {
    const skillModsCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.skillMods.clear();
    for (let i = 0; i < skillModsCount; i++) {
      reader.readUInt8(); // Operation flag
      const modName = readAsciiString(reader);
      const value = reader.readInt32LE();
      obj.skillMods.set(modName, value);
    }
  }

  if (variableCount >= 6) {
    obj.speedMultiplierBase = reader.readFloatLE();
  }

  if (variableCount >= 7) {
    obj.speedMultiplierMod = reader.readFloatLE();
  }

  if (variableCount >= 8) {
    obj.listenToId = reader.readUInt64LE();
  }

  if (variableCount >= 9) {
    obj.runSpeed = reader.readFloatLE();
  }

  if (variableCount >= 10) {
    obj.slopeModeAngle = reader.readFloatLE();
  }

  if (variableCount >= 11) {
    obj.slopeModPercent = reader.readFloatLE();
  }

  if (variableCount >= 12) {
    obj.turnRate = reader.readFloatLE();
  }

  if (variableCount >= 13) {
    obj.walkSpeed = reader.readFloatLE();
  }

  if (variableCount >= 14) {
    obj.waterModPercent = reader.readFloatLE();
  }

  if (variableCount >= 15) {
    const invitesCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.groupInvites = [];
    for (let i = 0; i < invitesCount; i++) {
      obj.groupInvites.push(reader.readUInt64LE());
    }
  }

  if (variableCount >= 16) {
    obj.guildId = reader.readUInt32LE();
  }

  if (variableCount >= 17) {
    obj.weaponId = reader.readUInt64LE();
  }

  if (variableCount >= 18) {
    obj.groupId = reader.readUInt64LE();
  }

  if (variableCount >= 19) {
    obj.inviteSenderId = reader.readUInt64LE();
  }

  if (variableCount >= 20) {
    obj.inviteCounter = reader.readUInt32LE();
  }

  if (variableCount >= 21) {
    obj.locomotion = reader.readUInt8() as LocomotionType;
  }

  if (variableCount >= 22) {
    obj.performanceCounter = reader.readUInt8();
  }

  if (variableCount >= 23) {
    obj.performanceId = reader.readUInt32LE();
  }
}

/**
 * Deserialize CREO Baseline 6
 */
export function deserializeCreoBaseline6(obj: CreatureObject, data: Uint8Array): void {
  const reader = new BufferReader(data);

  // Skip header
  reader.skip(5);

  const variableCount = reader.readUInt16LE();

  if (variableCount >= 1) {
    obj.level = reader.readUInt16LE();
  }

  if (variableCount >= 2) {
    obj.grantedHealth = reader.readUInt32LE();
  }

  if (variableCount >= 3) {
    // Current weapon string (usually empty)
    readAsciiString(reader);
  }

  if (variableCount >= 4) {
    obj.maxLevel = reader.readUInt16LE();
  }

  if (variableCount >= 5) {
    const equipmentCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.equippedItems.clear();
    for (let i = 0; i < equipmentCount; i++) {
      const entry = readEquipmentEntry(reader);
      obj.equippedItems.set(entry.slot as EquipmentSlotType, entry.itemId);
    }
  }

  if (variableCount >= 6) {
    const costumeCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.costumeItems = [];
    for (let i = 0; i < costumeCount; i++) {
      obj.costumeItems.push(reader.readUInt64LE());
    }
  }

  if (variableCount >= 7) {
    obj.visible = reader.readUInt8() !== 0;
  }

  if (variableCount >= 8) {
    const buffsCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.buffs.clear();
    for (let i = 0; i < buffsCount; i++) {
      const buff = readBuffEntry(reader);
      obj.buffs.set(buff.buffCrc, buff);
    }
  }

  if (variableCount >= 9) {
    obj.performing = reader.readUInt8() !== 0;
  }

  if (variableCount >= 10) {
    obj.difficulty = reader.readUInt8();
  }

  if (variableCount >= 11) {
    const hamCurrentCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    const values: number[] = [];
    for (let i = 0; i < hamCurrentCount; i++) {
      values.push(reader.readUInt32LE());
    }
    if (values.length >= 1) obj.health.current = values[0] ?? 0;
    if (values.length >= 4) obj.action.current = values[3] ?? 0;
    if (values.length >= 7) obj.mind.current = values[6] ?? 0;
  }

  if (variableCount >= 12) {
    const hamMaxCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    const values: number[] = [];
    for (let i = 0; i < hamMaxCount; i++) {
      values.push(reader.readUInt32LE());
    }
    if (values.length >= 1) obj.health.max = values[0] ?? 0;
    if (values.length >= 4) obj.action.max = values[3] ?? 0;
    if (values.length >= 7) obj.mind.max = values[6] ?? 0;
  }

  if (variableCount >= 13) {
    const skillsCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.skills.clear();
    for (let i = 0; i < skillsCount; i++) {
      obj.skills.add(readAsciiString(reader));
    }
  }

  if (variableCount >= 14) {
    obj.moodId = reader.readUInt32LE();
  }

  if (variableCount >= 15) {
    obj.performanceStartTime = reader.readUInt32LE();
  }

  if (variableCount >= 16) {
    obj.listenToId = reader.readUInt64LE();
  }

  if (variableCount >= 17) {
    obj.targetId = reader.readUInt64LE();
  }

  if (variableCount >= 18) {
    const defendersCount = reader.readUInt32LE();
    reader.readUInt32LE(); // Update counter
    obj.defenders.clear();
    for (let i = 0; i < defendersCount; i++) {
      obj.defenders.add(reader.readUInt64LE());
    }
  }
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
 * Write equipment entry
 */
function writeEquipmentEntry(
  writer: BufferWriter,
  slot: EquipmentSlotType,
  itemId: ObjectId
): void {
  // Custom appearance data (empty for now)
  writer.writeUInt16LE(0);
  // Arrangement index
  writer.writeInt32LE(slot);
  // Object ID
  writer.writeUInt64LE(itemId);
  // Template CRC (would need to look up from item)
  writer.writeUInt32LE(0);
}

/**
 * Read equipment entry
 */
function readEquipmentEntry(reader: BufferReader): { slot: number; itemId: ObjectId } {
  // Custom appearance data length
  const appearanceLength = reader.readUInt16LE();
  if (appearanceLength > 0) {
    reader.skip(appearanceLength);
  }
  // Arrangement index
  const slot = reader.readInt32LE();
  // Object ID
  const itemId = reader.readUInt64LE();
  // Template CRC
  reader.readUInt32LE();

  return { slot, itemId };
}

/**
 * Write buff entry
 */
function writeBuffEntry(writer: BufferWriter, buff: CreatureBuff): void {
  writer.writeUInt32LE(buff.buffCrc);
  writer.writeFloatLE(buff.duration);
  writer.writeUInt64LE(buff.casterId);
  // Buff name (empty for now, determined by CRC)
  writer.writeUInt16LE(0);
}

/**
 * Read buff entry
 */
function readBuffEntry(reader: BufferReader): CreatureBuff {
  const buffCrc = reader.readUInt32LE();
  const duration = reader.readFloatLE();
  const casterId = reader.readUInt64LE();
  // Buff name
  const nameLength = reader.readUInt16LE();
  if (nameLength > 0) {
    reader.skip(nameLength);
  }

  return {
    buffCrc,
    duration,
    casterId,
    appliedAt: Date.now(),
    effects: new Map(),
  };
}

/**
 * Create all CREO baselines for an object
 */
export function createCreoBaselines(obj: CreatureObject): Uint8Array[] {
  return [
    serializeCreoBaseline1(obj),
    serializeCreoBaseline3(obj),
    serializeCreoBaseline4(obj),
    serializeCreoBaseline6(obj),
  ];
}
