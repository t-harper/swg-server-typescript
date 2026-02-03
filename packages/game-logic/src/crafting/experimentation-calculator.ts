/**
 * @file experimentation-calculator.ts
 * Core calculations for the SWG crafting experimentation system
 *
 * This module handles all the mathematical calculations for experimentation:
 * - Success/failure chances
 * - Critical result thresholds
 * - Improvement amounts
 * - Risk calculations
 */

import type { ExperimentationGroup, SchematicAttribute } from './draft-schematic.js';
import {
  type ExperimentationRoll,
  type ExperimentationConfig,
  type ExperimentationModifiers,
  type ExperimentationLineResult,
  type ExperimentationGroupResult,
  type ExperimentationLineState,
  ExperimentationRollType,
  DEFAULT_EXPERIMENTATION_CONFIG,
} from './experimentation-types.js';

/**
 * Critical chance thresholds
 */
export interface CriticalChances {
  /** Threshold for critical failure (roll below this = critical fail) */
  criticalFailureThreshold: number;

  /** Threshold for moderate failure */
  moderateFailureThreshold: number;

  /** Threshold for regular success (roll above this = success) */
  successThreshold: number;

  /** Threshold for great success */
  greatSuccessThreshold: number;

  /** Threshold for amazing success (roll above this = amazing) */
  amazingSuccessThreshold: number;
}

/**
 * Improvement calculation result
 */
export interface ImprovementResult {
  /** Base improvement percentage (before modifiers) */
  baseImprovement: number;

  /** Final improvement percentage */
  finalImprovement: number;

  /** Multiplier applied based on roll type */
  multiplier: number;

  /** Diminishing returns factor applied */
  diminishingReturnsFactor: number;

  /** Roll type that determined this improvement */
  rollType: ExperimentationRollType;
}

/**
 * Risk calculation result
 */
export interface RiskResult {
  /** Risk added by this attempt */
  riskAdded: number;

  /** Total risk after this attempt */
  totalRisk: number;

  /** Whether the item would be destroyed */
  wouldDestroy: boolean;

  /** Factors that contributed to risk */
  riskFactors: {
    baseRisk: number;
    pointsMultiplier: number;
    complexityModifier: number;
    skillReduction: number;
  };
}

/**
 * Calculate the base experimentation success chance
 *
 * @param skill - Effective experimentation skill (0-140)
 * @param points - Number of points being spent (1-10)
 * @param toolBonus - Bonus from crafting tool (0-100)
 * @param riskAccumulated - Current accumulated risk (0-1)
 * @param config - Experimentation configuration
 * @returns Success chance (0-1)
 */
export function calculateExperimentationChance(
  skill: number,
  points: number,
  toolBonus: number,
  riskAccumulated: number,
  config: ExperimentationConfig = DEFAULT_EXPERIMENTATION_CONFIG
): number {
  // Base chance from skill (0-140 skill -> 0.2-0.8 base)
  const skillFactor = 0.2 + (skill / 140) * 0.6;

  // Points penalty (more points = harder to succeed)
  // 1 point = no penalty, 10 points = -0.25
  const pointsPenalty = ((points - 1) / 9) * 0.25;

  // Tool bonus (0-100 -> 0-0.1)
  const toolFactor = (toolBonus / 100) * 0.1;

  // Risk penalty (0-1 risk -> 0-0.3 penalty)
  const riskPenalty = riskAccumulated * 0.3;

  // Calculate final chance
  let chance = skillFactor - pointsPenalty + toolFactor - riskPenalty;

  // Clamp to configured bounds
  chance = Math.max(config.minSuccessChance, Math.min(config.maxSuccessChance, chance));

  return chance;
}

/**
 * Calculate critical success/failure thresholds based on skill
 *
 * Higher skill reduces critical failure chance and increases critical success chance.
 *
 * @param skill - Effective experimentation skill (0-140)
 * @param config - Experimentation configuration
 * @returns Critical chance thresholds
 */
export function calculateCriticalChances(
  skill: number,
  config: ExperimentationConfig = DEFAULT_EXPERIMENTATION_CONFIG
): CriticalChances {
  // Skill factor (0-140 -> 0-1)
  const skillFactor = skill / 140;

  // Critical failure decreases with skill (0.03 at 0 skill, 0.01 at 140)
  const criticalFailure = config.criticalFailureBase * (1 - skillFactor * 0.67);

  // Moderate failure threshold (between critical failure and regular failure)
  const moderateFailure = criticalFailure + 0.05;

  // Great success threshold increases with skill
  const greatSuccess = config.greatSuccessBase + skillFactor * 0.03;

  // Amazing success threshold
  const amazingSuccess = config.amazingSuccessBase + skillFactor * 0.005;

  return {
    criticalFailureThreshold: criticalFailure,
    moderateFailureThreshold: moderateFailure,
    successThreshold: 0.5, // This is overridden by calculateExperimentationChance
    greatSuccessThreshold: greatSuccess,
    amazingSuccessThreshold: amazingSuccess,
  };
}

/**
 * Determine the roll type based on the roll value and thresholds
 *
 * @param roll - The random roll (0-1)
 * @param successChance - Calculated success chance
 * @param criticals - Critical chance thresholds
 * @returns The type of result
 */
export function determineRollType(
  roll: number,
  successChance: number,
  criticals: CriticalChances
): ExperimentationRollType {
  // Check for amazing success first (highest priority)
  if (roll >= criticals.amazingSuccessThreshold) {
    return ExperimentationRollType.AmazingSuccess;
  }

  // Check for great success
  if (roll >= criticals.greatSuccessThreshold && roll >= successChance) {
    return ExperimentationRollType.GreatSuccess;
  }

  // Check for critical failure
  if (roll < criticals.criticalFailureThreshold) {
    return ExperimentationRollType.CriticalFailure;
  }

  // Check for moderate failure
  if (roll < criticals.moderateFailureThreshold && roll < successChance) {
    return ExperimentationRollType.ModerateFailure;
  }

  // Check for regular success/failure
  if (roll >= successChance) {
    return ExperimentationRollType.Success;
  }

  return ExperimentationRollType.Failure;
}

/**
 * Calculate improvement amount for an experimentation attempt
 *
 * @param group - The experimentation group being targeted
 * @param points - Number of points being spent (1-10)
 * @param skill - Effective experimentation skill (0-140)
 * @param rollType - The type of roll result
 * @param diminishingReturnsFactor - Current diminishing returns factor (1.0 = no reduction)
 * @param config - Experimentation configuration
 * @returns Improvement result details
 */
export function calculateImprovement(
  group: ExperimentationGroup,
  points: number,
  skill: number,
  rollType: ExperimentationRollType,
  diminishingReturnsFactor: number = 1.0,
  config: ExperimentationConfig = DEFAULT_EXPERIMENTATION_CONFIG
): ImprovementResult {
  // Base improvement from points (1-10 points -> 10-100% of max improvement)
  const pointsFactor = points / config.maxPointsPerExperiment;

  // Skill factor (0-140 skill -> 0.5-1.0 multiplier)
  const skillFactor = 0.5 + (skill / 140) * 0.5;

  // Base improvement percentage (of the group's maxImprovement)
  const baseImprovement = group.maxImprovement * pointsFactor * skillFactor;

  // Get multiplier based on roll type
  let multiplier: number;
  switch (rollType) {
    case ExperimentationRollType.CriticalFailure:
      multiplier = config.criticalFailureMultiplier;
      break;
    case ExperimentationRollType.ModerateFailure:
      multiplier = config.moderateFailureMultiplier;
      break;
    case ExperimentationRollType.Failure:
      multiplier = config.failureMultiplier;
      break;
    case ExperimentationRollType.Success:
      multiplier = config.successMultiplier;
      break;
    case ExperimentationRollType.GreatSuccess:
      multiplier = config.greatSuccessMultiplier;
      break;
    case ExperimentationRollType.AmazingSuccess:
      multiplier = config.amazingSuccessMultiplier;
      break;
    default:
      multiplier = config.successMultiplier;
  }

  // Apply multiplier and diminishing returns
  const finalImprovement = baseImprovement * multiplier * diminishingReturnsFactor;

  return {
    baseImprovement,
    finalImprovement,
    multiplier,
    diminishingReturnsFactor,
    rollType,
  };
}

/**
 * Calculate risk increase for an experimentation attempt
 *
 * @param points - Number of points being spent (1-10)
 * @param schematicComplexity - Complexity of the schematic (1-25)
 * @param skill - Effective experimentation skill (0-140)
 * @param currentRisk - Current accumulated risk (0-1)
 * @param config - Experimentation configuration
 * @returns Risk calculation result
 */
export function calculateRisk(
  points: number,
  schematicComplexity: number,
  skill: number,
  currentRisk: number,
  config: ExperimentationConfig = DEFAULT_EXPERIMENTATION_CONFIG
): RiskResult {
  // Base risk per point
  const baseRisk = config.baseRiskPerPoint;

  // Points multiplier (more points = proportionally more risk)
  const pointsMultiplier = points;

  // Complexity modifier (higher complexity = more risk)
  const complexityModifier = 1 + schematicComplexity * config.complexityRiskModifier;

  // Skill reduction (higher skill = less risk)
  const skillReduction = skill * config.skillRiskReduction;

  // Calculate risk added
  let riskAdded = baseRisk * pointsMultiplier * complexityModifier;
  riskAdded = Math.max(0, riskAdded - skillReduction);

  // Progressive risk: risk increases faster as accumulated risk grows
  // This makes late-game experimentation riskier
  const progressiveMultiplier = 1 + currentRisk * 0.5;
  riskAdded *= progressiveMultiplier;

  // Calculate total risk
  const totalRisk = currentRisk + riskAdded;

  return {
    riskAdded,
    totalRisk,
    wouldDestroy: totalRisk >= 1.0,
    riskFactors: {
      baseRisk,
      pointsMultiplier,
      complexityModifier,
      skillReduction,
    },
  };
}

/**
 * Calculate diminishing returns factor for repeated experiments on same line
 *
 * Each experiment on the same attribute line reduces effectiveness by 15%
 *
 * @param experimentCount - Number of times this line has been experimented on
 * @returns Diminishing returns factor (1.0 = full effect, <1.0 = reduced effect)
 */
export function calculateDiminishingReturns(experimentCount: number): number {
  if (experimentCount <= 0) {
    return 1.0;
  }

  // 15% reduction per previous experiment, minimum 20% effectiveness
  const factor = Math.pow(0.85, experimentCount);
  return Math.max(0.2, factor);
}

/**
 * Perform a complete experimentation roll
 *
 * @param modifiers - All experimentation modifiers
 * @param points - Points to spend (1-10)
 * @param currentRisk - Current accumulated risk
 * @param config - Experimentation configuration
 * @returns Complete roll result
 */
export function performExperimentationRoll(
  modifiers: ExperimentationModifiers,
  points: number,
  currentRisk: number,
  config: ExperimentationConfig = DEFAULT_EXPERIMENTATION_CONFIG
): ExperimentationRoll {
  const skill = modifiers.effectiveSkill;

  // Calculate success chance
  const successChance = calculateExperimentationChance(
    skill,
    points,
    modifiers.toolBonus,
    currentRisk,
    config
  );

  // Calculate critical thresholds
  const criticals = calculateCriticalChances(skill, config);

  // Generate random roll
  const rawRoll = Math.random();

  // Determine result type
  const resultType = determineRollType(rawRoll, successChance, criticals);

  // Calculate risk
  // Note: We use a placeholder for complexity here - the actual value
  // should be passed in from the schematic
  const riskResult = calculateRisk(points, 10, skill, currentRisk, config);

  return {
    rawRoll,
    modifiedRoll: rawRoll, // Could apply modifiers in the future
    resultType,
    successChance,
    criticalSuccessThreshold: criticals.greatSuccessThreshold,
    criticalFailureThreshold: criticals.criticalFailureThreshold,
    skillUsed: skill,
    toolBonus: modifiers.toolBonus,
    stationBonus: modifiers.stationBonus,
    riskBefore: currentRisk,
    riskAdded: riskResult.riskAdded,
    riskAfter: riskResult.totalRisk,
  };
}

/**
 * Apply experimentation result to attribute lines
 *
 * @param group - Experimentation group
 * @param attributes - Map of attribute names to their schematic definitions
 * @param currentValues - Map of attribute names to current values
 * @param lineStates - Map of attribute names to their experimentation states
 * @param improvement - Calculated improvement result
 * @param rollType - Type of roll result
 * @param config - Experimentation configuration
 * @returns Array of line results
 */
export function applyExperimentationToLines(
  group: ExperimentationGroup,
  attributes: Map<string, SchematicAttribute>,
  currentValues: Map<string, number>,
  lineStates: Map<string, ExperimentationLineState>,
  improvement: ImprovementResult,
  rollType: ExperimentationRollType,
  config: ExperimentationConfig = DEFAULT_EXPERIMENTATION_CONFIG
): ExperimentationLineResult[] {
  const results: ExperimentationLineResult[] = [];

  for (const attrName of group.attributes) {
    const attr = attributes.get(attrName);
    if (!attr || attr.experimentationModifier <= 0) {
      continue;
    }

    const currentValue = currentValues.get(attrName) ?? attr.baseValue;
    const lineState = lineStates.get(attrName);

    // Calculate the actual change
    const range = attr.maxValue - attr.minValue;
    let delta = (range * improvement.finalImprovement * attr.experimentationModifier) / 100;

    // For failures, the improvement is already negative from the multiplier
    // No additional adjustment needed

    // Calculate new value
    let newValue = currentValue + delta;

    // Check for cap exceeding (amazing success only)
    let exceededCap = false;
    let maxAllowed = attr.maxValue;

    if (rollType === ExperimentationRollType.AmazingSuccess) {
      // Amazing success can exceed normal cap
      maxAllowed = attr.maxValue * (1 + config.amazingSuccessCapExceed);
      if (newValue > attr.maxValue) {
        exceededCap = true;
      }
    }

    // Clamp to valid range
    const hitCap = newValue >= maxAllowed;
    newValue = Math.max(attr.minValue, Math.min(maxAllowed, newValue));

    // Update current values map
    currentValues.set(attrName, newValue);

    results.push({
      attributeName: attrName,
      displayName: attr.displayName,
      valueBefore: currentValue,
      valueAfter: newValue,
      delta: newValue - currentValue,
      hitCap,
      exceededCap,
      maxValue: attr.maxValue,
      minValue: attr.minValue,
    });
  }

  return results;
}

/**
 * Generate a result message based on the roll type
 *
 * @param rollType - Type of roll result
 * @param groupName - Name of the experimentation group
 * @returns Human-readable result message
 */
export function generateResultMessage(
  rollType: ExperimentationRollType,
  groupName: string
): string {
  switch (rollType) {
    case ExperimentationRollType.CriticalFailure:
      return `Critical failure! The ${groupName} attributes have significantly degraded.`;
    case ExperimentationRollType.ModerateFailure:
      return `Experimentation failed. The ${groupName} attributes have degraded.`;
    case ExperimentationRollType.Failure:
      return `Experimentation failed. Minor degradation to ${groupName}.`;
    case ExperimentationRollType.Success:
      return `Experimentation successful. ${groupName} improved.`;
    case ExperimentationRollType.GreatSuccess:
      return `Great success! ${groupName} significantly improved.`;
    case ExperimentationRollType.AmazingSuccess:
      return `Amazing success! ${groupName} achieved exceptional improvement!`;
    default:
      return `Experimentation complete.`;
  }
}

/**
 * Check if a roll type represents a success
 */
export function isSuccessfulRoll(rollType: ExperimentationRollType): boolean {
  return (
    rollType === ExperimentationRollType.Success ||
    rollType === ExperimentationRollType.GreatSuccess ||
    rollType === ExperimentationRollType.AmazingSuccess
  );
}

/**
 * Check if a roll type represents a critical result
 */
export function isCriticalRoll(rollType: ExperimentationRollType): boolean {
  return (
    rollType === ExperimentationRollType.CriticalFailure ||
    rollType === ExperimentationRollType.AmazingSuccess
  );
}

/**
 * Get the color code for a roll type (for UI display)
 */
export function getRollTypeColor(rollType: ExperimentationRollType): string {
  switch (rollType) {
    case ExperimentationRollType.CriticalFailure:
      return '#FF0000'; // Red
    case ExperimentationRollType.ModerateFailure:
      return '#FF6600'; // Orange
    case ExperimentationRollType.Failure:
      return '#FFCC00'; // Yellow
    case ExperimentationRollType.Success:
      return '#00CC00'; // Green
    case ExperimentationRollType.GreatSuccess:
      return '#00CCFF'; // Cyan
    case ExperimentationRollType.AmazingSuccess:
      return '#FF00FF'; // Magenta
    default:
      return '#FFFFFF'; // White
  }
}
