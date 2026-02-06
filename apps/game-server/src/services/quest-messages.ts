/**
 * Quest Messages
 * Network protocol messages for quest system client-server communication
 */

import { BufferReader, BufferWriter } from '@swg/protocol/soe/buffer-utils.js';

/**
 * Quest message opcodes
 */
export const QuestMessageOpcode = {
  /** Client request to accept a quest */
  QuestAccept: 0xa1b2c301,
  /** Server response to quest accept */
  QuestAcceptResponse: 0xa1b2c302,
  /** Client request to abandon a quest */
  QuestAbandon: 0xa1b2c303,
  /** Server notification of quest completion */
  QuestComplete: 0xa1b2c304,
  /** Server notification of objective progress update */
  ObjectiveUpdate: 0xa1b2c305,
  /** Server notification of quest reward */
  QuestReward: 0xa1b2c306,
  /** Client request for available quests */
  QuestListRequest: 0xa1b2c307,
  /** Server response with available quests */
  QuestListResponse: 0xa1b2c308,
  /** Client request to share quest */
  QuestShare: 0xa1b2c309,
  /** Server notification of shared quest offer */
  QuestShareOffer: 0xa1b2c30a,
  /** Client response to shared quest offer */
  QuestShareResponse: 0xa1b2c30b,
  /** Server notification of journal sync */
  QuestJournalSync: 0xa1b2c30c,
  /** Mission terminal list request */
  MissionListRequest: 0xa1b2c30d,
  /** Mission terminal list response */
  MissionListResponse: 0xa1b2c30e,
  /** Mission accept request */
  MissionAccept: 0xa1b2c30f,
  /** Mission accept response */
  MissionAcceptResponse: 0xa1b2c310,
} as const;

export type QuestMessageOpcodeType =
  (typeof QuestMessageOpcode)[keyof typeof QuestMessageOpcode];

/**
 * Quest result codes
 */
export const QuestResultCode = {
  Success: 0,
  NotFound: 1,
  PrerequisitesNotMet: 2,
  AlreadyActive: 3,
  AlreadyCompleted: 4,
  NotActive: 5,
  QuestFull: 6,
  NotShareable: 7,
  TargetNotInGroup: 8,
  TargetHasQuest: 9,
  CooldownActive: 10,
  InvalidData: 11,
  ServerError: 99,
} as const;

export type QuestResultCodeType =
  (typeof QuestResultCode)[keyof typeof QuestResultCode];

/**
 * Mission type enum
 */
export const MissionType = {
  Destroy: 0,
  Delivery: 1,
  Bounty: 2,
  Survey: 3,
  Crafting: 4,
  Recon: 5,
  Escort: 6,
} as const;

export type MissionTypeValue = (typeof MissionType)[keyof typeof MissionType];

/**
 * Reward type enum for messages
 */
export const RewardType = {
  Credits: 0,
  Experience: 1,
  Item: 2,
  Faction: 3,
  Skill: 4,
} as const;

export type RewardTypeValue = (typeof RewardType)[keyof typeof RewardType];

// ============================================
// Data Structures
// ============================================

/**
 * Quest summary data for listings
 */
export interface QuestSummaryData {
  questId: string;
  name: string;
  description: string;
  level: number;
  type: string;
  repeatable: boolean;
  shareable: boolean;
}

/**
 * Active quest data with progress
 */
export interface ActiveQuestData {
  questId: string;
  name: string;
  acceptedAt: bigint;
  expiresAt: bigint;
  objectives: ObjectiveProgressData[];
}

/**
 * Objective progress data
 */
export interface ObjectiveProgressData {
  objectiveId: string;
  description: string;
  currentCount: number;
  requiredCount: number;
  complete: boolean;
}

/**
 * Reward data for messages
 */
export interface RewardData {
  type: RewardTypeValue;
  value: number;
  itemTemplate?: string;
  itemQuantity?: number;
  xpType?: string;
  factionName?: string;
}

/**
 * Mission data for terminal listings
 */
export interface MissionData {
  missionId: string;
  type: MissionTypeValue;
  title: string;
  description: string;
  difficulty: number;
  creatorName: string;
  targetName: string;
  targetLocation: {
    planet: string;
    x: number;
    y: number;
    z: number;
  };
  rewards: {
    credits: number;
    xp: number;
    factionPoints: number;
  };
  timeLimit: number;
}

// ============================================
// QuestAcceptMessage (0xA1B2C301)
// ============================================

/**
 * QuestAcceptMessage - Client request to accept a quest
 */
export interface QuestAcceptMessage {
  opcode: typeof QuestMessageOpcode.QuestAccept;
  questId: string;
  questGiverId: bigint;
}

/**
 * Serialize QuestAcceptMessage
 */
export function serializeQuestAcceptMessage(message: QuestAcceptMessage): Uint8Array {
  const writer = new BufferWriter(128);
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16BE(message.questId);
  writer.writeUInt64LE(message.questGiverId);
  return writer.toBuffer();
}

/**
 * Deserialize QuestAcceptMessage
 */
export function deserializeQuestAcceptMessage(data: Uint8Array): QuestAcceptMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== QuestMessageOpcode.QuestAccept) {
    throw new Error(`Invalid opcode for QuestAcceptMessage: 0x${opcode.toString(16)}`);
  }
  return {
    opcode: QuestMessageOpcode.QuestAccept,
    questId: reader.readStringWithLength16BE(),
    questGiverId: reader.readUInt64LE(),
  };
}

// ============================================
// QuestAcceptResponseMessage (0xA1B2C302)
// ============================================

/**
 * QuestAcceptResponseMessage - Server response to quest accept
 */
export interface QuestAcceptResponseMessage {
  opcode: typeof QuestMessageOpcode.QuestAcceptResponse;
  resultCode: QuestResultCodeType;
  questId: string;
  questData?: ActiveQuestData | undefined;
  message: string;
}

/**
 * Serialize QuestAcceptResponseMessage
 */
export function serializeQuestAcceptResponseMessage(
  message: QuestAcceptResponseMessage
): Uint8Array {
  const writer = new BufferWriter(512);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.resultCode);
  writer.writeStringWithLength16BE(message.questId);
  writer.writeUInt8(message.questData ? 1 : 0);

  if (message.questData) {
    writer.writeStringWithLength16BE(message.questData.questId);
    writer.writeUnicodeStringWithLength(message.questData.name);
    writer.writeUInt64LE(message.questData.acceptedAt);
    writer.writeUInt64LE(message.questData.expiresAt);
    writer.writeUInt32LE(message.questData.objectives.length);

    for (const obj of message.questData.objectives) {
      writer.writeStringWithLength16BE(obj.objectiveId);
      writer.writeUnicodeStringWithLength(obj.description);
      writer.writeUInt32LE(obj.currentCount);
      writer.writeUInt32LE(obj.requiredCount);
      writer.writeUInt8(obj.complete ? 1 : 0);
    }
  }

  writer.writeUnicodeStringWithLength(message.message);
  return writer.toBuffer();
}

/**
 * Deserialize QuestAcceptResponseMessage
 */
export function deserializeQuestAcceptResponseMessage(
  data: Uint8Array
): QuestAcceptResponseMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== QuestMessageOpcode.QuestAcceptResponse) {
    throw new Error(
      `Invalid opcode for QuestAcceptResponseMessage: 0x${opcode.toString(16)}`
    );
  }

  const resultCode = reader.readUInt32LE() as QuestResultCodeType;
  const questId = reader.readStringWithLength16BE();
  const hasQuestData = reader.readUInt8() !== 0;

  let questData: ActiveQuestData | undefined;
  if (hasQuestData) {
    const objectives: ObjectiveProgressData[] = [];
    const questDataId = reader.readStringWithLength16BE();
    const name = reader.readUnicodeStringWithLength();
    const acceptedAt = reader.readUInt64LE();
    const expiresAt = reader.readUInt64LE();
    const objectiveCount = reader.readUInt32LE();

    for (let i = 0; i < objectiveCount; i++) {
      objectives.push({
        objectiveId: reader.readStringWithLength16BE(),
        description: reader.readUnicodeStringWithLength(),
        currentCount: reader.readUInt32LE(),
        requiredCount: reader.readUInt32LE(),
        complete: reader.readUInt8() !== 0,
      });
    }

    questData = {
      questId: questDataId,
      name,
      acceptedAt,
      expiresAt,
      objectives,
    };
  }

  const message = reader.readUnicodeStringWithLength();

  return {
    opcode: QuestMessageOpcode.QuestAcceptResponse,
    resultCode,
    questId,
    questData,
    message,
  };
}

// ============================================
// QuestAbandonMessage (0xA1B2C303)
// ============================================

/**
 * QuestAbandonMessage - Client request to abandon a quest
 */
export interface QuestAbandonMessage {
  opcode: typeof QuestMessageOpcode.QuestAbandon;
  questId: string;
}

/**
 * Serialize QuestAbandonMessage
 */
export function serializeQuestAbandonMessage(message: QuestAbandonMessage): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16BE(message.questId);
  return writer.toBuffer();
}

/**
 * Deserialize QuestAbandonMessage
 */
export function deserializeQuestAbandonMessage(data: Uint8Array): QuestAbandonMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== QuestMessageOpcode.QuestAbandon) {
    throw new Error(`Invalid opcode for QuestAbandonMessage: 0x${opcode.toString(16)}`);
  }
  return {
    opcode: QuestMessageOpcode.QuestAbandon,
    questId: reader.readStringWithLength16BE(),
  };
}

// ============================================
// QuestCompleteMessage (0xA1B2C304)
// ============================================

/**
 * QuestCompleteMessage - Server notification of quest completion
 */
export interface QuestCompleteMessage {
  opcode: typeof QuestMessageOpcode.QuestComplete;
  questId: string;
  questName: string;
  success: boolean;
}

/**
 * Serialize QuestCompleteMessage
 */
export function serializeQuestCompleteMessage(message: QuestCompleteMessage): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16BE(message.questId);
  writer.writeUnicodeStringWithLength(message.questName);
  writer.writeUInt8(message.success ? 1 : 0);
  return writer.toBuffer();
}

/**
 * Deserialize QuestCompleteMessage
 */
export function deserializeQuestCompleteMessage(data: Uint8Array): QuestCompleteMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== QuestMessageOpcode.QuestComplete) {
    throw new Error(
      `Invalid opcode for QuestCompleteMessage: 0x${opcode.toString(16)}`
    );
  }
  return {
    opcode: QuestMessageOpcode.QuestComplete,
    questId: reader.readStringWithLength16BE(),
    questName: reader.readUnicodeStringWithLength(),
    success: reader.readUInt8() !== 0,
  };
}

// ============================================
// ObjectiveUpdateMessage (0xA1B2C305)
// ============================================

/**
 * ObjectiveUpdateMessage - Server notification of objective progress
 */
export interface ObjectiveUpdateMessage {
  opcode: typeof QuestMessageOpcode.ObjectiveUpdate;
  questId: string;
  objectiveId: string;
  currentCount: number;
  requiredCount: number;
  complete: boolean;
  description: string;
}

/**
 * Serialize ObjectiveUpdateMessage
 */
export function serializeObjectiveUpdateMessage(
  message: ObjectiveUpdateMessage
): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16BE(message.questId);
  writer.writeStringWithLength16BE(message.objectiveId);
  writer.writeUInt32LE(message.currentCount);
  writer.writeUInt32LE(message.requiredCount);
  writer.writeUInt8(message.complete ? 1 : 0);
  writer.writeUnicodeStringWithLength(message.description);
  return writer.toBuffer();
}

/**
 * Deserialize ObjectiveUpdateMessage
 */
export function deserializeObjectiveUpdateMessage(
  data: Uint8Array
): ObjectiveUpdateMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== QuestMessageOpcode.ObjectiveUpdate) {
    throw new Error(
      `Invalid opcode for ObjectiveUpdateMessage: 0x${opcode.toString(16)}`
    );
  }
  return {
    opcode: QuestMessageOpcode.ObjectiveUpdate,
    questId: reader.readStringWithLength16BE(),
    objectiveId: reader.readStringWithLength16BE(),
    currentCount: reader.readUInt32LE(),
    requiredCount: reader.readUInt32LE(),
    complete: reader.readUInt8() !== 0,
    description: reader.readUnicodeStringWithLength(),
  };
}

// ============================================
// QuestRewardMessage (0xA1B2C306)
// ============================================

/**
 * QuestRewardMessage - Server notification of quest reward
 */
export interface QuestRewardMessage {
  opcode: typeof QuestMessageOpcode.QuestReward;
  questId: string;
  questName: string;
  rewards: RewardData[];
}

/**
 * Serialize QuestRewardMessage
 */
export function serializeQuestRewardMessage(message: QuestRewardMessage): Uint8Array {
  const writer = new BufferWriter(512);
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16BE(message.questId);
  writer.writeUnicodeStringWithLength(message.questName);
  writer.writeUInt32LE(message.rewards.length);

  for (const reward of message.rewards) {
    writer.writeUInt8(reward.type);
    writer.writeInt32LE(reward.value);
    writer.writeStringWithLength16BE(reward.itemTemplate ?? '');
    writer.writeUInt32LE(reward.itemQuantity ?? 0);
    writer.writeStringWithLength16BE(reward.xpType ?? '');
    writer.writeStringWithLength16BE(reward.factionName ?? '');
  }

  return writer.toBuffer();
}

/**
 * Deserialize QuestRewardMessage
 */
export function deserializeQuestRewardMessage(data: Uint8Array): QuestRewardMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== QuestMessageOpcode.QuestReward) {
    throw new Error(
      `Invalid opcode for QuestRewardMessage: 0x${opcode.toString(16)}`
    );
  }

  const questId = reader.readStringWithLength16BE();
  const questName = reader.readUnicodeStringWithLength();
  const rewardCount = reader.readUInt32LE();
  const rewards: RewardData[] = [];

  for (let i = 0; i < rewardCount; i++) {
    const type = reader.readUInt8() as RewardTypeValue;
    const value = reader.readInt32LE();
    const itemTemplate = reader.readStringWithLength16BE() || undefined;
    const itemQuantity = reader.readUInt32LE() || undefined;
    const xpType = reader.readStringWithLength16BE() || undefined;
    const factionName = reader.readStringWithLength16BE() || undefined;

    rewards.push({
      type,
      value,
      itemTemplate,
      itemQuantity,
      xpType,
      factionName,
    });
  }

  return {
    opcode: QuestMessageOpcode.QuestReward,
    questId,
    questName,
    rewards,
  };
}

// ============================================
// QuestShareMessage (0xA1B2C309)
// ============================================

/**
 * QuestShareMessage - Client request to share quest
 */
export interface QuestShareMessage {
  opcode: typeof QuestMessageOpcode.QuestShare;
  questId: string;
  targetPlayerId: bigint;
}

/**
 * Serialize QuestShareMessage
 */
export function serializeQuestShareMessage(message: QuestShareMessage): Uint8Array {
  const writer = new BufferWriter(128);
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16BE(message.questId);
  writer.writeUInt64LE(message.targetPlayerId);
  return writer.toBuffer();
}

/**
 * Deserialize QuestShareMessage
 */
export function deserializeQuestShareMessage(data: Uint8Array): QuestShareMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== QuestMessageOpcode.QuestShare) {
    throw new Error(`Invalid opcode for QuestShareMessage: 0x${opcode.toString(16)}`);
  }
  return {
    opcode: QuestMessageOpcode.QuestShare,
    questId: reader.readStringWithLength16BE(),
    targetPlayerId: reader.readUInt64LE(),
  };
}

// ============================================
// QuestShareOfferMessage (0xA1B2C30A)
// ============================================

/**
 * QuestShareOfferMessage - Server notification of shared quest offer
 */
export interface QuestShareOfferMessage {
  opcode: typeof QuestMessageOpcode.QuestShareOffer;
  questId: string;
  questName: string;
  questDescription: string;
  sharerPlayerId: bigint;
  sharerPlayerName: string;
}

/**
 * Serialize QuestShareOfferMessage
 */
export function serializeQuestShareOfferMessage(
  message: QuestShareOfferMessage
): Uint8Array {
  const writer = new BufferWriter(512);
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16BE(message.questId);
  writer.writeUnicodeStringWithLength(message.questName);
  writer.writeUnicodeStringWithLength(message.questDescription);
  writer.writeUInt64LE(message.sharerPlayerId);
  writer.writeUnicodeStringWithLength(message.sharerPlayerName);
  return writer.toBuffer();
}

/**
 * Deserialize QuestShareOfferMessage
 */
export function deserializeQuestShareOfferMessage(
  data: Uint8Array
): QuestShareOfferMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== QuestMessageOpcode.QuestShareOffer) {
    throw new Error(
      `Invalid opcode for QuestShareOfferMessage: 0x${opcode.toString(16)}`
    );
  }
  return {
    opcode: QuestMessageOpcode.QuestShareOffer,
    questId: reader.readStringWithLength16BE(),
    questName: reader.readUnicodeStringWithLength(),
    questDescription: reader.readUnicodeStringWithLength(),
    sharerPlayerId: reader.readUInt64LE(),
    sharerPlayerName: reader.readUnicodeStringWithLength(),
  };
}

// ============================================
// QuestShareResponseMessage (0xA1B2C30B)
// ============================================

/**
 * QuestShareResponseMessage - Client response to shared quest offer
 */
export interface QuestShareResponseMessage {
  opcode: typeof QuestMessageOpcode.QuestShareResponse;
  questId: string;
  accepted: boolean;
}

/**
 * Serialize QuestShareResponseMessage
 */
export function serializeQuestShareResponseMessage(
  message: QuestShareResponseMessage
): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt32LE(message.opcode);
  writer.writeStringWithLength16BE(message.questId);
  writer.writeUInt8(message.accepted ? 1 : 0);
  return writer.toBuffer();
}

/**
 * Deserialize QuestShareResponseMessage
 */
export function deserializeQuestShareResponseMessage(
  data: Uint8Array
): QuestShareResponseMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== QuestMessageOpcode.QuestShareResponse) {
    throw new Error(
      `Invalid opcode for QuestShareResponseMessage: 0x${opcode.toString(16)}`
    );
  }
  return {
    opcode: QuestMessageOpcode.QuestShareResponse,
    questId: reader.readStringWithLength16BE(),
    accepted: reader.readUInt8() !== 0,
  };
}

// ============================================
// MissionListRequestMessage (0xA1B2C30D)
// ============================================

/**
 * MissionListRequestMessage - Request missions from terminal
 */
export interface MissionListRequestMessage {
  opcode: typeof QuestMessageOpcode.MissionListRequest;
  terminalId: bigint;
  terminalType: string;
}

/**
 * Serialize MissionListRequestMessage
 */
export function serializeMissionListRequestMessage(
  message: MissionListRequestMessage
): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.terminalId);
  writer.writeStringWithLength16BE(message.terminalType);
  return writer.toBuffer();
}

/**
 * Deserialize MissionListRequestMessage
 */
export function deserializeMissionListRequestMessage(
  data: Uint8Array
): MissionListRequestMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== QuestMessageOpcode.MissionListRequest) {
    throw new Error(
      `Invalid opcode for MissionListRequestMessage: 0x${opcode.toString(16)}`
    );
  }
  return {
    opcode: QuestMessageOpcode.MissionListRequest,
    terminalId: reader.readUInt64LE(),
    terminalType: reader.readStringWithLength16BE(),
  };
}

// ============================================
// MissionListResponseMessage (0xA1B2C30E)
// ============================================

/**
 * MissionListResponseMessage - Missions available at terminal
 */
export interface MissionListResponseMessage {
  opcode: typeof QuestMessageOpcode.MissionListResponse;
  terminalId: bigint;
  missions: MissionData[];
}

/**
 * Serialize MissionListResponseMessage
 */
export function serializeMissionListResponseMessage(
  message: MissionListResponseMessage
): Uint8Array {
  const writer = new BufferWriter(2048);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.terminalId);
  writer.writeUInt32LE(message.missions.length);

  for (const mission of message.missions) {
    writer.writeStringWithLength16BE(mission.missionId);
    writer.writeUInt8(mission.type);
    writer.writeUnicodeStringWithLength(mission.title);
    writer.writeUnicodeStringWithLength(mission.description);
    writer.writeUInt8(mission.difficulty);
    writer.writeUnicodeStringWithLength(mission.creatorName);
    writer.writeUnicodeStringWithLength(mission.targetName);
    writer.writeStringWithLength16BE(mission.targetLocation.planet);
    writer.writeFloatLE(mission.targetLocation.x);
    writer.writeFloatLE(mission.targetLocation.y);
    writer.writeFloatLE(mission.targetLocation.z);
    writer.writeInt32LE(mission.rewards.credits);
    writer.writeInt32LE(mission.rewards.xp);
    writer.writeInt32LE(mission.rewards.factionPoints);
    writer.writeInt32LE(mission.timeLimit);
  }

  return writer.toBuffer();
}

/**
 * Deserialize MissionListResponseMessage
 */
export function deserializeMissionListResponseMessage(
  data: Uint8Array
): MissionListResponseMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== QuestMessageOpcode.MissionListResponse) {
    throw new Error(
      `Invalid opcode for MissionListResponseMessage: 0x${opcode.toString(16)}`
    );
  }

  const terminalId = reader.readUInt64LE();
  const missionCount = reader.readUInt32LE();
  const missions: MissionData[] = [];

  for (let i = 0; i < missionCount; i++) {
    missions.push({
      missionId: reader.readStringWithLength16BE(),
      type: reader.readUInt8() as MissionTypeValue,
      title: reader.readUnicodeStringWithLength(),
      description: reader.readUnicodeStringWithLength(),
      difficulty: reader.readUInt8(),
      creatorName: reader.readUnicodeStringWithLength(),
      targetName: reader.readUnicodeStringWithLength(),
      targetLocation: {
        planet: reader.readStringWithLength16BE(),
        x: reader.readFloatLE(),
        y: reader.readFloatLE(),
        z: reader.readFloatLE(),
      },
      rewards: {
        credits: reader.readInt32LE(),
        xp: reader.readInt32LE(),
        factionPoints: reader.readInt32LE(),
      },
      timeLimit: reader.readInt32LE(),
    });
  }

  return {
    opcode: QuestMessageOpcode.MissionListResponse,
    terminalId,
    missions,
  };
}

// ============================================
// MissionAcceptMessage (0xA1B2C30F)
// ============================================

/**
 * MissionAcceptMessage - Request to accept a mission
 */
export interface MissionAcceptMessage {
  opcode: typeof QuestMessageOpcode.MissionAccept;
  terminalId: bigint;
  missionId: string;
}

/**
 * Serialize MissionAcceptMessage
 */
export function serializeMissionAcceptMessage(message: MissionAcceptMessage): Uint8Array {
  const writer = new BufferWriter(64);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt64LE(message.terminalId);
  writer.writeStringWithLength16BE(message.missionId);
  return writer.toBuffer();
}

/**
 * Deserialize MissionAcceptMessage
 */
export function deserializeMissionAcceptMessage(data: Uint8Array): MissionAcceptMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== QuestMessageOpcode.MissionAccept) {
    throw new Error(
      `Invalid opcode for MissionAcceptMessage: 0x${opcode.toString(16)}`
    );
  }
  return {
    opcode: QuestMessageOpcode.MissionAccept,
    terminalId: reader.readUInt64LE(),
    missionId: reader.readStringWithLength16BE(),
  };
}

// ============================================
// MissionAcceptResponseMessage (0xA1B2C310)
// ============================================

/**
 * MissionAcceptResponseMessage - Response to mission accept request
 */
export interface MissionAcceptResponseMessage {
  opcode: typeof QuestMessageOpcode.MissionAcceptResponse;
  resultCode: QuestResultCodeType;
  missionId: string;
  message: string;
}

/**
 * Serialize MissionAcceptResponseMessage
 */
export function serializeMissionAcceptResponseMessage(
  message: MissionAcceptResponseMessage
): Uint8Array {
  const writer = new BufferWriter(256);
  writer.writeUInt32LE(message.opcode);
  writer.writeUInt32LE(message.resultCode);
  writer.writeStringWithLength16BE(message.missionId);
  writer.writeUnicodeStringWithLength(message.message);
  return writer.toBuffer();
}

/**
 * Deserialize MissionAcceptResponseMessage
 */
export function deserializeMissionAcceptResponseMessage(
  data: Uint8Array
): MissionAcceptResponseMessage {
  const reader = new BufferReader(data);
  const opcode = reader.readUInt32LE();
  if (opcode !== QuestMessageOpcode.MissionAcceptResponse) {
    throw new Error(
      `Invalid opcode for MissionAcceptResponseMessage: 0x${opcode.toString(16)}`
    );
  }
  return {
    opcode: QuestMessageOpcode.MissionAcceptResponse,
    resultCode: reader.readUInt32LE() as QuestResultCodeType,
    missionId: reader.readStringWithLength16BE(),
    message: reader.readUnicodeStringWithLength(),
  };
}

// ============================================
// Union Types and Utilities
// ============================================

/**
 * Union type of all quest messages
 */
export type QuestMessage =
  | QuestAcceptMessage
  | QuestAcceptResponseMessage
  | QuestAbandonMessage
  | QuestCompleteMessage
  | ObjectiveUpdateMessage
  | QuestRewardMessage
  | QuestShareMessage
  | QuestShareOfferMessage
  | QuestShareResponseMessage
  | MissionListRequestMessage
  | MissionListResponseMessage
  | MissionAcceptMessage
  | MissionAcceptResponseMessage;

/**
 * Get the opcode from raw quest message data
 */
export function getQuestMessageOpcode(data: Uint8Array): number {
  if (data.length < 4) {
    throw new Error('Message too short to contain opcode');
  }
  const reader = new BufferReader(data);
  return reader.readUInt32LE();
}

/**
 * Check if an opcode is a valid quest message opcode
 */
export function isQuestMessageOpcode(
  opcode: number
): opcode is QuestMessageOpcodeType {
  return Object.values(QuestMessageOpcode).includes(opcode as QuestMessageOpcodeType);
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create QuestAcceptResponseMessage
 */
export function createQuestAcceptResponse(
  resultCode: QuestResultCodeType,
  questId: string,
  message: string = '',
  questData?: ActiveQuestData
): QuestAcceptResponseMessage {
  return {
    opcode: QuestMessageOpcode.QuestAcceptResponse,
    resultCode,
    questId,
    questData,
    message,
  };
}

/**
 * Create QuestCompleteMessage
 */
export function createQuestCompleteMessage(
  questId: string,
  questName: string,
  success: boolean
): QuestCompleteMessage {
  return {
    opcode: QuestMessageOpcode.QuestComplete,
    questId,
    questName,
    success,
  };
}

/**
 * Create ObjectiveUpdateMessage
 */
export function createObjectiveUpdateMessage(
  questId: string,
  objectiveId: string,
  currentCount: number,
  requiredCount: number,
  complete: boolean,
  description: string
): ObjectiveUpdateMessage {
  return {
    opcode: QuestMessageOpcode.ObjectiveUpdate,
    questId,
    objectiveId,
    currentCount,
    requiredCount,
    complete,
    description,
  };
}

/**
 * Create QuestRewardMessage
 */
export function createQuestRewardMessage(
  questId: string,
  questName: string,
  rewards: RewardData[]
): QuestRewardMessage {
  return {
    opcode: QuestMessageOpcode.QuestReward,
    questId,
    questName,
    rewards,
  };
}

/**
 * Create QuestShareOfferMessage
 */
export function createQuestShareOfferMessage(
  questId: string,
  questName: string,
  questDescription: string,
  sharerPlayerId: bigint,
  sharerPlayerName: string
): QuestShareOfferMessage {
  return {
    opcode: QuestMessageOpcode.QuestShareOffer,
    questId,
    questName,
    questDescription,
    sharerPlayerId,
    sharerPlayerName,
  };
}

/**
 * Create MissionListResponseMessage
 */
export function createMissionListResponse(
  terminalId: bigint,
  missions: MissionData[]
): MissionListResponseMessage {
  return {
    opcode: QuestMessageOpcode.MissionListResponse,
    terminalId,
    missions,
  };
}

/**
 * Create MissionAcceptResponseMessage
 */
export function createMissionAcceptResponse(
  resultCode: QuestResultCodeType,
  missionId: string,
  message: string = ''
): MissionAcceptResponseMessage {
  return {
    opcode: QuestMessageOpcode.MissionAcceptResponse,
    resultCode,
    missionId,
    message,
  };
}

/**
 * Get result code message for display
 */
export function getQuestResultMessage(resultCode: QuestResultCodeType): string {
  switch (resultCode) {
    case QuestResultCode.Success:
      return 'Quest accepted successfully.';
    case QuestResultCode.NotFound:
      return 'Quest not found.';
    case QuestResultCode.PrerequisitesNotMet:
      return 'You do not meet the requirements for this quest.';
    case QuestResultCode.AlreadyActive:
      return 'You already have this quest.';
    case QuestResultCode.AlreadyCompleted:
      return 'You have already completed this quest.';
    case QuestResultCode.NotActive:
      return 'You do not have this quest.';
    case QuestResultCode.QuestFull:
      return 'Your quest journal is full.';
    case QuestResultCode.NotShareable:
      return 'This quest cannot be shared.';
    case QuestResultCode.TargetNotInGroup:
      return 'Target player is not in your group.';
    case QuestResultCode.TargetHasQuest:
      return 'Target player already has this quest.';
    case QuestResultCode.CooldownActive:
      return 'You must wait before accepting this quest again.';
    case QuestResultCode.InvalidData:
      return 'Invalid quest data.';
    case QuestResultCode.ServerError:
    default:
      return 'A server error occurred. Please try again.';
  }
}
