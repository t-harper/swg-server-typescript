/**
 * Incapacitation and Death System
 * Handles incapacitation, death timers, cloning, and XP loss
 */

import type { ObjectId } from '@swg/shared-types';
import type { CreatureObject } from '@swg/objects';
import { Posture, CreatureState, Locomotion } from '@swg/objects';

/**
 * Incapacitation configuration constants
 */
export const IncapConfig = {
  /** Time window for tracking incaps (milliseconds) - 10 minutes */
  INCAP_TRACKING_WINDOW: 10 * 60 * 1000,
  /** Number of incaps in window before death */
  INCAPS_BEFORE_DEATH: 3,
  /** Default incapacitation timer (milliseconds) - 30 seconds */
  DEFAULT_INCAP_TIMER: 30 * 1000,
  /** Minimum incapacitation timer */
  MIN_INCAP_TIMER: 10 * 1000,
  /** Maximum incapacitation timer */
  MAX_INCAP_TIMER: 60 * 1000,
  /** XP loss percentage on death */
  XP_LOSS_PERCENTAGE: 0.05,
  /** Maximum XP loss percentage */
  MAX_XP_LOSS_PERCENTAGE: 0.1,
  /** Clone sickness duration (milliseconds) - 10 minutes */
  CLONE_SICKNESS_DURATION: 10 * 60 * 1000,
  /** Clone sickness HAM reduction percentage */
  CLONE_SICKNESS_HAM_PENALTY: 0.25,
} as const;

/**
 * Death type enumeration
 */
export enum DeathType {
  /** Normal death from incapacitation */
  Normal = 'normal',
  /** Death from deathblow (PvP) */
  Deathblow = 'deathblow',
  /** Death from environment */
  Environmental = 'environmental',
  /** Death from falling */
  Fall = 'fall',
  /** Death from drowning */
  Drown = 'drown',
  /** Suicide/consent death */
  Consent = 'consent',
}

/**
 * Incapacitation record
 */
export interface IncapRecord {
  /** Timestamp of incapacitation */
  timestamp: number;
  /** ID of the attacker that caused incap */
  attackerId: ObjectId;
  /** Location where incap occurred */
  location: { x: number; y: number; z: number };
  /** Zone/planet where incap occurred */
  zone: string;
}

/**
 * Death record
 */
export interface DeathRecord {
  /** Timestamp of death */
  timestamp: number;
  /** Type of death */
  type: DeathType;
  /** ID of the killer (if applicable) */
  killerId: ObjectId;
  /** Location where death occurred */
  location: { x: number; y: number; z: number };
  /** Zone/planet where death occurred */
  zone: string;
  /** XP lost on death */
  xpLost: number;
  /** Whether clone sickness was applied */
  cloneSicknessApplied: boolean;
}

/**
 * Incapacitation state for a creature
 */
export interface IncapacitationState {
  /** Creature ID */
  creatureId: ObjectId;
  /** Whether creature is currently incapacitated */
  isIncapacitated: boolean;
  /** Whether creature is currently dead */
  isDead: boolean;
  /** Time when incapacitation started */
  incapStartTime: number;
  /** Duration of incapacitation timer */
  incapDuration: number;
  /** Recent incapacitation records */
  recentIncaps: IncapRecord[];
  /** Last death record (if any) */
  lastDeath: DeathRecord | null;
  /** Current clone sickness expiry time (0 if none) */
  cloneSicknessExpiry: number;
  /** Cloning facility location for respawn */
  cloneLocation: { x: number; y: number; z: number; zone: string } | null;
}

/**
 * Result of incapacitation check
 */
export interface IncapCheckResult {
  /** Whether creature should be incapacitated */
  shouldIncap: boolean;
  /** Whether creature should die immediately (too many incaps) */
  shouldDie: boolean;
  /** Number of recent incaps */
  recentIncapCount: number;
  /** Incap timer duration */
  timerDuration: number;
}

/**
 * Result of death processing
 */
export interface DeathResult {
  /** Death record */
  deathRecord: DeathRecord;
  /** XP lost */
  xpLost: number;
  /** Whether clone sickness was applied */
  cloneSickness: boolean;
  /** Recommended clone location */
  cloneLocation: { x: number; y: number; z: number; zone: string } | null;
}

/**
 * Create initial incapacitation state
 * @param creatureId - ID of the creature
 * @returns Initial incapacitation state
 */
export function createIncapState(creatureId: ObjectId): IncapacitationState {
  return {
    creatureId,
    isIncapacitated: false,
    isDead: false,
    incapStartTime: 0,
    incapDuration: IncapConfig.DEFAULT_INCAP_TIMER,
    recentIncaps: [],
    lastDeath: null,
    cloneSicknessExpiry: 0,
    cloneLocation: null,
  };
}

/**
 * Clean up old incapacitation records outside the tracking window
 * @param state - Current incapacitation state
 * @param currentTime - Current server time
 * @returns Updated state with cleaned records
 */
export function cleanupIncapRecords(
  state: IncapacitationState,
  currentTime: number
): IncapacitationState {
  const cutoffTime = currentTime - IncapConfig.INCAP_TRACKING_WINDOW;
  const recentIncaps = state.recentIncaps.filter((record) => record.timestamp >= cutoffTime);

  return {
    ...state,
    recentIncaps,
  };
}

/**
 * Check if a creature should be incapacitated or die
 * @param state - Current incapacitation state
 * @param currentTime - Current server time
 * @returns Check result
 */
export function checkIncapacitation(
  state: IncapacitationState,
  currentTime: number
): IncapCheckResult {
  // Clean up old records first
  const cleanedState = cleanupIncapRecords(state, currentTime);
  const recentIncapCount = cleanedState.recentIncaps.length;

  // Check if should die (too many incaps in window)
  const shouldDie = recentIncapCount >= IncapConfig.INCAPS_BEFORE_DEATH - 1;

  // Calculate incap timer (gets shorter with more recent incaps)
  const timerReduction = recentIncapCount * 5000; // 5 seconds less per recent incap
  const timerDuration = Math.max(
    IncapConfig.MIN_INCAP_TIMER,
    IncapConfig.DEFAULT_INCAP_TIMER - timerReduction
  );

  return {
    shouldIncap: true,
    shouldDie,
    recentIncapCount,
    timerDuration,
  };
}

/**
 * Apply incapacitation to a creature
 * @param creature - The creature to incapacitate
 * @param state - Current incapacitation state
 * @param attackerId - ID of the attacker
 * @param location - Location where incap occurred
 * @param zone - Zone/planet where incap occurred
 * @param currentTime - Current server time
 * @returns Updated incapacitation state
 */
export function applyIncapacitation(
  creature: CreatureObject,
  state: IncapacitationState,
  attackerId: ObjectId,
  location: { x: number; y: number; z: number },
  zone: string,
  currentTime: number
): IncapacitationState {
  // Check if should die instead
  const checkResult = checkIncapacitation(state, currentTime);

  if (checkResult.shouldDie) {
    // Will handle death separately
    return {
      ...state,
      isIncapacitated: false,
      isDead: true,
    };
  }

  // Apply incapacitation to creature
  creature.setPosture(Posture.INCAPACITATED);
  creature.setLocomotion(Locomotion.INCAPACITATED);

  // Record incapacitation
  const incapRecord: IncapRecord = {
    timestamp: currentTime,
    attackerId,
    location,
    zone,
  };

  return {
    ...state,
    isIncapacitated: true,
    isDead: false,
    incapStartTime: currentTime,
    incapDuration: checkResult.timerDuration,
    recentIncaps: [...state.recentIncaps, incapRecord],
  };
}

/**
 * Check if incapacitation timer has expired
 * @param state - Current incapacitation state
 * @param currentTime - Current server time
 * @returns Whether timer has expired
 */
export function isIncapTimerExpired(state: IncapacitationState, currentTime: number): boolean {
  if (!state.isIncapacitated) {
    return false;
  }

  return currentTime >= state.incapStartTime + state.incapDuration;
}

/**
 * Revive a creature from incapacitation
 * @param creature - The creature to revive
 * @param state - Current incapacitation state
 * @param healthPercent - Percentage of health to restore (0.0-1.0)
 * @returns Updated incapacitation state
 */
export function reviveFromIncap(
  creature: CreatureObject,
  state: IncapacitationState,
  healthPercent: number = 0.1
): IncapacitationState {
  if (!state.isIncapacitated) {
    return state;
  }

  // Restore some health
  const healthToRestore = Math.floor(creature.getEffectiveHealthMax() * healthPercent);
  creature.setHealthCurrent(healthToRestore);

  // Set posture back to upright
  creature.setPosture(Posture.UPRIGHT);
  creature.setLocomotion(Locomotion.STANDING);

  return {
    ...state,
    isIncapacitated: false,
    incapStartTime: 0,
  };
}

/**
 * Apply a deathblow to an incapacitated creature (PvP)
 * @param creature - The incapacitated creature
 * @param state - Current incapacitation state
 * @param killerId - ID of the attacker delivering the deathblow
 * @param location - Location of death
 * @param zone - Zone/planet of death
 * @param currentTime - Current server time
 * @returns Updated incapacitation state
 */
export function applyDeathblow(
  creature: CreatureObject,
  state: IncapacitationState,
  killerId: ObjectId,
  location: { x: number; y: number; z: number },
  zone: string,
  currentTime: number
): IncapacitationState {
  if (!state.isIncapacitated) {
    // Can only deathblow incapacitated targets
    return state;
  }

  // Kill the creature
  creature.kill();

  const deathRecord: DeathRecord = {
    timestamp: currentTime,
    type: DeathType.Deathblow,
    killerId,
    location,
    zone,
    xpLost: 0, // Will be calculated by processDeath
    cloneSicknessApplied: false,
  };

  return {
    ...state,
    isIncapacitated: false,
    isDead: true,
    lastDeath: deathRecord,
  };
}

/**
 * Calculate XP loss on death
 * @param totalXp - Total experience points
 * @param deathType - Type of death
 * @returns XP to lose
 */
export function calculateXpLoss(totalXp: number, deathType: DeathType): number {
  // No XP loss for consent/suicide deaths
  if (deathType === DeathType.Consent) {
    return 0;
  }

  // Standard XP loss
  let lossPercent = IncapConfig.XP_LOSS_PERCENTAGE;

  // Deathblow has higher XP loss
  if (deathType === DeathType.Deathblow) {
    lossPercent = IncapConfig.MAX_XP_LOSS_PERCENTAGE;
  }

  return Math.floor(totalXp * lossPercent);
}

/**
 * Process death of a creature
 * @param creature - The creature that died
 * @param state - Current incapacitation state
 * @param deathType - Type of death
 * @param killerId - ID of the killer (if applicable)
 * @param location - Location of death
 * @param zone - Zone/planet of death
 * @param totalXp - Total experience to calculate loss from
 * @param currentTime - Current server time
 * @returns Death result with updated state
 */
export function processDeath(
  creature: CreatureObject,
  state: IncapacitationState,
  deathType: DeathType,
  killerId: ObjectId,
  location: { x: number; y: number; z: number },
  zone: string,
  totalXp: number,
  currentTime: number
): { state: IncapacitationState; result: DeathResult } {
  // Kill the creature
  creature.kill();

  // Calculate XP loss
  const xpLost = calculateXpLoss(totalXp, deathType);

  // Determine if clone sickness should be applied
  const applyCloneSickness = deathType !== DeathType.Consent;

  const deathRecord: DeathRecord = {
    timestamp: currentTime,
    type: deathType,
    killerId,
    location,
    zone,
    xpLost,
    cloneSicknessApplied: applyCloneSickness,
  };

  const newState: IncapacitationState = {
    ...state,
    isIncapacitated: false,
    isDead: true,
    lastDeath: deathRecord,
    cloneSicknessExpiry: applyCloneSickness
      ? currentTime + IncapConfig.CLONE_SICKNESS_DURATION
      : state.cloneSicknessExpiry,
    recentIncaps: [], // Clear incap records on death
  };

  const result: DeathResult = {
    deathRecord,
    xpLost,
    cloneSickness: applyCloneSickness,
    cloneLocation: state.cloneLocation,
  };

  return { state: newState, result };
}

/**
 * Clone/respawn a dead creature
 * @param creature - The dead creature
 * @param state - Current incapacitation state
 * @param cloneLocation - Location to respawn at
 * @param currentTime - Current server time
 * @returns Updated incapacitation state
 */
export function cloneCreature(
  creature: CreatureObject,
  state: IncapacitationState,
  cloneLocation: { x: number; y: number; z: number },
  currentTime: number
): IncapacitationState {
  if (!state.isDead) {
    return state;
  }

  // Revive creature
  creature.revive();

  // Apply clone sickness if applicable
  if (currentTime < state.cloneSicknessExpiry) {
    // Reduce HAM by clone sickness penalty
    const healthPenalty = Math.floor(
      creature.health.max * IncapConfig.CLONE_SICKNESS_HAM_PENALTY
    );
    const actionPenalty = Math.floor(
      creature.action.max * IncapConfig.CLONE_SICKNESS_HAM_PENALTY
    );
    const mindPenalty = Math.floor(creature.mind.max * IncapConfig.CLONE_SICKNESS_HAM_PENALTY);

    creature.setHealthCurrent(creature.health.current - healthPenalty);
    creature.setActionCurrent(creature.action.current - actionPenalty);
    creature.setMindCurrent(creature.mind.current - mindPenalty);
  }

  // Update position (would be handled by movement system in real implementation)
  creature.setPosition(cloneLocation.x, cloneLocation.y, cloneLocation.z);

  return {
    ...state,
    isDead: false,
    incapStartTime: 0,
    incapDuration: IncapConfig.DEFAULT_INCAP_TIMER,
  };
}

/**
 * Set the clone location for a creature
 * @param state - Current incapacitation state
 * @param location - Clone facility location
 * @returns Updated incapacitation state
 */
export function setCloneLocation(
  state: IncapacitationState,
  location: { x: number; y: number; z: number; zone: string }
): IncapacitationState {
  return {
    ...state,
    cloneLocation: location,
  };
}

/**
 * Check if creature has clone sickness
 * @param state - Current incapacitation state
 * @param currentTime - Current server time
 * @returns Whether clone sickness is active
 */
export function hasCloneSickness(state: IncapacitationState, currentTime: number): boolean {
  return currentTime < state.cloneSicknessExpiry;
}

/**
 * Get remaining clone sickness duration
 * @param state - Current incapacitation state
 * @param currentTime - Current server time
 * @returns Remaining duration in milliseconds (0 if none)
 */
export function getCloneSicknessRemaining(
  state: IncapacitationState,
  currentTime: number
): number {
  if (!hasCloneSickness(state, currentTime)) {
    return 0;
  }
  return state.cloneSicknessExpiry - currentTime;
}

/**
 * Process incapacitation timer tick
 * @param creature - The incapacitated creature
 * @param state - Current incapacitation state
 * @param currentTime - Current server time
 * @returns Updated state (may transition to revived or dead)
 */
export function processIncapTick(
  creature: CreatureObject,
  state: IncapacitationState,
  currentTime: number
): IncapacitationState {
  if (!state.isIncapacitated) {
    return state;
  }

  // Check if timer expired
  if (isIncapTimerExpired(state, currentTime)) {
    // Auto-revive with minimal health
    return reviveFromIncap(creature, state, 0.1);
  }

  return state;
}

/**
 * Check if a creature can be death-blown (PvP)
 * @param creature - The target creature
 * @param state - Current incapacitation state
 * @returns Whether deathblow is allowed
 */
export function canBeDeathBlown(creature: CreatureObject, state: IncapacitationState): boolean {
  // Must be incapacitated
  if (!state.isIncapacitated) {
    return false;
  }

  // Must not already be dead
  if (state.isDead) {
    return false;
  }

  // Check PvP flags (would need to check if target is flagged for PvP)
  // This is simplified - real implementation would check PvP status
  return true;
}
