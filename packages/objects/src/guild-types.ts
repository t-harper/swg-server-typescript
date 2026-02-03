/**
 * Guild System Types
 * Type definitions, enums, and interfaces for the player guild system
 *
 * Guilds provide:
 * - Social organization for players
 * - Permission-based hierarchy with ranks
 * - Guild treasury for shared funds
 * - War declarations between guilds
 * - Alliance systems
 * - Player city sponsorship
 * - Mayor elections
 */

import type { ObjectId } from '@swg/shared-types';

// ============================================
// Constants
// ============================================

/** Maximum number of members in a guild */
export const MAX_GUILD_SIZE = 500;

/** Maximum length of guild name */
export const MAX_GUILD_NAME = 25;

/** Maximum length of guild abbreviation */
export const MAX_GUILD_ABBREVIATION = 5;

/** Minimum length of guild abbreviation */
export const MIN_GUILD_ABBREVIATION = 1;

/** Maximum length of message of the day */
export const MAX_MOTD = 512;

/** Minimum members required to form a guild */
export const MIN_MEMBERS_TO_FORM = 5;

/** Maximum number of custom ranks */
export const MAX_CUSTOM_RANKS = 10;

/** Maximum number of allies a guild can have */
export const MAX_ALLIES = 20;

/** Maximum number of active wars */
export const MAX_WARS = 10;

/** Default war cooldown period in milliseconds (24 hours) */
export const WAR_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Minimum time between war declarations to the same guild in ms (7 days) */
export const WAR_DECLARE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================
// Enumerations
// ============================================

/**
 * Guild rank enumeration
 * Ranks 0-3 are predefined, 4-9 are custom ranks
 */
export enum GuildRank {
  /** Guild leader - full permissions */
  Leader = 0,
  /** Officer - elevated permissions */
  Officer = 1,
  /** Standard member */
  Member = 2,
  /** New member / trial period */
  Novice = 3,
  /** Custom rank slots 4-9 */
  Custom4 = 4,
  Custom5 = 5,
  Custom6 = 6,
  Custom7 = 7,
  Custom8 = 8,
  Custom9 = 9,
}

/**
 * Guild permission flags (bitmask)
 * Used to control what actions members can perform
 */
export const GuildPermission = {
  /** No permissions */
  None: 0,
  /** Can invite new members */
  Invite: 1 << 0,
  /** Can kick members */
  Kick: 1 << 1,
  /** Can promote members */
  Promote: 1 << 2,
  /** Can demote members */
  Demote: 1 << 3,
  /** Can edit message of the day */
  EditMotd: 1 << 4,
  /** Can withdraw credits from treasury */
  WithdrawCredits: 1 << 5,
  /** Can declare war on other guilds */
  DeclareWar: 1 << 6,
  /** Can accept peace offers */
  AcceptPeace: 1 << 7,
  /** Can set guild tax rate */
  SetTax: 1 << 8,
  /** Can manage guild mail */
  ManageMail: 1 << 9,
  /** Can sponsor citizens for player cities */
  SponsorCitizen: 1 << 10,
  /** Can manage alliances */
  ManageAlliances: 1 << 11,
  /** Can rename custom ranks */
  RenameRanks: 1 << 12,
  /** Can modify rank permissions */
  ModifyPermissions: 1 << 13,
  /** Can transfer leadership (Leader only) */
  TransferLeadership: 1 << 14,
  /** Can disband the guild (Leader only) */
  Disband: 1 << 15,
} as const;

export type GuildPermissionType = number;

/**
 * Default permissions for each rank
 */
export const DEFAULT_RANK_PERMISSIONS: Map<GuildRank, number> = new Map([
  [
    GuildRank.Leader,
    GuildPermission.Invite |
      GuildPermission.Kick |
      GuildPermission.Promote |
      GuildPermission.Demote |
      GuildPermission.EditMotd |
      GuildPermission.WithdrawCredits |
      GuildPermission.DeclareWar |
      GuildPermission.AcceptPeace |
      GuildPermission.SetTax |
      GuildPermission.ManageMail |
      GuildPermission.SponsorCitizen |
      GuildPermission.ManageAlliances |
      GuildPermission.RenameRanks |
      GuildPermission.ModifyPermissions |
      GuildPermission.TransferLeadership |
      GuildPermission.Disband,
  ],
  [
    GuildRank.Officer,
    GuildPermission.Invite |
      GuildPermission.Kick |
      GuildPermission.Promote |
      GuildPermission.Demote |
      GuildPermission.EditMotd |
      GuildPermission.ManageMail |
      GuildPermission.SponsorCitizen,
  ],
  [GuildRank.Member, GuildPermission.SponsorCitizen],
  [GuildRank.Novice, GuildPermission.None],
  [GuildRank.Custom4, GuildPermission.None],
  [GuildRank.Custom5, GuildPermission.None],
  [GuildRank.Custom6, GuildPermission.None],
  [GuildRank.Custom7, GuildPermission.None],
  [GuildRank.Custom8, GuildPermission.None],
  [GuildRank.Custom9, GuildPermission.None],
]);

/**
 * Default rank names
 */
export const DEFAULT_RANK_NAMES: Map<GuildRank, string> = new Map([
  [GuildRank.Leader, 'Leader'],
  [GuildRank.Officer, 'Officer'],
  [GuildRank.Member, 'Member'],
  [GuildRank.Novice, 'Novice'],
  [GuildRank.Custom4, 'Rank 4'],
  [GuildRank.Custom5, 'Rank 5'],
  [GuildRank.Custom6, 'Rank 6'],
  [GuildRank.Custom7, 'Rank 7'],
  [GuildRank.Custom8, 'Rank 8'],
  [GuildRank.Custom9, 'Rank 9'],
]);

/**
 * War status enumeration
 */
export enum WarStatus {
  /** War is active */
  Active = 0,
  /** Peace has been offered by this guild */
  PeaceOffered = 1,
  /** Peace has been offered by the enemy */
  PeaceRequested = 2,
  /** War ended (kept for history) */
  Ended = 3,
}

/**
 * Election status enumeration
 */
export enum ElectionStatus {
  /** No election in progress */
  None = 0,
  /** Nomination period */
  Nominations = 1,
  /** Voting period */
  Voting = 2,
  /** Election concluded, results pending */
  Concluded = 3,
}

// ============================================
// Interfaces
// ============================================

/**
 * Guild member data structure
 */
export interface GuildMember {
  /** Character object ID */
  characterId: ObjectId;
  /** Character display name */
  characterName: string;
  /** Current rank in the guild */
  rank: GuildRank;
  /** Timestamp when member joined */
  joinedAt: number;
  /** Timestamp of last online activity */
  lastOnline: number;
  /** Custom title (optional) */
  title?: string;
  /** Character ID of the member who sponsored this member */
  sponsoredBy?: ObjectId;
  /** Total credits donated to treasury */
  totalDonated: bigint;
  /** Notes about this member (visible to officers) */
  notes?: string;
  /** Whether the member is currently online */
  isOnline: boolean;
}

/**
 * Guild war tracking data
 */
export interface GuildWar {
  /** Enemy guild ID */
  guildId: bigint;
  /** Enemy guild name (cached) */
  guildName: string;
  /** Timestamp when war was declared */
  declaredAt: number;
  /** Who declared war (attacker guild ID) */
  declaredBy: bigint;
  /** Current war status */
  status: WarStatus;
  /** Kills by our guild */
  kills: number;
  /** Deaths of our guild members */
  deaths: number;
  /** Timestamp when peace was offered (if applicable) */
  peaceOfferedAt?: number;
  /** Timestamp when war ended (if applicable) */
  endedAt?: number;
}

/**
 * Election candidate data
 */
export interface ElectionCandidate {
  /** Character ID of the candidate */
  characterId: ObjectId;
  /** Character name */
  characterName: string;
  /** Who nominated this candidate */
  nominatedBy: ObjectId;
  /** Timestamp of nomination */
  nominatedAt: number;
  /** Number of votes received */
  votes: number;
  /** Set of character IDs who voted for this candidate */
  voters: Set<ObjectId>;
}

/**
 * Guild election data for mayor elections
 */
export interface GuildElection {
  /** Election ID */
  electionId: bigint;
  /** Current election status */
  status: ElectionStatus;
  /** Timestamp when nominations opened */
  nominationsOpenedAt: number;
  /** Timestamp when voting opens */
  votingOpensAt: number;
  /** Timestamp when voting closes */
  votingClosesAt: number;
  /** List of candidates */
  candidates: ElectionCandidate[];
  /** Winning candidate (after election concludes) */
  winner?: ObjectId;
  /** Total votes cast */
  totalVotes: number;
  /** Set of members who have voted */
  votedMembers: Set<ObjectId>;
}

/**
 * Guild invitation data
 */
export interface GuildInvitation {
  /** Invited character ID */
  characterId: ObjectId;
  /** Invited character name */
  characterName: string;
  /** Who sent the invitation */
  invitedBy: ObjectId;
  /** Timestamp of invitation */
  invitedAt: number;
  /** Expiration timestamp */
  expiresAt: number;
}

/**
 * Guild log entry for tracking important events
 */
export interface GuildLogEntry {
  /** Timestamp of the event */
  timestamp: number;
  /** Type of event */
  eventType:
    | 'member_joined'
    | 'member_left'
    | 'member_kicked'
    | 'member_promoted'
    | 'member_demoted'
    | 'war_declared'
    | 'war_ended'
    | 'alliance_formed'
    | 'alliance_broken'
    | 'treasury_deposit'
    | 'treasury_withdraw'
    | 'motd_changed'
    | 'leader_changed';
  /** Character who performed the action (if applicable) */
  actorId?: ObjectId;
  /** Character who was affected (if applicable) */
  targetId?: ObjectId;
  /** Additional details */
  details?: string;
  /** Amount involved (for treasury operations) */
  amount?: bigint;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get the display name for a rank
 */
export function getRankName(rank: GuildRank, customNames?: Map<GuildRank, string>): string {
  if (customNames?.has(rank)) {
    return customNames.get(rank)!;
  }
  return DEFAULT_RANK_NAMES.get(rank) ?? `Rank ${rank}`;
}

/**
 * Check if a permission is set in a permission bitmask
 */
export function hasGuildPermission(permissions: number, permission: number): boolean {
  return (permissions & permission) !== 0;
}

/**
 * Get all permissions for a rank
 */
export function getRankPermissions(
  rank: GuildRank,
  customPermissions?: Map<GuildRank, number>
): number {
  if (customPermissions?.has(rank)) {
    return customPermissions.get(rank)!;
  }
  return DEFAULT_RANK_PERMISSIONS.get(rank) ?? GuildPermission.None;
}

/**
 * Check if a rank is a custom rank (4-9)
 */
export function isCustomRank(rank: GuildRank): boolean {
  return rank >= GuildRank.Custom4 && rank <= GuildRank.Custom9;
}

/**
 * Get permission name for display
 */
export function getPermissionName(permission: number): string {
  const names: Record<number, string> = {
    [GuildPermission.Invite]: 'Invite Members',
    [GuildPermission.Kick]: 'Kick Members',
    [GuildPermission.Promote]: 'Promote Members',
    [GuildPermission.Demote]: 'Demote Members',
    [GuildPermission.EditMotd]: 'Edit MOTD',
    [GuildPermission.WithdrawCredits]: 'Withdraw Credits',
    [GuildPermission.DeclareWar]: 'Declare War',
    [GuildPermission.AcceptPeace]: 'Accept Peace',
    [GuildPermission.SetTax]: 'Set Tax Rate',
    [GuildPermission.ManageMail]: 'Manage Mail',
    [GuildPermission.SponsorCitizen]: 'Sponsor Citizens',
    [GuildPermission.ManageAlliances]: 'Manage Alliances',
    [GuildPermission.RenameRanks]: 'Rename Ranks',
    [GuildPermission.ModifyPermissions]: 'Modify Permissions',
    [GuildPermission.TransferLeadership]: 'Transfer Leadership',
    [GuildPermission.Disband]: 'Disband Guild',
  };
  return names[permission] ?? 'Unknown Permission';
}

/**
 * Validate guild name
 * @returns Error message if invalid, undefined if valid
 */
export function validateGuildName(name: string): string | undefined {
  if (!name || name.trim().length === 0) {
    return 'Guild name cannot be empty';
  }
  if (name.length > MAX_GUILD_NAME) {
    return `Guild name cannot exceed ${MAX_GUILD_NAME} characters`;
  }
  if (!/^[a-zA-Z0-9 '-]+$/.test(name)) {
    return 'Guild name contains invalid characters';
  }
  return undefined;
}

/**
 * Validate guild abbreviation
 * @returns Error message if invalid, undefined if valid
 */
export function validateGuildAbbreviation(abbreviation: string): string | undefined {
  if (!abbreviation || abbreviation.trim().length === 0) {
    return 'Guild abbreviation cannot be empty';
  }
  if (abbreviation.length < MIN_GUILD_ABBREVIATION) {
    return `Guild abbreviation must be at least ${MIN_GUILD_ABBREVIATION} character`;
  }
  if (abbreviation.length > MAX_GUILD_ABBREVIATION) {
    return `Guild abbreviation cannot exceed ${MAX_GUILD_ABBREVIATION} characters`;
  }
  if (!/^[a-zA-Z0-9]+$/.test(abbreviation)) {
    return 'Guild abbreviation can only contain letters and numbers';
  }
  return undefined;
}
