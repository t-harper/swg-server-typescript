/**
 * SWG Ship Messages
 * Protocol messages for JTL space gameplay: ship transforms, destruction,
 * hyperspace, and nebula lightning effects
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

// ============================================
// Constants
// ============================================

/** Packing constants matching C++ PackedPosition */
const PACKED_POSITION_SCALE = 32767.0 / 8000.0;
const PACKED_POSITION_UNSCALE = 8000.0 / 32767.0;

/** Packing constants matching C++ PackedQuaternion */
const PACKED_QUATERNION_SCALE = 127.0;

/** Packing constants matching C++ PackedVelocity */
const PACKED_VELOCITY_SCALE = 32767.0 / 512.0;
const PACKED_VELOCITY_UNSCALE = 512.0 / 32767.0;

/** Packing constants matching C++ PackedRotationRate */
const PI_OVER_2 = Math.PI / 2;
const PACKED_ROTATION_RATE_SCALE = 127.0 / PI_OVER_2;
const PACKED_ROTATION_RATE_UNSCALE = PI_OVER_2 / 127.0;

/** Packing constants matching C++ PackedUnitVector */
const PACKED_UNIT_VECTOR_X_SIGN_MASK = 0x8000;
const PACKED_UNIT_VECTOR_Y_SIGN_MASK = 0x4000;
const PACKED_UNIT_VECTOR_Z_SIGN_MASK = 0x2000;
const PACKED_UNIT_VECTOR_COMPONENT_MASK = 0x003f;
const PACKED_UNIT_VECTOR_COMPONENT_BITS = 6;

/**
 * Ship message opcodes (CRC32 of message class name)
 */
export const ShipMessageOpcode = {
  /** Ship position/rotation update using packed (compressed) format */
  ShipUpdateTransformMessage: 0xec4e7597,
  /** Ship position/rotation update with full-precision collision data */
  ShipUpdateTransformCollisionMessage: 0x9deb0ae0,
  /** Destroy a ship in space */
  DestroyShipMessage: 0x2b0a2738,
  /** Destroy a specific component on a ship */
  DestroyShipComponentMessage: 0xd48dc755,
  /** Hyperspace jump notification */
  HyperspaceMessage: 0x2e743fad,
  /** Create a nebula lightning effect */
  CreateNebulaLightningMessage: 0xe9982f77,
} as const;

export type ShipMessageOpcodeType =
  (typeof ShipMessageOpcode)[keyof typeof ShipMessageOpcode];

// ============================================
// Packed format helper functions
// ============================================

/**
 * Pack a position Vector into 3 int16 values (6 bytes)
 * Matches C++ PackedPosition: clamp(-8000, val, 8000) * (32767/8000)
 */
function writePackedPosition(writer: BufferWriter, x: number, y: number, z: number): void {
  writer.writeInt16LE(Math.round(clamp(-8000, x, 8000) * PACKED_POSITION_SCALE));
  writer.writeInt16LE(Math.round(clamp(-8000, y, 8000) * PACKED_POSITION_SCALE));
  writer.writeInt16LE(Math.round(clamp(-8000, z, 8000) * PACKED_POSITION_SCALE));
}

/**
 * Read a packed position (6 bytes) and return x, y, z
 */
function readPackedPosition(reader: BufferReader): { x: number; y: number; z: number } {
  const px = reader.readInt16LE();
  const py = reader.readInt16LE();
  const pz = reader.readInt16LE();
  return {
    x: px * PACKED_POSITION_UNSCALE,
    y: py * PACKED_POSITION_UNSCALE,
    z: pz * PACKED_POSITION_UNSCALE,
  };
}

/**
 * Pack a quaternion into 4 int8 values (4 bytes)
 * Matches C++ PackedQuaternion: clamp(-1, val, 1) * 127
 * Wire order: w, x, y, z
 */
function writePackedQuaternion(writer: BufferWriter, w: number, x: number, y: number, z: number): void {
  writer.writeInt8(Math.round(clamp(-1, w, 1) * PACKED_QUATERNION_SCALE));
  writer.writeInt8(Math.round(clamp(-1, x, 1) * PACKED_QUATERNION_SCALE));
  writer.writeInt8(Math.round(clamp(-1, y, 1) * PACKED_QUATERNION_SCALE));
  writer.writeInt8(Math.round(clamp(-1, z, 1) * PACKED_QUATERNION_SCALE));
}

/**
 * Read a packed quaternion (4 bytes) and return w, x, y, z
 */
function readPackedQuaternion(reader: BufferReader): { w: number; x: number; y: number; z: number } {
  const qw = reader.readInt8();
  const qx = reader.readInt8();
  const qy = reader.readInt8();
  const qz = reader.readInt8();
  // Normalize like C++ does
  const w = qw / PACKED_QUATERNION_SCALE;
  const x = qx / PACKED_QUATERNION_SCALE;
  const y = qy / PACKED_QUATERNION_SCALE;
  const z = qz / PACKED_QUATERNION_SCALE;
  const mag = Math.sqrt(w * w + x * x + y * y + z * z);
  if (mag > 0) {
    return { w: w / mag, x: x / mag, y: y / mag, z: z / mag };
  }
  return { w: 1, x: 0, y: 0, z: 0 };
}

/**
 * Pack a velocity Vector into int16 speed + uint16 direction (4 bytes)
 * Matches C++ PackedVelocity: speed as int16, direction as PackedUnitVector(uint16)
 */
function writePackedVelocity(writer: BufferWriter, vx: number, vy: number, vz: number): void {
  const mag = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const speed = Math.round(clamp(-512, mag, 512) * PACKED_VELOCITY_SCALE);
  writer.writeInt16LE(speed);
  // PackedUnitVector for direction
  if (mag > 0) {
    writePackedUnitVector(writer, vx / mag, vy / mag, vz / mag);
  } else {
    // Default to unitZ (0, 0, 1) like C++
    writePackedUnitVector(writer, 0, 0, 1);
  }
}

/**
 * Read a packed velocity (4 bytes) and return vx, vy, vz
 */
function readPackedVelocity(reader: BufferReader): { vx: number; vy: number; vz: number } {
  const speed = reader.readInt16LE();
  const dir = readPackedUnitVector(reader);
  const s = speed * PACKED_VELOCITY_UNSCALE;
  return { vx: dir.x * s, vy: dir.y * s, vz: dir.z * s };
}

/**
 * Pack a unit vector into a uint16 (2 bytes)
 * Matches C++ PackedUnitVector: sign bits + 6-bit components
 */
function writePackedUnitVector(writer: BufferWriter, x: number, y: number, z: number): void {
  let value = 0;
  let ax = x;
  let ay = y;
  let az = z;
  if (ax < 0) { ax = -ax; value |= PACKED_UNIT_VECTOR_X_SIGN_MASK; }
  if (ay < 0) { ay = -ay; value |= PACKED_UNIT_VECTOR_Y_SIGN_MASK; }
  if (az < 0) { az = -az; value |= PACKED_UNIT_VECTOR_Z_SIGN_MASK; }
  const sum = ax + ay + az;
  const w = sum > 0 ? (PACKED_UNIT_VECTOR_COMPONENT_MASK - 1) / sum : 0;
  value |= (Math.floor(ax * w) & PACKED_UNIT_VECTOR_COMPONENT_MASK) << PACKED_UNIT_VECTOR_COMPONENT_BITS;
  value |= Math.floor(ay * w) & PACKED_UNIT_VECTOR_COMPONENT_MASK;
  writer.writeUInt16LE(value);
}

/**
 * Read a packed unit vector (2 bytes) and return normalized x, y, z
 */
function readPackedUnitVector(reader: BufferReader): { x: number; y: number; z: number } {
  const value = reader.readUInt16LE();
  let x = ((value >> PACKED_UNIT_VECTOR_COMPONENT_BITS) & PACKED_UNIT_VECTOR_COMPONENT_MASK);
  let y = (value & PACKED_UNIT_VECTOR_COMPONENT_MASK);
  let z = PACKED_UNIT_VECTOR_COMPONENT_MASK - x - y;
  if (value & PACKED_UNIT_VECTOR_X_SIGN_MASK) x = -x;
  if (value & PACKED_UNIT_VECTOR_Y_SIGN_MASK) y = -y;
  if (value & PACKED_UNIT_VECTOR_Z_SIGN_MASK) z = -z;
  const mag = Math.sqrt(x * x + y * y + z * z);
  if (mag > 0) {
    return { x: x / mag, y: y / mag, z: z / mag };
  }
  return { x: 0, y: 0, z: 1 };
}

/**
 * Pack a rotation rate into a single int8 (1 byte)
 * Matches C++ PackedRotationRate: clamp(-PI/2, rate, PI/2) * (127 / (PI/2))
 */
function writePackedRotationRate(writer: BufferWriter, rate: number): void {
  writer.writeInt8(Math.round(clamp(-PI_OVER_2, rate, PI_OVER_2) * PACKED_ROTATION_RATE_SCALE));
}

/**
 * Read a packed rotation rate (1 byte) and return the float value
 */
function readPackedRotationRate(reader: BufferReader): number {
  return reader.readInt8() * PACKED_ROTATION_RATE_UNSCALE;
}

/**
 * Clamp a value between min and max
 */
function clamp(min: number, value: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// ============================================
// ShipUpdateTransformMessage (0xEC4E7597)
// ============================================

/**
 * ShipUpdateTransformMessage - Ship position/rotation update (packed format)
 * Uses compressed packed types for bandwidth efficiency in space combat.
 * C++ wire format:
 *   shipId(uint16) + PackedTransform(10 bytes: PackedQuaternion(4) + PackedPosition(6))
 *   + PackedVelocity(4 bytes: int16 speed + uint16 direction)
 *   + yawRate(PackedRotationRate, 1 byte) + pitchRate(1 byte) + rollRate(1 byte)
 *   + syncStampLong(uint32)
 * Total payload: 2 + 10 + 4 + 1 + 1 + 1 + 4 = 23 bytes
 */
export interface ShipUpdateTransformMessage {
  opcode: typeof ShipMessageOpcode.ShipUpdateTransformMessage;
  /** Ship object short ID (uint16) */
  shipId: number;
  /** Position X (packed to int16, range -8000..8000) */
  positionX: number;
  /** Position Y (packed to int16, range -8000..8000) */
  positionY: number;
  /** Position Z (packed to int16, range -8000..8000) */
  positionZ: number;
  /** Orientation quaternion W (packed to int8) */
  orientationW: number;
  /** Orientation quaternion X (packed to int8) */
  orientationX: number;
  /** Orientation quaternion Y (packed to int8) */
  orientationY: number;
  /** Orientation quaternion Z (packed to int8) */
  orientationZ: number;
  /** Velocity X */
  velocityX: number;
  /** Velocity Y */
  velocityY: number;
  /** Velocity Z */
  velocityZ: number;
  /** Yaw rotation rate (radians/sec, packed to int8, range -PI/2..PI/2) */
  yawRate: number;
  /** Pitch rotation rate (radians/sec, packed to int8, range -PI/2..PI/2) */
  pitchRate: number;
  /** Roll rotation rate (radians/sec, packed to int8, range -PI/2..PI/2) */
  rollRate: number;
  /** Synchronization timestamp */
  syncStampLong: number;
}

/**
 * Serialize ShipUpdateTransformMessage
 */
export function serializeShipUpdateTransformMessage(message: ShipUpdateTransformMessage): Uint8Array {
  const writer = new BufferWriter(32);
  writer.writeUInt16LE(8); // operandCount
  writer.writeUInt32LE(message.opcode);
  // m_shipId (uint16)
  writer.writeUInt16LE(message.shipId);
  // m_transform: PackedTransform = PackedQuaternion(4) + PackedPosition(6)
  writePackedQuaternion(writer, message.orientationW, message.orientationX, message.orientationY, message.orientationZ);
  writePackedPosition(writer, message.positionX, message.positionY, message.positionZ);
  // m_velocity: PackedVelocity = int16 speed + uint16 direction
  writePackedVelocity(writer, message.velocityX, message.velocityY, message.velocityZ);
  // m_yawRate, m_pitchRate, m_rollRate: PackedRotationRate (1 byte each)
  writePackedRotationRate(writer, message.yawRate);
  writePackedRotationRate(writer, message.pitchRate);
  writePackedRotationRate(writer, message.rollRate);
  // m_syncStampLong (uint32)
  writer.writeUInt32LE(message.syncStampLong);
  return writer.toBuffer();
}

/**
 * Deserialize ShipUpdateTransformMessage
 */
export function deserializeShipUpdateTransformMessage(data: Uint8Array): ShipUpdateTransformMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ShipMessageOpcode.ShipUpdateTransformMessage) {
    throw new Error(`Invalid opcode for ShipUpdateTransformMessage: 0x${opcode.toString(16)}`);
  }
  const shipId = reader.readUInt16LE();
  // PackedTransform: PackedQuaternion then PackedPosition
  const q = readPackedQuaternion(reader);
  const p = readPackedPosition(reader);
  // PackedVelocity
  const v = readPackedVelocity(reader);
  // PackedRotationRates
  const yawRate = readPackedRotationRate(reader);
  const pitchRate = readPackedRotationRate(reader);
  const rollRate = readPackedRotationRate(reader);
  // syncStampLong
  const syncStampLong = reader.readUInt32LE();

  return {
    opcode: ShipMessageOpcode.ShipUpdateTransformMessage,
    shipId,
    positionX: p.x,
    positionY: p.y,
    positionZ: p.z,
    orientationW: q.w,
    orientationX: q.x,
    orientationY: q.y,
    orientationZ: q.z,
    velocityX: v.vx,
    velocityY: v.vy,
    velocityZ: v.vz,
    yawRate,
    pitchRate,
    rollRate,
    syncStampLong,
  };
}

/**
 * Create a ShipUpdateTransformMessage
 */
export function createShipUpdateTransformMessage(
  shipId: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  orientationW: number = 1,
  orientationX: number = 0,
  orientationY: number = 0,
  orientationZ: number = 0,
  velocityX: number = 0,
  velocityY: number = 0,
  velocityZ: number = 0,
  yawRate: number = 0,
  pitchRate: number = 0,
  rollRate: number = 0,
  syncStampLong: number = 0
): ShipUpdateTransformMessage {
  return {
    opcode: ShipMessageOpcode.ShipUpdateTransformMessage,
    shipId,
    positionX,
    positionY,
    positionZ,
    orientationW,
    orientationX,
    orientationY,
    orientationZ,
    velocityX,
    velocityY,
    velocityZ,
    yawRate,
    pitchRate,
    rollRate,
    syncStampLong,
  };
}

// ============================================
// ShipUpdateTransformCollisionMessage (0x9DEB0AE0)
// ============================================

/**
 * ShipUpdateTransformCollisionMessage - Ship transform update with full precision
 * Uses uncompressed Transform (Quaternion + Vector) and Vector for collision detection.
 * C++ wire format:
 *   networkId(int64) + Transform(Quaternion(x,y,z,w floats) + Vector(x,y,z floats))
 *   + velocity(Vector: x,y,z floats) + syncStampLong(uint32)
 */
export interface ShipUpdateTransformCollisionMessage {
  opcode: typeof ShipMessageOpcode.ShipUpdateTransformCollisionMessage;
  /** Ship network ID */
  networkId: bigint;
  /** Position X */
  positionX: number;
  /** Position Y */
  positionY: number;
  /** Position Z */
  positionZ: number;
  /** Orientation quaternion X */
  orientationX: number;
  /** Orientation quaternion Y */
  orientationY: number;
  /** Orientation quaternion Z */
  orientationZ: number;
  /** Orientation quaternion W */
  orientationW: number;
  /** Velocity X */
  velocityX: number;
  /** Velocity Y */
  velocityY: number;
  /** Velocity Z */
  velocityZ: number;
  /** Synchronization timestamp */
  syncStampLong: number;
}

/**
 * Serialize ShipUpdateTransformCollisionMessage
 */
export function serializeShipUpdateTransformCollisionMessage(
  message: ShipUpdateTransformCollisionMessage
): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt16LE(5); // operandCount
  writer.writeUInt32LE(message.opcode);
  // m_networkId (NetworkId = int64)
  writer.writeUInt64LE(message.networkId);
  // m_transform: Transform = Quaternion(x,y,z,w) + Vector(x,y,z)
  writer.writeFloatLE(message.orientationX);
  writer.writeFloatLE(message.orientationY);
  writer.writeFloatLE(message.orientationZ);
  writer.writeFloatLE(message.orientationW);
  writer.writeFloatLE(message.positionX);
  writer.writeFloatLE(message.positionY);
  writer.writeFloatLE(message.positionZ);
  // m_velocity: Vector(x,y,z)
  writer.writeFloatLE(message.velocityX);
  writer.writeFloatLE(message.velocityY);
  writer.writeFloatLE(message.velocityZ);
  // m_syncStampLong (uint32)
  writer.writeUInt32LE(message.syncStampLong);
  return writer.toBuffer();
}

/**
 * Deserialize ShipUpdateTransformCollisionMessage
 */
export function deserializeShipUpdateTransformCollisionMessage(
  data: Uint8Array
): ShipUpdateTransformCollisionMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ShipMessageOpcode.ShipUpdateTransformCollisionMessage) {
    throw new Error(
      `Invalid opcode for ShipUpdateTransformCollisionMessage: 0x${opcode.toString(16)}`
    );
  }
  const networkId = reader.readUInt64LE();
  // Transform: Quaternion(x,y,z,w) then Vector(x,y,z)
  const orientationX = reader.readFloatLE();
  const orientationY = reader.readFloatLE();
  const orientationZ = reader.readFloatLE();
  const orientationW = reader.readFloatLE();
  const positionX = reader.readFloatLE();
  const positionY = reader.readFloatLE();
  const positionZ = reader.readFloatLE();
  // Velocity Vector(x,y,z)
  const velocityX = reader.readFloatLE();
  const velocityY = reader.readFloatLE();
  const velocityZ = reader.readFloatLE();
  // syncStampLong
  const syncStampLong = reader.readUInt32LE();

  return {
    opcode: ShipMessageOpcode.ShipUpdateTransformCollisionMessage,
    networkId,
    positionX,
    positionY,
    positionZ,
    orientationX,
    orientationY,
    orientationZ,
    orientationW,
    velocityX,
    velocityY,
    velocityZ,
    syncStampLong,
  };
}

/**
 * Create a ShipUpdateTransformCollisionMessage
 */
export function createShipUpdateTransformCollisionMessage(
  networkId: bigint,
  positionX: number,
  positionY: number,
  positionZ: number,
  orientationW: number = 1,
  orientationX: number = 0,
  orientationY: number = 0,
  orientationZ: number = 0,
  velocityX: number = 0,
  velocityY: number = 0,
  velocityZ: number = 0,
  syncStampLong: number = 0
): ShipUpdateTransformCollisionMessage {
  return {
    opcode: ShipMessageOpcode.ShipUpdateTransformCollisionMessage,
    networkId,
    positionX,
    positionY,
    positionZ,
    orientationW,
    orientationX,
    orientationY,
    orientationZ,
    velocityX,
    velocityY,
    velocityZ,
    syncStampLong,
  };
}

// ============================================
// DestroyShipMessage (0x2B0A2738)
// ============================================

/**
 * DestroyShipMessage - Destroy a ship in space
 * C++ wire format: shipId(NetworkId, int64) + severity(float)
 */
export interface DestroyShipMessage {
  opcode: typeof ShipMessageOpcode.DestroyShipMessage;
  /** Network ID of the ship being destroyed */
  shipId: bigint;
  /** Destruction severity (affects visual explosion) */
  severity: number;
}

/**
 * Serialize DestroyShipMessage
 */
export function serializeDestroyShipMessage(message: DestroyShipMessage): Uint8Array {
  const writer = new BufferWriter(20);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.shipId);
  writer.writeFloatLE(message.severity);
  return writer.toBuffer();
}

/**
 * Deserialize DestroyShipMessage
 */
export function deserializeDestroyShipMessage(data: Uint8Array): DestroyShipMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ShipMessageOpcode.DestroyShipMessage) {
    throw new Error(`Invalid opcode for DestroyShipMessage: 0x${opcode.toString(16)}`);
  }
  const shipId = reader.readUInt64LE();
  const severity = reader.readFloatLE();

  return {
    opcode: ShipMessageOpcode.DestroyShipMessage,
    shipId,
    severity,
  };
}

/**
 * Create a DestroyShipMessage
 */
export function createDestroyShipMessage(
  shipId: bigint,
  severity: number = 0
): DestroyShipMessage {
  return {
    opcode: ShipMessageOpcode.DestroyShipMessage,
    shipId,
    severity,
  };
}

// ============================================
// DestroyShipComponentMessage (0xD48DC755)
// ============================================

/**
 * DestroyShipComponentMessage - Destroy a specific component on a ship
 * C++ wire format: shipId(NetworkId, int64) + chassisSlot(int32) + severity(float)
 */
export interface DestroyShipComponentMessage {
  opcode: typeof ShipMessageOpcode.DestroyShipComponentMessage;
  /** Network ID of the ship */
  shipId: bigint;
  /** Chassis slot index of the component being destroyed */
  chassisSlot: number;
  /** Destruction severity (affects visual effect) */
  severity: number;
}

/**
 * Serialize DestroyShipComponentMessage
 */
export function serializeDestroyShipComponentMessage(
  message: DestroyShipComponentMessage
): Uint8Array {
  const writer = new BufferWriter(24);
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.shipId);
  writer.writeInt32LE(message.chassisSlot);
  writer.writeFloatLE(message.severity);
  return writer.toBuffer();
}

/**
 * Deserialize DestroyShipComponentMessage
 */
export function deserializeDestroyShipComponentMessage(
  data: Uint8Array
): DestroyShipComponentMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ShipMessageOpcode.DestroyShipComponentMessage) {
    throw new Error(
      `Invalid opcode for DestroyShipComponentMessage: 0x${opcode.toString(16)}`
    );
  }
  const shipId = reader.readUInt64LE();
  const chassisSlot = reader.readInt32LE();
  const severity = reader.readFloatLE();

  return {
    opcode: ShipMessageOpcode.DestroyShipComponentMessage,
    shipId,
    chassisSlot,
    severity,
  };
}

/**
 * Create a DestroyShipComponentMessage
 */
export function createDestroyShipComponentMessage(
  shipId: bigint,
  chassisSlot: number,
  severity: number = 0
): DestroyShipComponentMessage {
  return {
    opcode: ShipMessageOpcode.DestroyShipComponentMessage,
    shipId,
    chassisSlot,
    severity,
  };
}

// ============================================
// HyperspaceMessage (0x2E743FAD)
// ============================================

/**
 * HyperspaceMessage - Hyperspace jump notification
 * Sent when a ship enters or exits hyperspace.
 * C++ wire format: ownerId(NetworkId, int64)
 */
export interface HyperspaceMessage {
  opcode: typeof ShipMessageOpcode.HyperspaceMessage;
  /** Network ID of the ship entering hyperspace */
  ownerId: bigint;
}

/**
 * Serialize HyperspaceMessage
 */
export function serializeHyperspaceMessage(message: HyperspaceMessage): Uint8Array {
  const writer = new BufferWriter(14);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.ownerId);
  return writer.toBuffer();
}

/**
 * Deserialize HyperspaceMessage
 */
export function deserializeHyperspaceMessage(data: Uint8Array): HyperspaceMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ShipMessageOpcode.HyperspaceMessage) {
    throw new Error(`Invalid opcode for HyperspaceMessage: 0x${opcode.toString(16)}`);
  }
  const ownerId = reader.readUInt64LE();

  return {
    opcode: ShipMessageOpcode.HyperspaceMessage,
    ownerId,
  };
}

/**
 * Create a HyperspaceMessage
 */
export function createHyperspaceMessage(ownerId: bigint): HyperspaceMessage {
  return {
    opcode: ShipMessageOpcode.HyperspaceMessage,
    ownerId,
  };
}

// ============================================
// CreateNebulaLightningMessage (0xE9982F77)
// ============================================

/**
 * NebulaLightningData - Inline data structure for nebula lightning effects
 * C++ wire format: lightningId(uint16) + nebulaId(int32) + syncStampStart(uint32)
 *   + syncStampEnd(uint32) + endpoint0(Vector: 3 floats) + endpoint1(Vector: 3 floats)
 */
export interface NebulaLightningData {
  /** Unique lightning instance ID */
  lightningId: number;
  /** ID of the nebula generating the lightning */
  nebulaId: number;
  /** Sync stamp when the lightning starts */
  syncStampStart: number;
  /** Sync stamp when the lightning ends */
  syncStampEnd: number;
  /** Lightning start point X */
  endpoint0X: number;
  /** Lightning start point Y */
  endpoint0Y: number;
  /** Lightning start point Z */
  endpoint0Z: number;
  /** Lightning end point X */
  endpoint1X: number;
  /** Lightning end point Y */
  endpoint1Y: number;
  /** Lightning end point Z */
  endpoint1Z: number;
}

/**
 * CreateNebulaLightningMessage - Create a nebula lightning visual effect
 * C++ wire format: NebulaLightningData (see above)
 */
export interface CreateNebulaLightningMessage {
  opcode: typeof ShipMessageOpcode.CreateNebulaLightningMessage;
  /** The lightning data */
  data: NebulaLightningData;
}

/**
 * Serialize CreateNebulaLightningMessage
 */
export function serializeCreateNebulaLightningMessage(
  message: CreateNebulaLightningMessage
): Uint8Array {
  const writer = new BufferWriter(48);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  // NebulaLightningData
  writer.writeUInt16LE(message.data.lightningId);
  writer.writeInt32LE(message.data.nebulaId);
  writer.writeUInt32LE(message.data.syncStampStart);
  writer.writeUInt32LE(message.data.syncStampEnd);
  // endpoint0 Vector(x, y, z)
  writer.writeFloatLE(message.data.endpoint0X);
  writer.writeFloatLE(message.data.endpoint0Y);
  writer.writeFloatLE(message.data.endpoint0Z);
  // endpoint1 Vector(x, y, z)
  writer.writeFloatLE(message.data.endpoint1X);
  writer.writeFloatLE(message.data.endpoint1Y);
  writer.writeFloatLE(message.data.endpoint1Z);
  return writer.toBuffer();
}

/**
 * Deserialize CreateNebulaLightningMessage
 */
export function deserializeCreateNebulaLightningMessage(
  data: Uint8Array
): CreateNebulaLightningMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ShipMessageOpcode.CreateNebulaLightningMessage) {
    throw new Error(
      `Invalid opcode for CreateNebulaLightningMessage: 0x${opcode.toString(16)}`
    );
  }
  // NebulaLightningData
  const lightningId = reader.readUInt16LE();
  const nebulaId = reader.readInt32LE();
  const syncStampStart = reader.readUInt32LE();
  const syncStampEnd = reader.readUInt32LE();
  const endpoint0X = reader.readFloatLE();
  const endpoint0Y = reader.readFloatLE();
  const endpoint0Z = reader.readFloatLE();
  const endpoint1X = reader.readFloatLE();
  const endpoint1Y = reader.readFloatLE();
  const endpoint1Z = reader.readFloatLE();

  return {
    opcode: ShipMessageOpcode.CreateNebulaLightningMessage,
    data: {
      lightningId,
      nebulaId,
      syncStampStart,
      syncStampEnd,
      endpoint0X,
      endpoint0Y,
      endpoint0Z,
      endpoint1X,
      endpoint1Y,
      endpoint1Z,
    },
  };
}

/**
 * Create a CreateNebulaLightningMessage
 */
export function createCreateNebulaLightningMessage(
  lightningData: NebulaLightningData
): CreateNebulaLightningMessage {
  return {
    opcode: ShipMessageOpcode.CreateNebulaLightningMessage,
    data: lightningData,
  };
}

// ============================================
// Union Types and Utilities
// ============================================

/**
 * Union type of all ship messages
 */
export type ShipMessage =
  | ShipUpdateTransformMessage
  | ShipUpdateTransformCollisionMessage
  | DestroyShipMessage
  | DestroyShipComponentMessage
  | HyperspaceMessage
  | CreateNebulaLightningMessage;

/**
 * Get the opcode from raw ship message data
 */
export function getShipMessageOpcode(data: Uint8Array): number {
  if (data.length < 6) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid ship message opcode
 */
export function isShipMessageOpcode(
  opcode: number
): opcode is ShipMessageOpcodeType {
  return Object.values(ShipMessageOpcode).includes(
    opcode as ShipMessageOpcodeType
  );
}
