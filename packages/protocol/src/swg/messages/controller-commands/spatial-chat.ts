/**
 * SpatialChat Controller Command Payload
 *
 * This is the payload portion of an ObjControllerMessage for spatial chat.
 * It does NOT include the ObjControllerMessage header (flags, messageType,
 * networkId, value) or any operandCount/opcode prefix.
 *
 * C++ source: MessageQueueSpatialChat / MessageQueueSpatialChatArchive
 *
 * Wire format (Archive serialization order matching member declaration):
 *   1. text         - Unicode::String (u32LE charCount + utf16le)
 *   2. sourceId     - NetworkId (u64LE)
 *   3. targetId     - NetworkId (u64LE)
 *   4. flags        - u32LE
 *   5. volume       - u16LE
 *   6. chatType     - u16LE
 *   7. moodType     - u16LE
 *   8. language     - u8
 *   9. outOfBand    - Unicode::String (u32LE charCount + utf16le)
 *  10. sourceName   - Unicode::String (u32LE charCount + utf16le)
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

/**
 * SpatialChat flag constants from MessageQueueSpatialChat::Flags
 */
export const SpatialChatFlags = {
  /** Message is private (whisper/tell) */
  F_isPrivate: 0x0001,
  /** Skip sending to the target */
  F_skipTarget: 0x0002,
  /** Skip sending to the source */
  F_skipSource: 0x0004,
  /** Send only to the target */
  F_targetOnly: 0x0008,
  /** Send only to the target's group */
  F_targetGroupOnly: 0x0010,
  /** Ship pilot channel */
  F_shipPilot: 0x0020,
  /** Ship operations channel */
  F_shipOperations: 0x0040,
  /** Ship gunner channel */
  F_shipGunner: 0x0080,
  /** Combined ship channel (pilot | operations | gunner) */
  F_ship: 0x00e0,
  /** Send to both target and source group */
  F_targetAndSourceGroup: 0x0100,
} as const;

export type SpatialChatFlagsType =
  (typeof SpatialChatFlags)[keyof typeof SpatialChatFlags];

/**
 * SpatialChatMessage - Spatial chat controller command payload
 */
export interface SpatialChatMessage {
  text: string;
  sourceId: bigint;
  targetId: bigint;
  flags: number;
  volume: number;
  chatType: number;
  moodType: number;
  language: number;
  outOfBand: string;
  sourceName: string;
}

/**
 * Serialize a SpatialChatMessage payload
 * Writes fields in C++ Archive member declaration order
 */
export function serializeSpatialChat(msg: SpatialChatMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUnicodeStringWithLength(msg.text);       // Unicode::String
  writer.writeUInt64LE(msg.sourceId);                  // NetworkId
  writer.writeUInt64LE(msg.targetId);                  // NetworkId
  writer.writeUInt32LE(msg.flags);                     // u32
  writer.writeUInt16LE(msg.volume);                    // u16
  writer.writeUInt16LE(msg.chatType);                  // u16
  writer.writeUInt16LE(msg.moodType);                  // u16
  writer.writeUInt8(msg.language);                     // u8
  writer.writeUnicodeStringWithLength(msg.outOfBand);  // Unicode::String
  writer.writeUnicodeStringWithLength(msg.sourceName); // Unicode::String
  return writer.toBuffer();
}

/**
 * Deserialize a SpatialChatMessage payload
 * @param data - The raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to skip before reading
 */
export function deserializeSpatialChat(
  data: Uint8Array,
  offset: number = 0
): SpatialChatMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const text = reader.readUnicodeStringWithLength();       // Unicode::String
  const sourceId = reader.readUInt64LE();                  // NetworkId
  const targetId = reader.readUInt64LE();                  // NetworkId
  const flags = reader.readUInt32LE();                     // u32
  const volume = reader.readUInt16LE();                    // u16
  const chatType = reader.readUInt16LE();                  // u16
  const moodType = reader.readUInt16LE();                  // u16
  const language = reader.readUInt8();                     // u8
  const outOfBand = reader.readUnicodeStringWithLength();  // Unicode::String
  const sourceName = reader.readUnicodeStringWithLength(); // Unicode::String

  return {
    text,
    sourceId,
    targetId,
    flags,
    volume,
    chatType,
    moodType,
    language,
    outOfBand,
    sourceName,
  };
}

/**
 * Create a SpatialChatMessage payload
 */
export function createSpatialChat(
  sourceId: bigint,
  targetId: bigint,
  text: string,
  chatType: number = 0,
  moodType: number = 0,
  flags: number = 0,
  volume: number = 0,
  language: number = 0,
  outOfBand: string = '',
  sourceName: string = ''
): SpatialChatMessage {
  return {
    text,
    sourceId,
    targetId,
    flags,
    volume,
    chatType,
    moodType,
    language,
    outOfBand,
    sourceName,
  };
}
