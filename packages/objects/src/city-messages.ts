/**
 * City Network Messages
 * Message types for player city system communication between client and server
 *
 * City System Message Flow:
 * 1. Client requests city info -> CityInfoMessage
 * 2. Server responds with city status -> CityStatusMessage
 * 3. Client joins city -> CityJoinMessage
 * 4. Client leaves city -> CityLeaveMessage
 * 5. During elections:
 *    - CityVoteMessage for casting votes
 *    - CityElectionStatusMessage for election updates
 * 6. Economic operations:
 *    - CityTaxMessage for tax configuration
 *    - CityTreasuryMessage for deposits/withdrawals
 * 7. Structure management:
 *    - CityStructurePlaceMessage
 *    - CityStructureRemoveMessage
 * 8. Citizen info:
 *    - CityCitizenListMessage
 *    - CityBannerMessage for city banner/flag
 */

import type { ObjectId } from '@swg/shared-types';
import type {
  CityRank,
  CitySpecialization,
  CitizenRank,
  CityStructureType,
  TaxType,
  CitizenRecord,
  CityElection,
  CityTax,
  CitizenRemovalReason,
} from './city-types.js';

/**
 * City message operation types
 */
export enum CityOperation {
  /** Request city information */
  GetInfo = 0,
  /** City status response */
  Status = 1,
  /** Join a city */
  Join = 2,
  /** Leave a city */
  Leave = 3,
  /** Cast vote in election */
  Vote = 4,
  /** Election status update */
  ElectionStatus = 5,
  /** Tax configuration */
  Tax = 6,
  /** Treasury operation */
  Treasury = 7,
  /** Place structure */
  StructurePlace = 8,
  /** Remove structure */
  StructureRemove = 9,
  /** Get citizen list */
  CitizenList = 10,
  /** City banner/flag update */
  Banner = 11,
  /** Register as election candidate */
  RegisterCandidate = 12,
  /** Start election */
  StartElection = 13,
  /** Set specialization */
  SetSpecialization = 14,
  /** Promote citizen */
  PromoteCitizen = 15,
  /** Banish citizen */
  BanishCitizen = 16,
}

/**
 * Base interface for city messages
 */
interface BaseCityMessage {
  /** Message operation type */
  operation: CityOperation;
  /** City ID */
  cityId: bigint;
  /** Player object ID */
  playerId: ObjectId;
  /** Timestamp of the message */
  timestamp: number;
}

// ============================================
// City Info Messages
// ============================================

/**
 * Client request for city information
 */
export interface CityInfoMessage extends BaseCityMessage {
  operation: CityOperation.GetInfo;
}

/**
 * Create a city info request message
 */
export function createCityInfoMessage(playerId: ObjectId, cityId: bigint): CityInfoMessage {
  return {
    operation: CityOperation.GetInfo,
    cityId,
    playerId,
    timestamp: Date.now(),
  };
}

/**
 * Server response with city status information
 */
export interface CityStatusMessage {
  operation: CityOperation.Status;
  cityId: bigint;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** City name */
  name: string;
  /** Planet ID */
  planetId: string;
  /** City center position */
  position: { x: number; z: number };
  /** City border radius */
  radius: number;
  /** City rank */
  rank: CityRank;
  /** City specialization */
  specialization: CitySpecialization;
  /** Mayor name */
  mayorName: string;
  /** Mayor object ID */
  mayorId: ObjectId;
  /** Citizen count */
  citizenCount: number;
  /** Whether requester is a citizen */
  isCitizen: boolean;
  /** Requester's citizen rank (if citizen) */
  citizenRank?: CitizenRank;
  /** Whether an election is active */
  hasActiveElection: boolean;
  /** Treasury balance (visible to militia/mayor) */
  treasury?: bigint;
  /** Founding date */
  foundedAt: Date;
  timestamp: number;
}

/**
 * Create a city status response message
 */
export function createCityStatusMessage(
  playerId: ObjectId,
  cityId: bigint,
  name: string,
  planetId: string,
  position: { x: number; z: number },
  radius: number,
  rank: CityRank,
  specialization: CitySpecialization,
  mayorName: string,
  mayorId: ObjectId,
  citizenCount: number,
  isCitizen: boolean,
  hasActiveElection: boolean,
  foundedAt: Date,
  citizenRank?: CitizenRank,
  treasury?: bigint,
  success: boolean = true,
  errorMessage?: string
): CityStatusMessage {
  return {
    operation: CityOperation.Status,
    cityId,
    playerId,
    success,
    errorMessage,
    name,
    planetId,
    position,
    radius,
    rank,
    specialization,
    mayorName,
    mayorId,
    citizenCount,
    isCitizen,
    citizenRank,
    hasActiveElection,
    treasury,
    foundedAt,
    timestamp: Date.now(),
  } as CityStatusMessage;
}

// ============================================
// Join/Leave Messages
// ============================================

/**
 * Client request to join a city
 */
export interface CityJoinMessage extends BaseCityMessage {
  operation: CityOperation.Join;
  /** Character name */
  characterName: string;
}

/**
 * Create a city join request message
 */
export function createCityJoinMessage(
  playerId: ObjectId,
  cityId: bigint,
  characterName: string
): CityJoinMessage {
  return {
    operation: CityOperation.Join,
    cityId,
    playerId,
    characterName,
    timestamp: Date.now(),
  };
}

/**
 * Server response to join request
 */
export interface CityJoinResponseMessage {
  operation: CityOperation.Join;
  cityId: bigint;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** City name joined */
  cityName?: string;
  /** New citizen rank */
  citizenRank?: CitizenRank;
  timestamp: number;
}

/**
 * Create a city join response message
 */
export function createCityJoinResponse(
  playerId: ObjectId,
  cityId: bigint,
  cityName?: string,
  citizenRank?: CitizenRank,
  success: boolean = true,
  errorMessage?: string
): CityJoinResponseMessage {
  return {
    operation: CityOperation.Join,
    cityId,
    playerId,
    success,
    errorMessage,
    cityName,
    citizenRank,
    timestamp: Date.now(),
  } as CityJoinResponseMessage;
}

/**
 * Client request to leave a city
 */
export interface CityLeaveMessage extends BaseCityMessage {
  operation: CityOperation.Leave;
}

/**
 * Create a city leave request message
 */
export function createCityLeaveMessage(playerId: ObjectId, cityId: bigint): CityLeaveMessage {
  return {
    operation: CityOperation.Leave,
    cityId,
    playerId,
    timestamp: Date.now(),
  };
}

/**
 * Server response to leave request
 */
export interface CityLeaveResponseMessage {
  operation: CityOperation.Leave;
  cityId: bigint;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** City name left */
  cityName?: string;
  timestamp: number;
}

/**
 * Create a city leave response message
 */
export function createCityLeaveResponse(
  playerId: ObjectId,
  cityId: bigint,
  cityName?: string,
  success: boolean = true,
  errorMessage?: string
): CityLeaveResponseMessage {
  return {
    operation: CityOperation.Leave,
    cityId,
    playerId,
    success,
    errorMessage,
    cityName,
    timestamp: Date.now(),
  } as CityLeaveResponseMessage;
}

// ============================================
// Election Messages
// ============================================

/**
 * Client request to cast a vote
 */
export interface CityVoteMessage extends BaseCityMessage {
  operation: CityOperation.Vote;
  /** Candidate to vote for */
  candidateId: ObjectId;
}

/**
 * Create a vote message
 */
export function createCityVoteMessage(
  playerId: ObjectId,
  cityId: bigint,
  candidateId: ObjectId
): CityVoteMessage {
  return {
    operation: CityOperation.Vote,
    cityId,
    playerId,
    candidateId,
    timestamp: Date.now(),
  };
}

/**
 * Server response to vote request
 */
export interface CityVoteResponseMessage {
  operation: CityOperation.Vote;
  cityId: bigint;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Candidate voted for */
  candidateId?: ObjectId;
  /** Candidate name */
  candidateName?: string;
  timestamp: number;
}

/**
 * Create a vote response message
 */
export function createCityVoteResponse(
  playerId: ObjectId,
  cityId: bigint,
  candidateId?: ObjectId,
  candidateName?: string,
  success: boolean = true,
  errorMessage?: string
): CityVoteResponseMessage {
  return {
    operation: CityOperation.Vote,
    cityId,
    playerId,
    success,
    errorMessage,
    candidateId,
    candidateName,
    timestamp: Date.now(),
  } as CityVoteResponseMessage;
}

/**
 * Election status broadcast/response
 */
export interface CityElectionStatusMessage {
  operation: CityOperation.ElectionStatus;
  cityId: bigint;
  /** Whether an election is active */
  isActive: boolean;
  /** Election start time */
  startedAt?: Date;
  /** Election end time */
  endsAt?: Date;
  /** Candidates with vote counts */
  candidates?: Array<{
    candidateId: ObjectId;
    candidateName: string;
    voteCount: number;
  }>;
  /** Total votes cast */
  totalVotes?: number;
  /** Whether the requester has voted */
  hasVoted?: boolean;
  /** Winner info (after election ends) */
  winner?: {
    candidateId: ObjectId;
    candidateName: string;
    voteCount: number;
  };
  timestamp: number;
}

/**
 * Create an election status message
 */
export function createCityElectionStatusMessage(
  cityId: bigint,
  isActive: boolean,
  startedAt?: Date,
  endsAt?: Date,
  candidates?: Array<{
    candidateId: ObjectId;
    candidateName: string;
    voteCount: number;
  }>,
  totalVotes?: number,
  hasVoted?: boolean,
  winner?: {
    candidateId: ObjectId;
    candidateName: string;
    voteCount: number;
  }
): CityElectionStatusMessage {
  return {
    operation: CityOperation.ElectionStatus,
    cityId,
    isActive,
    startedAt,
    endsAt,
    candidates,
    totalVotes,
    hasVoted,
    winner,
    timestamp: Date.now(),
  } as CityElectionStatusMessage;
}

// ============================================
// Tax Messages
// ============================================

/**
 * Client request to view/modify tax settings
 */
export interface CityTaxMessage extends BaseCityMessage {
  operation: CityOperation.Tax;
  /** Tax type to modify (undefined for view only) */
  taxType?: TaxType;
  /** New tax rate (undefined for view only) */
  newRate?: number;
}

/**
 * Create a tax message
 */
export function createCityTaxMessage(
  playerId: ObjectId,
  cityId: bigint,
  taxType?: TaxType,
  newRate?: number
): CityTaxMessage {
  return {
    operation: CityOperation.Tax,
    cityId,
    playerId,
    taxType,
    newRate,
    timestamp: Date.now(),
  } as CityTaxMessage;
}

/**
 * Server response for tax operations
 */
export interface CityTaxResponseMessage {
  operation: CityOperation.Tax;
  cityId: bigint;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Current tax settings */
  taxes: CityTax[];
  timestamp: number;
}

/**
 * Create a tax response message
 */
export function createCityTaxResponse(
  playerId: ObjectId,
  cityId: bigint,
  taxes: CityTax[],
  success: boolean = true,
  errorMessage?: string
): CityTaxResponseMessage {
  return {
    operation: CityOperation.Tax,
    cityId,
    playerId,
    success,
    errorMessage,
    taxes,
    timestamp: Date.now(),
  } as CityTaxResponseMessage;
}

// ============================================
// Treasury Messages
// ============================================

/**
 * Treasury operation types
 */
export enum TreasuryOperationType {
  /** View treasury balance */
  View = 0,
  /** Deposit credits */
  Deposit = 1,
  /** Withdraw credits */
  Withdraw = 2,
}

/**
 * Client request for treasury operation
 */
export interface CityTreasuryMessage extends BaseCityMessage {
  operation: CityOperation.Treasury;
  /** Treasury operation type */
  treasuryOperation: TreasuryOperationType;
  /** Amount for deposit/withdraw */
  amount?: bigint;
}

/**
 * Create a treasury message
 */
export function createCityTreasuryMessage(
  playerId: ObjectId,
  cityId: bigint,
  treasuryOperation: TreasuryOperationType,
  amount?: bigint
): CityTreasuryMessage {
  return {
    operation: CityOperation.Treasury,
    cityId,
    playerId,
    treasuryOperation,
    amount,
    timestamp: Date.now(),
  } as CityTreasuryMessage;
}

/**
 * Server response for treasury operations
 */
export interface CityTreasuryResponseMessage {
  operation: CityOperation.Treasury;
  cityId: bigint;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Treasury operation performed */
  treasuryOperation: TreasuryOperationType;
  /** Amount deposited/withdrawn */
  amount?: bigint;
  /** Current treasury balance */
  balance: bigint;
  /** Weekly upkeep cost */
  weeklyUpkeep: bigint;
  timestamp: number;
}

/**
 * Create a treasury response message
 */
export function createCityTreasuryResponse(
  playerId: ObjectId,
  cityId: bigint,
  treasuryOperation: TreasuryOperationType,
  balance: bigint,
  weeklyUpkeep: bigint,
  amount?: bigint,
  success: boolean = true,
  errorMessage?: string
): CityTreasuryResponseMessage {
  return {
    operation: CityOperation.Treasury,
    cityId,
    playerId,
    success,
    errorMessage,
    treasuryOperation,
    amount,
    balance,
    weeklyUpkeep,
    timestamp: Date.now(),
  } as CityTreasuryResponseMessage;
}

// ============================================
// Structure Messages
// ============================================

/**
 * Client request to place a structure
 */
export interface CityStructurePlaceMessage extends BaseCityMessage {
  operation: CityOperation.StructurePlace;
  /** Structure object ID */
  structureId: ObjectId;
  /** Structure type */
  structureType: CityStructureType;
  /** Placement position */
  position: { x: number; z: number };
}

/**
 * Create a structure place message
 */
export function createCityStructurePlaceMessage(
  playerId: ObjectId,
  cityId: bigint,
  structureId: ObjectId,
  structureType: CityStructureType,
  position: { x: number; z: number }
): CityStructurePlaceMessage {
  return {
    operation: CityOperation.StructurePlace,
    cityId,
    playerId,
    structureId,
    structureType,
    position,
    timestamp: Date.now(),
  };
}

/**
 * Server response for structure placement
 */
export interface CityStructurePlaceResponseMessage {
  operation: CityOperation.StructurePlace;
  cityId: bigint;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Structure ID placed */
  structureId?: ObjectId;
  /** Structure type */
  structureType?: CityStructureType;
  /** Weekly maintenance cost for this structure */
  maintenanceCost?: number;
  timestamp: number;
}

/**
 * Create a structure place response message
 */
export function createCityStructurePlaceResponse(
  playerId: ObjectId,
  cityId: bigint,
  structureId?: ObjectId,
  structureType?: CityStructureType,
  maintenanceCost?: number,
  success: boolean = true,
  errorMessage?: string
): CityStructurePlaceResponseMessage {
  return {
    operation: CityOperation.StructurePlace,
    cityId,
    playerId,
    success,
    errorMessage,
    structureId,
    structureType,
    maintenanceCost,
    timestamp: Date.now(),
  } as CityStructurePlaceResponseMessage;
}

/**
 * Client request to remove a structure
 */
export interface CityStructureRemoveMessage extends BaseCityMessage {
  operation: CityOperation.StructureRemove;
  /** Structure object ID to remove */
  structureId: ObjectId;
}

/**
 * Create a structure remove message
 */
export function createCityStructureRemoveMessage(
  playerId: ObjectId,
  cityId: bigint,
  structureId: ObjectId
): CityStructureRemoveMessage {
  return {
    operation: CityOperation.StructureRemove,
    cityId,
    playerId,
    structureId,
    timestamp: Date.now(),
  };
}

/**
 * Server response for structure removal
 */
export interface CityStructureRemoveResponseMessage {
  operation: CityOperation.StructureRemove;
  cityId: bigint;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Structure ID removed */
  structureId?: ObjectId;
  timestamp: number;
}

/**
 * Create a structure remove response message
 */
export function createCityStructureRemoveResponse(
  playerId: ObjectId,
  cityId: bigint,
  structureId?: ObjectId,
  success: boolean = true,
  errorMessage?: string
): CityStructureRemoveResponseMessage {
  return {
    operation: CityOperation.StructureRemove,
    cityId,
    playerId,
    success,
    errorMessage,
    structureId,
    timestamp: Date.now(),
  } as CityStructureRemoveResponseMessage;
}

// ============================================
// Citizen List Messages
// ============================================

/**
 * Client request for citizen list
 */
export interface CityCitizenListMessage extends BaseCityMessage {
  operation: CityOperation.CitizenList;
  /** Page number for pagination */
  page?: number;
  /** Items per page */
  pageSize?: number;
}

/**
 * Create a citizen list request message
 */
export function createCityCitizenListMessage(
  playerId: ObjectId,
  cityId: bigint,
  page?: number,
  pageSize?: number
): CityCitizenListMessage {
  return {
    operation: CityOperation.CitizenList,
    cityId,
    playerId,
    page,
    pageSize,
    timestamp: Date.now(),
  } as CityCitizenListMessage;
}

/**
 * Citizen info for list response
 */
export interface CitizenListEntry {
  characterId: ObjectId;
  name: string;
  rank: CitizenRank;
  joinedAt: Date;
  isOnline: boolean;
}

/**
 * Server response with citizen list
 */
export interface CityCitizenListResponseMessage {
  operation: CityOperation.CitizenList;
  cityId: bigint;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** List of citizens */
  citizens: CitizenListEntry[];
  /** Total citizen count */
  totalCitizens: number;
  /** Current page */
  page: number;
  /** Items per page */
  pageSize: number;
  timestamp: number;
}

/**
 * Create a citizen list response message
 */
export function createCityCitizenListResponse(
  playerId: ObjectId,
  cityId: bigint,
  citizens: CitizenListEntry[],
  totalCitizens: number,
  page: number,
  pageSize: number,
  success: boolean = true,
  errorMessage?: string
): CityCitizenListResponseMessage {
  return {
    operation: CityOperation.CitizenList,
    cityId,
    playerId,
    success,
    errorMessage,
    citizens,
    totalCitizens,
    page,
    pageSize,
    timestamp: Date.now(),
  } as CityCitizenListResponseMessage;
}

// ============================================
// Banner Messages
// ============================================

/**
 * Client request for city banner/flag
 */
export interface CityBannerMessage extends BaseCityMessage {
  operation: CityOperation.Banner;
  /** New banner data (for updates) */
  bannerData?: string;
}

/**
 * Create a banner message
 */
export function createCityBannerMessage(
  playerId: ObjectId,
  cityId: bigint,
  bannerData?: string
): CityBannerMessage {
  return {
    operation: CityOperation.Banner,
    cityId,
    playerId,
    bannerData,
    timestamp: Date.now(),
  } as CityBannerMessage;
}

/**
 * Server response for banner operations
 */
export interface CityBannerResponseMessage {
  operation: CityOperation.Banner;
  cityId: bigint;
  playerId: ObjectId;
  success: boolean;
  errorMessage?: string;
  /** Current banner data */
  bannerData: string;
  timestamp: number;
}

/**
 * Create a banner response message
 */
export function createCityBannerResponse(
  playerId: ObjectId,
  cityId: bigint,
  bannerData: string,
  success: boolean = true,
  errorMessage?: string
): CityBannerResponseMessage {
  return {
    operation: CityOperation.Banner,
    cityId,
    playerId,
    success,
    errorMessage,
    bannerData,
    timestamp: Date.now(),
  } as CityBannerResponseMessage;
}

// ============================================
// Union Types and Type Guards
// ============================================

/**
 * Union type of all city request messages
 */
export type AnyCityRequestMessage =
  | CityInfoMessage
  | CityJoinMessage
  | CityLeaveMessage
  | CityVoteMessage
  | CityTaxMessage
  | CityTreasuryMessage
  | CityStructurePlaceMessage
  | CityStructureRemoveMessage
  | CityCitizenListMessage
  | CityBannerMessage;

/**
 * Union type of all city response messages
 */
export type AnyCityResponseMessage =
  | CityStatusMessage
  | CityJoinResponseMessage
  | CityLeaveResponseMessage
  | CityVoteResponseMessage
  | CityElectionStatusMessage
  | CityTaxResponseMessage
  | CityTreasuryResponseMessage
  | CityStructurePlaceResponseMessage
  | CityStructureRemoveResponseMessage
  | CityCitizenListResponseMessage
  | CityBannerResponseMessage;

/**
 * Check if message is a city info request
 */
export function isCityInfoMessage(msg: AnyCityRequestMessage): msg is CityInfoMessage {
  return msg.operation === CityOperation.GetInfo;
}

/**
 * Check if message is a join request
 */
export function isCityJoinMessage(msg: AnyCityRequestMessage): msg is CityJoinMessage {
  return msg.operation === CityOperation.Join;
}

/**
 * Check if message is a leave request
 */
export function isCityLeaveMessage(msg: AnyCityRequestMessage): msg is CityLeaveMessage {
  return msg.operation === CityOperation.Leave;
}

/**
 * Check if message is a vote request
 */
export function isCityVoteMessage(msg: AnyCityRequestMessage): msg is CityVoteMessage {
  return msg.operation === CityOperation.Vote;
}

/**
 * Check if message requires militia or mayor privileges
 */
export function requiresCityPrivilege(msg: AnyCityRequestMessage): boolean {
  return (
    msg.operation === CityOperation.Tax ||
    msg.operation === CityOperation.Treasury ||
    msg.operation === CityOperation.StructurePlace ||
    msg.operation === CityOperation.StructureRemove ||
    msg.operation === CityOperation.Banner
  );
}

/**
 * Check if message requires mayor privileges
 */
export function requiresMayorPrivilege(msg: AnyCityRequestMessage): boolean {
  return (
    msg.operation === CityOperation.Tax ||
    (msg.operation === CityOperation.Treasury &&
      (msg as CityTreasuryMessage).treasuryOperation === TreasuryOperationType.Withdraw)
  );
}

/**
 * Message CRC values for network serialization
 */
export const CityMessageCrc = {
  CITY_INFO_MESSAGE: 0x34567890,
  CITY_STATUS_MESSAGE: 0x34567891,
  CITY_JOIN_MESSAGE: 0x34567892,
  CITY_JOIN_RESPONSE: 0x34567893,
  CITY_LEAVE_MESSAGE: 0x34567894,
  CITY_LEAVE_RESPONSE: 0x34567895,
  CITY_VOTE_MESSAGE: 0x34567896,
  CITY_VOTE_RESPONSE: 0x34567897,
  CITY_ELECTION_STATUS_MESSAGE: 0x34567898,
  CITY_TAX_MESSAGE: 0x34567899,
  CITY_TAX_RESPONSE: 0x3456789a,
  CITY_TREASURY_MESSAGE: 0x3456789b,
  CITY_TREASURY_RESPONSE: 0x3456789c,
  CITY_STRUCTURE_PLACE_MESSAGE: 0x3456789d,
  CITY_STRUCTURE_PLACE_RESPONSE: 0x3456789e,
  CITY_STRUCTURE_REMOVE_MESSAGE: 0x3456789f,
  CITY_STRUCTURE_REMOVE_RESPONSE: 0x345678a0,
  CITY_CITIZEN_LIST_MESSAGE: 0x345678a1,
  CITY_CITIZEN_LIST_RESPONSE: 0x345678a2,
  CITY_BANNER_MESSAGE: 0x345678a3,
  CITY_BANNER_RESPONSE: 0x345678a4,
} as const;
