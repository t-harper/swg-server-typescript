/**
 * Force Power Manager
 * Core system for managing Jedi force powers in SWG
 *
 * Handles:
 * - Force pool management (current, max, regeneration)
 * - Power execution with cost/cooldown checks
 * - Light side, dark side, and neutral powers
 * - Channeled power management
 * - Power validation and targeting
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import type { CreatureObject } from '@swg/objects';

import {
  ForcePowerCategory,
  ForcePowerTarget,
  ForceState,
  ForceEffectType,
  type ForcePower,
  type ForcePool,
  type ForceEffect,
  type ForcePowerResult,
  type ChannelState,
  type ActiveForceEffect,
  type ForcePowerConfig,
  DEFAULT_FORCE_POWER_CONFIG,
  isOffensivePower,
} from './force-power-types.js';

import { CooldownManager } from '../combat/cooldown-manager.js';

// ============================================
// Force Power Definitions
// ============================================

/**
 * Light Side Powers
 */

/** Force Heal - Heals self or friendly target */
export const FORCE_HEAL: ForcePower = {
  id: 'force_heal',
  name: 'Force Heal',
  category: ForcePowerCategory.HEALING,
  forceCost: 50,
  cooldown: 5000,
  range: 30,
  targetType: ForcePowerTarget.SINGLE_FRIENDLY,
  effects: [
    {
      type: ForceEffectType.HEAL,
      magnitude: 500,
      duration: 0,
      tickInterval: 0,
    },
  ],
  isChanneled: false,
  channelDuration: 0,
  interruptible: false,
  animationCrc: 0x12345001,
  commandCrc: 0xA0001001,
  requiredSkillLevel: 1,
  isDarkSide: false,
  aoeRadius: 0,
  maxTargets: 1,
  description: 'Channels the Force to heal wounds on yourself or an ally.',
};

/** Force Shield - Creates damage absorption barrier */
export const FORCE_SHIELD: ForcePower = {
  id: 'force_shield',
  name: 'Force Shield',
  category: ForcePowerCategory.DEFENSE,
  forceCost: 75,
  cooldown: 30000,
  range: 0,
  targetType: ForcePowerTarget.SELF,
  effects: [
    {
      type: ForceEffectType.DAMAGE_ABSORPTION,
      magnitude: 1000,
      duration: 30000,
      tickInterval: 0,
      stateToApply: ForceState.FORCE_SHIELDED,
    },
  ],
  isChanneled: false,
  channelDuration: 0,
  interruptible: false,
  animationCrc: 0x12345002,
  commandCrc: 0xA0001002,
  requiredSkillLevel: 10,
  isDarkSide: false,
  aoeRadius: 0,
  maxTargets: 1,
  description: 'Creates a protective barrier that absorbs incoming damage.',
};

/** Mind Trick - Confuses enemy, causing them to flee */
export const MIND_TRICK: ForcePower = {
  id: 'mind_trick',
  name: 'Mind Trick',
  category: ForcePowerCategory.POWERS,
  forceCost: 60,
  cooldown: 45000,
  range: 25,
  targetType: ForcePowerTarget.SINGLE_ENEMY,
  effects: [
    {
      type: ForceEffectType.CONFUSION,
      magnitude: 1,
      duration: 10000,
      tickInterval: 0,
      stateToApply: ForceState.MIND_TRICKED,
    },
    {
      type: ForceEffectType.FEAR,
      magnitude: 1,
      duration: 10000,
      tickInterval: 0,
    },
  ],
  isChanneled: false,
  channelDuration: 0,
  interruptible: false,
  animationCrc: 0x12345003,
  commandCrc: 0xA0001003,
  requiredSkillLevel: 15,
  isDarkSide: false,
  aoeRadius: 0,
  maxTargets: 1,
  description: 'Confuses the target, causing them to wander aimlessly and flee from combat.',
};

/** Force Speed - Movement speed buff */
export const FORCE_SPEED: ForcePower = {
  id: 'force_speed',
  name: 'Force Speed',
  category: ForcePowerCategory.ENHANCEMENT,
  forceCost: 40,
  cooldown: 60000,
  range: 0,
  targetType: ForcePowerTarget.SELF,
  effects: [
    {
      type: ForceEffectType.STAT_BUFF,
      magnitude: 50,
      duration: 30000,
      tickInterval: 0,
      statModified: 'movement_speed',
      stateToApply: ForceState.FORCE_SPEED,
    },
  ],
  isChanneled: false,
  channelDuration: 0,
  interruptible: false,
  animationCrc: 0x12345004,
  commandCrc: 0xA0001004,
  requiredSkillLevel: 5,
  isDarkSide: false,
  aoeRadius: 0,
  maxTargets: 1,
  description: 'Channels the Force to greatly increase movement speed.',
};

/** Force Enlightenment - Multiple stat buffs */
export const FORCE_ENLIGHTENMENT: ForcePower = {
  id: 'force_enlightenment',
  name: 'Force Enlightenment',
  category: ForcePowerCategory.ENHANCEMENT,
  forceCost: 100,
  cooldown: 120000,
  range: 0,
  targetType: ForcePowerTarget.SELF,
  effects: [
    {
      type: ForceEffectType.STAT_BUFF,
      magnitude: 25,
      duration: 60000,
      tickInterval: 0,
      statModified: 'accuracy',
      stateToApply: ForceState.FORCE_ENLIGHTENED,
    },
    {
      type: ForceEffectType.STAT_BUFF,
      magnitude: 25,
      duration: 60000,
      tickInterval: 0,
      statModified: 'defense',
    },
    {
      type: ForceEffectType.STAT_BUFF,
      magnitude: 15,
      duration: 60000,
      tickInterval: 0,
      statModified: 'damage',
    },
  ],
  isChanneled: false,
  channelDuration: 0,
  interruptible: false,
  animationCrc: 0x12345005,
  commandCrc: 0xA0001005,
  requiredSkillLevel: 25,
  isDarkSide: false,
  aoeRadius: 0,
  maxTargets: 1,
  description: 'Enters a state of Force enlightenment, enhancing all combat abilities.',
};

/**
 * Dark Side Powers
 */

/** Force Lightning - Damage with chain effect */
export const FORCE_LIGHTNING: ForcePower = {
  id: 'force_lightning',
  name: 'Force Lightning',
  category: ForcePowerCategory.DARK,
  forceCost: 80,
  cooldown: 8000,
  range: 30,
  targetType: ForcePowerTarget.SINGLE_ENEMY,
  effects: [
    {
      type: ForceEffectType.DAMAGE,
      magnitude: 400,
      duration: 0,
      tickInterval: 0,
    },
    {
      type: ForceEffectType.CHAIN,
      magnitude: 200,
      duration: 0,
      tickInterval: 0,
      chainTargets: 3,
      chainFalloff: 0.3,
    },
    {
      type: ForceEffectType.STATE_APPLY,
      magnitude: 0,
      duration: 2000,
      tickInterval: 0,
      stateToApply: ForceState.FORCE_SHOCKED,
    },
  ],
  isChanneled: false,
  channelDuration: 0,
  interruptible: false,
  animationCrc: 0x12345006,
  commandCrc: 0xA0001006,
  requiredSkillLevel: 20,
  isDarkSide: true,
  aoeRadius: 10,
  maxTargets: 4,
  description: 'Unleashes devastating lightning that chains to nearby enemies.',
};

/** Force Choke - Channeled DOT with stun */
export const FORCE_CHOKE: ForcePower = {
  id: 'force_choke',
  name: 'Force Choke',
  category: ForcePowerCategory.DARK,
  forceCost: 100,
  cooldown: 30000,
  range: 20,
  targetType: ForcePowerTarget.SINGLE_ENEMY,
  effects: [
    {
      type: ForceEffectType.DAMAGE_OVER_TIME,
      magnitude: 150,
      duration: 6000,
      tickInterval: 1000,
      stateToApply: ForceState.FORCE_CHOKE_VICTIM,
    },
  ],
  isChanneled: true,
  channelDuration: 6000,
  interruptible: true,
  animationCrc: 0x12345007,
  commandCrc: 0xA0001007,
  requiredSkillLevel: 25,
  isDarkSide: true,
  aoeRadius: 0,
  maxTargets: 1,
  description: 'Grips the target in a Force choke, dealing damage over time and preventing all actions.',
};

/** Force Drain - Steals health from target */
export const FORCE_DRAIN: ForcePower = {
  id: 'force_drain',
  name: 'Force Drain',
  category: ForcePowerCategory.DARK,
  forceCost: 70,
  cooldown: 15000,
  range: 25,
  targetType: ForcePowerTarget.SINGLE_ENEMY,
  effects: [
    {
      type: ForceEffectType.HEALTH_DRAIN,
      magnitude: 300,
      duration: 0,
      tickInterval: 0,
      stateToApply: ForceState.FORCE_DRAINED,
    },
  ],
  isChanneled: false,
  channelDuration: 0,
  interruptible: false,
  animationCrc: 0x12345008,
  commandCrc: 0xA0001008,
  requiredSkillLevel: 15,
  isDarkSide: true,
  aoeRadius: 0,
  maxTargets: 1,
  description: 'Drains life force from the target, healing the caster.',
};

/** Force Fear - AoE flee effect */
export const FORCE_FEAR: ForcePower = {
  id: 'force_fear',
  name: 'Force Fear',
  category: ForcePowerCategory.DARK,
  forceCost: 90,
  cooldown: 45000,
  range: 0,
  targetType: ForcePowerTarget.AOE_ENEMY,
  effects: [
    {
      type: ForceEffectType.FEAR,
      magnitude: 1,
      duration: 8000,
      tickInterval: 0,
      stateToApply: ForceState.FORCE_FEARED,
    },
  ],
  isChanneled: false,
  channelDuration: 0,
  interruptible: false,
  animationCrc: 0x12345009,
  commandCrc: 0xA0001009,
  requiredSkillLevel: 30,
  isDarkSide: true,
  aoeRadius: 15,
  maxTargets: 5,
  description: 'Strikes terror into all nearby enemies, causing them to flee in fear.',
};

/** Force Rage - Damage buff with self-damage */
export const FORCE_RAGE: ForcePower = {
  id: 'force_rage',
  name: 'Force Rage',
  category: ForcePowerCategory.DARK,
  forceCost: 50,
  cooldown: 90000,
  range: 0,
  targetType: ForcePowerTarget.SELF,
  effects: [
    {
      type: ForceEffectType.STAT_BUFF,
      magnitude: 50,
      duration: 20000,
      tickInterval: 0,
      statModified: 'damage',
      stateToApply: ForceState.FORCE_RAGE,
    },
    {
      type: ForceEffectType.DAMAGE_OVER_TIME,
      magnitude: 25,
      duration: 20000,
      tickInterval: 2000,
    },
  ],
  isChanneled: false,
  channelDuration: 0,
  interruptible: false,
  animationCrc: 0x12345010,
  commandCrc: 0xA0001010,
  requiredSkillLevel: 20,
  isDarkSide: true,
  aoeRadius: 0,
  maxTargets: 1,
  description: 'Channels dark rage to greatly increase damage, at the cost of your own health.',
};

/**
 * Neutral Powers
 */

/** Force Push - Knockback */
export const FORCE_PUSH: ForcePower = {
  id: 'force_push',
  name: 'Force Push',
  category: ForcePowerCategory.POWERS,
  forceCost: 35,
  cooldown: 10000,
  range: 15,
  targetType: ForcePowerTarget.SINGLE_ENEMY,
  effects: [
    {
      type: ForceEffectType.DAMAGE,
      magnitude: 100,
      duration: 0,
      tickInterval: 0,
    },
    {
      type: ForceEffectType.KNOCKBACK,
      magnitude: 1,
      duration: 0,
      tickInterval: 0,
      distance: 10,
      stateToApply: ForceState.FORCE_PUSHED,
    },
  ],
  isChanneled: false,
  channelDuration: 0,
  interruptible: false,
  animationCrc: 0x12345011,
  commandCrc: 0xA0001011,
  requiredSkillLevel: 5,
  isDarkSide: false,
  aoeRadius: 0,
  maxTargets: 1,
  description: 'Pushes the target away with a powerful Force blast.',
};

/** Force Pull - Pull to caster */
export const FORCE_PULL: ForcePower = {
  id: 'force_pull',
  name: 'Force Pull',
  category: ForcePowerCategory.POWERS,
  forceCost: 30,
  cooldown: 15000,
  range: 30,
  targetType: ForcePowerTarget.SINGLE_ENEMY,
  effects: [
    {
      type: ForceEffectType.PULL,
      magnitude: 1,
      duration: 0,
      tickInterval: 0,
      distance: 25,
      stateToApply: ForceState.FORCE_PULLED,
    },
  ],
  isChanneled: false,
  channelDuration: 0,
  interruptible: false,
  animationCrc: 0x12345012,
  commandCrc: 0xA0001012,
  requiredSkillLevel: 10,
  isDarkSide: false,
  aoeRadius: 0,
  maxTargets: 1,
  description: 'Pulls the target towards you using the Force.',
};

/**
 * All force powers indexed by ID
 */
export const FORCE_POWERS: Map<string, ForcePower> = new Map([
  // Light side
  [FORCE_HEAL.id, FORCE_HEAL],
  [FORCE_SHIELD.id, FORCE_SHIELD],
  [MIND_TRICK.id, MIND_TRICK],
  [FORCE_SPEED.id, FORCE_SPEED],
  [FORCE_ENLIGHTENMENT.id, FORCE_ENLIGHTENMENT],
  // Dark side
  [FORCE_LIGHTNING.id, FORCE_LIGHTNING],
  [FORCE_CHOKE.id, FORCE_CHOKE],
  [FORCE_DRAIN.id, FORCE_DRAIN],
  [FORCE_FEAR.id, FORCE_FEAR],
  [FORCE_RAGE.id, FORCE_RAGE],
  // Neutral
  [FORCE_PUSH.id, FORCE_PUSH],
  [FORCE_PULL.id, FORCE_PULL],
]);

// ============================================
// Force Power Manager Class
// ============================================

/**
 * Jedi creature interface for force power operations
 */
export interface JediCreature {
  objectId: ObjectId;
  position: Vector3;
  health: { current: number; max: number };
  action: { current: number; max: number };
  mind: { current: number; max: number };
  forcePower: number;
  maxForcePower: number;
  forceSkillLevel: number;
  willpower: number;
  forceDefense: number;
  isJedi: boolean;
  isDead(): boolean;
  isIncapacitated(): boolean;
  getSkillMod(name: string): number | undefined;
  getDisplayName?(): string;
}

/**
 * Force Power Manager
 * Central manager for all Jedi force power operations
 */
export class ForcePowerManager {
  /** Configuration */
  private config: ForcePowerConfig;

  /** Cooldown manager for tracking power cooldowns */
  private cooldownManager: CooldownManager;

  /** Force pool states per Jedi */
  private forcePools: Map<ObjectId, ForcePool> = new Map();

  /** Active channeled powers */
  private activeChannels: Map<ObjectId, ChannelState> = new Map();

  /** Active force effects */
  private activeEffects: Map<ObjectId, ActiveForceEffect[]> = new Map();

  /** Force states per creature */
  private forceStates: Map<ObjectId, Set<ForceState>> = new Map();

  /** Effect ID counter */
  private nextEffectId: bigint = 1n;

  constructor(
    cooldownManager: CooldownManager,
    config: Partial<ForcePowerConfig> = {}
  ) {
    this.cooldownManager = cooldownManager;
    this.config = { ...DEFAULT_FORCE_POWER_CONFIG, ...config };
  }

  // ============================================
  // Force Pool Management
  // ============================================

  /**
   * Initialize force pool for a Jedi
   */
  initializeForcePool(jedi: JediCreature): void {
    if (this.forcePools.has(jedi.objectId)) {
      return;
    }

    const pool: ForcePool = {
      current: jedi.maxForcePower,
      max: jedi.maxForcePower,
      regenRate: this.config.baseForceRegen,
      regenDelayAfterUse: this.config.forceRegenDelay,
      lastUseTime: 0,
      regenPaused: false,
    };

    this.forcePools.set(jedi.objectId, pool);
    this.forceStates.set(jedi.objectId, new Set([ForceState.NORMAL]));
    this.activeEffects.set(jedi.objectId, []);

    if (this.config.enableLogging) {
      console.log(`[ForcePowerManager] Initialized force pool for ${jedi.objectId}: ${pool.max}`);
    }
  }

  /**
   * Get current force pool for a Jedi
   */
  getForcePool(jediId: ObjectId): ForcePool | undefined {
    return this.forcePools.get(jediId);
  }

  /**
   * Update maximum force pool
   */
  setMaxForce(jediId: ObjectId, max: number): void {
    const pool = this.forcePools.get(jediId);
    if (pool) {
      pool.max = max;
      pool.current = Math.min(pool.current, pool.max);
    }
  }

  /**
   * Consume force points
   */
  consumeForce(jediId: ObjectId, amount: number): boolean {
    const pool = this.forcePools.get(jediId);
    if (!pool || pool.current < amount) {
      return false;
    }

    pool.current -= amount;
    pool.lastUseTime = Date.now();

    if (this.config.enableLogging) {
      console.log(
        `[ForcePowerManager] ${jediId} consumed ${amount} force (${pool.current}/${pool.max})`
      );
    }

    return true;
  }

  /**
   * Restore force points
   */
  restoreForce(jediId: ObjectId, amount: number): number {
    const pool = this.forcePools.get(jediId);
    if (!pool) {
      return 0;
    }

    const restored = Math.min(amount, pool.max - pool.current);
    pool.current += restored;
    return restored;
  }

  /**
   * Process force regeneration tick
   */
  processForceRegen(jediId: ObjectId, deltaTime: number): number {
    const pool = this.forcePools.get(jediId);
    if (!pool || pool.regenPaused) {
      return 0;
    }

    // Check if regen delay has passed
    const now = Date.now();
    if (now - pool.lastUseTime < pool.regenDelayAfterUse) {
      return 0;
    }

    // Calculate regen amount
    const regenAmount = (pool.regenRate * deltaTime) / 1000;
    return this.restoreForce(jediId, regenAmount);
  }

  // ============================================
  // Power Validation
  // ============================================

  /**
   * Validate that a power can be used
   */
  validatePowerUse(
    caster: JediCreature,
    power: ForcePower,
    target: JediCreature | null
  ): { valid: boolean; errorMessage: string } {
    // Check if caster is a Jedi
    if (!caster.isJedi) {
      return { valid: false, errorMessage: 'You must be a Jedi to use force powers.' };
    }

    // Check if caster is alive
    if (caster.isDead() || caster.isIncapacitated()) {
      return { valid: false, errorMessage: 'You cannot use force powers while incapacitated.' };
    }

    // Check skill level
    if (caster.forceSkillLevel < power.requiredSkillLevel) {
      return {
        valid: false,
        errorMessage: `Requires force skill level ${power.requiredSkillLevel}.`,
      };
    }

    // Check force pool
    const pool = this.forcePools.get(caster.objectId);
    if (!pool || pool.current < power.forceCost) {
      return { valid: false, errorMessage: 'Insufficient force power.' };
    }

    // Check cooldown
    if (this.cooldownManager.isOnCooldown(caster.objectId, power.commandCrc)) {
      const remaining = this.cooldownManager.getCooldownRemaining(
        caster.objectId,
        power.commandCrc
      );
      return {
        valid: false,
        errorMessage: `Power is on cooldown (${Math.ceil(remaining / 1000)}s remaining).`,
      };
    }

    // Check GCD
    if (this.cooldownManager.isGcdActive(caster.objectId)) {
      return { valid: false, errorMessage: 'Global cooldown is active.' };
    }

    // Check channeling
    if (this.activeChannels.has(caster.objectId)) {
      return { valid: false, errorMessage: 'Already channeling a power.' };
    }

    // Validate target
    const targetValidation = this.validateTarget(caster, power, target);
    if (!targetValidation.valid) {
      return targetValidation;
    }

    return { valid: true, errorMessage: '' };
  }

  /**
   * Validate target for a power
   */
  private validateTarget(
    caster: JediCreature,
    power: ForcePower,
    target: JediCreature | null
  ): { valid: boolean; errorMessage: string } {
    // Self-target powers
    if (power.targetType === ForcePowerTarget.SELF) {
      return { valid: true, errorMessage: '' };
    }

    // Check if target is required
    if (!target) {
      if (power.targetType === ForcePowerTarget.AOE_ENEMY ||
          power.targetType === ForcePowerTarget.AOE_FRIENDLY) {
        return { valid: true, errorMessage: '' }; // AOE can work without target
      }
      return { valid: false, errorMessage: 'No target selected.' };
    }

    // Check if target is alive
    if (target.isDead() && power.targetType !== ForcePowerTarget.SINGLE_FRIENDLY) {
      return { valid: false, errorMessage: 'Target is dead.' };
    }

    // Check range
    if (power.range > 0) {
      const distance = this.calculateDistance(caster.position, target.position);
      if (distance > power.range) {
        return { valid: false, errorMessage: 'Target is out of range.' };
      }
    }

    // Validate target type
    if (isOffensivePower(power)) {
      if (target.objectId === caster.objectId) {
        return { valid: false, errorMessage: 'Cannot target yourself with offensive powers.' };
      }
    }

    return { valid: true, errorMessage: '' };
  }

  // ============================================
  // Power Execution
  // ============================================

  /**
   * Execute a force power
   */
  executePower(
    caster: JediCreature,
    power: ForcePower,
    target: JediCreature | null,
    nearbyTargets: JediCreature[] = []
  ): ForcePowerResult {
    const result: ForcePowerResult = {
      success: false,
      errorMessage: '',
      forceCostPaid: 0,
      damageDealt: 0,
      healingDone: 0,
      effectsApplied: [],
      channelStarted: false,
      targetsAffected: [],
      animationCrc: power.animationCrc,
    };

    // Validate power use
    const validation = this.validatePowerUse(caster, power, target);
    if (!validation.valid) {
      result.errorMessage = validation.errorMessage;
      return result;
    }

    // Consume force
    if (!this.consumeForce(caster.objectId, power.forceCost)) {
      result.errorMessage = 'Insufficient force power.';
      return result;
    }
    result.forceCostPaid = power.forceCost;

    // Start cooldowns
    this.cooldownManager.startCooldown(caster.objectId, power.commandCrc, power.cooldown);
    this.cooldownManager.startGlobalCooldown(caster.objectId, this.config.forceGlobalCooldown);

    // Determine actual target(s)
    let targets: JediCreature[] = [];
    const actualTarget = power.targetType === ForcePowerTarget.SELF ? caster : target;

    if (power.targetType === ForcePowerTarget.AOE_ENEMY ||
        power.targetType === ForcePowerTarget.AOE_FRIENDLY) {
      // Get AOE targets
      targets = this.getAoeTargets(caster, power, nearbyTargets);
    } else if (actualTarget) {
      targets = [actualTarget];
    }

    // Handle channeled powers
    if (power.isChanneled) {
      this.startChannel(caster, power, actualTarget);
      result.channelStarted = true;
      result.success = true;
      if (actualTarget) {
        result.targetsAffected = [actualTarget.objectId];
      }
      return result;
    }

    // Apply effects to targets
    for (const t of targets) {
      const effectResults = this.applyPowerEffects(caster, power, t);
      result.damageDealt += effectResults.damage;
      result.healingDone += effectResults.healing;
      result.effectsApplied.push(...effectResults.effects);
      result.targetsAffected.push(t.objectId);
    }

    // Handle chain effects
    if (power.effects.some((e) => e.type === ForceEffectType.CHAIN) && actualTarget) {
      const chainResults = this.processChainEffect(caster, power, actualTarget, nearbyTargets);
      result.damageDealt += chainResults.damage;
      result.targetsAffected.push(...chainResults.targets);
    }

    result.success = true;

    if (this.config.enableLogging) {
      console.log(
        `[ForcePowerManager] ${caster.objectId} used ${power.name}: ` +
        `damage=${result.damageDealt}, healing=${result.healingDone}, ` +
        `targets=${result.targetsAffected.length}`
      );
    }

    return result;
  }

  /**
   * Apply power effects to a target
   */
  private applyPowerEffects(
    caster: JediCreature,
    power: ForcePower,
    target: JediCreature
  ): { damage: number; healing: number; effects: ActiveForceEffect[] } {
    let damage = 0;
    let healing = 0;
    const effects: ActiveForceEffect[] = [];

    for (const effect of power.effects) {
      // Skip chain effects (handled separately)
      if (effect.type === ForceEffectType.CHAIN) {
        continue;
      }

      // Check for resist (offensive powers only)
      if (isOffensivePower(power) && this.checkResist(caster, target, power)) {
        continue;
      }

      const activeEffect = this.createActiveEffect(caster, target, power, effect);
      effects.push(activeEffect);

      // Apply immediate effects
      switch (effect.type) {
        case ForceEffectType.DAMAGE:
          damage += effect.magnitude;
          break;
        case ForceEffectType.HEAL:
          healing += effect.magnitude;
          break;
        case ForceEffectType.HEALTH_DRAIN:
          damage += effect.magnitude;
          healing += effect.magnitude * 0.5; // Caster heals for 50% of damage
          break;
        case ForceEffectType.STATE_APPLY:
          if (effect.stateToApply) {
            this.addForceState(target.objectId, effect.stateToApply);
          }
          break;
      }

      // Track over-time effects
      if (effect.duration > 0) {
        this.trackActiveEffect(target.objectId, activeEffect);
      }
    }

    return { damage, healing, effects };
  }

  /**
   * Create an active effect instance
   */
  private createActiveEffect(
    caster: JediCreature,
    target: JediCreature,
    power: ForcePower,
    effect: ForceEffect
  ): ActiveForceEffect {
    const now = Date.now();
    const ticks = effect.tickInterval > 0 ? Math.floor(effect.duration / effect.tickInterval) : 0;

    return {
      effectId: this.nextEffectId++,
      powerId: power.id,
      effect,
      casterId: caster.objectId,
      targetId: target.objectId,
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
   * Track an active effect on a target
   */
  private trackActiveEffect(targetId: ObjectId, effect: ActiveForceEffect): void {
    let effects = this.activeEffects.get(targetId);
    if (!effects) {
      effects = [];
      this.activeEffects.set(targetId, effects);
    }
    effects.push(effect);
  }

  // ============================================
  // Channeled Powers
  // ============================================

  /**
   * Start channeling a power
   */
  private startChannel(
    caster: JediCreature,
    power: ForcePower,
    target: JediCreature | null
  ): void {
    const now = Date.now();
    const channel: ChannelState = {
      power,
      casterId: caster.objectId,
      targetId: target?.objectId ?? null,
      startedAt: now,
      endsAt: now + power.channelDuration,
      lastTickAt: now,
      interrupted: false,
    };

    this.activeChannels.set(caster.objectId, channel);
    this.addForceState(caster.objectId, ForceState.CHANNELING);

    // Apply state to target
    if (target) {
      for (const effect of power.effects) {
        if (effect.stateToApply) {
          this.addForceState(target.objectId, effect.stateToApply);
        }
      }
    }

    if (this.config.enableLogging) {
      console.log(`[ForcePowerManager] ${caster.objectId} started channeling ${power.name}`);
    }
  }

  /**
   * Process channel tick
   */
  processChannelTick(casterId: ObjectId, target: JediCreature | null): {
    damage: number;
    completed: boolean;
    interrupted: boolean;
  } {
    const channel = this.activeChannels.get(casterId);
    if (!channel) {
      return { damage: 0, completed: false, interrupted: false };
    }

    const now = Date.now();

    // Check if interrupted
    if (channel.interrupted) {
      this.endChannel(casterId);
      return { damage: 0, completed: false, interrupted: true };
    }

    // Check if completed
    if (now >= channel.endsAt) {
      this.endChannel(casterId);
      return { damage: 0, completed: true, interrupted: false };
    }

    // Process tick damage
    let damage = 0;
    for (const effect of channel.power.effects) {
      if (effect.type === ForceEffectType.DAMAGE_OVER_TIME) {
        if (now - channel.lastTickAt >= effect.tickInterval) {
          damage += effect.magnitude;
          channel.lastTickAt = now;
        }
      }
    }

    return { damage, completed: false, interrupted: false };
  }

  /**
   * Interrupt a channeled power
   */
  interruptChannel(casterId: ObjectId): boolean {
    const channel = this.activeChannels.get(casterId);
    if (!channel || !channel.power.interruptible) {
      return false;
    }

    channel.interrupted = true;
    return true;
  }

  /**
   * End a channel
   */
  private endChannel(casterId: ObjectId): void {
    const channel = this.activeChannels.get(casterId);
    if (!channel) {
      return;
    }

    // Remove states
    this.removeForceState(casterId, ForceState.CHANNELING);
    if (channel.targetId) {
      for (const effect of channel.power.effects) {
        if (effect.stateToApply) {
          this.removeForceState(channel.targetId, effect.stateToApply);
        }
      }
    }

    this.activeChannels.delete(casterId);

    if (this.config.enableLogging) {
      console.log(`[ForcePowerManager] ${casterId} ended channeling ${channel.power.name}`);
    }
  }

  /**
   * Check if a creature is currently channeling
   */
  isChanneling(creatureId: ObjectId): boolean {
    return this.activeChannels.has(creatureId);
  }

  /**
   * Get active channel for a creature
   */
  getActiveChannel(creatureId: ObjectId): ChannelState | undefined {
    return this.activeChannels.get(creatureId);
  }

  // ============================================
  // Chain Effects
  // ============================================

  /**
   * Process chain lightning-style effects
   */
  private processChainEffect(
    caster: JediCreature,
    power: ForcePower,
    primaryTarget: JediCreature,
    nearbyTargets: JediCreature[]
  ): { damage: number; targets: ObjectId[] } {
    const chainEffect = power.effects.find((e) => e.type === ForceEffectType.CHAIN);
    if (!chainEffect) {
      return { damage: 0, targets: [] };
    }

    const maxChainTargets = chainEffect.chainTargets ?? 0;
    const chainFalloff = chainEffect.chainFalloff ?? 0.3;
    let damage = 0;
    const targets: ObjectId[] = [];

    // Filter and sort nearby targets by distance
    const validTargets = nearbyTargets
      .filter(
        (t) =>
          t.objectId !== caster.objectId &&
          t.objectId !== primaryTarget.objectId &&
          !t.isDead()
      )
      .sort(
        (a, b) =>
          this.calculateDistance(primaryTarget.position, a.position) -
          this.calculateDistance(primaryTarget.position, b.position)
      )
      .slice(0, maxChainTargets);

    let currentDamage = chainEffect.magnitude;
    for (const target of validTargets) {
      // Check resist
      if (!this.checkResist(caster, target, power)) {
        damage += currentDamage;
        targets.push(target.objectId);
      }
      currentDamage *= 1 - chainFalloff;
    }

    return { damage, targets };
  }

  // ============================================
  // AOE Targeting
  // ============================================

  /**
   * Get valid AOE targets
   */
  private getAoeTargets(
    caster: JediCreature,
    power: ForcePower,
    nearbyTargets: JediCreature[]
  ): JediCreature[] {
    const isFriendly =
      power.targetType === ForcePowerTarget.AOE_FRIENDLY ||
      power.targetType === ForcePowerTarget.SELF;

    return nearbyTargets
      .filter((t) => {
        // Skip dead targets (unless healing)
        if (t.isDead() && !isFriendly) {
          return false;
        }
        // Check range
        const distance = this.calculateDistance(caster.position, t.position);
        if (distance > power.aoeRadius) {
          return false;
        }
        return true;
      })
      .slice(0, power.maxTargets);
  }

  // ============================================
  // Force States
  // ============================================

  /**
   * Add a force state to a creature
   */
  addForceState(creatureId: ObjectId, state: ForceState): void {
    let states = this.forceStates.get(creatureId);
    if (!states) {
      states = new Set([ForceState.NORMAL]);
      this.forceStates.set(creatureId, states);
    }
    states.add(state);
    if (state !== ForceState.NORMAL) {
      states.delete(ForceState.NORMAL);
    }
  }

  /**
   * Remove a force state from a creature
   */
  removeForceState(creatureId: ObjectId, state: ForceState): void {
    const states = this.forceStates.get(creatureId);
    if (states) {
      states.delete(state);
      if (states.size === 0) {
        states.add(ForceState.NORMAL);
      }
    }
  }

  /**
   * Check if a creature has a force state
   */
  hasForceState(creatureId: ObjectId, state: ForceState): boolean {
    const states = this.forceStates.get(creatureId);
    return states?.has(state) ?? false;
  }

  /**
   * Get all force states for a creature
   */
  getForceStates(creatureId: ObjectId): ForceState[] {
    const states = this.forceStates.get(creatureId);
    return states ? Array.from(states) : [ForceState.NORMAL];
  }

  // ============================================
  // Resist Checks
  // ============================================

  /**
   * Check if target resists the power
   */
  private checkResist(
    caster: JediCreature,
    target: JediCreature,
    power: ForcePower
  ): boolean {
    const baseChance = this.config.baseResistChance;
    const willpowerBonus = target.willpower * this.config.willpowerResistRate;
    const forceDefenseBonus = target.forceDefense * 0.002;
    const casterPenalty = caster.forceSkillLevel * 0.001;

    let resistChance = baseChance + willpowerBonus + forceDefenseBonus - casterPenalty;
    resistChance = Math.min(resistChance, this.config.maxResistChance);
    resistChance = Math.max(resistChance, 0);

    return Math.random() < resistChance;
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get a force power by ID
   */
  getForcePower(powerId: string): ForcePower | undefined {
    return FORCE_POWERS.get(powerId);
  }

  /**
   * Get all force powers in a category
   */
  getPowersByCategory(category: ForcePowerCategory): ForcePower[] {
    return Array.from(FORCE_POWERS.values()).filter((p) => p.category === category);
  }

  /**
   * Get all dark side powers
   */
  getDarkSidePowers(): ForcePower[] {
    return Array.from(FORCE_POWERS.values()).filter((p) => p.isDarkSide);
  }

  /**
   * Get all light side powers
   */
  getLightSidePowers(): ForcePower[] {
    return Array.from(FORCE_POWERS.values()).filter((p) => !p.isDarkSide);
  }

  /**
   * Process tick for all active effects and channels
   */
  tick(deltaTime: number): void {
    // Process force regeneration
    for (const [jediId] of this.forcePools) {
      this.processForceRegen(jediId, deltaTime);
    }

    // Clean up expired effects
    const now = Date.now();
    for (const [targetId, effects] of this.activeEffects) {
      const activeEffects = effects.filter((e) => e.expiresAt > now);
      const expiredEffects = effects.filter((e) => e.expiresAt <= now);

      // Remove states from expired effects
      for (const expired of expiredEffects) {
        if (expired.effect.stateToApply) {
          this.removeForceState(targetId, expired.effect.stateToApply);
        }
      }

      this.activeEffects.set(targetId, activeEffects);
    }
  }

  /**
   * Get active effects on a target
   */
  getActiveEffects(targetId: ObjectId): ActiveForceEffect[] {
    return this.activeEffects.get(targetId) ?? [];
  }

  /**
   * Remove a Jedi from tracking
   */
  removeJedi(jediId: ObjectId): void {
    this.forcePools.delete(jediId);
    this.activeChannels.delete(jediId);
    this.activeEffects.delete(jediId);
    this.forceStates.delete(jediId);
  }

  /**
   * Get configuration
   */
  getConfig(): ForcePowerConfig {
    return { ...this.config };
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Force Power Manager
 */
export function createForcePowerManager(
  cooldownManager: CooldownManager,
  config?: Partial<ForcePowerConfig>
): ForcePowerManager {
  return new ForcePowerManager(cooldownManager, config);
}
