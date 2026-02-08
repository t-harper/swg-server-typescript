/**
 * Lot Calculator
 * Helper functions for calculating player lot allowances
 *
 * Lot allocation in SWG is based on:
 * - Base lots (10 for all players)
 * - Architect skill boxes (1-2 lots each)
 * - Politician skill boxes (1-2 lots each)
 * - Maximum cap of 25 lots per character
 */

import type { ObjectId } from '@swg/shared-types';
import { BuildingType } from '@swg/objects';
import {
  BASE_LOT_COUNT,
  MAX_LOTS,
  LOT_GRANTING_SKILLS,
  LOT_COSTS_BY_TYPE,
  type Lot,
} from './housing-types.js';

/**
 * Player skill information for lot calculation
 */
export interface PlayerSkills {
  /** Set of skill names the player has */
  skills: Set<string>;
}

/**
 * Lot calculation result
 */
export interface LotCalculationResult {
  /** Base lots all players receive */
  baseLots: number;
  /** Bonus lots from Architect skills */
  architectBonus: number;
  /** Bonus lots from Politician skills */
  politicianBonus: number;
  /** Total lots available */
  totalLots: number;
  /** Lots currently in use */
  lotsUsed: number;
  /** Lots available for new structures */
  lotsAvailable: number;
}

/**
 * Calculate base lots for a player
 * All players start with 10 base lots
 */
export function calculateBaseLots(): number {
  return BASE_LOT_COUNT;
}

/**
 * Calculate bonus lots from Architect skills
 * @param skills - Player's skill set
 * @returns Number of bonus lots from Architect
 */
export function calculateArchitectBonus(skills: Set<string>): number {
  let bonus = 0;

  for (const [skill, lots] of Object.entries(LOT_GRANTING_SKILLS)) {
    if (skill.startsWith('crafting_architect') && skills.has(skill)) {
      bonus += lots;
    }
  }

  return bonus;
}

/**
 * Calculate bonus lots from Politician skills
 * @param skills - Player's skill set
 * @returns Number of bonus lots from Politician
 */
export function calculatePoliticianBonus(skills: Set<string>): number {
  let bonus = 0;

  for (const [skill, lots] of Object.entries(LOT_GRANTING_SKILLS)) {
    if (skill.startsWith('social_politician') && skills.has(skill)) {
      bonus += lots;
    }
  }

  return bonus;
}

/**
 * Calculate bonus lots from all skills
 * Includes Architect and Politician bonuses
 * @param skills - Player's skill set
 * @returns Total bonus lots from skills
 */
export function calculateBonusLots(skills: Set<string>): number {
  let bonus = 0;

  for (const [skill, lots] of Object.entries(LOT_GRANTING_SKILLS)) {
    if (skills.has(skill)) {
      bonus += lots;
    }
  }

  return bonus;
}

/**
 * Calculate total lots available for a player
 * @param skills - Player's skill set
 * @returns Total lots (capped at MAX_LOTS)
 */
export function calculateTotalLots(skills: Set<string>): number {
  const baseLots = calculateBaseLots();
  const bonusLots = calculateBonusLots(skills);
  return Math.min(baseLots + bonusLots, MAX_LOTS);
}

/**
 * Calculate lots currently in use by a player
 * @param lots - Array of lots owned by the player
 * @returns Total lots consumed
 */
export function calculateUsedLots(lots: Lot[]): number {
  // Each lot entry represents one lot being used
  // However, structures may consume multiple lots
  // For now, we count actual lot entries
  return lots.length;
}

/**
 * Calculate lots used by structures
 * @param buildingTypes - Array of building types owned
 * @returns Total lots consumed by structures
 */
export function calculateStructureLotUsage(buildingTypes: BuildingType[]): number {
  let total = 0;

  for (const type of buildingTypes) {
    total += getLotCost(type);
  }

  return total;
}

/**
 * Get the lot cost for a specific building type
 * @param buildingType - Type of building
 * @returns Number of lots the building consumes
 */
export function getLotCost(buildingType: BuildingType): number {
  return LOT_COSTS_BY_TYPE[buildingType] ?? 1;
}

/**
 * Check if a player has enough lots for a structure
 * @param totalLots - Player's total lot capacity
 * @param usedLots - Currently used lots
 * @param requiredLots - Lots needed for the new structure
 * @returns True if player has enough lots
 */
export function hasEnoughLots(
  totalLots: number,
  usedLots: number,
  requiredLots: number
): boolean {
  return (totalLots - usedLots) >= requiredLots;
}

/**
 * Perform full lot calculation for a player
 * @param skills - Player's skill set
 * @param currentLots - Current lots owned
 * @returns Detailed lot calculation result
 */
export function performLotCalculation(
  skills: Set<string>,
  currentLots: Lot[]
): LotCalculationResult {
  const baseLots = calculateBaseLots();
  const architectBonus = calculateArchitectBonus(skills);
  const politicianBonus = calculatePoliticianBonus(skills);
  const totalLots = Math.min(baseLots + architectBonus + politicianBonus, MAX_LOTS);
  const lotsUsed = calculateUsedLots(currentLots);
  const lotsAvailable = Math.max(0, totalLots - lotsUsed);

  return {
    baseLots,
    architectBonus,
    politicianBonus,
    totalLots,
    lotsUsed,
    lotsAvailable,
  };
}

/**
 * Get lot granting skills that the player is missing
 * Useful for telling players how to get more lots
 * @param skills - Player's current skill set
 * @returns Map of skill name to lots it would grant
 */
export function getMissingLotSkills(skills: Set<string>): Map<string, number> {
  const missing = new Map<string, number>();

  for (const [skill, lots] of Object.entries(LOT_GRANTING_SKILLS)) {
    if (!skills.has(skill)) {
      missing.set(skill, lots);
    }
  }

  return missing;
}

/**
 * Format lot calculation for display
 * @param result - Lot calculation result
 * @returns Formatted string for display
 */
export function formatLotCalculation(result: LotCalculationResult): string {
  const lines: string[] = [
    `Base Lots: ${result.baseLots}`,
  ];

  if (result.architectBonus > 0) {
    lines.push(`Architect Bonus: +${result.architectBonus}`);
  }

  if (result.politicianBonus > 0) {
    lines.push(`Politician Bonus: +${result.politicianBonus}`);
  }

  lines.push(`Total Lots: ${result.totalLots}`);
  lines.push(`Lots Used: ${result.lotsUsed}`);
  lines.push(`Lots Available: ${result.lotsAvailable}`);

  return lines.join('\n');
}

/**
 * Structure lot requirements by category
 */
export const STRUCTURE_LOT_CATEGORIES = {
  /** Small structures (1 lot) */
  small: [
    BuildingType.PlayerHouse,
    BuildingType.Factory,
    BuildingType.Harvester,
    BuildingType.Generator,
  ],
  /** Medium structures (2-3 lots) */
  medium: [
    BuildingType.Cloner,
    BuildingType.Cantina,
    BuildingType.MedicalCenter,
  ],
  /** Large structures (5+ lots) */
  large: [
    BuildingType.GuildHall,
    BuildingType.ShuttlePort,
    BuildingType.CityHall,
  ],
} as const;

/**
 * Check if a structure type is small (1 lot)
 */
export function isSmallStructure(buildingType: BuildingType): boolean {
  return (STRUCTURE_LOT_CATEGORIES.small as readonly BuildingType[]).includes(buildingType);
}

/**
 * Check if a structure type is medium (2-3 lots)
 */
export function isMediumStructure(buildingType: BuildingType): boolean {
  return (STRUCTURE_LOT_CATEGORIES.medium as readonly BuildingType[]).includes(buildingType);
}

/**
 * Check if a structure type is large (5+ lots)
 */
export function isLargeStructure(buildingType: BuildingType): boolean {
  return (STRUCTURE_LOT_CATEGORIES.large as readonly BuildingType[]).includes(buildingType);
}
