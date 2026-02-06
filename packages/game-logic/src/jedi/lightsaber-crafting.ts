/**
 * Lightsaber Crafting Manager
 * Manages the assembly of lightsabers from components
 * Implements Jedi-only restrictions and generation-based progression
 */

import type { ObjectId } from '@swg/shared-types';
import {
  LightsaberHiltType,
  LightsaberGeneration,
  CrystalCategory,
  CrystalSpecialEffect,
  GenerationConfigs,
  HiltTypeModifiers,
  type LightsaberComponents,
  type LightsaberCrystal,
  type LightsaberHilt,
  type LightsaberLens,
  type LightsaberStats,
  type LightsaberSpecialAbility,
  type Lightsaber,
  type CrystalStats,
  type CrystalColor,
  getSpecialEffectName,
  createDefaultLightsaberStats,
} from './lightsaber-types.js';
import {
  JediRank,
  ForceSensitiveStatus,
  type JediPlayerState,
} from './jedi-types.js';

// ============================================
// Crafting Result Types
// ============================================

/**
 * Result codes for lightsaber crafting operations
 */
export enum LightsaberCraftingResultCode {
  /** Success */
  SUCCESS = 0,
  /** Not a Jedi */
  NOT_JEDI = 1,
  /** Insufficient rank */
  INSUFFICIENT_RANK = 2,
  /** Insufficient skill level */
  INSUFFICIENT_SKILL = 3,
  /** Missing required component */
  MISSING_COMPONENT = 4,
  /** Component not attuned */
  CRYSTAL_NOT_ATTUNED = 5,
  /** Crystal attuned to another Jedi */
  CRYSTAL_ATTUNED_TO_OTHER = 6,
  /** Crystal quality too low */
  CRYSTAL_QUALITY_TOO_LOW = 7,
  /** Invalid component type */
  INVALID_COMPONENT = 8,
  /** Wrong crystal category for slot */
  WRONG_CRYSTAL_CATEGORY = 9,
  /** Insufficient force power */
  INSUFFICIENT_FORCE = 10,
  /** Assembly failed */
  ASSEMBLY_FAILED = 11,
  /** Session not found */
  SESSION_NOT_FOUND = 12,
  /** Session already complete */
  SESSION_COMPLETE = 13,
  /** Invalid generation for rank */
  INVALID_GENERATION = 14,
  /** Internal error */
  INTERNAL_ERROR = 99,
}

/**
 * Result of a crafting operation
 */
export interface LightsaberCraftingResult<T = void> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result code */
  resultCode: LightsaberCraftingResultCode;
  /** Error message if failed */
  errorMessage?: string;
  /** Result data */
  data?: T | undefined;
}

// ============================================
// Crafting Configuration
// ============================================

/**
 * Configuration for lightsaber crafting
 */
export interface LightsaberCraftingConfig {
  /** Force cost to assemble a lightsaber */
  assemblyCost: number;
  /** Minimum force power required to craft */
  minForcePower: number;
  /** Base assembly time in milliseconds */
  baseAssemblyTime: number;
  /** Quality variance (random factor for stats) */
  qualityVariance: number;
  /** Enable critical assembly success */
  enableCriticalSuccess: boolean;
  /** Critical success chance (0-1) */
  criticalSuccessChance: number;
  /** Critical success bonus multiplier */
  criticalSuccessBonus: number;
  /** Enable assembly failure */
  enableAssemblyFailure: boolean;
  /** Assembly failure chance (0-1, reduced by skill) */
  baseFailureChance: number;
}

/**
 * Default crafting configuration
 */
export const DefaultCraftingConfig: LightsaberCraftingConfig = {
  assemblyCost: 200,
  minForcePower: 100,
  baseAssemblyTime: 30000, // 30 seconds
  qualityVariance: 0.1, // +/- 10%
  enableCriticalSuccess: true,
  criticalSuccessChance: 0.05, // 5%
  criticalSuccessBonus: 1.2, // 20% bonus
  enableAssemblyFailure: true,
  baseFailureChance: 0.1, // 10%
};

// ============================================
// Crafting Session
// ============================================

/**
 * State of a crafting session
 */
export enum LightsaberCraftingState {
  /** Gathering components */
  GATHERING = 'gathering',
  /** Validating components */
  VALIDATING = 'validating',
  /** Assembly in progress */
  ASSEMBLING = 'assembling',
  /** Assembly complete */
  COMPLETE = 'complete',
  /** Assembly failed */
  FAILED = 'failed',
}

/**
 * A lightsaber crafting session
 */
export interface LightsaberCraftingSession {
  /** Unique session ID */
  sessionId: bigint;
  /** Jedi crafting the lightsaber */
  jediId: ObjectId;
  /** Target generation */
  generation: LightsaberGeneration;
  /** Current state */
  state: LightsaberCraftingState;
  /** Components loaded */
  components: Partial<LightsaberComponents>;
  /** Start timestamp */
  startTime: number;
  /** Assembly start timestamp */
  assemblyStartTime: number | null;
  /** Calculated stats (after validation) */
  calculatedStats: LightsaberStats | null;
  /** Custom name for the lightsaber */
  customName: string | null;
  /** Whether assembly succeeded */
  assemblySuccess: boolean;
  /** Whether critical success occurred */
  criticalSuccess: boolean;
  /** Output lightsaber (after completion) */
  outputLightsaber: Lightsaber | null;
}

// ============================================
// Lightsaber Crafting Manager
// ============================================

/**
 * Session ID counter
 */
let sessionIdCounter = BigInt(0);

/**
 * Generate a unique session ID
 */
function generateSessionId(): bigint {
  sessionIdCounter += BigInt(1);
  return (BigInt(Date.now()) << BigInt(20)) | sessionIdCounter;
}

/**
 * Manages lightsaber crafting sessions
 */
export class LightsaberCraftingManager {
  /** Active crafting sessions */
  private sessions: Map<bigint, LightsaberCraftingSession>;

  /** Sessions by Jedi ID */
  private sessionsByJedi: Map<string, bigint>;

  /** Configuration */
  private config: LightsaberCraftingConfig;

  constructor(config: Partial<LightsaberCraftingConfig> = {}) {
    this.sessions = new Map();
    this.sessionsByJedi = new Map();
    this.config = { ...DefaultCraftingConfig, ...config };
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Start a new crafting session
   */
  startCraftingSession(
    jediState: JediPlayerState,
    generation: LightsaberGeneration
  ): LightsaberCraftingResult<LightsaberCraftingSession> {
    // Check if Jedi already has an active session
    const jediKey = jediState.playerId.toString();
    if (this.sessionsByJedi.has(jediKey)) {
      return this.craftingError(
        LightsaberCraftingResultCode.SESSION_COMPLETE,
        'You already have an active crafting session.'
      );
    }

    // Check if Jedi can craft this generation
    const canCraftResult = this.canCraft(jediState, generation);
    if (!canCraftResult.success) {
      return canCraftResult as LightsaberCraftingResult<LightsaberCraftingSession>;
    }

    // Create session
    const sessionId = generateSessionId();
    const session: LightsaberCraftingSession = {
      sessionId,
      jediId: jediState.playerId,
      generation,
      state: LightsaberCraftingState.GATHERING,
      components: {},
      startTime: Date.now(),
      assemblyStartTime: null,
      calculatedStats: null,
      customName: null,
      assemblySuccess: false,
      criticalSuccess: false,
      outputLightsaber: null,
    };

    this.sessions.set(sessionId, session);
    this.sessionsByJedi.set(jediKey, sessionId);

    return this.craftingSuccess(session);
  }

  /**
   * Cancel a crafting session
   */
  cancelSession(sessionId: bigint): LightsaberCraftingResult<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return this.craftingError(
        LightsaberCraftingResultCode.SESSION_NOT_FOUND,
        'Crafting session not found.'
      );
    }

    if (session.state === LightsaberCraftingState.ASSEMBLING) {
      session.state = LightsaberCraftingState.FAILED;
    }

    this.cleanupSession(sessionId);
    return this.craftingSuccess();
  }

  /**
   * Get session for a Jedi
   */
  getSessionForJedi(jediId: ObjectId): LightsaberCraftingSession | undefined {
    const sessionId = this.sessionsByJedi.get(jediId.toString());
    if (sessionId) {
      return this.sessions.get(sessionId);
    }
    return undefined;
  }

  // ============================================
  // Component Loading
  // ============================================

  /**
   * Load a hilt into the crafting session
   */
  loadHilt(
    sessionId: bigint,
    hilt: LightsaberHilt
  ): LightsaberCraftingResult<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return this.craftingError(
        LightsaberCraftingResultCode.SESSION_NOT_FOUND,
        'Crafting session not found.'
      );
    }

    if (session.state !== LightsaberCraftingState.GATHERING) {
      return this.craftingError(
        LightsaberCraftingResultCode.SESSION_COMPLETE,
        'Cannot load components at this stage.'
      );
    }

    session.components.hilt = hilt;
    return this.craftingSuccess();
  }

  /**
   * Load a blade crystal into the crafting session
   */
  loadBladeCrystal(
    sessionId: bigint,
    crystal: LightsaberCrystal,
    jediId: ObjectId
  ): LightsaberCraftingResult<void> {
    return this.loadCrystal(sessionId, crystal, jediId, 'bladeCrystal', CrystalCategory.BLADE);
  }

  /**
   * Load a focusing crystal into the crafting session
   */
  loadFocusingCrystal(
    sessionId: bigint,
    crystal: LightsaberCrystal,
    jediId: ObjectId
  ): LightsaberCraftingResult<void> {
    return this.loadCrystal(sessionId, crystal, jediId, 'focusingCrystal', CrystalCategory.FOCUSING);
  }

  /**
   * Load a power crystal into the crafting session
   */
  loadPowerCrystal(
    sessionId: bigint,
    crystal: LightsaberCrystal,
    jediId: ObjectId
  ): LightsaberCraftingResult<void> {
    return this.loadCrystal(sessionId, crystal, jediId, 'powerCrystal', CrystalCategory.POWER);
  }

  /**
   * Load a lens into the crafting session
   */
  loadLens(
    sessionId: bigint,
    lens: LightsaberLens
  ): LightsaberCraftingResult<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return this.craftingError(
        LightsaberCraftingResultCode.SESSION_NOT_FOUND,
        'Crafting session not found.'
      );
    }

    if (session.state !== LightsaberCraftingState.GATHERING) {
      return this.craftingError(
        LightsaberCraftingResultCode.SESSION_COMPLETE,
        'Cannot load components at this stage.'
      );
    }

    session.components.lens = lens;
    return this.craftingSuccess();
  }

  /**
   * Generic crystal loading
   */
  private loadCrystal(
    sessionId: bigint,
    crystal: LightsaberCrystal,
    jediId: ObjectId,
    slot: 'bladeCrystal' | 'focusingCrystal' | 'powerCrystal',
    expectedCategory: CrystalCategory
  ): LightsaberCraftingResult<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return this.craftingError(
        LightsaberCraftingResultCode.SESSION_NOT_FOUND,
        'Crafting session not found.'
      );
    }

    if (session.state !== LightsaberCraftingState.GATHERING) {
      return this.craftingError(
        LightsaberCraftingResultCode.SESSION_COMPLETE,
        'Cannot load components at this stage.'
      );
    }

    // Check crystal category
    if (crystal.category !== expectedCategory) {
      return this.craftingError(
        LightsaberCraftingResultCode.WRONG_CRYSTAL_CATEGORY,
        `This crystal cannot be used in the ${slot} slot.`
      );
    }

    // Check attunement
    if (!crystal.attuned) {
      return this.craftingError(
        LightsaberCraftingResultCode.CRYSTAL_NOT_ATTUNED,
        'Crystal must be attuned before use.'
      );
    }

    if (crystal.attunedToId !== jediId) {
      return this.craftingError(
        LightsaberCraftingResultCode.CRYSTAL_ATTUNED_TO_OTHER,
        'Crystal is attuned to another Jedi.'
      );
    }

    // Check quality
    const genConfig = GenerationConfigs[session.generation];
    if (crystal.quality < genConfig.minCrystalQuality) {
      return this.craftingError(
        LightsaberCraftingResultCode.CRYSTAL_QUALITY_TOO_LOW,
        `Crystal quality (${crystal.quality}) is below minimum (${genConfig.minCrystalQuality}) for this generation.`
      );
    }

    session.components[slot] = crystal;
    return this.craftingSuccess();
  }

  /**
   * Set a custom name for the lightsaber
   */
  setCustomName(sessionId: bigint, name: string): LightsaberCraftingResult<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return this.craftingError(
        LightsaberCraftingResultCode.SESSION_NOT_FOUND,
        'Crafting session not found.'
      );
    }

    // Sanitize and limit name length
    session.customName = name.slice(0, 64).trim();
    return this.craftingSuccess();
  }

  // ============================================
  // Component Validation
  // ============================================

  /**
   * Validate all loaded components
   */
  validateComponents(
    sessionId: bigint,
    jediState: JediPlayerState
  ): LightsaberCraftingResult<ComponentValidationResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return this.craftingError(
        LightsaberCraftingResultCode.SESSION_NOT_FOUND,
        'Crafting session not found.'
      );
    }

    const issues: string[] = [];
    const genConfig = GenerationConfigs[session.generation];

    // Check required components
    if (!session.components.hilt) {
      issues.push('Hilt is required.');
    }

    if (!session.components.bladeCrystal) {
      issues.push('Blade crystal is required.');
    } else {
      // Validate blade crystal attunement
      const bladeCrystal = session.components.bladeCrystal;
      if (!bladeCrystal.attuned) {
        issues.push('Blade crystal must be attuned.');
      } else if (bladeCrystal.attunedToId !== jediState.playerId) {
        issues.push('Blade crystal is attuned to another Jedi.');
      }
      if (bladeCrystal.quality < genConfig.minCrystalQuality) {
        issues.push(`Blade crystal quality (${bladeCrystal.quality}) is too low.`);
      }
    }

    // Validate optional crystals
    let optionalCrystalCount = 0;

    if (session.components.focusingCrystal) {
      optionalCrystalCount++;
      const crystal = session.components.focusingCrystal;
      if (!crystal.attuned) {
        issues.push('Focusing crystal must be attuned.');
      } else if (crystal.attunedToId !== jediState.playerId) {
        issues.push('Focusing crystal is attuned to another Jedi.');
      }
    }

    if (session.components.powerCrystal) {
      optionalCrystalCount++;
      const crystal = session.components.powerCrystal;
      if (!crystal.attuned) {
        issues.push('Power crystal must be attuned.');
      } else if (crystal.attunedToId !== jediState.playerId) {
        issues.push('Power crystal is attuned to another Jedi.');
      }
    }

    if (optionalCrystalCount > genConfig.maxOptionalCrystals) {
      issues.push(`This generation only allows ${genConfig.maxOptionalCrystals} optional crystals.`);
    }

    // Check force power
    if (jediState.forcePower < this.config.minForcePower) {
      issues.push(`Insufficient force power. Required: ${this.config.minForcePower}.`);
    }

    const result: ComponentValidationResult = {
      valid: issues.length === 0,
      issues,
      hasHilt: !!session.components.hilt,
      hasBladeCrystal: !!session.components.bladeCrystal,
      hasFocusingCrystal: !!session.components.focusingCrystal,
      hasPowerCrystal: !!session.components.powerCrystal,
      hasLens: !!session.components.lens,
      optionalCrystalCount,
      maxOptionalCrystals: genConfig.maxOptionalCrystals,
    };

    if (result.valid) {
      session.state = LightsaberCraftingState.VALIDATING;
    }

    return this.craftingSuccess(result);
  }

  // ============================================
  // Stats Calculation
  // ============================================

  /**
   * Calculate the final stats for the lightsaber
   */
  calculateStats(
    components: LightsaberComponents,
    generation: LightsaberGeneration
  ): LightsaberStats {
    const genConfig = GenerationConfigs[generation];
    const hiltMods = HiltTypeModifiers[components.hilt.hiltType];

    // Start with generation base stats
    let minDamage = genConfig.baseMinDamage;
    let maxDamage = genConfig.baseMaxDamage;
    let speed = genConfig.baseSpeed;
    let forceCost = genConfig.baseForceCost;
    let accuracy = genConfig.baseAccuracy;
    let defense = genConfig.baseDefense;

    // Collect all crystal stats
    const crystalStats: CrystalStats[] = [components.bladeCrystal.stats];
    if (components.focusingCrystal) {
      crystalStats.push(components.focusingCrystal.stats);
    }
    if (components.powerCrystal) {
      crystalStats.push(components.powerCrystal.stats);
    }

    // Apply crystal bonuses
    let totalDamageBonus = 0;
    let totalDamageMultiplier = 1.0;
    let totalSpeedBonus = 0;
    let totalForceReduction = 0;
    let totalAccuracyBonus = 0;
    let totalDefenseBonus = 0;

    for (const stats of crystalStats) {
      totalDamageBonus += stats.damageBonus;
      totalDamageMultiplier *= stats.damageMultiplier;
      totalSpeedBonus += stats.speedBonus;
      totalForceReduction += stats.forceReduction;
      totalAccuracyBonus += stats.accuracyBonus;
      totalDefenseBonus += stats.defenseBonus;
    }

    // Apply lens bonuses
    if (components.lens) {
      totalAccuracyBonus += components.lens.accuracyBonus;
      totalDamageMultiplier *= components.lens.focusMultiplier;
    }

    // Apply hilt modifiers
    minDamage = Math.floor((minDamage + totalDamageBonus) * totalDamageMultiplier * hiltMods.damageModifier);
    maxDamage = Math.floor((maxDamage + totalDamageBonus) * totalDamageMultiplier * hiltMods.damageModifier);
    speed = speed * hiltMods.speedModifier * (1 + totalSpeedBonus / 100);
    forceCost = Math.max(1, Math.floor(forceCost * hiltMods.forceCostModifier * (1 - totalForceReduction / 100)));
    accuracy = accuracy + totalAccuracyBonus;
    defense = Math.floor((defense + totalDefenseBonus) * hiltMods.defenseModifier);

    // Apply quality variance
    if (this.config.qualityVariance > 0) {
      const variance = 1 + (Math.random() * 2 - 1) * this.config.qualityVariance;
      minDamage = Math.floor(minDamage * variance);
      maxDamage = Math.floor(maxDamage * variance);
    }

    // Ensure min is less than max
    if (minDamage > maxDamage) {
      [minDamage, maxDamage] = [maxDamage, minDamage];
    }

    // Collect special abilities
    const specialAbilities: LightsaberSpecialAbility[] = [];
    for (const stats of crystalStats) {
      if (stats.specialEffect !== CrystalSpecialEffect.NONE) {
        specialAbilities.push({
          effect: stats.specialEffect,
          name: getSpecialEffectName(stats.specialEffect),
          description: this.getSpecialEffectDescription(stats.specialEffect, stats.specialEffectMagnitude),
          magnitude: stats.specialEffectMagnitude,
        });
      }
    }

    // Determine elemental damage
    let elementalDamageType: string | null = null;
    let elementalDamage = 0;

    for (const stats of crystalStats) {
      if (stats.specialEffect === CrystalSpecialEffect.ELECTRICAL_DAMAGE) {
        elementalDamageType = 'electrical';
        elementalDamage += stats.specialEffectMagnitude;
      }
    }

    // Calculate overall quality
    const quality = this.calculateOverallQuality(components, genConfig);

    // Calculate durability based on hilt quality and generation
    const durability = Math.floor(genConfig.baseDurability * (components.hilt.quality / 100 + 0.5));

    return {
      minDamage,
      maxDamage,
      speed: Math.round(speed * 100) / 100,
      forceCost,
      accuracy,
      defense,
      elementalDamageType,
      elementalDamage,
      specialAbilities,
      quality,
      durability,
      maxDurability: durability,
    };
  }

  /**
   * Calculate overall quality rating
   */
  private calculateOverallQuality(
    components: LightsaberComponents,
    genConfig: typeof GenerationConfigs[LightsaberGeneration]
  ): number {
    let totalQuality = 0;
    let componentCount = 0;

    // Hilt quality
    totalQuality += components.hilt.quality;
    componentCount++;

    // Blade crystal quality and purity
    totalQuality += (components.bladeCrystal.quality + components.bladeCrystal.purity) / 2;
    componentCount++;

    // Optional components
    if (components.focusingCrystal) {
      totalQuality += (components.focusingCrystal.quality + components.focusingCrystal.purity) / 2;
      componentCount++;
    }

    if (components.powerCrystal) {
      totalQuality += (components.powerCrystal.quality + components.powerCrystal.purity) / 2;
      componentCount++;
    }

    if (components.lens) {
      totalQuality += components.lens.quality;
      componentCount++;
    }

    return Math.floor(totalQuality / componentCount);
  }

  /**
   * Get description for a special effect
   */
  private getSpecialEffectDescription(effect: CrystalSpecialEffect, magnitude: number): string {
    const descriptions: Record<CrystalSpecialEffect, (m: number) => string> = {
      [CrystalSpecialEffect.NONE]: () => '',
      [CrystalSpecialEffect.LIGHT_SIDE_BONUS]: (m) => `+${m}% damage vs dark side enemies`,
      [CrystalSpecialEffect.DARK_SIDE_BONUS]: (m) => `+${m}% damage vs light side enemies`,
      [CrystalSpecialEffect.STUN_CHANCE]: (m) => `${m}% chance to stun on hit`,
      [CrystalSpecialEffect.ELECTRICAL_DAMAGE]: (m) => `+${m} electrical damage`,
      [CrystalSpecialEffect.CRITICAL_BONUS]: (m) => `+${m}% critical hit chance`,
      [CrystalSpecialEffect.FORCE_REGEN_BONUS]: (m) => `+${m}% force regeneration`,
      [CrystalSpecialEffect.STEALTH_BONUS]: (m) => `-${m}% visibility generation`,
      [CrystalSpecialEffect.ACCURACY_BONUS]: (m) => `+${m} accuracy`,
      [CrystalSpecialEffect.DAMAGE_REFLECTION]: (m) => `${m}% damage reflection`,
      [CrystalSpecialEffect.FORCE_POWER_BONUS]: (m) => `+${m}% force power effectiveness`,
      [CrystalSpecialEffect.LIFE_DRAIN]: (m) => `${m}% of damage heals attacker`,
      [CrystalSpecialEffect.ARMOR_PIERCING]: (m) => `${m}% armor penetration`,
    };
    return descriptions[effect](magnitude);
  }

  // ============================================
  // Assembly
  // ============================================

  /**
   * Assemble the lightsaber
   */
  assembleLightsaber(
    sessionId: bigint,
    jediState: JediPlayerState,
    objectIdGenerator: () => ObjectId,
    crafterName: string
  ): LightsaberCraftingResult<LightsaberAssemblyResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return this.craftingError(
        LightsaberCraftingResultCode.SESSION_NOT_FOUND,
        'Crafting session not found.'
      );
    }

    if (session.state === LightsaberCraftingState.COMPLETE) {
      return this.craftingError(
        LightsaberCraftingResultCode.SESSION_COMPLETE,
        'Assembly is already complete.'
      );
    }

    // Validate all components are present
    if (!session.components.hilt || !session.components.bladeCrystal) {
      return this.craftingError(
        LightsaberCraftingResultCode.MISSING_COMPONENT,
        'Missing required components.'
      );
    }

    // Check force power
    if (jediState.forcePower < this.config.assemblyCost) {
      return this.craftingError(
        LightsaberCraftingResultCode.INSUFFICIENT_FORCE,
        `Insufficient force power. Required: ${this.config.assemblyCost}.`
      );
    }

    // Build complete components object
    const components: LightsaberComponents = {
      hilt: session.components.hilt,
      bladeCrystal: session.components.bladeCrystal,
      focusingCrystal: session.components.focusingCrystal ?? null,
      powerCrystal: session.components.powerCrystal ?? null,
      lens: session.components.lens ?? null,
    };

    session.state = LightsaberCraftingState.ASSEMBLING;
    session.assemblyStartTime = Date.now();

    // Calculate failure chance (reduced by skill)
    let failureChance = this.config.baseFailureChance;
    failureChance *= 1 - jediState.learnedSkills.size * 0.01; // -1% per skill
    failureChance = Math.max(0.01, failureChance); // Minimum 1%

    // Check for failure
    if (this.config.enableAssemblyFailure && Math.random() < failureChance) {
      session.state = LightsaberCraftingState.FAILED;
      session.assemblySuccess = false;

      const result: LightsaberAssemblyResult = {
        success: false,
        criticalSuccess: false,
        lightsaber: null,
        stats: null,
        message: 'Assembly failed! The components have been damaged.',
        forceCost: Math.floor(this.config.assemblyCost / 2), // Partial cost on failure
      };

      this.cleanupSession(sessionId);
      return this.craftingSuccess(result);
    }

    // Calculate stats
    const stats = this.calculateStats(components, session.generation);
    session.calculatedStats = stats;

    // Check for critical success
    let criticalSuccess = false;
    if (this.config.enableCriticalSuccess && Math.random() < this.config.criticalSuccessChance) {
      criticalSuccess = true;
      session.criticalSuccess = true;

      // Apply critical bonus
      stats.minDamage = Math.floor(stats.minDamage * this.config.criticalSuccessBonus);
      stats.maxDamage = Math.floor(stats.maxDamage * this.config.criticalSuccessBonus);
      stats.quality = Math.min(100, stats.quality + 10);
    }

    // Determine blade color
    const bladeColor = components.bladeCrystal.color!;

    // Create the lightsaber
    const genConfig = GenerationConfigs[session.generation];
    const lightsaber: Lightsaber = {
      objectId: objectIdGenerator(),
      name: genConfig.name,
      customName: session.customName,
      hiltType: components.hilt.hiltType,
      bladeColor,
      generation: session.generation,
      stats,
      componentIds: {
        hiltId: components.hilt.objectId,
        bladeCrystalId: components.bladeCrystal.objectId,
        focusingCrystalId: components.focusingCrystal?.objectId ?? null,
        powerCrystalId: components.powerCrystal?.objectId ?? null,
        lensId: components.lens?.objectId ?? null,
      },
      crafterId: jediState.playerId,
      crafterName,
      createdAt: Date.now(),
      soulbound: true, // Lightsabers are soulbound
      ownerId: jediState.playerId,
    };

    session.outputLightsaber = lightsaber;
    session.state = LightsaberCraftingState.COMPLETE;
    session.assemblySuccess = true;

    const result: LightsaberAssemblyResult = {
      success: true,
      criticalSuccess,
      lightsaber,
      stats,
      message: criticalSuccess
        ? 'Exceptional assembly! The Force flowed through you perfectly.'
        : 'Assembly complete. Your lightsaber is ready.',
      forceCost: this.config.assemblyCost,
    };

    return this.craftingSuccess(result);
  }

  // ============================================
  // Requirements Checking
  // ============================================

  /**
   * Check if a Jedi can craft a specific generation
   */
  canCraft(
    jediState: JediPlayerState,
    generation: LightsaberGeneration
  ): LightsaberCraftingResult<void> {
    // Check force sensitive status
    if (jediState.forceSensitiveStatus !== ForceSensitiveStatus.UNLOCKED) {
      return this.craftingError(
        LightsaberCraftingResultCode.NOT_JEDI,
        'You must unlock your Force sensitivity first.'
      );
    }

    const genConfig = GenerationConfigs[generation];

    // Check rank for fourth generation and above
    if (genConfig.requiresMaster) {
      const isMaster = jediState.rank === JediRank.MASTER || jediState.rank === JediRank.SITH_LORD;
      if (!isMaster) {
        return this.craftingError(
          LightsaberCraftingResultCode.INSUFFICIENT_RANK,
          'Only Jedi Masters can craft this generation lightsaber.'
        );
      }
    }

    // Check skill level
    const lightsaberSkillLevel = this.getLightsaberSkillLevel(jediState);
    if (lightsaberSkillLevel < genConfig.requiredSkillLevel) {
      return this.craftingError(
        LightsaberCraftingResultCode.INSUFFICIENT_SKILL,
        `Lightsaber skill level ${genConfig.requiredSkillLevel} required (you have ${lightsaberSkillLevel}).`
      );
    }

    return this.craftingSuccess();
  }

  /**
   * Get the Jedi's lightsaber skill level (0-100)
   */
  private getLightsaberSkillLevel(jediState: JediPlayerState): number {
    // Count lightsaber skills learned
    let skillCount = 0;
    for (const skill of jediState.learnedSkills) {
      if (skill.includes('lightsaber')) {
        skillCount++;
      }
    }

    // Approximate skill level based on skills learned
    // Assuming a full tree has about 20 skills
    return Math.min(100, skillCount * 5);
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Clean up a completed session
   */
  private cleanupSession(sessionId: bigint): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessionsByJedi.delete(session.jediId.toString());
      this.sessions.delete(sessionId);
    }
  }

  // ============================================
  // Result Helpers
  // ============================================

  /**
   * Create a success result
   */
  private craftingSuccess<T>(data?: T): LightsaberCraftingResult<T> {
    return {
      success: true,
      resultCode: LightsaberCraftingResultCode.SUCCESS,
      data,
    };
  }

  /**
   * Create an error result
   */
  private craftingError<T>(
    code: LightsaberCraftingResultCode,
    message: string
  ): LightsaberCraftingResult<T> {
    return {
      success: false,
      resultCode: code,
      errorMessage: message,
    };
  }
}

// ============================================
// Result Types
// ============================================

/**
 * Result of component validation
 */
export interface ComponentValidationResult {
  /** Whether all components are valid */
  valid: boolean;
  /** List of validation issues */
  issues: string[];
  /** Has hilt */
  hasHilt: boolean;
  /** Has blade crystal */
  hasBladeCrystal: boolean;
  /** Has focusing crystal */
  hasFocusingCrystal: boolean;
  /** Has power crystal */
  hasPowerCrystal: boolean;
  /** Has lens */
  hasLens: boolean;
  /** Number of optional crystals */
  optionalCrystalCount: number;
  /** Maximum optional crystals for this generation */
  maxOptionalCrystals: number;
}

/**
 * Result of assembly
 */
export interface LightsaberAssemblyResult {
  /** Whether assembly succeeded */
  success: boolean;
  /** Whether critical success occurred */
  criticalSuccess: boolean;
  /** The created lightsaber (if successful) */
  lightsaber: Lightsaber | null;
  /** Final stats */
  stats: LightsaberStats | null;
  /** Message for the player */
  message: string;
  /** Force cost paid */
  forceCost: number;
}

// ============================================
// Factory Functions
// ============================================

/**
 * Singleton instance
 */
let craftingManagerInstance: LightsaberCraftingManager | null = null;

/**
 * Get the lightsaber crafting manager singleton
 */
export function getLightsaberCraftingManager(): LightsaberCraftingManager {
  if (!craftingManagerInstance) {
    craftingManagerInstance = new LightsaberCraftingManager();
  }
  return craftingManagerInstance;
}

/**
 * Create a new lightsaber crafting manager
 */
export function createLightsaberCraftingManager(
  config: Partial<LightsaberCraftingConfig> = {}
): LightsaberCraftingManager {
  return new LightsaberCraftingManager(config);
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetLightsaberCraftingManager(): void {
  craftingManagerInstance = null;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get error message for result code
 */
export function getCraftingResultMessage(code: LightsaberCraftingResultCode): string {
  const messages: Record<LightsaberCraftingResultCode, string> = {
    [LightsaberCraftingResultCode.SUCCESS]: 'Success',
    [LightsaberCraftingResultCode.NOT_JEDI]: 'You must be a Jedi to craft lightsabers.',
    [LightsaberCraftingResultCode.INSUFFICIENT_RANK]: 'Your Jedi rank is insufficient.',
    [LightsaberCraftingResultCode.INSUFFICIENT_SKILL]: 'Your lightsaber skill is insufficient.',
    [LightsaberCraftingResultCode.MISSING_COMPONENT]: 'A required component is missing.',
    [LightsaberCraftingResultCode.CRYSTAL_NOT_ATTUNED]: 'Crystal must be attuned before use.',
    [LightsaberCraftingResultCode.CRYSTAL_ATTUNED_TO_OTHER]: 'Crystal is attuned to another Jedi.',
    [LightsaberCraftingResultCode.CRYSTAL_QUALITY_TOO_LOW]: 'Crystal quality is too low.',
    [LightsaberCraftingResultCode.INVALID_COMPONENT]: 'Invalid component.',
    [LightsaberCraftingResultCode.WRONG_CRYSTAL_CATEGORY]: 'Wrong crystal category for this slot.',
    [LightsaberCraftingResultCode.INSUFFICIENT_FORCE]: 'Insufficient force power.',
    [LightsaberCraftingResultCode.ASSEMBLY_FAILED]: 'Assembly failed.',
    [LightsaberCraftingResultCode.SESSION_NOT_FOUND]: 'Crafting session not found.',
    [LightsaberCraftingResultCode.SESSION_COMPLETE]: 'Crafting session has ended.',
    [LightsaberCraftingResultCode.INVALID_GENERATION]: 'Cannot craft this generation lightsaber.',
    [LightsaberCraftingResultCode.INTERNAL_ERROR]: 'An internal error occurred.',
  };
  return messages[code];
}
