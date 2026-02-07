/**
 * Command Timer, Teleport, Sit-on-Object, Targeting, and Mood
 * Controller Command Payloads
 *
 * Payloads for ObjControllerMessage with messageTypes:
 *   - CM_commandTimer       (1096) - Server->Client
 *   - CM_teleportAck        (319)  - Client->Server
 *   - CM_sitOnObject        (315)  - Server->Client
 *   - CM_clientLookAtTarget (294)  - Client->Server
 *   - CM_clientIntendedTarget (1221) - Client->Server
 *   - CM_clientMoodChange   (300)  - Client->Server
 *   - CM_opponentInfo       (228)  - Server->Client
 *
 * These are NOT standalone GameNetworkMessages -- they serialize/deserialize
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 *
 * C++ source: MessageQueueCommandTimer.cpp, MessageQueueTeleportAck.cpp,
 *             MessageQueueSitOnObject.cpp, MessageQueueOpponentInfo.cpp
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// ============================================
// CommandTimer Flag Constants
// ============================================

export const CommandTimerFlags = {
  F_warmup:     0x01,
  F_execute:    0x02,
  F_cooldown:   0x04,
  F_failed:     0x08,
  F_failedRetry: 0x10,
  F_cooldown2:  0x20,
} as const;

// ============================================
// CM_commandTimer (1096) - Server->Client
// ============================================

export interface CommandTimerMessage {
  /** Bitfield of CommandTimerFlags (u8) */
  flags: number;
  /** Sequence ID of the command (u32) */
  sequenceId: number;
  /** CRC of the command name (u32) */
  commandNameCrc: number;
  /** Cooldown group (i32), present when flags & F_cooldown */
  cooldownGroup?: number;
  /** Cooldown group 2 (i32), present when flags & F_cooldown2 */
  cooldownGroup2?: number;
  /** Timer pairs, one per set bit in flags (bits 0-5) */
  timers: Array<{ currentTime: number; maxTime: number }>;
}

// ============================================
// CommandTimer -- Serialize
// ============================================

/**
 * Serialize a CommandTimerMessage payload to wire format.
 *
 * Pack order (C++ MessageQueueCommandTimer::pack):
 *   u8    flags
 *   u32   sequenceId
 *   u32   commandNameCrc
 *   if (flags & F_cooldown):
 *     i32  cooldownGroup
 *   if (flags & F_cooldown2):
 *     i32  cooldownGroup2
 *   for each bit i in flags (bits 0-5):
 *     if (flags & (1 << i)):
 *       f32  currentTime
 *       f32  maxTime
 */
export function serializeCommandTimer(msg: CommandTimerMessage): Uint8Array {
  const writer = new BufferWriter(64);

  writer.writeUInt8(msg.flags);
  writer.writeUInt32LE(msg.sequenceId);
  writer.writeUInt32LE(msg.commandNameCrc);

  if (msg.flags & CommandTimerFlags.F_cooldown) {
    writer.writeInt32LE(msg.cooldownGroup ?? 0);
  }

  if (msg.flags & CommandTimerFlags.F_cooldown2) {
    writer.writeInt32LE(msg.cooldownGroup2 ?? 0);
  }

  let timerIndex = 0;
  for (let i = 0; i < 6; i++) {
    if (msg.flags & (1 << i)) {
      const timer = msg.timers[timerIndex] ?? { currentTime: 0, maxTime: 0 };
      writer.writeFloatLE(timer.currentTime);
      writer.writeFloatLE(timer.maxTime);
      timerIndex++;
    }
  }

  return writer.toBuffer();
}

// ============================================
// CommandTimer -- Deserialize
// ============================================

/**
 * Deserialize a CommandTimerMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCommandTimer(
  data: Uint8Array,
  offset: number = 0
): CommandTimerMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const flags = reader.readUInt8();
  const sequenceId = reader.readUInt32LE();
  const commandNameCrc = reader.readUInt32LE();

  let cooldownGroup: number | undefined;
  let cooldownGroup2: number | undefined;

  if (flags & CommandTimerFlags.F_cooldown) {
    cooldownGroup = reader.readInt32LE();
  }

  if (flags & CommandTimerFlags.F_cooldown2) {
    cooldownGroup2 = reader.readInt32LE();
  }

  const timers: Array<{ currentTime: number; maxTime: number }> = [];
  for (let i = 0; i < 6; i++) {
    if (flags & (1 << i)) {
      timers.push({
        currentTime: reader.readFloatLE(),
        maxTime: reader.readFloatLE(),
      });
    }
  }

  return {
    flags,
    sequenceId,
    commandNameCrc,
    ...(cooldownGroup !== undefined ? { cooldownGroup } : {}),
    ...(cooldownGroup2 !== undefined ? { cooldownGroup2 } : {}),
    timers,
  };
}

// ============================================
// CommandTimer -- Factory
// ============================================

/**
 * Create a CommandTimerMessage.
 *
 * @param flags          - Bitfield of CommandTimerFlags
 * @param sequenceId     - Sequence ID of the command
 * @param commandNameCrc - CRC of the command name
 * @param timers         - Timer pairs (one per set bit in flags)
 * @param cooldownGroup  - Cooldown group (when flags & F_cooldown)
 * @param cooldownGroup2 - Cooldown group 2 (when flags & F_cooldown2)
 */
export function createCommandTimer(
  flags: number,
  sequenceId: number,
  commandNameCrc: number,
  timers: Array<{ currentTime: number; maxTime: number }> = [],
  cooldownGroup?: number,
  cooldownGroup2?: number
): CommandTimerMessage {
  return {
    flags,
    sequenceId,
    commandNameCrc,
    ...(cooldownGroup !== undefined ? { cooldownGroup } : {}),
    ...(cooldownGroup2 !== undefined ? { cooldownGroup2 } : {}),
    timers,
  };
}

// ============================================
// CM_teleportAck (319) - Client->Server
// ============================================

export interface TeleportAckMessage {
  /** Sequence ID acknowledging the teleport (i32) */
  sequenceId: number;
}

// ============================================
// TeleportAck -- Serialize
// ============================================

/**
 * Serialize a TeleportAckMessage payload to wire format.
 *
 * Pack order (C++ MessageQueueTeleportAck::pack):
 *   i32   sequenceId
 */
export function serializeTeleportAck(msg: TeleportAckMessage): Uint8Array {
  const writer = new BufferWriter(4);

  writer.writeInt32LE(msg.sequenceId);

  return writer.toBuffer();
}

// ============================================
// TeleportAck -- Deserialize
// ============================================

/**
 * Deserialize a TeleportAckMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeTeleportAck(
  data: Uint8Array,
  offset: number = 0
): TeleportAckMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const sequenceId = reader.readInt32LE();

  return { sequenceId };
}

// ============================================
// TeleportAck -- Factory
// ============================================

/**
 * Create a TeleportAckMessage.
 *
 * @param sequenceId - Sequence ID acknowledging the teleport
 */
export function createTeleportAck(sequenceId: number): TeleportAckMessage {
  return { sequenceId };
}

// ============================================
// CM_sitOnObject (315) - Server->Client
// ============================================

export interface SitOnObjectMessage {
  /** NetworkId of the cell containing the chair (u64) */
  chairCellId: bigint;
  /** X position of the chair (f32) */
  chairPositionX: number;
  /** Y position of the chair (f32) */
  chairPositionY: number;
  /** Z position of the chair (f32) */
  chairPositionZ: number;
}

// ============================================
// SitOnObject -- Serialize
// ============================================

/**
 * Serialize a SitOnObjectMessage payload to wire format.
 *
 * Pack order (C++ MessageQueueSitOnObject::pack):
 *   u64   chairCellId
 *   f32   chairPosition_x
 *   f32   chairPosition_y
 *   f32   chairPosition_z
 */
export function serializeSitOnObject(msg: SitOnObjectMessage): Uint8Array {
  const writer = new BufferWriter(20);

  writer.writeUInt64LE(msg.chairCellId);
  writer.writeFloatLE(msg.chairPositionX);
  writer.writeFloatLE(msg.chairPositionY);
  writer.writeFloatLE(msg.chairPositionZ);

  return writer.toBuffer();
}

// ============================================
// SitOnObject -- Deserialize
// ============================================

/**
 * Deserialize a SitOnObjectMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeSitOnObject(
  data: Uint8Array,
  offset: number = 0
): SitOnObjectMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const chairCellId = reader.readUInt64LE();
  const chairPositionX = reader.readFloatLE();
  const chairPositionY = reader.readFloatLE();
  const chairPositionZ = reader.readFloatLE();

  return { chairCellId, chairPositionX, chairPositionY, chairPositionZ };
}

// ============================================
// SitOnObject -- Factory
// ============================================

/**
 * Create a SitOnObjectMessage.
 *
 * @param chairCellId    - NetworkId of the cell containing the chair
 * @param chairPositionX - X position of the chair
 * @param chairPositionY - Y position of the chair
 * @param chairPositionZ - Z position of the chair
 */
export function createSitOnObject(
  chairCellId: bigint,
  chairPositionX: number,
  chairPositionY: number,
  chairPositionZ: number
): SitOnObjectMessage {
  return { chairCellId, chairPositionX, chairPositionY, chairPositionZ };
}

// ============================================
// CM_clientLookAtTarget (294) - Client->Server
// ============================================

export interface ClientLookAtTargetMessage {
  /** NetworkId of the target being looked at (u64) */
  targetId: bigint;
}

// ============================================
// ClientLookAtTarget -- Serialize
// ============================================

/**
 * Serialize a ClientLookAtTargetMessage payload to wire format.
 *
 * Pack order:
 *   u64   targetId
 */
export function serializeClientLookAtTarget(
  msg: ClientLookAtTargetMessage
): Uint8Array {
  const writer = new BufferWriter(8);

  writer.writeUInt64LE(msg.targetId);

  return writer.toBuffer();
}

// ============================================
// ClientLookAtTarget -- Deserialize
// ============================================

/**
 * Deserialize a ClientLookAtTargetMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeClientLookAtTarget(
  data: Uint8Array,
  offset: number = 0
): ClientLookAtTargetMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const targetId = reader.readUInt64LE();

  return { targetId };
}

// ============================================
// ClientLookAtTarget -- Factory
// ============================================

/**
 * Create a ClientLookAtTargetMessage.
 *
 * @param targetId - NetworkId of the target being looked at
 */
export function createClientLookAtTarget(
  targetId: bigint
): ClientLookAtTargetMessage {
  return { targetId };
}

// ============================================
// CM_clientIntendedTarget (1221) - Client->Server
// ============================================

/**
 * ClientIntendedTarget has no separate payload -- the intended target
 * NetworkId is carried in the ObjControllerMessage header's networkId field.
 * These are empty stubs for API consistency.
 */

export interface ClientIntendedTargetMessage {
  // No payload fields -- target is in ObjControllerMessage header
}

// ============================================
// ClientIntendedTarget -- Serialize
// ============================================

/**
 * Serialize a ClientIntendedTargetMessage payload to wire format.
 * Returns an empty buffer (no payload).
 */
export function serializeClientIntendedTarget(
  _msg: ClientIntendedTargetMessage
): Uint8Array {
  return new Uint8Array(0);
}

// ============================================
// ClientIntendedTarget -- Deserialize
// ============================================

/**
 * Deserialize a ClientIntendedTargetMessage payload from wire data.
 * Returns an empty object (no payload).
 *
 * @param _data   - Raw payload bytes (unused)
 * @param _offset - Optional byte offset (unused)
 */
export function deserializeClientIntendedTarget(
  _data: Uint8Array,
  _offset: number = 0
): ClientIntendedTargetMessage {
  return {};
}

// ============================================
// ClientIntendedTarget -- Factory
// ============================================

/**
 * Create a ClientIntendedTargetMessage.
 * Returns an empty object (no payload fields).
 */
export function createClientIntendedTarget(): ClientIntendedTargetMessage {
  return {};
}

// ============================================
// CM_clientMoodChange (300) - Client->Server
// ============================================

export interface ClientMoodChangeMessage {
  /** Mood type identifier (u32) */
  moodType: number;
}

// ============================================
// ClientMoodChange -- Serialize
// ============================================

/**
 * Serialize a ClientMoodChangeMessage payload to wire format.
 *
 * Pack order:
 *   u32   moodType
 */
export function serializeClientMoodChange(
  msg: ClientMoodChangeMessage
): Uint8Array {
  const writer = new BufferWriter(4);

  writer.writeUInt32LE(msg.moodType);

  return writer.toBuffer();
}

// ============================================
// ClientMoodChange -- Deserialize
// ============================================

/**
 * Deserialize a ClientMoodChangeMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeClientMoodChange(
  data: Uint8Array,
  offset: number = 0
): ClientMoodChangeMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const moodType = reader.readUInt32LE();

  return { moodType };
}

// ============================================
// ClientMoodChange -- Factory
// ============================================

/**
 * Create a ClientMoodChangeMessage.
 *
 * @param moodType - Mood type identifier
 */
export function createClientMoodChange(
  moodType: number
): ClientMoodChangeMessage {
  return { moodType };
}

// ============================================
// CM_opponentInfo (228) - Server->Client
// ============================================

export interface OpponentInfoMessage {
  /** NetworkId of the opponent (u64) */
  opponentId: bigint;
}

// ============================================
// OpponentInfo -- Serialize
// ============================================

/**
 * Serialize an OpponentInfoMessage payload to wire format.
 *
 * Pack order (C++ MessageQueueOpponentInfo::pack):
 *   u64   opponentId
 */
export function serializeOpponentInfo(msg: OpponentInfoMessage): Uint8Array {
  const writer = new BufferWriter(8);

  writer.writeUInt64LE(msg.opponentId);

  return writer.toBuffer();
}

// ============================================
// OpponentInfo -- Deserialize
// ============================================

/**
 * Deserialize an OpponentInfoMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeOpponentInfo(
  data: Uint8Array,
  offset: number = 0
): OpponentInfoMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const opponentId = reader.readUInt64LE();

  return { opponentId };
}

// ============================================
// OpponentInfo -- Factory
// ============================================

/**
 * Create an OpponentInfoMessage.
 *
 * @param opponentId - NetworkId of the opponent
 */
export function createOpponentInfo(opponentId: bigint): OpponentInfoMessage {
  return { opponentId };
}
