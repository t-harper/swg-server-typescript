/**
 * @file factory-schematic.ts
 * Factory Schematic - Locked crafting template for factory manufacturing
 *
 * Factory schematics are created from a crafted item + draft schematic.
 * They lock in the attributes from the original crafted item, allowing
 * factories to produce identical copies without player interaction.
 *
 * Key Differences from Draft Schematics:
 * - Attributes are fixed (no experimentation)
 * - Created from a crafted item, not just a recipe
 * - Can only be used in factories
 * - Contains serial number tracking
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import type { ResourceWeights } from './schematic-types.js';

/**
 * Factory ingredient - required resource or component for manufacturing one item
 */
export interface FactoryIngredient {
  /** Unique slot identifier */
  slotId: string;

  /** Display name for the slot */
  slotName: string;

  /** Whether this is a resource (true) or component (false) */
  isResource: boolean;

  /** Required quantity per item manufactured */
  quantity: number;

  /** Required resource type (for resources) */
  resourceType?: string | undefined;

  /** Allowed resource classes (for resources) */
  allowedResourceClasses?: string[] | undefined;

  /** Required component template CRC (for components) */
  componentTemplateCrc?: CrcValue | undefined;

  /** Minimum component quality (0-100) for components */
  minComponentQuality?: number | undefined;

  /** Resource attribute weights for quality calculation */
  resourceWeights?: ResourceWeights | undefined;
}

/**
 * Locked attribute value from the original crafted item
 */
export interface LockedAttribute {
  /** Internal attribute name */
  attributeName: string;

  /** Display name for UI */
  displayName: string;

  /** Fixed value for this attribute */
  value: number;

  /** Minimum possible value (from draft schematic) */
  minValue: number;

  /** Maximum possible value (from draft schematic) */
  maxValue: number;

  /** Whether higher values are better */
  higherIsBetter: boolean;
}

/**
 * Factory schematic - locked crafting template for mass production
 */
export interface FactorySchematic {
  /** Unique schematic object ID */
  schematicId: ObjectId;

  /** Original draft schematic ID this was created from */
  draftSchematicId: string;

  /** CRC of the draft schematic */
  draftSchematicCrc: CrcValue;

  /** Display name of the schematic */
  schematicName: string;

  /** Object ID of the crafter who created this schematic */
  crafterId: ObjectId;

  /** Name of the crafter */
  crafterName: string;

  /** When the schematic was created */
  createdAt: number;

  /** Locked attribute values from the original crafted item */
  itemAttributes: LockedAttribute[];

  /** Required ingredients per manufactured item */
  ingredientsList: FactoryIngredient[];

  /** Template CRC of the output item */
  outputTemplateCrc: CrcValue;

  /** Template path of the output item */
  outputTemplate: string;

  /** Items produced per manufacturing cycle (usually 1) */
  outputQuantity: number;

  /** Manufacturing complexity (affects time) */
  manufacturingComplexity: number;

  /** Base manufacturing time in seconds */
  baseManufacturingTime: number;

  /** Volume of the crafted item (affects manufacturing speed) */
  manufacturingVolume: number;

  /** Serial number counter for items produced from this schematic */
  serialNumberCounter: bigint;

  /** Quality of the original crafted item (0-100) */
  quality: number;

  /** Schematic category (weapon, armor, etc.) */
  category: string;

  /** Whether this schematic is currently in use in a factory */
  inUse: boolean;

  /** Factory ID if currently installed in a factory */
  installedInFactoryId?: ObjectId | undefined;
}

/**
 * Result of creating a factory schematic
 */
export interface FactorySchematicCreationResult {
  /** Whether creation was successful */
  success: boolean;

  /** The created factory schematic (if successful) */
  schematic?: FactorySchematic | undefined;

  /** Error message (if failed) */
  errorMessage?: string | undefined;

  /** Error code */
  errorCode?: FactorySchematicErrorCode | undefined;
}

/**
 * Error codes for factory schematic operations
 */
export enum FactorySchematicErrorCode {
  Success = 0,
  InvalidDraftSchematic = 1,
  InvalidCraftedItem = 2,
  SchematicNotFactoryCapable = 3,
  MissingAttributes = 4,
  MissingIngredients = 5,
  InternalError = 99,
}

/**
 * Creates a factory schematic from a crafted item and draft schematic.
 *
 * @param schematicId - Object ID for the new factory schematic
 * @param draftSchematicId - ID of the original draft schematic
 * @param draftSchematicCrc - CRC of the original draft schematic
 * @param schematicName - Display name for the schematic
 * @param crafterId - Object ID of the crafter
 * @param crafterName - Name of the crafter
 * @param itemAttributes - Locked attribute values from the crafted item
 * @param ingredientsList - Required ingredients per item
 * @param outputTemplateCrc - CRC of the output item template
 * @param outputTemplate - Template path of the output item
 * @param manufacturingComplexity - Complexity affecting manufacturing time
 * @param quality - Quality of the original crafted item
 * @param category - Schematic category
 * @returns Factory schematic
 */
export function createFactorySchematic(
  schematicId: ObjectId,
  draftSchematicId: string,
  draftSchematicCrc: CrcValue,
  schematicName: string,
  crafterId: ObjectId,
  crafterName: string,
  itemAttributes: LockedAttribute[],
  ingredientsList: FactoryIngredient[],
  outputTemplateCrc: CrcValue,
  outputTemplate: string,
  manufacturingComplexity: number,
  quality: number,
  category: string,
  outputQuantity: number = 1,
  manufacturingVolume: number = 1
): FactorySchematic {
  // Calculate base manufacturing time based on complexity and volume
  // More complex items take longer, larger volumes take longer
  const baseTime = calculateBaseManufacturingTime(manufacturingComplexity, manufacturingVolume);

  return {
    schematicId,
    draftSchematicId,
    draftSchematicCrc,
    schematicName,
    crafterId,
    crafterName,
    createdAt: Date.now(),
    itemAttributes: [...itemAttributes],
    ingredientsList: [...ingredientsList],
    outputTemplateCrc,
    outputTemplate,
    outputQuantity,
    manufacturingComplexity,
    baseManufacturingTime: baseTime,
    manufacturingVolume,
    serialNumberCounter: 0n,
    quality,
    category,
    inUse: false,
    installedInFactoryId: undefined,
  };
}

/**
 * Calculate the base manufacturing time for a schematic
 *
 * Time = baseTime * (1 + complexity/10) * volumeModifier
 *
 * @param complexity - Manufacturing complexity (1-25)
 * @param volume - Manufacturing volume
 * @returns Base manufacturing time in seconds
 */
export function calculateBaseManufacturingTime(
  complexity: number,
  volume: number
): number {
  const baseTime = 60; // 60 seconds base
  const complexityModifier = 1 + (complexity / 10);
  const volumeModifier = Math.max(1, Math.sqrt(volume));

  return Math.ceil(baseTime * complexityModifier * volumeModifier);
}

/**
 * Get the next serial number for items produced from this schematic
 */
export function getNextSerialNumber(schematic: FactorySchematic): bigint {
  schematic.serialNumberCounter += 1n;
  return schematic.serialNumberCounter;
}

/**
 * Validate that a factory schematic has all required fields
 */
export function validateFactorySchematic(schematic: FactorySchematic): string[] {
  const errors: string[] = [];

  if (schematic.schematicId === 0n) {
    errors.push('Schematic ID is required');
  }

  if (!schematic.draftSchematicId || schematic.draftSchematicId.trim().length === 0) {
    errors.push('Draft schematic ID is required');
  }

  if (!schematic.schematicName || schematic.schematicName.trim().length === 0) {
    errors.push('Schematic name is required');
  }

  if (schematic.crafterId === 0n) {
    errors.push('Crafter ID is required');
  }

  if (!schematic.ingredientsList || schematic.ingredientsList.length === 0) {
    errors.push('At least one ingredient is required');
  }

  if (!schematic.outputTemplate || schematic.outputTemplate.trim().length === 0) {
    errors.push('Output template is required');
  }

  if (schematic.outputQuantity < 1) {
    errors.push('Output quantity must be at least 1');
  }

  if (schematic.manufacturingComplexity < 1 || schematic.manufacturingComplexity > 25) {
    errors.push('Manufacturing complexity must be between 1 and 25');
  }

  if (schematic.quality < 0 || schematic.quality > 100) {
    errors.push('Quality must be between 0 and 100');
  }

  // Validate ingredients
  for (const ingredient of schematic.ingredientsList) {
    if (!ingredient.slotId || ingredient.slotId.trim().length === 0) {
      errors.push('Ingredient slot ID is required');
    }
    if (ingredient.quantity < 1) {
      errors.push(`Ingredient "${ingredient.slotName}" must have quantity >= 1`);
    }
    if (ingredient.isResource && !ingredient.resourceType && !ingredient.allowedResourceClasses) {
      errors.push(`Resource ingredient "${ingredient.slotName}" must specify resource type or classes`);
    }
    if (!ingredient.isResource && !ingredient.componentTemplateCrc) {
      errors.push(`Component ingredient "${ingredient.slotName}" must specify component template`);
    }
  }

  return errors;
}

/**
 * Calculate the total resources required for a manufacturing run
 *
 * @param schematic - The factory schematic
 * @param count - Number of items to manufacture
 * @returns Map of slot ID to total quantity required
 */
export function calculateTotalIngredientsRequired(
  schematic: FactorySchematic,
  count: number
): Map<string, number> {
  const totals = new Map<string, number>();

  for (const ingredient of schematic.ingredientsList) {
    totals.set(ingredient.slotId, ingredient.quantity * count);
  }

  return totals;
}

/**
 * Clone a factory schematic
 */
export function cloneFactorySchematic(
  schematic: FactorySchematic,
  newSchematicId: ObjectId
): FactorySchematic {
  return {
    ...schematic,
    schematicId: newSchematicId,
    createdAt: Date.now(),
    serialNumberCounter: 0n,
    inUse: false,
    installedInFactoryId: undefined,
    itemAttributes: schematic.itemAttributes.map((attr) => ({ ...attr })),
    ingredientsList: schematic.ingredientsList.map((ing) => ({ ...ing })),
  };
}

/**
 * Mark a schematic as installed in a factory
 */
export function installSchematicInFactory(
  schematic: FactorySchematic,
  factoryId: ObjectId
): void {
  schematic.inUse = true;
  schematic.installedInFactoryId = factoryId;
}

/**
 * Remove a schematic from a factory
 */
export function uninstallSchematicFromFactory(schematic: FactorySchematic): void {
  schematic.inUse = false;
  schematic.installedInFactoryId = undefined;
}

/**
 * Calculate quality percentage for display
 */
export function getQualityPercentage(schematic: FactorySchematic): number {
  return Math.round(schematic.quality);
}

/**
 * Get a display string for the schematic's quality tier
 */
export function getQualityTierName(quality: number): string {
  if (quality >= 95) return 'Exceptional';
  if (quality >= 85) return 'Superior';
  if (quality >= 70) return 'Above Average';
  if (quality >= 50) return 'Average';
  if (quality >= 30) return 'Below Average';
  if (quality >= 15) return 'Poor';
  return 'Junk';
}

/**
 * Serialize a factory schematic to JSON for persistence
 */
export function serializeFactorySchematic(
  schematic: FactorySchematic
): Record<string, unknown> {
  return {
    schematicId: schematic.schematicId.toString(),
    draftSchematicId: schematic.draftSchematicId,
    draftSchematicCrc: schematic.draftSchematicCrc,
    schematicName: schematic.schematicName,
    crafterId: schematic.crafterId.toString(),
    crafterName: schematic.crafterName,
    createdAt: schematic.createdAt,
    itemAttributes: schematic.itemAttributes,
    ingredientsList: schematic.ingredientsList.map((ing) => ({
      ...ing,
      componentTemplateCrc: ing.componentTemplateCrc,
    })),
    outputTemplateCrc: schematic.outputTemplateCrc,
    outputTemplate: schematic.outputTemplate,
    outputQuantity: schematic.outputQuantity,
    manufacturingComplexity: schematic.manufacturingComplexity,
    baseManufacturingTime: schematic.baseManufacturingTime,
    manufacturingVolume: schematic.manufacturingVolume,
    serialNumberCounter: schematic.serialNumberCounter.toString(),
    quality: schematic.quality,
    category: schematic.category,
    inUse: schematic.inUse,
    installedInFactoryId: schematic.installedInFactoryId?.toString(),
  };
}

/**
 * Deserialize a factory schematic from JSON
 */
export function deserializeFactorySchematic(
  data: Record<string, unknown>
): FactorySchematic {
  return {
    schematicId: BigInt(data['schematicId'] as string),
    draftSchematicId: data['draftSchematicId'] as string,
    draftSchematicCrc: data['draftSchematicCrc'] as number,
    schematicName: data['schematicName'] as string,
    crafterId: BigInt(data['crafterId'] as string),
    crafterName: data['crafterName'] as string,
    createdAt: data['createdAt'] as number,
    itemAttributes: data['itemAttributes'] as LockedAttribute[],
    ingredientsList: data['ingredientsList'] as FactoryIngredient[],
    outputTemplateCrc: data['outputTemplateCrc'] as number,
    outputTemplate: data['outputTemplate'] as string,
    outputQuantity: data['outputQuantity'] as number,
    manufacturingComplexity: data['manufacturingComplexity'] as number,
    baseManufacturingTime: data['baseManufacturingTime'] as number,
    manufacturingVolume: data['manufacturingVolume'] as number,
    serialNumberCounter: BigInt(data['serialNumberCounter'] as string),
    quality: data['quality'] as number,
    category: data['category'] as string,
    inUse: data['inUse'] as boolean,
    installedInFactoryId: data['installedInFactoryId']
      ? BigInt(data['installedInFactoryId'] as string)
      : undefined,
  };
}
