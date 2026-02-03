/**
 * HAM Modifiers
 * Buff/debuff system for modifying HAM pools over time
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import type { CreatureObject, HamAttributeType } from '@swg/objects';
import { HamAttribute } from '@swg/objects';

/**
 * Type of HAM modifier effect
 */
export enum HamModifierType {
  /** Increases max HAM value */
  MaxBonus = 'max_bonus',
  /** Decreases max HAM value */
  MaxPenalty = 'max_penalty',
  /** Healing over time */
  HealOverTime = 'heal_over_time',
  /** Damage over time (poison, disease, fire) */
  DamageOverTime = 'damage_over_time',
  /** Regeneration rate bonus */
  RegenBonus = 'regen_bonus',
  /** Regeneration rate penalty */
  RegenPenalty = 'regen_penalty',
}

/**
 * Source type for the modifier
 */
export enum ModifierSource {
  /** Food/drink consumable */
  Food = 'food',
  /** Medical buff (stim, enhancement) */
  Medical = 'medical',
  /** Entertainer buff */
  Entertainer = 'entertainer',
  /** Poison effect */
  Poison = 'poison',
  /** Disease effect */
  Disease = 'disease',
  /** Fire/burning effect */
  Fire = 'fire',
  /** Bleeding effect */
  Bleeding = 'bleeding',
  /** Force power */
  Force = 'force',
  /** Equipment */
  Equipment = 'equipment',
  /** Skill-based */
  Skill = 'skill',
  /** Other source */
  Other = 'other',
}

/**
 * HAM modifier definition
 */
export interface HamModifier {
  /** Unique identifier for this modifier */
  id: string;
  /** CRC of the buff/effect */
  effectCrc: CrcValue;
  /** Type of modifier */
  type: HamModifierType;
  /** Source of the modifier */
  source: ModifierSource;
  /** Which HAM attribute is affected */
  attribute: HamAttributeType;
  /** Value of the modifier (damage/heal amount or stat modifier) */
  value: number;
  /** Duration remaining in milliseconds (-1 for permanent) */
  duration: number;
  /** Total duration when applied (for UI display) */
  totalDuration: number;
  /** Tick interval in milliseconds (for DoT/HoT effects) */
  tickInterval: number;
  /** Time until next tick */
  nextTickTime: number;
  /** Object ID of the source (caster, item, etc.) */
  sourceId: ObjectId;
  /** Timestamp when modifier was applied */
  appliedAt: number;
  /** Whether this modifier can stack with others of same type */
  stackable: boolean;
  /** Stack count if stackable */
  stacks: number;
  /** Maximum stacks */
  maxStacks: number;
  /** Whether this effect is removable (by cleanse, etc.) */
  removable: boolean;
  /** Whether this is a debuff (vs buff) */
  isDebuff: boolean;
  /** Display name for UI */
  displayName: string;
  /** Icon path for UI */
  iconPath?: string;
}

/**
 * Manager for HAM modifiers on a creature
 */
export class HamModifierManager {
  /** Active modifiers by modifier ID */
  private modifiers: Map<string, HamModifier> = new Map();
  /** Modifier counter for generating unique IDs */
  private modifierCounter: number = 0;

  /**
   * Apply a new modifier to the creature
   * @param creature - Target creature
   * @param modifier - Partial modifier definition (id will be generated)
   * @returns The applied modifier
   */
  applyModifier(creature: CreatureObject, modifier: Omit<HamModifier, 'id'>): HamModifier {
    const id = `ham_mod_${++this.modifierCounter}`;
    const fullModifier: HamModifier = {
      ...modifier,
      id,
      appliedAt: Date.now(),
      nextTickTime: modifier.tickInterval > 0 ? Date.now() + modifier.tickInterval : 0,
    };

    // Check for stacking
    if (!modifier.stackable) {
      // Find existing modifier of same type/source/attribute
      const existing = this.findSimilarModifier(modifier);
      if (existing) {
        // Replace the existing modifier
        this.removeModifier(creature, existing.id);
      }
    } else if (modifier.stackable) {
      // Add to stack count
      const existing = this.findSimilarModifier(modifier);
      if (existing && existing.stacks < existing.maxStacks) {
        existing.stacks++;
        existing.duration = modifier.duration; // Refresh duration
        existing.appliedAt = Date.now();
        return existing;
      }
    }

    this.modifiers.set(id, fullModifier);

    // Apply immediate effects for max bonuses/penalties
    this.applyImmediateEffect(creature, fullModifier);

    return fullModifier;
  }

  /**
   * Find a similar modifier (same type, source, and attribute)
   */
  private findSimilarModifier(modifier: Omit<HamModifier, 'id'>): HamModifier | undefined {
    for (const existing of this.modifiers.values()) {
      if (
        existing.type === modifier.type &&
        existing.source === modifier.source &&
        existing.attribute === modifier.attribute
      ) {
        return existing;
      }
    }
    return undefined;
  }

  /**
   * Apply immediate effect (for max bonuses/penalties)
   */
  private applyImmediateEffect(creature: CreatureObject, modifier: HamModifier): void {
    if (modifier.type === HamModifierType.MaxBonus || modifier.type === HamModifierType.MaxPenalty) {
      const delta = modifier.type === HamModifierType.MaxBonus ? modifier.value : -modifier.value;
      this.modifyMaxHam(creature, modifier.attribute, delta);
    } else if (
      modifier.type === HamModifierType.RegenBonus ||
      modifier.type === HamModifierType.RegenPenalty
    ) {
      const delta = modifier.type === HamModifierType.RegenBonus ? modifier.value : -modifier.value;
      this.modifyRegenRate(creature, modifier.attribute, delta);
    }
  }

  /**
   * Remove immediate effect (when modifier expires)
   */
  private removeImmediateEffect(creature: CreatureObject, modifier: HamModifier): void {
    if (modifier.type === HamModifierType.MaxBonus || modifier.type === HamModifierType.MaxPenalty) {
      const delta = modifier.type === HamModifierType.MaxBonus ? -modifier.value : modifier.value;
      this.modifyMaxHam(creature, modifier.attribute, delta);
    } else if (
      modifier.type === HamModifierType.RegenBonus ||
      modifier.type === HamModifierType.RegenPenalty
    ) {
      const delta = modifier.type === HamModifierType.RegenBonus ? -modifier.value : modifier.value;
      this.modifyRegenRate(creature, modifier.attribute, delta);
    }
  }

  /**
   * Modify the max value of a HAM attribute
   */
  private modifyMaxHam(creature: CreatureObject, attribute: HamAttributeType, delta: number): void {
    switch (attribute) {
      case HamAttribute.HEALTH:
      case HamAttribute.STRENGTH:
      case HamAttribute.CONSTITUTION:
        creature.health.max = Math.max(1, creature.health.max + delta);
        break;
      case HamAttribute.ACTION:
      case HamAttribute.QUICKNESS:
      case HamAttribute.STAMINA:
        creature.action.max = Math.max(1, creature.action.max + delta);
        break;
      case HamAttribute.MIND:
      case HamAttribute.FOCUS:
      case HamAttribute.WILLPOWER:
        creature.mind.max = Math.max(1, creature.mind.max + delta);
        break;
    }
  }

  /**
   * Modify the regeneration rate of a HAM attribute
   */
  private modifyRegenRate(
    creature: CreatureObject,
    attribute: HamAttributeType,
    delta: number
  ): void {
    switch (attribute) {
      case HamAttribute.HEALTH:
      case HamAttribute.STRENGTH:
      case HamAttribute.CONSTITUTION:
        creature.health.regenRate = Math.max(0, creature.health.regenRate + delta);
        break;
      case HamAttribute.ACTION:
      case HamAttribute.QUICKNESS:
      case HamAttribute.STAMINA:
        creature.action.regenRate = Math.max(0, creature.action.regenRate + delta);
        break;
      case HamAttribute.MIND:
      case HamAttribute.FOCUS:
      case HamAttribute.WILLPOWER:
        creature.mind.regenRate = Math.max(0, creature.mind.regenRate + delta);
        break;
    }
  }

  /**
   * Remove a modifier by ID
   * @param creature - Target creature
   * @param modifierId - ID of the modifier to remove
   * @returns Whether the modifier was found and removed
   */
  removeModifier(creature: CreatureObject, modifierId: string): boolean {
    const modifier = this.modifiers.get(modifierId);
    if (!modifier) {
      return false;
    }

    // Remove immediate effects
    this.removeImmediateEffect(creature, modifier);

    this.modifiers.delete(modifierId);
    return true;
  }

  /**
   * Remove all modifiers from a source
   * @param creature - Target creature
   * @param source - Source type to remove
   * @returns Number of modifiers removed
   */
  removeModifiersBySource(creature: CreatureObject, source: ModifierSource): number {
    let removed = 0;
    const toRemove: string[] = [];

    for (const [id, modifier] of this.modifiers) {
      if (modifier.source === source) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      if (this.removeModifier(creature, id)) {
        removed++;
      }
    }

    return removed;
  }

  /**
   * Remove all debuffs (cleanse effect)
   * @param creature - Target creature
   * @param onlyRemovable - Only remove debuffs marked as removable
   * @returns Number of debuffs removed
   */
  cleanse(creature: CreatureObject, onlyRemovable: boolean = true): number {
    let removed = 0;
    const toRemove: string[] = [];

    for (const [id, modifier] of this.modifiers) {
      if (modifier.isDebuff && (!onlyRemovable || modifier.removable)) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      if (this.removeModifier(creature, id)) {
        removed++;
      }
    }

    return removed;
  }

  /**
   * Process modifier ticks (damage/heal over time)
   * @param creature - Target creature
   * @param currentTime - Current server time
   * @returns Array of effects that ticked
   */
  tick(
    creature: CreatureObject,
    currentTime: number
  ): Array<{ modifier: HamModifier; applied: number }> {
    const ticked: Array<{ modifier: HamModifier; applied: number }> = [];
    const expired: string[] = [];

    for (const [id, modifier] of this.modifiers) {
      // Check for expiration
      if (modifier.duration > 0) {
        const elapsed = currentTime - modifier.appliedAt;
        if (elapsed >= modifier.duration) {
          expired.push(id);
          continue;
        }
      }

      // Process ticks for DoT/HoT effects
      if (
        modifier.tickInterval > 0 &&
        currentTime >= modifier.nextTickTime &&
        (modifier.type === HamModifierType.DamageOverTime ||
          modifier.type === HamModifierType.HealOverTime)
      ) {
        const applied = this.applyTick(creature, modifier);
        modifier.nextTickTime = currentTime + modifier.tickInterval;
        ticked.push({ modifier, applied });
      }
    }

    // Remove expired modifiers
    for (const id of expired) {
      this.removeModifier(creature, id);
    }

    return ticked;
  }

  /**
   * Apply a single tick of a DoT/HoT effect
   */
  private applyTick(creature: CreatureObject, modifier: HamModifier): number {
    const value = modifier.value * modifier.stacks;

    if (modifier.type === HamModifierType.DamageOverTime) {
      switch (modifier.attribute) {
        case HamAttribute.HEALTH:
        case HamAttribute.STRENGTH:
        case HamAttribute.CONSTITUTION:
          creature.damageHealth(value);
          break;
        case HamAttribute.ACTION:
        case HamAttribute.QUICKNESS:
        case HamAttribute.STAMINA:
          creature.damageAction(value);
          break;
        case HamAttribute.MIND:
        case HamAttribute.FOCUS:
        case HamAttribute.WILLPOWER:
          creature.damageMind(value);
          break;
      }
      return value;
    } else if (modifier.type === HamModifierType.HealOverTime) {
      switch (modifier.attribute) {
        case HamAttribute.HEALTH:
        case HamAttribute.STRENGTH:
        case HamAttribute.CONSTITUTION:
          creature.healHealth(value);
          break;
        case HamAttribute.ACTION:
        case HamAttribute.QUICKNESS:
        case HamAttribute.STAMINA:
          creature.healAction(value);
          break;
        case HamAttribute.MIND:
        case HamAttribute.FOCUS:
        case HamAttribute.WILLPOWER:
          creature.healMind(value);
          break;
      }
      return value;
    }

    return 0;
  }

  /**
   * Get all active modifiers
   */
  getModifiers(): HamModifier[] {
    return Array.from(this.modifiers.values());
  }

  /**
   * Get modifiers of a specific type
   */
  getModifiersByType(type: HamModifierType): HamModifier[] {
    return Array.from(this.modifiers.values()).filter((m) => m.type === type);
  }

  /**
   * Get modifiers affecting a specific attribute
   */
  getModifiersByAttribute(attribute: HamAttributeType): HamModifier[] {
    return Array.from(this.modifiers.values()).filter((m) => m.attribute === attribute);
  }

  /**
   * Check if creature has a specific modifier type active
   */
  hasModifierType(type: HamModifierType): boolean {
    for (const modifier of this.modifiers.values()) {
      if (modifier.type === type) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get total bonus/penalty for a specific attribute and type
   */
  getTotalModifier(attribute: HamAttributeType, type: HamModifierType): number {
    let total = 0;
    for (const modifier of this.modifiers.values()) {
      if (modifier.attribute === attribute && modifier.type === type) {
        total += modifier.value * modifier.stacks;
      }
    }
    return total;
  }

  /**
   * Clear all modifiers
   */
  clearAll(creature: CreatureObject): void {
    for (const id of Array.from(this.modifiers.keys())) {
      this.removeModifier(creature, id);
    }
  }
}

/**
 * Create a food buff modifier
 */
export function createFoodBuff(
  attribute: HamAttributeType,
  bonusAmount: number,
  durationMs: number,
  sourceId: ObjectId
): Omit<HamModifier, 'id'> {
  return {
    effectCrc: 0,
    type: HamModifierType.MaxBonus,
    source: ModifierSource.Food,
    attribute,
    value: bonusAmount,
    duration: durationMs,
    totalDuration: durationMs,
    tickInterval: 0,
    nextTickTime: 0,
    sourceId,
    appliedAt: 0,
    stackable: false,
    stacks: 1,
    maxStacks: 1,
    removable: true,
    isDebuff: false,
    displayName: 'Food Buff',
  };
}

/**
 * Create a medical heal-over-time modifier
 */
export function createMedicalHoT(
  attribute: HamAttributeType,
  healPerTick: number,
  tickIntervalMs: number,
  durationMs: number,
  sourceId: ObjectId
): Omit<HamModifier, 'id'> {
  return {
    effectCrc: 0,
    type: HamModifierType.HealOverTime,
    source: ModifierSource.Medical,
    attribute,
    value: healPerTick,
    duration: durationMs,
    totalDuration: durationMs,
    tickInterval: tickIntervalMs,
    nextTickTime: 0,
    sourceId,
    appliedAt: 0,
    stackable: false,
    stacks: 1,
    maxStacks: 1,
    removable: true,
    isDebuff: false,
    displayName: 'Medical Enhancement',
  };
}

/**
 * Create a poison damage-over-time modifier
 */
export function createPoisonDoT(
  damagePerTick: number,
  tickIntervalMs: number,
  durationMs: number,
  sourceId: ObjectId,
  stacks: number = 1,
  maxStacks: number = 5
): Omit<HamModifier, 'id'> {
  return {
    effectCrc: 0,
    type: HamModifierType.DamageOverTime,
    source: ModifierSource.Poison,
    attribute: HamAttribute.HEALTH,
    value: damagePerTick,
    duration: durationMs,
    totalDuration: durationMs,
    tickInterval: tickIntervalMs,
    nextTickTime: 0,
    sourceId,
    appliedAt: 0,
    stackable: true,
    stacks,
    maxStacks,
    removable: true,
    isDebuff: true,
    displayName: 'Poison',
  };
}

/**
 * Create a disease damage-over-time modifier
 */
export function createDiseaseDoT(
  damagePerTick: number,
  tickIntervalMs: number,
  durationMs: number,
  sourceId: ObjectId
): Omit<HamModifier, 'id'> {
  return {
    effectCrc: 0,
    type: HamModifierType.DamageOverTime,
    source: ModifierSource.Disease,
    attribute: HamAttribute.HEALTH,
    value: damagePerTick,
    duration: durationMs,
    totalDuration: durationMs,
    tickInterval: tickIntervalMs,
    nextTickTime: 0,
    sourceId,
    appliedAt: 0,
    stackable: false,
    stacks: 1,
    maxStacks: 1,
    removable: true,
    isDebuff: true,
    displayName: 'Disease',
  };
}

/**
 * Create a bleeding damage-over-time modifier
 */
export function createBleedingDoT(
  damagePerTick: number,
  tickIntervalMs: number,
  durationMs: number,
  sourceId: ObjectId,
  stacks: number = 1,
  maxStacks: number = 3
): Omit<HamModifier, 'id'> {
  return {
    effectCrc: 0,
    type: HamModifierType.DamageOverTime,
    source: ModifierSource.Bleeding,
    attribute: HamAttribute.HEALTH,
    value: damagePerTick,
    duration: durationMs,
    totalDuration: durationMs,
    tickInterval: tickIntervalMs,
    nextTickTime: 0,
    sourceId,
    appliedAt: 0,
    stackable: true,
    stacks,
    maxStacks,
    removable: true,
    isDebuff: true,
    displayName: 'Bleeding',
  };
}

/**
 * Create a fire damage-over-time modifier
 */
export function createFireDoT(
  damagePerTick: number,
  tickIntervalMs: number,
  durationMs: number,
  sourceId: ObjectId
): Omit<HamModifier, 'id'> {
  return {
    effectCrc: 0,
    type: HamModifierType.DamageOverTime,
    source: ModifierSource.Fire,
    attribute: HamAttribute.HEALTH,
    value: damagePerTick,
    duration: durationMs,
    totalDuration: durationMs,
    tickInterval: tickIntervalMs,
    nextTickTime: 0,
    sourceId,
    appliedAt: 0,
    stackable: false,
    stacks: 1,
    maxStacks: 1,
    removable: true,
    isDebuff: true,
    displayName: 'On Fire',
  };
}
