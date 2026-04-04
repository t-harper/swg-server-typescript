import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

export const ObjectMessageOpcodes = {
  AttributeListMessage: 0xf35dbfbe,
  SceneCreateObjectByName: 0x32d0e73b,
  ClientOpenContainerMessage: 0xd61fe1ea,
  ClientPermissionsMessage: 0xe00730e5,
  UpdatePvpStatusMessage: 0x08a1c126,
  ConsentResponseMessage: 0x371d2925,
  UpdateCellPermissionMessage: 0xf612499c,
} as const;

// ============================================================================
// AttributeListMessage (0xf35dbfbe)
// ============================================================================

export interface AttributeListMessage {
  objectId: bigint;
  attributes: Array<{ name: string; value: string }>;
}

export function serializeAttributeListMessage(msg: AttributeListMessage): Uint8Array {
  const writer = new BufferWriter();

  // operandCount = 2
  writer.writeUInt16LE(2);
  writer.writeUInt32LE(ObjectMessageOpcodes.AttributeListMessage);

  // objectId
  writer.writeUInt64LE(msg.objectId);

  // attributes - AutoArray of pairs (string + Unicode)
  writer.writeUInt32LE(msg.attributes.length);
  for (const attr of msg.attributes) {
    writer.writeStringWithLength16LE(attr.name);
    writer.writeUnicodeStringWithLength(attr.value);
  }

  return writer.toBuffer();
}

export function deserializeAttributeListMessage(data: Uint8Array): AttributeListMessage {
  const reader = new BufferReader(data);

  // Skip operandCount and opcode
  reader.readUInt16LE();
  reader.readUInt32LE();

  const objectId = reader.readUInt64LE();

  const attributeCount = reader.readUInt32LE();
  const attributes: Array<{ name: string; value: string }> = [];
  for (let i = 0; i < attributeCount; i++) {
    const name = reader.readStringWithLength16LE();
    const value = reader.readUnicodeStringWithLength();
    attributes.push({ name, value });
  }

  return { objectId, attributes };
}

export function createAttributeListMessage(
  objectId: bigint,
  attributes: Array<{ name: string; value: string }>
): Uint8Array {
  return serializeAttributeListMessage({ objectId, attributes });
}

// ============================================================================
// SceneCreateObjectByName (0x32d0e73b)
// ============================================================================

export interface SceneCreateObjectByName {
  objectId: bigint;
  containerObjectId: bigint;
  objectName: string;
  orientationX: number;
  orientationY: number;
  orientationZ: number;
  orientationW: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  arrangeByIndex: boolean;
}

export function serializeSceneCreateObjectByName(msg: SceneCreateObjectByName): Uint8Array {
  const writer = new BufferWriter();

  // operandCount = 11
  writer.writeUInt16LE(11);
  writer.writeUInt32LE(ObjectMessageOpcodes.SceneCreateObjectByName);

  // objectId
  writer.writeUInt64LE(msg.objectId);

  // containerObjectId
  writer.writeUInt64LE(msg.containerObjectId);

  // objectName (template name string)
  writer.writeStringWithLength16LE(msg.objectName);

  // Transform: quaternion (x,y,z,w) BEFORE position vector (x,y,z)
  writer.writeFloatLE(msg.orientationX);
  writer.writeFloatLE(msg.orientationY);
  writer.writeFloatLE(msg.orientationZ);
  writer.writeFloatLE(msg.orientationW);

  writer.writeFloatLE(msg.positionX);
  writer.writeFloatLE(msg.positionY);
  writer.writeFloatLE(msg.positionZ);

  // arrangeByIndex
  writer.writeUInt8(msg.arrangeByIndex ? 1 : 0);

  return writer.toBuffer();
}

export function deserializeSceneCreateObjectByName(data: Uint8Array): SceneCreateObjectByName {
  const reader = new BufferReader(data);

  // Skip operandCount and opcode
  reader.readUInt16LE();
  reader.readUInt32LE();

  const objectId = reader.readUInt64LE();
  const containerObjectId = reader.readUInt64LE();
  const objectName = reader.readStringWithLength16LE();

  // Quaternion first
  const orientationX = reader.readFloatLE();
  const orientationY = reader.readFloatLE();
  const orientationZ = reader.readFloatLE();
  const orientationW = reader.readFloatLE();

  // Position vector
  const positionX = reader.readFloatLE();
  const positionY = reader.readFloatLE();
  const positionZ = reader.readFloatLE();

  const arrangeByIndex = reader.readUInt8() !== 0;

  return {
    objectId,
    containerObjectId,
    objectName,
    orientationX,
    orientationY,
    orientationZ,
    orientationW,
    positionX,
    positionY,
    positionZ,
    arrangeByIndex,
  };
}

export function createSceneCreateObjectByName(
  objectId: bigint,
  containerObjectId: bigint,
  objectName: string,
  position: { x: number; y: number; z: number },
  orientation: { x: number; y: number; z: number; w: number },
  arrangeByIndex = false
): Uint8Array {
  return serializeSceneCreateObjectByName({
    objectId,
    containerObjectId,
    objectName,
    orientationX: orientation.x,
    orientationY: orientation.y,
    orientationZ: orientation.z,
    orientationW: orientation.w,
    positionX: position.x,
    positionY: position.y,
    positionZ: position.z,
    arrangeByIndex,
  });
}

// ============================================================================
// ClientOpenContainerMessage (0xd61fe1ea)
// ============================================================================

export interface ClientOpenContainerMessage {
  containerId: bigint;
  slotName: string;
}

export function serializeClientOpenContainerMessage(msg: ClientOpenContainerMessage): Uint8Array {
  const writer = new BufferWriter();

  // operandCount = 3 (2 fields + cmd)
  writer.writeUInt16LE(3);
  writer.writeUInt32LE(ObjectMessageOpcodes.ClientOpenContainerMessage);

  writer.writeUInt64LE(msg.containerId);
  writer.writeStringWithLength16LE(msg.slotName);

  return writer.toBuffer();
}

export function deserializeClientOpenContainerMessage(data: Uint8Array): ClientOpenContainerMessage {
  const reader = new BufferReader(data);

  // Skip operandCount and opcode
  reader.readUInt16LE();
  reader.readUInt32LE();

  const containerId = reader.readUInt64LE();
  const slotName = reader.readStringWithLength16LE();

  return { containerId, slotName };
}

export function createClientOpenContainerMessage(
  containerId: bigint,
  slotName: string
): Uint8Array {
  return serializeClientOpenContainerMessage({ containerId, slotName });
}

// ============================================================================
// ClientPermissionsMessage (0x09f0cdbb)
// ============================================================================

/**
 * ClientPermissionsMessage - matches C++ ClientPermissionsMessage.h:
 * canLogin, canCreateRegularCharacter, canCreateJediCharacter, canSkipTutorial
 */
export interface ClientPermissionsMessage {
  canLogin: boolean;
  canCreateRegularCharacter: boolean;
  canCreateJediCharacter: boolean;
  canSkipTutorial: boolean;
}

export function serializeClientPermissionsMessage(msg: ClientPermissionsMessage): Uint8Array {
  // Allocate extra space: the client's makeMessage() creates a base GameNetworkMessage
  // which over-reads the buffer via AutoByteStream::unpack (iterates operandCount times
  // over m_members, but only 1 member exists). The C++ server works because the SOE layer
  // passes a large UDP receive buffer. We pad with trailing zeros to prevent ReadException.
  const writer = new BufferWriter(128);

  // operandCount = 5 (4 fields + operandCount itself)
  writer.writeUInt16LE(5);
  writer.writeUInt32LE(ObjectMessageOpcodes.ClientPermissionsMessage);

  writer.writeUInt8(msg.canLogin ? 1 : 0);
  writer.writeUInt8(msg.canCreateRegularCharacter ? 1 : 0);
  writer.writeUInt8(msg.canCreateJediCharacter ? 1 : 0);
  writer.writeUInt8(msg.canSkipTutorial ? 1 : 0);

  // Trailing zero padding for client buffer safety
  for (let i = 0; i < 64; i++) writer.writeUInt8(0);

  return writer.toBuffer();
}

export function deserializeClientPermissionsMessage(data: Uint8Array): ClientPermissionsMessage {
  const reader = new BufferReader(data);

  // Skip operandCount and opcode
  reader.readUInt16LE();
  reader.readUInt32LE();

  const canLogin = reader.readUInt8() !== 0;
  const canCreateRegularCharacter = reader.readUInt8() !== 0;
  const canCreateJediCharacter = reader.readUInt8() !== 0;
  const canSkipTutorial = reader.readUInt8() !== 0;

  return { canLogin, canCreateRegularCharacter, canCreateJediCharacter, canSkipTutorial };
}

export function createClientPermissionsMessage(
  canLogin: boolean,
  canCreateRegularCharacter: boolean,
  canCreateJediCharacter: boolean,
  canSkipTutorial: boolean,
): Uint8Array {
  return serializeClientPermissionsMessage({
    canLogin,
    canCreateRegularCharacter,
    canCreateJediCharacter,
    canSkipTutorial,
  });
}

// ============================================================================
// UpdatePvpStatusMessage (0x08a1c126)
// ============================================================================

export interface UpdatePvpStatusMessage {
  pvpFlags: number;
  pvpFaction: number;
  objectId: bigint;
}

export function serializeUpdatePvpStatusMessage(msg: UpdatePvpStatusMessage): Uint8Array {
  const writer = new BufferWriter();

  // operandCount = 4 (3 fields + cmd)
  writer.writeUInt16LE(4);
  writer.writeUInt32LE(ObjectMessageOpcodes.UpdatePvpStatusMessage);

  writer.writeUInt32LE(msg.pvpFlags);
  writer.writeUInt32LE(msg.pvpFaction);
  writer.writeUInt64LE(msg.objectId);

  return writer.toBuffer();
}

export function deserializeUpdatePvpStatusMessage(data: Uint8Array): UpdatePvpStatusMessage {
  const reader = new BufferReader(data);

  // Skip operandCount and opcode
  reader.readUInt16LE();
  reader.readUInt32LE();

  const pvpFlags = reader.readUInt32LE();
  const pvpFaction = reader.readUInt32LE();
  const objectId = reader.readUInt64LE();

  return { pvpFlags, pvpFaction, objectId };
}

export function createUpdatePvpStatusMessage(
  pvpFlags: number,
  pvpFaction: number,
  objectId: bigint
): Uint8Array {
  return serializeUpdatePvpStatusMessage({ pvpFlags, pvpFaction, objectId });
}

// ============================================================================
// ConsentResponseMessage (0x371d2925)
// ============================================================================

export interface ConsentResponseMessage {
  playerName: string;
  consent: boolean;
}

export function serializeConsentResponseMessage(msg: ConsentResponseMessage): Uint8Array {
  const writer = new BufferWriter();

  // operandCount = 3 (2 fields + cmd)
  writer.writeUInt16LE(3);
  writer.writeUInt32LE(ObjectMessageOpcodes.ConsentResponseMessage);

  writer.writeStringWithLength16LE(msg.playerName);
  writer.writeUInt8(msg.consent ? 1 : 0);

  return writer.toBuffer();
}

export function deserializeConsentResponseMessage(data: Uint8Array): ConsentResponseMessage {
  const reader = new BufferReader(data);

  // Skip operandCount and opcode
  reader.readUInt16LE();
  reader.readUInt32LE();

  const playerName = reader.readStringWithLength16LE();
  const consent = reader.readUInt8() !== 0;

  return { playerName, consent };
}

export function createConsentResponseMessage(
  playerName: string,
  consent: boolean
): Uint8Array {
  return serializeConsentResponseMessage({ playerName, consent });
}

// ============================================================================
// UpdateCellPermissionMessage (0xf612499c)
// ============================================================================

export interface UpdateCellPermissionMessage {
  allowed: boolean;
  cellId: bigint;
}

export function serializeUpdateCellPermissionMessage(msg: UpdateCellPermissionMessage): Uint8Array {
  const writer = new BufferWriter();

  // operandCount = 3 (2 fields + cmd)
  writer.writeUInt16LE(3);
  writer.writeUInt32LE(ObjectMessageOpcodes.UpdateCellPermissionMessage);

  writer.writeUInt8(msg.allowed ? 1 : 0);
  writer.writeUInt64LE(msg.cellId);

  return writer.toBuffer();
}

export function deserializeUpdateCellPermissionMessage(data: Uint8Array): UpdateCellPermissionMessage {
  const reader = new BufferReader(data);

  // Skip operandCount and opcode
  reader.readUInt16LE();
  reader.readUInt32LE();

  const allowed = reader.readUInt8() !== 0;
  const cellId = reader.readUInt64LE();

  return { allowed, cellId };
}

export function createUpdateCellPermissionMessage(
  allowed: boolean,
  cellId: bigint
): Uint8Array {
  return serializeUpdateCellPermissionMessage({ allowed, cellId });
}
