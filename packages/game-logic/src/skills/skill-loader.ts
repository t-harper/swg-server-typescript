/**
 * Skill Tree Loader
 * Loads and parses skill definitions from datatable JSON files
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  SkillTemplate,
  SkillTemplateData,
  SkillTreeNode,
  convertToSkillTemplate,
} from './skill-template.js';

/**
 * Error thrown when skill loading fails
 */
export class SkillLoadError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SkillLoadError';
  }
}

/**
 * Error thrown when skill validation fails
 */
export class SkillValidationError extends Error {
  constructor(
    message: string,
    public readonly skillName: string
  ) {
    super(`Skill '${skillName}': ${message}`);
    this.name = 'SkillValidationError';
  }
}

/**
 * Skill datatable file format
 */
interface SkillDatatableFile {
  version: number;
  skills: SkillTemplateData[];
}

/**
 * Load a single skill datatable JSON file
 */
async function loadSkillDatatable(filePath: string): Promise<SkillTemplateData[]> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as SkillDatatableFile;

    if (typeof data.version !== 'number') {
      throw new Error('Missing or invalid version field');
    }

    if (!Array.isArray(data.skills)) {
      throw new Error('Missing or invalid skills array');
    }

    return data.skills;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new SkillLoadError(`Invalid JSON in ${filePath}`, error);
    }
    throw new SkillLoadError(
      `Failed to load ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate a skill template data structure
 */
function validateSkillData(data: SkillTemplateData): void {
  if (!data.skillName || typeof data.skillName !== 'string') {
    throw new SkillValidationError('Missing or invalid skillName', data.skillName || 'unknown');
  }

  if (typeof data.xpCost !== 'number' || data.xpCost < 0) {
    throw new SkillValidationError('Invalid xpCost', data.skillName);
  }

  if (typeof data.xpCap !== 'number' || data.xpCap < 0) {
    throw new SkillValidationError('Invalid xpCap', data.skillName);
  }

  if (typeof data.skillPointsRequired !== 'number' || data.skillPointsRequired < 0) {
    throw new SkillValidationError('Invalid skillPointsRequired', data.skillName);
  }

  if (!Array.isArray(data.requiredSkills)) {
    throw new SkillValidationError('requiredSkills must be an array', data.skillName);
  }

  if (!Array.isArray(data.requiredSpecies)) {
    throw new SkillValidationError('requiredSpecies must be an array', data.skillName);
  }

  if (!Array.isArray(data.commands)) {
    throw new SkillValidationError('commands must be an array', data.skillName);
  }

  if (!Array.isArray(data.certifications)) {
    throw new SkillValidationError('certifications must be an array', data.skillName);
  }

  if (typeof data.skillMods !== 'object' || data.skillMods === null) {
    throw new SkillValidationError('skillMods must be an object', data.skillName);
  }
}

/**
 * Validate skill prerequisites exist in the skill tree
 */
function validatePrerequisites(
  skills: Map<string, SkillTemplate>,
  errors: string[]
): void {
  for (const [skillName, skill] of skills) {
    // Check parent skill exists
    if (skill.parentSkill && !skills.has(skill.parentSkill)) {
      errors.push(`Skill '${skillName}' has invalid parent skill '${skill.parentSkill}'`);
    }

    // Check required skills exist
    for (const reqSkill of skill.requiredSkills) {
      if (!skills.has(reqSkill)) {
        errors.push(`Skill '${skillName}' requires non-existent skill '${reqSkill}'`);
      }
    }
  }
}

/**
 * Detect circular dependencies in the skill tree
 */
function detectCircularDependencies(
  skills: Map<string, SkillTemplate>,
  errors: string[]
): void {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(skillName: string): boolean {
    if (recursionStack.has(skillName)) {
      return true;
    }
    if (visited.has(skillName)) {
      return false;
    }

    visited.add(skillName);
    recursionStack.add(skillName);

    const skill = skills.get(skillName);
    if (skill) {
      if (skill.parentSkill && hasCycle(skill.parentSkill)) {
        return true;
      }
      for (const reqSkill of skill.requiredSkills) {
        if (hasCycle(reqSkill)) {
          return true;
        }
      }
    }

    recursionStack.delete(skillName);
    return false;
  }

  for (const skillName of skills.keys()) {
    if (!visited.has(skillName) && hasCycle(skillName)) {
      errors.push(`Circular dependency detected involving skill '${skillName}'`);
    }
  }
}

/**
 * Build parent-child relationships in the skill tree
 */
function buildTreeRelationships(skills: Map<string, SkillTemplate>): Map<string, SkillTreeNode> {
  const tree = new Map<string, SkillTreeNode>();

  // Initialize all nodes
  for (const [skillName, skill] of skills) {
    tree.set(skillName, {
      ...skill,
      childSkills: [],
      treeDepth: 0,
    });
  }

  // Build child relationships
  for (const [skillName, skill] of skills) {
    if (skill.parentSkill) {
      const parent = tree.get(skill.parentSkill);
      if (parent) {
        parent.childSkills.push(skillName);
      }
    }
  }

  // Calculate tree depths
  function calculateDepth(skillName: string): number {
    const node = tree.get(skillName);
    if (!node) return 0;

    if (node.treeDepth > 0) return node.treeDepth;

    if (!node.parentSkill) {
      node.treeDepth = 0;
      return 0;
    }

    node.treeDepth = calculateDepth(node.parentSkill) + 1;
    return node.treeDepth;
  }

  for (const skillName of tree.keys()) {
    calculateDepth(skillName);
  }

  return tree;
}

/**
 * Options for loading skill trees
 */
export interface LoadSkillTreeOptions {
  /** Whether to validate prerequisites (default: true) */
  validatePrerequisites?: boolean;
  /** Whether to detect circular dependencies (default: true) */
  detectCircular?: boolean;
  /** Whether to throw on validation errors or just log them (default: true) */
  strict?: boolean;
}

/**
 * Result of loading a skill tree
 */
export interface LoadSkillTreeResult {
  /** Loaded skills */
  skills: Map<string, SkillTemplate>;
  /** Skill tree with relationships */
  tree: Map<string, SkillTreeNode>;
  /** Validation warnings (non-fatal issues) */
  warnings: string[];
  /** Number of skills loaded */
  count: number;
}

/**
 * Load skill tree from a directory of JSON datatable files
 * @param dataPath - Path to directory containing skill JSON files
 * @param options - Loading options
 * @returns Map of skill name to skill template
 */
export async function loadSkillTree(
  dataPath: string,
  options: LoadSkillTreeOptions = {}
): Promise<LoadSkillTreeResult> {
  const {
    validatePrerequisites: shouldValidatePrereqs = true,
    detectCircular = true,
    strict = true,
  } = options;

  const skills = new Map<string, SkillTemplate>();
  const warnings: string[] = [];

  // Load all JSON files from the data path
  const { readdir } = await import('fs/promises');
  const files = await readdir(dataPath);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    throw new SkillLoadError(`No skill JSON files found in ${dataPath}`);
  }

  // Load and validate each file
  for (const file of jsonFiles) {
    const filePath = join(dataPath, file);
    const skillsData = await loadSkillDatatable(filePath);

    for (const data of skillsData) {
      try {
        validateSkillData(data);

        if (skills.has(data.skillName)) {
          warnings.push(`Duplicate skill '${data.skillName}' in ${file}, using latest`);
        }

        skills.set(data.skillName, convertToSkillTemplate(data));
      } catch (error) {
        if (strict && error instanceof SkillValidationError) {
          throw error;
        }
        warnings.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  // Validate prerequisites
  const validationErrors: string[] = [];

  if (shouldValidatePrereqs) {
    validatePrerequisites(skills, validationErrors);
  }

  if (detectCircular) {
    detectCircularDependencies(skills, validationErrors);
  }

  if (strict && validationErrors.length > 0) {
    throw new SkillValidationError(
      `Validation failed: ${validationErrors.join('; ')}`,
      'tree'
    );
  }

  warnings.push(...validationErrors);

  // Build tree relationships
  const tree = buildTreeRelationships(skills);

  return {
    skills,
    tree,
    warnings,
    count: skills.size,
  };
}

/**
 * Load a single skill datatable file (convenience function)
 * @param filePath - Path to skill JSON file
 * @returns Map of skill name to skill template
 */
export async function loadSkillFile(filePath: string): Promise<Map<string, SkillTemplate>> {
  const skillsData = await loadSkillDatatable(filePath);
  const skills = new Map<string, SkillTemplate>();

  for (const data of skillsData) {
    validateSkillData(data);
    skills.set(data.skillName, convertToSkillTemplate(data));
  }

  return skills;
}

/**
 * Get all skills in a profession
 */
export function getSkillsByProfession(
  tree: Map<string, SkillTreeNode>,
  professionName: string
): SkillTreeNode[] {
  return Array.from(tree.values()).filter(
    (skill) => skill.professionName.toLowerCase() === professionName.toLowerCase()
  );
}

/**
 * Get all master skills
 */
export function getMasterSkills(tree: Map<string, SkillTreeNode>): SkillTreeNode[] {
  return Array.from(tree.values()).filter((skill) => skill.isMaster);
}

/**
 * Get all novice skills (entry points)
 */
export function getNoviceSkills(tree: Map<string, SkillTreeNode>): SkillTreeNode[] {
  return Array.from(tree.values()).filter(
    (skill) => skill.parentSkill === null && skill.skillName.includes('novice')
  );
}

/**
 * Get the path from a skill to its root (novice) skill
 */
export function getSkillPath(
  tree: Map<string, SkillTreeNode>,
  skillName: string
): string[] {
  const path: string[] = [];
  let current = skillName;

  while (current) {
    path.unshift(current);
    const skill = tree.get(current);
    if (!skill?.parentSkill) break;
    current = skill.parentSkill;
  }

  return path;
}

/**
 * Get all skills required to learn a target skill
 */
export function getAllPrerequisites(
  tree: Map<string, SkillTreeNode>,
  skillName: string
): Set<string> {
  const prerequisites = new Set<string>();
  const visited = new Set<string>();

  function collect(name: string): void {
    if (visited.has(name)) return;
    visited.add(name);

    const skill = tree.get(name);
    if (!skill) return;

    if (skill.parentSkill) {
      prerequisites.add(skill.parentSkill);
      collect(skill.parentSkill);
    }

    for (const req of skill.requiredSkills) {
      prerequisites.add(req);
      collect(req);
    }
  }

  collect(skillName);
  return prerequisites;
}

/**
 * Calculate total XP cost to learn a skill (including prerequisites)
 */
export function calculateTotalXpCost(
  tree: Map<string, SkillTreeNode>,
  skillName: string
): Map<string, number> {
  const xpCosts = new Map<string, number>();
  const prerequisites = getAllPrerequisites(tree, skillName);
  prerequisites.add(skillName);

  for (const reqSkill of prerequisites) {
    const skill = tree.get(reqSkill);
    if (skill && skill.xpCost > 0) {
      const currentCost = xpCosts.get(skill.xpType) ?? 0;
      xpCosts.set(skill.xpType, currentCost + skill.xpCost);
    }
  }

  return xpCosts;
}

/**
 * Calculate total skill points required for a skill (including prerequisites)
 */
export function calculateTotalSkillPoints(
  tree: Map<string, SkillTreeNode>,
  skillName: string
): number {
  const prerequisites = getAllPrerequisites(tree, skillName);
  prerequisites.add(skillName);

  let total = 0;
  for (const reqSkill of prerequisites) {
    const skill = tree.get(reqSkill);
    if (skill) {
      total += skill.skillPointsRequired;
    }
  }

  return total;
}
