/**
 * @file ingredient-slot.ts
 * Defines the structure of ingredient slots in crafting schematics
 */

import { IngredientType, ResourceWeights, EMPTY_WEIGHTS } from './schematic-types.js';

/**
 * Represents a single ingredient slot in a crafting schematic.
 * Each slot specifies what type of ingredient is required and
 * how it contributes to the final item's attributes.
 */
export interface IngredientSlot {
  /** Display name for this slot (e.g., "Metal for Frame") */
  slotName: string;

  /** Internal slot identifier */
  slotId: string;

  /** Type of ingredient this slot accepts */
  slotType: IngredientType;

  /**
   * Resource classes/types accepted by this slot.
   * For Resource type: resource class names like "steel", "aluminum", "fiberplast"
   * For Component type: template names of accepted components
   * For Item type: item template names
   */
  resourceTypes: string[];

  /** Number of units required to fill this slot */
  quantityRequired: number;

  /** Whether this slot can be left empty */
  optional: boolean;

  /** Which output attributes this slot contributes to */
  contributesToAttribute: string[];

  /**
   * How resource attributes are weighted when calculating
   * the contribution to output item attributes
   */
  resourceWeights: ResourceWeights;

  /**
   * For identical slots, the number of separate items needed
   * (vs resource units)
   */
  identicalCount?: number;

  /**
   * For component slots, whether the component must be
   * of a specific quality tier
   */
  minComponentQuality?: number;

  /**
   * Maximum resource quality cap for this slot
   * (some slots cap quality contribution)
   */
  qualityCap?: number;
}

/**
 * Creates a new resource ingredient slot with common defaults
 */
export function createResourceSlot(
  slotName: string,
  slotId: string,
  resourceTypes: string[],
  quantity: number,
  weights: ResourceWeights = EMPTY_WEIGHTS,
  contributesToAttribute: string[] = [],
  optional: boolean = false
): IngredientSlot {
  return {
    slotName,
    slotId,
    slotType: IngredientType.Resource,
    resourceTypes,
    quantityRequired: quantity,
    optional,
    contributesToAttribute,
    resourceWeights: weights,
  };
}

/**
 * Creates a new component ingredient slot
 */
export function createComponentSlot(
  slotName: string,
  slotId: string,
  componentTemplates: string[],
  quantity: number = 1,
  contributesToAttribute: string[] = [],
  optional: boolean = false,
  minQuality?: number
): IngredientSlot {
  return {
    slotName,
    slotId,
    slotType: IngredientType.Component,
    resourceTypes: componentTemplates,
    quantityRequired: quantity,
    optional,
    contributesToAttribute,
    resourceWeights: EMPTY_WEIGHTS,
    minComponentQuality: minQuality,
  };
}

/**
 * Creates an identical item slot (multiple of same item)
 */
export function createIdenticalSlot(
  slotName: string,
  slotId: string,
  itemTemplates: string[],
  identicalCount: number,
  optional: boolean = false
): IngredientSlot {
  return {
    slotName,
    slotId,
    slotType: IngredientType.Identical,
    resourceTypes: itemTemplates,
    quantityRequired: 1,
    optional,
    contributesToAttribute: [],
    resourceWeights: EMPTY_WEIGHTS,
    identicalCount,
  };
}

/**
 * Creates an optional enhancement slot
 */
export function createOptionalSlot(
  slotName: string,
  slotId: string,
  acceptedTypes: string[],
  contributesToAttribute: string[] = [],
  weights: ResourceWeights = EMPTY_WEIGHTS
): IngredientSlot {
  return {
    slotName,
    slotId,
    slotType: IngredientType.Optional,
    resourceTypes: acceptedTypes,
    quantityRequired: 1,
    optional: true,
    contributesToAttribute,
    resourceWeights: weights,
  };
}

/**
 * Validates an ingredient slot configuration
 */
export function validateIngredientSlot(slot: IngredientSlot): string[] {
  const errors: string[] = [];

  if (!slot.slotName || slot.slotName.trim().length === 0) {
    errors.push('Slot name is required');
  }

  if (!slot.slotId || slot.slotId.trim().length === 0) {
    errors.push('Slot ID is required');
  }

  if (!slot.resourceTypes || slot.resourceTypes.length === 0) {
    errors.push('At least one resource type must be specified');
  }

  if (slot.quantityRequired <= 0) {
    errors.push('Quantity required must be positive');
  }

  if (slot.slotType === IngredientType.Identical && (!slot.identicalCount || slot.identicalCount <= 0)) {
    errors.push('Identical slots must specify identicalCount > 0');
  }

  if (slot.minComponentQuality !== undefined && (slot.minComponentQuality < 0 || slot.minComponentQuality > 100)) {
    errors.push('Component quality must be between 0 and 100');
  }

  if (slot.qualityCap !== undefined && (slot.qualityCap < 0 || slot.qualityCap > 100)) {
    errors.push('Quality cap must be between 0 and 100');
  }

  return errors;
}

/**
 * Calculates the total resource units needed across all slots
 */
export function calculateTotalResourceUnits(slots: IngredientSlot[]): number {
  return slots
    .filter((slot) => slot.slotType === IngredientType.Resource && !slot.optional)
    .reduce((total, slot) => total + slot.quantityRequired, 0);
}

/**
 * Gets all unique resource types required by a schematic's slots
 */
export function getRequiredResourceTypes(slots: IngredientSlot[]): string[] {
  const types = new Set<string>();
  for (const slot of slots) {
    if (slot.slotType === IngredientType.Resource) {
      for (const type of slot.resourceTypes) {
        types.add(type);
      }
    }
  }
  return Array.from(types);
}

/**
 * Gets all component templates required by a schematic's slots
 */
export function getRequiredComponents(slots: IngredientSlot[]): string[] {
  const components = new Set<string>();
  for (const slot of slots) {
    if (slot.slotType === IngredientType.Component) {
      for (const template of slot.resourceTypes) {
        components.add(template);
      }
    }
  }
  return Array.from(components);
}
