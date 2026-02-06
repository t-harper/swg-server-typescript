/**
 * Lair Template Loader
 * Utilities for loading and parsing lair templates from JSON files.
 */

import type {
  LairTemplate,
  LairWaveConfig,
} from './lair-template.js';
import {
  LairType,
  LairSpawnBehavior,
  validateLairTemplate,
  createDefaultLairTemplate,
} from './lair-template.js';

/**
 * Raw JSON structure for lair template
 */
export interface LairTemplateJson {
  templateName: string;
  displayName: string;
  description?: string | undefined;
  lairType: string;
  appearanceTemplate: string;
  scale?: number | undefined;
  creatureTemplates: string[];
  bossTemplate: string | null;
  babyTemplate: string | null;
  babySpawnChance?: number | undefined;
  minCreatures: number;
  maxCreatures: number;
  spawnRadius: number;
  respawnDelay: number;
  spawnBehavior?: string | undefined;
  detectionRadius?: number | undefined;
  waveCount: number;
  creaturesPerWave: number;
  waveTriggerDamage: number;
  waves?: LairWaveConfig[] | undefined;
  waveCooldown?: number | undefined;
  healthMultiplier: number;
  baseHealth?: number | undefined;
  armor?: number | undefined;
  regeneratesHealth?: boolean | undefined;
  healthRegenRate?: number | undefined;
  regenDelay?: number | undefined;
  xpBonus: number;
  lootTable: string;
  creditRange?: [number, number] | undefined;
  badge?: string | undefined;
  faction?: string | undefined;
  aggressive?: boolean | undefined;
  socialGroup?: string | undefined;
  creatureRoamRadius?: number | undefined;
  creatureLeashDistance?: number | undefined;
}

/**
 * Parse result with potential errors
 */
export interface LairParseResult {
  success: boolean;
  data?: LairTemplate | undefined;
  errors: string[];
}

/**
 * Parse a raw JSON object into a LairTemplate
 * @param json - Raw JSON data
 * @returns Parse result with template or errors
 */
export function parseLairTemplate(json: unknown): LairParseResult {
  const errors: string[] = [];

  if (!json || typeof json !== 'object') {
    return { success: false, errors: ['Invalid JSON: expected object'] };
  }

  const raw = json as Record<string, unknown>;

  // Parse required fields
  const templateName = parseString(raw, 'templateName', errors);
  const displayName = parseString(raw, 'displayName', errors);
  const lairType = parseLairType(raw, 'lairType', errors);
  const appearanceTemplate = parseString(raw, 'appearanceTemplate', errors);

  // Parse creature templates
  const creatureTemplates = parseStringArray(raw, 'creatureTemplates', errors);

  // Parse spawn settings
  const minCreatures = parseNumber(raw, 'minCreatures', errors, 1);
  const maxCreatures = parseNumber(raw, 'maxCreatures', errors, 3);
  const spawnRadius = parseNumber(raw, 'spawnRadius', errors, 32);
  const respawnDelay = parseNumber(raw, 'respawnDelay', errors, 60000);

  // Parse wave settings
  const waveCount = parseNumber(raw, 'waveCount', errors, 3);
  const creaturesPerWave = parseNumber(raw, 'creaturesPerWave', errors, 3);
  const waveTriggerDamage = parseNumber(raw, 'waveTriggerDamage', errors, 0.25);

  // Parse destruction settings
  const healthMultiplier = parseNumber(raw, 'healthMultiplier', errors, 1.0);
  const xpBonus = parseNumber(raw, 'xpBonus', errors, 100);
  const lootTable = parseString(raw, 'lootTable', errors, 'loot_lair_default');

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Parse spawn behavior
  let spawnBehavior: LairSpawnBehavior | undefined;
  if (raw['spawnBehavior'] !== undefined) {
    spawnBehavior = parseSpawnBehavior(raw['spawnBehavior'] as string);
  }

  // Build the template
  const template: LairTemplate = {
    templateName: templateName!,
    displayName: displayName!,
    description: raw['description'] as string | undefined,
    lairType: lairType!,
    appearanceTemplate: appearanceTemplate!,
    scale: raw['scale'] as number | undefined,
    creatureTemplates: creatureTemplates!,
    bossTemplate: (raw['bossTemplate'] as string) ?? null,
    babyTemplate: (raw['babyTemplate'] as string) ?? null,
    babySpawnChance: raw['babySpawnChance'] as number | undefined,
    minCreatures: minCreatures!,
    maxCreatures: maxCreatures!,
    spawnRadius: spawnRadius!,
    respawnDelay: respawnDelay!,
    spawnBehavior,
    detectionRadius: raw['detectionRadius'] as number | undefined,
    waveCount: waveCount!,
    creaturesPerWave: creaturesPerWave!,
    waveTriggerDamage: waveTriggerDamage!,
    waves: parseWaves(raw['waves']),
    waveCooldown: raw['waveCooldown'] as number | undefined,
    healthMultiplier: healthMultiplier!,
    baseHealth: raw['baseHealth'] as number | undefined,
    armor: raw['armor'] as number | undefined,
    regeneratesHealth: raw['regeneratesHealth'] as boolean | undefined,
    healthRegenRate: raw['healthRegenRate'] as number | undefined,
    regenDelay: raw['regenDelay'] as number | undefined,
    xpBonus: xpBonus!,
    lootTable: lootTable!,
    creditRange: raw['creditRange'] as [number, number] | undefined,
    badge: raw['badge'] as string | undefined,
    faction: raw['faction'] as string | undefined,
    aggressive: raw['aggressive'] as boolean | undefined,
    socialGroup: raw['socialGroup'] as string | undefined,
    creatureRoamRadius: raw['creatureRoamRadius'] as number | undefined,
    creatureLeashDistance: raw['creatureLeashDistance'] as number | undefined,
  };

  // Run validation
  const validationErrors = validateLairTemplate(template);
  if (validationErrors.length > 0) {
    return { success: false, errors: validationErrors };
  }

  return { success: true, data: template, errors: [] };
}

/**
 * Parse a string field
 */
function parseString(
  obj: Record<string, unknown>,
  field: string,
  errors: string[],
  defaultValue?: string
): string | undefined {
  const value = obj[field];
  if (value === undefined || value === null) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    errors.push(`Missing required field: ${field}`);
    return undefined;
  }
  if (typeof value !== 'string') {
    errors.push(`Field ${field} must be a string`);
    return defaultValue;
  }
  return value;
}

/**
 * Parse a number field
 */
function parseNumber(
  obj: Record<string, unknown>,
  field: string,
  errors: string[],
  defaultValue?: number
): number | undefined {
  const value = obj[field];
  if (value === undefined || value === null) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    errors.push(`Missing required field: ${field}`);
    return undefined;
  }
  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(`Field ${field} must be a number`);
    return defaultValue;
  }
  return value;
}

/**
 * Parse a string array field
 */
function parseStringArray(
  obj: Record<string, unknown>,
  field: string,
  errors: string[]
): string[] | undefined {
  const value = obj[field];
  if (value === undefined || value === null) {
    errors.push(`Missing required field: ${field}`);
    return undefined;
  }
  if (!Array.isArray(value)) {
    errors.push(`Field ${field} must be an array`);
    return undefined;
  }
  for (const item of value) {
    if (typeof item !== 'string') {
      errors.push(`Field ${field} must contain only strings`);
      return undefined;
    }
  }
  if (value.length === 0) {
    errors.push(`Field ${field} must have at least one entry`);
    return undefined;
  }
  return value as string[];
}

/**
 * Parse lair type from string
 */
function parseLairType(
  obj: Record<string, unknown>,
  field: string,
  errors: string[]
): LairType | undefined {
  const value = obj[field];
  if (value === undefined || value === null) {
    errors.push(`Missing required field: ${field}`);
    return undefined;
  }
  if (typeof value !== 'string') {
    errors.push(`Field ${field} must be a string`);
    return undefined;
  }

  const typeMap: Record<string, LairType> = {
    creature: LairType.Creature,
    npc: LairType.NPC,
    bandit: LairType.Bandit,
    boss: LairType.Boss,
  };

  const lairType = typeMap[value.toLowerCase()];
  if (!lairType) {
    errors.push(`Invalid lair type: ${value}. Must be one of: creature, npc, bandit, boss`);
    return undefined;
  }

  return lairType;
}

/**
 * Parse spawn behavior from string
 */
function parseSpawnBehavior(value: string): LairSpawnBehavior {
  const behaviorMap: Record<string, LairSpawnBehavior> = {
    on_approach: LairSpawnBehavior.OnApproach,
    on_damage: LairSpawnBehavior.OnDamage,
    continuous: LairSpawnBehavior.Continuous,
    immediate: LairSpawnBehavior.Immediate,
  };

  return behaviorMap[value.toLowerCase()] ?? LairSpawnBehavior.OnDamage;
}

/**
 * Parse wave configurations
 */
function parseWaves(value: unknown): LairWaveConfig[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }

  const waves: LairWaveConfig[] = [];
  for (const wave of value) {
    if (typeof wave !== 'object' || wave === null) {
      continue;
    }
    const w = wave as Record<string, unknown>;
    waves.push({
      creatureCount: (w['creatureCount'] as number) ?? 3,
      creatureOverride: w['creatureOverride'] as string[] | undefined,
      spawnDelay: w['spawnDelay'] as number | undefined,
      spawnBoss: w['spawnBoss'] as boolean | undefined,
    });
  }

  return waves.length > 0 ? waves : undefined;
}

/**
 * Parse multiple lair templates from a JSON array
 * @param jsonArray - Array of raw template objects
 * @returns Array of parse results
 */
export function parseLairTemplates(jsonArray: unknown[]): LairParseResult[] {
  return jsonArray.map((item) => parseLairTemplate(item));
}

/**
 * Load lair templates and filter successful ones
 * @param jsonArray - Array of raw template objects
 * @returns Object with successful templates and errors
 */
export function loadLairTemplates(jsonArray: unknown[]): {
  templates: LairTemplate[];
  errors: Array<{ index: number; errors: string[] }>;
} {
  const templates: LairTemplate[] = [];
  const errors: Array<{ index: number; errors: string[] }> = [];

  jsonArray.forEach((item, index) => {
    const result = parseLairTemplate(item);
    if (result.success && result.data) {
      templates.push(result.data);
    } else {
      errors.push({ index, errors: result.errors });
    }
  });

  return { templates, errors };
}

/**
 * Serialize a LairTemplate to JSON
 * @param template - Template to serialize
 * @returns JSON-safe object
 */
export function serializeLairTemplate(template: LairTemplate): LairTemplateJson {
  return {
    templateName: template.templateName,
    displayName: template.displayName,
    description: template.description,
    lairType: template.lairType,
    appearanceTemplate: template.appearanceTemplate,
    scale: template.scale,
    creatureTemplates: template.creatureTemplates,
    bossTemplate: template.bossTemplate,
    babyTemplate: template.babyTemplate,
    babySpawnChance: template.babySpawnChance,
    minCreatures: template.minCreatures,
    maxCreatures: template.maxCreatures,
    spawnRadius: template.spawnRadius,
    respawnDelay: template.respawnDelay,
    spawnBehavior: template.spawnBehavior,
    detectionRadius: template.detectionRadius,
    waveCount: template.waveCount,
    creaturesPerWave: template.creaturesPerWave,
    waveTriggerDamage: template.waveTriggerDamage,
    waves: template.waves,
    waveCooldown: template.waveCooldown,
    healthMultiplier: template.healthMultiplier,
    baseHealth: template.baseHealth,
    armor: template.armor,
    regeneratesHealth: template.regeneratesHealth,
    healthRegenRate: template.healthRegenRate,
    regenDelay: template.regenDelay,
    xpBonus: template.xpBonus,
    lootTable: template.lootTable,
    creditRange: template.creditRange,
    badge: template.badge,
    faction: template.faction,
    aggressive: template.aggressive,
    socialGroup: template.socialGroup,
    creatureRoamRadius: template.creatureRoamRadius,
    creatureLeashDistance: template.creatureLeashDistance,
  };
}
