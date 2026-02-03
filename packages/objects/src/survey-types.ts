/**
 * Survey System Types
 * Type definitions for the resource surveying system in SWG
 *
 * Survey tools allow players to locate and sample natural resources on planets.
 * Different tool types survey different resource classes (mineral, chemical, flora, etc.)
 */

/**
 * Survey tool types corresponding to resource classes
 */
export enum SurveyToolType {
  /** Surveys mineral resources (iron, copper, aluminum, etc.) */
  Mineral = 0,
  /** Surveys chemical resources (petrochem, polymer, lubricant, etc.) */
  Chemical = 1,
  /** Surveys flora resources (wood, plant fiber, wild wheat, etc.) */
  Flora = 2,
  /** Surveys gas resources (reactive gas, inert gas, etc.) */
  Gas = 3,
  /** Surveys water resources (class 1-10 water) */
  Water = 4,
  /** Surveys organic resources (hide, bone, meat, etc.) - rare tool type */
  Organic = 5,
}

/**
 * Tool quality levels affecting survey effectiveness
 */
export enum SurveyToolQuality {
  /** Basic quality - standard tools */
  Basic = 0,
  /** Standard quality - improved tools */
  Standard = 1,
  /** Advanced quality - high-end tools */
  Advanced = 2,
  /** Master quality - exceptional tools */
  Master = 3,
}

/**
 * Result of a survey operation
 * Contains information about a resource concentration at a specific location
 */
export interface SurveyResult {
  /** Unique resource ID (spawned resource instance) */
  resourceId: bigint;
  /** Display name of the resource */
  resourceName: string;
  /** Resource class (e.g., "Iron", "Copper", "Petrochem Fuel Solid") */
  resourceClass: string;
  /** Concentration percentage at this location (0-100) */
  concentration: number;
  /** Position where this reading was taken */
  position: {
    x: number;
    z: number;
  };
  /** Accuracy of the reading (0-100), affected by tool and skill */
  accuracy: number;
  /** Distance from the player's position */
  distance: number;
  /** Direction from player to resource hotspot (radians) */
  direction: number;
}

/**
 * Result of a sample extraction operation
 * Contains information about resources extracted from a location
 */
export interface SampleResult {
  /** Unique resource ID that was sampled */
  resourceId: bigint;
  /** Display name of the resource */
  resourceName: string;
  /** Quantity of units extracted */
  quantity: number;
  /** Whether the extraction was successful */
  success: boolean;
  /** Concentration at the sample point (0-100) */
  concentration: number;
  /** Error message if sampling failed */
  errorMessage?: string;
  /** XP gained from sampling (survey XP) */
  xpGained?: number;
}

/**
 * Resource spawn data for survey calculations
 */
export interface ResourceSpawnData {
  /** Unique resource spawn ID */
  resourceId: bigint;
  /** Resource name */
  name: string;
  /** Resource class */
  resourceClass: string;
  /** Parent resource class (for inheritance) */
  parentClass: string;
  /** Planet ID where this resource spawns */
  planetId: string;
  /** Resource attributes (conductivity, decay resistance, etc.) */
  attributes: Map<string, number>;
  /** Spawn map seed for concentration calculations */
  spawnSeed: number;
  /** Base concentration (0-100) */
  baseConcentration: number;
  /** Spawn start timestamp */
  spawnStartTime: number;
  /** Spawn end timestamp (when resource depletes) */
  spawnEndTime: number;
}

/**
 * Surveyable resource entry for available resources list
 */
export interface SurveyableResource {
  /** Resource ID */
  resourceId: bigint;
  /** Resource name */
  name: string;
  /** Resource class */
  resourceClass: string;
  /** Whether the player has previously surveyed this resource */
  previouslySurveyed: boolean;
}

/**
 * Survey waypoint data for creating resource waypoints
 */
export interface SurveyWaypoint {
  /** Resource ID this waypoint marks */
  resourceId: bigint;
  /** Resource name for waypoint label */
  resourceName: string;
  /** X coordinate */
  x: number;
  /** Z coordinate */
  z: number;
  /** Concentration at this point */
  concentration: number;
}

/**
 * Resource class mapping for survey tool types
 * Maps tool types to the resource classes they can survey
 */
export const SURVEY_TOOL_RESOURCE_CLASSES: Record<SurveyToolType, string[]> = {
  [SurveyToolType.Mineral]: [
    'mineral',
    'metal',
    'ore',
    'iron',
    'copper',
    'aluminum',
    'steel',
    'carbide',
    'crystalline_gemstone',
    'radioactive',
  ],
  [SurveyToolType.Chemical]: [
    'chemical',
    'petrochem',
    'polymer',
    'lubricating_oil',
    'fuel',
    'fiberplast',
  ],
  [SurveyToolType.Flora]: [
    'flora',
    'wood',
    'softwood',
    'hardwood',
    'plant_fiber',
    'fruit',
    'vegetable',
    'grain',
    'cereal',
  ],
  [SurveyToolType.Gas]: [
    'gas',
    'reactive_gas',
    'inert_gas',
    'known_reactive_gas',
    'known_inert_gas',
  ],
  [SurveyToolType.Water]: [
    'water',
    'class1_water',
    'class2_water',
    'class3_water',
    'class4_water',
    'class5_water',
  ],
  [SurveyToolType.Organic]: [
    'organic',
    'creature_resources',
    'hide',
    'bone',
    'meat',
    'horn',
    'milk',
  ],
};

/**
 * Get the display name for a survey tool type
 */
export function getSurveyToolTypeName(type: SurveyToolType): string {
  switch (type) {
    case SurveyToolType.Mineral:
      return 'Mineral Survey Device';
    case SurveyToolType.Chemical:
      return 'Chemical Survey Device';
    case SurveyToolType.Flora:
      return 'Flora Survey Device';
    case SurveyToolType.Gas:
      return 'Gas Survey Device';
    case SurveyToolType.Water:
      return 'Water Survey Device';
    case SurveyToolType.Organic:
      return 'Organic Survey Device';
    default:
      return 'Survey Device';
  }
}

/**
 * Get the resource class group name for a survey tool type
 */
export function getSurveyToolResourceGroup(type: SurveyToolType): string {
  switch (type) {
    case SurveyToolType.Mineral:
      return 'Minerals';
    case SurveyToolType.Chemical:
      return 'Chemicals';
    case SurveyToolType.Flora:
      return 'Flora';
    case SurveyToolType.Gas:
      return 'Gas';
    case SurveyToolType.Water:
      return 'Water';
    case SurveyToolType.Organic:
      return 'Organic';
    default:
      return 'Resources';
  }
}

/**
 * Check if a resource class can be surveyed by a tool type
 * @param toolType - The survey tool type
 * @param resourceClass - The resource class to check
 * @returns Whether the tool can survey this resource class
 */
export function canSurveyResourceClass(
  toolType: SurveyToolType,
  resourceClass: string
): boolean {
  const classes = SURVEY_TOOL_RESOURCE_CLASSES[toolType];
  if (!classes) return false;

  const normalizedClass = resourceClass.toLowerCase().replace(/\s+/g, '_');
  return classes.some(
    (c) =>
      normalizedClass === c || normalizedClass.includes(c) || c.includes(normalizedClass)
  );
}

/**
 * Default survey cooldown in milliseconds (3 seconds)
 */
export const DEFAULT_SURVEY_COOLDOWN = 3000;

/**
 * Default sample cooldown in milliseconds (5 seconds)
 */
export const DEFAULT_SAMPLE_COOLDOWN = 5000;

/**
 * Maximum number of survey results returned
 */
export const MAX_SURVEY_RESULTS = 6;

/**
 * Minimum concentration to report in survey results (%)
 */
export const MIN_REPORTABLE_CONCENTRATION = 1;

/**
 * Survey range tiers
 */
export const SURVEY_RANGE_TIERS = {
  basic: 64,
  standard: 128,
  advanced: 192,
  master: 320,
} as const;

/**
 * Survey accuracy tiers (percentage)
 */
export const SURVEY_ACCURACY_TIERS = {
  basic: 60,
  standard: 75,
  advanced: 85,
  master: 100,
} as const;

/**
 * Sample size tiers (units per sample)
 */
export const SAMPLE_SIZE_TIERS = {
  basic: 1,
  standard: 2,
  advanced: 3,
  master: 5,
} as const;
