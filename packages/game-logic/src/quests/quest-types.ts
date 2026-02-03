/**
 * @file quest-types.ts
 * Core types for the SWG quest system
 */

/**
 * Types of quests available in SWG
 */
export enum QuestType {
  /** Deliver an item to an NPC */
  DELIVERY = 'delivery',
  /** Kill a specific target or number of targets */
  KILL = 'kill',
  /** Escort an NPC to a destination */
  ESCORT = 'escort',
  /** Collect specific items */
  COLLECTION = 'collection',
  /** Visit specific locations */
  EXPLORATION = 'exploration',
  /** Have conversations with NPCs */
  CONVERSATION = 'conversation',
  /** Craft specific items */
  CRAFTING = 'crafting',
}

/**
 * Current status of a quest for a player
 */
export enum QuestStatus {
  /** Quest is available to be accepted */
  AVAILABLE = 'available',
  /** Quest has been accepted and is in progress */
  ACTIVE = 'active',
  /** Quest has been completed successfully */
  COMPLETED = 'completed',
  /** Quest has been failed */
  FAILED = 'failed',
  /** Quest was abandoned by the player */
  ABANDONED = 'abandoned',
}

/**
 * Types of objectives within a quest
 */
export enum ObjectiveType {
  /** Kill a specific NPC */
  KILL_NPC = 'kill_npc',
  /** Kill a type of creature */
  KILL_CREATURE = 'kill_creature',
  /** Deliver an item to a target */
  DELIVER_ITEM = 'deliver_item',
  /** Visit a specific location */
  VISIT_LOCATION = 'visit_location',
  /** Talk to a specific NPC */
  TALK_TO_NPC = 'talk_to_npc',
  /** Craft a specific item */
  CRAFT_ITEM = 'craft_item',
  /** Collect specific items */
  COLLECT_ITEM = 'collect_item',
  /** Escort an NPC safely */
  ESCORT_NPC = 'escort_npc',
}

/**
 * Types of rewards that can be given for quest completion
 */
export enum QuestRewardType {
  /** Credit reward */
  CREDITS = 'credits',
  /** Experience points */
  XP = 'xp',
  /** Item reward */
  ITEM = 'item',
  /** Faction standing */
  FACTION = 'faction',
  /** Skill unlock or certification */
  SKILL = 'skill',
}

/**
 * Types of prerequisites for quests
 */
export enum QuestPrerequisiteType {
  /** Minimum level requirement */
  LEVEL = 'level',
  /** Faction standing requirement */
  FACTION = 'faction',
  /** Previous quest completion requirement */
  QUEST = 'quest',
  /** Skill requirement */
  SKILL = 'skill',
  /** Species requirement */
  SPECIES = 'species',
  /** Profession requirement */
  PROFESSION = 'profession',
}

/**
 * Location data for quest objectives
 */
export interface QuestLocation {
  /** Planet name */
  planet: string;
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Z coordinate (optional) */
  z?: number;
  /** Radius around the point for location-based objectives */
  radius?: number;
  /** Building or POI name (optional) */
  buildingName?: string;
}

/**
 * Quest objective definition
 */
export interface QuestObjective {
  /** Unique identifier for the objective */
  id: string;
  /** Type of objective */
  type: ObjectiveType;
  /** Target identifier (NPC template, creature type, item template, etc.) */
  target: string;
  /** Number required to complete (kills, items, etc.) */
  count: number;
  /** Location for location-based objectives */
  location?: QuestLocation;
  /** Whether this objective is optional */
  optional: boolean;
  /** Description shown in the journal */
  description?: string;
  /** Order in which objectives must be completed (0 = any order) */
  sequenceOrder?: number;
  /** Time limit in seconds (0 = no limit) */
  timeLimit?: number;
}

/**
 * Quest reward definition
 */
export interface QuestReward {
  /** Type of reward */
  type: QuestRewardType;
  /** Numeric value (credits, XP amount, faction points) */
  value: number;
  /** Item template for ITEM rewards */
  itemTemplate?: string;
  /** Quantity for ITEM rewards */
  itemQuantity?: number;
  /** XP type for XP rewards */
  xpType?: string;
  /** Faction name for FACTION rewards */
  factionType?: string;
  /** Skill name for SKILL rewards */
  skillName?: string;
}

/**
 * Quest prerequisite definition
 */
export interface QuestPrerequisite {
  /** Type of prerequisite */
  type: QuestPrerequisiteType;
  /** Value for the prerequisite (level number, faction name, quest ID, skill name) */
  value: string | number;
  /** Minimum amount for numeric prerequisites (faction standing, level) */
  minAmount?: number;
}

/**
 * Main quest definition
 */
export interface Quest {
  /** Unique identifier for the quest */
  id: string;
  /** Display name */
  name: string;
  /** Full description */
  description: string;
  /** Type of quest */
  type: QuestType;
  /** Recommended level */
  level: number;
  /** Whether the quest can be repeated */
  repeatable: boolean;
  /** Whether the quest can be shared with group members */
  shareable: boolean;
  /** Quest objectives */
  objectives: QuestObjective[];
  /** Rewards for completion */
  rewards: QuestReward[];
  /** Prerequisites to accept the quest */
  prerequisites: QuestPrerequisite[];
  /** Quest giver NPC template */
  questGiver?: string;
  /** Time limit in seconds (0 = no limit) */
  timeLimit?: number;
  /** Category for journal organization */
  category?: string;
  /** Journal entry text (can differ from description) */
  journalText?: string;
  /** Whether quest is hidden from journal until discovered */
  hidden?: boolean;
  /** Minimum group size required */
  minGroupSize?: number;
  /** Maximum group size allowed */
  maxGroupSize?: number;
}

/**
 * Theme park quest with chain information
 */
export interface ThemeParkQuest extends Quest {
  /** Name of the quest chain (e.g., "jabba_theme_park", "nym_theme_park") */
  questChain: string;
  /** Position in the chain (0-indexed) */
  position: number;
  /** Quest IDs that can be started after completing this one */
  nextQuests: string[];
  /** Branch identifier for branching quest chains */
  branch?: string;
  /** Whether this is a branch point (multiple nextQuests) */
  isBranchPoint?: boolean;
  /** Whether this is a chain finale */
  isFinale?: boolean;
}

/**
 * Theme park chain definition
 */
export interface ThemeParkChain {
  /** Unique identifier for the chain */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Starting quest ID */
  startQuestId: string;
  /** NPC that gives the first quest */
  startNpc: string;
  /** Location of the start NPC */
  startLocation: QuestLocation;
  /** All quest IDs in this chain */
  questIds: string[];
  /** Faction associated with this chain */
  faction?: string;
  /** Minimum level to start */
  minLevel?: number;
  /** Final rewards for completing the entire chain */
  chainRewards?: QuestReward[];
}

/**
 * Quest data as loaded from datatable
 */
export interface QuestData {
  id: string;
  name: string;
  description: string;
  type: string;
  level: number;
  repeatable: boolean;
  shareable: boolean;
  objectives: QuestObjectiveData[];
  rewards: QuestRewardData[];
  prerequisites?: QuestPrerequisiteData[];
  questGiver?: string;
  timeLimit?: number;
  category?: string;
  journalText?: string;
  hidden?: boolean;
  minGroupSize?: number;
  maxGroupSize?: number;
  // Theme park fields
  questChain?: string;
  position?: number;
  nextQuests?: string[];
  branch?: string;
  isBranchPoint?: boolean;
  isFinale?: boolean;
}

/**
 * Raw objective data from datatable
 */
export interface QuestObjectiveData {
  id: string;
  type: string;
  target: string;
  count: number;
  location?: {
    planet: string;
    x: number;
    y: number;
    z?: number;
    radius?: number;
    buildingName?: string;
  };
  optional?: boolean;
  description?: string;
  sequenceOrder?: number;
  timeLimit?: number;
}

/**
 * Raw reward data from datatable
 */
export interface QuestRewardData {
  type: string;
  value: number;
  itemTemplate?: string;
  itemQuantity?: number;
  xpType?: string;
  factionType?: string;
  skillName?: string;
}

/**
 * Raw prerequisite data from datatable
 */
export interface QuestPrerequisiteData {
  type: string;
  value: string | number;
  minAmount?: number;
}

/**
 * Theme park chain data from datatable
 */
export interface ThemeParkChainData {
  id: string;
  name: string;
  description: string;
  startQuestId: string;
  startNpc: string;
  startLocation: {
    planet: string;
    x: number;
    y: number;
    z?: number;
  };
  questIds: string[];
  faction?: string;
  minLevel?: number;
  chainRewards?: QuestRewardData[];
}

/**
 * Result codes for quest operations
 */
export enum QuestResultCode {
  SUCCESS = 0,
  NOT_FOUND = 1,
  INVALID_DATA = 2,
  LOAD_ERROR = 3,
  DUPLICATE_ID = 4,
  MISSING_DEPENDENCY = 5,
  PREREQUISITES_NOT_MET = 6,
  ALREADY_ACTIVE = 7,
  ALREADY_COMPLETED = 8,
  NOT_ACTIVE = 9,
  QUEST_FULL = 10,
  CHAIN_BROKEN = 11,
}

/**
 * Type guards
 */
export function isThemeParkQuest(quest: Quest): quest is ThemeParkQuest {
  return 'questChain' in quest && 'position' in quest && 'nextQuests' in quest;
}

/**
 * Validate quest type string
 */
export function isValidQuestType(type: string): type is QuestType {
  return Object.values(QuestType).includes(type as QuestType);
}

/**
 * Validate objective type string
 */
export function isValidObjectiveType(type: string): type is ObjectiveType {
  return Object.values(ObjectiveType).includes(type as ObjectiveType);
}

/**
 * Validate reward type string
 */
export function isValidRewardType(type: string): type is QuestRewardType {
  return Object.values(QuestRewardType).includes(type as QuestRewardType);
}

/**
 * Validate prerequisite type string
 */
export function isValidPrerequisiteType(type: string): type is QuestPrerequisiteType {
  return Object.values(QuestPrerequisiteType).includes(type as QuestPrerequisiteType);
}
