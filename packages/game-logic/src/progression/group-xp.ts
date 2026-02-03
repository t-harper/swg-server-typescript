/**
 * Group XP Sharing - Experience distribution for groups
 *
 * Handles XP splitting among group members including:
 * - Range-based sharing (must be nearby)
 * - Level-based modifiers
 * - Group mission bonuses
 * - Fair distribution algorithms
 */

import type { ObjectId } from '@swg/shared-types';
import { PlayerObject } from '@swg/objects';
import { type XpTypeValue } from './xp-types.js';
import { type XpDistribution } from './combat-xp.js';
import { type XpManager, getXpManager } from './xp-manager.js';
import {
  type XpEventEmitter,
  getXpEventEmitter,
  type GroupXpDistributedEvent,
} from './xp-events.js';

/**
 * Group member information for XP distribution
 */
export interface GroupMember {
  /** Player object ID */
  playerId: ObjectId;
  /** Player object reference */
  player: PlayerObject;
  /** Distance from the kill location */
  distance: number;
  /** Whether the member is online */
  online: boolean;
}

/**
 * XP share result for a single member
 */
export interface MemberXpShare {
  /** Player object ID */
  playerId: ObjectId;
  /** Amount of XP awarded */
  amount: number;
  /** Modifier applied (level-based, distance-based, etc.) */
  modifier: number;
  /** Whether the share was applied */
  applied: boolean;
  /** Reason if not applied */
  reason?: string;
}

/**
 * Group XP distribution result
 */
export interface GroupXpResult {
  /** Total XP distributed */
  totalDistributed: number;
  /** Amount of XP lost (out of range, offline, etc.) */
  xpLost: number;
  /** Individual member shares */
  memberShares: MemberXpShare[];
  /** Whether group bonus was applied */
  groupBonusApplied: boolean;
  /** Group bonus percentage */
  groupBonusPercent: number;
}

/**
 * Group XP configuration options
 */
export interface GroupXpOptions {
  /** Maximum distance for XP sharing (in meters) */
  maxShareDistance?: number;
  /** Whether to apply level-based XP scaling */
  levelScaling?: boolean;
  /** Minimum level difference for scaling to apply */
  levelScaleThreshold?: number;
  /** Maximum level-based XP modifier */
  maxLevelModifier?: number;
  /** Minimum level-based XP modifier */
  minLevelModifier?: number;
  /** Group bonus percentage per additional member */
  groupBonusPerMember?: number;
  /** Maximum group bonus percentage */
  maxGroupBonus?: number;
  /** Whether offline members can receive XP */
  offlineShare?: boolean;
}

/**
 * Default group XP options
 */
const DEFAULT_GROUP_XP_OPTIONS: Required<GroupXpOptions> = {
  maxShareDistance: 192, // ~192 meters (typical SWG group range)
  levelScaling: true,
  levelScaleThreshold: 10,
  maxLevelModifier: 1.25,
  minLevelModifier: 0.5,
  groupBonusPerMember: 0.02, // 2% per additional member
  maxGroupBonus: 0.2, // 20% maximum group bonus
  offlineShare: false,
};

/**
 * Group XP Manager class
 */
export class GroupXpManager {
  private options: Required<GroupXpOptions>;
  private xpManager: XpManager;
  private eventEmitter: XpEventEmitter;

  constructor(
    options: GroupXpOptions = {},
    xpManager?: XpManager,
    eventEmitter?: XpEventEmitter
  ) {
    this.options = { ...DEFAULT_GROUP_XP_OPTIONS, ...options };
    this.xpManager = xpManager ?? getXpManager();
    this.eventEmitter = eventEmitter ?? getXpEventEmitter();
  }

  /**
   * Distribute XP among group members
   *
   * @param xpDistribution - The base XP distribution to share
   * @param killer - The player who got the kill
   * @param groupMembers - All members of the group
   * @param killLocation - Position where the kill occurred
   * @param source - Source description for events
   * @returns Distribution result
   */
  distributeGroupXp(
    xpDistribution: XpDistribution,
    killer: PlayerObject,
    groupMembers: GroupMember[],
    source: string = 'group_kill'
  ): GroupXpResult {
    // Filter to eligible members (in range, online)
    const eligibleMembers = this.getEligibleMembers(groupMembers);

    // If no eligible members (or solo), just give XP to killer
    if (eligibleMembers.length <= 1) {
      return this.distributeSolo(xpDistribution, killer, source);
    }

    // Calculate group bonus
    const groupBonus = this.calculateGroupBonus(eligibleMembers.length);
    const groupBonusApplied = groupBonus > 0;

    // Calculate average level for scaling
    const averageLevel = this.calculateAverageLevel(eligibleMembers);

    // Distribute each XP type
    const memberShares: MemberXpShare[] = [];
    let totalDistributed = 0;
    let xpLost = 0;

    for (const [xpType, baseAmount] of xpDistribution.xpByType) {
      // Apply group bonus to base amount
      const bonusAmount = Math.floor(baseAmount * groupBonus);
      const totalXp = baseAmount + bonusAmount;

      // Calculate share per member (even split)
      const baseSharePerMember = Math.floor(totalXp / eligibleMembers.length);
      let remainder = totalXp - baseSharePerMember * eligibleMembers.length;

      for (const member of eligibleMembers) {
        // Calculate level-based modifier
        const levelModifier = this.calculateLevelModifier(
          member.player.level,
          averageLevel
        );

        // Calculate this member's share
        let share = Math.floor(baseSharePerMember * levelModifier);

        // Distribute remainder to first members
        if (remainder > 0) {
          share += 1;
          remainder--;
        }

        // Distance modifier (slight reduction for far members)
        const distanceModifier = this.calculateDistanceModifier(member.distance);
        share = Math.floor(share * distanceModifier);

        // Award the XP
        if (share > 0) {
          const result = this.xpManager.awardXp(member.player, xpType, share, {
            source,
            checkSkills: true,
          });

          totalDistributed += result.awarded;
          xpLost += result.capped;

          // Find or create member share entry
          let memberShare = memberShares.find(
            (s) => s.playerId === member.playerId
          );
          if (!memberShare) {
            memberShare = {
              playerId: member.playerId,
              amount: 0,
              modifier: levelModifier * distanceModifier,
              applied: true,
            };
            memberShares.push(memberShare);
          }
          memberShare.amount += result.awarded;
        }
      }
    }

    // Add entries for ineligible members
    for (const member of groupMembers) {
      if (!eligibleMembers.includes(member)) {
        memberShares.push({
          playerId: member.playerId,
          amount: 0,
          modifier: 0,
          applied: false,
          reason: member.online
            ? 'out_of_range'
            : 'offline',
        });
      }
    }

    // Emit group XP distributed event
    const event: GroupXpDistributedEvent = {
      groupId: killer.groupId,
      originalAmount: this.sumXpDistribution(xpDistribution),
      xpType: Array.from(xpDistribution.xpByType.keys())[0] ?? 'combat_general',
      source,
      memberShares: memberShares.map((s) => ({
        playerId: s.playerId,
        amount: s.amount,
        modifier: s.modifier,
      })),
      groupBonusApplied,
      groupBonusPercent: groupBonus,
      timestamp: Date.now(),
    };
    this.eventEmitter.emitGroupXpDistributed(event);

    return {
      totalDistributed,
      xpLost,
      memberShares,
      groupBonusApplied,
      groupBonusPercent: groupBonus,
    };
  }

  /**
   * Calculate mission XP bonus for group
   */
  calculateMissionGroupBonus(
    baseXp: number,
    groupSize: number
  ): { totalXp: number; bonusXp: number; bonusPercent: number } {
    const bonus = this.calculateGroupBonus(groupSize);
    const bonusXp = Math.floor(baseXp * bonus);
    return {
      totalXp: baseXp + bonusXp,
      bonusXp,
      bonusPercent: bonus,
    };
  }

  /**
   * Get eligible members for XP sharing
   */
  private getEligibleMembers(members: GroupMember[]): GroupMember[] {
    return members.filter((member) => {
      // Must be online (unless offline sharing is enabled)
      if (!member.online && !this.options.offlineShare) {
        return false;
      }

      // Must be within range
      if (member.distance > this.options.maxShareDistance) {
        return false;
      }

      return true;
    });
  }

  /**
   * Calculate group bonus percentage
   */
  private calculateGroupBonus(memberCount: number): number {
    if (memberCount <= 1) return 0;

    // Bonus for each member beyond the first
    const bonus = (memberCount - 1) * this.options.groupBonusPerMember;
    return Math.min(bonus, this.options.maxGroupBonus);
  }

  /**
   * Calculate average level of group members
   */
  private calculateAverageLevel(members: GroupMember[]): number {
    if (members.length === 0) return 1;
    const totalLevel = members.reduce((sum, m) => sum + m.player.level, 0);
    return totalLevel / members.length;
  }

  /**
   * Calculate level-based XP modifier
   */
  private calculateLevelModifier(
    memberLevel: number,
    averageLevel: number
  ): number {
    if (!this.options.levelScaling) return 1.0;

    const levelDifference = memberLevel - averageLevel;

    // No modification if within threshold
    if (Math.abs(levelDifference) < this.options.levelScaleThreshold) {
      return 1.0;
    }

    // Scale based on level difference
    const modifier = 1.0 + levelDifference * 0.02;
    return Math.max(
      this.options.minLevelModifier,
      Math.min(this.options.maxLevelModifier, modifier)
    );
  }

  /**
   * Calculate distance-based modifier
   */
  private calculateDistanceModifier(distance: number): number {
    // Full XP up to half the max range
    const halfRange = this.options.maxShareDistance / 2;
    if (distance <= halfRange) {
      return 1.0;
    }

    // Gradual reduction from half range to max range
    const reduction =
      (distance - halfRange) / (this.options.maxShareDistance - halfRange);
    return Math.max(0.8, 1.0 - reduction * 0.2);
  }

  /**
   * Handle solo distribution (no group sharing)
   */
  private distributeSolo(
    xpDistribution: XpDistribution,
    player: PlayerObject,
    source: string
  ): GroupXpResult {
    const memberShares: MemberXpShare[] = [];
    let totalDistributed = 0;
    let xpLost = 0;

    for (const [xpType, amount] of xpDistribution.xpByType) {
      const result = this.xpManager.awardXp(player, xpType, amount, {
        source,
        checkSkills: true,
      });
      totalDistributed += result.awarded;
      xpLost += result.capped;
    }

    memberShares.push({
      playerId: player.objectId,
      amount: totalDistributed,
      modifier: 1.0,
      applied: true,
    });

    return {
      totalDistributed,
      xpLost,
      memberShares,
      groupBonusApplied: false,
      groupBonusPercent: 0,
    };
  }

  /**
   * Sum all XP in a distribution
   */
  private sumXpDistribution(distribution: XpDistribution): number {
    let total = 0;
    for (const [_, amount] of distribution.xpByType) {
      total += amount;
    }
    return total;
  }

  /**
   * Check if a member is eligible for XP sharing
   */
  isEligibleForShare(member: GroupMember): {
    eligible: boolean;
    reason?: string;
  } {
    if (!member.online && !this.options.offlineShare) {
      return { eligible: false, reason: 'Member is offline' };
    }

    if (member.distance > this.options.maxShareDistance) {
      return {
        eligible: false,
        reason: `Member is too far (${Math.floor(member.distance)}m, max ${this.options.maxShareDistance}m)`,
      };
    }

    return { eligible: true };
  }

  /**
   * Get the maximum share distance
   */
  getMaxShareDistance(): number {
    return this.options.maxShareDistance;
  }

  /**
   * Calculate expected share for a member
   * (useful for UI previews)
   */
  calculateExpectedShare(
    totalXp: number,
    memberLevel: number,
    groupMembers: GroupMember[]
  ): number {
    const eligible = this.getEligibleMembers(groupMembers);
    if (eligible.length === 0) return 0;

    const averageLevel = this.calculateAverageLevel(eligible);
    const levelModifier = this.calculateLevelModifier(memberLevel, averageLevel);
    const groupBonus = this.calculateGroupBonus(eligible.length);
    const bonusXp = totalXp * (1 + groupBonus);
    const baseShare = bonusXp / eligible.length;

    return Math.floor(baseShare * levelModifier);
  }
}

/**
 * Global group XP manager singleton
 */
let globalGroupXpManager: GroupXpManager | null = null;

/**
 * Get the global group XP manager
 */
export function getGroupXpManager(): GroupXpManager {
  if (!globalGroupXpManager) {
    globalGroupXpManager = new GroupXpManager();
  }
  return globalGroupXpManager;
}

/**
 * Create a new group XP manager (for testing or custom options)
 */
export function createGroupXpManager(
  options?: GroupXpOptions,
  xpManager?: XpManager,
  eventEmitter?: XpEventEmitter
): GroupXpManager {
  return new GroupXpManager(options, xpManager, eventEmitter);
}
