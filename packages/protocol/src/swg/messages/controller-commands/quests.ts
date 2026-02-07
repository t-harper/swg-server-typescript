/**
 * Quest Controller Command Payloads
 *
 * Payloads for ObjControllerMessage with messageType:
 *   - CM_questTaskCounterData   (1089) - Server->Client
 *   - CM_questTaskTimerData     (1092) - Server->Client
 *   - CM_questTaskLocationData  (1213) - Server->Client
 *   - CM_requestActivateQuest   (1207) - Client->Server
 *   - CM_requestCompleteQuest   (1208) - Client->Server
 *   - CM_forceActivateQuest     (1215) - Server->Client
 *   - CM_setCurrentQuest        (579)  - Client->Server
 *   - CM_abandonPlayerQuest     (1247) - Client->Server
 *
 * These are NOT standalone GameNetworkMessages -- they serialize/deserialize
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 *
 * C++ sources:
 *   MessageQueueQuestTaskCounterData.cpp
 *   MessageQueueQuestTaskTimerData.cpp
 *   MessageQueueQuestTaskLocationData.cpp
 *   MessageQueueGenericValueType (int/NetworkId)
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// ============================================
// Shared Types
// ============================================

/**
 * QuestLocation - SWG world/cell position reference for quest tasks
 * Wire format: f32(x) + f32(y) + f32(z) + u64(cellId) + u32(sceneIdCrc)
 *
 * Defined locally to avoid circular import issues with missions.ts Location.
 */
export interface QuestLocation {
  x: number;
  y: number;
  z: number;
  cellId: bigint;
  sceneIdCrc: number;
}

// ============================================
// QuestLocation Helpers
// ============================================

/**
 * Write a QuestLocation to the buffer in SWG wire format.
 * Format: f32(x) + f32(y) + f32(z) + u64(cellId) + u32(sceneIdCrc)
 */
function writeQuestLocation(writer: BufferWriter, loc: QuestLocation): void {
  writer.writeFloatLE(loc.x);
  writer.writeFloatLE(loc.y);
  writer.writeFloatLE(loc.z);
  writer.writeUInt64LE(loc.cellId);
  writer.writeUInt32LE(loc.sceneIdCrc);
}

/**
 * Read a QuestLocation from the buffer in SWG wire format.
 */
function readQuestLocation(reader: BufferReader): QuestLocation {
  const x = reader.readFloatLE();
  const y = reader.readFloatLE();
  const z = reader.readFloatLE();
  const cellId = reader.readUInt64LE();
  const sceneIdCrc = reader.readUInt32LE();
  return { x, y, z, cellId, sceneIdCrc };
}

// ============================================
// CM_questTaskCounterData (1089) - Server->Client
// ============================================

/**
 * QuestTaskCounterDataMessage - Server sends quest task counter progress to the client.
 *
 * C++ source: MessageQueueQuestTaskCounterData pack/unpack
 *
 * Wire format:
 *   string  questName    (u16LE length + ASCII)
 *   i32     taskId
 *   Unicode sourceName   (u32LE charCount + utf16le)
 *   i32     counterValue
 *   i32     counterMax
 */
export interface QuestTaskCounterDataMessage {
  /** Name of the quest */
  questName: string;
  /** Task identifier within the quest */
  taskId: number;
  /** Display name for the counter source (Unicode) */
  sourceName: string;
  /** Current counter value */
  counterValue: number;
  /** Maximum counter value (task completes when counterValue >= counterMax) */
  counterMax: number;
}

/**
 * Serialize a QuestTaskCounterDataMessage payload to wire format.
 */
export function serializeQuestTaskCounterData(
  msg: QuestTaskCounterDataMessage
): Uint8Array {
  const writer = new BufferWriter(128);

  writer.writeStringWithLength16LE(msg.questName);       // string
  writer.writeInt32LE(msg.taskId);                       // i32
  writer.writeUnicodeStringWithLength(msg.sourceName);   // Unicode::String
  writer.writeInt32LE(msg.counterValue);                 // i32
  writer.writeInt32LE(msg.counterMax);                   // i32

  return writer.toBuffer();
}

/**
 * Deserialize a QuestTaskCounterDataMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeQuestTaskCounterData(
  data: Uint8Array,
  offset: number = 0
): QuestTaskCounterDataMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const questName = reader.readStringWithLength16LE();       // string
  const taskId = reader.readInt32LE();                       // i32
  const sourceName = reader.readUnicodeStringWithLength();   // Unicode::String
  const counterValue = reader.readInt32LE();                 // i32
  const counterMax = reader.readInt32LE();                   // i32

  return { questName, taskId, sourceName, counterValue, counterMax };
}

/**
 * Create a QuestTaskCounterDataMessage.
 *
 * @param questName    - Name of the quest
 * @param taskId       - Task identifier within the quest
 * @param sourceName   - Display name for the counter source (Unicode)
 * @param counterValue - Current counter value
 * @param counterMax   - Maximum counter value
 */
export function createQuestTaskCounterData(
  questName: string,
  taskId: number,
  sourceName: string,
  counterValue: number,
  counterMax: number
): QuestTaskCounterDataMessage {
  return { questName, taskId, sourceName, counterValue, counterMax };
}

// ============================================
// CM_questTaskTimerData (1092) - Server->Client
// ============================================

/**
 * QuestTaskTimerDataMessage - Server sends quest task timer information to the client.
 *
 * C++ source: MessageQueueQuestTaskTimerData pack/unpack
 *
 * Wire format:
 *   string  questName    (u16LE length + ASCII)
 *   i32     taskId
 *   Unicode sourceName   (u32LE charCount + utf16le)
 *   i32     timerLength
 */
export interface QuestTaskTimerDataMessage {
  /** Name of the quest */
  questName: string;
  /** Task identifier within the quest */
  taskId: number;
  /** Display name for the timer source (Unicode) */
  sourceName: string;
  /** Timer duration in seconds */
  timerLength: number;
}

/**
 * Serialize a QuestTaskTimerDataMessage payload to wire format.
 */
export function serializeQuestTaskTimerData(
  msg: QuestTaskTimerDataMessage
): Uint8Array {
  const writer = new BufferWriter(128);

  writer.writeStringWithLength16LE(msg.questName);       // string
  writer.writeInt32LE(msg.taskId);                       // i32
  writer.writeUnicodeStringWithLength(msg.sourceName);   // Unicode::String
  writer.writeInt32LE(msg.timerLength);                  // i32

  return writer.toBuffer();
}

/**
 * Deserialize a QuestTaskTimerDataMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeQuestTaskTimerData(
  data: Uint8Array,
  offset: number = 0
): QuestTaskTimerDataMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const questName = reader.readStringWithLength16LE();       // string
  const taskId = reader.readInt32LE();                       // i32
  const sourceName = reader.readUnicodeStringWithLength();   // Unicode::String
  const timerLength = reader.readInt32LE();                  // i32

  return { questName, taskId, sourceName, timerLength };
}

/**
 * Create a QuestTaskTimerDataMessage.
 *
 * @param questName   - Name of the quest
 * @param taskId      - Task identifier within the quest
 * @param sourceName  - Display name for the timer source (Unicode)
 * @param timerLength - Timer duration in seconds
 */
export function createQuestTaskTimerData(
  questName: string,
  taskId: number,
  sourceName: string,
  timerLength: number
): QuestTaskTimerDataMessage {
  return { questName, taskId, sourceName, timerLength };
}

// ============================================
// CM_questTaskLocationData (1213) - Server->Client
// ============================================

/**
 * QuestTaskLocationDataMessage - Server sends quest task location waypoint to the client.
 *
 * C++ source: MessageQueueQuestTaskLocationData pack/unpack
 *
 * Wire format:
 *   string   questName  (u16LE length + ASCII)
 *   i32      taskId
 *   Location location   (f32 x + f32 y + f32 z + u64 cellId + u32 sceneIdCrc)
 */
export interface QuestTaskLocationDataMessage {
  /** Name of the quest */
  questName: string;
  /** Task identifier within the quest */
  taskId: number;
  /** Target location for the quest task */
  location: QuestLocation;
}

/**
 * Serialize a QuestTaskLocationDataMessage payload to wire format.
 */
export function serializeQuestTaskLocationData(
  msg: QuestTaskLocationDataMessage
): Uint8Array {
  // 2 + questName.length + 4 + 4*3 + 8 + 4 = variable
  const writer = new BufferWriter(128);

  writer.writeStringWithLength16LE(msg.questName);   // string
  writer.writeInt32LE(msg.taskId);                   // i32
  writeQuestLocation(writer, msg.location);          // Location

  return writer.toBuffer();
}

/**
 * Deserialize a QuestTaskLocationDataMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeQuestTaskLocationData(
  data: Uint8Array,
  offset: number = 0
): QuestTaskLocationDataMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const questName = reader.readStringWithLength16LE();   // string
  const taskId = reader.readInt32LE();                   // i32
  const location = readQuestLocation(reader);            // Location

  return { questName, taskId, location };
}

/**
 * Create a QuestTaskLocationDataMessage.
 *
 * @param questName - Name of the quest
 * @param taskId    - Task identifier within the quest
 * @param location  - Target location for the quest task
 */
export function createQuestTaskLocationData(
  questName: string,
  taskId: number,
  location: QuestLocation
): QuestTaskLocationDataMessage {
  return { questName, taskId, location };
}

// ============================================
// CM_requestActivateQuest (1207) - Client->Server
// ============================================

/**
 * RequestActivateQuestMessage - Client requests to activate a quest.
 *
 * Wire format:
 *   i32  questId
 */
export interface RequestActivateQuestMessage {
  /** Quest identifier */
  questId: number;
}

/**
 * Serialize a RequestActivateQuestMessage payload to wire format.
 */
export function serializeRequestActivateQuest(
  msg: RequestActivateQuestMessage
): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeInt32LE(msg.questId);  // i32
  return writer.toBuffer();
}

/**
 * Deserialize a RequestActivateQuestMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeRequestActivateQuest(
  data: Uint8Array,
  offset: number = 0
): RequestActivateQuestMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const questId = reader.readInt32LE();  // i32

  return { questId };
}

/**
 * Create a RequestActivateQuestMessage.
 *
 * @param questId - Quest identifier
 */
export function createRequestActivateQuest(
  questId: number
): RequestActivateQuestMessage {
  return { questId };
}

// ============================================
// CM_requestCompleteQuest (1208) - Client->Server
// ============================================

/**
 * RequestCompleteQuestMessage - Client requests to complete a quest.
 *
 * Wire format:
 *   i32  questId
 */
export interface RequestCompleteQuestMessage {
  /** Quest identifier */
  questId: number;
}

/**
 * Serialize a RequestCompleteQuestMessage payload to wire format.
 */
export function serializeRequestCompleteQuest(
  msg: RequestCompleteQuestMessage
): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeInt32LE(msg.questId);  // i32
  return writer.toBuffer();
}

/**
 * Deserialize a RequestCompleteQuestMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeRequestCompleteQuest(
  data: Uint8Array,
  offset: number = 0
): RequestCompleteQuestMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const questId = reader.readInt32LE();  // i32

  return { questId };
}

/**
 * Create a RequestCompleteQuestMessage.
 *
 * @param questId - Quest identifier
 */
export function createRequestCompleteQuest(
  questId: number
): RequestCompleteQuestMessage {
  return { questId };
}

// ============================================
// CM_forceActivateQuest (1215) - Server->Client
// ============================================

/**
 * ForceActivateQuestMessage - Server forces activation of a quest on the client.
 *
 * Wire format:
 *   i32  questId
 */
export interface ForceActivateQuestMessage {
  /** Quest identifier */
  questId: number;
}

/**
 * Serialize a ForceActivateQuestMessage payload to wire format.
 */
export function serializeForceActivateQuest(
  msg: ForceActivateQuestMessage
): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeInt32LE(msg.questId);  // i32
  return writer.toBuffer();
}

/**
 * Deserialize a ForceActivateQuestMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeForceActivateQuest(
  data: Uint8Array,
  offset: number = 0
): ForceActivateQuestMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const questId = reader.readInt32LE();  // i32

  return { questId };
}

/**
 * Create a ForceActivateQuestMessage.
 *
 * @param questId - Quest identifier
 */
export function createForceActivateQuest(
  questId: number
): ForceActivateQuestMessage {
  return { questId };
}

// ============================================
// CM_setCurrentQuest (579) - Client->Server
// ============================================

/**
 * SetCurrentQuestMessage - Client sets their currently tracked quest.
 *
 * Wire format:
 *   u32  questCrc
 */
export interface SetCurrentQuestMessage {
  /** CRC hash of the quest name */
  questCrc: number;
}

/**
 * Serialize a SetCurrentQuestMessage payload to wire format.
 */
export function serializeSetCurrentQuest(
  msg: SetCurrentQuestMessage
): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeUInt32LE(msg.questCrc);  // u32
  return writer.toBuffer();
}

/**
 * Deserialize a SetCurrentQuestMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeSetCurrentQuest(
  data: Uint8Array,
  offset: number = 0
): SetCurrentQuestMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const questCrc = reader.readUInt32LE();  // u32

  return { questCrc };
}

/**
 * Create a SetCurrentQuestMessage.
 *
 * @param questCrc - CRC hash of the quest name
 */
export function createSetCurrentQuest(
  questCrc: number
): SetCurrentQuestMessage {
  return { questCrc };
}

// ============================================
// CM_abandonPlayerQuest (1247) - Client->Server
// ============================================

/**
 * AbandonPlayerQuestMessage - Client abandons an active quest.
 *
 * Wire format:
 *   u64  questObjectId  (NetworkId)
 */
export interface AbandonPlayerQuestMessage {
  /** NetworkId of the quest object being abandoned */
  questObjectId: bigint;
}

/**
 * Serialize an AbandonPlayerQuestMessage payload to wire format.
 */
export function serializeAbandonPlayerQuest(
  msg: AbandonPlayerQuestMessage
): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt64LE(msg.questObjectId);  // NetworkId
  return writer.toBuffer();
}

/**
 * Deserialize an AbandonPlayerQuestMessage payload from wire data.
 *
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeAbandonPlayerQuest(
  data: Uint8Array,
  offset: number = 0
): AbandonPlayerQuestMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const questObjectId = reader.readUInt64LE();  // NetworkId

  return { questObjectId };
}

/**
 * Create an AbandonPlayerQuestMessage.
 *
 * @param questObjectId - NetworkId of the quest object being abandoned
 */
export function createAbandonPlayerQuest(
  questObjectId: bigint
): AbandonPlayerQuestMessage {
  return { questObjectId };
}
