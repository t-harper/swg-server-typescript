/**
 * Skill Template - Defines skill requirements and benefits
 *
 * Skills in SWG are organized into skill trees. Each skill box requires
 * XP costs and provides XP cap increases, skill mods, abilities, and
 * sometimes schematics.
 */

import type { CrcValue } from '@swg/shared-types';
import type { XpTypeValue } from './xp-types.js';

/**
 * Skill template definition
 */
export interface SkillTemplate {
  /** Unique skill name identifier (e.g., 'brawler_novice') */
  name: string;

  /** Display name shown to players */
  displayName: string;

  /** Parent skill (must have this to learn) */
  parentSkill: string | null;

  /** Required XP by type to learn this skill */
  xpCost: Map<XpTypeValue | string, number>;

  /** XP cap increases granted by this skill */
  xpCapIncrease: Map<XpTypeValue | string, number>;

  /** Skill modifiers granted (skill mod name -> value) */
  skillMods: Map<string, number>;

  /** Abilities granted by this skill */
  abilities: string[];

  /** Schematics granted by this skill (CRC values) */
  schematics: CrcValue[];

  /** Commands granted by this skill */
  commands: string[];

  /** Credit cost to learn (if any) */
  creditCost: number;

  /** Skill points required to learn */
  skillPointCost: number;

  /** Species restrictions (empty = all species) */
  speciesRestrictions: string[];

  /** Whether this is a novice/starting skill */
  isNovice: boolean;

  /** Whether this is a master skill */
  isMaster: boolean;

  /** Profession this skill belongs to */
  profession: string;

  /** Skill graph index (for UI tree display) */
  graphIndex: number;

  /** Description text */
  description: string;

  /** Title granted when learned (if any) */
  title: string | null;

  /** Badge granted when learned (if any) */
  badge: CrcValue | null;
}

/**
 * Create a new skill template with default values
 */
export function createSkillTemplate(
  name: string,
  options: Partial<Omit<SkillTemplate, 'name'>> = {}
): SkillTemplate {
  return {
    name,
    displayName: options.displayName ?? name,
    parentSkill: options.parentSkill ?? null,
    xpCost: options.xpCost ?? new Map(),
    xpCapIncrease: options.xpCapIncrease ?? new Map(),
    skillMods: options.skillMods ?? new Map(),
    abilities: options.abilities ?? [],
    schematics: options.schematics ?? [],
    commands: options.commands ?? [],
    creditCost: options.creditCost ?? 0,
    skillPointCost: options.skillPointCost ?? 0,
    speciesRestrictions: options.speciesRestrictions ?? [],
    isNovice: options.isNovice ?? false,
    isMaster: options.isMaster ?? false,
    profession: options.profession ?? '',
    graphIndex: options.graphIndex ?? 0,
    description: options.description ?? '',
    title: options.title ?? null,
    badge: options.badge ?? null,
  };
}

/**
 * Skill registry for looking up skill templates
 */
export class SkillRegistry {
  private skills: Map<string, SkillTemplate> = new Map();
  private skillsByProfession: Map<string, Set<string>> = new Map();
  private childSkills: Map<string, Set<string>> = new Map();

  /**
   * Register a skill template
   */
  register(skill: SkillTemplate): void {
    this.skills.set(skill.name, skill);

    // Index by profession
    if (skill.profession) {
      if (!this.skillsByProfession.has(skill.profession)) {
        this.skillsByProfession.set(skill.profession, new Set());
      }
      this.skillsByProfession.get(skill.profession)!.add(skill.name);
    }

    // Index child skills
    if (skill.parentSkill) {
      if (!this.childSkills.has(skill.parentSkill)) {
        this.childSkills.set(skill.parentSkill, new Set());
      }
      this.childSkills.get(skill.parentSkill)!.add(skill.name);
    }
  }

  /**
   * Get a skill template by name
   */
  get(name: string): SkillTemplate | undefined {
    return this.skills.get(name);
  }

  /**
   * Check if a skill exists
   */
  has(name: string): boolean {
    return this.skills.has(name);
  }

  /**
   * Get all skills in a profession
   */
  getByProfession(profession: string): SkillTemplate[] {
    const skillNames = this.skillsByProfession.get(profession);
    if (!skillNames) return [];
    return Array.from(skillNames)
      .map((name) => this.skills.get(name)!)
      .filter((skill) => skill !== undefined);
  }

  /**
   * Get child skills of a skill
   */
  getChildSkills(parentSkill: string): SkillTemplate[] {
    const childNames = this.childSkills.get(parentSkill);
    if (!childNames) return [];
    return Array.from(childNames)
      .map((name) => this.skills.get(name)!)
      .filter((skill) => skill !== undefined);
  }

  /**
   * Get all novice skills (entry points to professions)
   */
  getNoviceSkills(): SkillTemplate[] {
    return Array.from(this.skills.values()).filter((skill) => skill.isNovice);
  }

  /**
   * Get all master skills
   */
  getMasterSkills(): SkillTemplate[] {
    return Array.from(this.skills.values()).filter((skill) => skill.isMaster);
  }

  /**
   * Get the skill chain from a skill to its root
   */
  getSkillChain(skillName: string): SkillTemplate[] {
    const chain: SkillTemplate[] = [];
    let current = this.skills.get(skillName);

    while (current) {
      chain.unshift(current);
      current = current.parentSkill ? this.skills.get(current.parentSkill) : undefined;
    }

    return chain;
  }

  /**
   * Get total XP cost to learn a skill including prerequisites
   */
  getTotalXpCost(skillName: string): Map<string, number> {
    const chain = this.getSkillChain(skillName);
    const totalCost = new Map<string, number>();

    for (const skill of chain) {
      for (const [xpType, cost] of skill.xpCost) {
        const current = totalCost.get(xpType) ?? 0;
        totalCost.set(xpType, current + cost);
      }
    }

    return totalCost;
  }

  /**
   * Get all skill names
   */
  getAllSkillNames(): string[] {
    return Array.from(this.skills.keys());
  }

  /**
   * Get all professions
   */
  getAllProfessions(): string[] {
    return Array.from(this.skillsByProfession.keys());
  }

  /**
   * Clear all registered skills
   */
  clear(): void {
    this.skills.clear();
    this.skillsByProfession.clear();
    this.childSkills.clear();
  }
}

/**
 * Global skill registry singleton
 */
let globalSkillRegistry: SkillRegistry | null = null;

/**
 * Get the global skill registry
 */
export function getSkillRegistry(): SkillRegistry {
  if (!globalSkillRegistry) {
    globalSkillRegistry = new SkillRegistry();
  }
  return globalSkillRegistry;
}

/**
 * Create a new skill registry (for testing)
 */
export function createSkillRegistry(): SkillRegistry {
  return new SkillRegistry();
}
