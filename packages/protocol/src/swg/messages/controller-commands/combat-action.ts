/**
 * CombatAction Controller Command Payload
 *
 * Payload for ObjControllerMessage with messageType CM_combatAction (204).
 * This is NOT a standalone GameNetworkMessage -- it serializes/deserializes
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 *
 * C++ source: MessageQueueCombatAction.cpp pack/unpack
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// ============================================
// Interfaces
// ============================================

export interface AttackerData {
  /** NetworkId of the attacker */
  id: bigint;
  /** NetworkId of the weapon used */
  weapon: bigint;
  /** Postures::Enumerator -- ending posture after attack (int8) */
  endPosture: number;
  /** Trail visual bits (u8) */
  trailBits: number;
  /** Client effect identifier (u8) */
  clientEffectId: number;
  /** CRC of the action/ability name (i32) */
  actionNameCrc: number;
  /** Whether a target location is included */
  useLocation: boolean;
  /** Target world-space location (only present when useLocation is true) */
  targetLocation?: { x: number; y: number; z: number } | undefined;
  /** Target cell NetworkId (only present when useLocation is true) */
  targetCell?: bigint | undefined;
}

export interface DefenderData {
  /** NetworkId of the defender */
  id: bigint;
  /** Postures::Enumerator -- ending posture after hit (int8) */
  endPosture: number;
  /** CombatDefense enum value (u8) */
  defense: number;
  /** Client effect identifier (u8) */
  clientEffectId: number;
  /** Hit location on the body (u8) */
  hitLocation: number;
  /** Damage dealt (u16) */
  damageAmount: number;
}

export interface CombatActionMessage {
  /** CRC of the ability/action name (u32) */
  actionId: number;
  /** Attacker information */
  attacker: AttackerData;
  /** List of defenders hit by this action */
  defenders: DefenderData[];
}

// ============================================
// Serialize
// ============================================

/**
 * Serialize a CombatActionMessage payload to wire format.
 *
 * Pack order (C++ MessageQueueCombatAction::pack):
 *   u32   actionId
 *   u64   attacker.id
 *   u64   attacker.weapon
 *   i8    attacker.endPosture
 *   u8    attacker.trailBits
 *   u8    attacker.clientEffectId
 *   i32   attacker.actionNameCrc
 *   u8    attacker.useLocation (bool)
 *   if useLocation:
 *     f32   targetLocation.x
 *     f32   targetLocation.y
 *     f32   targetLocation.z
 *     u64   targetCell
 *   u16   defenderCount
 *   for each defender:
 *     u64   id
 *     i8    endPosture
 *     u8    defense
 *     u8    clientEffectId
 *     u8    hitLocation
 *     u16   damageAmount
 */
export function serializeCombatAction(msg: CombatActionMessage): Uint8Array {
  const writer = new BufferWriter(256);

  // 1. Action ID
  writer.writeUInt32LE(msg.actionId);

  // 2. Attacker data
  writer.writeUInt64LE(msg.attacker.id);
  writer.writeUInt64LE(msg.attacker.weapon);
  writer.writeInt8(msg.attacker.endPosture);
  writer.writeUInt8(msg.attacker.trailBits);
  writer.writeUInt8(msg.attacker.clientEffectId);
  writer.writeInt32LE(msg.attacker.actionNameCrc);
  writer.writeUInt8(msg.attacker.useLocation ? 1 : 0);

  if (msg.attacker.useLocation) {
    const loc = msg.attacker.targetLocation ?? { x: 0, y: 0, z: 0 };
    writer.writeFloatLE(loc.x);
    writer.writeFloatLE(loc.y);
    writer.writeFloatLE(loc.z);
    writer.writeUInt64LE(msg.attacker.targetCell ?? 0n);
  }

  // 3. Defender list
  writer.writeUInt16LE(msg.defenders.length);
  for (const def of msg.defenders) {
    writer.writeUInt64LE(def.id);
    writer.writeInt8(def.endPosture);
    writer.writeUInt8(def.defense);
    writer.writeUInt8(def.clientEffectId);
    writer.writeUInt8(def.hitLocation);
    writer.writeUInt16LE(def.damageAmount);
  }

  return writer.toBuffer();
}

// ============================================
// Deserialize
// ============================================

/**
 * Deserialize a CombatActionMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCombatAction(
  data: Uint8Array,
  offset: number = 0
): CombatActionMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  // 1. Action ID
  const actionId = reader.readUInt32LE();

  // 2. Attacker data
  const attackerId = reader.readUInt64LE();
  const weapon = reader.readUInt64LE();
  const endPosture = reader.readInt8();
  const trailBits = reader.readUInt8();
  const clientEffectId = reader.readUInt8();
  const actionNameCrc = reader.readInt32LE();
  const useLocation = reader.readUInt8() !== 0;

  let targetLocation: { x: number; y: number; z: number } | undefined;
  let targetCell: bigint | undefined;

  if (useLocation) {
    targetLocation = {
      x: reader.readFloatLE(),
      y: reader.readFloatLE(),
      z: reader.readFloatLE(),
    };
    targetCell = reader.readUInt64LE();
  }

  const attacker: AttackerData = {
    id: attackerId,
    weapon,
    endPosture,
    trailBits,
    clientEffectId,
    actionNameCrc,
    useLocation,
    ...(useLocation ? { targetLocation, targetCell } : {}),
  };

  // 3. Defender list
  const defenderCount = reader.readUInt16LE();
  const defenders: DefenderData[] = [];

  for (let i = 0; i < defenderCount; i++) {
    defenders.push({
      id: reader.readUInt64LE(),
      endPosture: reader.readInt8(),
      defense: reader.readUInt8(),
      clientEffectId: reader.readUInt8(),
      hitLocation: reader.readUInt8(),
      damageAmount: reader.readUInt16LE(),
    });
  }

  return { actionId, attacker, defenders };
}

// ============================================
// Factory
// ============================================

/**
 * Create a CombatActionMessage.
 *
 * @param actionId  - CRC of the ability/action name
 * @param attacker  - Attacker data
 * @param defenders - List of defender data entries
 */
export function createCombatAction(
  actionId: number,
  attacker: AttackerData,
  defenders: DefenderData[] = []
): CombatActionMessage {
  return { actionId, attacker, defenders };
}
