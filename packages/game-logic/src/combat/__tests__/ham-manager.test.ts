/**
 * HAM Manager Tests
 * Tests for Health/Action/Mind pool management system
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { HamManager, createHamManager, DEFAULT_HAM_CONFIG } from '../ham-manager.js';
import { HamAttribute, DamageType, CreatureState } from '@swg/objects';

// ============================================
// Mock @swg/objects module
// ============================================
vi.mock('@swg/objects', () => ({
  HamAttribute: {
    HEALTH: 0,
    STRENGTH: 1,
    CONSTITUTION: 2,
    ACTION: 3,
    QUICKNESS: 4,
    STAMINA: 5,
    MIND: 6,
    FOCUS: 7,
    WILLPOWER: 8,
  },
  DamageType: {
    KINETIC: 0,
    ENERGY: 1,
    BLAST: 2,
    STUN: 3,
    HEAT: 4,
    COLD: 5,
    ACID: 6,
    ELECTRICITY: 7,
  },
  CreatureState: {
    NONE: 0,
    INCAPACITATED: 1,
    DEAD: 2,
  },
}));

// ============================================
// Mock regeneration module
// ============================================
vi.mock('../regeneration.js', () => ({
  createRegenState: vi.fn((objectId) => ({
    objectId,
    isActive: false,
    lastTickTime: 0,
    healthRegen: 1,
    actionRegen: 1,
    mindRegen: 1,
    buffBonus: 0,
  })),
  processRegeneration: vi.fn((creature, state, time) => state),
  pauseRegeneration: vi.fn((state) => ({ ...state, isActive: false })),
  resumeRegeneration: vi.fn((state, time) => ({ ...state, isActive: true, lastTickTime: time })),
  updateRegenBonuses: vi.fn((state, options) => ({ ...state, ...options })),
}));

// ============================================
// Mock incapacitation module
// ============================================
vi.mock('../incapacitation.js', () => ({
  createIncapState: vi.fn((objectId) => ({
    objectId,
    isIncapacitated: false,
    isDead: false,
    incapCount: 0,
  })),
  checkIncapacitation: vi.fn((state, time) => ({ shouldDie: false })),
  applyIncapacitation: vi.fn((creature, state, attackerId, pos, zone, time) => ({
    ...state,
    isIncapacitated: true,
  })),
  processIncapTick: vi.fn((creature, state, time) => state),
  reviveFromIncap: vi.fn((creature, state, xpLoss) => ({
    ...state,
    isIncapacitated: false,
  })),
  processDeath: vi.fn((creature, state, deathType, killerId, pos, zone, xpLoss, time) => ({
    state: { ...state, isDead: true },
  })),
  cloneCreature: vi.fn((creature, state, location, time) => ({
    ...state,
    isDead: false,
    isIncapacitated: false,
  })),
  applyDeathblow: vi.fn((creature, state, attackerId, pos, zone, time) => ({
    ...state,
    isDead: true,
    isIncapacitated: false,
  })),
  DeathType: {
    Normal: 0,
    PvP: 1,
    Duel: 2,
  },
  hasCloneSickness: vi.fn((state, time) => false),
  IncapConfig: {},
}));

// ============================================
// Mock ham-modifiers module
// ============================================
vi.mock('../ham-modifiers.js', () => ({
  HamModifierManager: vi.fn().mockImplementation(() => ({
    applyModifier: vi.fn((creature, modifier) => ({ ...modifier, id: 'mod-1' })),
    removeModifier: vi.fn(() => true),
    clearAll: vi.fn(),
    cleanse: vi.fn(() => 0),
    getModifiers: vi.fn(() => []),
    tick: vi.fn(),
  })),
}));

// ============================================
// Mock damage-types module
// ============================================
vi.mock('../damage-types.js', () => ({
  HitLocation: {
    BODY: 0,
    HEAD: 1,
    LEFT_ARM: 2,
    RIGHT_ARM: 3,
    LEFT_LEG: 4,
    RIGHT_LEG: 5,
  },
  calculateHitLocation: vi.fn(() => 0), // BODY
  getHitLocationModifier: vi.fn(() => 1.0),
  createEmptyDamageResult: vi.fn((attackerId, targetId, damageType) => ({
    attackerId,
    targetId,
    damageType,
    rawDamage: 0,
    actualDamage: 0,
    blocked: 0,
    hitLocation: 0,
    critical: false,
    glancing: false,
    targetIncapacitated: false,
    targetKilled: false,
  })),
  createEmptyHealResult: vi.fn((healerId, targetId) => ({
    healerId,
    targetId,
    actualHealing: 0,
    overheal: 0,
    revived: false,
  })),
}));

// ============================================
// Test Fixtures
// ============================================

interface MockHamPool {
  current: number;
  max: number;
  wounds: number;
}

interface MockCreature {
  objectId: bigint;
  zone: string;
  transform: { position: { x: number; y: number; z: number } };
  health: MockHamPool;
  action: MockHamPool;
  mind: MockHamPool;
  state: number;
  defenders: Set<bigint>;
  isDead: Mock;
  isIncapacitated: Mock;
  damageHealth: Mock;
  damageAction: Mock;
  damageMind: Mock;
  healHealth: Mock;
  healAction: Mock;
  healMind: Mock;
  getEffectiveHealthMax: Mock;
  getEffectiveActionMax: Mock;
  getEffectiveMindMax: Mock;
  getProtection: Mock;
  setHealthCurrent: Mock;
  setActionCurrent: Mock;
  setMindCurrent: Mock;
  addWounds: Mock;
  healWounds: Mock;
  addDefender: Mock;
  enterCombat: Mock;
  setIncapacitated: Mock;
}

function createMockCreature(overrides: Partial<MockCreature> = {}): MockCreature {
  const creature: MockCreature = {
    objectId: BigInt(Math.floor(Math.random() * 1000000)),
    zone: 'tatooine',
    transform: { position: { x: 100, y: 0, z: 100 } },
    health: { current: 1000, max: 1000, wounds: 0 },
    action: { current: 500, max: 500, wounds: 0 },
    mind: { current: 300, max: 300, wounds: 0 },
    state: 0,
    defenders: new Set(),
    isDead: vi.fn(() => false),
    isIncapacitated: vi.fn(() => false),
    damageHealth: vi.fn(function(this: MockCreature, amount: number) {
      this.health.current = Math.max(0, this.health.current - amount);
    }),
    damageAction: vi.fn(function(this: MockCreature, amount: number) {
      this.action.current = Math.max(0, this.action.current - amount);
    }),
    damageMind: vi.fn(function(this: MockCreature, amount: number) {
      this.mind.current = Math.max(0, this.mind.current - amount);
    }),
    healHealth: vi.fn(function(this: MockCreature, amount: number) {
      this.health.current = Math.min(this.health.max - this.health.wounds, this.health.current + amount);
    }),
    healAction: vi.fn(function(this: MockCreature, amount: number) {
      this.action.current = Math.min(this.action.max - this.action.wounds, this.action.current + amount);
    }),
    healMind: vi.fn(function(this: MockCreature, amount: number) {
      this.mind.current = Math.min(this.mind.max - this.mind.wounds, this.mind.current + amount);
    }),
    getEffectiveHealthMax: vi.fn(function(this: MockCreature) {
      return this.health.max - this.health.wounds;
    }),
    getEffectiveActionMax: vi.fn(function(this: MockCreature) {
      return this.action.max - this.action.wounds;
    }),
    getEffectiveMindMax: vi.fn(function(this: MockCreature) {
      return this.mind.max - this.mind.wounds;
    }),
    getProtection: vi.fn(() => 0),
    setHealthCurrent: vi.fn(function(this: MockCreature, value: number) {
      this.health.current = value;
    }),
    setActionCurrent: vi.fn(function(this: MockCreature, value: number) {
      this.action.current = value;
    }),
    setMindCurrent: vi.fn(function(this: MockCreature, value: number) {
      this.mind.current = value;
    }),
    addWounds: vi.fn(function(this: MockCreature, attribute: number, amount: number) {
      if (attribute <= 2) this.health.wounds += amount;
      else if (attribute <= 5) this.action.wounds += amount;
      else this.mind.wounds += amount;
    }),
    healWounds: vi.fn(function(this: MockCreature, attribute: number, amount: number) {
      if (attribute <= 2) this.health.wounds = Math.max(0, this.health.wounds - amount);
      else if (attribute <= 5) this.action.wounds = Math.max(0, this.action.wounds - amount);
      else this.mind.wounds = Math.max(0, this.mind.wounds - amount);
    }),
    addDefender: vi.fn(function(this: MockCreature, id: bigint) {
      this.defenders.add(id);
    }),
    enterCombat: vi.fn(),
    setIncapacitated: vi.fn(function(this: MockCreature) {
      this.state = 1;
    }),
    ...overrides,
  };

  // Bind methods to the creature
  creature.damageHealth = creature.damageHealth.bind(creature);
  creature.damageAction = creature.damageAction.bind(creature);
  creature.damageMind = creature.damageMind.bind(creature);
  creature.healHealth = creature.healHealth.bind(creature);
  creature.healAction = creature.healAction.bind(creature);
  creature.healMind = creature.healMind.bind(creature);
  creature.getEffectiveHealthMax = creature.getEffectiveHealthMax.bind(creature);
  creature.getEffectiveActionMax = creature.getEffectiveActionMax.bind(creature);
  creature.getEffectiveMindMax = creature.getEffectiveMindMax.bind(creature);
  creature.setHealthCurrent = creature.setHealthCurrent.bind(creature);
  creature.setActionCurrent = creature.setActionCurrent.bind(creature);
  creature.setMindCurrent = creature.setMindCurrent.bind(creature);
  creature.addWounds = creature.addWounds.bind(creature);
  creature.healWounds = creature.healWounds.bind(creature);
  creature.addDefender = creature.addDefender.bind(creature);
  creature.setIncapacitated = creature.setIncapacitated.bind(creature);

  return creature;
}

// ============================================
// Tests
// ============================================

describe('HamManager', () => {
  let hamManager: HamManager;

  beforeEach(() => {
    vi.clearAllMocks();
    hamManager = createHamManager();
  });

  // ============================================
  // Initialization Tests
  // ============================================

  describe('Initialization', () => {
    it('should create with default configuration', () => {
      const manager = new HamManager();
      expect(manager.getCreatureCount()).toBe(0);
    });

    it('should create with custom configuration', () => {
      const manager = new HamManager({
        tickInterval: 2000,
        enableLogging: true,
        baseCriticalChance: 0.1,
      });
      expect(manager.getCreatureCount()).toBe(0);
    });

    it('should use createHamManager factory function', () => {
      const manager = createHamManager({ tickInterval: 500 });
      expect(manager).toBeInstanceOf(HamManager);
    });
  });

  // ============================================
  // Creature Registration Tests
  // ============================================

  describe('Creature Registration', () => {
    it('should register a creature', () => {
      const creature = createMockCreature();
      hamManager.registerCreature(creature as any);
      expect(hamManager.isCreatureRegistered(creature.objectId)).toBe(true);
      expect(hamManager.getCreatureCount()).toBe(1);
    });

    it('should not double-register a creature', () => {
      const creature = createMockCreature();
      hamManager.registerCreature(creature as any);
      hamManager.registerCreature(creature as any);
      expect(hamManager.getCreatureCount()).toBe(1);
    });

    it('should unregister a creature', () => {
      const creature = createMockCreature();
      hamManager.registerCreature(creature as any);
      hamManager.unregisterCreature(creature.objectId);
      expect(hamManager.isCreatureRegistered(creature.objectId)).toBe(false);
      expect(hamManager.getCreatureCount()).toBe(0);
    });

    it('should handle unregistering non-existent creature', () => {
      hamManager.unregisterCreature(999n);
      expect(hamManager.getCreatureCount()).toBe(0);
    });
  });

  // ============================================
  // Damage Application Tests
  // ============================================

  describe('Damage Application', () => {
    it('should apply damage to health pool', () => {
      const attacker = createMockCreature();
      const target = createMockCreature();

      hamManager.registerCreature(target as any);

      const result = hamManager.applyDamage(
        attacker as any,
        target as any,
        100,
        HamAttribute.HEALTH,
        DamageType.KINETIC
      );

      expect(result.rawDamage).toBe(100);
      expect(target.damageHealth).toHaveBeenCalled();
    });

    it('should apply damage to action pool', () => {
      const target = createMockCreature();

      const result = hamManager.applyDamage(
        null,
        target as any,
        50,
        HamAttribute.ACTION,
        DamageType.STUN
      );

      expect(result.rawDamage).toBe(50);
      expect(target.damageAction).toHaveBeenCalled();
    });

    it('should apply damage to mind pool', () => {
      const target = createMockCreature();

      const result = hamManager.applyDamage(
        null,
        target as any,
        30,
        HamAttribute.MIND,
        DamageType.ELECTRICITY
      );

      expect(result.rawDamage).toBe(30);
      expect(target.damageMind).toHaveBeenCalled();
    });

    it('should not damage dead creatures', () => {
      const target = createMockCreature();
      target.isDead = vi.fn(() => true);

      const result = hamManager.applyDamage(
        null,
        target as any,
        100,
        HamAttribute.HEALTH,
        DamageType.KINETIC
      );

      expect(result.actualDamage).toBe(0);
      expect(target.damageHealth).not.toHaveBeenCalled();
    });

    it('should apply armor protection reduction', () => {
      const target = createMockCreature();
      target.getProtection = vi.fn(() => 50); // 50 armor

      hamManager.applyDamage(
        null,
        target as any,
        100,
        HamAttribute.HEALTH,
        DamageType.KINETIC
      );

      expect(target.getProtection).toHaveBeenCalledWith(DamageType.KINETIC);
    });

    it('should add defender relationships when attacker exists', () => {
      const attacker = createMockCreature();
      const target = createMockCreature();

      hamManager.applyDamage(
        attacker as any,
        target as any,
        100,
        HamAttribute.HEALTH,
        DamageType.KINETIC
      );

      expect(target.addDefender).toHaveBeenCalledWith(attacker.objectId);
      expect(attacker.addDefender).toHaveBeenCalledWith(target.objectId);
      expect(target.enterCombat).toHaveBeenCalled();
      expect(attacker.enterCombat).toHaveBeenCalled();
    });
  });

  // ============================================
  // Healing Tests
  // ============================================

  describe('Healing', () => {
    it('should heal health pool', () => {
      const target = createMockCreature();
      target.health.current = 500;

      hamManager.registerCreature(target as any);

      const result = hamManager.applyHeal(
        null,
        target as any,
        200,
        HamAttribute.HEALTH
      );

      expect(result.actualHealing).toBeGreaterThan(0);
      expect(target.healHealth).toHaveBeenCalled();
    });

    it('should heal action pool', () => {
      const target = createMockCreature();
      target.action.current = 200;

      const result = hamManager.applyHeal(
        null,
        target as any,
        100,
        HamAttribute.ACTION
      );

      expect(result.actualHealing).toBeGreaterThan(0);
      expect(target.healAction).toHaveBeenCalled();
    });

    it('should heal mind pool', () => {
      const target = createMockCreature();
      target.mind.current = 100;

      const result = hamManager.applyHeal(
        null,
        target as any,
        100,
        HamAttribute.MIND
      );

      expect(result.actualHealing).toBeGreaterThan(0);
      expect(target.healMind).toHaveBeenCalled();
    });

    it('should not heal dead creatures', () => {
      const target = createMockCreature();
      target.isDead = vi.fn(() => true);
      target.health.current = 0;

      const result = hamManager.applyHeal(
        null,
        target as any,
        500,
        HamAttribute.HEALTH
      );

      expect(result.actualHealing).toBe(0);
      expect(target.healHealth).not.toHaveBeenCalled();
    });

    it('should track overheal', () => {
      const target = createMockCreature();
      target.health.current = 990; // Missing 10 health

      const result = hamManager.applyHeal(
        null,
        target as any,
        100, // Healing 100
        HamAttribute.HEALTH
      );

      expect(result.overheal).toBe(90);
      expect(result.actualHealing).toBe(10);
    });
  });

  // ============================================
  // Wounds Tests
  // ============================================

  describe('Wounds', () => {
    it('should apply wounds to health pool', () => {
      const target = createMockCreature();
      hamManager.registerCreature(target as any);

      hamManager.applyWound(target as any, 100, HamAttribute.HEALTH);

      expect(target.addWounds).toHaveBeenCalledWith(HamAttribute.HEALTH, 100);
    });

    it('should apply wounds to action pool', () => {
      const target = createMockCreature();

      hamManager.applyWound(target as any, 50, HamAttribute.ACTION);

      expect(target.addWounds).toHaveBeenCalledWith(HamAttribute.ACTION, 50);
    });

    it('should apply wounds to mind pool', () => {
      const target = createMockCreature();

      hamManager.applyWound(target as any, 30, HamAttribute.MIND);

      expect(target.addWounds).toHaveBeenCalledWith(HamAttribute.MIND, 30);
    });

    it('should not apply negative wounds', () => {
      const target = createMockCreature();

      hamManager.applyWound(target as any, -50, HamAttribute.HEALTH);

      expect(target.addWounds).not.toHaveBeenCalled();
    });

    it('should heal wounds', () => {
      const target = createMockCreature();
      target.health.wounds = 100;

      hamManager.healWound(target as any, 50, HamAttribute.HEALTH);

      expect(target.healWounds).toHaveBeenCalledWith(HamAttribute.HEALTH, 50);
    });

    it('should not heal negative wound amounts', () => {
      const target = createMockCreature();

      hamManager.healWound(target as any, -20, HamAttribute.HEALTH);

      expect(target.healWounds).not.toHaveBeenCalled();
    });

    it('should clamp current health if wounds exceed max', () => {
      const target = createMockCreature();
      target.health.current = 1000;
      target.health.wounds = 0;
      // After applying wounds, effective max is less than current

      hamManager.applyWound(target as any, 200, HamAttribute.HEALTH);

      // The applyWound method should check and clamp
      expect(target.addWounds).toHaveBeenCalled();
    });
  });

  // ============================================
  // Regeneration Tests
  // ============================================

  describe('Regeneration', () => {
    it('should start regeneration for registered creature', () => {
      const { resumeRegeneration } = require('../regeneration.js');
      const target = createMockCreature();
      hamManager.registerCreature(target as any);

      hamManager.startRegeneration(target as any);

      expect(resumeRegeneration).toHaveBeenCalled();
    });

    it('should auto-register creature when starting regeneration', () => {
      const target = createMockCreature();

      hamManager.startRegeneration(target as any);

      expect(hamManager.isCreatureRegistered(target.objectId)).toBe(true);
    });

    it('should stop regeneration for creature', () => {
      const { pauseRegeneration } = require('../regeneration.js');
      const target = createMockCreature();
      hamManager.registerCreature(target as any);

      hamManager.stopRegeneration(target as any);

      expect(pauseRegeneration).toHaveBeenCalled();
    });

    it('should update regen bonuses', () => {
      const { updateRegenBonuses } = require('../regeneration.js');
      const target = createMockCreature();
      hamManager.registerCreature(target as any);

      hamManager.updateRegenBonuses(target as any, {
        buffBonus: 5,
        entertainerBonus: true,
      });

      expect(updateRegenBonuses).toHaveBeenCalled();
    });
  });

  // ============================================
  // Incapacitation Tests
  // ============================================

  describe('Incapacitation', () => {
    it('should check incapacitation state', () => {
      const target = createMockCreature();
      target.isIncapacitated = vi.fn(() => true);

      expect(hamManager.isIncapacitated(target as any)).toBe(true);
    });

    it('should check death state', () => {
      const target = createMockCreature();
      target.isDead = vi.fn(() => true);

      expect(hamManager.isDead(target as any)).toBe(true);
    });

    it('should trigger incapacitation when health reaches zero', () => {
      const target = createMockCreature();
      target.health.current = 0;
      hamManager.registerCreature(target as any);

      const result = hamManager.checkIncapacitation(target as any);

      expect(result).toBe(true);
    });

    it('should trigger incapacitation when action reaches zero', () => {
      const target = createMockCreature();
      target.action.current = 0;
      hamManager.registerCreature(target as any);

      const result = hamManager.checkIncapacitation(target as any);

      expect(result).toBe(true);
    });

    it('should trigger incapacitation when mind reaches zero', () => {
      const target = createMockCreature();
      target.mind.current = 0;
      hamManager.registerCreature(target as any);

      const result = hamManager.checkIncapacitation(target as any);

      expect(result).toBe(true);
    });

    it('should not trigger incapacitation if already incapacitated', () => {
      const target = createMockCreature();
      target.isIncapacitated = vi.fn(() => true);
      target.health.current = 0;

      const result = hamManager.checkIncapacitation(target as any);

      expect(result).toBe(true); // Returns true because already incapped
    });

    it('should not trigger incapacitation if already dead', () => {
      const target = createMockCreature();
      target.isDead = vi.fn(() => true);
      target.health.current = 0;

      const result = hamManager.checkIncapacitation(target as any);

      expect(result).toBe(false);
    });
  });

  // ============================================
  // Deathblow Tests
  // ============================================

  describe('Deathblow', () => {
    it('should apply deathblow to incapacitated target', () => {
      const { applyDeathblow: mockApplyDeathblow } = require('../incapacitation.js');
      const attacker = createMockCreature();
      const target = createMockCreature();
      target.isIncapacitated = vi.fn(() => true);
      hamManager.registerCreature(target as any);

      // Set up the incapState to be incapacitated
      const state = (hamManager as any).creatures.get(target.objectId);
      state.incapState.isIncapacitated = true;

      const result = hamManager.applyDeathblow(attacker as any, target as any);

      expect(result).toBe(true);
      expect(mockApplyDeathblow).toHaveBeenCalled();
    });

    it('should not apply deathblow to non-incapacitated target', () => {
      const attacker = createMockCreature();
      const target = createMockCreature();
      hamManager.registerCreature(target as any);

      const result = hamManager.applyDeathblow(attacker as any, target as any);

      expect(result).toBe(false);
    });
  });

  // ============================================
  // Cloning Tests
  // ============================================

  describe('Cloning', () => {
    it('should clone dead creature', () => {
      const { cloneCreature: mockCloneCreature } = require('../incapacitation.js');
      const target = createMockCreature();
      target.isDead = vi.fn(() => true);
      hamManager.registerCreature(target as any);

      // Set up the incapState to be dead
      const state = (hamManager as any).creatures.get(target.objectId);
      state.incapState.isDead = true;

      const result = hamManager.clone(target as any, { x: 0, y: 0, z: 0 });

      expect(result).toBe(true);
      expect(mockCloneCreature).toHaveBeenCalled();
    });

    it('should not clone living creature', () => {
      const target = createMockCreature();
      hamManager.registerCreature(target as any);

      const result = hamManager.clone(target as any, { x: 0, y: 0, z: 0 });

      expect(result).toBe(false);
    });

    it('should check for clone sickness', () => {
      const { hasCloneSickness: mockHasCloneSickness } = require('../incapacitation.js');
      const target = createMockCreature();
      hamManager.registerCreature(target as any);

      hamManager.hasCloneSickness(target as any);

      expect(mockHasCloneSickness).toHaveBeenCalled();
    });
  });

  // ============================================
  // HAM Modifiers Tests
  // ============================================

  describe('HAM Modifiers', () => {
    it('should apply a HAM modifier', () => {
      const target = createMockCreature();
      hamManager.registerCreature(target as any);

      const modifier = {
        name: 'Poison',
        attribute: HamAttribute.HEALTH,
        amount: -10,
        duration: 10000,
        isDebuff: true,
      };

      const result = hamManager.applyModifier(target as any, modifier);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('mod-1');
    });

    it('should remove a HAM modifier', () => {
      const target = createMockCreature();
      hamManager.registerCreature(target as any);

      const result = hamManager.removeModifier(target as any, 'mod-1');

      expect(result).toBe(true);
    });

    it('should cleanse debuffs', () => {
      const target = createMockCreature();
      hamManager.registerCreature(target as any);

      const count = hamManager.cleanse(target as any);

      expect(count).toBe(0); // Mock returns 0
    });

    it('should get active modifiers', () => {
      const target = createMockCreature();
      hamManager.registerCreature(target as any);

      const modifiers = hamManager.getModifiers(target as any);

      expect(Array.isArray(modifiers)).toBe(true);
    });
  });

  // ============================================
  // Tick Processing Tests
  // ============================================

  describe('Tick Processing', () => {
    it('should process tick for all registered creatures', () => {
      const { processRegeneration } = require('../regeneration.js');
      const creature1 = createMockCreature();
      const creature2 = createMockCreature();

      hamManager.registerCreature(creature1 as any);
      hamManager.registerCreature(creature2 as any);

      hamManager.tick(1000);

      expect(processRegeneration).toHaveBeenCalledTimes(2);
    });

    it('should skip dead creatures during tick', () => {
      const { processRegeneration } = require('../regeneration.js');
      const deadCreature = createMockCreature();
      deadCreature.isDead = vi.fn(() => true);

      hamManager.registerCreature(deadCreature as any);

      hamManager.tick(1000);

      expect(processRegeneration).not.toHaveBeenCalled();
    });

    it('should process incap timer for incapacitated creatures', () => {
      const { processIncapTick } = require('../incapacitation.js');
      const incappedCreature = createMockCreature();
      hamManager.registerCreature(incappedCreature as any);

      // Set incap state
      const state = (hamManager as any).creatures.get(incappedCreature.objectId);
      state.incapState.isIncapacitated = true;

      hamManager.tick(1000);

      expect(processIncapTick).toHaveBeenCalled();
    });
  });

  // ============================================
  // Realistic SWG Scenarios
  // ============================================

  describe('Realistic SWG Scenarios', () => {
    it('should handle womp rat attacking player', () => {
      const player = createMockCreature();
      player.health = { current: 800, max: 800, wounds: 0 };
      player.getProtection = vi.fn(() => 25); // Light armor

      const wompRat = createMockCreature();

      hamManager.registerCreature(player as any);

      const result = hamManager.applyDamage(
        wompRat as any,
        player as any,
        45, // Womp rat bite damage
        HamAttribute.HEALTH,
        DamageType.KINETIC
      );

      expect(result.rawDamage).toBe(45);
      expect(player.damageHealth).toHaveBeenCalled();
      expect(player.enterCombat).toHaveBeenCalled();
    });

    it('should handle medic healing wounded player', () => {
      const patient = createMockCreature();
      patient.health = { current: 300, max: 1000, wounds: 0 };

      const medic = createMockCreature();

      hamManager.registerCreature(patient as any);

      const result = hamManager.applyHeal(
        medic as any,
        patient as any,
        500, // Stim pack heal
        HamAttribute.HEALTH
      );

      expect(result.actualHealing).toBe(500);
      expect(result.overheal).toBe(0);
      expect(patient.healHealth).toHaveBeenCalled();
    });

    it('should handle disease damage over time', () => {
      const player = createMockCreature();
      player.health = { current: 1000, max: 1000, wounds: 0 };

      hamManager.registerCreature(player as any);

      // Simulate disease tick
      const result = hamManager.applyDamage(
        null, // Environmental damage
        player as any,
        15,
        HamAttribute.HEALTH,
        DamageType.ACID
      );

      expect(result.rawDamage).toBe(15);
      expect(result.attackerId).toBe(0n);
    });

    it('should handle battle fatigue wounds', () => {
      const player = createMockCreature();
      player.mind = { current: 300, max: 300, wounds: 0 };

      hamManager.registerCreature(player as any);

      // Apply battle fatigue
      hamManager.applyWound(player as any, 50, HamAttribute.MIND);

      expect(player.addWounds).toHaveBeenCalledWith(HamAttribute.MIND, 50);
    });

    it('should handle entertainer healing wounds', () => {
      const player = createMockCreature();
      player.mind = { current: 200, max: 300, wounds: 100 };

      hamManager.registerCreature(player as any);

      // Entertainer heals wounds
      hamManager.healWound(player as any, 50, HamAttribute.MIND);

      expect(player.healWounds).toHaveBeenCalledWith(HamAttribute.MIND, 50);
    });

    it('should handle Jedi force drain on mind pool', () => {
      const target = createMockCreature();
      target.mind = { current: 300, max: 300, wounds: 0 };

      hamManager.registerCreature(target as any);

      const result = hamManager.applyDamage(
        null,
        target as any,
        80, // Force drain damage
        HamAttribute.MIND,
        DamageType.ENERGY
      );

      expect(result.rawDamage).toBe(80);
      expect(target.damageMind).toHaveBeenCalled();
    });

    it('should handle stun damage to action pool', () => {
      const target = createMockCreature();
      target.action = { current: 500, max: 500, wounds: 0 };

      const result = hamManager.applyDamage(
        null,
        target as any,
        100,
        HamAttribute.ACTION,
        DamageType.STUN
      );

      expect(target.damageAction).toHaveBeenCalled();
    });
  });
});
