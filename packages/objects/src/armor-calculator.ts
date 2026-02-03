/**
 * Armor Protection Calculator
 * Calculates damage reduction from equipped armor pieces
 *
 * The SWG armor system considers:
 * - Hit location (which body part was hit)
 * - Armor pieces covering that location
 * - Damage type vs armor effectiveness
 * - Armor piercing vs armor rating
 * - Armor condition
 */

import type { ArmorObject } from './armor-object.js';
import { DamageType } from './tangible-object.js';
import {
  ArmorRating,
  ArmorLayer,
  HitLocation,
  ArmorPiercing,
  HIT_LOCATION_TO_ARMOR_LAYERS,
  getArmorPiercingEffectiveness,
  type HitLocationType,
  type ArmorPiercingType,
  type ArmorLayerType,
} from './armor-rating.js';

// Re-export for convenience
export { HitLocation, ArmorPiercing } from './armor-rating.js';
export type { HitLocationType, ArmorPiercingType } from './armor-rating.js';

/**
 * Result of a protection calculation
 */
export interface ProtectionResult {
  /** Damage reduction as a percentage (0-1) */
  damageReduction: number;
  /** Flat amount of damage blocked */
  blocked: number;
  /** Whether a vulnerability (gap in armor) was hit */
  vulnerabilityHit: boolean;
  /** The armor piece(s) that provided protection */
  protectingArmor: ArmorObject[];
  /** Total effectiveness used in calculation */
  effectivenessUsed: number;
  /** Armor piercing penalty applied */
  armorPiercingPenalty: number;
}

/**
 * Configuration for protection calculation
 */
export interface ProtectionCalculatorConfig {
  /** Maximum total damage reduction allowed (default: 0.90 = 90%) */
  maxDamageReduction: number;
  /** Condition threshold below which armor effectiveness is reduced */
  conditionPenaltyThreshold: number;
  /** Minimum condition ratio for armor to provide any protection */
  minConditionRatio: number;
  /** Whether to allow stacking of multiple armor pieces */
  allowArmorStacking: boolean;
  /** Maximum number of armor pieces that can stack */
  maxStackingPieces: number;
}

/**
 * Default calculator configuration
 */
export const DEFAULT_CALCULATOR_CONFIG: ProtectionCalculatorConfig = {
  maxDamageReduction: 0.90,
  conditionPenaltyThreshold: 0.5,
  minConditionRatio: 0.1,
  allowArmorStacking: true,
  maxStackingPieces: 3,
};

/**
 * Calculate protection provided by equipped armor
 *
 * @param armor - Array of equipped armor pieces
 * @param damageType - Type of damage being dealt
 * @param armorPiercing - Armor piercing level of the attack
 * @param hitLocation - Location on body that was hit
 * @param config - Optional configuration overrides
 * @returns Protection result with damage reduction and details
 */
export function calculateProtection(
  armor: ArmorObject[],
  damageType: DamageType,
  armorPiercing: ArmorPiercingType,
  hitLocation: HitLocationType,
  config: Partial<ProtectionCalculatorConfig> = {}
): ProtectionResult {
  const fullConfig: ProtectionCalculatorConfig = {
    ...DEFAULT_CALCULATOR_CONFIG,
    ...config,
  };

  // Find armor pieces that protect this hit location
  const protectingLayers = HIT_LOCATION_TO_ARMOR_LAYERS[hitLocation] ?? [];
  const protectingArmor = findProtectingArmor(armor, protectingLayers);

  // If no armor protects this location, it's a vulnerability hit
  if (protectingArmor.length === 0) {
    return {
      damageReduction: 0,
      blocked: 0,
      vulnerabilityHit: true,
      protectingArmor: [],
      effectivenessUsed: 0,
      armorPiercingPenalty: 0,
    };
  }

  // Calculate combined protection
  let totalDamageReduction = 0;
  let totalBlocked = 0;
  let totalEffectiveness = 0;
  let totalArmorPiercingPenalty = 0;

  // Limit stacking if configured
  const armorToUse = fullConfig.allowArmorStacking
    ? protectingArmor.slice(0, fullConfig.maxStackingPieces)
    : [protectingArmor[0]!];

  for (const piece of armorToUse) {
    // Get base effectiveness for this damage type
    let effectiveness = piece.getEffectiveness(damageType);

    // Apply armor piercing penalty
    const apPenalty = 1 - getArmorPiercingEffectiveness(piece.armorRating, armorPiercing);
    effectiveness *= 1 - apPenalty;
    totalArmorPiercingPenalty += apPenalty;

    // Apply condition penalty
    const conditionRatio = piece.getConditionPercent();
    if (conditionRatio < fullConfig.minConditionRatio) {
      // Armor is too damaged to provide protection
      continue;
    }
    if (conditionRatio < fullConfig.conditionPenaltyThreshold) {
      // Reduce effectiveness based on condition
      const conditionPenalty = conditionRatio / fullConfig.conditionPenaltyThreshold;
      effectiveness *= conditionPenalty;
    }

    totalEffectiveness += effectiveness;

    // Calculate damage reduction contribution
    // Each piece contributes proportionally, with diminishing returns
    const pieceReduction = effectiveness * (1 - totalDamageReduction * 0.5);
    totalDamageReduction += pieceReduction;

    // Calculate flat blocked amount based on armor rating
    const baseBlocked = getBaseBlockedAmount(piece.armorRating);
    totalBlocked += baseBlocked * effectiveness;
  }

  // Cap total damage reduction
  totalDamageReduction = Math.min(totalDamageReduction, fullConfig.maxDamageReduction);

  return {
    damageReduction: totalDamageReduction,
    blocked: Math.floor(totalBlocked),
    vulnerabilityHit: false,
    protectingArmor: armorToUse,
    effectivenessUsed: totalEffectiveness,
    armorPiercingPenalty: totalArmorPiercingPenalty / armorToUse.length,
  };
}

/**
 * Find armor pieces that protect a set of armor layers
 */
function findProtectingArmor(
  armor: ArmorObject[],
  layers: ArmorLayer[]
): ArmorObject[] {
  return armor.filter((piece) => layers.includes(piece.armorLayer));
}

/**
 * Get base blocked amount for an armor rating
 */
function getBaseBlockedAmount(rating: ArmorRating): number {
  switch (rating) {
    case ArmorRating.None:
      return 0;
    case ArmorRating.Light:
      return 50;
    case ArmorRating.Medium:
      return 100;
    case ArmorRating.Heavy:
      return 200;
    default:
      return 0;
  }
}

/**
 * Calculate total encumbrance from all equipped armor
 *
 * @param armor - Array of equipped armor pieces
 * @returns Total encumbrance values for health, action, and mind
 */
export function calculateTotalEncumbrance(armor: ArmorObject[]): {
  health: number;
  action: number;
  mind: number;
  total: number;
} {
  let health = 0;
  let action = 0;
  let mind = 0;

  for (const piece of armor) {
    health += piece.healthEncumbrance;
    action += piece.actionEncumbrance;
    mind += piece.mindEncumbrance;
  }

  return {
    health,
    action,
    mind,
    total: health + action + mind,
  };
}

/**
 * Check if a hit location is protected by any armor
 *
 * @param armor - Array of equipped armor pieces
 * @param hitLocation - Location to check
 * @returns true if the location is protected
 */
export function isLocationProtected(
  armor: ArmorObject[],
  hitLocation: HitLocationType
): boolean {
  const protectingLayers = HIT_LOCATION_TO_ARMOR_LAYERS[hitLocation] ?? [];
  return armor.some((piece) => protectingLayers.includes(piece.armorLayer));
}

/**
 * Get all unprotected hit locations
 *
 * @param armor - Array of equipped armor pieces
 * @returns Array of unprotected hit locations
 */
export function getUnprotectedLocations(armor: ArmorObject[]): HitLocationType[] {
  const unprotected: HitLocationType[] = [];

  for (const location of Object.values(HitLocation) as HitLocationType[]) {
    if (typeof location === 'number' && !isLocationProtected(armor, location)) {
      unprotected.push(location);
    }
  }

  return unprotected;
}

/**
 * Calculate overall armor coverage percentage
 *
 * @param armor - Array of equipped armor pieces
 * @returns Coverage percentage (0-1)
 */
export function calculateArmorCoverage(armor: ArmorObject[]): number {
  const totalLocations = Object.keys(HitLocation).length / 2; // Enum has both keys and values
  const protectedCount = totalLocations - getUnprotectedLocations(armor).length;
  return protectedCount / totalLocations;
}

/**
 * Get the best armor effectiveness against a specific damage type
 *
 * @param armor - Array of equipped armor pieces
 * @param damageType - Damage type to check
 * @returns The highest effectiveness value
 */
export function getBestEffectiveness(
  armor: ArmorObject[],
  damageType: DamageType
): number {
  let best = 0;

  for (const piece of armor) {
    const effectiveness = piece.getEffectiveness(damageType);
    if (effectiveness > best) {
      best = effectiveness;
    }
  }

  return best;
}

/**
 * Get the average armor effectiveness against a specific damage type
 *
 * @param armor - Array of equipped armor pieces
 * @param damageType - Damage type to check
 * @returns The average effectiveness value
 */
export function getAverageEffectiveness(
  armor: ArmorObject[],
  damageType: DamageType
): number {
  if (armor.length === 0) {
    return 0;
  }

  let total = 0;
  for (const piece of armor) {
    total += piece.getEffectiveness(damageType);
  }

  return total / armor.length;
}

/**
 * Determine a random hit location based on weighted probabilities
 * Chest/torso hits are more common than extremities
 *
 * @returns A random hit location
 */
export function rollHitLocation(): HitLocationType {
  const roll = Math.random() * 100;

  // Weighted distribution favoring center mass
  if (roll < 35) {
    return HitLocation.Chest;
  } else if (roll < 50) {
    return HitLocation.Back;
  } else if (roll < 60) {
    return HitLocation.Head;
  } else if (roll < 70) {
    return HitLocation.LeftArm;
  } else if (roll < 80) {
    return HitLocation.RightArm;
  } else if (roll < 88) {
    return HitLocation.LeftLeg;
  } else if (roll < 96) {
    return HitLocation.RightLeg;
  } else if (roll < 98) {
    return HitLocation.Hands;
  } else {
    return HitLocation.Feet;
  }
}

/**
 * Apply damage to armor condition
 * Armor takes condition damage when it absorbs hits
 *
 * @param armor - The armor piece to damage
 * @param damageAbsorbed - Amount of damage the armor absorbed
 * @param damageToConditionRatio - Ratio of absorbed damage to condition damage (default: 0.1)
 */
export function applyConditionDamage(
  armor: ArmorObject,
  damageAbsorbed: number,
  damageToConditionRatio: number = 0.1
): void {
  const conditionDamage = Math.floor(damageAbsorbed * damageToConditionRatio);
  if (conditionDamage > 0) {
    armor.damage(conditionDamage);
  }
}
