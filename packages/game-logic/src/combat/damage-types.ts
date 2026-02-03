/**
 * Damage Types and Results
 * Defines damage calculation results and hit location information
 */

import type { ObjectId } from '@swg/shared-types';
import { DamageType } from '@swg/objects';

// Re-export DamageType for convenience
export { DamageType } from '@swg/objects';

/**
 * Hit location enumeration
 * Determines where on the target the attack landed
 */
export enum HitLocation {
  /** Center body mass */
  Body = 0,
  /** Head (increased damage) */
  Head = 1,
  /** Left arm */
  LeftArm = 2,
  /** Right arm */
  RightArm = 3,
  /** Left leg */
  LeftLeg = 4,
  /** Right leg */
  RightLeg = 5,
}

/**
 * Hit location probabilities (default)
 * Maps hit locations to their base probability weights
 */
export const HIT_LOCATION_WEIGHTS: Record<HitLocation, number> = {
  [HitLocation.Body]: 50,
  [HitLocation.Head]: 5,
  [HitLocation.LeftArm]: 12,
  [HitLocation.RightArm]: 12,
  [HitLocation.LeftLeg]: 10,
  [HitLocation.RightLeg]: 10,
};

/**
 * Hit location damage modifiers
 * Multipliers applied to damage based on hit location
 */
export const HIT_LOCATION_MODIFIERS: Record<HitLocation, number> = {
  [HitLocation.Body]: 1.0,
  [HitLocation.Head]: 1.5,
  [HitLocation.LeftArm]: 0.8,
  [HitLocation.RightArm]: 0.8,
  [HitLocation.LeftLeg]: 0.85,
  [HitLocation.RightLeg]: 0.85,
};

/**
 * Result of applying damage to a target
 */
export interface DamageResult {
  /** The actual damage applied after all modifiers */
  actualDamage: number;
  /** Damage blocked by armor/abilities */
  blocked: number;
  /** Damage absorbed by shields/buffs */
  absorbed: number;
  /** Whether the target became incapacitated */
  targetIncapacitated: boolean;
  /** Whether the target died */
  targetKilled: boolean;
  /** Where the attack hit */
  hitLocation: HitLocation;
  /** The original raw damage before modifiers */
  rawDamage: number;
  /** The damage type that was applied */
  damageType: DamageType;
  /** Whether this was a critical hit */
  critical: boolean;
  /** Whether the attack was a glancing blow */
  glancing: boolean;
  /** ID of the attacker */
  attackerId: ObjectId;
  /** ID of the target */
  targetId: ObjectId;
}

/**
 * Result of applying healing to a target
 */
export interface HealResult {
  /** The actual healing applied */
  actualHealing: number;
  /** Healing that was over the max and wasted */
  overheal: number;
  /** Whether the target was revived from incapacitation */
  revived: boolean;
  /** ID of the healer */
  healerId: ObjectId;
  /** ID of the target */
  targetId: ObjectId;
}

/**
 * Calculate random hit location based on weights
 * @returns Random hit location
 */
export function calculateHitLocation(): HitLocation {
  const totalWeight = Object.values(HIT_LOCATION_WEIGHTS).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const [location, weight] of Object.entries(HIT_LOCATION_WEIGHTS)) {
    random -= weight;
    if (random <= 0) {
      return parseInt(location) as HitLocation;
    }
  }

  return HitLocation.Body;
}

/**
 * Get damage modifier for a hit location
 * @param location - The hit location
 * @returns Damage multiplier for that location
 */
export function getHitLocationModifier(location: HitLocation): number {
  return HIT_LOCATION_MODIFIERS[location] ?? 1.0;
}

/**
 * Get human-readable name for hit location
 * @param location - The hit location
 * @returns Display name
 */
export function getHitLocationName(location: HitLocation): string {
  switch (location) {
    case HitLocation.Body:
      return 'body';
    case HitLocation.Head:
      return 'head';
    case HitLocation.LeftArm:
      return 'left arm';
    case HitLocation.RightArm:
      return 'right arm';
    case HitLocation.LeftLeg:
      return 'left leg';
    case HitLocation.RightLeg:
      return 'right leg';
    default:
      return 'body';
  }
}

/**
 * Create an empty damage result
 */
export function createEmptyDamageResult(
  attackerId: ObjectId,
  targetId: ObjectId,
  damageType: DamageType = DamageType.Kinetic
): DamageResult {
  return {
    actualDamage: 0,
    blocked: 0,
    absorbed: 0,
    targetIncapacitated: false,
    targetKilled: false,
    hitLocation: HitLocation.Body,
    rawDamage: 0,
    damageType,
    critical: false,
    glancing: false,
    attackerId,
    targetId,
  };
}

/**
 * Create an empty heal result
 */
export function createEmptyHealResult(healerId: ObjectId, targetId: ObjectId): HealResult {
  return {
    actualHealing: 0,
    overheal: 0,
    revived: false,
    healerId,
    targetId,
  };
}
