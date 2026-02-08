/**
 * SWG Login Messages
 * Protocol messages for authentication and character enumeration
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

/**
 * SWG Message opcodes for login protocol
 * These are the high-level game message types (sent inside SOE Data packets)
 */
export const LoginMessageOpcode = {
  /** Client sending credentials */
  LoginClientId: 0x41131f96,
  /** Server response with session token */
  LoginClientToken: 0xaab296c6,
  /** Server response for invalid credentials */
  LoginIncorrectClientId: 0x20e7e510,
  /** Client requesting character list */
  EnumerateCharacterId: 0x65ea4574,
  /** Server response with character list (same opcode as request in C++) */
  EnumerateCharacterIdResponse: 0x65ea4574,
  /** Server list message */
  LoginClusterStatus: 0x3436aeb6,
  /** Cluster data (servers) */
  LoginEnumCluster: 0xc11c63b9,
  /** GenericValueTypeMessage<int32> - server epoch time */
  ServerNowEpochTime: 0x24b73893,
  /** GenericValueTypeMessage<set<string>> - disabled cluster names */
  CharacterCreationDisabled: 0xf41a5265,
  /** Client request for extended cluster info */
  RequestExtendedClusterInfo: 0x8e33ed05,
} as const;

export type LoginMessageOpcodeType =
  (typeof LoginMessageOpcode)[keyof typeof LoginMessageOpcode];

/**
 * Base interface for all SWG messages
 */
export interface SwgMessageBase {
  opcode: number;
}

/**
 * LoginClientId - Client authentication request
 * Sent by client with username and password after session is established
 */
export interface LoginClientId extends SwgMessageBase {
  opcode: typeof LoginMessageOpcode.LoginClientId;
  username: string;
  password: string;
  clientVersion: string;
}

/**
 * LoginClientToken - Server response for successful authentication
 * C++ format: token(AutoArray<u8>) + stationId(u32) + username(string_u16LE)
 */
export interface LoginClientToken extends SwgMessageBase {
  opcode: typeof LoginMessageOpcode.LoginClientToken;
  token: Uint8Array;
  stationId: number;
  username: string;
}


/**
 * LoginIncorrectClientId - Server response for failed/successful version check
 * C++ format: serverId(string) + serverApplicationVersion(string)
 * The client uses this to verify it's connecting to the right server version
 */
export interface LoginIncorrectClientId extends SwgMessageBase {
  opcode: typeof LoginMessageOpcode.LoginIncorrectClientId;
  serverId: string;
  serverApplicationVersion: string;
}

/**
 * EnumerateCharacterId - Client request for character list
 */
export interface EnumerateCharacterId extends SwgMessageBase {
  opcode: typeof LoginMessageOpcode.EnumerateCharacterId;
}

/**
 * Character data structure for enumeration response
 * C++ order: name(Unicode) + objectTemplateId(int32/CRC) + networkId(u64) + clusterId(u32) + characterType(int32)
 */
export interface CharacterData {
  characterName: string;
  objectTemplateCrc: number;
  characterId: bigint;
  clusterId: number;
  characterType: number; // 0 = normal, 1 = jedi, etc.
}

/**
 * EnumerateCharacterIdResponse - Server response with character list
 */
export interface EnumerateCharacterIdResponse extends SwgMessageBase {
  opcode: typeof LoginMessageOpcode.EnumerateCharacterIdResponse;
  characters: CharacterData[];
}

/**
 * Union type of all login messages
 */
export type LoginMessage =
  | LoginClientId
  | LoginClientToken
  | LoginIncorrectClientId
  | EnumerateCharacterId
  | EnumerateCharacterIdResponse;

/**
 * Serialize LoginClientId message
 */
export function serializeLoginClientId(message: LoginClientId): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.username);
  writer.writeStringWithLength16LE(message.password);
  writer.writeStringWithLength16LE(message.clientVersion);
  return writer.toBuffer();
}

/**
 * Deserialize LoginClientId message
 */
export function deserializeLoginClientId(data: Uint8Array): LoginClientId {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== LoginMessageOpcode.LoginClientId) {
    throw new Error(`Invalid opcode for LoginClientId: 0x${opcode.toString(16)}`);
  }
  const username = reader.readStringWithLength16LE();
  const password = reader.readStringWithLength16LE();
  const clientVersion = reader.readStringWithLength16LE();

  return {
    opcode: LoginMessageOpcode.LoginClientId,
    username,
    password,
    clientVersion,
  };
}

/**
 * Serialize LoginClientToken message
 */
export function serializeLoginClientToken(message: LoginClientToken): Uint8Array {
  const writer = new BufferWriter(128);
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeAutoArray(message.token);
  writer.writeUInt32LE(message.stationId);
  writer.writeStringWithLength16LE(message.username);
  return writer.toBuffer();
}

/**
 * Deserialize LoginClientToken message
 */
export function deserializeLoginClientToken(data: Uint8Array): LoginClientToken {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== LoginMessageOpcode.LoginClientToken) {
    throw new Error(`Invalid opcode for LoginClientToken: 0x${opcode.toString(16)}`);
  }
  const token = reader.readAutoArray();
  const stationId = reader.readUInt32LE();
  const username = reader.readStringWithLength16LE();

  return {
    opcode: LoginMessageOpcode.LoginClientToken,
    token,
    stationId,
    username,
  };
}

/**
 * Serialize LoginIncorrectClientId message
 */
export function serializeLoginIncorrectClientId(
  message: LoginIncorrectClientId
): Uint8Array {
  const writer = new BufferWriter(128);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.serverId);
  writer.writeStringWithLength16LE(message.serverApplicationVersion);
  return writer.toBuffer();
}

/**
 * Deserialize LoginIncorrectClientId message
 */
export function deserializeLoginIncorrectClientId(
  data: Uint8Array
): LoginIncorrectClientId {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== LoginMessageOpcode.LoginIncorrectClientId) {
    throw new Error(`Invalid opcode for LoginIncorrectClientId: 0x${opcode.toString(16)}`);
  }
  const serverId = reader.readStringWithLength16LE();
  const serverApplicationVersion = reader.readStringWithLength16LE();

  return {
    opcode: LoginMessageOpcode.LoginIncorrectClientId,
    serverId,
    serverApplicationVersion,
  };
}

/**
 * Serialize EnumerateCharacterId message
 */
export function serializeEnumerateCharacterId(
  message: EnumerateCharacterId
): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(message.opcode);
  return writer.toBuffer();
}

/**
 * Deserialize EnumerateCharacterId message
 */
export function deserializeEnumerateCharacterId(
  data: Uint8Array
): EnumerateCharacterId {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== LoginMessageOpcode.EnumerateCharacterId) {
    throw new Error(`Invalid opcode for EnumerateCharacterId: 0x${opcode.toString(16)}`);
  }

  return {
    opcode: LoginMessageOpcode.EnumerateCharacterId,
  };
}

/**
 * Serialize EnumerateCharacterIdResponse message
 */
export function serializeEnumerateCharacterIdResponse(
  message: EnumerateCharacterIdResponse
): Uint8Array {
  const writer = new BufferWriter(1024);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.characters.length);

  for (const char of message.characters) {
    // C++ order: name(Unicode) + objectTemplateId(int32) + networkId(u64) + clusterId(u32) + characterType(int32)
    writer.writeUnicodeStringWithLength(char.characterName);
    writer.writeInt32LE(char.objectTemplateCrc);
    writer.writeUInt64LE(char.characterId);
    writer.writeUInt32LE(char.clusterId);
    writer.writeInt32LE(char.characterType);
  }

  return writer.toBuffer();
}

/**
 * Deserialize EnumerateCharacterIdResponse message
 */
export function deserializeEnumerateCharacterIdResponse(
  data: Uint8Array
): EnumerateCharacterIdResponse {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== LoginMessageOpcode.EnumerateCharacterIdResponse) {
    throw new Error(
      `Invalid opcode for EnumerateCharacterIdResponse: 0x${opcode.toString(16)}`
    );
  }

  const count = reader.readInt32LE();
  const characters: CharacterData[] = [];

  for (let i = 0; i < count; i++) {
    // C++ order: name(Unicode) + objectTemplateId(int32) + networkId(u64) + clusterId(u32) + characterType(int32)
    const characterName = reader.readUnicodeStringWithLength();
    const objectTemplateCrc = reader.readInt32LE();
    const characterId = reader.readUInt64LE();
    const clusterId = reader.readUInt32LE();
    const characterType = reader.readInt32LE();

    characters.push({
      characterName,
      objectTemplateCrc,
      characterId,
      clusterId,
      characterType,
    });
  }

  return {
    opcode: LoginMessageOpcode.EnumerateCharacterIdResponse,
    characters,
  };
}

/**
 * Get the opcode from raw message data without full deserialization
 */
export function getLoginMessageOpcode(data: Uint8Array): number {
  if (data.length < 6) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid login message opcode
 */
export function isLoginMessageOpcode(opcode: number): opcode is LoginMessageOpcodeType {
  return Object.values(LoginMessageOpcode).includes(opcode as LoginMessageOpcodeType);
}

/**
 * Create a LoginClientToken message
 */
export function createLoginClientToken(
  token: Uint8Array,
  stationId: number,
  username: string
): LoginClientToken {
  return {
    opcode: LoginMessageOpcode.LoginClientToken,
    token,
    stationId,
    username,
  };
}

/**
 * Create a LoginIncorrectClientId message
 */
export function createLoginIncorrectClientId(
  serverId: string,
  serverApplicationVersion: string
): LoginIncorrectClientId {
  return {
    opcode: LoginMessageOpcode.LoginIncorrectClientId,
    serverId,
    serverApplicationVersion,
  };
}

/**
 * Create an EnumerateCharacterIdResponse message
 */
export function createEnumerateCharacterIdResponse(
  characters: CharacterData[]
): EnumerateCharacterIdResponse {
  return {
    opcode: LoginMessageOpcode.EnumerateCharacterIdResponse,
    characters,
  };
}

/**
 * Serialize ServerNowEpochTime message
 * GenericValueTypeMessage<int32> with current epoch time
 * C++ sends this as the FIRST response when LoginClientId is received
 */
export function serializeServerNowEpochTime(epochTime: number): Uint8Array {
  const writer = new BufferWriter(10);
  writer.writeUInt16LE(2); // operandCount: cmd + value
  writer.writeUInt32LE(LoginMessageOpcode.ServerNowEpochTime);
  writer.writeInt32LE(epochTime);
  return writer.toBuffer();
}

/**
 * Serialize CharacterCreationDisabled message
 * GenericValueTypeMessage<set<string>> with disabled cluster names
 * C++ sends this after LoginEnumCluster
 */
export function serializeCharacterCreationDisabled(disabledClusters: string[]): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt16LE(2); // operandCount: cmd + value
  writer.writeUInt32LE(LoginMessageOpcode.CharacterCreationDisabled);
  // std::set<std::string> serialized as: u32LE count + [string_u16LE, ...]
  writer.writeUInt32LE(disabledClusters.length);
  for (const name of disabledClusters) {
    writer.writeStringWithLength16LE(name);
  }
  return writer.toBuffer();
}
