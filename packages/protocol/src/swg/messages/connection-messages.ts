/**
 * SWG Connection Messages
 * Protocol messages for connection server authentication and character selection
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';
import { type SwgMessageBase } from './login-messages.js';

/**
 * Connection message opcodes
 */
export const ConnectionMessageOpcode = {
  /** Client sends auth token to connection server */
  ClientIdMsg: 0xd5899226,
  /** Client selects a character to play */
  SelectCharacter: 0xb5098d76,
} as const;

export type ConnectionMessageOpcodeType =
  (typeof ConnectionMessageOpcode)[keyof typeof ConnectionMessageOpcode];

// ============================================
// ClientIdMsg (0xD5899226)
// ============================================

/**
 * ClientIdMsg - Client sends auth token to connection server
 * Sent after connecting to the connection server with the session token
 */
export interface ClientIdMsg extends SwgMessageBase {
  opcode: typeof ConnectionMessageOpcode.ClientIdMsg;
  token: Uint8Array;
  clientVersion: string;
  gameBitsToClear: number;
}

/**
 * Serialize ClientIdMsg message
 */
export function serializeClientIdMsg(message: ClientIdMsg): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.token.length);
  writer.writeBytes(message.token);
  writer.writeStringWithLength16BE(message.clientVersion);
  writer.writeUInt32LE(message.gameBitsToClear);
  return writer.toBuffer();
}

/**
 * Deserialize ClientIdMsg message
 */
export function deserializeClientIdMsg(data: Uint8Array): ClientIdMsg {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== ConnectionMessageOpcode.ClientIdMsg) {
    throw new Error(`Invalid opcode for ClientIdMsg: 0x${opcode.toString(16)}`);
  }

  const tokenSize = reader.readUInt32LE();
  const token = reader.readBytes(tokenSize);
  const clientVersion = reader.readStringWithLength16BE();
  const gameBitsToClear = reader.readUInt32LE();

  return {
    opcode: ConnectionMessageOpcode.ClientIdMsg,
    token: new Uint8Array(token),
    clientVersion,
    gameBitsToClear,
  };
}

/**
 * Create a ClientIdMsg message
 */
export function createClientIdMsg(
  token: Uint8Array,
  clientVersion: string,
  gameBitsToClear: number = 0
): ClientIdMsg {
  return {
    opcode: ConnectionMessageOpcode.ClientIdMsg,
    token,
    clientVersion,
    gameBitsToClear,
  };
}

// ============================================
// SelectCharacter (0xB5098D76)
// ============================================

/**
 * SelectCharacter - Client selects a character to play
 * Sent after the player chooses a character from the selection screen
 */
export interface SelectCharacter extends SwgMessageBase {
  opcode: typeof ConnectionMessageOpcode.SelectCharacter;
  characterId: bigint;
}

/**
 * Serialize SelectCharacter message
 */
export function serializeSelectCharacter(message: SelectCharacter): Uint8Array {
  const writer = new BufferWriter(12);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.characterId);
  return writer.toBuffer();
}

/**
 * Deserialize SelectCharacter message
 */
export function deserializeSelectCharacter(data: Uint8Array): SelectCharacter {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== ConnectionMessageOpcode.SelectCharacter) {
    throw new Error(`Invalid opcode for SelectCharacter: 0x${opcode.toString(16)}`);
  }

  const characterId = reader.readUInt64LE();

  return {
    opcode: ConnectionMessageOpcode.SelectCharacter,
    characterId,
  };
}

/**
 * Create a SelectCharacter message
 */
export function createSelectCharacter(characterId: bigint): SelectCharacter {
  return {
    opcode: ConnectionMessageOpcode.SelectCharacter,
    characterId,
  };
}

// ============================================
// Union Types and Utilities
// ============================================

/**
 * Union type of all connection messages
 */
export type ConnectionMessage = ClientIdMsg | SelectCharacter;

/**
 * Get the opcode from raw connection message data
 */
export function getConnectionMessageOpcode(data: Uint8Array): number {
  if (data.length < 4) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid connection message opcode
 */
export function isConnectionMessageOpcode(
  opcode: number
): opcode is ConnectionMessageOpcodeType {
  return Object.values(ConnectionMessageOpcode).includes(
    opcode as ConnectionMessageOpcodeType
  );
}
