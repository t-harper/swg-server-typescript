/**
 * Combat Feedback Controller Command Payloads
 *
 * Payloads for ObjControllerMessage with messageType:
 *   - CM_combatSpam      (308)  - Server->Client
 *   - CM_showFlyText     (445)  - Server->Client
 *   - CM_showCombatText  (1114) - Server->Client
 *   - CM_pushCreature    (1090) - Server->Client (also allowFromClient)
 *   - CM_slowDownEffect  (1093) - Server->Client
 *
 * These are NOT standalone GameNetworkMessages -- they serialize/deserialize
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 *
 * C++ sources:
 *   MessageQueueCombatSpam.cpp
 *   MessageQueueShowFlyText.cpp
 *   MessageQueueShowCombatText.cpp
 *   MessageQueuePushCreature.cpp
 *   MessageQueueSlowDownEffect.cpp
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';
import type { StringId } from './npc-conversation.js';

// ============================================
// StringId helpers (read/write)
// ============================================

function writeStringId(writer: BufferWriter, sid: StringId): void {
  writer.writeStringWithLength16LE(sid.table);
  writer.writeUInt32LE(sid.textIndex);
  writer.writeStringWithLength16LE(sid.text);
}

function readStringId(reader: BufferReader): StringId {
  const table = reader.readStringWithLength16LE();
  const textIndex = reader.readUInt32LE();
  const text = reader.readStringWithLength16LE();
  return { table, textIndex, text };
}

// ============================================
// CM_combatSpam (308)
// ============================================

/**
 * CombatSpamMessage - detailed combat hit/miss information sent to clients.
 *
 * C++ source: MessageQueueCombatSpam pack/unpack
 */
export interface CombatSpamMessage {
  attacker: bigint;
  attackerPosition: { x: number; y: number; z: number };
  defender: bigint;
  defenderPosition: { x: number; y: number; z: number };
  weapon: bigint;
  weaponName: StringId;
  armor: bigint;
  attackName: StringId;
  rawDamage: number;
  damageType: number;
  elementalDamage: number;
  elementalDamageType: number;
  bleedDamage: number;
  critDamage: number;
  blockedDamage: number;
  finalDamage: number;
  hitLocation: number;
  success: boolean;
  critical: boolean;
  glancing: boolean;
  crushing: boolean;
  strikethrough: boolean;
  strikethroughAmount: number;
  evadeResult: boolean;
  evadeAmount: number;
  blockResult: boolean;
  block: number;
  dodge: boolean;
  parry: boolean;
  proc: boolean;
  spamMessage: string;
  spamType: number;
}

/**
 * Serialize a CombatSpamMessage payload to wire format.
 *
 * Pack order (C++ MessageQueueCombatSpam::pack):
 *   u64   attacker
 *   f32   attackerPosition.x, f32 y, f32 z
 *   u64   defender
 *   f32   defenderPosition.x, f32 y, f32 z
 *   u64   weapon
 *   StringId weaponName
 *   u64   armor
 *   StringId attackName
 *   i32   rawDamage
 *   i32   damageType
 *   i32   elementalDamage
 *   i32   elementalDamageType
 *   i32   bleedDamage
 *   i32   critDamage
 *   i32   blockedDamage
 *   i32   finalDamage
 *   i32   hitLocation
 *   u8    success (bool)
 *   u8    critical (bool)
 *   u8    glancing (bool)
 *   u8    crushing (bool)
 *   u8    strikethrough (bool)
 *   f32   strikethroughAmount
 *   u8    evadeResult (bool)
 *   f32   evadeAmount
 *   u8    blockResult (bool)
 *   i32   block
 *   u8    dodge (bool)
 *   u8    parry (bool)
 *   u8    proc (bool)
 *   Unicode::String spamMessage
 *   i32   spamType
 */
export function serializeCombatSpam(msg: CombatSpamMessage): Uint8Array {
  const writer = new BufferWriter(512);

  // Attacker
  writer.writeUInt64LE(msg.attacker);
  writer.writeFloatLE(msg.attackerPosition.x);
  writer.writeFloatLE(msg.attackerPosition.y);
  writer.writeFloatLE(msg.attackerPosition.z);

  // Defender
  writer.writeUInt64LE(msg.defender);
  writer.writeFloatLE(msg.defenderPosition.x);
  writer.writeFloatLE(msg.defenderPosition.y);
  writer.writeFloatLE(msg.defenderPosition.z);

  // Weapon
  writer.writeUInt64LE(msg.weapon);
  writeStringId(writer, msg.weaponName);

  // Armor
  writer.writeUInt64LE(msg.armor);
  writeStringId(writer, msg.attackName);

  // Damage values (all i32)
  writer.writeInt32LE(msg.rawDamage);
  writer.writeInt32LE(msg.damageType);
  writer.writeInt32LE(msg.elementalDamage);
  writer.writeInt32LE(msg.elementalDamageType);
  writer.writeInt32LE(msg.bleedDamage);
  writer.writeInt32LE(msg.critDamage);
  writer.writeInt32LE(msg.blockedDamage);
  writer.writeInt32LE(msg.finalDamage);
  writer.writeInt32LE(msg.hitLocation);

  // Boolean flags and associated values
  writer.writeUInt8(msg.success ? 1 : 0);
  writer.writeUInt8(msg.critical ? 1 : 0);
  writer.writeUInt8(msg.glancing ? 1 : 0);
  writer.writeUInt8(msg.crushing ? 1 : 0);
  writer.writeUInt8(msg.strikethrough ? 1 : 0);
  writer.writeFloatLE(msg.strikethroughAmount);
  writer.writeUInt8(msg.evadeResult ? 1 : 0);
  writer.writeFloatLE(msg.evadeAmount);
  writer.writeUInt8(msg.blockResult ? 1 : 0);
  writer.writeInt32LE(msg.block);
  writer.writeUInt8(msg.dodge ? 1 : 0);
  writer.writeUInt8(msg.parry ? 1 : 0);
  writer.writeUInt8(msg.proc ? 1 : 0);

  // Spam message and type
  writer.writeUnicodeStringWithLength(msg.spamMessage);
  writer.writeInt32LE(msg.spamType);

  return writer.toBuffer();
}

/**
 * Deserialize a CombatSpamMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCombatSpam(
  data: Uint8Array,
  offset: number = 0
): CombatSpamMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  // Attacker
  const attacker = reader.readUInt64LE();
  const attackerPosition = {
    x: reader.readFloatLE(),
    y: reader.readFloatLE(),
    z: reader.readFloatLE(),
  };

  // Defender
  const defender = reader.readUInt64LE();
  const defenderPosition = {
    x: reader.readFloatLE(),
    y: reader.readFloatLE(),
    z: reader.readFloatLE(),
  };

  // Weapon
  const weapon = reader.readUInt64LE();
  const weaponName = readStringId(reader);

  // Armor
  const armor = reader.readUInt64LE();
  const attackName = readStringId(reader);

  // Damage values
  const rawDamage = reader.readInt32LE();
  const damageType = reader.readInt32LE();
  const elementalDamage = reader.readInt32LE();
  const elementalDamageType = reader.readInt32LE();
  const bleedDamage = reader.readInt32LE();
  const critDamage = reader.readInt32LE();
  const blockedDamage = reader.readInt32LE();
  const finalDamage = reader.readInt32LE();
  const hitLocation = reader.readInt32LE();

  // Boolean flags and associated values
  const success = reader.readUInt8() !== 0;
  const critical = reader.readUInt8() !== 0;
  const glancing = reader.readUInt8() !== 0;
  const crushing = reader.readUInt8() !== 0;
  const strikethrough = reader.readUInt8() !== 0;
  const strikethroughAmount = reader.readFloatLE();
  const evadeResult = reader.readUInt8() !== 0;
  const evadeAmount = reader.readFloatLE();
  const blockResult = reader.readUInt8() !== 0;
  const block = reader.readInt32LE();
  const dodge = reader.readUInt8() !== 0;
  const parry = reader.readUInt8() !== 0;
  const proc = reader.readUInt8() !== 0;

  // Spam message and type
  const spamMessage = reader.readUnicodeStringWithLength();
  const spamType = reader.readInt32LE();

  return {
    attacker,
    attackerPosition,
    defender,
    defenderPosition,
    weapon,
    weaponName,
    armor,
    attackName,
    rawDamage,
    damageType,
    elementalDamage,
    elementalDamageType,
    bleedDamage,
    critDamage,
    blockedDamage,
    finalDamage,
    hitLocation,
    success,
    critical,
    glancing,
    crushing,
    strikethrough,
    strikethroughAmount,
    evadeResult,
    evadeAmount,
    blockResult,
    block,
    dodge,
    parry,
    proc,
    spamMessage,
    spamType,
  };
}

/**
 * Create a CombatSpamMessage with sensible defaults.
 *
 * @param attacker  - NetworkId of the attacker
 * @param defender  - NetworkId of the defender
 * @param finalDamage - Final damage dealt
 */
export function createCombatSpam(
  attacker: bigint,
  defender: bigint,
  finalDamage: number = 0
): CombatSpamMessage {
  return {
    attacker,
    attackerPosition: { x: 0, y: 0, z: 0 },
    defender,
    defenderPosition: { x: 0, y: 0, z: 0 },
    weapon: 0n,
    weaponName: { table: '', textIndex: 0, text: '' },
    armor: 0n,
    attackName: { table: '', textIndex: 0, text: '' },
    rawDamage: finalDamage,
    damageType: 0,
    elementalDamage: 0,
    elementalDamageType: 0,
    bleedDamage: 0,
    critDamage: 0,
    blockedDamage: 0,
    finalDamage,
    hitLocation: 0,
    success: finalDamage > 0,
    critical: false,
    glancing: false,
    crushing: false,
    strikethrough: false,
    strikethroughAmount: 0,
    evadeResult: false,
    evadeAmount: 0,
    blockResult: false,
    block: 0,
    dodge: false,
    parry: false,
    proc: false,
    spamMessage: '',
    spamType: 0,
  };
}

// ============================================
// CM_showFlyText (445)
// ============================================

/**
 * ShowFlyTextMessage - floating text above an object (damage numbers, XP, etc.)
 *
 * C++ source: MessageQueueShowFlyText pack/unpack
 *
 * Wire format:
 *   u64         emitterId
 *   StringId    outputTextId (table + textIndex + text)
 *   Unicode     outputTextOOB
 *   f32         scale
 *   i32         r, i32 g, i32 b (color)
 *   i32         flags
 */
export interface ShowFlyTextMessage {
  /** NetworkId of the object that emits the fly text */
  emitterId: bigint;
  /** Localized string identifier */
  outputTextId: StringId;
  /** Out-of-band Unicode text */
  outputTextOOB: string;
  /** Scale factor for the text */
  scale: number;
  /** Red color component */
  r: number;
  /** Green color component */
  g: number;
  /** Blue color component */
  b: number;
  /** Display flags */
  flags: number;
}

/**
 * Serialize a ShowFlyTextMessage payload to wire format.
 */
export function serializeShowFlyText(msg: ShowFlyTextMessage): Uint8Array {
  const writer = new BufferWriter(128);

  writer.writeUInt64LE(msg.emitterId);
  writeStringId(writer, msg.outputTextId);
  writer.writeUnicodeStringWithLength(msg.outputTextOOB);
  writer.writeFloatLE(msg.scale);
  writer.writeInt32LE(msg.r);
  writer.writeInt32LE(msg.g);
  writer.writeInt32LE(msg.b);
  writer.writeInt32LE(msg.flags);

  return writer.toBuffer();
}

/**
 * Deserialize a ShowFlyTextMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeShowFlyText(
  data: Uint8Array,
  offset: number = 0
): ShowFlyTextMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const emitterId = reader.readUInt64LE();
  const outputTextId = readStringId(reader);
  const outputTextOOB = reader.readUnicodeStringWithLength();
  const scale = reader.readFloatLE();
  const r = reader.readInt32LE();
  const g = reader.readInt32LE();
  const b = reader.readInt32LE();
  const flags = reader.readInt32LE();

  return { emitterId, outputTextId, outputTextOOB, scale, r, g, b, flags };
}

/**
 * Create a ShowFlyTextMessage.
 *
 * @param emitterId    - NetworkId of the emitting object
 * @param outputTextId - Localized string identifier
 * @param r            - Red color component
 * @param g            - Green color component
 * @param b            - Blue color component
 * @param scale        - Text scale factor (default 1.0)
 * @param flags        - Display flags (default 0)
 * @param outputTextOOB - Out-of-band text (default empty)
 */
export function createShowFlyText(
  emitterId: bigint,
  outputTextId: StringId,
  r: number,
  g: number,
  b: number,
  scale: number = 1.0,
  flags: number = 0,
  outputTextOOB: string = ''
): ShowFlyTextMessage {
  return { emitterId, outputTextId, outputTextOOB, scale, r, g, b, flags };
}

// ============================================
// CM_showCombatText (1114)
// ============================================

/**
 * ShowCombatTextMessage - floating combat text between attacker and defender.
 *
 * C++ source: MessageQueueShowCombatText pack/unpack
 *
 * Wire format:
 *   u64         defenderId
 *   u64         attackerId
 *   StringId    outputTextId
 *   Unicode     outputTextOOB
 *   f32         scale
 *   i32         r, i32 g, i32 b
 *   i32         flags
 */
export interface ShowCombatTextMessage {
  /** NetworkId of the defender */
  defenderId: bigint;
  /** NetworkId of the attacker */
  attackerId: bigint;
  /** Localized string identifier */
  outputTextId: StringId;
  /** Out-of-band Unicode text */
  outputTextOOB: string;
  /** Scale factor for the text */
  scale: number;
  /** Red color component */
  r: number;
  /** Green color component */
  g: number;
  /** Blue color component */
  b: number;
  /** Display flags */
  flags: number;
}

/**
 * Serialize a ShowCombatTextMessage payload to wire format.
 */
export function serializeShowCombatText(
  msg: ShowCombatTextMessage
): Uint8Array {
  const writer = new BufferWriter(128);

  writer.writeUInt64LE(msg.defenderId);
  writer.writeUInt64LE(msg.attackerId);
  writeStringId(writer, msg.outputTextId);
  writer.writeUnicodeStringWithLength(msg.outputTextOOB);
  writer.writeFloatLE(msg.scale);
  writer.writeInt32LE(msg.r);
  writer.writeInt32LE(msg.g);
  writer.writeInt32LE(msg.b);
  writer.writeInt32LE(msg.flags);

  return writer.toBuffer();
}

/**
 * Deserialize a ShowCombatTextMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeShowCombatText(
  data: Uint8Array,
  offset: number = 0
): ShowCombatTextMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const defenderId = reader.readUInt64LE();
  const attackerId = reader.readUInt64LE();
  const outputTextId = readStringId(reader);
  const outputTextOOB = reader.readUnicodeStringWithLength();
  const scale = reader.readFloatLE();
  const r = reader.readInt32LE();
  const g = reader.readInt32LE();
  const b = reader.readInt32LE();
  const flags = reader.readInt32LE();

  return {
    defenderId,
    attackerId,
    outputTextId,
    outputTextOOB,
    scale,
    r,
    g,
    b,
    flags,
  };
}

/**
 * Create a ShowCombatTextMessage.
 *
 * @param defenderId   - NetworkId of the defender
 * @param attackerId   - NetworkId of the attacker
 * @param outputTextId - Localized string identifier
 * @param r            - Red color component
 * @param g            - Green color component
 * @param b            - Blue color component
 * @param scale        - Text scale factor (default 1.0)
 * @param flags        - Display flags (default 0)
 * @param outputTextOOB - Out-of-band text (default empty)
 */
export function createShowCombatText(
  defenderId: bigint,
  attackerId: bigint,
  outputTextId: StringId,
  r: number,
  g: number,
  b: number,
  scale: number = 1.0,
  flags: number = 0,
  outputTextOOB: string = ''
): ShowCombatTextMessage {
  return {
    defenderId,
    attackerId,
    outputTextId,
    outputTextOOB,
    scale,
    r,
    g,
    b,
    flags,
  };
}

// ============================================
// CM_pushCreature (1090)
// ============================================

/**
 * PushCreatureMessage - knockback/push effect between two creatures.
 *
 * C++ source: MessageQueuePushCreature pack/unpack
 *
 * Wire format:
 *   u64   attacker
 *   u64   defender
 *   f32   attackerPos_x, f32 attackerPos_y, f32 attackerPos_z
 *   f32   defenderPos_x, f32 defenderPos_y, f32 defenderPos_z
 *   f32   distance
 */
export interface PushCreatureMessage {
  /** NetworkId of the attacker causing the push */
  attacker: bigint;
  /** NetworkId of the creature being pushed */
  defender: bigint;
  /** World-space position of the attacker */
  attackerPos: { x: number; y: number; z: number };
  /** World-space position of the defender */
  defenderPos: { x: number; y: number; z: number };
  /** Distance to push the defender */
  distance: number;
}

/**
 * Serialize a PushCreatureMessage payload to wire format.
 */
export function serializePushCreature(msg: PushCreatureMessage): Uint8Array {
  // 8+8 + 4*3 + 4*3 + 4 = 44 bytes
  const writer = new BufferWriter(44);

  writer.writeUInt64LE(msg.attacker);
  writer.writeUInt64LE(msg.defender);
  writer.writeFloatLE(msg.attackerPos.x);
  writer.writeFloatLE(msg.attackerPos.y);
  writer.writeFloatLE(msg.attackerPos.z);
  writer.writeFloatLE(msg.defenderPos.x);
  writer.writeFloatLE(msg.defenderPos.y);
  writer.writeFloatLE(msg.defenderPos.z);
  writer.writeFloatLE(msg.distance);

  return writer.toBuffer();
}

/**
 * Deserialize a PushCreatureMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializePushCreature(
  data: Uint8Array,
  offset: number = 0
): PushCreatureMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const attacker = reader.readUInt64LE();
  const defender = reader.readUInt64LE();
  const attackerPos = {
    x: reader.readFloatLE(),
    y: reader.readFloatLE(),
    z: reader.readFloatLE(),
  };
  const defenderPos = {
    x: reader.readFloatLE(),
    y: reader.readFloatLE(),
    z: reader.readFloatLE(),
  };
  const distance = reader.readFloatLE();

  return { attacker, defender, attackerPos, defenderPos, distance };
}

/**
 * Create a PushCreatureMessage.
 *
 * @param attacker    - NetworkId of the attacker
 * @param defender    - NetworkId of the defender
 * @param attackerPos - Attacker world-space position
 * @param defenderPos - Defender world-space position
 * @param distance    - Distance to push
 */
export function createPushCreature(
  attacker: bigint,
  defender: bigint,
  attackerPos: { x: number; y: number; z: number },
  defenderPos: { x: number; y: number; z: number },
  distance: number
): PushCreatureMessage {
  return { attacker, defender, attackerPos, defenderPos, distance };
}

// ============================================
// CM_slowDownEffect (1093)
// ============================================

/**
 * SlowDownEffectMessage - area slow/snare visual effect.
 *
 * C++ source: MessageQueueSlowDownEffect pack/unpack
 *
 * Wire format:
 *   u64   target
 *   f32   coneLength
 *   f32   coneAngle
 *   f32   slopeAngle
 *   u32   expireTime
 */
export interface SlowDownEffectMessage {
  /** NetworkId of the target being slowed */
  target: bigint;
  /** Length of the cone effect */
  coneLength: number;
  /** Angle of the cone effect (radians) */
  coneAngle: number;
  /** Slope angle of the effect (radians) */
  slopeAngle: number;
  /** Time (in ms) when the effect expires */
  expireTime: number;
}

/**
 * Serialize a SlowDownEffectMessage payload to wire format.
 */
export function serializeSlowDownEffect(
  msg: SlowDownEffectMessage
): Uint8Array {
  // 8 + 4*3 + 4 = 24 bytes
  const writer = new BufferWriter(24);

  writer.writeUInt64LE(msg.target);
  writer.writeFloatLE(msg.coneLength);
  writer.writeFloatLE(msg.coneAngle);
  writer.writeFloatLE(msg.slopeAngle);
  writer.writeUInt32LE(msg.expireTime);

  return writer.toBuffer();
}

/**
 * Deserialize a SlowDownEffectMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeSlowDownEffect(
  data: Uint8Array,
  offset: number = 0
): SlowDownEffectMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const target = reader.readUInt64LE();
  const coneLength = reader.readFloatLE();
  const coneAngle = reader.readFloatLE();
  const slopeAngle = reader.readFloatLE();
  const expireTime = reader.readUInt32LE();

  return { target, coneLength, coneAngle, slopeAngle, expireTime };
}

/**
 * Create a SlowDownEffectMessage.
 *
 * @param target     - NetworkId of the target
 * @param coneLength - Length of the cone effect
 * @param coneAngle  - Angle of the cone (radians)
 * @param slopeAngle - Slope angle (radians)
 * @param expireTime - Expiration time in ms
 */
export function createSlowDownEffect(
  target: bigint,
  coneLength: number,
  coneAngle: number,
  slopeAngle: number,
  expireTime: number
): SlowDownEffectMessage {
  return { target, coneLength, coneAngle, slopeAngle, expireTime };
}
