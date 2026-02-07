/**
 * Social Controller Command Payload
 *
 * This is the payload portion of an ObjControllerMessage for social/emote actions.
 * It does NOT include the ObjControllerMessage header (flags, messageType,
 * networkId, value) or any operandCount/opcode prefix.
 *
 * C++ source: MessageQueueSocial
 *
 * Wire format (from MessageQueueSocial::pack/unpack):
 *   1. sourceId   - NetworkId (u64LE)
 *   2. targetId   - NetworkId (u64LE)
 *   3. socialType - u32LE (index into social type table, e.g. bow, wave, etc.)
 *   4. flags      - u32LE
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

/**
 * SocialMessage - Social/emote controller command payload
 */
export interface SocialMessage {
  sourceId: bigint;
  targetId: bigint;
  socialType: number;
  flags: number;
}

/**
 * Serialize a SocialMessage payload
 * Writes fields in C++ pack order: sourceId, targetId, socialType, flags
 */
export function serializeSocial(msg: SocialMessage): Uint8Array {
  const writer = new BufferWriter(24);
  writer.writeUInt64LE(msg.sourceId);   // NetworkId
  writer.writeUInt64LE(msg.targetId);   // NetworkId
  writer.writeUInt32LE(msg.socialType); // u32
  writer.writeUInt32LE(msg.flags);      // u32
  return writer.toBuffer();
}

/**
 * Deserialize a SocialMessage payload
 * @param data - The raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to skip before reading
 */
export function deserializeSocial(
  data: Uint8Array,
  offset: number = 0
): SocialMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const sourceId = reader.readUInt64LE();   // NetworkId
  const targetId = reader.readUInt64LE();   // NetworkId
  const socialType = reader.readUInt32LE(); // u32
  const flags = reader.readUInt32LE();      // u32

  return {
    sourceId,
    targetId,
    socialType,
    flags,
  };
}

/**
 * Create a SocialMessage payload
 */
export function createSocial(
  sourceId: bigint,
  targetId: bigint,
  socialType: number,
  flags: number = 0
): SocialMessage {
  return {
    sourceId,
    targetId,
    socialType,
    flags,
  };
}
