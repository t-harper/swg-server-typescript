/**
 * Command Queue Controller Command Payloads
 *
 * Payloads for ObjControllerMessage with messageType:
 *   - CM_commandQueueEnqueue (278)
 *   - CM_commandQueueRemove  (279)
 *
 * These are NOT standalone GameNetworkMessages -- they serialize/deserialize
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 *
 * C++ source: MessageQueueCommandQueueEnqueue.cpp / MessageQueueCommandQueueRemove.cpp
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// ============================================
// CommandQueueEnqueue
// ============================================

export interface CommandQueueEnqueueMessage {
  /** Sequence number for this queued command (u32) */
  sequenceId: number;
  /** CRC hash of the command name (u32) */
  commandHash: number;
  /** NetworkId of the target object (u64) */
  targetId: bigint;
  /** Unicode parameter string for the command */
  params: string;
}

// ============================================
// CommandQueueEnqueue -- Serialize
// ============================================

/**
 * Serialize a CommandQueueEnqueueMessage payload to wire format.
 *
 * Pack order (C++ MessageQueueCommandQueueEnqueue::pack):
 *   u32   sequenceId
 *   u32   commandHash
 *   u64   targetId
 *   Unicode::String params  (u32LE charCount + utf16le data)
 */
export function serializeCommandQueueEnqueue(
  msg: CommandQueueEnqueueMessage
): Uint8Array {
  const writer = new BufferWriter(128);

  writer.writeUInt32LE(msg.sequenceId);
  writer.writeUInt32LE(msg.commandHash);
  writer.writeUInt64LE(msg.targetId);
  writer.writeUnicodeStringWithLength(msg.params);

  return writer.toBuffer();
}

// ============================================
// CommandQueueEnqueue -- Deserialize
// ============================================

/**
 * Deserialize a CommandQueueEnqueueMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCommandQueueEnqueue(
  data: Uint8Array,
  offset: number = 0
): CommandQueueEnqueueMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const sequenceId = reader.readUInt32LE();
  const commandHash = reader.readUInt32LE();
  const targetId = reader.readUInt64LE();
  const params = reader.readUnicodeStringWithLength();

  return { sequenceId, commandHash, targetId, params };
}

// ============================================
// CommandQueueEnqueue -- Factory
// ============================================

/**
 * Create a CommandQueueEnqueueMessage.
 *
 * @param sequenceId  - Sequence number for this queued command
 * @param commandHash - CRC hash of the command name
 * @param targetId    - NetworkId of the target object
 * @param params      - Unicode parameter string (default empty)
 */
export function createCommandQueueEnqueue(
  sequenceId: number,
  commandHash: number,
  targetId: bigint,
  params: string = ''
): CommandQueueEnqueueMessage {
  return { sequenceId, commandHash, targetId, params };
}

// ============================================
// CommandQueueRemove
// ============================================

export interface CommandQueueRemoveMessage {
  /** Sequence number of the command being removed (u32) */
  sequenceId: number;
  /** Time the command should wait before executing (f32) */
  waitTime: number;
  /** CRC hash of the currently executing command (u32) */
  currentCommand: number;
  /** Wait time for the currently executing command (f32) */
  currentCommandWaitTime: number;
}

// ============================================
// CommandQueueRemove -- Serialize
// ============================================

/**
 * Serialize a CommandQueueRemoveMessage payload to wire format.
 *
 * Pack order (C++ MessageQueueCommandQueueRemove::pack):
 *   u32   sequenceId
 *   f32   waitTime
 *   u32   currentCommand
 *   f32   currentCommandWaitTime
 */
export function serializeCommandQueueRemove(
  msg: CommandQueueRemoveMessage
): Uint8Array {
  const writer = new BufferWriter(16);

  writer.writeUInt32LE(msg.sequenceId);
  writer.writeFloatLE(msg.waitTime);
  writer.writeUInt32LE(msg.currentCommand);
  writer.writeFloatLE(msg.currentCommandWaitTime);

  return writer.toBuffer();
}

// ============================================
// CommandQueueRemove -- Deserialize
// ============================================

/**
 * Deserialize a CommandQueueRemoveMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeCommandQueueRemove(
  data: Uint8Array,
  offset: number = 0
): CommandQueueRemoveMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const sequenceId = reader.readUInt32LE();
  const waitTime = reader.readFloatLE();
  const currentCommand = reader.readUInt32LE();
  const currentCommandWaitTime = reader.readFloatLE();

  return { sequenceId, waitTime, currentCommand, currentCommandWaitTime };
}

// ============================================
// CommandQueueRemove -- Factory
// ============================================

/**
 * Create a CommandQueueRemoveMessage.
 *
 * @param sequenceId             - Sequence number of the command being removed
 * @param waitTime               - Wait time before command executes
 * @param currentCommand         - CRC hash of the currently executing command
 * @param currentCommandWaitTime - Wait time for the current command
 */
export function createCommandQueueRemove(
  sequenceId: number,
  waitTime: number = 0,
  currentCommand: number = 0,
  currentCommandWaitTime: number = 0
): CommandQueueRemoveMessage {
  return { sequenceId, waitTime, currentCommand, currentCommandWaitTime };
}
