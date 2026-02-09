/**
 * XP Manager Tests
 * Tests for the experience points management system
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { XpManager, createXpManager } from '../xp-manager.js';

// ============================================
// Mock xp-types module
// ============================================
vi.mock('../xp-types.js', () => ({
  XpType: {
    COMBAT_GENERAL: 'combat_general',
    COMBAT_MELEE: 'combat_melee',
    COMBAT_RANGED: 'combat_ranged',
    BRAWLER: 'brawler',
    MARKSMAN: 'marksman',
    SCOUT: 'scout',
    MEDIC: 'medic',
    ENTERTAINER: 'entertainer',
    ARTISAN: 'artisan',
    CRAFTING: 'crafting',
    JEDI: 'jedi',
  },
  DefaultXpCaps: {
    combat_general: 100000,
    combat_melee: 50000,
    combat_ranged: 50000,
    brawler: 75000,
    marksman: 75000,
    scout: 75000,
    medic: 75000,
    entertainer: 100000,
    artisan: 100000,
    crafting: 200000,
    jedi: 250000,
  },
  isValidXpType: vi.fn((type: string) => {
    const validTypes = [
      'combat_general', 'combat_melee', 'combat_ranged',
      'brawler', 'marksman', 'scout', 'medic', 'entertainer', 'artisan',
      'crafting', 'jedi'
    ];
    return validTypes.includes(type);
  }),
}));

// ============================================
// Mock xp-events module
// ============================================
const mockEventEmitter = {
  emitXpAwarded: vi.fn(),
  emitSkillAffordable: vi.fn(),
  emitXpSpent: vi.fn(),
  emitXpCapChanged: vi.fn(),
  emitXpCapReached: vi.fn(),
};

vi.mock('../xp-events.js', () => ({
  getXpEventEmitter: vi.fn(() => mockEventEmitter),
}));

// ============================================
// Mock skill-template module
// ============================================
const mockSkillRegistry = {
  get: vi.fn(),
  getAllSkillNames: vi.fn(() => []),
  getChildSkills: vi.fn(() => []),
};

vi.mock('../skill-template.js', () => ({
  getSkillRegistry: vi.fn(() => mockSkillRegistry),
}));

// ============================================
// Test Fixtures
// ============================================

interface MockSkillTemplate {
  name: string;
  parentSkill: string;
  xpCost: Map<string, number>;
  xpCapIncrease: Map<string, number>;
  creditCost: number;
  skillMods: Map<string, number>;
  speciesRestrictions: string[];
  schematics: number[];
}

function createMockSkill(overrides: Partial<MockSkillTemplate> = {}): MockSkillTemplate {
  return {
    name: 'test_skill',
    parentSkill: '',
    xpCost: new Map([['combat_general', 1000]]),
    xpCapIncrease: new Map(),
    creditCost: 0,
    skillMods: new Map([['accuracy', 10]]),
    speciesRestrictions: [],
    schematics: [],
    ...overrides,
  };
}

interface MockPlayerObject {
  objectId: bigint;
  skills: Set<string>;
  experience: Map<string, number>;
  skillMods: Map<string, number>;
  credits: { cash: number; bank: number };
  schematics: Set<number>;
  addExperience: Mock;
  getExperience: Mock;
  setExperience: Mock;
  hasSkill: Mock;
  addSkill: Mock;
  removeSkill: Mock;
  getSkillMod: Mock;
  setSkillMod: Mock;
  getTotalCredits: Mock;
  removeCashCredits: Mock;
  awardSchematic: Mock;
  removeSchematic: Mock;
}

function createMockPlayer(overrides: Partial<MockPlayerObject> = {}): MockPlayerObject {
  const skills = new Set<string>();
  const experience = new Map<string, number>([
    ['combat_general', 5000],
    ['brawler', 3000],
    ['marksman', 2000],
  ]);
  const skillMods = new Map<string, number>();
  const schematics = new Set<number>();

  const player: MockPlayerObject = {
    objectId: BigInt(Math.floor(Math.random() * 1000000)),
    skills,
    experience,
    skillMods,
    credits: { cash: 10000, bank: 50000 },
    schematics,
    addExperience: vi.fn((xpType: string, amount: number) => {
      const current = experience.get(xpType) ?? 0;
      experience.set(xpType, current + amount);
      return current + amount;
    }),
    getExperience: vi.fn((xpType: string) => experience.get(xpType) ?? 0),
    setExperience: vi.fn((xpType: string, value: number) => {
      experience.set(xpType, value);
    }),
    hasSkill: vi.fn((skillName: string) => skills.has(skillName)),
    addSkill: vi.fn((skillName: string) => {
      skills.add(skillName);
    }),
    removeSkill: vi.fn((skillName: string) => {
      skills.delete(skillName);
    }),
    getSkillMod: vi.fn((modName: string) => skillMods.get(modName) ?? 0),
    setSkillMod: vi.fn((modName: string, value: number) => {
      skillMods.set(modName, value);
    }),
    getTotalCredits: vi.fn(() => player.credits.cash + player.credits.bank),
    removeCashCredits: vi.fn((amount: number) => {
      player.credits.cash -= amount;
    }),
    awardSchematic: vi.fn((crc: number) => {
      schematics.add(crc);
    }),
    removeSchematic: vi.fn((crc: number) => {
      schematics.delete(crc);
    }),
    ...overrides,
  };

  return player;
}

// ============================================
// Tests
// ============================================

describe('XpManager', () => {
  let xpManager: XpManager;

  beforeEach(() => {
    vi.clearAllMocks();
    xpManager = createXpManager(mockEventEmitter as any, mockSkillRegistry as any);
  });

  // ============================================
  // Initialization Tests
  // ============================================

  describe('Initialization', () => {
    it('should create with factory function', () => {
      const manager = createXpManager();
      expect(manager).toBeInstanceOf(XpManager);
    });

    it('should create with custom event emitter and skill registry', () => {
      const manager = createXpManager(mockEventEmitter as any, mockSkillRegistry as any);
      expect(manager).toBeInstanceOf(XpManager);
    });
  });

  // ============================================
  // XP Award Tests
  // ============================================

  describe('XP Award', () => {
    it('should award XP to player', () => {
      const player = createMockPlayer();

      const result = xpManager.awardXp(player as any, 'combat_general', 500);

      expect(result.awarded).toBe(500);
      expect(result.capped).toBe(0);
      expect(player.addExperience).toHaveBeenCalledWith('combat_general', 500);
    });

    it('should apply multiplier to XP', () => {
      const player = createMockPlayer();

      const result = xpManager.awardXp(player as any, 'combat_general', 100, {
        multiplier: 2.0,
      });

      expect(result.awarded).toBe(200);
    });

    it('should cap XP at maximum', () => {
      const player = createMockPlayer();
      player.experience.set('combat_general', 99000); // Near cap of 100000

      const result = xpManager.awardXp(player as any, 'combat_general', 5000);

      expect(result.awarded).toBe(1000); // Capped at 100000
      expect(result.capped).toBe(4000);
      expect(result.capReached).toBe(true);
    });

    it('should ignore cap when specified', () => {
      const player = createMockPlayer();
      player.experience.set('combat_general', 99000);

      const result = xpManager.awardXp(player as any, 'combat_general', 5000, {
        ignoreCap: true,
      });

      expect(result.awarded).toBe(5000);
      expect(result.capped).toBe(0);
    });

    it('should emit XP awarded event', () => {
      const player = createMockPlayer();

      xpManager.awardXp(player as any, 'combat_general', 500, { source: 'kill' });

      expect(mockEventEmitter.emitXpAwarded).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: player.objectId,
          xpType: 'combat_general',
          amount: 500,
          source: 'kill',
        })
      );
    });

    it('should emit cap reached event when XP is wasted', () => {
      const player = createMockPlayer();
      player.experience.set('combat_general', 100000); // At cap

      xpManager.awardXp(player as any, 'combat_general', 1000);

      expect(mockEventEmitter.emitXpCapReached).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: player.objectId,
          xpType: 'combat_general',
          wastedAmount: 1000,
        })
      );
    });

    it('should warn on unknown XP type', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const player = createMockPlayer();

      xpManager.awardXp(player as any, '123-invalid-type', 100);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown XP type'));
      consoleSpy.mockRestore();
    });

    it('should not award negative amounts', () => {
      const player = createMockPlayer();
      player.experience.set('combat_general', 100000); // At cap

      const result = xpManager.awardXp(player as any, 'combat_general', 100);

      expect(result.awarded).toBe(0);
      expect(result.capped).toBe(100);
    });
  });

  // ============================================
  // Get XP Tests
  // ============================================

  describe('Get XP', () => {
    it('should get current XP for type', () => {
      const player = createMockPlayer();
      player.experience.set('combat_general', 5000);

      const xp = xpManager.getXp(player as any, 'combat_general');

      expect(xp).toBe(5000);
    });

    it('should return 0 for unearned XP type', () => {
      const player = createMockPlayer();

      const xp = xpManager.getXp(player as any, 'jedi');

      expect(xp).toBe(0);
    });
  });

  // ============================================
  // XP Cap Tests
  // ============================================

  describe('XP Caps', () => {
    it('should return default cap for XP type', () => {
      const player = createMockPlayer();

      const cap = xpManager.getXpCap(player as any, 'combat_general');

      expect(cap).toBe(100000);
    });

    it('should add cap increases from skills', () => {
      const player = createMockPlayer();
      player.skills.add('skill_with_cap_increase');

      mockSkillRegistry.get.mockReturnValue({
        name: 'skill_with_cap_increase',
        xpCapIncrease: new Map([['combat_general', 10000]]),
      });

      const cap = xpManager.getXpCap(player as any, 'combat_general');

      expect(cap).toBe(110000); // 100000 + 10000
    });

    it('should add player cap modifiers', () => {
      const player = createMockPlayer();

      xpManager.addCapModifier(player as any, 'combat_general', 5000);

      const cap = xpManager.getXpCap(player as any, 'combat_general');
      expect(cap).toBe(105000); // 100000 + 5000
    });

    it('should get all XP caps', () => {
      const player = createMockPlayer();

      const caps = xpManager.getAllXpCaps(player as any);

      expect(caps.get('combat_general')).toBe(100000);
      expect(caps.get('brawler')).toBe(75000);
      expect(caps.get('jedi')).toBe(250000);
    });
  });

  // ============================================
  // Cap Modifier Tests
  // ============================================

  describe('Cap Modifiers', () => {
    it('should add cap modifier', () => {
      const player = createMockPlayer();

      xpManager.addCapModifier(player as any, 'combat_general', 10000);

      expect(mockEventEmitter.emitXpCapChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: player.objectId,
          xpType: 'combat_general',
          reason: 'modifier_added',
        })
      );
    });

    it('should remove cap modifier', () => {
      const player = createMockPlayer();

      xpManager.addCapModifier(player as any, 'combat_general', 10000);
      xpManager.removeCapModifier(player as any, 'combat_general', 10000);

      expect(mockEventEmitter.emitXpCapChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'modifier_removed',
        })
      );
    });

    it('should stack cap modifiers', () => {
      const player = createMockPlayer();

      xpManager.addCapModifier(player as any, 'combat_general', 5000);
      xpManager.addCapModifier(player as any, 'combat_general', 3000);

      const cap = xpManager.getXpCap(player as any, 'combat_general');
      expect(cap).toBe(108000); // 100000 + 5000 + 3000
    });

    it('should clear all cap modifiers', () => {
      const player = createMockPlayer();

      xpManager.addCapModifier(player as any, 'combat_general', 5000);
      xpManager.addCapModifier(player as any, 'brawler', 3000);
      xpManager.clearCapModifiers(player as any);

      const combatCap = xpManager.getXpCap(player as any, 'combat_general');
      const brawlerCap = xpManager.getXpCap(player as any, 'brawler');

      expect(combatCap).toBe(100000);
      expect(brawlerCap).toBe(75000);
    });
  });

  // ============================================
  // Can Afford Skill Tests
  // ============================================

  describe('Can Afford Skill', () => {
    it('should return true when player has enough XP', () => {
      const player = createMockPlayer();
      player.experience.set('combat_general', 5000);

      const skill = createMockSkill({
        xpCost: new Map([['combat_general', 2000]]),
      });

      const canAfford = xpManager.canAffordSkill(player as any, skill as any);

      expect(canAfford).toBe(true);
    });

    it('should return false when player lacks XP', () => {
      const player = createMockPlayer();
      player.experience.set('combat_general', 500);

      const skill = createMockSkill({
        xpCost: new Map([['combat_general', 2000]]),
      });

      const canAfford = xpManager.canAffordSkill(player as any, skill as any);

      expect(canAfford).toBe(false);
    });

    it('should check credit requirements', () => {
      const player = createMockPlayer();
      player.credits = { cash: 100, bank: 100 }; // Low credits

      const skill = createMockSkill({
        xpCost: new Map([['combat_general', 100]]),
        creditCost: 10000,
      });

      const canAfford = xpManager.canAffordSkill(player as any, skill as any);

      expect(canAfford).toBe(false);
    });

    it('should check parent skill requirement', () => {
      const player = createMockPlayer();
      // Does not have parent skill

      const skill = createMockSkill({
        parentSkill: 'brawler_novice',
        xpCost: new Map([['combat_general', 100]]),
      });

      const canAfford = xpManager.canAffordSkill(player as any, skill as any);

      expect(canAfford).toBe(false);
    });

    it('should pass when parent skill is owned', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice');

      const skill = createMockSkill({
        parentSkill: 'brawler_novice',
        xpCost: new Map([['combat_general', 100]]),
      });

      const canAfford = xpManager.canAffordSkill(player as any, skill as any);

      expect(canAfford).toBe(true);
    });

    it('should check multiple XP type requirements', () => {
      const player = createMockPlayer();
      player.experience.set('combat_general', 5000);
      player.experience.set('brawler', 1000); // Not enough

      const skill = createMockSkill({
        xpCost: new Map([
          ['combat_general', 2000],
          ['brawler', 5000],
        ]),
      });

      const canAfford = xpManager.canAffordSkill(player as any, skill as any);

      expect(canAfford).toBe(false);
    });
  });

  // ============================================
  // Spend XP Tests
  // ============================================

  describe('Spend XP', () => {
    it('should spend XP to learn skill', () => {
      const player = createMockPlayer();
      player.experience.set('combat_general', 5000);

      const skill = createMockSkill({
        name: 'test_skill',
        xpCost: new Map([['combat_general', 2000]]),
        skillMods: new Map([['accuracy', 10]]),
      });

      const result = xpManager.spendXp(player as any, skill as any);

      expect(result).toBe(true);
      expect(player.setExperience).toHaveBeenCalledWith('combat_general', 3000);
      expect(player.addSkill).toHaveBeenCalledWith('test_skill');
    });

    it('should apply skill mods when learning', () => {
      const player = createMockPlayer();

      const skill = createMockSkill({
        skillMods: new Map([['accuracy', 10], ['defense', 5]]),
      });

      xpManager.spendXp(player as any, skill as any);

      expect(player.setSkillMod).toHaveBeenCalledWith('accuracy', 10);
      expect(player.setSkillMod).toHaveBeenCalledWith('defense', 5);
    });

    it('should deduct credit cost', () => {
      const player = createMockPlayer();

      const skill = createMockSkill({
        xpCost: new Map([['combat_general', 100]]),
        creditCost: 5000,
      });

      xpManager.spendXp(player as any, skill as any);

      expect(player.removeCashCredits).toHaveBeenCalledWith(5000);
    });

    it('should award schematics', () => {
      const player = createMockPlayer();

      const skill = createMockSkill({
        xpCost: new Map([['combat_general', 100]]),
        schematics: [12345, 67890],
      });

      xpManager.spendXp(player as any, skill as any);

      expect(player.awardSchematic).toHaveBeenCalledWith(12345);
      expect(player.awardSchematic).toHaveBeenCalledWith(67890);
    });

    it('should emit XP spent event', () => {
      const player = createMockPlayer();

      const skill = createMockSkill({ name: 'test_skill' });

      xpManager.spendXp(player as any, skill as any);

      expect(mockEventEmitter.emitXpSpent).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: player.objectId,
          skillName: 'test_skill',
        })
      );
    });

    it('should emit cap changed event when skill increases cap', () => {
      const player = createMockPlayer();

      const skill = createMockSkill({
        xpCost: new Map([['combat_general', 100]]),
        xpCapIncrease: new Map([['combat_general', 5000]]),
      });

      xpManager.spendXp(player as any, skill as any);

      expect(mockEventEmitter.emitXpCapChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          xpType: 'combat_general',
          reason: 'skill_learned',
        })
      );
    });

    it('should fail if player already has skill', () => {
      const player = createMockPlayer();
      player.skills.add('test_skill');

      const skill = createMockSkill({ name: 'test_skill' });

      const result = xpManager.spendXp(player as any, skill as any);

      expect(result).toBe(false);
    });

    it('should fail if player cannot afford skill', () => {
      const player = createMockPlayer();
      player.experience.set('combat_general', 0);

      const skill = createMockSkill({
        xpCost: new Map([['combat_general', 10000]]),
      });

      const result = xpManager.spendXp(player as any, skill as any);

      expect(result).toBe(false);
    });
  });

  // ============================================
  // Surrender Skill Tests
  // ============================================

  describe('Surrender Skill', () => {
    it('should surrender skill and remove mods', () => {
      const player = createMockPlayer();
      player.skills.add('test_skill');
      player.skillMods.set('accuracy', 10);

      const skill = createMockSkill({
        name: 'test_skill',
        skillMods: new Map([['accuracy', 10]]),
      });

      mockSkillRegistry.getChildSkills.mockReturnValue([]);

      const result = xpManager.surrenderSkill(player as any, skill as any);

      expect(result).toBe(true);
      expect(player.removeSkill).toHaveBeenCalledWith('test_skill');
      expect(player.setSkillMod).toHaveBeenCalledWith('accuracy', 0);
    });

    it('should not surrender if player does not have skill', () => {
      const player = createMockPlayer();

      const skill = createMockSkill({ name: 'unowned_skill' });

      const result = xpManager.surrenderSkill(player as any, skill as any);

      expect(result).toBe(false);
    });

    it('should not surrender if child skills are learned', () => {
      const player = createMockPlayer();
      player.skills.add('parent_skill');
      player.skills.add('child_skill');

      const skill = createMockSkill({ name: 'parent_skill' });
      mockSkillRegistry.getChildSkills.mockReturnValue([
        createMockSkill({ name: 'child_skill' }),
      ]);

      const result = xpManager.surrenderSkill(player as any, skill as any);

      expect(result).toBe(false);
    });

    it('should remove schematics if no other skill grants them', () => {
      const player = createMockPlayer();
      player.skills.add('test_skill');
      player.schematics.add(12345);

      const skill = createMockSkill({
        name: 'test_skill',
        schematics: [12345],
      });

      mockSkillRegistry.getChildSkills.mockReturnValue([]);
      mockSkillRegistry.get.mockReturnValue(null);

      xpManager.surrenderSkill(player as any, skill as any);

      expect(player.removeSchematic).toHaveBeenCalledWith(12345);
    });

    it('should emit cap changed event when surrendering', () => {
      const player = createMockPlayer();
      player.skills.add('test_skill');

      const skill = createMockSkill({
        name: 'test_skill',
        xpCapIncrease: new Map([['combat_general', 5000]]),
      });

      mockSkillRegistry.getChildSkills.mockReturnValue([]);
      mockSkillRegistry.get.mockImplementation((name: string) =>
        name === 'test_skill' ? skill : null
      );

      xpManager.surrenderSkill(player as any, skill as any);

      expect(mockEventEmitter.emitXpCapChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'skill_dropped',
        })
      );
    });
  });

  // ============================================
  // Affordable Skills Tests
  // ============================================

  describe('Affordable Skills', () => {
    it('should get list of affordable skills', () => {
      const player = createMockPlayer();
      player.experience.set('combat_general', 10000);

      mockSkillRegistry.getAllSkillNames.mockReturnValue(['skill_a', 'skill_b']);
      mockSkillRegistry.get
        .mockReturnValueOnce(createMockSkill({
          name: 'skill_a',
          xpCost: new Map([['combat_general', 1000]]),
        }))
        .mockReturnValueOnce(createMockSkill({
          name: 'skill_b',
          xpCost: new Map([['combat_general', 5000]]),
        }));

      const affordable = xpManager.getAffordableSkills(player as any);

      expect(affordable.length).toBe(2);
    });

    it('should not include already owned skills', () => {
      const player = createMockPlayer();
      player.skills.add('skill_a');

      mockSkillRegistry.getAllSkillNames.mockReturnValue(['skill_a', 'skill_b']);
      mockSkillRegistry.get
        .mockReturnValueOnce(createMockSkill({ name: 'skill_a' }))
        .mockReturnValueOnce(createMockSkill({ name: 'skill_b' }));

      const affordable = xpManager.getAffordableSkills(player as any);

      expect(affordable.every(s => s.name !== 'skill_a')).toBe(true);
    });
  });

  // ============================================
  // Skill Progress Tests
  // ============================================

  describe('Skill Progress', () => {
    it('should get XP progress towards skill', () => {
      const player = createMockPlayer();
      player.experience.set('combat_general', 5000);
      player.experience.set('brawler', 2500);

      const skill = createMockSkill({
        xpCost: new Map([
          ['combat_general', 10000],
          ['brawler', 5000],
        ]),
      });

      const progress = xpManager.getSkillProgress(player as any, skill as any);

      expect(progress.get('combat_general')).toEqual({
        current: 5000,
        required: 10000,
        percentage: 50,
      });

      expect(progress.get('brawler')).toEqual({
        current: 2500,
        required: 5000,
        percentage: 50,
      });
    });

    it('should cap progress percentage at 100', () => {
      const player = createMockPlayer();
      player.experience.set('combat_general', 15000); // More than required

      const skill = createMockSkill({
        xpCost: new Map([['combat_general', 10000]]),
      });

      const progress = xpManager.getSkillProgress(player as any, skill as any);

      expect(progress.get('combat_general')?.percentage).toBe(100);
    });
  });

  // ============================================
  // Realistic SWG Scenarios
  // ============================================

  describe('Realistic SWG Scenarios', () => {
    beforeEach(() => {
      mockSkillRegistry.getChildSkills.mockReturnValue([]);
    });

    it('should handle grinding combat XP', () => {
      const player = createMockPlayer();
      player.experience.set('combat_general', 0);

      // Simulate multiple combat kills
      for (let i = 0; i < 10; i++) {
        xpManager.awardXp(player as any, 'combat_general', 500, {
          source: 'creature_kill',
        });
      }

      const total = player.experience.get('combat_general');
      expect(total).toBe(5000);
    });

    it('should handle entertainer performance XP', () => {
      const player = createMockPlayer();
      player.experience.set('entertainer', 0);

      // Simulate performance XP gain
      const result = xpManager.awardXp(player as any, 'entertainer', 1500, {
        source: 'performance',
        multiplier: 1.5, // Group bonus
      });

      expect(result.awarded).toBe(2250);
    });

    it('should handle crafting XP with experimentation bonus', () => {
      const player = createMockPlayer();
      player.experience.set('crafting', 0);

      // Base crafting XP + experimentation success bonus
      xpManager.awardXp(player as any, 'crafting', 100, { source: 'craft_item' });
      xpManager.awardXp(player as any, 'crafting', 50, { source: 'experiment_success' });

      const total = player.experience.get('crafting');
      expect(total).toBe(150);
    });

    it('should handle learning skill box in profession', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice');
      player.experience.set('brawler', 5000);

      const brawler1h01 = createMockSkill({
        name: 'brawler_1h_01',
        parentSkill: 'brawler_novice',
        xpCost: new Map([['brawler', 2000]]),
        skillMods: new Map([['onehandmelee_accuracy', 10]]),
      });

      const success = xpManager.spendXp(player as any, brawler1h01 as any);

      expect(success).toBe(true);
      expect(player.experience.get('brawler')).toBe(3000);
    });

    it('should handle Jedi XP cap restrictions', () => {
      const player = createMockPlayer();
      player.experience.set('jedi', 245000); // Near 250k cap

      const result = xpManager.awardXp(player as any, 'jedi', 10000);

      expect(result.awarded).toBe(5000);
      expect(result.capped).toBe(5000);
      expect(result.capReached).toBe(true);
    });

    it('should handle XP decay on skill drop (no refund)', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_1h_01');
      player.experience.set('brawler', 1000); // Low XP after learning

      const skill = createMockSkill({
        name: 'brawler_1h_01',
        xpCost: new Map([['brawler', 2000]]),
      });

      const success = xpManager.surrenderSkill(player as any, skill as any);

      // XP should NOT be refunded in SWG
      expect(success).toBe(true);
      expect(player.experience.get('brawler')).toBe(1000);
    });

    it('should handle multiple XP types for a skill', () => {
      const player = createMockPlayer();
      player.experience.set('combat_general', 5000);
      player.experience.set('combat_melee', 3000);

      const skill = createMockSkill({
        name: 'advanced_melee',
        xpCost: new Map([
          ['combat_general', 2000],
          ['combat_melee', 1500],
        ]),
      });

      const canAfford = xpManager.canAffordSkill(player as any, skill as any);
      expect(canAfford).toBe(true);

      const success = xpManager.spendXp(player as any, skill as any);
      expect(success).toBe(true);

      expect(player.experience.get('combat_general')).toBe(3000);
      expect(player.experience.get('combat_melee')).toBe(1500);
    });

    it('should track progress towards master box', () => {
      const player = createMockPlayer();
      player.experience.set('brawler', 40000);

      const masterSkill = createMockSkill({
        name: 'brawler_master',
        xpCost: new Map([['brawler', 50000]]),
      });

      const progress = xpManager.getSkillProgress(player as any, masterSkill as any);

      expect(progress.get('brawler')).toEqual({
        current: 40000,
        required: 50000,
        percentage: 80,
      });
    });

    it('should handle buffed XP cap increase', () => {
      const player = createMockPlayer();

      // Player gets a buff that increases XP cap
      xpManager.addCapModifier(player as any, 'combat_general', 25000);

      const cap = xpManager.getXpCap(player as any, 'combat_general');
      expect(cap).toBe(125000);

      // Buff wears off
      xpManager.removeCapModifier(player as any, 'combat_general', 25000);

      const newCap = xpManager.getXpCap(player as any, 'combat_general');
      expect(newCap).toBe(100000);
    });
  });
});
