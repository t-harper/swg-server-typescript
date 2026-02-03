/**
 * Encumbrance Calculator
 * Calculates equipment encumbrance penalties on HAM pools
 */

import type { ObjectId } from '@swg/shared-types';
import type { ArmorObject, CreatureObject } from '@swg/objects';
import { ObjectType } from '@swg/objects';
import { EquipmentSlot, type EquipmentSlotType, isArmorSlot } from './equipment-slots.js';

/**
 * Encumbrance result for all HAM pools
 */
export interface EncumbranceResult {
  /** Health pool encumbrance */
  healthEncumbrance: number;
  /** Action pool encumbrance */
  actionEncumbrance: number;
  /** Mind pool encumbrance */
  mindEncumbrance: number;
  /** Total encumbrance (sum of all pools) */
  totalEncumbrance: number;
}

/**
 * Encumbrance modifier from skills/buffs
 */
export interface EncumbranceModifier {
  /** Modifier ID for tracking */
  id: string;
  /** Source of the modifier (skill name, buff name, etc.) */
  source: string;
  /** Health encumbrance reduction (negative reduces encumbrance) */
  healthReduction: number;
  /** Action encumbrance reduction */
  actionReduction: number;
  /** Mind encumbrance reduction */
  mindReduction: number;
  /** Percentage reduction (applied after flat reductions) */
  percentReduction: number;
}

/**
 * Item encumbrance data
 */
export interface ItemEncumbrance {
  /** Item object ID */
  itemId: ObjectId;
  /** Slot the item is equipped in */
  slot: EquipmentSlotType;
  /** Health encumbrance */
  healthEncumbrance: number;
  /** Action encumbrance */
  actionEncumbrance: number;
  /** Mind encumbrance */
  mindEncumbrance: number;
}

/**
 * Encumbrance calculation configuration
 */
export interface EncumbranceConfig {
  /** Maximum total encumbrance allowed */
  maxTotalEncumbrance: number;
  /** Whether to apply encumbrance to secondary HAM attributes */
  applyToSecondary: boolean;
  /** Minimum effective max for HAM pools after encumbrance */
  minimumEffectiveMax: number;
}

/**
 * Default encumbrance configuration
 */
export const DEFAULT_ENCUMBRANCE_CONFIG: EncumbranceConfig = {
  maxTotalEncumbrance: 10000,
  applyToSecondary: false,
  minimumEffectiveMax: 1,
};

/**
 * Calculate total encumbrance from all equipped items
 * @param equippedItems - Map of equipped item IDs by slot
 * @param getArmorObject - Function to retrieve armor object by ID
 * @returns Total encumbrance for all HAM pools
 */
export function calculateTotalEncumbrance(
  equippedItems: Map<EquipmentSlotType, ObjectId>,
  getArmorObject: (itemId: ObjectId) => ArmorObject | undefined
): EncumbranceResult {
  let healthEncumbrance = 0;
  let actionEncumbrance = 0;
  let mindEncumbrance = 0;

  for (const [slot, itemId] of equippedItems) {
    // Only armor slots contribute to encumbrance
    if (!isArmorSlot(slot)) {
      continue;
    }

    const armor = getArmorObject(itemId);
    if (!armor) {
      continue;
    }

    healthEncumbrance += armor.healthEncumbrance;
    actionEncumbrance += armor.actionEncumbrance;
    mindEncumbrance += armor.mindEncumbrance;
  }

  return {
    healthEncumbrance,
    actionEncumbrance,
    mindEncumbrance,
    totalEncumbrance: healthEncumbrance + actionEncumbrance + mindEncumbrance,
  };
}

/**
 * Calculate encumbrance for a specific item
 */
export function calculateItemEncumbrance(
  itemId: ObjectId,
  slot: EquipmentSlotType,
  getArmorObject: (itemId: ObjectId) => ArmorObject | undefined
): ItemEncumbrance {
  const result: ItemEncumbrance = {
    itemId,
    slot,
    healthEncumbrance: 0,
    actionEncumbrance: 0,
    mindEncumbrance: 0,
  };

  if (!isArmorSlot(slot)) {
    return result;
  }

  const armor = getArmorObject(itemId);
  if (!armor) {
    return result;
  }

  result.healthEncumbrance = armor.healthEncumbrance;
  result.actionEncumbrance = armor.actionEncumbrance;
  result.mindEncumbrance = armor.mindEncumbrance;

  return result;
}

/**
 * Apply encumbrance modifiers (from skills/buffs)
 */
export function applyEncumbranceModifiers(
  baseEncumbrance: EncumbranceResult,
  modifiers: EncumbranceModifier[]
): EncumbranceResult {
  let healthEncumbrance = baseEncumbrance.healthEncumbrance;
  let actionEncumbrance = baseEncumbrance.actionEncumbrance;
  let mindEncumbrance = baseEncumbrance.mindEncumbrance;

  // Apply flat reductions first
  for (const modifier of modifiers) {
    healthEncumbrance = Math.max(0, healthEncumbrance - modifier.healthReduction);
    actionEncumbrance = Math.max(0, actionEncumbrance - modifier.actionReduction);
    mindEncumbrance = Math.max(0, mindEncumbrance - modifier.mindReduction);
  }

  // Apply percentage reductions
  for (const modifier of modifiers) {
    if (modifier.percentReduction > 0) {
      const multiplier = 1 - modifier.percentReduction / 100;
      healthEncumbrance = Math.floor(healthEncumbrance * multiplier);
      actionEncumbrance = Math.floor(actionEncumbrance * multiplier);
      mindEncumbrance = Math.floor(mindEncumbrance * multiplier);
    }
  }

  return {
    healthEncumbrance: Math.max(0, healthEncumbrance),
    actionEncumbrance: Math.max(0, actionEncumbrance),
    mindEncumbrance: Math.max(0, mindEncumbrance),
    totalEncumbrance: Math.max(
      0,
      healthEncumbrance + actionEncumbrance + mindEncumbrance
    ),
  };
}

/**
 * Apply encumbrance to a player's HAM pools
 * This reduces the effective maximum of each pool
 */
export function applyEncumbrance(
  creature: CreatureObject,
  encumbrance: EncumbranceResult,
  config: EncumbranceConfig = DEFAULT_ENCUMBRANCE_CONFIG
): void {
  // Set encumbrance values on the creature's HAM pools
  creature.health.encumbrance = encumbrance.healthEncumbrance;
  creature.action.encumbrance = encumbrance.actionEncumbrance;
  creature.mind.encumbrance = encumbrance.mindEncumbrance;

  // Update HAM encumbrance array for baselines
  creature.hamEncumbrance[0] = encumbrance.healthEncumbrance;
  creature.hamEncumbrance[3] = encumbrance.actionEncumbrance;
  creature.hamEncumbrance[6] = encumbrance.mindEncumbrance;

  // Optionally apply to secondary attributes
  if (config.applyToSecondary) {
    // Strength (index 1) and Constitution (index 2) use health encumbrance
    creature.hamEncumbrance[1] = Math.floor(encumbrance.healthEncumbrance / 2);
    creature.hamEncumbrance[2] = Math.floor(encumbrance.healthEncumbrance / 2);

    // Quickness (index 4) and Stamina (index 5) use action encumbrance
    creature.hamEncumbrance[4] = Math.floor(encumbrance.actionEncumbrance / 2);
    creature.hamEncumbrance[5] = Math.floor(encumbrance.actionEncumbrance / 2);

    // Focus (index 7) and Willpower (index 8) use mind encumbrance
    creature.hamEncumbrance[7] = Math.floor(encumbrance.mindEncumbrance / 2);
    creature.hamEncumbrance[8] = Math.floor(encumbrance.mindEncumbrance / 2);
  }

  // Clamp current values if they exceed new effective max
  const effectiveHealthMax = Math.max(
    config.minimumEffectiveMax,
    creature.health.max - creature.health.wounds - encumbrance.healthEncumbrance
  );
  const effectiveActionMax = Math.max(
    config.minimumEffectiveMax,
    creature.action.max - creature.action.wounds - encumbrance.actionEncumbrance
  );
  const effectiveMindMax = Math.max(
    config.minimumEffectiveMax,
    creature.mind.max - creature.mind.wounds - encumbrance.mindEncumbrance
  );

  if (creature.health.current > effectiveHealthMax) {
    creature.health.current = effectiveHealthMax;
  }
  if (creature.action.current > effectiveActionMax) {
    creature.action.current = effectiveActionMax;
  }
  if (creature.mind.current > effectiveMindMax) {
    creature.mind.current = effectiveMindMax;
  }
}

/**
 * Get current encumbrance modifiers for a player
 * Calculates modifiers from skills and buffs
 */
export function getEncumbranceModifiers(creature: CreatureObject): EncumbranceModifier[] {
  const modifiers: EncumbranceModifier[] = [];

  // Check for armor encumbrance reduction skills
  // In SWG, various combat skills reduce armor encumbrance
  const encumbranceSkillMods = [
    { skill: 'armor_encumbrance_reduction', modName: 'armor_enc_reduction' },
    { skill: 'combat_3h_action_encumbrance', modName: 'action_enc_reduction' },
    { skill: 'combat_3h_health_encumbrance', modName: 'health_enc_reduction' },
    { skill: 'combat_3h_mind_encumbrance', modName: 'mind_enc_reduction' },
  ];

  for (const { skill, modName } of encumbranceSkillMods) {
    const value = creature.getSkillMod(modName);
    if (value > 0) {
      modifiers.push({
        id: `skill_${modName}`,
        source: skill,
        healthReduction: modName.includes('health') || modName.includes('armor') ? value : 0,
        actionReduction: modName.includes('action') || modName.includes('armor') ? value : 0,
        mindReduction: modName.includes('mind') || modName.includes('armor') ? value : 0,
        percentReduction: 0,
      });
    }
  }

  // Check for percentage-based reductions from buffs
  const percentReduction = creature.getSkillMod('encumbrance_reduction_percent');
  if (percentReduction > 0) {
    modifiers.push({
      id: 'buff_enc_percent',
      source: 'Encumbrance Buff',
      healthReduction: 0,
      actionReduction: 0,
      mindReduction: 0,
      percentReduction: Math.min(percentReduction, 75), // Cap at 75% reduction
    });
  }

  return modifiers;
}

/**
 * Calculate effective HAM maximums after encumbrance
 */
export function calculateEffectiveMaximums(
  creature: CreatureObject,
  encumbrance: EncumbranceResult
): { health: number; action: number; mind: number } {
  return {
    health: Math.max(
      1,
      creature.health.max - creature.health.wounds - encumbrance.healthEncumbrance
    ),
    action: Math.max(
      1,
      creature.action.max - creature.action.wounds - encumbrance.actionEncumbrance
    ),
    mind: Math.max(
      1,
      creature.mind.max - creature.mind.wounds - encumbrance.mindEncumbrance
    ),
  };
}

/**
 * Get encumbrance penalties as percentages
 * Useful for displaying to players
 */
export function getEncumbrancePenalties(
  creature: CreatureObject,
  encumbrance: EncumbranceResult
): { health: number; action: number; mind: number } {
  const healthMax = creature.health.max - creature.health.wounds;
  const actionMax = creature.action.max - creature.action.wounds;
  const mindMax = creature.mind.max - creature.mind.wounds;

  return {
    health: healthMax > 0 ? (encumbrance.healthEncumbrance / healthMax) * 100 : 0,
    action: actionMax > 0 ? (encumbrance.actionEncumbrance / actionMax) * 100 : 0,
    mind: mindMax > 0 ? (encumbrance.mindEncumbrance / mindMax) * 100 : 0,
  };
}

/**
 * Check if encumbrance exceeds maximum allowed
 */
export function isOverEncumbered(
  encumbrance: EncumbranceResult,
  config: EncumbranceConfig = DEFAULT_ENCUMBRANCE_CONFIG
): boolean {
  return encumbrance.totalEncumbrance > config.maxTotalEncumbrance;
}

/**
 * Calculate encumbrance from a single armor piece
 */
export function getArmorEncumbrance(armor: ArmorObject): EncumbranceResult {
  return {
    healthEncumbrance: armor.healthEncumbrance,
    actionEncumbrance: armor.actionEncumbrance,
    mindEncumbrance: armor.mindEncumbrance,
    totalEncumbrance:
      armor.healthEncumbrance + armor.actionEncumbrance + armor.mindEncumbrance,
  };
}

/**
 * Compare encumbrance of two equipment sets
 * Returns the difference (positive means set2 has more encumbrance)
 */
export function compareEncumbrance(
  set1: EncumbranceResult,
  set2: EncumbranceResult
): EncumbranceResult {
  return {
    healthEncumbrance: set2.healthEncumbrance - set1.healthEncumbrance,
    actionEncumbrance: set2.actionEncumbrance - set1.actionEncumbrance,
    mindEncumbrance: set2.mindEncumbrance - set1.mindEncumbrance,
    totalEncumbrance: set2.totalEncumbrance - set1.totalEncumbrance,
  };
}

/**
 * Create an empty encumbrance result
 */
export function createEmptyEncumbrance(): EncumbranceResult {
  return {
    healthEncumbrance: 0,
    actionEncumbrance: 0,
    mindEncumbrance: 0,
    totalEncumbrance: 0,
  };
}
