/**
 * NPC Conversation Controller Command Payloads
 *
 * Payloads for ObjControllerMessage with messageTypes:
 *   - CM_npcConversationStart          (222) - Server->Client
 *   - CM_npcConversationStop           (223) - Server->Client
 *   - CM_npcConversationMessage        (224) - Server->Client
 *   - CM_npcConversationResponses      (225) - Server->Client
 *   - CM_npcConversationSelect         (226) - Client->Server
 *   - CM_forwardNpcConversationMessage (357) - Server->Client
 *
 * These are NOT standalone GameNetworkMessages -- they serialize/deserialize
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 *
 * C++ source: MessageQueueStartNpcConversation, MessageQueueStopNpcConversation,
 *             MessageQueueNpcConversationMessage, MessageQueueStringList
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// ============================================
// Shared Types
// ============================================

/**
 * StringId - SWG localized string identifier
 *
 * Wire format:
 *   string table    (u16LE length + ASCII)
 *   u32LE textIndex
 *   string text     (u16LE length + ASCII)
 */
export interface StringId {
  table: string;
  textIndex: number;
  text: string;
}

/**
 * ConversationStarter enum - who initiated the conversation
 */
export const ConversationStarter = {
  CS_Player: 0,
  CS_NPC: 1,
} as const;

export type ConversationStarterType =
  (typeof ConversationStarter)[keyof typeof ConversationStarter];

// ============================================
// StringId Helpers
// ============================================

/**
 * Write a StringId to a BufferWriter
 */
function writeStringId(writer: BufferWriter, stringId: StringId): void {
  writer.writeStringWithLength16LE(stringId.table);
  writer.writeUInt32LE(stringId.textIndex);
  writer.writeStringWithLength16LE(stringId.text);
}

/**
 * Read a StringId from a BufferReader
 */
function readStringId(reader: BufferReader): StringId {
  const table = reader.readStringWithLength16LE();
  const textIndex = reader.readUInt32LE();
  const text = reader.readStringWithLength16LE();
  return { table, textIndex, text };
}

// ============================================
// CM_npcConversationStart (222)
// ============================================

/**
 * NpcConversationStartMessage - Start an NPC conversation
 *
 * C++ source: MessageQueueStartNpcConversation
 *
 * Wire format:
 *   NetworkId npc                       (u64LE)
 *   i32 starter                         (ConversationStarter enum)
 *   string conversationName             (u16LE length + ASCII)
 *   u32 appearanceOverrideTemplateCrc   (u32LE)
 */
export interface NpcConversationStartMessage {
  /** NetworkId of the NPC */
  npc: bigint;
  /** Who started the conversation (CS_Player=0, CS_NPC=1) */
  starter: number;
  /** Name of the conversation script/template */
  conversationName: string;
  /** CRC of appearance override template (0 for none) */
  appearanceOverrideTemplateCrc: number;
}

/**
 * Serialize a NpcConversationStartMessage payload
 * Writes fields in C++ pack order: npc, starter, conversationName, appearanceOverrideTemplateCrc
 */
export function serializeNpcConversationStart(
  msg: NpcConversationStartMessage
): Uint8Array {
  const writer = new BufferWriter(128);

  writer.writeUInt64LE(msg.npc);                              // NetworkId
  writer.writeInt32LE(msg.starter);                           // i32 enum
  writer.writeStringWithLength16LE(msg.conversationName);     // string
  writer.writeUInt32LE(msg.appearanceOverrideTemplateCrc);    // u32

  return writer.toBuffer();
}

/**
 * Deserialize a NpcConversationStartMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeNpcConversationStart(
  data: Uint8Array,
  offset: number = 0
): NpcConversationStartMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const npc = reader.readUInt64LE();                              // NetworkId
  const starter = reader.readInt32LE();                           // i32 enum
  const conversationName = reader.readStringWithLength16LE();     // string
  const appearanceOverrideTemplateCrc = reader.readUInt32LE();    // u32

  return { npc, starter, conversationName, appearanceOverrideTemplateCrc };
}

/**
 * Create a NpcConversationStartMessage payload
 */
export function createNpcConversationStart(
  npc: bigint,
  starter: number = ConversationStarter.CS_NPC,
  conversationName: string = '',
  appearanceOverrideTemplateCrc: number = 0
): NpcConversationStartMessage {
  return { npc, starter, conversationName, appearanceOverrideTemplateCrc };
}

// ============================================
// CM_npcConversationStop (223)
// ============================================

/**
 * NpcConversationStopMessage - Stop an NPC conversation
 *
 * C++ source: MessageQueueStopNpcConversation
 *
 * Wire format:
 *   NetworkId npc                   (u64LE)
 *   StringId finalMessageId         (table:string + textIndex:u32 + text:string)
 *   Unicode::String finalMessageProse (u32LE charCount + utf16le)
 *   Unicode::String finalResponse   (u32LE charCount + utf16le)
 */
export interface NpcConversationStopMessage {
  /** NetworkId of the NPC */
  npc: bigint;
  /** Final localized message identifier */
  finalMessageId: StringId;
  /** Final prose/template text (Unicode) */
  finalMessageProse: string;
  /** Final response text shown to the player (Unicode) */
  finalResponse: string;
}

/**
 * Serialize a NpcConversationStopMessage payload
 * Writes fields in C++ pack order: npc, finalMessageId, finalMessageProse, finalResponse
 */
export function serializeNpcConversationStop(
  msg: NpcConversationStopMessage
): Uint8Array {
  const writer = new BufferWriter(256);

  writer.writeUInt64LE(msg.npc);                                    // NetworkId
  writeStringId(writer, msg.finalMessageId);                        // StringId
  writer.writeUnicodeStringWithLength(msg.finalMessageProse);       // Unicode::String
  writer.writeUnicodeStringWithLength(msg.finalResponse);           // Unicode::String

  return writer.toBuffer();
}

/**
 * Deserialize a NpcConversationStopMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeNpcConversationStop(
  data: Uint8Array,
  offset: number = 0
): NpcConversationStopMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const npc = reader.readUInt64LE();                                    // NetworkId
  const finalMessageId = readStringId(reader);                          // StringId
  const finalMessageProse = reader.readUnicodeStringWithLength();       // Unicode::String
  const finalResponse = reader.readUnicodeStringWithLength();           // Unicode::String

  return { npc, finalMessageId, finalMessageProse, finalResponse };
}

/**
 * Create a NpcConversationStopMessage payload
 */
export function createNpcConversationStop(
  npc: bigint,
  finalMessageId: StringId = { table: '', textIndex: 0, text: '' },
  finalMessageProse: string = '',
  finalResponse: string = ''
): NpcConversationStopMessage {
  return { npc, finalMessageId, finalMessageProse, finalResponse };
}

// ============================================
// CM_npcConversationMessage (224)
// ============================================

/**
 * NpcConversationMessageMessage - A single NPC conversation message
 *
 * C++ source: MessageQueueNpcConversationMessage
 *
 * Wire format:
 *   Unicode::String message (u32LE charCount + utf16le)
 */
export interface NpcConversationMessageMessage {
  /** The conversation message text (Unicode) */
  message: string;
}

/**
 * Serialize a NpcConversationMessageMessage payload
 */
export function serializeNpcConversationMessage(
  msg: NpcConversationMessageMessage
): Uint8Array {
  const writer = new BufferWriter(256);

  writer.writeUnicodeStringWithLength(msg.message); // Unicode::String

  return writer.toBuffer();
}

/**
 * Deserialize a NpcConversationMessageMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeNpcConversationMessage(
  data: Uint8Array,
  offset: number = 0
): NpcConversationMessageMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const message = reader.readUnicodeStringWithLength(); // Unicode::String

  return { message };
}

/**
 * Create a NpcConversationMessageMessage payload
 */
export function createNpcConversationMessage(
  message: string
): NpcConversationMessageMessage {
  return { message };
}

// ============================================
// CM_npcConversationResponses (225)
// ============================================

/**
 * NpcConversationResponsesMessage - List of available conversation responses
 *
 * C++ source: MessageQueueStringList
 *
 * Wire format:
 *   u32 count
 *   for each:
 *     Unicode::String response (u32LE charCount + utf16le)
 */
export interface NpcConversationResponsesMessage {
  /** List of response options the player can choose from */
  responses: string[];
}

/**
 * Serialize a NpcConversationResponsesMessage payload
 */
export function serializeNpcConversationResponses(
  msg: NpcConversationResponsesMessage
): Uint8Array {
  const writer = new BufferWriter(512);

  writer.writeUInt32LE(msg.responses.length); // u32 count
  for (const response of msg.responses) {
    writer.writeUnicodeStringWithLength(response); // Unicode::String
  }

  return writer.toBuffer();
}

/**
 * Deserialize a NpcConversationResponsesMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeNpcConversationResponses(
  data: Uint8Array,
  offset: number = 0
): NpcConversationResponsesMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const count = reader.readUInt32LE(); // u32 count
  const responses: string[] = [];
  for (let i = 0; i < count; i++) {
    responses.push(reader.readUnicodeStringWithLength()); // Unicode::String
  }

  return { responses };
}

/**
 * Create a NpcConversationResponsesMessage payload
 */
export function createNpcConversationResponses(
  responses: string[] = []
): NpcConversationResponsesMessage {
  return { responses };
}

// ============================================
// CM_npcConversationSelect (226)
// ============================================

/**
 * NpcConversationSelectMessage - Player selects a conversation response
 *
 * No payload -- the selection index is carried in the ObjControllerMessage
 * header's "value" field. This struct and its serialize/deserialize are
 * provided as stubs for consistency.
 */
export interface NpcConversationSelectMessage {
  // Empty -- no payload beyond the ObjControllerMessage header
}

/**
 * Serialize a NpcConversationSelectMessage payload (empty)
 */
export function serializeNpcConversationSelect(
  _msg: NpcConversationSelectMessage
): Uint8Array {
  return new Uint8Array(0);
}

/**
 * Deserialize a NpcConversationSelectMessage payload (empty)
 * @param _data   - Raw payload bytes (after ObjControllerMessage header)
 * @param _offset - Optional byte offset to start reading from
 */
export function deserializeNpcConversationSelect(
  _data: Uint8Array,
  _offset: number = 0
): NpcConversationSelectMessage {
  return {};
}

/**
 * Create a NpcConversationSelectMessage payload (empty)
 */
export function createNpcConversationSelect(): NpcConversationSelectMessage {
  return {};
}

// ============================================
// CM_forwardNpcConversationMessage (357)
// ============================================

/**
 * ForwardNpcConversationMessage - Forward a conversation message to the client
 *
 * Wire format (simplified from C++ pair<pair<StringId, ProsePackage>, Unicode>):
 *   StringId stringId                (table:string + textIndex:u32 + text:string)
 *   Unicode::String prosePackage     (u32LE charCount + utf16le) -- simplified ProsePackage as text
 *   Unicode::String outOfBand        (u32LE charCount + utf16le)
 *
 * Note: The full C++ ProsePackage format is complex. For now we serialize it
 * as a simple Unicode string. This is sufficient for basic NPC conversation text.
 */
export interface ForwardNpcConversationMessage {
  /** Localized string identifier */
  stringId: StringId;
  /** Prose package text (simplified as Unicode string) */
  prosePackage: string;
  /** Out-of-band data (Unicode) */
  outOfBand: string;
}

/**
 * Serialize a ForwardNpcConversationMessage payload
 * Writes fields in order: stringId, prosePackage, outOfBand
 */
export function serializeForwardNpcConversationMessage(
  msg: ForwardNpcConversationMessage
): Uint8Array {
  const writer = new BufferWriter(256);

  writeStringId(writer, msg.stringId);                        // StringId
  writer.writeUnicodeStringWithLength(msg.prosePackage);      // Unicode::String (simplified ProsePackage)
  writer.writeUnicodeStringWithLength(msg.outOfBand);         // Unicode::String

  return writer.toBuffer();
}

/**
 * Deserialize a ForwardNpcConversationMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeForwardNpcConversationMessage(
  data: Uint8Array,
  offset: number = 0
): ForwardNpcConversationMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const stringId = readStringId(reader);                          // StringId
  const prosePackage = reader.readUnicodeStringWithLength();      // Unicode::String (simplified ProsePackage)
  const outOfBand = reader.readUnicodeStringWithLength();         // Unicode::String

  return { stringId, prosePackage, outOfBand };
}

/**
 * Create a ForwardNpcConversationMessage payload
 */
export function createForwardNpcConversationMessage(
  stringId: StringId = { table: '', textIndex: 0, text: '' },
  prosePackage: string = '',
  outOfBand: string = ''
): ForwardNpcConversationMessage {
  return { stringId, prosePackage, outOfBand };
}
