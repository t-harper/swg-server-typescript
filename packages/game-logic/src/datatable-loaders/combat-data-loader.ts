/**
 * Combat Data Loader
 * Loads combat_data.iff and enriches commands already in a CommandRegistry
 */

import type { DataTableManager } from '@swg/datatable';
import {
  type CombatCommand,
  type CombatCommandFlags,
  TargetType,
  createCombatCommand,
  calculateCommandCrc,
  DefaultCommandFlags,
} from '../combat/combat-command.js';
import type { CommandRegistry } from '../combat/command-parser.js';

export interface CombatDataLoadResult {
  loaded: number;
  merged: number;
  errors: string[];
}

const enum HitType {
  NON_ATTACK = 0,
  ATTACK = -1,
  NON_DAMAGE_ATTACK = 4,
  HEAL = 5,
  DELAY_ATTACK = 6,
  REVIVE = 7,
}

const enum ValidTarget {
  NONE = -1,
  STANDARD = 0,
  MOB = 1,
  CREATURE = 2,
  NPC = 3,
  DROID = 4,
  PVP = 5,
  JEDI = 6,
  DEAD = 7,
  FRIEND = 8,
}

const enum AttackType {
  CONE = 0,
  SINGLE_TARGET = 1,
  AREA = 2,
  TARGET_AREA = 3,
}

export function loadCombatDataFromDatatable(
  dtManager: DataTableManager,
  registry: CommandRegistry,
): CombatDataLoadResult {
  const result: CombatDataLoadResult = {
    loaded: 0,
    merged: 0,
    errors: [],
  };

  const table = dtManager.getTable('datatables/combat/combat_data.iff');
  if (!table) {
    result.errors.push('Failed to load datatables/combat/combat_data.iff');
    return result;
  }

  for (let rowIndex = 0; rowIndex < table.rowCount; rowIndex++) {
    try {
      const actionName = dtManager.getStringValue(table, 'actionName', rowIndex);
      if (!actionName) continue;

      const existingCommand = registry.getByName(actionName);

      // Read combat data fields
      const hitType = dtManager.getIntValue(table, 'hitType', rowIndex);
      const validTarget = dtManager.getIntValue(table, 'validTarget', rowIndex);
      const addedDamage = dtManager.getIntValue(table, 'addedDamage', rowIndex);
      const percentAddFromWeapon = dtManager.getFloatValue(table, 'percentAddFromWeapon', rowIndex) || 1.0;
      const healthCost = dtManager.getFloatValue(table, 'healthCost', rowIndex);
      const actionCost = dtManager.getFloatValue(table, 'actionCost', rowIndex);
      const mindCost = dtManager.getFloatValue(table, 'mindCost', rowIndex);
      const coneLength = dtManager.getFloatValue(table, 'coneLength', rowIndex);
      const coneWidth = dtManager.getFloatValue(table, 'coneWidth', rowIndex);
      const minRange = dtManager.getFloatValue(table, 'minRange', rowIndex);
      const maxRange = dtManager.getFloatValue(table, 'maxRange', rowIndex);
      const damageRadius = dtManager.getFloatValue(table, 'damageRadius', rowIndex);
      const attackType = dtManager.getIntValue(table, 'attackType', rowIndex);
      const increaseStrikethrough = dtManager.getFloatValue(table, 'increaseStrikethrough', rowIndex);

      // Build enriched flags
      const flags: CombatCommandFlags = existingCommand
        ? { ...existingCommand.flags }
        : { ...DefaultCommandFlags };

      if (hitType === HitType.HEAL || hitType === HitType.REVIVE) {
        flags.isHeal = true;
      }
      if (hitType === HitType.REVIVE) {
        flags.canTargetDead = true;
      }
      if (validTarget === ValidTarget.FRIEND) {
        flags.canTargetFriendly = true;
        flags.canTargetEnemy = false;
      }
      if (validTarget === ValidTarget.DEAD) {
        flags.canTargetDead = true;
      }

      // Build overrides
      const overrides: Partial<CombatCommand> & { commandName: string; commandCrc: number } = {
        commandName: actionName,
        commandCrc: existingCommand?.commandCrc ?? calculateCommandCrc(actionName.toLowerCase()),
        flags,
      };

      if (healthCost > 0) overrides.healthCost = healthCost;
      if (actionCost > 0) overrides.actionCost = actionCost;
      if (mindCost > 0) overrides.mindCost = mindCost;

      if (percentAddFromWeapon !== 1.0) {
        overrides.damageMultiplier = (existingCommand?.damageMultiplier ?? 1.0) * percentAddFromWeapon;
      }

      if (maxRange > 0) overrides.maxRange = maxRange;
      if (minRange > 0) overrides.minRange = minRange;

      // Set target type from attack geometry
      if (attackType === AttackType.CONE && coneLength > 0) {
        overrides.targetType = TargetType.Cone;
        overrides.coneAngle = coneWidth;
        if (!overrides.maxRange) overrides.maxRange = coneLength;
      } else if ((attackType === AttackType.AREA || attackType === AttackType.TARGET_AREA) && damageRadius > 0) {
        overrides.targetType = TargetType.AreaOfEffect;
        overrides.aoeRadius = damageRadius;
      } else if (attackType === AttackType.SINGLE_TARGET) {
        overrides.targetType = TargetType.SingleTarget;
      }

      if (increaseStrikethrough > 0) {
        overrides.accuracyBonus = (existingCommand?.accuracyBonus ?? 0) + increaseStrikethrough;
      }

      // Create final command - merge with existing or create new
      const finalCommand = existingCommand
        ? createCombatCommand({ ...existingCommand, ...overrides })
        : createCombatCommand(overrides);

      registry.register(finalCommand);
      result.loaded++;
      if (existingCommand) result.merged++;
    } catch (error) {
      result.errors.push(`Row ${rowIndex}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return result;
}
