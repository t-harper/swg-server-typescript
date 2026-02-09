import { DataTableManager } from '@swg/datatable';
import {
  loadSkillsFromDatatable,
  type SkillLoadResult,
  loadXpLimitsFromDatatable,
  type XpLimitsLoadResult,
  loadCommandsFromDatatable,
  type CommandLoadResult,
  loadCombatDataFromDatatable,
  type CombatDataLoadResult,
  CommandRegistry,
  loadBuiltInCommands,
  skillManager,
} from '@swg/game-logic';

export interface DatatableInitResult {
  skills: SkillLoadResult;
  xpLimits: XpLimitsLoadResult;
  commands: CommandLoadResult;
  combatData: CombatDataLoadResult;
  commandRegistry: CommandRegistry;
}

export function initializeGameDatatables(dtManager: DataTableManager): DatatableInitResult {
  // 1. Load skills from datatable
  const skills = loadSkillsFromDatatable(dtManager);
  if (skills.skills.size > 0) {
    skillManager.initializeFromMaps(skills.skills, skills.tree);
  }
  if (skills.errors.length > 0) {
    console.warn('[DatatableInit] Skill loading warnings:', skills.errors.slice(0, 5));
  }

  // 2. Load XP limits
  const xpLimits = loadXpLimitsFromDatatable(dtManager);
  if (xpLimits.errors.length > 0) {
    console.warn('[DatatableInit] XP limits warnings:', xpLimits.errors);
  }

  // 3. Create command registry, load built-in commands, then datatable commands
  const commandRegistry = new CommandRegistry();
  loadBuiltInCommands(commandRegistry);
  const commands = loadCommandsFromDatatable(dtManager, commandRegistry);
  if (commands.errors.length > 0) {
    console.warn('[DatatableInit] Command loading warnings:', commands.errors.slice(0, 5));
  }

  // 4. Load combat data to enrich commands
  const combatData = loadCombatDataFromDatatable(dtManager, commandRegistry);
  if (combatData.errors.length > 0) {
    console.warn('[DatatableInit] Combat data warnings:', combatData.errors.slice(0, 5));
  }

  return { skills, xpLimits, commands, combatData, commandRegistry };
}
