/**
 * SWG Region, Console, and Command Channel Messages
 * Protocol messages for region lists, console commands, and generic console output
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

/**
 * Region message opcodes (CRC32 of C++ class name)
 */
export const RegionMessageOpcode = {
  /** Client request for region list */
  MessageRegionListRequest: 0x7deb6fa3,
  /** Server response with region data (base) */
  MessageRegionListResponse: 0x11520b9c,
  /** Server response with circular region data */
  MessageRegionListCircleResponse: 0x2dfca48b,
  /** Server response with rectangular region data */
  MessageRegionListRectResponse: 0xeef11518,
  /** Generic console output message */
  ConGenericMessage: 0xb0e9da69,
  /** Execute a console command */
  ExecuteConsoleCommand: 0xb4337f69,
} as const;

export type RegionMessageOpcodeType =
  (typeof RegionMessageOpcode)[keyof typeof RegionMessageOpcode];

// ============================================
// MessageRegionListRequest (0x7DEB6FA3)
// ============================================

/**
 * MessageRegionListRequest - Client requests region list
 * Empty message with no fields
 */
export interface MessageRegionListRequest {
  opcode: typeof RegionMessageOpcode.MessageRegionListRequest;
}

/**
 * Serialize MessageRegionListRequest message
 */
export function serializeMessageRegionListRequest(): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(RegionMessageOpcode.MessageRegionListRequest);
  return writer.toBuffer();
}

/**
 * Deserialize MessageRegionListRequest message
 */
export function deserializeMessageRegionListRequest(data: Uint8Array): MessageRegionListRequest {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== RegionMessageOpcode.MessageRegionListRequest) {
    throw new Error(`Invalid opcode for MessageRegionListRequest: 0x${opcode.toString(16)}`);
  }
  return { opcode: RegionMessageOpcode.MessageRegionListRequest };
}

/**
 * Create a MessageRegionListRequest message
 */
export function createMessageRegionListRequest(): MessageRegionListRequest {
  return { opcode: RegionMessageOpcode.MessageRegionListRequest };
}

// ============================================
// MessageRegionListResponse (0x11520B9C)
// ============================================

/**
 * MessageRegionListResponse - Server response with region data
 * C++ addVariable order: objectId, label, gameServerId, worldX, worldZ,
 *   pvp, buildable, spawnable, mission, municipal, geographical, minDifficulty, maxDifficulty
 */
export interface MessageRegionListResponse {
  opcode: typeof RegionMessageOpcode.MessageRegionListResponse;
  objectId: bigint;
  label: string;
  gameServerId: number;
  worldX: number;
  worldZ: number;
  pvp: number;
  buildable: number;
  spawnable: number;
  mission: number;
  municipal: number;
  geographical: number;
  minDifficulty: number;
  maxDifficulty: number;
}

/**
 * Serialize MessageRegionListResponse message
 */
export function serializeMessageRegionListResponse(message: MessageRegionListResponse): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(14); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.objectId);
  writer.writeUnicodeStringWithLength(message.label);
  writer.writeInt32LE(message.gameServerId);
  writer.writeFloatLE(message.worldX);
  writer.writeFloatLE(message.worldZ);
  writer.writeInt32LE(message.pvp);
  writer.writeInt32LE(message.buildable);
  writer.writeInt32LE(message.spawnable);
  writer.writeInt32LE(message.mission);
  writer.writeInt32LE(message.municipal);
  writer.writeInt32LE(message.geographical);
  writer.writeInt32LE(message.minDifficulty);
  writer.writeInt32LE(message.maxDifficulty);
  return writer.toBuffer();
}

/**
 * Deserialize MessageRegionListResponse message
 */
export function deserializeMessageRegionListResponse(data: Uint8Array): MessageRegionListResponse {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== RegionMessageOpcode.MessageRegionListResponse) {
    throw new Error(`Invalid opcode for MessageRegionListResponse: 0x${opcode.toString(16)}`);
  }
  const objectId = reader.readUInt64LE();
  const label = reader.readUnicodeStringWithLength();
  const gameServerId = reader.readInt32LE();
  const worldX = reader.readFloatLE();
  const worldZ = reader.readFloatLE();
  const pvp = reader.readInt32LE();
  const buildable = reader.readInt32LE();
  const spawnable = reader.readInt32LE();
  const mission = reader.readInt32LE();
  const municipal = reader.readInt32LE();
  const geographical = reader.readInt32LE();
  const minDifficulty = reader.readInt32LE();
  const maxDifficulty = reader.readInt32LE();

  return {
    opcode: RegionMessageOpcode.MessageRegionListResponse,
    objectId,
    label,
    gameServerId,
    worldX,
    worldZ,
    pvp,
    buildable,
    spawnable,
    mission,
    municipal,
    geographical,
    minDifficulty,
    maxDifficulty,
  };
}

/**
 * Create a MessageRegionListResponse message
 */
export function createMessageRegionListResponse(
  objectId: bigint,
  label: string,
  gameServerId: number,
  worldX: number,
  worldZ: number,
  pvp: number = 0,
  buildable: number = 0,
  spawnable: number = 0,
  mission: number = 0,
  municipal: number = 0,
  geographical: number = 0,
  minDifficulty: number = 0,
  maxDifficulty: number = 0
): MessageRegionListResponse {
  return {
    opcode: RegionMessageOpcode.MessageRegionListResponse,
    objectId,
    label,
    gameServerId,
    worldX,
    worldZ,
    pvp,
    buildable,
    spawnable,
    mission,
    municipal,
    geographical,
    minDifficulty,
    maxDifficulty,
  };
}

// ============================================
// MessageRegionListCircleResponse (0x2DFCA48B)
// ============================================

/**
 * MessageRegionListCircleResponse - Server response with circular region data
 * C++ addVariable order: name, planet, worldX, worldZ, pvp, buildable,
 *   spawnable, mission, municipal, geographical, minDifficulty, maxDifficulty, radius
 */
export interface MessageRegionListCircleResponse {
  opcode: typeof RegionMessageOpcode.MessageRegionListCircleResponse;
  name: string;
  planet: string;
  worldX: number;
  worldZ: number;
  pvp: number;
  buildable: number;
  spawnable: number;
  mission: number;
  municipal: number;
  geographical: number;
  minDifficulty: number;
  maxDifficulty: number;
  radius: number;
}

/**
 * Serialize MessageRegionListCircleResponse message
 */
export function serializeMessageRegionListCircleResponse(message: MessageRegionListCircleResponse): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(14); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUnicodeStringWithLength(message.name);
  writer.writeStringWithLength16LE(message.planet);
  writer.writeFloatLE(message.worldX);
  writer.writeFloatLE(message.worldZ);
  writer.writeInt32LE(message.pvp);
  writer.writeInt32LE(message.buildable);
  writer.writeInt32LE(message.spawnable);
  writer.writeInt32LE(message.mission);
  writer.writeInt32LE(message.municipal);
  writer.writeInt32LE(message.geographical);
  writer.writeInt32LE(message.minDifficulty);
  writer.writeInt32LE(message.maxDifficulty);
  writer.writeFloatLE(message.radius);
  return writer.toBuffer();
}

/**
 * Deserialize MessageRegionListCircleResponse message
 */
export function deserializeMessageRegionListCircleResponse(data: Uint8Array): MessageRegionListCircleResponse {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== RegionMessageOpcode.MessageRegionListCircleResponse) {
    throw new Error(`Invalid opcode for MessageRegionListCircleResponse: 0x${opcode.toString(16)}`);
  }
  const name = reader.readUnicodeStringWithLength();
  const planet = reader.readStringWithLength16LE();
  const worldX = reader.readFloatLE();
  const worldZ = reader.readFloatLE();
  const pvp = reader.readInt32LE();
  const buildable = reader.readInt32LE();
  const spawnable = reader.readInt32LE();
  const mission = reader.readInt32LE();
  const municipal = reader.readInt32LE();
  const geographical = reader.readInt32LE();
  const minDifficulty = reader.readInt32LE();
  const maxDifficulty = reader.readInt32LE();
  const radius = reader.readFloatLE();

  return {
    opcode: RegionMessageOpcode.MessageRegionListCircleResponse,
    name,
    planet,
    worldX,
    worldZ,
    pvp,
    buildable,
    spawnable,
    mission,
    municipal,
    geographical,
    minDifficulty,
    maxDifficulty,
    radius,
  };
}

/**
 * Create a MessageRegionListCircleResponse message
 */
export function createMessageRegionListCircleResponse(
  name: string,
  planet: string,
  worldX: number,
  worldZ: number,
  radius: number,
  pvp: number = 0,
  buildable: number = 0,
  spawnable: number = 0,
  mission: number = 0,
  municipal: number = 0,
  geographical: number = 0,
  minDifficulty: number = 0,
  maxDifficulty: number = 0
): MessageRegionListCircleResponse {
  return {
    opcode: RegionMessageOpcode.MessageRegionListCircleResponse,
    name,
    planet,
    worldX,
    worldZ,
    pvp,
    buildable,
    spawnable,
    mission,
    municipal,
    geographical,
    minDifficulty,
    maxDifficulty,
    radius,
  };
}

// ============================================
// MessageRegionListRectResponse (0xEEF11518)
// ============================================

/**
 * MessageRegionListRectResponse - Server response with rectangular region data
 * C++ addVariable order: name, planet, worldX, worldZ, pvp, buildable,
 *   spawnable, mission, municipal, geographical, minDifficulty, maxDifficulty,
 *   radius, ur_worldX, ur_worldZ
 * Note: worldX/worldZ represent lower-left corner, ur_worldX/ur_worldZ represent upper-right corner
 * Note: m_radius is included in addVariable (legacy from base class) but not initialized in rect constructor
 */
export interface MessageRegionListRectResponse {
  opcode: typeof RegionMessageOpcode.MessageRegionListRectResponse;
  name: string;
  planet: string;
  worldX: number;
  worldZ: number;
  pvp: number;
  buildable: number;
  spawnable: number;
  mission: number;
  municipal: number;
  geographical: number;
  minDifficulty: number;
  maxDifficulty: number;
  radius: number;
  urWorldX: number;
  urWorldZ: number;
}

/**
 * Serialize MessageRegionListRectResponse message
 */
export function serializeMessageRegionListRectResponse(message: MessageRegionListRectResponse): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(16); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUnicodeStringWithLength(message.name);
  writer.writeStringWithLength16LE(message.planet);
  writer.writeFloatLE(message.worldX);
  writer.writeFloatLE(message.worldZ);
  writer.writeInt32LE(message.pvp);
  writer.writeInt32LE(message.buildable);
  writer.writeInt32LE(message.spawnable);
  writer.writeInt32LE(message.mission);
  writer.writeInt32LE(message.municipal);
  writer.writeInt32LE(message.geographical);
  writer.writeInt32LE(message.minDifficulty);
  writer.writeInt32LE(message.maxDifficulty);
  writer.writeFloatLE(message.radius);
  writer.writeFloatLE(message.urWorldX);
  writer.writeFloatLE(message.urWorldZ);
  return writer.toBuffer();
}

/**
 * Deserialize MessageRegionListRectResponse message
 */
export function deserializeMessageRegionListRectResponse(data: Uint8Array): MessageRegionListRectResponse {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== RegionMessageOpcode.MessageRegionListRectResponse) {
    throw new Error(`Invalid opcode for MessageRegionListRectResponse: 0x${opcode.toString(16)}`);
  }
  const name = reader.readUnicodeStringWithLength();
  const planet = reader.readStringWithLength16LE();
  const worldX = reader.readFloatLE();
  const worldZ = reader.readFloatLE();
  const pvp = reader.readInt32LE();
  const buildable = reader.readInt32LE();
  const spawnable = reader.readInt32LE();
  const mission = reader.readInt32LE();
  const municipal = reader.readInt32LE();
  const geographical = reader.readInt32LE();
  const minDifficulty = reader.readInt32LE();
  const maxDifficulty = reader.readInt32LE();
  const radius = reader.readFloatLE();
  const urWorldX = reader.readFloatLE();
  const urWorldZ = reader.readFloatLE();

  return {
    opcode: RegionMessageOpcode.MessageRegionListRectResponse,
    name,
    planet,
    worldX,
    worldZ,
    pvp,
    buildable,
    spawnable,
    mission,
    municipal,
    geographical,
    minDifficulty,
    maxDifficulty,
    radius,
    urWorldX,
    urWorldZ,
  };
}

/**
 * Create a MessageRegionListRectResponse message
 */
export function createMessageRegionListRectResponse(
  name: string,
  planet: string,
  worldX: number,
  worldZ: number,
  urWorldX: number,
  urWorldZ: number,
  pvp: number = 0,
  buildable: number = 0,
  spawnable: number = 0,
  mission: number = 0,
  municipal: number = 0,
  geographical: number = 0,
  minDifficulty: number = 0,
  maxDifficulty: number = 0,
  radius: number = 0
): MessageRegionListRectResponse {
  return {
    opcode: RegionMessageOpcode.MessageRegionListRectResponse,
    name,
    planet,
    worldX,
    worldZ,
    pvp,
    buildable,
    spawnable,
    mission,
    municipal,
    geographical,
    minDifficulty,
    maxDifficulty,
    radius,
    urWorldX,
    urWorldZ,
  };
}

// ============================================
// ConGenericMessage (0xB0E9DA69)
// ============================================

/**
 * ConGenericMessage - Generic console output message
 * Sends a console string to the client
 * C++ addVariable order: msg, msgId
 */
export interface ConGenericMessage {
  opcode: typeof RegionMessageOpcode.ConGenericMessage;
  msg: string;
  msgId: number;
}

/**
 * Serialize ConGenericMessage message
 */
export function serializeConGenericMessage(message: ConGenericMessage): Uint8Array {
  const writer = new BufferWriter(128);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.msg);
  writer.writeUInt32LE(message.msgId);
  return writer.toBuffer();
}

/**
 * Deserialize ConGenericMessage message
 */
export function deserializeConGenericMessage(data: Uint8Array): ConGenericMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== RegionMessageOpcode.ConGenericMessage) {
    throw new Error(`Invalid opcode for ConGenericMessage: 0x${opcode.toString(16)}`);
  }
  const msg = reader.readStringWithLength16LE();
  const msgId = reader.readUInt32LE();

  return {
    opcode: RegionMessageOpcode.ConGenericMessage,
    msg,
    msgId,
  };
}

/**
 * Create a ConGenericMessage message
 */
export function createConGenericMessage(
  msg: string,
  msgId: number = 0
): ConGenericMessage {
  return {
    opcode: RegionMessageOpcode.ConGenericMessage,
    msg,
    msgId,
  };
}

// ============================================
// ExecuteConsoleCommand (0xB4337F69)
// ============================================

/**
 * ExecuteConsoleCommand - Execute a console command
 * Sent from client to execute a command on the server
 * C++ addVariable order: m_command
 */
export interface ExecuteConsoleCommand {
  opcode: typeof RegionMessageOpcode.ExecuteConsoleCommand;
  command: string;
}

/**
 * Serialize ExecuteConsoleCommand message
 */
export function serializeExecuteConsoleCommand(message: ExecuteConsoleCommand): Uint8Array {
  const writer = new BufferWriter(128);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.command);
  return writer.toBuffer();
}

/**
 * Deserialize ExecuteConsoleCommand message
 */
export function deserializeExecuteConsoleCommand(data: Uint8Array): ExecuteConsoleCommand {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== RegionMessageOpcode.ExecuteConsoleCommand) {
    throw new Error(`Invalid opcode for ExecuteConsoleCommand: 0x${opcode.toString(16)}`);
  }
  const command = reader.readStringWithLength16LE();

  return {
    opcode: RegionMessageOpcode.ExecuteConsoleCommand,
    command,
  };
}

/**
 * Create an ExecuteConsoleCommand message
 */
export function createExecuteConsoleCommand(command: string): ExecuteConsoleCommand {
  return {
    opcode: RegionMessageOpcode.ExecuteConsoleCommand,
    command,
  };
}

// ============================================
// Union Types and Utilities
// ============================================

/**
 * Union type of all region/console messages
 */
export type RegionMessage =
  | MessageRegionListRequest
  | MessageRegionListResponse
  | MessageRegionListCircleResponse
  | MessageRegionListRectResponse
  | ConGenericMessage
  | ExecuteConsoleCommand;

/**
 * Get the opcode from raw region message data
 */
export function getRegionMessageOpcode(data: Uint8Array): number {
  if (data.length < 6) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid region message opcode
 */
export function isRegionMessageOpcode(
  opcode: number
): opcode is RegionMessageOpcodeType {
  return Object.values(RegionMessageOpcode).includes(
    opcode as RegionMessageOpcodeType
  );
}
