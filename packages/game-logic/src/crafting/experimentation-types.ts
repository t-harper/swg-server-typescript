/**
 * @file experimentation-types.ts
 * Type definitions for the SWG crafting experimentation system
 *
 * Experimentation allows crafters to improve item attributes after assembly.
 * Each experiment carries risk and uses experimentation points.
 */

/**
 * Result type for experimentation rolls
 */
export enum ExperimentationRollType {
  /** Critical failure - significant attribute degradation */
  CriticalFailure = 'critical_failure',
  /** Moderate failure - attribute degradation */
  ModerateFailure = 'moderate_failure',
  /** Regular failure - minor degradation */
  Failure = 'failure',
  /** Regular success - moderate improvement */
  Success = 'success',
  /** Great success - good improvement */
  GreatSuccess = 'great_success',
  /** Amazing success - exceptional improvement, can exceed caps */
  AmazingSuccess = 'amazing_success',
}

/**
 * Detailed result of an experimentation roll
 */
export interface ExperimentationRoll {
  /** The raw roll value (0-1) */
  rawRoll: number;

  /** The modified roll after skill/tool bonuses */
  modifiedRoll: number;

  /** The type of result */
  resultType: ExperimentationRollType;

  /** Success chance that was calculated */
  successChance: number;

  /** Critical success threshold */
  criticalSuccessThreshold: number;

  /** Critical failure threshold */
  criticalFailureThreshold: number;

  /** Skill value used */
  skillUsed: number;

  /** Tool bonus applied */
  toolBonus: number;

  /** Station bonus applied */
  stationBonus: number;

  /** Risk accumulated before this roll */
  riskBefore: number;

  /** Risk added by this roll */
  riskAdded: number;

  /** Risk accumulated after this roll */
  riskAfter: number;
}

/**
 * Result for a single attribute line within an experimentation group
 */
export interface ExperimentationLineResult {
  /** Name of the attribute */
  attributeName: string;

  /** Display name of the attribute */
  displayName: string;

  /** Value before experimentation */
  valueBefore: number;

  /** Value after experimentation */
  valueAfter: number;

  /** Change in value */
  delta: number;

  /** Whether the value hit the maximum cap */
  hitCap: boolean;

  /** Whether this was an amazing success that exceeded normal cap */
  exceededCap: boolean;

  /** The maximum value for this attribute */
  maxValue: number;

  /** The minimum value for this attribute */
  minValue: number;
}

/**
 * Combined result for an entire experimentation group
 */
export interface ExperimentationGroupResult {
  /** Name of the experimentation group */
  groupName: string;

  /** Display name of the group */
  groupDisplayName: string;

  /** Individual results for each attribute line */
  lineResults: ExperimentationLineResult[];

  /** The roll that determined this result */
  roll: ExperimentationRoll;

  /** Points spent on this experiment */
  pointsSpent: number;

  /** Overall success status */
  success: boolean;

  /** Whether this was a critical success */
  criticalSuccess: boolean;

  /** Whether this was a critical failure */
  criticalFailure: boolean;

  /** Whether the item was destroyed due to risk */
  itemDestroyed: boolean;

  /** Message describing the result */
  message: string;

  /** Timestamp of this experiment */
  timestamp: number;
}

/**
 * All modifiers that affect experimentation calculations
 */
export interface ExperimentationModifiers {
  /** Base experimentation skill (0-100) */
  baseSkill: number;

  /** Profession-specific experimentation skill (0-100) */
  professionSkill: number;

  /** Bonus from skill tapes (0-25 typical) */
  skillTapeBonus: number;

  /** Bonus from crafting tool (0-100) */
  toolBonus: number;

  /** Bonus from crafting station (0-50 typical) */
  stationBonus: number;

  /** Bonus from food/drink buffs (0-25 typical) */
  buffBonus: number;

  /** General experimentation skill mod from skills */
  experimentationGeneral: number;

  /** Profession-specific experimentation bonus */
  experimentationBonus: number;

  /** Combined effective skill (calculated) */
  effectiveSkill: number;
}

/**
 * Risk thresholds for item damage/destruction
 */
export interface ExperimentationRiskThresholds {
  /** Risk level at which minor degradation occurs */
  minorDegradation: number;

  /** Risk level at which moderate degradation occurs */
  moderateDegradation: number;

  /** Risk level at which severe degradation occurs */
  severeDegradation: number;

  /** Risk level at which item is destroyed */
  itemDestruction: number;
}

/**
 * Default risk thresholds based on SWG mechanics
 */
export const DEFAULT_RISK_THRESHOLDS: ExperimentationRiskThresholds = {
  minorDegradation: 0.6,
  moderateDegradation: 0.75,
  severeDegradation: 0.9,
  itemDestruction: 1.0,
};

/**
 * Configuration for experimentation behavior
 */
export interface ExperimentationConfig {
  /** Default number of experimentation points */
  defaultPoints: number;

  /** Maximum points that can be spent in a single experiment */
  maxPointsPerExperiment: number;

  /** Base risk increase per point spent */
  baseRiskPerPoint: number;

  /** Complexity modifier for risk (higher complexity = more risk) */
  complexityRiskModifier: number;

  /** Skill bonus for reducing risk (per skill point) */
  skillRiskReduction: number;

  /** Minimum success chance */
  minSuccessChance: number;

  /** Maximum success chance */
  maxSuccessChance: number;

  /** Thresholds for critical results */
  criticalFailureBase: number;
  criticalSuccessBase: number;
  greatSuccessBase: number;
  amazingSuccessBase: number;

  /** Improvement multipliers for different result types */
  criticalFailureMultiplier: number;
  moderateFailureMultiplier: number;
  failureMultiplier: number;
  successMultiplier: number;
  greatSuccessMultiplier: number;
  amazingSuccessMultiplier: number;

  /** Amazing success can exceed normal caps by this percentage */
  amazingSuccessCapExceed: number;
}

/**
 * Default configuration matching SWG mechanics
 */
export const DEFAULT_EXPERIMENTATION_CONFIG: ExperimentationConfig = {
  defaultPoints: 10,
  maxPointsPerExperiment: 10,
  baseRiskPerPoint: 0.02,
  complexityRiskModifier: 0.001,
  skillRiskReduction: 0.0005,
  minSuccessChance: 0.05,
  maxSuccessChance: 0.95,
  criticalFailureBase: 0.03,
  criticalSuccessBase: 0.97,
  greatSuccessBase: 0.90,
  amazingSuccessBase: 0.99,
  criticalFailureMultiplier: -2.0,
  moderateFailureMultiplier: -1.0,
  failureMultiplier: -0.5,
  successMultiplier: 1.0,
  greatSuccessMultiplier: 1.5,
  amazingSuccessMultiplier: 2.0,
  amazingSuccessCapExceed: 0.05,
};

/**
 * State of experimentation for a single attribute line
 */
export interface ExperimentationLineState {
  /** Name of the attribute */
  attributeName: string;

  /** Number of times this line has been experimented on */
  experimentCount: number;

  /** Total points spent on this line */
  totalPointsSpent: number;

  /** Current diminishing returns factor (1.0 = no reduction) */
  diminishingReturnsFactor: number;

  /** Whether the line has reached its maximum */
  atMaximum: boolean;

  /** Current value of the attribute */
  currentValue: number;

  /** Maximum achievable value (from schematic) */
  maxValue: number;

  /** Minimum value (from schematic) */
  minValue: number;
}

/**
 * Full state of experimentation for a crafting session
 */
export interface ExperimentationState {
  /** Remaining experimentation points */
  pointsRemaining: number;

  /** Total points available at start */
  totalPoints: number;

  /** Accumulated risk level (0-1) */
  riskAccumulated: number;

  /** State of each attribute line */
  lineStates: Map<string, ExperimentationLineState>;

  /** History of all experimentation attempts */
  history: ExperimentationGroupResult[];

  /** Whether the item has been destroyed */
  itemDestroyed: boolean;

  /** Reason for destruction if destroyed */
  destructionReason?: string;
}

/**
 * Serializable version of ExperimentationState for persistence
 */
export interface SerializedExperimentationState {
  pointsRemaining: number;
  totalPoints: number;
  riskAccumulated: number;
  lineStates: Array<[string, ExperimentationLineState]>;
  history: ExperimentationGroupResult[];
  itemDestroyed: boolean;
  destructionReason?: string;
}

/**
 * Convert ExperimentationState to serializable format
 */
export function serializeExperimentationState(
  state: ExperimentationState
): SerializedExperimentationState {
  return {
    pointsRemaining: state.pointsRemaining,
    totalPoints: state.totalPoints,
    riskAccumulated: state.riskAccumulated,
    lineStates: Array.from(state.lineStates.entries()),
    history: state.history,
    itemDestroyed: state.itemDestroyed,
    destructionReason: state.destructionReason,
  };
}

/**
 * Convert serialized format back to ExperimentationState
 */
export function deserializeExperimentationState(
  data: SerializedExperimentationState
): ExperimentationState {
  return {
    pointsRemaining: data.pointsRemaining,
    totalPoints: data.totalPoints,
    riskAccumulated: data.riskAccumulated,
    lineStates: new Map(data.lineStates),
    history: data.history,
    itemDestroyed: data.itemDestroyed,
    destructionReason: data.destructionReason,
  };
}

/**
 * Create an empty experimentation state
 */
export function createExperimentationState(totalPoints: number): ExperimentationState {
  return {
    pointsRemaining: totalPoints,
    totalPoints,
    riskAccumulated: 0,
    lineStates: new Map(),
    history: [],
    itemDestroyed: false,
  };
}
