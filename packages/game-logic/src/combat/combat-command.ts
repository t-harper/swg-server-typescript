/**
 * Combat Command Definitions
 * Defines the structure and types for combat commands in SWG
 */

import { CombatState } from './combat-states.js';

/**
 * Target type for combat commands
 */
export enum TargetType {
  /** Affects only the caster */
  Self = 0,
  /** Affects a single target */
  SingleTarget = 1,
  /** Affects targets in a cone in front of the caster */
  Cone = 2,
  /** Affects all targets in a radius */
  AreaOfEffect = 3,
  /** Affects all members of the caster's group */
  GroupBuff = 4,
  /** Chain attack - hits multiple targets in sequence */
  Chain = 5,
  /** No target required (immediate effect) */
  None = 6,
}

/**
 * Weapon types that can be used with combat commands
 */
export enum WeaponType {
  /** Unarmed combat */
  Unarmed = 0,
  /** One-handed melee weapons */
  OneHandedMelee = 1,
  /** Two-handed melee weapons */
  TwoHandedMelee = 2,
  /** Polearm weapons */
  Polearm = 3,
  /** Pistol */
  Pistol = 4,
  /** Carbine */
  Carbine = 5,
  /** Rifle */
  Rifle = 6,
  /** Heavy weapons */
  HeavyWeapon = 7,
  /** Thrown weapons */
  Thrown = 8,
  /** Lightsaber (one-handed) */
  LightsaberOneHanded = 9,
  /** Lightsaber (two-handed) */
  LightsaberTwoHanded = 10,
  /** Lightsaber (polearm/double-bladed) */
  LightsaberPolearm = 11,
  /** Any weapon type */
  Any = 255,
}

/**
 * Character postures/stances
 */
export enum Posture {
  /** Standing upright */
  Standing = 0,
  /** Crouched/sneaking */
  Crouched = 1,
  /** Lying down */
  Prone = 2,
  /** Sitting */
  Sitting = 3,
  /** Knocked down (unable to act) */
  KnockedDown = 4,
  /** Incapacitated */
  Incapacitated = 5,
  /** Dead */
  Dead = 6,
  /** Climbing */
  Climbing = 7,
  /** Flying (in vehicle) */
  Flying = 8,
  /** Swimming */
  Swimming = 9,
  /** Lying down (sleeping) */
  LyingDown = 10,
  /** Driving a vehicle */
  Driving = 11,
}

/**
 * Damage type for combat
 */
export enum DamageType {
  /** Kinetic damage (blunt/piercing) */
  Kinetic = 0,
  /** Energy damage (blasters, lightsabers) */
  Energy = 1,
  /** Elemental - heat */
  Heat = 2,
  /** Elemental - cold */
  Cold = 3,
  /** Elemental - acid */
  Acid = 4,
  /** Elemental - electricity */
  Electricity = 5,
  /** Force damage (Jedi abilities) */
  Force = 6,
  /** Stun damage (non-lethal) */
  Stun = 7,
}

/**
 * HAM pool targets for damage/costs
 */
export enum HamPool {
  Health = 0,
  Action = 1,
  Mind = 2,
}

/**
 * Combat command definition
 * Represents a single combat ability that can be used by players/NPCs
 */
export interface CombatCommand {
  /** Internal command name (e.g., "defaultAttack", "aimedShot") */
  commandName: string;
  /** CRC hash of the command name for network protocol */
  commandCrc: number;
  /** Display name shown to players */
  displayName: string;
  /** Command description */
  description: string;

  // Targeting
  /** Target type for this command */
  targetType: TargetType;
  /** Maximum range in meters */
  maxRange: number;
  /** Minimum range in meters (0 for most abilities) */
  minRange: number;

  // Costs
  /** Health cost to use this command */
  healthCost: number;
  /** Action cost to use this command */
  actionCost: number;
  /** Mind cost to use this command */
  mindCost: number;
  /** Force cost (for Jedi abilities) */
  forceCost: number;

  // Timing (all in milliseconds)
  /** Warmup/cast time before execution */
  warmupTime: number;
  /** Cooldown time after execution */
  cooldownTime: number;
  /** Animation duration */
  animationTime: number;
  /** Global cooldown this ability triggers */
  globalCooldown: number;

  // Requirements
  /** Required weapon types (empty = any weapon) */
  requiredWeaponType: WeaponType[];
  /** Required postures to use (empty = any valid posture) */
  requiredStance: Posture[];
  /** Required skill to use this command */
  requiredSkill: string;
  /** Minimum skill level required */
  requiredSkillLevel: number;
  /** Combat level requirement */
  requiredCombatLevel: number;

  // Effects
  /** Base damage multiplier (1.0 = weapon damage) */
  damageMultiplier: number;
  /** Accuracy bonus/penalty */
  accuracyBonus: number;
  /** Chance to apply state (0-100) */
  stateChance: number;
  /** State to apply on hit */
  stateToApply: CombatState;
  /** Duration of applied state in ms */
  stateDuration: number;
  /** Primary damage type */
  damageType: DamageType;
  /** Which HAM pool takes damage */
  primaryTarget: HamPool;
  /** Secondary HAM pool (for split damage) */
  secondaryTarget: HamPool | null;
  /** Ratio of damage to secondary target (0-1) */
  secondaryRatio: number;

  // Special
  /** AoE radius in meters (for AoE abilities) */
  aoeRadius: number;
  /** Cone angle in degrees (for cone abilities) */
  coneAngle: number;
  /** Maximum targets affected */
  maxTargets: number;
  /** Chain to another command after execution (combo system) */
  chainToCommand: string | null;
  /** Time window for chain in ms */
  chainWindow: number;
  /** Commands this can chain from */
  chainFromCommands: string[];
  /** Special flags */
  flags: CombatCommandFlags;

  // Animation
  /** Animation CRC to play */
  animationCrc: number;
  /** Client effect CRC */
  clientEffectCrc: number;
  /** Hit effect CRC */
  hitEffectCrc: number;
}

/**
 * Special flags for combat commands
 */
export interface CombatCommandFlags {
  /** Cannot be used while moving */
  stationaryOnly: boolean;
  /** Can be used while moving */
  mobileOk: boolean;
  /** Requires target to be in combat */
  requiresCombat: boolean;
  /** Cannot be used in combat */
  outOfCombatOnly: boolean;
  /** Can be used on self */
  canTargetSelf: boolean;
  /** Can be used on friendly targets */
  canTargetFriendly: boolean;
  /** Can be used on enemy targets */
  canTargetEnemy: boolean;
  /** Can be used on dead targets */
  canTargetDead: boolean;
  /** Ignores defense roll */
  alwaysHits: boolean;
  /** Cannot miss (different from always hits - affects accuracy calc) */
  cannotMiss: boolean;
  /** Cannot be blocked */
  cannotBlock: boolean;
  /** Cannot be dodged */
  cannotDodge: boolean;
  /** Cannot be parried */
  cannotParry: boolean;
  /** Is a healing ability */
  isHeal: boolean;
  /** Is a buff ability */
  isBuff: boolean;
  /** Is a debuff ability */
  isDebuff: boolean;
  /** Requires line of sight */
  requiresLineOfSight: boolean;
  /** Can crit */
  canCrit: boolean;
  /** Breaks on damage */
  breaksOnDamage: boolean;
}

/**
 * Default command flags
 */
export const DefaultCommandFlags: CombatCommandFlags = {
  stationaryOnly: false,
  mobileOk: true,
  requiresCombat: false,
  outOfCombatOnly: false,
  canTargetSelf: false,
  canTargetFriendly: false,
  canTargetEnemy: true,
  canTargetDead: false,
  alwaysHits: false,
  cannotMiss: false,
  cannotBlock: false,
  cannotDodge: false,
  cannotParry: false,
  isHeal: false,
  isBuff: false,
  isDebuff: false,
  requiresLineOfSight: true,
  canCrit: true,
  breaksOnDamage: false,
};

/**
 * Create a combat command with defaults
 */
export function createCombatCommand(
  partial: Partial<CombatCommand> & Pick<CombatCommand, 'commandName' | 'commandCrc'>
): CombatCommand {
  return {
    displayName: partial.commandName,
    description: '',
    targetType: TargetType.SingleTarget,
    maxRange: 5,
    minRange: 0,
    healthCost: 0,
    actionCost: 0,
    mindCost: 0,
    forceCost: 0,
    warmupTime: 0,
    cooldownTime: 0,
    animationTime: 1000,
    globalCooldown: 1000,
    requiredWeaponType: [],
    requiredStance: [Posture.Standing],
    requiredSkill: '',
    requiredSkillLevel: 0,
    requiredCombatLevel: 0,
    damageMultiplier: 1.0,
    accuracyBonus: 0,
    stateChance: 0,
    stateToApply: CombatState.None,
    stateDuration: 0,
    damageType: DamageType.Kinetic,
    primaryTarget: HamPool.Health,
    secondaryTarget: null,
    secondaryRatio: 0,
    aoeRadius: 0,
    coneAngle: 0,
    maxTargets: 1,
    chainToCommand: null,
    chainWindow: 0,
    chainFromCommands: [],
    flags: { ...DefaultCommandFlags },
    animationCrc: 0,
    clientEffectCrc: 0,
    hitEffectCrc: 0,
    ...partial,
  };
}

/**
 * Calculate the CRC32 for a command name
 * Uses the same algorithm as the SOE protocol
 */
export function calculateCommandCrc(commandName: string): number {
  let crc = 0xffffffff;
  const polynomial = 0xedb88320;

  for (let i = 0; i < commandName.length; i++) {
    crc ^= commandName.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ polynomial;
      } else {
        crc = crc >>> 1;
      }
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Check if posture is valid for combat
 */
export function isValidCombatPosture(posture: Posture): boolean {
  return (
    posture === Posture.Standing ||
    posture === Posture.Crouched ||
    posture === Posture.Prone
  );
}

/**
 * Get the display name for a weapon type
 */
export function getWeaponTypeName(type: WeaponType): string {
  return WeaponType[type] ?? 'Unknown';
}

/**
 * Get the display name for a target type
 */
export function getTargetTypeName(type: TargetType): string {
  return TargetType[type] ?? 'Unknown';
}

/**
 * Check if a weapon type is melee
 */
export function isMeleeWeapon(type: WeaponType): boolean {
  return (
    type === WeaponType.Unarmed ||
    type === WeaponType.OneHandedMelee ||
    type === WeaponType.TwoHandedMelee ||
    type === WeaponType.Polearm ||
    type === WeaponType.LightsaberOneHanded ||
    type === WeaponType.LightsaberTwoHanded ||
    type === WeaponType.LightsaberPolearm
  );
}

/**
 * Check if a weapon type is ranged
 */
export function isRangedWeapon(type: WeaponType): boolean {
  return (
    type === WeaponType.Pistol ||
    type === WeaponType.Carbine ||
    type === WeaponType.Rifle ||
    type === WeaponType.HeavyWeapon ||
    type === WeaponType.Thrown
  );
}
