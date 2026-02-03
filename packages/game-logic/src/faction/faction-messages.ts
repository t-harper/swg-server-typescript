/**
 * Faction Network Messages
 * Protocol message types for faction system client-server communication
 *
 * Note: These are game-logic level message types. The actual network
 * serialization/deserialization would be implemented in the protocol package.
 */

import type { ObjectId } from '@swg/shared-types';
import {
  Faction,
  FactionStatus,
  GCWRegionStatus,
  type FactionRank,
  type FactionPerk,
  type FactionItem,
  getFactionName,
  getStatusName,
} from './faction-types.js';

// ============================================
// Message Opcodes
// ============================================

/**
 * Faction message opcodes
 */
export const FactionMessageOpcode = {
  // Status messages
  /** Server notification of faction status update */
  FactionStatusUpdate: 0x1a2b3c4d,
  /** Server notification of faction point gain */
  FactionPointGain: 0x2b3c4d5e,
  /** Server notification of faction point loss */
  FactionPointLoss: 0x3c4d5e6f,
  /** Server notification of rank change */
  FactionRankChange: 0x4d5e6f70,

  // GCW Region messages
  /** Server notification of GCW region status */
  GCWRegionStatus: 0x5e6f7081,
  /** Server notification of region control change */
  GCWRegionControlChange: 0x6f708192,

  // Base messages
  /** Server notification of faction base status */
  FactionBaseStatus: 0x708192a3,
  /** Server notification of base placed */
  FactionBasePlaced: 0x8192a3b4,
  /** Server notification of base destroyed */
  FactionBaseDestroyed: 0x92a3b4c5,
  /** Server notification of base under attack */
  FactionBaseUnderAttack: 0xa3b4c5d6,

  // Client requests
  /** Client request to enlist in faction */
  EnlistRequest: 0xb4c5d6e7,
  /** Client request to resign from faction */
  ResignRequest: 0xc5d6e7f8,
  /** Client request to change status */
  StatusChangeRequest: 0xd6e7f809,
  /** Client request for faction standing */
  FactionStandingRequest: 0xe7f8091a,
  /** Client request for GCW region info */
  GCWRegionInfoRequest: 0xf8091a2b,
  /** Client request for available perks */
  FactionPerksRequest: 0x091a2b3c,
  /** Client request to purchase perk */
  PerkPurchaseRequest: 0x1a2b3c4d,
  /** Client request for faction items */
  FactionItemsRequest: 0x2b3c4d5e,
  /** Client request to purchase item */
  ItemPurchaseRequest: 0x3c4d5e6f,

  // Response messages
  /** Server response to enlist request */
  EnlistResponse: 0x4d5e6f80,
  /** Server response to resign request */
  ResignResponse: 0x5e6f8091,
  /** Server response to status change request */
  StatusChangeResponse: 0x6f8091a2,
  /** Server response with faction standing */
  FactionStandingResponse: 0x8091a2b3,
  /** Server response with GCW region info */
  GCWRegionInfoResponse: 0x91a2b3c4,
  /** Server response with available perks */
  FactionPerksResponse: 0xa2b3c4d5,
  /** Server response to perk purchase */
  PerkPurchaseResponse: 0xb3c4d5e6,
  /** Server response with faction items */
  FactionItemsResponse: 0xc4d5e6f7,
  /** Server response to item purchase */
  ItemPurchaseResponse: 0xd5e6f708,
} as const;

export type FactionMessageOpcodeType =
  (typeof FactionMessageOpcode)[keyof typeof FactionMessageOpcode];

// ============================================
// Status Update Messages
// ============================================

/**
 * FactionStatusUpdateMessage - Server notification of player's faction status
 */
export interface FactionStatusUpdateMessage {
  opcode: typeof FactionMessageOpcode.FactionStatusUpdate;
  /** Target player ID */
  playerId: bigint;
  /** Current faction */
  faction: Faction;
  /** Faction display name */
  factionName: string;
  /** Current status */
  status: FactionStatus;
  /** Status display name */
  statusName: string;
  /** Current faction points */
  factionPoints: number;
  /** Current rank number */
  rank: number;
  /** Current rank title */
  rankTitle: string;
  /** Points needed for next rank (0 if max rank) */
  pointsToNextRank: number;
  /** Timestamp (Unix ms) */
  timestamp: bigint;
}

/**
 * FactionPointGainMessage - Server notification of faction point gain
 */
export interface FactionPointGainMessage {
  opcode: typeof FactionMessageOpcode.FactionPointGain;
  /** Points gained */
  pointsGained: number;
  /** New point total */
  newTotal: number;
  /** Source of the points */
  source: string;
  /** Optional region ID where points were earned */
  regionId: string;
  /** Whether GCW contribution was made */
  gcwContributed: boolean;
  /** GCW points contributed */
  gcwPoints: number;
}

/**
 * FactionPointLossMessage - Server notification of faction point loss
 */
export interface FactionPointLossMessage {
  opcode: typeof FactionMessageOpcode.FactionPointLoss;
  /** Points lost */
  pointsLost: number;
  /** New point total */
  newTotal: number;
  /** Reason for the loss */
  reason: string;
}

/**
 * FactionRankChangeMessage - Server notification of rank change
 */
export interface FactionRankChangeMessage {
  opcode: typeof FactionMessageOpcode.FactionRankChange;
  /** Whether this is a promotion (true) or demotion (false) */
  promoted: boolean;
  /** Previous rank number */
  previousRank: number;
  /** Previous rank title */
  previousRankTitle: string;
  /** New rank number */
  newRank: number;
  /** New rank title */
  newRankTitle: string;
  /** Perks unlocked at new rank (promotion only) */
  perksUnlocked: string[];
}

// ============================================
// GCW Region Messages
// ============================================

/**
 * GCWRegionStatusMessage - Server notification of GCW region status
 */
export interface GCWRegionStatusMessage {
  opcode: typeof FactionMessageOpcode.GCWRegionStatus;
  /** Region identifier */
  regionId: string;
  /** Region display name */
  regionName: string;
  /** Planet name */
  planet: string;
  /** Imperial control percentage */
  imperialControl: number;
  /** Rebel control percentage */
  rebelControl: number;
  /** Current region status */
  status: GCWRegionStatus;
  /** Whether region is contested */
  contested: boolean;
  /** Number of Imperial bases */
  imperialBases: number;
  /** Number of Rebel bases */
  rebelBases: number;
  /** Last update timestamp (Unix ms) */
  lastUpdate: bigint;
}

/**
 * GCWRegionControlChangeMessage - Server notification of region control change
 */
export interface GCWRegionControlChangeMessage {
  opcode: typeof FactionMessageOpcode.GCWRegionControlChange;
  /** Region identifier */
  regionId: string;
  /** Region display name */
  regionName: string;
  /** Previous control status */
  previousStatus: GCWRegionStatus;
  /** New control status */
  newStatus: GCWRegionStatus;
  /** Controlling faction (NEUTRAL if none) */
  controllingFaction: Faction;
  /** Imperial control percentage */
  imperialControl: number;
  /** Rebel control percentage */
  rebelControl: number;
}

// ============================================
// Faction Base Messages
// ============================================

/**
 * FactionBaseStatusMessage - Server notification of faction base status
 */
export interface FactionBaseStatusMessage {
  opcode: typeof FactionMessageOpcode.FactionBaseStatus;
  /** Base identifier */
  baseId: bigint;
  /** Base faction */
  faction: Faction;
  /** Region the base is in */
  regionId: string;
  /** Owner player ID */
  ownerId: bigint;
  /** Owner name */
  ownerName: string;
  /** Guild ID (0 if none) */
  guildId: bigint;
  /** Guild name (empty if none) */
  guildName: string;
  /** Current health */
  health: number;
  /** Maximum health */
  maxHealth: number;
  /** Health percentage */
  healthPercent: number;
  /** Whether base is vulnerable */
  vulnerable: boolean;
  /** Vulnerability start (Unix ms, 0 if not set) */
  vulnerabilityStart: bigint;
  /** Vulnerability end (Unix ms, 0 if not set) */
  vulnerabilityEnd: bigint;
  /** GCW points contribution rate */
  gcwContribution: number;
  /** Defense rating */
  defenseRating: number;
  /** World position X */
  worldX: number;
  /** World position Y */
  worldY: number;
  /** World position Z */
  worldZ: number;
}

/**
 * FactionBasePlacedMessage - Server notification of base placement
 */
export interface FactionBasePlacedMessage {
  opcode: typeof FactionMessageOpcode.FactionBasePlaced;
  /** Base identifier */
  baseId: bigint;
  /** Base faction */
  faction: Faction;
  /** Region ID */
  regionId: string;
  /** Owner player ID */
  ownerId: bigint;
  /** Owner name */
  ownerName: string;
  /** World position X */
  worldX: number;
  /** World position Y */
  worldY: number;
  /** World position Z */
  worldZ: number;
}

/**
 * FactionBaseDestroyedMessage - Server notification of base destruction
 */
export interface FactionBaseDestroyedMessage {
  opcode: typeof FactionMessageOpcode.FactionBaseDestroyed;
  /** Base identifier */
  baseId: bigint;
  /** Base faction */
  faction: Faction;
  /** Region ID */
  regionId: string;
  /** Destroyer player ID */
  destroyerId: bigint;
  /** Destroyer name */
  destroyerName: string;
  /** GCW points awarded */
  gcwPointsAwarded: number;
}

/**
 * FactionBaseUnderAttackMessage - Server notification of base under attack
 */
export interface FactionBaseUnderAttackMessage {
  opcode: typeof FactionMessageOpcode.FactionBaseUnderAttack;
  /** Base identifier */
  baseId: bigint;
  /** Region ID */
  regionId: string;
  /** Current health */
  currentHealth: number;
  /** Maximum health */
  maxHealth: number;
  /** Attacker faction */
  attackerFaction: Faction;
  /** World position X */
  worldX: number;
  /** World position Y */
  worldY: number;
  /** World position Z */
  worldZ: number;
}

// ============================================
// Client Request Messages
// ============================================

/**
 * EnlistRequestMessage - Client request to enlist in a faction
 */
export interface EnlistRequestMessage {
  opcode: typeof FactionMessageOpcode.EnlistRequest;
  /** Faction to enlist in */
  faction: Faction;
}

/**
 * ResignRequestMessage - Client request to resign from faction
 */
export interface ResignRequestMessage {
  opcode: typeof FactionMessageOpcode.ResignRequest;
}

/**
 * StatusChangeRequestMessage - Client request to change faction status
 */
export interface StatusChangeRequestMessage {
  opcode: typeof FactionMessageOpcode.StatusChangeRequest;
  /** Requested new status */
  requestedStatus: FactionStatus;
}

/**
 * FactionStandingRequestMessage - Client request for faction standing
 */
export interface FactionStandingRequestMessage {
  opcode: typeof FactionMessageOpcode.FactionStandingRequest;
}

/**
 * GCWRegionInfoRequestMessage - Client request for GCW region info
 */
export interface GCWRegionInfoRequestMessage {
  opcode: typeof FactionMessageOpcode.GCWRegionInfoRequest;
  /** Region ID to query (empty for current region) */
  regionId: string;
}

/**
 * FactionPerksRequestMessage - Client request for available perks
 */
export interface FactionPerksRequestMessage {
  opcode: typeof FactionMessageOpcode.FactionPerksRequest;
}

/**
 * PerkPurchaseRequestMessage - Client request to purchase a perk
 */
export interface PerkPurchaseRequestMessage {
  opcode: typeof FactionMessageOpcode.PerkPurchaseRequest;
  /** Perk ID to purchase */
  perkId: string;
}

/**
 * FactionItemsRequestMessage - Client request for faction items
 */
export interface FactionItemsRequestMessage {
  opcode: typeof FactionMessageOpcode.FactionItemsRequest;
  /** Item category filter (empty for all) */
  category: string;
}

/**
 * ItemPurchaseRequestMessage - Client request to purchase an item
 */
export interface ItemPurchaseRequestMessage {
  opcode: typeof FactionMessageOpcode.ItemPurchaseRequest;
  /** Item ID to purchase */
  itemId: string;
}

// ============================================
// Server Response Messages
// ============================================

/**
 * EnlistResponseMessage - Server response to enlist request
 */
export interface EnlistResponseMessage {
  opcode: typeof FactionMessageOpcode.EnlistResponse;
  /** Whether enlistment succeeded */
  success: boolean;
  /** Error message if failed */
  errorMessage: string;
  /** Faction enlisted in */
  faction: Faction;
  /** Faction display name */
  factionName: string;
  /** Starting rank */
  rank: number;
  /** Starting rank title */
  rankTitle: string;
}

/**
 * ResignResponseMessage - Server response to resign request
 */
export interface ResignResponseMessage {
  opcode: typeof FactionMessageOpcode.ResignResponse;
  /** Whether resignation succeeded */
  success: boolean;
  /** Error message if failed */
  errorMessage: string;
  /** Faction resigned from */
  previousFaction: Faction;
}

/**
 * StatusChangeResponseMessage - Server response to status change request
 */
export interface StatusChangeResponseMessage {
  opcode: typeof FactionMessageOpcode.StatusChangeResponse;
  /** Whether status change succeeded */
  success: boolean;
  /** Error message if failed */
  errorMessage: string;
  /** Previous status */
  previousStatus: FactionStatus;
  /** New status */
  newStatus: FactionStatus;
  /** When cooldown expires (Unix ms, 0 if none) */
  cooldownExpires: bigint;
}

/**
 * Faction standing data for network transmission
 */
export interface FactionStandingData {
  faction: Faction;
  factionName: string;
  points: number;
  rank: number;
  rankTitle: string;
  status: FactionStatus;
  statusName: string;
  pointsToNextRank: number;
  enlistedAt: bigint;
  lifetimeGCWPoints: number;
  weeklyGCWPoints: number;
  pvpKills: number;
  pvpDeaths: number;
  killStreak: number;
  bestKillStreak: number;
}

/**
 * FactionStandingResponseMessage - Server response with faction standing
 */
export interface FactionStandingResponseMessage {
  opcode: typeof FactionMessageOpcode.FactionStandingResponse;
  /** Whether player is enlisted */
  enlisted: boolean;
  /** Standing data (null if not enlisted) */
  standing: FactionStandingData | null;
  /** Purchased perk IDs */
  purchasedPerks: string[];
}

/**
 * GCWRegionInfoResponseMessage - Server response with GCW region info
 */
export interface GCWRegionInfoResponseMessage {
  opcode: typeof FactionMessageOpcode.GCWRegionInfoResponse;
  /** Whether region was found */
  found: boolean;
  /** Region data */
  region: GCWRegionStatusMessage | null;
  /** Player's contributions to this region */
  playerContributions: number;
  /** Current regional bonus for player's faction */
  xpBonus: number;
  /** Faction point bonus */
  factionPointBonus: number;
  /** Vendor discount */
  vendorDiscount: number;
}

/**
 * Perk data for network transmission
 */
export interface FactionPerkData {
  id: string;
  name: string;
  description: string;
  rankRequired: number;
  cost: number;
  effectType: string;
  effectValue: string;
  purchased: boolean;
  canPurchase: boolean;
}

/**
 * FactionPerksResponseMessage - Server response with available perks
 */
export interface FactionPerksResponseMessage {
  opcode: typeof FactionMessageOpcode.FactionPerksResponse;
  /** Array of available perks */
  perks: FactionPerkData[];
  /** Player's current faction points */
  currentPoints: number;
  /** Player's current rank */
  currentRank: number;
}

/**
 * PerkPurchaseResponseMessage - Server response to perk purchase
 */
export interface PerkPurchaseResponseMessage {
  opcode: typeof FactionMessageOpcode.PerkPurchaseResponse;
  /** Whether purchase succeeded */
  success: boolean;
  /** Error message if failed */
  errorMessage: string;
  /** Perk that was purchased */
  perkId: string;
  /** Perk name */
  perkName: string;
  /** Points spent */
  pointsSpent: number;
  /** Remaining points */
  remainingPoints: number;
}

/**
 * Faction item data for network transmission
 */
export interface FactionItemData {
  itemId: string;
  name: string;
  description: string;
  category: string;
  templateCrc: number;
  factionPointCost: number;
  creditCost: number;
  rankRequired: number;
  statusRequired: FactionStatus | null;
  dailyLimit: number;
  purchasesToday: number;
  canPurchase: boolean;
}

/**
 * FactionItemsResponseMessage - Server response with faction items
 */
export interface FactionItemsResponseMessage {
  opcode: typeof FactionMessageOpcode.FactionItemsResponse;
  /** Array of available items */
  items: FactionItemData[];
  /** Player's current faction points */
  currentPoints: number;
  /** Player's current rank */
  currentRank: number;
}

/**
 * ItemPurchaseResponseMessage - Server response to item purchase
 */
export interface ItemPurchaseResponseMessage {
  opcode: typeof FactionMessageOpcode.ItemPurchaseResponse;
  /** Whether purchase succeeded */
  success: boolean;
  /** Error message if failed */
  errorMessage: string;
  /** Item that was purchased */
  itemId: string;
  /** Item name */
  itemName: string;
  /** Points spent */
  pointsSpent: number;
  /** Credits spent */
  creditsSpent: number;
  /** Remaining points */
  remainingPoints: number;
}

// ============================================
// Union Types
// ============================================

/**
 * Union type of all faction client messages (sent from client to server)
 */
export type FactionClientMessage =
  | EnlistRequestMessage
  | ResignRequestMessage
  | StatusChangeRequestMessage
  | FactionStandingRequestMessage
  | GCWRegionInfoRequestMessage
  | FactionPerksRequestMessage
  | PerkPurchaseRequestMessage
  | FactionItemsRequestMessage
  | ItemPurchaseRequestMessage;

/**
 * Union type of all faction server messages (sent from server to client)
 */
export type FactionServerMessage =
  | FactionStatusUpdateMessage
  | FactionPointGainMessage
  | FactionPointLossMessage
  | FactionRankChangeMessage
  | GCWRegionStatusMessage
  | GCWRegionControlChangeMessage
  | FactionBaseStatusMessage
  | FactionBasePlacedMessage
  | FactionBaseDestroyedMessage
  | FactionBaseUnderAttackMessage
  | EnlistResponseMessage
  | ResignResponseMessage
  | StatusChangeResponseMessage
  | FactionStandingResponseMessage
  | GCWRegionInfoResponseMessage
  | FactionPerksResponseMessage
  | PerkPurchaseResponseMessage
  | FactionItemsResponseMessage
  | ItemPurchaseResponseMessage;

/**
 * Union type of all faction messages
 */
export type FactionMessage = FactionClientMessage | FactionServerMessage;

// ============================================
// Helper Functions
// ============================================

/**
 * Check if an opcode is a valid faction message opcode
 */
export function isFactionMessageOpcode(
  opcode: number
): opcode is FactionMessageOpcodeType {
  return Object.values(FactionMessageOpcode).includes(
    opcode as FactionMessageOpcodeType
  );
}

/**
 * Create a FactionStatusUpdateMessage
 */
export function createFactionStatusUpdate(
  playerId: ObjectId,
  faction: Faction,
  status: FactionStatus,
  points: number,
  rank: number,
  rankTitle: string,
  pointsToNextRank: number
): FactionStatusUpdateMessage {
  return {
    opcode: FactionMessageOpcode.FactionStatusUpdate,
    playerId: playerId as bigint,
    faction,
    factionName: getFactionName(faction),
    status,
    statusName: getStatusName(status),
    factionPoints: points,
    rank,
    rankTitle,
    pointsToNextRank,
    timestamp: BigInt(Date.now()),
  };
}

/**
 * Create a FactionPointGainMessage
 */
export function createFactionPointGain(
  pointsGained: number,
  newTotal: number,
  source: string,
  regionId: string = '',
  gcwContributed: boolean = false,
  gcwPoints: number = 0
): FactionPointGainMessage {
  return {
    opcode: FactionMessageOpcode.FactionPointGain,
    pointsGained,
    newTotal,
    source,
    regionId,
    gcwContributed,
    gcwPoints,
  };
}

/**
 * Create a FactionPointLossMessage
 */
export function createFactionPointLoss(
  pointsLost: number,
  newTotal: number,
  reason: string
): FactionPointLossMessage {
  return {
    opcode: FactionMessageOpcode.FactionPointLoss,
    pointsLost,
    newTotal,
    reason,
  };
}

/**
 * Create a FactionRankChangeMessage
 */
export function createFactionRankChange(
  promoted: boolean,
  previousRank: number,
  previousRankTitle: string,
  newRank: number,
  newRankTitle: string,
  perksUnlocked: string[] = []
): FactionRankChangeMessage {
  return {
    opcode: FactionMessageOpcode.FactionRankChange,
    promoted,
    previousRank,
    previousRankTitle,
    newRank,
    newRankTitle,
    perksUnlocked,
  };
}

/**
 * Create a GCWRegionStatusMessage
 */
export function createGCWRegionStatus(
  regionId: string,
  regionName: string,
  planet: string,
  imperialControl: number,
  rebelControl: number,
  status: GCWRegionStatus,
  contested: boolean,
  imperialBases: number,
  rebelBases: number,
  lastUpdate: Date
): GCWRegionStatusMessage {
  return {
    opcode: FactionMessageOpcode.GCWRegionStatus,
    regionId,
    regionName,
    planet,
    imperialControl,
    rebelControl,
    status,
    contested,
    imperialBases,
    rebelBases,
    lastUpdate: BigInt(lastUpdate.getTime()),
  };
}

/**
 * Create a GCWRegionControlChangeMessage
 */
export function createGCWRegionControlChange(
  regionId: string,
  regionName: string,
  previousStatus: GCWRegionStatus,
  newStatus: GCWRegionStatus,
  controllingFaction: Faction,
  imperialControl: number,
  rebelControl: number
): GCWRegionControlChangeMessage {
  return {
    opcode: FactionMessageOpcode.GCWRegionControlChange,
    regionId,
    regionName,
    previousStatus,
    newStatus,
    controllingFaction,
    imperialControl,
    rebelControl,
  };
}

/**
 * Create a FactionBaseStatusMessage
 */
export function createFactionBaseStatus(
  baseId: ObjectId,
  faction: Faction,
  regionId: string,
  ownerId: ObjectId,
  ownerName: string,
  guildId: ObjectId | null,
  guildName: string,
  health: number,
  maxHealth: number,
  vulnerable: boolean,
  vulnerabilityStart: Date | null,
  vulnerabilityEnd: Date | null,
  gcwContribution: number,
  defenseRating: number,
  worldX: number,
  worldY: number,
  worldZ: number
): FactionBaseStatusMessage {
  return {
    opcode: FactionMessageOpcode.FactionBaseStatus,
    baseId: baseId as bigint,
    faction,
    regionId,
    ownerId: ownerId as bigint,
    ownerName,
    guildId: guildId ? (guildId as bigint) : 0n,
    guildName,
    health,
    maxHealth,
    healthPercent: Math.round((health / maxHealth) * 100),
    vulnerable,
    vulnerabilityStart: vulnerabilityStart ? BigInt(vulnerabilityStart.getTime()) : 0n,
    vulnerabilityEnd: vulnerabilityEnd ? BigInt(vulnerabilityEnd.getTime()) : 0n,
    gcwContribution,
    defenseRating,
    worldX,
    worldY,
    worldZ,
  };
}

/**
 * Create a FactionBasePlacedMessage
 */
export function createFactionBasePlaced(
  baseId: ObjectId,
  faction: Faction,
  regionId: string,
  ownerId: ObjectId,
  ownerName: string,
  worldX: number,
  worldY: number,
  worldZ: number
): FactionBasePlacedMessage {
  return {
    opcode: FactionMessageOpcode.FactionBasePlaced,
    baseId: baseId as bigint,
    faction,
    regionId,
    ownerId: ownerId as bigint,
    ownerName,
    worldX,
    worldY,
    worldZ,
  };
}

/**
 * Create a FactionBaseDestroyedMessage
 */
export function createFactionBaseDestroyed(
  baseId: ObjectId,
  faction: Faction,
  regionId: string,
  destroyerId: ObjectId,
  destroyerName: string,
  gcwPointsAwarded: number
): FactionBaseDestroyedMessage {
  return {
    opcode: FactionMessageOpcode.FactionBaseDestroyed,
    baseId: baseId as bigint,
    faction,
    regionId,
    destroyerId: destroyerId as bigint,
    destroyerName,
    gcwPointsAwarded,
  };
}

/**
 * Create a FactionBaseUnderAttackMessage
 */
export function createFactionBaseUnderAttack(
  baseId: ObjectId,
  regionId: string,
  currentHealth: number,
  maxHealth: number,
  attackerFaction: Faction,
  worldX: number,
  worldY: number,
  worldZ: number
): FactionBaseUnderAttackMessage {
  return {
    opcode: FactionMessageOpcode.FactionBaseUnderAttack,
    baseId: baseId as bigint,
    regionId,
    currentHealth,
    maxHealth,
    attackerFaction,
    worldX,
    worldY,
    worldZ,
  };
}

/**
 * Create an EnlistResponseMessage
 */
export function createEnlistResponse(
  success: boolean,
  errorMessage: string,
  faction: Faction,
  rank: number,
  rankTitle: string
): EnlistResponseMessage {
  return {
    opcode: FactionMessageOpcode.EnlistResponse,
    success,
    errorMessage,
    faction,
    factionName: getFactionName(faction),
    rank,
    rankTitle,
  };
}

/**
 * Create a ResignResponseMessage
 */
export function createResignResponse(
  success: boolean,
  errorMessage: string,
  previousFaction: Faction
): ResignResponseMessage {
  return {
    opcode: FactionMessageOpcode.ResignResponse,
    success,
    errorMessage,
    previousFaction,
  };
}

/**
 * Create a StatusChangeResponseMessage
 */
export function createStatusChangeResponse(
  success: boolean,
  errorMessage: string,
  previousStatus: FactionStatus,
  newStatus: FactionStatus,
  cooldownExpires: Date | null
): StatusChangeResponseMessage {
  return {
    opcode: FactionMessageOpcode.StatusChangeResponse,
    success,
    errorMessage,
    previousStatus,
    newStatus,
    cooldownExpires: cooldownExpires ? BigInt(cooldownExpires.getTime()) : 0n,
  };
}

/**
 * Get region status display name
 */
export function getRegionStatusName(status: GCWRegionStatus): string {
  switch (status) {
    case GCWRegionStatus.NEUTRAL:
      return 'Neutral';
    case GCWRegionStatus.IMPERIAL_CONTROLLED:
      return 'Imperial Controlled';
    case GCWRegionStatus.REBEL_CONTROLLED:
      return 'Rebel Controlled';
    case GCWRegionStatus.CONTESTED:
      return 'Contested';
    default:
      return 'Unknown';
  }
}
