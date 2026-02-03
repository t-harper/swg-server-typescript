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
  LoginClientId: 0x41131f25,
  /** Server response with session token */
  LoginClientToken: 0x01e0b0a4,
  /** Server response for invalid credentials */
  LoginIncorrectClientId: 0x5dd86f53,
  /** Client requesting character list */
  EnumerateCharacterId: 0x65ea4574,
  /** Server response with character list */
  EnumerateCharacterIdResponse: 0x92e18a13,
  /** Server list message */
  LoginClusterStatus: 0x25d27d45,
  /** Cluster data (servers) */
  LoginEnumCluster: 0xc11c63b9,
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
 * Contains session token and station ID for the client
 */
export interface LoginClientToken extends SwgMessageBase {
  opcode: typeof LoginMessageOpcode.LoginClientToken;
  sessionToken: string;
  accountId: number;
  stationId: bigint;
}

/**
 * Error codes for login failures
 */
export const LoginErrorCode = {
  InvalidCredentials: 0,
  AccountSuspended: 1,
  AccountBanned: 2,
  ServerFull: 3,
  ServerUnavailable: 4,
  AlreadyLoggedIn: 5,
} as const;

export type LoginErrorCodeType = (typeof LoginErrorCode)[keyof typeof LoginErrorCode];

/**
 * LoginIncorrectClientId - Server response for failed authentication
 */
export interface LoginIncorrectClientId extends SwgMessageBase {
  opcode: typeof LoginMessageOpcode.LoginIncorrectClientId;
  errorCode: LoginErrorCodeType;
  errorMessage: string;
}

/**
 * EnumerateCharacterId - Client request for character list
 */
export interface EnumerateCharacterId extends SwgMessageBase {
  opcode: typeof LoginMessageOpcode.EnumerateCharacterId;
}

/**
 * Character data structure for enumeration response
 */
export interface CharacterData {
  characterId: bigint;
  characterName: string;
  objectTemplate: string;
  serverId: number;
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
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16BE(message.username);
  writer.writeStringWithLength16BE(message.password);
  writer.writeStringWithLength16BE(message.clientVersion);
  return writer.toBuffer();
}

/**
 * Deserialize LoginClientId message
 */
export function deserializeLoginClientId(data: Uint8Array): LoginClientId {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== LoginMessageOpcode.LoginClientId) {
    throw new Error(`Invalid opcode for LoginClientId: 0x${opcode.toString(16)}`);
  }
  const username = reader.readStringWithLength16BE();
  const password = reader.readStringWithLength16BE();
  const clientVersion = reader.readStringWithLength16BE();

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
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16BE(message.sessionToken);
  writer.writeUInt32LE(message.accountId);
  writer.writeUInt64LE(message.stationId);
  return writer.toBuffer();
}

/**
 * Deserialize LoginClientToken message
 */
export function deserializeLoginClientToken(data: Uint8Array): LoginClientToken {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== LoginMessageOpcode.LoginClientToken) {
    throw new Error(`Invalid opcode for LoginClientToken: 0x${opcode.toString(16)}`);
  }
  const sessionToken = reader.readStringWithLength16BE();
  const accountId = reader.readUInt32LE();
  const stationId = reader.readUInt64LE();

  return {
    opcode: LoginMessageOpcode.LoginClientToken,
    sessionToken,
    accountId,
    stationId,
  };
}

/**
 * Serialize LoginIncorrectClientId message
 */
export function serializeLoginIncorrectClientId(
  message: LoginIncorrectClientId
): Uint8Array {
  const writer = new BufferWriter(128);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.errorCode);
  writer.writeStringWithLength16BE(message.errorMessage);
  return writer.toBuffer();
}

/**
 * Deserialize LoginIncorrectClientId message
 */
export function deserializeLoginIncorrectClientId(
  data: Uint8Array
): LoginIncorrectClientId {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== LoginMessageOpcode.LoginIncorrectClientId) {
    throw new Error(`Invalid opcode for LoginIncorrectClientId: 0x${opcode.toString(16)}`);
  }
  const errorCode = reader.readUInt32LE() as LoginErrorCodeType;
  const errorMessage = reader.readStringWithLength16BE();

  return {
    opcode: LoginMessageOpcode.LoginIncorrectClientId,
    errorCode,
    errorMessage,
  };
}

/**
 * Serialize EnumerateCharacterId message
 */
export function serializeEnumerateCharacterId(
  message: EnumerateCharacterId
): Uint8Array {
  const writer = new BufferWriter(8);
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
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.characters.length);

  for (const char of message.characters) {
    writer.writeUInt64LE(char.characterId);
    writer.writeUnicodeStringWithLength(char.characterName);
    writer.writeStringWithLength32BE(char.objectTemplate);
    writer.writeUInt32LE(char.serverId);
    writer.writeUInt32LE(char.characterType);
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
  const opcode = reader.readUInt32LE();
  if (opcode !== LoginMessageOpcode.EnumerateCharacterIdResponse) {
    throw new Error(
      `Invalid opcode for EnumerateCharacterIdResponse: 0x${opcode.toString(16)}`
    );
  }

  const count = reader.readUInt32LE();
  const characters: CharacterData[] = [];

  for (let i = 0; i < count; i++) {
    const characterId = reader.readUInt64LE();
    const characterName = reader.readUnicodeStringWithLength();
    const objectTemplate = reader.readStringWithLength32BE();
    const serverId = reader.readUInt32LE();
    const characterType = reader.readUInt32LE();

    characters.push({
      characterId,
      characterName,
      objectTemplate,
      serverId,
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
  if (data.length < 4) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
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
  sessionToken: string,
  accountId: number,
  stationId: bigint
): LoginClientToken {
  return {
    opcode: LoginMessageOpcode.LoginClientToken,
    sessionToken,
    accountId,
    stationId,
  };
}

/**
 * Create a LoginIncorrectClientId message
 */
export function createLoginIncorrectClientId(
  errorCode: LoginErrorCodeType,
  errorMessage: string
): LoginIncorrectClientId {
  return {
    opcode: LoginMessageOpcode.LoginIncorrectClientId,
    errorCode,
    errorMessage,
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
