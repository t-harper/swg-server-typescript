/**
 * Jedi Types
 * Type definitions for the Jedi progression system (pre-NGE style)
 * Includes force alignment, ranks, visibility, and skill definitions
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';

// ============================================
// Force Alignment
// ============================================

/**
 * Force alignment determines light/dark side affinity
 * Affects available force powers and NPC interactions
 */
export enum ForceAlignment {
  /** Aligned with the light side of the Force */
  LIGHT = 'light',
  /** Aligned with the dark side of the Force */
  DARK = 'dark',
  /** Neutral, balanced between light and dark */
  NEUTRAL = 'neutral',
}

/**
 * Alignment thresholds for determining alignment state
 * Range is -1000 (full dark) to +1000 (full light)
 */
export const AlignmentThresholds = {
  /** Threshold for being considered light side aligned */
  LIGHT_THRESHOLD: 200,
  /** Threshold for being considered dark side aligned */
  DARK_THRESHOLD: -200,
  /** Maximum alignment value */
  MAX_ALIGNMENT: 1000,
  /** Minimum alignment value */
  MIN_ALIGNMENT: -1000,
} as const;

// ============================================
// Jedi Rank
// ============================================

/**
 * Jedi ranks representing progression through the Force-sensitive path
 * Pre-NGE style with distinct light/dark paths
 */
export enum JediRank {
  /** Initial rank, just beginning Force training */
  INITIATE = 'initiate',
  /** Apprentice level, learning under guidance */
  PADAWAN = 'padawan',
  /** Full Jedi status, completed basic training */
  KNIGHT = 'knight',
  /** Highest light-side rank, teacher and leader */
  MASTER = 'master',
  /** Dark side equivalent of Knight */
  DARK_JEDI = 'dark_jedi',
  /** Highest dark-side rank */
  SITH_LORD = 'sith_lord',
}

/**
 * Maps ranks to their required alignment
 */
export const RankAlignmentRequirements: Record<JediRank, ForceAlignment | null> = {
  [JediRank.INITIATE]: null,
  [JediRank.PADAWAN]: null,
  [JediRank.KNIGHT]: ForceAlignment.LIGHT,
  [JediRank.MASTER]: ForceAlignment.LIGHT,
  [JediRank.DARK_JEDI]: ForceAlignment.DARK,
  [JediRank.SITH_LORD]: ForceAlignment.DARK,
};

// ============================================
// Jedi Visibility
// ============================================

/**
 * Visibility levels determine how likely a Jedi is to attract
 * Imperial attention and bounty hunters
 */
export enum JediVisibilityLevel {
  /** No visibility, completely hidden */
  HIDDEN = 'hidden',
  /** Low visibility, minor risk */
  LOW = 'low',
  /** Medium visibility, moderate risk */
  MEDIUM = 'medium',
  /** High visibility, significant risk */
  HIGH = 'high',
  /** Fully exposed, maximum bounty hunter activity */
  EXPOSED = 'exposed',
}

/**
 * Visibility thresholds for each level
 */
export const VisibilityThresholds = {
  [JediVisibilityLevel.HIDDEN]: 0,
  [JediVisibilityLevel.LOW]: 100,
  [JediVisibilityLevel.MEDIUM]: 500,
  [JediVisibilityLevel.HIGH]: 1500,
  [JediVisibilityLevel.EXPOSED]: 3000,
} as const;

/**
 * Types of events that generate visibility
 */
export enum VisibilityEventType {
  /** Using a force power in public */
  FORCE_POWER_USE = 'force_power_use',
  /** Engaging in lightsaber combat */
  LIGHTSABER_COMBAT = 'lightsaber_combat',
  /** Drawing or displaying a lightsaber */
  LIGHTSABER_DRAWN = 'lightsaber_drawn',
  /** Witnessed by NPC or player */
  WITNESSED = 'witnessed',
  /** Killed an Imperial NPC */
  IMPERIAL_KILL = 'imperial_kill',
  /** Failed to evade bounty hunter */
  BOUNTY_HUNTER_ESCAPE_FAILED = 'bounty_hunter_escape_failed',
  /** Reported by another player */
  PLAYER_REPORT = 'player_report',
}

/**
 * Base visibility amounts for each event type
 */
export const VisibilityEventAmounts: Record<VisibilityEventType, number> = {
  [VisibilityEventType.FORCE_POWER_USE]: 25,
  [VisibilityEventType.LIGHTSABER_COMBAT]: 50,
  [VisibilityEventType.LIGHTSABER_DRAWN]: 10,
  [VisibilityEventType.WITNESSED]: 15,
  [VisibilityEventType.IMPERIAL_KILL]: 100,
  [VisibilityEventType.BOUNTY_HUNTER_ESCAPE_FAILED]: 200,
  [VisibilityEventType.PLAYER_REPORT]: 75,
};

// ============================================
// Force Sensitive Status
// ============================================

/**
 * Force-sensitive status representing the unlock progression
 * Pre-NGE holocron/village system
 */
export enum ForceSensitiveStatus {
  /** Not force sensitive, cannot become Jedi */
  NOT_SENSITIVE = 'not_sensitive',
  /** Glowing blue (early stage, needs more holocrons) */
  GLOWING = 'glowing',
  /** Aware of Force sensitivity, can visit village */
  AWARE = 'aware',
  /** Fully unlocked, can learn Jedi skills */
  UNLOCKED = 'unlocked',
}

/**
 * Requirements for each force sensitive status
 */
export const ForceSensitiveRequirements = {
  /** Number of professions to master before glowing */
  PROFESSIONS_FOR_GLOWING: 5,
  /** Number of holocrons found to become aware */
  HOLOCRONS_FOR_AWARE: 5,
  /** Village quests completed for unlock */
  VILLAGE_QUESTS_FOR_UNLOCK: 6,
} as const;

// ============================================
// Jedi Skill Branch
// ============================================

/**
 * Jedi skill branches (trees) for organizing abilities
 */
export enum JediSkillBranch {
  /** Lightsaber combat techniques */
  LIGHTSABER = 'lightsaber',
  /** Offensive and utility force powers */
  FORCE_POWERS = 'force_powers',
  /** Self-enhancement abilities */
  FORCE_ENHANCEMENT = 'force_enhancement',
  /** Healing and support abilities */
  FORCE_HEALING = 'force_healing',
  /** Defensive abilities and resistances */
  FORCE_DEFENSE = 'force_defense',
}

/**
 * Display names for skill branches
 */
export const JediSkillBranchNames: Record<JediSkillBranch, string> = {
  [JediSkillBranch.LIGHTSABER]: 'Lightsaber',
  [JediSkillBranch.FORCE_POWERS]: 'Force Powers',
  [JediSkillBranch.FORCE_ENHANCEMENT]: 'Force Enhancement',
  [JediSkillBranch.FORCE_HEALING]: 'Force Healing',
  [JediSkillBranch.FORCE_DEFENSE]: 'Force Defense',
};

// ============================================
// Jedi Skill Interface
// ============================================

/**
 * Represents a single Jedi skill in the skill tree
 */
export interface JediSkill {
  /** Unique skill identifier */
  skillName: string;
  /** Display name for the skill */
  displayName: string;
  /** Skill branch this belongs to */
  branch: JediSkillBranch;
  /** Tier within the branch (1-4, with 4 being master tier) */
  tier: number;
  /** List of prerequisite skill names */
  prerequisites: string[];
  /** Skill mods granted by this skill (mod name -> value) */
  skillMods: Map<string, number>;
  /** Force point cost to use abilities granted */
  forcePointCost: number;
  /** Jedi XP required to learn */
  xpCost: number;
  /** Commands/abilities granted */
  commands: string[];
  /** Whether this is a master box in the branch */
  isMaster: boolean;
  /** Required rank to learn */
  requiredRank: JediRank;
  /** Required alignment (null for any) */
  requiredAlignment: ForceAlignment | null;
  /** Description of the skill */
  description: string;
}

/**
 * Raw skill data as loaded from datatable JSON
 */
export interface JediSkillData {
  skillName: string;
  displayName: string;
  branch: string;
  tier: number;
  prerequisites: string[];
  skillMods: Record<string, number>;
  forcePointCost: number;
  xpCost: number;
  commands: string[];
  isMaster: boolean;
  requiredRank: string;
  requiredAlignment: string | null;
  description: string;
}

// ============================================
// Force Rank Interface
// ============================================

/**
 * Represents a force rank with its requirements and benefits
 */
export interface ForceRank {
  /** The rank identifier */
  rank: JediRank;
  /** Display title for this rank */
  title: string;
  /** Total Jedi XP required to achieve this rank */
  xpRequired: number;
  /** Number of Jedi skill points granted at this rank */
  skillPointsGranted: number;
  /** Force power pool bonus */
  forcePowerBonus: number;
  /** Force regeneration bonus */
  forceRegenBonus: number;
}

/**
 * Force rank definitions with requirements
 */
export const ForceRanks: Record<JediRank, ForceRank> = {
  [JediRank.INITIATE]: {
    rank: JediRank.INITIATE,
    title: 'Force Initiate',
    xpRequired: 0,
    skillPointsGranted: 10,
    forcePowerBonus: 0,
    forceRegenBonus: 0,
  },
  [JediRank.PADAWAN]: {
    rank: JediRank.PADAWAN,
    title: 'Jedi Padawan',
    xpRequired: 50000,
    skillPointsGranted: 20,
    forcePowerBonus: 100,
    forceRegenBonus: 5,
  },
  [JediRank.KNIGHT]: {
    rank: JediRank.KNIGHT,
    title: 'Jedi Knight',
    xpRequired: 200000,
    skillPointsGranted: 35,
    forcePowerBonus: 250,
    forceRegenBonus: 10,
  },
  [JediRank.MASTER]: {
    rank: JediRank.MASTER,
    title: 'Jedi Master',
    xpRequired: 500000,
    skillPointsGranted: 50,
    forcePowerBonus: 500,
    forceRegenBonus: 20,
  },
  [JediRank.DARK_JEDI]: {
    rank: JediRank.DARK_JEDI,
    title: 'Dark Jedi',
    xpRequired: 200000,
    skillPointsGranted: 35,
    forcePowerBonus: 250,
    forceRegenBonus: 10,
  },
  [JediRank.SITH_LORD]: {
    rank: JediRank.SITH_LORD,
    title: 'Sith Lord',
    xpRequired: 500000,
    skillPointsGranted: 50,
    forcePowerBonus: 500,
    forceRegenBonus: 20,
  },
};

// ============================================
// Visibility Event Interface
// ============================================

/**
 * Represents a visibility-generating event
 */
export interface VisibilityEvent {
  /** Type of event that occurred */
  type: VisibilityEventType;
  /** Amount of visibility generated */
  amount: number;
  /** Timestamp when the event occurred */
  timestamp: number;
  /** Location where the event occurred */
  location: Vector3;
  /** Zone/planet where the event occurred */
  zone: string;
  /** Whether there were witnesses */
  witnessed: boolean;
  /** Number of witnesses (affects amount) */
  witnessCount: number;
}

// ============================================
// Temporary Enemy Flag (TEF)
// ============================================

/**
 * TEF types for PvP flagging
 */
export enum TefType {
  /** Standard Jedi TEF, attackable by anyone */
  JEDI = 'jedi',
  /** Bounty hunter TEF, can be attacked by target */
  BOUNTY_HUNTER = 'bounty_hunter',
  /** Overt faction TEF */
  FACTION = 'faction',
}

/**
 * TEF durations in milliseconds
 */
export const TefDurations: Record<TefType, number> = {
  [TefType.JEDI]: 5 * 60 * 1000, // 5 minutes
  [TefType.BOUNTY_HUNTER]: 15 * 60 * 1000, // 15 minutes
  [TefType.FACTION]: 5 * 60 * 1000, // 5 minutes
};

/**
 * Represents an active TEF on a player
 */
export interface TemporaryEnemyFlag {
  /** Type of TEF */
  type: TefType;
  /** When the TEF was applied */
  appliedAt: number;
  /** When the TEF expires */
  expiresAt: number;
  /** Source of the TEF (player/NPC who caused it) */
  sourceId: ObjectId | null;
  /** Whether the TEF can be refreshed by actions */
  refreshable: boolean;
}

// ============================================
// Jedi Player State
// ============================================

/**
 * Complete Jedi state for a player
 */
export interface JediPlayerState {
  /** Player's object ID */
  playerId: ObjectId;
  /** Force-sensitive status */
  forceSensitiveStatus: ForceSensitiveStatus;
  /** Current Jedi rank */
  rank: JediRank;
  /** Force alignment value (-1000 to +1000) */
  alignmentValue: number;
  /** Current force power pool */
  forcePower: number;
  /** Maximum force power pool */
  maxForcePower: number;
  /** Current visibility amount */
  visibility: number;
  /** Jedi XP earned */
  jediXp: number;
  /** Jedi skill points available */
  jediSkillPoints: number;
  /** Learned Jedi skills */
  learnedSkills: Set<string>;
  /** Active TEFs */
  activeTefs: TemporaryEnemyFlag[];
  /** Visibility event history */
  visibilityHistory: VisibilityEvent[];
  /** Number of Jedi deaths (for permadeath tracking) */
  deathCount: number;
  /** Holocrons found (for unlock progression) */
  holocronsFound: number;
  /** Village quests completed */
  villageQuestsCompleted: number;
  /** Timestamp of last visibility decay tick */
  lastVisibilityDecay: number;
}

// ============================================
// Jedi Death Penalty
// ============================================

/**
 * Death penalty configuration for Jedi
 * Pre-NGE style with potential permadeath
 */
export interface JediDeathPenalty {
  /** XP loss percentage on death */
  xpLossPercent: number;
  /** Whether skills can be lost */
  skillLossEnabled: boolean;
  /** Number of deaths before permadeath */
  livesBeforePermadeath: number;
  /** Grace period after clone where visibility is reduced */
  cloneGracePeriod: number;
}

/**
 * Default death penalty settings
 */
export const DefaultJediDeathPenalty: JediDeathPenalty = {
  xpLossPercent: 5,
  skillLossEnabled: true,
  livesBeforePermadeath: 3,
  cloneGracePeriod: 60 * 1000, // 1 minute
};

// ============================================
// Utility Functions
// ============================================

/**
 * Convert raw skill data to JediSkill
 */
export function convertToJediSkill(data: JediSkillData): JediSkill {
  return {
    ...data,
    branch: data.branch as JediSkillBranch,
    skillMods: new Map(Object.entries(data.skillMods)),
    requiredRank: data.requiredRank as JediRank,
    requiredAlignment: data.requiredAlignment as ForceAlignment | null,
  };
}

/**
 * Convert JediSkill to serializable data
 */
export function convertToJediSkillData(skill: JediSkill): JediSkillData {
  return {
    ...skill,
    skillMods: Object.fromEntries(skill.skillMods),
  };
}

/**
 * Get force alignment from alignment value
 */
export function getAlignmentFromValue(value: number): ForceAlignment {
  if (value >= AlignmentThresholds.LIGHT_THRESHOLD) {
    return ForceAlignment.LIGHT;
  }
  if (value <= AlignmentThresholds.DARK_THRESHOLD) {
    return ForceAlignment.DARK;
  }
  return ForceAlignment.NEUTRAL;
}

/**
 * Get visibility level from visibility amount
 */
export function getVisibilityLevel(visibility: number): JediVisibilityLevel {
  if (visibility >= VisibilityThresholds[JediVisibilityLevel.EXPOSED]) {
    return JediVisibilityLevel.EXPOSED;
  }
  if (visibility >= VisibilityThresholds[JediVisibilityLevel.HIGH]) {
    return JediVisibilityLevel.HIGH;
  }
  if (visibility >= VisibilityThresholds[JediVisibilityLevel.MEDIUM]) {
    return JediVisibilityLevel.MEDIUM;
  }
  if (visibility >= VisibilityThresholds[JediVisibilityLevel.LOW]) {
    return JediVisibilityLevel.LOW;
  }
  return JediVisibilityLevel.HIDDEN;
}

/**
 * Check if a rank is a dark side rank
 */
export function isDarkSideRank(rank: JediRank): boolean {
  return rank === JediRank.DARK_JEDI || rank === JediRank.SITH_LORD;
}

/**
 * Check if a rank is a light side rank
 */
export function isLightSideRank(rank: JediRank): boolean {
  return rank === JediRank.KNIGHT || rank === JediRank.MASTER;
}

/**
 * Create a default Jedi player state
 */
export function createDefaultJediState(playerId: ObjectId): JediPlayerState {
  return {
    playerId,
    forceSensitiveStatus: ForceSensitiveStatus.NOT_SENSITIVE,
    rank: JediRank.INITIATE,
    alignmentValue: 0,
    forcePower: 100,
    maxForcePower: 100,
    visibility: 0,
    jediXp: 0,
    jediSkillPoints: 0,
    learnedSkills: new Set(),
    activeTefs: [],
    visibilityHistory: [],
    deathCount: 0,
    holocronsFound: 0,
    villageQuestsCompleted: 0,
    lastVisibilityDecay: Date.now(),
  };
}
