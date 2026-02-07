/**
 * Entertainer / Performance Controller Command Payloads
 *
 * Payloads for ObjControllerMessage with entertainer-related messageTypes:
 *   - CM_setPerformanceType        (352) - Server->Client
 *   - CM_setPerformanceListenTarget(353) - Server->Client
 *   - CM_setPerformanceWatchTarget (354) - Server->Client
 *   - CM_setPerformanceStartTime   (356) - Server->Client
 *   - CM_musicFlourish             (358) - Client->Server
 *   - CM_changeRoleIconChoice     (1101) - Client->Server
 *   - CM_setCurrentWorkingSkill   (1115) - Client->Server
 *   - CM_setProfessionTemplate    (1116) - Client->Server
 *
 * These are NOT standalone GameNetworkMessages -- they serialize/deserialize
 * only the command-specific data that goes AFTER the ObjControllerMessage
 * header (flags, messageType, networkId, value).
 *
 * C++ source: MessageQueueGenericValueType<int>,
 *             MessageQueueGenericValueType<NetworkId>
 */

import { BufferReader, BufferWriter } from '../../../soe/buffer-utils.js';

// ============================================
// CM_setPerformanceType (352) - Server->Client
// ============================================

/**
 * SetPerformanceTypeMessage - Sets the performance type on a creature
 *
 * C++ source: MessageQueueGenericValueType<int>
 * Wire format:
 *   i32  performanceType
 */
export interface SetPerformanceTypeMessage {
  /** Performance type index (i32) */
  performanceType: number;
}

/**
 * Serialize a SetPerformanceTypeMessage payload
 */
export function serializeSetPerformanceType(msg: SetPerformanceTypeMessage): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeInt32LE(msg.performanceType);   // i32
  return writer.toBuffer();
}

/**
 * Deserialize a SetPerformanceTypeMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeSetPerformanceType(
  data: Uint8Array,
  offset: number = 0
): SetPerformanceTypeMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const performanceType = reader.readInt32LE();   // i32

  return { performanceType };
}

/**
 * Create a SetPerformanceTypeMessage payload
 */
export function createSetPerformanceType(
  performanceType: number
): SetPerformanceTypeMessage {
  return { performanceType };
}

// ============================================
// CM_setPerformanceStartTime (356) - Server->Client
// ============================================

/**
 * SetPerformanceStartTimeMessage - Sets the epoch time a performance started
 *
 * C++ source: MessageQueueGenericValueType<int>
 * Wire format:
 *   i32  startTime (server epoch seconds)
 */
export interface SetPerformanceStartTimeMessage {
  /** Performance start time in server epoch seconds (i32) */
  startTime: number;
}

/**
 * Serialize a SetPerformanceStartTimeMessage payload
 */
export function serializeSetPerformanceStartTime(msg: SetPerformanceStartTimeMessage): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeInt32LE(msg.startTime);   // i32
  return writer.toBuffer();
}

/**
 * Deserialize a SetPerformanceStartTimeMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeSetPerformanceStartTime(
  data: Uint8Array,
  offset: number = 0
): SetPerformanceStartTimeMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const startTime = reader.readInt32LE();   // i32

  return { startTime };
}

/**
 * Create a SetPerformanceStartTimeMessage payload
 */
export function createSetPerformanceStartTime(
  startTime: number
): SetPerformanceStartTimeMessage {
  return { startTime };
}

// ============================================
// CM_setPerformanceListenTarget (353) - Server->Client
// ============================================

/**
 * SetPerformanceListenTargetMessage - Sets the target a creature is listening to
 *
 * C++ source: MessageQueueGenericValueType<NetworkId>
 * Wire format:
 *   u64  targetId (NetworkId)
 */
export interface SetPerformanceListenTargetMessage {
  /** NetworkId of the listen target (u64) */
  targetId: bigint;
}

/**
 * Serialize a SetPerformanceListenTargetMessage payload
 */
export function serializeSetPerformanceListenTarget(msg: SetPerformanceListenTargetMessage): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt64LE(msg.targetId);   // NetworkId (u64)
  return writer.toBuffer();
}

/**
 * Deserialize a SetPerformanceListenTargetMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeSetPerformanceListenTarget(
  data: Uint8Array,
  offset: number = 0
): SetPerformanceListenTargetMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const targetId = reader.readUInt64LE();   // NetworkId (u64)

  return { targetId };
}

/**
 * Create a SetPerformanceListenTargetMessage payload
 */
export function createSetPerformanceListenTarget(
  targetId: bigint
): SetPerformanceListenTargetMessage {
  return { targetId };
}

// ============================================
// CM_setPerformanceWatchTarget (354) - Server->Client
// ============================================

/**
 * SetPerformanceWatchTargetMessage - Sets the target a creature is watching
 *
 * C++ source: MessageQueueGenericValueType<NetworkId>
 * Wire format:
 *   u64  targetId (NetworkId)
 */
export interface SetPerformanceWatchTargetMessage {
  /** NetworkId of the watch target (u64) */
  targetId: bigint;
}

/**
 * Serialize a SetPerformanceWatchTargetMessage payload
 */
export function serializeSetPerformanceWatchTarget(msg: SetPerformanceWatchTargetMessage): Uint8Array {
  const writer = new BufferWriter(8);
  writer.writeUInt64LE(msg.targetId);   // NetworkId (u64)
  return writer.toBuffer();
}

/**
 * Deserialize a SetPerformanceWatchTargetMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeSetPerformanceWatchTarget(
  data: Uint8Array,
  offset: number = 0
): SetPerformanceWatchTargetMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const targetId = reader.readUInt64LE();   // NetworkId (u64)

  return { targetId };
}

/**
 * Create a SetPerformanceWatchTargetMessage payload
 */
export function createSetPerformanceWatchTarget(
  targetId: bigint
): SetPerformanceWatchTargetMessage {
  return { targetId };
}

// ============================================
// CM_musicFlourish (358) - Client->Server
// ============================================

/**
 * MusicFlourishMessage - Client requests a music flourish during a performance
 *
 * C++ source: MessageQueueGenericValueType<int>
 * Wire format:
 *   i32  flourishIndex
 */
export interface MusicFlourishMessage {
  /** Flourish index to play (i32) */
  flourishIndex: number;
}

/**
 * Serialize a MusicFlourishMessage payload
 */
export function serializeMusicFlourish(msg: MusicFlourishMessage): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeInt32LE(msg.flourishIndex);   // i32
  return writer.toBuffer();
}

/**
 * Deserialize a MusicFlourishMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeMusicFlourish(
  data: Uint8Array,
  offset: number = 0
): MusicFlourishMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const flourishIndex = reader.readInt32LE();   // i32

  return { flourishIndex };
}

/**
 * Create a MusicFlourishMessage payload
 */
export function createMusicFlourish(
  flourishIndex: number
): MusicFlourishMessage {
  return { flourishIndex };
}

// ============================================
// CM_changeRoleIconChoice (1101) - Client->Server
// ============================================

/**
 * ChangeRoleIconChoiceMessage - Client changes their group role icon
 *
 * C++ source: MessageQueueGenericValueType<int>
 * Wire format:
 *   i32  roleIconChoice
 */
export interface ChangeRoleIconChoiceMessage {
  /** Group role icon choice (i32) */
  roleIconChoice: number;
}

/**
 * Serialize a ChangeRoleIconChoiceMessage payload
 */
export function serializeChangeRoleIconChoice(msg: ChangeRoleIconChoiceMessage): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeInt32LE(msg.roleIconChoice);   // i32
  return writer.toBuffer();
}

/**
 * Deserialize a ChangeRoleIconChoiceMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeChangeRoleIconChoice(
  data: Uint8Array,
  offset: number = 0
): ChangeRoleIconChoiceMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const roleIconChoice = reader.readInt32LE();   // i32

  return { roleIconChoice };
}

/**
 * Create a ChangeRoleIconChoiceMessage payload
 */
export function createChangeRoleIconChoice(
  roleIconChoice: number
): ChangeRoleIconChoiceMessage {
  return { roleIconChoice };
}

// ============================================
// CM_setCurrentWorkingSkill (1115) - Client->Server
// ============================================

/**
 * SetCurrentWorkingSkillMessage - Client sets the skill they are currently working towards
 *
 * C++ source: MessageQueueGenericValueType<int>
 * Wire format:
 *   i32  skillCrc (CRC of the working skill)
 */
export interface SetCurrentWorkingSkillMessage {
  /** CRC of the working skill (i32) */
  skillCrc: number;
}

/**
 * Serialize a SetCurrentWorkingSkillMessage payload
 */
export function serializeSetCurrentWorkingSkill(msg: SetCurrentWorkingSkillMessage): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeInt32LE(msg.skillCrc);   // i32
  return writer.toBuffer();
}

/**
 * Deserialize a SetCurrentWorkingSkillMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeSetCurrentWorkingSkill(
  data: Uint8Array,
  offset: number = 0
): SetCurrentWorkingSkillMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const skillCrc = reader.readInt32LE();   // i32

  return { skillCrc };
}

/**
 * Create a SetCurrentWorkingSkillMessage payload
 */
export function createSetCurrentWorkingSkill(
  skillCrc: number
): SetCurrentWorkingSkillMessage {
  return { skillCrc };
}

// ============================================
// CM_setProfessionTemplate (1116) - Client->Server
// ============================================

/**
 * SetProfessionTemplateMessage - Client sets their profession template
 *
 * C++ source: MessageQueueGenericValueType<int>
 * Wire format:
 *   i32  templateId
 */
export interface SetProfessionTemplateMessage {
  /** Profession template identifier (i32) */
  templateId: number;
}

/**
 * Serialize a SetProfessionTemplateMessage payload
 */
export function serializeSetProfessionTemplate(msg: SetProfessionTemplateMessage): Uint8Array {
  const writer = new BufferWriter(4);
  writer.writeInt32LE(msg.templateId);   // i32
  return writer.toBuffer();
}

/**
 * Deserialize a SetProfessionTemplateMessage payload
 * @param data   - Raw payload bytes (after ObjControllerMessage header)
 * @param offset - Optional byte offset to start reading from
 */
export function deserializeSetProfessionTemplate(
  data: Uint8Array,
  offset: number = 0
): SetProfessionTemplateMessage {
  const reader = new BufferReader(data);
  if (offset > 0) reader.skip(offset);

  const templateId = reader.readInt32LE();   // i32

  return { templateId };
}

/**
 * Create a SetProfessionTemplateMessage payload
 */
export function createSetProfessionTemplate(
  templateId: number
): SetProfessionTemplateMessage {
  return { templateId };
}
