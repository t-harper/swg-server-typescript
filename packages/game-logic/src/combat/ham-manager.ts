/**
 * HAM Manager
 * Central manager for Health/Action/Mind pool mechanics
 * Handles damage, healing, wounds, regeneration, and status effects
 */

import type { ObjectId } from '@swg/shared-types';
import type { CreatureObject, HamAttributeType } from '@swg/objects';
import { HamAttribute, CreatureState as ObjectCreatureState, DamageType } from '@swg/objects';

import {
  type DamageResult,
  type HealResult,
  HitLocation,
  calculateHitLocation,
  getHitLocationModifier,
  createEmptyDamageResult,
  createEmptyHealResult,
} from './damage-types.js';

import {
  type RegenerationState,
  createRegenState,
  processRegeneration,
  pauseRegeneration,
  resumeRegeneration,
  updateRegenBonuses,
} from './regeneration.js';

import {
  type IncapacitationState,
  createIncapState,
  checkIncapacitation,
  applyIncapacitation,
  processIncapTick,
  reviveFromIncap,
  processDeath,
  cloneCreature,
  applyDeathblow,
  DeathType,
  hasCloneSickness,
  IncapConfig,
} from './incapacitation.js';

import { type HamModifier, HamModifierManager } from './ham-modifiers.js';

// Re-export types for convenience
export { DamageResult, HealResult, HitLocation } from './damage-types.js';
export { DeathType } from './incapacitation.js';

/**
 * Configuration for the HAM Manager
 */
export interface HamManagerConfig {
  /** Tick interval in milliseconds (default: 1000) */
  tickInterval: number;
  /** Whether to enable combat logging */
  enableLogging: boolean;
  /** Critical hit chance (0.0-1.0) */
  baseCriticalChance: number;
  /** Critical hit damage multiplier */
  criticalDamageMultiplier: number;
  /** Glancing blow chance (0.0-1.0) */
  baseGlancingChance: number;
  /** Glancing blow damage multiplier */
  glancingDamageMultiplier: number;
}

/**
 * Default configuration
 */
export const DEFAULT_HAM_CONFIG: HamManagerConfig = {
  tickInterval: 1000,
  enableLogging: false,
  baseCriticalChance: 0.05,
  criticalDamageMultiplier: 2.0,
  baseGlancingChance: 0.1,
  glancingDamageMultiplier: 0.5,
};

/**
 * Creature tracking state
 */
interface TrackedCreatureState {
  creature: CreatureObject;
  regenState: RegenerationState;
  incapState: IncapacitationState;
  modifierManager: HamModifierManager;
}

/**
 * HAM Manager - Centralized HAM pool management
 */
export class HamManager {
  /** Configuration */
  private config: HamManagerConfig;

  /** Tracked creatures by ID */
  private creatures: Map<ObjectId, TrackedCreatureState> = new Map();

  /** Last tick time */
  private lastTickTime: number = 0;

  /**
   * Create a new HAM Manager
   * @param config - Optional configuration overrides
   */
  constructor(config: Partial<HamManagerConfig> = {}) {
    this.config = { ...DEFAULT_HAM_CONFIG, ...config };
    this.lastTickTime = Date.now();
  }

  /**
   * Register a creature for HAM management
   * @param creature - The creature to register
   */
  registerCreature(creature: CreatureObject): void {
    const objectId = creature.objectId;
    if (this.creatures.has(objectId)) {
      return;
    }

    this.creatures.set(objectId, {
      creature,
      regenState: createRegenState(objectId),
      incapState: createIncapState(objectId),
      modifierManager: new HamModifierManager(),
    });

    if (this.config.enableLogging) {
      console.log(`[HamManager] Registered creature ${objectId}`);
    }
  }

  /**
   * Unregister a creature from HAM management
   * @param creatureId - ID of the creature to unregister
   */
  unregisterCreature(creatureId: ObjectId): void {
    const state = this.creatures.get(creatureId);
    if (state) {
      // Clean up modifier effects
      state.modifierManager.clearAll(state.creature);
      this.creatures.delete(creatureId);

      if (this.config.enableLogging) {
        console.log(`[HamManager] Unregistered creature ${creatureId}`);
      }
    }
  }

  /**
   * Get creature state
   * @param creatureId - ID of the creature
   * @returns Creature state or undefined
   */
  private getCreatureState(creatureId: ObjectId): TrackedCreatureState | undefined {
    return this.creatures.get(creatureId);
  }

  // ============================================
  // Damage Application
  // ============================================

  /**
   * Apply damage to a target
   * @param attacker - The attacking creature (or null for environmental)
   * @param target - The target creature
   * @param amount - Raw damage amount
   * @param attribute - Which HAM attribute to damage
   * @param damageType - Type of damage being dealt
   * @returns Damage result
   */
  applyDamage(
    attacker: CreatureObject | null,
    target: CreatureObject,
    amount: number,
    attribute: HamAttributeType,
    damageType: DamageType
  ): DamageResult {
    const attackerId = attacker?.objectId ?? 0n;
    const result = createEmptyDamageResult(attackerId, target.objectId, damageType);
    result.rawDamage = amount;

    // Check if target is already dead
    if (target.isDead()) {
      return result;
    }

    // Calculate hit location
    result.hitLocation = calculateHitLocation();
    const hitModifier = getHitLocationModifier(result.hitLocation);

    // Check for critical/glancing
    const critRoll = Math.random();
    const glanceRoll = Math.random();

    if (critRoll < this.config.baseCriticalChance) {
      result.critical = true;
    } else if (glanceRoll < this.config.baseGlancingChance) {
      result.glancing = true;
    }

    // Apply modifiers
    let modifiedDamage = amount * hitModifier;
    if (result.critical) {
      modifiedDamage *= this.config.criticalDamageMultiplier;
    } else if (result.glancing) {
      modifiedDamage *= this.config.glancingDamageMultiplier;
    }

    // Calculate armor/protection reduction
    const protection = target.getProtection(damageType);
    result.blocked = Math.min(modifiedDamage, protection);
    modifiedDamage -= result.blocked;

    // Apply damage to appropriate pool
    result.actualDamage = Math.max(0, Math.floor(modifiedDamage));

    if (result.actualDamage > 0) {
      switch (attribute) {
        case HamAttribute.HEALTH:
        case HamAttribute.STRENGTH:
        case HamAttribute.CONSTITUTION:
          target.damageHealth(result.actualDamage);
          break;
        case HamAttribute.ACTION:
        case HamAttribute.QUICKNESS:
        case HamAttribute.STAMINA:
          target.damageAction(result.actualDamage);
          break;
        case HamAttribute.MIND:
        case HamAttribute.FOCUS:
        case HamAttribute.WILLPOWER:
          target.damageMind(result.actualDamage);
          break;
      }

      // Add attacker as defender
      if (attacker) {
        target.addDefender(attacker.objectId);
        attacker.addDefender(target.objectId);
        target.enterCombat();
        attacker.enterCombat();
      }
    }

    // Check for incapacitation
    if (this.checkIncapacitation(target)) {
      result.targetIncapacitated = true;

      // Check if should die
      if (this.isDead(target)) {
        result.targetKilled = true;
      }
    }

    if (this.config.enableLogging) {
      console.log(
        `[HamManager] Damage: ${attackerId} -> ${target.objectId}: ${result.actualDamage} (raw: ${amount}, blocked: ${result.blocked})`
      );
    }

    return result;
  }

  // ============================================
  // Healing
  // ============================================

  /**
   * Apply healing to a target
   * @param healer - The healing creature (or null for environmental)
   * @param target - The target creature
   * @param amount - Heal amount
   * @param attribute - Which HAM attribute to heal
   * @returns Heal result
   */
  applyHeal(
    healer: CreatureObject | null,
    target: CreatureObject,
    amount: number,
    attribute: HamAttributeType
  ): HealResult {
    const healerId = healer?.objectId ?? 0n;
    const result = createEmptyHealResult(healerId, target.objectId);

    // Check if target is dead
    if (target.isDead()) {
      return result;
    }

    // Check if target is incapacitated
    const wasIncapacitated = target.isIncapacitated();

    // Get current and max values for the pool
    let current: number;
    let max: number;

    switch (attribute) {
      case HamAttribute.HEALTH:
      case HamAttribute.STRENGTH:
      case HamAttribute.CONSTITUTION:
        current = target.health.current;
        max = target.getEffectiveHealthMax();
        break;
      case HamAttribute.ACTION:
      case HamAttribute.QUICKNESS:
      case HamAttribute.STAMINA:
        current = target.action.current;
        max = target.getEffectiveActionMax();
        break;
      case HamAttribute.MIND:
      case HamAttribute.FOCUS:
      case HamAttribute.WILLPOWER:
        current = target.mind.current;
        max = target.getEffectiveMindMax();
        break;
      default:
        return result;
    }

    // Calculate actual healing
    const missing = max - current;
    result.actualHealing = Math.min(amount, missing);
    result.overheal = Math.max(0, amount - result.actualHealing);

    // Apply healing
    if (result.actualHealing > 0) {
      switch (attribute) {
        case HamAttribute.HEALTH:
        case HamAttribute.STRENGTH:
        case HamAttribute.CONSTITUTION:
          target.healHealth(result.actualHealing);
          break;
        case HamAttribute.ACTION:
        case HamAttribute.QUICKNESS:
        case HamAttribute.STAMINA:
          target.healAction(result.actualHealing);
          break;
        case HamAttribute.MIND:
        case HamAttribute.FOCUS:
        case HamAttribute.WILLPOWER:
          target.healMind(result.actualHealing);
          break;
      }
    }

    // Check if revived from incapacitation
    if (wasIncapacitated && !target.isIncapacitated() && target.health.current > 0) {
      result.revived = true;
      const state = this.getCreatureState(target.objectId);
      if (state) {
        state.incapState = reviveFromIncap(target, state.incapState, 0);
      }
    }

    if (this.config.enableLogging) {
      console.log(
        `[HamManager] Heal: ${healerId} -> ${target.objectId}: ${result.actualHealing} (overheal: ${result.overheal})`
      );
    }

    return result;
  }

  // ============================================
  // Wounds
  // ============================================

  /**
   * Apply wounds to a target
   * @param target - The target creature
   * @param amount - Wound amount
   * @param attribute - Which HAM attribute to wound
   */
  applyWound(target: CreatureObject, amount: number, attribute: HamAttributeType): void {
    if (amount <= 0) {
      return;
    }

    target.addWounds(attribute, amount);

    // Clamp current value if it exceeds new effective max
    switch (attribute) {
      case HamAttribute.HEALTH:
      case HamAttribute.STRENGTH:
      case HamAttribute.CONSTITUTION:
        if (target.health.current > target.getEffectiveHealthMax()) {
          target.setHealthCurrent(target.getEffectiveHealthMax());
        }
        break;
      case HamAttribute.ACTION:
      case HamAttribute.QUICKNESS:
      case HamAttribute.STAMINA:
        if (target.action.current > target.getEffectiveActionMax()) {
          target.setActionCurrent(target.getEffectiveActionMax());
        }
        break;
      case HamAttribute.MIND:
      case HamAttribute.FOCUS:
      case HamAttribute.WILLPOWER:
        if (target.mind.current > target.getEffectiveMindMax()) {
          target.setMindCurrent(target.getEffectiveMindMax());
        }
        break;
    }

    if (this.config.enableLogging) {
      console.log(`[HamManager] Wound: ${target.objectId} +${amount} to attribute ${attribute}`);
    }
  }

  /**
   * Heal wounds on a target
   * @param target - The target creature
   * @param amount - Amount of wounds to heal
   * @param attribute - Which HAM attribute to heal wounds on
   */
  healWound(target: CreatureObject, amount: number, attribute: HamAttributeType): void {
    if (amount <= 0) {
      return;
    }

    target.healWounds(attribute, amount);

    if (this.config.enableLogging) {
      console.log(
        `[HamManager] Heal wound: ${target.objectId} -${amount} from attribute ${attribute}`
      );
    }
  }

  // ============================================
  // Regeneration
  // ============================================

  /**
   * Start regeneration for a creature
   * @param creature - The creature to start regeneration for
   */
  startRegeneration(creature: CreatureObject): void {
    const state = this.getCreatureState(creature.objectId);
    if (!state) {
      // Auto-register if not registered
      this.registerCreature(creature);
      return;
    }

    state.regenState = resumeRegeneration(state.regenState, Date.now());

    if (this.config.enableLogging) {
      console.log(`[HamManager] Started regeneration for ${creature.objectId}`);
    }
  }

  /**
   * Stop regeneration for a creature
   * @param creature - The creature to stop regeneration for
   */
  stopRegeneration(creature: CreatureObject): void {
    const state = this.getCreatureState(creature.objectId);
    if (!state) {
      return;
    }

    state.regenState = pauseRegeneration(state.regenState);

    if (this.config.enableLogging) {
      console.log(`[HamManager] Stopped regeneration for ${creature.objectId}`);
    }
  }

  /**
   * Update regeneration bonuses for a creature
   * @param creature - The creature to update
   * @param options - Bonus options
   */
  updateRegenBonuses(
    creature: CreatureObject,
    options: { buffBonus?: number; entertainerBonus?: boolean; campfireBonus?: boolean }
  ): void {
    const state = this.getCreatureState(creature.objectId);
    if (!state) {
      return;
    }

    state.regenState = updateRegenBonuses(state.regenState, options);
  }

  // ============================================
  // State Checks
  // ============================================

  /**
   * Check if a creature is incapacitated
   * @param creature - The creature to check
   * @returns Whether the creature is incapacitated
   */
  isIncapacitated(creature: CreatureObject): boolean {
    return creature.isIncapacitated();
  }

  /**
   * Check if a creature is dead
   * @param creature - The creature to check
   * @returns Whether the creature is dead
   */
  isDead(creature: CreatureObject): boolean {
    return creature.isDead();
  }

  /**
   * Check and apply incapacitation if health is 0
   * @param creature - The creature to check
   * @returns Whether the creature became incapacitated
   */
  checkIncapacitation(creature: CreatureObject): boolean {
    // Already incapacitated or dead
    if (creature.isIncapacitated() || creature.isDead()) {
      return creature.isIncapacitated();
    }

    // Check if any HAM pool is at 0
    if (
      creature.health.current <= 0 ||
      creature.action.current <= 0 ||
      creature.mind.current <= 0
    ) {
      const state = this.getCreatureState(creature.objectId);
      if (!state) {
        // Auto-register and apply incap
        this.registerCreature(creature);
        creature.setIncapacitated();
        return true;
      }

      const currentTime = Date.now();
      const checkResult = checkIncapacitation(state.incapState, currentTime);

      if (checkResult.shouldDie) {
        // Too many incaps, process death
        const { state: newState } = processDeath(
          creature,
          state.incapState,
          DeathType.Normal,
          0n, // No specific killer
          { x: creature.transform.position.x, y: creature.transform.position.y, z: creature.transform.position.z },
          creature.zone,
          0, // XP loss calculation would need player XP
          currentTime
        );
        state.incapState = newState;
        return false; // Dead, not incapacitated
      }

      // Apply incapacitation
      state.incapState = applyIncapacitation(
        creature,
        state.incapState,
        0n, // Attacker ID would come from combat context
        { x: creature.transform.position.x, y: creature.transform.position.y, z: creature.transform.position.z },
        creature.zone,
        currentTime
      );

      return true;
    }

    return false;
  }

  // ============================================
  // Modifiers
  // ============================================

  /**
   * Apply a HAM modifier to a creature
   * @param creature - The target creature
   * @param modifier - The modifier to apply
   * @returns The applied modifier with ID
   */
  applyModifier(creature: CreatureObject, modifier: Omit<HamModifier, 'id'>): HamModifier | null {
    const state = this.getCreatureState(creature.objectId);
    if (!state) {
      return null;
    }

    return state.modifierManager.applyModifier(creature, modifier);
  }

  /**
   * Remove a modifier from a creature
   * @param creature - The target creature
   * @param modifierId - ID of the modifier to remove
   * @returns Whether the modifier was removed
   */
  removeModifier(creature: CreatureObject, modifierId: string): boolean {
    const state = this.getCreatureState(creature.objectId);
    if (!state) {
      return false;
    }

    return state.modifierManager.removeModifier(creature, modifierId);
  }

  /**
   * Cleanse debuffs from a creature
   * @param creature - The target creature
   * @param onlyRemovable - Only remove debuffs marked as removable
   * @returns Number of debuffs removed
   */
  cleanse(creature: CreatureObject, onlyRemovable: boolean = true): number {
    const state = this.getCreatureState(creature.objectId);
    if (!state) {
      return 0;
    }

    return state.modifierManager.cleanse(creature, onlyRemovable);
  }

  /**
   * Get all active modifiers on a creature
   * @param creature - The creature to check
   * @returns Array of active modifiers
   */
  getModifiers(creature: CreatureObject): HamModifier[] {
    const state = this.getCreatureState(creature.objectId);
    if (!state) {
      return [];
    }

    return state.modifierManager.getModifiers();
  }

  // ============================================
  // Death/Cloning
  // ============================================

  /**
   * Apply a deathblow to an incapacitated creature
   * @param attacker - The attacker delivering the deathblow
   * @param target - The incapacitated target
   * @returns Whether the deathblow was applied
   */
  applyDeathblow(attacker: CreatureObject, target: CreatureObject): boolean {
    const state = this.getCreatureState(target.objectId);
    if (!state || !state.incapState.isIncapacitated) {
      return false;
    }

    const currentTime = Date.now();
    state.incapState = applyDeathblow(
      target,
      state.incapState,
      attacker.objectId,
      { x: target.transform.position.x, y: target.transform.position.y, z: target.transform.position.z },
      target.zone,
      currentTime
    );

    if (this.config.enableLogging) {
      console.log(`[HamManager] Deathblow: ${attacker.objectId} -> ${target.objectId}`);
    }

    return true;
  }

  /**
   * Clone/respawn a dead creature
   * @param creature - The dead creature
   * @param location - Location to respawn at
   * @returns Whether cloning was successful
   */
  clone(creature: CreatureObject, location: { x: number; y: number; z: number }): boolean {
    const state = this.getCreatureState(creature.objectId);
    if (!state || !state.incapState.isDead) {
      return false;
    }

    const currentTime = Date.now();
    state.incapState = cloneCreature(creature, state.incapState, location, currentTime);

    if (this.config.enableLogging) {
      console.log(`[HamManager] Cloned creature ${creature.objectId}`);
    }

    return true;
  }

  /**
   * Check if creature has clone sickness
   * @param creature - The creature to check
   * @returns Whether clone sickness is active
   */
  hasCloneSickness(creature: CreatureObject): boolean {
    const state = this.getCreatureState(creature.objectId);
    if (!state) {
      return false;
    }

    return hasCloneSickness(state.incapState, Date.now());
  }

  // ============================================
  // Tick Processing
  // ============================================

  /**
   * Process a server tick for all managed creatures
   * @param deltaTime - Time since last tick in milliseconds
   */
  tick(deltaTime: number): void {
    const currentTime = Date.now();

    for (const [, state] of this.creatures) {
      const { creature, regenState, incapState, modifierManager } = state;

      // Skip dead creatures
      if (creature.isDead()) {
        continue;
      }

      // Process incapacitation timer
      if (incapState.isIncapacitated) {
        state.incapState = processIncapTick(creature, incapState, currentTime);
        continue; // No regen or modifiers while incapacitated
      }

      // Process regeneration
      state.regenState = processRegeneration(creature, regenState, currentTime);

      // Process modifier ticks (DoT/HoT)
      modifierManager.tick(creature, currentTime);
    }

    this.lastTickTime = currentTime;
  }

  /**
   * Get the number of tracked creatures
   * @returns Number of registered creatures
   */
  getCreatureCount(): number {
    return this.creatures.size;
  }

  /**
   * Check if a creature is registered
   * @param creatureId - ID of the creature
   * @returns Whether the creature is registered
   */
  isCreatureRegistered(creatureId: ObjectId): boolean {
    return this.creatures.has(creatureId);
  }
}

/**
 * Create a new HAM Manager instance
 * @param config - Optional configuration overrides
 * @returns New HAM Manager
 */
export function createHamManager(config?: Partial<HamManagerConfig>): HamManager {
  return new HamManager(config);
}
