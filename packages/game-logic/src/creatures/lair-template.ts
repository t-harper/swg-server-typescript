/**
 * Lair Template System
 * Defines templates for creature lairs - destructible spawn points that
 * spawn waves of creatures when approached or attacked.
 */

/**
 * Lair type enumeration
 */
export enum LairType {
  /** Wildlife/creature lair (e.g., womp rat den, bol pack) */
  Creature = 'creature',
  /** NPC encampment (e.g., bandit camp) */
  NPC = 'npc',
  /** Humanoid/faction camp (e.g., tusken camp, imperial patrol) */
  Bandit = 'bandit',
  /** Boss lair with special mechanics */
  Boss = 'boss',
}

/**
 * Lair spawn behavior
 */
export enum LairSpawnBehavior {
  /** Spawn creatures when players approach */
  OnApproach = 'on_approach',
  /** Spawn creatures when lair is attacked */
  OnDamage = 'on_damage',
  /** Spawn creatures continuously at intervals */
  Continuous = 'continuous',
  /** Spawn all creatures immediately on lair creation */
  Immediate = 'immediate',
}

/**
 * Wave configuration for a lair
 */
export interface LairWaveConfig {
  /** Number of creatures in this wave */
  creatureCount: number;
  /** Override creature templates for this wave (optional) */
  creatureOverride?: string[];
  /** Delay before spawning this wave (milliseconds) */
  spawnDelay?: number;
  /** Whether boss spawns in this wave */
  spawnBoss?: boolean;
}

/**
 * Lair Template Interface
 * Defines all properties for creating and managing a creature lair
 */
export interface LairTemplate {
  // ============================================
  // Identity
  // ============================================

  /** Unique template identifier (e.g., "womp_rat_den") */
  templateName: string;

  /** Display name shown to players */
  displayName: string;

  /** Optional description */
  description?: string;

  /** Lair type classification */
  lairType: LairType;

  // ============================================
  // Visual/Appearance
  // ============================================

  /** Appearance template path (IFF file) */
  appearanceTemplate: string;

  /** Scale factor for rendering (1.0 = normal) */
  scale?: number;

  // ============================================
  // Creature Spawning
  // ============================================

  /** List of creature template names that can spawn */
  creatureTemplates: string[];

  /** Boss creature template (spawns on final wave) */
  bossTemplate: string | null;

  /** Baby creature template (spawns with babySpawnChance) */
  babyTemplate: string | null;

  /** Chance to spawn baby instead of adult (0.0-1.0) */
  babySpawnChance?: number;

  // ============================================
  // Spawn Settings
  // ============================================

  /** Minimum creatures to maintain */
  minCreatures: number;

  /** Maximum creatures alive at once */
  maxCreatures: number;

  /** Radius around lair for creature spawns (meters) */
  spawnRadius: number;

  /** Delay between respawns (milliseconds) */
  respawnDelay: number;

  /** Spawn behavior type */
  spawnBehavior?: LairSpawnBehavior;

  /** Radius to detect approaching players (for OnApproach behavior) */
  detectionRadius?: number;

  // ============================================
  // Wave Settings
  // ============================================

  /** Number of waves before lair can be destroyed */
  waveCount: number;

  /** Default creatures per wave (can be overridden per-wave) */
  creaturesPerWave: number;

  /** Damage percentage to trigger next wave (0.0-1.0) */
  waveTriggerDamage: number;

  /** Custom wave configurations (optional) */
  waves?: LairWaveConfig[];

  /** Delay between waves (milliseconds) */
  waveCooldown?: number;

  // ============================================
  // Destruction/Combat
  // ============================================

  /** Health multiplier for the lair (base health * multiplier) */
  healthMultiplier: number;

  /** Base health for the lair */
  baseHealth?: number;

  /** Armor/damage reduction value */
  armor?: number;

  /** Whether lair regenerates health when not in combat */
  regeneratesHealth?: boolean;

  /** Health regeneration rate (per second) */
  healthRegenRate?: number;

  /** Time out of combat before regeneration starts (milliseconds) */
  regenDelay?: number;

  // ============================================
  // Rewards
  // ============================================

  /** Bonus XP awarded when lair is destroyed */
  xpBonus: number;

  /** Loot table identifier for lair destruction */
  lootTable: string;

  /** Credit drop range [min, max] */
  creditRange?: [number, number];

  /** Badge awarded on destruction (optional) */
  badge?: string;

  // ============================================
  // AI/Behavior
  // ============================================

  /** Faction for the lair and its creatures */
  faction?: string;

  /** Whether creatures from this lair are aggressive */
  aggressive?: boolean;

  /** Social group for spawned creatures */
  socialGroup?: string;

  /** How far creatures can roam from lair */
  creatureRoamRadius?: number;

  /** How far creatures will chase before returning */
  creatureLeashDistance?: number;
}

/**
 * Difficulty modifiers for lair scaling
 */
export interface LairDifficultyModifiers {
  /** Health multiplier */
  health: number;
  /** Creature count multiplier */
  creatureCount: number;
  /** Wave count modifier */
  waveCount: number;
  /** XP reward multiplier */
  xp: number;
}

/**
 * Difficulty levels for lairs
 */
export const LAIR_DIFFICULTY_MODIFIERS: Record<string, LairDifficultyModifiers> = {
  easy: {
    health: 0.75,
    creatureCount: 0.75,
    waveCount: -1,
    xp: 0.75,
  },
  normal: {
    health: 1.0,
    creatureCount: 1.0,
    waveCount: 0,
    xp: 1.0,
  },
  hard: {
    health: 1.5,
    creatureCount: 1.25,
    waveCount: 1,
    xp: 1.5,
  },
  elite: {
    health: 2.0,
    creatureCount: 1.5,
    waveCount: 2,
    xp: 2.0,
  },
};

/**
 * Validate a lair template for completeness
 * @param template - Template to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateLairTemplate(template: Partial<LairTemplate>): string[] {
  const errors: string[] = [];

  // Required fields
  if (!template.templateName) {
    errors.push('templateName is required');
  }
  if (!template.displayName) {
    errors.push('displayName is required');
  }
  if (!template.lairType) {
    errors.push('lairType is required');
  }
  if (!template.appearanceTemplate) {
    errors.push('appearanceTemplate is required');
  }
  if (!template.creatureTemplates || template.creatureTemplates.length === 0) {
    errors.push('creatureTemplates must have at least one entry');
  }
  if (template.minCreatures === undefined || template.minCreatures < 0) {
    errors.push('minCreatures must be >= 0');
  }
  if (template.maxCreatures === undefined || template.maxCreatures < 1) {
    errors.push('maxCreatures must be >= 1');
  }
  if (template.minCreatures !== undefined && template.maxCreatures !== undefined) {
    if (template.minCreatures > template.maxCreatures) {
      errors.push('minCreatures must be <= maxCreatures');
    }
  }
  if (template.spawnRadius === undefined || template.spawnRadius <= 0) {
    errors.push('spawnRadius must be > 0');
  }
  if (template.respawnDelay === undefined || template.respawnDelay < 0) {
    errors.push('respawnDelay must be >= 0');
  }
  if (template.waveCount === undefined || template.waveCount < 1) {
    errors.push('waveCount must be >= 1');
  }
  if (template.creaturesPerWave === undefined || template.creaturesPerWave < 1) {
    errors.push('creaturesPerWave must be >= 1');
  }
  if (template.waveTriggerDamage === undefined ||
      template.waveTriggerDamage <= 0 ||
      template.waveTriggerDamage > 1) {
    errors.push('waveTriggerDamage must be > 0 and <= 1');
  }
  if (template.healthMultiplier === undefined || template.healthMultiplier <= 0) {
    errors.push('healthMultiplier must be > 0');
  }
  if (template.xpBonus === undefined || template.xpBonus < 0) {
    errors.push('xpBonus must be >= 0');
  }
  if (!template.lootTable) {
    errors.push('lootTable is required');
  }

  // Range validations
  if (template.babySpawnChance !== undefined &&
      (template.babySpawnChance < 0 || template.babySpawnChance > 1)) {
    errors.push('babySpawnChance must be between 0 and 1');
  }
  if (template.creditRange &&
      (template.creditRange.length !== 2 || template.creditRange[0] > template.creditRange[1])) {
    errors.push('creditRange must be [min, max] with min <= max');
  }

  return errors;
}

/**
 * Create a default lair template with sensible defaults
 * @param templateName - Unique template name
 * @param displayName - Display name
 * @param creatureTemplates - Array of creature template names
 * @returns Complete lair template with defaults
 */
export function createDefaultLairTemplate(
  templateName: string,
  displayName: string,
  creatureTemplates: string[]
): LairTemplate {
  return {
    templateName,
    displayName,
    lairType: LairType.Creature,
    appearanceTemplate: 'object/tangible/lair/base/shared_lair_base.iff',
    creatureTemplates,
    bossTemplate: null,
    babyTemplate: null,
    babySpawnChance: 0.1,
    minCreatures: 1,
    maxCreatures: 3,
    spawnRadius: 32,
    respawnDelay: 60000,
    spawnBehavior: LairSpawnBehavior.OnDamage,
    detectionRadius: 48,
    waveCount: 3,
    creaturesPerWave: 3,
    waveTriggerDamage: 0.25,
    waveCooldown: 5000,
    healthMultiplier: 1.0,
    baseHealth: 5000,
    armor: 0,
    regeneratesHealth: true,
    healthRegenRate: 10,
    regenDelay: 30000,
    xpBonus: 100,
    lootTable: 'loot_lair_default',
    aggressive: false,
    creatureRoamRadius: 24,
    creatureLeashDistance: 64,
  };
}

/**
 * Merge partial template data with defaults
 * @param partial - Partial template data
 * @param defaults - Default template to merge with
 * @returns Complete template
 */
export function mergeLairTemplateWithDefaults(
  partial: Partial<LairTemplate>,
  defaults: LairTemplate
): LairTemplate {
  return {
    ...defaults,
    ...partial,
    // Preserve arrays properly
    creatureTemplates: partial.creatureTemplates ?? defaults.creatureTemplates,
    waves: partial.waves ?? defaults.waves,
    creditRange: partial.creditRange ?? defaults.creditRange,
  };
}

/**
 * Apply difficulty modifiers to a lair template
 * @param template - Base template
 * @param difficulty - Difficulty level
 * @returns Modified template copy
 */
export function applyLairDifficulty(
  template: LairTemplate,
  difficulty: keyof typeof LAIR_DIFFICULTY_MODIFIERS
): LairTemplate {
  const mods = LAIR_DIFFICULTY_MODIFIERS[difficulty];

  return {
    ...template,
    healthMultiplier: template.healthMultiplier * mods.health,
    maxCreatures: Math.max(1, Math.floor(template.maxCreatures * mods.creatureCount)),
    creaturesPerWave: Math.max(1, Math.floor(template.creaturesPerWave * mods.creatureCount)),
    waveCount: Math.max(1, template.waveCount + mods.waveCount),
    xpBonus: Math.floor(template.xpBonus * mods.xp),
  };
}

/**
 * Calculate the total health for a lair based on template
 * @param template - Lair template
 * @returns Total lair health
 */
export function calculateLairHealth(template: LairTemplate): number {
  const baseHealth = template.baseHealth ?? 5000;
  return Math.floor(baseHealth * template.healthMultiplier);
}

/**
 * Get the creature template to spawn for a specific wave
 * @param template - Lair template
 * @param waveIndex - Current wave index (0-based)
 * @returns Creature template name
 */
export function getWaveCreatureTemplate(
  template: LairTemplate,
  waveIndex: number
): string {
  // Check for wave-specific override
  if (template.waves && template.waves[waveIndex]?.creatureOverride) {
    const overrides = template.waves[waveIndex].creatureOverride!;
    return overrides[Math.floor(Math.random() * overrides.length)];
  }

  // Use default creature templates
  const templates = template.creatureTemplates;
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Get the number of creatures for a specific wave
 * @param template - Lair template
 * @param waveIndex - Current wave index (0-based)
 * @returns Number of creatures to spawn
 */
export function getWaveCreatureCount(
  template: LairTemplate,
  waveIndex: number
): number {
  // Check for wave-specific count
  if (template.waves && template.waves[waveIndex]) {
    return template.waves[waveIndex].creatureCount;
  }

  // Use default creatures per wave
  return template.creaturesPerWave;
}

/**
 * Check if a specific wave should spawn a boss
 * @param template - Lair template
 * @param waveIndex - Current wave index (0-based)
 * @returns True if boss should spawn
 */
export function shouldWaveSpawnBoss(
  template: LairTemplate,
  waveIndex: number
): boolean {
  // Check wave-specific boss flag
  if (template.waves && template.waves[waveIndex]?.spawnBoss) {
    return true;
  }

  // Default: spawn boss on final wave
  return template.bossTemplate !== null && waveIndex === template.waveCount - 1;
}
