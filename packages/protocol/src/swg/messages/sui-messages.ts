/**
 * SWG SUI (Server User Interface) Messages
 * Protocol messages for server-driven UI pages, events, and console output
 *
 * C++ References:
 *   - SuiCreatePageMessage.h/cpp (new-style, wraps SuiPageData)
 *   - SuiUpdatePageMessage.h/cpp (new-style, wraps SuiPageData)
 *   - SuiEventNotification.h/cpp (client->server event callback)
 *   - ServerUserInterfaceMessages.h/cpp (old-style SuiForceClosePage)
 *   - ConsoleChannelMessages.h/cpp (ConGenericMessage)
 */

import { BufferReader, BufferWriter } from '../../soe/buffer-utils.js';

// ============================================
// Opcodes
// ============================================

export const SuiMessageOpcode = {
  /** Create a new SUI page (new-style with SuiPageData) */
  SuiCreatePageMessage: 0xd2fd3737,
  /** Update an existing SUI page (new-style with SuiPageData) */
  SuiUpdatePageMessage: 0x5cc3e7c9,
  /** Client notification of SUI event (client -> server) */
  SuiEventNotification: 0x99d32e4e,
  /** Force close an SUI page (server -> client) */
  SuiForceClosePage: 0xb3dd0e13,
  /** Generic console message (server -> client) */
  ConGenericMessage: 0xb0e9da69,
} as const;

export type SuiMessageOpcodeType =
  (typeof SuiMessageOpcode)[keyof typeof SuiMessageOpcode];

// ============================================
// SuiCommand (shared type for SuiPageData)
// ============================================

/**
 * SuiCommand types matching C++ SuiCommand::Type enum
 */
export const SuiCommandType = {
  SCT_none: 0,
  SCT_clearDataSource: 1,
  SCT_addChildWidget: 2,
  SCT_setProperty: 3,
  SCT_addDataItem: 4,
  SCT_subscribeToEvent: 5,
  SCT_addDataSourceContainer: 6,
  SCT_clearDataSourceContainer: 7,
  SCT_addDataSource: 8,
} as const;

export type SuiCommandTypeValue =
  (typeof SuiCommandType)[keyof typeof SuiCommandType];

/**
 * SuiCommand - a single command within an SUI page
 *
 * C++ wire format (SuiCommand::put/get):
 *   uint8(type) + vector<Unicode::String>(parametersWide) + vector<string>(parametersNarrow)
 *
 * C++ vector<T> wire format: int32(count) + elements
 * C++ string wire format: uint16(len) + bytes (or uint16(0xFFFF) + uint32(len) + bytes if len >= 65535)
 * C++ Unicode::String wire format: uint32(charCount) + utf16le bytes
 */
export interface SuiCommand {
  type: number;
  parametersWide: string[];
  parametersNarrow: string[];
}

/**
 * Write a single SuiCommand to a BufferWriter
 */
export function writeSuiCommand(writer: BufferWriter, command: SuiCommand): void {
  // type: uint8
  writer.writeUInt8(command.type);

  // parametersWide: vector<Unicode::String>
  // C++ vector<T>: int32(count) + elements
  writer.writeInt32LE(command.parametersWide.length);
  for (const wideStr of command.parametersWide) {
    // Unicode::String: uint32(charCount) + utf16le bytes
    writer.writeUnicodeStringWithLength(wideStr);
  }

  // parametersNarrow: vector<string>
  writer.writeInt32LE(command.parametersNarrow.length);
  for (const narrowStr of command.parametersNarrow) {
    // C++ string: uint16(len) + bytes
    writer.writeStringWithLength16LE(narrowStr);
  }
}

/**
 * Read a single SuiCommand from a BufferReader
 */
export function readSuiCommand(reader: BufferReader): SuiCommand {
  // type: uint8
  const type = reader.readUInt8();

  // parametersWide: vector<Unicode::String>
  const wideCount = reader.readInt32LE();
  const parametersWide: string[] = [];
  for (let i = 0; i < wideCount; i++) {
    parametersWide.push(reader.readUnicodeStringWithLength());
  }

  // parametersNarrow: vector<string>
  const narrowCount = reader.readInt32LE();
  const parametersNarrow: string[] = [];
  for (let i = 0; i < narrowCount; i++) {
    parametersNarrow.push(reader.readStringWithLength16LE());
  }

  return { type, parametersWide, parametersNarrow };
}

// ============================================
// SuiPageData (shared type for Create/Update)
// ============================================

/**
 * SuiPageData - full page description for SUI create/update messages
 *
 * C++ wire format (SuiPageData::put/get):
 *   int32(pageId) + string(pageName) + vector<SuiCommand>(commands)
 *   + NetworkId(associatedObjectId) + Vector(associatedLocation: x,y,z as 3 floats)
 *   + float(maxRangeFromObject)
 */
export interface SuiPageData {
  pageId: number;
  pageName: string;
  commands: SuiCommand[];
  associatedObjectId: bigint;
  associatedLocationX: number;
  associatedLocationY: number;
  associatedLocationZ: number;
  maxRangeFromObject: number;
}

/**
 * Write SuiPageData to a BufferWriter
 */
export function writeSuiPageData(writer: BufferWriter, data: SuiPageData): void {
  // pageId: int32
  writer.writeInt32LE(data.pageId);

  // pageName: string (uint16 len + bytes)
  writer.writeStringWithLength16LE(data.pageName);

  // commands: vector<SuiCommand> (int32 count + elements)
  writer.writeInt32LE(data.commands.length);
  for (const cmd of data.commands) {
    writeSuiCommand(writer, cmd);
  }

  // associatedObjectId: NetworkId (int64)
  writer.writeUInt64LE(data.associatedObjectId);

  // associatedLocation: Vector (3 floats: x, y, z)
  writer.writeFloatLE(data.associatedLocationX);
  writer.writeFloatLE(data.associatedLocationY);
  writer.writeFloatLE(data.associatedLocationZ);

  // maxRangeFromObject: float
  writer.writeFloatLE(data.maxRangeFromObject);
}

/**
 * Read SuiPageData from a BufferReader
 */
export function readSuiPageData(reader: BufferReader): SuiPageData {
  // pageId: int32
  const pageId = reader.readInt32LE();

  // pageName: string
  const pageName = reader.readStringWithLength16LE();

  // commands: vector<SuiCommand>
  const commandCount = reader.readInt32LE();
  const commands: SuiCommand[] = [];
  for (let i = 0; i < commandCount; i++) {
    commands.push(readSuiCommand(reader));
  }

  // associatedObjectId: NetworkId (int64)
  const associatedObjectId = reader.readUInt64LE();

  // associatedLocation: Vector (3 floats)
  const associatedLocationX = reader.readFloatLE();
  const associatedLocationY = reader.readFloatLE();
  const associatedLocationZ = reader.readFloatLE();

  // maxRangeFromObject: float
  const maxRangeFromObject = reader.readFloatLE();

  return {
    pageId,
    pageName,
    commands,
    associatedObjectId,
    associatedLocationX,
    associatedLocationY,
    associatedLocationZ,
    maxRangeFromObject,
  };
}

// ============================================
// SuiCreatePageMessage (0xD2FD3737)
// ============================================

/**
 * SuiCreatePageMessage - Create a new SUI page on the client
 * Server -> Client
 *
 * C++ wire format: operandCount(u16) + opcode(u32) + SuiPageData (packed via AutoDeltaVariable)
 *
 * Uses the new-style SuiPageData which bundles all page info (commands, subscriptions, etc.)
 * into a single serialized structure.
 */
export interface SuiCreatePageMessage {
  opcode: typeof SuiMessageOpcode.SuiCreatePageMessage;
  pageData: SuiPageData;
}

/**
 * Serialize SuiCreatePageMessage
 */
export function serializeSuiCreatePageMessage(message: SuiCreatePageMessage): Uint8Array {
  const writer = new BufferWriter(1024);
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(message.opcode);
  writeSuiPageData(writer, message.pageData);
  return writer.toBuffer();
}

/**
 * Deserialize SuiCreatePageMessage
 */
export function deserializeSuiCreatePageMessage(data: Uint8Array): SuiCreatePageMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== SuiMessageOpcode.SuiCreatePageMessage) {
    throw new Error(`Invalid opcode for SuiCreatePageMessage: 0x${opcode.toString(16)}`);
  }
  const pageData = readSuiPageData(reader);
  return {
    opcode: SuiMessageOpcode.SuiCreatePageMessage,
    pageData,
  };
}

/**
 * Create a SuiCreatePageMessage
 */
export function createSuiCreatePageMessage(pageData: SuiPageData): SuiCreatePageMessage {
  return {
    opcode: SuiMessageOpcode.SuiCreatePageMessage,
    pageData,
  };
}

// ============================================
// SuiUpdatePageMessage (0x5CC3E7C9)
// ============================================

/**
 * SuiUpdatePageMessage - Update an existing SUI page on the client
 * Server -> Client
 *
 * C++ wire format: operandCount(u16) + opcode(u32) + SuiPageData (packed via AutoDeltaVariable)
 *
 * Same structure as SuiCreatePageMessage but with a different opcode.
 * The pageId in the SuiPageData identifies which existing page to update.
 */
export interface SuiUpdatePageMessage {
  opcode: typeof SuiMessageOpcode.SuiUpdatePageMessage;
  pageData: SuiPageData;
}

/**
 * Serialize SuiUpdatePageMessage
 */
export function serializeSuiUpdatePageMessage(message: SuiUpdatePageMessage): Uint8Array {
  const writer = new BufferWriter(1024);
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(message.opcode);
  writeSuiPageData(writer, message.pageData);
  return writer.toBuffer();
}

/**
 * Deserialize SuiUpdatePageMessage
 */
export function deserializeSuiUpdatePageMessage(data: Uint8Array): SuiUpdatePageMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== SuiMessageOpcode.SuiUpdatePageMessage) {
    throw new Error(`Invalid opcode for SuiUpdatePageMessage: 0x${opcode.toString(16)}`);
  }
  const pageData = readSuiPageData(reader);
  return {
    opcode: SuiMessageOpcode.SuiUpdatePageMessage,
    pageData,
  };
}

/**
 * Create a SuiUpdatePageMessage
 */
export function createSuiUpdatePageMessage(pageData: SuiPageData): SuiUpdatePageMessage {
  return {
    opcode: SuiMessageOpcode.SuiUpdatePageMessage,
    pageData,
  };
}

// ============================================
// SuiEventNotification (0x99D32E4E)
// ============================================

/**
 * SuiEventNotification - Client notifies server of SUI event
 * Client -> Server
 *
 * C++ wire format: operandCount(u16) + opcode(u32)
 *   + int32(pageId)
 *   + int32(subscribedEventIndex)
 *   + AutoDeltaVector<Unicode::String>(subscribedProperties)
 *
 * AutoDeltaVector baseline pack format:
 *   size_t(count as u32) + size_t(baselineCommandCount as u32) + elements
 * Each element is Unicode::String: uint32(charCount) + utf16le bytes
 */
export interface SuiEventNotification {
  opcode: typeof SuiMessageOpcode.SuiEventNotification;
  pageId: number;
  subscribedEventIndex: number;
  subscribedProperties: string[];
}

/**
 * Serialize SuiEventNotification
 */
export function serializeSuiEventNotification(message: SuiEventNotification): Uint8Array {
  const writer = new BufferWriter(512);
  writer.writeUInt16LE(3); // operandCount (pageId + eventIndex + properties)
  writer.writeUInt32LE(message.opcode);

  // m_pageId: int32
  writer.writeInt32LE(message.pageId);

  // m_subscribedEventIndex: int32
  writer.writeInt32LE(message.subscribedEventIndex);

  // m_subscribedProperties: AutoDeltaVector<Unicode::String>
  // Baseline pack: size(u32) + baselineCommandCount(u32) + elements
  writer.writeUInt32LE(message.subscribedProperties.length);
  writer.writeUInt32LE(0); // baselineCommandCount
  for (const prop of message.subscribedProperties) {
    writer.writeUnicodeStringWithLength(prop);
  }

  return writer.toBuffer();
}

/**
 * Deserialize SuiEventNotification
 */
export function deserializeSuiEventNotification(data: Uint8Array): SuiEventNotification {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== SuiMessageOpcode.SuiEventNotification) {
    throw new Error(`Invalid opcode for SuiEventNotification: 0x${opcode.toString(16)}`);
  }

  // m_pageId: int32
  const pageId = reader.readInt32LE();

  // m_subscribedEventIndex: int32
  const subscribedEventIndex = reader.readInt32LE();

  // m_subscribedProperties: AutoDeltaVector<Unicode::String>
  // Baseline unpack: size(u32) + baselineCommandCount(u32) + elements
  const propertyCount = reader.readUInt32LE();
  reader.readUInt32LE(); // baselineCommandCount (ignored)
  const subscribedProperties: string[] = [];
  for (let i = 0; i < propertyCount; i++) {
    subscribedProperties.push(reader.readUnicodeStringWithLength());
  }

  return {
    opcode: SuiMessageOpcode.SuiEventNotification,
    pageId,
    subscribedEventIndex,
    subscribedProperties,
  };
}

/**
 * Create a SuiEventNotification message
 */
export function createSuiEventNotification(
  pageId: number,
  subscribedEventIndex: number,
  subscribedProperties: string[] = []
): SuiEventNotification {
  return {
    opcode: SuiMessageOpcode.SuiEventNotification,
    pageId,
    subscribedEventIndex,
    subscribedProperties,
  };
}

// ============================================
// SuiForceClosePage (0xB3DD0E13)
// ============================================

/**
 * SuiForceClosePage - Force close an SUI page on the client
 * Server -> Client
 *
 * C++ wire format: operandCount(u16) + opcode(u32)
 *   + int32(clientPageId)   -- from SUIMessage base class
 *
 * SuiForceClosePage extends SUIMessage which adds m_clientPageId as its
 * only variable. SuiForceClosePage adds no additional variables.
 */
export interface SuiForceClosePage {
  opcode: typeof SuiMessageOpcode.SuiForceClosePage;
  pageId: number;
}

/**
 * Serialize SuiForceClosePage
 */
export function serializeSuiForceClosePage(message: SuiForceClosePage): Uint8Array {
  const writer = new BufferWriter(10);
  writer.writeUInt16LE(1); // operandCount
  writer.writeUInt32LE(message.opcode);
  writer.writeInt32LE(message.pageId);
  return writer.toBuffer();
}

/**
 * Deserialize SuiForceClosePage
 */
export function deserializeSuiForceClosePage(data: Uint8Array): SuiForceClosePage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== SuiMessageOpcode.SuiForceClosePage) {
    throw new Error(`Invalid opcode for SuiForceClosePage: 0x${opcode.toString(16)}`);
  }
  const pageId = reader.readInt32LE();
  return {
    opcode: SuiMessageOpcode.SuiForceClosePage,
    pageId,
  };
}

/**
 * Create a SuiForceClosePage message
 */
export function createSuiForceClosePage(pageId: number): SuiForceClosePage {
  return {
    opcode: SuiMessageOpcode.SuiForceClosePage,
    pageId,
  };
}

// ============================================
// ConGenericMessage (0xB0E9DA69)
// ============================================

/**
 * ConGenericMessage - Generic console message
 * Server -> Client (can also be Client -> Server)
 *
 * C++ wire format: operandCount(u16) + opcode(u32)
 *   + string(msg)
 *   + uint32(msgId)
 *
 * Used to send system/console text messages to the client.
 */
export interface ConGenericMessage {
  opcode: typeof SuiMessageOpcode.ConGenericMessage;
  msg: string;
  msgId: number;
}

/**
 * Serialize ConGenericMessage
 */
export function serializeConGenericMessage(message: ConGenericMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt16LE(2); // operandCount
  writer.writeUInt32LE(message.opcode);
  // msg: C++ string (uint16 len + bytes)
  writer.writeStringWithLength16LE(message.msg);
  // msgId: uint32
  writer.writeUInt32LE(message.msgId);
  return writer.toBuffer();
}

/**
 * Deserialize ConGenericMessage
 */
export function deserializeConGenericMessage(data: Uint8Array): ConGenericMessage {
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  const opcode = reader.readUInt32LE();
  if (opcode !== SuiMessageOpcode.ConGenericMessage) {
    throw new Error(`Invalid opcode for ConGenericMessage: 0x${opcode.toString(16)}`);
  }
  const msg = reader.readStringWithLength16LE();
  const msgId = reader.readUInt32LE();
  return {
    opcode: SuiMessageOpcode.ConGenericMessage,
    msg,
    msgId,
  };
}

/**
 * Create a ConGenericMessage
 */
export function createConGenericMessage(msg: string, msgId: number = 0): ConGenericMessage {
  return {
    opcode: SuiMessageOpcode.ConGenericMessage,
    msg,
    msgId,
  };
}

// ============================================
// SuiCommand Helper Factories
// ============================================

/**
 * Create an SCT_clearDataSource command
 * C++ narrow params: [targetWidget]
 */
export function createSuiClearDataSourceCommand(targetWidget: string): SuiCommand {
  return {
    type: SuiCommandType.SCT_clearDataSource,
    parametersWide: [],
    parametersNarrow: [targetWidget],
  };
}

/**
 * Create an SCT_addChildWidget command
 * C++ narrow params: [targetWidget, widgetType, widgetName]
 */
export function createSuiAddChildWidgetCommand(
  targetWidget: string,
  widgetType: string,
  widgetName: string
): SuiCommand {
  return {
    type: SuiCommandType.SCT_addChildWidget,
    parametersWide: [],
    parametersNarrow: [targetWidget, widgetType, widgetName],
  };
}

/**
 * Create an SCT_setProperty command
 * C++ narrow params: [targetWidget, propertyName], wide params: [propertyValue]
 */
export function createSuiSetPropertyCommand(
  targetWidget: string,
  propertyName: string,
  propertyValue: string
): SuiCommand {
  return {
    type: SuiCommandType.SCT_setProperty,
    parametersWide: [propertyValue],
    parametersNarrow: [targetWidget, propertyName],
  };
}

/**
 * Create an SCT_addDataItem command
 * C++ narrow params: [targetWidget, dataItemName], wide params: [dataItemValue]
 */
export function createSuiAddDataItemCommand(
  targetWidget: string,
  dataItemName: string,
  dataItemValue: string
): SuiCommand {
  return {
    type: SuiCommandType.SCT_addDataItem,
    parametersWide: [dataItemValue],
    parametersNarrow: [targetWidget, dataItemName],
  };
}

/**
 * Create an SCT_subscribeToEvent command
 * C++ narrow params: [targetWidget, eventTypeChar, callback, ...pairs of widgetName+propertyName]
 *
 * @param targetWidget - the widget to subscribe to
 * @param eventType - event type integer (stored as single char in C++)
 * @param callback - callback name (not used on client)
 * @param propertySubscriptions - pairs of [widgetName, propertyName] to subscribe
 */
export function createSuiSubscribeToEventCommand(
  targetWidget: string,
  eventType: number,
  callback: string,
  propertySubscriptions: Array<{ widgetName: string; propertyName: string }> = []
): SuiCommand {
  // Event type is stored as a single character string
  const eventTypeStr = String.fromCharCode(eventType);
  const narrowParams = [targetWidget, eventTypeStr, callback];

  for (const sub of propertySubscriptions) {
    narrowParams.push(sub.widgetName);
    narrowParams.push(sub.propertyName);
  }

  return {
    type: SuiCommandType.SCT_subscribeToEvent,
    parametersWide: [],
    parametersNarrow: narrowParams,
  };
}

/**
 * Create an SCT_addDataSourceContainer command
 * C++ narrow params: [targetWidget, containerName], wide params: [containerValue]
 */
export function createSuiAddDataSourceContainerCommand(
  targetWidget: string,
  containerName: string,
  containerValue: string
): SuiCommand {
  return {
    type: SuiCommandType.SCT_addDataSourceContainer,
    parametersWide: [containerValue],
    parametersNarrow: [targetWidget, containerName],
  };
}

/**
 * Create an SCT_clearDataSourceContainer command
 * C++ narrow params: [targetWidget]
 */
export function createSuiClearDataSourceContainerCommand(targetWidget: string): SuiCommand {
  return {
    type: SuiCommandType.SCT_clearDataSourceContainer,
    parametersWide: [],
    parametersNarrow: [targetWidget],
  };
}

/**
 * Create an SCT_addDataSource command
 * C++ narrow params: [targetWidget, dataSourceName], wide params: [dataSourceValue]
 */
export function createSuiAddDataSourceCommand(
  targetWidget: string,
  dataSourceName: string,
  dataSourceValue: string
): SuiCommand {
  return {
    type: SuiCommandType.SCT_addDataSource,
    parametersWide: [dataSourceValue],
    parametersNarrow: [targetWidget, dataSourceName],
  };
}

// ============================================
// SuiPageData Helper Factory
// ============================================

/**
 * Create a new SuiPageData with default values
 *
 * The default associatedLocation is Vector::maxXYZ (3.402823466e+38 for each component)
 * which the C++ code uses as the "unset" sentinel value.
 */
export function createSuiPageData(
  pageId: number,
  pageName: string,
  commands: SuiCommand[] = [],
  associatedObjectId: bigint = 0n,
  maxRangeFromObject: number = 0
): SuiPageData {
  return {
    pageId,
    pageName,
    commands,
    associatedObjectId,
    // Vector::maxXYZ = FLT_MAX for each component (sentinel for "unset")
    associatedLocationX: 3.4028234663852886e+38,
    associatedLocationY: 3.4028234663852886e+38,
    associatedLocationZ: 3.4028234663852886e+38,
    maxRangeFromObject,
  };
}

// ============================================
// Union Types and Utilities
// ============================================

/**
 * Union type of all SUI messages
 */
export type SuiMessage =
  | SuiCreatePageMessage
  | SuiUpdatePageMessage
  | SuiEventNotification
  | SuiForceClosePage
  | ConGenericMessage;

/**
 * Get the opcode from raw SUI message data
 */
export function getSuiMessageOpcode(data: Uint8Array): number {
  if (data.length < 6) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  reader.readUInt16LE(); // operandCount
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid SUI message opcode
 */
export function isSuiMessageOpcode(
  opcode: number
): opcode is SuiMessageOpcodeType {
  return Object.values(SuiMessageOpcode).includes(
    opcode as SuiMessageOpcodeType
  );
}
