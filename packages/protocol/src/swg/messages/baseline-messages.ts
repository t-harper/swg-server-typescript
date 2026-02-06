/**
 * SWG Baseline and Delta Messages
 * Protocol messages for object state synchronization (baselines and deltas)
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';
import { type SwgMessageBase } from './login-messages.js';

/**
 * Baseline message opcodes
 */
export const BaselineMessageOpcode = {
  /** Full object state snapshot */
  BaselinesMessage: 0x68a75f0c,
  /** Incremental object state update */
  DeltasMessage: 0x12862153,
} as const;

export type BaselineMessageOpcodeType =
  (typeof BaselineMessageOpcode)[keyof typeof BaselineMessageOpcode];

// ============================================
// BaselinesMessage (0x68A75F0C)
// ============================================

/**
 * BaselinesMessage - Full object state snapshot
 * Sent from server to client to establish the initial state of an object.
 * Each object type has multiple baseline packages (e.g. CREO 1,3,4,6,8,9).
 */
export interface BaselinesMessage extends SwgMessageBase {
  opcode: typeof BaselineMessageOpcode.BaselinesMessage;
  targetId: bigint;
  typeTag: number;
  packageId: number;
  payload: Uint8Array;
}

/**
 * Serialize BaselinesMessage message
 */
export function serializeBaselinesMessage(message: BaselinesMessage): Uint8Array {
  const writer = new BufferWriter(32 + message.payload.length);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.targetId);
  writer.writeUInt32LE(message.typeTag);
  writer.writeUInt8(message.packageId);
  writer.writeUInt32LE(message.payload.length);
  writer.writeBytes(message.payload);
  return writer.toBuffer();
}

/**
 * Deserialize BaselinesMessage message
 */
export function deserializeBaselinesMessage(data: Uint8Array): BaselinesMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BaselineMessageOpcode.BaselinesMessage) {
    throw new Error(`Invalid opcode for BaselinesMessage: 0x${opcode.toString(16)}`);
  }

  const targetId = reader.readUInt64LE();
  const typeTag = reader.readUInt32LE();
  const packageId = reader.readUInt8();
  const payloadSize = reader.readUInt32LE();
  const payload = reader.readBytes(payloadSize);

  return {
    opcode: BaselineMessageOpcode.BaselinesMessage,
    targetId,
    typeTag,
    packageId,
    payload: new Uint8Array(payload),
  };
}

/**
 * Create a BaselinesMessage message
 */
export function createBaselinesMessage(
  targetId: bigint,
  typeTag: number,
  packageId: number,
  payload: Uint8Array
): BaselinesMessage {
  return {
    opcode: BaselineMessageOpcode.BaselinesMessage,
    targetId,
    typeTag,
    packageId,
    payload,
  };
}

// ============================================
// DeltasMessage (0x12862153)
// ============================================

/**
 * DeltasMessage - Incremental object state update
 * Sent from server to client to update specific fields of an object.
 * Uses the same type tag and package ID system as BaselinesMessage.
 */
export interface DeltasMessage extends SwgMessageBase {
  opcode: typeof BaselineMessageOpcode.DeltasMessage;
  targetId: bigint;
  typeTag: number;
  packageId: number;
  payload: Uint8Array;
}

/**
 * Serialize DeltasMessage message
 */
export function serializeDeltasMessage(message: DeltasMessage): Uint8Array {
  const writer = new BufferWriter(32 + message.payload.length);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.targetId);
  writer.writeUInt32LE(message.typeTag);
  writer.writeUInt8(message.packageId);
  writer.writeUInt32LE(message.payload.length);
  writer.writeBytes(message.payload);
  return writer.toBuffer();
}

/**
 * Deserialize DeltasMessage message
 */
export function deserializeDeltasMessage(data: Uint8Array): DeltasMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== BaselineMessageOpcode.DeltasMessage) {
    throw new Error(`Invalid opcode for DeltasMessage: 0x${opcode.toString(16)}`);
  }

  const targetId = reader.readUInt64LE();
  const typeTag = reader.readUInt32LE();
  const packageId = reader.readUInt8();
  const payloadSize = reader.readUInt32LE();
  const payload = reader.readBytes(payloadSize);

  return {
    opcode: BaselineMessageOpcode.DeltasMessage,
    targetId,
    typeTag,
    packageId,
    payload: new Uint8Array(payload),
  };
}

/**
 * Create a DeltasMessage message
 */
export function createDeltasMessage(
  targetId: bigint,
  typeTag: number,
  packageId: number,
  payload: Uint8Array
): DeltasMessage {
  return {
    opcode: BaselineMessageOpcode.DeltasMessage,
    targetId,
    typeTag,
    packageId,
    payload,
  };
}

// ============================================
// Union Types and Utilities
// ============================================

/**
 * Union type of all baseline/delta messages
 */
export type BaselineMessage = BaselinesMessage | DeltasMessage;

/**
 * Get the opcode from raw baseline message data
 */
export function getBaselineMessageOpcode(data: Uint8Array): number {
  if (data.length < 4) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid baseline message opcode
 */
export function isBaselineMessageOpcode(
  opcode: number
): opcode is BaselineMessageOpcodeType {
  return Object.values(BaselineMessageOpcode).includes(
    opcode as BaselineMessageOpcodeType
  );
}
