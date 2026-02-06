/**
 * Creature Template Loader
 * Utilities for loading and parsing creature templates from JSON files.
 */

import type {
  CreatureTemplate,
  CreatureEquipment,
  CreatureSpecialAbility,
  StatRange,
} from './creature-template.js';
import {
  CreatureDifficulty,
  validateCreatureTemplate,
  createDefaultTemplate,
  mergeTemplateWithDefaults,
} from './creature-template.js';

/**
 * Raw JSON structure for creature template
 * Allows for more flexible parsing from JSON files
 */
export interface CreatureTemplateJson {
  templateName: string;
  displayName: string;
  description?: string | undefined;
  level: number;
  difficulty: number;
  healthRange: [number, number];
  actionRange: [number, number];
  mindRange: [number, number];
  damageRange: [number, number];
  attackSpeed: number;
  armor: number;
  accuracy: number;
  damageType?: string | undefined;
  weaponTemplate?: string | undefined;
  specialAbilities?: CreatureSpecialAbility[] | undefined;
  walkSpeed: number;
  runSpeed: number;
  turnRate?: number | undefined;
  faction: string;
  aggressiveRadius: number;
  assistRadius: number;
  pvpEnabled?: boolean | undefined;
  lootTable: string;
  xpValue: number;
  creditRange?: [number, number] | undefined;
  behaviorTree: string;
  socialGroup: string;
  leashDistance?: number | undefined;
  roamRadius?: number | undefined;
  patrolPath?: string | undefined;
  appearanceTemplate: string;
  scale: number;
  equipment?: CreatureEquipment[] | undefined;
  customization?: number[] | undefined;
}

/**
 * Parse result with potential errors
 */
export interface ParseResult<T> {
  success: boolean;
  data?: T | undefined;
  errors: string[];
}

/**
 * Parse a raw JSON object into a CreatureTemplate
 * @param json - Raw JSON data
 * @returns Parse result with template or errors
 */
export function parseCreatureTemplate(json: unknown): ParseResult<CreatureTemplate> {
  const errors: string[] = [];

  if (!json || typeof json !== 'object') {
    return { success: false, errors: ['Invalid JSON: expected object'] };
  }

  const raw = json as Record<string, unknown>;

  // Parse required fields
  const templateName = parseString(raw, 'templateName', errors);
  const displayName = parseString(raw, 'displayName', errors);
  const level = parseNumber(raw, 'level', errors, 1);
  const difficulty = parseDifficulty(raw, 'difficulty', errors);

  // Parse stat ranges
  const healthRange = parseStatRange(raw, 'healthRange', errors);
  const actionRange = parseStatRange(raw, 'actionRange', errors);
  const mindRange = parseStatRange(raw, 'mindRange', errors);
  const damageRange = parseStatRange(raw, 'damageRange', errors);

  // Parse combat stats
  const attackSpeed = parseNumber(raw, 'attackSpeed', errors, 2.0);
  const armor = parseNumber(raw, 'armor', errors, 0);
  const accuracy = parseNumber(raw, 'accuracy', errors, 50);

  // Parse movement
  const walkSpeed = parseNumber(raw, 'walkSpeed', errors, 1.0);
  const runSpeed = parseNumber(raw, 'runSpeed', errors, 5.0);

  // Parse faction
  const faction = parseString(raw, 'faction', errors, 'creature');
  const aggressiveRadius = parseNumber(raw, 'aggressiveRadius', errors, 0);
  const assistRadius = parseNumber(raw, 'assistRadius', errors, 0);

  // Parse loot/xp
  const lootTable = parseString(raw, 'lootTable', errors, 'loot_none');
  const xpValue = parseNumber(raw, 'xpValue', errors, 0);

  // Parse AI
  const behaviorTree = parseString(raw, 'behaviorTree', errors, 'bt_passive');
  const socialGroup = parseString(raw, 'socialGroup', errors, 'none');

  // Parse appearance
  const appearanceTemplate = parseString(raw, 'appearanceTemplate', errors);
  const scale = parseNumber(raw, 'scale', errors, 1.0);

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Build the template
  const template: CreatureTemplate = {
    templateName: templateName!,
    displayName: displayName!,
    description: raw['description'] as string | undefined,
    level: level!,
    difficulty: difficulty!,
    healthRange: healthRange!,
    actionRange: actionRange!,
    mindRange: mindRange!,
    damageRange: damageRange!,
    attackSpeed: attackSpeed!,
    armor: armor!,
    accuracy: accuracy!,
    damageType: raw['damageType'] as string | undefined,
    weaponTemplate: raw['weaponTemplate'] as string | undefined,
    walkSpeed: walkSpeed!,
    runSpeed: runSpeed!,
    turnRate: raw['turnRate'] as number | undefined,
    faction: faction!,
    aggressiveRadius: aggressiveRadius!,
    assistRadius: assistRadius!,
    pvpEnabled: raw['pvpEnabled'] as boolean | undefined,
    lootTable: lootTable!,
    xpValue: xpValue!,
    creditRange: raw['creditRange'] as StatRange | undefined,
    behaviorTree: behaviorTree!,
    socialGroup: socialGroup!,
    leashDistance: raw['leashDistance'] as number | undefined,
    roamRadius: raw['roamRadius'] as number | undefined,
    patrolPath: raw['patrolPath'] as string | undefined,
    appearanceTemplate: appearanceTemplate!,
    scale: scale!,
    equipment: raw['equipment'] as CreatureEquipment[] | undefined,
    specialAbilities: raw['specialAbilities'] as CreatureSpecialAbility[] | undefined,
    customization: raw['customization']
      ? new Uint8Array(raw['customization'] as number[])
      : undefined,
  };

  // Run validation
  const validationErrors = validateCreatureTemplate(template);
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
 * Parse a stat range [min, max]
 */
function parseStatRange(
  obj: Record<string, unknown>,
  field: string,
  errors: string[]
): StatRange | undefined {
  const value = obj[field];
  if (value === undefined || value === null) {
    errors.push(`Missing required field: ${field}`);
    return undefined;
  }
  if (!Array.isArray(value) || value.length !== 2) {
    errors.push(`Field ${field} must be an array of [min, max]`);
    return undefined;
  }
  const [min, max] = value;
  if (typeof min !== 'number' || typeof max !== 'number') {
    errors.push(`Field ${field} must contain numbers`);
    return undefined;
  }
  if (min > max) {
    errors.push(`Field ${field}: min (${min}) must be <= max (${max})`);
    return undefined;
  }
  return [min, max];
}

/**
 * Parse difficulty enum
 */
function parseDifficulty(
  obj: Record<string, unknown>,
  field: string,
  errors: string[]
): CreatureDifficulty | undefined {
  const value = obj[field];
  if (value === undefined || value === null) {
    errors.push(`Missing required field: ${field}`);
    return undefined;
  }
  if (typeof value !== 'number') {
    errors.push(`Field ${field} must be a number (1=Normal, 2=Elite, 3=Boss)`);
    return undefined;
  }
  if (value < 1 || value > 3) {
    errors.push(`Field ${field} must be 1, 2, or 3`);
    return undefined;
  }
  return value as CreatureDifficulty;
}

/**
 * Parse multiple templates from a JSON array
 * @param jsonArray - Array of raw template objects
 * @returns Array of parse results
 */
export function parseCreatureTemplates(
  jsonArray: unknown[]
): ParseResult<CreatureTemplate>[] {
  return jsonArray.map((item) => parseCreatureTemplate(item));
}

/**
 * Load templates and filter successful ones
 * @param jsonArray - Array of raw template objects
 * @returns Object with successful templates and errors
 */
export function loadTemplates(jsonArray: unknown[]): {
  templates: CreatureTemplate[];
  errors: Array<{ index: number; errors: string[] }>;
} {
  const templates: CreatureTemplate[] = [];
  const errors: Array<{ index: number; errors: string[] }> = [];

  jsonArray.forEach((item, index) => {
    const result = parseCreatureTemplate(item);
    if (result.success && result.data) {
      templates.push(result.data);
    } else {
      errors.push({ index, errors: result.errors });
    }
  });

  return { templates, errors };
}

/**
 * Serialize a CreatureTemplate to JSON
 * @param template - Template to serialize
 * @returns JSON-safe object
 */
export function serializeTemplate(template: CreatureTemplate): CreatureTemplateJson {
  return {
    templateName: template.templateName,
    displayName: template.displayName,
    description: template.description,
    level: template.level,
    difficulty: template.difficulty,
    healthRange: template.healthRange,
    actionRange: template.actionRange,
    mindRange: template.mindRange,
    damageRange: template.damageRange,
    attackSpeed: template.attackSpeed,
    armor: template.armor,
    accuracy: template.accuracy,
    damageType: template.damageType,
    weaponTemplate: template.weaponTemplate,
    specialAbilities: template.specialAbilities,
    walkSpeed: template.walkSpeed,
    runSpeed: template.runSpeed,
    turnRate: template.turnRate,
    faction: template.faction,
    aggressiveRadius: template.aggressiveRadius,
    assistRadius: template.assistRadius,
    pvpEnabled: template.pvpEnabled,
    lootTable: template.lootTable,
    xpValue: template.xpValue,
    creditRange: template.creditRange,
    behaviorTree: template.behaviorTree,
    socialGroup: template.socialGroup,
    leashDistance: template.leashDistance,
    roamRadius: template.roamRadius,
    patrolPath: template.patrolPath,
    appearanceTemplate: template.appearanceTemplate,
    scale: template.scale,
    equipment: template.equipment,
    customization: template.customization
      ? Array.from(template.customization)
      : undefined,
  };
}
