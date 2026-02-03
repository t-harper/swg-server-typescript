/**
 * Combat Manager
 * Core combat system integrating HAM, weapons, armor, and commands for SWG server
 *
 * Handles:
 * - Attack execution and damage calculation
 * - Hit/miss and critical hit calculations
 * - Armor mitigation and armor piercing
 * - Combat state application (stuns, knockdowns, etc.)
 * - Combat state management (entering/exiting combat)
 * - AOE and cone attack targeting
 * - Combat spam message generation
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import type { CreatureObject, HamAttributeType } from '@swg/objects';
import type { WeaponObject } from '@swg/objects';
import type { ArmorObject } from '@swg/objects';
import { DamageType, HamAttribute } from '@swg/objects';
import { ArmorPiercing, ElementalType } from '@swg/objects';
import { ArmorRating, getArmorPiercingEffectiveness } from '@swg/objects';

import { HamManager } from './ham-manager.js';
import { CombatCommandParser, CommandRegistry } from './command-parser.js';
import { CooldownManager } from './cooldown-manager.js';
import {
  type CombatCommand,
  TargetType,
  HamPool,
  DamageType as CommandDamageType,
} from './combat-command.js';
import {
  CombatState,
  CombatStateModifiers,
  StateImmunityDurations,
  calculateCombinedModifiers,
} from './combat-states.js';
import {
  HitLocation,
  calculateHitLocation,
  getHitLocationModifier,
  getHitLocationName,
} from './damage-types.js';

// ============================================
// Types and Interfaces
// ============================================

/**
 * Result of a combat attack
 */
export interface CombatResult {
  /** Whether the attack was executed successfully */
  success: boolean;
  /** Whether the attack hit the target */
  hit: boolean;
  /** Total damage dealt */
  damage: number;
  /** Type of damage dealt */
  damageType: DamageType;
  /** Amount of damage blocked by armor */
  blocked: number;
  /** Where on the target the attack landed */
  hitLocation: HitLocation;
  /** Whether the target became incapacitated */
  targetIncapacitated: boolean;
  /** Whether the target was killed */
  targetKilled: boolean;
  /** Combat state that was applied (if any) */
  stateApplied: CombatState | null;
  /** Action cost consumed by the attack */
  actionCost: number;
  /** Animation CRC to play */
  animationCrc: number;
  /** Whether this was a critical hit */
  critical: boolean;
  /** Whether this was a glancing blow */
  glancing: boolean;
  /** Elemental damage dealt (if any) */
  elementalDamage: number;
  /** Elemental damage type */
  elementalType: ElementalType;
  /** Error message if attack failed */
  errorMessage: string;
}

/**
 * Damage calculation intermediate result
 */
export interface DamageCalculation {
  /** Base weapon damage (before modifiers) */
  baseDamage: number;
  /** Damage after command multiplier */
  commandDamage: number;
  /** Damage after attacker skill modifiers */
  skillModifiedDamage: number;
  /** Damage after target defense modifiers */
  defenseModifiedDamage: number;
  /** Damage after armor reduction */
  armorReducedDamage: number;
  /** Final damage to apply */
  finalDamage: number;
  /** Elemental damage component */
  elementalDamage: number;
  /** Whether this is a critical hit */
  critical: boolean;
  /** Whether this is a glancing blow */
  glancing: boolean;
  /** Primary damage type */
  damageType: DamageType;
  /** Elemental damage type */
  elementalType: ElementalType;
}

/**
 * Hit calculation result
 */
export interface HitResult {
  /** Whether the attack hit */
  hit: boolean;
  /** Whether this was a critical hit */
  critical: boolean;
  /** Whether this was a glancing blow */
  glancing: boolean;
  /** The to-hit roll value */
  toHitRoll: number;
  /** The calculated to-hit threshold */
  toHitChance: number;
  /** The accuracy value used */
  accuracy: number;
  /** The defense value of the target */
  defense: number;
}

/**
 * Armor mitigation result
 */
export interface MitigationResult {
  /** Damage after mitigation */
  mitigatedDamage: number;
  /** Amount blocked by armor */
  blocked: number;
  /** Armor effectiveness (0-1) */
  effectiveness: number;
  /** Whether armor was pierced */
  armorPierced: boolean;
}

/**
 * Combat spam message for combat log
 */
export interface CombatSpamMessage {
  /** Message type */
  type: 'attack' | 'hit' | 'miss' | 'critical' | 'state' | 'damage' | 'block';
  /** Attacker object ID */
  attackerId: ObjectId;
  /** Target object ID */
  targetId: ObjectId;
  /** Message text */
  message: string;
  /** Damage amount (if applicable) */
  damage?: number;
  /** Combat state applied (if applicable) */
  state?: CombatState;
}

/**
 * AOE target result
 */
export interface AoeTarget {
  /** Target creature */
  creature: CreatureObject;
  /** Distance from center */
  distance: number;
  /** Angle from attacker facing (for cones) */
  angle?: number;
}

/**
 * Combat manager configuration
 */
export interface CombatManagerConfig {
  /** Base accuracy for all attacks */
  baseAccuracy: number;
  /** Base critical hit chance (0-1) */
  baseCriticalChance: number;
  /** Critical hit damage multiplier */
  criticalDamageMultiplier: number;
  /** Base glancing blow chance (0-1) */
  baseGlancingChance: number;
  /** Glancing blow damage multiplier */
  glancingDamageMultiplier: number;
  /** Maximum targets for AOE attacks */
  maxAoeTargets: number;
  /** Combat timeout in milliseconds */
  combatTimeout: number;
  /** Whether to enable detailed logging */
  enableLogging: boolean;
}

/**
 * Default combat manager configuration
 */
export const DEFAULT_COMBAT_CONFIG: CombatManagerConfig = {
  baseAccuracy: 0.8,
  baseCriticalChance: 0.05,
  criticalDamageMultiplier: 2.0,
  baseGlancingChance: 0.1,
  glancingDamageMultiplier: 0.5,
  maxAoeTargets: 10,
  combatTimeout: 10000,
  enableLogging: false,
};

/**
 * Posture modifiers for defense
 */
export const POSTURE_DEFENSE_MODIFIERS: Record<number, number> = {
  0: 0, // Standing
  1: 10, // Crouched
  2: 20, // Prone
  3: -20, // Sitting
  4: -50, // Knocked Down
  5: -100, // Incapacitated
  6: 0, // Dead
};

// ============================================
// Combat Manager Class
// ============================================

/**
 * Combat Manager
 * Central manager for all combat operations in the game
 */
export class CombatManager {
  /** HAM Manager for health/action/mind operations */
  private hamManager: HamManager;

  /** Command parser for validating combat commands */
  private commandParser: CombatCommandParser;

  /** Cooldown manager for tracking ability cooldowns */
  private cooldownManager: CooldownManager;

  /** Command registry */
  private commandRegistry: CommandRegistry;

  /** Configuration */
  private config: CombatManagerConfig;

  /** Active combat participants (creatureId -> last combat time) */
  private combatParticipants: Map<ObjectId, number> = new Map();

  /** State immunities (creatureId -> state -> expiry time) */
  private stateImmunities: Map<ObjectId, Map<CombatState, number>> = new Map();

  /** Combat spam message queue */
  private spamMessages: CombatSpamMessage[] = [];

  /**
   * Create a new Combat Manager
   * @param hamManager - HAM Manager instance
   * @param commandRegistry - Command registry with registered commands
   * @param cooldownManager - Cooldown manager instance
   * @param config - Optional configuration overrides
   */
  constructor(
    hamManager: HamManager,
    commandRegistry: CommandRegistry,
    cooldownManager: CooldownManager,
    config: Partial<CombatManagerConfig> = {}
  ) {
    this.hamManager = hamManager;
    this.commandRegistry = commandRegistry;
    this.cooldownManager = cooldownManager;
    this.config = { ...DEFAULT_COMBAT_CONFIG, ...config };

    // Create command parser with cooldown checkers
    this.commandParser = new CombatCommandParser(
      commandRegistry,
      (attackerId: bigint, commandCrc: number) =>
        this.cooldownManager.getCooldownRemaining(attackerId, commandCrc),
      (attackerId: bigint) => this.cooldownManager.getGcdRemaining(attackerId)
    );
  }

  // ============================================
  // Attack Execution
  // ============================================

  /**
   * Execute a combat attack
   * @param attacker - The attacking creature
   * @param target - The target creature
   * @param command - The combat command being used
   * @param weapon - The weapon being used
   * @returns Combat result
   */
  executeAttack(
    attacker: CreatureObject,
    target: CreatureObject,
    command: CombatCommand,
    weapon: WeaponObject
  ): CombatResult {
    const result = this.createEmptyResult(command);

    // Validate the attack can be executed
    const validation = this.commandParser.validateCommand(
      this.creatureToParserFormat(attacker),
      command,
      this.creatureToParserFormat(target)
    );

    if (!validation.valid) {
      result.success = false;
      result.errorMessage = validation.errorMessage;
      return result;
    }

    // Pay costs
    if (!this.payCosts(attacker, command)) {
      result.success = false;
      result.errorMessage = 'Insufficient resources';
      return result;
    }

    // Start cooldowns
    this.cooldownManager.startCooldown(
      attacker.objectId,
      command.commandCrc,
      command.cooldownTime
    );
    if (command.globalCooldown > 0) {
      this.cooldownManager.startGlobalCooldown(attacker.objectId, command.globalCooldown);
    }

    // Enter combat
    this.enterCombat(attacker, target);

    // Calculate hit/miss
    const hitResult = this.calculateToHit(attacker, target, weapon);
    result.hit = hitResult.hit;
    result.critical = hitResult.critical;
    result.glancing = hitResult.glancing;

    if (!hitResult.hit) {
      // Miss - generate miss message
      this.addSpamMessage({
        type: 'miss',
        attackerId: attacker.objectId,
        targetId: target.objectId,
        message: `${this.getCreatureName(attacker)} misses ${this.getCreatureName(target)}`,
      });
      result.success = true;
      return result;
    }

    // Calculate damage
    const damageCalc = this.calculateDamage(attacker, target, weapon, command);
    damageCalc.critical = hitResult.critical;
    damageCalc.glancing = hitResult.glancing;

    // Calculate hit location
    result.hitLocation = calculateHitLocation();
    const hitLocationModifier = getHitLocationModifier(result.hitLocation);

    // Apply hit location modifier
    let finalDamage = damageCalc.finalDamage * hitLocationModifier;

    // Apply critical/glancing modifiers
    if (damageCalc.critical) {
      finalDamage *= this.config.criticalDamageMultiplier;
    } else if (damageCalc.glancing) {
      finalDamage *= this.config.glancingDamageMultiplier;
    }

    // Apply armor mitigation
    const mitigation = this.applyArmorMitigation(
      finalDamage,
      damageCalc.damageType,
      target,
      weapon.armorPiercing
    );

    result.damage = Math.floor(mitigation.mitigatedDamage);
    result.blocked = Math.floor(mitigation.blocked);
    result.damageType = damageCalc.damageType;
    result.elementalDamage = Math.floor(damageCalc.elementalDamage);
    result.elementalType = damageCalc.elementalType;

    // Determine which HAM pool to damage
    const hamPool = this.commandDamageTypeToHamPool(command.primaryTarget);

    // Apply damage through HAM manager
    const damageResult = this.hamManager.applyDamage(
      attacker,
      target,
      result.damage,
      hamPool,
      damageCalc.damageType
    );

    result.targetIncapacitated = damageResult.targetIncapacitated;
    result.targetKilled = damageResult.targetKilled;

    // Apply elemental damage if present
    if (result.elementalDamage > 0) {
      const elementalDamageType = this.elementalTypeToObjectDamageType(damageCalc.elementalType);
      this.hamManager.applyDamage(
        attacker,
        target,
        result.elementalDamage,
        hamPool,
        elementalDamageType
      );
    }

    // Try to apply combat state
    if (command.stateChance > 0 && command.stateToApply !== CombatState.None) {
      const stateApplied = this.tryApplyState(
        attacker,
        target,
        command.stateToApply,
        command.stateChance / 100,
        command.stateDuration
      );
      if (stateApplied) {
        result.stateApplied = command.stateToApply;
      }
    }

    // Generate combat spam
    this.generateCombatSpam(attacker, target, result, hitResult);

    result.success = true;
    result.actionCost = command.actionCost;
    result.animationCrc = command.animationCrc;

    if (this.config.enableLogging) {
      console.log(
        `[CombatManager] Attack: ${attacker.objectId} -> ${target.objectId}: ${result.damage} damage`
      );
    }

    return result;
  }

  // ============================================
  // Damage Calculation
  // ============================================

  /**
   * Calculate damage for an attack
   * @param attacker - The attacking creature
   * @param target - The target creature
   * @param weapon - The weapon being used
   * @param command - The combat command being used
   * @returns Damage calculation result
   */
  calculateDamage(
    attacker: CreatureObject,
    target: CreatureObject,
    weapon: WeaponObject,
    command: CombatCommand
  ): DamageCalculation {
    // 1. Calculate base weapon damage (random roll between min and max)
    const weaponDamageRange = weapon.maxDamage - weapon.minDamage;
    const baseDamage = weapon.minDamage + Math.random() * weaponDamageRange;

    // 2. Apply command damage multiplier
    const commandDamage = baseDamage * command.damageMultiplier;

    // 3. Apply attacker skill modifiers
    const attackerMods = this.getAttackerDamageMods(attacker, weapon);
    const skillModifiedDamage = commandDamage * (1 + attackerMods / 100);

    // 4. Apply target defense modifiers (from states)
    const targetMods = calculateCombinedModifiers(this.getActiveStates(target));
    const defenseModifier = 1 - targetMods.defenseModifier / 100;
    const defenseModifiedDamage = skillModifiedDamage * Math.max(0.1, defenseModifier);

    // 5. Armor reduction is applied separately in applyArmorMitigation
    const armorReducedDamage = defenseModifiedDamage;

    // 6. Final damage
    const finalDamage = Math.max(1, armorReducedDamage);

    // 7. Calculate elemental damage
    const elementalDamage = weapon.elementalDamage * command.damageMultiplier;

    // Map command damage type to object damage type
    const damageType = this.commandDamageTypeToObjectDamageType(command.damageType);

    return {
      baseDamage,
      commandDamage,
      skillModifiedDamage,
      defenseModifiedDamage,
      armorReducedDamage,
      finalDamage,
      elementalDamage,
      critical: false,
      glancing: false,
      damageType,
      elementalType: weapon.elementalType,
    };
  }

  // ============================================
  // To-Hit Calculation
  // ============================================

  /**
   * Calculate whether an attack hits
   * Formula: toHit = baseAccuracy + weaponAccuracy + skillMods - targetDefense - postureModifier
   *
   * @param attacker - The attacking creature
   * @param target - The target creature
   * @param weapon - The weapon being used
   * @returns Hit result
   */
  calculateToHit(
    attacker: CreatureObject,
    target: CreatureObject,
    weapon: WeaponObject
  ): HitResult {
    // Base accuracy from config
    const baseAccuracy = this.config.baseAccuracy * 100;

    // Weapon accuracy
    const weaponAccuracy = weapon.attackMods;

    // Attacker skill mods (accuracy-related)
    const attackerAccuracyMod = attacker.getSkillMod('accuracy') ?? 0;
    const weaponTypeAccuracy = this.getWeaponTypeAccuracyMod(attacker, weapon);

    // Target defense mods
    const targetDefense = target.getSkillMod('defense') ?? 0;
    const targetMelee = weapon.isMelee() ? (target.getSkillMod('melee_defense') ?? 0) : 0;
    const targetRanged = weapon.isRanged() ? (target.getSkillMod('ranged_defense') ?? 0) : 0;

    // Posture modifier
    const postureModifier = POSTURE_DEFENSE_MODIFIERS[target.posture] ?? 0;

    // Combat state modifiers
    const attackerStates = calculateCombinedModifiers(this.getActiveStates(attacker));
    const targetStates = calculateCombinedModifiers(this.getActiveStates(target));

    // Calculate final to-hit chance
    const accuracy =
      baseAccuracy +
      weaponAccuracy +
      attackerAccuracyMod +
      weaponTypeAccuracy +
      attackerStates.accuracyModifier;

    const defense =
      targetDefense + targetMelee + targetRanged + postureModifier - targetStates.defenseModifier;

    const toHitChance = Math.max(5, Math.min(95, accuracy - defense));

    // Roll for hit
    const toHitRoll = Math.random() * 100;
    const hit = toHitRoll <= toHitChance;

    // Check for critical hit (only on hit)
    let critical = false;
    let glancing = false;

    if (hit) {
      const criticalChance =
        this.config.baseCriticalChance + (attacker.getSkillMod('critical_chance') ?? 0) / 100;
      const critRoll = Math.random();
      critical = critRoll < criticalChance;

      // Glancing blow (only if not critical)
      if (!critical) {
        const glancingThreshold = this.config.baseGlancingChance;
        // Higher defense increases glancing chance
        const defenseGlanceBonus = Math.max(0, defense - accuracy) / 200;
        const glanceChance = glancingThreshold + defenseGlanceBonus;
        glancing = Math.random() < glanceChance;
      }
    }

    return {
      hit,
      critical,
      glancing,
      toHitRoll,
      toHitChance,
      accuracy,
      defense,
    };
  }

  // ============================================
  // Armor Mitigation
  // ============================================

  /**
   * Apply armor mitigation to damage
   * @param damage - Raw damage before mitigation
   * @param damageType - Type of damage being dealt
   * @param target - The target creature
   * @param armorPiercing - Armor piercing level of the attack
   * @returns Mitigation result
   */
  applyArmorMitigation(
    damage: number,
    damageType: DamageType,
    target: CreatureObject,
    armorPiercing: ArmorPiercing = ArmorPiercing.None
  ): MitigationResult {
    // Get base protection from target
    const baseProtection = target.getProtection(damageType);

    // Get armor rating (if creature has one)
    const armorRating = (target as unknown as { armorRating?: number }).armorRating ?? ArmorRating.None;

    // Calculate armor piercing effectiveness
    const armorEffectiveness = getArmorPiercingEffectiveness(armorRating, armorPiercing);

    // Effective protection after armor piercing
    const effectiveProtection = baseProtection * armorEffectiveness;

    // Calculate blocked damage
    const blocked = Math.min(damage, effectiveProtection);
    const mitigatedDamage = Math.max(0, damage - blocked);

    return {
      mitigatedDamage,
      blocked,
      effectiveness: armorEffectiveness,
      armorPierced: armorPiercing > ArmorPiercing.None && armorEffectiveness < 1,
    };
  }

  // ============================================
  // State Application
  // ============================================

  /**
   * Try to apply a combat state to a target
   * @param attacker - The attacker applying the state
   * @param target - The target to apply state to
   * @param state - The combat state to apply
   * @param chance - Chance to apply (0-1)
   * @param duration - Duration in milliseconds
   * @returns Whether the state was applied
   */
  tryApplyState(
    attacker: CreatureObject,
    target: CreatureObject,
    state: CombatState,
    chance: number,
    duration: number
  ): boolean {
    if (state === CombatState.None) {
      return false;
    }

    // Check if target is immune
    if (this.hasStateImmunity(target.objectId, state)) {
      return false;
    }

    // Roll for state application
    if (Math.random() > chance) {
      return false;
    }

    // Apply the state (this would need to be implemented on CreatureObject)
    // For now, we'll track it in our state tracking system
    this.applyStateToCreature(target, state, duration);

    // Apply immunity after state expires
    const immunityDuration = StateImmunityDurations[state];
    if (immunityDuration) {
      this.addStateImmunity(target.objectId, state, duration + immunityDuration);
    }

    // Generate state application message
    this.addSpamMessage({
      type: 'state',
      attackerId: attacker.objectId,
      targetId: target.objectId,
      message: `${this.getCreatureName(target)} is now ${this.getStateName(state)}`,
      state,
    });

    if (this.config.enableLogging) {
      console.log(
        `[CombatManager] State applied: ${state} to ${target.objectId} for ${duration}ms`
      );
    }

    return true;
  }

  // ============================================
  // Combat State Management
  // ============================================

  /**
   * Enter combat between two creatures
   * @param creature - The creature entering combat
   * @param target - The target they are fighting
   */
  enterCombat(creature: CreatureObject, target: CreatureObject): void {
    const now = Date.now();

    // Update combat timestamps
    this.combatParticipants.set(creature.objectId, now);
    this.combatParticipants.set(target.objectId, now);

    // Set combat state on creatures
    creature.enterCombat();
    target.enterCombat();

    // Add each other as defenders
    creature.addDefender(target.objectId);
    target.addDefender(creature.objectId);

    // Register with HAM manager if not already
    if (!this.hamManager.isCreatureRegistered(creature.objectId)) {
      this.hamManager.registerCreature(creature);
    }
    if (!this.hamManager.isCreatureRegistered(target.objectId)) {
      this.hamManager.registerCreature(target);
    }
  }

  /**
   * Exit combat for a creature
   * @param creature - The creature exiting combat
   */
  exitCombat(creature: CreatureObject): void {
    this.combatParticipants.delete(creature.objectId);
    creature.exitCombat();

    if (this.config.enableLogging) {
      console.log(`[CombatManager] ${creature.objectId} exited combat`);
    }
  }

  /**
   * Check if a creature is in combat
   * @param creature - The creature to check
   * @returns Whether the creature is in combat
   */
  isInCombat(creature: CreatureObject): boolean {
    const lastCombatTime = this.combatParticipants.get(creature.objectId);
    if (!lastCombatTime) {
      return false;
    }

    // Check if combat has timed out
    if (Date.now() - lastCombatTime > this.config.combatTimeout) {
      this.exitCombat(creature);
      return false;
    }

    return true;
  }

  /**
   * Update combat timestamp for a creature
   * @param creatureId - The creature ID
   */
  updateCombatTimestamp(creatureId: ObjectId): void {
    if (this.combatParticipants.has(creatureId)) {
      this.combatParticipants.set(creatureId, Date.now());
    }
  }

  // ============================================
  // AOE Combat
  // ============================================

  /**
   * Get targets in a cone in front of the attacker
   * @param attacker - The attacker
   * @param direction - The direction vector the attacker is facing
   * @param range - Maximum range of the cone
   * @param angle - Cone angle in degrees
   * @param creatures - Array of potential target creatures
   * @returns Array of targets in the cone
   */
  getTargetsInCone(
    attacker: CreatureObject,
    direction: Vector3,
    range: number,
    angle: number,
    creatures: CreatureObject[]
  ): AoeTarget[] {
    const targets: AoeTarget[] = [];
    const halfAngleRad = (angle / 2) * (Math.PI / 180);
    const attackerPos = attacker.position;

    // Normalize direction
    const dirLength = Math.sqrt(
      direction.x * direction.x + direction.y * direction.y + direction.z * direction.z
    );
    const normalizedDir = {
      x: direction.x / dirLength,
      y: direction.y / dirLength,
      z: direction.z / dirLength,
    };

    for (const creature of creatures) {
      if (creature.objectId === attacker.objectId) continue;
      if (creature.isDead()) continue;

      const targetPos = creature.position;

      // Calculate distance
      const dx = targetPos.x - attackerPos.x;
      const dy = targetPos.y - attackerPos.y;
      const dz = targetPos.z - attackerPos.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance > range) continue;

      // Calculate angle to target
      const toTargetLength = distance;
      if (toTargetLength === 0) continue;

      const toTarget = {
        x: dx / toTargetLength,
        y: dy / toTargetLength,
        z: dz / toTargetLength,
      };

      // Dot product gives cos of angle
      const dotProduct =
        normalizedDir.x * toTarget.x + normalizedDir.y * toTarget.y + normalizedDir.z * toTarget.z;

      const angleToTarget = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

      if (angleToTarget <= halfAngleRad) {
        targets.push({
          creature,
          distance,
          angle: angleToTarget * (180 / Math.PI),
        });
      }
    }

    // Sort by distance and limit to max targets
    targets.sort((a, b) => a.distance - b.distance);
    return targets.slice(0, this.config.maxAoeTargets);
  }

  /**
   * Get targets in a radius around a point
   * @param center - Center point of the AOE
   * @param radius - Radius of the AOE
   * @param creatures - Array of potential target creatures
   * @param excludeId - Optional ID to exclude (usually the attacker)
   * @returns Array of targets in radius
   */
  getTargetsInRadius(
    center: Vector3,
    radius: number,
    creatures: CreatureObject[],
    excludeId?: ObjectId
  ): AoeTarget[] {
    const targets: AoeTarget[] = [];

    for (const creature of creatures) {
      if (excludeId && creature.objectId === excludeId) continue;
      if (creature.isDead()) continue;

      const targetPos = creature.position;

      // Calculate distance
      const dx = targetPos.x - center.x;
      const dy = targetPos.y - center.y;
      const dz = targetPos.z - center.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance <= radius) {
        targets.push({
          creature,
          distance,
        });
      }
    }

    // Sort by distance and limit to max targets
    targets.sort((a, b) => a.distance - b.distance);
    return targets.slice(0, this.config.maxAoeTargets);
  }

  /**
   * Execute an AOE attack
   * @param attacker - The attacking creature
   * @param command - The combat command being used
   * @param weapon - The weapon being used
   * @param targets - Array of targets to hit
   * @returns Array of combat results for each target
   */
  executeAoeAttack(
    attacker: CreatureObject,
    command: CombatCommand,
    weapon: WeaponObject,
    targets: AoeTarget[]
  ): CombatResult[] {
    const results: CombatResult[] = [];

    // Limit targets
    const limitedTargets = targets.slice(0, command.maxTargets || this.config.maxAoeTargets);

    for (const target of limitedTargets) {
      const result = this.executeAttack(attacker, target.creature, command, weapon);
      results.push(result);
    }

    return results;
  }

  // ============================================
  // Combat Spam Messages
  // ============================================

  /**
   * Generate combat spam messages for an attack
   */
  private generateCombatSpam(
    attacker: CreatureObject,
    target: CreatureObject,
    result: CombatResult,
    hitResult: HitResult
  ): void {
    const attackerName = this.getCreatureName(attacker);
    const targetName = this.getCreatureName(target);

    if (result.critical) {
      this.addSpamMessage({
        type: 'critical',
        attackerId: attacker.objectId,
        targetId: target.objectId,
        message: `${attackerName} scores a critical hit on ${targetName}!`,
        damage: result.damage,
      });
    }

    this.addSpamMessage({
      type: 'damage',
      attackerId: attacker.objectId,
      targetId: target.objectId,
      message: `${attackerName} hits ${targetName} in the ${getHitLocationName(result.hitLocation)} for ${result.damage} damage`,
      damage: result.damage,
    });

    if (result.blocked > 0) {
      this.addSpamMessage({
        type: 'block',
        attackerId: attacker.objectId,
        targetId: target.objectId,
        message: `${targetName}'s armor absorbs ${result.blocked} damage`,
        damage: result.blocked,
      });
    }

    if (result.elementalDamage > 0) {
      const elementalName = ElementalType[result.elementalType] ?? 'elemental';
      this.addSpamMessage({
        type: 'damage',
        attackerId: attacker.objectId,
        targetId: target.objectId,
        message: `${attackerName} deals ${result.elementalDamage} ${elementalName} damage to ${targetName}`,
        damage: result.elementalDamage,
      });
    }
  }

  /**
   * Add a spam message to the queue
   */
  private addSpamMessage(message: CombatSpamMessage): void {
    this.spamMessages.push(message);
    // Keep queue size reasonable
    if (this.spamMessages.length > 1000) {
      this.spamMessages.shift();
    }
  }

  /**
   * Get and clear pending spam messages
   * @returns Array of combat spam messages
   */
  getSpamMessages(): CombatSpamMessage[] {
    const messages = [...this.spamMessages];
    this.spamMessages = [];
    return messages;
  }

  /**
   * Get spam messages for a specific participant
   * @param participantId - The participant ID
   * @returns Array of relevant combat spam messages
   */
  getSpamMessagesFor(participantId: ObjectId): CombatSpamMessage[] {
    return this.spamMessages.filter(
      (m) => m.attackerId === participantId || m.targetId === participantId
    );
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Create an empty combat result
   */
  private createEmptyResult(command: CombatCommand): CombatResult {
    return {
      success: false,
      hit: false,
      damage: 0,
      damageType: DamageType.Kinetic,
      blocked: 0,
      hitLocation: HitLocation.Body,
      targetIncapacitated: false,
      targetKilled: false,
      stateApplied: null,
      actionCost: command.actionCost,
      animationCrc: command.animationCrc,
      critical: false,
      glancing: false,
      elementalDamage: 0,
      elementalType: ElementalType.None,
      errorMessage: '',
    };
  }

  /**
   * Pay the costs for a combat command
   */
  private payCosts(creature: CreatureObject, command: CombatCommand): boolean {
    // Check if creature has enough resources
    if (creature.health.current < command.healthCost) return false;
    if (creature.action.current < command.actionCost) return false;
    if (creature.mind.current < command.mindCost) return false;

    // Deduct costs
    if (command.healthCost > 0) {
      creature.damageHealth(command.healthCost);
    }
    if (command.actionCost > 0) {
      creature.damageAction(command.actionCost);
    }
    if (command.mindCost > 0) {
      creature.damageMind(command.mindCost);
    }

    return true;
  }

  /**
   * Get attacker damage modifiers from skill mods
   */
  private getAttackerDamageMods(attacker: CreatureObject, weapon: WeaponObject): number {
    let mods = attacker.getSkillMod('damage') ?? 0;

    if (weapon.isMelee()) {
      mods += attacker.getSkillMod('melee_damage') ?? 0;
    } else if (weapon.isRanged()) {
      mods += attacker.getSkillMod('ranged_damage') ?? 0;
    }

    return mods;
  }

  /**
   * Get weapon type accuracy modifier
   */
  private getWeaponTypeAccuracyMod(attacker: CreatureObject, weapon: WeaponObject): number {
    if (weapon.isMelee()) {
      return attacker.getSkillMod('melee_accuracy') ?? 0;
    } else if (weapon.isRanged()) {
      return attacker.getSkillMod('ranged_accuracy') ?? 0;
    }
    return 0;
  }

  /**
   * Get active combat states for a creature
   */
  private getActiveStates(creature: CreatureObject): CombatState[] {
    // This would need to be implemented on CreatureObject
    // For now, return empty array
    return [];
  }

  /**
   * Apply a state to a creature
   */
  private applyStateToCreature(
    creature: CreatureObject,
    state: CombatState,
    duration: number
  ): void {
    // This would apply the state to the creature's state tracking
    // Implementation depends on how states are tracked on CreatureObject
  }

  /**
   * Check if creature has immunity to a state
   */
  private hasStateImmunity(creatureId: ObjectId, state: CombatState): boolean {
    const immunities = this.stateImmunities.get(creatureId);
    if (!immunities) return false;

    const expiryTime = immunities.get(state);
    if (!expiryTime) return false;

    if (Date.now() > expiryTime) {
      immunities.delete(state);
      return false;
    }

    return true;
  }

  /**
   * Add state immunity for a creature
   */
  private addStateImmunity(creatureId: ObjectId, state: CombatState, duration: number): void {
    let immunities = this.stateImmunities.get(creatureId);
    if (!immunities) {
      immunities = new Map();
      this.stateImmunities.set(creatureId, immunities);
    }
    immunities.set(state, Date.now() + duration);
  }

  /**
   * Get display name for a creature
   */
  private getCreatureName(creature: CreatureObject): string {
    return creature.getDisplayName?.() ?? `Creature ${creature.objectId}`;
  }

  /**
   * Get display name for a combat state
   */
  private getStateName(state: CombatState): string {
    return CombatState[state]?.toLowerCase() ?? 'affected';
  }

  /**
   * Convert command parser creature interface to our CreatureObject
   */
  private creatureToParserFormat(creature: CreatureObject): import('./command-parser.js').CreatureObject {
    return {
      objectId: creature.objectId,
      position: creature.position,
      posture: creature.posture as number,
      equippedWeaponType: 0, // Would need to look up weapon type
      skills: new Map(creature.skillMods),
      combatLevel: creature.level,
      health: creature.health.current,
      action: creature.action.current,
      mind: creature.mind.current,
      forcePower: 0,
      inCombat: creature.isInCombatState(),
      isAlive: !creature.isDead() && !creature.isIncapacitated(),
      activeStates: this.getActiveStates(creature),
      groupId: creature.groupId,
    };
  }

  /**
   * Convert command damage type to object damage type
   */
  private commandDamageTypeToObjectDamageType(type: CommandDamageType): DamageType {
    switch (type) {
      case CommandDamageType.Kinetic:
        return DamageType.Kinetic;
      case CommandDamageType.Energy:
        return DamageType.Energy;
      case CommandDamageType.Heat:
        return DamageType.ElementalHeat;
      case CommandDamageType.Cold:
        return DamageType.ElementalCold;
      case CommandDamageType.Acid:
        return DamageType.ElementalAcid;
      case CommandDamageType.Electricity:
        return DamageType.ElementalElectrical;
      case CommandDamageType.Stun:
        return DamageType.Stun;
      default:
        return DamageType.Kinetic;
    }
  }

  /**
   * Convert elemental type to object damage type
   */
  private elementalTypeToObjectDamageType(type: ElementalType): DamageType {
    switch (type) {
      case ElementalType.Heat:
        return DamageType.ElementalHeat;
      case ElementalType.Cold:
        return DamageType.ElementalCold;
      case ElementalType.Acid:
        return DamageType.ElementalAcid;
      case ElementalType.Electricity:
        return DamageType.ElementalElectrical;
      default:
        return DamageType.Kinetic;
    }
  }

  /**
   * Convert command HAM pool to HAM attribute type
   */
  private commandDamageTypeToHamPool(pool: HamPool): HamAttributeType {
    switch (pool) {
      case HamPool.Health:
        return HamAttribute.HEALTH;
      case HamPool.Action:
        return HamAttribute.ACTION;
      case HamPool.Mind:
        return HamAttribute.MIND;
      default:
        return HamAttribute.HEALTH;
    }
  }

  // ============================================
  // Combat Tick Processing
  // ============================================

  /**
   * Process combat tick for all participants
   * Call this periodically to:
   * - Check for combat timeouts
   * - Clear expired state immunities
   * - Update combat states
   */
  tick(): void {
    const now = Date.now();

    // Check for combat timeouts
    for (const [creatureId, lastCombatTime] of this.combatParticipants) {
      if (now - lastCombatTime > this.config.combatTimeout) {
        // Creature has timed out of combat - they need to be notified
        this.combatParticipants.delete(creatureId);
      }
    }

    // Clean up expired state immunities
    for (const [creatureId, immunities] of this.stateImmunities) {
      for (const [state, expiryTime] of immunities) {
        if (now > expiryTime) {
          immunities.delete(state);
        }
      }
      if (immunities.size === 0) {
        this.stateImmunities.delete(creatureId);
      }
    }
  }

  // ============================================
  // Getters
  // ============================================

  /**
   * Get the HAM manager instance
   */
  getHamManager(): HamManager {
    return this.hamManager;
  }

  /**
   * Get the command parser instance
   */
  getCommandParser(): CombatCommandParser {
    return this.commandParser;
  }

  /**
   * Get the cooldown manager instance
   */
  getCooldownManager(): CooldownManager {
    return this.cooldownManager;
  }

  /**
   * Get the command registry
   */
  getCommandRegistry(): CommandRegistry {
    return this.commandRegistry;
  }

  /**
   * Get combat participant count
   */
  getCombatParticipantCount(): number {
    return this.combatParticipants.size;
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Combat Manager instance
 * @param hamManager - HAM Manager instance
 * @param commandRegistry - Command registry with registered commands
 * @param cooldownManager - Cooldown manager instance
 * @param config - Optional configuration overrides
 * @returns New Combat Manager
 */
export function createCombatManager(
  hamManager: HamManager,
  commandRegistry: CommandRegistry,
  cooldownManager: CooldownManager,
  config?: Partial<CombatManagerConfig>
): CombatManager {
  return new CombatManager(hamManager, commandRegistry, cooldownManager, config);
}
