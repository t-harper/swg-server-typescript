/**
 * Guild Network Messages
 * Message types for guild system communication between client and server
 *
 * Guild System Message Flow:
 * 1. Client creates guild -> GuildCreateMessage
 * 2. Server responds with GuildCreateResponseMessage
 * 3. Player invites -> GuildInviteMessage
 * 4. Invited player responds -> GuildJoinMessage / GuildDeclineMessage
 * 5. Various management operations (promote, demote, kick, etc.)
 * 6. Guild chat is handled through GuildChatMessage
 */

import type { ObjectId } from '@swg/shared-types';
import type { GuildMember, GuildWar, GuildRank } from './guild-types.js';

/**
 * Guild message operation types
 */
export enum GuildOperation {
  /** Create a new guild */
  Create = 0,
  /** Disband a guild */
  Disband = 1,
  /** Invite a player */
  Invite = 2,
  /** Accept guild invitation */
  Join = 3,
  /** Leave the guild */
  Leave = 4,
  /** Kick a member */
  Kick = 5,
  /** Promote a member */
  Promote = 6,
  /** Demote a member */
  Demote = 7,
  /** Set message of the day */
  SetMotd = 8,
  /** Broadcast MOTD to members */
  BroadcastMotd = 9,
  /** Deposit credits */
  Deposit = 10,
  /** Withdraw credits */
  Withdraw = 11,
  /** Declare war */
  DeclareWar = 12,
  /** Accept peace */
  AcceptPeace = 13,
  /** Request member list */
  RequestMemberList = 14,
  /** Request guild info */
  RequestInfo = 15,
  /** Guild chat message */
  Chat = 16,
  /** Transfer leadership */
  TransferLeader = 17,
  /** Decline invitation */
  Decline = 18,
  /** Offer peace */
  OfferPeace = 19,
  /** Set rank permissions */
  SetRankPermissions = 20,
  /** Rename a rank */
  RenameRank = 21,
  /** Set member title */
  SetTitle = 22,
  /** Add ally */
  AddAlly = 23,
  /** Remove ally */
  RemoveAlly = 24,
  /** Set recruiting status */
  SetRecruiting = 25,
}

/**
 * Base interface for guild messages
 */
interface BaseGuildMessage {
  /** Message operation type */
  operation: GuildOperation;
  /** Player object ID (sender) */
  playerId: ObjectId;
  /** Guild ID (0 for create) */
  guildId: bigint;
  /** Timestamp of the message */
  timestamp: number;
}

// ============================================
// Create / Disband Messages
// ============================================

/**
 * Request to create a new guild
 */
export interface GuildCreateMessage extends BaseGuildMessage {
  operation: GuildOperation.Create;
  /** Proposed guild name */
  guildName: string;
  /** Proposed guild abbreviation */
  abbreviation: string;
}

/**
 * Create a guild creation request message
 */
export function createGuildCreateMessage(
  playerId: ObjectId,
  guildName: string,
  abbreviation: string
): GuildCreateMessage {
  return {
    operation: GuildOperation.Create,
    playerId,
    guildId: 0n,
    timestamp: Date.now(),
    guildName,
    abbreviation,
  };
}

/**
 * Response to guild creation
 */
export interface GuildCreateResponseMessage {
  operation: GuildOperation.Create;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Created guild ID (if successful) */
  guildId?: bigint;
  /** Created guild name */
  guildName?: string;
  timestamp: number;
}

/**
 * Create a guild creation response
 */
export function createGuildCreateResponse(
  playerId: ObjectId,
  guildId: bigint | undefined,
  guildName: string | undefined,
  success: boolean = true,
  errorMessage?: string
): GuildCreateResponseMessage {
  return {
    operation: GuildOperation.Create,
    playerId,
    success,
    errorMessage,
    guildId,
    guildName,
    timestamp: Date.now(),
  };
}

/**
 * Request to disband a guild
 */
export interface GuildDisbandMessage extends BaseGuildMessage {
  operation: GuildOperation.Disband;
  /** Confirmation text (must match guild name) */
  confirmation: string;
}

/**
 * Create a guild disband request
 */
export function createGuildDisbandMessage(
  playerId: ObjectId,
  guildId: bigint,
  confirmation: string
): GuildDisbandMessage {
  return {
    operation: GuildOperation.Disband,
    playerId,
    guildId,
    timestamp: Date.now(),
    confirmation,
  };
}

/**
 * Response to guild disband
 */
export interface GuildDisbandResponseMessage {
  operation: GuildOperation.Disband;
  playerId: ObjectId;
  guildId: bigint;
  success: boolean;
  errorMessage?: string;
  timestamp: number;
}

/**
 * Create a guild disband response
 */
export function createGuildDisbandResponse(
  playerId: ObjectId,
  guildId: bigint,
  success: boolean = true,
  errorMessage?: string
): GuildDisbandResponseMessage {
  return {
    operation: GuildOperation.Disband,
    playerId,
    guildId,
    success,
    errorMessage,
    timestamp: Date.now(),
  };
}

// ============================================
// Invite / Join / Leave Messages
// ============================================

/**
 * Invitation to join a guild
 */
export interface GuildInviteMessage extends BaseGuildMessage {
  operation: GuildOperation.Invite;
  /** Character ID to invite */
  targetId: ObjectId;
  /** Character name to invite */
  targetName: string;
}

/**
 * Create a guild invite message
 */
export function createGuildInviteMessage(
  playerId: ObjectId,
  guildId: bigint,
  targetId: ObjectId,
  targetName: string
): GuildInviteMessage {
  return {
    operation: GuildOperation.Invite,
    playerId,
    guildId,
    timestamp: Date.now(),
    targetId,
    targetName,
  };
}

/**
 * Response to invitation (sent to the inviter)
 */
export interface GuildInviteResponseMessage {
  operation: GuildOperation.Invite;
  playerId: ObjectId;
  guildId: bigint;
  targetId: ObjectId;
  success: boolean;
  errorMessage?: string;
  timestamp: number;
}

/**
 * Create a guild invite response
 */
export function createGuildInviteResponse(
  playerId: ObjectId,
  guildId: bigint,
  targetId: ObjectId,
  success: boolean = true,
  errorMessage?: string
): GuildInviteResponseMessage {
  return {
    operation: GuildOperation.Invite,
    playerId,
    guildId,
    targetId,
    success,
    errorMessage,
    timestamp: Date.now(),
  };
}

/**
 * Request to join a guild (accepting invitation)
 */
export interface GuildJoinMessage extends BaseGuildMessage {
  operation: GuildOperation.Join;
}

/**
 * Create a guild join message
 */
export function createGuildJoinMessage(playerId: ObjectId, guildId: bigint): GuildJoinMessage {
  return {
    operation: GuildOperation.Join,
    playerId,
    guildId,
    timestamp: Date.now(),
  };
}

/**
 * Response to join request
 */
export interface GuildJoinResponseMessage {
  operation: GuildOperation.Join;
  playerId: ObjectId;
  guildId: bigint;
  success: boolean;
  errorMessage?: string;
  /** Guild name (if successful) */
  guildName?: string;
  /** Assigned rank */
  rank?: GuildRank;
  timestamp: number;
}

/**
 * Create a guild join response
 */
export function createGuildJoinResponse(
  playerId: ObjectId,
  guildId: bigint,
  guildName: string | undefined,
  rank: GuildRank | undefined,
  success: boolean = true,
  errorMessage?: string
): GuildJoinResponseMessage {
  return {
    operation: GuildOperation.Join,
    playerId,
    guildId,
    success,
    errorMessage,
    guildName,
    rank,
    timestamp: Date.now(),
  };
}

/**
 * Request to leave the guild
 */
export interface GuildLeaveMessage extends BaseGuildMessage {
  operation: GuildOperation.Leave;
}

/**
 * Create a guild leave message
 */
export function createGuildLeaveMessage(playerId: ObjectId, guildId: bigint): GuildLeaveMessage {
  return {
    operation: GuildOperation.Leave,
    playerId,
    guildId,
    timestamp: Date.now(),
  };
}

/**
 * Response to leave request
 */
export interface GuildLeaveResponseMessage {
  operation: GuildOperation.Leave;
  playerId: ObjectId;
  guildId: bigint;
  success: boolean;
  errorMessage?: string;
  timestamp: number;
}

/**
 * Create a guild leave response
 */
export function createGuildLeaveResponse(
  playerId: ObjectId,
  guildId: bigint,
  success: boolean = true,
  errorMessage?: string
): GuildLeaveResponseMessage {
  return {
    operation: GuildOperation.Leave,
    playerId,
    guildId,
    success,
    errorMessage,
    timestamp: Date.now(),
  };
}

// ============================================
// Kick / Promote / Demote Messages
// ============================================

/**
 * Request to kick a member
 */
export interface GuildKickMessage extends BaseGuildMessage {
  operation: GuildOperation.Kick;
  /** Character ID to kick */
  targetId: ObjectId;
  /** Reason for kick (optional) */
  reason?: string;
}

/**
 * Create a guild kick message
 */
export function createGuildKickMessage(
  playerId: ObjectId,
  guildId: bigint,
  targetId: ObjectId,
  reason?: string
): GuildKickMessage {
  return {
    operation: GuildOperation.Kick,
    playerId,
    guildId,
    timestamp: Date.now(),
    targetId,
    reason,
  };
}

/**
 * Response to kick request
 */
export interface GuildKickResponseMessage {
  operation: GuildOperation.Kick;
  playerId: ObjectId;
  guildId: bigint;
  targetId: ObjectId;
  success: boolean;
  errorMessage?: string;
  timestamp: number;
}

/**
 * Create a guild kick response
 */
export function createGuildKickResponse(
  playerId: ObjectId,
  guildId: bigint,
  targetId: ObjectId,
  success: boolean = true,
  errorMessage?: string
): GuildKickResponseMessage {
  return {
    operation: GuildOperation.Kick,
    playerId,
    guildId,
    targetId,
    success,
    errorMessage,
    timestamp: Date.now(),
  };
}

/**
 * Request to promote a member
 */
export interface GuildPromoteMessage extends BaseGuildMessage {
  operation: GuildOperation.Promote;
  /** Character ID to promote */
  targetId: ObjectId;
}

/**
 * Create a guild promote message
 */
export function createGuildPromoteMessage(
  playerId: ObjectId,
  guildId: bigint,
  targetId: ObjectId
): GuildPromoteMessage {
  return {
    operation: GuildOperation.Promote,
    playerId,
    guildId,
    timestamp: Date.now(),
    targetId,
  };
}

/**
 * Response to promote request
 */
export interface GuildPromoteResponseMessage {
  operation: GuildOperation.Promote;
  playerId: ObjectId;
  guildId: bigint;
  targetId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** New rank after promotion */
  newRank?: GuildRank;
  timestamp: number;
}

/**
 * Create a guild promote response
 */
export function createGuildPromoteResponse(
  playerId: ObjectId,
  guildId: bigint,
  targetId: ObjectId,
  newRank: GuildRank | undefined,
  success: boolean = true,
  errorMessage?: string
): GuildPromoteResponseMessage {
  return {
    operation: GuildOperation.Promote,
    playerId,
    guildId,
    targetId,
    success,
    errorMessage,
    newRank,
    timestamp: Date.now(),
  };
}

/**
 * Request to demote a member
 */
export interface GuildDemoteMessage extends BaseGuildMessage {
  operation: GuildOperation.Demote;
  /** Character ID to demote */
  targetId: ObjectId;
}

/**
 * Create a guild demote message
 */
export function createGuildDemoteMessage(
  playerId: ObjectId,
  guildId: bigint,
  targetId: ObjectId
): GuildDemoteMessage {
  return {
    operation: GuildOperation.Demote,
    playerId,
    guildId,
    timestamp: Date.now(),
    targetId,
  };
}

/**
 * Response to demote request
 */
export interface GuildDemoteResponseMessage {
  operation: GuildOperation.Demote;
  playerId: ObjectId;
  guildId: bigint;
  targetId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** New rank after demotion */
  newRank?: GuildRank;
  timestamp: number;
}

/**
 * Create a guild demote response
 */
export function createGuildDemoteResponse(
  playerId: ObjectId,
  guildId: bigint,
  targetId: ObjectId,
  newRank: GuildRank | undefined,
  success: boolean = true,
  errorMessage?: string
): GuildDemoteResponseMessage {
  return {
    operation: GuildOperation.Demote,
    playerId,
    guildId,
    targetId,
    success,
    errorMessage,
    newRank,
    timestamp: Date.now(),
  };
}

// ============================================
// MOTD Messages
// ============================================

/**
 * Request to set message of the day
 */
export interface GuildSetMotdMessage extends BaseGuildMessage {
  operation: GuildOperation.SetMotd;
  /** New message of the day */
  motd: string;
}

/**
 * Create a set MOTD message
 */
export function createGuildSetMotdMessage(
  playerId: ObjectId,
  guildId: bigint,
  motd: string
): GuildSetMotdMessage {
  return {
    operation: GuildOperation.SetMotd,
    playerId,
    guildId,
    timestamp: Date.now(),
    motd,
  };
}

/**
 * Response to set MOTD request
 */
export interface GuildSetMotdResponseMessage {
  operation: GuildOperation.SetMotd;
  playerId: ObjectId;
  guildId: bigint;
  success: boolean;
  errorMessage?: string;
  timestamp: number;
}

/**
 * Create a set MOTD response
 */
export function createGuildSetMotdResponse(
  playerId: ObjectId,
  guildId: bigint,
  success: boolean = true,
  errorMessage?: string
): GuildSetMotdResponseMessage {
  return {
    operation: GuildOperation.SetMotd,
    playerId,
    guildId,
    success,
    errorMessage,
    timestamp: Date.now(),
  };
}

/**
 * Broadcast MOTD to guild members
 */
export interface GuildMotdMessage {
  operation: GuildOperation.BroadcastMotd;
  guildId: bigint;
  guildName: string;
  motd: string;
  timestamp: number;
}

/**
 * Create a MOTD broadcast message
 */
export function createGuildMotdMessage(
  guildId: bigint,
  guildName: string,
  motd: string
): GuildMotdMessage {
  return {
    operation: GuildOperation.BroadcastMotd,
    guildId,
    guildName,
    motd,
    timestamp: Date.now(),
  };
}

// ============================================
// Treasury Messages
// ============================================

/**
 * Request to deposit credits
 */
export interface GuildDepositMessage extends BaseGuildMessage {
  operation: GuildOperation.Deposit;
  /** Amount to deposit */
  amount: bigint;
}

/**
 * Create a deposit message
 */
export function createGuildDepositMessage(
  playerId: ObjectId,
  guildId: bigint,
  amount: bigint
): GuildDepositMessage {
  return {
    operation: GuildOperation.Deposit,
    playerId,
    guildId,
    timestamp: Date.now(),
    amount,
  };
}

/**
 * Response to deposit request
 */
export interface GuildDepositResponseMessage {
  operation: GuildOperation.Deposit;
  playerId: ObjectId;
  guildId: bigint;
  success: boolean;
  errorMessage?: string;
  /** Amount deposited */
  amount?: bigint;
  /** New treasury balance */
  newBalance?: bigint;
  /** Player's new credit balance */
  playerBalance?: number;
  timestamp: number;
}

/**
 * Create a deposit response
 */
export function createGuildDepositResponse(
  playerId: ObjectId,
  guildId: bigint,
  amount: bigint | undefined,
  newBalance: bigint | undefined,
  playerBalance: number | undefined,
  success: boolean = true,
  errorMessage?: string
): GuildDepositResponseMessage {
  return {
    operation: GuildOperation.Deposit,
    playerId,
    guildId,
    success,
    errorMessage,
    amount,
    newBalance,
    playerBalance,
    timestamp: Date.now(),
  };
}

/**
 * Request to withdraw credits
 */
export interface GuildWithdrawMessage extends BaseGuildMessage {
  operation: GuildOperation.Withdraw;
  /** Amount to withdraw */
  amount: bigint;
}

/**
 * Create a withdraw message
 */
export function createGuildWithdrawMessage(
  playerId: ObjectId,
  guildId: bigint,
  amount: bigint
): GuildWithdrawMessage {
  return {
    operation: GuildOperation.Withdraw,
    playerId,
    guildId,
    timestamp: Date.now(),
    amount,
  };
}

/**
 * Response to withdraw request
 */
export interface GuildWithdrawResponseMessage {
  operation: GuildOperation.Withdraw;
  playerId: ObjectId;
  guildId: bigint;
  success: boolean;
  errorMessage?: string;
  /** Amount withdrawn */
  amount?: bigint;
  /** New treasury balance */
  newBalance?: bigint;
  /** Player's new credit balance */
  playerBalance?: number;
  timestamp: number;
}

/**
 * Create a withdraw response
 */
export function createGuildWithdrawResponse(
  playerId: ObjectId,
  guildId: bigint,
  amount: bigint | undefined,
  newBalance: bigint | undefined,
  playerBalance: number | undefined,
  success: boolean = true,
  errorMessage?: string
): GuildWithdrawResponseMessage {
  return {
    operation: GuildOperation.Withdraw,
    playerId,
    guildId,
    success,
    errorMessage,
    amount,
    newBalance,
    playerBalance,
    timestamp: Date.now(),
  };
}

// ============================================
// War Messages
// ============================================

/**
 * Request to declare war
 */
export interface GuildWarDeclareMessage extends BaseGuildMessage {
  operation: GuildOperation.DeclareWar;
  /** Target guild ID */
  targetGuildId: bigint;
}

/**
 * Create a war declaration message
 */
export function createGuildWarDeclareMessage(
  playerId: ObjectId,
  guildId: bigint,
  targetGuildId: bigint
): GuildWarDeclareMessage {
  return {
    operation: GuildOperation.DeclareWar,
    playerId,
    guildId,
    timestamp: Date.now(),
    targetGuildId,
  };
}

/**
 * Response to war declaration
 */
export interface GuildWarDeclareResponseMessage {
  operation: GuildOperation.DeclareWar;
  playerId: ObjectId;
  guildId: bigint;
  targetGuildId: bigint;
  success: boolean;
  errorMessage?: string;
  /** Target guild name (if successful) */
  targetGuildName?: string;
  timestamp: number;
}

/**
 * Create a war declaration response
 */
export function createGuildWarDeclareResponse(
  playerId: ObjectId,
  guildId: bigint,
  targetGuildId: bigint,
  targetGuildName: string | undefined,
  success: boolean = true,
  errorMessage?: string
): GuildWarDeclareResponseMessage {
  return {
    operation: GuildOperation.DeclareWar,
    playerId,
    guildId,
    targetGuildId,
    success,
    errorMessage,
    targetGuildName,
    timestamp: Date.now(),
  };
}

/**
 * Request to accept peace
 */
export interface GuildWarAcceptMessage extends BaseGuildMessage {
  operation: GuildOperation.AcceptPeace;
  /** Target guild ID */
  targetGuildId: bigint;
}

/**
 * Create a peace acceptance message
 */
export function createGuildWarAcceptMessage(
  playerId: ObjectId,
  guildId: bigint,
  targetGuildId: bigint
): GuildWarAcceptMessage {
  return {
    operation: GuildOperation.AcceptPeace,
    playerId,
    guildId,
    timestamp: Date.now(),
    targetGuildId,
  };
}

/**
 * Response to peace acceptance
 */
export interface GuildWarAcceptResponseMessage {
  operation: GuildOperation.AcceptPeace;
  playerId: ObjectId;
  guildId: bigint;
  targetGuildId: bigint;
  success: boolean;
  errorMessage?: string;
  timestamp: number;
}

/**
 * Create a peace acceptance response
 */
export function createGuildWarAcceptResponse(
  playerId: ObjectId,
  guildId: bigint,
  targetGuildId: bigint,
  success: boolean = true,
  errorMessage?: string
): GuildWarAcceptResponseMessage {
  return {
    operation: GuildOperation.AcceptPeace,
    playerId,
    guildId,
    targetGuildId,
    success,
    errorMessage,
    timestamp: Date.now(),
  };
}

// ============================================
// Info / Member List Messages
// ============================================

/**
 * Request guild member list
 */
export interface GuildMemberListRequestMessage extends BaseGuildMessage {
  operation: GuildOperation.RequestMemberList;
}

/**
 * Create a member list request
 */
export function createGuildMemberListRequest(
  playerId: ObjectId,
  guildId: bigint
): GuildMemberListRequestMessage {
  return {
    operation: GuildOperation.RequestMemberList,
    playerId,
    guildId,
    timestamp: Date.now(),
  };
}

/**
 * Response with member list
 */
export interface GuildMemberListMessage {
  operation: GuildOperation.RequestMemberList;
  playerId: ObjectId;
  guildId: bigint;
  success: boolean;
  errorMessage?: string;
  /** List of guild members */
  members: GuildMember[];
  /** Total member count */
  totalMembers: number;
  /** Online member count */
  onlineMembers: number;
  timestamp: number;
}

/**
 * Create a member list response
 */
export function createGuildMemberListResponse(
  playerId: ObjectId,
  guildId: bigint,
  members: GuildMember[],
  onlineMembers: number,
  success: boolean = true,
  errorMessage?: string
): GuildMemberListMessage {
  return {
    operation: GuildOperation.RequestMemberList,
    playerId,
    guildId,
    success,
    errorMessage,
    members,
    totalMembers: members.length,
    onlineMembers,
    timestamp: Date.now(),
  };
}

/**
 * Request guild info
 */
export interface GuildInfoRequestMessage extends BaseGuildMessage {
  operation: GuildOperation.RequestInfo;
}

/**
 * Create a guild info request
 */
export function createGuildInfoRequest(
  playerId: ObjectId,
  guildId: bigint
): GuildInfoRequestMessage {
  return {
    operation: GuildOperation.RequestInfo,
    playerId,
    guildId,
    timestamp: Date.now(),
  };
}

/**
 * Response with guild info
 */
export interface GuildInfoMessage {
  operation: GuildOperation.RequestInfo;
  playerId: ObjectId;
  guildId: bigint;
  success: boolean;
  errorMessage?: string;
  /** Guild name */
  guildName: string;
  /** Guild abbreviation */
  abbreviation: string;
  /** Leader name */
  leaderName: string;
  /** Leader character ID */
  leaderId: ObjectId;
  /** Total member count */
  memberCount: number;
  /** Online member count */
  onlineCount: number;
  /** Treasury balance (only if viewer has permission) */
  treasury?: bigint;
  /** Message of the day */
  motd: string;
  /** Guild creation date */
  createdAt: number;
  /** Whether guild is recruiting */
  isRecruiting: boolean;
  /** Active wars */
  wars: GuildWar[];
  /** Number of allies */
  allyCount: number;
  timestamp: number;
}

/**
 * Create a guild info response
 */
export function createGuildInfoResponse(
  playerId: ObjectId,
  guildId: bigint,
  guildName: string,
  abbreviation: string,
  leaderName: string,
  leaderId: ObjectId,
  memberCount: number,
  onlineCount: number,
  motd: string,
  createdAt: number,
  isRecruiting: boolean,
  wars: GuildWar[],
  allyCount: number,
  treasury?: bigint,
  success: boolean = true,
  errorMessage?: string
): GuildInfoMessage {
  return {
    operation: GuildOperation.RequestInfo,
    playerId,
    guildId,
    success,
    errorMessage,
    guildName,
    abbreviation,
    leaderName,
    leaderId,
    memberCount,
    onlineCount,
    treasury,
    motd,
    createdAt,
    isRecruiting,
    wars,
    allyCount,
    timestamp: Date.now(),
  };
}

// ============================================
// Chat Messages
// ============================================

/**
 * Guild chat message
 */
export interface GuildChatMessage {
  operation: GuildOperation.Chat;
  /** Sender player ID */
  senderId: ObjectId;
  /** Sender character name */
  senderName: string;
  /** Guild ID */
  guildId: bigint;
  /** Chat message text */
  message: string;
  /** Sender's rank */
  senderRank: GuildRank;
  timestamp: number;
}

/**
 * Create a guild chat message
 */
export function createGuildChatMessage(
  senderId: ObjectId,
  senderName: string,
  guildId: bigint,
  message: string,
  senderRank: GuildRank
): GuildChatMessage {
  return {
    operation: GuildOperation.Chat,
    senderId,
    senderName,
    guildId,
    message,
    senderRank,
    timestamp: Date.now(),
  };
}

// ============================================
// Union Types and Type Guards
// ============================================

/**
 * Union type of all guild request messages
 */
export type AnyGuildRequestMessage =
  | GuildCreateMessage
  | GuildDisbandMessage
  | GuildInviteMessage
  | GuildJoinMessage
  | GuildLeaveMessage
  | GuildKickMessage
  | GuildPromoteMessage
  | GuildDemoteMessage
  | GuildSetMotdMessage
  | GuildDepositMessage
  | GuildWithdrawMessage
  | GuildWarDeclareMessage
  | GuildWarAcceptMessage
  | GuildMemberListRequestMessage
  | GuildInfoRequestMessage;

/**
 * Union type of all guild response messages
 */
export type AnyGuildResponseMessage =
  | GuildCreateResponseMessage
  | GuildDisbandResponseMessage
  | GuildInviteResponseMessage
  | GuildJoinResponseMessage
  | GuildLeaveResponseMessage
  | GuildKickResponseMessage
  | GuildPromoteResponseMessage
  | GuildDemoteResponseMessage
  | GuildSetMotdResponseMessage
  | GuildDepositResponseMessage
  | GuildWithdrawResponseMessage
  | GuildWarDeclareResponseMessage
  | GuildWarAcceptResponseMessage
  | GuildMemberListMessage
  | GuildInfoMessage;

/**
 * Check if message is a guild create request
 */
export function isGuildCreateMessage(msg: AnyGuildRequestMessage): msg is GuildCreateMessage {
  return msg.operation === GuildOperation.Create;
}

/**
 * Check if message is a guild invite request
 */
export function isGuildInviteMessage(msg: AnyGuildRequestMessage): msg is GuildInviteMessage {
  return msg.operation === GuildOperation.Invite;
}

/**
 * Check if message is a guild kick request
 */
export function isGuildKickMessage(msg: AnyGuildRequestMessage): msg is GuildKickMessage {
  return msg.operation === GuildOperation.Kick;
}

/**
 * Check if message requires guild membership
 */
export function requiresGuildMembership(msg: AnyGuildRequestMessage): boolean {
  return msg.operation !== GuildOperation.Create && msg.operation !== GuildOperation.Join;
}

/**
 * Check if message requires officer+ permissions
 */
export function requiresOfficerPermission(msg: AnyGuildRequestMessage): boolean {
  return (
    msg.operation === GuildOperation.Invite ||
    msg.operation === GuildOperation.Kick ||
    msg.operation === GuildOperation.Promote ||
    msg.operation === GuildOperation.Demote ||
    msg.operation === GuildOperation.SetMotd
  );
}

/**
 * Check if message requires leader permission
 */
export function requiresLeaderPermission(msg: AnyGuildRequestMessage): boolean {
  return (
    msg.operation === GuildOperation.Disband ||
    msg.operation === GuildOperation.TransferLeader ||
    msg.operation === GuildOperation.DeclareWar ||
    msg.operation === GuildOperation.AcceptPeace ||
    msg.operation === GuildOperation.Withdraw
  );
}

/**
 * Message CRC values for network serialization
 */
export const GuildMessageCrc = {
  GUILD_CREATE_MESSAGE: 0x34567890,
  GUILD_CREATE_RESPONSE: 0x34567891,
  GUILD_DISBAND_MESSAGE: 0x34567892,
  GUILD_DISBAND_RESPONSE: 0x34567893,
  GUILD_INVITE_MESSAGE: 0x34567894,
  GUILD_INVITE_RESPONSE: 0x34567895,
  GUILD_JOIN_MESSAGE: 0x34567896,
  GUILD_JOIN_RESPONSE: 0x34567897,
  GUILD_LEAVE_MESSAGE: 0x34567898,
  GUILD_LEAVE_RESPONSE: 0x34567899,
  GUILD_KICK_MESSAGE: 0x3456789a,
  GUILD_KICK_RESPONSE: 0x3456789b,
  GUILD_PROMOTE_MESSAGE: 0x3456789c,
  GUILD_PROMOTE_RESPONSE: 0x3456789d,
  GUILD_DEMOTE_MESSAGE: 0x3456789e,
  GUILD_DEMOTE_RESPONSE: 0x3456789f,
  GUILD_SET_MOTD_MESSAGE: 0x345678a0,
  GUILD_SET_MOTD_RESPONSE: 0x345678a1,
  GUILD_MOTD_BROADCAST: 0x345678a2,
  GUILD_DEPOSIT_MESSAGE: 0x345678a3,
  GUILD_DEPOSIT_RESPONSE: 0x345678a4,
  GUILD_WITHDRAW_MESSAGE: 0x345678a5,
  GUILD_WITHDRAW_RESPONSE: 0x345678a6,
  GUILD_WAR_DECLARE_MESSAGE: 0x345678a7,
  GUILD_WAR_DECLARE_RESPONSE: 0x345678a8,
  GUILD_WAR_ACCEPT_MESSAGE: 0x345678a9,
  GUILD_WAR_ACCEPT_RESPONSE: 0x345678aa,
  GUILD_MEMBER_LIST_REQUEST: 0x345678ab,
  GUILD_MEMBER_LIST_RESPONSE: 0x345678ac,
  GUILD_INFO_REQUEST: 0x345678ad,
  GUILD_INFO_RESPONSE: 0x345678ae,
  GUILD_CHAT_MESSAGE: 0x345678af,
} as const;
