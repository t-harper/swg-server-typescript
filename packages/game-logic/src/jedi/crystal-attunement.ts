/**
 * Crystal Attunement System
 * Manages the process of attuning lightsaber crystals to Jedi
 * Crystals must be attuned before use and become soulbound after attunement
 */

import type { ObjectId } from '@swg/shared-types';
import {
  CrystalType,
  CrystalCategory,
  CrystalColor,
  CrystalSpecialEffect,
  CrystalDefaultColors,
  CrystalBaseStats,
  CrystalCategories,
  isLegendaryCrystal,
  requiresLightSide,
  requiresDarkSide,
  type LightsaberCrystal,
  type CrystalStats,
} from './lightsaber-types.js';
import { JediRank, ForceAlignment, getAlignmentFromValue, type JediPlayerState } from './jedi-types.js';

// ============================================
// Attunement State
// ============================================

/**
 * State of an ongoing attunement process
 */
export enum AttunementState {
  /** Not started */
  NOT_STARTED = 'not_started',
  /** Meditation in progress */
  MEDITATING = 'meditating',
  /** Bonding with crystal */
  BONDING = 'bonding',
  /** Attunement complete */
  COMPLETE = 'complete',
  /** Attunement failed */
  FAILED = 'failed',
  /** Attunement interrupted */
  INTERRUPTED = 'interrupted',
}

/**
 * Purity levels for crystals
 */
export enum CrystalPurity {
  /** Impure crystal - reduced stats */
  IMPURE = 'impure',
  /** Standard purity */
  STANDARD = 'standard',
  /** High purity - improved stats */
  PURE = 'pure',
  /** Exceptional purity - significant stat bonuses */
  EXCEPTIONAL = 'exceptional',
  /** Flawless - maximum stat bonuses */
  FLAWLESS = 'flawless',
}

/**
 * Purity thresholds (0-100 scale)
 */
export const PurityThresholds = {
  [CrystalPurity.IMPURE]: 0,
  [CrystalPurity.STANDARD]: 20,
  [CrystalPurity.PURE]: 50,
  [CrystalPurity.EXCEPTIONAL]: 75,
  [CrystalPurity.FLAWLESS]: 90,
} as const;

/**
 * Stat multipliers for each purity level
 */
export const PurityMultipliers = {
  [CrystalPurity.IMPURE]: 0.7,
  [CrystalPurity.STANDARD]: 1.0,
  [CrystalPurity.PURE]: 1.15,
  [CrystalPurity.EXCEPTIONAL]: 1.3,
  [CrystalPurity.FLAWLESS]: 1.5,
} as const;

// ============================================
// Attunement Configuration
// ============================================

/**
 * Configuration for the attunement process
 */
export interface AttunementConfig {
  /** Base meditation time in milliseconds */
  baseMeditationTime: number;
  /** Base bonding time in milliseconds */
  baseBondingTime: number;
  /** Force cost to attune */
  forceCost: number;
  /** Minimum force power required to start */
  minForcePower: number;
  /** Skill modifier for time reduction */
  skillTimeReduction: number;
  /** Legendary crystal time multiplier */
  legendaryTimeMultiplier: number;
  /** Chance of purity improvement during attunement */
  purityImprovementChance: number;
  /** Force power drain per tick during meditation */
  forceDrainPerTick: number;
  /** Tick interval in milliseconds */
  tickInterval: number;
}

/**
 * Default attunement configuration
 */
export const DefaultAttunementConfig: AttunementConfig = {
  baseMeditationTime: 60 * 1000, // 1 minute
  baseBondingTime: 120 * 1000, // 2 minutes
  forceCost: 100,
  minForcePower: 50,
  skillTimeReduction: 0.005, // 0.5% per skill level
  legendaryTimeMultiplier: 3.0,
  purityImprovementChance: 0.2, // 20% chance
  forceDrainPerTick: 5,
  tickInterval: 5000, // 5 seconds
};

// ============================================
// Attunement Session
// ============================================

/**
 * An active attunement session
 */
export interface AttunementSession {
  /** Unique session ID */
  sessionId: bigint;
  /** Crystal being attuned */
  crystalId: ObjectId;
  /** Crystal type */
  crystalType: CrystalType;
  /** Jedi performing the attunement */
  jediId: ObjectId;
  /** Current state of attunement */
  state: AttunementState;
  /** Start timestamp */
  startTime: number;
  /** Time spent meditating */
  meditationTime: number;
  /** Time spent bonding */
  bondingTime: number;
  /** Required meditation time */
  requiredMeditationTime: number;
  /** Required bonding time */
  requiredBondingTime: number;
  /** Total force cost paid */
  forcePaid: number;
  /** Current purity being achieved */
  targetPurity: number;
  /** Whether the session was interrupted */
  interrupted: boolean;
  /** Last tick timestamp */
  lastTickTime: number;
}

// ============================================
// Attunement Result
// ============================================

/**
 * Result codes for attunement operations
 */
export enum AttunementResultCode {
  /** Success */
  SUCCESS = 0,
  /** Crystal not found */
  CRYSTAL_NOT_FOUND = 1,
  /** Crystal already attuned */
  ALREADY_ATTUNED = 2,
  /** Not a Jedi */
  NOT_JEDI = 3,
  /** Insufficient force power */
  INSUFFICIENT_FORCE = 4,
  /** Insufficient skill level */
  INSUFFICIENT_SKILL = 5,
  /** Wrong alignment for crystal */
  WRONG_ALIGNMENT = 6,
  /** Session already in progress */
  SESSION_IN_PROGRESS = 7,
  /** Session not found */
  SESSION_NOT_FOUND = 8,
  /** Attunement interrupted */
  INTERRUPTED = 9,
  /** Crystal is soulbound to another */
  SOULBOUND_TO_ANOTHER = 10,
  /** Attunement failed */
  FAILED = 11,
  /** Internal error */
  INTERNAL_ERROR = 99,
}

/**
 * Result of an attunement operation
 */
export interface AttunementResult<T = void> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result code */
  resultCode: AttunementResultCode;
  /** Error message if failed */
  errorMessage?: string;
  /** Result data */
  data?: T;
}

// ============================================
// Crystal Attunement Manager
// ============================================

/**
 * Session ID counter
 */
let sessionIdCounter = BigInt(0);

/**
 * Generate a unique session ID
 */
function generateSessionId(): bigint {
  sessionIdCounter += BigInt(1);
  return (BigInt(Date.now()) << BigInt(20)) | sessionIdCounter;
}

/**
 * Manages crystal attunement processes
 */
export class CrystalAttunementManager {
  /** Active attunement sessions by session ID */
  private sessions: Map<bigint, AttunementSession>;

  /** Sessions by Jedi ID (one session per Jedi) */
  private sessionsByJedi: Map<string, bigint>;

  /** Sessions by crystal ID */
  private sessionsByCrystal: Map<string, bigint>;

  /** Configuration */
  private config: AttunementConfig;

  constructor(config: Partial<AttunementConfig> = {}) {
    this.sessions = new Map();
    this.sessionsByJedi = new Map();
    this.sessionsByCrystal = new Map();
    this.config = { ...DefaultAttunementConfig, ...config };
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Start an attunement session
   */
  startAttunement(
    crystal: LightsaberCrystal,
    jediState: JediPlayerState
  ): AttunementResult<AttunementSession> {
    // Check if crystal is already attuned
    if (crystal.attuned) {
      if (crystal.attunedToId === jediState.playerId) {
        return this.attunementError(
          AttunementResultCode.ALREADY_ATTUNED,
          'This crystal is already attuned to you.'
        );
      }
      if (crystal.soulbound) {
        return this.attunementError(
          AttunementResultCode.SOULBOUND_TO_ANOTHER,
          'This crystal is soulbound to another Jedi.'
        );
      }
    }

    // Check if Jedi already has an active session
    const jediKey = jediState.playerId.toString();
    if (this.sessionsByJedi.has(jediKey)) {
      return this.attunementError(
        AttunementResultCode.SESSION_IN_PROGRESS,
        'You are already attuning a crystal.'
      );
    }

    // Check if crystal is already being attuned
    const crystalKey = crystal.objectId.toString();
    if (this.sessionsByCrystal.has(crystalKey)) {
      return this.attunementError(
        AttunementResultCode.SESSION_IN_PROGRESS,
        'This crystal is already being attuned.'
      );
    }

    // Check force sensitive status
    if (jediState.rank === JediRank.INITIATE && jediState.jediXp === 0) {
      return this.attunementError(
        AttunementResultCode.NOT_JEDI,
        'You must be a Jedi to attune crystals.'
      );
    }

    // Check force power
    if (jediState.forcePower < this.config.minForcePower) {
      return this.attunementError(
        AttunementResultCode.INSUFFICIENT_FORCE,
        `You need at least ${this.config.minForcePower} force power to begin attunement.`
      );
    }

    // Check alignment requirements
    const alignmentCheck = this.checkAlignmentRequirement(crystal.crystalType, jediState);
    if (!alignmentCheck.success) {
      return alignmentCheck as AttunementResult<AttunementSession>;
    }

    // Calculate required times
    const timeMultiplier = isLegendaryCrystal(crystal.crystalType)
      ? this.config.legendaryTimeMultiplier
      : 1.0;

    const skillReduction = 1 - jediState.learnedSkills.size * this.config.skillTimeReduction;
    const finalMultiplier = Math.max(0.5, timeMultiplier * skillReduction);

    const requiredMeditationTime = Math.floor(this.config.baseMeditationTime * finalMultiplier);
    const requiredBondingTime = Math.floor(this.config.baseBondingTime * finalMultiplier);

    // Create session
    const sessionId = generateSessionId();
    const session: AttunementSession = {
      sessionId,
      crystalId: crystal.objectId,
      crystalType: crystal.crystalType,
      jediId: jediState.playerId,
      state: AttunementState.MEDITATING,
      startTime: Date.now(),
      meditationTime: 0,
      bondingTime: 0,
      requiredMeditationTime,
      requiredBondingTime,
      forcePaid: 0,
      targetPurity: crystal.purity,
      interrupted: false,
      lastTickTime: Date.now(),
    };

    // Store session
    this.sessions.set(sessionId, session);
    this.sessionsByJedi.set(jediKey, sessionId);
    this.sessionsByCrystal.set(crystalKey, sessionId);

    return this.attunementSuccess(session);
  }

  /**
   * Process a tick of the attunement session
   * Should be called periodically (e.g., every 5 seconds)
   */
  tickAttunement(
    sessionId: bigint,
    currentForcePower: number
  ): AttunementResult<AttunementTickResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return this.attunementError(
        AttunementResultCode.SESSION_NOT_FOUND,
        'Attunement session not found.'
      );
    }

    if (session.state === AttunementState.COMPLETE || session.state === AttunementState.FAILED) {
      return this.attunementError(
        AttunementResultCode.SESSION_NOT_FOUND,
        'Attunement session has ended.'
      );
    }

    const now = Date.now();
    const elapsed = now - session.lastTickTime;
    session.lastTickTime = now;

    // Check force power
    if (currentForcePower < this.config.forceDrainPerTick) {
      session.state = AttunementState.FAILED;
      session.interrupted = true;
      this.cleanupSession(sessionId);
      return this.attunementError(
        AttunementResultCode.INSUFFICIENT_FORCE,
        'You have run out of force power. Attunement failed.'
      );
    }

    // Drain force
    const forceDrained = this.config.forceDrainPerTick;
    session.forcePaid += forceDrained;

    // Update time based on state
    if (session.state === AttunementState.MEDITATING) {
      session.meditationTime += elapsed;

      // Check if meditation is complete
      if (session.meditationTime >= session.requiredMeditationTime) {
        session.state = AttunementState.BONDING;
      }
    } else if (session.state === AttunementState.BONDING) {
      session.bondingTime += elapsed;

      // Check if bonding is complete
      if (session.bondingTime >= session.requiredBondingTime) {
        session.state = AttunementState.COMPLETE;
      }
    }

    const result: AttunementTickResult = {
      state: session.state,
      forceDrained,
      meditationProgress: Math.min(1.0, session.meditationTime / session.requiredMeditationTime),
      bondingProgress: Math.min(1.0, session.bondingTime / session.requiredBondingTime),
      totalProgress: this.calculateTotalProgress(session),
      complete: session.state === AttunementState.COMPLETE,
    };

    return this.attunementSuccess(result);
  }

  /**
   * Complete the attunement and return the attuned crystal
   */
  completeAttunement(sessionId: bigint): AttunementResult<AttunedCrystalResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return this.attunementError(
        AttunementResultCode.SESSION_NOT_FOUND,
        'Attunement session not found.'
      );
    }

    if (session.state !== AttunementState.COMPLETE) {
      return this.attunementError(
        AttunementResultCode.FAILED,
        'Attunement is not yet complete.'
      );
    }

    // Calculate final purity (chance to improve)
    let finalPurity = session.targetPurity;
    if (Math.random() < this.config.purityImprovementChance) {
      const improvement = Math.floor(Math.random() * 10) + 5; // 5-15 improvement
      finalPurity = Math.min(100, finalPurity + improvement);
    }

    // Calculate stats based on purity
    const purityLevel = this.getPurityLevel(finalPurity);
    const purityMultiplier = PurityMultipliers[purityLevel];
    const baseStats = CrystalBaseStats[session.crystalType];
    const finalStats = this.applyPurityToStats(baseStats, purityMultiplier);

    const result: AttunedCrystalResult = {
      crystalId: session.crystalId,
      crystalType: session.crystalType,
      attunedToId: session.jediId,
      attunementTime: Date.now(),
      purity: finalPurity,
      purityLevel,
      stats: finalStats,
      color: this.determineCrystalColor(session.crystalType),
      soulbound: true,
    };

    // Clean up session
    this.cleanupSession(sessionId);

    return this.attunementSuccess(result);
  }

  /**
   * Interrupt/cancel an attunement session
   */
  interruptAttunement(sessionId: bigint): AttunementResult<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return this.attunementError(
        AttunementResultCode.SESSION_NOT_FOUND,
        'Attunement session not found.'
      );
    }

    if (session.state === AttunementState.COMPLETE) {
      return this.attunementError(
        AttunementResultCode.FAILED,
        'Cannot interrupt a completed attunement.'
      );
    }

    session.state = AttunementState.INTERRUPTED;
    session.interrupted = true;
    this.cleanupSession(sessionId);

    return this.attunementSuccess();
  }

  /**
   * Get the current session for a Jedi
   */
  getSessionForJedi(jediId: ObjectId): AttunementSession | undefined {
    const sessionId = this.sessionsByJedi.get(jediId.toString());
    if (sessionId) {
      return this.sessions.get(sessionId);
    }
    return undefined;
  }

  /**
   * Get the current session for a crystal
   */
  getSessionForCrystal(crystalId: ObjectId): AttunementSession | undefined {
    const sessionId = this.sessionsByCrystal.get(crystalId.toString());
    if (sessionId) {
      return this.sessions.get(sessionId);
    }
    return undefined;
  }

  // ============================================
  // Crystal Creation
  // ============================================

  /**
   * Create a new unattuned crystal
   */
  createCrystal(
    objectId: ObjectId,
    crystalType: CrystalType,
    quality: number,
    purity: number,
    color: CrystalColor | null = null
  ): LightsaberCrystal {
    const category = CrystalCategories[crystalType];
    const defaultColor = CrystalDefaultColors[crystalType] ?? null;

    // For blade crystals, determine color
    let finalColor: CrystalColor | null = null;
    if (category === CrystalCategory.BLADE) {
      finalColor = color ?? defaultColor ?? CrystalColor.BLUE;
    }

    const purityLevel = this.getPurityLevel(purity);
    const purityMultiplier = PurityMultipliers[purityLevel];
    const baseStats = CrystalBaseStats[crystalType];
    const stats = this.applyPurityToStats(baseStats, purityMultiplier);

    return {
      objectId,
      crystalType,
      category,
      color: finalColor,
      quality: Math.max(0, Math.min(100, quality)),
      purity: Math.max(0, Math.min(100, purity)),
      stats,
      attuned: false,
      attunedToId: null,
      attunementTime: null,
      soulbound: false,
    };
  }

  /**
   * Apply attunement result to a crystal
   */
  applyCrystalAttunement(
    crystal: LightsaberCrystal,
    result: AttunedCrystalResult
  ): LightsaberCrystal {
    return {
      ...crystal,
      attuned: true,
      attunedToId: result.attunedToId,
      attunementTime: result.attunementTime,
      purity: result.purity,
      stats: result.stats,
      color: result.color,
      soulbound: result.soulbound,
    };
  }

  // ============================================
  // Validation
  // ============================================

  /**
   * Check if a Jedi can attune a specific crystal type
   */
  canAttuneCrystal(crystalType: CrystalType, jediState: JediPlayerState): AttunementResult<void> {
    // Check alignment
    const alignmentCheck = this.checkAlignmentRequirement(crystalType, jediState);
    if (!alignmentCheck.success) {
      return alignmentCheck;
    }

    // Check rank for legendary crystals
    if (isLegendaryCrystal(crystalType)) {
      if (jediState.rank !== JediRank.MASTER && jediState.rank !== JediRank.SITH_LORD) {
        return this.attunementError(
          AttunementResultCode.INSUFFICIENT_SKILL,
          'Only Jedi Masters can attune legendary crystals.'
        );
      }
    }

    return this.attunementSuccess();
  }

  /**
   * Check alignment requirement for a crystal
   */
  private checkAlignmentRequirement(
    crystalType: CrystalType,
    jediState: JediPlayerState
  ): AttunementResult<void> {
    const alignment = getAlignmentFromValue(jediState.alignmentValue);

    if (requiresLightSide(crystalType) && alignment !== ForceAlignment.LIGHT) {
      return this.attunementError(
        AttunementResultCode.WRONG_ALIGNMENT,
        'This crystal requires light side alignment.'
      );
    }

    if (requiresDarkSide(crystalType) && alignment !== ForceAlignment.DARK) {
      return this.attunementError(
        AttunementResultCode.WRONG_ALIGNMENT,
        'This crystal requires dark side alignment.'
      );
    }

    return this.attunementSuccess();
  }

  // ============================================
  // Purity Calculations
  // ============================================

  /**
   * Get the purity level from a purity value
   */
  getPurityLevel(purity: number): CrystalPurity {
    if (purity >= PurityThresholds[CrystalPurity.FLAWLESS]) {
      return CrystalPurity.FLAWLESS;
    }
    if (purity >= PurityThresholds[CrystalPurity.EXCEPTIONAL]) {
      return CrystalPurity.EXCEPTIONAL;
    }
    if (purity >= PurityThresholds[CrystalPurity.PURE]) {
      return CrystalPurity.PURE;
    }
    if (purity >= PurityThresholds[CrystalPurity.STANDARD]) {
      return CrystalPurity.STANDARD;
    }
    return CrystalPurity.IMPURE;
  }

  /**
   * Apply purity multiplier to crystal stats
   */
  private applyPurityToStats(baseStats: CrystalStats, multiplier: number): CrystalStats {
    return {
      damageBonus: Math.floor(baseStats.damageBonus * multiplier),
      damageMultiplier: 1 + (baseStats.damageMultiplier - 1) * multiplier,
      speedBonus: Math.floor(baseStats.speedBonus * multiplier),
      forceReduction: Math.floor(baseStats.forceReduction * multiplier),
      accuracyBonus: Math.floor(baseStats.accuracyBonus * multiplier),
      defenseBonus: Math.floor(baseStats.defenseBonus * multiplier),
      specialEffect: baseStats.specialEffect,
      specialEffectMagnitude: Math.floor(baseStats.specialEffectMagnitude * multiplier),
    };
  }

  /**
   * Determine the crystal color for a blade crystal
   */
  private determineCrystalColor(crystalType: CrystalType): CrystalColor | null {
    const category = CrystalCategories[crystalType];
    if (category !== CrystalCategory.BLADE) {
      return null;
    }
    return CrystalDefaultColors[crystalType] ?? CrystalColor.BLUE;
  }

  // ============================================
  // Progress Calculation
  // ============================================

  /**
   * Calculate total attunement progress (0-1)
   */
  private calculateTotalProgress(session: AttunementSession): number {
    const totalRequired = session.requiredMeditationTime + session.requiredBondingTime;
    const totalCompleted = session.meditationTime + session.bondingTime;
    return Math.min(1.0, totalCompleted / totalRequired);
  }

  // ============================================
  // Session Cleanup
  // ============================================

  /**
   * Clean up a completed or cancelled session
   */
  private cleanupSession(sessionId: bigint): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessionsByJedi.delete(session.jediId.toString());
      this.sessionsByCrystal.delete(session.crystalId.toString());
      this.sessions.delete(sessionId);
    }
  }

  // ============================================
  // Result Helpers
  // ============================================

  /**
   * Create a success result
   */
  private attunementSuccess<T>(data?: T): AttunementResult<T> {
    return {
      success: true,
      resultCode: AttunementResultCode.SUCCESS,
      data,
    };
  }

  /**
   * Create an error result
   */
  private attunementError<T>(
    code: AttunementResultCode,
    message: string
  ): AttunementResult<T> {
    return {
      success: false,
      resultCode: code,
      errorMessage: message,
    };
  }
}

// ============================================
// Result Types
// ============================================

/**
 * Result of an attunement tick
 */
export interface AttunementTickResult {
  /** Current attunement state */
  state: AttunementState;
  /** Force power drained this tick */
  forceDrained: number;
  /** Meditation progress (0-1) */
  meditationProgress: number;
  /** Bonding progress (0-1) */
  bondingProgress: number;
  /** Total progress (0-1) */
  totalProgress: number;
  /** Whether attunement is complete */
  complete: boolean;
}

/**
 * Result of completing attunement
 */
export interface AttunedCrystalResult {
  /** Crystal object ID */
  crystalId: ObjectId;
  /** Crystal type */
  crystalType: CrystalType;
  /** Jedi the crystal is attuned to */
  attunedToId: ObjectId;
  /** Time of attunement */
  attunementTime: number;
  /** Final purity */
  purity: number;
  /** Purity level */
  purityLevel: CrystalPurity;
  /** Final stats */
  stats: CrystalStats;
  /** Crystal color (for blade crystals) */
  color: CrystalColor | null;
  /** Whether crystal is soulbound */
  soulbound: boolean;
}

// ============================================
// Factory Functions
// ============================================

/**
 * Singleton instance
 */
let attunementManagerInstance: CrystalAttunementManager | null = null;

/**
 * Get the crystal attunement manager singleton
 */
export function getCrystalAttunementManager(): CrystalAttunementManager {
  if (!attunementManagerInstance) {
    attunementManagerInstance = new CrystalAttunementManager();
  }
  return attunementManagerInstance;
}

/**
 * Create a new crystal attunement manager
 */
export function createCrystalAttunementManager(
  config: Partial<AttunementConfig> = {}
): CrystalAttunementManager {
  return new CrystalAttunementManager(config);
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetCrystalAttunementManager(): void {
  attunementManagerInstance = null;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get display name for purity level
 */
export function getPurityLevelName(purity: CrystalPurity): string {
  const names: Record<CrystalPurity, string> = {
    [CrystalPurity.IMPURE]: 'Impure',
    [CrystalPurity.STANDARD]: 'Standard',
    [CrystalPurity.PURE]: 'Pure',
    [CrystalPurity.EXCEPTIONAL]: 'Exceptional',
    [CrystalPurity.FLAWLESS]: 'Flawless',
  };
  return names[purity];
}

/**
 * Get display name for attunement state
 */
export function getAttunementStateName(state: AttunementState): string {
  const names: Record<AttunementState, string> = {
    [AttunementState.NOT_STARTED]: 'Not Started',
    [AttunementState.MEDITATING]: 'Meditating',
    [AttunementState.BONDING]: 'Bonding',
    [AttunementState.COMPLETE]: 'Complete',
    [AttunementState.FAILED]: 'Failed',
    [AttunementState.INTERRUPTED]: 'Interrupted',
  };
  return names[state];
}

/**
 * Get error message for result code
 */
export function getAttunementResultMessage(code: AttunementResultCode): string {
  const messages: Record<AttunementResultCode, string> = {
    [AttunementResultCode.SUCCESS]: 'Success',
    [AttunementResultCode.CRYSTAL_NOT_FOUND]: 'Crystal not found.',
    [AttunementResultCode.ALREADY_ATTUNED]: 'Crystal is already attuned.',
    [AttunementResultCode.NOT_JEDI]: 'You must be a Jedi to attune crystals.',
    [AttunementResultCode.INSUFFICIENT_FORCE]: 'Insufficient force power.',
    [AttunementResultCode.INSUFFICIENT_SKILL]: 'Insufficient skill level.',
    [AttunementResultCode.WRONG_ALIGNMENT]: 'Your alignment is incompatible with this crystal.',
    [AttunementResultCode.SESSION_IN_PROGRESS]: 'An attunement session is already in progress.',
    [AttunementResultCode.SESSION_NOT_FOUND]: 'Attunement session not found.',
    [AttunementResultCode.INTERRUPTED]: 'Attunement was interrupted.',
    [AttunementResultCode.SOULBOUND_TO_ANOTHER]: 'Crystal is soulbound to another Jedi.',
    [AttunementResultCode.FAILED]: 'Attunement failed.',
    [AttunementResultCode.INTERNAL_ERROR]: 'An internal error occurred.',
  };
  return messages[code];
}
