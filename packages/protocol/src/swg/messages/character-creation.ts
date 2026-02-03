/**
 * SWG Character Creation Messages
 * Protocol messages for character creation flow
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';
import {
  CharacterNameError,
  type CharacterNameErrorType,
  getCharacterNameErrorString,
} from './character-name.js';

/**
 * Character creation message opcodes
 */
export const CharacterCreationOpcode = {
  /** Client request to create a character */
  ClientCreateCharacter: 0x00b97c38,
  /** Server response - character created successfully */
  CreateCharacterSuccess: 0x1db575cc,
  /** Server response - character creation failed */
  CreateCharacterFailure: 0xdf333c6e,
  /** Client request to validate a character name */
  ClientVerifyAndLockNameRequest: 0xd6d1b6d1,
  /** Server response to name validation request */
  ClientVerifyAndLockNameResponse: 0xe85fb868,
  /** Client request to get random name suggestions */
  ClientRandomNameRequest: 0xd6a80a5c,
  /** Server response with random name */
  ClientRandomNameResponse: 0xe5d6e54d,
} as const;

export type CharacterCreationOpcodeType =
  (typeof CharacterCreationOpcode)[keyof typeof CharacterCreationOpcode];

/**
 * ClientCreateCharacter - Client request to create a new character
 * Opcode: 0x00B97C38
 */
export interface ClientCreateCharacter {
  opcode: typeof CharacterCreationOpcode.ClientCreateCharacter;
  /** Appearance customization data (race-specific binary data) */
  appearanceData: Uint8Array;
  /** Character name (first name, or "first last") */
  characterName: string;
  /** CRC of the species/race template (e.g., human_male) */
  templateCrc: number;
  /** Starting location identifier (e.g., "mos_eisley", "tutorial") */
  startingLocation: string;
  /** Hair template path (empty for bald) */
  hairTemplate: string;
  /** Hair customization data (color, style modifiers) */
  hairCustomization: Uint8Array;
  /** Starting profession (e.g., "combat_marksman", "crafting_artisan") */
  profession: string;
  /** Character biography/backstory */
  biography: string;
  /** Tutorial flag (true to start in tutorial) */
  startTutorial: boolean;
  /** Skill template CRC (for skill-based professions in NGE) */
  skillTemplateCrc: number;
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
  /** Error code indicating why creation failed */
  nameError: CharacterNameErrorType;
  /** Human-readable error string (localization key or direct message) */
  errorString: string;
}

/**
 * ClientVerifyAndLockNameRequest - Client request to check if a name is available
 * Opcode: 0xD6D1B6D1
 */
export interface ClientVerifyAndLockNameRequest {
  opcode: typeof CharacterCreationOpcode.ClientVerifyAndLockNameRequest;
  /** The species template CRC */
  templateCrc: number;
  /** The character name to verify */
  characterName: string;
}

/**
 * ClientVerifyAndLockNameResponse - Server response to name verification
 * Opcode: 0xE85FB868
 */
export interface ClientVerifyAndLockNameResponse {
  opcode: typeof CharacterCreationOpcode.ClientVerifyAndLockNameResponse;
  /** The name that was verified */
  characterName: string;
  /** Error code (ACCEPTED if name is available) */
  errorCode: CharacterNameErrorType;
}

/**
 * ClientRandomNameRequest - Client request for a random name suggestion
 * Opcode: 0xD6A80A5C
 */
export interface ClientRandomNameRequest {
  opcode: typeof CharacterCreationOpcode.ClientRandomNameRequest;
  /** The species template path to generate name for */
  templateName: string;
}

/**
 * ClientRandomNameResponse - Server response with random name
 * Opcode: 0xE5D6E54D
 */
export interface ClientRandomNameResponse {
  opcode: typeof CharacterCreationOpcode.ClientRandomNameResponse;
  /** The generated random name */
  randomName: string;
  /** The template that was requested */
  templateName: string;
  /** Error code (ACCEPTED if name was generated) */
  errorCode: CharacterNameErrorType;
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
  const opcode = reader.readUInt32LE();

  if (opcode !== CharacterCreationOpcode.ClientCreateCharacter) {
    throw new Error(
      `Invalid opcode for ClientCreateCharacter: 0x${opcode.toString(16)}`
    );
  }

  // Read appearance data (length-prefixed)
  const appearanceLength = reader.readUInt32BE();
  const appearanceData = reader.readBytes(appearanceLength);

  // Read character name (unicode string)
  const characterName = reader.readUnicodeStringWithLength();

  // Read template CRC
  const templateCrc = reader.readUInt32BE();

  // Read starting location
  const startingLocation = reader.readUnicodeStringWithLength();

  // Read hair template
  const hairTemplate = reader.readStringWithLength32BE();

  // Read hair customization data (length-prefixed)
  const hairCustomizationLength = reader.readUInt32BE();
  const hairCustomization = reader.readBytes(hairCustomizationLength);

  // Read profession
  const profession = reader.readStringWithLength32BE();

  // Read tutorial flag
  const startTutorial = reader.readUInt8() !== 0;

  // Read skill template CRC (NGE)
  const skillTemplateCrc = reader.readUInt32BE();

  // Read biography (unicode string)
  const biography = reader.readUnicodeStringWithLength();

  return {
    opcode: CharacterCreationOpcode.ClientCreateCharacter,
    appearanceData,
    characterName,
    templateCrc,
    startingLocation,
    hairTemplate,
    hairCustomization,
    profession,
    biography,
    startTutorial,
    skillTemplateCrc,
  };
}

/**
 * Serialize ClientCreateCharacter message (for testing/client simulation)
 */
export function serializeClientCreateCharacter(message: ClientCreateCharacter): Uint8Array {
  const writer = new BufferWriter(2048);

  writer.writeUInt32LE(message.opcode);

  // Write appearance data
  writer.writeUInt32BE(message.appearanceData.length);
  writer.writeBytes(message.appearanceData);

  // Write character name (unicode)
  writer.writeUnicodeStringWithLength(message.characterName);

  // Write template CRC
  writer.writeUInt32BE(message.templateCrc);

  // Write starting location
  writer.writeUnicodeStringWithLength(message.startingLocation);

  // Write hair template
  writer.writeStringWithLength32BE(message.hairTemplate);

  // Write hair customization
  writer.writeUInt32BE(message.hairCustomization.length);
  writer.writeBytes(message.hairCustomization);

  // Write profession
  writer.writeStringWithLength32BE(message.profession);

  // Write tutorial flag
  writer.writeUInt8(message.startTutorial ? 1 : 0);

  // Write skill template CRC
  writer.writeUInt32BE(message.skillTemplateCrc);

  // Write biography
  writer.writeUnicodeStringWithLength(message.biography);

  return writer.toBuffer();
}

/**
 * Serialize CreateCharacterSuccess message
 */
export function serializeCreateCharacterSuccess(message: CreateCharacterSuccess): Uint8Array {
  const writer = new BufferWriter(16);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.characterId);
  return writer.toBuffer();
}

/**
 * Deserialize CreateCharacterSuccess message
 */
export function deserializeCreateCharacterSuccess(data: Uint8Array): CreateCharacterSuccess {
  const reader = new BufferReader(data);
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
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32BE(message.nameError);
  writer.writeUnicodeStringWithLength(message.errorString);
  return writer.toBuffer();
}

/**
 * Deserialize CreateCharacterFailure message
 */
export function deserializeCreateCharacterFailure(data: Uint8Array): CreateCharacterFailure {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();

  if (opcode !== CharacterCreationOpcode.CreateCharacterFailure) {
    throw new Error(
      `Invalid opcode for CreateCharacterFailure: 0x${opcode.toString(16)}`
    );
  }

  const nameError = reader.readUInt32BE() as CharacterNameErrorType;
  const errorString = reader.readUnicodeStringWithLength();

  return {
    opcode: CharacterCreationOpcode.CreateCharacterFailure,
    nameError,
    errorString,
  };
}

/**
 * Deserialize ClientVerifyAndLockNameRequest message
 */
export function deserializeClientVerifyAndLockNameRequest(
  data: Uint8Array
): ClientVerifyAndLockNameRequest {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();

  if (opcode !== CharacterCreationOpcode.ClientVerifyAndLockNameRequest) {
    throw new Error(
      `Invalid opcode for ClientVerifyAndLockNameRequest: 0x${opcode.toString(16)}`
    );
  }

  const templateCrc = reader.readUInt32BE();
  const characterName = reader.readUnicodeStringWithLength();

  return {
    opcode: CharacterCreationOpcode.ClientVerifyAndLockNameRequest,
    templateCrc,
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
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32BE(message.templateCrc);
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
  writer.writeUInt32LE(message.opcode);
  writer.writeUnicodeStringWithLength(message.characterName);
  writer.writeUInt32BE(message.errorCode);
  return writer.toBuffer();
}

/**
 * Deserialize ClientVerifyAndLockNameResponse message
 */
export function deserializeClientVerifyAndLockNameResponse(
  data: Uint8Array
): ClientVerifyAndLockNameResponse {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();

  if (opcode !== CharacterCreationOpcode.ClientVerifyAndLockNameResponse) {
    throw new Error(
      `Invalid opcode for ClientVerifyAndLockNameResponse: 0x${opcode.toString(16)}`
    );
  }

  const characterName = reader.readUnicodeStringWithLength();
  const errorCode = reader.readUInt32BE() as CharacterNameErrorType;

  return {
    opcode: CharacterCreationOpcode.ClientVerifyAndLockNameResponse,
    characterName,
    errorCode,
  };
}

/**
 * Deserialize ClientRandomNameRequest message
 */
export function deserializeClientRandomNameRequest(
  data: Uint8Array
): ClientRandomNameRequest {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();

  if (opcode !== CharacterCreationOpcode.ClientRandomNameRequest) {
    throw new Error(
      `Invalid opcode for ClientRandomNameRequest: 0x${opcode.toString(16)}`
    );
  }

  const templateName = reader.readStringWithLength32BE();

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
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength32BE(message.templateName);
  return writer.toBuffer();
}

/**
 * Serialize ClientRandomNameResponse message
 */
export function serializeClientRandomNameResponse(
  message: ClientRandomNameResponse
): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt32LE(message.opcode);
  writer.writeUnicodeStringWithLength(message.randomName);
  writer.writeStringWithLength32BE(message.templateName);
  writer.writeUInt32BE(message.errorCode);
  return writer.toBuffer();
}

/**
 * Deserialize ClientRandomNameResponse message
 */
export function deserializeClientRandomNameResponse(
  data: Uint8Array
): ClientRandomNameResponse {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();

  if (opcode !== CharacterCreationOpcode.ClientRandomNameResponse) {
    throw new Error(
      `Invalid opcode for ClientRandomNameResponse: 0x${opcode.toString(16)}`
    );
  }

  const randomName = reader.readUnicodeStringWithLength();
  const templateName = reader.readStringWithLength32BE();
  const errorCode = reader.readUInt32BE() as CharacterNameErrorType;

  return {
    opcode: CharacterCreationOpcode.ClientRandomNameResponse,
    randomName,
    templateName,
    errorCode,
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
  nameError: CharacterNameErrorType,
  errorString?: string
): CreateCharacterFailure {
  return {
    opcode: CharacterCreationOpcode.CreateCharacterFailure,
    nameError,
    errorString: errorString ?? getCharacterNameErrorString(nameError),
  };
}

/**
 * Create a ClientVerifyAndLockNameResponse message
 */
export function createClientVerifyAndLockNameResponse(
  characterName: string,
  errorCode: CharacterNameErrorType
): ClientVerifyAndLockNameResponse {
  return {
    opcode: CharacterCreationOpcode.ClientVerifyAndLockNameResponse,
    characterName,
    errorCode,
  };
}

/**
 * Create a ClientRandomNameResponse message
 */
export function createClientRandomNameResponse(
  randomName: string,
  templateName: string,
  errorCode: CharacterNameErrorType = CharacterNameError.ACCEPTED
): ClientRandomNameResponse {
  return {
    opcode: CharacterCreationOpcode.ClientRandomNameResponse,
    randomName,
    templateName,
    errorCode,
  };
}

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
 */
export function getCharacterCreationOpcode(data: Uint8Array): number {
  if (data.length < 4) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  return reader.readUInt32LE();
}
