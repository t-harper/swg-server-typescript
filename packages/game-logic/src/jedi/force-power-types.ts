/**
 * Force Power Types
 * Type definitions for the Jedi Force Power system
 *
 * Defines categories, targets, states, and effect types for all force powers
 * used by Jedi characters in Star Wars Galaxies.
 */

import type { ObjectId } from '@swg/shared-types';

// ============================================
// Enums
// ============================================

/**
 * Force power categories
 * Used for skill tree organization and power classification
 */
export enum ForcePowerCategory {
  /** Healing and restoration powers */
  HEALING = 'HEALING',
  /** Self-buff and enhancement powers */
  ENHANCEMENT = 'ENHANCEMENT',
  /** Offensive powers (damage, control) */
  POWERS = 'POWERS',
  /** Defensive and protective powers */
  DEFENSE = 'DEFENSE',
  /** Dark side offensive powers */
  DARK = 'DARK',
}

/**
 * Force power targeting types
 */
export enum ForcePowerTarget {
  /** Affects only the caster */
  SELF = 'SELF',
  /** Affects a single friendly target */
  SINGLE_FRIENDLY = 'SINGLE_FRIENDLY',
  /** Affects a single enemy target */
  SINGLE_ENEMY = 'SINGLE_ENEMY',
  /** Area of effect on friendly targets */
  AOE_FRIENDLY = 'AOE_FRIENDLY',
  /** Area of effect on enemy targets */
  AOE_ENEMY = 'AOE_ENEMY',
}

/**
 * Force-related states that can affect creatures
 */
export enum ForceState {
  /** No special force state */
  NORMAL = 'NORMAL',
  /** Currently channeling a force power */
  CHANNELING = 'CHANNELING',
  /** Being choked by Force Choke */
  FORCE_CHOKE_VICTIM = 'FORCE_CHOKE_VICTIM',
  /** Under the effects of Mind Trick */
  MIND_TRICKED = 'MIND_TRICKED',
  /** Being drained by Force Drain */
  FORCE_DRAINED = 'FORCE_DRAINED',
  /** Fleeing due to Force Fear */
  FORCE_FEARED = 'FORCE_FEARED',
  /** Knocked back by Force Push */
  FORCE_PUSHED = 'FORCE_PUSHED',
  /** Pulled towards caster by Force Pull */
  FORCE_PULLED = 'FORCE_PULLED',
  /** Affected by Force Lightning stun */
  FORCE_SHOCKED = 'FORCE_SHOCKED',
  /** Under Force Speed buff */
  FORCE_SPEED = 'FORCE_SPEED',
  /** Under Force Rage buff */
  FORCE_RAGE = 'FORCE_RAGE',
  /** Protected by Force Shield */
  FORCE_SHIELDED = 'FORCE_SHIELDED',
  /** Under Force Enlightenment buff */
  FORCE_ENLIGHTENED = 'FORCE_ENLIGHTENED',
}

/**
 * Types of effects that force powers can apply
 */
export enum ForceEffectType {
  /** Direct damage to target */
  DAMAGE = 'DAMAGE',
  /** Direct healing to target */
  HEAL = 'HEAL',
  /** Damage over time effect */
  DAMAGE_OVER_TIME = 'DAMAGE_OVER_TIME',
  /** Healing over time effect */
  HEAL_OVER_TIME = 'HEAL_OVER_TIME',
  /** Increase a stat */
  STAT_BUFF = 'STAT_BUFF',
  /** Decrease a stat */
  STAT_DEBUFF = 'STAT_DEBUFF',
  /** Apply a force state */
  STATE_APPLY = 'STATE_APPLY',
  /** Remove a force state */
  STATE_REMOVE = 'STATE_REMOVE',
  /** Absorb incoming damage */
  DAMAGE_ABSORPTION = 'DAMAGE_ABSORPTION',
  /** Transfer health from target to caster */
  HEALTH_DRAIN = 'HEALTH_DRAIN',
  /** Apply knockback effect */
  KNOCKBACK = 'KNOCKBACK',
  /** Pull target towards caster */
  PULL = 'PULL',
  /** Cause target to flee */
  FEAR = 'FEAR',
  /** Cause target confusion */
  CONFUSION = 'CONFUSION',
  /** Chain to additional targets */
  CHAIN = 'CHAIN',
}

// ============================================
// Interfaces
// ============================================

/**
 * Force effect definition
 * Describes a single effect that a force power can apply
 */
export interface ForceEffect {
  /** Type of effect */
  type: ForceEffectType;
  /** Base magnitude of the effect (damage, heal amount, stat modifier, etc.) */
  magnitude: number;
  /** Duration in milliseconds (0 for instant effects) */
  duration: number;
  /** Tick interval in milliseconds for over-time effects */
  tickInterval: number;
  /** Force state to apply (for STATE_APPLY type) */
  stateToApply?: ForceState;
  /** Stat to modify (for STAT_BUFF/DEBUFF types) */
  statModified?: string;
  /** Number of targets to chain to (for CHAIN type) */
  chainTargets?: number;
  /** Damage reduction per chain (0-1) */
  chainFalloff?: number;
  /** Knockback/pull distance in meters */
  distance?: number;
}

/**
 * Force power definition
 * Complete definition of a force power ability
 */
export interface ForcePower {
  /** Unique identifier for the power */
  id: string;
  /** Display name of the power */
  name: string;
  /** Category of the power */
  category: ForcePowerCategory;
  /** Force pool cost to use */
  forceCost: number;
  /** Cooldown in milliseconds */
  cooldown: number;
  /** Maximum range in meters (0 for self-only) */
  range: number;
  /** Targeting type */
  targetType: ForcePowerTarget;
  /** Effects applied by this power */
  effects: ForceEffect[];
  /** Whether this power is channeled */
  isChanneled: boolean;
  /** Channel duration in milliseconds (if channeled) */
  channelDuration: number;
  /** Whether the power can be interrupted */
  interruptible: boolean;
  /** Animation CRC to play */
  animationCrc: number;
  /** Command CRC for network messages */
  commandCrc: number;
  /** Minimum skill level required */
  requiredSkillLevel: number;
  /** Whether this is a dark side power */
  isDarkSide: boolean;
  /** Area of effect radius in meters (for AOE powers) */
  aoeRadius: number;
  /** Maximum number of targets (for AOE powers) */
  maxTargets: number;
  /** Description text */
  description: string;
}

/**
 * Force pool state
 * Tracks a Jedi's force points
 */
export interface ForcePool {
  /** Current force points */
  current: number;
  /** Maximum force points */
  max: number;
  /** Force regeneration rate per second */
  regenRate: number;
  /** Delay before regeneration starts after using a power (in ms) */
  regenDelayAfterUse: number;
  /** Timestamp of last force power use */
  lastUseTime: number;
  /** Whether regeneration is currently paused */
  regenPaused: boolean;
}

/**
 * Active force effect on a creature
 * Tracks an ongoing effect applied by a force power
 */
export interface ActiveForceEffect {
  /** Unique ID for this effect instance */
  effectId: bigint;
  /** The force power that created this effect */
  powerId: string;
  /** The effect definition */
  effect: ForceEffect;
  /** Object ID of the caster */
  casterId: ObjectId;
  /** Object ID of the target */
  targetId: ObjectId;
  /** When the effect was applied */
  appliedAt: number;
  /** When the effect expires */
  expiresAt: number;
  /** Time of last tick (for over-time effects) */
  lastTickAt: number;
  /** Remaining ticks (for over-time effects) */
  remainingTicks: number;
  /** Total damage/healing done by this effect */
  totalApplied: number;
  /** Remaining absorption amount (for shields) */
  remainingAbsorption: number;
}

/**
 * Channel state
 * Tracks an active channeled power
 */
export interface ChannelState {
  /** The force power being channeled */
  power: ForcePower;
  /** Object ID of the caster */
  casterId: ObjectId;
  /** Object ID of the target (if applicable) */
  targetId: ObjectId | null;
  /** When channeling started */
  startedAt: number;
  /** When channeling will end */
  endsAt: number;
  /** Time of last tick */
  lastTickAt: number;
  /** Whether the channel has been interrupted */
  interrupted: boolean;
}

/**
 * Force power execution result
 */
export interface ForcePowerResult {
  /** Whether the power was successfully executed */
  success: boolean;
  /** Error message if failed */
  errorMessage: string;
  /** Force cost that was paid */
  forceCostPaid: number;
  /** Direct damage dealt */
  damageDealt: number;
  /** Direct healing done */
  healingDone: number;
  /** Effects that were applied */
  effectsApplied: ActiveForceEffect[];
  /** Whether a channel was started */
  channelStarted: boolean;
  /** Targets that were affected (for AOE) */
  targetsAffected: ObjectId[];
  /** Animation CRC to play */
  animationCrc: number;
}

/**
 * Force resist check parameters
 */
export interface ForceResistParams {
  /** Caster's force power skill */
  casterForcePower: number;
  /** Target's willpower */
  targetWillpower: number;
  /** Target's force defense skill */
  targetForceDefense: number;
  /** Base resist chance modifier */
  baseResistChance: number;
  /** Whether the power is a dark side power */
  isDarkSide: boolean;
}

/**
 * Force power configuration
 */
export interface ForcePowerConfig {
  /** Base force regeneration rate per second */
  baseForceRegen: number;
  /** Delay before force regen starts after using a power */
  forceRegenDelay: number;
  /** Maximum force pool multiplier from skills */
  maxForcePoolMultiplier: number;
  /** Global cooldown for force powers in ms */
  forceGlobalCooldown: number;
  /** Base resist chance for force powers (0-1) */
  baseResistChance: number;
  /** Willpower to resist chance conversion rate */
  willpowerResistRate: number;
  /** Maximum resist chance (0-1) */
  maxResistChance: number;
  /** Whether to enable detailed logging */
  enableLogging: boolean;
}

/**
 * Default force power configuration
 */
export const DEFAULT_FORCE_POWER_CONFIG: ForcePowerConfig = {
  baseForceRegen: 10,
  forceRegenDelay: 3000,
  maxForcePoolMultiplier: 3.0,
  forceGlobalCooldown: 1500,
  baseResistChance: 0.1,
  willpowerResistRate: 0.001,
  maxResistChance: 0.75,
  enableLogging: false,
};

// ============================================
// Type Guards
// ============================================

/**
 * Check if a force effect type is damage-related
 */
export function isDamageEffect(type: ForceEffectType): boolean {
  return type === ForceEffectType.DAMAGE || type === ForceEffectType.DAMAGE_OVER_TIME;
}

/**
 * Check if a force effect type is healing-related
 */
export function isHealingEffect(type: ForceEffectType): boolean {
  return type === ForceEffectType.HEAL || type === ForceEffectType.HEAL_OVER_TIME;
}

/**
 * Check if a force effect type is an over-time effect
 */
export function isOverTimeEffect(type: ForceEffectType): boolean {
  return (
    type === ForceEffectType.DAMAGE_OVER_TIME || type === ForceEffectType.HEAL_OVER_TIME
  );
}

/**
 * Check if a force effect type modifies stats
 */
export function isStatModifierEffect(type: ForceEffectType): boolean {
  return type === ForceEffectType.STAT_BUFF || type === ForceEffectType.STAT_DEBUFF;
}

/**
 * Check if a force power targets enemies
 */
export function isOffensivePower(power: ForcePower): boolean {
  return (
    power.targetType === ForcePowerTarget.SINGLE_ENEMY ||
    power.targetType === ForcePowerTarget.AOE_ENEMY
  );
}

/**
 * Check if a force power targets friendlies
 */
export function isFriendlyPower(power: ForcePower): boolean {
  return (
    power.targetType === ForcePowerTarget.SELF ||
    power.targetType === ForcePowerTarget.SINGLE_FRIENDLY ||
    power.targetType === ForcePowerTarget.AOE_FRIENDLY
  );
}

/**
 * Check if a force state prevents actions
 */
export function isIncapacitatingState(state: ForceState): boolean {
  return (
    state === ForceState.FORCE_CHOKE_VICTIM ||
    state === ForceState.FORCE_FEARED ||
    state === ForceState.MIND_TRICKED
  );
}
