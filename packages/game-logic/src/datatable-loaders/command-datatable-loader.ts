/**
 * Command Datatable Loader
 * Loads combat commands from command_table.iff datatable and registers them
 */

import type { DataTableManager } from '@swg/datatable';
import {
  Posture,
  WeaponType,
  createCombatCommand,
  calculateCommandCrc,
  DefaultCommandFlags,
} from '../combat/combat-command.js';
import type { CommandRegistry } from '../combat/command-parser.js';

/**
 * Result of loading commands from datatable
 */
export interface CommandLoadResult {
  loaded: number;
  skipped: number;
  errors: string[];
}

/**
 * Weapon type bitmask constants from DTII enum
 */
const WEAPON_BITMASK = {
  NONE: 0,
  RIFLE: 1,
  CARBINE: 2,
  PISTOL: 4,
  HEAVY: 8,
  ONE_HAND_MELEE: 16,
  TWO_HAND_MELEE: 32,
  UNARMED: 64,
  POLEARM: 128,
  THROWN: 256,
  ONE_HAND_LIGHTSABER: 512,
  TWO_HAND_LIGHTSABER: 1024,
  POLEARM_LIGHTSABER: 2048,
  ALL_WEAPONS: 4095,
} as const;

/**
 * Parse weapon bitmask into WeaponType array
 */
function parseWeaponBitmask(bitmask: number): WeaponType[] {
  if (
    bitmask === WEAPON_BITMASK.NONE ||
    bitmask === WEAPON_BITMASK.ALL_WEAPONS ||
    (bitmask & WEAPON_BITMASK.ALL_WEAPONS) === WEAPON_BITMASK.ALL_WEAPONS
  ) {
    return [];
  }

  const weaponTypes: WeaponType[] = [];

  if (bitmask & WEAPON_BITMASK.RIFLE) weaponTypes.push(WeaponType.Rifle);
  if (bitmask & WEAPON_BITMASK.CARBINE) weaponTypes.push(WeaponType.Carbine);
  if (bitmask & WEAPON_BITMASK.PISTOL) weaponTypes.push(WeaponType.Pistol);
  if (bitmask & WEAPON_BITMASK.HEAVY) weaponTypes.push(WeaponType.HeavyWeapon);
  if (bitmask & WEAPON_BITMASK.ONE_HAND_MELEE) weaponTypes.push(WeaponType.OneHandedMelee);
  if (bitmask & WEAPON_BITMASK.TWO_HAND_MELEE) weaponTypes.push(WeaponType.TwoHandedMelee);
  if (bitmask & WEAPON_BITMASK.UNARMED) weaponTypes.push(WeaponType.Unarmed);
  if (bitmask & WEAPON_BITMASK.POLEARM) weaponTypes.push(WeaponType.Polearm);
  if (bitmask & WEAPON_BITMASK.THROWN) weaponTypes.push(WeaponType.Thrown);
  if (bitmask & WEAPON_BITMASK.ONE_HAND_LIGHTSABER) weaponTypes.push(WeaponType.LightsaberOneHanded);
  if (bitmask & WEAPON_BITMASK.TWO_HAND_LIGHTSABER) weaponTypes.push(WeaponType.LightsaberTwoHanded);
  if (bitmask & WEAPON_BITMASK.POLEARM_LIGHTSABER) weaponTypes.push(WeaponType.LightsaberPolearm);

  return weaponTypes;
}

/**
 * Parse locomotion flags into required posture array
 */
function parseLocomotionFlags(row: Record<string, unknown>): Posture[] {
  const postures: Posture[] = [];

  const standing = row['L:standing'] as number ?? 0;
  const walking = row['L:walking'] as number ?? 0;
  const running = row['L:running'] as number ?? 0;
  const sneaking = row['L:sneaking'] as number ?? 0;
  const kneeling = row['L:kneeling'] as number ?? 0;
  const crouchSneaking = row['L:crouchSneaking'] as number ?? 0;
  const crouchWalking = row['L:crouchWalking'] as number ?? 0;
  const prone = row['L:prone'] as number ?? 0;
  const crawling = row['L:crawling'] as number ?? 0;
  const climbingStationary = row['L:climbingStationary'] as number ?? 0;
  const climbing = row['L:climbing'] as number ?? 0;
  const hovering = row['L:hovering'] as number ?? 0;

  if (standing || walking || running) postures.push(Posture.Standing);
  if (sneaking || kneeling || crouchSneaking || crouchWalking) postures.push(Posture.Crouched);
  if (prone || crawling) postures.push(Posture.Prone);
  if (climbingStationary || climbing) postures.push(Posture.Climbing);
  if (hovering) postures.push(Posture.Flying);

  return postures;
}

/**
 * Load commands from command_table.iff datatable
 */
export function loadCommandsFromDatatable(
  dtManager: DataTableManager,
  registry: CommandRegistry,
): CommandLoadResult {
  const result: CommandLoadResult = {
    loaded: 0,
    skipped: 0,
    errors: [],
  };

  const table = dtManager.getTable('datatables/command/command_table.iff');
  if (!table) {
    result.errors.push('Failed to load datatables/command/command_table.iff');
    return result;
  }

  for (let row = 0; row < table.rowCount; row++) {
    try {
      const commandName = dtManager.getStringValue(table, 'commandName', row);
      if (!commandName) {
        result.skipped++;
        continue;
      }

      const disabled = dtManager.getIntValue(table, 'disabled', row);
      if (disabled) {
        result.skipped++;
        continue;
      }

      const commandCrc = calculateCommandCrc(commandName.toLowerCase());
      const characterAbility = dtManager.getStringValue(table, 'characterAbility', row);
      const maxRangeToTarget = dtManager.getFloatValue(table, 'maxRangeToTarget', row);
      const warmupTime = dtManager.getFloatValue(table, 'warmupTime', row);
      const executeTime = dtManager.getFloatValue(table, 'executeTime', row);
      const cooldownTime = dtManager.getFloatValue(table, 'cooldownTime', row);
      const addToCombatQueue = dtManager.getIntValue(table, 'addToCombatQueue', row);
      const godLevel = dtManager.getIntValue(table, 'godLevel', row);
      const validWeapon = dtManager.getIntValue(table, 'validWeapon', row);

      const requiredWeaponType = parseWeaponBitmask(validWeapon);
      const requiredStance = parseLocomotionFlags(table.rows[row]!);

      const command = createCombatCommand({
        commandName,
        commandCrc,
        maxRange: maxRangeToTarget > 0 ? maxRangeToTarget : 5,
        warmupTime: warmupTime * 1000,
        animationTime: executeTime * 1000,
        cooldownTime: cooldownTime * 1000,
        requiredSkill: characterAbility,
        requiredCombatLevel: godLevel,
        requiredStance,
        requiredWeaponType,
        flags: {
          ...DefaultCommandFlags,
          requiresCombat: addToCombatQueue !== 0,
        },
      });

      registry.register(command);
      result.loaded++;
    } catch (error) {
      result.errors.push(`Row ${row}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return result;
}
