/**
 * @file crafting-session.ts
 * CraftingSession class for managing the crafting workflow in SWG
 *
 * A crafting session tracks the state of a single crafting attempt from
 * schematic selection through item creation. It manages ingredient loading,
 * assembly, experimentation, and final item creation.
 */

import type { ObjectId } from '@swg/shared-types';
import type { DraftSchematic, ExperimentationGroup } from './draft-schematic.js';
import type { IngredientSlot } from './ingredient-slot.js';
import { IngredientType, type ResourceWeights } from './schematic-types.js';
import {
  type AssemblyResult,
  type ExperimentationResult,
  type ExperimentationAttempt,
  type CraftingOutput,
  type CraftingOperationResult,
  CraftingErrorCode,
  craftingSuccess,
  craftingError,
} from './crafting-result.js';

/**
 * Stages of the crafting workflow
 */
export enum CraftingStage {
  /** Initial stage - player is selecting a schematic */
  SelectSchematic = 'select_schematic',

  /** Loading ingredients into slots */
  LoadIngredients = 'load_ingredients',

  /** Assembly phase - calculating base quality */
  Assembly = 'assembly',

  /** Experimentation phase - improving attributes */
  Experimentation = 'experimentation',

  /** Customization phase - naming, color, appearance */
  Customization = 'customization',

  /** Session completed successfully */
  Complete = 'complete',

  /** Session failed (critical failure, cancelled, etc.) */
  Failed = 'failed',
}

/**
 * Represents a loaded ingredient in a crafting slot
 */
export interface LoadedIngredient {
  /** The slot this ingredient is loaded into */
  slotId: string;

  /** Resource ID if this is a resource */
  resourceId?: ObjectId | undefined;

  /** Quantity of resource loaded */
  resourceQuantity?: number | undefined;

  /** Quality of the resource (0-1000 scale, SWG standard) */
  resourceQuality?: number | undefined;

  /** Resource attributes for quality calculation */
  resourceAttributes?: ResourceAttributes | undefined;

  /** Component object ID if this is a component */
  componentId?: ObjectId | undefined;

  /** Quantity of components (usually 1) */
  quantity: number;

  /** Quality of the component if applicable */
  componentQuality?: number | undefined;
}

/**
 * Resource attributes used for quality calculations.
 * Values are on the 0-1000 scale used in SWG.
 */
export interface ResourceAttributes {
  conductivity?: number | undefined;
  coldResistance?: number | undefined;
  decayResistance?: number | undefined;
  entangleResistance?: number | undefined;
  flavor?: number | undefined;
  heatResistance?: number | undefined;
  malleability?: number | undefined;
  overallQuality?: number | undefined;
  potentialEnergy?: number | undefined;
  shockResistance?: number | undefined;
  unitToughness?: number | undefined;
}

/**
 * Session ID counter for generating unique session IDs
 */
let sessionIdCounter = BigInt(0);

/**
 * Generates a unique session ID
 */
function generateSessionId(): bigint {
  sessionIdCounter += BigInt(1);
  return (BigInt(Date.now()) << BigInt(20)) | sessionIdCounter;
}

/**
 * CraftingSession manages a single crafting attempt.
 *
 * The crafting workflow follows these stages:
 * 1. SelectSchematic - Player selects what to craft
 * 2. LoadIngredients - Player fills ingredient slots with resources/components
 * 3. Assembly - System calculates base quality and rolls for success
 * 4. Experimentation - Player spends points to improve attributes
 * 5. Customization - Player names and customizes the item
 * 6. Complete/Failed - Session ends
 */
export class CraftingSession {
  // ============================================
  // Core Session Properties
  // ============================================

  /** Unique identifier for this session */
  readonly sessionId: bigint;

  /** Object ID of the crafter (player) */
  readonly crafterId: ObjectId;

  /** The schematic being crafted */
  readonly schematic: DraftSchematic;

  /** Object ID of the crafting tool being used */
  readonly craftingTool: ObjectId;

  /** Object ID of the crafting station (if any) */
  readonly craftingStation?: ObjectId | undefined;

  /** Current stage of the crafting workflow */
  private _stage: CraftingStage;

  /** Timestamp when the session was created */
  readonly createdAt: number;

  // ============================================
  // Ingredient Tracking
  // ============================================

  /** Loaded ingredients indexed by slot ID */
  private _loadedIngredients: Map<string, LoadedIngredient>;

  // ============================================
  // Assembly State
  // ============================================

  /** Calculated assembly quality (0-100) */
  private _assemblyQuality: number;

  /** Whether assembly has been attempted */
  private _assemblyAttempted: boolean;

  /** Result of the assembly phase */
  private _assemblyResult?: AssemblyResult | undefined;

  /** Calculated attribute values after assembly */
  private _assembledAttributes: Map<string, number>;

  // ============================================
  // Experimentation State
  // ============================================

  /** Remaining experimentation points */
  private _experimentationPoints: number;

  /** History of experimentation attempts */
  private _experimentationAttempts: ExperimentationAttempt[];

  /** Accumulated risk from experimentation */
  private _riskAccumulated: number;

  // ============================================
  // Output Tracking
  // ============================================

  /** Custom name for the crafted item */
  private _customName?: string | undefined;

  /** Output item ID once created */
  private _outputObjectId?: ObjectId | undefined;

  /**
   * Creates a new crafting session.
   *
   * @param crafterId - Object ID of the player crafting
   * @param schematic - The draft schematic to craft
   * @param craftingTool - Object ID of the crafting tool
   * @param craftingStation - Optional object ID of a crafting station
   */
  constructor(
    crafterId: ObjectId,
    schematic: DraftSchematic,
    craftingTool: ObjectId,
    craftingStation?: ObjectId
  ) {
    this.sessionId = generateSessionId();
    this.crafterId = crafterId;
    this.schematic = schematic;
    this.craftingTool = craftingTool;
    this.craftingStation = craftingStation;
    this.createdAt = Date.now();

    this._stage = CraftingStage.LoadIngredients;
    this._loadedIngredients = new Map();
    this._assemblyQuality = 0;
    this._assemblyAttempted = false;
    this._assembledAttributes = new Map();
    this._experimentationPoints = schematic.experimentation?.maxPoints ?? 0;
    this._experimentationAttempts = [];
    this._riskAccumulated = 0;
  }

  // ============================================
  // Factory Method
  // ============================================

  /**
   * Creates a new crafting session.
   *
   * @param crafterId - Object ID of the player crafting
   * @param schematic - The draft schematic to craft
   * @param tool - Object ID of the crafting tool
   * @param station - Optional object ID of a crafting station
   * @returns A new CraftingSession instance
   */
  static create(
    crafterId: ObjectId,
    schematic: DraftSchematic,
    tool: ObjectId,
    station?: ObjectId
  ): CraftingSession {
    return new CraftingSession(crafterId, schematic, tool, station);
  }

  // ============================================
  // Property Getters
  // ============================================

  /** Current stage of the crafting workflow */
  get stage(): CraftingStage {
    return this._stage;
  }

  /** Map of loaded ingredients by slot ID */
  get loadedIngredients(): ReadonlyMap<string, LoadedIngredient> {
    return this._loadedIngredients;
  }

  /** Calculated assembly quality (0-100) */
  get assemblyQuality(): number {
    return this._assemblyQuality;
  }

  /** Whether assembly has been attempted */
  get assemblyAttempted(): boolean {
    return this._assemblyAttempted;
  }

  /** Result of the assembly phase */
  get assemblyResult(): AssemblyResult | undefined {
    return this._assemblyResult;
  }

  /** Remaining experimentation points */
  get experimentationPoints(): number {
    return this._experimentationPoints;
  }

  /** History of experimentation attempts */
  get experimentationAttempts(): readonly ExperimentationAttempt[] {
    return this._experimentationAttempts;
  }

  /** Accumulated risk from experimentation */
  get riskAccumulated(): number {
    return this._riskAccumulated;
  }

  /** Current attribute values */
  get currentAttributes(): ReadonlyMap<string, number> {
    return this._assembledAttributes;
  }

  /** Custom name for the item */
  get customName(): string | undefined {
    return this._customName;
  }

  /** Output item object ID */
  get outputObjectId(): ObjectId | undefined {
    return this._outputObjectId;
  }

  // ============================================
  // Ingredient Loading
  // ============================================

  /**
   * Loads a resource into an ingredient slot.
   *
   * @param slotId - The slot to load the resource into
   * @param resourceId - Object ID of the resource
   * @param quantity - Quantity of resource to use
   * @param resourceQuality - Quality of the resource (0-1000)
   * @param resourceAttributes - Resource attributes for quality calculation
   * @returns Operation result
   */
  loadResource(
    slotId: string,
    resourceId: ObjectId,
    quantity: number,
    resourceQuality: number = 500,
    resourceAttributes: ResourceAttributes = {}
  ): CraftingOperationResult {
    // Check stage
    if (this._stage !== CraftingStage.LoadIngredients) {
      return craftingError(CraftingErrorCode.InvalidStage);
    }

    // Find the slot
    const slot = this.schematic.slots.find((s) => s.slotId === slotId);
    if (!slot) {
      return craftingError(CraftingErrorCode.InvalidSlot, `Slot "${slotId}" not found`);
    }

    // Verify slot accepts resources
    if (slot.slotType !== IngredientType.Resource && slot.slotType !== IngredientType.Optional) {
      return craftingError(
        CraftingErrorCode.InvalidResourceType,
        `Slot "${slotId}" does not accept resources`
      );
    }

    // Check quantity
    if (quantity < slot.quantityRequired) {
      return craftingError(
        CraftingErrorCode.InsufficientQuantity,
        `Slot requires ${slot.quantityRequired} units, only ${quantity} provided`
      );
    }

    // Load the ingredient
    const ingredient: LoadedIngredient = {
      slotId,
      resourceId,
      resourceQuantity: quantity,
      resourceQuality,
      resourceAttributes,
      quantity,
    };

    this._loadedIngredients.set(slotId, ingredient);
    return craftingSuccess();
  }

  /**
   * Loads a component into an ingredient slot.
   *
   * @param slotId - The slot to load the component into
   * @param componentId - Object ID of the component
   * @param componentQuality - Quality of the component (0-100)
   * @returns Operation result
   */
  loadComponent(
    slotId: string,
    componentId: ObjectId,
    componentQuality: number = 50
  ): CraftingOperationResult {
    // Check stage
    if (this._stage !== CraftingStage.LoadIngredients) {
      return craftingError(CraftingErrorCode.InvalidStage);
    }

    // Find the slot
    const slot = this.schematic.slots.find((s) => s.slotId === slotId);
    if (!slot) {
      return craftingError(CraftingErrorCode.InvalidSlot, `Slot "${slotId}" not found`);
    }

    // Verify slot accepts components
    if (slot.slotType !== IngredientType.Component && slot.slotType !== IngredientType.Identical) {
      return craftingError(
        CraftingErrorCode.InvalidComponentType,
        `Slot "${slotId}" does not accept components`
      );
    }

    // Check component quality requirement
    if (slot.minComponentQuality !== undefined && componentQuality < slot.minComponentQuality) {
      return craftingError(
        CraftingErrorCode.ComponentQualityTooLow,
        `Component quality ${componentQuality} is below minimum ${slot.minComponentQuality}`
      );
    }

    // Load the ingredient
    const ingredient: LoadedIngredient = {
      slotId,
      componentId,
      quantity: 1,
      componentQuality,
    };

    this._loadedIngredients.set(slotId, ingredient);
    return craftingSuccess();
  }

  /**
   * Removes an ingredient from a slot.
   *
   * @param slotId - The slot to unload
   * @returns The unloaded ingredient, or undefined if slot was empty
   */
  unloadSlot(slotId: string): CraftingOperationResult<LoadedIngredient | undefined> {
    // Check stage
    if (this._stage !== CraftingStage.LoadIngredients) {
      return craftingError(CraftingErrorCode.InvalidStage);
    }

    const ingredient = this._loadedIngredients.get(slotId);
    this._loadedIngredients.delete(slotId);
    return craftingSuccess(ingredient);
  }

  /**
   * Checks if all required slots are filled.
   */
  areAllRequiredSlotsFilled(): boolean {
    for (const slot of this.schematic.slots) {
      if (!slot.optional && !this._loadedIngredients.has(slot.slotId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Gets the list of empty required slots.
   */
  getEmptyRequiredSlots(): IngredientSlot[] {
    return this.schematic.slots.filter(
      (slot) => !slot.optional && !this._loadedIngredients.has(slot.slotId)
    );
  }

  // ============================================
  // Quality Calculation
  // ============================================

  /**
   * Calculates the quality contribution from a single slot.
   *
   * Quality is determined by the weighted average of resource attributes
   * as defined in the slot's resourceWeights.
   *
   * @param slot - The ingredient slot
   * @param ingredient - The loaded ingredient
   * @returns Quality value (0-100)
   */
  calculateSlotQuality(slot: IngredientSlot, ingredient: LoadedIngredient): number {
    // Component slots contribute their component quality directly
    if (ingredient.componentId !== undefined) {
      return ingredient.componentQuality ?? 50;
    }

    // Resource slots use weighted attributes
    if (!ingredient.resourceAttributes) {
      // No attributes, use base quality
      return (ingredient.resourceQuality ?? 500) / 10;
    }

    const weights = slot.resourceWeights;
    const attrs = ingredient.resourceAttributes;

    let weightedSum = 0;
    let totalWeight = 0;

    // Calculate weighted average of resource attributes
    for (const [attrName, weight] of Object.entries(weights)) {
      if (weight && weight > 0) {
        const attrValue = attrs[attrName as keyof ResourceAttributes] ?? 0;
        weightedSum += attrValue * weight;
        totalWeight += weight;
      }
    }

    // If no weights defined, use overall quality
    if (totalWeight === 0) {
      return (attrs.overallQuality ?? ingredient.resourceQuality ?? 500) / 10;
    }

    // Convert from 0-1000 scale to 0-100
    let quality = weightedSum / totalWeight / 10;

    // Apply quality cap if defined
    if (slot.qualityCap !== undefined) {
      quality = Math.min(quality, slot.qualityCap);
    }

    return Math.max(0, Math.min(100, quality));
  }

  /**
   * Calculates the overall assembly quality from all loaded ingredients.
   *
   * The assembly quality is the weighted average of all slot qualities,
   * with required slots contributing more than optional slots.
   *
   * @returns Overall quality (0-100)
   */
  calculateAssemblyQuality(): number {
    let totalQuality = 0;
    let totalWeight = 0;

    for (const slot of this.schematic.slots) {
      const ingredient = this._loadedIngredients.get(slot.slotId);

      // Skip empty optional slots
      if (!ingredient) {
        continue;
      }

      const slotQuality = this.calculateSlotQuality(slot, ingredient);

      // Required slots get weight 1.0, optional slots get weight 0.5
      const weight = slot.optional ? 0.5 : 1.0;

      totalQuality += slotQuality * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return 0;
    }

    return totalQuality / totalWeight;
  }

  // ============================================
  // Assembly Phase
  // ============================================

  /**
   * Begins the assembly phase.
   *
   * This calculates the base quality from ingredients and performs
   * the assembly success roll. A critical success provides bonus quality,
   * while a critical failure destroys the item.
   *
   * @param crafterSkill - The crafter's relevant skill level (0-100)
   * @param toolBonus - Bonus from the crafting tool (0-100)
   * @returns The assembly result
   */
  beginAssembly(crafterSkill: number = 50, toolBonus: number = 0): CraftingOperationResult<AssemblyResult> {
    // Check stage
    if (this._stage !== CraftingStage.LoadIngredients) {
      return craftingError(CraftingErrorCode.InvalidStage);
    }

    // Check all required slots are filled
    const emptySlots = this.getEmptyRequiredSlots();
    if (emptySlots.length > 0) {
      return craftingError(
        CraftingErrorCode.SlotEmpty,
        `Required slots are empty: ${emptySlots.map((s) => s.slotName).join(', ')}`
      );
    }

    this._assemblyAttempted = true;

    // Calculate base quality from ingredients
    const baseQuality = this.calculateAssemblyQuality();
    this._assemblyQuality = baseQuality;

    // Calculate success chance
    const assembly = this.schematic.assembly;
    const skillBonus = crafterSkill * assembly.skillModifier;
    const toolBonusFactor = toolBonus / 100;
    const complexityPenalty = this.schematic.complexity * 0.02;

    let successChance = assembly.baseSuccessRate + skillBonus + toolBonusFactor - complexityPenalty;
    successChance = Math.max(0.05, Math.min(0.99, successChance));

    // Roll for success
    const roll = Math.random();

    // Initialize attribute values from schematic
    this.initializeAttributes(baseQuality);

    // Determine result
    let result: AssemblyResult;

    if (roll < assembly.criticalFailureThreshold) {
      // Critical failure - item destroyed
      result = {
        success: false,
        quality: 0,
        criticalSuccess: false,
        criticalFailure: true,
        message: 'Critical failure! The components were destroyed.',
        roll,
      };
      this._stage = CraftingStage.Failed;
    } else if (roll > successChance) {
      // Regular failure
      result = {
        success: false,
        quality: baseQuality * 0.5,
        criticalSuccess: false,
        criticalFailure: false,
        message: 'Assembly failed. The item quality has been reduced.',
        roll,
      };
      // Reduce attribute values
      this._assemblyQuality = baseQuality * 0.5;
      this.applyQualityReduction(0.5);
      this._stage = CraftingStage.Experimentation;
    } else if (roll > 1 - assembly.criticalSuccessThreshold + successChance) {
      // Critical success - bonus quality
      const criticalBonus = 10 + Math.floor(Math.random() * 10);
      const boostedQuality = Math.min(100, baseQuality + criticalBonus);
      this._assemblyQuality = boostedQuality;

      result = {
        success: true,
        quality: boostedQuality,
        criticalSuccess: true,
        criticalFailure: false,
        message: 'Amazing success! The item has exceptional quality.',
        roll,
        criticalBonus,
      };
      this.applyQualityBonus(criticalBonus / 100);
      this._stage = CraftingStage.Experimentation;
    } else {
      // Regular success
      result = {
        success: true,
        quality: baseQuality,
        criticalSuccess: false,
        criticalFailure: false,
        message: 'Assembly successful.',
        roll,
      };
      this._stage = CraftingStage.Experimentation;
    }

    this._assemblyResult = result;
    return craftingSuccess(result);
  }

  /**
   * Initializes attribute values based on schematic and base quality.
   */
  private initializeAttributes(baseQuality: number): void {
    this._assembledAttributes.clear();

    for (const attr of this.schematic.itemAttributes) {
      // Calculate initial value based on base quality
      const range = attr.maxValue - attr.minValue;
      const qualityFactor = baseQuality / 100;
      const value = attr.minValue + range * qualityFactor;

      this._assembledAttributes.set(attr.attributeName, value);
    }
  }

  /**
   * Applies a quality reduction to all attributes (for failed assembly).
   */
  private applyQualityReduction(factor: number): void {
    for (const attr of this.schematic.itemAttributes) {
      const currentValue = this._assembledAttributes.get(attr.attributeName) ?? attr.baseValue;
      const range = currentValue - attr.minValue;
      const newValue = attr.minValue + range * factor;
      this._assembledAttributes.set(attr.attributeName, newValue);
    }
  }

  /**
   * Applies a quality bonus to all attributes (for critical success).
   */
  private applyQualityBonus(bonusFactor: number): void {
    for (const attr of this.schematic.itemAttributes) {
      const currentValue = this._assembledAttributes.get(attr.attributeName) ?? attr.baseValue;
      const range = attr.maxValue - currentValue;
      const bonus = range * bonusFactor;
      const newValue = Math.min(attr.maxValue, currentValue + bonus);
      this._assembledAttributes.set(attr.attributeName, newValue);
    }
  }

  // ============================================
  // Experimentation Phase
  // ============================================

  /**
   * Performs an experimentation attempt on an attribute group.
   *
   * Experimentation allows the crafter to improve specific attributes
   * at the cost of experimentation points. Each attempt carries risk
   * of degradation or item destruction.
   *
   * @param groupName - Name of the experimentation group
   * @param points - Number of points to spend (1-10)
   * @param crafterSkill - The crafter's experimentation skill (0-100)
   * @param toolBonus - Bonus from the crafting tool (0-100)
   * @returns The experimentation result
   */
  experiment(
    groupName: string,
    points: number,
    crafterSkill: number = 50,
    toolBonus: number = 0
  ): CraftingOperationResult<ExperimentationResult> {
    // Check stage
    if (this._stage !== CraftingStage.Experimentation) {
      return craftingError(CraftingErrorCode.InvalidStage);
    }

    // Check points available
    if (points > this._experimentationPoints) {
      return craftingError(
        CraftingErrorCode.NoExperimentationPoints,
        `Only ${this._experimentationPoints} points remaining`
      );
    }

    // Validate points range
    points = Math.max(1, Math.min(10, points));

    // Find the experimentation group
    const expConfig = this.schematic.experimentation;
    if (!expConfig) {
      return craftingError(
        CraftingErrorCode.InvalidExperimentationGroup,
        'This schematic does not support experimentation'
      );
    }

    const group = expConfig.groups.find((g) => g.groupName === groupName);
    if (!group) {
      return craftingError(
        CraftingErrorCode.InvalidExperimentationGroup,
        `Experimentation group "${groupName}" not found`
      );
    }

    // Deduct points
    this._experimentationPoints -= points;

    // Calculate success chance
    const baseChance = 0.5 + crafterSkill * 0.004 + toolBonus * 0.002;
    const pointPenalty = points * 0.05; // More points = lower chance
    const riskPenalty = this._riskAccumulated * 0.1;
    const successChance = Math.max(0.1, Math.min(0.95, baseChance - pointPenalty - riskPenalty));

    // Roll for success
    const roll = Math.random();

    // Add risk
    const riskIncrease = expConfig.riskPerAttempt * points;
    this._riskAccumulated += riskIncrease;

    // Check for risk failure (item destroyed)
    if (this._riskAccumulated >= 1.0) {
      const result: ExperimentationResult = {
        success: false,
        improvement: 0,
        criticalSuccess: false,
        criticalFailure: true,
        riskFailed: true,
        message: 'The item was destroyed due to accumulated experimentation risk!',
        groupName,
        pointsSpent: points,
        roll,
      };

      this.recordExperimentationAttempt(group.groupName, points, result);
      this._stage = CraftingStage.Failed;
      return craftingSuccess(result);
    }

    // Determine result
    let result: ExperimentationResult;

    if (roll < 0.03) {
      // Critical failure - significant degradation
      const degradation = -(5 + Math.random() * 10);
      this.applyExperimentationBonus(group, degradation);

      result = {
        success: false,
        improvement: degradation,
        criticalSuccess: false,
        criticalFailure: true,
        riskFailed: false,
        message: 'Critical failure! The attributes have significantly degraded.',
        groupName,
        pointsSpent: points,
        roll,
      };
    } else if (roll > successChance) {
      // Regular failure - minor degradation
      const degradation = -(1 + Math.random() * 3);
      this.applyExperimentationBonus(group, degradation);

      result = {
        success: false,
        improvement: degradation,
        criticalSuccess: false,
        criticalFailure: false,
        riskFailed: false,
        message: 'Experimentation failed. Minor degradation occurred.',
        groupName,
        pointsSpent: points,
        roll,
      };
    } else if (roll > 0.97) {
      // Critical success - maximum improvement
      const maxImprovement = group.maxImprovement;
      const improvement = maxImprovement * (0.8 + Math.random() * 0.2);
      this.applyExperimentationBonus(group, improvement);

      result = {
        success: true,
        improvement,
        criticalSuccess: true,
        criticalFailure: false,
        riskFailed: false,
        message: 'Amazing success! Maximum improvement achieved!',
        groupName,
        pointsSpent: points,
        roll,
      };
    } else {
      // Regular success
      const baseImprovement = group.maxImprovement * (points / 10);
      const improvement = baseImprovement * (0.5 + Math.random() * 0.5);
      this.applyExperimentationBonus(group, improvement);

      result = {
        success: true,
        improvement,
        criticalSuccess: false,
        criticalFailure: false,
        riskFailed: false,
        message: 'Experimentation successful.',
        groupName,
        pointsSpent: points,
        roll,
      };
    }

    this.recordExperimentationAttempt(group.groupName, points, result);
    return craftingSuccess(result);
  }

  /**
   * Applies experimentation bonus/penalty to attributes in a group.
   */
  applyExperimentationBonus(group: ExperimentationGroup, improvement: number): void {
    for (const attrName of group.attributes) {
      const attr = this.schematic.itemAttributes.find((a) => a.attributeName === attrName);
      if (!attr || attr.experimentationModifier <= 0) {
        continue;
      }

      const currentValue = this._assembledAttributes.get(attrName) ?? attr.baseValue;
      const range = attr.maxValue - attr.minValue;

      // Apply improvement (as percentage of range)
      const delta = (range * improvement * attr.experimentationModifier) / 100;
      let newValue = currentValue + delta;

      // Clamp to valid range
      newValue = Math.max(attr.minValue, Math.min(attr.maxValue, newValue));
      this._assembledAttributes.set(attrName, newValue);
    }
  }

  /**
   * Records an experimentation attempt in the history.
   */
  private recordExperimentationAttempt(
    groupName: string,
    pointsSpent: number,
    result: ExperimentationResult
  ): void {
    this._experimentationAttempts.push({
      groupName,
      pointsSpent,
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Skips the experimentation phase.
   */
  skipExperimentation(): CraftingOperationResult {
    if (this._stage !== CraftingStage.Experimentation) {
      return craftingError(CraftingErrorCode.InvalidStage);
    }

    this._stage = CraftingStage.Customization;
    return craftingSuccess();
  }

  // ============================================
  // Customization Phase
  // ============================================

  /**
   * Sets a custom name for the crafted item.
   *
   * @param name - The custom name
   */
  setCustomName(name: string): CraftingOperationResult {
    if (
      this._stage !== CraftingStage.Customization &&
      this._stage !== CraftingStage.Experimentation
    ) {
      return craftingError(CraftingErrorCode.InvalidStage);
    }

    // Basic name validation
    if (name.length > 64) {
      name = name.substring(0, 64);
    }

    this._customName = name;
    return craftingSuccess();
  }

  /**
   * Proceeds to customization phase (from experimentation).
   */
  beginCustomization(): CraftingOperationResult {
    if (this._stage !== CraftingStage.Experimentation) {
      return craftingError(CraftingErrorCode.InvalidStage);
    }

    this._stage = CraftingStage.Customization;
    return craftingSuccess();
  }

  // ============================================
  // Finalization
  // ============================================

  /**
   * Finalizes the crafting session and creates the output item.
   *
   * This is the final step that creates the actual item object.
   * The returned CraftingOutput contains the item ID and final stats.
   *
   * @param objectIdGenerator - Function to generate the output object ID
   * @returns The crafting output or error
   */
  finalize(objectIdGenerator: () => ObjectId): CraftingOperationResult<CraftingOutput> {
    // Check stage - can finalize from Experimentation or Customization
    if (
      this._stage !== CraftingStage.Experimentation &&
      this._stage !== CraftingStage.Customization
    ) {
      return craftingError(CraftingErrorCode.InvalidStage);
    }

    // Check assembly was successful
    if (!this._assemblyResult || !this._assemblyResult.success) {
      return craftingError(CraftingErrorCode.AssemblyNotComplete);
    }

    // Generate output object ID
    const outputId = objectIdGenerator();
    this._outputObjectId = outputId;

    // Calculate final quality
    const finalQuality = this._assemblyQuality;

    // Calculate XP awarded
    const baseXp = this.schematic.xpAmount;
    const qualityBonus = finalQuality / 100;
    const xpAwarded = Math.floor(baseXp * (0.5 + qualityBonus * 0.5));

    // Create output
    const output: CraftingOutput = {
      objectId: outputId,
      quality: finalQuality,
      attributes: new Map(this._assembledAttributes),
      xpAwarded,
      xpType: this.schematic.xpType,
      isFactorySchematic: false,
    };

    this._stage = CraftingStage.Complete;
    return craftingSuccess(output);
  }

  // ============================================
  // Cancellation
  // ============================================

  /**
   * Cancels the crafting session.
   *
   * Returns the loaded ingredients so they can be returned to the player.
   *
   * @returns Map of ingredients that should be returned
   */
  cancel(): CraftingOperationResult<Map<string, LoadedIngredient>> {
    // Can't cancel completed or already failed sessions
    if (this._stage === CraftingStage.Complete || this._stage === CraftingStage.Failed) {
      return craftingError(CraftingErrorCode.SessionComplete);
    }

    // Get ingredients to return
    const ingredientsToReturn = new Map(this._loadedIngredients);

    // Clear loaded ingredients
    this._loadedIngredients.clear();

    // Mark as failed
    this._stage = CraftingStage.Failed;

    return craftingSuccess(ingredientsToReturn);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Checks if the session is still active (not complete or failed).
   */
  isActive(): boolean {
    return this._stage !== CraftingStage.Complete && this._stage !== CraftingStage.Failed;
  }

  /**
   * Gets the duration of the session in milliseconds.
   */
  getDuration(): number {
    return Date.now() - this.createdAt;
  }

  /**
   * Serializes the session to a plain object for debugging/logging.
   */
  toJSON(): Record<string, unknown> {
    return {
      sessionId: this.sessionId.toString(),
      crafterId: this.crafterId.toString(),
      schematicId: this.schematic.schematicId,
      schematicName: this.schematic.schematicName,
      craftingTool: this.craftingTool.toString(),
      craftingStation: this.craftingStation?.toString(),
      stage: this._stage,
      createdAt: this.createdAt,
      duration: this.getDuration(),
      loadedIngredients: Object.fromEntries(this._loadedIngredients),
      assemblyQuality: this._assemblyQuality,
      assemblyAttempted: this._assemblyAttempted,
      assemblyResult: this._assemblyResult,
      experimentationPoints: this._experimentationPoints,
      experimentationAttempts: this._experimentationAttempts,
      riskAccumulated: this._riskAccumulated,
      attributes: Object.fromEntries(this._assembledAttributes),
      customName: this._customName,
      outputObjectId: this._outputObjectId?.toString(),
    };
  }
}
