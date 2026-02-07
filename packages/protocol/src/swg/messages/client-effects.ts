/**
 * SWG Client Effect Messages
 * Protocol messages for client-side visual/audio effects, projectiles, missiles, and paths
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

/**
 * Client effect message opcodes (CRC32 of class name)
 */
export const ClientEffectOpcode = {
  PlayClientEffectLocMessage: 0xeada57af,
  PlayClientEffectObjectMessage: 0x1e4a3f56,
  PlayClientEffectObjectTransformMessage: 0xb59b0ee1,
  PlayClientEventLocMessage: 0x8681bcca,
  PlayClientEventObjectMessage: 0x116594aa,
  PlayClientEventObjectTransformMessage: 0xfadd3e15,
  StopClientEffectObjectByLabelMessage: 0xc30a118b,
  SlowDownEffectMessage: 0x7b7c6c4d,
  CreateClientPathMessage: 0x8165e50a,
  DestroyClientPathMessage: 0xf767870f,
  CreateProjectileMessage: 0x41a37d0b,
  CreateMissileMessage: 0xb491f538,
  UpdateMissileMessage: 0x4b9273d8,
  CreateClientProjectileMessage: 0x390aa7b3,
  CreateClientProjectileObjectToObjectMessage: 0x7c29fbf6,
  CreateClientProjectileLocationToObjectMessage: 0xb99d9817,
  CreateClientProjectileObjectToLocationMessage: 0x5751be67,
} as const;

export type ClientEffectOpcodeType =
  (typeof ClientEffectOpcode)[keyof typeof ClientEffectOpcode];

// ============================================
// PlayClientEffectLocMessage (0xEADA57AF)
// ============================================

/**
 * PlayClientEffectLocMessage - Play a client effect at a world location
 * C++ addVariable order: effectName, planet, locationX, locationY, locationZ, cell, terrainDelta, label
 */
export interface PlayClientEffectLocMessage {
  opcode: typeof ClientEffectOpcode.PlayClientEffectLocMessage;
  effectName: string;
  planet: string;
  locationX: number;
  locationY: number;
  locationZ: number;
  cell: bigint;
  terrainDelta: number;
  label: string;
}

export function serializePlayClientEffectLocMessage(message: PlayClientEffectLocMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(8); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.effectName);
  writer.writeStringWithLength16LE(message.planet);
  writer.writeFloatLE(message.locationX);
  writer.writeFloatLE(message.locationY);
  writer.writeFloatLE(message.locationZ);
  writer.writeUInt64LE(message.cell);
  writer.writeFloatLE(message.terrainDelta);
  writer.writeStringWithLength16LE(message.label);
  return writer.toBuffer();
}

export function deserializePlayClientEffectLocMessage(data: Uint8Array): PlayClientEffectLocMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.PlayClientEffectLocMessage) {
    throw new Error(`Invalid opcode for PlayClientEffectLocMessage: 0x${opcode.toString(16)}`);
  }
  const effectName = reader.readStringWithLength16LE();
  const planet = reader.readStringWithLength16LE();
  const locationX = reader.readFloatLE();
  const locationY = reader.readFloatLE();
  const locationZ = reader.readFloatLE();
  const cell = reader.readUInt64LE();
  const terrainDelta = reader.readFloatLE();
  const label = reader.readStringWithLength16LE();
  return {
    opcode: ClientEffectOpcode.PlayClientEffectLocMessage,
    effectName,
    planet,
    locationX,
    locationY,
    locationZ,
    cell,
    terrainDelta,
    label,
  };
}

export function createPlayClientEffectLocMessage(
  effectName: string,
  locationX: number,
  locationY: number,
  locationZ: number,
  planet: string,
  cell: bigint = 0n,
  terrainDelta: number = 0,
  label: string = '',
): PlayClientEffectLocMessage {
  return {
    opcode: ClientEffectOpcode.PlayClientEffectLocMessage,
    effectName,
    planet,
    locationX,
    locationY,
    locationZ,
    cell,
    terrainDelta,
    label,
  };
}

// ============================================
// PlayClientEffectObjectMessage (0x1E4A3F56)
// ============================================

/**
 * PlayClientEffectObjectMessage - Play a client effect on an object
 * C++ addVariable order: effectName, hardpoint, objectId, label
 */
export interface PlayClientEffectObjectMessage {
  opcode: typeof ClientEffectOpcode.PlayClientEffectObjectMessage;
  effectName: string;
  hardpoint: string;
  objectId: bigint;
  label: string;
}

export function serializePlayClientEffectObjectMessage(message: PlayClientEffectObjectMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.effectName);
  writer.writeStringWithLength16LE(message.hardpoint);
  writer.writeUInt64LE(message.objectId);
  writer.writeStringWithLength16LE(message.label);
  return writer.toBuffer();
}

export function deserializePlayClientEffectObjectMessage(data: Uint8Array): PlayClientEffectObjectMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.PlayClientEffectObjectMessage) {
    throw new Error(`Invalid opcode for PlayClientEffectObjectMessage: 0x${opcode.toString(16)}`);
  }
  const effectName = reader.readStringWithLength16LE();
  const hardpoint = reader.readStringWithLength16LE();
  const objectId = reader.readUInt64LE();
  const label = reader.readStringWithLength16LE();
  return {
    opcode: ClientEffectOpcode.PlayClientEffectObjectMessage,
    effectName,
    hardpoint,
    objectId,
    label,
  };
}

export function createPlayClientEffectObjectMessage(
  objectId: bigint,
  effectName: string,
  hardpoint: string = '',
  label: string = '',
): PlayClientEffectObjectMessage {
  return {
    opcode: ClientEffectOpcode.PlayClientEffectObjectMessage,
    effectName,
    hardpoint,
    objectId,
    label,
  };
}

// ============================================
// PlayClientEffectObjectTransformMessage (0xB59B0EE1)
// ============================================

/**
 * PlayClientEffectObjectTransformMessage - Play a client effect on an object with a transform offset
 * C++ addVariable order: effectName, transform (Quaternion x,y,z,w + Vector x,y,z), objectId, label
 * Transform is serialized as Quaternion(x,y,z,w) then Vector(x,y,z)
 */
export interface PlayClientEffectObjectTransformMessage {
  opcode: typeof ClientEffectOpcode.PlayClientEffectObjectTransformMessage;
  effectName: string;
  quaternionX: number;
  quaternionY: number;
  quaternionZ: number;
  quaternionW: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  objectId: bigint;
  label: string;
}

export function serializePlayClientEffectObjectTransformMessage(message: PlayClientEffectObjectTransformMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.effectName);
  // Transform: Quaternion(x,y,z,w) then Vector(x,y,z)
  writer.writeFloatLE(message.quaternionX);
  writer.writeFloatLE(message.quaternionY);
  writer.writeFloatLE(message.quaternionZ);
  writer.writeFloatLE(message.quaternionW);
  writer.writeFloatLE(message.positionX);
  writer.writeFloatLE(message.positionY);
  writer.writeFloatLE(message.positionZ);
  writer.writeUInt64LE(message.objectId);
  writer.writeStringWithLength16LE(message.label);
  return writer.toBuffer();
}

export function deserializePlayClientEffectObjectTransformMessage(data: Uint8Array): PlayClientEffectObjectTransformMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.PlayClientEffectObjectTransformMessage) {
    throw new Error(`Invalid opcode for PlayClientEffectObjectTransformMessage: 0x${opcode.toString(16)}`);
  }
  const effectName = reader.readStringWithLength16LE();
  // Transform: Quaternion(x,y,z,w) then Vector(x,y,z)
  const quaternionX = reader.readFloatLE();
  const quaternionY = reader.readFloatLE();
  const quaternionZ = reader.readFloatLE();
  const quaternionW = reader.readFloatLE();
  const positionX = reader.readFloatLE();
  const positionY = reader.readFloatLE();
  const positionZ = reader.readFloatLE();
  const objectId = reader.readUInt64LE();
  const label = reader.readStringWithLength16LE();
  return {
    opcode: ClientEffectOpcode.PlayClientEffectObjectTransformMessage,
    effectName,
    quaternionX,
    quaternionY,
    quaternionZ,
    quaternionW,
    positionX,
    positionY,
    positionZ,
    objectId,
    label,
  };
}

export function createPlayClientEffectObjectTransformMessage(
  objectId: bigint,
  effectName: string,
  positionX: number = 0,
  positionY: number = 0,
  positionZ: number = 0,
  quaternionX: number = 0,
  quaternionY: number = 0,
  quaternionZ: number = 0,
  quaternionW: number = 1,
  label: string = '',
): PlayClientEffectObjectTransformMessage {
  return {
    opcode: ClientEffectOpcode.PlayClientEffectObjectTransformMessage,
    effectName,
    quaternionX,
    quaternionY,
    quaternionZ,
    quaternionW,
    positionX,
    positionY,
    positionZ,
    objectId,
    label,
  };
}

// ============================================
// PlayClientEventLocMessage (0x8681BCCA)
// ============================================

/**
 * PlayClientEventLocMessage - Play a client event at a world location
 * C++ addVariable order: eventSourceName, eventDestName, planet, locationX, locationY, locationZ, cell, terrainDelta
 */
export interface PlayClientEventLocMessage {
  opcode: typeof ClientEffectOpcode.PlayClientEventLocMessage;
  eventSourceName: string;
  eventDestName: string;
  planet: string;
  locationX: number;
  locationY: number;
  locationZ: number;
  cell: bigint;
  terrainDelta: number;
}

export function serializePlayClientEventLocMessage(message: PlayClientEventLocMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(8); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.eventSourceName);
  writer.writeStringWithLength16LE(message.eventDestName);
  writer.writeStringWithLength16LE(message.planet);
  writer.writeFloatLE(message.locationX);
  writer.writeFloatLE(message.locationY);
  writer.writeFloatLE(message.locationZ);
  writer.writeUInt64LE(message.cell);
  writer.writeFloatLE(message.terrainDelta);
  return writer.toBuffer();
}

export function deserializePlayClientEventLocMessage(data: Uint8Array): PlayClientEventLocMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.PlayClientEventLocMessage) {
    throw new Error(`Invalid opcode for PlayClientEventLocMessage: 0x${opcode.toString(16)}`);
  }
  const eventSourceName = reader.readStringWithLength16LE();
  const eventDestName = reader.readStringWithLength16LE();
  const planet = reader.readStringWithLength16LE();
  const locationX = reader.readFloatLE();
  const locationY = reader.readFloatLE();
  const locationZ = reader.readFloatLE();
  const cell = reader.readUInt64LE();
  const terrainDelta = reader.readFloatLE();
  return {
    opcode: ClientEffectOpcode.PlayClientEventLocMessage,
    eventSourceName,
    eventDestName,
    planet,
    locationX,
    locationY,
    locationZ,
    cell,
    terrainDelta,
  };
}

export function createPlayClientEventLocMessage(
  eventSourceName: string,
  eventDestName: string,
  locationX: number,
  locationY: number,
  locationZ: number,
  planet: string,
  cell: bigint = 0n,
  terrainDelta: number = 0,
): PlayClientEventLocMessage {
  return {
    opcode: ClientEffectOpcode.PlayClientEventLocMessage,
    eventSourceName,
    eventDestName,
    planet,
    locationX,
    locationY,
    locationZ,
    cell,
    terrainDelta,
  };
}

// ============================================
// PlayClientEventObjectMessage (0x116594AA)
// ============================================

/**
 * PlayClientEventObjectMessage - Play a client event on an object
 * C++ addVariable order: eventName, hardpoint, objectId
 */
export interface PlayClientEventObjectMessage {
  opcode: typeof ClientEffectOpcode.PlayClientEventObjectMessage;
  eventName: string;
  hardpoint: string;
  objectId: bigint;
}

export function serializePlayClientEventObjectMessage(message: PlayClientEventObjectMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.eventName);
  writer.writeStringWithLength16LE(message.hardpoint);
  writer.writeUInt64LE(message.objectId);
  return writer.toBuffer();
}

export function deserializePlayClientEventObjectMessage(data: Uint8Array): PlayClientEventObjectMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.PlayClientEventObjectMessage) {
    throw new Error(`Invalid opcode for PlayClientEventObjectMessage: 0x${opcode.toString(16)}`);
  }
  const eventName = reader.readStringWithLength16LE();
  const hardpoint = reader.readStringWithLength16LE();
  const objectId = reader.readUInt64LE();
  return {
    opcode: ClientEffectOpcode.PlayClientEventObjectMessage,
    eventName,
    hardpoint,
    objectId,
  };
}

export function createPlayClientEventObjectMessage(
  objectId: bigint,
  eventName: string,
  hardpoint: string = '',
): PlayClientEventObjectMessage {
  return {
    opcode: ClientEffectOpcode.PlayClientEventObjectMessage,
    eventName,
    hardpoint,
    objectId,
  };
}

// ============================================
// PlayClientEventObjectTransformMessage (0xFADD3E15)
// ============================================

/**
 * PlayClientEventObjectTransformMessage - Play a client event on an object with a transform
 * C++ addVariable order: eventName, transform (Quaternion x,y,z,w + Vector x,y,z), objectId
 */
export interface PlayClientEventObjectTransformMessage {
  opcode: typeof ClientEffectOpcode.PlayClientEventObjectTransformMessage;
  eventName: string;
  quaternionX: number;
  quaternionY: number;
  quaternionZ: number;
  quaternionW: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  objectId: bigint;
}

export function serializePlayClientEventObjectTransformMessage(message: PlayClientEventObjectTransformMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.eventName);
  // Transform: Quaternion(x,y,z,w) then Vector(x,y,z)
  writer.writeFloatLE(message.quaternionX);
  writer.writeFloatLE(message.quaternionY);
  writer.writeFloatLE(message.quaternionZ);
  writer.writeFloatLE(message.quaternionW);
  writer.writeFloatLE(message.positionX);
  writer.writeFloatLE(message.positionY);
  writer.writeFloatLE(message.positionZ);
  writer.writeUInt64LE(message.objectId);
  return writer.toBuffer();
}

export function deserializePlayClientEventObjectTransformMessage(data: Uint8Array): PlayClientEventObjectTransformMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.PlayClientEventObjectTransformMessage) {
    throw new Error(`Invalid opcode for PlayClientEventObjectTransformMessage: 0x${opcode.toString(16)}`);
  }
  const eventName = reader.readStringWithLength16LE();
  // Transform: Quaternion(x,y,z,w) then Vector(x,y,z)
  const quaternionX = reader.readFloatLE();
  const quaternionY = reader.readFloatLE();
  const quaternionZ = reader.readFloatLE();
  const quaternionW = reader.readFloatLE();
  const positionX = reader.readFloatLE();
  const positionY = reader.readFloatLE();
  const positionZ = reader.readFloatLE();
  const objectId = reader.readUInt64LE();
  return {
    opcode: ClientEffectOpcode.PlayClientEventObjectTransformMessage,
    eventName,
    quaternionX,
    quaternionY,
    quaternionZ,
    quaternionW,
    positionX,
    positionY,
    positionZ,
    objectId,
  };
}

export function createPlayClientEventObjectTransformMessage(
  objectId: bigint,
  eventName: string,
  positionX: number = 0,
  positionY: number = 0,
  positionZ: number = 0,
  quaternionX: number = 0,
  quaternionY: number = 0,
  quaternionZ: number = 0,
  quaternionW: number = 1,
): PlayClientEventObjectTransformMessage {
  return {
    opcode: ClientEffectOpcode.PlayClientEventObjectTransformMessage,
    eventName,
    quaternionX,
    quaternionY,
    quaternionZ,
    quaternionW,
    positionX,
    positionY,
    positionZ,
    objectId,
  };
}

// ============================================
// StopClientEffectObjectByLabelMessage (0xC30A118B)
// ============================================

/**
 * StopClientEffectObjectByLabelMessage - Stop a labeled effect on an object
 * C++ addVariable order: objectId, label, softTerminate
 */
export interface StopClientEffectObjectByLabelMessage {
  opcode: typeof ClientEffectOpcode.StopClientEffectObjectByLabelMessage;
  objectId: bigint;
  label: string;
  softTerminate: boolean;
}

export function serializeStopClientEffectObjectByLabelMessage(message: StopClientEffectObjectByLabelMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.objectId);
  writer.writeStringWithLength16LE(message.label);
  writer.writeUInt8(message.softTerminate ? 1 : 0);
  return writer.toBuffer();
}

export function deserializeStopClientEffectObjectByLabelMessage(data: Uint8Array): StopClientEffectObjectByLabelMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.StopClientEffectObjectByLabelMessage) {
    throw new Error(`Invalid opcode for StopClientEffectObjectByLabelMessage: 0x${opcode.toString(16)}`);
  }
  const objectId = reader.readUInt64LE();
  const label = reader.readStringWithLength16LE();
  const softTerminate = reader.readUInt8() !== 0;
  return {
    opcode: ClientEffectOpcode.StopClientEffectObjectByLabelMessage,
    objectId,
    label,
    softTerminate,
  };
}

export function createStopClientEffectObjectByLabelMessage(
  objectId: bigint,
  label: string,
  softTerminate: boolean = false,
): StopClientEffectObjectByLabelMessage {
  return {
    opcode: ClientEffectOpcode.StopClientEffectObjectByLabelMessage,
    objectId,
    label,
    softTerminate,
  };
}

// ============================================
// SlowDownEffectMessage (0x7B7C6C4D)
// ============================================

/**
 * SlowDownEffectMessage - Visual slow-down cone effect between source and target
 * C++ addVariable order: source, target, coneLength, coneAngle, slopeAngle, expireTime
 */
export interface SlowDownEffectMessage {
  opcode: typeof ClientEffectOpcode.SlowDownEffectMessage;
  source: bigint;
  target: bigint;
  coneLength: number;
  coneAngle: number;
  slopeAngle: number;
  expireTime: number;
}

export function serializeSlowDownEffectMessage(message: SlowDownEffectMessage): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt16LE(6); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.source);
  writer.writeUInt64LE(message.target);
  writer.writeFloatLE(message.coneLength);
  writer.writeFloatLE(message.coneAngle);
  writer.writeFloatLE(message.slopeAngle);
  writer.writeUInt32LE(message.expireTime);
  return writer.toBuffer();
}

export function deserializeSlowDownEffectMessage(data: Uint8Array): SlowDownEffectMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.SlowDownEffectMessage) {
    throw new Error(`Invalid opcode for SlowDownEffectMessage: 0x${opcode.toString(16)}`);
  }
  const source = reader.readUInt64LE();
  const target = reader.readUInt64LE();
  const coneLength = reader.readFloatLE();
  const coneAngle = reader.readFloatLE();
  const slopeAngle = reader.readFloatLE();
  const expireTime = reader.readUInt32LE();
  return {
    opcode: ClientEffectOpcode.SlowDownEffectMessage,
    source,
    target,
    coneLength,
    coneAngle,
    slopeAngle,
    expireTime,
  };
}

export function createSlowDownEffectMessage(
  source: bigint,
  target: bigint,
  coneLength: number,
  coneAngle: number,
  slopeAngle: number,
  expireTime: number,
): SlowDownEffectMessage {
  return {
    opcode: ClientEffectOpcode.SlowDownEffectMessage,
    source,
    target,
    coneLength,
    coneAngle,
    slopeAngle,
    expireTime,
  };
}

// ============================================
// CreateClientPathMessage (0x8165E50A)
// ============================================

/**
 * CreateClientPathMessage - Display a path of waypoints to the client
 * C++ uses AutoArray<Vector> which serializes as: uint32 count, then count * Vector(3 floats)
 */
export interface CreateClientPathMessage {
  opcode: typeof ClientEffectOpcode.CreateClientPathMessage;
  /** Array of path points, each with x, y, z */
  points: Array<{ x: number; y: number; z: number }>;
}

export function serializeCreateClientPathMessage(message: CreateClientPathMessage): Uint8Array {
  const writer = new BufferWriter(10 + message.points.length * 12);
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(message.opcode);
  // AutoArray: uint32 size, then each Vector(float x, float y, float z)
  writer.writeUInt32LE(message.points.length);
  for (const point of message.points) {
    writer.writeFloatLE(point.x);
    writer.writeFloatLE(point.y);
    writer.writeFloatLE(point.z);
  }
  return writer.toBuffer();
}

export function deserializeCreateClientPathMessage(data: Uint8Array): CreateClientPathMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.CreateClientPathMessage) {
    throw new Error(`Invalid opcode for CreateClientPathMessage: 0x${opcode.toString(16)}`);
  }
  const count = reader.readUInt32LE();
  const points: Array<{ x: number; y: number; z: number }> = [];
  for (let i = 0; i < count; i++) {
    const x = reader.readFloatLE();
    const y = reader.readFloatLE();
    const z = reader.readFloatLE();
    points.push({ x, y, z });
  }
  return {
    opcode: ClientEffectOpcode.CreateClientPathMessage,
    points,
  };
}

export function createCreateClientPathMessage(
  points: Array<{ x: number; y: number; z: number }>,
): CreateClientPathMessage {
  return {
    opcode: ClientEffectOpcode.CreateClientPathMessage,
    points,
  };
}

// ============================================
// DestroyClientPathMessage (0xF767870F)
// ============================================

/**
 * DestroyClientPathMessage - Remove the client path display
 * No data fields beyond opcode
 */
export interface DestroyClientPathMessage {
  opcode: typeof ClientEffectOpcode.DestroyClientPathMessage;
}

export function serializeDestroyClientPathMessage(): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt16LE(0); // operandCount
  writer.writeUInt32LE(ClientEffectOpcode.DestroyClientPathMessage);
  return writer.toBuffer();
}

export function deserializeDestroyClientPathMessage(data: Uint8Array): DestroyClientPathMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.DestroyClientPathMessage) {
    throw new Error(`Invalid opcode for DestroyClientPathMessage: 0x${opcode.toString(16)}`);
  }
  return { opcode: ClientEffectOpcode.DestroyClientPathMessage };
}

export function createDestroyClientPathMessage(): DestroyClientPathMessage {
  return { opcode: ClientEffectOpcode.DestroyClientPathMessage };
}

// ============================================
// CreateProjectileMessage (0x41A37D0B)
// ============================================

/**
 * CreateProjectileMessage - Create a space projectile (JTL)
 * C++ addVariable order: shipId(u16), weaponIndex(i8), projectileIndex(i8), targetedComponent(i8),
 *   startPosition(PackedPosition: 3xi16), direction(PackedPosition: 3xi16), syncStampLong(u32)
 * PackedPosition packs each axis as int16 scaled: value * (32767/8000)
 */
export interface CreateProjectileMessage {
  opcode: typeof ClientEffectOpcode.CreateProjectileMessage;
  shipId: number;
  weaponIndex: number;
  projectileIndex: number;
  targetedComponent: number;
  /** Packed start position (3 x int16) */
  startPositionX: number;
  startPositionY: number;
  startPositionZ: number;
  /** Packed direction (3 x int16) */
  directionX: number;
  directionY: number;
  directionZ: number;
  syncStampLong: number;
}

export function serializeCreateProjectileMessage(message: CreateProjectileMessage): Uint8Array {
  const writer = new BufferWriter(32);
  writer.writeUInt16LE(7); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt16LE(message.shipId);
  writer.writeInt8(message.weaponIndex);
  writer.writeInt8(message.projectileIndex);
  writer.writeInt8(message.targetedComponent);
  // PackedPosition: 3 x int16 LE
  writer.writeInt16LE(message.startPositionX);
  writer.writeInt16LE(message.startPositionY);
  writer.writeInt16LE(message.startPositionZ);
  // PackedPosition: 3 x int16 LE
  writer.writeInt16LE(message.directionX);
  writer.writeInt16LE(message.directionY);
  writer.writeInt16LE(message.directionZ);
  writer.writeUInt32LE(message.syncStampLong);
  return writer.toBuffer();
}

export function deserializeCreateProjectileMessage(data: Uint8Array): CreateProjectileMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.CreateProjectileMessage) {
    throw new Error(`Invalid opcode for CreateProjectileMessage: 0x${opcode.toString(16)}`);
  }
  const shipId = reader.readUInt16LE();
  const weaponIndex = reader.readInt8();
  const projectileIndex = reader.readInt8();
  const targetedComponent = reader.readInt8();
  const startPositionX = reader.readInt16LE();
  const startPositionY = reader.readInt16LE();
  const startPositionZ = reader.readInt16LE();
  const directionX = reader.readInt16LE();
  const directionY = reader.readInt16LE();
  const directionZ = reader.readInt16LE();
  const syncStampLong = reader.readUInt32LE();
  return {
    opcode: ClientEffectOpcode.CreateProjectileMessage,
    shipId,
    weaponIndex,
    projectileIndex,
    targetedComponent,
    startPositionX,
    startPositionY,
    startPositionZ,
    directionX,
    directionY,
    directionZ,
    syncStampLong,
  };
}

export function createCreateProjectileMessage(
  shipId: number,
  weaponIndex: number,
  projectileIndex: number,
  targetedComponent: number,
  startPositionX: number,
  startPositionY: number,
  startPositionZ: number,
  directionX: number,
  directionY: number,
  directionZ: number,
  syncStampLong: number,
): CreateProjectileMessage {
  return {
    opcode: ClientEffectOpcode.CreateProjectileMessage,
    shipId,
    weaponIndex,
    projectileIndex,
    targetedComponent,
    startPositionX,
    startPositionY,
    startPositionZ,
    directionX,
    directionY,
    directionZ,
    syncStampLong,
  };
}

// ============================================
// CreateMissileMessage (0xB491F538)
// ============================================

/**
 * CreateMissileMessage - Create a missile (JTL)
 * C++ addVariable order: missileId(int), source(NetworkId), target(NetworkId),
 *   sourceLocation(Vector), targetLocation(Vector), impactTime(int), missileTypeId(int),
 *   weaponId(int), targetComponent(int)
 */
export interface CreateMissileMessage {
  opcode: typeof ClientEffectOpcode.CreateMissileMessage;
  missileId: number;
  source: bigint;
  target: bigint;
  sourceLocationX: number;
  sourceLocationY: number;
  sourceLocationZ: number;
  targetLocationX: number;
  targetLocationY: number;
  targetLocationZ: number;
  impactTime: number;
  missileTypeId: number;
  weaponId: number;
  targetComponent: number;
}

export function serializeCreateMissileMessage(message: CreateMissileMessage): Uint8Array {
  const writer = new BufferWriter(80);
  writer.writeUInt16LE(9); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.missileId);
  writer.writeUInt64LE(message.source);
  writer.writeUInt64LE(message.target);
  // Vector: 3 floats
  writer.writeFloatLE(message.sourceLocationX);
  writer.writeFloatLE(message.sourceLocationY);
  writer.writeFloatLE(message.sourceLocationZ);
  writer.writeFloatLE(message.targetLocationX);
  writer.writeFloatLE(message.targetLocationY);
  writer.writeFloatLE(message.targetLocationZ);
  writer.writeInt32LE(message.impactTime);
  writer.writeInt32LE(message.missileTypeId);
  writer.writeInt32LE(message.weaponId);
  writer.writeInt32LE(message.targetComponent);
  return writer.toBuffer();
}

export function deserializeCreateMissileMessage(data: Uint8Array): CreateMissileMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.CreateMissileMessage) {
    throw new Error(`Invalid opcode for CreateMissileMessage: 0x${opcode.toString(16)}`);
  }
  const missileId = reader.readInt32LE();
  const source = reader.readUInt64LE();
  const target = reader.readUInt64LE();
  const sourceLocationX = reader.readFloatLE();
  const sourceLocationY = reader.readFloatLE();
  const sourceLocationZ = reader.readFloatLE();
  const targetLocationX = reader.readFloatLE();
  const targetLocationY = reader.readFloatLE();
  const targetLocationZ = reader.readFloatLE();
  const impactTime = reader.readInt32LE();
  const missileTypeId = reader.readInt32LE();
  const weaponId = reader.readInt32LE();
  const targetComponent = reader.readInt32LE();
  return {
    opcode: ClientEffectOpcode.CreateMissileMessage,
    missileId,
    source,
    target,
    sourceLocationX,
    sourceLocationY,
    sourceLocationZ,
    targetLocationX,
    targetLocationY,
    targetLocationZ,
    impactTime,
    missileTypeId,
    weaponId,
    targetComponent,
  };
}

export function createCreateMissileMessage(
  missileId: number,
  source: bigint,
  target: bigint,
  sourceLocationX: number,
  sourceLocationY: number,
  sourceLocationZ: number,
  targetLocationX: number,
  targetLocationY: number,
  targetLocationZ: number,
  impactTime: number,
  missileTypeId: number,
  weaponId: number,
  targetComponent: number,
): CreateMissileMessage {
  return {
    opcode: ClientEffectOpcode.CreateMissileMessage,
    missileId,
    source,
    target,
    sourceLocationX,
    sourceLocationY,
    sourceLocationZ,
    targetLocationX,
    targetLocationY,
    targetLocationZ,
    impactTime,
    missileTypeId,
    weaponId,
    targetComponent,
  };
}

// ============================================
// UpdateMissileMessage (0x4B9273D8)
// ============================================

/**
 * UpdateMissileMessage update types
 */
export const MissileUpdateType = {
  Miss: 0,
  Hit: 1,
  Countermeasured: 2,
  CountermeasureFailed: 3,
} as const;

export type MissileUpdateTypeValue = (typeof MissileUpdateType)[keyof typeof MissileUpdateType];

/**
 * UpdateMissileMessage - Update the state of a missile (JTL)
 * C++ addVariable order: missileId(int), shipId(NetworkId), countermeasureType(int), updateType(int)
 */
export interface UpdateMissileMessage {
  opcode: typeof ClientEffectOpcode.UpdateMissileMessage;
  missileId: number;
  shipId: bigint;
  countermeasureType: number;
  updateType: number;
}

export function serializeUpdateMissileMessage(message: UpdateMissileMessage): Uint8Array {
  const writer = new BufferWriter(32);
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.missileId);
  writer.writeUInt64LE(message.shipId);
  writer.writeInt32LE(message.countermeasureType);
  writer.writeInt32LE(message.updateType);
  return writer.toBuffer();
}

export function deserializeUpdateMissileMessage(data: Uint8Array): UpdateMissileMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.UpdateMissileMessage) {
    throw new Error(`Invalid opcode for UpdateMissileMessage: 0x${opcode.toString(16)}`);
  }
  const missileId = reader.readInt32LE();
  const shipId = reader.readUInt64LE();
  const countermeasureType = reader.readInt32LE();
  const updateType = reader.readInt32LE();
  return {
    opcode: ClientEffectOpcode.UpdateMissileMessage,
    missileId,
    shipId,
    countermeasureType,
    updateType,
  };
}

export function createUpdateMissileMessage(
  missileId: number,
  shipId: bigint,
  countermeasureType: number,
  updateType: number,
): UpdateMissileMessage {
  return {
    opcode: ClientEffectOpcode.UpdateMissileMessage,
    missileId,
    shipId,
    countermeasureType,
    updateType,
  };
}

// ============================================
// CreateClientProjectileMessage (0x390AA7B3)
// ============================================

/**
 * CreateClientProjectileMessage - Create a ground-game projectile (location to location)
 * C++ addVariable order: weaponObjectTemplateName, startX, startY, startZ, startCell,
 *   endX, endY, endZ, speed, expiration, trail, trailArgb
 */
export interface CreateClientProjectileMessage {
  opcode: typeof ClientEffectOpcode.CreateClientProjectileMessage;
  weaponObjectTemplateName: string;
  startX: number;
  startY: number;
  startZ: number;
  startCell: bigint;
  endX: number;
  endY: number;
  endZ: number;
  speed: number;
  expiration: number;
  trail: boolean;
  trailArgb: number;
}

export function serializeCreateClientProjectileMessage(message: CreateClientProjectileMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(12); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.weaponObjectTemplateName);
  writer.writeFloatLE(message.startX);
  writer.writeFloatLE(message.startY);
  writer.writeFloatLE(message.startZ);
  writer.writeUInt64LE(message.startCell);
  writer.writeFloatLE(message.endX);
  writer.writeFloatLE(message.endY);
  writer.writeFloatLE(message.endZ);
  writer.writeFloatLE(message.speed);
  writer.writeFloatLE(message.expiration);
  writer.writeUInt8(message.trail ? 1 : 0);
  writer.writeUInt32LE(message.trailArgb);
  return writer.toBuffer();
}

export function deserializeCreateClientProjectileMessage(data: Uint8Array): CreateClientProjectileMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.CreateClientProjectileMessage) {
    throw new Error(`Invalid opcode for CreateClientProjectileMessage: 0x${opcode.toString(16)}`);
  }
  const weaponObjectTemplateName = reader.readStringWithLength16LE();
  const startX = reader.readFloatLE();
  const startY = reader.readFloatLE();
  const startZ = reader.readFloatLE();
  const startCell = reader.readUInt64LE();
  const endX = reader.readFloatLE();
  const endY = reader.readFloatLE();
  const endZ = reader.readFloatLE();
  const speed = reader.readFloatLE();
  const expiration = reader.readFloatLE();
  const trail = reader.readUInt8() !== 0;
  const trailArgb = reader.readUInt32LE();
  return {
    opcode: ClientEffectOpcode.CreateClientProjectileMessage,
    weaponObjectTemplateName,
    startX,
    startY,
    startZ,
    startCell,
    endX,
    endY,
    endZ,
    speed,
    expiration,
    trail,
    trailArgb,
  };
}

export function createCreateClientProjectileMessage(
  weaponObjectTemplateName: string,
  startX: number,
  startY: number,
  startZ: number,
  startCell: bigint,
  endX: number,
  endY: number,
  endZ: number,
  speed: number,
  expiration: number,
  trail: boolean = false,
  trailArgb: number = 0,
): CreateClientProjectileMessage {
  return {
    opcode: ClientEffectOpcode.CreateClientProjectileMessage,
    weaponObjectTemplateName,
    startX,
    startY,
    startZ,
    startCell,
    endX,
    endY,
    endZ,
    speed,
    expiration,
    trail,
    trailArgb,
  };
}

// ============================================
// CreateClientProjectileObjectToObjectMessage (0x7C29FBF6)
// ============================================

/**
 * CreateClientProjectileObjectToObjectMessage - Create a projectile from one object to another
 * C++ addVariable order: weaponObjectTemplateName, sourceId, sourceHardpoint,
 *   targetId, targetHardpoint, startCell, speed, expiration, trail, trailArgb
 * Note: C++ addVariable order differs from member declaration order.
 *   startCell is added AFTER targetHardpoint (not after sourceHardpoint).
 */
export interface CreateClientProjectileObjectToObjectMessage {
  opcode: typeof ClientEffectOpcode.CreateClientProjectileObjectToObjectMessage;
  weaponObjectTemplateName: string;
  sourceId: bigint;
  sourceHardpoint: string;
  targetId: bigint;
  targetHardpoint: string;
  startCell: bigint;
  speed: number;
  expiration: number;
  trail: boolean;
  trailArgb: number;
}

export function serializeCreateClientProjectileObjectToObjectMessage(message: CreateClientProjectileObjectToObjectMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(10); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.weaponObjectTemplateName);
  writer.writeUInt64LE(message.sourceId);
  writer.writeStringWithLength16LE(message.sourceHardpoint);
  writer.writeUInt64LE(message.targetId);
  writer.writeStringWithLength16LE(message.targetHardpoint);
  writer.writeUInt64LE(message.startCell);
  writer.writeFloatLE(message.speed);
  writer.writeFloatLE(message.expiration);
  writer.writeUInt8(message.trail ? 1 : 0);
  writer.writeUInt32LE(message.trailArgb);
  return writer.toBuffer();
}

export function deserializeCreateClientProjectileObjectToObjectMessage(data: Uint8Array): CreateClientProjectileObjectToObjectMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.CreateClientProjectileObjectToObjectMessage) {
    throw new Error(`Invalid opcode for CreateClientProjectileObjectToObjectMessage: 0x${opcode.toString(16)}`);
  }
  const weaponObjectTemplateName = reader.readStringWithLength16LE();
  const sourceId = reader.readUInt64LE();
  const sourceHardpoint = reader.readStringWithLength16LE();
  const targetId = reader.readUInt64LE();
  const targetHardpoint = reader.readStringWithLength16LE();
  const startCell = reader.readUInt64LE();
  const speed = reader.readFloatLE();
  const expiration = reader.readFloatLE();
  const trail = reader.readUInt8() !== 0;
  const trailArgb = reader.readUInt32LE();
  return {
    opcode: ClientEffectOpcode.CreateClientProjectileObjectToObjectMessage,
    weaponObjectTemplateName,
    sourceId,
    sourceHardpoint,
    targetId,
    targetHardpoint,
    startCell,
    speed,
    expiration,
    trail,
    trailArgb,
  };
}

export function createCreateClientProjectileObjectToObjectMessage(
  weaponObjectTemplateName: string,
  sourceId: bigint,
  sourceHardpoint: string,
  startCell: bigint,
  targetId: bigint,
  targetHardpoint: string,
  speed: number,
  expiration: number,
  trail: boolean = false,
  trailArgb: number = 0,
): CreateClientProjectileObjectToObjectMessage {
  return {
    opcode: ClientEffectOpcode.CreateClientProjectileObjectToObjectMessage,
    weaponObjectTemplateName,
    sourceId,
    sourceHardpoint,
    targetId,
    targetHardpoint,
    startCell,
    speed,
    expiration,
    trail,
    trailArgb,
  };
}

// ============================================
// CreateClientProjectileLocationToObjectMessage (0xB99D9817)
// ============================================

/**
 * CreateClientProjectileLocationToObjectMessage - Create a projectile from a location to an object
 * C++ addVariable order: weaponObjectTemplateName, startLocation(Vector),
 *   targetId, targetHardpoint, startCell, speed, expiration, trail, trailArgb
 */
export interface CreateClientProjectileLocationToObjectMessage {
  opcode: typeof ClientEffectOpcode.CreateClientProjectileLocationToObjectMessage;
  weaponObjectTemplateName: string;
  startLocationX: number;
  startLocationY: number;
  startLocationZ: number;
  targetId: bigint;
  targetHardpoint: string;
  startCell: bigint;
  speed: number;
  expiration: number;
  trail: boolean;
  trailArgb: number;
}

export function serializeCreateClientProjectileLocationToObjectMessage(message: CreateClientProjectileLocationToObjectMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(9); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.weaponObjectTemplateName);
  // Vector: 3 floats
  writer.writeFloatLE(message.startLocationX);
  writer.writeFloatLE(message.startLocationY);
  writer.writeFloatLE(message.startLocationZ);
  writer.writeUInt64LE(message.targetId);
  writer.writeStringWithLength16LE(message.targetHardpoint);
  writer.writeUInt64LE(message.startCell);
  writer.writeFloatLE(message.speed);
  writer.writeFloatLE(message.expiration);
  writer.writeUInt8(message.trail ? 1 : 0);
  writer.writeUInt32LE(message.trailArgb);
  return writer.toBuffer();
}

export function deserializeCreateClientProjectileLocationToObjectMessage(data: Uint8Array): CreateClientProjectileLocationToObjectMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.CreateClientProjectileLocationToObjectMessage) {
    throw new Error(`Invalid opcode for CreateClientProjectileLocationToObjectMessage: 0x${opcode.toString(16)}`);
  }
  const weaponObjectTemplateName = reader.readStringWithLength16LE();
  const startLocationX = reader.readFloatLE();
  const startLocationY = reader.readFloatLE();
  const startLocationZ = reader.readFloatLE();
  const targetId = reader.readUInt64LE();
  const targetHardpoint = reader.readStringWithLength16LE();
  const startCell = reader.readUInt64LE();
  const speed = reader.readFloatLE();
  const expiration = reader.readFloatLE();
  const trail = reader.readUInt8() !== 0;
  const trailArgb = reader.readUInt32LE();
  return {
    opcode: ClientEffectOpcode.CreateClientProjectileLocationToObjectMessage,
    weaponObjectTemplateName,
    startLocationX,
    startLocationY,
    startLocationZ,
    targetId,
    targetHardpoint,
    startCell,
    speed,
    expiration,
    trail,
    trailArgb,
  };
}

export function createCreateClientProjectileLocationToObjectMessage(
  weaponObjectTemplateName: string,
  startLocationX: number,
  startLocationY: number,
  startLocationZ: number,
  startCell: bigint,
  targetId: bigint,
  targetHardpoint: string,
  speed: number,
  expiration: number,
  trail: boolean = false,
  trailArgb: number = 0,
): CreateClientProjectileLocationToObjectMessage {
  return {
    opcode: ClientEffectOpcode.CreateClientProjectileLocationToObjectMessage,
    weaponObjectTemplateName,
    startLocationX,
    startLocationY,
    startLocationZ,
    targetId,
    targetHardpoint,
    startCell,
    speed,
    expiration,
    trail,
    trailArgb,
  };
}

// ============================================
// CreateClientProjectileObjectToLocationMessage (0x5751BE67)
// ============================================

/**
 * CreateClientProjectileObjectToLocationMessage - Create a projectile from an object to a location
 * C++ addVariable order: weaponObjectTemplateName, sourceId, sourceHardpoint,
 *   startCell, targetLocation(Vector), speed, expiration, trail, trailArgb
 */
export interface CreateClientProjectileObjectToLocationMessage {
  opcode: typeof ClientEffectOpcode.CreateClientProjectileObjectToLocationMessage;
  weaponObjectTemplateName: string;
  sourceId: bigint;
  sourceHardpoint: string;
  startCell: bigint;
  targetLocationX: number;
  targetLocationY: number;
  targetLocationZ: number;
  speed: number;
  expiration: number;
  trail: boolean;
  trailArgb: number;
}

export function serializeCreateClientProjectileObjectToLocationMessage(message: CreateClientProjectileObjectToLocationMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(9); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.weaponObjectTemplateName);
  writer.writeUInt64LE(message.sourceId);
  writer.writeStringWithLength16LE(message.sourceHardpoint);
  writer.writeUInt64LE(message.startCell);
  // Vector: 3 floats
  writer.writeFloatLE(message.targetLocationX);
  writer.writeFloatLE(message.targetLocationY);
  writer.writeFloatLE(message.targetLocationZ);
  writer.writeFloatLE(message.speed);
  writer.writeFloatLE(message.expiration);
  writer.writeUInt8(message.trail ? 1 : 0);
  writer.writeUInt32LE(message.trailArgb);
  return writer.toBuffer();
}

export function deserializeCreateClientProjectileObjectToLocationMessage(data: Uint8Array): CreateClientProjectileObjectToLocationMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== ClientEffectOpcode.CreateClientProjectileObjectToLocationMessage) {
    throw new Error(`Invalid opcode for CreateClientProjectileObjectToLocationMessage: 0x${opcode.toString(16)}`);
  }
  const weaponObjectTemplateName = reader.readStringWithLength16LE();
  const sourceId = reader.readUInt64LE();
  const sourceHardpoint = reader.readStringWithLength16LE();
  const startCell = reader.readUInt64LE();
  const targetLocationX = reader.readFloatLE();
  const targetLocationY = reader.readFloatLE();
  const targetLocationZ = reader.readFloatLE();
  const speed = reader.readFloatLE();
  const expiration = reader.readFloatLE();
  const trail = reader.readUInt8() !== 0;
  const trailArgb = reader.readUInt32LE();
  return {
    opcode: ClientEffectOpcode.CreateClientProjectileObjectToLocationMessage,
    weaponObjectTemplateName,
    sourceId,
    sourceHardpoint,
    startCell,
    targetLocationX,
    targetLocationY,
    targetLocationZ,
    speed,
    expiration,
    trail,
    trailArgb,
  };
}

export function createCreateClientProjectileObjectToLocationMessage(
  weaponObjectTemplateName: string,
  sourceId: bigint,
  sourceHardpoint: string,
  startCell: bigint,
  targetLocationX: number,
  targetLocationY: number,
  targetLocationZ: number,
  speed: number,
  expiration: number,
  trail: boolean = false,
  trailArgb: number = 0,
): CreateClientProjectileObjectToLocationMessage {
  return {
    opcode: ClientEffectOpcode.CreateClientProjectileObjectToLocationMessage,
    weaponObjectTemplateName,
    sourceId,
    sourceHardpoint,
    startCell,
    targetLocationX,
    targetLocationY,
    targetLocationZ,
    speed,
    expiration,
    trail,
    trailArgb,
  };
}

// ============================================
// Union Types and Utilities
// ============================================

/**
 * Union type of all client effect messages
 */
export type ClientEffectMessage =
  | PlayClientEffectLocMessage
  | PlayClientEffectObjectMessage
  | PlayClientEffectObjectTransformMessage
  | PlayClientEventLocMessage
  | PlayClientEventObjectMessage
  | PlayClientEventObjectTransformMessage
  | StopClientEffectObjectByLabelMessage
  | SlowDownEffectMessage
  | CreateClientPathMessage
  | DestroyClientPathMessage
  | CreateProjectileMessage
  | CreateMissileMessage
  | UpdateMissileMessage
  | CreateClientProjectileMessage
  | CreateClientProjectileObjectToObjectMessage
  | CreateClientProjectileLocationToObjectMessage
  | CreateClientProjectileObjectToLocationMessage;

/**
 * Get the opcode from raw client effect message data
 */
export function getClientEffectMessageOpcode(data: Uint8Array): number {
  if (data.length < 6) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid client effect message opcode
 */
export function isClientEffectMessageOpcode(
  opcode: number,
): opcode is ClientEffectOpcodeType {
  return Object.values(ClientEffectOpcode).includes(
    opcode as ClientEffectOpcodeType,
  );
}
