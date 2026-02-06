/**
 * Battlefield Reward Calculator
 * Calculates and distributes rewards for PvP battlefield participation
 *
 * Handles:
 * - Performance-based reward calculations
 * - Winning team bonuses
 * - MVP bonuses
 * - Participation rewards
 * - Token shop integration
 */

import type { ObjectId } from '@swg/shared-types';
import { Faction, GCWContributionSource } from '../faction/faction-types.js';
import type { FactionManager } from '../faction/faction-manager.js';
import type { GCWManager } from '../faction/gcw-manager.js';
import {
  BattlefieldRewardType,
  TeamDesignation,
  type BattlefieldMatchResult,
  type BattlefieldParticipant,
  type BattlefieldReward,
  type ParticipantRewardInfo,
  getFactionFromTeam,
  calculateParticipantScore,
} from './battlefield-types.js';

// ============================================
// Constants
// ============================================

/** Base token reward for participation */
export const BASE_TOKEN_REWARD = 10;

/** Winning team token multiplier */
export const WINNER_TOKEN_MULTIPLIER = 2.0;

/** MVP token bonus */
export const MVP_TOKEN_BONUS = 50;

/** Base faction point reward */
export const BASE_FACTION_POINT_REWARD = 25;

/** Winning team faction point multiplier */
export const WINNER_FACTION_MULTIPLIER = 1.5;

/** MVP faction point bonus */
export const MVP_FACTION_BONUS = 100;

/** Base GCW point reward */
export const BASE_GCW_POINT_REWARD = 50;

/** Winning team GCW point multiplier */
export const WINNER_GCW_MULTIPLIER = 2.0;

/** MVP GCW point bonus */
export const MVP_GCW_BONUS = 200;

/** Points per kill for bonus calculation */
export const POINTS_PER_KILL_BONUS = 1;

/** Points per objective for bonus calculation */
export const POINTS_PER_OBJECTIVE_BONUS = 5;

/** Minimum participation time for full rewards (ms) */
export const MIN_PARTICIPATION_TIME_MS = 5 * 60 * 1000; // 5 minutes

/** Reduced reward multiplier for early leavers */
export const EARLY_LEAVER_MULTIPLIER = 0.25;

// ============================================
// Configuration
// ============================================

/**
 * Battlefield reward calculator configuration
 */
export interface BattlefieldRewardConfig {
  /** Enable detailed logging */
  enableLogging: boolean;
  /** Base token reward */
  baseTokenReward: number;
  /** Winner token multiplier */
  winnerTokenMultiplier: number;
  /** MVP token bonus */
  mvpTokenBonus: number;
  /** Base faction point reward */
  baseFactionPointReward: number;
  /** Winner faction point multiplier */
  winnerFactionMultiplier: number;
  /** MVP faction point bonus */
  mvpFactionBonus: number;
  /** Base GCW point reward */
  baseGCWPointReward: number;
  /** Winner GCW point multiplier */
  winnerGCWMultiplier: number;
  /** MVP GCW point bonus */
  mvpGCWBonus: number;
  /** Minimum participation time for full rewards (ms) */
  minParticipationTimeMs: number;
  /** Early leaver multiplier */
  earlyLeaverMultiplier: number;
  /** Region ID for GCW contribution (optional) */
  gcwRegionId?: string;
}

/**
 * Default reward calculator configuration
 */
export const DEFAULT_REWARD_CONFIG: BattlefieldRewardConfig = {
  enableLogging: false,
  baseTokenReward: BASE_TOKEN_REWARD,
  winnerTokenMultiplier: WINNER_TOKEN_MULTIPLIER,
  mvpTokenBonus: MVP_TOKEN_BONUS,
  baseFactionPointReward: BASE_FACTION_POINT_REWARD,
  winnerFactionMultiplier: WINNER_FACTION_MULTIPLIER,
  mvpFactionBonus: MVP_FACTION_BONUS,
  baseGCWPointReward: BASE_GCW_POINT_REWARD,
  winnerGCWMultiplier: WINNER_GCW_MULTIPLIER,
  mvpGCWBonus: MVP_GCW_BONUS,
  minParticipationTimeMs: MIN_PARTICIPATION_TIME_MS,
  earlyLeaverMultiplier: EARLY_LEAVER_MULTIPLIER,
};

// ============================================
// Result Types
// ============================================

/**
 * Result of distributing rewards
 */
export interface DistributeRewardsResult {
  /** Whether distribution succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Rewards given to each participant */
  participantRewards: ParticipantRewardInfo[];
  /** Total tokens distributed */
  totalTokensDistributed: number;
  /** Total faction points distributed */
  totalFactionPointsDistributed: number;
  /** Total GCW points distributed */
  totalGCWPointsDistributed: number;
}

/**
 * Calculated reward breakdown
 */
export interface RewardBreakdown {
  /** Base rewards */
  baseTokens: number;
  baseFactionPoints: number;
  baseGCWPoints: number;
  /** Performance bonus */
  performanceBonus: number;
  /** Winner bonus */
  winnerBonus: number;
  /** MVP bonus */
  mvpBonus: number;
  /** Participation multiplier */
  participationMultiplier: number;
  /** Final totals */
  totalTokens: number;
  totalFactionPoints: number;
  totalGCWPoints: number;
}

// ============================================
// Event Types
// ============================================

/**
 * Event emitted when rewards are distributed to a player
 */
export interface RewardsDistributedEvent {
  playerId: ObjectId;
  battlefieldId: ObjectId;
  rewards: BattlefieldReward[];
  isWinner: boolean;
  isMVP: boolean;
  timestamp: Date;
}

/**
 * Event emitted when tokens are earned
 */
export interface TokensEarnedEvent {
  playerId: ObjectId;
  amount: number;
  newTotal: number;
  source: string;
  timestamp: Date;
}

// ============================================
// Handler Types
// ============================================

export type RewardsDistributedHandler = (event: RewardsDistributedEvent) => void;
export type TokensEarnedHandler = (event: TokensEarnedEvent) => void;

// ============================================
// Repository Interface
// ============================================

/**
 * Expected interface for reward repository
 */
export interface BattlefieldRewardRepository {
  /** Get player's current token balance */
  getPlayerTokens(playerId: ObjectId): Promise<number>;

  /** Add tokens to player's balance */
  addPlayerTokens(playerId: ObjectId, amount: number): Promise<number>;

  /** Remove tokens from player's balance */
  removePlayerTokens(playerId: ObjectId, amount: number): Promise<number>;

  /** Get token shop items */
  getTokenShopItems(): Promise<TokenShopItem[]>;

  /** Get a specific token shop item */
  getTokenShopItem(itemId: string): Promise<TokenShopItem | undefined>;

  /** Record a token shop purchase */
  recordTokenPurchase(playerId: ObjectId, itemId: string): Promise<void>;

  /** Get player's purchase history */
  getPlayerPurchaseHistory(playerId: ObjectId, limit: number): Promise<TokenPurchaseRecord[]>;
}

/**
 * Token shop item
 */
export interface TokenShopItem {
  /** Unique item ID */
  itemId: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Category */
  category: TokenShopCategory;
  /** Token cost */
  tokenCost: number;
  /** Template CRC for item creation */
  templateCrc: number;
  /** Required faction (null for any) */
  requiredFaction: Faction | null;
  /** Required wins to unlock (0 for none) */
  requiredWins: number;
  /** Whether item is currently available */
  available: boolean;
  /** Daily purchase limit (0 for unlimited) */
  dailyLimit: number;
}

/**
 * Token shop categories
 */
export enum TokenShopCategory {
  ARMOR = 'armor',
  WEAPON = 'weapon',
  DECORATION = 'decoration',
  MOUNT = 'mount',
  CONSUMABLE = 'consumable',
  APPEARANCE = 'appearance',
}

/**
 * Token purchase record
 */
export interface TokenPurchaseRecord {
  playerId: ObjectId;
  itemId: string;
  itemName: string;
  tokenCost: number;
  purchasedAt: Date;
}

// ============================================
// Battlefield Reward Calculator Class
// ============================================

/**
 * Battlefield Reward Calculator
 * Handles all reward calculations and distribution for battlefields
 */
export class BattlefieldRewardCalculator {
  private repository: BattlefieldRewardRepository;
  private factionManager: FactionManager;
  private gcwManager: GCWManager | null;
  private config: BattlefieldRewardConfig;

  /** Event handlers */
  private rewardsDistributedHandlers: Set<RewardsDistributedHandler>;
  private tokensEarnedHandlers: Set<TokensEarnedHandler>;

  /**
   * Create a new Battlefield Reward Calculator
   */
  constructor(
    repository: BattlefieldRewardRepository,
    factionManager: FactionManager,
    gcwManager: GCWManager | null = null,
    config: Partial<BattlefieldRewardConfig> = {}
  ) {
    this.repository = repository;
    this.factionManager = factionManager;
    this.gcwManager = gcwManager;
    this.config = { ...DEFAULT_REWARD_CONFIG, ...config };

    this.rewardsDistributedHandlers = new Set();
    this.tokensEarnedHandlers = new Set();
  }

  // ============================================
  // Event Registration
  // ============================================

  onRewardsDistributed(handler: RewardsDistributedHandler): void {
    this.rewardsDistributedHandlers.add(handler);
  }

  offRewardsDistributed(handler: RewardsDistributedHandler): void {
    this.rewardsDistributedHandlers.delete(handler);
  }

  onTokensEarned(handler: TokensEarnedHandler): void {
    this.tokensEarnedHandlers.add(handler);
  }

  offTokensEarned(handler: TokensEarnedHandler): void {
    this.tokensEarnedHandlers.delete(handler);
  }

  // ============================================
  // Event Emission
  // ============================================

  private emitRewardsDistributed(event: RewardsDistributedEvent): void {
    for (const handler of this.rewardsDistributedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[BattlefieldRewardCalculator] Error in rewards distributed handler:', error);
      }
    }
  }

  private emitTokensEarned(event: TokensEarnedEvent): void {
    for (const handler of this.tokensEarnedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[BattlefieldRewardCalculator] Error in tokens earned handler:', error);
      }
    }
  }

  // ============================================
  // Reward Calculation
  // ============================================

  /**
   * Calculate rewards for a participant
   */
  calculateRewards(
    participant: BattlefieldParticipant,
    matchResult: BattlefieldMatchResult,
    isMVP: boolean
  ): RewardBreakdown {
    const isWinner = matchResult.winningTeam === participant.team;
    const isDraw = matchResult.winningTeam === null;

    // Calculate participation multiplier based on time in match
    const participationTimeMs = matchResult.completedAt.getTime() - participant.joinedAt.getTime();
    let participationMultiplier = 1.0;
    if (!participant.active && participationTimeMs < this.config.minParticipationTimeMs) {
      participationMultiplier = this.config.earlyLeaverMultiplier;
    }

    // Base rewards
    const baseTokens = this.config.baseTokenReward;
    const baseFactionPoints = this.config.baseFactionPointReward;
    const baseGCWPoints = this.config.baseGCWPointReward;

    // Performance bonus based on kills and objectives
    const performanceScore = calculateParticipantScore(participant);
    const performanceBonus = Math.floor(performanceScore / 10);

    // Winner bonus
    let winnerBonus = 0;
    if (isWinner) {
      winnerBonus = 1;
    } else if (isDraw) {
      winnerBonus = 0.5;
    }

    // MVP bonus
    const mvpBonus = isMVP ? 1 : 0;

    // Calculate final totals
    const winnerTokenMultiplier = isWinner ? this.config.winnerTokenMultiplier : (isDraw ? 1.25 : 1.0);
    const winnerFactionMultiplier = isWinner ? this.config.winnerFactionMultiplier : (isDraw ? 1.15 : 1.0);
    const winnerGCWMultiplier = isWinner ? this.config.winnerGCWMultiplier : (isDraw ? 1.25 : 1.0);

    let totalTokens = Math.floor(
      (baseTokens + performanceBonus) * winnerTokenMultiplier * participationMultiplier
    );
    if (isMVP) {
      totalTokens += this.config.mvpTokenBonus;
    }

    let totalFactionPoints = Math.floor(
      (baseFactionPoints + performanceBonus) * winnerFactionMultiplier * participationMultiplier
    );
    if (isMVP) {
      totalFactionPoints += this.config.mvpFactionBonus;
    }

    let totalGCWPoints = Math.floor(
      (baseGCWPoints + performanceBonus) * winnerGCWMultiplier * participationMultiplier
    );
    if (isMVP) {
      totalGCWPoints += this.config.mvpGCWBonus;
    }

    return {
      baseTokens,
      baseFactionPoints,
      baseGCWPoints,
      performanceBonus,
      winnerBonus,
      mvpBonus,
      participationMultiplier,
      totalTokens,
      totalFactionPoints,
      totalGCWPoints,
    };
  }

  /**
   * Determine the MVP of a match
   */
  determineMVP(participants: BattlefieldParticipant[]): ObjectId | null {
    if (participants.length === 0) return null;

    let mvp: BattlefieldParticipant | null = null;
    let highestScore = -1;

    for (const participant of participants) {
      const score = calculateParticipantScore(participant);
      if (score > highestScore) {
        highestScore = score;
        mvp = participant;
      }
    }

    return mvp?.playerId ?? null;
  }

  /**
   * Determine MVPs per team
   */
  determineMVPsPerTeam(
    participants: BattlefieldParticipant[]
  ): Map<TeamDesignation, ObjectId | null> {
    const mvps = new Map<TeamDesignation, ObjectId | null>();

    const imperialPlayers = participants.filter(
      (p) => p.team === TeamDesignation.TEAM_IMPERIAL
    );
    const rebelPlayers = participants.filter(
      (p) => p.team === TeamDesignation.TEAM_REBEL
    );

    mvps.set(TeamDesignation.TEAM_IMPERIAL, this.determineMVP(imperialPlayers));
    mvps.set(TeamDesignation.TEAM_REBEL, this.determineMVP(rebelPlayers));

    return mvps;
  }

  // ============================================
  // Reward Distribution
  // ============================================

  /**
   * Distribute rewards to all participants
   */
  async distributeRewards(matchResult: BattlefieldMatchResult): Promise<DistributeRewardsResult> {
    const participantRewards: ParticipantRewardInfo[] = [];
    let totalTokensDistributed = 0;
    let totalFactionPointsDistributed = 0;
    let totalGCWPointsDistributed = 0;

    // Determine MVPs
    const mvp = this.determineMVP(matchResult.participants);
    const teamMVPs = this.determineMVPsPerTeam(matchResult.participants);

    for (const participant of matchResult.participants) {
      const isWinner = matchResult.winningTeam === participant.team;
      const isMVP =
        participant.playerId === mvp ||
        participant.playerId === teamMVPs.get(participant.team);

      // Calculate rewards
      const breakdown = this.calculateRewards(participant, matchResult, isMVP);

      // Create reward list
      const rewards: BattlefieldReward[] = [];

      // Add tokens
      if (breakdown.totalTokens > 0) {
        rewards.push({
          type: BattlefieldRewardType.TOKENS,
          amount: breakdown.totalTokens,
        });

        // Grant tokens
        const newTotal = await this.repository.addPlayerTokens(
          participant.playerId,
          breakdown.totalTokens
        );
        totalTokensDistributed += breakdown.totalTokens;

        this.emitTokensEarned({
          playerId: participant.playerId,
          amount: breakdown.totalTokens,
          newTotal,
          source: 'battlefield',
          timestamp: new Date(),
        });
      }

      // Add faction points
      if (breakdown.totalFactionPoints > 0) {
        rewards.push({
          type: BattlefieldRewardType.FACTION_POINTS,
          amount: breakdown.totalFactionPoints,
        });

        // Grant faction points
        await this.factionManager.addPoints(
          participant.playerId,
          breakdown.totalFactionPoints,
          'battlefield'
        );
        totalFactionPointsDistributed += breakdown.totalFactionPoints;
      }

      // Add GCW points
      if (breakdown.totalGCWPoints > 0 && this.gcwManager && this.config.gcwRegionId) {
        rewards.push({
          type: BattlefieldRewardType.GCW_POINTS,
          amount: breakdown.totalGCWPoints,
        });

        // Grant GCW points
        const faction = getFactionFromTeam(participant.team);
        await this.gcwManager.contributePoints(
          participant.playerId,
          this.config.gcwRegionId,
          faction,
          breakdown.totalGCWPoints,
          GCWContributionSource.OBJECTIVE_CAPTURE
        );
        totalGCWPointsDistributed += breakdown.totalGCWPoints;
      }

      // Calculate bonus multiplier for info
      let bonusMultiplier = 1.0;
      if (isWinner) bonusMultiplier *= this.config.winnerTokenMultiplier;
      if (isMVP) bonusMultiplier *= 1.5;
      bonusMultiplier *= breakdown.participationMultiplier;

      participantRewards.push({
        playerId: participant.playerId,
        isWinner,
        isMVP,
        rewards,
        bonusMultiplier,
      });

      this.emitRewardsDistributed({
        playerId: participant.playerId,
        battlefieldId: matchResult.battlefieldId,
        rewards,
        isWinner,
        isMVP,
        timestamp: new Date(),
      });
    }

    if (this.config.enableLogging) {
      console.log(
        `[BattlefieldRewardCalculator] Distributed rewards: ${totalTokensDistributed} tokens, ` +
          `${totalFactionPointsDistributed} faction points, ${totalGCWPointsDistributed} GCW points`
      );
    }

    return {
      success: true,
      participantRewards,
      totalTokensDistributed,
      totalFactionPointsDistributed,
      totalGCWPointsDistributed,
    };
  }

  // ============================================
  // Token Shop
  // ============================================

  /**
   * Get available token shop items for a player
   */
  async getAvailableShopItems(playerId: ObjectId): Promise<TokenShopItem[]> {
    const allItems = await this.repository.getTokenShopItems();
    const playerFaction = await this.factionManager.getPlayerFaction(playerId);
    const playerTokens = await this.repository.getPlayerTokens(playerId);

    return allItems.filter((item) => {
      if (!item.available) return false;
      if (item.requiredFaction !== null && item.requiredFaction !== playerFaction) {
        return false;
      }
      return true;
    });
  }

  /**
   * Purchase an item from the token shop
   */
  async purchaseShopItem(playerId: ObjectId, itemId: string): Promise<{
    success: boolean;
    error?: string;
    item?: TokenShopItem;
    remainingTokens?: number;
  }> {
    const item = await this.repository.getTokenShopItem(itemId);
    if (!item) {
      return {
        success: false,
        error: 'Item not found.',
      };
    }

    if (!item.available) {
      return {
        success: false,
        error: 'This item is currently unavailable.',
      };
    }

    // Check faction requirement
    if (item.requiredFaction !== null) {
      const playerFaction = await this.factionManager.getPlayerFaction(playerId);
      if (playerFaction !== item.requiredFaction) {
        return {
          success: false,
          error: 'This item is not available to your faction.',
        };
      }
    }

    // Check token balance
    const currentTokens = await this.repository.getPlayerTokens(playerId);
    if (currentTokens < item.tokenCost) {
      return {
        success: false,
        error: `Insufficient tokens. Need ${item.tokenCost}, have ${currentTokens}.`,
      };
    }

    // Deduct tokens
    const remainingTokens = await this.repository.removePlayerTokens(playerId, item.tokenCost);

    // Record purchase
    await this.repository.recordTokenPurchase(playerId, itemId);

    if (this.config.enableLogging) {
      console.log(`[BattlefieldRewardCalculator] Player ${playerId} purchased ${item.name}`);
    }

    return {
      success: true,
      item,
      remainingTokens,
    };
  }

  /**
   * Get player's current token balance
   */
  async getPlayerTokenBalance(playerId: ObjectId): Promise<number> {
    return this.repository.getPlayerTokens(playerId);
  }

  /**
   * Get player's purchase history
   */
  async getPlayerPurchaseHistory(
    playerId: ObjectId,
    limit: number = 10
  ): Promise<TokenPurchaseRecord[]> {
    return this.repository.getPlayerPurchaseHistory(playerId, limit);
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Battlefield Reward Calculator instance
 */
export function createBattlefieldRewardCalculator(
  repository: BattlefieldRewardRepository,
  factionManager: FactionManager,
  gcwManager?: GCWManager,
  config?: Partial<BattlefieldRewardConfig>
): BattlefieldRewardCalculator {
  return new BattlefieldRewardCalculator(repository, factionManager, gcwManager ?? null, config);
}
