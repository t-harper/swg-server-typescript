/**
 * Creature Template System
 * Defines templates for spawning NPCs and creatures with configurable stats,
 * combat attributes, movement, faction, loot, and AI behavior.
 */

/**
 * Creature difficulty levels
 * Affects stat multipliers and special abilities
 */
export enum CreatureDifficulty {
  /** Standard creature, no bonuses */
  Normal = 1,
  /** Elite creature with enhanced stats */
  Elite = 2,
  /** Boss creature with significant bonuses and special abilities */
  Boss = 3,
}

/**
 * Stat range for randomization [min, max]
 */
export type StatRange = [number, number];

/**
 * Equipment entry for creature equipment
 */
export interface CreatureEquipment {
  /** Equipment slot name */
  slot: string;
  /** Template path for the equipment */
  template: string;
  /** Chance to spawn with this equipment (0-1) */
  chance?: number;
}

/**
 * Special ability for boss creatures
 */
export interface CreatureSpecialAbility {
  /** Ability name/identifier */
  name: string;
  /** Cooldown in milliseconds */
  cooldown: number;
  /** Damage or effect magnitude */
  magnitude?: number;
  /** Chance to use (0-1), default 1 */
  chance?: number;
}

/**
 * Creature Template Interface
 * Defines all properties for spawning a creature
 */
export interface CreatureTemplate {
  // ============================================
  // Identity
  // ============================================

  /** Unique template identifier (e.g., "womp_rat") */
  templateName: string;

  /** Display name shown to players */
  displayName: string;

  /** Optional description */
  description?: string;

  // ============================================
  // Stats
  // ============================================

  /** Combat level */
  level: number;

  /** Difficulty class (normal, elite, boss) */
  difficulty: CreatureDifficulty;

  // ============================================
  // HAM Ranges (min-max for randomization)
  // ============================================

  /** Health pool range */
  healthRange: StatRange;

  /** Action pool range */
  actionRange: StatRange;

  /** Mind pool range */
  mindRange: StatRange;

  // ============================================
  // Combat
  // ============================================

  /** Base damage range [min, max] */
  damageRange: StatRange;

  /** Attack speed in seconds between attacks */
  attackSpeed: number;

  /** Armor value (damage reduction) */
  armor: number;

  /** Base accuracy value */
  accuracy: number;

  /** Damage type dealt (kinetic, energy, etc.) */
  damageType?: string;

  /** Weapon template path (optional) */
  weaponTemplate?: string;

  /** Special abilities (for elite/boss) */
  specialAbilities?: CreatureSpecialAbility[];

  // ============================================
  // Movement
  // ============================================

  /** Walking speed in meters per second */
  walkSpeed: number;

  /** Running speed in meters per second */
  runSpeed: number;

  /** Turn rate in radians per second */
  turnRate?: number;

  // ============================================
  // Faction
  // ============================================

  /** Faction identifier (e.g., "imperial", "rebel", "tusken") */
  faction: string;

  /** Aggro radius - 0 means passive, > 0 means aggressive */
  aggressiveRadius: number;

  /** Assist radius - range to help nearby allies of same faction */
  assistRadius: number;

  /** Whether this creature is pvp-flagged */
  pvpEnabled?: boolean;

  // ============================================
  // Loot
  // ============================================

  /** Loot table identifier */
  lootTable: string;

  /** Base XP value awarded on kill */
  xpValue: number;

  /** Credit drop range [min, max] */
  creditRange?: StatRange;

  // ============================================
  // AI
  // ============================================

  /** Behavior tree identifier */
  behaviorTree: string;

  /** Social group for group AI behavior */
  socialGroup: string;

  /** Leash distance - max distance from spawn before returning */
  leashDistance?: number;

  /** Roam radius - distance creature wanders from spawn */
  roamRadius?: number;

  /** Patrol path identifier (optional) */
  patrolPath?: string;

  // ============================================
  // Appearance
  // ============================================

  /** Appearance template path (IFF file path) */
  appearanceTemplate: string;

  /** Scale factor (1.0 = normal) */
  scale: number;

  /** Optional equipment loadout */
  equipment?: CreatureEquipment[];

  /** Tint/color customization data */
  customization?: Uint8Array;
}

/**
 * Rolled creature stats after randomization
 */
export interface CreatureStats {
  /** Final health value */
  health: number;

  /** Final action value */
  action: number;

  /** Final mind value */
  mind: number;

  /** Final damage value */
  damage: number;

  /** Level (may be adjusted by difficulty) */
  level: number;

  /** Applied difficulty multiplier */
  difficultyMultiplier: number;
}

/**
 * Difficulty multipliers for stat scaling
 */
export const DIFFICULTY_MULTIPLIERS: Record<CreatureDifficulty, DifficultyModifiers> = {
  [CreatureDifficulty.Normal]: {
    health: 1.0,
    damage: 1.0,
    armor: 1.0,
    xp: 1.0,
  },
  [CreatureDifficulty.Elite]: {
    health: 2.0,
    damage: 1.5,
    armor: 1.5,
    xp: 2.0,
  },
  [CreatureDifficulty.Boss]: {
    health: 5.0,
    damage: 2.0,
    armor: 2.0,
    xp: 5.0,
  },
};

/**
 * Difficulty modifiers structure
 */
export interface DifficultyModifiers {
  /** Health multiplier */
  health: number;
  /** Damage multiplier */
  damage: number;
  /** Armor multiplier */
  armor: number;
  /** XP reward multiplier */
  xp: number;
}

/**
 * Known faction identifiers
 */
export const Factions = {
  NEUTRAL: 'neutral',
  IMPERIAL: 'imperial',
  REBEL: 'rebel',
  TUSKEN: 'tusken',
  JABBA: 'jabba',
  CREATURE: 'creature',
  NPC: 'npc',
  DROID: 'droid',
  JAWA: 'jawa',
  GUNGAN: 'gungan',
} as const;

export type FactionType = (typeof Factions)[keyof typeof Factions];

/**
 * Common behavior trees
 */
export const BehaviorTrees = {
  /** Passive - only attacks if attacked */
  PASSIVE: 'bt_passive',
  /** Aggressive - attacks players in range */
  AGGRESSIVE: 'bt_aggressive',
  /** Patrol - follows a patrol path */
  PATROL: 'bt_patrol',
  /** Guard - stays near spawn, attacks threats */
  GUARD: 'bt_guard',
  /** Roaming - wanders randomly, may be aggressive */
  ROAMING: 'bt_roaming',
  /** Social - groups with nearby allies */
  SOCIAL: 'bt_social',
  /** Boss - special boss behavior with abilities */
  BOSS: 'bt_boss',
} as const;

export type BehaviorTreeType = (typeof BehaviorTrees)[keyof typeof BehaviorTrees];

/**
 * Validate a creature template for completeness and correctness
 * @param template - Template to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateCreatureTemplate(template: Partial<CreatureTemplate>): string[] {
  const errors: string[] = [];

  // Required fields
  if (!template.templateName) {
    errors.push('templateName is required');
  }
  if (!template.displayName) {
    errors.push('displayName is required');
  }
  if (template.level === undefined || template.level < 1) {
    errors.push('level must be >= 1');
  }
  if (!template.difficulty) {
    errors.push('difficulty is required');
  }
  if (!template.healthRange || template.healthRange.length !== 2) {
    errors.push('healthRange must be [min, max]');
  }
  if (!template.actionRange || template.actionRange.length !== 2) {
    errors.push('actionRange must be [min, max]');
  }
  if (!template.mindRange || template.mindRange.length !== 2) {
    errors.push('mindRange must be [min, max]');
  }
  if (!template.damageRange || template.damageRange.length !== 2) {
    errors.push('damageRange must be [min, max]');
  }
  if (template.attackSpeed === undefined || template.attackSpeed <= 0) {
    errors.push('attackSpeed must be > 0');
  }
  if (template.armor === undefined || template.armor < 0) {
    errors.push('armor must be >= 0');
  }
  if (template.accuracy === undefined) {
    errors.push('accuracy is required');
  }
  if (template.walkSpeed === undefined || template.walkSpeed <= 0) {
    errors.push('walkSpeed must be > 0');
  }
  if (template.runSpeed === undefined || template.runSpeed <= 0) {
    errors.push('runSpeed must be > 0');
  }
  if (!template.faction) {
    errors.push('faction is required');
  }
  if (template.aggressiveRadius === undefined || template.aggressiveRadius < 0) {
    errors.push('aggressiveRadius must be >= 0');
  }
  if (template.assistRadius === undefined || template.assistRadius < 0) {
    errors.push('assistRadius must be >= 0');
  }
  if (!template.lootTable) {
    errors.push('lootTable is required');
  }
  if (template.xpValue === undefined || template.xpValue < 0) {
    errors.push('xpValue must be >= 0');
  }
  if (!template.behaviorTree) {
    errors.push('behaviorTree is required');
  }
  if (!template.socialGroup) {
    errors.push('socialGroup is required');
  }
  if (!template.appearanceTemplate) {
    errors.push('appearanceTemplate is required');
  }
  if (template.scale === undefined || template.scale <= 0) {
    errors.push('scale must be > 0');
  }

  // Range validations
  if (template.healthRange && template.healthRange[0] > template.healthRange[1]) {
    errors.push('healthRange min must be <= max');
  }
  if (template.actionRange && template.actionRange[0] > template.actionRange[1]) {
    errors.push('actionRange min must be <= max');
  }
  if (template.mindRange && template.mindRange[0] > template.mindRange[1]) {
    errors.push('mindRange min must be <= max');
  }
  if (template.damageRange && template.damageRange[0] > template.damageRange[1]) {
    errors.push('damageRange min must be <= max');
  }
  if (template.creditRange && template.creditRange[0] > template.creditRange[1]) {
    errors.push('creditRange min must be <= max');
  }

  return errors;
}

/**
 * Create a default creature template with sensible defaults
 * @param templateName - Unique template name
 * @param displayName - Display name
 * @returns Partial template with defaults
 */
export function createDefaultTemplate(
  templateName: string,
  displayName: string
): CreatureTemplate {
  return {
    templateName,
    displayName,
    level: 1,
    difficulty: CreatureDifficulty.Normal,
    healthRange: [100, 150],
    actionRange: [50, 75],
    mindRange: [50, 75],
    damageRange: [10, 20],
    attackSpeed: 2.0,
    armor: 0,
    accuracy: 50,
    walkSpeed: 1.0,
    runSpeed: 3.0,
    faction: Factions.CREATURE,
    aggressiveRadius: 0,
    assistRadius: 0,
    lootTable: 'loot_none',
    xpValue: 10,
    behaviorTree: BehaviorTrees.PASSIVE,
    socialGroup: 'none',
    appearanceTemplate: 'object/mobile/shared_creature.iff',
    scale: 1.0,
  };
}

/**
 * Merge partial template data with defaults
 * @param partial - Partial template data
 * @param defaults - Default template to merge with
 * @returns Complete template
 */
export function mergeTemplateWithDefaults(
  partial: Partial<CreatureTemplate>,
  defaults: CreatureTemplate
): CreatureTemplate {
  return {
    ...defaults,
    ...partial,
    // Preserve arrays properly
    healthRange: partial.healthRange ?? defaults.healthRange,
    actionRange: partial.actionRange ?? defaults.actionRange,
    mindRange: partial.mindRange ?? defaults.mindRange,
    damageRange: partial.damageRange ?? defaults.damageRange,
    equipment: partial.equipment ?? defaults.equipment,
    specialAbilities: partial.specialAbilities ?? defaults.specialAbilities,
  };
}
