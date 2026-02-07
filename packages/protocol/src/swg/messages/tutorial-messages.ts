/**
 * SWG Tutorial Messages
 * Protocol messages for the newbie tutorial system
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

/**
 * Tutorial message opcodes (CRC32 of class name)
 */
export const TutorialMessageOpcode = {
  /** Enable/disable a HUD element with optional blink */
  NewbieTutorialEnableHudElement: 0x8579c789,
  /** Enable/disable an interface element */
  NewbieTutorialEnableInterfaceElement: 0x8082a8ee,
  /** Highlight a UI widget for a duration */
  NewbieTutorialHighlightUIElement: 0x411ce04c,
  /** Client tutorial request */
  NewbieTutorialRequest: 0x87049ad0,
  /** Server tutorial response */
  NewbieTutorialResponse: 0xd8a4c4ef,
  /** Set a toolbar element to a command or object */
  NewbieTutorialSetToolbarElement: 0x8a079536,
} as const;

export type TutorialMessageOpcodeType =
  (typeof TutorialMessageOpcode)[keyof typeof TutorialMessageOpcode];

// ============================================
// NewbieTutorialEnableHudElement (0x8579C789)
// ============================================

/**
 * NewbieTutorialEnableHudElement - Enable/disable a HUD element
 * C++ fields: name(string) + enable(bool) + blinkTime(float)
 */
export interface NewbieTutorialEnableHudElement {
  opcode: typeof TutorialMessageOpcode.NewbieTutorialEnableHudElement;
  name: string;
  enable: boolean;
  blinkTime: number;
}

/**
 * Serialize NewbieTutorialEnableHudElement message
 */
export function serializeNewbieTutorialEnableHudElement(
  message: NewbieTutorialEnableHudElement
): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.name);
  writer.writeUInt8(message.enable ? 1 : 0);
  writer.writeFloatLE(message.blinkTime);
  return writer.toBuffer();
}

/**
 * Deserialize NewbieTutorialEnableHudElement message
 */
export function deserializeNewbieTutorialEnableHudElement(
  data: Uint8Array
): NewbieTutorialEnableHudElement {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TutorialMessageOpcode.NewbieTutorialEnableHudElement) {
    throw new Error(
      `Invalid opcode for NewbieTutorialEnableHudElement: 0x${opcode.toString(16)}`
    );
  }
  const name = reader.readStringWithLength16LE();
  const enable = reader.readUInt8() !== 0;
  const blinkTime = reader.readFloatLE();

  return {
    opcode: TutorialMessageOpcode.NewbieTutorialEnableHudElement,
    name,
    enable,
    blinkTime,
  };
}

/**
 * Create a NewbieTutorialEnableHudElement message
 */
export function createNewbieTutorialEnableHudElement(
  name: string,
  enable: boolean,
  blinkTime: number = 0
): NewbieTutorialEnableHudElement {
  return {
    opcode: TutorialMessageOpcode.NewbieTutorialEnableHudElement,
    name,
    enable,
    blinkTime,
  };
}

// ============================================
// NewbieTutorialEnableInterfaceElement (0x8082A8EE)
// ============================================

/**
 * NewbieTutorialEnableInterfaceElement - Enable/disable an interface element
 * C++ fields: name(string) + enable(bool)
 */
export interface NewbieTutorialEnableInterfaceElement {
  opcode: typeof TutorialMessageOpcode.NewbieTutorialEnableInterfaceElement;
  name: string;
  enable: boolean;
}

/**
 * Serialize NewbieTutorialEnableInterfaceElement message
 */
export function serializeNewbieTutorialEnableInterfaceElement(
  message: NewbieTutorialEnableInterfaceElement
): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.name);
  writer.writeUInt8(message.enable ? 1 : 0);
  return writer.toBuffer();
}

/**
 * Deserialize NewbieTutorialEnableInterfaceElement message
 */
export function deserializeNewbieTutorialEnableInterfaceElement(
  data: Uint8Array
): NewbieTutorialEnableInterfaceElement {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TutorialMessageOpcode.NewbieTutorialEnableInterfaceElement) {
    throw new Error(
      `Invalid opcode for NewbieTutorialEnableInterfaceElement: 0x${opcode.toString(16)}`
    );
  }
  const name = reader.readStringWithLength16LE();
  const enable = reader.readUInt8() !== 0;

  return {
    opcode: TutorialMessageOpcode.NewbieTutorialEnableInterfaceElement,
    name,
    enable,
  };
}

/**
 * Create a NewbieTutorialEnableInterfaceElement message
 */
export function createNewbieTutorialEnableInterfaceElement(
  name: string,
  enable: boolean
): NewbieTutorialEnableInterfaceElement {
  return {
    opcode: TutorialMessageOpcode.NewbieTutorialEnableInterfaceElement,
    name,
    enable,
  };
}

// ============================================
// NewbieTutorialHighlightUIElement (0x411CE04C)
// ============================================

/**
 * NewbieTutorialHighlightUIElement - Highlight a UI widget for a duration
 * C++ fields: time(float) + widgetPath(string)
 */
export interface NewbieTutorialHighlightUIElement {
  opcode: typeof TutorialMessageOpcode.NewbieTutorialHighlightUIElement;
  time: number;
  widgetPath: string;
}

/**
 * Serialize NewbieTutorialHighlightUIElement message
 */
export function serializeNewbieTutorialHighlightUIElement(
  message: NewbieTutorialHighlightUIElement
): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt16LE(3); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeFloatLE(message.time);
  writer.writeStringWithLength16LE(message.widgetPath);
  return writer.toBuffer();
}

/**
 * Deserialize NewbieTutorialHighlightUIElement message
 */
export function deserializeNewbieTutorialHighlightUIElement(
  data: Uint8Array
): NewbieTutorialHighlightUIElement {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TutorialMessageOpcode.NewbieTutorialHighlightUIElement) {
    throw new Error(
      `Invalid opcode for NewbieTutorialHighlightUIElement: 0x${opcode.toString(16)}`
    );
  }
  const time = reader.readFloatLE();
  const widgetPath = reader.readStringWithLength16LE();

  return {
    opcode: TutorialMessageOpcode.NewbieTutorialHighlightUIElement,
    time,
    widgetPath,
  };
}

/**
 * Create a NewbieTutorialHighlightUIElement message
 */
export function createNewbieTutorialHighlightUIElement(
  widgetPath: string,
  time: number = 0
): NewbieTutorialHighlightUIElement {
  return {
    opcode: TutorialMessageOpcode.NewbieTutorialHighlightUIElement,
    time,
    widgetPath,
  };
}

// ============================================
// NewbieTutorialRequest (0x87049AD0)
// ============================================

/**
 * NewbieTutorialRequest - Client tutorial request
 * C++ fields: request(string)
 */
export interface NewbieTutorialRequest {
  opcode: typeof TutorialMessageOpcode.NewbieTutorialRequest;
  request: string;
}

/**
 * Serialize NewbieTutorialRequest message
 */
export function serializeNewbieTutorialRequest(
  message: NewbieTutorialRequest
): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.request);
  return writer.toBuffer();
}

/**
 * Deserialize NewbieTutorialRequest message
 */
export function deserializeNewbieTutorialRequest(
  data: Uint8Array
): NewbieTutorialRequest {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TutorialMessageOpcode.NewbieTutorialRequest) {
    throw new Error(
      `Invalid opcode for NewbieTutorialRequest: 0x${opcode.toString(16)}`
    );
  }
  const request = reader.readStringWithLength16LE();

  return {
    opcode: TutorialMessageOpcode.NewbieTutorialRequest,
    request,
  };
}

/**
 * Create a NewbieTutorialRequest message
 */
export function createNewbieTutorialRequest(
  request: string
): NewbieTutorialRequest {
  return {
    opcode: TutorialMessageOpcode.NewbieTutorialRequest,
    request,
  };
}

// ============================================
// NewbieTutorialResponse (0xD8A4C4EF)
// ============================================

/**
 * NewbieTutorialResponse - Server tutorial response
 * C++ fields: response(string)
 */
export interface NewbieTutorialResponse {
  opcode: typeof TutorialMessageOpcode.NewbieTutorialResponse;
  response: string;
}

/**
 * Serialize NewbieTutorialResponse message
 */
export function serializeNewbieTutorialResponse(
  message: NewbieTutorialResponse
): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16LE(message.response);
  return writer.toBuffer();
}

/**
 * Deserialize NewbieTutorialResponse message
 */
export function deserializeNewbieTutorialResponse(
  data: Uint8Array
): NewbieTutorialResponse {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TutorialMessageOpcode.NewbieTutorialResponse) {
    throw new Error(
      `Invalid opcode for NewbieTutorialResponse: 0x${opcode.toString(16)}`
    );
  }
  const response = reader.readStringWithLength16LE();

  return {
    opcode: TutorialMessageOpcode.NewbieTutorialResponse,
    response,
  };
}

/**
 * Create a NewbieTutorialResponse message
 */
export function createNewbieTutorialResponse(
  response: string
): NewbieTutorialResponse {
  return {
    opcode: TutorialMessageOpcode.NewbieTutorialResponse,
    response,
  };
}

// ============================================
// NewbieTutorialSetToolbarElement (0x8A079536)
// ============================================

/**
 * NewbieTutorialSetToolbarElement - Set a toolbar element to a command or object
 * C++ fields: slot(int32) + commandName(string) + object(int64)
 */
export interface NewbieTutorialSetToolbarElement {
  opcode: typeof TutorialMessageOpcode.NewbieTutorialSetToolbarElement;
  slot: number;
  commandName: string;
  object: bigint;
}

/**
 * Serialize NewbieTutorialSetToolbarElement message
 */
export function serializeNewbieTutorialSetToolbarElement(
  message: NewbieTutorialSetToolbarElement
): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt16LE(4); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.slot);
  writer.writeStringWithLength16LE(message.commandName);
  writer.writeUInt64LE(message.object);
  return writer.toBuffer();
}

/**
 * Deserialize NewbieTutorialSetToolbarElement message
 */
export function deserializeNewbieTutorialSetToolbarElement(
  data: Uint8Array
): NewbieTutorialSetToolbarElement {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== TutorialMessageOpcode.NewbieTutorialSetToolbarElement) {
    throw new Error(
      `Invalid opcode for NewbieTutorialSetToolbarElement: 0x${opcode.toString(16)}`
    );
  }
  const slot = reader.readInt32LE();
  const commandName = reader.readStringWithLength16LE();
  const object = reader.readUInt64LE();

  return {
    opcode: TutorialMessageOpcode.NewbieTutorialSetToolbarElement,
    slot,
    commandName,
    object,
  };
}

/**
 * Create a NewbieTutorialSetToolbarElement message with a command name
 */
export function createNewbieTutorialSetToolbarElementByCommand(
  slot: number,
  commandName: string
): NewbieTutorialSetToolbarElement {
  return {
    opcode: TutorialMessageOpcode.NewbieTutorialSetToolbarElement,
    slot,
    commandName,
    object: BigInt.asUintN(64, -1n),
  };
}

/**
 * Create a NewbieTutorialSetToolbarElement message with an object ID
 */
export function createNewbieTutorialSetToolbarElementByObject(
  slot: number,
  object: bigint
): NewbieTutorialSetToolbarElement {
  return {
    opcode: TutorialMessageOpcode.NewbieTutorialSetToolbarElement,
    slot,
    commandName: '',
    object,
  };
}

// ============================================
// Union Types and Utilities
// ============================================

/**
 * Union type of all tutorial messages
 */
export type TutorialMessage =
  | NewbieTutorialEnableHudElement
  | NewbieTutorialEnableInterfaceElement
  | NewbieTutorialHighlightUIElement
  | NewbieTutorialRequest
  | NewbieTutorialResponse
  | NewbieTutorialSetToolbarElement;

/**
 * Get the opcode from raw tutorial message data
 */
export function getTutorialMessageOpcode(data: Uint8Array): number {
  if (data.length < 6) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid tutorial message opcode
 */
export function isTutorialMessageOpcode(
  opcode: number
): opcode is TutorialMessageOpcodeType {
  return Object.values(TutorialMessageOpcode).includes(
    opcode as TutorialMessageOpcodeType
  );
}
