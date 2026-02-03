/**
 * Regeneration System
 * HAM pool regeneration with posture, combat, and buff modifiers
 */

import type { CreatureObject, PostureType, HamAttributeType } from '@swg/objects';
import { Posture, HamAttribute, CreatureState } from '@swg/objects';

/**
 * Base regeneration rates per HAM attribute (points per second)
 */
export const BASE_REGEN_RATES: Record<HamAttributeType, number> = {
  [HamAttribute.HEALTH]: 10,
  [HamAttribute.STRENGTH]: 10,
  [HamAttribute.CONSTITUTION]: 10,
  [HamAttribute.ACTION]: 8,
  [HamAttribute.QUICKNESS]: 8,
  [HamAttribute.STAMINA]: 8,
  [HamAttribute.MIND]: 6,
  [HamAttribute.FOCUS]: 6,
  [HamAttribute.WILLPOWER]: 6,
};

/**
 * Posture modifiers for regeneration
 * Higher values = faster regeneration
 */
export const POSTURE_REGEN_MODIFIERS: Record<PostureType, number> = {
  [Posture.UPRIGHT]: 1.0,
  [Posture.CROUCHED]: 1.2,
  [Posture.PRONE]: 1.5,
  [Posture.SNEAKING]: 0.8,
  [Posture.BLOCKING]: 0.5,
  [Posture.CLIMBING]: 0.5,
  [Posture.FLYING]: 0.7,
  [Posture.LYING_DOWN]: 2.0, // Resting
  [Posture.SITTING]: 2.5, // Sitting is best for regen
  [Posture.SKILL_ANIMATING]: 0.5,
  [Posture.DRIVING_VEHICLE]: 1.0,
  [Posture.RIDING_CREATURE]: 1.0,
  [Posture.KNOCKED_DOWN]: 0.5,
  [Posture.INCAPACITATED]: 0.0, // No regen when incapped
  [Posture.DEAD]: 0.0, // No regen when dead
};

/**
 * Combat state regeneration modifier
 * In combat = significantly reduced regeneration
 */
export const COMBAT_REGEN_MODIFIER = 0.25;

/**
 * Out of combat regeneration modifier
 */
export const OUT_OF_COMBAT_REGEN_MODIFIER = 1.0;

/**
 * Wound penalty per wound point (percentage reduction)
 * Wounds reduce regeneration effectiveness
 */
export const WOUND_REGEN_PENALTY_PER_POINT = 0.001;

/**
 * Maximum wound penalty (cap at 90% reduction)
 */
export const MAX_WOUND_REGEN_PENALTY = 0.9;

/**
 * Battle fatigue penalty per point (percentage reduction)
 */
export const BATTLE_FATIGUE_REGEN_PENALTY_PER_POINT = 0.001;

/**
 * Maximum battle fatigue penalty (cap at 50% reduction)
 */
export const MAX_BATTLE_FATIGUE_REGEN_PENALTY = 0.5;

/**
 * Entertainer buff bonus to regeneration (percentage)
 */
export const ENTERTAINER_REGEN_BONUS = 0.25;

/**
 * Campfire bonus to regeneration (percentage)
 */
export const CAMPFIRE_REGEN_BONUS = 0.5;

/**
 * Regeneration calculation result
 */
export interface RegenCalculation {
  /** Base regen rate before modifiers */
  baseRate: number;
  /** Final regen rate after all modifiers */
  finalRate: number;
  /** Posture modifier applied */
  postureModifier: number;
  /** Combat modifier applied */
  combatModifier: number;
  /** Wound penalty applied */
  woundPenalty: number;
  /** Battle fatigue penalty applied */
  fatiguePenalty: number;
  /** Total buff bonus applied */
  buffBonus: number;
}

/**
 * Calculate the regeneration modifier based on wounds
 * @param totalWounds - Sum of wounds for the relevant HAM attributes
 * @returns Regeneration multiplier (0.1 to 1.0)
 */
export function calculateWoundPenalty(totalWounds: number): number {
  const penalty = Math.min(totalWounds * WOUND_REGEN_PENALTY_PER_POINT, MAX_WOUND_REGEN_PENALTY);
  return 1.0 - penalty;
}

/**
 * Calculate the regeneration modifier based on battle fatigue
 * @param battleFatigue - Current battle fatigue value
 * @returns Regeneration multiplier (0.5 to 1.0)
 */
export function calculateBattleFatiguePenalty(battleFatigue: number): number {
  const penalty = Math.min(
    battleFatigue * BATTLE_FATIGUE_REGEN_PENALTY_PER_POINT,
    MAX_BATTLE_FATIGUE_REGEN_PENALTY
  );
  return 1.0 - penalty;
}

/**
 * Calculate effective regeneration rate for a HAM attribute
 * @param creature - The creature to calculate for
 * @param attribute - Which HAM attribute
 * @param additionalBuffBonus - Additional buff bonuses (entertainer, campfire, etc.)
 * @returns Detailed regeneration calculation
 */
export function calculateRegenRate(
  creature: CreatureObject,
  attribute: HamAttributeType,
  additionalBuffBonus: number = 0
): RegenCalculation {
  // Base rate for this attribute
  const baseRate = BASE_REGEN_RATES[attribute] ?? 10;

  // Posture modifier
  const postureModifier = POSTURE_REGEN_MODIFIERS[creature.posture] ?? 1.0;

  // Combat modifier
  const combatModifier = creature.hasState(CreatureState.COMBAT)
    ? COMBAT_REGEN_MODIFIER
    : OUT_OF_COMBAT_REGEN_MODIFIER;

  // Calculate wound penalty based on attribute group
  let totalWounds = 0;
  if (attribute <= HamAttribute.CONSTITUTION) {
    // Health group
    totalWounds =
      (creature.hamWounds[HamAttribute.HEALTH] ?? 0) +
      (creature.hamWounds[HamAttribute.STRENGTH] ?? 0) +
      (creature.hamWounds[HamAttribute.CONSTITUTION] ?? 0);
  } else if (attribute <= HamAttribute.STAMINA) {
    // Action group
    totalWounds =
      (creature.hamWounds[HamAttribute.ACTION] ?? 0) +
      (creature.hamWounds[HamAttribute.QUICKNESS] ?? 0) +
      (creature.hamWounds[HamAttribute.STAMINA] ?? 0);
  } else {
    // Mind group
    totalWounds =
      (creature.hamWounds[HamAttribute.MIND] ?? 0) +
      (creature.hamWounds[HamAttribute.FOCUS] ?? 0) +
      (creature.hamWounds[HamAttribute.WILLPOWER] ?? 0);
  }
  const woundPenalty = calculateWoundPenalty(totalWounds);

  // Battle fatigue penalty
  const fatiguePenalty = calculateBattleFatiguePenalty(creature.battleFatigue);

  // Total buff bonus
  const buffBonus = 1.0 + additionalBuffBonus;

  // Calculate final rate
  const finalRate = baseRate * postureModifier * combatModifier * woundPenalty * fatiguePenalty * buffBonus;

  return {
    baseRate,
    finalRate: Math.max(0, finalRate),
    postureModifier,
    combatModifier,
    woundPenalty,
    fatiguePenalty,
    buffBonus,
  };
}

/**
 * Regeneration state for a creature
 */
export interface RegenerationState {
  /** Creature being tracked */
  creatureId: bigint;
  /** Whether regeneration is active */
  active: boolean;
  /** Time of last regeneration tick */
  lastTickTime: number;
  /** Accumulated partial health regen */
  healthAccumulator: number;
  /** Accumulated partial action regen */
  actionAccumulator: number;
  /** Accumulated partial mind regen */
  mindAccumulator: number;
  /** Additional buff bonus from external sources */
  buffBonus: number;
  /** Whether creature is near an entertainer */
  entertainerBonus: boolean;
  /** Whether creature is near a campfire */
  campfireBonus: boolean;
}

/**
 * Create initial regeneration state for a creature
 * @param creatureId - ID of the creature
 * @returns Initial regeneration state
 */
export function createRegenState(creatureId: bigint): RegenerationState {
  return {
    creatureId,
    active: true,
    lastTickTime: Date.now(),
    healthAccumulator: 0,
    actionAccumulator: 0,
    mindAccumulator: 0,
    buffBonus: 0,
    entertainerBonus: false,
    campfireBonus: false,
  };
}

/**
 * Process regeneration for a creature
 * @param creature - The creature to regenerate
 * @param state - Current regeneration state
 * @param currentTime - Current server time
 * @returns Updated regeneration state
 */
export function processRegeneration(
  creature: CreatureObject,
  state: RegenerationState,
  currentTime: number
): RegenerationState {
  if (!state.active) {
    return state;
  }

  // Skip regeneration if incapacitated or dead
  if (creature.isIncapacitated() || creature.isDead()) {
    return {
      ...state,
      lastTickTime: currentTime,
    };
  }

  // Calculate delta time
  const deltaMs = currentTime - state.lastTickTime;
  const deltaSeconds = deltaMs / 1000;

  if (deltaSeconds <= 0) {
    return state;
  }

  // Calculate total buff bonus
  let totalBuffBonus = state.buffBonus;
  if (state.entertainerBonus) {
    totalBuffBonus += ENTERTAINER_REGEN_BONUS;
  }
  if (state.campfireBonus) {
    totalBuffBonus += CAMPFIRE_REGEN_BONUS;
  }

  // Calculate regen rates for each pool
  const healthRegen = calculateRegenRate(creature, HamAttribute.HEALTH, totalBuffBonus);
  const actionRegen = calculateRegenRate(creature, HamAttribute.ACTION, totalBuffBonus);
  const mindRegen = calculateRegenRate(creature, HamAttribute.MIND, totalBuffBonus);

  // Calculate regeneration amounts with accumulators for fractional regen
  let healthAmount = state.healthAccumulator + healthRegen.finalRate * deltaSeconds;
  let actionAmount = state.actionAccumulator + actionRegen.finalRate * deltaSeconds;
  let mindAmount = state.mindAccumulator + mindRegen.finalRate * deltaSeconds;

  // Apply whole number regeneration
  const healthWhole = Math.floor(healthAmount);
  const actionWhole = Math.floor(actionAmount);
  const mindWhole = Math.floor(mindAmount);

  // Heal pools
  if (healthWhole > 0 && creature.health.current < creature.getEffectiveHealthMax()) {
    creature.healHealth(healthWhole);
  }
  if (actionWhole > 0 && creature.action.current < creature.getEffectiveActionMax()) {
    creature.healAction(actionWhole);
  }
  if (mindWhole > 0 && creature.mind.current < creature.getEffectiveMindMax()) {
    creature.healMind(mindWhole);
  }

  // Update accumulators with fractional remainder
  return {
    ...state,
    lastTickTime: currentTime,
    healthAccumulator: healthAmount - healthWhole,
    actionAccumulator: actionAmount - actionWhole,
    mindAccumulator: mindAmount - mindWhole,
  };
}

/**
 * Update regeneration bonus sources
 * @param state - Current regeneration state
 * @param options - Bonus options to update
 * @returns Updated regeneration state
 */
export function updateRegenBonuses(
  state: RegenerationState,
  options: {
    buffBonus?: number;
    entertainerBonus?: boolean;
    campfireBonus?: boolean;
  }
): RegenerationState {
  return {
    ...state,
    buffBonus: options.buffBonus ?? state.buffBonus,
    entertainerBonus: options.entertainerBonus ?? state.entertainerBonus,
    campfireBonus: options.campfireBonus ?? state.campfireBonus,
  };
}

/**
 * Pause regeneration for a creature
 * @param state - Current regeneration state
 * @returns Updated regeneration state
 */
export function pauseRegeneration(state: RegenerationState): RegenerationState {
  return {
    ...state,
    active: false,
  };
}

/**
 * Resume regeneration for a creature
 * @param state - Current regeneration state
 * @param currentTime - Current server time
 * @returns Updated regeneration state
 */
export function resumeRegeneration(
  state: RegenerationState,
  currentTime: number
): RegenerationState {
  return {
    ...state,
    active: true,
    lastTickTime: currentTime,
  };
}

/**
 * Get estimated time to full regeneration
 * @param creature - The creature to check
 * @param buffBonus - Total buff bonus
 * @returns Time in seconds to regenerate all pools
 */
export function getTimeToFullRegen(creature: CreatureObject, buffBonus: number = 0): number {
  const healthMissing = creature.getEffectiveHealthMax() - creature.health.current;
  const actionMissing = creature.getEffectiveActionMax() - creature.action.current;
  const mindMissing = creature.getEffectiveMindMax() - creature.mind.current;

  const healthRate = calculateRegenRate(creature, HamAttribute.HEALTH, buffBonus).finalRate;
  const actionRate = calculateRegenRate(creature, HamAttribute.ACTION, buffBonus).finalRate;
  const mindRate = calculateRegenRate(creature, HamAttribute.MIND, buffBonus).finalRate;

  const healthTime = healthRate > 0 ? healthMissing / healthRate : Infinity;
  const actionTime = actionRate > 0 ? actionMissing / actionRate : Infinity;
  const mindTime = mindRate > 0 ? mindMissing / mindRate : Infinity;

  return Math.max(healthTime, actionTime, mindTime);
}
