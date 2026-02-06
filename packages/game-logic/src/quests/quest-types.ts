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
  z?: number | undefined;
  /** Radius around the point for location-based objectives */
  radius?: number | undefined;
  /** Building or POI name (optional) */
  buildingName?: string | undefined;
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
  location?: QuestLocation | undefined;
  /** Whether this objective is optional */
  optional: boolean;
  /** Description shown in the journal */
  description?: string | undefined;
  /** Order in which objectives must be completed (0 = any order) */
  sequenceOrder?: number | undefined;
  /** Time limit in seconds (0 = no limit) */
  timeLimit?: number | undefined;
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
  itemTemplate?: string | undefined;
  /** Quantity for ITEM rewards */
  itemQuantity?: number | undefined;
  /** XP type for XP rewards */
  xpType?: string | undefined;
  /** Faction name for FACTION rewards */
  factionType?: string | undefined;
  /** Skill name for SKILL rewards */
  skillName?: string | undefined;
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
  minAmount?: number | undefined;
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
  questGiver?: string | undefined;
  /** Time limit in seconds (0 = no limit) */
  timeLimit?: number | undefined;
  /** Category for journal organization */
  category?: string | undefined;
  /** Journal entry text (can differ from description) */
  journalText?: string | undefined;
  /** Whether quest is hidden from journal until discovered */
  hidden?: boolean | undefined;
  /** Minimum group size required */
  minGroupSize?: number | undefined;
  /** Maximum group size allowed */
  maxGroupSize?: number | undefined;
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
  branch?: string | undefined;
  /** Whether this is a branch point (multiple nextQuests) */
  isBranchPoint?: boolean | undefined;
  /** Whether this is a chain finale */
  isFinale?: boolean | undefined;
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
  faction?: string | undefined;
  /** Minimum level to start */
  minLevel?: number | undefined;
  /** Final rewards for completing the entire chain */
  chainRewards?: QuestReward[] | undefined;
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
  prerequisites?: QuestPrerequisiteData[] | undefined;
  questGiver?: string | undefined;
  timeLimit?: number | undefined;
  category?: string | undefined;
  journalText?: string | undefined;
  hidden?: boolean | undefined;
  minGroupSize?: number | undefined;
  maxGroupSize?: number | undefined;
  // Theme park fields
  questChain?: string | undefined;
  position?: number | undefined;
  nextQuests?: string[] | undefined;
  branch?: string | undefined;
  isBranchPoint?: boolean | undefined;
  isFinale?: boolean | undefined;
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
    z?: number | undefined;
    radius?: number | undefined;
    buildingName?: string | undefined;
  } | undefined;
  optional?: boolean | undefined;
  description?: string | undefined;
  sequenceOrder?: number | undefined;
  timeLimit?: number | undefined;
}

/**
 * Raw reward data from datatable
 */
export interface QuestRewardData {
  type: string;
  value: number;
  itemTemplate?: string | undefined;
  itemQuantity?: number | undefined;
  xpType?: string | undefined;
  factionType?: string | undefined;
  skillName?: string | undefined;
}

/**
 * Raw prerequisite data from datatable
 */
export interface QuestPrerequisiteData {
  type: string;
  value: string | number;
  minAmount?: number | undefined;
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
    z?: number | undefined;
  };
  questIds: string[];
  faction?: string | undefined;
  minLevel?: number | undefined;
  chainRewards?: QuestRewardData[] | undefined;
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
