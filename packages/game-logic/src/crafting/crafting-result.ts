/**
 * @file crafting-result.ts
 * Result types for crafting operations in SWG
 */

import type { ObjectId } from '@swg/shared-types';

/**
 * Result of the assembly phase of crafting.
 * Assembly determines base quality from ingredients and can critically succeed/fail.
 */
export interface AssemblyResult {
  /** Whether assembly succeeded */
  success: boolean;

  /** Base quality of the assembled item (0-100) */
  quality: number;

  /** Whether a critical success occurred (bonus quality) */
  criticalSuccess: boolean;

  /** Whether a critical failure occurred (item destroyed) */
  criticalFailure: boolean;

  /** Descriptive message for the player */
  message: string;

  /** The success roll value (for debugging/logging) */
  roll?: number | undefined;

  /** Quality bonus from critical success */
  criticalBonus?: number | undefined;
}

/**
 * Result of a single experimentation attempt.
 * Experimentation improves attributes but carries risk of degradation.
 */
export interface ExperimentationResult {
  /** Whether the experimentation succeeded */
  success: boolean;

  /** Improvement percentage achieved (negative if degraded) */
  improvement: number;

  /** Whether a critical success occurred (bonus improvement) */
  criticalSuccess: boolean;

  /** Whether a critical failure occurred (significant degradation) */
  criticalFailure: boolean;

  /** Whether accumulated risk caused the item to fail */
  riskFailed: boolean;

  /** Descriptive message for the player */
  message: string;

  /** The experimentation group that was targeted */
  groupName: string;

  /** Points spent on this attempt */
  pointsSpent: number;

  /** The success roll value (for debugging/logging) */
  roll?: number | undefined;
}

/**
 * Tracks a single experimentation attempt for history.
 */
export interface ExperimentationAttempt {
  /** Name of the experimentation group targeted */
  groupName: string;

  /** Number of points spent on this attempt */
  pointsSpent: number;

  /** Result of the experimentation */
  result: ExperimentationResult;

  /** Timestamp of the attempt */
  timestamp: number;
}

/**
 * Final output of a completed crafting session.
 */
export interface CraftingOutput {
  /** Object ID of the created item */
  objectId: ObjectId;

  /** Final quality of the item (0-100) */
  quality: number;

  /** Final attribute values after all modifications */
  attributes: Map<string, number>;

  /** Crafting XP awarded to the player */
  xpAwarded: number;

  /** Type of XP awarded */
  xpType: string;

  /** Whether the item is a factory schematic (for mass production) */
  isFactorySchematic?: boolean | undefined;

  /** Serial number for factory-produced items */
  serialNumber?: number | undefined;
}

/**
 * Error codes for crafting operations
 */
export enum CraftingErrorCode {
  /** No error */
  Success = 0,

  /** Session not found or invalid */
  InvalidSession = 1,

  /** Player doesn't have required skill */
  MissingSkill = 2,

  /** Crafting tool not compatible */
  InvalidTool = 3,

  /** Station required but not present */
  StationRequired = 4,

  /** Invalid schematic */
  InvalidSchematic = 5,

  /** Slot not found in schematic */
  InvalidSlot = 6,

  /** Resource type not accepted by slot */
  InvalidResourceType = 7,

  /** Component type not accepted by slot */
  InvalidComponentType = 8,

  /** Insufficient resource quantity */
  InsufficientQuantity = 9,

  /** Component quality too low */
  ComponentQualityTooLow = 10,

  /** Required slot is empty */
  SlotEmpty = 11,

  /** Operation not valid in current stage */
  InvalidStage = 12,

  /** No experimentation points remaining */
  NoExperimentationPoints = 13,

  /** Experimentation group not found */
  InvalidExperimentationGroup = 14,

  /** Assembly has not been completed */
  AssemblyNotComplete = 15,

  /** Session has already been completed */
  SessionComplete = 16,

  /** Item was destroyed during crafting */
  ItemDestroyed = 17,

  /** Player inventory full */
  InventoryFull = 18,

  /** Internal server error */
  InternalError = 99,
}

/**
 * Result of a crafting operation with error information
 */
export interface CraftingOperationResult<T = void> {
  /** Whether the operation succeeded */
  success: boolean;

  /** Error code if failed */
  errorCode: CraftingErrorCode;

  /** Human-readable error message */
  errorMessage?: string | undefined;

  /** Result data if successful */
  data?: T | undefined;
}

/**
 * Creates a successful operation result
 */
export function craftingSuccess<T>(data?: T): CraftingOperationResult<T> {
  return {
    success: true,
    errorCode: CraftingErrorCode.Success,
    data,
  };
}

/**
 * Creates a failed operation result
 */
export function craftingError<T>(
  code: CraftingErrorCode,
  message?: string
): CraftingOperationResult<T> {
  return {
    success: false,
    errorCode: code,
    errorMessage: message || getErrorMessage(code),
  };
}

/**
 * Gets the default error message for an error code
 */
function getErrorMessage(code: CraftingErrorCode): string {
  switch (code) {
    case CraftingErrorCode.Success:
      return 'Success';
    case CraftingErrorCode.InvalidSession:
      return 'Invalid or expired crafting session';
    case CraftingErrorCode.MissingSkill:
      return 'You do not have the required skill';
    case CraftingErrorCode.InvalidTool:
      return 'This tool cannot craft this schematic';
    case CraftingErrorCode.StationRequired:
      return 'A crafting station is required for this schematic';
    case CraftingErrorCode.InvalidSchematic:
      return 'Invalid schematic';
    case CraftingErrorCode.InvalidSlot:
      return 'Invalid ingredient slot';
    case CraftingErrorCode.InvalidResourceType:
      return 'This resource cannot be used in this slot';
    case CraftingErrorCode.InvalidComponentType:
      return 'This component cannot be used in this slot';
    case CraftingErrorCode.InsufficientQuantity:
      return 'Insufficient resources';
    case CraftingErrorCode.ComponentQualityTooLow:
      return 'Component quality is too low';
    case CraftingErrorCode.SlotEmpty:
      return 'A required ingredient slot is empty';
    case CraftingErrorCode.InvalidStage:
      return 'This action is not available in the current crafting stage';
    case CraftingErrorCode.NoExperimentationPoints:
      return 'No experimentation points remaining';
    case CraftingErrorCode.InvalidExperimentationGroup:
      return 'Invalid experimentation group';
    case CraftingErrorCode.AssemblyNotComplete:
      return 'Assembly has not been completed';
    case CraftingErrorCode.SessionComplete:
      return 'This crafting session has already been completed';
    case CraftingErrorCode.ItemDestroyed:
      return 'The item was destroyed during crafting';
    case CraftingErrorCode.InventoryFull:
      return 'Your inventory is full';
    case CraftingErrorCode.InternalError:
    default:
      return 'An internal error occurred';
  }
}
