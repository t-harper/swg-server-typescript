/**
 * SWG Character Creation Messages
 * Protocol messages for character creation flow
 * Rewritten to match C++ wire format (operandCount prefix, StringId, correct field order)
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';
import {
  CharacterNameError,
  type CharacterNameErrorType,
  getCharacterNameErrorString,
} from './character-name.js';

// ============================================================================
// StringId Type (matches C++ StringId wire format)
// ============================================================================

/**
 * StringId - Localized string reference
 * Matches C++ StringId: table(string) + textIndex(u32) + text(string)
 */
export interface CharacterCreationStringId {
  table: string;
  textIndex: number;
  text: string;
}

/**
 * Write a StringId to the buffer
 */
function writeStringId(writer: BufferWriter, sid: CharacterCreationStringId): void {
  writer.writeStringWithLength16LE(sid.table);
  writer.writeUInt32LE(sid.textIndex);
  writer.writeStringWithLength16LE(sid.text);
}

/**
 * Read a StringId from the buffer
 */
function readStringId(reader: BufferReader): CharacterCreationStringId {
  const table = reader.readStringWithLength16LE();
  const textIndex = reader.readUInt32LE();
  const text = reader.readStringWithLength16LE();
  return { table, textIndex, text };
}

// ============================================================================
// Opcodes
// ============================================================================

/**
 * Character creation message opcodes
 */
export const CharacterCreationOpcode = {
  /** Client request to create a character */
  ClientCreateCharacter: 0xb97f3074,
  /** Server response - character created successfully (same wire name as Failed in C++) */
  CreateCharacterSuccess: 0xdf333c6e,
  /** Server response - character creation failed */
  CreateCharacterFailure: 0xdf333c6e,
  /** Client request to validate a character name */
  ClientVerifyAndLockNameRequest: 0x9eb04b9f,
  /** Server response to name validation request */
  ClientVerifyAndLockNameResponse: 0x9b2c6ba7,
  /** Client request to get random name suggestions */
  ClientRandomNameRequest: 0xd6d1b6d1,
  /** Server response with random name */
  ClientRandomNameResponse: 0xe85fb868,
} as const;

export type CharacterCreationOpcodeType =
  (typeof CharacterCreationOpcode)[keyof typeof CharacterCreationOpcode];

// ============================================================================
// Message Interfaces (matching C++ addVariable order)
// ============================================================================

/**
 * ClientCreateCharacter - Client request to create a new character
 * Opcode: 0x00B97C38
 * 13 fields matching C++ addVariable registration order
 */
export interface ClientCreateCharacter {
  opcode: typeof CharacterCreationOpcode.ClientCreateCharacter;
  /** Appearance customization data (ASCII string in C++ wire format) */
  appearanceData: string;
  /** Character name (Unicode) */
  characterName: string;
  /** Template name string path (e.g., "object/creature/player/human_male.iff") */
  templateName: string;
  /** Starting location identifier (e.g., "mos_eisley") - ASCII */
  startingLocation: string;
  /** Hair template name path (empty for bald) - ASCII */
  hairTemplateName: string;
  /** Hair appearance/customization data (ASCII string in C++ wire format) */
  hairAppearanceData: string;
  /** Starting profession (e.g., "combat_marksman") - ASCII */
  profession: string;
  /** Jedi flag */
  jedi: boolean;
  /** Scale factor (float) */
  scaleFactor: number;
  /** Character biography/backstory (Unicode) */
  biography: string;
  /** Tutorial flag (true to start in tutorial) */
  useNewbieTutorial: boolean;
  /** Skill template string (for skill-based professions in NGE) - ASCII */
  skillTemplate: string;
  /** Working skill string - ASCII */
  workingSkill: string;
}

/**
 * CreateCharacterSuccess - Server response for successful character creation
 * Opcode: 0x1DB575CC
 */
export interface CreateCharacterSuccess {
  opcode: typeof CharacterCreationOpcode.CreateCharacterSuccess;
  /** The newly created character's unique ID */
  characterId: bigint;
}

/**
 * CreateCharacterFailure - Server response for failed character creation
 * Opcode: 0xDF333C6E
 */
export interface CreateCharacterFailure {
  opcode: typeof CharacterCreationOpcode.CreateCharacterFailure;
  /** The character name that failed (Unicode) */
  characterName: string;
  /** Error message as StringId */
  errorMessage: CharacterCreationStringId;
}

/**
 * ClientVerifyAndLockNameRequest - Client request to check if a name is available
 * Opcode: 0xD6D1B6D1
 */
export interface ClientVerifyAndLockNameRequest {
  opcode: typeof CharacterCreationOpcode.ClientVerifyAndLockNameRequest;
  /** The species template name string path */
  templateName: string;
  /** The character name to verify (Unicode) */
  characterName: string;
}

/**
 * ClientVerifyAndLockNameResponse - Server response to name verification
 * Opcode: 0xE85FB868
 */
export interface ClientVerifyAndLockNameResponse {
  opcode: typeof CharacterCreationOpcode.ClientVerifyAndLockNameResponse;
  /** The name that was verified (Unicode) */
  characterName: string;
  /** Error message as StringId */
  errorMessage: CharacterCreationStringId;
}

/**
 * ClientRandomNameRequest - Client request for a random name suggestion
 * Opcode: 0xD6A80A5C
 */
export interface ClientRandomNameRequest {
  opcode: typeof CharacterCreationOpcode.ClientRandomNameRequest;
  /** The species template path to generate name for - ASCII */
  templateName: string;
}

/**
 * ClientRandomNameResponse - Server response with random name
 * Opcode: 0xE5D6E54D
 */
export interface ClientRandomNameResponse {
  opcode: typeof CharacterCreationOpcode.ClientRandomNameResponse;
  /** The template that was requested - ASCII (FIRST in wire order) */
  templateName: string;
  /** The generated random name (Unicode) (SECOND in wire order) */
  randomName: string;
  /** Error message as StringId */
  errorMessage: CharacterCreationStringId;
}

/**
 * Union type of all character creation messages
 */
export type CharacterCreationMessage =
  | ClientCreateCharacter
  | CreateCharacterSuccess
  | CreateCharacterFailure
  | ClientVerifyAndLockNameRequest
  | ClientVerifyAndLockNameResponse
  | ClientRandomNameRequest
  | ClientRandomNameResponse;

// ============================================================================
// Serialization Functions
// ============================================================================

/**
 * Deserialize ClientCreateCharacter message
 */
export function deserializeClientCreateCharacter(data: Uint8Array): ClientCreateCharacter {
  const reader = new BufferReader(data);

  // Skip operandCount prefix
  reader.readUInt16LE();

  const opcode = reader.readUInt32LE();
  if (opcode !== CharacterCreationOpcode.ClientCreateCharacter) {
    throw new Error(
      `Invalid opcode for ClientCreateCharacter: 0x${opcode.toString(16)}`
    );
  }

  // Read fields in C++ addVariable order
  const appearanceData = reader.readStringWithLength16LE();
  const characterName = reader.readUnicodeStringWithLength();
  const templateName = reader.readStringWithLength16LE();
  const startingLocation = reader.readStringWithLength16LE();
  const hairTemplateName = reader.readStringWithLength16LE();
  const hairAppearanceData = reader.readStringWithLength16LE();
  const profession = reader.readStringWithLength16LE();
  const jedi = reader.readUInt8() !== 0;
  const scaleFactor = reader.readFloatLE();
  const biography = reader.readUnicodeStringWithLength();
  const useNewbieTutorial = reader.readUInt8() !== 0;
  const skillTemplate = reader.readStringWithLength16LE();
  const workingSkill = reader.readStringWithLength16LE();

  return {
    opcode: CharacterCreationOpcode.ClientCreateCharacter,
    appearanceData,
    characterName,
    templateName,
    startingLocation,
    hairTemplateName,
    hairAppearanceData,
    profession,
    jedi,
    scaleFactor,
    biography,
    useNewbieTutorial,
    skillTemplate,
    workingSkill,
  };
}

/**
 * Serialize ClientCreateCharacter message (for testing/client simulation)
 */
export function serializeClientCreateCharacter(message: ClientCreateCharacter): Uint8Array {
  const writer = new BufferWriter(2048);

  // operandCount prefix (13 fields)
  writer.writeUInt16LE(13);
  writer.writeUInt32LE(message.opcode);

  // Write fields in C++ addVariable order
  writer.writeStringWithLength16LE(message.appearanceData);
  writer.writeUnicodeStringWithLength(message.characterName);
  writer.writeStringWithLength16LE(message.templateName);
  writer.writeStringWithLength16LE(message.startingLocation);
  writer.writeStringWithLength16LE(message.hairTemplateName);
  writer.writeStringWithLength16LE(message.hairAppearanceData);
  writer.writeStringWithLength16LE(message.profession);
  writer.writeUInt8(message.jedi ? 1 : 0);
  writer.writeFloatLE(message.scaleFactor);
  writer.writeUnicodeStringWithLength(message.biography);
  writer.writeUInt8(message.useNewbieTutorial ? 1 : 0);
  writer.writeStringWithLength16LE(message.skillTemplate);
  writer.writeStringWithLength16LE(message.workingSkill);

  return writer.toBuffer();
}

/**
 * Serialize CreateCharacterSuccess message
 */
export function serializeCreateCharacterSuccess(message: CreateCharacterSuccess): Uint8Array {
  const writer = new BufferWriter(16);

  // operandCount prefix (1 field)
  writer.writeUInt16LE(1);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.characterId);

  return writer.toBuffer();
}

/**
 * Deserialize CreateCharacterSuccess message
 */
export function deserializeCreateCharacterSuccess(data: Uint8Array): CreateCharacterSuccess {
  const reader = new BufferReader(data);

  // Skip operandCount prefix
  reader.readUInt16LE();

  const opcode = reader.readUInt32LE();
  if (opcode !== CharacterCreationOpcode.CreateCharacterSuccess) {
    throw new Error(
      `Invalid opcode for CreateCharacterSuccess: 0x${opcode.toString(16)}`
    );
  }

  const characterId = reader.readUInt64LE();

  return {
    opcode: CharacterCreationOpcode.CreateCharacterSuccess,
    characterId,
  };
}

/**
 * Serialize CreateCharacterFailure message
 */
export function serializeCreateCharacterFailure(message: CreateCharacterFailure): Uint8Array {
  const writer = new BufferWriter(256);

  // operandCount prefix (2 fields)
  writer.writeUInt16LE(2);
  writer.writeUInt32LE(message.opcode);
  writer.writeUnicodeStringWithLength(message.characterName);
  writeStringId(writer, message.errorMessage);

  return writer.toBuffer();
}

/**
 * Deserialize CreateCharacterFailure message
 */
export function deserializeCreateCharacterFailure(data: Uint8Array): CreateCharacterFailure {
  const reader = new BufferReader(data);

  // Skip operandCount prefix
  reader.readUInt16LE();

  const opcode = reader.readUInt32LE();
  if (opcode !== CharacterCreationOpcode.CreateCharacterFailure) {
    throw new Error(
      `Invalid opcode for CreateCharacterFailure: 0x${opcode.toString(16)}`
    );
  }

  const characterName = reader.readUnicodeStringWithLength();
  const errorMessage = readStringId(reader);

  return {
    opcode: CharacterCreationOpcode.CreateCharacterFailure,
    characterName,
    errorMessage,
  };
}

/**
 * Deserialize ClientVerifyAndLockNameRequest message
 */
export function deserializeClientVerifyAndLockNameRequest(
  data: Uint8Array
): ClientVerifyAndLockNameRequest {
  const reader = new BufferReader(data);

  // Skip operandCount prefix
  reader.readUInt16LE();

  const opcode = reader.readUInt32LE();
  if (opcode !== CharacterCreationOpcode.ClientVerifyAndLockNameRequest) {
    throw new Error(
      `Invalid opcode for ClientVerifyAndLockNameRequest: 0x${opcode.toString(16)}`
    );
  }

  const templateName = reader.readStringWithLength16LE();
  const characterName = reader.readUnicodeStringWithLength();

  return {
    opcode: CharacterCreationOpcode.ClientVerifyAndLockNameRequest,
    templateName,
    characterName,
  };
}

/**
 * Serialize ClientVerifyAndLockNameRequest message
 */
export function serializeClientVerifyAndLockNameRequest(
  message: ClientVerifyAndLockNameRequest
): Uint8Array {
  const writer = new BufferWriter(256);

  // operandCount prefix (2 fields)
  writer.writeUInt16LE(2);
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.templateName);
  writer.writeUnicodeStringWithLength(message.characterName);

  return writer.toBuffer();
}

/**
 * Serialize ClientVerifyAndLockNameResponse message
 */
export function serializeClientVerifyAndLockNameResponse(
  message: ClientVerifyAndLockNameResponse
): Uint8Array {
  const writer = new BufferWriter(256);

  // operandCount prefix (2 fields)
  writer.writeUInt16LE(2);
  writer.writeUInt32LE(message.opcode);
  writer.writeUnicodeStringWithLength(message.characterName);
  writeStringId(writer, message.errorMessage);

  return writer.toBuffer();
}

/**
 * Deserialize ClientVerifyAndLockNameResponse message
 */
export function deserializeClientVerifyAndLockNameResponse(
  data: Uint8Array
): ClientVerifyAndLockNameResponse {
  const reader = new BufferReader(data);

  // Skip operandCount prefix
  reader.readUInt16LE();

  const opcode = reader.readUInt32LE();
  if (opcode !== CharacterCreationOpcode.ClientVerifyAndLockNameResponse) {
    throw new Error(
      `Invalid opcode for ClientVerifyAndLockNameResponse: 0x${opcode.toString(16)}`
    );
  }

  const characterName = reader.readUnicodeStringWithLength();
  const errorMessage = readStringId(reader);

  return {
    opcode: CharacterCreationOpcode.ClientVerifyAndLockNameResponse,
    characterName,
    errorMessage,
  };
}

/**
 * Deserialize ClientRandomNameRequest message
 */
export function deserializeClientRandomNameRequest(
  data: Uint8Array
): ClientRandomNameRequest {
  const reader = new BufferReader(data);

  // Skip operandCount prefix
  reader.readUInt16LE();

  const opcode = reader.readUInt32LE();
  if (opcode !== CharacterCreationOpcode.ClientRandomNameRequest) {
    throw new Error(
      `Invalid opcode for ClientRandomNameRequest: 0x${opcode.toString(16)}`
    );
  }

  const templateName = reader.readStringWithLength16LE();

  return {
    opcode: CharacterCreationOpcode.ClientRandomNameRequest,
    templateName,
  };
}

/**
 * Serialize ClientRandomNameRequest message
 */
export function serializeClientRandomNameRequest(
  message: ClientRandomNameRequest
): Uint8Array {
  const writer = new BufferWriter(256);

  // operandCount prefix (1 field)
  writer.writeUInt16LE(1);
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.templateName);

  return writer.toBuffer();
}

/**
 * Serialize ClientRandomNameResponse message
 */
export function serializeClientRandomNameResponse(
  message: ClientRandomNameResponse
): Uint8Array {
  const writer = new BufferWriter(256);

  // operandCount prefix (3 fields)
  writer.writeUInt16LE(3);
  writer.writeUInt32LE(message.opcode);

  // Wire order: templateName (ASCII) FIRST, randomName (Unicode) SECOND
  writer.writeStringWithLength16LE(message.templateName);
  writer.writeUnicodeStringWithLength(message.randomName);
  writeStringId(writer, message.errorMessage);

  return writer.toBuffer();
}

/**
 * Deserialize ClientRandomNameResponse message
 */
export function deserializeClientRandomNameResponse(
  data: Uint8Array
): ClientRandomNameResponse {
  const reader = new BufferReader(data);

  // Skip operandCount prefix
  reader.readUInt16LE();

  const opcode = reader.readUInt32LE();
  if (opcode !== CharacterCreationOpcode.ClientRandomNameResponse) {
    throw new Error(
      `Invalid opcode for ClientRandomNameResponse: 0x${opcode.toString(16)}`
    );
  }

  // Wire order: templateName (ASCII) FIRST, randomName (Unicode) SECOND
  const templateName = reader.readStringWithLength16LE();
  const randomName = reader.readUnicodeStringWithLength();
  const errorMessage = readStringId(reader);

  return {
    opcode: CharacterCreationOpcode.ClientRandomNameResponse,
    templateName,
    randomName,
    errorMessage,
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a CreateCharacterSuccess message
 */
export function createCreateCharacterSuccess(characterId: bigint): CreateCharacterSuccess {
  return {
    opcode: CharacterCreationOpcode.CreateCharacterSuccess,
    characterId,
  };
}

/**
 * Create a CreateCharacterFailure message
 */
export function createCreateCharacterFailure(
  characterName: string,
  errorMessage: CharacterCreationStringId
): CreateCharacterFailure {
  return {
    opcode: CharacterCreationOpcode.CreateCharacterFailure,
    characterName,
    errorMessage,
  };
}

/**
 * Create a ClientVerifyAndLockNameResponse message
 */
export function createClientVerifyAndLockNameResponse(
  characterName: string,
  errorMessage: CharacterCreationStringId
): ClientVerifyAndLockNameResponse {
  return {
    opcode: CharacterCreationOpcode.ClientVerifyAndLockNameResponse,
    characterName,
    errorMessage,
  };
}

/**
 * Create a ClientRandomNameResponse message
 */
export function createClientRandomNameResponse(
  templateName: string,
  randomName: string,
  errorMessage: CharacterCreationStringId
): ClientRandomNameResponse {
  return {
    opcode: CharacterCreationOpcode.ClientRandomNameResponse,
    templateName,
    randomName,
    errorMessage,
  };
}

// ============================================================================
// Opcode Utilities
// ============================================================================

/**
 * Check if an opcode is a character creation message opcode
 */
export function isCharacterCreationOpcode(
  opcode: number
): opcode is CharacterCreationOpcodeType {
  return Object.values(CharacterCreationOpcode).includes(
    opcode as CharacterCreationOpcodeType
  );
}

/**
 * Get the opcode from raw message data
 * Skips the operandCount u16 prefix before reading the u32 opcode
 */
export function getCharacterCreationOpcode(data: Uint8Array): number {
  if (data.length < 6) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  return reader.readUInt32LE();
}
