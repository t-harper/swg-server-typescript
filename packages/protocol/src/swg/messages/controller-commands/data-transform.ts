/**
 * DataTransform / DataTransformWithParent controller command payloads
 *
 * These are the variable-length payloads that follow the ObjControllerMessage
 * header when messageType is CM_netUpdateTransform (113) or
 * CM_netUpdateTransformWithParent (241).
 *
 * DataTransform wire format (payload only, after ObjControllerMessage header):
 *   u32  syncStamp
 *   i32  sequenceNumber
 *   f32  quaternionX        (orientation)
 *   f32  quaternionY
 *   f32  quaternionZ
 *   f32  quaternionW
 *   f32  positionX
 *   f32  positionY
 *   f32  positionZ
 *   f32  speed
 *   f32  lookAtYaw
 *   u8   useLookAtYaw       (bool)
 *
 * DataTransformWithParent has the same layout but inserts a u64 parent
 * NetworkId between sequenceNumber and the quaternion.
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';
import { GameControllerMessage } from '../obj-controller.js';

// ============================================
// DataTransform (CM_netUpdateTransform = 113)
// ============================================

/**
 * DataTransform payload - world-space position update
 */
export interface DataTransformPayload {
  messageType: typeof GameControllerMessage.CM_netUpdateTransform;
  syncStamp: number;
  sequenceNumber: number;
  quaternionX: number;
  quaternionY: number;
  quaternionZ: number;
  quaternionW: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  speed: number;
  lookAtYaw: number;
  useLookAtYaw: boolean;
}

/**
 * Serialize a DataTransform payload to bytes.
 * These bytes become the `payload` field of the ObjControllerMessage.
 */
export function serializeDataTransformPayload(
  msg: DataTransformPayload
): Uint8Array {
  // 4+4 + 4*7 + 4+4 + 1 = 45 bytes
  const writer = new BufferWriter(45);
  writer.writeUInt32LE(msg.syncStamp);
  writer.writeInt32LE(msg.sequenceNumber);
  writer.writeFloatLE(msg.quaternionX);
  writer.writeFloatLE(msg.quaternionY);
  writer.writeFloatLE(msg.quaternionZ);
  writer.writeFloatLE(msg.quaternionW);
  writer.writeFloatLE(msg.positionX);
  writer.writeFloatLE(msg.positionY);
  writer.writeFloatLE(msg.positionZ);
  writer.writeFloatLE(msg.speed);
  writer.writeFloatLE(msg.lookAtYaw);
  writer.writeUInt8(msg.useLookAtYaw ? 1 : 0);
  return writer.toBuffer();
}

/**
 * Deserialize a DataTransform payload from raw bytes.
 */
export function deserializeDataTransformPayload(
  data: Uint8Array
): DataTransformPayload {
  const reader = new BufferReader(data);
  const syncStamp = reader.readUInt32LE();
  const sequenceNumber = reader.readInt32LE();
  const quaternionX = reader.readFloatLE();
  const quaternionY = reader.readFloatLE();
  const quaternionZ = reader.readFloatLE();
  const quaternionW = reader.readFloatLE();
  const positionX = reader.readFloatLE();
  const positionY = reader.readFloatLE();
  const positionZ = reader.readFloatLE();
  const speed = reader.readFloatLE();
  const lookAtYaw = reader.readFloatLE();
  const useLookAtYaw = reader.readUInt8() !== 0;

  return {
    messageType: GameControllerMessage.CM_netUpdateTransform,
    syncStamp,
    sequenceNumber,
    quaternionX,
    quaternionY,
    quaternionZ,
    quaternionW,
    positionX,
    positionY,
    positionZ,
    speed,
    lookAtYaw,
    useLookAtYaw,
  };
}

/**
 * Create a DataTransform payload.
 */
export function createDataTransformPayload(
  syncStamp: number,
  sequenceNumber: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  quaternionX: number = 0,
  quaternionY: number = 0,
  quaternionZ: number = 0,
  quaternionW: number = 1,
  speed: number = 0,
  lookAtYaw: number = 0,
  useLookAtYaw: boolean = false
): DataTransformPayload {
  return {
    messageType: GameControllerMessage.CM_netUpdateTransform,
    syncStamp,
    sequenceNumber,
    quaternionX,
    quaternionY,
    quaternionZ,
    quaternionW,
    positionX,
    positionY,
    positionZ,
    speed,
    lookAtYaw,
    useLookAtYaw,
  };
}

// ============================================
// DataTransformWithParent (CM_netUpdateTransformWithParent = 241)
// ============================================

/**
 * DataTransformWithParent payload - cell-relative position update
 * Same as DataTransform but with a parent NetworkId (cell/container).
 */
export interface DataTransformWithParentPayload {
  messageType: typeof GameControllerMessage.CM_netUpdateTransformWithParent;
  syncStamp: number;
  sequenceNumber: number;
  parent: bigint;
  quaternionX: number;
  quaternionY: number;
  quaternionZ: number;
  quaternionW: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  speed: number;
  lookAtYaw: number;
  useLookAtYaw: boolean;
}

/**
 * Serialize a DataTransformWithParent payload to bytes.
 */
export function serializeDataTransformWithParentPayload(
  msg: DataTransformWithParentPayload
): Uint8Array {
  // 4+4+8 + 4*7 + 4+4 + 1 = 53 bytes
  const writer = new BufferWriter(53);
  writer.writeUInt32LE(msg.syncStamp);
  writer.writeInt32LE(msg.sequenceNumber);
  writer.writeUInt64LE(msg.parent);
  writer.writeFloatLE(msg.quaternionX);
  writer.writeFloatLE(msg.quaternionY);
  writer.writeFloatLE(msg.quaternionZ);
  writer.writeFloatLE(msg.quaternionW);
  writer.writeFloatLE(msg.positionX);
  writer.writeFloatLE(msg.positionY);
  writer.writeFloatLE(msg.positionZ);
  writer.writeFloatLE(msg.speed);
  writer.writeFloatLE(msg.lookAtYaw);
  writer.writeUInt8(msg.useLookAtYaw ? 1 : 0);
  return writer.toBuffer();
}

/**
 * Deserialize a DataTransformWithParent payload from raw bytes.
 */
export function deserializeDataTransformWithParentPayload(
  data: Uint8Array
): DataTransformWithParentPayload {
  const reader = new BufferReader(data);
  const syncStamp = reader.readUInt32LE();
  const sequenceNumber = reader.readInt32LE();
  const parent = reader.readUInt64LE();
  const quaternionX = reader.readFloatLE();
  const quaternionY = reader.readFloatLE();
  const quaternionZ = reader.readFloatLE();
  const quaternionW = reader.readFloatLE();
  const positionX = reader.readFloatLE();
  const positionY = reader.readFloatLE();
  const positionZ = reader.readFloatLE();
  const speed = reader.readFloatLE();
  const lookAtYaw = reader.readFloatLE();
  const useLookAtYaw = reader.readUInt8() !== 0;

  return {
    messageType: GameControllerMessage.CM_netUpdateTransformWithParent,
    syncStamp,
    sequenceNumber,
    parent,
    quaternionX,
    quaternionY,
    quaternionZ,
    quaternionW,
    positionX,
    positionY,
    positionZ,
    speed,
    lookAtYaw,
    useLookAtYaw,
  };
}

/**
 * Create a DataTransformWithParent payload.
 */
export function createDataTransformWithParentPayload(
  syncStamp: number,
  sequenceNumber: number,
  parent: bigint,
  positionX: number,
  positionY: number,
  positionZ: number,
  quaternionX: number = 0,
  quaternionY: number = 0,
  quaternionZ: number = 0,
  quaternionW: number = 1,
  speed: number = 0,
  lookAtYaw: number = 0,
  useLookAtYaw: boolean = false
): DataTransformWithParentPayload {
  return {
    messageType: GameControllerMessage.CM_netUpdateTransformWithParent,
    syncStamp,
    sequenceNumber,
    parent,
    quaternionX,
    quaternionY,
    quaternionZ,
    quaternionW,
    positionX,
    positionY,
    positionZ,
    speed,
    lookAtYaw,
    useLookAtYaw,
  };
}
