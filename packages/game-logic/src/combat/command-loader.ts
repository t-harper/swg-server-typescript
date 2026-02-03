/**
 * Combat Command Loader
 * Loads combat command definitions from JSON files
 */

import type { CombatCommand, CombatCommandFlags } from './combat-command.js';
import { CombatState } from './combat-states.js';
import { TargetType, WeaponType, Posture, DamageType, HamPool, DefaultCommandFlags } from './combat-command.js';
import { CommandRegistry } from './command-parser.js';

// Import command JSON data
import defaultAttackData from './data/commands/default-attack.json' with { type: 'json' };
import aimedShotData from './data/commands/aimed-shot.json' with { type: 'json' };
import berserkData from './data/commands/berserk.json' with { type: 'json' };
import healData from './data/commands/heal.json' with { type: 'json' };
import knockdownAttackData from './data/commands/knockdown-attack.json' with { type: 'json' };

/**
 * Raw command data from JSON
 */
interface RawCommandData {
  commandName: string;
  commandCrc: number;
  displayName: string;
  description: string;
  targetType: number;
  maxRange: number;
  minRange: number;
  healthCost: number;
  actionCost: number;
  mindCost: number;
  forceCost: number;
  warmupTime: number;
  cooldownTime: number;
  animationTime: number;
  globalCooldown: number;
  requiredWeaponType: number[];
  requiredStance: number[];
  requiredSkill: string;
  requiredSkillLevel: number;
  requiredCombatLevel: number;
  damageMultiplier: number;
  accuracyBonus: number;
  stateChance: number;
  stateToApply: number;
  stateDuration: number;
  damageType: number;
  primaryTarget: number;
  secondaryTarget: number | null;
  secondaryRatio: number;
  aoeRadius: number;
  coneAngle: number;
  maxTargets: number;
  chainToCommand: string | null;
  chainWindow: number;
  chainFromCommands: string[];
  flags: Partial<CombatCommandFlags>;
  animationCrc: number;
  clientEffectCrc: number;
  hitEffectCrc: number;
  _comment?: unknown;
}

/**
 * Convert raw JSON data to a CombatCommand
 */
function parseCommandData(raw: RawCommandData): CombatCommand {
  return {
    commandName: raw.commandName,
    commandCrc: raw.commandCrc,
    displayName: raw.displayName,
    description: raw.description,
    targetType: raw.targetType as TargetType,
    maxRange: raw.maxRange,
    minRange: raw.minRange,
    healthCost: raw.healthCost,
    actionCost: raw.actionCost,
    mindCost: raw.mindCost,
    forceCost: raw.forceCost,
    warmupTime: raw.warmupTime,
    cooldownTime: raw.cooldownTime,
    animationTime: raw.animationTime,
    globalCooldown: raw.globalCooldown,
    requiredWeaponType: raw.requiredWeaponType as WeaponType[],
    requiredStance: raw.requiredStance as Posture[],
    requiredSkill: raw.requiredSkill,
    requiredSkillLevel: raw.requiredSkillLevel,
    requiredCombatLevel: raw.requiredCombatLevel,
    damageMultiplier: raw.damageMultiplier,
    accuracyBonus: raw.accuracyBonus,
    stateChance: raw.stateChance,
    stateToApply: raw.stateToApply as CombatState,
    stateDuration: raw.stateDuration,
    damageType: raw.damageType as DamageType,
    primaryTarget: raw.primaryTarget as HamPool,
    secondaryTarget: raw.secondaryTarget !== null ? (raw.secondaryTarget as HamPool) : null,
    secondaryRatio: raw.secondaryRatio,
    aoeRadius: raw.aoeRadius,
    coneAngle: raw.coneAngle,
    maxTargets: raw.maxTargets,
    chainToCommand: raw.chainToCommand,
    chainWindow: raw.chainWindow,
    chainFromCommands: raw.chainFromCommands,
    flags: { ...DefaultCommandFlags, ...raw.flags },
    animationCrc: raw.animationCrc,
    clientEffectCrc: raw.clientEffectCrc,
    hitEffectCrc: raw.hitEffectCrc,
  };
}

/**
 * All built-in command data
 */
const builtInCommands: RawCommandData[] = [
  defaultAttackData as RawCommandData,
  aimedShotData as RawCommandData,
  berserkData as RawCommandData,
  healData as RawCommandData,
  knockdownAttackData as RawCommandData,
];

/**
 * Load all built-in combat commands into a registry
 */
export function loadBuiltInCommands(registry: CommandRegistry): void {
  for (const rawData of builtInCommands) {
    const command = parseCommandData(rawData);
    registry.register(command);
  }
}

/**
 * Create a registry with all built-in commands pre-loaded
 */
export function createDefaultCommandRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  loadBuiltInCommands(registry);
  return registry;
}

/**
 * Load commands from custom JSON data
 */
export function loadCustomCommands(
  registry: CommandRegistry,
  commandData: RawCommandData[]
): void {
  for (const rawData of commandData) {
    const command = parseCommandData(rawData);
    registry.register(command);
  }
}

/**
 * Get a list of all built-in command names
 */
export function getBuiltInCommandNames(): string[] {
  return builtInCommands.map((cmd) => cmd.commandName);
}

/**
 * Get a built-in command by name (without needing a registry)
 */
export function getBuiltInCommand(name: string): CombatCommand | undefined {
  const raw = builtInCommands.find(
    (cmd) => cmd.commandName.toLowerCase() === name.toLowerCase()
  );
  return raw ? parseCommandData(raw) : undefined;
}

/**
 * Validate command data structure
 */
export function validateCommandData(data: unknown): data is RawCommandData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const cmd = data as Record<string, unknown>;

  // Check required string fields
  const requiredStrings = ['commandName', 'displayName', 'description', 'requiredSkill'];
  for (const field of requiredStrings) {
    if (typeof cmd[field] !== 'string') {
      return false;
    }
  }

  // Check required number fields
  const requiredNumbers = [
    'commandCrc', 'targetType', 'maxRange', 'minRange',
    'healthCost', 'actionCost', 'mindCost', 'forceCost',
    'warmupTime', 'cooldownTime', 'animationTime', 'globalCooldown',
    'requiredSkillLevel', 'requiredCombatLevel',
    'damageMultiplier', 'accuracyBonus', 'stateChance', 'stateToApply', 'stateDuration',
    'damageType', 'primaryTarget', 'secondaryRatio',
    'aoeRadius', 'coneAngle', 'maxTargets', 'chainWindow',
    'animationCrc', 'clientEffectCrc', 'hitEffectCrc',
  ];
  for (const field of requiredNumbers) {
    if (typeof cmd[field] !== 'number') {
      return false;
    }
  }

  // Check required arrays
  const requiredArrays = ['requiredWeaponType', 'requiredStance', 'chainFromCommands'];
  for (const field of requiredArrays) {
    if (!Array.isArray(cmd[field])) {
      return false;
    }
  }

  // Check flags object
  if (typeof cmd['flags'] !== 'object' || cmd['flags'] === null) {
    return false;
  }

  return true;
}

export { type RawCommandData };
