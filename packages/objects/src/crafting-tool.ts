/**
 * CraftingTool - Crafting tools used to create items from schematics
 * Extends TangibleObject with crafting-specific properties like tool type,
 * effectiveness bonuses, and complexity limits.
 *
 * SWG crafting tools determine:
 * - Which profession schematics can be crafted
 * - Bonus to assembly success rolls
 * - Bonus to experimentation success
 * - Maximum schematic complexity supported
 *
 * Baseline Types:
 * - TANO3: Base tangible properties
 * - TANO6: Combat/defender data (inherited)
 * - Custom crafting tool properties are tracked via delta system
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { TangibleObject } from './tangible-object.js';
import { ObjectType } from './scene-object.js';
import { DeltaTracker, DeltaType } from './deltas.js';
import {
  CraftingToolType,
  ToolQuality,
  SchematicType,
  TOOL_SCHEMATIC_TYPES,
  TOOL_SKILL_REQUIREMENTS,
  TOOL_EFFECTIVENESS_BY_QUALITY,
  TOOL_COMPLEXITY_BY_QUALITY,
  getCraftingToolTypeName,
  getToolQualityName,
  canToolCraftSchematicType,
} from './crafting-tool-types.js';

/**
 * CRFT property indices for delta tracking
 * These are custom property indices for crafting tool baselines
 */
export const CrftProperty = {
  // Crafting tool specific properties
  CRAFTING_TOOL_TYPE: 0,
  EFFECTIVENESS: 1,
  COMPLEXITY_LIMIT: 2,
  IS_STATION: 3,
  TOOL_QUALITY: 4,
  EXPERIMENTATION_BONUS: 5,
  ASSEMBLY_BONUS: 6,
  USES_REMAINING: 7,
  MAX_USES: 8,
} as const;

/**
 * Schematic interface for type checking tool compatibility
 */
export interface CraftingSchematic {
  /** Unique schematic identifier */
  schematicId: ObjectId;
  /** The type of item this schematic creates */
  schematicType: SchematicType;
  /** Complexity of the schematic */
  complexity: number;
  /** Name of the schematic */
  name: string;
}

/**
 * CraftingTool - Base class for all crafting tools
 * Provides crafting-specific functionality on top of TangibleObject
 */
export class CraftingTool extends TangibleObject {
  // ============================================
  // Crafting Tool Properties
  // ============================================

  /** Type of crafting tool (determines compatible schematics) */
  craftingToolType: CraftingToolType;

  /** Effectiveness bonus (0-100) applied to assembly and experimentation */
  effectiveness: number;

  /** Maximum schematic complexity this tool supports */
  complexityLimit: number;

  /** Whether this is a placed station (true) or handheld tool (false) */
  isStation: boolean;

  /** Quality tier of this tool */
  toolQuality: ToolQuality;

  // ============================================
  // Bonus Modifiers
  // ============================================

  /** Additional bonus to assembly rolls (on top of effectiveness) */
  assemblyBonus: number;

  /** Additional bonus to experimentation rolls (on top of effectiveness) */
  experimentationBonus: number;

  // ============================================
  // Use Tracking
  // ============================================

  /** Number of uses remaining (-1 = unlimited) */
  usesRemaining: number;

  /** Maximum uses for this tool (-1 = unlimited) */
  maxUses: number;

  // ============================================
  // Delta Tracking
  // ============================================

  /** Delta tracker for crafting tool properties */
  private deltaTrackerCrft: DeltaTracker;

  /**
   * Create a new CraftingTool
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the object template
   */
  constructor(objectId: ObjectId, templateCrc: CrcValue = 0) {
    super(objectId, templateCrc);

    this.objectType = ObjectType.CraftingTool;

    // Initialize crafting tool properties
    this.craftingToolType = CraftingToolType.Generic;
    this.effectiveness = 0;
    this.complexityLimit = TOOL_COMPLEXITY_BY_QUALITY[ToolQuality.Basic];
    this.isStation = false;
    this.toolQuality = ToolQuality.Basic;

    // Initialize bonus modifiers
    this.assemblyBonus = 0;
    this.experimentationBonus = 0;

    // Initialize use tracking (unlimited by default)
    this.usesRemaining = -1;
    this.maxUses = -1;

    // Initialize delta tracker
    this.deltaTrackerCrft = new DeltaTracker();
  }

  /**
   * Get baseline type for crafting tool objects
   */
  override getBaselineType(): string {
    return 'CRFT';
  }

  // ============================================
  // Tool Type Management
  // ============================================

  /**
   * Set the crafting tool type
   */
  setCraftingToolType(type: CraftingToolType): void {
    if (this.craftingToolType !== type) {
      this.craftingToolType = type;
      this.deltaTrackerCrft.trackChange(CrftProperty.CRAFTING_TOOL_TYPE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Get the display name for this tool's type
   */
  getToolTypeName(): string {
    return getCraftingToolTypeName(this.craftingToolType);
  }

  /**
   * Get the compatible schematic types for this tool
   */
  getCompatibleSchematicTypes(): SchematicType[] {
    return TOOL_SCHEMATIC_TYPES[this.craftingToolType] ?? [];
  }

  // ============================================
  // Tool Quality Management
  // ============================================

  /**
   * Set the tool quality tier
   * This updates effectiveness and complexity based on the tier defaults
   */
  setToolQuality(quality: ToolQuality): void {
    if (this.toolQuality !== quality) {
      this.toolQuality = quality;

      // Update effectiveness to the default for this quality
      const effectivenessRange = TOOL_EFFECTIVENESS_BY_QUALITY[quality];
      if (effectivenessRange) {
        this.setEffectiveness(effectivenessRange.default);
      }

      // Update complexity limit based on quality
      const complexityLimit = TOOL_COMPLEXITY_BY_QUALITY[quality];
      if (complexityLimit !== undefined) {
        this.setComplexityLimit(complexityLimit);
      }

      this.deltaTrackerCrft.trackChange(CrftProperty.TOOL_QUALITY, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Get the display name for this tool's quality
   */
  getToolQualityName(): string {
    return getToolQualityName(this.toolQuality);
  }

  // ============================================
  // Effectiveness Management
  // ============================================

  /**
   * Set the effectiveness value (0-100)
   */
  setEffectiveness(value: number): void {
    const clamped = Math.max(0, Math.min(100, value));
    if (this.effectiveness !== clamped) {
      this.effectiveness = clamped;
      this.deltaTrackerCrft.trackChange(CrftProperty.EFFECTIVENESS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Get the effectiveness bonus as a multiplier (0.0 - 1.0)
   */
  getEffectivenessBonus(): number {
    return this.effectiveness / 100;
  }

  /**
   * Get the total assembly bonus (effectiveness + assembly modifier)
   * @returns Bonus value from 0-100
   */
  getAssemblyBonus(): number {
    return Math.min(100, this.effectiveness + this.assemblyBonus);
  }

  /**
   * Get the total experimentation bonus (effectiveness + experimentation modifier)
   * @returns Bonus value from 0-100
   */
  getExperimentationBonus(): number {
    return Math.min(100, this.effectiveness + this.experimentationBonus);
  }

  /**
   * Set the assembly bonus modifier
   */
  setAssemblyBonus(value: number): void {
    const clamped = Math.max(0, Math.min(100, value));
    if (this.assemblyBonus !== clamped) {
      this.assemblyBonus = clamped;
      this.deltaTrackerCrft.trackChange(CrftProperty.ASSEMBLY_BONUS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set the experimentation bonus modifier
   */
  setExperimentationBonus(value: number): void {
    const clamped = Math.max(0, Math.min(100, value));
    if (this.experimentationBonus !== clamped) {
      this.experimentationBonus = clamped;
      this.deltaTrackerCrft.trackChange(CrftProperty.EXPERIMENTATION_BONUS, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Complexity Management
  // ============================================

  /**
   * Set the maximum complexity this tool supports
   */
  setComplexityLimit(value: number): void {
    const clamped = Math.max(1, value);
    if (this.complexityLimit !== clamped) {
      this.complexityLimit = clamped;
      this.deltaTrackerCrft.trackChange(CrftProperty.COMPLEXITY_LIMIT, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Check if this tool can handle a schematic's complexity
   */
  canHandleComplexity(schematicComplexity: number): boolean {
    return schematicComplexity <= this.complexityLimit;
  }

  // ============================================
  // Station Flag Management
  // ============================================

  /**
   * Set whether this is a placed station
   */
  setIsStation(isStation: boolean): void {
    if (this.isStation !== isStation) {
      this.isStation = isStation;
      this.deltaTrackerCrft.trackChange(CrftProperty.IS_STATION, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Use Tracking
  // ============================================

  /**
   * Set the uses remaining
   * @param uses - Number of uses remaining (-1 for unlimited)
   */
  setUsesRemaining(uses: number): void {
    const newUses = uses < 0 ? -1 : uses;
    if (this.usesRemaining !== newUses) {
      this.usesRemaining = newUses;
      this.deltaTrackerCrft.trackChange(CrftProperty.USES_REMAINING, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set the maximum uses
   * @param maxUses - Maximum number of uses (-1 for unlimited)
   */
  setMaxUses(maxUses: number): void {
    const newMax = maxUses < 0 ? -1 : maxUses;
    if (this.maxUses !== newMax) {
      this.maxUses = newMax;
      this.deltaTrackerCrft.trackChange(CrftProperty.MAX_USES, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Consume one use of this tool
   * @returns true if use was consumed, false if no uses remaining
   */
  consumeUse(): boolean {
    if (this.usesRemaining === -1) {
      // Unlimited uses
      return true;
    }

    if (this.usesRemaining <= 0) {
      return false;
    }

    this.setUsesRemaining(this.usesRemaining - 1);
    return true;
  }

  /**
   * Check if this tool has uses remaining
   */
  hasUsesRemaining(): boolean {
    return this.usesRemaining === -1 || this.usesRemaining > 0;
  }

  /**
   * Check if this tool has limited uses
   */
  hasLimitedUses(): boolean {
    return this.maxUses !== -1;
  }

  // ============================================
  // Schematic Compatibility
  // ============================================

  /**
   * Check if this tool can craft a specific schematic
   * @param schematic - The schematic to check
   * @returns true if this tool can craft the schematic
   */
  canCraftSchematic(schematic: CraftingSchematic): boolean {
    // Check schematic type compatibility
    if (!canToolCraftSchematicType(this.craftingToolType, schematic.schematicType)) {
      return false;
    }

    // Check complexity limit
    if (!this.canHandleComplexity(schematic.complexity)) {
      return false;
    }

    // Check uses remaining
    if (!this.hasUsesRemaining()) {
      return false;
    }

    return true;
  }

  /**
   * Get the reason why a schematic cannot be crafted
   * @returns Error message or null if crafting is allowed
   */
  getCraftingError(schematic: CraftingSchematic): string | null {
    if (!canToolCraftSchematicType(this.craftingToolType, schematic.schematicType)) {
      return `This tool cannot craft ${schematic.name} schematics`;
    }

    if (!this.canHandleComplexity(schematic.complexity)) {
      return `Schematic complexity (${schematic.complexity}) exceeds tool limit (${this.complexityLimit})`;
    }

    if (!this.hasUsesRemaining()) {
      return 'This tool has no uses remaining';
    }

    return null;
  }

  // ============================================
  // Skill Requirements
  // ============================================

  /**
   * Get the required skill to use this tool
   */
  getRequiredSkill(): string {
    return TOOL_SKILL_REQUIREMENTS[this.craftingToolType] ?? '';
  }

  /**
   * Check if a player has the required skill to use this tool
   * @param playerSkills - Set of skill names the player has
   */
  playerHasRequiredSkill(playerSkills: Set<string>): boolean {
    const required = this.getRequiredSkill();
    if (!required) {
      return true; // No skill required
    }
    return playerSkills.has(required);
  }

  // ============================================
  // Delta Management
  // ============================================

  /**
   * Check if crafting tool properties have changes
   */
  hasCrftChanges(): boolean {
    return this.deltaTrackerCrft.hasChanges();
  }

  /**
   * Get the crafting tool delta tracker
   */
  getCrftDeltaTracker(): DeltaTracker {
    return this.deltaTrackerCrft;
  }

  /**
   * Clear all delta trackers
   */
  clearAllDeltas(): void {
    this.clearDirtyFlags();
    this.deltaTrackerCrft.clear();
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Clone crafting tool properties to another CraftingTool
   */
  copyCraftingToolPropertiesTo(target: CraftingTool): void {
    // Copy TangibleObject properties
    this.copyPropertiesTo(target);

    // Copy crafting tool specific properties
    target.craftingToolType = this.craftingToolType;
    target.effectiveness = this.effectiveness;
    target.complexityLimit = this.complexityLimit;
    target.isStation = this.isStation;
    target.toolQuality = this.toolQuality;
    target.assemblyBonus = this.assemblyBonus;
    target.experimentationBonus = this.experimentationBonus;
    target.usesRemaining = this.usesRemaining;
    target.maxUses = this.maxUses;
  }

  /**
   * Serialize to JSON for debugging/persistence
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      craftingToolType: this.craftingToolType,
      craftingToolTypeName: this.getToolTypeName(),
      effectiveness: this.effectiveness,
      complexityLimit: this.complexityLimit,
      isStation: this.isStation,
      toolQuality: this.toolQuality,
      toolQualityName: this.getToolQualityName(),
      assemblyBonus: this.assemblyBonus,
      experimentationBonus: this.experimentationBonus,
      totalAssemblyBonus: this.getAssemblyBonus(),
      totalExperimentationBonus: this.getExperimentationBonus(),
      usesRemaining: this.usesRemaining,
      maxUses: this.maxUses,
      compatibleSchematicTypes: this.getCompatibleSchematicTypes(),
      requiredSkill: this.getRequiredSkill(),
    };
  }
}
