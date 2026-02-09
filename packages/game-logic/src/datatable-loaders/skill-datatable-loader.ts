import type { DataTableManager } from '@swg/datatable';
import type { SkillTemplate, SkillTreeNode } from '../skills/skill-template.js';

export interface SkillLoadResult {
  loaded: number;
  skipped: number;
  errors: string[];
  skills: Map<string, SkillTemplate>;
  tree: Map<string, SkillTreeNode>;
}

/**
 * Loads skills from the DTII binary datatable at datatables/skill/skills.iff
 * Produces maps compatible with SkillManager
 */
export function loadSkillsFromDatatable(dtManager: DataTableManager): SkillLoadResult {
  const result: SkillLoadResult = {
    loaded: 0,
    skipped: 0,
    errors: [],
    skills: new Map(),
    tree: new Map(),
  };

  const table = dtManager.getTable('datatables/skill/skills.iff');
  if (!table) {
    result.errors.push('Failed to load datatables/skill/skills.iff');
    return result;
  }

  const rowCount = table.rows.length;

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    try {
      // Skip hidden skills
      const isHidden = dtManager.getIntValue(table, 'IS_HIDDEN', rowIndex);
      if (isHidden === 1) {
        result.skipped++;
        continue;
      }

      // Read core fields
      const skillName = dtManager.getStringValue(table, 'NAME', rowIndex);
      if (!skillName) {
        result.errors.push(`Row ${rowIndex}: missing NAME`);
        continue;
      }

      const parentSkillStr = dtManager.getStringValue(table, 'PARENT', rowIndex);
      const parentSkill = parentSkillStr && parentSkillStr.trim() !== '' ? parentSkillStr : null;

      const graphTypeInt = dtManager.getIntValue(table, 'GRAPH_TYPE', rowIndex) ?? 0;
      const graphType = mapGraphType(graphTypeInt);

      const isTitle = (dtManager.getIntValue(table, 'IS_TITLE', rowIndex) ?? 0) === 1;
      const xpType = dtManager.getStringValue(table, 'XP_TYPE', rowIndex) ?? '';
      const xpCost = dtManager.getIntValue(table, 'XP_COST', rowIndex) ?? 0;
      const xpCap = dtManager.getIntValue(table, 'XP_CAP', rowIndex) ?? 0;
      const skillPointsRequired = dtManager.getIntValue(table, 'POINTS_REQUIRED', rowIndex) ?? 0;

      const skillsRequiredStr = dtManager.getStringValue(table, 'SKILLS_REQUIRED', rowIndex) ?? '';
      const requiredSkills = splitAndFilter(skillsRequiredStr);

      const speciesRequiredStr = dtManager.getStringValue(table, 'SPECIES_REQUIRED', rowIndex) ?? '';
      const requiredSpecies = splitAndFilter(speciesRequiredStr);

      const commandsStr = dtManager.getStringValue(table, 'COMMANDS', rowIndex) ?? '';
      const commands = splitAndFilter(commandsStr);

      const skillModsStr = dtManager.getStringValue(table, 'SKILL_MODS', rowIndex) ?? '';
      const skillMods = parseSkillMods(skillModsStr);

      const schematicsStr = dtManager.getStringValue(table, 'SCHEMATICS_GRANTED', rowIndex) ?? '';
      const certifications = splitAndFilter(schematicsStr);

      // Derive profession name from skill name (first two segments)
      const professionName = deriveProfession(skillName);

      // Check if master skill
      const isMaster = skillName.endsWith('_master');

      const skillTemplate: SkillTemplate = {
        skillName,
        parentSkill,
        graphType,
        isTitle,
        xpType,
        xpCost,
        xpCap,
        skillPointsRequired,
        requiredSkills,
        requiredSpecies,
        skillMods,
        commands,
        certifications,
        professionName,
        isMaster,
      };

      result.skills.set(skillName, skillTemplate);
      result.loaded++;
    } catch (error) {
      result.errors.push(`Row ${rowIndex}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Build tree relationships
  buildTreeRelationships(result.skills, result.tree);

  return result;
}

/**
 * Maps DTII graph type integer to string
 */
function mapGraphType(graphTypeInt: number): string {
  switch (graphTypeInt) {
    case 1: return 'oneByFour';
    case 2: return 'twoByFour';
    case 3: return 'threeByFour';
    case 4: return 'fourByFour';
    case 5: return 'pyramid';
    default: return 'unknown';
  }
}

/**
 * Derives profession name from skill name
 * Takes first two segments separated by underscores
 * e.g. "combat_marksman_novice" -> "combat_marksman"
 */
function deriveProfession(skillName: string): string {
  const parts = skillName.split('_');
  if (parts.length >= 2) {
    return `${parts[0]}_${parts[1]}`;
  }
  return parts[0] || skillName;
}

/**
 * Parses skill mods string "key=val,key=val" into Map<string, number>
 */
function parseSkillMods(s: string): Map<string, number> {
  const map = new Map<string, number>();
  if (!s || s.trim() === '') {
    return map;
  }

  const pairs = s.split(',');
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.substring(0, eqIndex).trim();
    const valueStr = trimmed.substring(eqIndex + 1).trim();
    const value = parseInt(valueStr, 10);

    if (key && !isNaN(value)) {
      map.set(key, value);
    }
  }

  return map;
}

/**
 * Splits comma-separated string and filters empty values
 */
function splitAndFilter(s: string): string[] {
  if (!s || s.trim() === '') {
    return [];
  }

  return s.split(',')
    .map(item => item.trim())
    .filter(item => item !== '');
}

/**
 * Builds tree relationships from flat skill templates
 * Creates SkillTreeNode with childSkills and treeDepth
 */
function buildTreeRelationships(
  skills: Map<string, SkillTemplate>,
  tree: Map<string, SkillTreeNode>
): void {
  // First pass: create tree nodes with empty child arrays
  for (const [skillName, template] of skills) {
    const node: SkillTreeNode = {
      ...template,
      childSkills: [],
      treeDepth: 0,
    };
    tree.set(skillName, node);
  }

  // Second pass: build parent->child links
  for (const node of tree.values()) {
    if (node.parentSkill) {
      const parent = tree.get(node.parentSkill);
      if (parent) {
        parent.childSkills.push(node.skillName);
      }
    }
  }

  // Third pass: calculate tree depths (BFS from roots)
  const roots: SkillTreeNode[] = [];
  for (const node of tree.values()) {
    if (!node.parentSkill) {
      roots.push(node);
    }
  }

  const queue: Array<{ node: SkillTreeNode; depth: number }> = roots.map(node => ({ node, depth: 0 }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;

    if (visited.has(node.skillName)) {
      continue;
    }

    visited.add(node.skillName);
    node.treeDepth = depth;

    for (const childName of node.childSkills) {
      const child = tree.get(childName);
      if (child && !visited.has(childName)) {
        queue.push({ node: child, depth: depth + 1 });
      }
    }
  }
}
