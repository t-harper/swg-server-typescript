/**
 * Combat XP Calculator - Experience from combat encounters
 *
 * Calculates XP rewards from killing creatures and NPCs.
 * Takes into account weapon type, damage dealt, creature difficulty,
 * and level differences.
 */

import type { ObjectId } from '@swg/shared-types';
import { PlayerObject, CreatureObject } from '@swg/objects';
import { XpType, type XpTypeValue } from './xp-types.js';

/**
 * Weapon types that affect XP distribution
 */
export const WeaponType = {
  UNARMED: 'unarmed',
  ONE_HANDED_MELEE: 'one_handed_melee',
  TWO_HANDED_MELEE: 'two_handed_melee',
  POLEARM: 'polearm',
  PISTOL: 'pistol',
  CARBINE: 'carbine',
  RIFLE: 'rifle',
  HEAVY: 'heavy',
  THROWN: 'thrown',
  LIGHTSABER: 'lightsaber',
} as const;

export type WeaponTypeValue = (typeof WeaponType)[keyof typeof WeaponType];

/**
 * XP distribution result from combat
 */
export interface XpDistribution {
  /** XP amounts by type */
  xpByType: Map<XpTypeValue | string, number>;
  /** Whether this XP should be shared with group */
  groupShare: boolean;
  /** Base XP before modifiers */
  baseXp: number;
  /** Level difference modifier applied */
  levelModifier: number;
  /** Damage proportion (for partial credit) */
  damageProportion: number;
}

/**
 * Combat XP calculation options
 */
export interface CombatXpOptions {
  /** Minimum XP to award (even for low damage) */
  minimumXp?: number;
  /** Maximum XP multiplier from level difference */
  maxLevelBonus?: number;
  /** XP penalty for killing much lower level targets */
  lowLevelPenalty?: boolean;
  /** Level difference before penalty applies */
  levelDifferenceThreshold?: number;
  /** Base XP per creature level */
  xpPerLevel?: number;
  /** Combat general XP percentage */
  combatGeneralPercent?: number;
}

/**
 * Default combat XP options
 */
const DEFAULT_COMBAT_XP_OPTIONS: Required<CombatXpOptions> = {
  minimumXp: 1,
  maxLevelBonus: 1.5,
  lowLevelPenalty: true,
  levelDifferenceThreshold: 5,
  xpPerLevel: 50,
  combatGeneralPercent: 0.2, // 20% goes to combat_general
};

/**
 * Combat XP Calculator class
 */
export class CombatXpCalculator {
  private options: Required<CombatXpOptions>;

  constructor(options: CombatXpOptions = {}) {
    this.options = { ...DEFAULT_COMBAT_XP_OPTIONS, ...options };
  }

  /**
   * Calculate XP from killing a creature
   *
   * @param attacker - The player who dealt the killing blow (or most damage)
   * @param target - The creature that was killed
   * @param damageDealt - Total damage dealt by this attacker
   * @param weaponType - Type of weapon used (for XP type distribution)
   * @param totalDamage - Total damage dealt to the creature (for multi-attacker scenarios)
   * @returns XP distribution
   */
  calculateCombatXp(
    attacker: PlayerObject,
    target: CreatureObject,
    damageDealt: number,
    weaponType: WeaponTypeValue,
    totalDamage?: number
  ): XpDistribution {
    // Calculate damage proportion (for group/multi-attacker scenarios)
    const effectiveTotalDamage = totalDamage ?? damageDealt;
    const damageProportion =
      effectiveTotalDamage > 0 ? Math.min(1, damageDealt / effectiveTotalDamage) : 1;

    // Calculate base XP from creature level and difficulty
    const creatureLevel = target.level;
    const creatureDifficulty = target.difficulty || 1;
    const baseXp = Math.floor(
      creatureLevel * this.options.xpPerLevel * creatureDifficulty
    );

    // Calculate level difference modifier
    const levelDifference = target.level - attacker.level;
    let levelModifier = 1.0;

    if (levelDifference > 0) {
      // Bonus for killing higher level targets
      levelModifier = Math.min(
        this.options.maxLevelBonus,
        1 + levelDifference * 0.1
      );
    } else if (this.options.lowLevelPenalty && levelDifference < -this.options.levelDifferenceThreshold) {
      // Penalty for killing much lower level targets
      const excessLevels = Math.abs(levelDifference) - this.options.levelDifferenceThreshold;
      levelModifier = Math.max(0.1, 1 - excessLevels * 0.1);
    }

    // Calculate final XP amount
    const totalXp = Math.max(
      this.options.minimumXp,
      Math.floor(baseXp * levelModifier * damageProportion)
    );

    // Distribute XP by type
    const xpByType = this.distributeByWeaponType(totalXp, weaponType);

    return {
      xpByType,
      groupShare: attacker.isInGroup(),
      baseXp,
      levelModifier,
      damageProportion,
    };
  }

  /**
   * Distribute XP across combat XP types based on weapon
   */
  private distributeByWeaponType(
    totalXp: number,
    weaponType: WeaponTypeValue
  ): Map<XpTypeValue | string, number> {
    const xpByType = new Map<XpTypeValue | string, number>();

    // Calculate combat general portion
    const combatGeneralXp = Math.floor(totalXp * this.options.combatGeneralPercent);
    const remainingXp = totalXp - combatGeneralXp;

    // Always award combat general XP
    xpByType.set(XpType.COMBAT_GENERAL, combatGeneralXp);

    // Distribute remaining XP based on weapon type
    switch (weaponType) {
      case WeaponType.UNARMED:
      case WeaponType.ONE_HANDED_MELEE:
      case WeaponType.TWO_HANDED_MELEE:
      case WeaponType.POLEARM:
        xpByType.set(XpType.COMBAT_MELEE, remainingXp);
        break;

      case WeaponType.PISTOL:
        xpByType.set(XpType.COMBAT_RANGED_PISTOL, remainingXp);
        break;

      case WeaponType.CARBINE:
        xpByType.set(XpType.COMBAT_RANGED_CARBINE, remainingXp);
        break;

      case WeaponType.RIFLE:
        xpByType.set(XpType.COMBAT_RANGED_RIFLE, remainingXp);
        break;

      case WeaponType.HEAVY:
        xpByType.set(XpType.COMBAT_RANGED_HEAVY, remainingXp);
        break;

      case WeaponType.THROWN:
        // Thrown weapons give ranged general (split between types)
        const halfXp = Math.floor(remainingXp / 2);
        xpByType.set(XpType.COMBAT_MELEE, halfXp);
        xpByType.set(XpType.COMBAT_RANGED_PISTOL, remainingXp - halfXp);
        break;

      case WeaponType.LIGHTSABER:
        // Lightsabers give Jedi XP primarily
        xpByType.set(XpType.JEDI_GENERAL, remainingXp);
        break;

      default:
        // Default to melee
        xpByType.set(XpType.COMBAT_MELEE, remainingXp);
    }

    return xpByType;
  }

  /**
   * Calculate XP for a creature handler (pet damage)
   */
  calculateCreatureHandlerXp(
    handler: PlayerObject,
    target: CreatureObject,
    petDamageDealt: number,
    totalDamage: number
  ): XpDistribution {
    const damageProportion = totalDamage > 0 ? petDamageDealt / totalDamage : 0;
    const baseXp = Math.floor(
      target.level * this.options.xpPerLevel * (target.difficulty || 1)
    );
    const totalXp = Math.floor(baseXp * damageProportion);

    const xpByType = new Map<XpTypeValue | string, number>();
    xpByType.set(XpType.CREATURE_HANDLER, totalXp);

    return {
      xpByType,
      groupShare: handler.isInGroup(),
      baseXp,
      levelModifier: 1.0,
      damageProportion,
    };
  }

  /**
   * Calculate mission bonus XP
   */
  calculateMissionBonusXp(
    player: PlayerObject,
    missionDifficulty: number,
    missionType: string
  ): XpDistribution {
    const baseXp = missionDifficulty * 100;
    const xpByType = new Map<XpTypeValue | string, number>();

    // Mission XP type depends on mission type
    switch (missionType) {
      case 'destroy':
      case 'assassin':
        xpByType.set(XpType.COMBAT_GENERAL, baseXp);
        break;
      case 'bounty':
        xpByType.set(XpType.BOUNTY_HUNTER, baseXp);
        break;
      case 'deliver':
      case 'escort':
        xpByType.set(XpType.SCOUT, baseXp);
        break;
      case 'survey':
        xpByType.set(XpType.SURVEYING, baseXp);
        break;
      default:
        xpByType.set(XpType.COMBAT_GENERAL, baseXp);
    }

    return {
      xpByType,
      groupShare: false, // Mission XP is not shared
      baseXp,
      levelModifier: 1.0,
      damageProportion: 1.0,
    };
  }

  /**
   * Get the primary XP type for a weapon
   */
  getWeaponXpType(weaponType: WeaponTypeValue): XpTypeValue {
    switch (weaponType) {
      case WeaponType.UNARMED:
      case WeaponType.ONE_HANDED_MELEE:
      case WeaponType.TWO_HANDED_MELEE:
      case WeaponType.POLEARM:
        return XpType.COMBAT_MELEE;
      case WeaponType.PISTOL:
        return XpType.COMBAT_RANGED_PISTOL;
      case WeaponType.CARBINE:
        return XpType.COMBAT_RANGED_CARBINE;
      case WeaponType.RIFLE:
        return XpType.COMBAT_RANGED_RIFLE;
      case WeaponType.HEAVY:
        return XpType.COMBAT_RANGED_HEAVY;
      case WeaponType.LIGHTSABER:
        return XpType.JEDI_GENERAL;
      default:
        return XpType.COMBAT_GENERAL;
    }
  }
}

/**
 * Global combat XP calculator singleton
 */
let globalCombatXpCalculator: CombatXpCalculator | null = null;

/**
 * Get the global combat XP calculator
 */
export function getCombatXpCalculator(): CombatXpCalculator {
  if (!globalCombatXpCalculator) {
    globalCombatXpCalculator = new CombatXpCalculator();
  }
  return globalCombatXpCalculator;
}

/**
 * Create a new combat XP calculator (for testing or custom options)
 */
export function createCombatXpCalculator(
  options?: CombatXpOptions
): CombatXpCalculator {
  return new CombatXpCalculator(options);
}

/**
 * Convenience function to calculate combat XP
 */
export function calculateCombatXp(
  attacker: PlayerObject,
  target: CreatureObject,
  damageDealt: number,
  weaponType: WeaponTypeValue,
  totalDamage?: number
): XpDistribution {
  return getCombatXpCalculator().calculateCombatXp(
    attacker,
    target,
    damageDealt,
    weaponType,
    totalDamage
  );
}
