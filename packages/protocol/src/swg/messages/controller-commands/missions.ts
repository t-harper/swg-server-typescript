/**
 * Mission Controller Command Payloads
 *
 * Payloads for ObjControllerMessage with messageType:
 *   - CM_missionListRequest    (245) - Client->Server
 *   - CM_missionListResponse   (246) - Server->Client
 *   - CM_missionDetailsRequest (247) - Client->Server
 *   - CM_missionDetailsResponse(248) - Server->Client
 *   - CM_missionAcceptRequest  (249) - Client->Server
 *   - CM_missionCreateRequest  (255) - Server->Client
 *   - CM_missionAbort          (322) - Client->Server
 *
 * These are NOT standalone GameNetworkMessages -- they serialize/deserialize
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 *
 * C++ source: MessageQueueMissionListRequest, MessageQueueMissionListResponse,
 *             MessageQueueMissionDetailsRequest, MessageQueueMissionDetailsResponse,
 *             MessageQueueMissionGenericRequest, MessageQueueMissionAbort
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';
import type { StringId } from './npc-conversation.js';
export type { StringId } from './npc-conversation.js';

/**
 * Location - SWG world/cell position reference
 * Wire format: f32(x) + f32(y) + f32(z) + u64(cellId) + u32(sceneIdCrc)
 */
export interface Location {
  x: number;
  y: number;
  z: number;
  cellId: bigint;
  sceneIdCrc: number;
}

// ============================================
// StringId Helpers
// ============================================

/**
 * Write a StringId to the buffer in SWG wire format.
 * Format: string_u16LE(table) + u32LE(textIndex) + string_u16LE(text)
 */
function writeStringId(writer: BufferWriter, sid: StringId): void {
  writer.writeStringWithLength16LE(sid.table);
  writer.writeUInt32LE(sid.textIndex);
  writer.writeStringWithLength16LE(sid.text);
}

/**
 * Read a StringId from the buffer in SWG wire format.
 */
function readStringId(reader: BufferReader): StringId {
  const table = reader.readStringWithLength16LE();
  const textIndex = reader.readUInt32LE();
  const text = reader.readStringWithLength16LE();
  return { table, textIndex, text };
}

// ============================================
// Location Helpers
// ============================================

/**
 * Write a Location to the buffer in SWG wire format.
 * Format: f32(x) + f32(y) + f32(z) + u64(cellId) + u32(sceneIdCrc)
 */
function writeLocation(writer: BufferWriter, loc: Location): void {
  writer.writeFloatLE(loc.x);
  writer.writeFloatLE(loc.y);
  writer.writeFloatLE(loc.z);
  writer.writeUInt64LE(loc.cellId);
  writer.writeUInt32LE(loc.sceneIdCrc);
}

/**
 * Read a Location from the buffer in SWG wire format.
 */
function readLocation(reader: BufferReader): Location {
  const x = reader.readFloatLE();
  const y = reader.readFloatLE();
  const z = reader.readFloatLE();
  const cellId = reader.readUInt64LE();
  const sceneIdCrc = reader.readUInt32LE();
  return { x, y, z, cellId, sceneIdCrc };
}

// ============================================
// CM_missionListRequest (245) - Client->Server
// ============================================

/**
 * MissionListRequest - Client requests the list of available missions from a terminal
 *
 * C++ source: MessageQueueMissionListRequest
 * Wire format:
 *   u64  terminalId  (NetworkId)
 *   u8   flags
 *   u8   sequenceId
 */
export interface MissionListRequestMessage {
  /** NetworkId of the mission terminal */
  terminalId: bigint;
  /** Request flags */
  flags: number;
  /** Sequence identifier for request/response matching */
  sequenceId: number;
}

/**
 * Serialize a MissionListRequestMessage payload to wire format.
 */
export function serializeMissionListRequest(
  msg: MissionListRequestMessage
): Uint8Array {
  const writer = new BufferWriter(10);
  writer.writeUInt64LE(msg.terminalId);  // NetworkId
  writer.writeUInt8(msg.flags);          // u8
  writer.writeUInt8(msg.sequenceId);     // u8
  return writer.toBuffer();
}

/**
 * Deserialize a MissionListRequestMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeMissionListRequest(
  data: Uint8Array,
  offset: number = 0
): MissionListRequestMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const terminalId = reader.readUInt64LE();  // NetworkId
  const flags = reader.readUInt8();          // u8
  const sequenceId = reader.readUInt8();     // u8

  return { terminalId, flags, sequenceId };
}

/**
 * Create a MissionListRequestMessage.
 */
export function createMissionListRequest(
  terminalId: bigint,
  flags: number = 0,
  sequenceId: number = 0
): MissionListRequestMessage {
  return { terminalId, flags, sequenceId };
}

// ============================================
// CM_missionListResponse (246) - Server->Client
// ============================================

/**
 * MissionListResponse - Server responds with a list of available mission IDs
 *
 * C++ source: MessageQueueMissionListResponse
 * Wire format:
 *   u32  missionCount
 *   for each mission:
 *     u64  missionId  (NetworkId)
 *   u8   sequenceId
 */
export interface MissionListResponseMessage {
  /** List of available mission NetworkIds */
  missionIds: bigint[];
  /** Sequence identifier matching the original request */
  sequenceId: number;
}

/**
 * Serialize a MissionListResponseMessage payload to wire format.
 */
export function serializeMissionListResponse(
  msg: MissionListResponseMessage
): Uint8Array {
  // 4 (count) + 8 * missionIds.length + 1 (sequenceId)
  const writer = new BufferWriter(4 + 8 * msg.missionIds.length + 1);
  writer.writeUInt32LE(msg.missionIds.length);     // u32 missionCount
  for (const id of msg.missionIds) {
    writer.writeUInt64LE(id);                      // NetworkId
  }
  writer.writeUInt8(msg.sequenceId);               // u8
  return writer.toBuffer();
}

/**
 * Deserialize a MissionListResponseMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeMissionListResponse(
  data: Uint8Array,
  offset: number = 0
): MissionListResponseMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const missionCount = reader.readUInt32LE();      // u32
  const missionIds: bigint[] = [];
  for (let i = 0; i < missionCount; i++) {
    missionIds.push(reader.readUInt64LE());        // NetworkId
  }
  const sequenceId = reader.readUInt8();           // u8

  return { missionIds, sequenceId };
}

/**
 * Create a MissionListResponseMessage.
 */
export function createMissionListResponse(
  missionIds: bigint[],
  sequenceId: number = 0
): MissionListResponseMessage {
  return { missionIds, sequenceId };
}

// ============================================
// CM_missionDetailsRequest (247) - Client->Server
// ============================================

/**
 * MissionDetailsRequest - Client requests details for a specific mission
 *
 * Wire format:
 *   u64  missionId   (NetworkId)
 *   u64  terminalId  (NetworkId)
 *   u8   sequenceId
 */
export interface MissionDetailsRequestMessage {
  /** NetworkId of the mission to get details for */
  missionId: bigint;
  /** NetworkId of the mission terminal */
  terminalId: bigint;
  /** Sequence identifier for request/response matching */
  sequenceId: number;
}

/**
 * Serialize a MissionDetailsRequestMessage payload to wire format.
 */
export function serializeMissionDetailsRequest(
  msg: MissionDetailsRequestMessage
): Uint8Array {
  const writer = new BufferWriter(17);
  writer.writeUInt64LE(msg.missionId);   // NetworkId
  writer.writeUInt64LE(msg.terminalId);  // NetworkId
  writer.writeUInt8(msg.sequenceId);     // u8
  return writer.toBuffer();
}

/**
 * Deserialize a MissionDetailsRequestMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeMissionDetailsRequest(
  data: Uint8Array,
  offset: number = 0
): MissionDetailsRequestMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const missionId = reader.readUInt64LE();   // NetworkId
  const terminalId = reader.readUInt64LE();  // NetworkId
  const sequenceId = reader.readUInt8();     // u8

  return { missionId, terminalId, sequenceId };
}

/**
 * Create a MissionDetailsRequestMessage.
 */
export function createMissionDetailsRequest(
  missionId: bigint,
  terminalId: bigint,
  sequenceId: number = 0
): MissionDetailsRequestMessage {
  return { missionId, terminalId, sequenceId };
}

// ============================================
// CM_missionDetailsResponse (248) - Server->Client
// ============================================

/**
 * MissionDetailsData - Full mission details sent from server to client
 *
 * Wire format:
 *   u64       missionId      (NetworkId)
 *   StringId  title          (string_u16LE + u32LE + string_u16LE)
 *   StringId  description    (string_u16LE + u32LE + string_u16LE)
 *   u8        difficulty
 *   i32       reward
 *   Location  startLocation  (f32 x + f32 y + f32 z + u64 cellId + u32 sceneIdCrc)
 *   Location  destLocation   (f32 x + f32 y + f32 z + u64 cellId + u32 sceneIdCrc)
 *   u32       missionType
 *   u64       targetId       (NetworkId)
 *   u8        sequenceId
 */
export interface MissionDetailsData {
  /** NetworkId of the mission */
  missionId: bigint;
  /** Localized mission title */
  title: StringId;
  /** Localized mission description */
  description: StringId;
  /** Mission difficulty level (u8) */
  difficulty: number;
  /** Credit reward (i32) */
  reward: number;
  /** Starting location */
  startLocation: Location;
  /** Destination location */
  destLocation: Location;
  /** Mission type identifier (u32) */
  missionType: number;
  /** NetworkId of the mission target */
  targetId: bigint;
  /** Sequence identifier matching the original request */
  sequenceId: number;
}

/**
 * Serialize a MissionDetailsData payload to wire format.
 */
export function serializeMissionDetailsResponse(
  msg: MissionDetailsData
): Uint8Array {
  const writer = new BufferWriter(256);

  writer.writeUInt64LE(msg.missionId);          // NetworkId
  writeStringId(writer, msg.title);             // StringId
  writeStringId(writer, msg.description);       // StringId
  writer.writeUInt8(msg.difficulty);            // u8
  writer.writeInt32LE(msg.reward);              // i32
  writeLocation(writer, msg.startLocation);     // Location
  writeLocation(writer, msg.destLocation);      // Location
  writer.writeUInt32LE(msg.missionType);        // u32
  writer.writeUInt64LE(msg.targetId);           // NetworkId
  writer.writeUInt8(msg.sequenceId);            // u8

  return writer.toBuffer();
}

/**
 * Deserialize a MissionDetailsData payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeMissionDetailsResponse(
  data: Uint8Array,
  offset: number = 0
): MissionDetailsData {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const missionId = reader.readUInt64LE();          // NetworkId
  const title = readStringId(reader);               // StringId
  const description = readStringId(reader);         // StringId
  const difficulty = reader.readUInt8();            // u8
  const reward = reader.readInt32LE();              // i32
  const startLocation = readLocation(reader);       // Location
  const destLocation = readLocation(reader);        // Location
  const missionType = reader.readUInt32LE();        // u32
  const targetId = reader.readUInt64LE();           // NetworkId
  const sequenceId = reader.readUInt8();            // u8

  return {
    missionId,
    title,
    description,
    difficulty,
    reward,
    startLocation,
    destLocation,
    missionType,
    targetId,
    sequenceId,
  };
}

/**
 * Create a MissionDetailsData payload.
 */
export function createMissionDetailsResponse(
  missionId: bigint,
  title: StringId,
  description: StringId,
  difficulty: number,
  reward: number,
  startLocation: Location,
  destLocation: Location,
  missionType: number,
  targetId: bigint,
  sequenceId: number = 0
): MissionDetailsData {
  return {
    missionId,
    title,
    description,
    difficulty,
    reward,
    startLocation,
    destLocation,
    missionType,
    targetId,
    sequenceId,
  };
}

// ============================================
// CM_missionAcceptRequest (249) - Client->Server
// ============================================

/**
 * MissionAcceptRequest - Client accepts a mission from a terminal
 *
 * C++ source: MissionGenericRequest
 * Wire format:
 *   u64  missionId   (NetworkId)
 *   u64  terminalId  (NetworkId)
 *   u8   sequenceId
 */
export interface MissionAcceptRequestMessage {
  /** NetworkId of the mission being accepted */
  missionId: bigint;
  /** NetworkId of the mission terminal */
  terminalId: bigint;
  /** Sequence identifier for request/response matching */
  sequenceId: number;
}

/**
 * Serialize a MissionAcceptRequestMessage payload to wire format.
 */
export function serializeMissionAcceptRequest(
  msg: MissionAcceptRequestMessage
): Uint8Array {
  const writer = new BufferWriter(17);
  writer.writeUInt64LE(msg.missionId);   // NetworkId
  writer.writeUInt64LE(msg.terminalId);  // NetworkId
  writer.writeUInt8(msg.sequenceId);     // u8
  return writer.toBuffer();
}

/**
 * Deserialize a MissionAcceptRequestMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeMissionAcceptRequest(
  data: Uint8Array,
  offset: number = 0
): MissionAcceptRequestMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const missionId = reader.readUInt64LE();   // NetworkId
  const terminalId = reader.readUInt64LE();  // NetworkId
  const sequenceId = reader.readUInt8();     // u8

  return { missionId, terminalId, sequenceId };
}

/**
 * Create a MissionAcceptRequestMessage.
 */
export function createMissionAcceptRequest(
  missionId: bigint,
  terminalId: bigint,
  sequenceId: number = 0
): MissionAcceptRequestMessage {
  return { missionId, terminalId, sequenceId };
}

// ============================================
// CM_missionAbort (322) - Client->Server
// ============================================

/**
 * MissionAbort - Client aborts an active mission
 *
 * Wire format:
 *   u64  missionId  (NetworkId)
 */
export interface MissionAbortMessage {
  /** NetworkId of the mission being aborted */
  missionId: bigint;
}

/**
 * Serialize a MissionAbortMessage payload to wire format.
 */
export function serializeMissionAbort(msg: MissionAbortMessage): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt64LE(msg.missionId);  // NetworkId
  return writer.toBuffer();
}

/**
 * Deserialize a MissionAbortMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeMissionAbort(
  data: Uint8Array,
  offset: number = 0
): MissionAbortMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const missionId = reader.readUInt64LE();  // NetworkId

  return { missionId };
}

/**
 * Create a MissionAbortMessage.
 */
export function createMissionAbort(missionId: bigint): MissionAbortMessage {
  return { missionId };
}

// ============================================
// CM_missionCreateRequest (255) - Server->Client
// ============================================

/**
 * MissionCreateRequest - Server tells client a mission object has been created
 *
 * Wire format:
 *   u64  missionId   (NetworkId)
 *   u8   sequenceId
 */
export interface MissionCreateRequestMessage {
  /** NetworkId of the newly created mission */
  missionId: bigint;
  /** Sequence identifier */
  sequenceId: number;
}

/**
 * Serialize a MissionCreateRequestMessage payload to wire format.
 */
export function serializeMissionCreateRequest(
  msg: MissionCreateRequestMessage
): Uint8Array {
  const writer = new BufferWriter(9);
  writer.writeUInt64LE(msg.missionId);  // NetworkId
  writer.writeUInt8(msg.sequenceId);    // u8
  return writer.toBuffer();
}

/**
 * Deserialize a MissionCreateRequestMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeMissionCreateRequest(
  data: Uint8Array,
  offset: number = 0
): MissionCreateRequestMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const missionId = reader.readUInt64LE();  // NetworkId
  const sequenceId = reader.readUInt8();    // u8

  return { missionId, sequenceId };
}

/**
 * Create a MissionCreateRequestMessage.
 */
export function createMissionCreateRequest(
  missionId: bigint,
  sequenceId: number = 0
): MissionCreateRequestMessage {
  return { missionId, sequenceId };
}
