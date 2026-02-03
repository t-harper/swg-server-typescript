/**
 * SWG Movement Messages
 * Protocol messages for player position and movement updates
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

/**
 * SWG Message opcodes for movement protocol
 * These are the high-level game message types (sent inside SOE Data packets)
 */
export const MovementMessageOpcode = {
  /** Client position update */
  DataTransform: 0x71,
  /** Client position update relative to cell/container */
  DataTransformWithParent: 0xf1,
  /** Server broadcast position update */
  UpdateTransform: 0x1b24f808,
  /** Server broadcast position update with parent */
  UpdateTransformWithParent: 0xe8d4350a,
} as const;

export type MovementMessageOpcodeType =
  (typeof MovementMessageOpcode)[keyof typeof MovementMessageOpcode];

/**
 * Transform data - position and orientation
 */
export interface Transform {
  x: number;
  y: number;
  z: number;
  yaw: number; // Heading in radians
}

/**
 * Base interface for all movement messages
 */
export interface MovementMessageBase {
  opcode: number;
}

/**
 * DataTransform (0x71) - Client position update
 * Sent by client to update their world position
 */
export interface DataTransform extends MovementMessageBase {
  opcode: typeof MovementMessageOpcode.DataTransform;
  objectId: bigint;
  sequenceNumber: number; // For ordering updates
  transform: Transform;
  speed: number;
  lookAtYaw: number;
  useLookAtYaw: boolean;
}

/**
 * DataTransformWithParent (0xF1) - Position relative to cell/container
 * Sent by client when inside a building or vehicle
 */
export interface DataTransformWithParent extends MovementMessageBase {
  opcode: typeof MovementMessageOpcode.DataTransformWithParent;
  objectId: bigint;
  sequenceNumber: number;
  cellId: bigint; // Parent cell object ID
  transform: Transform;
  speed: number;
  lookAtYaw: number;
  useLookAtYaw: boolean;
}

/**
 * UpdateTransform - Server broadcast position update
 * Sent by server to all nearby clients
 */
export interface UpdateTransform extends MovementMessageBase {
  opcode: typeof MovementMessageOpcode.UpdateTransform;
  objectId: bigint;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
}

/**
 * UpdateTransformWithParent - Server broadcast position update with parent
 * Sent by server when player is inside a cell
 */
export interface UpdateTransformWithParent extends MovementMessageBase {
  opcode: typeof MovementMessageOpcode.UpdateTransformWithParent;
  objectId: bigint;
  cellId: bigint;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
}

/**
 * Union type of all movement messages
 */
export type MovementMessage =
  | DataTransform
  | DataTransformWithParent
  | UpdateTransform
  | UpdateTransformWithParent;

/**
 * Serialize DataTransform message
 */
export function serializeDataTransform(message: DataTransform): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt8(message.opcode);
  writer.writeUInt64LE(message.objectId);
  writer.writeUInt32LE(message.sequenceNumber);
  writer.writeFloatLE(message.transform.x);
  writer.writeFloatLE(message.transform.y);
  writer.writeFloatLE(message.transform.z);
  writer.writeFloatLE(message.transform.yaw);
  writer.writeFloatLE(message.speed);
  writer.writeFloatLE(message.lookAtYaw);
  writer.writeUInt8(message.useLookAtYaw ? 1 : 0);
  return writer.toBuffer();
}

/**
 * Deserialize DataTransform message
 */
export function deserializeDataTransform(data: Uint8Array): DataTransform {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt8();
  if (opcode !== MovementMessageOpcode.DataTransform) {
    throw new Error(`Invalid opcode for DataTransform: 0x${opcode.toString(16)}`);
  }

  const objectId = reader.readUInt64LE();
  const sequenceNumber = reader.readUInt32LE();
  const x = reader.readFloatLE();
  const y = reader.readFloatLE();
  const z = reader.readFloatLE();
  const yaw = reader.readFloatLE();
  const speed = reader.readFloatLE();
  const lookAtYaw = reader.readFloatLE();
  const useLookAtYaw = reader.readUInt8() !== 0;

  return {
    opcode: MovementMessageOpcode.DataTransform,
    objectId,
    sequenceNumber,
    transform: { x, y, z, yaw },
    speed,
    lookAtYaw,
    useLookAtYaw,
  };
}

/**
 * Serialize DataTransformWithParent message
 */
export function serializeDataTransformWithParent(
  message: DataTransformWithParent
): Uint8Array {
  const writer = new BufferWriter(72);
  writer.writeUInt8(message.opcode);
  writer.writeUInt64LE(message.objectId);
  writer.writeUInt32LE(message.sequenceNumber);
  writer.writeUInt64LE(message.cellId);
  writer.writeFloatLE(message.transform.x);
  writer.writeFloatLE(message.transform.y);
  writer.writeFloatLE(message.transform.z);
  writer.writeFloatLE(message.transform.yaw);
  writer.writeFloatLE(message.speed);
  writer.writeFloatLE(message.lookAtYaw);
  writer.writeUInt8(message.useLookAtYaw ? 1 : 0);
  return writer.toBuffer();
}

/**
 * Deserialize DataTransformWithParent message
 */
export function deserializeDataTransformWithParent(
  data: Uint8Array
): DataTransformWithParent {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt8();
  if (opcode !== MovementMessageOpcode.DataTransformWithParent) {
    throw new Error(
      `Invalid opcode for DataTransformWithParent: 0x${opcode.toString(16)}`
    );
  }

  const objectId = reader.readUInt64LE();
  const sequenceNumber = reader.readUInt32LE();
  const cellId = reader.readUInt64LE();
  const x = reader.readFloatLE();
  const y = reader.readFloatLE();
  const z = reader.readFloatLE();
  const yaw = reader.readFloatLE();
  const speed = reader.readFloatLE();
  const lookAtYaw = reader.readFloatLE();
  const useLookAtYaw = reader.readUInt8() !== 0;

  return {
    opcode: MovementMessageOpcode.DataTransformWithParent,
    objectId,
    sequenceNumber,
    cellId,
    transform: { x, y, z, yaw },
    speed,
    lookAtYaw,
    useLookAtYaw,
  };
}

/**
 * Serialize UpdateTransform message
 */
export function serializeUpdateTransform(message: UpdateTransform): Uint8Array {
  const writer = new BufferWriter(32);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.objectId);
  writer.writeFloatLE(message.x);
  writer.writeFloatLE(message.y);
  writer.writeFloatLE(message.z);
  writer.writeFloatLE(message.yaw);
  writer.writeFloatLE(message.speed);
  return writer.toBuffer();
}

/**
 * Deserialize UpdateTransform message
 */
export function deserializeUpdateTransform(data: Uint8Array): UpdateTransform {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== MovementMessageOpcode.UpdateTransform) {
    throw new Error(`Invalid opcode for UpdateTransform: 0x${opcode.toString(16)}`);
  }

  const objectId = reader.readUInt64LE();
  const x = reader.readFloatLE();
  const y = reader.readFloatLE();
  const z = reader.readFloatLE();
  const yaw = reader.readFloatLE();
  const speed = reader.readFloatLE();

  return {
    opcode: MovementMessageOpcode.UpdateTransform,
    objectId,
    x,
    y,
    z,
    yaw,
    speed,
  };
}

/**
 * Serialize UpdateTransformWithParent message
 */
export function serializeUpdateTransformWithParent(
  message: UpdateTransformWithParent
): Uint8Array {
  const writer = new BufferWriter(40);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.objectId);
  writer.writeUInt64LE(message.cellId);
  writer.writeFloatLE(message.x);
  writer.writeFloatLE(message.y);
  writer.writeFloatLE(message.z);
  writer.writeFloatLE(message.yaw);
  writer.writeFloatLE(message.speed);
  return writer.toBuffer();
}

/**
 * Deserialize UpdateTransformWithParent message
 */
export function deserializeUpdateTransformWithParent(
  data: Uint8Array
): UpdateTransformWithParent {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== MovementMessageOpcode.UpdateTransformWithParent) {
    throw new Error(
      `Invalid opcode for UpdateTransformWithParent: 0x${opcode.toString(16)}`
    );
  }

  const objectId = reader.readUInt64LE();
  const cellId = reader.readUInt64LE();
  const x = reader.readFloatLE();
  const y = reader.readFloatLE();
  const z = reader.readFloatLE();
  const yaw = reader.readFloatLE();
  const speed = reader.readFloatLE();

  return {
    opcode: MovementMessageOpcode.UpdateTransformWithParent,
    objectId,
    cellId,
    x,
    y,
    z,
    yaw,
    speed,
  };
}

/**
 * Get the opcode from raw movement message data
 * Note: DataTransform uses 1-byte opcode, UpdateTransform uses 4-byte opcode
 */
export function getMovementMessageOpcode(data: Uint8Array): number {
  if (data.length < 1) {
    throw new Error('Message too short to contain opcode');
  }

  // Check if it's a single-byte opcode (DataTransform types)
  const firstByte = data[0];
  if (
    firstByte === MovementMessageOpcode.DataTransform ||
    firstByte === MovementMessageOpcode.DataTransformWithParent
  ) {
    return firstByte;
  }

  // Otherwise it's a 4-byte opcode
  if (data.length < 4) {
    throw new Error('Message too short to contain 4-byte opcode');
  }
  const reader = new BufferReader(data);
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid movement message opcode
 */
export function isMovementMessageOpcode(
  opcode: number
): opcode is MovementMessageOpcodeType {
  return Object.values(MovementMessageOpcode).includes(
    opcode as MovementMessageOpcodeType
  );
}

/**
 * Create a DataTransform message
 */
export function createDataTransform(
  objectId: bigint,
  sequenceNumber: number,
  transform: Transform,
  speed: number,
  lookAtYaw: number = 0,
  useLookAtYaw: boolean = false
): DataTransform {
  return {
    opcode: MovementMessageOpcode.DataTransform,
    objectId,
    sequenceNumber,
    transform,
    speed,
    lookAtYaw,
    useLookAtYaw,
  };
}

/**
 * Create a DataTransformWithParent message
 */
export function createDataTransformWithParent(
  objectId: bigint,
  sequenceNumber: number,
  cellId: bigint,
  transform: Transform,
  speed: number,
  lookAtYaw: number = 0,
  useLookAtYaw: boolean = false
): DataTransformWithParent {
  return {
    opcode: MovementMessageOpcode.DataTransformWithParent,
    objectId,
    sequenceNumber,
    cellId,
    transform,
    speed,
    lookAtYaw,
    useLookAtYaw,
  };
}

/**
 * Create an UpdateTransform message
 */
export function createUpdateTransform(
  objectId: bigint,
  x: number,
  y: number,
  z: number,
  yaw: number,
  speed: number
): UpdateTransform {
  return {
    opcode: MovementMessageOpcode.UpdateTransform,
    objectId,
    x,
    y,
    z,
    yaw,
    speed,
  };
}

/**
 * Create an UpdateTransformWithParent message
 */
export function createUpdateTransformWithParent(
  objectId: bigint,
  cellId: bigint,
  x: number,
  y: number,
  z: number,
  yaw: number,
  speed: number
): UpdateTransformWithParent {
  return {
    opcode: MovementMessageOpcode.UpdateTransformWithParent,
    objectId,
    cellId,
    x,
    y,
    z,
    yaw,
    speed,
  };
}
