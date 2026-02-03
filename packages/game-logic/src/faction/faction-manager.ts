/**
 * Faction Manager
 * Core service for managing player faction status in the Galactic Civil War
 *
 * Handles:
 * - Player faction enlistment and resignation
 * - Faction point gain and loss
 * - Rank advancement and demotion
 * - Combat status changes (Combatant, Special Forces, On Leave)
 * - Faction perk management
 * - Cooldown enforcement for status changes
 */

import type { ObjectId } from '@swg/shared-types';
import {
  Faction,
  FactionStatus,
  FactionPerkEffectType,
  MAX_FACTION_POINTS,
  MIN_FACTION_POINTS,
  FACTION_LEAVE_COOLDOWN_MS,
  STATUS_CHANGE_COOLDOWN_MS,
  SF_LEAVE_COOLDOWN_MS,
  POINTS_LOST_ON_DEATH,
  type FactionStanding,
  type FactionPerk,
  type FactionRank,
  type PlayerFactionData,
  isGCWFaction,
  getOpposingFaction,
  getRanksForFaction,
  getRankByPoints,
  getFactionName,
  createDefaultFactionData,
  createDefaultStanding,
} from './faction-types.js';

// ============================================
// Configuration
// ============================================

/**
 * Faction manager configuration
 */
export interface FactionManagerConfig {
  /** Enable detailed logging */
  enableLogging: boolean;
  /** Allow negative faction points */
  allowNegativePoints: boolean;
  /** Cooldown for leaving faction (ms) */
  leaveCooldownMs: number;
  /** Cooldown for status changes (ms) */
  statusCooldownMs: number;
  /** Cooldown for leaving Special Forces (ms) */
  sfLeaveCooldownMs: number;
  /** Points lost on death */
  pointsLostOnDeath: number;
}

/**
 * Default faction manager configuration
 */
export const DEFAULT_FACTION_CONFIG: FactionManagerConfig = {
  enableLogging: false,
  allowNegativePoints: true,
  leaveCooldownMs: FACTION_LEAVE_COOLDOWN_MS,
  statusCooldownMs: STATUS_CHANGE_COOLDOWN_MS,
  sfLeaveCooldownMs: SF_LEAVE_COOLDOWN_MS,
  pointsLostOnDeath: POINTS_LOST_ON_DEATH,
};

// ============================================
// Result Types
// ============================================

/**
 * Result of a faction operation
 */
export interface FactionOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Informational message */
  message?: string;
}

/**
 * Result of enlisting in a faction
 */
export interface EnlistResult extends FactionOperationResult {
  /** Faction enlisted in */
  faction?: Faction;
  /** Starting rank */
  rank?: number;
  /** Rank title */
  rankTitle?: string;
}

/**
 * Result of changing faction status
 */
export interface StatusChangeResult extends FactionOperationResult {
  /** Previous status */
  previousStatus?: FactionStatus;
  /** New status */
  newStatus?: FactionStatus;
  /** When the status change takes effect (for delayed changes) */
  effectiveAt?: Date;
}

/**
 * Result of gaining/losing faction points
 */
export interface PointChangeResult extends FactionOperationResult {
  /** Previous point total */
  previousPoints?: number;
  /** New point total */
  newPoints?: number;
  /** Points changed */
  pointsDelta?: number;
  /** Previous rank */
  previousRank?: number;
  /** New rank */
  newRank?: number;
  /** Whether rank changed */
  rankChanged?: boolean;
  /** New rank title if promoted/demoted */
  newRankTitle?: string;
}

/**
 * Result of purchasing a perk
 */
export interface PerkPurchaseResult extends FactionOperationResult {
  /** Perk that was purchased */
  perk?: FactionPerk;
  /** Remaining faction points */
  remainingPoints?: number;
}

// ============================================
// Event Types
// ============================================

/**
 * Event emitted when faction status changes
 */
export interface FactionStatusChangedEvent {
  playerId: ObjectId;
  faction: Faction;
  previousStatus: FactionStatus;
  newStatus: FactionStatus;
  timestamp: Date;
}

/**
 * Event emitted when rank changes
 */
export interface FactionRankChangedEvent {
  playerId: ObjectId;
  faction: Faction;
  previousRank: number;
  newRank: number;
  newTitle: string;
  promoted: boolean;
  timestamp: Date;
}

/**
 * Event emitted when points change
 */
export interface FactionPointsChangedEvent {
  playerId: ObjectId;
  faction: Faction;
  previousPoints: number;
  newPoints: number;
  delta: number;
  source: string;
  timestamp: Date;
}

/**
 * Event emitted when player enlists
 */
export interface FactionEnlistedEvent {
  playerId: ObjectId;
  faction: Faction;
  timestamp: Date;
}

/**
 * Event emitted when player resigns
 */
export interface FactionResignedEvent {
  playerId: ObjectId;
  faction: Faction;
  timestamp: Date;
}

// ============================================
// Handler Types
// ============================================

export type FactionStatusChangedHandler = (event: FactionStatusChangedEvent) => void;
export type FactionRankChangedHandler = (event: FactionRankChangedEvent) => void;
export type FactionPointsChangedHandler = (event: FactionPointsChangedEvent) => void;
export type FactionEnlistedHandler = (event: FactionEnlistedEvent) => void;
export type FactionResignedHandler = (event: FactionResignedEvent) => void;

// ============================================
// Repository Interface
// ============================================

/**
 * Expected interface for faction data repository
 */
export interface FactionRepository {
  /** Get player faction data */
  getPlayerFactionData(playerId: ObjectId): Promise<PlayerFactionData | undefined>;

  /** Save player faction data */
  savePlayerFactionData(data: PlayerFactionData): Promise<void>;

  /** Get faction standing for a player and faction */
  getFactionStanding(playerId: ObjectId, faction: Faction): Promise<FactionStanding | undefined>;

  /** Update faction standing */
  updateFactionStanding(playerId: ObjectId, standing: FactionStanding): Promise<void>;

  /** Get all perks for a faction */
  getFactionPerks(faction: Faction): Promise<FactionPerk[]>;

  /** Get a specific perk */
  getPerk(perkId: string): Promise<FactionPerk | undefined>;

  /** Record perk purchase */
  recordPerkPurchase(playerId: ObjectId, perkId: string): Promise<void>;

  /** Check if player has purchased perk */
  hasPlayerPurchasedPerk(playerId: ObjectId, perkId: string): Promise<boolean>;
}

// ============================================
// Faction Manager Class
// ============================================

/**
 * Faction Manager
 * Central service for all faction operations in the game
 */
export class FactionManager {
  private repository: FactionRepository;
  private config: FactionManagerConfig;

  /** Cached player faction data */
  private playerDataCache: Map<ObjectId, PlayerFactionData>;

  /** Event handlers */
  private statusChangedHandlers: Set<FactionStatusChangedHandler>;
  private rankChangedHandlers: Set<FactionRankChangedHandler>;
  private pointsChangedHandlers: Set<FactionPointsChangedHandler>;
  private enlistedHandlers: Set<FactionEnlistedHandler>;
  private resignedHandlers: Set<FactionResignedHandler>;

  /**
   * Create a new Faction Manager
   */
  constructor(
    repository: FactionRepository,
    config: Partial<FactionManagerConfig> = {}
  ) {
    this.repository = repository;
    this.config = { ...DEFAULT_FACTION_CONFIG, ...config };
    this.playerDataCache = new Map();
    this.statusChangedHandlers = new Set();
    this.rankChangedHandlers = new Set();
    this.pointsChangedHandlers = new Set();
    this.enlistedHandlers = new Set();
    this.resignedHandlers = new Set();
  }

  // ============================================
  // Event Registration
  // ============================================

  onStatusChanged(handler: FactionStatusChangedHandler): void {
    this.statusChangedHandlers.add(handler);
  }

  offStatusChanged(handler: FactionStatusChangedHandler): void {
    this.statusChangedHandlers.delete(handler);
  }

  onRankChanged(handler: FactionRankChangedHandler): void {
    this.rankChangedHandlers.add(handler);
  }

  offRankChanged(handler: FactionRankChangedHandler): void {
    this.rankChangedHandlers.delete(handler);
  }

  onPointsChanged(handler: FactionPointsChangedHandler): void {
    this.pointsChangedHandlers.add(handler);
  }

  offPointsChanged(handler: FactionPointsChangedHandler): void {
    this.pointsChangedHandlers.delete(handler);
  }

  onEnlisted(handler: FactionEnlistedHandler): void {
    this.enlistedHandlers.add(handler);
  }

  offEnlisted(handler: FactionEnlistedHandler): void {
    this.enlistedHandlers.delete(handler);
  }

  onResigned(handler: FactionResignedHandler): void {
    this.resignedHandlers.add(handler);
  }

  offResigned(handler: FactionResignedHandler): void {
    this.resignedHandlers.delete(handler);
  }

  // ============================================
  // Event Emission
  // ============================================

  private emitStatusChanged(event: FactionStatusChangedEvent): void {
    for (const handler of this.statusChangedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[FactionManager] Error in status changed handler:', error);
      }
    }
  }

  private emitRankChanged(event: FactionRankChangedEvent): void {
    for (const handler of this.rankChangedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[FactionManager] Error in rank changed handler:', error);
      }
    }
  }

  private emitPointsChanged(event: FactionPointsChangedEvent): void {
    for (const handler of this.pointsChangedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[FactionManager] Error in points changed handler:', error);
      }
    }
  }

  private emitEnlisted(event: FactionEnlistedEvent): void {
    for (const handler of this.enlistedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[FactionManager] Error in enlisted handler:', error);
      }
    }
  }

  private emitResigned(event: FactionResignedEvent): void {
    for (const handler of this.resignedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[FactionManager] Error in resigned handler:', error);
      }
    }
  }

  // ============================================
  // Data Access
  // ============================================

  /**
   * Get player faction data (from cache or repository)
   */
  async getPlayerData(playerId: ObjectId): Promise<PlayerFactionData> {
    let data = this.playerDataCache.get(playerId);
    if (data) return data;

    data = await this.repository.getPlayerFactionData(playerId);
    if (!data) {
      data = createDefaultFactionData(playerId);
      await this.repository.savePlayerFactionData(data);
    }

    this.playerDataCache.set(playerId, data);
    return data;
  }

  /**
   * Save player faction data
   */
  private async savePlayerData(data: PlayerFactionData): Promise<void> {
    this.playerDataCache.set(data.playerId, data);
    await this.repository.savePlayerFactionData(data);
  }

  /**
   * Get player's current faction
   */
  async getPlayerFaction(playerId: ObjectId): Promise<Faction> {
    const data = await this.getPlayerData(playerId);
    return data.currentFaction;
  }

  /**
   * Get player's current faction status
   */
  async getPlayerStatus(playerId: ObjectId): Promise<FactionStatus> {
    const data = await this.getPlayerData(playerId);
    return data.currentStatus;
  }

  /**
   * Get player's standing with a specific faction
   */
  async getStanding(playerId: ObjectId, faction: Faction): Promise<FactionStanding> {
    const data = await this.getPlayerData(playerId);
    let standing = data.standings.get(faction);
    if (!standing) {
      standing = createDefaultStanding(faction);
      data.standings.set(faction, standing);
    }
    return standing;
  }

  /**
   * Get player's current rank in their faction
   */
  async getPlayerRank(playerId: ObjectId): Promise<FactionRank | undefined> {
    const data = await this.getPlayerData(playerId);
    if (!isGCWFaction(data.currentFaction)) return undefined;

    const standing = data.standings.get(data.currentFaction);
    if (!standing) return undefined;

    return getRankByPoints(data.currentFaction, standing.points);
  }

  // ============================================
  // Enlistment
  // ============================================

  /**
   * Enlist a player in a faction
   */
  async enlist(playerId: ObjectId, faction: Faction): Promise<EnlistResult> {
    if (!isGCWFaction(faction)) {
      return {
        success: false,
        error: `Cannot enlist in faction ${getFactionName(faction)}. Only Imperial or Rebel factions are available.`,
      };
    }

    const data = await this.getPlayerData(playerId);

    // Check if already in a faction
    if (isGCWFaction(data.currentFaction)) {
      return {
        success: false,
        error: `You are already enlisted with the ${getFactionName(data.currentFaction)}.`,
      };
    }

    // Get or create standing
    let standing = data.standings.get(faction);
    if (!standing) {
      standing = createDefaultStanding(faction);
    }

    // Update standing
    standing.status = FactionStatus.NON_COMBATANT;
    standing.lastStatusChange = new Date();
    standing.enlistedAt = new Date();
    standing.leaveCooldownExpires = null;
    standing.statusCooldownExpires = null;

    // Update player data
    data.currentFaction = faction;
    data.currentStatus = FactionStatus.NON_COMBATANT;
    data.standings.set(faction, standing);

    await this.savePlayerData(data);

    const rank = getRankByPoints(faction, standing.points);

    if (this.config.enableLogging) {
      console.log(`[FactionManager] Player ${playerId} enlisted in ${getFactionName(faction)}`);
    }

    this.emitEnlisted({
      playerId,
      faction,
      timestamp: new Date(),
    });

    return {
      success: true,
      faction,
      rank: rank?.rank ?? 0,
      rankTitle: rank?.title ?? 'Private',
      message: `You have enlisted with the ${getFactionName(faction)}. Your rank is ${rank?.title ?? 'Private'}.`,
    };
  }

  /**
   * Resign from current faction
   */
  async resign(playerId: ObjectId): Promise<FactionOperationResult> {
    const data = await this.getPlayerData(playerId);

    if (!isGCWFaction(data.currentFaction)) {
      return {
        success: false,
        error: 'You are not enlisted in any faction.',
      };
    }

    const standing = data.standings.get(data.currentFaction);
    if (!standing) {
      return {
        success: false,
        error: 'Invalid faction standing data.',
      };
    }

    // Check cooldown
    if (standing.leaveCooldownExpires && standing.leaveCooldownExpires > new Date()) {
      const remainingMs = standing.leaveCooldownExpires.getTime() - Date.now();
      const remainingSec = Math.ceil(remainingMs / 1000);
      return {
        success: false,
        error: `You must wait ${remainingSec} seconds before leaving your faction.`,
      };
    }

    // Check if in combat status
    if (standing.status === FactionStatus.SPECIAL_FORCES || standing.status === FactionStatus.COMBATANT) {
      return {
        success: false,
        error: 'You must go On Leave before resigning from your faction.',
      };
    }

    const previousFaction = data.currentFaction;

    // Reset faction data
    data.currentFaction = Faction.NEUTRAL;
    data.currentStatus = FactionStatus.NON_COMBATANT;

    // Reset standing but keep points
    standing.status = FactionStatus.NON_COMBATANT;
    standing.lastStatusChange = new Date();
    standing.enlistedAt = null;
    data.standings.set(previousFaction, standing);

    await this.savePlayerData(data);

    if (this.config.enableLogging) {
      console.log(`[FactionManager] Player ${playerId} resigned from ${getFactionName(previousFaction)}`);
    }

    this.emitResigned({
      playerId,
      faction: previousFaction,
      timestamp: new Date(),
    });

    return {
      success: true,
      message: `You have resigned from the ${getFactionName(previousFaction)}.`,
    };
  }

  // ============================================
  // Status Changes
  // ============================================

  /**
   * Change player's faction status
   */
  async setStatus(playerId: ObjectId, newStatus: FactionStatus): Promise<StatusChangeResult> {
    const data = await this.getPlayerData(playerId);

    if (!isGCWFaction(data.currentFaction)) {
      return {
        success: false,
        error: 'You are not enlisted in any faction.',
      };
    }

    const standing = data.standings.get(data.currentFaction);
    if (!standing) {
      return {
        success: false,
        error: 'Invalid faction standing data.',
      };
    }

    const previousStatus = standing.status;

    if (previousStatus === newStatus) {
      return {
        success: false,
        error: `You are already ${this.getStatusName(newStatus)}.`,
      };
    }

    // Check cooldown
    if (standing.statusCooldownExpires && standing.statusCooldownExpires > new Date()) {
      const remainingMs = standing.statusCooldownExpires.getTime() - Date.now();
      const remainingSec = Math.ceil(remainingMs / 1000);
      return {
        success: false,
        error: `You must wait ${remainingSec} seconds before changing your status.`,
      };
    }

    // Validate status transitions
    const validTransition = this.isValidStatusTransition(previousStatus, newStatus);
    if (!validTransition) {
      return {
        success: false,
        error: `Cannot change from ${this.getStatusName(previousStatus)} to ${this.getStatusName(newStatus)}.`,
      };
    }

    // Calculate cooldown based on transition
    let cooldownMs = this.config.statusCooldownMs;
    if (previousStatus === FactionStatus.SPECIAL_FORCES && newStatus === FactionStatus.COMBATANT) {
      cooldownMs = this.config.sfLeaveCooldownMs;
    }

    // Update standing
    standing.status = newStatus;
    standing.lastStatusChange = new Date();
    standing.statusCooldownExpires = new Date(Date.now() + cooldownMs);

    // If going on leave, set leave cooldown for returning to combat
    if (newStatus === FactionStatus.NON_COMBATANT) {
      standing.leaveCooldownExpires = new Date(Date.now() + this.config.leaveCooldownMs);
    } else {
      standing.leaveCooldownExpires = null;
    }

    data.currentStatus = newStatus;
    data.standings.set(data.currentFaction, standing);

    await this.savePlayerData(data);

    if (this.config.enableLogging) {
      console.log(
        `[FactionManager] Player ${playerId} status changed from ${this.getStatusName(previousStatus)} to ${this.getStatusName(newStatus)}`
      );
    }

    this.emitStatusChanged({
      playerId,
      faction: data.currentFaction,
      previousStatus,
      newStatus,
      timestamp: new Date(),
    });

    return {
      success: true,
      previousStatus,
      newStatus,
      message: `Your status has changed to ${this.getStatusName(newStatus)}.`,
    };
  }

  /**
   * Go Combatant
   */
  async goCombatant(playerId: ObjectId): Promise<StatusChangeResult> {
    return this.setStatus(playerId, FactionStatus.COMBATANT);
  }

  /**
   * Go Special Forces
   */
  async goSpecialForces(playerId: ObjectId): Promise<StatusChangeResult> {
    return this.setStatus(playerId, FactionStatus.SPECIAL_FORCES);
  }

  /**
   * Go On Leave (Non-combatant)
   */
  async goOnLeave(playerId: ObjectId): Promise<StatusChangeResult> {
    return this.setStatus(playerId, FactionStatus.NON_COMBATANT);
  }

  /**
   * Check if a status transition is valid
   */
  private isValidStatusTransition(from: FactionStatus, to: FactionStatus): boolean {
    // From On Leave/Non-combatant
    if (from === FactionStatus.NON_COMBATANT || from === FactionStatus.ON_LEAVE) {
      return to === FactionStatus.COMBATANT;
    }

    // From Combatant
    if (from === FactionStatus.COMBATANT) {
      return to === FactionStatus.NON_COMBATANT || to === FactionStatus.SPECIAL_FORCES;
    }

    // From Special Forces
    if (from === FactionStatus.SPECIAL_FORCES) {
      return to === FactionStatus.COMBATANT;
    }

    return false;
  }

  /**
   * Get human-readable status name
   */
  private getStatusName(status: FactionStatus): string {
    switch (status) {
      case FactionStatus.NON_COMBATANT:
        return 'On Leave';
      case FactionStatus.COMBATANT:
        return 'Combatant';
      case FactionStatus.SPECIAL_FORCES:
        return 'Special Forces';
      case FactionStatus.ON_LEAVE:
        return 'On Leave';
      default:
        return 'Unknown';
    }
  }

  // ============================================
  // Faction Points
  // ============================================

  /**
   * Add faction points to a player
   */
  async addPoints(
    playerId: ObjectId,
    points: number,
    source: string = 'unknown'
  ): Promise<PointChangeResult> {
    if (points <= 0) {
      return {
        success: false,
        error: 'Points must be positive. Use removePoints for negative changes.',
      };
    }

    const data = await this.getPlayerData(playerId);

    if (!isGCWFaction(data.currentFaction)) {
      return {
        success: false,
        error: 'You are not enlisted in any faction.',
      };
    }

    const standing = data.standings.get(data.currentFaction);
    if (!standing) {
      return {
        success: false,
        error: 'Invalid faction standing data.',
      };
    }

    const previousPoints = standing.points;
    const previousRank = getRankByPoints(data.currentFaction, previousPoints);

    // Calculate new points (capped at max)
    let newPoints = previousPoints + points;
    if (newPoints > MAX_FACTION_POINTS) {
      newPoints = MAX_FACTION_POINTS;
    }

    standing.points = newPoints;
    data.standings.set(data.currentFaction, standing);

    // Track GCW points
    data.lifetimeGCWPoints += points;
    data.weeklyGCWPoints += points;

    await this.savePlayerData(data);

    const newRank = getRankByPoints(data.currentFaction, newPoints);
    const rankChanged = previousRank?.rank !== newRank?.rank;

    if (this.config.enableLogging) {
      console.log(
        `[FactionManager] Player ${playerId} gained ${points} faction points (${source}): ${previousPoints} -> ${newPoints}`
      );
    }

    this.emitPointsChanged({
      playerId,
      faction: data.currentFaction,
      previousPoints,
      newPoints,
      delta: newPoints - previousPoints,
      source,
      timestamp: new Date(),
    });

    if (rankChanged && newRank && previousRank && newRank.rank > previousRank.rank) {
      this.emitRankChanged({
        playerId,
        faction: data.currentFaction,
        previousRank: previousRank.rank,
        newRank: newRank.rank,
        newTitle: newRank.title,
        promoted: true,
        timestamp: new Date(),
      });
    }

    return {
      success: true,
      previousPoints,
      newPoints,
      pointsDelta: newPoints - previousPoints,
      previousRank: previousRank?.rank ?? 0,
      newRank: newRank?.rank ?? 0,
      rankChanged,
      newRankTitle: rankChanged ? newRank?.title : undefined,
      message: rankChanged
        ? `You have been promoted to ${newRank?.title}!`
        : `You gained ${newPoints - previousPoints} faction points.`,
    };
  }

  /**
   * Remove faction points from a player
   */
  async removePoints(
    playerId: ObjectId,
    points: number,
    source: string = 'unknown'
  ): Promise<PointChangeResult> {
    if (points <= 0) {
      return {
        success: false,
        error: 'Points must be positive.',
      };
    }

    const data = await this.getPlayerData(playerId);

    if (!isGCWFaction(data.currentFaction)) {
      return {
        success: false,
        error: 'You are not enlisted in any faction.',
      };
    }

    const standing = data.standings.get(data.currentFaction);
    if (!standing) {
      return {
        success: false,
        error: 'Invalid faction standing data.',
      };
    }

    const previousPoints = standing.points;
    const previousRank = getRankByPoints(data.currentFaction, previousPoints);

    // Calculate new points
    let newPoints = previousPoints - points;
    if (!this.config.allowNegativePoints && newPoints < 0) {
      newPoints = 0;
    } else if (newPoints < MIN_FACTION_POINTS) {
      newPoints = MIN_FACTION_POINTS;
    }

    standing.points = newPoints;
    data.standings.set(data.currentFaction, standing);

    await this.savePlayerData(data);

    const newRank = getRankByPoints(data.currentFaction, newPoints);
    const rankChanged = previousRank?.rank !== newRank?.rank;

    if (this.config.enableLogging) {
      console.log(
        `[FactionManager] Player ${playerId} lost ${points} faction points (${source}): ${previousPoints} -> ${newPoints}`
      );
    }

    this.emitPointsChanged({
      playerId,
      faction: data.currentFaction,
      previousPoints,
      newPoints,
      delta: newPoints - previousPoints,
      source,
      timestamp: new Date(),
    });

    if (rankChanged && newRank && previousRank && newRank.rank < previousRank.rank) {
      this.emitRankChanged({
        playerId,
        faction: data.currentFaction,
        previousRank: previousRank.rank,
        newRank: newRank.rank,
        newTitle: newRank.title,
        promoted: false,
        timestamp: new Date(),
      });
    }

    return {
      success: true,
      previousPoints,
      newPoints,
      pointsDelta: newPoints - previousPoints,
      previousRank: previousRank?.rank ?? 0,
      newRank: newRank?.rank ?? 0,
      rankChanged,
      newRankTitle: rankChanged ? newRank?.title : undefined,
      message: rankChanged
        ? `You have been demoted to ${newRank?.title}.`
        : `You lost ${previousPoints - newPoints} faction points.`,
    };
  }

  /**
   * Handle player death to enemy faction
   */
  async handleDeath(playerId: ObjectId, killerFaction: Faction): Promise<PointChangeResult> {
    const data = await this.getPlayerData(playerId);

    if (!isGCWFaction(data.currentFaction)) {
      return {
        success: false,
        error: 'Player is not enlisted in any faction.',
      };
    }

    // Only lose points if killed by opposing faction
    if (getOpposingFaction(data.currentFaction) !== killerFaction) {
      return {
        success: false,
        error: 'Killer is not from opposing faction.',
      };
    }

    // Update death stats
    data.pvpDeaths++;
    data.killStreak = 0;
    data.lastPvPDeath = new Date();
    await this.savePlayerData(data);

    return this.removePoints(playerId, this.config.pointsLostOnDeath, 'pvp_death');
  }

  // ============================================
  // Perks
  // ============================================

  /**
   * Get available perks for a player
   */
  async getAvailablePerks(playerId: ObjectId): Promise<FactionPerk[]> {
    const data = await this.getPlayerData(playerId);

    if (!isGCWFaction(data.currentFaction)) {
      return [];
    }

    const standing = data.standings.get(data.currentFaction);
    if (!standing) {
      return [];
    }

    const allPerks = await this.repository.getFactionPerks(data.currentFaction);
    const currentRank = getRankByPoints(data.currentFaction, standing.points);

    // Filter perks by rank and not already purchased (unless repeatable)
    return allPerks.filter((perk) => {
      if (perk.rankRequired > (currentRank?.rank ?? 0)) return false;
      if (!perk.repeatable && data.purchasedPerks.has(perk.id)) return false;
      return true;
    });
  }

  /**
   * Purchase a faction perk
   */
  async purchasePerk(playerId: ObjectId, perkId: string): Promise<PerkPurchaseResult> {
    const data = await this.getPlayerData(playerId);

    if (!isGCWFaction(data.currentFaction)) {
      return {
        success: false,
        error: 'You are not enlisted in any faction.',
      };
    }

    const standing = data.standings.get(data.currentFaction);
    if (!standing) {
      return {
        success: false,
        error: 'Invalid faction standing data.',
      };
    }

    const perk = await this.repository.getPerk(perkId);
    if (!perk) {
      return {
        success: false,
        error: 'Perk not found.',
      };
    }

    // Check faction matches
    if (perk.faction !== data.currentFaction) {
      return {
        success: false,
        error: 'This perk is not available to your faction.',
      };
    }

    // Check rank requirement
    const currentRank = getRankByPoints(data.currentFaction, standing.points);
    if (perk.rankRequired > (currentRank?.rank ?? 0)) {
      return {
        success: false,
        error: `You need rank ${perk.rankRequired} to purchase this perk.`,
      };
    }

    // Check if already purchased (for non-repeatable)
    if (!perk.repeatable && data.purchasedPerks.has(perkId)) {
      return {
        success: false,
        error: 'You have already purchased this perk.',
      };
    }

    // Check cost
    if (perk.cost > standing.points) {
      return {
        success: false,
        error: `Insufficient faction points. Need ${perk.cost}, have ${standing.points}.`,
      };
    }

    // Deduct cost
    standing.points -= perk.cost;
    data.standings.set(data.currentFaction, standing);
    data.purchasedPerks.add(perkId);

    await this.savePlayerData(data);
    await this.repository.recordPerkPurchase(playerId, perkId);

    if (this.config.enableLogging) {
      console.log(`[FactionManager] Player ${playerId} purchased perk ${perkId}`);
    }

    return {
      success: true,
      perk,
      remainingPoints: standing.points,
      message: `You have purchased ${perk.name}.`,
    };
  }

  /**
   * Check if player has a specific perk
   */
  async hasPerk(playerId: ObjectId, perkId: string): Promise<boolean> {
    const data = await this.getPlayerData(playerId);
    return data.purchasedPerks.has(perkId);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Check if player can attack another player based on faction rules
   */
  async canAttackPlayer(attackerId: ObjectId, defenderId: ObjectId): Promise<boolean> {
    const attackerData = await this.getPlayerData(attackerId);
    const defenderData = await this.getPlayerData(defenderId);

    // Same faction cannot attack
    if (attackerData.currentFaction === defenderData.currentFaction) {
      return false;
    }

    // Must both be GCW factions
    if (!isGCWFaction(attackerData.currentFaction) || !isGCWFaction(defenderData.currentFaction)) {
      return false;
    }

    // Check status
    const attackerStanding = attackerData.standings.get(attackerData.currentFaction);
    const defenderStanding = defenderData.standings.get(defenderData.currentFaction);

    if (!attackerStanding || !defenderStanding) {
      return false;
    }

    // Non-combatants cannot attack or be attacked
    if (
      attackerStanding.status === FactionStatus.NON_COMBATANT ||
      defenderStanding.status === FactionStatus.NON_COMBATANT
    ) {
      return false;
    }

    // SF can attack any combatant/SF
    if (attackerStanding.status === FactionStatus.SPECIAL_FORCES) {
      return (
        defenderStanding.status === FactionStatus.COMBATANT ||
        defenderStanding.status === FactionStatus.SPECIAL_FORCES
      );
    }

    // Combatant can only attack SF
    if (attackerStanding.status === FactionStatus.COMBATANT) {
      return defenderStanding.status === FactionStatus.SPECIAL_FORCES;
    }

    return false;
  }

  /**
   * Record a PvP kill
   */
  async recordKill(killerId: ObjectId, victimId: ObjectId): Promise<void> {
    const killerData = await this.getPlayerData(killerId);

    killerData.pvpKills++;
    killerData.killStreak++;
    killerData.lastPvPKill = new Date();

    if (killerData.killStreak > killerData.bestKillStreak) {
      killerData.bestKillStreak = killerData.killStreak;
    }

    await this.savePlayerData(killerData);
  }

  /**
   * Reset weekly GCW points for all players
   */
  async resetWeeklyPoints(): Promise<void> {
    // This would iterate through all players in a real implementation
    // For now, we just note this is where weekly resets would happen
    if (this.config.enableLogging) {
      console.log('[FactionManager] Weekly GCW points reset');
    }
  }

  /**
   * Clear the player data cache
   */
  clearCache(): void {
    this.playerDataCache.clear();
  }

  /**
   * Remove a player from cache
   */
  uncachePlayer(playerId: ObjectId): void {
    this.playerDataCache.delete(playerId);
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Faction Manager instance
 */
export function createFactionManager(
  repository: FactionRepository,
  config?: Partial<FactionManagerConfig>
): FactionManager {
  return new FactionManager(repository, config);
}
