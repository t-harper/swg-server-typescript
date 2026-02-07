/**
 * SWG World Messages
 * Protocol messages for world interaction: structure placement, travel,
 * weather, server parameters, and galaxy loop timing
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

/**
 * World message opcodes (CRC32 of message class name)
 */
export const WorldMessageOpcode = {
  /** Enter structure placement mode for a deed */
  EnterStructurePlacementModeMessage: 0x191b0a7b,
  /** Enter ticket purchase mode at a travel terminal */
  EnterTicketPurchaseModeMessage: 0x1e19f355,
  /** Server weather update with wind velocity */
  ServerWeatherMessage: 0xb071bef7,
  /** Server parameters (weather update interval, etc.) */
  ParametersMessage: 0x3324f080,
  /** Response with galaxy loop frame times */
  GalaxyLoopTimesResponse: 0x32046a35,
  /** Request galaxy loop times from server */
  RequestGalaxyLoopTimes: 0xaccd7084,
} as const;

export type WorldMessageOpcodeType =
  (typeof WorldMessageOpcode)[keyof typeof WorldMessageOpcode];

// ============================================
// EnterStructurePlacementModeMessage (0x191B0A7B)
// ============================================

/**
 * EnterStructurePlacementModeMessage - Enter structure placement mode
 * Sent from server to client when a player uses a structure deed
 * C++ fields: deedNetworkId(NetworkId) + structureSharedObjectTemplateName(string)
 */
export interface EnterStructurePlacementModeMessage {
  opcode: typeof WorldMessageOpcode.EnterStructurePlacementModeMessage;
  deedNetworkId: bigint;
  structureSharedObjectTemplateName: string;
}

/**
 * Serialize EnterStructurePlacementModeMessage
 */
export function serializeEnterStructurePlacementModeMessage(
  message: EnterStructurePlacementModeMessage
): Uint8Array {
  const templateBytes = new TextEncoder().encode(message.structureSharedObjectTemplateName);
  const writer = new BufferWriter(16 + templateBytes.length);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.deedNetworkId);
  writer.writeStringWithLength16LE(message.structureSharedObjectTemplateName);
  return writer.toBuffer();
}

/**
 * Deserialize EnterStructurePlacementModeMessage
 */
export function deserializeEnterStructurePlacementModeMessage(
  data: Uint8Array
): EnterStructurePlacementModeMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== WorldMessageOpcode.EnterStructurePlacementModeMessage) {
    throw new Error(
      `Invalid opcode for EnterStructurePlacementModeMessage: 0x${opcode.toString(16)}`
    );
  }
  const deedNetworkId = reader.readUInt64LE();
  const structureSharedObjectTemplateName = reader.readStringWithLength16LE();

  return {
    opcode: WorldMessageOpcode.EnterStructurePlacementModeMessage,
    deedNetworkId,
    structureSharedObjectTemplateName,
  };
}

/**
 * Create an EnterStructurePlacementModeMessage
 */
export function createEnterStructurePlacementModeMessage(
  deedNetworkId: bigint,
  structureSharedObjectTemplateName: string
): EnterStructurePlacementModeMessage {
  return {
    opcode: WorldMessageOpcode.EnterStructurePlacementModeMessage,
    deedNetworkId,
    structureSharedObjectTemplateName,
  };
}

// ============================================
// EnterTicketPurchaseModeMessage (0x1E19F355)
// ============================================

/**
 * EnterTicketPurchaseModeMessage - Enter ticket purchase mode
 * Sent from server to client when a player interacts with a travel terminal
 * C++ fields: planetName(string) + travelPointName(string) + instantTravel(bool)
 */
export interface EnterTicketPurchaseModeMessage {
  opcode: typeof WorldMessageOpcode.EnterTicketPurchaseModeMessage;
  planetName: string;
  travelPointName: string;
  instantTravel: boolean;
}

/**
 * Serialize EnterTicketPurchaseModeMessage
 */
export function serializeEnterTicketPurchaseModeMessage(
  message: EnterTicketPurchaseModeMessage
): Uint8Array {
  const planetBytes = new TextEncoder().encode(message.planetName);
  const travelPointBytes = new TextEncoder().encode(message.travelPointName);
  const writer = new BufferWriter(11 + planetBytes.length + travelPointBytes.length);
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.planetName);
  writer.writeStringWithLength16LE(message.travelPointName);
  writer.writeUInt8(message.instantTravel ? 1 : 0);
  return writer.toBuffer();
}

/**
 * Deserialize EnterTicketPurchaseModeMessage
 */
export function deserializeEnterTicketPurchaseModeMessage(
  data: Uint8Array
): EnterTicketPurchaseModeMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== WorldMessageOpcode.EnterTicketPurchaseModeMessage) {
    throw new Error(
      `Invalid opcode for EnterTicketPurchaseModeMessage: 0x${opcode.toString(16)}`
    );
  }
  const planetName = reader.readStringWithLength16LE();
  const travelPointName = reader.readStringWithLength16LE();
  const instantTravel = reader.readUInt8() !== 0;

  return {
    opcode: WorldMessageOpcode.EnterTicketPurchaseModeMessage,
    planetName,
    travelPointName,
    instantTravel,
  };
}

/**
 * Create an EnterTicketPurchaseModeMessage
 */
export function createEnterTicketPurchaseModeMessage(
  planetName: string,
  travelPointName: string,
  instantTravel: boolean = false
): EnterTicketPurchaseModeMessage {
  return {
    opcode: WorldMessageOpcode.EnterTicketPurchaseModeMessage,
    planetName,
    travelPointName,
    instantTravel,
  };
}

// ============================================
// ServerWeatherMessage (0xB071BEF7)
// ============================================

/**
 * ServerWeatherMessage - Server weather update
 * Sent from server to client with weather index and wind velocity
 * C++ fields: index(int) + windVelocity_w(Vector: x,y,z as 3 floats)
 */
export interface ServerWeatherMessage {
  opcode: typeof WorldMessageOpcode.ServerWeatherMessage;
  index: number;
  windVelocityX: number;
  windVelocityY: number;
  windVelocityZ: number;
}

/**
 * Serialize ServerWeatherMessage
 */
export function serializeServerWeatherMessage(
  message: ServerWeatherMessage
): Uint8Array {
  const writer = new BufferWriter(22);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.index);
  writer.writeFloatLE(message.windVelocityX);
  writer.writeFloatLE(message.windVelocityY);
  writer.writeFloatLE(message.windVelocityZ);
  return writer.toBuffer();
}

/**
 * Deserialize ServerWeatherMessage
 */
export function deserializeServerWeatherMessage(
  data: Uint8Array
): ServerWeatherMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== WorldMessageOpcode.ServerWeatherMessage) {
    throw new Error(
      `Invalid opcode for ServerWeatherMessage: 0x${opcode.toString(16)}`
    );
  }
  const index = reader.readInt32LE();
  const windVelocityX = reader.readFloatLE();
  const windVelocityY = reader.readFloatLE();
  const windVelocityZ = reader.readFloatLE();

  return {
    opcode: WorldMessageOpcode.ServerWeatherMessage,
    index,
    windVelocityX,
    windVelocityY,
    windVelocityZ,
  };
}

/**
 * Create a ServerWeatherMessage
 */
export function createServerWeatherMessage(
  index: number,
  windVelocityX: number = 0,
  windVelocityY: number = 0,
  windVelocityZ: number = 0
): ServerWeatherMessage {
  return {
    opcode: WorldMessageOpcode.ServerWeatherMessage,
    index,
    windVelocityX,
    windVelocityY,
    windVelocityZ,
  };
}

// ============================================
// ParametersMessage (0x3324F080)
// ============================================

/**
 * ParametersMessage - Server parameters
 * Sent from game server to client with server settings the client needs
 * C++ fields: weatherUpdateInterval(int)
 */
export interface ParametersMessage {
  opcode: typeof WorldMessageOpcode.ParametersMessage;
  weatherUpdateInterval: number;
}

/**
 * Serialize ParametersMessage
 */
export function serializeParametersMessage(
  message: ParametersMessage
): Uint8Array {
  const writer = new BufferWriter(10);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.weatherUpdateInterval);
  return writer.toBuffer();
}

/**
 * Deserialize ParametersMessage
 */
export function deserializeParametersMessage(
  data: Uint8Array
): ParametersMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== WorldMessageOpcode.ParametersMessage) {
    throw new Error(
      `Invalid opcode for ParametersMessage: 0x${opcode.toString(16)}`
    );
  }
  const weatherUpdateInterval = reader.readInt32LE();

  return {
    opcode: WorldMessageOpcode.ParametersMessage,
    weatherUpdateInterval,
  };
}

/**
 * Create a ParametersMessage
 */
export function createParametersMessage(
  weatherUpdateInterval: number
): ParametersMessage {
  return {
    opcode: WorldMessageOpcode.ParametersMessage,
    weatherUpdateInterval,
  };
}

// ============================================
// GalaxyLoopTimesResponse (0x32046A35)
// ============================================

/**
 * GalaxyLoopTimesResponse - Response with galaxy loop frame times
 * Sent from server to client with frame timing information
 * C++ fields: currentFrameMilliseconds(unsigned long) + lastFrameMilliseconds(unsigned long)
 */
export interface GalaxyLoopTimesResponse {
  opcode: typeof WorldMessageOpcode.GalaxyLoopTimesResponse;
  currentFrameMilliseconds: number;
  lastFrameMilliseconds: number;
}

/**
 * Serialize GalaxyLoopTimesResponse
 */
export function serializeGalaxyLoopTimesResponse(
  message: GalaxyLoopTimesResponse
): Uint8Array {
  const writer = new BufferWriter(14);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.currentFrameMilliseconds);
  writer.writeUInt32LE(message.lastFrameMilliseconds);
  return writer.toBuffer();
}

/**
 * Deserialize GalaxyLoopTimesResponse
 */
export function deserializeGalaxyLoopTimesResponse(
  data: Uint8Array
): GalaxyLoopTimesResponse {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== WorldMessageOpcode.GalaxyLoopTimesResponse) {
    throw new Error(
      `Invalid opcode for GalaxyLoopTimesResponse: 0x${opcode.toString(16)}`
    );
  }
  const currentFrameMilliseconds = reader.readUInt32LE();
  const lastFrameMilliseconds = reader.readUInt32LE();

  return {
    opcode: WorldMessageOpcode.GalaxyLoopTimesResponse,
    currentFrameMilliseconds,
    lastFrameMilliseconds,
  };
}

/**
 * Create a GalaxyLoopTimesResponse
 */
export function createGalaxyLoopTimesResponse(
  currentFrameMilliseconds: number,
  lastFrameMilliseconds: number
): GalaxyLoopTimesResponse {
  return {
    opcode: WorldMessageOpcode.GalaxyLoopTimesResponse,
    currentFrameMilliseconds,
    lastFrameMilliseconds,
  };
}

// ============================================
// RequestGalaxyLoopTimes (0xACCD7084)
// ============================================

/**
 * RequestGalaxyLoopTimes - Request galaxy loop times
 * Sent from client to server to request frame timing information
 * No fields (empty message body)
 */
export interface RequestGalaxyLoopTimes {
  opcode: typeof WorldMessageOpcode.RequestGalaxyLoopTimes;
}

/**
 * Serialize RequestGalaxyLoopTimes
 */
export function serializeRequestGalaxyLoopTimes(): Uint8Array {
  const writer = new BufferWriter(6);
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(WorldMessageOpcode.RequestGalaxyLoopTimes);
  return writer.toBuffer();
}

/**
 * Deserialize RequestGalaxyLoopTimes
 */
export function deserializeRequestGalaxyLoopTimes(
  data: Uint8Array
): RequestGalaxyLoopTimes {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== WorldMessageOpcode.RequestGalaxyLoopTimes) {
    throw new Error(
      `Invalid opcode for RequestGalaxyLoopTimes: 0x${opcode.toString(16)}`
    );
  }
  return { opcode: WorldMessageOpcode.RequestGalaxyLoopTimes };
}

/**
 * Create a RequestGalaxyLoopTimes message
 */
export function createRequestGalaxyLoopTimes(): RequestGalaxyLoopTimes {
  return {
    opcode: WorldMessageOpcode.RequestGalaxyLoopTimes,
  };
}

// ============================================
// Union Types and Utilities
// ============================================

/**
 * Union type of all world messages
 */
export type WorldMessage =
  | EnterStructurePlacementModeMessage
  | EnterTicketPurchaseModeMessage
  | ServerWeatherMessage
  | ParametersMessage
  | GalaxyLoopTimesResponse
  | RequestGalaxyLoopTimes;

/**
 * Get the opcode from raw world message data
 */
export function getWorldMessageOpcode(data: Uint8Array): number {
  if (data.length < 6) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid world message opcode
 */
export function isWorldMessageOpcode(
  opcode: number
): opcode is WorldMessageOpcodeType {
  return Object.values(WorldMessageOpcode).includes(
    opcode as WorldMessageOpcodeType
  );
}
