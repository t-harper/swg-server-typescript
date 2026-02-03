/**
 * Group System Types
 * Type definitions for player groups and raids in SWG
 *
 * Groups allow players to coordinate activities, share experience,
 * and distribute loot. Raids extend groups to support larger operations.
 */

import type { ObjectId } from '@swg/shared-types';

/**
 * Maximum group size for standard groups
 */
export const MAX_GROUP_SIZE = 8;

/**
 * Maximum group size for raid groups
 */
export const MAX_RAID_SIZE = 20;

/**
 * Group loot distribution rules
 */
export enum GroupLootRule {
  /** Any group member can loot */
  FreeForAll = 0,
  /** Only the loot master can loot high-value items */
  MasterLooter = 1,
  /** Loot is distributed via a roll system */
  Lottery = 2,
  /** Loot is randomly assigned to group members */
  Random = 3,
}

/**
 * Group pickup rules for automatic loot collection
 */
export enum GroupPickupRule {
  /** All items are eligible for pickup */
  All = 0,
  /** Only items above the threshold are subject to loot rules */
  AboveThreshold = 1,
}

/**
 * Group formation types for coordinated movement
 */
export enum GroupFormationType {
  /** No formation - members move independently */
  None = 0,
  /** Single file line formation */
  Line = 1,
  /** Two-column formation */
  Column = 2,
  /** V-shaped wedge formation */
  Wedge = 3,
  /** Square/rectangular box formation */
  Box = 4,
  /** Spread out formation for area coverage */
  Spread = 5,
}

/**
 * Group member information
 * Contains all relevant data about a group member for display and functionality
 */
export interface GroupMember {
  /** Unique character object ID */
  characterId: ObjectId;
  /** Character display name */
  characterName: string;
  /** Character profession (e.g., "Bounty Hunter", "Medic") */
  profession: string;
  /** Character level (combat level) */
  level: number;
  /** Current health as percentage (0-100) */
  healthPercent: number;
  /** Current action as percentage (0-100) */
  actionPercent: number;
  /** Current mind as percentage (0-100) */
  mindPercent: number;
  /** Current position in world coordinates */
  position: {
    x: number;
    y: number;
    z: number;
  };
  /** Planet/zone ID where member is located */
  planetId: string;
  /** Whether the member is currently online */
  isOnline: boolean;
  /** Whether this member is the group leader */
  isLeader: boolean;
  /** Whether this member is the loot master */
  isLootMaster: boolean;
}

/**
 * Pending group invite
 * Tracks invitations that have been sent but not yet responded to
 */
export interface GroupInvite {
  /** Unique invite ID */
  inviteId: bigint;
  /** Group ID (if joining existing group) or 0n for new group */
  groupId: bigint;
  /** Character ID of the player who sent the invite */
  inviterId: ObjectId;
  /** Name of the player who sent the invite */
  inviterName: string;
  /** Character ID of the invited player */
  inviteeId: ObjectId;
  /** Name of the invited player */
  inviteeName: string;
  /** Timestamp when the invite was sent */
  timestamp: number;
  /** Expiration timestamp for the invite */
  expiresAt: number;
}

/**
 * Default invite expiration time in milliseconds (2 minutes)
 */
export const DEFAULT_INVITE_EXPIRATION = 120000;

/**
 * Get display name for a loot rule
 */
export function getLootRuleName(rule: GroupLootRule): string {
  switch (rule) {
    case GroupLootRule.FreeForAll:
      return 'Free For All';
    case GroupLootRule.MasterLooter:
      return 'Master Looter';
    case GroupLootRule.Lottery:
      return 'Lottery';
    case GroupLootRule.Random:
      return 'Random';
    default:
      return 'Unknown';
  }
}

/**
 * Get display name for a pickup rule
 */
export function getPickupRuleName(rule: GroupPickupRule): string {
  switch (rule) {
    case GroupPickupRule.All:
      return 'All Items';
    case GroupPickupRule.AboveThreshold:
      return 'Above Threshold';
    default:
      return 'Unknown';
  }
}

/**
 * Get display name for a formation type
 */
export function getFormationName(formation: GroupFormationType): string {
  switch (formation) {
    case GroupFormationType.None:
      return 'No Formation';
    case GroupFormationType.Line:
      return 'Line';
    case GroupFormationType.Column:
      return 'Column';
    case GroupFormationType.Wedge:
      return 'Wedge';
    case GroupFormationType.Box:
      return 'Box';
    case GroupFormationType.Spread:
      return 'Spread';
    default:
      return 'Unknown';
  }
}
