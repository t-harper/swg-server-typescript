/**
 * Skill Manager Tests
 * Tests for the central skill management system
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { SkillManager, DEFAULT_MAX_SKILL_POINTS } from '../skill-manager.js';
import { canSpeciesLearnSkill, isNoviceSkill } from '../skill-template.js';

// ============================================
// Mock skill-loader module
// ============================================
vi.mock('../skill-loader.js', () => ({
  loadSkillTree: vi.fn().mockResolvedValue({
    skills: new Map(),
    tree: new Map(),
    warnings: [],
  }),
  getAllPrerequisites: vi.fn((tree, skillName) => new Set<string>()),
  getSkillPath: vi.fn((tree, skillName) => [skillName]),
}));

// ============================================
// Mock skill-template module
// ============================================
vi.mock('../skill-template.js', () => ({
  canSpeciesLearnSkill: vi.fn(() => true),
  isNoviceSkill: vi.fn((skill) => skill.name?.includes('novice') ?? false),
}));

// ============================================
// Mock professions module
// ============================================
vi.mock('../professions.js', () => ({
  hasMasteredProfession: vi.fn(() => false),
  getMasteryProgress: vi.fn(() => ({ completed: 0, total: 4, percentage: 0 })),
  AllProfessions: {
    brawler: 'brawler',
    marksman: 'marksman',
    scout: 'scout',
    medic: 'medic',
    entertainer: 'entertainer',
    artisan: 'artisan',
  },
}));

// ============================================
// Test Fixtures
// ============================================

interface MockSkillTemplate {
  name: string;
  professionName: string;
  parentSkill: string;
  requiredSkills: string[];
  skillPointsRequired: number;
  xpType: string;
  xpCost: number;
  skillMods: Map<string, number>;
  commands: string[];
  certifications: string[];
  isMaster: boolean;
  isTitle: boolean;
  speciesRestrictions: string[];
}

function createMockSkill(overrides: Partial<MockSkillTemplate> = {}): MockSkillTemplate {
  return {
    name: 'skill_test',
    professionName: 'Test',
    parentSkill: '',
    requiredSkills: [],
    skillPointsRequired: 15,
    xpType: 'combat_general',
    xpCost: 1000,
    skillMods: new Map([['melee_accuracy', 10]]),
    commands: ['attack'],
    certifications: ['cert_melee_basic'],
    isMaster: false,
    isTitle: false,
    speciesRestrictions: [],
    ...overrides,
  };
}

interface MockPlayerObject {
  objectId: bigint;
  species: number;
  skills: Set<string>;
  skillMods: Map<string, number>;
  experience: Map<string, number>;
  professionTitle: string;
  getExperience: Mock;
  setExperience: Mock;
  addSkill: Mock;
  removeSkill: Mock;
  hasSkill: Mock;
  getSkillMod: Mock;
  setSkillMod: Mock;
  removeSkillMod: Mock;
  setProfessionTitle: Mock;
}

function createMockPlayer(overrides: Partial<MockPlayerObject> = {}): MockPlayerObject {
  const skills = new Set<string>();
  const skillMods = new Map<string, number>();
  const experience = new Map<string, number>([
    ['combat_general', 5000],
    ['brawler', 3000],
    ['marksman', 2000],
  ]);

  const player: MockPlayerObject = {
    objectId: BigInt(Math.floor(Math.random() * 1000000)),
    species: 0, // Human
    skills,
    skillMods,
    experience,
    professionTitle: '',
    getExperience: vi.fn((xpType: string) => experience.get(xpType) ?? 0),
    setExperience: vi.fn((xpType: string, value: number) => {
      experience.set(xpType, value);
    }),
    addSkill: vi.fn((skillName: string) => {
      skills.add(skillName);
    }),
    removeSkill: vi.fn((skillName: string) => {
      skills.delete(skillName);
    }),
    hasSkill: vi.fn((skillName: string) => skills.has(skillName)),
    getSkillMod: vi.fn((modName: string) => skillMods.get(modName) ?? 0),
    setSkillMod: vi.fn((modName: string, value: number) => {
      skillMods.set(modName, value);
    }),
    removeSkillMod: vi.fn((modName: string) => {
      skillMods.delete(modName);
    }),
    setProfessionTitle: vi.fn((title: string) => {
      player.professionTitle = title;
    }),
    ...overrides,
  };

  return player;
}

// ============================================
// Tests
// ============================================

describe('SkillManager', () => {
  let skillManager: SkillManager;

  beforeEach(() => {
    vi.clearAllMocks();
    skillManager = new SkillManager();
  });

  // ============================================
  // Initialization Tests
  // ============================================

  describe('Initialization', () => {
    it('should create with default state', () => {
      expect(skillManager.isInitialized()).toBe(false);
      expect(skillManager.getSkillCount()).toBe(0);
      expect(skillManager.getMaxSkillPoints()).toBe(DEFAULT_MAX_SKILL_POINTS);
    });

    it('should initialize from data path', async () => {
      await skillManager.initialize('/fake/path');
      expect(skillManager.isInitialized()).toBe(true);
    });

    it('should set custom max skill points', () => {
      skillManager.setMaxSkillPoints(300);
      expect(skillManager.getMaxSkillPoints()).toBe(300);
    });
  });

  // ============================================
  // Skill Info Tests
  // ============================================

  describe('Skill Info', () => {
    beforeEach(() => {
      // Manually populate skills for testing
      const templates = (skillManager as any).skillTemplates as Map<string, MockSkillTemplate>;
      const tree = (skillManager as any).skillTree as Map<string, any>;

      templates.set('brawler_novice', createMockSkill({
        name: 'brawler_novice',
        professionName: 'Brawler',
        skillPointsRequired: 15,
        xpCost: 0,
      }));

      templates.set('brawler_1h_01', createMockSkill({
        name: 'brawler_1h_01',
        professionName: 'Brawler',
        parentSkill: 'brawler_novice',
        skillPointsRequired: 5,
        xpCost: 2000,
        xpType: 'brawler',
      }));

      templates.set('brawler_1h_02', createMockSkill({
        name: 'brawler_1h_02',
        professionName: 'Brawler',
        parentSkill: 'brawler_1h_01',
        skillPointsRequired: 5,
        xpCost: 4000,
        xpType: 'brawler',
      }));

      templates.set('brawler_master', createMockSkill({
        name: 'brawler_master',
        professionName: 'Brawler',
        requiredSkills: ['brawler_1h_04', 'brawler_2h_04', 'brawler_ua_04', 'brawler_polearm_04'],
        skillPointsRequired: 20,
        xpCost: 50000,
        xpType: 'brawler',
        isMaster: true,
        isTitle: true,
      }));

      // Set up tree nodes
      tree.set('brawler_novice', {
        skill: templates.get('brawler_novice'),
        childSkills: ['brawler_1h_01'],
        treeDepth: 0,
      });

      tree.set('brawler_1h_01', {
        skill: templates.get('brawler_1h_01'),
        childSkills: ['brawler_1h_02'],
        treeDepth: 1,
      });

      tree.set('brawler_1h_02', {
        skill: templates.get('brawler_1h_02'),
        childSkills: [],
        treeDepth: 2,
      });

      (skillManager as any).initialized = true;
    });

    it('should get a skill by name', () => {
      const skill = skillManager.getSkill('brawler_novice');
      expect(skill).toBeDefined();
      expect(skill?.name).toBe('brawler_novice');
    });

    it('should return undefined for unknown skill', () => {
      const skill = skillManager.getSkill('nonexistent_skill');
      expect(skill).toBeUndefined();
    });

    it('should get child skills', () => {
      const children = skillManager.getChildSkills('brawler_novice');
      expect(children).toHaveLength(1);
      expect(children[0].name).toBe('brawler_1h_01');
    });

    it('should get all skills', () => {
      const all = skillManager.getAllSkills();
      expect(all.length).toBeGreaterThan(0);
    });

    it('should get novice skills', () => {
      vi.mocked(isNoviceSkill).mockImplementation((skill: any) => skill.name?.includes('novice'));

      const novice = skillManager.getNoviceSkills();
      expect(novice.some(s => s.name === 'brawler_novice')).toBe(true);
    });

    it('should get master skills', () => {
      const masters = skillManager.getMasterSkills();
      expect(masters.some(s => s.isMaster)).toBe(true);
    });

    it('should get dependent skills', () => {
      const dependents = skillManager.getDependentSkills('brawler_novice');
      expect(dependents.some(s => s.name === 'brawler_1h_01')).toBe(true);
    });
  });

  // ============================================
  // Skill Point Tracking Tests
  // ============================================

  describe('Skill Point Tracking', () => {
    beforeEach(() => {
      const templates = (skillManager as any).skillTemplates as Map<string, MockSkillTemplate>;
      templates.set('skill_a', createMockSkill({ name: 'skill_a', skillPointsRequired: 15 }));
      templates.set('skill_b', createMockSkill({ name: 'skill_b', skillPointsRequired: 10 }));
      templates.set('skill_c', createMockSkill({ name: 'skill_c', skillPointsRequired: 5 }));
      (skillManager as any).initialized = true;
    });

    it('should calculate used skill points', () => {
      const player = createMockPlayer();
      player.skills.add('skill_a');
      player.skills.add('skill_b');

      const used = skillManager.calculateUsedSkillPoints(player as any);
      expect(used).toBe(25); // 15 + 10
    });

    it('should get available skill points', () => {
      const player = createMockPlayer();
      player.skills.add('skill_a'); // Uses 15 points

      const available = skillManager.getAvailableSkillPoints(player as any);
      expect(available).toBe(DEFAULT_MAX_SKILL_POINTS - 15);
    });

    it('should return max points when no skills learned', () => {
      const player = createMockPlayer();

      const available = skillManager.getAvailableSkillPoints(player as any);
      expect(available).toBe(DEFAULT_MAX_SKILL_POINTS);
    });
  });

  // ============================================
  // Can Learn Skill Tests
  // ============================================

  describe('Can Learn Skill', () => {
    beforeEach(() => {
      const templates = (skillManager as any).skillTemplates as Map<string, MockSkillTemplate>;

      templates.set('brawler_novice', createMockSkill({
        name: 'brawler_novice',
        skillPointsRequired: 15,
        xpCost: 0,
        xpType: '',
      }));

      templates.set('brawler_1h_01', createMockSkill({
        name: 'brawler_1h_01',
        parentSkill: 'brawler_novice',
        skillPointsRequired: 5,
        xpCost: 2000,
        xpType: 'brawler',
      }));

      templates.set('expensive_skill', createMockSkill({
        name: 'expensive_skill',
        skillPointsRequired: 300, // More than max
        xpCost: 1000,
        xpType: 'combat_general',
      }));

      (skillManager as any).initialized = true;
    });

    it('should allow learning a skill with all requirements met', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice');

      const result = skillManager.canLearnSkill(player as any, 'brawler_1h_01');
      expect(result.canLearn).toBe(true);
      expect(result.missingPrerequisites).toHaveLength(0);
      expect(result.missingXp).toHaveLength(0);
    });

    it('should not allow learning an already known skill', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice');

      const result = skillManager.canLearnSkill(player as any, 'brawler_novice');
      expect(result.canLearn).toBe(false);
      expect(result.alreadyHasSkill).toBe(true);
    });

    it('should not allow learning without prerequisite', () => {
      const player = createMockPlayer();
      // Does not have brawler_novice

      const result = skillManager.canLearnSkill(player as any, 'brawler_1h_01');
      expect(result.canLearn).toBe(false);
      expect(result.missingPrerequisites).toContain('brawler_novice');
    });

    it('should not allow learning without enough XP', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice');
      player.experience.set('brawler', 500); // Not enough

      const result = skillManager.canLearnSkill(player as any, 'brawler_1h_01');
      expect(result.canLearn).toBe(false);
      expect(result.missingXp.length).toBeGreaterThan(0);
      expect(result.missingXp[0].type).toBe('brawler');
    });

    it('should not allow learning without enough skill points', () => {
      const player = createMockPlayer();

      const result = skillManager.canLearnSkill(player as any, 'expensive_skill');
      expect(result.canLearn).toBe(false);
      expect(result.missingSkillPoints).toBeGreaterThan(0);
    });

    it('should not allow species-restricted skill', () => {
      vi.mocked(canSpeciesLearnSkill).mockReturnValue(false);

      const player = createMockPlayer();
      player.skills.add('brawler_novice');

      const result = skillManager.canLearnSkill(player as any, 'brawler_1h_01');
      expect(result.canLearn).toBe(false);
      expect(result.speciesRestricted).toBe(true);
    });

    it('should return false for unknown skill', () => {
      const player = createMockPlayer();

      const result = skillManager.canLearnSkill(player as any, 'unknown_skill');
      expect(result.canLearn).toBe(false);
    });
  });

  // ============================================
  // Learn Skill Tests
  // ============================================

  describe('Learn Skill', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(canSpeciesLearnSkill).mockReturnValue(true);

      const templates = (skillManager as any).skillTemplates as Map<string, MockSkillTemplate>;

      templates.set('brawler_novice', createMockSkill({
        name: 'brawler_novice',
        professionName: 'Brawler',
        skillPointsRequired: 15,
        xpCost: 0,
        xpType: '',
        skillMods: new Map([['melee_accuracy', 10], ['melee_defense', 5]]),
        commands: ['berserk1'],
        certifications: ['cert_brawler_novice'],
      }));

      templates.set('brawler_1h_01', createMockSkill({
        name: 'brawler_1h_01',
        professionName: 'Brawler',
        parentSkill: 'brawler_novice',
        skillPointsRequired: 5,
        xpCost: 2000,
        xpType: 'brawler',
        skillMods: new Map([['onehandmelee_accuracy', 10]]),
        commands: ['dizzyattack'],
        certifications: ['cert_1h_vibroblade'],
      }));

      templates.set('brawler_master', createMockSkill({
        name: 'brawler_master',
        professionName: 'Brawler',
        skillPointsRequired: 20,
        xpCost: 50000,
        xpType: 'brawler',
        isMaster: true,
        isTitle: true,
      }));

      (skillManager as any).initialized = true;
    });

    it('should successfully learn a skill', () => {
      const player = createMockPlayer();

      const result = skillManager.learnSkill(player as any, 'brawler_novice');

      expect(result.success).toBe(true);
      expect(result.skillName).toBe('brawler_novice');
      expect(player.addSkill).toHaveBeenCalledWith('brawler_novice');
    });

    it('should apply skill mods when learning', () => {
      const player = createMockPlayer();

      const result = skillManager.learnSkill(player as any, 'brawler_novice');

      expect(result.modsGained.size).toBeGreaterThan(0);
      expect(result.modsGained.get('melee_accuracy')).toBe(10);
      expect(player.setSkillMod).toHaveBeenCalled();
    });

    it('should grant commands when learning', () => {
      const player = createMockPlayer();

      const result = skillManager.learnSkill(player as any, 'brawler_novice');

      expect(result.commandsGained).toContain('berserk1');
    });

    it('should grant certifications when learning', () => {
      const player = createMockPlayer();

      const result = skillManager.learnSkill(player as any, 'brawler_novice');

      expect(result.certificationsGained).toContain('cert_brawler_novice');
    });

    it('should deduct XP when learning', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice');

      const result = skillManager.learnSkill(player as any, 'brawler_1h_01');

      expect(result.xpSpent.type).toBe('brawler');
      expect(result.xpSpent.amount).toBe(2000);
      expect(player.setExperience).toHaveBeenCalled();
    });

    it('should mark mastery when learning master skill', () => {
      const player = createMockPlayer();
      player.experience.set('brawler', 100000);

      const result = skillManager.learnSkill(player as any, 'brawler_master');

      expect(result.isMaster).toBe(true);
      expect(result.professionMastered).toBe('Brawler');
      expect(player.setProfessionTitle).toHaveBeenCalledWith('Master Brawler');
    });

    it('should fail if requirements not met', () => {
      const player = createMockPlayer();
      // Missing brawler_novice prerequisite

      const result = skillManager.learnSkill(player as any, 'brawler_1h_01');

      expect(result.success).toBe(false);
      expect(result.error).toContain('prerequisite');
    });

    it('should emit skill learned event', () => {
      const player = createMockPlayer();
      const handler = vi.fn();
      skillManager.onSkillLearned(handler);

      skillManager.learnSkill(player as any, 'brawler_novice');

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        playerId: player.objectId,
        skillName: 'brawler_novice',
      }));
    });
  });

  // ============================================
  // Surrender Skill Tests
  // ============================================

  describe('Surrender Skill', () => {
    beforeEach(() => {
      vi.mocked(isNoviceSkill).mockImplementation((skill: any) => skill.name?.includes('novice'));

      const templates = (skillManager as any).skillTemplates as Map<string, MockSkillTemplate>;

      templates.set('brawler_novice', createMockSkill({
        name: 'brawler_novice',
        professionName: 'Brawler',
        skillMods: new Map([['melee_accuracy', 10]]),
        commands: ['berserk1'],
        certifications: ['cert_brawler_novice'],
      }));

      templates.set('marksman_novice', createMockSkill({
        name: 'marksman_novice',
        professionName: 'Marksman',
        skillMods: new Map([['ranged_accuracy', 10]]),
      }));

      templates.set('brawler_1h_01', createMockSkill({
        name: 'brawler_1h_01',
        professionName: 'Brawler',
        parentSkill: 'brawler_novice',
        skillMods: new Map([['onehandmelee_accuracy', 10]]),
        commands: ['dizzyattack'],
      }));

      templates.set('brawler_1h_02', createMockSkill({
        name: 'brawler_1h_02',
        professionName: 'Brawler',
        parentSkill: 'brawler_1h_01',
        skillMods: new Map([['onehandmelee_accuracy', 15]]),
      }));

      (skillManager as any).initialized = true;
    });

    it('should check if skill can be surrendered', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice');
      player.skills.add('marksman_novice');

      const canSurrender = skillManager.canSurrenderSkill(player as any, 'brawler_novice');
      expect(canSurrender).toBe(true);
    });

    it('should not surrender skill player does not have', () => {
      const player = createMockPlayer();

      const canSurrender = skillManager.canSurrenderSkill(player as any, 'brawler_novice');
      expect(canSurrender).toBe(false);
    });

    it('should not surrender only novice skill', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice');
      // Only one novice skill

      const canSurrender = skillManager.canSurrenderSkill(player as any, 'brawler_novice');
      expect(canSurrender).toBe(false);
    });

    it('should surrender skill and remove mods', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice');
      player.skills.add('marksman_novice');
      player.skillMods.set('melee_accuracy', 10);

      const result = skillManager.surrenderSkill(player as any, 'brawler_novice');

      expect(result.success).toBe(true);
      expect(result.modsLost.get('melee_accuracy')).toBe(10);
      expect(player.removeSkill).toHaveBeenCalledWith('brawler_novice');
    });

    it('should surrender dependent skills first', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice');
      player.skills.add('marksman_novice');
      player.skills.add('brawler_1h_01');
      player.skills.add('brawler_1h_02');

      const result = skillManager.surrenderSkill(player as any, 'brawler_novice');

      expect(result.success).toBe(true);
      expect(result.dependentSkillsSurrendered).toContain('brawler_1h_01');
      expect(result.dependentSkillsSurrendered).toContain('brawler_1h_02');
    });

    it('should track lost commands', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice');
      player.skills.add('marksman_novice');

      const result = skillManager.surrenderSkill(player as any, 'brawler_novice');

      expect(result.commandsLost).toContain('berserk1');
    });

    it('should track lost certifications', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice');
      player.skills.add('marksman_novice');

      const result = skillManager.surrenderSkill(player as any, 'brawler_novice');

      expect(result.certificationsLost).toContain('cert_brawler_novice');
    });

    it('should emit skill surrendered event', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice');
      player.skills.add('marksman_novice');
      const handler = vi.fn();
      skillManager.onSkillSurrendered(handler);

      skillManager.surrenderSkill(player as any, 'brawler_novice');

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        playerId: player.objectId,
        skillName: 'brawler_novice',
      }));
    });
  });

  // ============================================
  // Skill Mod Calculations Tests
  // ============================================

  describe('Skill Mod Calculations', () => {
    beforeEach(() => {
      const templates = (skillManager as any).skillTemplates as Map<string, MockSkillTemplate>;

      templates.set('skill_a', createMockSkill({
        name: 'skill_a',
        skillMods: new Map([['accuracy', 10], ['defense', 5]]),
      }));

      templates.set('skill_b', createMockSkill({
        name: 'skill_b',
        skillMods: new Map([['accuracy', 15], ['speed', 10]]),
      }));

      (skillManager as any).initialized = true;
    });

    it('should calculate all skill mods', () => {
      const player = createMockPlayer();
      player.skills.add('skill_a');
      player.skills.add('skill_b');

      const mods = skillManager.calculateSkillMods(player as any);

      expect(mods.get('accuracy')).toBe(25); // 10 + 15
      expect(mods.get('defense')).toBe(5);
      expect(mods.get('speed')).toBe(10);
    });

    it('should get specific skill mod', () => {
      const player = createMockPlayer();
      player.skills.add('skill_a');
      player.skills.add('skill_b');

      const accuracy = skillManager.getSkillMod(player as any, 'accuracy');
      expect(accuracy).toBe(25);
    });

    it('should return 0 for unknown mod', () => {
      const player = createMockPlayer();
      player.skills.add('skill_a');

      const unknown = skillManager.getSkillMod(player as any, 'unknown_mod');
      expect(unknown).toBe(0);
    });

    it('should recalculate player skill mods', () => {
      const player = createMockPlayer();
      player.skills.add('skill_a');
      player.skillMods.set('accuracy', 100); // Incorrect value

      skillManager.recalculatePlayerSkillMods(player as any);

      expect(player.removeSkillMod).toHaveBeenCalledWith('accuracy');
      expect(player.setSkillMod).toHaveBeenCalledWith('accuracy', 10);
    });
  });

  // ============================================
  // Certifications Tests
  // ============================================

  describe('Certifications', () => {
    beforeEach(() => {
      const templates = (skillManager as any).skillTemplates as Map<string, MockSkillTemplate>;

      templates.set('skill_with_certs', createMockSkill({
        name: 'skill_with_certs',
        certifications: ['cert_weapon_a', 'cert_armor_light'],
      }));

      templates.set('skill_more_certs', createMockSkill({
        name: 'skill_more_certs',
        certifications: ['cert_weapon_b', 'cert_armor_medium'],
      }));

      (skillManager as any).initialized = true;
    });

    it('should check if player has certification', () => {
      const player = createMockPlayer();
      player.skills.add('skill_with_certs');

      expect(skillManager.hasCertification(player as any, 'cert_weapon_a')).toBe(true);
      expect(skillManager.hasCertification(player as any, 'cert_weapon_b')).toBe(false);
    });

    it('should get all certifications', () => {
      const player = createMockPlayer();
      player.skills.add('skill_with_certs');
      player.skills.add('skill_more_certs');

      const certs = skillManager.getCertifications(player as any);

      expect(certs).toContain('cert_weapon_a');
      expect(certs).toContain('cert_armor_light');
      expect(certs).toContain('cert_weapon_b');
      expect(certs).toContain('cert_armor_medium');
    });
  });

  // ============================================
  // Commands Tests
  // ============================================

  describe('Commands', () => {
    beforeEach(() => {
      const templates = (skillManager as any).skillTemplates as Map<string, MockSkillTemplate>;

      templates.set('skill_with_commands', createMockSkill({
        name: 'skill_with_commands',
        commands: ['attack', 'special_attack_1'],
      }));

      templates.set('skill_more_commands', createMockSkill({
        name: 'skill_more_commands',
        commands: ['heal', 'buff'],
      }));

      (skillManager as any).initialized = true;
    });

    it('should get granted commands', () => {
      const player = createMockPlayer();
      player.skills.add('skill_with_commands');
      player.skills.add('skill_more_commands');

      const commands = skillManager.getGrantedCommands(player as any);

      expect(commands).toContain('attack');
      expect(commands).toContain('special_attack_1');
      expect(commands).toContain('heal');
      expect(commands).toContain('buff');
    });

    it('should check if player has command', () => {
      const player = createMockPlayer();
      player.skills.add('skill_with_commands');

      expect(skillManager.hasCommand(player as any, 'attack')).toBe(true);
      expect(skillManager.hasCommand(player as any, 'heal')).toBe(false);
    });
  });

  // ============================================
  // Event Handler Tests
  // ============================================

  describe('Event Handlers', () => {
    it('should register and unregister skill learned handler', () => {
      const handler = vi.fn();

      skillManager.onSkillLearned(handler);
      // Trigger an event
      (skillManager as any).emitSkillLearned({ playerId: 1n, skillName: 'test', isMaster: false });
      expect(handler).toHaveBeenCalledTimes(1);

      skillManager.offSkillLearned(handler);
      (skillManager as any).emitSkillLearned({ playerId: 1n, skillName: 'test', isMaster: false });
      expect(handler).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should register and unregister skill surrendered handler', () => {
      const handler = vi.fn();

      skillManager.onSkillSurrendered(handler);
      (skillManager as any).emitSkillSurrendered({ playerId: 1n, skillName: 'test', dependentSkillsSurrendered: [] });
      expect(handler).toHaveBeenCalledTimes(1);

      skillManager.offSkillSurrendered(handler);
      (skillManager as any).emitSkillSurrendered({ playerId: 1n, skillName: 'test', dependentSkillsSurrendered: [] });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in event handlers gracefully', () => {
      const errorHandler = vi.fn(() => { throw new Error('Handler error'); });
      const normalHandler = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      skillManager.onSkillLearned(errorHandler);
      skillManager.onSkillLearned(normalHandler);

      // Should not throw
      expect(() => {
        (skillManager as any).emitSkillLearned({ playerId: 1n, skillName: 'test', isMaster: false });
      }).not.toThrow();

      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ============================================
  // Realistic SWG Scenarios
  // ============================================

  describe('Realistic SWG Scenarios', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(canSpeciesLearnSkill).mockReturnValue(true);
      vi.mocked(isNoviceSkill).mockImplementation((skill: any) => skill.name?.includes('novice'));

      const templates = (skillManager as any).skillTemplates as Map<string, MockSkillTemplate>;

      // Set up a realistic brawler progression
      templates.set('brawler_novice', createMockSkill({
        name: 'brawler_novice',
        professionName: 'Brawler',
        skillPointsRequired: 15,
        xpCost: 0,
        xpType: '',
        skillMods: new Map([
          ['melee_accuracy', 10],
          ['melee_defense', 5],
          ['melee_speed', 5],
        ]),
        commands: ['berserk1'],
        certifications: ['cert_brawler_novice'],
      }));

      templates.set('brawler_1h_01', createMockSkill({
        name: 'brawler_1h_01',
        professionName: 'Brawler',
        parentSkill: 'brawler_novice',
        skillPointsRequired: 5,
        xpCost: 2000,
        xpType: 'brawler',
        skillMods: new Map([['onehandmelee_accuracy', 10]]),
        commands: ['dizzyattack'],
        certifications: ['cert_1h_vibroblade'],
      }));

      templates.set('marksman_novice', createMockSkill({
        name: 'marksman_novice',
        professionName: 'Marksman',
        skillPointsRequired: 15,
        xpCost: 0,
        xpType: '',
        skillMods: new Map([
          ['ranged_accuracy', 10],
          ['ranged_defense', 5],
        ]),
        commands: ['aim'],
        certifications: ['cert_marksman_novice'],
      }));

      (skillManager as any).initialized = true;
    });

    it('should handle new character learning starting profession', () => {
      const newPlayer = createMockPlayer();

      // Learn brawler novice
      const result = skillManager.learnSkill(newPlayer as any, 'brawler_novice');

      expect(result.success).toBe(true);
      expect(result.xpSpent.amount).toBe(0); // Novice skills are free
      expect(result.modsGained.get('melee_accuracy')).toBe(10);
      expect(result.commandsGained).toContain('berserk1');
    });

    it('should handle grinding XP and learning next skill box', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice');
      player.experience.set('brawler', 5000); // Enough XP

      const result = skillManager.learnSkill(player as any, 'brawler_1h_01');

      expect(result.success).toBe(true);
      expect(result.xpSpent.type).toBe('brawler');
      expect(result.xpSpent.amount).toBe(2000);
      expect(result.commandsGained).toContain('dizzyattack');
    });

    it('should handle hybrid character with multiple professions', () => {
      const hybridPlayer = createMockPlayer();
      hybridPlayer.skills.add('brawler_novice');
      hybridPlayer.skills.add('marksman_novice');

      const mods = skillManager.calculateSkillMods(hybridPlayer as any);

      expect(mods.get('melee_accuracy')).toBe(10);
      expect(mods.get('ranged_accuracy')).toBe(10);
    });

    it('should handle dropping profession to try another', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice');
      player.skills.add('brawler_1h_01');
      player.skills.add('marksman_novice'); // Has second novice

      // Drop brawler
      const result = skillManager.surrenderSkill(player as any, 'brawler_novice');

      expect(result.success).toBe(true);
      expect(result.dependentSkillsSurrendered).toContain('brawler_1h_01');
    });

    it('should prevent dropping last profession', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice');
      // Only one novice skill

      const canSurrender = skillManager.canSurrenderSkill(player as any, 'brawler_novice');
      expect(canSurrender).toBe(false);
    });

    it('should calculate total skill point usage for build planning', () => {
      const player = createMockPlayer();
      player.skills.add('brawler_novice'); // 15 points
      player.skills.add('brawler_1h_01'); // 5 points
      player.skills.add('marksman_novice'); // 15 points

      const used = skillManager.calculateUsedSkillPoints(player as any);
      const available = skillManager.getAvailableSkillPoints(player as any);

      expect(used).toBe(35);
      expect(available).toBe(DEFAULT_MAX_SKILL_POINTS - 35);
    });
  });
});
