/**
 * Faction Reward Manager
 * Manages faction point rewards for various activities in the Galactic Civil War
 *
 * Handles:
 * - Faction point rewards for NPC and player kills
 * - Mission completion rewards
 * - Base defense rewards
 * - Purchasable items with faction points
 * - Reward scaling based on rank and region control
 */

import type { ObjectId } from '@swg/shared-types';
import {
  Faction,
  FactionStatus,
  GCWContributionSource,
  DEFAULT_NPC_KILL_POINTS,
  DEFAULT_PLAYER_KILL_POINTS,
  type FactionNPCTemplate,
  type FactionRank,
  isGCWFaction,
  getOpposingFaction,
  getFactionName,
  getRankByPoints,
} from './faction-types.js';
import type { FactionManager } from './faction-manager.js';
import type { GCWManager } from './gcw-manager.js';

// ============================================
// Constants
// ============================================

/** Base points for completing a faction mission */
export const MISSION_BASE_POINTS = 50;

/** Bonus points per mission difficulty level */
export const MISSION_DIFFICULTY_BONUS = 25;

/** Points for defending a faction base */
export const BASE_DEFENSE_POINTS = 100;

/** Points for destroying an enemy base */
export const BASE_DESTRUCTION_POINTS = 500;

/** Points for capturing an objective */
export const OBJECTIVE_CAPTURE_POINTS = 75;

/** Kill streak bonus multiplier (per kill in streak) */
export const KILL_STREAK_MULTIPLIER = 0.1;

/** Maximum kill streak bonus */
export const MAX_KILL_STREAK_BONUS = 2.0;

/** Cooldown between same player kills (ms) - anti-farming */
export const SAME_PLAYER_KILL_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

/** Maximum kills from same player per hour */
export const MAX_SAME_PLAYER_KILLS_PER_HOUR = 3;

// ============================================
// Configuration
// ============================================

/**
 * Faction reward manager configuration
 */
export interface FactionRewardConfig {
  /** Enable detailed logging */
  enableLogging: boolean;
  /** Base NPC kill points */
  npcKillPoints: number;
  /** Base player kill points */
  playerKillPoints: number;
  /** Mission base points */
  missionBasePoints: number;
  /** Mission difficulty bonus */
  missionDifficultyBonus: number;
  /** Base defense points */
  baseDefensePoints: number;
  /** Base destruction points */
  baseDestructionPoints: number;
  /** Enable anti-farming protection */
  enableAntiFarming: boolean;
  /** Same player kill cooldown (ms) */
  samePlayerKillCooldownMs: number;
  /** Max same player kills per hour */
  maxSamePlayerKillsPerHour: number;
}

/**
 * Default faction reward configuration
 */
export const DEFAULT_REWARD_CONFIG: FactionRewardConfig = {
  enableLogging: false,
  npcKillPoints: DEFAULT_NPC_KILL_POINTS,
  playerKillPoints: DEFAULT_PLAYER_KILL_POINTS,
  missionBasePoints: MISSION_BASE_POINTS,
  missionDifficultyBonus: MISSION_DIFFICULTY_BONUS,
  baseDefensePoints: BASE_DEFENSE_POINTS,
  baseDestructionPoints: BASE_DESTRUCTION_POINTS,
  enableAntiFarming: true,
  samePlayerKillCooldownMs: SAME_PLAYER_KILL_COOLDOWN_MS,
  maxSamePlayerKillsPerHour: MAX_SAME_PLAYER_KILLS_PER_HOUR,
};

// ============================================
// Result Types
// ============================================

/**
 * Result of awarding faction points
 */
export interface RewardResult {
  /** Whether the reward was granted */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Base points before modifiers */
  basePoints?: number;
  /** Final points after modifiers */
  finalPoints?: number;
  /** Modifiers applied */
  modifiers?: RewardModifier[];
  /** Message to display to player */
  message?: string;
  /** GCW points contributed (if any) */
  gcwPointsContributed?: number;
}

/**
 * Reward modifier applied
 */
export interface RewardModifier {
  /** Modifier name */
  name: string;
  /** Modifier type */
  type: 'multiplier' | 'bonus' | 'penalty';
  /** Modifier value */
  value: number;
}

// ============================================
// Faction Item Types
// ============================================

/**
 * Faction item category
 */
export enum FactionItemCategory {
  ARMOR = 'armor',
  WEAPON = 'weapon',
  VEHICLE = 'vehicle',
  FURNITURE = 'furniture',
  CONSUMABLE = 'consumable',
  SCHEMATIC = 'schematic',
  DECORATION = 'decoration',
  PET = 'pet',
}

/**
 * Purchasable faction item
 */
export interface FactionItem {
  /** Unique item identifier */
  itemId: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Faction this item belongs to */
  faction: Faction;
  /** Item category */
  category: FactionItemCategory;
  /** Template CRC for item creation */
  templateCrc: number;
  /** Faction point cost */
  factionPointCost: number;
  /** Credit cost (if any) */
  creditCost: number;
  /** Minimum rank required */
  rankRequired: number;
  /** Faction status required (null = any) */
  statusRequired: FactionStatus | null;
  /** Stock limit (0 = unlimited) */
  stockLimit: number;
  /** Daily purchase limit per player (0 = unlimited) */
  dailyLimit: number;
  /** Whether item is currently available */
  available: boolean;
}

/**
 * Faction vendor inventory
 */
export interface FactionVendorInventory {
  /** Vendor identifier */
  vendorId: string;
  /** Faction this vendor serves */
  faction: Faction;
  /** Items available */
  items: FactionItem[];
  /** Location (planet, city) */
  location: string;
}

// ============================================
// Event Types
// ============================================

/**
 * Event emitted when reward is granted
 */
export interface RewardGrantedEvent {
  playerId: ObjectId;
  faction: Faction;
  points: number;
  source: GCWContributionSource;
  regionId?: string;
  timestamp: Date;
}

/**
 * Event emitted when item is purchased
 */
export interface FactionItemPurchasedEvent {
  playerId: ObjectId;
  faction: Faction;
  item: FactionItem;
  pointsSpent: number;
  creditsSpent: number;
  timestamp: Date;
}

// ============================================
// Handler Types
// ============================================

export type RewardGrantedHandler = (event: RewardGrantedEvent) => void;
export type FactionItemPurchasedHandler = (event: FactionItemPurchasedEvent) => void;

// ============================================
// Repository Interface
// ============================================

/**
 * Expected interface for faction reward repository
 */
export interface FactionRewardRepository {
  /** Get NPC template for faction point calculation */
  getNPCTemplate(templateId: string): Promise<FactionNPCTemplate | undefined>;

  /** Get all faction items for a faction */
  getFactionItems(faction: Faction): Promise<FactionItem[]>;

  /** Get a specific faction item */
  getFactionItem(itemId: string): Promise<FactionItem | undefined>;

  /** Get player's purchase count for item today */
  getPlayerItemPurchaseCount(playerId: ObjectId, itemId: string): Promise<number>;

  /** Record item purchase */
  recordItemPurchase(playerId: ObjectId, itemId: string): Promise<void>;

  /** Get player's kills of a specific player */
  getPlayerKillsOf(killerId: ObjectId, victimId: ObjectId, sinceMs: number): Promise<number>;

  /** Record a player kill */
  recordPlayerKill(killerId: ObjectId, victimId: ObjectId): Promise<void>;

  /** Get last kill time of a specific player by killer */
  getLastKillTime(killerId: ObjectId, victimId: ObjectId): Promise<Date | null>;
}

// ============================================
// Anti-Farming Tracker
// ============================================

/**
 * Track player kills for anti-farming
 */
interface PlayerKillRecord {
  victimId: ObjectId;
  timestamp: Date;
}

// ============================================
// Faction Reward Manager Class
// ============================================

/**
 * Faction Reward Manager
 * Handles all faction point reward calculations and item purchases
 */
export class FactionRewardManager {
  private repository: FactionRewardRepository;
  private factionManager: FactionManager;
  private gcwManager: GCWManager;
  private config: FactionRewardConfig;

  /** Recent player kills for anti-farming */
  private recentKills: Map<ObjectId, PlayerKillRecord[]>;

  /** Event handlers */
  private rewardGrantedHandlers: Set<RewardGrantedHandler>;
  private itemPurchasedHandlers: Set<FactionItemPurchasedHandler>;

  /**
   * Create a new Faction Reward Manager
   */
  constructor(
    repository: FactionRewardRepository,
    factionManager: FactionManager,
    gcwManager: GCWManager,
    config: Partial<FactionRewardConfig> = {}
  ) {
    this.repository = repository;
    this.factionManager = factionManager;
    this.gcwManager = gcwManager;
    this.config = { ...DEFAULT_REWARD_CONFIG, ...config };
    this.recentKills = new Map();
    this.rewardGrantedHandlers = new Set();
    this.itemPurchasedHandlers = new Set();
  }

  // ============================================
  // Event Registration
  // ============================================

  onRewardGranted(handler: RewardGrantedHandler): void {
    this.rewardGrantedHandlers.add(handler);
  }

  offRewardGranted(handler: RewardGrantedHandler): void {
    this.rewardGrantedHandlers.delete(handler);
  }

  onItemPurchased(handler: FactionItemPurchasedHandler): void {
    this.itemPurchasedHandlers.add(handler);
  }

  offItemPurchased(handler: FactionItemPurchasedHandler): void {
    this.itemPurchasedHandlers.delete(handler);
  }

  // ============================================
  // Event Emission
  // ============================================

  private emitRewardGranted(event: RewardGrantedEvent): void {
    for (const handler of this.rewardGrantedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[FactionRewardManager] Error in reward granted handler:', error);
      }
    }
  }

  private emitItemPurchased(event: FactionItemPurchasedEvent): void {
    for (const handler of this.itemPurchasedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[FactionRewardManager] Error in item purchased handler:', error);
      }
    }
  }

  // ============================================
  // NPC Kill Rewards
  // ============================================

  /**
   * Award points for killing a faction NPC
   */
  async awardNPCKillPoints(
    playerId: ObjectId,
    npcTemplateId: string,
    regionId?: string
  ): Promise<RewardResult> {
    const playerData = await this.factionManager.getPlayerData(playerId);

    if (!isGCWFaction(playerData.currentFaction)) {
      return {
        success: false,
        error: 'You must be enlisted in a faction to earn faction points.',
      };
    }

    // Check player status
    if (playerData.currentStatus === FactionStatus.NON_COMBATANT) {
      return {
        success: false,
        error: 'You must be a Combatant or Special Forces to earn faction points from kills.',
      };
    }

    const npcTemplate = await this.repository.getNPCTemplate(npcTemplateId);
    if (!npcTemplate) {
      // Default points if no template found
      return this.grantReward(
        playerId,
        this.config.npcKillPoints,
        GCWContributionSource.NPC_KILL,
        regionId
      );
    }

    // Check if NPC is from opposing faction
    if (npcTemplate.faction !== getOpposingFaction(playerData.currentFaction)) {
      return {
        success: false,
        error: 'This NPC is not an enemy of your faction.',
      };
    }

    // Calculate base points
    let basePoints = npcTemplate.pointsOnKill;
    const modifiers: RewardModifier[] = [];

    // Add bonus points for elite NPCs
    if (npcTemplate.bonusPoints > 0) {
      basePoints += npcTemplate.bonusPoints;
      modifiers.push({
        name: 'Elite NPC',
        type: 'bonus',
        value: npcTemplate.bonusPoints,
      });
    }

    // Check rank for full points
    const playerRank = await this.factionManager.getPlayerRank(playerId);
    if (playerRank && playerRank.rank < npcTemplate.minRankForFullPoints) {
      const reduction = 0.5;
      modifiers.push({
        name: 'Rank Penalty',
        type: 'penalty',
        value: reduction,
      });
      basePoints = Math.floor(basePoints * reduction);
    }

    // Special Forces bonus
    if (playerData.currentStatus === FactionStatus.SPECIAL_FORCES) {
      modifiers.push({
        name: 'Special Forces',
        type: 'multiplier',
        value: 1.5,
      });
      basePoints = Math.floor(basePoints * 1.5);
    }

    return this.grantReward(playerId, basePoints, GCWContributionSource.NPC_KILL, regionId, modifiers);
  }

  // ============================================
  // Player Kill Rewards
  // ============================================

  /**
   * Award points for killing an enemy player
   */
  async awardPlayerKillPoints(
    killerId: ObjectId,
    victimId: ObjectId,
    regionId?: string
  ): Promise<RewardResult> {
    const killerData = await this.factionManager.getPlayerData(killerId);
    const victimData = await this.factionManager.getPlayerData(victimId);

    // Verify factions are opposing
    if (!isGCWFaction(killerData.currentFaction) || !isGCWFaction(victimData.currentFaction)) {
      return {
        success: false,
        error: 'Both players must be faction-aligned for PvP rewards.',
      };
    }

    if (killerData.currentFaction === victimData.currentFaction) {
      return {
        success: false,
        error: 'Cannot earn points for killing same-faction players.',
      };
    }

    // Anti-farming checks
    if (this.config.enableAntiFarming) {
      const farmingResult = await this.checkAntiFarming(killerId, victimId);
      if (!farmingResult.allowed) {
        return {
          success: false,
          error: farmingResult.reason,
        };
      }
    }

    // Calculate base points
    let basePoints = this.config.playerKillPoints;
    const modifiers: RewardModifier[] = [];

    // Kill streak bonus
    const killerStanding = killerData.standings.get(killerData.currentFaction);
    if (killerStanding) {
      const killStreak = killerData.killStreak;
      if (killStreak > 0) {
        const streakBonus = Math.min(MAX_KILL_STREAK_BONUS, 1 + killStreak * KILL_STREAK_MULTIPLIER);
        modifiers.push({
          name: `Kill Streak (${killStreak})`,
          type: 'multiplier',
          value: streakBonus,
        });
        basePoints = Math.floor(basePoints * streakBonus);
      }
    }

    // Rank difference bonus/penalty
    const killerRank = await this.factionManager.getPlayerRank(killerId);
    const victimRank = await this.factionManager.getPlayerRank(victimId);
    if (killerRank && victimRank) {
      const rankDiff = victimRank.rank - killerRank.rank;
      if (rankDiff > 0) {
        // Bonus for killing higher rank
        const rankBonus = 1 + rankDiff * 0.1;
        modifiers.push({
          name: 'Higher Rank Kill',
          type: 'multiplier',
          value: rankBonus,
        });
        basePoints = Math.floor(basePoints * rankBonus);
      } else if (rankDiff < -3) {
        // Penalty for killing much lower rank
        const rankPenalty = 0.5;
        modifiers.push({
          name: 'Lower Rank Kill',
          type: 'penalty',
          value: rankPenalty,
        });
        basePoints = Math.floor(basePoints * rankPenalty);
      }
    }

    // Special Forces bonus
    if (killerData.currentStatus === FactionStatus.SPECIAL_FORCES) {
      modifiers.push({
        name: 'Special Forces',
        type: 'multiplier',
        value: 1.25,
      });
      basePoints = Math.floor(basePoints * 1.25);
    }

    // Record the kill for anti-farming
    await this.recordKill(killerId, victimId);
    await this.factionManager.recordKill(killerId, victimId);

    return this.grantReward(killerId, basePoints, GCWContributionSource.PLAYER_KILL, regionId, modifiers);
  }

  /**
   * Check anti-farming rules
   */
  private async checkAntiFarming(
    killerId: ObjectId,
    victimId: ObjectId
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check cooldown
    const lastKillTime = await this.repository.getLastKillTime(killerId, victimId);
    if (lastKillTime) {
      const timeSinceLastKill = Date.now() - lastKillTime.getTime();
      if (timeSinceLastKill < this.config.samePlayerKillCooldownMs) {
        const remainingSec = Math.ceil(
          (this.config.samePlayerKillCooldownMs - timeSinceLastKill) / 1000
        );
        return {
          allowed: false,
          reason: `You must wait ${remainingSec} seconds before earning points from this player again.`,
        };
      }
    }

    // Check hourly limit
    const killsThisHour = await this.repository.getPlayerKillsOf(
      killerId,
      victimId,
      60 * 60 * 1000 // 1 hour
    );
    if (killsThisHour >= this.config.maxSamePlayerKillsPerHour) {
      return {
        allowed: false,
        reason: `You have reached the hourly kill limit for this player.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record a kill for anti-farming tracking
   */
  private async recordKill(killerId: ObjectId, victimId: ObjectId): Promise<void> {
    await this.repository.recordPlayerKill(killerId, victimId);

    // Update local cache
    let killerRecords = this.recentKills.get(killerId);
    if (!killerRecords) {
      killerRecords = [];
      this.recentKills.set(killerId, killerRecords);
    }
    killerRecords.push({ victimId, timestamp: new Date() });

    // Clean old records (older than 1 hour)
    const hourAgo = Date.now() - 60 * 60 * 1000;
    this.recentKills.set(
      killerId,
      killerRecords.filter((r) => r.timestamp.getTime() > hourAgo)
    );
  }

  // ============================================
  // Mission Rewards
  // ============================================

  /**
   * Award points for completing a faction mission
   */
  async awardMissionReward(
    playerId: ObjectId,
    missionDifficulty: number,
    regionId?: string
  ): Promise<RewardResult> {
    const playerData = await this.factionManager.getPlayerData(playerId);

    if (!isGCWFaction(playerData.currentFaction)) {
      return {
        success: false,
        error: 'You must be enlisted in a faction to complete faction missions.',
      };
    }

    // Calculate points
    let basePoints =
      this.config.missionBasePoints + missionDifficulty * this.config.missionDifficultyBonus;
    const modifiers: RewardModifier[] = [];

    // Difficulty bonus
    if (missionDifficulty > 1) {
      modifiers.push({
        name: `Difficulty ${missionDifficulty}`,
        type: 'bonus',
        value: missionDifficulty * this.config.missionDifficultyBonus,
      });
    }

    // Special Forces bonus
    if (playerData.currentStatus === FactionStatus.SPECIAL_FORCES) {
      modifiers.push({
        name: 'Special Forces',
        type: 'multiplier',
        value: 1.25,
      });
      basePoints = Math.floor(basePoints * 1.25);
    }

    return this.grantReward(playerId, basePoints, GCWContributionSource.MISSION, regionId, modifiers);
  }

  // ============================================
  // Base Rewards
  // ============================================

  /**
   * Award points for defending a faction base
   */
  async awardBaseDefenseReward(playerId: ObjectId, regionId: string): Promise<RewardResult> {
    const playerData = await this.factionManager.getPlayerData(playerId);

    if (!isGCWFaction(playerData.currentFaction)) {
      return {
        success: false,
        error: 'You must be enlisted in a faction to defend bases.',
      };
    }

    return this.grantReward(
      playerId,
      this.config.baseDefensePoints,
      GCWContributionSource.BASE_DEFENSE,
      regionId
    );
  }

  /**
   * Award points for destroying an enemy base
   */
  async awardBaseDestructionReward(playerId: ObjectId, regionId: string): Promise<RewardResult> {
    const playerData = await this.factionManager.getPlayerData(playerId);

    if (!isGCWFaction(playerData.currentFaction)) {
      return {
        success: false,
        error: 'You must be enlisted in a faction to earn destruction rewards.',
      };
    }

    return this.grantReward(
      playerId,
      this.config.baseDestructionPoints,
      GCWContributionSource.BASE_DESTRUCTION,
      regionId
    );
  }

  /**
   * Award points for capturing an objective
   */
  async awardObjectiveCaptureReward(playerId: ObjectId, regionId?: string): Promise<RewardResult> {
    const playerData = await this.factionManager.getPlayerData(playerId);

    if (!isGCWFaction(playerData.currentFaction)) {
      return {
        success: false,
        error: 'You must be enlisted in a faction to capture objectives.',
      };
    }

    return this.grantReward(
      playerId,
      OBJECTIVE_CAPTURE_POINTS,
      GCWContributionSource.OBJECTIVE_CAPTURE,
      regionId
    );
  }

  // ============================================
  // Core Reward Granting
  // ============================================

  /**
   * Grant a faction point reward
   */
  private async grantReward(
    playerId: ObjectId,
    basePoints: number,
    source: GCWContributionSource,
    regionId?: string,
    modifiers: RewardModifier[] = []
  ): Promise<RewardResult> {
    const playerData = await this.factionManager.getPlayerData(playerId);
    const faction = playerData.currentFaction;

    // Apply regional bonus if applicable
    if (regionId) {
      const regionalBonus = await this.gcwManager.getRegionalBonus(regionId, faction);
      if (regionalBonus && regionalBonus.factionPointMultiplier > 1) {
        modifiers.push({
          name: 'Regional Control',
          type: 'multiplier',
          value: regionalBonus.factionPointMultiplier,
        });
        basePoints = Math.floor(basePoints * regionalBonus.factionPointMultiplier);
      }
    }

    // Add points to player
    const result = await this.factionManager.addPoints(playerId, basePoints, source);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    // Contribute to GCW if in a region
    let gcwPointsContributed = 0;
    if (regionId) {
      const gcwResult = await this.gcwManager.contributePoints(
        playerId,
        regionId,
        faction,
        basePoints,
        source
      );
      if (gcwResult.success) {
        gcwPointsContributed = gcwResult.pointsContributed ?? 0;
      }
    }

    if (this.config.enableLogging) {
      console.log(
        `[FactionRewardManager] Granted ${basePoints} points to ${playerId} (${source})`
      );
    }

    this.emitRewardGranted({
      playerId,
      faction,
      points: basePoints,
      source,
      regionId,
      timestamp: new Date(),
    });

    return {
      success: true,
      basePoints,
      finalPoints: basePoints,
      modifiers,
      gcwPointsContributed,
      message: result.message,
    };
  }

  // ============================================
  // Item Purchases
  // ============================================

  /**
   * Get available faction items for a player
   */
  async getAvailableItems(playerId: ObjectId): Promise<FactionItem[]> {
    const playerData = await this.factionManager.getPlayerData(playerId);

    if (!isGCWFaction(playerData.currentFaction)) {
      return [];
    }

    const allItems = await this.repository.getFactionItems(playerData.currentFaction);
    const standing = playerData.standings.get(playerData.currentFaction);
    const rank = standing ? getRankByPoints(playerData.currentFaction, standing.points) : null;

    return allItems.filter((item) => {
      if (!item.available) return false;
      if (item.rankRequired > (rank?.rank ?? 0)) return false;
      if (item.statusRequired !== null && item.statusRequired !== playerData.currentStatus) {
        return false;
      }
      return true;
    });
  }

  /**
   * Purchase a faction item
   */
  async purchaseItem(playerId: ObjectId, itemId: string): Promise<{
    success: boolean;
    error?: string;
    item?: FactionItem;
    message?: string;
  }> {
    const playerData = await this.factionManager.getPlayerData(playerId);

    if (!isGCWFaction(playerData.currentFaction)) {
      return {
        success: false,
        error: 'You must be enlisted in a faction to purchase faction items.',
      };
    }

    const item = await this.repository.getFactionItem(itemId);
    if (!item) {
      return {
        success: false,
        error: 'Item not found.',
      };
    }

    // Check faction
    if (item.faction !== playerData.currentFaction) {
      return {
        success: false,
        error: 'This item is not available to your faction.',
      };
    }

    // Check availability
    if (!item.available) {
      return {
        success: false,
        error: 'This item is currently unavailable.',
      };
    }

    // Check rank
    const standing = playerData.standings.get(playerData.currentFaction);
    const rank = standing ? getRankByPoints(playerData.currentFaction, standing.points) : null;
    if (item.rankRequired > (rank?.rank ?? 0)) {
      return {
        success: false,
        error: `You need rank ${item.rankRequired} to purchase this item.`,
      };
    }

    // Check status requirement
    if (item.statusRequired !== null && item.statusRequired !== playerData.currentStatus) {
      return {
        success: false,
        error: `You must be ${this.getStatusName(item.statusRequired)} to purchase this item.`,
      };
    }

    // Check points
    if (!standing || standing.points < item.factionPointCost) {
      return {
        success: false,
        error: `Insufficient faction points. Need ${item.factionPointCost}, have ${standing?.points ?? 0}.`,
      };
    }

    // Check daily limit
    if (item.dailyLimit > 0) {
      const purchaseCount = await this.repository.getPlayerItemPurchaseCount(playerId, itemId);
      if (purchaseCount >= item.dailyLimit) {
        return {
          success: false,
          error: `You have reached the daily purchase limit for this item.`,
        };
      }
    }

    // Deduct points
    const removeResult = await this.factionManager.removePoints(
      playerId,
      item.factionPointCost,
      `purchase_${itemId}`
    );

    if (!removeResult.success) {
      return {
        success: false,
        error: removeResult.error,
      };
    }

    // Record purchase
    await this.repository.recordItemPurchase(playerId, itemId);

    if (this.config.enableLogging) {
      console.log(`[FactionRewardManager] Player ${playerId} purchased ${item.name}`);
    }

    this.emitItemPurchased({
      playerId,
      faction: playerData.currentFaction,
      item,
      pointsSpent: item.factionPointCost,
      creditsSpent: item.creditCost,
      timestamp: new Date(),
    });

    return {
      success: true,
      item,
      message: `You purchased ${item.name}.`,
    };
  }

  /**
   * Get status name for display
   */
  private getStatusName(status: FactionStatus): string {
    switch (status) {
      case FactionStatus.NON_COMBATANT:
        return 'On Leave';
      case FactionStatus.COMBATANT:
        return 'Combatant';
      case FactionStatus.SPECIAL_FORCES:
        return 'Special Forces';
      default:
        return 'Unknown';
    }
  }

  // ============================================
  // Cache Cleanup
  // ============================================

  /**
   * Clean up old kill records
   */
  cleanupKillRecords(): void {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    for (const [killerId, records] of this.recentKills) {
      const filtered = records.filter((r) => r.timestamp.getTime() > hourAgo);
      if (filtered.length === 0) {
        this.recentKills.delete(killerId);
      } else {
        this.recentKills.set(killerId, filtered);
      }
    }
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Faction Reward Manager instance
 */
export function createFactionRewardManager(
  repository: FactionRewardRepository,
  factionManager: FactionManager,
  gcwManager: GCWManager,
  config?: Partial<FactionRewardConfig>
): FactionRewardManager {
  return new FactionRewardManager(repository, factionManager, gcwManager, config);
}
