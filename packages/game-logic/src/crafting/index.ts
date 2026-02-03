/**
 * @file index.ts
 * SWG Crafting System - Draft Schematic Loader and Crafting Session Manager
 *
 * This module provides the core types and functionality for loading and
 * managing draft schematics in the Star Wars Galaxies crafting system,
 * as well as the CraftingSession class for managing crafting workflow.
 *
 * @example
 * ```typescript
 * import {
 *   SchematicLoader,
 *   SchematicCategory,
 *   getSchematicLoader,
 *   CraftingSession,
 *   getCraftingSessionManager
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
 *
 * // Start a crafting session
 * const sessionManager = getCraftingSessionManager();
 * const session = sessionManager.startSession(playerId, pistol, toolId);
 *
 * // Load ingredients
 * session.loadResource('metal_slot', resourceId, 100, 850);
 *
 * // Begin assembly
 * const assemblyResult = session.beginAssembly(playerSkill, toolBonus);
 *
 * // Experiment on attributes
 * const expResult = session.experiment('damage', 5, playerSkill, toolBonus);
 *
 * // Finalize the item
 * const output = session.finalize(() => generateObjectId());
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

// Crafting result types
export {
  CraftingErrorCode,
  craftingSuccess,
  craftingError,
} from './crafting-result.js';

export type {
  AssemblyResult,
  ExperimentationResult,
  ExperimentationAttempt,
  CraftingOutput,
  CraftingOperationResult,
} from './crafting-result.js';

// Crafting session
export { CraftingSession, CraftingStage } from './crafting-session.js';

export type { LoadedIngredient, ResourceAttributes } from './crafting-session.js';

// Crafting session manager
export {
  CraftingSessionManager,
  CraftingSessionEvent,
  getCraftingSessionManager,
  resetCraftingSessionManager,
} from './crafting-session-manager.js';

export type {
  CraftingSessionEventData,
  CraftingSessionEventListener,
  SessionManagerStats,
  SessionManagerOptions,
} from './crafting-session-manager.js';
