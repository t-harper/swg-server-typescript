/**
 * Group Network Messages
 * Message types for group system communication between client and server
 *
 * Group System Message Flow:
 * 1. Player invites another -> GroupInviteMessage
 * 2. Invitee responds -> GroupInviteResponseMessage
 * 3. Player joins group -> GroupJoinMessage
 * 4. Player leaves group -> GroupLeaveMessage
 * 5. Leader kicks member -> GroupKickMessage
 * 6. Group disbanded -> GroupDisbandMessage
 * 7. Leadership changed -> GroupMakeLeaderMessage
 * 8. Loot rules changed -> GroupLootRuleMessage
 * 9. Member status updates -> GroupMemberUpdateMessage
 * 10. Group chat -> GroupChatMessage
 */

import type { ObjectId } from '@swg/shared-types';
import type { GroupMember } from './group-types.js';
import { GroupLootRule, GroupPickupRule, GroupFormationType } from './group-types.js';

/**
 * Group message operation types
 */
export enum GroupOperation {
  /** Invite a player to the group */
  Invite = 0,
  /** Response to a group invite */
  InviteResponse = 1,
  /** Player has joined the group */
  Join = 2,
  /** Player has left the group */
  Leave = 3,
  /** Group has been disbanded */
  Disband = 4,
  /** Player has been kicked from the group */
  Kick = 5,
  /** Leadership has been transferred */
  MakeLeader = 6,
  /** Loot rules have changed */
  LootRule = 7,
  /** Member status update */
  MemberUpdate = 8,
  /** Group chat message */
  Chat = 9,
  /** Set loot master */
  SetLootMaster = 10,
  /** Formation change */
  Formation = 11,
  /** Convert to raid */
  ConvertToRaid = 12,
}

/**
 * Base interface for group messages
 */
interface BaseGroupMessage {
  /** Message operation type */
  operation: GroupOperation;
  /** Group ID (0n for new group creation) */
  groupId: bigint;
  /** Player who initiated the action */
  playerId: ObjectId;
  /** Timestamp of the message */
  timestamp: number;
}

// ============================================
// Invite Messages
// ============================================

/**
 * Group invite request from one player to another
 */
export interface GroupInviteMessage extends BaseGroupMessage {
  operation: GroupOperation.Invite;
  /** Character ID of the player being invited */
  inviteeId: ObjectId;
  /** Name of the player being invited */
  inviteeName: string;
  /** Name of the player sending the invite */
  inviterName: string;
}

/**
 * Create a group invite message
 */
export function createGroupInviteMessage(
  playerId: ObjectId,
  inviterName: string,
  inviteeId: ObjectId,
  inviteeName: string,
  groupId: bigint = 0n
): GroupInviteMessage {
  return {
    operation: GroupOperation.Invite,
    groupId,
    playerId,
    timestamp: Date.now(),
    inviteeId,
    inviteeName,
    inviterName,
  };
}

/**
 * Response to a group invite
 */
export interface GroupInviteResponseMessage extends BaseGroupMessage {
  operation: GroupOperation.InviteResponse;
  /** Whether the invite was accepted */
  accepted: boolean;
  /** Character ID of the player who sent the invite */
  inviterId: ObjectId;
  /** Error message if invite was rejected */
  errorMessage?: string;
}

/**
 * Create a group invite response message
 */
export function createGroupInviteResponseMessage(
  playerId: ObjectId,
  groupId: bigint,
  inviterId: ObjectId,
  accepted: boolean,
  errorMessage?: string
): GroupInviteResponseMessage {
  return {
    operation: GroupOperation.InviteResponse,
    groupId,
    playerId,
    timestamp: Date.now(),
    accepted,
    inviterId,
    errorMessage,
  };
}

// ============================================
// Join Messages
// ============================================

/**
 * Player has joined a group
 */
export interface GroupJoinMessage extends BaseGroupMessage {
  operation: GroupOperation.Join;
  /** The member data for the joining player */
  member: GroupMember;
  /** Full list of current members (for new joiner) */
  members?: GroupMember[];
  /** Current loot rule */
  lootRule?: GroupLootRule;
  /** Current pickup rule */
  pickupRule?: GroupPickupRule;
  /** Current loot threshold */
  lootThreshold?: number;
  /** Current formation */
  formation?: GroupFormationType;
  /** Whether this is a raid group */
  isRaid?: boolean;
}

/**
 * Create a group join message
 */
export function createGroupJoinMessage(
  playerId: ObjectId,
  groupId: bigint,
  member: GroupMember,
  members?: GroupMember[],
  lootRule?: GroupLootRule,
  pickupRule?: GroupPickupRule,
  lootThreshold?: number,
  formation?: GroupFormationType,
  isRaid?: boolean
): GroupJoinMessage {
  return {
    operation: GroupOperation.Join,
    groupId,
    playerId,
    timestamp: Date.now(),
    member,
    members,
    lootRule,
    pickupRule,
    lootThreshold,
    formation,
    isRaid,
  };
}

// ============================================
// Leave Messages
// ============================================

/**
 * Player has left a group
 */
export interface GroupLeaveMessage extends BaseGroupMessage {
  operation: GroupOperation.Leave;
  /** Character ID of the player who left */
  leaverId: ObjectId;
  /** Name of the player who left */
  leaverName: string;
  /** Reason for leaving (optional) */
  reason?: string;
}

/**
 * Create a group leave message
 */
export function createGroupLeaveMessage(
  playerId: ObjectId,
  groupId: bigint,
  leaverId: ObjectId,
  leaverName: string,
  reason?: string
): GroupLeaveMessage {
  return {
    operation: GroupOperation.Leave,
    groupId,
    playerId,
    timestamp: Date.now(),
    leaverId,
    leaverName,
    reason,
  };
}

// ============================================
// Disband Messages
// ============================================

/**
 * Group has been disbanded
 */
export interface GroupDisbandMessage extends BaseGroupMessage {
  operation: GroupOperation.Disband;
  /** Reason for disbanding (optional) */
  reason?: string;
  /** List of member IDs who were in the group */
  memberIds: ObjectId[];
}

/**
 * Create a group disband message
 */
export function createGroupDisbandMessage(
  playerId: ObjectId,
  groupId: bigint,
  memberIds: ObjectId[],
  reason?: string
): GroupDisbandMessage {
  return {
    operation: GroupOperation.Disband,
    groupId,
    playerId,
    timestamp: Date.now(),
    memberIds,
    reason,
  };
}

// ============================================
// Kick Messages
// ============================================

/**
 * Player has been kicked from the group
 */
export interface GroupKickMessage extends BaseGroupMessage {
  operation: GroupOperation.Kick;
  /** Character ID of the kicked player */
  kickedId: ObjectId;
  /** Name of the kicked player */
  kickedName: string;
  /** Reason for kicking (optional) */
  reason?: string;
}

/**
 * Create a group kick message
 */
export function createGroupKickMessage(
  playerId: ObjectId,
  groupId: bigint,
  kickedId: ObjectId,
  kickedName: string,
  reason?: string
): GroupKickMessage {
  return {
    operation: GroupOperation.Kick,
    groupId,
    playerId,
    timestamp: Date.now(),
    kickedId,
    kickedName,
    reason,
  };
}

// ============================================
// Make Leader Messages
// ============================================

/**
 * Leadership has been transferred
 */
export interface GroupMakeLeaderMessage extends BaseGroupMessage {
  operation: GroupOperation.MakeLeader;
  /** Character ID of the new leader */
  newLeaderId: ObjectId;
  /** Name of the new leader */
  newLeaderName: string;
  /** Character ID of the old leader */
  oldLeaderId: ObjectId;
  /** Name of the old leader */
  oldLeaderName: string;
}

/**
 * Create a group make leader message
 */
export function createGroupMakeLeaderMessage(
  playerId: ObjectId,
  groupId: bigint,
  newLeaderId: ObjectId,
  newLeaderName: string,
  oldLeaderId: ObjectId,
  oldLeaderName: string
): GroupMakeLeaderMessage {
  return {
    operation: GroupOperation.MakeLeader,
    groupId,
    playerId,
    timestamp: Date.now(),
    newLeaderId,
    newLeaderName,
    oldLeaderId,
    oldLeaderName,
  };
}

// ============================================
// Loot Rule Messages
// ============================================

/**
 * Loot rules have been changed
 */
export interface GroupLootRuleMessage extends BaseGroupMessage {
  operation: GroupOperation.LootRule;
  /** New loot distribution rule */
  lootRule: GroupLootRule;
  /** New pickup rule */
  pickupRule: GroupPickupRule;
  /** New loot threshold */
  lootThreshold: number;
  /** Character ID of the loot master (if MasterLooter rule) */
  lootMasterId?: ObjectId;
  /** Name of the loot master */
  lootMasterName?: string;
}

/**
 * Create a group loot rule message
 */
export function createGroupLootRuleMessage(
  playerId: ObjectId,
  groupId: bigint,
  lootRule: GroupLootRule,
  pickupRule: GroupPickupRule,
  lootThreshold: number,
  lootMasterId?: ObjectId,
  lootMasterName?: string
): GroupLootRuleMessage {
  return {
    operation: GroupOperation.LootRule,
    groupId,
    playerId,
    timestamp: Date.now(),
    lootRule,
    pickupRule,
    lootThreshold,
    lootMasterId,
    lootMasterName,
  };
}

// ============================================
// Member Update Messages
// ============================================

/**
 * Member status update (health, position, etc.)
 */
export interface GroupMemberUpdateMessage extends BaseGroupMessage {
  operation: GroupOperation.MemberUpdate;
  /** Character ID of the member being updated */
  memberId: ObjectId;
  /** Current health percentage (0-100) */
  healthPercent?: number;
  /** Current action percentage (0-100) */
  actionPercent?: number;
  /** Current mind percentage (0-100) */
  mindPercent?: number;
  /** Current position */
  position?: {
    x: number;
    y: number;
    z: number;
  };
  /** Current planet/zone ID */
  planetId?: string;
  /** Online status */
  isOnline?: boolean;
  /** Combat level (if changed) */
  level?: number;
}

/**
 * Create a group member update message
 */
export function createGroupMemberUpdateMessage(
  playerId: ObjectId,
  groupId: bigint,
  memberId: ObjectId,
  update: {
    healthPercent?: number;
    actionPercent?: number;
    mindPercent?: number;
    position?: { x: number; y: number; z: number };
    planetId?: string;
    isOnline?: boolean;
    level?: number;
  }
): GroupMemberUpdateMessage {
  return {
    operation: GroupOperation.MemberUpdate,
    groupId,
    playerId,
    timestamp: Date.now(),
    memberId,
    ...update,
  };
}

// ============================================
// Chat Messages
// ============================================

/**
 * Group chat message
 */
export interface GroupChatMessage extends BaseGroupMessage {
  operation: GroupOperation.Chat;
  /** Character ID of the sender */
  senderId: ObjectId;
  /** Name of the sender */
  senderName: string;
  /** The chat message content */
  message: string;
  /** Whether this is a raid-wide message (for raid groups) */
  isRaidChat?: boolean;
}

/**
 * Create a group chat message
 */
export function createGroupChatMessage(
  playerId: ObjectId,
  groupId: bigint,
  senderId: ObjectId,
  senderName: string,
  message: string,
  isRaidChat?: boolean
): GroupChatMessage {
  return {
    operation: GroupOperation.Chat,
    groupId,
    playerId,
    timestamp: Date.now(),
    senderId,
    senderName,
    message,
    isRaidChat,
  };
}

// ============================================
// Set Loot Master Messages
// ============================================

/**
 * Set loot master message
 */
export interface GroupSetLootMasterMessage extends BaseGroupMessage {
  operation: GroupOperation.SetLootMaster;
  /** Character ID of the new loot master */
  lootMasterId: ObjectId;
  /** Name of the new loot master */
  lootMasterName: string;
}

/**
 * Create a set loot master message
 */
export function createGroupSetLootMasterMessage(
  playerId: ObjectId,
  groupId: bigint,
  lootMasterId: ObjectId,
  lootMasterName: string
): GroupSetLootMasterMessage {
  return {
    operation: GroupOperation.SetLootMaster,
    groupId,
    playerId,
    timestamp: Date.now(),
    lootMasterId,
    lootMasterName,
  };
}

// ============================================
// Formation Messages
// ============================================

/**
 * Formation change message
 */
export interface GroupFormationMessage extends BaseGroupMessage {
  operation: GroupOperation.Formation;
  /** New formation type */
  formation: GroupFormationType;
}

/**
 * Create a formation change message
 */
export function createGroupFormationMessage(
  playerId: ObjectId,
  groupId: bigint,
  formation: GroupFormationType
): GroupFormationMessage {
  return {
    operation: GroupOperation.Formation,
    groupId,
    playerId,
    timestamp: Date.now(),
    formation,
  };
}

// ============================================
// Convert to Raid Messages
// ============================================

/**
 * Convert group to raid message
 */
export interface GroupConvertToRaidMessage extends BaseGroupMessage {
  operation: GroupOperation.ConvertToRaid;
  /** Whether the conversion was successful */
  success: boolean;
  /** Error message if conversion failed */
  errorMessage?: string;
}

/**
 * Create a convert to raid message
 */
export function createGroupConvertToRaidMessage(
  playerId: ObjectId,
  groupId: bigint,
  success: boolean,
  errorMessage?: string
): GroupConvertToRaidMessage {
  return {
    operation: GroupOperation.ConvertToRaid,
    groupId,
    playerId,
    timestamp: Date.now(),
    success,
    errorMessage,
  };
}

// ============================================
// Union Types and Type Guards
// ============================================

/**
 * Union type of all group messages
 */
export type AnyGroupMessage =
  | GroupInviteMessage
  | GroupInviteResponseMessage
  | GroupJoinMessage
  | GroupLeaveMessage
  | GroupDisbandMessage
  | GroupKickMessage
  | GroupMakeLeaderMessage
  | GroupLootRuleMessage
  | GroupMemberUpdateMessage
  | GroupChatMessage
  | GroupSetLootMasterMessage
  | GroupFormationMessage
  | GroupConvertToRaidMessage;

/**
 * Check if message is a group invite
 */
export function isGroupInviteMessage(msg: AnyGroupMessage): msg is GroupInviteMessage {
  return msg.operation === GroupOperation.Invite;
}

/**
 * Check if message is an invite response
 */
export function isGroupInviteResponseMessage(
  msg: AnyGroupMessage
): msg is GroupInviteResponseMessage {
  return msg.operation === GroupOperation.InviteResponse;
}

/**
 * Check if message is a join message
 */
export function isGroupJoinMessage(msg: AnyGroupMessage): msg is GroupJoinMessage {
  return msg.operation === GroupOperation.Join;
}

/**
 * Check if message is a leave message
 */
export function isGroupLeaveMessage(msg: AnyGroupMessage): msg is GroupLeaveMessage {
  return msg.operation === GroupOperation.Leave;
}

/**
 * Check if message is a disband message
 */
export function isGroupDisbandMessage(msg: AnyGroupMessage): msg is GroupDisbandMessage {
  return msg.operation === GroupOperation.Disband;
}

/**
 * Check if message is a kick message
 */
export function isGroupKickMessage(msg: AnyGroupMessage): msg is GroupKickMessage {
  return msg.operation === GroupOperation.Kick;
}

/**
 * Check if message is a make leader message
 */
export function isGroupMakeLeaderMessage(
  msg: AnyGroupMessage
): msg is GroupMakeLeaderMessage {
  return msg.operation === GroupOperation.MakeLeader;
}

/**
 * Check if message is a loot rule message
 */
export function isGroupLootRuleMessage(msg: AnyGroupMessage): msg is GroupLootRuleMessage {
  return msg.operation === GroupOperation.LootRule;
}

/**
 * Check if message is a member update message
 */
export function isGroupMemberUpdateMessage(
  msg: AnyGroupMessage
): msg is GroupMemberUpdateMessage {
  return msg.operation === GroupOperation.MemberUpdate;
}

/**
 * Check if message is a chat message
 */
export function isGroupChatMessage(msg: AnyGroupMessage): msg is GroupChatMessage {
  return msg.operation === GroupOperation.Chat;
}

/**
 * Check if message requires leader privileges
 */
export function requiresLeaderPrivilege(msg: AnyGroupMessage): boolean {
  return (
    msg.operation === GroupOperation.Kick ||
    msg.operation === GroupOperation.MakeLeader ||
    msg.operation === GroupOperation.LootRule ||
    msg.operation === GroupOperation.SetLootMaster ||
    msg.operation === GroupOperation.Formation ||
    msg.operation === GroupOperation.ConvertToRaid ||
    msg.operation === GroupOperation.Disband
  );
}

/**
 * Message CRC values for network serialization
 */
export const GroupMessageCrc = {
  GROUP_INVITE_MESSAGE: 0x34567890,
  GROUP_INVITE_RESPONSE: 0x34567891,
  GROUP_JOIN_MESSAGE: 0x34567892,
  GROUP_LEAVE_MESSAGE: 0x34567893,
  GROUP_DISBAND_MESSAGE: 0x34567894,
  GROUP_KICK_MESSAGE: 0x34567895,
  GROUP_MAKE_LEADER_MESSAGE: 0x34567896,
  GROUP_LOOT_RULE_MESSAGE: 0x34567897,
  GROUP_MEMBER_UPDATE_MESSAGE: 0x34567898,
  GROUP_CHAT_MESSAGE: 0x34567899,
  GROUP_SET_LOOT_MASTER_MESSAGE: 0x3456789a,
  GROUP_FORMATION_MESSAGE: 0x3456789b,
  GROUP_CONVERT_TO_RAID_MESSAGE: 0x3456789c,
} as const;
