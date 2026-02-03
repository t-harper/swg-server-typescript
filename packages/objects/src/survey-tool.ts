/**
 * SurveyTool - Survey tools for resource surveying in SWG
 * Extends TangibleObject with properties for locating and sampling natural resources.
 *
 * Survey tools are used by crafters to find resource concentrations on planets.
 * Different tool types survey different resource classes:
 * - Mineral Survey Device: Metals, ores, gemstones
 * - Chemical Survey Device: Petrochemicals, polymers
 * - Flora Survey Device: Wood, plant fibers, food
 * - Gas Survey Device: Reactive and inert gases
 * - Water Survey Device: Various water classes
 * - Organic Survey Device: Creature resources (rare)
 *
 * Tool quality affects:
 * - Survey range (how far you can detect resources)
 * - Survey accuracy (precision of concentration readings)
 * - Sample size (units extracted per sample)
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { TangibleObject } from './tangible-object.js';
import { ObjectType } from './scene-object.js';
import { DeltaTracker, DeltaType } from './deltas.js';
import {
  SurveyToolType,
  SurveyToolQuality,
  SURVEY_TOOL_RESOURCE_CLASSES,
  canSurveyResourceClass,
  DEFAULT_SURVEY_COOLDOWN,
  DEFAULT_SAMPLE_COOLDOWN,
} from './survey-types.js';

// Re-export for convenience
export { SurveyToolType, SurveyToolQuality } from './survey-types.js';

/**
 * Survey tool property indices for delta tracking
 */
export const SurveyToolProperty = {
  // Baseline 3 (shared)
  SURVEY_TOOL_TYPE: 0,
  SURVEY_RANGE: 1,
  SURVEY_ACCURACY: 2,
  SAMPLE_SIZE: 3,
  COOLDOWN: 4,
  QUALITY: 5,

  // Baseline 6 (server)
  LAST_SURVEY_TIME: 0,
  ACTIVE_SURVEY_RESOURCE: 1,
  REQUIRED_SKILL: 2,
  REQUIRED_SKILL_LEVEL: 3,
} as const;

/**
 * Skill modifiers that affect survey operations
 */
export const SURVEY_SKILL_MODS = {
  /** Increases survey range */
  SURVEY_RANGE: 'survey_range',
  /** Increases survey accuracy */
  SURVEY_ACCURACY: 'survey_accuracy',
  /** Increases sample yield */
  SAMPLE_YIELD: 'sample_yield',
  /** Decreases survey/sample cooldown */
  SURVEY_SPEED: 'survey_speed',
} as const;

/**
 * Survey tool effectiveness modifiers based on quality
 */
export const QUALITY_MODIFIERS: Record<SurveyToolQuality, number> = {
  [SurveyToolQuality.Basic]: 1.0,
  [SurveyToolQuality.Standard]: 1.15,
  [SurveyToolQuality.Advanced]: 1.3,
  [SurveyToolQuality.Master]: 1.5,
};

/**
 * Interface for player skill mod access
 */
interface PlayerSkillAccess {
  getSkillMod(name: string): number;
  hasSkill?(skillName: string): boolean;
  skills?: Set<string>;
  skillMods?: Map<string, number>;
}

/**
 * SurveyTool - Tool for surveying and sampling planetary resources
 * Extends TangibleObject with survey-specific properties
 */
export class SurveyTool extends TangibleObject {
  // ============================================
  // Core Survey Properties
  // ============================================

  /** Type of survey tool (mineral, chemical, flora, gas, water, organic) */
  surveyToolType: SurveyToolType;

  /** Base survey range in meters (typically 64-320) */
  surveyRange: number;

  /** Base survey accuracy percentage (0-100) */
  surveyAccuracy: number;

  /** Base sample size (units per sample, typically 1-5) */
  sampleSize: number;

  /** Cooldown between survey operations in milliseconds */
  cooldown: number;

  /** Tool quality level affecting effectiveness */
  quality: SurveyToolQuality;

  // ============================================
  // Runtime State
  // ============================================

  /** Timestamp of last survey operation */
  lastSurveyTime: number;

  /** Currently active survey resource ID (null if not surveying) */
  activeSurveyResource: bigint | null;

  // ============================================
  // Skill Requirements
  // ============================================

  /** Required skill name to use this tool (empty = no requirement) */
  requiredSkill: string;

  /** Required skill level/mod value (0 = just need the skill) */
  requiredSkillLevel: number;

  // ============================================
  // Delta Tracking
  // ============================================

  /** Delta tracker for survey tool baseline 3 */
  private deltaTrackerSurv3: DeltaTracker;

  /** Delta tracker for survey tool baseline 6 */
  private deltaTrackerSurv6: DeltaTracker;

  /**
   * Create a new SurveyTool
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the object template
   */
  constructor(objectId: ObjectId, templateCrc: CrcValue = 0) {
    super(objectId, templateCrc);

    this.objectType = ObjectType.SurveyTool;

    // Initialize survey properties with basic defaults
    this.surveyToolType = SurveyToolType.Mineral;
    this.surveyRange = 64;
    this.surveyAccuracy = 60;
    this.sampleSize = 1;
    this.cooldown = DEFAULT_SURVEY_COOLDOWN;
    this.quality = SurveyToolQuality.Basic;

    // Initialize runtime state
    this.lastSurveyTime = 0;
    this.activeSurveyResource = null;

    // Initialize skill requirements
    this.requiredSkill = '';
    this.requiredSkillLevel = 0;

    // Initialize delta trackers
    this.deltaTrackerSurv3 = new DeltaTracker();
    this.deltaTrackerSurv6 = new DeltaTracker();
  }

  /**
   * Get baseline type for SURV objects
   */
  override getBaselineType(): string {
    return 'SURV';
  }

  // ============================================
  // Survey Tool Type Management
  // ============================================

  /**
   * Set the survey tool type
   * @param type - The type of resources this tool surveys
   */
  setSurveyToolType(type: SurveyToolType): void {
    if (this.surveyToolType !== type) {
      this.surveyToolType = type;
      this.deltaTrackerSurv3.trackChange(SurveyToolProperty.SURVEY_TOOL_TYPE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Get the resource classes this tool can survey
   * @returns Array of resource class names
   */
  getSurveyableResourceTypes(): string[] {
    return SURVEY_TOOL_RESOURCE_CLASSES[this.surveyToolType] ?? [];
  }

  /**
   * Check if this tool can survey a specific resource class
   * @param resourceClass - The resource class to check
   * @returns Whether the tool can survey this class
   */
  canSurveyResource(resourceClass: string): boolean {
    return canSurveyResourceClass(this.surveyToolType, resourceClass);
  }

  // ============================================
  // Survey Range Management
  // ============================================

  /**
   * Set the base survey range
   * @param range - Range in meters (64-320 typical)
   */
  setSurveyRange(range: number): void {
    const newRange = Math.max(16, Math.min(range, 512));
    if (this.surveyRange !== newRange) {
      this.surveyRange = newRange;
      this.deltaTrackerSurv3.trackChange(SurveyToolProperty.SURVEY_RANGE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Calculate effective survey range with skill bonuses
   * @param player - Player using the tool (needs getSkillMod method)
   * @returns Effective range in meters
   */
  calculateEffectiveRange(player: PlayerSkillAccess): number {
    // Base range modified by quality
    let effectiveRange = this.surveyRange * QUALITY_MODIFIERS[this.quality];

    // Apply skill modifier if player has survey_range skill mod
    const rangeSkillMod = player.getSkillMod(SURVEY_SKILL_MODS.SURVEY_RANGE) ?? 0;
    if (rangeSkillMod > 0) {
      // Each point of skill mod adds 1% range
      effectiveRange *= 1 + rangeSkillMod / 100;
    }

    return Math.floor(effectiveRange);
  }

  // ============================================
  // Survey Accuracy Management
  // ============================================

  /**
   * Set the base survey accuracy
   * @param accuracy - Accuracy percentage (0-100)
   */
  setSurveyAccuracy(accuracy: number): void {
    const newAccuracy = Math.max(0, Math.min(accuracy, 100));
    if (this.surveyAccuracy !== newAccuracy) {
      this.surveyAccuracy = newAccuracy;
      this.deltaTrackerSurv3.trackChange(SurveyToolProperty.SURVEY_ACCURACY, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Calculate effective survey accuracy with skill bonuses
   * @param player - Player using the tool (needs getSkillMod method)
   * @returns Effective accuracy percentage (0-100)
   */
  calculateEffectiveAccuracy(player: PlayerSkillAccess): number {
    // Base accuracy modified by quality
    let effectiveAccuracy = this.surveyAccuracy * QUALITY_MODIFIERS[this.quality];

    // Apply skill modifier
    const accuracySkillMod = player.getSkillMod(SURVEY_SKILL_MODS.SURVEY_ACCURACY) ?? 0;
    if (accuracySkillMod > 0) {
      // Each point of skill mod adds 0.5% accuracy
      effectiveAccuracy += accuracySkillMod * 0.5;
    }

    // Cap at 100%
    return Math.min(100, Math.floor(effectiveAccuracy));
  }

  // ============================================
  // Sample Size Management
  // ============================================

  /**
   * Set the base sample size
   * @param size - Units per sample (1-5 typical)
   */
  setSampleSize(size: number): void {
    const newSize = Math.max(1, Math.min(size, 10));
    if (this.sampleSize !== newSize) {
      this.sampleSize = newSize;
      this.deltaTrackerSurv3.trackChange(SurveyToolProperty.SAMPLE_SIZE, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Calculate effective sample size with skill bonuses
   * @param player - Player using the tool
   * @param concentration - Resource concentration at sample point (0-100)
   * @returns Effective sample size (units)
   */
  calculateEffectiveSampleSize(player: PlayerSkillAccess, concentration: number): number {
    // Base sample size modified by quality
    let effectiveSize = this.sampleSize * QUALITY_MODIFIERS[this.quality];

    // Apply skill modifier
    const yieldSkillMod = player.getSkillMod(SURVEY_SKILL_MODS.SAMPLE_YIELD) ?? 0;
    if (yieldSkillMod > 0) {
      // Each point adds 2% to sample yield
      effectiveSize *= 1 + yieldSkillMod / 50;
    }

    // Concentration affects yield (higher concentration = more resources)
    const concentrationMultiplier = 0.5 + (concentration / 100) * 0.5;
    effectiveSize *= concentrationMultiplier;

    // Minimum of 1 unit
    return Math.max(1, Math.floor(effectiveSize));
  }

  // ============================================
  // Cooldown Management
  // ============================================

  /**
   * Set the survey cooldown
   * @param cooldownMs - Cooldown in milliseconds
   */
  setCooldown(cooldownMs: number): void {
    const newCooldown = Math.max(500, cooldownMs);
    if (this.cooldown !== newCooldown) {
      this.cooldown = newCooldown;
      this.deltaTrackerSurv3.trackChange(SurveyToolProperty.COOLDOWN, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Calculate effective cooldown with skill bonuses
   * @param player - Player using the tool
   * @returns Effective cooldown in milliseconds
   */
  calculateEffectiveCooldown(player: PlayerSkillAccess): number {
    let effectiveCooldown = this.cooldown;

    // Apply skill modifier (reduces cooldown)
    const speedSkillMod = player.getSkillMod(SURVEY_SKILL_MODS.SURVEY_SPEED) ?? 0;
    if (speedSkillMod > 0) {
      // Each point reduces cooldown by 1% (minimum 50% of base)
      const reduction = Math.min(50, speedSkillMod);
      effectiveCooldown *= 1 - reduction / 100;
    }

    // Quality reduces cooldown
    const qualityReduction = 1 - (QUALITY_MODIFIERS[this.quality] - 1) * 0.5;
    effectiveCooldown *= qualityReduction;

    return Math.max(500, Math.floor(effectiveCooldown));
  }

  /**
   * Get remaining cooldown time
   * @returns Milliseconds until tool can be used again (0 if ready)
   */
  getRemainingCooldown(): number {
    const elapsed = Date.now() - this.lastSurveyTime;
    return Math.max(0, this.cooldown - elapsed);
  }

  /**
   * Check if the tool is off cooldown
   * @returns Whether the tool can be used
   */
  isReady(): boolean {
    return this.getRemainingCooldown() === 0;
  }

  // ============================================
  // Quality Management
  // ============================================

  /**
   * Set the tool quality
   * @param quality - Quality level
   */
  setQuality(quality: SurveyToolQuality): void {
    if (this.quality !== quality) {
      this.quality = quality;
      this.deltaTrackerSurv3.trackChange(SurveyToolProperty.QUALITY, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Get the quality modifier for this tool
   * @returns Multiplier for tool effectiveness
   */
  getQualityModifier(): number {
    return QUALITY_MODIFIERS[this.quality];
  }

  // ============================================
  // Skill Requirements
  // ============================================

  /**
   * Set the required skill to use this tool
   * @param skillName - Skill name (empty = no requirement)
   * @param level - Required skill level/mod value
   */
  setRequiredSkill(skillName: string, level: number = 0): void {
    if (this.requiredSkill !== skillName || this.requiredSkillLevel !== level) {
      this.requiredSkill = skillName;
      this.requiredSkillLevel = Math.max(0, level);
      this.deltaTrackerSurv6.trackChange(SurveyToolProperty.REQUIRED_SKILL, DeltaType.Change);
      this.deltaTrackerSurv6.trackChange(SurveyToolProperty.REQUIRED_SKILL_LEVEL, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Check if a player meets the skill requirements
   * @param player - Player to check
   * @returns Whether the player can use this tool
   */
  meetsSkillRequirements(player: PlayerSkillAccess): boolean {
    // No requirement
    if (!this.requiredSkill) {
      return true;
    }

    // Check if player has the skill
    if (player.hasSkill) {
      if (!player.hasSkill(this.requiredSkill)) {
        return false;
      }
    } else if (player.skills) {
      if (!player.skills.has(this.requiredSkill)) {
        return false;
      }
    }

    // Check skill level if required
    if (this.requiredSkillLevel > 0) {
      const playerLevel = player.getSkillMod(this.requiredSkill) ?? 0;
      if (playerLevel < this.requiredSkillLevel) {
        return false;
      }
    }

    return true;
  }

  // ============================================
  // Survey Operations
  // ============================================

  /**
   * Check if the player can perform a survey
   * @param player - Player attempting to survey
   * @returns Object with canSurvey flag and reason if not
   */
  canSurvey(player: PlayerSkillAccess): { canSurvey: boolean; reason?: string } {
    // Check skill requirements
    if (!this.meetsSkillRequirements(player)) {
      return {
        canSurvey: false,
        reason: `You need ${this.requiredSkill} to use this tool`,
      };
    }

    // Check cooldown
    if (!this.isReady()) {
      const remaining = Math.ceil(this.getRemainingCooldown() / 1000);
      return {
        canSurvey: false,
        reason: `Survey tool is recharging (${remaining}s remaining)`,
      };
    }

    // Check tool condition
    if (this.condition <= 0) {
      return {
        canSurvey: false,
        reason: 'Survey tool is broken',
      };
    }

    return { canSurvey: true };
  }

  /**
   * Mark the tool as having been used (sets cooldown timer)
   */
  markUsed(): void {
    this.lastSurveyTime = Date.now();
    this.deltaTrackerSurv6.trackChange(SurveyToolProperty.LAST_SURVEY_TIME, DeltaType.Change);
    this.markModified();

    // Degrade tool condition slightly
    this.setCondition(this.condition - 1);
  }

  /**
   * Set the active survey resource
   * @param resourceId - Resource being surveyed (null to clear)
   */
  setActiveSurveyResource(resourceId: bigint | null): void {
    if (this.activeSurveyResource !== resourceId) {
      this.activeSurveyResource = resourceId;
      this.deltaTrackerSurv6.trackChange(
        SurveyToolProperty.ACTIVE_SURVEY_RESOURCE,
        DeltaType.Change
      );
      this.markModified();
    }
  }

  // ============================================
  // Delta Management
  // ============================================

  /**
   * Check if survey baseline 3 has changes
   */
  hasSurv3Changes(): boolean {
    return this.deltaTrackerSurv3.hasChanges();
  }

  /**
   * Check if survey baseline 6 has changes
   */
  hasSurv6Changes(): boolean {
    return this.deltaTrackerSurv6.hasChanges();
  }

  /**
   * Get survey baseline 3 delta tracker
   */
  getSurv3DeltaTracker(): DeltaTracker {
    return this.deltaTrackerSurv3;
  }

  /**
   * Get survey baseline 6 delta tracker
   */
  getSurv6DeltaTracker(): DeltaTracker {
    return this.deltaTrackerSurv6;
  }

  /**
   * Clear all delta trackers
   */
  clearAllDeltas(): void {
    this.deltaTrackerSurv3.clear();
    this.deltaTrackerSurv6.clear();
    this.clearDirtyFlags();
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Serialize to JSON for debugging/persistence
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      surveyToolType: this.surveyToolType,
      surveyRange: this.surveyRange,
      surveyAccuracy: this.surveyAccuracy,
      sampleSize: this.sampleSize,
      cooldown: this.cooldown,
      quality: this.quality,
      lastSurveyTime: this.lastSurveyTime,
      activeSurveyResource: this.activeSurveyResource?.toString() ?? null,
      requiredSkill: this.requiredSkill,
      requiredSkillLevel: this.requiredSkillLevel,
    };
  }
}
