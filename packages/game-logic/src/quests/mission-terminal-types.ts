/**
 * @file mission-terminal-types.ts
 * Types for dynamically generated missions from mission terminals
 */

/**
 * Types of mission terminals found throughout the galaxy
 */
export enum MissionTerminalType {
  /** General missions available to all players */
  GENERAL = 'general',
  /** Bounty hunting missions for bounty hunters */
  BOUNTY_HUNTER = 'bounty_hunter',
  /** Artisan missions (delivery, survey, crafting) */
  ARTISAN = 'artisan',
  /** Entertainer missions */
  ENTERTAINER = 'entertainer',
  /** Scout missions (exploration, creature hunting) */
  SCOUT = 'scout',
  /** Rebel faction missions */
  REBEL = 'rebel',
  /** Imperial faction missions */
  IMPERIAL = 'imperial',
  /** Smuggler missions */
  SMUGGLER = 'smuggler',
}

/**
 * Difficulty levels for generated missions
 */
export enum MissionDifficulty {
  /** Easy missions for beginners */
  EASY = 'easy',
  /** Medium difficulty */
  MEDIUM = 'medium',
  /** Hard missions for experienced players */
  HARD = 'hard',
  /** Elite missions for groups or very skilled players */
  ELITE = 'elite',
}

/**
 * Types of missions that can be generated
 */
export enum GeneratedMissionType {
  /** Destroy a target creature lair */
  DESTROY = 'destroy',
  /** Deliver an item to a location */
  DELIVER = 'deliver',
  /** Hunt and kill creatures */
  HUNTING = 'hunting',
  /** Bounty on a specific NPC */
  BOUNTY = 'bounty',
  /** Survey a location */
  SURVEY = 'survey',
  /** Escort mission */
  ESCORT = 'escort',
  /** Recon/exploration mission */
  RECON = 'recon',
  /** Assassination of an NPC target */
  ASSASSIN = 'assassin',
}

/**
 * Location for a generated mission
 */
export interface MissionLocation {
  /** Planet name */
  planet: string;
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Z coordinate (optional) */
  z?: number;
  /** Display name for the location */
  locationName?: string;
  /** Region/area name */
  region?: string;
}

/**
 * Target information for a generated mission
 */
export interface MissionTarget {
  /** Target template (creature, NPC, lair) */
  template: string;
  /** Display name */
  name: string;
  /** Combat level of target */
  level: number;
  /** Target faction (if applicable) */
  faction?: string;
  /** Number of targets to kill (for hunting missions) */
  count?: number;
}

/**
 * Item to deliver for delivery missions
 */
export interface DeliveryItem {
  /** Item template */
  template: string;
  /** Display name */
  name: string;
  /** Quantity */
  quantity: number;
  /** Size/encumbrance */
  size?: number;
}

/**
 * Generated mission from a terminal
 */
export interface GeneratedMission {
  /** Unique mission ID */
  id: string;
  /** Type of mission */
  type: GeneratedMissionType;
  /** Mission title */
  title: string;
  /** Mission description */
  description: string;
  /** Mission difficulty */
  difficulty: MissionDifficulty;
  /** Target location */
  location: MissionLocation;
  /** Mission target (for combat missions) */
  target?: MissionTarget;
  /** Delivery item (for delivery missions) */
  deliveryItem?: DeliveryItem;
  /** Credit reward */
  creditReward: number;
  /** Faction reward (positive or negative) */
  factionReward?: {
    faction: string;
    amount: number;
  };
  /** Time limit in seconds (0 = no limit) */
  timeLimit: number;
  /** Minimum level to accept */
  minLevel: number;
  /** Terminal type that generated this mission */
  terminalType: MissionTerminalType;
  /** Creator NPC name */
  creatorName?: string;
  /** Destination NPC for delivery */
  destinationNpc?: string;
  /** Waypoint description */
  waypointDescription?: string;
}

/**
 * Parameters for mission generation
 */
export interface MissionGenerationParams {
  /** Terminal type */
  terminalType: MissionTerminalType;
  /** Planet where terminal is located */
  planet: string;
  /** Terminal location */
  terminalLocation: MissionLocation;
  /** Player level */
  playerLevel: number;
  /** Player faction (if any) */
  playerFaction?: string;
  /** Player faction standing */
  factionStanding?: number;
  /** Requested difficulty (optional, will be varied if not specified) */
  difficulty?: MissionDifficulty;
  /** Number of missions to generate */
  count?: number;
}

/**
 * Configuration for a mission terminal
 */
export interface MissionTerminalConfig {
  /** Terminal type */
  type: MissionTerminalType;
  /** Mission types this terminal can generate */
  missionTypes: GeneratedMissionType[];
  /** Level range multiplier for missions (relative to player level) */
  levelRangeMin: number;
  levelRangeMax: number;
  /** Base credit reward multiplier */
  creditMultiplier: number;
  /** Maximum distance from terminal for mission locations */
  maxDistance: number;
  /** Minimum distance from terminal */
  minDistance: number;
  /** Required faction (if any) */
  requiredFaction?: string;
  /** Required skills (if any) */
  requiredSkills?: string[];
  /** Time limit range in seconds */
  timeLimitMin: number;
  timeLimitMax: number;
}

/**
 * Creature spawn for destroy missions
 */
export interface LairSpawnConfig {
  /** Lair template */
  lairTemplate: string;
  /** Creature templates that spawn from this lair */
  creatureTemplates: string[];
  /** Minimum creature level */
  minLevel: number;
  /** Maximum creature level */
  maxLevel: number;
  /** Difficulty rating */
  difficulty: MissionDifficulty;
  /** Biomes where this lair can spawn */
  biomes?: string[];
}

/**
 * NPC configuration for bounty/assassination missions
 */
export interface BountyTargetConfig {
  /** NPC template */
  template: string;
  /** Display name */
  name: string;
  /** Level range */
  minLevel: number;
  maxLevel: number;
  /** Faction */
  faction?: string;
  /** Base bounty reward */
  baseReward: number;
  /** Possible spawn locations */
  spawnLocations: MissionLocation[];
}

/**
 * Default terminal configurations
 */
export const DEFAULT_TERMINAL_CONFIGS: Record<MissionTerminalType, MissionTerminalConfig> = {
  [MissionTerminalType.GENERAL]: {
    type: MissionTerminalType.GENERAL,
    missionTypes: [GeneratedMissionType.DESTROY, GeneratedMissionType.DELIVER],
    levelRangeMin: -5,
    levelRangeMax: 5,
    creditMultiplier: 1.0,
    maxDistance: 2000,
    minDistance: 200,
    timeLimitMin: 0,
    timeLimitMax: 0,
  },
  [MissionTerminalType.BOUNTY_HUNTER]: {
    type: MissionTerminalType.BOUNTY_HUNTER,
    missionTypes: [GeneratedMissionType.BOUNTY, GeneratedMissionType.ASSASSIN],
    levelRangeMin: 0,
    levelRangeMax: 10,
    creditMultiplier: 1.5,
    maxDistance: 5000,
    minDistance: 500,
    requiredSkills: ['bounty_hunter_novice'],
    timeLimitMin: 1800,
    timeLimitMax: 7200,
  },
  [MissionTerminalType.ARTISAN]: {
    type: MissionTerminalType.ARTISAN,
    missionTypes: [GeneratedMissionType.DELIVER, GeneratedMissionType.SURVEY],
    levelRangeMin: -10,
    levelRangeMax: 0,
    creditMultiplier: 0.8,
    maxDistance: 3000,
    minDistance: 300,
    requiredSkills: ['artisan_novice'],
    timeLimitMin: 0,
    timeLimitMax: 3600,
  },
  [MissionTerminalType.ENTERTAINER]: {
    type: MissionTerminalType.ENTERTAINER,
    missionTypes: [GeneratedMissionType.DELIVER, GeneratedMissionType.ESCORT],
    levelRangeMin: -10,
    levelRangeMax: 0,
    creditMultiplier: 0.7,
    maxDistance: 2000,
    minDistance: 200,
    requiredSkills: ['entertainer_novice'],
    timeLimitMin: 0,
    timeLimitMax: 1800,
  },
  [MissionTerminalType.SCOUT]: {
    type: MissionTerminalType.SCOUT,
    missionTypes: [GeneratedMissionType.HUNTING, GeneratedMissionType.RECON],
    levelRangeMin: -5,
    levelRangeMax: 10,
    creditMultiplier: 1.0,
    maxDistance: 4000,
    minDistance: 400,
    requiredSkills: ['scout_novice'],
    timeLimitMin: 0,
    timeLimitMax: 0,
  },
  [MissionTerminalType.REBEL]: {
    type: MissionTerminalType.REBEL,
    missionTypes: [
      GeneratedMissionType.DESTROY,
      GeneratedMissionType.ASSASSIN,
      GeneratedMissionType.DELIVER,
      GeneratedMissionType.RECON,
    ],
    levelRangeMin: 0,
    levelRangeMax: 15,
    creditMultiplier: 1.2,
    maxDistance: 5000,
    minDistance: 500,
    requiredFaction: 'rebel',
    timeLimitMin: 1800,
    timeLimitMax: 7200,
  },
  [MissionTerminalType.IMPERIAL]: {
    type: MissionTerminalType.IMPERIAL,
    missionTypes: [
      GeneratedMissionType.DESTROY,
      GeneratedMissionType.ASSASSIN,
      GeneratedMissionType.DELIVER,
      GeneratedMissionType.RECON,
    ],
    levelRangeMin: 0,
    levelRangeMax: 15,
    creditMultiplier: 1.2,
    maxDistance: 5000,
    minDistance: 500,
    requiredFaction: 'imperial',
    timeLimitMin: 1800,
    timeLimitMax: 7200,
  },
  [MissionTerminalType.SMUGGLER]: {
    type: MissionTerminalType.SMUGGLER,
    missionTypes: [GeneratedMissionType.DELIVER, GeneratedMissionType.ESCORT],
    levelRangeMin: -5,
    levelRangeMax: 10,
    creditMultiplier: 1.3,
    maxDistance: 4000,
    minDistance: 500,
    requiredSkills: ['smuggler_novice'],
    timeLimitMin: 900,
    timeLimitMax: 3600,
  },
};

/**
 * Credit reward calculation by difficulty
 */
export const DIFFICULTY_CREDIT_MULTIPLIERS: Record<MissionDifficulty, number> = {
  [MissionDifficulty.EASY]: 0.5,
  [MissionDifficulty.MEDIUM]: 1.0,
  [MissionDifficulty.HARD]: 1.5,
  [MissionDifficulty.ELITE]: 2.5,
};

/**
 * Base credit rewards by mission type
 */
export const BASE_CREDIT_REWARDS: Record<GeneratedMissionType, number> = {
  [GeneratedMissionType.DESTROY]: 500,
  [GeneratedMissionType.DELIVER]: 200,
  [GeneratedMissionType.HUNTING]: 400,
  [GeneratedMissionType.BOUNTY]: 1000,
  [GeneratedMissionType.SURVEY]: 150,
  [GeneratedMissionType.ESCORT]: 600,
  [GeneratedMissionType.RECON]: 300,
  [GeneratedMissionType.ASSASSIN]: 1200,
};

/**
 * Level scaling for credit rewards (credits per level)
 */
export const LEVEL_CREDIT_SCALING = 50;

/**
 * Validates mission generation parameters
 */
export function validateGenerationParams(params: MissionGenerationParams): string[] {
  const errors: string[] = [];

  if (!params.terminalType) {
    errors.push('Terminal type is required');
  }

  if (!params.planet) {
    errors.push('Planet is required');
  }

  if (!params.terminalLocation) {
    errors.push('Terminal location is required');
  }

  if (typeof params.playerLevel !== 'number' || params.playerLevel < 1) {
    errors.push('Valid player level is required');
  }

  if (params.count !== undefined && (params.count < 1 || params.count > 20)) {
    errors.push('Mission count must be between 1 and 20');
  }

  return errors;
}

/**
 * Calculates credit reward for a mission
 */
export function calculateCreditReward(
  missionType: GeneratedMissionType,
  difficulty: MissionDifficulty,
  level: number,
  terminalMultiplier: number
): number {
  const baseReward = BASE_CREDIT_REWARDS[missionType];
  const difficultyMultiplier = DIFFICULTY_CREDIT_MULTIPLIERS[difficulty];
  const levelBonus = level * LEVEL_CREDIT_SCALING;

  return Math.floor((baseReward + levelBonus) * difficultyMultiplier * terminalMultiplier);
}

/**
 * Determines difficulty based on level difference
 */
export function determineDifficulty(missionLevel: number, playerLevel: number): MissionDifficulty {
  const levelDiff = missionLevel - playerLevel;

  if (levelDiff <= -5) {
    return MissionDifficulty.EASY;
  } else if (levelDiff <= 0) {
    return MissionDifficulty.MEDIUM;
  } else if (levelDiff <= 5) {
    return MissionDifficulty.HARD;
  } else {
    return MissionDifficulty.ELITE;
  }
}

/**
 * Generates a mission ID
 */
export function generateMissionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `mission_${timestamp}_${random}`;
}

/**
 * Type guard for terminal type
 */
export function isValidTerminalType(type: string): type is MissionTerminalType {
  return Object.values(MissionTerminalType).includes(type as MissionTerminalType);
}

/**
 * Type guard for mission difficulty
 */
export function isValidDifficulty(difficulty: string): difficulty is MissionDifficulty {
  return Object.values(MissionDifficulty).includes(difficulty as MissionDifficulty);
}

/**
 * Type guard for generated mission type
 */
export function isValidMissionType(type: string): type is GeneratedMissionType {
  return Object.values(GeneratedMissionType).includes(type as GeneratedMissionType);
}
