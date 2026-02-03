/**
 * Jedi Skill Tree
 * Manages Jedi skill loading, prerequisites, and allocation
 * Implements the pre-NGE holocron unlock and progression system
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { ObjectId } from '@swg/shared-types';
import {
  JediSkill,
  JediSkillData,
  JediSkillBranch,
  JediRank,
  ForceAlignment,
  ForceSensitiveStatus,
  ForceSensitiveRequirements,
  ForceRanks,
  JediPlayerState,
  convertToJediSkill,
  getAlignmentFromValue,
} from './jedi-types.js';

// ============================================
// Types
// ============================================

/**
 * Result of loading the Jedi skill tree
 */
export interface LoadJediSkillTreeResult {
  /** Map of skill name to skill definition */
  skills: Map<string, JediSkill>;
  /** Skills organized by branch */
  branches: Map<JediSkillBranch, JediSkill[]>;
  /** Any warnings generated during loading */
  warnings: string[];
  /** Number of skills loaded */
  skillCount: number;
}

/**
 * Result of checking skill prerequisites
 */
export interface SkillPrerequisiteResult {
  /** Whether all prerequisites are met */
  canLearn: boolean;
  /** List of missing prerequisite skills */
  missingSkills: string[];
  /** Missing rank requirement */
  missingRank: JediRank | null;
  /** Missing alignment requirement */
  missingAlignment: ForceAlignment | null;
  /** Missing XP amount */
  missingXp: number;
  /** Missing skill points */
  missingSkillPoints: number;
  /** Whether force sensitive status is insufficient */
  notForceSensitive: boolean;
}

/**
 * Result of learning a Jedi skill
 */
export interface LearnJediSkillResult {
  /** Whether the skill was successfully learned */
  success: boolean;
  /** The skill that was learned */
  skill: JediSkill | null;
  /** Skill mods gained */
  modsGained: Map<string, number>;
  /** Commands granted */
  commandsGranted: string[];
  /** Error message if failed */
  error?: string;
}

/**
 * Force sensitive unlock progress
 */
export interface ForceSensitiveProgress {
  /** Current status */
  status: ForceSensitiveStatus;
  /** Professions mastered */
  professionsMastered: number;
  /** Holocrons found */
  holocronsFound: number;
  /** Village quests completed */
  villageQuestsCompleted: number;
  /** Progress to next status (0-100) */
  progressPercent: number;
  /** What is needed for next status */
  nextRequirement: string;
}

// ============================================
// Skill Mod Constants
// ============================================

/**
 * Jedi-specific skill mods
 */
export const JediSkillMods = {
  /** Maximum force power pool */
  FORCE_POWER: 'forcePower',
  /** Force regeneration rate */
  FORCE_REGEN: 'forceRegen',
  /** Lightsaber accuracy bonus */
  LIGHTSABER_ACCURACY: 'lightsaberAccuracy',
  /** Lightsaber damage bonus */
  LIGHTSABER_DAMAGE: 'lightsaberDamage',
  /** Lightsaber defense bonus */
  LIGHTSABER_DEFENSE: 'lightsaberDefense',
  /** Force power effectiveness */
  FORCE_POWER_POTENCY: 'forcePowerPotency',
  /** Resistance to force powers */
  FORCE_RESIST: 'forceResist',
  /** Force healing effectiveness */
  FORCE_HEALING: 'forceHealing',
  /** Force speed bonus */
  FORCE_SPEED: 'forceSpeed',
  /** Visibility reduction */
  FORCE_CLOAK: 'forceCloak',
  /** Melee defense while using lightsaber */
  LIGHTSABER_BLOCK: 'lightsaberBlock',
  /** Ranged defense while using lightsaber */
  LIGHTSABER_DEFLECT: 'lightsaberDeflect',
} as const;

// ============================================
// JediSkillTree Class
// ============================================

/**
 * Manages the Jedi skill tree, handling skill loading, prerequisites,
 * and skill point allocation
 */
export class JediSkillTree {
  /** Map of skill names to skill definitions */
  private skills: Map<string, JediSkill>;

  /** Skills organized by branch */
  private branches: Map<JediSkillBranch, JediSkill[]>;

  /** Whether the skill tree has been initialized */
  private initialized: boolean;

  /** Default Jedi skill points cap */
  private maxJediSkillPoints: number;

  constructor() {
    this.skills = new Map();
    this.branches = new Map();
    this.initialized = false;
    this.maxJediSkillPoints = 250;

    // Initialize empty branch arrays
    for (const branch of Object.values(JediSkillBranch)) {
      this.branches.set(branch, []);
    }
  }

  // ============================================
  // Initialization
  // ============================================

  /**
   * Initialize the skill tree from data files
   * @param dataPath - Path to directory containing jedi skill JSON files
   */
  async initialize(dataPath: string): Promise<LoadJediSkillTreeResult> {
    const result: LoadJediSkillTreeResult = {
      skills: new Map(),
      branches: new Map(),
      warnings: [],
      skillCount: 0,
    };

    try {
      const skillsPath = join(dataPath, 'jedi_skills.json');
      const content = await readFile(skillsPath, 'utf-8');
      const skillDataArray: JediSkillData[] = JSON.parse(content);

      for (const skillData of skillDataArray) {
        const skill = convertToJediSkill(skillData);

        // Validate skill
        const validationWarnings = this.validateSkill(skill);
        result.warnings.push(...validationWarnings);

        // Add to main map
        this.skills.set(skill.skillName, skill);
        result.skills.set(skill.skillName, skill);

        // Add to branch map
        const branchSkills = this.branches.get(skill.branch);
        if (branchSkills) {
          branchSkills.push(skill);
        }
      }

      result.skillCount = this.skills.size;

      // Copy branches to result
      for (const [branch, skills] of this.branches) {
        result.branches.set(branch, [...skills]);
      }

      // Validate prerequisites
      const prereqWarnings = this.validateAllPrerequisites();
      result.warnings.push(...prereqWarnings);

      this.initialized = true;
    } catch (error) {
      result.warnings.push(`Failed to load Jedi skills: ${error}`);
    }

    return result;
  }

  /**
   * Initialize with default/hardcoded skills (for testing or when no data files)
   */
  initializeWithDefaults(): void {
    const defaultSkills = this.createDefaultSkills();

    for (const skill of defaultSkills) {
      this.skills.set(skill.skillName, skill);
      const branchSkills = this.branches.get(skill.branch);
      if (branchSkills) {
        branchSkills.push(skill);
      }
    }

    this.initialized = true;
  }

  /**
   * Check if the skill tree is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ============================================
  // Skill Access
  // ============================================

  /**
   * Get a skill by name
   */
  getSkill(skillName: string): JediSkill | undefined {
    return this.skills.get(skillName);
  }

  /**
   * Get all skills
   */
  getAllSkills(): JediSkill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get skills in a specific branch
   */
  getSkillsByBranch(branch: JediSkillBranch): JediSkill[] {
    return this.branches.get(branch) ?? [];
  }

  /**
   * Get skills at a specific tier
   */
  getSkillsByTier(tier: number): JediSkill[] {
    return this.getAllSkills().filter((s) => s.tier === tier);
  }

  /**
   * Get master skills (tier 4)
   */
  getMasterSkills(): JediSkill[] {
    return this.getAllSkills().filter((s) => s.isMaster);
  }

  /**
   * Get novice/entry skills (tier 1)
   */
  getNoviceSkills(): JediSkill[] {
    return this.getAllSkills().filter((s) => s.tier === 1 && s.prerequisites.length === 0);
  }

  // ============================================
  // Prerequisites
  // ============================================

  /**
   * Check if a player can learn a skill
   */
  canLearnSkill(state: JediPlayerState, skillName: string): SkillPrerequisiteResult {
    const result: SkillPrerequisiteResult = {
      canLearn: true,
      missingSkills: [],
      missingRank: null,
      missingAlignment: null,
      missingXp: 0,
      missingSkillPoints: 0,
      notForceSensitive: false,
    };

    const skill = this.skills.get(skillName);
    if (!skill) {
      result.canLearn = false;
      return result;
    }

    // Check force sensitive status
    if (state.forceSensitiveStatus !== ForceSensitiveStatus.UNLOCKED) {
      result.canLearn = false;
      result.notForceSensitive = true;
      return result;
    }

    // Already learned check
    if (state.learnedSkills.has(skillName)) {
      result.canLearn = false;
      return result;
    }

    // Check prerequisite skills
    for (const prereq of skill.prerequisites) {
      if (!state.learnedSkills.has(prereq)) {
        result.canLearn = false;
        result.missingSkills.push(prereq);
      }
    }

    // Check rank requirement
    const currentRankIndex = this.getRankIndex(state.rank);
    const requiredRankIndex = this.getRankIndex(skill.requiredRank);
    if (currentRankIndex < requiredRankIndex) {
      result.canLearn = false;
      result.missingRank = skill.requiredRank;
    }

    // Check alignment requirement
    if (skill.requiredAlignment !== null) {
      const currentAlignment = getAlignmentFromValue(state.alignmentValue);
      if (currentAlignment !== skill.requiredAlignment) {
        result.canLearn = false;
        result.missingAlignment = skill.requiredAlignment;
      }
    }

    // Check XP
    if (state.jediXp < skill.xpCost) {
      result.canLearn = false;
      result.missingXp = skill.xpCost - state.jediXp;
    }

    // Check skill points
    const usedPoints = this.calculateUsedSkillPoints(state);
    const availablePoints = state.jediSkillPoints - usedPoints;
    const skillPointCost = this.getSkillPointCost(skill);
    if (availablePoints < skillPointCost) {
      result.canLearn = false;
      result.missingSkillPoints = skillPointCost - availablePoints;
    }

    return result;
  }

  /**
   * Get all prerequisites for a skill (recursive)
   */
  getAllPrerequisites(skillName: string): Set<string> {
    const prereqs = new Set<string>();
    const visited = new Set<string>();

    const collect = (name: string): void => {
      if (visited.has(name)) return;
      visited.add(name);

      const skill = this.skills.get(name);
      if (!skill) return;

      for (const prereq of skill.prerequisites) {
        prereqs.add(prereq);
        collect(prereq);
      }
    };

    collect(skillName);
    return prereqs;
  }

  /**
   * Get skills that depend on a given skill
   */
  getDependentSkills(skillName: string): JediSkill[] {
    return this.getAllSkills().filter((s) => s.prerequisites.includes(skillName));
  }

  // ============================================
  // Skill Learning
  // ============================================

  /**
   * Learn a skill for a player
   * Modifies the state in place
   */
  learnSkill(state: JediPlayerState, skillName: string): LearnJediSkillResult {
    const result: LearnJediSkillResult = {
      success: false,
      skill: null,
      modsGained: new Map(),
      commandsGranted: [],
    };

    // Check prerequisites
    const prereqCheck = this.canLearnSkill(state, skillName);
    if (!prereqCheck.canLearn) {
      result.error = this.formatPrerequisiteError(prereqCheck);
      return result;
    }

    const skill = this.skills.get(skillName);
    if (!skill) {
      result.error = `Skill '${skillName}' not found`;
      return result;
    }

    // Deduct XP (XP is spent, not just required)
    state.jediXp -= skill.xpCost;

    // Add skill to learned skills
    state.learnedSkills.add(skillName);

    // Apply skill mods
    for (const [modName, modValue] of skill.skillMods) {
      result.modsGained.set(modName, modValue);
    }

    // Record commands
    result.commandsGranted = [...skill.commands];

    // Update force power pool if skill grants force power mod
    const forcePowerBonus = skill.skillMods.get(JediSkillMods.FORCE_POWER) ?? 0;
    if (forcePowerBonus > 0) {
      state.maxForcePower += forcePowerBonus;
      state.forcePower += forcePowerBonus;
    }

    result.success = true;
    result.skill = skill;

    return result;
  }

  /**
   * Surrender a Jedi skill
   * Also surrenders dependent skills
   */
  surrenderSkill(state: JediPlayerState, skillName: string): string[] {
    const surrendered: string[] = [];

    if (!state.learnedSkills.has(skillName)) {
      return surrendered;
    }

    // Find and surrender dependent skills first
    const dependents = this.findDependentSkillsToSurrender(state, skillName);
    for (const dep of dependents) {
      state.learnedSkills.delete(dep);
      surrendered.push(dep);

      // Remove skill mods
      const depSkill = this.skills.get(dep);
      if (depSkill) {
        const forcePowerBonus = depSkill.skillMods.get(JediSkillMods.FORCE_POWER) ?? 0;
        if (forcePowerBonus > 0) {
          state.maxForcePower -= forcePowerBonus;
          state.forcePower = Math.min(state.forcePower, state.maxForcePower);
        }
      }
    }

    // Surrender the target skill
    state.learnedSkills.delete(skillName);
    surrendered.push(skillName);

    const skill = this.skills.get(skillName);
    if (skill) {
      const forcePowerBonus = skill.skillMods.get(JediSkillMods.FORCE_POWER) ?? 0;
      if (forcePowerBonus > 0) {
        state.maxForcePower -= forcePowerBonus;
        state.forcePower = Math.min(state.forcePower, state.maxForcePower);
      }
    }

    return surrendered;
  }

  // ============================================
  // Force Sensitive Unlock System
  // ============================================

  /**
   * Check force sensitive unlock progress
   */
  checkForceSensitiveProgress(
    status: ForceSensitiveStatus,
    professionsMastered: number,
    holocronsFound: number,
    villageQuestsCompleted: number
  ): ForceSensitiveProgress {
    const progress: ForceSensitiveProgress = {
      status,
      professionsMastered,
      holocronsFound,
      villageQuestsCompleted,
      progressPercent: 0,
      nextRequirement: '',
    };

    switch (status) {
      case ForceSensitiveStatus.NOT_SENSITIVE:
        progress.progressPercent =
          (professionsMastered / ForceSensitiveRequirements.PROFESSIONS_FOR_GLOWING) * 100;
        progress.nextRequirement = `Master ${ForceSensitiveRequirements.PROFESSIONS_FOR_GLOWING - professionsMastered} more professions`;
        break;

      case ForceSensitiveStatus.GLOWING:
        progress.progressPercent =
          (holocronsFound / ForceSensitiveRequirements.HOLOCRONS_FOR_AWARE) * 100;
        progress.nextRequirement = `Find ${ForceSensitiveRequirements.HOLOCRONS_FOR_AWARE - holocronsFound} more holocrons`;
        break;

      case ForceSensitiveStatus.AWARE:
        progress.progressPercent =
          (villageQuestsCompleted / ForceSensitiveRequirements.VILLAGE_QUESTS_FOR_UNLOCK) * 100;
        progress.nextRequirement = `Complete ${ForceSensitiveRequirements.VILLAGE_QUESTS_FOR_UNLOCK - villageQuestsCompleted} more village quests`;
        break;

      case ForceSensitiveStatus.UNLOCKED:
        progress.progressPercent = 100;
        progress.nextRequirement = 'Force sensitive unlocked!';
        break;
    }

    return progress;
  }

  /**
   * Update force sensitive status based on progress
   */
  updateForceSensitiveStatus(state: JediPlayerState, professionsMastered: number): boolean {
    let statusChanged = false;

    switch (state.forceSensitiveStatus) {
      case ForceSensitiveStatus.NOT_SENSITIVE:
        if (professionsMastered >= ForceSensitiveRequirements.PROFESSIONS_FOR_GLOWING) {
          state.forceSensitiveStatus = ForceSensitiveStatus.GLOWING;
          statusChanged = true;
        }
        break;

      case ForceSensitiveStatus.GLOWING:
        if (state.holocronsFound >= ForceSensitiveRequirements.HOLOCRONS_FOR_AWARE) {
          state.forceSensitiveStatus = ForceSensitiveStatus.AWARE;
          statusChanged = true;
        }
        break;

      case ForceSensitiveStatus.AWARE:
        if (state.villageQuestsCompleted >= ForceSensitiveRequirements.VILLAGE_QUESTS_FOR_UNLOCK) {
          state.forceSensitiveStatus = ForceSensitiveStatus.UNLOCKED;
          state.jediSkillPoints = ForceRanks[JediRank.INITIATE].skillPointsGranted;
          statusChanged = true;
        }
        break;
    }

    return statusChanged;
  }

  /**
   * Record a holocron find
   */
  recordHolocronFind(state: JediPlayerState): boolean {
    if (state.forceSensitiveStatus !== ForceSensitiveStatus.GLOWING) {
      return false;
    }

    state.holocronsFound++;
    return this.updateForceSensitiveStatus(state, 0);
  }

  /**
   * Record a village quest completion
   */
  recordVillageQuestComplete(state: JediPlayerState): boolean {
    if (state.forceSensitiveStatus !== ForceSensitiveStatus.AWARE) {
      return false;
    }

    state.villageQuestsCompleted++;
    return this.updateForceSensitiveStatus(state, 0);
  }

  // ============================================
  // Skill Point Calculations
  // ============================================

  /**
   * Calculate used skill points
   */
  calculateUsedSkillPoints(state: JediPlayerState): number {
    let used = 0;
    for (const skillName of state.learnedSkills) {
      const skill = this.skills.get(skillName);
      if (skill) {
        used += this.getSkillPointCost(skill);
      }
    }
    return used;
  }

  /**
   * Get available skill points
   */
  getAvailableSkillPoints(state: JediPlayerState): number {
    return state.jediSkillPoints - this.calculateUsedSkillPoints(state);
  }

  /**
   * Get skill point cost for a skill
   * Higher tier skills cost more points
   */
  getSkillPointCost(skill: JediSkill): number {
    // Base cost is tier * 5, master skills cost double
    const baseCost = skill.tier * 5;
    return skill.isMaster ? baseCost * 2 : baseCost;
  }

  /**
   * Set max skill points
   */
  setMaxJediSkillPoints(max: number): void {
    this.maxJediSkillPoints = max;
  }

  /**
   * Get max skill points
   */
  getMaxJediSkillPoints(): number {
    return this.maxJediSkillPoints;
  }

  // ============================================
  // Skill Mod Calculations
  // ============================================

  /**
   * Calculate total skill mods from all learned skills
   */
  calculateSkillMods(state: JediPlayerState): Map<string, number> {
    const mods = new Map<string, number>();

    for (const skillName of state.learnedSkills) {
      const skill = this.skills.get(skillName);
      if (!skill) continue;

      for (const [modName, modValue] of skill.skillMods) {
        const current = mods.get(modName) ?? 0;
        mods.set(modName, current + modValue);
      }
    }

    return mods;
  }

  /**
   * Get a specific skill mod value
   */
  getSkillMod(state: JediPlayerState, modName: string): number {
    let total = 0;

    for (const skillName of state.learnedSkills) {
      const skill = this.skills.get(skillName);
      if (skill) {
        total += skill.skillMods.get(modName) ?? 0;
      }
    }

    return total;
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Validate a skill definition
   */
  private validateSkill(skill: JediSkill): string[] {
    const warnings: string[] = [];

    if (!skill.skillName) {
      warnings.push('Skill missing name');
    }

    if (!Object.values(JediSkillBranch).includes(skill.branch)) {
      warnings.push(`Skill '${skill.skillName}' has invalid branch: ${skill.branch}`);
    }

    if (skill.tier < 1 || skill.tier > 4) {
      warnings.push(`Skill '${skill.skillName}' has invalid tier: ${skill.tier}`);
    }

    return warnings;
  }

  /**
   * Validate all skill prerequisites
   */
  private validateAllPrerequisites(): string[] {
    const warnings: string[] = [];

    for (const skill of this.skills.values()) {
      for (const prereq of skill.prerequisites) {
        if (!this.skills.has(prereq)) {
          warnings.push(`Skill '${skill.skillName}' has missing prerequisite: ${prereq}`);
        }
      }
    }

    // Check for circular dependencies
    for (const skill of this.skills.values()) {
      const visited = new Set<string>();
      const stack = [skill.skillName];

      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) {
          warnings.push(`Circular dependency detected involving: ${skill.skillName}`);
          break;
        }
        visited.add(current);

        const currentSkill = this.skills.get(current);
        if (currentSkill) {
          stack.push(...currentSkill.prerequisites);
        }
      }
    }

    return warnings;
  }

  /**
   * Get rank index for comparison
   */
  private getRankIndex(rank: JediRank): number {
    const rankOrder: JediRank[] = [
      JediRank.INITIATE,
      JediRank.PADAWAN,
      JediRank.KNIGHT,
      JediRank.MASTER,
      JediRank.DARK_JEDI,
      JediRank.SITH_LORD,
    ];
    return rankOrder.indexOf(rank);
  }

  /**
   * Find all skills that must be surrendered when surrendering a skill
   */
  private findDependentSkillsToSurrender(state: JediPlayerState, skillName: string): string[] {
    const toSurrender: string[] = [];
    const visited = new Set<string>();

    const findDependents = (name: string): void => {
      if (visited.has(name)) return;
      visited.add(name);

      for (const skill of this.skills.values()) {
        if (!state.learnedSkills.has(skill.skillName)) continue;
        if (skill.skillName === skillName) continue;

        if (skill.prerequisites.includes(name) && !toSurrender.includes(skill.skillName)) {
          toSurrender.push(skill.skillName);
          findDependents(skill.skillName);
        }
      }
    };

    findDependents(skillName);
    return toSurrender.reverse();
  }

  /**
   * Format prerequisite error message
   */
  private formatPrerequisiteError(result: SkillPrerequisiteResult): string {
    if (result.notForceSensitive) {
      return 'You must unlock your Force sensitivity first';
    }
    if (result.missingSkills.length > 0) {
      return `Missing prerequisite skills: ${result.missingSkills.join(', ')}`;
    }
    if (result.missingRank) {
      return `Requires rank: ${result.missingRank}`;
    }
    if (result.missingAlignment) {
      return `Requires ${result.missingAlignment} side alignment`;
    }
    if (result.missingXp > 0) {
      return `Need ${result.missingXp} more Jedi XP`;
    }
    if (result.missingSkillPoints > 0) {
      return `Need ${result.missingSkillPoints} more skill points`;
    }
    return 'Cannot learn this skill';
  }

  /**
   * Create default skills for testing
   */
  private createDefaultSkills(): JediSkill[] {
    const skills: JediSkill[] = [];

    // Lightsaber branch
    skills.push({
      skillName: 'jedi_lightsaber_novice',
      displayName: 'Novice Lightsaber',
      branch: JediSkillBranch.LIGHTSABER,
      tier: 1,
      prerequisites: [],
      skillMods: new Map([
        [JediSkillMods.LIGHTSABER_ACCURACY, 10],
        [JediSkillMods.LIGHTSABER_DAMAGE, 5],
      ]),
      forcePointCost: 0,
      xpCost: 0,
      commands: ['saberAttack1'],
      isMaster: false,
      requiredRank: JediRank.INITIATE,
      requiredAlignment: null,
      description: 'Basic lightsaber training',
    });

    skills.push({
      skillName: 'jedi_lightsaber_accuracy_1',
      displayName: 'Lightsaber Accuracy I',
      branch: JediSkillBranch.LIGHTSABER,
      tier: 2,
      prerequisites: ['jedi_lightsaber_novice'],
      skillMods: new Map([
        [JediSkillMods.LIGHTSABER_ACCURACY, 15],
      ]),
      forcePointCost: 0,
      xpCost: 5000,
      commands: [],
      isMaster: false,
      requiredRank: JediRank.PADAWAN,
      requiredAlignment: null,
      description: 'Improved lightsaber accuracy',
    });

    // Force Powers branch
    skills.push({
      skillName: 'jedi_powers_novice',
      displayName: 'Novice Force Powers',
      branch: JediSkillBranch.FORCE_POWERS,
      tier: 1,
      prerequisites: [],
      skillMods: new Map([
        [JediSkillMods.FORCE_POWER, 50],
        [JediSkillMods.FORCE_POWER_POTENCY, 5],
      ]),
      forcePointCost: 0,
      xpCost: 0,
      commands: ['forcePush'],
      isMaster: false,
      requiredRank: JediRank.INITIATE,
      requiredAlignment: null,
      description: 'Basic force power training',
    });

    // Force Enhancement branch
    skills.push({
      skillName: 'jedi_enhancement_novice',
      displayName: 'Novice Force Enhancement',
      branch: JediSkillBranch.FORCE_ENHANCEMENT,
      tier: 1,
      prerequisites: [],
      skillMods: new Map([
        [JediSkillMods.FORCE_SPEED, 5],
        [JediSkillMods.FORCE_POWER, 25],
      ]),
      forcePointCost: 0,
      xpCost: 0,
      commands: ['forceRun'],
      isMaster: false,
      requiredRank: JediRank.INITIATE,
      requiredAlignment: null,
      description: 'Basic force enhancement training',
    });

    // Force Healing branch
    skills.push({
      skillName: 'jedi_healing_novice',
      displayName: 'Novice Force Healing',
      branch: JediSkillBranch.FORCE_HEALING,
      tier: 1,
      prerequisites: [],
      skillMods: new Map([
        [JediSkillMods.FORCE_HEALING, 10],
        [JediSkillMods.FORCE_POWER, 25],
      ]),
      forcePointCost: 0,
      xpCost: 0,
      commands: ['forceHealSelf'],
      isMaster: false,
      requiredRank: JediRank.INITIATE,
      requiredAlignment: null,
      description: 'Basic force healing training',
    });

    // Force Defense branch
    skills.push({
      skillName: 'jedi_defense_novice',
      displayName: 'Novice Force Defense',
      branch: JediSkillBranch.FORCE_DEFENSE,
      tier: 1,
      prerequisites: [],
      skillMods: new Map([
        [JediSkillMods.FORCE_RESIST, 10],
        [JediSkillMods.LIGHTSABER_DEFENSE, 5],
      ]),
      forcePointCost: 0,
      xpCost: 0,
      commands: ['forceAbsorb'],
      isMaster: false,
      requiredRank: JediRank.INITIATE,
      requiredAlignment: null,
      description: 'Basic force defense training',
    });

    return skills;
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new JediSkillTree instance
 */
export function createJediSkillTree(): JediSkillTree {
  return new JediSkillTree();
}

/**
 * Create and initialize a JediSkillTree with default skills
 */
export function createJediSkillTreeWithDefaults(): JediSkillTree {
  const tree = new JediSkillTree();
  tree.initializeWithDefaults();
  return tree;
}
