/**
 * Force Effect Handler
 * Handles the application and processing of force power effects
 *
 * Handles:
 * - Apply effects to targets
 * - Handle channeled powers
 * - Damage over time processing
 * - Buff/debuff stacking rules
 * - Resist checks based on willpower
 */

import type { ObjectId } from '@swg/shared-types';

import {
  ForceState,
  ForceEffectType,
  type ForceEffect,
  type ForcePower,
  type ActiveForceEffect,
  type ForceResistParams,
  type ForcePowerConfig,
  DEFAULT_FORCE_POWER_CONFIG,
  isDamageEffect,
  isHealingEffect,
  isOverTimeEffect,
  isStatModifierEffect,
} from './force-power-types.js';

// ============================================
// Types
// ============================================

/**
 * Result of applying an effect
 */
export interface EffectApplicationResult {
  /** Whether the effect was successfully applied */
  success: boolean;
  /** Whether the effect was resisted */
  resisted: boolean;
  /** Damage dealt (instant) */
  damageDealt: number;
  /** Healing done (instant) */
  healingDone: number;
  /** Health drained (for drain effects) */
  healthDrained: number;
  /** State that was applied */
  stateApplied: ForceState | null;
  /** The active effect that was created */
  activeEffect: ActiveForceEffect | null;
  /** Error message if failed */
  errorMessage: string;
}

/**
 * Result of processing an over-time effect tick
 */
export interface EffectTickResult {
  /** Effect ID */
  effectId: bigint;
  /** Damage dealt this tick */
  damageDealt: number;
  /** Healing done this tick */
  healingDone: number;
  /** Whether the effect expired */
  expired: boolean;
  /** Remaining ticks */
  remainingTicks: number;
}

/**
 * Buff/debuff stacking mode
 */
export enum StackingMode {
  /** Replace existing effect */
  REPLACE = 'REPLACE',
  /** Stack effects (increase magnitude) */
  STACK = 'STACK',
  /** Refresh duration only */
  REFRESH = 'REFRESH',
  /** Keep higher magnitude */
  KEEP_HIGHER = 'KEEP_HIGHER',
  /** Do not stack (ignore new) */
  NONE = 'NONE',
}

/**
 * Stacking rules for effects
 */
export interface StackingRules {
  /** How same-power effects stack */
  samePower: StackingMode;
  /** How same-type effects from different powers stack */
  sameType: StackingMode;
  /** Maximum stacks allowed */
  maxStacks: number;
  /** Stack magnitude multiplier (e.g., 0.5 for diminishing returns) */
  stackMultiplier: number;
}

/**
 * Default stacking rules
 */
export const DEFAULT_STACKING_RULES: StackingRules = {
  samePower: StackingMode.REFRESH,
  sameType: StackingMode.KEEP_HIGHER,
  maxStacks: 3,
  stackMultiplier: 0.75,
};

/**
 * Stacking rules by effect type
 */
export const EFFECT_STACKING_RULES: Partial<Record<ForceEffectType, StackingRules>> = {
  [ForceEffectType.DAMAGE_OVER_TIME]: {
    samePower: StackingMode.REFRESH,
    sameType: StackingMode.STACK,
    maxStacks: 3,
    stackMultiplier: 0.75,
  },
  [ForceEffectType.HEAL_OVER_TIME]: {
    samePower: StackingMode.REFRESH,
    sameType: StackingMode.STACK,
    maxStacks: 2,
    stackMultiplier: 0.5,
  },
  [ForceEffectType.STAT_BUFF]: {
    samePower: StackingMode.REFRESH,
    sameType: StackingMode.KEEP_HIGHER,
    maxStacks: 1,
    stackMultiplier: 1.0,
  },
  [ForceEffectType.STAT_DEBUFF]: {
    samePower: StackingMode.REFRESH,
    sameType: StackingMode.KEEP_HIGHER,
    maxStacks: 1,
    stackMultiplier: 1.0,
  },
  [ForceEffectType.DAMAGE_ABSORPTION]: {
    samePower: StackingMode.REPLACE,
    sameType: StackingMode.KEEP_HIGHER,
    maxStacks: 1,
    stackMultiplier: 1.0,
  },
  [ForceEffectType.STATE_APPLY]: {
    samePower: StackingMode.REFRESH,
    sameType: StackingMode.NONE,
    maxStacks: 1,
    stackMultiplier: 1.0,
  },
};

// ============================================
// Force Effect Handler Class
// ============================================

/**
 * Force Effect Handler
 * Manages application and processing of force effects
 */
export class ForceEffectHandler {
  /** Configuration */
  private config: ForcePowerConfig;

  /** Active effects by target ID */
  private activeEffects: Map<ObjectId, ActiveForceEffect[]> = new Map();

  /** Effect stacks counter (targetId -> powerId -> stack count) */
  private effectStacks: Map<ObjectId, Map<string, number>> = new Map();

  /** Stat modifiers by target (targetId -> stat -> modifier) */
  private statModifiers: Map<ObjectId, Map<string, number>> = new Map();

  /** Next effect ID */
  private nextEffectId: bigint = 1n;

  constructor(config: Partial<ForcePowerConfig> = {}) {
    this.config = { ...DEFAULT_FORCE_POWER_CONFIG, ...config };
  }

  // ============================================
  // Effect Application
  // ============================================

  /**
   * Apply an effect to a target
   */
  applyEffect(
    casterId: ObjectId,
    targetId: ObjectId,
    power: ForcePower,
    effect: ForceEffect,
    resistParams?: ForceResistParams
  ): EffectApplicationResult {
    const result: EffectApplicationResult = {
      success: false,
      resisted: false,
      damageDealt: 0,
      healingDone: 0,
      healthDrained: 0,
      stateApplied: null,
      activeEffect: null,
      errorMessage: '',
    };

    // Check resist for offensive effects
    if (resistParams && this.shouldCheckResist(effect)) {
      if (this.checkResist(resistParams)) {
        result.resisted = true;
        result.errorMessage = 'Effect was resisted.';
        return result;
      }
    }

    // Check stacking rules
    const stackingResult = this.checkStacking(targetId, power, effect);
    if (!stackingResult.canApply) {
      result.errorMessage = 'Effect cannot stack.';
      return result;
    }

    // Create active effect
    const activeEffect = this.createActiveEffect(casterId, targetId, power, effect);

    // Apply immediate effects
    switch (effect.type) {
      case ForceEffectType.DAMAGE:
        result.damageDealt = this.calculateDamage(effect.magnitude, stackingResult.stackCount);
        break;

      case ForceEffectType.HEAL:
        result.healingDone = this.calculateHealing(effect.magnitude, stackingResult.stackCount);
        break;

      case ForceEffectType.HEALTH_DRAIN:
        result.healthDrained = effect.magnitude;
        result.damageDealt = effect.magnitude;
        result.healingDone = Math.floor(effect.magnitude * 0.5);
        break;

      case ForceEffectType.STAT_BUFF:
      case ForceEffectType.STAT_DEBUFF:
        if (effect.statModified) {
          this.applyStatModifier(
            targetId,
            effect.statModified,
            effect.magnitude,
            effect.type === ForceEffectType.STAT_DEBUFF
          );
        }
        break;

      case ForceEffectType.STATE_APPLY:
        if (effect.stateToApply) {
          result.stateApplied = effect.stateToApply;
        }
        break;
    }

    // Track over-time effects
    if (isOverTimeEffect(effect.type) || effect.duration > 0) {
      this.trackEffect(targetId, activeEffect);
      if (stackingResult.effectToReplace) {
        this.removeEffect(targetId, stackingResult.effectToReplace);
      }
    }

    // Update stack count
    this.updateStackCount(targetId, power.id, stackingResult.newStackCount);

    result.success = true;
    result.activeEffect = activeEffect;

    if (this.config.enableLogging) {
      console.log(
        `[ForceEffectHandler] Applied ${effect.type} to ${targetId}: ` +
        `damage=${result.damageDealt}, healing=${result.healingDone}`
      );
    }

    return result;
  }

  /**
   * Create an active effect instance
   */
  private createActiveEffect(
    casterId: ObjectId,
    targetId: ObjectId,
    power: ForcePower,
    effect: ForceEffect
  ): ActiveForceEffect {
    const now = Date.now();
    const ticks =
      effect.tickInterval > 0 ? Math.floor(effect.duration / effect.tickInterval) : 0;

    return {
      effectId: this.nextEffectId++,
      powerId: power.id,
      effect,
      casterId,
      targetId,
      appliedAt: now,
      expiresAt: now + effect.duration,
      lastTickAt: now,
      remainingTicks: ticks,
      totalApplied: 0,
      remainingAbsorption:
        effect.type === ForceEffectType.DAMAGE_ABSORPTION ? effect.magnitude : 0,
    };
  }

  /**
   * Track an active effect
   */
  private trackEffect(targetId: ObjectId, effect: ActiveForceEffect): void {
    let effects = this.activeEffects.get(targetId);
    if (!effects) {
      effects = [];
      this.activeEffects.set(targetId, effects);
    }
    effects.push(effect);
  }

  /**
   * Remove a specific effect
   */
  removeEffect(targetId: ObjectId, effectId: bigint): boolean {
    const effects = this.activeEffects.get(targetId);
    if (!effects) {
      return false;
    }

    const index = effects.findIndex((e) => e.effectId === effectId);
    if (index === -1) {
      return false;
    }

    const removed = effects.splice(index, 1)[0];

    // Remove stat modifier if applicable
    if (isStatModifierEffect(removed.effect.type) && removed.effect.statModified) {
      this.removeStatModifier(
        targetId,
        removed.effect.statModified,
        removed.effect.magnitude,
        removed.effect.type === ForceEffectType.STAT_DEBUFF
      );
    }

    return true;
  }

  // ============================================
  // Stacking Rules
  // ============================================

  /**
   * Check stacking rules for an effect
   */
  private checkStacking(
    targetId: ObjectId,
    power: ForcePower,
    effect: ForceEffect
  ): {
    canApply: boolean;
    effectToReplace: bigint | null;
    stackCount: number;
    newStackCount: number;
  } {
    const rules = EFFECT_STACKING_RULES[effect.type] ?? DEFAULT_STACKING_RULES;
    const effects = this.activeEffects.get(targetId) ?? [];
    const currentStacks = this.getStackCount(targetId, power.id);

    // Find existing effects from same power
    const samePowerEffects = effects.filter((e) => e.powerId === power.id);

    // Find existing effects of same type from different powers
    const sameTypeEffects = effects.filter(
      (e) => e.effect.type === effect.type && e.powerId !== power.id
    );

    // Check same-power stacking
    if (samePowerEffects.length > 0) {
      switch (rules.samePower) {
        case StackingMode.NONE:
          return {
            canApply: false,
            effectToReplace: null,
            stackCount: currentStacks,
            newStackCount: currentStacks,
          };

        case StackingMode.REPLACE:
          return {
            canApply: true,
            effectToReplace: samePowerEffects[0].effectId,
            stackCount: 1,
            newStackCount: 1,
          };

        case StackingMode.REFRESH:
          // Refresh existing effect duration
          const toRefresh = samePowerEffects[0];
          toRefresh.expiresAt = Date.now() + effect.duration;
          toRefresh.remainingTicks =
            effect.tickInterval > 0 ? Math.floor(effect.duration / effect.tickInterval) : 0;
          return {
            canApply: false, // Don't add new effect, just refreshed
            effectToReplace: null,
            stackCount: currentStacks,
            newStackCount: currentStacks,
          };

        case StackingMode.STACK:
          if (currentStacks >= rules.maxStacks) {
            return {
              canApply: false,
              effectToReplace: null,
              stackCount: currentStacks,
              newStackCount: currentStacks,
            };
          }
          return {
            canApply: true,
            effectToReplace: null,
            stackCount: currentStacks,
            newStackCount: currentStacks + 1,
          };

        case StackingMode.KEEP_HIGHER:
          const existing = samePowerEffects[0];
          if (effect.magnitude > existing.effect.magnitude) {
            return {
              canApply: true,
              effectToReplace: existing.effectId,
              stackCount: 1,
              newStackCount: 1,
            };
          }
          return {
            canApply: false,
            effectToReplace: null,
            stackCount: currentStacks,
            newStackCount: currentStacks,
          };
      }
    }

    // Check same-type stacking (from different powers)
    if (sameTypeEffects.length > 0) {
      switch (rules.sameType) {
        case StackingMode.NONE:
          return {
            canApply: false,
            effectToReplace: null,
            stackCount: 0,
            newStackCount: 0,
          };

        case StackingMode.KEEP_HIGHER:
          const highestExisting = sameTypeEffects.reduce((highest, e) =>
            e.effect.magnitude > highest.effect.magnitude ? e : highest
          );
          if (effect.magnitude <= highestExisting.effect.magnitude) {
            return {
              canApply: false,
              effectToReplace: null,
              stackCount: 0,
              newStackCount: 0,
            };
          }
          break;
      }
    }

    return {
      canApply: true,
      effectToReplace: null,
      stackCount: 0,
      newStackCount: 1,
    };
  }

  /**
   * Get stack count for a power on a target
   */
  private getStackCount(targetId: ObjectId, powerId: string): number {
    const stacks = this.effectStacks.get(targetId);
    return stacks?.get(powerId) ?? 0;
  }

  /**
   * Update stack count
   */
  private updateStackCount(targetId: ObjectId, powerId: string, count: number): void {
    let stacks = this.effectStacks.get(targetId);
    if (!stacks) {
      stacks = new Map();
      this.effectStacks.set(targetId, stacks);
    }

    if (count <= 0) {
      stacks.delete(powerId);
    } else {
      stacks.set(powerId, count);
    }
  }

  // ============================================
  // Damage Over Time Processing
  // ============================================

  /**
   * Process all over-time effects for a target
   */
  processEffectTicks(targetId: ObjectId): EffectTickResult[] {
    const effects = this.activeEffects.get(targetId);
    if (!effects) {
      return [];
    }

    const results: EffectTickResult[] = [];
    const now = Date.now();

    for (const effect of effects) {
      if (!isOverTimeEffect(effect.effect.type)) {
        continue;
      }

      // Check if it's time for a tick
      if (now - effect.lastTickAt < effect.effect.tickInterval) {
        continue;
      }

      const result = this.processEffectTick(effect, now);
      results.push(result);
    }

    // Remove expired effects
    this.cleanupExpiredEffects(targetId, now);

    return results;
  }

  /**
   * Process a single effect tick
   */
  private processEffectTick(effect: ActiveForceEffect, now: number): EffectTickResult {
    const result: EffectTickResult = {
      effectId: effect.effectId,
      damageDealt: 0,
      healingDone: 0,
      expired: false,
      remainingTicks: effect.remainingTicks,
    };

    // Calculate tick amount
    const tickAmount = effect.effect.magnitude;
    const stackCount = this.getStackCount(effect.targetId, effect.powerId);
    const rules = EFFECT_STACKING_RULES[effect.effect.type] ?? DEFAULT_STACKING_RULES;
    const stackMultiplier = Math.pow(rules.stackMultiplier, stackCount - 1);

    if (effect.effect.type === ForceEffectType.DAMAGE_OVER_TIME) {
      result.damageDealt = Math.floor(tickAmount * stackMultiplier);
    } else if (effect.effect.type === ForceEffectType.HEAL_OVER_TIME) {
      result.healingDone = Math.floor(tickAmount * stackMultiplier);
    }

    // Update effect state
    effect.lastTickAt = now;
    effect.remainingTicks--;
    effect.totalApplied += result.damageDealt + result.healingDone;

    // Check expiration
    if (effect.remainingTicks <= 0 || now >= effect.expiresAt) {
      result.expired = true;
    }

    result.remainingTicks = effect.remainingTicks;

    if (this.config.enableLogging) {
      console.log(
        `[ForceEffectHandler] Tick for ${effect.effectId}: ` +
        `damage=${result.damageDealt}, healing=${result.healingDone}, ` +
        `remaining=${result.remainingTicks}`
      );
    }

    return result;
  }

  /**
   * Clean up expired effects
   */
  private cleanupExpiredEffects(targetId: ObjectId, now: number): void {
    const effects = this.activeEffects.get(targetId);
    if (!effects) {
      return;
    }

    const expiredEffects = effects.filter(
      (e) => e.expiresAt <= now || (isOverTimeEffect(e.effect.type) && e.remainingTicks <= 0)
    );

    for (const expired of expiredEffects) {
      this.removeEffect(targetId, expired.effectId);

      // Update stack count
      const currentStacks = this.getStackCount(targetId, expired.powerId);
      if (currentStacks > 0) {
        this.updateStackCount(targetId, expired.powerId, currentStacks - 1);
      }
    }
  }

  // ============================================
  // Channeled Power Processing
  // ============================================

  /**
   * Process a channeled power tick
   */
  processChannelTick(
    casterId: ObjectId,
    targetId: ObjectId,
    power: ForcePower,
    currentTime: number,
    lastTickTime: number
  ): { damage: number; healing: number } {
    let damage = 0;
    let healing = 0;

    for (const effect of power.effects) {
      if (!isOverTimeEffect(effect.type)) {
        continue;
      }

      // Check if enough time has passed for a tick
      const timeSinceLastTick = currentTime - lastTickTime;
      if (timeSinceLastTick < effect.tickInterval) {
        continue;
      }

      if (effect.type === ForceEffectType.DAMAGE_OVER_TIME) {
        damage += effect.magnitude;
      } else if (effect.type === ForceEffectType.HEAL_OVER_TIME) {
        healing += effect.magnitude;
      }
    }

    return { damage, healing };
  }

  // ============================================
  // Resist Checks
  // ============================================

  /**
   * Check if an effect should have resist check
   */
  private shouldCheckResist(effect: ForceEffect): boolean {
    return (
      isDamageEffect(effect.type) ||
      effect.type === ForceEffectType.STATE_APPLY ||
      effect.type === ForceEffectType.FEAR ||
      effect.type === ForceEffectType.CONFUSION
    );
  }

  /**
   * Perform a resist check
   */
  checkResist(params: ForceResistParams): boolean {
    const { casterForcePower, targetWillpower, targetForceDefense, baseResistChance, isDarkSide } =
      params;

    // Calculate base resist chance
    let resistChance = baseResistChance;

    // Add willpower bonus
    resistChance += targetWillpower * this.config.willpowerResistRate;

    // Add force defense bonus
    resistChance += targetForceDefense * 0.002;

    // Subtract caster force power penalty
    resistChance -= casterForcePower * 0.001;

    // Dark side powers are slightly harder to resist for non-force users
    if (isDarkSide && targetForceDefense < 10) {
      resistChance -= 0.05;
    }

    // Clamp resist chance
    resistChance = Math.max(0, Math.min(this.config.maxResistChance, resistChance));

    const roll = Math.random();
    const resisted = roll < resistChance;

    if (this.config.enableLogging && resisted) {
      console.log(
        `[ForceEffectHandler] Resist check passed: chance=${resistChance.toFixed(2)}, roll=${roll.toFixed(2)}`
      );
    }

    return resisted;
  }

  /**
   * Calculate effective resist chance for display
   */
  calculateResistChance(params: ForceResistParams): number {
    let resistChance = params.baseResistChance;
    resistChance += params.targetWillpower * this.config.willpowerResistRate;
    resistChance += params.targetForceDefense * 0.002;
    resistChance -= params.casterForcePower * 0.001;

    if (params.isDarkSide && params.targetForceDefense < 10) {
      resistChance -= 0.05;
    }

    return Math.max(0, Math.min(this.config.maxResistChance, resistChance));
  }

  // ============================================
  // Stat Modifiers
  // ============================================

  /**
   * Apply a stat modifier to a target
   */
  private applyStatModifier(
    targetId: ObjectId,
    stat: string,
    magnitude: number,
    isDebuff: boolean
  ): void {
    let modifiers = this.statModifiers.get(targetId);
    if (!modifiers) {
      modifiers = new Map();
      this.statModifiers.set(targetId, modifiers);
    }

    const currentMod = modifiers.get(stat) ?? 0;
    const newMod = isDebuff ? currentMod - magnitude : currentMod + magnitude;
    modifiers.set(stat, newMod);

    if (this.config.enableLogging) {
      console.log(
        `[ForceEffectHandler] Applied stat modifier to ${targetId}: ${stat} ${isDebuff ? '-' : '+'}${magnitude} (total: ${newMod})`
      );
    }
  }

  /**
   * Remove a stat modifier from a target
   */
  private removeStatModifier(
    targetId: ObjectId,
    stat: string,
    magnitude: number,
    isDebuff: boolean
  ): void {
    const modifiers = this.statModifiers.get(targetId);
    if (!modifiers) {
      return;
    }

    const currentMod = modifiers.get(stat) ?? 0;
    const newMod = isDebuff ? currentMod + magnitude : currentMod - magnitude;

    if (Math.abs(newMod) < 0.01) {
      modifiers.delete(stat);
    } else {
      modifiers.set(stat, newMod);
    }
  }

  /**
   * Get total stat modifier for a target
   */
  getStatModifier(targetId: ObjectId, stat: string): number {
    const modifiers = this.statModifiers.get(targetId);
    return modifiers?.get(stat) ?? 0;
  }

  /**
   * Get all stat modifiers for a target
   */
  getAllStatModifiers(targetId: ObjectId): Map<string, number> {
    return new Map(this.statModifiers.get(targetId) ?? []);
  }

  // ============================================
  // Damage Absorption
  // ============================================

  /**
   * Apply damage to absorption shields first
   */
  absorbDamage(targetId: ObjectId, damage: number): { absorbed: number; remaining: number } {
    const effects = this.activeEffects.get(targetId);
    if (!effects) {
      return { absorbed: 0, remaining: damage };
    }

    let absorbed = 0;
    let remaining = damage;

    // Find all absorption effects
    const absorptionEffects = effects.filter(
      (e) => e.effect.type === ForceEffectType.DAMAGE_ABSORPTION && e.remainingAbsorption > 0
    );

    for (const effect of absorptionEffects) {
      if (remaining <= 0) {
        break;
      }

      const absorb = Math.min(remaining, effect.remainingAbsorption);
      effect.remainingAbsorption -= absorb;
      absorbed += absorb;
      remaining -= absorb;

      // Remove depleted shields
      if (effect.remainingAbsorption <= 0) {
        this.removeEffect(targetId, effect.effectId);
      }
    }

    if (this.config.enableLogging && absorbed > 0) {
      console.log(
        `[ForceEffectHandler] ${targetId} absorbed ${absorbed} damage, ${remaining} remaining`
      );
    }

    return { absorbed, remaining };
  }

  /**
   * Get remaining absorption amount for a target
   */
  getRemainingAbsorption(targetId: ObjectId): number {
    const effects = this.activeEffects.get(targetId);
    if (!effects) {
      return 0;
    }

    return effects
      .filter((e) => e.effect.type === ForceEffectType.DAMAGE_ABSORPTION)
      .reduce((sum, e) => sum + e.remainingAbsorption, 0);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Calculate damage with stack scaling
   */
  private calculateDamage(baseDamage: number, stackCount: number): number {
    if (stackCount <= 1) {
      return baseDamage;
    }
    const rules = EFFECT_STACKING_RULES[ForceEffectType.DAMAGE] ?? DEFAULT_STACKING_RULES;
    return Math.floor(baseDamage * Math.pow(rules.stackMultiplier, stackCount - 1));
  }

  /**
   * Calculate healing with stack scaling
   */
  private calculateHealing(baseHealing: number, stackCount: number): number {
    if (stackCount <= 1) {
      return baseHealing;
    }
    const rules = EFFECT_STACKING_RULES[ForceEffectType.HEAL] ?? DEFAULT_STACKING_RULES;
    return Math.floor(baseHealing * Math.pow(rules.stackMultiplier, stackCount - 1));
  }

  /**
   * Get all active effects for a target
   */
  getActiveEffects(targetId: ObjectId): ActiveForceEffect[] {
    return [...(this.activeEffects.get(targetId) ?? [])];
  }

  /**
   * Get active effects of a specific type
   */
  getEffectsByType(targetId: ObjectId, type: ForceEffectType): ActiveForceEffect[] {
    const effects = this.activeEffects.get(targetId) ?? [];
    return effects.filter((e) => e.effect.type === type);
  }

  /**
   * Check if target has an effect from a specific power
   */
  hasEffectFromPower(targetId: ObjectId, powerId: string): boolean {
    const effects = this.activeEffects.get(targetId) ?? [];
    return effects.some((e) => e.powerId === powerId);
  }

  /**
   * Remove all effects for a target
   */
  removeAllEffects(targetId: ObjectId): void {
    this.activeEffects.delete(targetId);
    this.effectStacks.delete(targetId);
    this.statModifiers.delete(targetId);
  }

  /**
   * Remove all effects from a specific caster
   */
  removeEffectsFromCaster(targetId: ObjectId, casterId: ObjectId): void {
    const effects = this.activeEffects.get(targetId);
    if (!effects) {
      return;
    }

    const toRemove = effects.filter((e) => e.casterId === casterId);
    for (const effect of toRemove) {
      this.removeEffect(targetId, effect.effectId);
    }
  }

  /**
   * Process tick for all effects
   */
  tick(): Map<ObjectId, EffectTickResult[]> {
    const allResults = new Map<ObjectId, EffectTickResult[]>();

    for (const [targetId] of this.activeEffects) {
      const results = this.processEffectTicks(targetId);
      if (results.length > 0) {
        allResults.set(targetId, results);
      }
    }

    return allResults;
  }

  /**
   * Get effect count for monitoring
   */
  get totalEffectCount(): number {
    let count = 0;
    for (const [, effects] of this.activeEffects) {
      count += effects.length;
    }
    return count;
  }

  /**
   * Get tracked target count
   */
  get trackedTargetCount(): number {
    return this.activeEffects.size;
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Force Effect Handler
 */
export function createForceEffectHandler(
  config?: Partial<ForcePowerConfig>
): ForceEffectHandler {
  return new ForceEffectHandler(config);
}
