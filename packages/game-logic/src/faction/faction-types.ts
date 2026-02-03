/**
 * Faction Types
 * Type definitions and constants for the Galactic Civil War faction system
 */

import type { ObjectId } from '@swg/shared-types';

// ============================================
// Constants
// ============================================

/** Time in milliseconds to wait before leaving a faction (5 minutes) */
export const FACTION_LEAVE_COOLDOWN_MS = 5 * 60 * 1000;

/** Time in milliseconds to wait before status change (5 minutes) */
export const STATUS_CHANGE_COOLDOWN_MS = 5 * 60 * 1000;

/** Time in milliseconds to wait before going on leave from Special Forces (30 seconds) */
export const SF_LEAVE_COOLDOWN_MS = 30 * 1000;

/** Maximum faction points a player can accumulate */
export const MAX_FACTION_POINTS = 5000;

/** Minimum faction points a player can have */
export const MIN_FACTION_POINTS = -5000;

/** Points lost per death by enemy faction */
export const POINTS_LOST_ON_DEATH = 30;

/** Weekly decay percentage for GCW regional control */
export const WEEKLY_CONTROL_DECAY_PERCENT = 5;

/** Default faction point gain from NPC kill */
export const DEFAULT_NPC_KILL_POINTS = 5;

/** Default faction point gain from player kill */
export const DEFAULT_PLAYER_KILL_POINTS = 30;

// ============================================
// Enums
// ============================================

/**
 * Faction enum
 * Represents all factions in the game
 */
export enum Faction {
  /** No faction affiliation */
  NEUTRAL = 0,
  /** Galactic Empire */
  IMPERIAL = 1,
  /** Rebel Alliance */
  REBEL = 2,
  /** Hutt Cartel (generic) */
  HUTT = 3,
  /** Jabba the Hutt's organization */
  JABBA = 4,
  /** Lady Valarian's organization */
  VALARIAN = 5,
  /** Tusken Raiders */
  TUSKEN = 6,
  /** Jawa tribes */
  JAWA = 7,
  /** CorSec (Corellia Security Force) */
  CORSEC = 8,
  /** Meatlump gang */
  MEATLUMP = 9,
  /** Black Sun crime syndicate */
  BLACKSUN = 10,
  /** Nightsister clan */
  NIGHTSISTER = 11,
  /** Singing Mountain clan */
  SINGINGMOUNTAIN = 12,
  /** Trade Federation */
  TRADEFEDERATION = 13,
  /** Pirates */
  PIRATE = 14,
}

/**
 * Faction status enum
 * Represents a player's combat status within their faction
 */
export enum FactionStatus {
  /** Not enlisted - cannot be attacked by opposing faction */
  NON_COMBATANT = 0,
  /** Enlisted for PvP - can be attacked by opposing faction combatants */
  COMBATANT = 1,
  /** Special Forces - always attackable by opposing faction */
  SPECIAL_FORCES = 2,
  /** On leave from faction (temporary neutral status) */
  ON_LEAVE = 3,
}

/**
 * GCW Region status enum
 * Represents the control state of a GCW region
 */
export enum GCWRegionStatus {
  /** Neutral - no faction has majority control */
  NEUTRAL = 0,
  /** Imperial controlled (>= 55%) */
  IMPERIAL_CONTROLLED = 1,
  /** Rebel controlled (>= 55%) */
  REBEL_CONTROLLED = 2,
  /** Contested - both factions have significant presence */
  CONTESTED = 3,
}

/**
 * Faction rank type
 * Differentiates between Imperial and Rebel rank systems
 */
export enum FactionRankType {
  IMPERIAL = 'imperial',
  REBEL = 'rebel',
}

// ============================================
// Interfaces
// ============================================

/**
 * Faction rank interface
 * Represents a rank within a faction's hierarchy
 */
export interface FactionRank {
  /** Unique rank identifier (0-based, 0 = lowest) */
  rank: number;
  /** Display title for this rank */
  title: string;
  /** Faction points required to achieve this rank */
  pointsRequired: number;
  /** Array of perk IDs available at this rank */
  perks: string[];
  /** Badge/insignia ID for this rank */
  badgeId?: number;
}

/**
 * Player's standing with a faction
 */
export interface FactionStanding {
  /** The faction */
  faction: Faction;
  /** Current faction points (-5000 to 5000) */
  points: number;
  /** Current rank (0-based) */
  rank: number;
  /** Current combat status */
  status: FactionStatus;
  /** Timestamp of last status change */
  lastStatusChange: Date;
  /** Timestamp of enlistment (null if never enlisted) */
  enlistedAt: Date | null;
  /** Timestamp when player can change status again */
  statusCooldownExpires: Date | null;
  /** Timestamp when player can leave faction */
  leaveCooldownExpires: Date | null;
}

/**
 * GCW Region interface
 * Represents a contested region in the Galactic Civil War
 */
export interface GCWRegion {
  /** Unique region identifier */
  regionId: string;
  /** Display name of the region */
  name: string;
  /** Planet the region is on */
  planet: string;
  /** Imperial control percentage (0-100) */
  imperialControl: number;
  /** Rebel control percentage (0-100) */
  rebelControl: number;
  /** Whether the region is currently contested */
  contested: boolean;
  /** Current region status */
  status: GCWRegionStatus;
  /** Timestamp of last update */
  lastUpdate: Date;
  /** Total GCW points contributed to this region */
  totalPointsContributed: number;
  /** Active Imperial bases in this region */
  imperialBases: number;
  /** Active Rebel bases in this region */
  rebelBases: number;
}

/**
 * Faction perk interface
 * Represents a benefit that can be unlocked with faction standing
 */
export interface FactionPerk {
  /** Unique perk identifier */
  id: string;
  /** Display name of the perk */
  name: string;
  /** Description of what the perk does */
  description: string;
  /** Faction this perk belongs to */
  faction: Faction;
  /** Minimum rank required to unlock */
  rankRequired: number;
  /** Faction point cost to purchase (0 = free at rank) */
  cost: number;
  /** Effect type (buff, discount, access, etc.) */
  effectType: FactionPerkEffectType;
  /** Effect value (varies by type) */
  effectValue: number | string;
  /** Whether this perk is one-time purchase or repeatable */
  repeatable: boolean;
}

/**
 * Faction perk effect types
 */
export enum FactionPerkEffectType {
  /** Stat buff (effectValue = skill mod name and amount) */
  BUFF = 'buff',
  /** Discount at faction vendors (effectValue = percentage) */
  DISCOUNT = 'discount',
  /** Access to restricted area or service */
  ACCESS = 'access',
  /** Special ability or command */
  ABILITY = 'ability',
  /** Mount or vehicle unlock */
  VEHICLE = 'vehicle',
  /** Armor or weapon unlock */
  EQUIPMENT = 'equipment',
  /** Title unlock */
  TITLE = 'title',
}

/**
 * Faction base interface
 * Represents a player-placed faction base
 */
export interface FactionBase {
  /** Unique base identifier */
  baseId: ObjectId;
  /** Faction the base belongs to */
  faction: Faction;
  /** Region the base is in */
  regionId: string;
  /** Owner player ID */
  ownerId: ObjectId;
  /** Guild ID if guild-owned */
  guildId?: ObjectId;
  /** Current base health */
  health: number;
  /** Maximum base health */
  maxHealth: number;
  /** Whether the base is vulnerable to attack */
  vulnerable: boolean;
  /** Timestamp when vulnerability window opens */
  vulnerabilityStart: Date | null;
  /** Timestamp when vulnerability window closes */
  vulnerabilityEnd: Date | null;
  /** GCW points this base contributes to the region */
  gcwPointsContribution: number;
  /** Base defense rating */
  defenseRating: number;
  /** Number of NPC defenders */
  npcDefenders: number;
  /** Timestamp of placement */
  placedAt: Date;
  /** World location X */
  worldX: number;
  /** World location Y */
  worldY: number;
  /** World location Z */
  worldZ: number;
}

/**
 * Faction NPC template interface
 * Defines an NPC that grants faction points when killed
 */
export interface FactionNPCTemplate {
  /** NPC template ID */
  templateId: string;
  /** Faction the NPC belongs to */
  faction: Faction;
  /** Points granted to opposing faction on kill */
  pointsOnKill: number;
  /** Bonus points if NPC is an officer/elite */
  bonusPoints: number;
  /** NPC difficulty level */
  difficulty: number;
  /** Minimum player rank to receive full points */
  minRankForFullPoints: number;
}

/**
 * Player faction data
 * Complete faction information for a player
 */
export interface PlayerFactionData {
  /** Player ID */
  playerId: ObjectId;
  /** Current faction alignment */
  currentFaction: Faction;
  /** Current faction status */
  currentStatus: FactionStatus;
  /** Map of faction standings */
  standings: Map<Faction, FactionStanding>;
  /** Purchased perks */
  purchasedPerks: Set<string>;
  /** Lifetime GCW points earned */
  lifetimeGCWPoints: number;
  /** GCW points earned this week */
  weeklyGCWPoints: number;
  /** Total enemy player kills */
  pvpKills: number;
  /** Total deaths to enemy players */
  pvpDeaths: number;
  /** Current kill streak */
  killStreak: number;
  /** Best kill streak */
  bestKillStreak: number;
  /** Last PvP kill timestamp */
  lastPvPKill: Date | null;
  /** Last PvP death timestamp */
  lastPvPDeath: Date | null;
}

/**
 * GCW contribution record
 * Records a player's contribution to GCW
 */
export interface GCWContribution {
  /** Player ID */
  playerId: ObjectId;
  /** Region the contribution was made in */
  regionId: string;
  /** Faction the contribution is for */
  faction: Faction;
  /** Points contributed */
  points: number;
  /** Source of the points */
  source: GCWContributionSource;
  /** Timestamp of contribution */
  timestamp: Date;
}

/**
 * GCW contribution sources
 */
export enum GCWContributionSource {
  /** Killing an enemy NPC */
  NPC_KILL = 'npc_kill',
  /** Killing an enemy player */
  PLAYER_KILL = 'player_kill',
  /** Completing a faction mission */
  MISSION = 'mission',
  /** Defending a faction base */
  BASE_DEFENSE = 'base_defense',
  /** Destroying an enemy base */
  BASE_DESTRUCTION = 'base_destruction',
  /** Capturing an objective */
  OBJECTIVE_CAPTURE = 'objective_capture',
  /** Passive base contribution */
  BASE_PASSIVE = 'base_passive',
}

// ============================================
// Imperial Ranks
// ============================================

/**
 * Imperial military ranks
 */
export const IMPERIAL_RANKS: readonly FactionRank[] = [
  { rank: 0, title: 'Private', pointsRequired: 0, perks: [] },
  { rank: 1, title: 'Private First Class', pointsRequired: 200, perks: ['imp_discount_5'] },
  { rank: 2, title: 'Lance Corporal', pointsRequired: 500, perks: ['imp_speeder'] },
  { rank: 3, title: 'Corporal', pointsRequired: 800, perks: ['imp_armor_1'] },
  { rank: 4, title: 'Sergeant', pointsRequired: 1200, perks: ['imp_discount_10'] },
  { rank: 5, title: 'Staff Sergeant', pointsRequired: 1600, perks: ['imp_armor_2'] },
  { rank: 6, title: 'Sergeant First Class', pointsRequired: 2000, perks: ['imp_weapon_1'] },
  { rank: 7, title: 'Master Sergeant', pointsRequired: 2500, perks: ['imp_barc_speeder'] },
  { rank: 8, title: 'Warrant Officer', pointsRequired: 3000, perks: ['imp_discount_15'] },
  { rank: 9, title: 'Lieutenant', pointsRequired: 3500, perks: ['imp_armor_3'] },
  { rank: 10, title: 'Captain', pointsRequired: 4000, perks: ['imp_weapon_2'] },
  { rank: 11, title: 'Major', pointsRequired: 4300, perks: ['imp_at_st'] },
  { rank: 12, title: 'Lieutenant Colonel', pointsRequired: 4600, perks: ['imp_discount_20'] },
  { rank: 13, title: 'Colonel', pointsRequired: 4800, perks: ['imp_armor_4'] },
  { rank: 14, title: 'General', pointsRequired: 5000, perks: ['imp_general_title', 'imp_general_armor'] },
] as const;

// ============================================
// Rebel Ranks
// ============================================

/**
 * Rebel Alliance military ranks
 */
export const REBEL_RANKS: readonly FactionRank[] = [
  { rank: 0, title: 'Private', pointsRequired: 0, perks: [] },
  { rank: 1, title: 'Corporal', pointsRequired: 200, perks: ['reb_discount_5'] },
  { rank: 2, title: 'Sergeant', pointsRequired: 500, perks: ['reb_speeder'] },
  { rank: 3, title: 'Staff Sergeant', pointsRequired: 800, perks: ['reb_armor_1'] },
  { rank: 4, title: 'Sergeant Major', pointsRequired: 1200, perks: ['reb_discount_10'] },
  { rank: 5, title: 'Second Lieutenant', pointsRequired: 1600, perks: ['reb_armor_2'] },
  { rank: 6, title: 'Lieutenant', pointsRequired: 2000, perks: ['reb_weapon_1'] },
  { rank: 7, title: 'Captain', pointsRequired: 2500, perks: ['reb_speeder_bike'] },
  { rank: 8, title: 'Major', pointsRequired: 3000, perks: ['reb_discount_15'] },
  { rank: 9, title: 'Lieutenant Colonel', pointsRequired: 3500, perks: ['reb_armor_3'] },
  { rank: 10, title: 'Commander', pointsRequired: 4000, perks: ['reb_weapon_2'] },
  { rank: 11, title: 'Colonel', pointsRequired: 4300, perks: ['reb_tank'] },
  { rank: 12, title: 'Brigadier General', pointsRequired: 4600, perks: ['reb_discount_20'] },
  { rank: 13, title: 'Major General', pointsRequired: 4800, perks: ['reb_armor_4'] },
  { rank: 14, title: 'General', pointsRequired: 5000, perks: ['reb_general_title', 'reb_general_armor'] },
] as const;

// ============================================
// Helper Types
// ============================================

/**
 * Type for Imperial rank index
 */
export type ImperialRankIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

/**
 * Type for Rebel rank index
 */
export type RebelRankIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a faction is a GCW faction (Imperial or Rebel)
 */
export function isGCWFaction(faction: Faction): boolean {
  return faction === Faction.IMPERIAL || faction === Faction.REBEL;
}

/**
 * Get the opposing GCW faction
 */
export function getOpposingFaction(faction: Faction): Faction {
  if (faction === Faction.IMPERIAL) return Faction.REBEL;
  if (faction === Faction.REBEL) return Faction.IMPERIAL;
  return Faction.NEUTRAL;
}

/**
 * Get ranks for a faction
 */
export function getRanksForFaction(faction: Faction): readonly FactionRank[] {
  if (faction === Faction.IMPERIAL) return IMPERIAL_RANKS;
  if (faction === Faction.REBEL) return REBEL_RANKS;
  return [];
}

/**
 * Get rank by points for a faction
 */
export function getRankByPoints(faction: Faction, points: number): FactionRank | undefined {
  const ranks = getRanksForFaction(faction);
  if (ranks.length === 0) return undefined;

  let currentRank = ranks[0];
  for (const rank of ranks) {
    if (points >= rank.pointsRequired) {
      currentRank = rank;
    } else {
      break;
    }
  }
  return currentRank;
}

/**
 * Get faction name string
 */
export function getFactionName(faction: Faction): string {
  const names: Record<Faction, string> = {
    [Faction.NEUTRAL]: 'Neutral',
    [Faction.IMPERIAL]: 'Imperial',
    [Faction.REBEL]: 'Rebel',
    [Faction.HUTT]: 'Hutt',
    [Faction.JABBA]: 'Jabba',
    [Faction.VALARIAN]: 'Valarian',
    [Faction.TUSKEN]: 'Tusken',
    [Faction.JAWA]: 'Jawa',
    [Faction.CORSEC]: 'CorSec',
    [Faction.MEATLUMP]: 'Meatlump',
    [Faction.BLACKSUN]: 'Black Sun',
    [Faction.NIGHTSISTER]: 'Nightsister',
    [Faction.SINGINGMOUNTAIN]: 'Singing Mountain',
    [Faction.TRADEFEDERATION]: 'Trade Federation',
    [Faction.PIRATE]: 'Pirate',
  };
  return names[faction];
}

/**
 * Get faction status name string
 */
export function getStatusName(status: FactionStatus): string {
  const names: Record<FactionStatus, string> = {
    [FactionStatus.NON_COMBATANT]: 'On Leave',
    [FactionStatus.COMBATANT]: 'Combatant',
    [FactionStatus.SPECIAL_FORCES]: 'Special Forces',
    [FactionStatus.ON_LEAVE]: 'On Leave',
  };
  return names[status];
}

/**
 * Check if two players can attack each other based on faction
 */
export function canAttack(
  attackerFaction: Faction,
  attackerStatus: FactionStatus,
  defenderFaction: Faction,
  defenderStatus: FactionStatus
): boolean {
  // Cannot attack same faction
  if (attackerFaction === defenderFaction) return false;

  // Non-combatants cannot attack or be attacked
  if (attackerStatus === FactionStatus.NON_COMBATANT) return false;
  if (defenderStatus === FactionStatus.NON_COMBATANT) return false;

  // On leave players cannot attack or be attacked
  if (attackerStatus === FactionStatus.ON_LEAVE) return false;
  if (defenderStatus === FactionStatus.ON_LEAVE) return false;

  // Special Forces can always attack opposing faction combatants/SF
  if (attackerStatus === FactionStatus.SPECIAL_FORCES) {
    return defenderStatus === FactionStatus.COMBATANT ||
           defenderStatus === FactionStatus.SPECIAL_FORCES;
  }

  // Combatants can only attack Special Forces
  if (attackerStatus === FactionStatus.COMBATANT) {
    return defenderStatus === FactionStatus.SPECIAL_FORCES;
  }

  return false;
}

/**
 * Calculate control percentage from points
 */
export function calculateControlPercentage(
  factionPoints: number,
  totalPoints: number
): number {
  if (totalPoints === 0) return 0;
  return Math.round((factionPoints / totalPoints) * 100);
}

/**
 * Create default player faction data
 */
export function createDefaultFactionData(playerId: ObjectId): PlayerFactionData {
  return {
    playerId,
    currentFaction: Faction.NEUTRAL,
    currentStatus: FactionStatus.NON_COMBATANT,
    standings: new Map(),
    purchasedPerks: new Set(),
    lifetimeGCWPoints: 0,
    weeklyGCWPoints: 0,
    pvpKills: 0,
    pvpDeaths: 0,
    killStreak: 0,
    bestKillStreak: 0,
    lastPvPKill: null,
    lastPvPDeath: null,
  };
}

/**
 * Create default faction standing
 */
export function createDefaultStanding(faction: Faction): FactionStanding {
  return {
    faction,
    points: 0,
    rank: 0,
    status: FactionStatus.NON_COMBATANT,
    lastStatusChange: new Date(),
    enlistedAt: null,
    statusCooldownExpires: null,
    leaveCooldownExpires: null,
  };
}
