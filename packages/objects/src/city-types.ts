/**
 * City System Types
 * Type definitions for the player city system in Star Wars Galaxies
 *
 * Player cities are a core feature that allows players to:
 * - Found and grow their own cities
 * - Elect mayors through democratic voting
 * - Build civic structures (cloning, shuttles, cantinas)
 * - Collect taxes and manage treasury
 * - Set city specializations for bonuses
 *
 * Cities progress through ranks based on citizen count,
 * unlocking new features and larger borders.
 */

import type { ObjectId } from '@swg/shared-types';

// ============================================
// City Rank
// ============================================

/**
 * City rank based on citizen population
 * Each rank unlocks new features and expands city borders
 */
export enum CityRank {
  /** Starting rank - 10 citizens minimum */
  Outpost = 1,
  /** 15 citizens - unlocks additional structures */
  Village = 2,
  /** 20 citizens - unlocks shuttle port */
  Township = 3,
  /** 25 citizens - unlocks specializations */
  City = 4,
  /** 35 citizens - maximum rank, all features */
  Metropolis = 5,
}

/**
 * Citizen thresholds for each city rank
 */
export const CITY_RANK_THRESHOLDS: Record<CityRank, number> = {
  [CityRank.Outpost]: 10,
  [CityRank.Village]: 15,
  [CityRank.Township]: 20,
  [CityRank.City]: 25,
  [CityRank.Metropolis]: 35,
};

/**
 * City border radius for each rank (in meters)
 */
export const CITY_RANK_RADIUS: Record<CityRank, number> = {
  [CityRank.Outpost]: 150,
  [CityRank.Village]: 200,
  [CityRank.Township]: 300,
  [CityRank.City]: 400,
  [CityRank.Metropolis]: 450,
};

/**
 * Get the display name for a city rank
 */
export function getCityRankName(rank: CityRank): string {
  switch (rank) {
    case CityRank.Outpost:
      return 'Outpost';
    case CityRank.Village:
      return 'Village';
    case CityRank.Township:
      return 'Township';
    case CityRank.City:
      return 'City';
    case CityRank.Metropolis:
      return 'Metropolis';
    default:
      return 'Unknown';
  }
}

/**
 * Calculate the appropriate rank for a given citizen count
 */
export function calculateCityRank(citizenCount: number): CityRank {
  if (citizenCount >= CITY_RANK_THRESHOLDS[CityRank.Metropolis]) {
    return CityRank.Metropolis;
  }
  if (citizenCount >= CITY_RANK_THRESHOLDS[CityRank.City]) {
    return CityRank.City;
  }
  if (citizenCount >= CITY_RANK_THRESHOLDS[CityRank.Township]) {
    return CityRank.Township;
  }
  if (citizenCount >= CITY_RANK_THRESHOLDS[CityRank.Village]) {
    return CityRank.Village;
  }
  return CityRank.Outpost;
}

// ============================================
// City Specialization
// ============================================

/**
 * City specialization types
 * Each provides unique bonuses to citizens and the city
 */
export enum CitySpecialization {
  /** No specialization */
  None = 0,
  /** Research bonus - increased crafting experimentation */
  Research = 1,
  /** Manufacturing - reduced crafting resource costs */
  Manufacturing = 2,
  /** Sample - increased survey sample sizes */
  Sample = 3,
  /** Cloning - reduced cloning sickness duration */
  Cloning = 4,
  /** Entertainment - increased entertainer buffs */
  Entertainment = 5,
  /** Medical - increased medic healing */
  Medical = 6,
  /** Mission - increased mission payouts */
  Mission = 7,
}

/**
 * Get the display name for a city specialization
 */
export function getSpecializationName(spec: CitySpecialization): string {
  switch (spec) {
    case CitySpecialization.None:
      return 'None';
    case CitySpecialization.Research:
      return 'Research Center';
    case CitySpecialization.Manufacturing:
      return 'Manufacturing Center';
    case CitySpecialization.Sample:
      return 'Sample Rich';
    case CitySpecialization.Cloning:
      return 'Cloning Facility';
    case CitySpecialization.Entertainment:
      return 'Entertainment District';
    case CitySpecialization.Medical:
      return 'Medical Center';
    case CitySpecialization.Mission:
      return 'Mission Terminal';
    default:
      return 'Unknown';
  }
}

/**
 * Minimum rank required for city specialization
 */
export const SPECIALIZATION_MIN_RANK = CityRank.City;

// ============================================
// Citizen Rank
// ============================================

/**
 * Citizen rank within a city
 */
export enum CitizenRank {
  /** Regular citizen */
  Citizen = 0,
  /** City militia - can manage some city functions */
  Militia = 1,
  /** City mayor - full control */
  Mayor = 2,
}

/**
 * Get the display name for a citizen rank
 */
export function getCitizenRankName(rank: CitizenRank): string {
  switch (rank) {
    case CitizenRank.Citizen:
      return 'Citizen';
    case CitizenRank.Militia:
      return 'Militia';
    case CitizenRank.Mayor:
      return 'Mayor';
    default:
      return 'Unknown';
  }
}

// ============================================
// City Structure Types
// ============================================

/**
 * Types of civic structures that can be placed in cities
 */
export enum CityStructureType {
  /** City hall - required for city founding */
  CityHall = 0,
  /** Shuttle port - allows planetary travel */
  ShuttlePort = 1,
  /** Cloning facility - respawn point */
  Cloner = 2,
  /** Bank - credit storage */
  Bank = 3,
  /** Cantina - entertainment venue */
  Cantina = 4,
  /** Theater - large entertainment venue */
  Theater = 5,
  /** Small garden - city decoration */
  GardenSmall = 6,
  /** Medium garden - city decoration */
  GardenMedium = 7,
  /** Large garden - city decoration */
  GardenLarge = 8,
  /** Fountain - city decoration */
  Fountain = 9,
  /** Statue - city decoration */
  Statue = 10,
  /** Skill trainer - NPC trainer */
  SkillTrainer = 11,
}

/**
 * Get the display name for a city structure type
 */
export function getStructureTypeName(type: CityStructureType): string {
  switch (type) {
    case CityStructureType.CityHall:
      return 'City Hall';
    case CityStructureType.ShuttlePort:
      return 'Shuttle Port';
    case CityStructureType.Cloner:
      return 'Cloning Facility';
    case CityStructureType.Bank:
      return 'Bank';
    case CityStructureType.Cantina:
      return 'Cantina';
    case CityStructureType.Theater:
      return 'Theater';
    case CityStructureType.GardenSmall:
      return 'Small Garden';
    case CityStructureType.GardenMedium:
      return 'Medium Garden';
    case CityStructureType.GardenLarge:
      return 'Large Garden';
    case CityStructureType.Fountain:
      return 'Fountain';
    case CityStructureType.Statue:
      return 'Statue';
    case CityStructureType.SkillTrainer:
      return 'Skill Trainer';
    default:
      return 'Unknown';
  }
}

/**
 * Weekly maintenance cost for each structure type
 */
export const STRUCTURE_MAINTENANCE_COST: Record<CityStructureType, number> = {
  [CityStructureType.CityHall]: 15000,
  [CityStructureType.ShuttlePort]: 25000,
  [CityStructureType.Cloner]: 20000,
  [CityStructureType.Bank]: 15000,
  [CityStructureType.Cantina]: 18000,
  [CityStructureType.Theater]: 25000,
  [CityStructureType.GardenSmall]: 5000,
  [CityStructureType.GardenMedium]: 8000,
  [CityStructureType.GardenLarge]: 12000,
  [CityStructureType.Fountain]: 6000,
  [CityStructureType.Statue]: 10000,
  [CityStructureType.SkillTrainer]: 12000,
};

/**
 * Minimum city rank required for each structure type
 */
export const STRUCTURE_MIN_RANK: Record<CityStructureType, CityRank> = {
  [CityStructureType.CityHall]: CityRank.Outpost,
  [CityStructureType.ShuttlePort]: CityRank.Township,
  [CityStructureType.Cloner]: CityRank.Village,
  [CityStructureType.Bank]: CityRank.Outpost,
  [CityStructureType.Cantina]: CityRank.Village,
  [CityStructureType.Theater]: CityRank.City,
  [CityStructureType.GardenSmall]: CityRank.Outpost,
  [CityStructureType.GardenMedium]: CityRank.Village,
  [CityStructureType.GardenLarge]: CityRank.Township,
  [CityStructureType.Fountain]: CityRank.Village,
  [CityStructureType.Statue]: CityRank.City,
  [CityStructureType.SkillTrainer]: CityRank.Township,
};

// ============================================
// Citizen Record
// ============================================

/**
 * Record of a citizen within a city
 */
export interface CitizenRecord {
  /** Character object ID */
  characterId: ObjectId;
  /** Character name */
  name: string;
  /** Citizen's rank within the city */
  rank: CitizenRank;
  /** Timestamp when citizen joined */
  joinedAt: Date;
  /** Object ID of candidate voted for in current election */
  votedFor?: ObjectId | undefined;
}

/**
 * Create a new citizen record
 */
export function createCitizenRecord(
  characterId: ObjectId,
  name: string,
  rank: CitizenRank = CitizenRank.Citizen
): CitizenRecord {
  return {
    characterId,
    name,
    rank,
    joinedAt: new Date(),
  };
}

// ============================================
// City Election
// ============================================

/**
 * City mayoral election state
 */
export interface CityElection {
  /** Timestamp when election started */
  startedAt: Date;
  /** Timestamp when election ends */
  endsAt: Date;
  /** Map of candidate ObjectId to vote count */
  candidates: Map<ObjectId, number>;
  /** Set of citizen IDs who have voted */
  hasVoted: Set<ObjectId>;
}

/**
 * Create a new election
 */
export function createElection(durationDays: number = ELECTION_DURATION_DAYS): CityElection {
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
  return {
    startedAt,
    endsAt,
    candidates: new Map(),
    hasVoted: new Set(),
  };
}

/**
 * Check if an election has ended
 */
export function hasElectionEnded(election: CityElection): boolean {
  return new Date() >= election.endsAt;
}

/**
 * Get remaining time in election in milliseconds
 */
export function getElectionTimeRemaining(election: CityElection): number {
  return Math.max(0, election.endsAt.getTime() - Date.now());
}

// ============================================
// City Tax
// ============================================

/**
 * Types of taxes a city can collect
 */
export enum TaxType {
  /** Tax on vendor/bazaar sales */
  Sales = 0,
  /** Tax on property ownership */
  Property = 1,
  /** Tax on travel (shuttle use) */
  Travel = 2,
}

/**
 * Get the display name for a tax type
 */
export function getTaxTypeName(type: TaxType): string {
  switch (type) {
    case TaxType.Sales:
      return 'Sales Tax';
    case TaxType.Property:
      return 'Property Tax';
    case TaxType.Travel:
      return 'Travel Tax';
    default:
      return 'Unknown';
  }
}

/**
 * City tax configuration
 */
export interface CityTax {
  /** Tax rate as percentage (0-20) */
  taxRate: number;
  /** Type of tax */
  taxType: TaxType;
  /** Timestamp of last collection */
  lastCollected: Date;
}

/**
 * Create a new tax configuration
 */
export function createCityTax(taxType: TaxType, taxRate: number = 0): CityTax {
  return {
    taxRate: Math.min(Math.max(0, taxRate), MAX_TAX_RATE),
    taxType,
    lastCollected: new Date(),
  };
}

// ============================================
// Constants
// ============================================

/** Maximum length of city name */
export const MAX_CITY_NAME = 40;

/** Maximum citizens by city rank */
export const MAX_CITIZENS: Record<CityRank, number> = {
  [CityRank.Outpost]: 50,
  [CityRank.Village]: 75,
  [CityRank.Township]: 100,
  [CityRank.City]: 150,
  [CityRank.Metropolis]: 200,
};

/** Duration of mayoral elections in days */
export const ELECTION_DURATION_DAYS = 21;

/** Maximum tax rate percentage */
export const MAX_TAX_RATE = 20;

/** Minimum time between elections in days */
export const ELECTION_COOLDOWN_DAYS = 7;

/** Upkeep payment period in days */
export const UPKEEP_PERIOD_DAYS = 7;

/** Grace period before city starts decaying (in days) */
export const UPKEEP_GRACE_PERIOD_DAYS = 14;

/** Minimum citizens to prevent city dissolution */
export const MIN_CITIZENS_FOR_CITY = 10;

/** Distance from other cities required for founding (in meters) */
export const MIN_CITY_DISTANCE = 1000;

/** Removal reason types */
export enum CitizenRemovalReason {
  /** Citizen left voluntarily */
  Left = 'left',
  /** Citizen was banished by mayor */
  Banished = 'banished',
  /** Character was deleted */
  CharacterDeleted = 'character_deleted',
  /** Citizen was inactive too long */
  Inactive = 'inactive',
  /** City was dissolved */
  CityDissolved = 'city_dissolved',
}
