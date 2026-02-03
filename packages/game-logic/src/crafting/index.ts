/**
 * @file index.ts
 * SWG Crafting System - Draft Schematic Loader
 *
 * This module provides the core types and functionality for loading and
 * managing draft schematics in the Star Wars Galaxies crafting system.
 *
 * @example
 * ```typescript
 * import {
 *   SchematicLoader,
 *   SchematicCategory,
 *   getSchematicLoader
 * } from '@swg/game-logic/crafting';
 *
 * // Load schematics from data directory
 * const loader = getSchematicLoader();
 * await loader.loadSchematics('./data/schematics');
 *
 * // Get a specific schematic
 * const pistol = loader.getSchematic('weapon_pistol_cdef');
 *
 * // Get all weapon schematics
 * const weapons = loader.getSchematicsByCategory(SchematicCategory.Weapon);
 *
 * // Get schematics by skill
 * const noviceSchematics = loader.getSchematicsBySkill('crafting_weaponsmith_novice');
 * ```
 */

// Core types and enums
export {
  SchematicCategory,
  IngredientType,
  CraftingComplexity,
  CraftingToolType,
  CraftingXpType,
  SchematicResultCode,
  CommonWeightConfigs,
  EMPTY_WEIGHTS,
} from './schematic-types.js';

export type { ResourceWeights } from './schematic-types.js';

// Ingredient slot types and utilities
export {
  createResourceSlot,
  createComponentSlot,
  createIdenticalSlot,
  createOptionalSlot,
  validateIngredientSlot,
  calculateTotalResourceUnits,
  getRequiredResourceTypes,
  getRequiredComponents,
} from './ingredient-slot.js';

export type { IngredientSlot } from './ingredient-slot.js';

// Draft schematic interface and utilities
export {
  DEFAULT_ASSEMBLY_CONFIG,
  createDraftSchematic,
  validateDraftSchematic,
  getRequiredSlotCount,
  getExperimentableAttributes,
  getEffectiveComplexity,
} from './draft-schematic.js';

export type {
  DraftSchematic,
  SchematicAttribute,
  AssemblyConfig,
  ExperimentationConfig,
  ExperimentationGroup,
} from './draft-schematic.js';

// Schematic loader
export {
  SchematicLoader,
  calculateSchematicCrc,
  getSchematicLoader,
  loadSchematics,
  getSchematic,
  getSchematicByCrc,
  getSchematicsByCategory,
  getSchematicsBySkill,
} from './schematic-loader.js';

export type { SchematicLoadResult, BulkLoadResult } from './schematic-loader.js';
