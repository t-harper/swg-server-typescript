/**
 * Jedi Progression Manager
 * Handles XP tracking, rank advancement, alignment shifts, and death penalties
 * Implements the pre-NGE Jedi progression and permadeath systems
 */

import type { ObjectId } from '@swg/shared-types';
import {
  JediRank,
  ForceAlignment,
  ForceRanks,
  JediPlayerState,
  JediDeathPenalty,
  DefaultJediDeathPenalty,
  JediSkillBranch,
  AlignmentThresholds,
  getAlignmentFromValue,
  isDarkSideRank,
  isLightSideRank,
} from './jedi-types.js';
import { JediSkillTree, JediSkillMods } from './jedi-skill-tree.js';

// ============================================
// Constants
// ============================================

/**
 * XP configuration
 */
export const JediXpConfig = {
  /** Base XP for killing a creature */
  BASE_CREATURE_XP: 50,
  /** XP multiplier for force-sensitive creatures */
  FORCE_SENSITIVE_MULTIPLIER: 2.0,
  /** XP for completing a Jedi-specific quest */
  QUEST_XP: 1000,
  /** XP for training with a master */
  TRAINING_XP: 500,
  /** XP cap for non-master Jedi */
  NON_MASTER_XP_CAP: 500000,
  /** Maximum XP that can be earned in a single day */
  DAILY_XP_CAP: 50000,
} as const;

/**
 * Alignment configuration
 */
export const AlignmentConfig = {
  /** Alignment shift for light side actions */
  LIGHT_ACTION_SHIFT: 10,
  /** Alignment shift for dark side actions */
  DARK_ACTION_SHIFT: -10,
  /** Alignment shift for killing innocents */
  INNOCENT_KILL_SHIFT: -25,
  /** Alignment shift for healing others */
  HEALING_SHIFT: 5,
  /** Alignment decay per hour towards neutral */
  HOURLY_DECAY: 1,
  /** Minimum alignment change to trigger a notification */
  NOTIFICATION_THRESHOLD: 50,
} as const;

// ============================================
// Types
// ============================================

/**
 * XP gain sources
 */
export enum JediXpSource {
  /** Combat XP from killing enemies */
  COMBAT = 'combat',
  /** Quest completion */
  QUEST = 'quest',
  /** Training sessions */
  TRAINING = 'training',
  /** Force power practice */
  FORCE_USE = 'force_use',
  /** Crafting lightsaber components */
  CRAFTING = 'crafting',
  /** Meditation */
  MEDITATION = 'meditation',
  /** Discovering force artifacts */
  DISCOVERY = 'discovery',
}

/**
 * Result of granting XP
 */
export interface XpGrantResult {
  /** Amount of XP actually granted */
  xpGranted: number;
  /** Whether a rank up occurred */
  rankedUp: boolean;
  /** Previous rank if ranked up */
  previousRank?: JediRank;
  /** New rank if ranked up */
  newRank?: JediRank;
  /** Skill points gained from rank up */
  skillPointsGained: number;
  /** Whether XP was capped */
  wasCapped: boolean;
  /** Current total XP */
  totalXp: number;
}

/**
 * Result of alignment change
 */
export interface AlignmentChangeResult {
  /** Previous alignment value */
  previousValue: number;
  /** New alignment value */
  newValue: number;
  /** Previous alignment state */
  previousAlignment: ForceAlignment;
  /** New alignment state */
  newAlignment: ForceAlignment;
  /** Whether alignment state changed */
  alignmentChanged: boolean;
  /** Whether rank was affected */
  rankAffected: boolean;
}

/**
 * Result of processing a death
 */
export interface DeathPenaltyResult {
  /** XP lost */
  xpLost: number;
  /** Skills lost (if any) */
  skillsLost: string[];
  /** Remaining lives before permadeath */
  livesRemaining: number;
  /** Whether character is permanently dead */
  isPermadeath: boolean;
  /** Grace period until visibility resumes */
  gracePeriodMs: number;
}

/**
 * Rank advancement result
 */
export interface RankAdvancementResult {
  /** Whether advancement was successful */
  success: boolean;
  /** New rank */
  newRank: JediRank;
  /** Skill points granted */
  skillPointsGranted: number;
  /** Force power bonus granted */
  forcePowerBonus: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Daily XP tracking
 */
interface DailyXpTracker {
  date: string;
  xpEarned: number;
}

/**
 * Handler for rank change events
 */
export type RankChangeHandler = (
  playerId: ObjectId,
  previousRank: JediRank,
  newRank: JediRank
) => void;

/**
 * Handler for alignment change events
 */
export type AlignmentChangeHandler = (
  playerId: ObjectId,
  previousAlignment: ForceAlignment,
  newAlignment: ForceAlignment
) => void;

/**
 * Handler for permadeath events
 */
export type PermaDeathHandler = (playerId: ObjectId, state: JediPlayerState) => void;

// ============================================
// JediProgressionManager Class
// ============================================

/**
 * Manages Jedi progression including XP, ranks, alignment, and death penalties
 */
export class JediProgressionManager {
  /** Reference to the skill tree */
  private skillTree: JediSkillTree;

  /** Death penalty configuration */
  private deathPenalty: JediDeathPenalty;

  /** Daily XP trackers per player */
  private dailyXpTrackers: Map<ObjectId, DailyXpTracker>;

  /** Rank change handlers */
  private rankChangeHandlers: Set<RankChangeHandler>;

  /** Alignment change handlers */
  private alignmentChangeHandlers: Set<AlignmentChangeHandler>;

  /** Permadeath handlers */
  private permaDeathHandlers: Set<PermaDeathHandler>;

  constructor(skillTree: JediSkillTree, deathPenalty?: JediDeathPenalty) {
    this.skillTree = skillTree;
    this.deathPenalty = deathPenalty ?? { ...DefaultJediDeathPenalty };
    this.dailyXpTrackers = new Map();
    this.rankChangeHandlers = new Set();
    this.alignmentChangeHandlers = new Set();
    this.permaDeathHandlers = new Set();
  }

  // ============================================
  // Event Registration
  // ============================================

  /**
   * Register a handler for rank changes
   */
  onRankChange(handler: RankChangeHandler): void {
    this.rankChangeHandlers.add(handler);
  }

  /**
   * Remove a rank change handler
   */
  offRankChange(handler: RankChangeHandler): void {
    this.rankChangeHandlers.delete(handler);
  }

  /**
   * Register a handler for alignment changes
   */
  onAlignmentChange(handler: AlignmentChangeHandler): void {
    this.alignmentChangeHandlers.add(handler);
  }

  /**
   * Remove an alignment change handler
   */
  offAlignmentChange(handler: AlignmentChangeHandler): void {
    this.alignmentChangeHandlers.delete(handler);
  }

  /**
   * Register a handler for permadeath
   */
  onPermaDeath(handler: PermaDeathHandler): void {
    this.permaDeathHandlers.add(handler);
  }

  /**
   * Remove a permadeath handler
   */
  offPermaDeath(handler: PermaDeathHandler): void {
    this.permaDeathHandlers.delete(handler);
  }

  // ============================================
  // XP Management
  // ============================================

  /**
   * Grant Jedi XP to a player
   */
  grantXp(
    state: JediPlayerState,
    amount: number,
    source: JediXpSource
  ): XpGrantResult {
    const result: XpGrantResult = {
      xpGranted: 0,
      rankedUp: false,
      skillPointsGained: 0,
      wasCapped: false,
      totalXp: state.jediXp,
    };

    // Check daily cap
    const dailyRemaining = this.getDailyXpRemaining(state.playerId);
    if (dailyRemaining <= 0) {
      result.wasCapped = true;
      return result;
    }

    // Apply daily cap
    let xpToGrant = Math.min(amount, dailyRemaining);

    // Check total XP cap for non-masters
    if (!this.isMasterRank(state.rank)) {
      const remaining = JediXpConfig.NON_MASTER_XP_CAP - state.jediXp;
      if (remaining <= 0) {
        result.wasCapped = true;
        return result;
      }
      xpToGrant = Math.min(xpToGrant, remaining);
    }

    // Apply XP
    const previousXp = state.jediXp;
    state.jediXp += xpToGrant;
    result.xpGranted = xpToGrant;
    result.totalXp = state.jediXp;

    // Update daily tracker
    this.updateDailyXp(state.playerId, xpToGrant);

    // Check for rank advancement
    const rankResult = this.checkRankAdvancement(state);
    if (rankResult.success && rankResult.newRank !== state.rank) {
      result.rankedUp = true;
      result.previousRank = state.rank;
      result.newRank = rankResult.newRank;
      result.skillPointsGained = rankResult.skillPointsGranted;

      // Apply rank up
      const oldRank = state.rank;
      state.rank = rankResult.newRank;
      state.jediSkillPoints += rankResult.skillPointsGranted;
      state.maxForcePower += rankResult.forcePowerBonus;
      state.forcePower += rankResult.forcePowerBonus;

      // Emit event
      this.emitRankChange(state.playerId, oldRank, rankResult.newRank);
    }

    return result;
  }

  /**
   * Calculate combat XP for killing an enemy
   */
  calculateCombatXp(
    enemyLevel: number,
    playerLevel: number,
    isForceSensitive: boolean
  ): number {
    // Base XP scales with enemy level
    let xp = JediXpConfig.BASE_CREATURE_XP + enemyLevel * 5;

    // Level difference modifier
    const levelDiff = enemyLevel - playerLevel;
    if (levelDiff > 0) {
      xp *= 1 + levelDiff * 0.1; // More XP for higher level enemies
    } else if (levelDiff < -5) {
      xp *= 0.5; // Much less XP for trivial enemies
    }

    // Force sensitive bonus
    if (isForceSensitive) {
      xp *= JediXpConfig.FORCE_SENSITIVE_MULTIPLIER;
    }

    return Math.round(xp);
  }

  /**
   * Get remaining daily XP
   */
  getDailyXpRemaining(playerId: ObjectId): number {
    const today = this.getTodayString();
    const tracker = this.dailyXpTrackers.get(playerId);

    if (!tracker || tracker.date !== today) {
      return JediXpConfig.DAILY_XP_CAP;
    }

    return Math.max(0, JediXpConfig.DAILY_XP_CAP - tracker.xpEarned);
  }

  // ============================================
  // Rank Management
  // ============================================

  /**
   * Check if a player qualifies for rank advancement
   */
  checkRankAdvancement(state: JediPlayerState): RankAdvancementResult {
    const result: RankAdvancementResult = {
      success: false,
      newRank: state.rank,
      skillPointsGranted: 0,
      forcePowerBonus: 0,
    };

    const currentAlignment = getAlignmentFromValue(state.alignmentValue);

    // Determine possible next ranks based on alignment
    const possibleRanks = this.getPossibleRanks(state.rank, currentAlignment);

    for (const rank of possibleRanks) {
      const rankInfo = ForceRanks[rank];

      if (state.jediXp >= rankInfo.xpRequired) {
        // Check alignment requirement
        if (this.meetsAlignmentRequirement(rank, currentAlignment)) {
          result.success = true;
          result.newRank = rank;
          result.skillPointsGranted = rankInfo.skillPointsGranted - ForceRanks[state.rank].skillPointsGranted;
          result.forcePowerBonus = rankInfo.forcePowerBonus - ForceRanks[state.rank].forcePowerBonus;
          break;
        }
      }
    }

    return result;
  }

  /**
   * Force a rank change (admin function)
   */
  setRank(state: JediPlayerState, newRank: JediRank): void {
    const oldRank = state.rank;
    const oldRankInfo = ForceRanks[oldRank];
    const newRankInfo = ForceRanks[newRank];

    // Adjust skill points
    const skillPointDiff = newRankInfo.skillPointsGranted - oldRankInfo.skillPointsGranted;
    state.jediSkillPoints = Math.max(0, state.jediSkillPoints + skillPointDiff);

    // Adjust force power
    const forcePowerDiff = newRankInfo.forcePowerBonus - oldRankInfo.forcePowerBonus;
    state.maxForcePower += forcePowerDiff;
    state.forcePower = Math.min(state.forcePower, state.maxForcePower);

    state.rank = newRank;

    this.emitRankChange(state.playerId, oldRank, newRank);
  }

  /**
   * Get display title for current rank
   */
  getRankTitle(state: JediPlayerState): string {
    return ForceRanks[state.rank].title;
  }

  /**
   * Check if a rank is a master rank
   */
  isMasterRank(rank: JediRank): boolean {
    return rank === JediRank.MASTER || rank === JediRank.SITH_LORD;
  }

  // ============================================
  // Alignment Management
  // ============================================

  /**
   * Shift alignment towards light or dark
   */
  shiftAlignment(state: JediPlayerState, amount: number): AlignmentChangeResult {
    const result: AlignmentChangeResult = {
      previousValue: state.alignmentValue,
      newValue: state.alignmentValue,
      previousAlignment: getAlignmentFromValue(state.alignmentValue),
      newAlignment: getAlignmentFromValue(state.alignmentValue),
      alignmentChanged: false,
      rankAffected: false,
    };

    // Apply shift with clamping
    const newValue = Math.max(
      AlignmentThresholds.MIN_ALIGNMENT,
      Math.min(AlignmentThresholds.MAX_ALIGNMENT, state.alignmentValue + amount)
    );

    state.alignmentValue = newValue;
    result.newValue = newValue;
    result.newAlignment = getAlignmentFromValue(newValue);

    // Check if alignment state changed
    if (result.previousAlignment !== result.newAlignment) {
      result.alignmentChanged = true;

      // Check if rank needs to change
      if (this.rankRequiresAlignmentChange(state.rank, result.newAlignment)) {
        result.rankAffected = true;
        // Demote to appropriate rank
        this.handleAlignmentRankChange(state, result.newAlignment);
      }

      // Emit event
      this.emitAlignmentChange(state.playerId, result.previousAlignment, result.newAlignment);
    }

    return result;
  }

  /**
   * Record a light side action
   */
  recordLightSideAction(state: JediPlayerState): AlignmentChangeResult {
    return this.shiftAlignment(state, AlignmentConfig.LIGHT_ACTION_SHIFT);
  }

  /**
   * Record a dark side action
   */
  recordDarkSideAction(state: JediPlayerState): AlignmentChangeResult {
    return this.shiftAlignment(state, AlignmentConfig.DARK_ACTION_SHIFT);
  }

  /**
   * Record killing an innocent
   */
  recordInnocentKill(state: JediPlayerState): AlignmentChangeResult {
    return this.shiftAlignment(state, AlignmentConfig.INNOCENT_KILL_SHIFT);
  }

  /**
   * Record healing another player
   */
  recordHealingOther(state: JediPlayerState): AlignmentChangeResult {
    return this.shiftAlignment(state, AlignmentConfig.HEALING_SHIFT);
  }

  /**
   * Process alignment decay towards neutral
   */
  processAlignmentDecay(state: JediPlayerState, hoursElapsed: number): void {
    if (state.alignmentValue === 0) {
      return;
    }

    const decayAmount = AlignmentConfig.HOURLY_DECAY * hoursElapsed;

    if (state.alignmentValue > 0) {
      state.alignmentValue = Math.max(0, state.alignmentValue - decayAmount);
    } else {
      state.alignmentValue = Math.min(0, state.alignmentValue + decayAmount);
    }
  }

  /**
   * Get current alignment
   */
  getCurrentAlignment(state: JediPlayerState): ForceAlignment {
    return getAlignmentFromValue(state.alignmentValue);
  }

  /**
   * Get alignment percentage (-100 to +100)
   */
  getAlignmentPercent(state: JediPlayerState): number {
    return Math.round((state.alignmentValue / AlignmentThresholds.MAX_ALIGNMENT) * 100);
  }

  // ============================================
  // Skill Branch Unlocking
  // ============================================

  /**
   * Check if a skill branch is unlocked for a player
   */
  isBranchUnlocked(state: JediPlayerState, branch: JediSkillBranch): boolean {
    // All branches unlocked once force sensitive is unlocked
    // Could add additional restrictions here
    return state.learnedSkills.size > 0 || state.jediSkillPoints > 0;
  }

  /**
   * Get available skill branches
   */
  getAvailableBranches(state: JediPlayerState): JediSkillBranch[] {
    return Object.values(JediSkillBranch).filter((branch) =>
      this.isBranchUnlocked(state, branch)
    );
  }

  /**
   * Check if player has mastered a branch
   */
  hasMasteredBranch(state: JediPlayerState, branch: JediSkillBranch): boolean {
    const branchSkills = this.skillTree.getSkillsByBranch(branch);
    const masterSkills = branchSkills.filter((s) => s.isMaster);

    return masterSkills.every((s) => state.learnedSkills.has(s.skillName));
  }

  /**
   * Get mastery progress for a branch
   */
  getBranchProgress(
    state: JediPlayerState,
    branch: JediSkillBranch
  ): { learned: number; total: number; percent: number } {
    const branchSkills = this.skillTree.getSkillsByBranch(branch);
    const learned = branchSkills.filter((s) => state.learnedSkills.has(s.skillName)).length;

    return {
      learned,
      total: branchSkills.length,
      percent: branchSkills.length > 0 ? Math.round((learned / branchSkills.length) * 100) : 0,
    };
  }

  // ============================================
  // Death Penalties
  // ============================================

  /**
   * Process a Jedi death
   */
  processJediDeath(
    state: JediPlayerState,
    wasKilledByBountyHunter: boolean
  ): DeathPenaltyResult {
    const result: DeathPenaltyResult = {
      xpLost: 0,
      skillsLost: [],
      livesRemaining: this.deathPenalty.livesBeforePermadeath - state.deathCount - 1,
      isPermadeath: false,
      gracePeriodMs: this.deathPenalty.cloneGracePeriod,
    };

    // Increment death counter
    state.deathCount++;

    // Check for permadeath
    if (state.deathCount >= this.deathPenalty.livesBeforePermadeath) {
      result.isPermadeath = true;
      result.livesRemaining = 0;

      // Emit permadeath event
      this.emitPermaDeath(state.playerId, state);

      return result;
    }

    // Calculate XP loss
    const xpLoss = Math.floor(state.jediXp * (this.deathPenalty.xpLossPercent / 100));
    state.jediXp = Math.max(0, state.jediXp - xpLoss);
    result.xpLost = xpLoss;

    // Handle skill loss if enabled
    if (this.deathPenalty.skillLossEnabled && state.learnedSkills.size > 0) {
      // Lose the most recently learned skill (highest tier)
      const skillToLose = this.findHighestTierSkill(state);
      if (skillToLose) {
        const surrendered = this.skillTree.surrenderSkill(state, skillToLose);
        result.skillsLost = surrendered;
      }
    }

    // Bounty hunter kills reduce visibility more
    if (wasKilledByBountyHunter) {
      state.visibility = Math.floor(state.visibility * 0.5);
    }

    return result;
  }

  /**
   * Get remaining lives
   */
  getRemainingLives(state: JediPlayerState): number {
    return Math.max(0, this.deathPenalty.livesBeforePermadeath - state.deathCount);
  }

  /**
   * Reset death counter (admin function or special quest)
   */
  resetDeathCounter(state: JediPlayerState): void {
    state.deathCount = 0;
  }

  /**
   * Set death penalty configuration
   */
  setDeathPenalty(penalty: JediDeathPenalty): void {
    this.deathPenalty = { ...penalty };
  }

  /**
   * Get death penalty configuration
   */
  getDeathPenalty(): JediDeathPenalty {
    return { ...this.deathPenalty };
  }

  // ============================================
  // Force Power Management
  // ============================================

  /**
   * Calculate force regen rate
   */
  calculateForceRegenRate(state: JediPlayerState): number {
    // Base regen
    let regenRate = 5;

    // Add rank bonus
    regenRate += ForceRanks[state.rank].forceRegenBonus;

    // Add skill mod bonus
    const regenMod = this.skillTree.getSkillMod(state, JediSkillMods.FORCE_REGEN);
    regenRate += regenMod;

    return regenRate;
  }

  /**
   * Regenerate force power
   */
  regenerateForcePower(state: JediPlayerState, tickMs: number): number {
    if (state.forcePower >= state.maxForcePower) {
      return 0;
    }

    // Regen rate is per second
    const regenRate = this.calculateForceRegenRate(state);
    const regenAmount = (regenRate * tickMs) / 1000;

    const previousPower = state.forcePower;
    state.forcePower = Math.min(state.maxForcePower, state.forcePower + regenAmount);

    return state.forcePower - previousPower;
  }

  /**
   * Consume force power
   */
  consumeForcePower(state: JediPlayerState, amount: number): boolean {
    if (state.forcePower < amount) {
      return false;
    }

    state.forcePower -= amount;
    return true;
  }

  /**
   * Check if player has enough force power
   */
  hasForcePower(state: JediPlayerState, amount: number): boolean {
    return state.forcePower >= amount;
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Get possible next ranks based on current rank and alignment
   */
  private getPossibleRanks(currentRank: JediRank, alignment: ForceAlignment): JediRank[] {
    const ranks: JediRank[] = [];

    switch (currentRank) {
      case JediRank.INITIATE:
        ranks.push(JediRank.PADAWAN);
        break;
      case JediRank.PADAWAN:
        if (alignment === ForceAlignment.LIGHT || alignment === ForceAlignment.NEUTRAL) {
          ranks.push(JediRank.KNIGHT);
        }
        if (alignment === ForceAlignment.DARK || alignment === ForceAlignment.NEUTRAL) {
          ranks.push(JediRank.DARK_JEDI);
        }
        break;
      case JediRank.KNIGHT:
        ranks.push(JediRank.MASTER);
        break;
      case JediRank.DARK_JEDI:
        ranks.push(JediRank.SITH_LORD);
        break;
    }

    return ranks;
  }

  /**
   * Check if alignment meets rank requirement
   */
  private meetsAlignmentRequirement(rank: JediRank, alignment: ForceAlignment): boolean {
    if (isLightSideRank(rank)) {
      return alignment === ForceAlignment.LIGHT;
    }
    if (isDarkSideRank(rank)) {
      return alignment === ForceAlignment.DARK;
    }
    return true; // Neutral ranks
  }

  /**
   * Check if current rank requires alignment change
   */
  private rankRequiresAlignmentChange(rank: JediRank, newAlignment: ForceAlignment): boolean {
    if (isLightSideRank(rank) && newAlignment === ForceAlignment.DARK) {
      return true;
    }
    if (isDarkSideRank(rank) && newAlignment === ForceAlignment.LIGHT) {
      return true;
    }
    return false;
  }

  /**
   * Handle rank change due to alignment shift
   */
  private handleAlignmentRankChange(state: JediPlayerState, newAlignment: ForceAlignment): void {
    const currentRank = state.rank;

    // Light side master becoming dark
    if (currentRank === JediRank.MASTER && newAlignment === ForceAlignment.DARK) {
      this.setRank(state, JediRank.DARK_JEDI);
    }
    // Light side knight becoming dark
    else if (currentRank === JediRank.KNIGHT && newAlignment === ForceAlignment.DARK) {
      this.setRank(state, JediRank.DARK_JEDI);
    }
    // Dark side sith becoming light
    else if (currentRank === JediRank.SITH_LORD && newAlignment === ForceAlignment.LIGHT) {
      this.setRank(state, JediRank.KNIGHT);
    }
    // Dark jedi becoming light
    else if (currentRank === JediRank.DARK_JEDI && newAlignment === ForceAlignment.LIGHT) {
      this.setRank(state, JediRank.KNIGHT);
    }
  }

  /**
   * Find the highest tier skill a player has learned
   */
  private findHighestTierSkill(state: JediPlayerState): string | null {
    let highestTier = 0;
    let highestSkill: string | null = null;

    for (const skillName of state.learnedSkills) {
      const skill = this.skillTree.getSkill(skillName);
      if (skill && skill.tier > highestTier) {
        highestTier = skill.tier;
        highestSkill = skillName;
      }
    }

    return highestSkill;
  }

  /**
   * Get today's date string for daily tracking
   */
  private getTodayString(): string {
    return new Date().toISOString().split('T')[0] ?? '';
  }

  /**
   * Update daily XP tracker
   */
  private updateDailyXp(playerId: ObjectId, amount: number): void {
    const today = this.getTodayString();
    const tracker = this.dailyXpTrackers.get(playerId);

    if (!tracker || tracker.date !== today) {
      this.dailyXpTrackers.set(playerId, { date: today, xpEarned: amount });
    } else {
      tracker.xpEarned += amount;
    }
  }

  /**
   * Emit rank change event
   */
  private emitRankChange(playerId: ObjectId, previousRank: JediRank, newRank: JediRank): void {
    for (const handler of this.rankChangeHandlers) {
      try {
        handler(playerId, previousRank, newRank);
      } catch (error) {
        console.error('Error in rank change handler:', error);
      }
    }
  }

  /**
   * Emit alignment change event
   */
  private emitAlignmentChange(
    playerId: ObjectId,
    previousAlignment: ForceAlignment,
    newAlignment: ForceAlignment
  ): void {
    for (const handler of this.alignmentChangeHandlers) {
      try {
        handler(playerId, previousAlignment, newAlignment);
      } catch (error) {
        console.error('Error in alignment change handler:', error);
      }
    }
  }

  /**
   * Emit permadeath event
   */
  private emitPermaDeath(playerId: ObjectId, state: JediPlayerState): void {
    for (const handler of this.permaDeathHandlers) {
      try {
        handler(playerId, state);
      } catch (error) {
        console.error('Error in permadeath handler:', error);
      }
    }
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a new JediProgressionManager
 */
export function createJediProgressionManager(
  skillTree: JediSkillTree,
  deathPenalty?: JediDeathPenalty
): JediProgressionManager {
  return new JediProgressionManager(skillTree, deathPenalty);
}

/**
 * Get alignment description for UI
 */
export function getAlignmentDescription(alignment: ForceAlignment): string {
  switch (alignment) {
    case ForceAlignment.LIGHT:
      return 'You walk the path of the Light Side, using the Force for knowledge and defense.';
    case ForceAlignment.DARK:
      return 'You have embraced the Dark Side, drawing power from passion and aggression.';
    case ForceAlignment.NEUTRAL:
      return 'You remain balanced between Light and Dark, your path yet undecided.';
    default:
      return 'Your connection to the Force is unclear.';
  }
}

/**
 * Get rank description for UI
 */
export function getRankDescription(rank: JediRank): string {
  switch (rank) {
    case JediRank.INITIATE:
      return 'A Force-sensitive beginning their journey, learning to feel the Force.';
    case JediRank.PADAWAN:
      return 'An apprentice learning the ways of the Force under guidance.';
    case JediRank.KNIGHT:
      return 'A full Jedi Knight, having completed basic training and trials.';
    case JediRank.MASTER:
      return 'A Jedi Master, wise in the ways of the Force and capable of training others.';
    case JediRank.DARK_JEDI:
      return 'A Dark Jedi, having turned from the light to embrace the power of the dark side.';
    case JediRank.SITH_LORD:
      return 'A Sith Lord, master of the dark side and sworn enemy of the Jedi.';
    default:
      return 'Unknown rank.';
  }
}
