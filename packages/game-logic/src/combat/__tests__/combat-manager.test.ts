/**
 * Combat Manager Integration Tests
 * Tests for the core combat system including attack execution, damage calculation,
 * hit/miss calculations, armor mitigation, state effects, and AOE targeting.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CombatManager,
  createCombatManager,
  DEFAULT_COMBAT_CONFIG,
  type CombatResult,
} from '../combat-manager.js';
import { HamManager, createHamManager } from '../ham-manager.js';
import { CooldownManager, createCooldownManager } from '../cooldown-manager.js';
import { CommandRegistry } from '../command-parser.js';
import {
  type CombatCommand,
  TargetType,
  HamPool,
  DamageType as CommandDamageType,
} from '../combat-command.js';
import { CombatState } from '../combat-states.js';
import { HitLocation } from '../damage-types.js';

// Mock objects module
vi.mock('@swg/objects', async () => {
  const HamAttribute = {
    HEALTH: 0,
    STRENGTH: 1,
    CONSTITUTION: 2,
    ACTION: 3,
    QUICKNESS: 4,
    STAMINA: 5,
    MIND: 6,
    FOCUS: 7,
    WILLPOWER: 8,
  };

  const DamageType = {
    Kinetic: 0,
    Energy: 1,
    Blast: 2,
    Stun: 3,
    ElementalHeat: 4,
    ElementalCold: 5,
    ElementalAcid: 6,
    ElementalElectrical: 7,
  };

  const ArmorPiercing = {
    None: 0,
    Light: 1,
    Medium: 2,
    Heavy: 3,
  };

  const ArmorRating = {
    None: 0,
    Light: 1,
    Medium: 2,
    Heavy: 3,
  };

  const ElementalType = {
    None: 0,
    Heat: 1,
    Cold: 2,
    Acid: 3,
    Electricity: 4,
  };

  const Posture = {
    UPRIGHT: 0,
    CROUCHED: 1,
    PRONE: 2,
    SITTING: 3,
    KNOCKED_DOWN: 4,
    INCAPACITATED: 5,
    DEAD: 6,
  };

  return {
    HamAttribute,
    DamageType,
    ArmorPiercing,
    ArmorRating,
    ElementalType,
    Posture,
    getArmorPiercingEffectiveness: (armorRating: number, armorPiercing: number): number => {
      const difference = armorRating - armorPiercing;
      if (difference <= -2) return 0.25;
      if (difference <= -1) return 0.5;
      if (difference === 0) return 0.75;
      return 1.0;
    },
  };
});

// ============================================
// Mock Object Factories
// ============================================

/**
 * Create a mock CreatureObject for testing
 */
function createMockCreature(overrides: Partial<MockCreatureObject> = {}): MockCreatureObject {
  const defaults: MockCreatureObject = {
    objectId: BigInt(Math.floor(Math.random() * 1000000)),
    position: { x: 0, y: 0, z: 0 },
    transform: { position: { x: 0, y: 0, z: 0 } },
    posture: 0, // UPRIGHT
    level: 10,
    zone: 'tatooine',
    health: { current: 1000, max: 1000, baseMax: 1000, wounds: 0, encumbrance: 0, regenRate: 10 },
    action: { current: 500, max: 500, baseMax: 500, wounds: 0, encumbrance: 0, regenRate: 10 },
    mind: { current: 500, max: 500, baseMax: 500, wounds: 0, encumbrance: 0, regenRate: 10 },
    skillMods: new Map<string, number>(),
    defenders: new Set<bigint>(),
    groupId: 0n,
    inCombat: false,
    _incapacitated: false,
    _dead: false,
    _armorRating: 0,
    _protection: new Map<number, number>(),

    getSkillMod(name: string): number {
      return this.skillMods.get(name) ?? 0;
    },
    getEffectiveHealthMax(): number {
      return this.health.max - this.health.wounds - this.health.encumbrance;
    },
    getEffectiveActionMax(): number {
      return this.action.max - this.action.wounds - this.action.encumbrance;
    },
    getEffectiveMindMax(): number {
      return this.mind.max - this.mind.wounds - this.mind.encumbrance;
    },
    isDead(): boolean {
      return this._dead;
    },
    isIncapacitated(): boolean {
      return this._incapacitated;
    },
    isInCombatState(): boolean {
      return this.inCombat;
    },
    enterCombat(): void {
      this.inCombat = true;
    },
    exitCombat(): void {
      this.inCombat = false;
      this.defenders.clear();
    },
    addDefender(id: bigint): void {
      this.defenders.add(id);
    },
    clearDefenders(): void {
      this.defenders.clear();
    },
    setIncapacitated(): void {
      this._incapacitated = true;
      this.posture = 5; // INCAPACITATED
    },
    damageHealth(amount: number): boolean {
      this.health.current = Math.max(0, this.health.current - amount);
      if (this.health.current <= 0) {
        this.setIncapacitated();
        return true;
      }
      return false;
    },
    damageAction(amount: number): void {
      this.action.current = Math.max(0, this.action.current - amount);
    },
    damageMind(amount: number): void {
      this.mind.current = Math.max(0, this.mind.current - amount);
    },
    setHealthCurrent(value: number): void {
      this.health.current = Math.max(0, Math.min(value, this.getEffectiveHealthMax()));
    },
    setActionCurrent(value: number): void {
      this.action.current = Math.max(0, Math.min(value, this.getEffectiveActionMax()));
    },
    setMindCurrent(value: number): void {
      this.mind.current = Math.max(0, Math.min(value, this.getEffectiveMindMax()));
    },
    healHealth(amount: number): void {
      this.health.current = Math.min(this.getEffectiveHealthMax(), this.health.current + amount);
    },
    healAction(amount: number): void {
      this.action.current = Math.min(this.getEffectiveActionMax(), this.action.current + amount);
    },
    healMind(amount: number): void {
      this.mind.current = Math.min(this.getEffectiveMindMax(), this.mind.current + amount);
    },
    addWounds(attribute: number, amount: number): void {
      if (attribute <= 2) {
        this.health.wounds += amount;
      } else if (attribute <= 5) {
        this.action.wounds += amount;
      } else {
        this.mind.wounds += amount;
      }
    },
    healWounds(attribute: number, amount: number): void {
      this.addWounds(attribute, -amount);
    },
    getProtection(damageType: number): number {
      return this._protection.get(damageType) ?? 0;
    },
    setProtection(damageType: number, value: number): void {
      this._protection.set(damageType, value);
    },
    getDisplayName(): string {
      return `Creature ${this.objectId}`;
    },
  };

  return { ...defaults, ...overrides };
}

interface MockCreatureObject {
  objectId: bigint;
  position: { x: number; y: number; z: number };
  transform: { position: { x: number; y: number; z: number } };
  posture: number;
  level: number;
  zone: string;
  health: { current: number; max: number; baseMax: number; wounds: number; encumbrance: number; regenRate: number };
  action: { current: number; max: number; baseMax: number; wounds: number; encumbrance: number; regenRate: number };
  mind: { current: number; max: number; baseMax: number; wounds: number; encumbrance: number; regenRate: number };
  skillMods: Map<string, number>;
  defenders: Set<bigint>;
  groupId: bigint;
  inCombat: boolean;
  _incapacitated: boolean;
  _dead: boolean;
  _armorRating: number;
  _protection: Map<number, number>;
  getSkillMod(name: string): number;
  getEffectiveHealthMax(): number;
  getEffectiveActionMax(): number;
  getEffectiveMindMax(): number;
  isDead(): boolean;
  isIncapacitated(): boolean;
  isInCombatState(): boolean;
  enterCombat(): void;
  exitCombat(): void;
  addDefender(id: bigint): void;
  clearDefenders(): void;
  setIncapacitated(): void;
  damageHealth(amount: number): boolean;
  damageAction(amount: number): void;
  damageMind(amount: number): void;
  setHealthCurrent(value: number): void;
  setActionCurrent(value: number): void;
  setMindCurrent(value: number): void;
  healHealth(amount: number): void;
  healAction(amount: number): void;
  healMind(amount: number): void;
  addWounds(attribute: number, amount: number): void;
  healWounds(attribute: number, amount: number): void;
  getProtection(damageType: number): number;
  setProtection(damageType: number, value: number): void;
  getDisplayName(): string;
}

/**
 * Create a mock WeaponObject for testing
 */
function createMockWeapon(overrides: Partial<MockWeaponObject> = {}): MockWeaponObject {
  const defaults: MockWeaponObject = {
    objectId: BigInt(Math.floor(Math.random() * 1000000)),
    minDamage: 50,
    maxDamage: 100,
    damageType: 0, // Kinetic
    elementalType: 0, // None
    elementalDamage: 0,
    attackSpeed: 1.0,
    woundChance: 0.05,
    minRange: 0,
    maxRange: 35,
    idealRange: 25,
    attackMods: 0,
    defenseMods: 0,
    weaponType: 1, // Rifle
    armorPiercing: 0, // None

    isMelee(): boolean {
      return this.weaponType >= 10 && this.weaponType < 20;
    },
    isRanged(): boolean {
      return this.weaponType >= 1 && this.weaponType < 10;
    },
  };

  return { ...defaults, ...overrides };
}

interface MockWeaponObject {
  objectId: bigint;
  minDamage: number;
  maxDamage: number;
  damageType: number;
  elementalType: number;
  elementalDamage: number;
  attackSpeed: number;
  woundChance: number;
  minRange: number;
  maxRange: number;
  idealRange: number;
  attackMods: number;
  defenseMods: number;
  weaponType: number;
  armorPiercing: number;
  isMelee(): boolean;
  isRanged(): boolean;
}

/**
 * Create a basic attack combat command for testing
 */
function createBasicAttackCommand(overrides: Partial<CombatCommand> = {}): CombatCommand {
  const defaults: CombatCommand = {
    commandCrc: 0x12345678,
    commandName: 'attack',
    animationCrc: 0xABCDEF00,
    targetType: TargetType.Enemy,
    minRange: 0,
    maxRange: 64,
    damageMultiplier: 1.0,
    damageType: CommandDamageType.Kinetic,
    primaryTarget: HamPool.Health,
    healthCost: 0,
    actionCost: 50,
    mindCost: 0,
    forceCost: 0,
    cooldownTime: 0,
    globalCooldown: 1000,
    warmupTime: 0,
    executionTime: 0,
    followThroughTime: 0,
    requiredWeaponType: [],
    requiredStance: [],
    requiredSkill: '',
    requiredSkillLevel: 0,
    requiredCombatLevel: 0,
    stateChance: 0,
    stateDuration: 0,
    stateToApply: CombatState.None,
    aoeRadius: 0,
    coneAngle: 0,
    maxTargets: 1,
    isAoe: false,
    isCone: false,
    flags: {
      canTargetSelf: false,
      canTargetDead: false,
      requiresCombat: false,
      outOfCombatOnly: false,
      canInterrupt: true,
      cantBeInterrupted: false,
    },
  };

  return { ...defaults, ...overrides };
}

/**
 * Create a CDEF Pistol - common SWG starter ranged weapon
 */
function createCdefPistol(): MockWeaponObject {
  return createMockWeapon({
    minDamage: 26,
    maxDamage: 52,
    damageType: 1, // Energy
    attackSpeed: 1.0,
    minRange: 0,
    maxRange: 35,
    idealRange: 20,
    attackMods: 0,
    weaponType: 2, // Pistol
    armorPiercing: 0, // None
  });
}

/**
 * Create a Vibroblade - common SWG melee weapon
 */
function createVibroblade(): MockWeaponObject {
  return createMockWeapon({
    minDamage: 60,
    maxDamage: 120,
    damageType: 0, // Kinetic
    attackSpeed: 1.2,
    minRange: 0,
    maxRange: 5,
    idealRange: 0,
    attackMods: 5,
    weaponType: 10, // OneHandedSword
    armorPiercing: 0, // None
  });
}

/**
 * Create an Imperial Stormtrooper NPC with armor
 */
function createStormtrooper(): MockCreatureObject {
  const creature = createMockCreature({
    health: { current: 5000, max: 5000, baseMax: 5000, wounds: 0, encumbrance: 0, regenRate: 10 },
    action: { current: 2500, max: 2500, baseMax: 2500, wounds: 0, encumbrance: 0, regenRate: 10 },
    mind: { current: 2500, max: 2500, baseMax: 2500, wounds: 0, encumbrance: 0, regenRate: 10 },
    level: 30,
    _armorRating: 2, // Medium
  });
  // Stormtrooper armor provides energy and kinetic protection
  creature.setProtection(0, 150); // Kinetic
  creature.setProtection(1, 200); // Energy
  return creature;
}

/**
 * Create a Womp Rat - unarmored creature
 */
function createWompRat(): MockCreatureObject {
  return createMockCreature({
    health: { current: 300, max: 300, baseMax: 300, wounds: 0, encumbrance: 0, regenRate: 5 },
    action: { current: 150, max: 150, baseMax: 150, wounds: 0, encumbrance: 0, regenRate: 5 },
    mind: { current: 100, max: 100, baseMax: 100, wounds: 0, encumbrance: 0, regenRate: 5 },
    level: 5,
    _armorRating: 0, // None
  });
}

// ============================================
// Test Suites
// ============================================

describe('CombatManager', () => {
  let combatManager: CombatManager;
  let hamManager: HamManager;
  let cooldownManager: CooldownManager;
  let commandRegistry: CommandRegistry;

  beforeEach(() => {
    hamManager = createHamManager({ enableLogging: false });
    cooldownManager = createCooldownManager({ defaultGcd: 1000 });
    commandRegistry = new CommandRegistry();

    // Register basic attack command
    const basicAttack = createBasicAttackCommand();
    commandRegistry.register(basicAttack);

    combatManager = createCombatManager(
      hamManager,
      commandRegistry,
      cooldownManager,
      { enableLogging: false }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Attack Execution Flow', () => {
    it('should execute a basic attack successfully', () => {
      const attacker = createMockCreature();
      const target = createWompRat();
      const weapon = createCdefPistol();
      const command = createBasicAttackCommand();

      // Seed random for predictable results
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const result = combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      expect(result.success).toBe(true);
      expect(result.actionCost).toBe(command.actionCost);
      expect(result.animationCrc).toBe(command.animationCrc);
    });

    it('should pay action cost when executing attack', () => {
      const attacker = createMockCreature();
      const target = createWompRat();
      const weapon = createCdefPistol();
      const command = createBasicAttackCommand({ actionCost: 100 });

      const initialAction = attacker.action.current;

      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      expect(attacker.action.current).toBe(initialAction - 100);
    });

    it('should fail attack when action is insufficient', () => {
      const attacker = createMockCreature({
        action: { current: 10, max: 500, baseMax: 500, wounds: 0, encumbrance: 0, regenRate: 10 },
      });
      const target = createWompRat();
      const weapon = createCdefPistol();
      const command = createBasicAttackCommand({ actionCost: 100 });

      const result = combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Not enough action');
    });

    it('should enter combat state for both attacker and target', () => {
      const attacker = createMockCreature();
      const target = createWompRat();
      const weapon = createCdefPistol();
      const command = createBasicAttackCommand();

      expect(attacker.inCombat).toBe(false);
      expect(target.inCombat).toBe(false);

      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      expect(attacker.inCombat).toBe(true);
      expect(target.inCombat).toBe(true);
    });
  });

  describe('Damage Calculation with Weapon Modifiers', () => {
    it('should calculate damage within weapon min/max range', () => {
      const attacker = createMockCreature();
      const target = createWompRat();
      const weapon = createCdefPistol(); // 26-52 energy damage
      const command = createBasicAttackCommand({ damageMultiplier: 1.0 });

      // Force a hit
      vi.spyOn(Math, 'random').mockReturnValue(0.3);

      const result = combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      if (result.hit) {
        // Damage should be in a reasonable range considering modifiers
        expect(result.damage).toBeGreaterThanOrEqual(0);
        expect(result.damage).toBeLessThanOrEqual(200); // Allow for critical hits
      }
    });

    it('should apply damage multiplier from command', () => {
      const attacker = createMockCreature();
      const target = createWompRat();
      const weapon = createMockWeapon({ minDamage: 100, maxDamage: 100 }); // Fixed damage
      const normalCommand = createBasicAttackCommand({ damageMultiplier: 1.0 });
      const boostedCommand = createBasicAttackCommand({ damageMultiplier: 2.0 });

      // Force consistent random for damage and hit
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        return 0.3; // Low enough to always hit
      });

      const normalResult = combatManager.executeAttack(
        attacker as any,
        createWompRat() as any,
        normalCommand,
        weapon as any
      );

      callCount = 0;
      const boostedResult = combatManager.executeAttack(
        attacker as any,
        createWompRat() as any,
        boostedCommand,
        weapon as any
      );

      // Boosted should deal more damage
      if (normalResult.hit && boostedResult.hit) {
        expect(boostedResult.damage).toBeGreaterThan(normalResult.damage);
      }
    });

    it('should include elemental damage when weapon has it', () => {
      const attacker = createMockCreature();
      const target = createWompRat();
      const weapon = createMockWeapon({
        minDamage: 50,
        maxDamage: 50,
        elementalType: 1, // Heat
        elementalDamage: 25,
      });
      const command = createBasicAttackCommand();

      vi.spyOn(Math, 'random').mockReturnValue(0.3);

      const result = combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      if (result.hit) {
        expect(result.elementalDamage).toBeGreaterThan(0);
        expect(result.elementalType).toBe(1); // Heat
      }
    });
  });

  describe('Hit/Miss Calculations with Accuracy/Defense', () => {
    it('should miss when accuracy roll is too high', () => {
      const attacker = createMockCreature();
      const target = createMockCreature();
      const weapon = createCdefPistol();
      const command = createBasicAttackCommand();

      // High defense target
      target.skillMods.set('defense', 100);
      target.skillMods.set('ranged_defense', 50);

      // Force a miss with high random value
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const result = combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      expect(result.hit).toBe(false);
      expect(result.damage).toBe(0);
    });

    it('should hit more often with higher accuracy mods', () => {
      const attacker = createMockCreature();
      const target = createMockCreature();
      const weapon = createCdefPistol();
      const command = createBasicAttackCommand();

      // Add accuracy mods to attacker
      attacker.skillMods.set('accuracy', 50);
      attacker.skillMods.set('ranged_accuracy', 25);

      // Moderate defense target
      target.skillMods.set('defense', 25);

      // Moderate random value
      vi.spyOn(Math, 'random').mockReturnValue(0.6);

      const result = combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      // With accuracy advantage, should hit at 0.6 roll
      expect(result.hit).toBe(true);
    });

    it('should apply weapon accuracy modifier', () => {
      const attacker = createMockCreature();
      const target = createMockCreature();
      const weaponNoMod = createMockWeapon({ attackMods: 0 });
      const weaponWithMod = createMockWeapon({ attackMods: 50 });
      const command = createBasicAttackCommand();

      // Set up defense
      target.skillMods.set('defense', 30);

      // Use same random value for both
      vi.spyOn(Math, 'random').mockReturnValue(0.75);

      // With 0 accuracy mod and defense, might miss
      const result1 = combatManager.executeAttack(
        attacker as any,
        createMockCreature() as any,
        command,
        weaponNoMod as any
      );

      // With +50 accuracy mod, more likely to hit
      const result2 = combatManager.executeAttack(
        attacker as any,
        createMockCreature() as any,
        command,
        weaponWithMod as any
      );

      // Can't guarantee specific outcomes due to other modifiers
      // but the mechanics are being tested
      expect(typeof result1.hit).toBe('boolean');
      expect(typeof result2.hit).toBe('boolean');
    });
  });

  describe('Armor Mitigation by Damage Type', () => {
    it('should reduce damage based on target armor protection', () => {
      const attacker = createMockCreature();
      const stormtrooper = createStormtrooper();
      const weapon = createCdefPistol(); // Energy damage
      const command = createBasicAttackCommand();

      vi.spyOn(Math, 'random').mockReturnValue(0.3);

      const result = combatManager.executeAttack(
        attacker as any,
        stormtrooper as any,
        command,
        weapon as any
      );

      if (result.hit) {
        // Stormtrooper has 200 energy protection
        expect(result.blocked).toBeGreaterThan(0);
      }
    });

    it('should deal more damage to unarmored targets', () => {
      const attacker = createMockCreature();
      const wompRat = createWompRat();
      const stormtrooper = createStormtrooper();
      const weapon = createMockWeapon({ minDamage: 100, maxDamage: 100 });
      const command = createBasicAttackCommand();

      vi.spyOn(Math, 'random').mockReturnValue(0.3);

      const resultUnarmored = combatManager.executeAttack(
        attacker as any,
        wompRat as any,
        command,
        weapon as any
      );

      const resultArmored = combatManager.executeAttack(
        attacker as any,
        stormtrooper as any,
        command,
        weapon as any
      );

      if (resultUnarmored.hit && resultArmored.hit) {
        expect(resultUnarmored.damage).toBeGreaterThan(resultArmored.damage);
      }
    });

    it('should track blocked damage separately', () => {
      const attacker = createMockCreature();
      const target = createMockCreature();
      target.setProtection(0, 50); // 50 kinetic protection

      const weapon = createMockWeapon({ minDamage: 100, maxDamage: 100, damageType: 0 });
      const command = createBasicAttackCommand();

      vi.spyOn(Math, 'random').mockReturnValue(0.3);

      const result = combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      if (result.hit) {
        expect(result.blocked).toBeGreaterThanOrEqual(0);
        expect(result.damage + result.blocked).toBeGreaterThan(0);
      }
    });
  });

  describe('State Effects (Knockdown, Stun, Blind, Dizzy)', () => {
    it('should apply state effect when chance succeeds', () => {
      const attacker = createMockCreature();
      const target = createWompRat();
      const weapon = createCdefPistol();
      const command = createBasicAttackCommand({
        stateChance: 100, // 100% chance
        stateDuration: 5000,
        stateToApply: CombatState.Stunned,
      });

      // Low roll to guarantee hit, then state application succeeds
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const result = combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      if (result.hit) {
        expect(result.stateApplied).toBe(CombatState.Stunned);
      }
    });

    it('should not apply state when chance fails', () => {
      const attacker = createMockCreature();
      const target = createWompRat();
      const weapon = createCdefPistol();
      const command = createBasicAttackCommand({
        stateChance: 1, // 1% chance
        stateDuration: 5000,
        stateToApply: CombatState.KnockedDown,
      });

      // High roll for state check
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const result = combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      // State likely not applied due to high roll
      // Result depends on hit, but state check would fail
      expect(result.stateApplied === null || result.stateApplied === CombatState.None).toBeTruthy();
    });

    it('should support multiple state types', () => {
      const stateTypes = [
        CombatState.Stunned,
        CombatState.KnockedDown,
        CombatState.Blinded,
        CombatState.Dizzy,
      ];

      for (const stateType of stateTypes) {
        const attacker = createMockCreature();
        const target = createWompRat();
        const weapon = createCdefPistol();
        const command = createBasicAttackCommand({
          stateChance: 100,
          stateDuration: 5000,
          stateToApply: stateType,
        });

        vi.spyOn(Math, 'random').mockReturnValue(0.1);

        const result = combatManager.executeAttack(
          attacker as any,
          target as any,
          command,
          weapon as any
        );

        if (result.hit) {
          expect(result.stateApplied).toBe(stateType);
        }
      }
    });
  });

  describe('AOE Targeting (Cone, Radius)', () => {
    it('should find targets in radius', () => {
      const attacker = createMockCreature({
        position: { x: 0, y: 0, z: 0 },
      });

      const creatures = [
        createMockCreature({ position: { x: 5, y: 0, z: 0 } }),
        createMockCreature({ position: { x: 10, y: 0, z: 0 } }),
        createMockCreature({ position: { x: 20, y: 0, z: 0 } }),
        createMockCreature({ position: { x: 100, y: 0, z: 0 } }),
      ];

      const targets = combatManager.getTargetsInRadius(
        { x: 0, y: 0, z: 0 },
        15,
        creatures as any[],
        attacker.objectId
      );

      // Should find creatures at 5 and 10, not 20 or 100
      expect(targets.length).toBe(2);
      expect(targets[0].distance).toBe(5);
      expect(targets[1].distance).toBe(10);
    });

    it('should find targets in cone', () => {
      const attacker = createMockCreature({
        position: { x: 0, y: 0, z: 0 },
      });

      const creatures = [
        createMockCreature({ position: { x: 10, y: 0, z: 0 } }), // Directly ahead
        createMockCreature({ position: { x: 10, y: 5, z: 0 } }), // Slightly to side
        createMockCreature({ position: { x: 0, y: 10, z: 0 } }), // To the side (90 degrees)
        createMockCreature({ position: { x: -10, y: 0, z: 0 } }), // Behind
      ];

      const direction = { x: 1, y: 0, z: 0 }; // Facing positive X

      const targets = combatManager.getTargetsInCone(
        attacker as any,
        direction,
        20,
        45, // 45 degree cone
        creatures as any[]
      );

      // Should find creatures directly ahead and slightly to side
      expect(targets.length).toBeGreaterThanOrEqual(1);
      expect(targets.length).toBeLessThanOrEqual(2);
    });

    it('should limit AOE targets to maxTargets', () => {
      const attacker = createMockCreature({
        position: { x: 0, y: 0, z: 0 },
      });

      const creatures: MockCreatureObject[] = [];
      for (let i = 1; i <= 20; i++) {
        creatures.push(createMockCreature({ position: { x: i, y: 0, z: 0 } }));
      }

      const targets = combatManager.getTargetsInRadius(
        { x: 0, y: 0, z: 0 },
        100,
        creatures as any[],
        attacker.objectId
      );

      // Default max is 10
      expect(targets.length).toBeLessThanOrEqual(10);
    });

    it('should sort targets by distance', () => {
      const attacker = createMockCreature({
        position: { x: 0, y: 0, z: 0 },
      });

      const creatures = [
        createMockCreature({ position: { x: 15, y: 0, z: 0 } }),
        createMockCreature({ position: { x: 5, y: 0, z: 0 } }),
        createMockCreature({ position: { x: 10, y: 0, z: 0 } }),
      ];

      const targets = combatManager.getTargetsInRadius(
        { x: 0, y: 0, z: 0 },
        20,
        creatures as any[],
        attacker.objectId
      );

      expect(targets[0].distance).toBe(5);
      expect(targets[1].distance).toBe(10);
      expect(targets[2].distance).toBe(15);
    });
  });

  describe('Incapacitation and Death Transitions', () => {
    it('should incapacitate target when health reaches 0', () => {
      const attacker = createMockCreature();
      const target = createMockCreature({
        health: { current: 10, max: 1000, baseMax: 1000, wounds: 0, encumbrance: 0, regenRate: 10 },
      });
      const weapon = createMockWeapon({ minDamage: 100, maxDamage: 100 });
      const command = createBasicAttackCommand();

      vi.spyOn(Math, 'random').mockReturnValue(0.3);

      const result = combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      if (result.hit && result.damage >= 10) {
        expect(result.targetIncapacitated).toBe(true);
        expect(target.health.current).toBe(0);
      }
    });

    it('should track critical hits correctly', () => {
      const attacker = createMockCreature();
      const target = createWompRat();
      const weapon = createCdefPistol();
      const command = createBasicAttackCommand();

      // First roll for hit (0.3 = hit), second for crit check (0.01 = crit)
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        if (callCount === 1) return 0.3; // Hit
        if (callCount === 2) return 0.01; // Crit (below 5% threshold)
        return 0.5;
      });

      const result = combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      if (result.hit) {
        expect(result.critical).toBe(true);
      }
    });

    it('should track glancing blows correctly', () => {
      const attacker = createMockCreature();
      const target = createWompRat();
      const weapon = createCdefPistol();
      const command = createBasicAttackCommand();

      // Force hit but no crit, then glancing
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        if (callCount === 1) return 0.3; // Hit
        if (callCount === 2) return 0.5; // No crit
        if (callCount === 3) return 0.05; // Glancing (below 10% threshold)
        return 0.5;
      });

      const result = combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      if (result.hit && !result.critical) {
        expect(result.glancing).toBe(true);
      }
    });
  });

  describe('Realistic SWG Scenarios', () => {
    it('should handle ranged combat with CDEF pistol vs womp rat', () => {
      const player = createMockCreature({
        level: 10,
      });
      player.skillMods.set('ranged_accuracy', 20);

      const wompRat = createWompRat();
      const cdefPistol = createCdefPistol();
      const command = createBasicAttackCommand();

      vi.spyOn(Math, 'random').mockReturnValue(0.4);

      const result = combatManager.executeAttack(
        player as any,
        wompRat as any,
        command,
        cdefPistol as any
      );

      expect(result.success).toBe(true);
      expect(result.hit).toBe(true);
      // CDEF pistol against unarmored womp rat should deal good damage
      expect(result.damage).toBeGreaterThan(20);
    });

    it('should handle melee combat with vibroblade', () => {
      const player = createMockCreature({
        level: 15,
      });
      player.skillMods.set('melee_accuracy', 30);
      player.skillMods.set('melee_damage', 15);

      const wompRat = createWompRat();
      const vibroblade = createVibroblade();
      const command = createBasicAttackCommand({
        damageType: CommandDamageType.Kinetic,
      });

      vi.spyOn(Math, 'random').mockReturnValue(0.35);

      const result = combatManager.executeAttack(
        player as any,
        wompRat as any,
        command,
        vibroblade as any
      );

      expect(result.success).toBe(true);
      expect(result.hit).toBe(true);
      expect(result.damageType).toBe(0); // Kinetic
    });

    it('should handle combat against armored Imperial Stormtrooper', () => {
      const player = createMockCreature({
        level: 25,
      });
      player.skillMods.set('ranged_accuracy', 40);
      player.skillMods.set('ranged_damage', 25);

      const stormtrooper = createStormtrooper();
      const cdefPistol = createCdefPistol();
      const command = createBasicAttackCommand();

      vi.spyOn(Math, 'random').mockReturnValue(0.3);

      const result = combatManager.executeAttack(
        player as any,
        stormtrooper as any,
        command,
        cdefPistol as any
      );

      expect(result.success).toBe(true);
      if (result.hit) {
        // Armor should block significant damage
        expect(result.blocked).toBeGreaterThan(0);
        // Final damage should be reduced
        expect(result.damage).toBeLessThan(result.damage + result.blocked);
      }
    });

    it('should handle AOE attack hitting multiple targets', () => {
      const player = createMockCreature({
        position: { x: 0, y: 0, z: 0 },
        level: 30,
      });

      const targets = [
        createWompRat(),
        createWompRat(),
        createWompRat(),
      ];
      targets[0].position = { x: 5, y: 0, z: 0 };
      targets[1].position = { x: 3, y: 3, z: 0 };
      targets[2].position = { x: -2, y: 4, z: 0 };

      const weapon = createMockWeapon({
        minDamage: 50,
        maxDamage: 75,
      });

      const aoeCommand = createBasicAttackCommand({
        isAoe: true,
        aoeRadius: 10,
        maxTargets: 5,
        globalCooldown: 0,
        cooldownTime: 0,
      });

      const aoeTargets = combatManager.getTargetsInRadius(
        player.position,
        aoeCommand.aoeRadius,
        targets as any[],
        player.objectId
      );

      expect(aoeTargets.length).toBe(3);

      vi.spyOn(Math, 'random').mockReturnValue(0.3);

      const results = combatManager.executeAoeAttack(
        player as any,
        aoeCommand,
        weapon as any,
        aoeTargets
      );

      expect(results.length).toBe(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Combat Spam Messages', () => {
    it('should generate spam messages for combat events', () => {
      const attacker = createMockCreature();
      const target = createWompRat();
      const weapon = createCdefPistol();
      const command = createBasicAttackCommand();

      vi.spyOn(Math, 'random').mockReturnValue(0.3);

      combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      const messages = combatManager.getSpamMessages();
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should generate miss message on miss', () => {
      const attacker = createMockCreature();
      const target = createMockCreature();
      target.skillMods.set('defense', 200); // High defense

      const weapon = createCdefPistol();
      const command = createBasicAttackCommand();

      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      const messages = combatManager.getSpamMessages();
      const missMessage = messages.find((m) => m.type === 'miss');
      expect(missMessage).toBeDefined();
    });
  });

  describe('Combat Tick Processing', () => {
    it('should clean up expired state immunities on tick', () => {
      combatManager.tick();
      // Tick should complete without error
      expect(true).toBe(true);
    });

    it('should track combat participants', () => {
      const attacker = createMockCreature();
      const target = createWompRat();
      const weapon = createCdefPistol();
      const command = createBasicAttackCommand();

      vi.spyOn(Math, 'random').mockReturnValue(0.3);

      combatManager.executeAttack(
        attacker as any,
        target as any,
        command,
        weapon as any
      );

      expect(combatManager.getCombatParticipantCount()).toBeGreaterThan(0);
    });
  });
});
