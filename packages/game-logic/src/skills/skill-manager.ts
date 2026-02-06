/**
 * Skill Manager
 * Central skill management system for the SWG server
 * Handles skill learning, surrendering, mods, certifications, and commands
 */

import type { ObjectId } from '@swg/shared-types';
import { PlayerObject } from '@swg/objects';
import {
  SkillTemplate,
  SkillTreeNode,
  canSpeciesLearnSkill,
  isNoviceSkill,
} from './skill-template.js';
import {
  loadSkillTree,
  LoadSkillTreeResult,
  getAllPrerequisites,
  getSkillPath,
} from './skill-loader.js';
import {
  hasMasteredProfession,
  getMasteryProgress,
  AllProfessions,
} from './professions.js';

// ============================================
// Constants
// ============================================

/** Default maximum skill points for a player */
export const DEFAULT_MAX_SKILL_POINTS = 250;

// ============================================
// Event Types
// ============================================

/**
 * Event emitted when a skill is learned
 */
export interface SkillLearnedEvent {
  /** Player who learned the skill */
  playerId: ObjectId;
  /** Name of the skill learned */
  skillName: string;
  /** Whether this completes a master box */
  isMaster: boolean;
  /** Profession name if master was achieved */
  professionMastered?: string | undefined;
}

/**
 * Event emitted when a skill is surrendered
 */
export interface SkillSurrenderedEvent {
  /** Player who surrendered the skill */
  playerId: ObjectId;
  /** Name of the skill surrendered */
  skillName: string;
  /** List of dependent skills also surrendered */
  dependentSkillsSurrendered: string[];
}

// ============================================
// Result Types
// ============================================

/**
 * Result of checking if a skill can be learned
 */
export interface SkillRequirementResult {
  /** Whether the skill can be learned */
  canLearn: boolean;
  /** Skills the player is missing as prerequisites */
  missingPrerequisites: string[];
  /** XP requirements not met */
  missingXp: { type: string; required: number; current: number }[];
  /** Skill points needed beyond what's available */
  missingSkillPoints: number;
  /** Whether the skill is restricted by species */
  speciesRestricted: boolean;
  /** Whether the player already has this skill */
  alreadyHasSkill: boolean;
}

/**
 * Result of learning a skill
 */
export interface LearnSkillResult {
  /** Whether the skill was successfully learned */
  success: boolean;
  /** Name of the skill learned */
  skillName: string;
  /** Skill mods gained from this skill */
  modsGained: Map<string, number>;
  /** Commands granted by this skill */
  commandsGained: string[];
  /** Certifications granted by this skill */
  certificationsGained: string[];
  /** XP spent to learn this skill */
  xpSpent: { type: string; amount: number };
  /** Error message if failed */
  error?: string | undefined;
  /** Whether mastery was achieved */
  isMaster: boolean;
  /** Profession mastered if applicable */
  professionMastered?: string | undefined;
}

/**
 * Result of surrendering a skill
 */
export interface SurrenderSkillResult {
  /** Whether the skill was successfully surrendered */
  success: boolean;
  /** Name of the skill surrendered */
  skillName: string;
  /** Dependent skills that were also surrendered */
  dependentSkillsSurrendered: string[];
  /** Skill mods lost from surrendering */
  modsLost: Map<string, number>;
  /** Commands lost from surrendering */
  commandsLost: string[];
  /** Certifications lost from surrendering */
  certificationsLost: string[];
  /** Error message if failed */
  error?: string | undefined;
}

// ============================================
// Event Handler Types
// ============================================

/**
 * Handler for skill learned events
 */
export type SkillLearnedHandler = (event: SkillLearnedEvent) => void;

/**
 * Handler for skill surrendered events
 */
export type SkillSurrenderedHandler = (event: SkillSurrenderedEvent) => void;

// ============================================
// SkillManager Class
// ============================================

/**
 * Central skill management system
 * Handles all skill-related operations including learning, surrendering,
 * mod calculations, and certification tracking
 */
export class SkillManager {
  /** Map of skill names to skill templates */
  private skillTemplates: Map<string, SkillTemplate>;

  /** Map of skill names to tree nodes (includes parent/child relationships) */
  private skillTree: Map<string, SkillTreeNode>;

  /** Whether the manager has been initialized */
  private initialized: boolean;

  /** Event handlers for skill learned events */
  private skillLearnedHandlers: Set<SkillLearnedHandler>;

  /** Event handlers for skill surrendered events */
  private skillSurrenderedHandlers: Set<SkillSurrenderedHandler>;

  /** Maximum skill points (can be overridden) */
  private maxSkillPoints: number;

  constructor() {
    this.skillTemplates = new Map();
    this.skillTree = new Map();
    this.initialized = false;
    this.skillLearnedHandlers = new Set();
    this.skillSurrenderedHandlers = new Set();
    this.maxSkillPoints = DEFAULT_MAX_SKILL_POINTS;
  }

  // ============================================
  // Initialization
  // ============================================

  /**
   * Initialize the skill manager with skill data from files
   * @param dataPath - Path to directory containing skill JSON files
   */
  async initialize(dataPath: string): Promise<void> {
    const result: LoadSkillTreeResult = await loadSkillTree(dataPath, {
      validatePrerequisites: true,
      detectCircular: true,
      strict: true,
    });

    this.skillTemplates = result.skills;
    this.skillTree = result.tree;
    this.initialized = true;

    if (result.warnings.length > 0) {
      console.warn('Skill loading warnings:', result.warnings);
    }
  }

  /**
   * Check if the manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the total number of loaded skills
   */
  getSkillCount(): number {
    return this.skillTemplates.size;
  }

  /**
   * Set the maximum skill points
   */
  setMaxSkillPoints(max: number): void {
    this.maxSkillPoints = max;
  }

  /**
   * Get the maximum skill points
   */
  getMaxSkillPoints(): number {
    return this.maxSkillPoints;
  }

  // ============================================
  // Event Registration
  // ============================================

  /**
   * Register a handler for skill learned events
   */
  onSkillLearned(handler: SkillLearnedHandler): void {
    this.skillLearnedHandlers.add(handler);
  }

  /**
   * Remove a skill learned handler
   */
  offSkillLearned(handler: SkillLearnedHandler): void {
    this.skillLearnedHandlers.delete(handler);
  }

  /**
   * Register a handler for skill surrendered events
   */
  onSkillSurrendered(handler: SkillSurrenderedHandler): void {
    this.skillSurrenderedHandlers.add(handler);
  }

  /**
   * Remove a skill surrendered handler
   */
  offSkillSurrendered(handler: SkillSurrenderedHandler): void {
    this.skillSurrenderedHandlers.delete(handler);
  }

  /**
   * Emit a skill learned event
   */
  private emitSkillLearned(event: SkillLearnedEvent): void {
    for (const handler of this.skillLearnedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in skill learned handler:', error);
      }
    }
  }

  /**
   * Emit a skill surrendered event
   */
  private emitSkillSurrendered(event: SkillSurrenderedEvent): void {
    for (const handler of this.skillSurrenderedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in skill surrendered handler:', error);
      }
    }
  }

  // ============================================
  // Skill Info Methods
  // ============================================

  /**
   * Get a skill by name
   * @param skillName - The skill name to look up
   */
  getSkill(skillName: string): SkillTemplate | undefined {
    return this.skillTemplates.get(skillName);
  }

  /**
   * Get all skills in a tree starting from a root skill
   * @param rootSkill - The root skill name (typically a novice skill)
   */
  getSkillTree(rootSkill: string): SkillTemplate[] {
    const result: SkillTemplate[] = [];
    const visited = new Set<string>();

    const collectTree = (skillName: string): void => {
      if (visited.has(skillName)) return;
      visited.add(skillName);

      const skill = this.skillTemplates.get(skillName);
      if (!skill) return;

      result.push(skill);

      // Collect children
      const node = this.skillTree.get(skillName);
      if (node) {
        for (const childName of node.childSkills) {
          collectTree(childName);
        }
      }
    };

    collectTree(rootSkill);
    return result;
  }

  /**
   * Get child skills of a skill
   * @param skillName - The parent skill name
   */
  getChildSkills(skillName: string): SkillTemplate[] {
    const node = this.skillTree.get(skillName);
    if (!node) return [];

    return node.childSkills
      .map((name) => this.skillTemplates.get(name))
      .filter((s): s is SkillTemplate => s !== undefined);
  }

  /**
   * Get all skills that require a specific skill
   * @param skillName - The prerequisite skill name
   */
  getDependentSkills(skillName: string): SkillTemplate[] {
    const dependents: SkillTemplate[] = [];

    for (const [, skill] of this.skillTemplates) {
      if (
        skill.parentSkill === skillName ||
        skill.requiredSkills.includes(skillName)
      ) {
        dependents.push(skill);
      }
    }

    return dependents;
  }

  /**
   * Get all skills
   */
  getAllSkills(): SkillTemplate[] {
    return Array.from(this.skillTemplates.values());
  }

  /**
   * Get all novice (entry point) skills
   */
  getNoviceSkills(): SkillTemplate[] {
    return this.getAllSkills().filter(isNoviceSkill);
  }

  /**
   * Get all master skills
   */
  getMasterSkills(): SkillTemplate[] {
    return this.getAllSkills().filter((s) => s.isMaster);
  }

  // ============================================
  // Skill Point Tracking
  // ============================================

  /**
   * Calculate total skill points used by a player
   * @param player - The player object
   */
  calculateUsedSkillPoints(player: PlayerObject): number {
    let total = 0;

    for (const skillName of player.skills) {
      const skill = this.skillTemplates.get(skillName);
      if (skill) {
        total += skill.skillPointsRequired;
      }
    }

    return total;
  }

  /**
   * Get available skill points for a player
   * @param player - The player object
   */
  getAvailableSkillPoints(player: PlayerObject): number {
    return this.maxSkillPoints - this.calculateUsedSkillPoints(player);
  }

  // ============================================
  // Skill Acquisition
  // ============================================

  /**
   * Check if a player can learn a skill
   * @param player - The player object
   * @param skillName - The skill to check
   */
  canLearnSkill(player: PlayerObject, skillName: string): SkillRequirementResult {
    const result: SkillRequirementResult = {
      canLearn: true,
      missingPrerequisites: [],
      missingXp: [],
      missingSkillPoints: 0,
      speciesRestricted: false,
      alreadyHasSkill: false,
    };

    const skill = this.skillTemplates.get(skillName);
    if (!skill) {
      result.canLearn = false;
      return result;
    }

    // Check if already has skill
    if (player.skills.has(skillName)) {
      result.canLearn = false;
      result.alreadyHasSkill = true;
      return result;
    }

    // Check species restriction
    const speciesName = this.getSpeciesName(player.species);
    if (!canSpeciesLearnSkill(skill, speciesName)) {
      result.canLearn = false;
      result.speciesRestricted = true;
      return result;
    }

    // Check parent skill prerequisite
    if (skill.parentSkill && !player.skills.has(skill.parentSkill)) {
      result.canLearn = false;
      result.missingPrerequisites.push(skill.parentSkill);
    }

    // Check required skills
    for (const reqSkill of skill.requiredSkills) {
      if (!player.skills.has(reqSkill)) {
        result.canLearn = false;
        result.missingPrerequisites.push(reqSkill);
      }
    }

    // Check XP requirements
    if (skill.xpCost > 0 && skill.xpType) {
      const currentXp = player.getExperience(skill.xpType);
      if (currentXp < skill.xpCost) {
        result.canLearn = false;
        result.missingXp.push({
          type: skill.xpType,
          required: skill.xpCost,
          current: currentXp,
        });
      }
    }

    // Check skill points
    const availablePoints = this.getAvailableSkillPoints(player);
    if (skill.skillPointsRequired > availablePoints) {
      result.canLearn = false;
      result.missingSkillPoints = skill.skillPointsRequired - availablePoints;
    }

    return result;
  }

  /**
   * Learn a skill for a player
   * @param player - The player object
   * @param skillName - The skill to learn
   */
  learnSkill(player: PlayerObject, skillName: string): LearnSkillResult {
    const result: LearnSkillResult = {
      success: false,
      skillName,
      modsGained: new Map(),
      commandsGained: [],
      certificationsGained: [],
      xpSpent: { type: '', amount: 0 },
      isMaster: false,
    };

    // Check if can learn
    const canLearnResult = this.canLearnSkill(player, skillName);
    if (!canLearnResult.canLearn) {
      result.error = this.formatCannotLearnError(canLearnResult);
      return result;
    }

    const skill = this.skillTemplates.get(skillName);
    if (!skill) {
      result.error = `Skill '${skillName}' not found`;
      return result;
    }

    // Deduct XP
    if (skill.xpCost > 0 && skill.xpType) {
      const currentXp = player.getExperience(skill.xpType);
      player.setExperience(skill.xpType, currentXp - skill.xpCost);
      result.xpSpent = { type: skill.xpType, amount: skill.xpCost };
    }

    // Add skill to player
    player.addSkill(skillName);

    // Apply skill mods
    for (const [modName, modValue] of skill.skillMods) {
      const currentMod = player.getSkillMod(modName);
      player.setSkillMod(modName, currentMod + modValue);
      result.modsGained.set(modName, modValue);
    }

    // Track granted commands
    result.commandsGained = [...skill.commands];

    // Track granted certifications
    result.certificationsGained = [...skill.certifications];

    // Check for mastery
    result.isMaster = skill.isMaster;
    if (skill.isMaster && skill.professionName) {
      result.professionMastered = skill.professionName;
      // Update profession title
      player.setProfessionTitle(`Master ${skill.professionName}`);
    }

    result.success = true;

    // Emit event
    this.emitSkillLearned({
      playerId: player.objectId,
      skillName,
      isMaster: result.isMaster,
      professionMastered: result.professionMastered,
    });

    return result;
  }

  /**
   * Format an error message for a failed canLearnSkill check
   */
  private formatCannotLearnError(result: SkillRequirementResult): string {
    if (result.alreadyHasSkill) {
      return 'You already have this skill';
    }
    if (result.speciesRestricted) {
      return 'Your species cannot learn this skill';
    }
    if (result.missingPrerequisites.length > 0) {
      return `Missing prerequisite skills: ${result.missingPrerequisites.join(', ')}`;
    }
    if (result.missingXp.length > 0) {
      const xpInfo = result.missingXp
        .map((x) => `${x.type}: need ${x.required}, have ${x.current}`)
        .join('; ');
      return `Insufficient experience: ${xpInfo}`;
    }
    if (result.missingSkillPoints > 0) {
      return `Need ${result.missingSkillPoints} more skill points`;
    }
    return 'Cannot learn this skill';
  }

  // ============================================
  // Skill Surrender
  // ============================================

  /**
   * Check if a player can surrender a skill
   * @param player - The player object
   * @param skillName - The skill to check
   */
  canSurrenderSkill(player: PlayerObject, skillName: string): boolean {
    // Must have the skill
    if (!player.skills.has(skillName)) {
      return false;
    }

    const skill = this.skillTemplates.get(skillName);
    if (!skill) {
      return false;
    }

    // Novice skills cannot be surrendered if it's the player's only profession
    if (isNoviceSkill(skill)) {
      // Count how many novice skills the player has
      let noviceCount = 0;
      for (const playerSkill of player.skills) {
        const template = this.skillTemplates.get(playerSkill);
        if (template && isNoviceSkill(template)) {
          noviceCount++;
        }
      }
      // Cannot surrender if it's the only novice skill
      if (noviceCount <= 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Surrender a skill for a player
   * This will also recursively surrender any skills that depend on this one
   * @param player - The player object
   * @param skillName - The skill to surrender
   */
  surrenderSkill(player: PlayerObject, skillName: string): SurrenderSkillResult {
    const result: SurrenderSkillResult = {
      success: false,
      skillName,
      dependentSkillsSurrendered: [],
      modsLost: new Map(),
      commandsLost: [],
      certificationsLost: [],
    };

    if (!this.canSurrenderSkill(player, skillName)) {
      result.error = 'Cannot surrender this skill';
      return result;
    }

    const skill = this.skillTemplates.get(skillName);
    if (!skill) {
      result.error = `Skill '${skillName}' not found`;
      return result;
    }

    // Find and surrender all dependent skills first
    const dependentsToSurrender = this.findDependentSkillsToSurrender(player, skillName);

    // Surrender dependents in reverse order (children before parents)
    for (const depSkillName of dependentsToSurrender.reverse()) {
      const depResult = this.surrenderSingleSkill(player, depSkillName);
      if (depResult.success) {
        result.dependentSkillsSurrendered.push(depSkillName);
        // Accumulate lost mods/commands/certs
        for (const [mod, value] of depResult.modsLost) {
          const existing = result.modsLost.get(mod) ?? 0;
          result.modsLost.set(mod, existing + value);
        }
        result.commandsLost.push(...depResult.commandsLost);
        result.certificationsLost.push(...depResult.certificationsLost);
      }
    }

    // Surrender the target skill
    const mainResult = this.surrenderSingleSkill(player, skillName);
    if (mainResult.success) {
      for (const [mod, value] of mainResult.modsLost) {
        const existing = result.modsLost.get(mod) ?? 0;
        result.modsLost.set(mod, existing + value);
      }
      result.commandsLost.push(...mainResult.commandsLost);
      result.certificationsLost.push(...mainResult.certificationsLost);
      result.success = true;
    } else {
      result.error = mainResult.error;
      return result;
    }

    // Emit event
    this.emitSkillSurrendered({
      playerId: player.objectId,
      skillName,
      dependentSkillsSurrendered: result.dependentSkillsSurrendered,
    });

    return result;
  }

  /**
   * Find all skills that depend on a given skill and that the player has
   */
  private findDependentSkillsToSurrender(player: PlayerObject, skillName: string): string[] {
    const result: string[] = [];
    const visited = new Set<string>();

    const findDependents = (name: string): void => {
      if (visited.has(name)) return;
      visited.add(name);

      for (const [otherName, template] of this.skillTemplates) {
        if (!player.skills.has(otherName)) continue;
        if (otherName === skillName) continue;

        const isDependent =
          template.parentSkill === name || template.requiredSkills.includes(name);

        if (isDependent && !result.includes(otherName)) {
          result.push(otherName);
          // Recursively find dependents of this dependent
          findDependents(otherName);
        }
      }
    };

    findDependents(skillName);
    return result;
  }

  /**
   * Surrender a single skill (no dependency checking)
   */
  private surrenderSingleSkill(player: PlayerObject, skillName: string): SurrenderSkillResult {
    const result: SurrenderSkillResult = {
      success: false,
      skillName,
      dependentSkillsSurrendered: [],
      modsLost: new Map(),
      commandsLost: [],
      certificationsLost: [],
    };

    const skill = this.skillTemplates.get(skillName);
    if (!skill) {
      result.error = `Skill '${skillName}' not found`;
      return result;
    }

    if (!player.skills.has(skillName)) {
      result.error = `Player does not have skill '${skillName}'`;
      return result;
    }

    // Remove skill from player
    player.removeSkill(skillName);

    // Remove skill mods
    for (const [modName, modValue] of skill.skillMods) {
      const currentMod = player.getSkillMod(modName);
      const newValue = currentMod - modValue;
      if (newValue <= 0) {
        player.removeSkillMod(modName);
      } else {
        player.setSkillMod(modName, newValue);
      }
      result.modsLost.set(modName, modValue);
    }

    // Track lost commands
    result.commandsLost = [...skill.commands];

    // Track lost certifications
    result.certificationsLost = [...skill.certifications];

    result.success = true;
    return result;
  }

  // ============================================
  // Skill Mod Calculations
  // ============================================

  /**
   * Calculate all skill mods for a player based on their skills
   * @param player - The player object
   */
  calculateSkillMods(player: PlayerObject): Map<string, number> {
    const mods = new Map<string, number>();

    for (const skillName of player.skills) {
      const skill = this.skillTemplates.get(skillName);
      if (skill) {
        for (const [modName, modValue] of skill.skillMods) {
          const current = mods.get(modName) ?? 0;
          mods.set(modName, current + modValue);
        }
      }
    }

    return mods;
  }

  /**
   * Get a specific skill mod value for a player
   * This calculates from the player's skills, not from the stored skillMods map
   * @param player - The player object
   * @param modName - The mod name to look up
   */
  getSkillMod(player: PlayerObject, modName: string): number {
    let total = 0;

    for (const skillName of player.skills) {
      const skill = this.skillTemplates.get(skillName);
      if (skill) {
        total += skill.skillMods.get(modName) ?? 0;
      }
    }

    return total;
  }

  /**
   * Recalculate and update all skill mods on a player
   * Useful for fixing desync or after loading
   * @param player - The player object
   */
  recalculatePlayerSkillMods(player: PlayerObject): void {
    // Clear existing mods
    const currentMods = Array.from(player.skillMods.keys());
    for (const modName of currentMods) {
      player.removeSkillMod(modName);
    }

    // Recalculate from skills
    const calculatedMods = this.calculateSkillMods(player);
    for (const [modName, value] of calculatedMods) {
      player.setSkillMod(modName, value);
    }
  }

  // ============================================
  // Certifications
  // ============================================

  /**
   * Check if a player has a specific certification
   * @param player - The player object
   * @param certification - The certification to check
   */
  hasCertification(player: PlayerObject, certification: string): boolean {
    for (const skillName of player.skills) {
      const skill = this.skillTemplates.get(skillName);
      if (skill && skill.certifications.includes(certification)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all certifications a player has
   * @param player - The player object
   */
  getCertifications(player: PlayerObject): string[] {
    const certifications = new Set<string>();

    for (const skillName of player.skills) {
      const skill = this.skillTemplates.get(skillName);
      if (skill) {
        for (const cert of skill.certifications) {
          certifications.add(cert);
        }
      }
    }

    return Array.from(certifications);
  }

  // ============================================
  // Commands
  // ============================================

  /**
   * Get all commands granted by a player's skills
   * @param player - The player object
   */
  getGrantedCommands(player: PlayerObject): string[] {
    const commands = new Set<string>();

    for (const skillName of player.skills) {
      const skill = this.skillTemplates.get(skillName);
      if (skill) {
        for (const cmd of skill.commands) {
          commands.add(cmd);
        }
      }
    }

    return Array.from(commands);
  }

  /**
   * Check if a player has a specific command
   * @param player - The player object
   * @param commandName - The command to check
   */
  hasCommand(player: PlayerObject, commandName: string): boolean {
    for (const skillName of player.skills) {
      const skill = this.skillTemplates.get(skillName);
      if (skill && skill.commands.includes(commandName)) {
        return true;
      }
    }
    return false;
  }

  // ============================================
  // Master Title Handling
  // ============================================

  /**
   * Check if a player has all boxes for a master skill
   * @param player - The player object
   * @param professionName - The profession to check
   */
  hasMasteredProfession(player: PlayerObject, professionName: string): boolean {
    return hasMasteredProfession(player.skills, professionName);
  }

  /**
   * Get mastery progress for a profession
   * @param player - The player object
   * @param professionName - The profession to check
   */
  getMasteryProgress(
    player: PlayerObject,
    professionName: string
  ): { completed: number; total: number; percentage: number } {
    return getMasteryProgress(player.skills, professionName);
  }

  /**
   * Get all professions a player has mastered
   * @param player - The player object
   */
  getMasteredProfessions(player: PlayerObject): string[] {
    const mastered: string[] = [];

    for (const profName of Object.keys(AllProfessions)) {
      if (this.hasMasteredProfession(player, profName)) {
        mastered.push(profName);
      }
    }

    return mastered;
  }

  /**
   * Get the best title available for a player based on their skills
   * Prefers master titles over regular skill titles
   * @param player - The player object
   */
  getBestTitle(player: PlayerObject): string | undefined {
    // First check for master titles
    for (const skillName of player.skills) {
      const skill = this.skillTemplates.get(skillName);
      if (skill && skill.isMaster && skill.isTitle) {
        return `Master ${skill.professionName}`;
      }
    }

    // Then check for highest-level title skill
    let bestSkill: SkillTemplate | undefined;
    let bestDepth = -1;

    for (const skillName of player.skills) {
      const skill = this.skillTemplates.get(skillName);
      if (skill && skill.isTitle) {
        const node = this.skillTree.get(skillName);
        if (node && node.treeDepth > bestDepth) {
          bestDepth = node.treeDepth;
          bestSkill = skill;
        }
      }
    }

    return bestSkill?.professionName;
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get the path from a skill to its root
   * @param skillName - The skill name
   */
  getSkillPath(skillName: string): string[] {
    return getSkillPath(this.skillTree, skillName);
  }

  /**
   * Get all prerequisites for a skill
   * @param skillName - The skill name
   */
  getAllPrerequisites(skillName: string): Set<string> {
    return getAllPrerequisites(this.skillTree, skillName);
  }

  /**
   * Convert species enum value to string name
   */
  private getSpeciesName(speciesValue: number): string {
    const speciesNames: Record<number, string> = {
      0: 'human',
      1: 'rodian',
      2: 'trandoshan',
      3: 'mon_calamari',
      4: 'wookiee',
      5: 'bothan',
      6: 'twilek',
      7: 'zabrak',
      8: 'ithorian',
      9: 'sullustan',
    };
    return speciesNames[speciesValue] ?? 'human';
  }

  /**
   * Get all skills in a profession
   * @param professionName - The profession name
   */
  getSkillsByProfession(professionName: string): SkillTemplate[] {
    return this.getAllSkills().filter(
      (s) => s.professionName.toLowerCase() === professionName.toLowerCase()
    );
  }
}

// Export a singleton instance for convenience
export const skillManager = new SkillManager();
