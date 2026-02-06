/**
 * @file draft-schematic.ts
 * Defines the DraftSchematic interface - the blueprint for craftable items
 */

import { SchematicCategory, CraftingComplexity, CraftingToolType, CraftingXpType } from './schematic-types.js';
import { IngredientSlot, validateIngredientSlot } from './ingredient-slot.js';

/**
 * Defines an attribute of the output item and how it's calculated
 */
export interface SchematicAttribute {
  /** Internal attribute name (e.g., "damage_min", "armor_rating") */
  attributeName: string;

  /** Display name shown to players */
  displayName: string;

  /** Base value before resource quality modifiers */
  baseValue: number;

  /** Minimum possible value after crafting */
  minValue: number;

  /** Maximum possible value after crafting */
  maxValue: number;

  /** Whether higher values are better (for display purposes) */
  higherIsBetter: boolean;

  /**
   * How much experimentation affects this attribute
   * 0 = not experimentable, 1.0 = normal, 2.0 = double effect
   */
  experimentationModifier: number;

  /** Whether this attribute is hidden from players */
  hidden?: boolean | undefined;
}

/**
 * Assembly phase configuration
 */
export interface AssemblyConfig {
  /** Base success chance at minimum skill */
  baseSuccessRate: number;

  /** Skill modifier per point above minimum */
  skillModifier: number;

  /** Critical success threshold */
  criticalSuccessThreshold: number;

  /** Critical failure threshold */
  criticalFailureThreshold: number;
}

/**
 * Experimentation configuration
 */
export interface ExperimentationConfig {
  /** Maximum number of experimentation points available */
  maxPoints: number;

  /** Risk per experimentation attempt */
  riskPerAttempt: number;

  /** Points required per experimentation line */
  pointsPerLine: number;

  /** Experimentation groups (related attributes) */
  groups: ExperimentationGroup[];
}

/**
 * A group of related attributes that can be experimented on together
 */
export interface ExperimentationGroup {
  /** Display name for the group */
  groupName: string;

  /** Attributes in this group */
  attributes: string[];

  /** Maximum improvement percentage */
  maxImprovement: number;
}

/**
 * The complete blueprint for a craftable item in SWG.
 * Draft schematics define everything needed to craft an item:
 * required ingredients, output attributes, skill requirements, etc.
 */
export interface DraftSchematic {
  /** Unique string identifier for this schematic */
  schematicId: string;

  /**
   * CRC32 hash for network transmission.
   * Calculated from schematicId for efficient network lookups.
   */
  schematicCrc: number;

  /** Display name shown to players */
  schematicName: string;

  /** Category for organizing schematics in the crafting UI */
  category: SchematicCategory;

  /** Subcategory for further organization */
  subcategory?: string | undefined;

  /**
   * Crafting difficulty level (1-25 in SWG).
   * Affects success rates and XP rewards.
   */
  complexity: number;

  /** Complexity tier for UI display */
  complexityTier: CraftingComplexity;

  /** Type of crafting tool required */
  craftingTool: CraftingToolType;

  /** Ingredient slots required to craft this item */
  slots: IngredientSlot[];

  /** Type of crafting XP awarded */
  xpType: CraftingXpType;

  /** Base XP amount awarded on successful craft */
  xpAmount: number;

  /** Object template path for the output item */
  outputTemplate: string;

  /** Number of items produced per craft (usually 1) */
  outputQuantity: number;

  /**
   * Skill required to see and use this schematic.
   * Format: "skill_box_name" (e.g., "crafting_weaponsmith_novice")
   */
  skillRequired: string;

  /** Additional skills that unlock this schematic */
  additionalSkillsRequired?: string[] | undefined;

  /** Attributes of the output item */
  itemAttributes: SchematicAttribute[];

  /** Assembly phase configuration */
  assembly: AssemblyConfig;

  /** Experimentation configuration (if experimentable) */
  experimentation?: ExperimentationConfig | undefined;

  /** Description shown in schematic viewer */
  description?: string | undefined;

  /** Whether this schematic can be learned from a data disk */
  learnable: boolean;

  /** Whether this is a factory-capable schematic */
  factoryCapable: boolean;

  /** Crafting volume (affects manufacturing speed) */
  manufacturingVolume: number;

  /** Internal version for data migrations */
  dataVersion: number;
}

/**
 * Default assembly configuration for most schematics
 */
export const DEFAULT_ASSEMBLY_CONFIG: AssemblyConfig = {
  baseSuccessRate: 0.5,
  skillModifier: 0.001,
  criticalSuccessThreshold: 0.95,
  criticalFailureThreshold: 0.05,
};

/**
 * Creates a minimal valid draft schematic with defaults
 */
export function createDraftSchematic(
  schematicId: string,
  schematicName: string,
  category: SchematicCategory,
  outputTemplate: string,
  skillRequired: string,
  slots: IngredientSlot[],
  itemAttributes: SchematicAttribute[] = []
): DraftSchematic {
  return {
    schematicId,
    schematicCrc: 0, // Will be calculated by loader
    schematicName,
    category,
    complexity: 5,
    complexityTier: CraftingComplexity.Simple,
    craftingTool: CraftingToolType.GenericCraftingTool,
    slots,
    xpType: CraftingXpType.Artisan,
    xpAmount: 100,
    outputTemplate,
    outputQuantity: 1,
    skillRequired,
    itemAttributes,
    assembly: DEFAULT_ASSEMBLY_CONFIG,
    learnable: true,
    factoryCapable: true,
    manufacturingVolume: 1,
    dataVersion: 1,
  };
}

/**
 * Validates a draft schematic for completeness and correctness
 */
export function validateDraftSchematic(schematic: DraftSchematic): string[] {
  const errors: string[] = [];

  // Required fields
  if (!schematic.schematicId || schematic.schematicId.trim().length === 0) {
    errors.push('Schematic ID is required');
  }

  if (!schematic.schematicName || schematic.schematicName.trim().length === 0) {
    errors.push('Schematic name is required');
  }

  if (!schematic.outputTemplate || schematic.outputTemplate.trim().length === 0) {
    errors.push('Output template is required');
  }

  if (!schematic.skillRequired || schematic.skillRequired.trim().length === 0) {
    errors.push('Skill requirement is required');
  }

  // Validate complexity
  if (schematic.complexity < 1 || schematic.complexity > 25) {
    errors.push('Complexity must be between 1 and 25');
  }

  // Validate slots
  if (!schematic.slots || schematic.slots.length === 0) {
    errors.push('At least one ingredient slot is required');
  } else {
    for (const slot of schematic.slots) {
      const slotErrors = validateIngredientSlot(slot);
      errors.push(...slotErrors.map((e) => `Slot "${slot.slotName}": ${e}`));
    }
  }

  // Validate XP
  if (schematic.xpAmount < 0) {
    errors.push('XP amount cannot be negative');
  }

  // Validate output quantity
  if (schematic.outputQuantity < 1) {
    errors.push('Output quantity must be at least 1');
  }

  // Validate attributes
  for (const attr of schematic.itemAttributes) {
    if (attr.minValue > attr.maxValue) {
      errors.push(`Attribute "${attr.attributeName}": min value cannot exceed max value`);
    }
    if (attr.baseValue < attr.minValue || attr.baseValue > attr.maxValue) {
      errors.push(`Attribute "${attr.attributeName}": base value must be between min and max`);
    }
  }

  // Validate experimentation groups reference valid attributes
  if (schematic.experimentation) {
    const attributeNames = new Set(schematic.itemAttributes.map((a) => a.attributeName));
    for (const group of schematic.experimentation.groups) {
      for (const attrName of group.attributes) {
        if (!attributeNames.has(attrName)) {
          errors.push(`Experimentation group "${group.groupName}" references unknown attribute "${attrName}"`);
        }
      }
    }
  }

  return errors;
}

/**
 * Gets the total number of required (non-optional) slots
 */
export function getRequiredSlotCount(schematic: DraftSchematic): number {
  return schematic.slots.filter((slot) => !slot.optional).length;
}

/**
 * Gets all experimentable attributes for a schematic
 */
export function getExperimentableAttributes(schematic: DraftSchematic): SchematicAttribute[] {
  return schematic.itemAttributes.filter((attr) => attr.experimentationModifier > 0);
}

/**
 * Calculates effective complexity based on skill level
 */
export function getEffectiveComplexity(schematic: DraftSchematic, skillLevel: number): number {
  // Each skill point reduces effective complexity
  const reduction = Math.floor(skillLevel / 10);
  return Math.max(1, schematic.complexity - reduction);
}
