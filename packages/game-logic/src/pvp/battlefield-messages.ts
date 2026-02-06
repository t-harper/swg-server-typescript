/**
 * Battlefield Network Messages
 * Protocol message types for battlefield system client-server communication
 *
 * Note: These are game-logic level message types. The actual network
 * serialization/deserialization would be implemented in the protocol package.
 */

import type { ObjectId } from '@swg/shared-types';
import {
  BattlefieldType,
  BattlefieldPhase,
  ObjectiveType,
  BattlefieldRewardType,
  TeamDesignation,
  QueueStatus,
  type Position3D,
  type BattlefieldReward,
  getBattlefieldTypeName,
  getBattlefieldPhaseName,
} from './battlefield-types.js';

// ============================================
// Message Opcodes
// ============================================

/**
 * Battlefield message opcodes
 */
export const BattlefieldMessageOpcode = {
  // Queue messages
  /** Client request to join queue */
  QueueRequest: 0xbf001001,
  /** Server response to queue request */
  QueueResponse: 0xbf001002,
  /** Client request to leave queue */
  LeaveQueueRequest: 0xbf001003,
  /** Server response to leave queue request */
  LeaveQueueResponse: 0xbf001004,
  /** Server notification that match was found */
  MatchFound: 0xbf001005,
  /** Server update on queue status */
  QueueStatusUpdate: 0xbf001006,

  // Match messages
  /** Server notification that match is starting */
  MatchStart: 0xbf002001,
  /** Server update on match state */
  MatchStateUpdate: 0xbf002002,
  /** Server notification of player joined */
  PlayerJoined: 0xbf002003,
  /** Server notification of player left */
  PlayerLeft: 0xbf002004,
  /** Client request to leave match */
  LeaveMatchRequest: 0xbf002005,
  /** Server response to leave match request */
  LeaveMatchResponse: 0xbf002006,

  // Objective messages
  /** Server update on objective status */
  ObjectiveUpdate: 0xbf003001,
  /** Server notification of objective captured */
  ObjectiveCaptured: 0xbf003002,
  /** Server notification of objective destroyed */
  ObjectiveDestroyed: 0xbf003003,
  /** Client request to interact with objective */
  ObjectiveInteract: 0xbf003004,
  /** Server response to objective interaction */
  ObjectiveInteractResponse: 0xbf003005,

  // Score messages
  /** Server update on scores */
  ScoreUpdate: 0xbf004001,
  /** Server notification of kill */
  KillNotification: 0xbf004002,
  /** Server update on leaderboard */
  LeaderboardUpdate: 0xbf004003,
  /** Client request for leaderboard */
  LeaderboardRequest: 0xbf004004,

  // End messages
  /** Server notification of match ending */
  MatchEnding: 0xbf005001,
  /** Server notification with match result */
  MatchResult: 0xbf005002,
  /** Server notification with reward info */
  RewardNotification: 0xbf005003,

  // Respawn messages
  /** Server notification that player died */
  PlayerDied: 0xbf006001,
  /** Server notification that player can respawn */
  RespawnReady: 0xbf006002,
  /** Client request to respawn */
  RespawnRequest: 0xbf006003,
  /** Server response to respawn request */
  RespawnResponse: 0xbf006004,

  // Info messages
  /** Client request for battlefield info */
  BattlefieldInfoRequest: 0xbf007001,
  /** Server response with battlefield info */
  BattlefieldInfoResponse: 0xbf007002,
  /** Client request for available battlefields */
  AvailableBattlefieldsRequest: 0xbf007003,
  /** Server response with available battlefields */
  AvailableBattlefieldsResponse: 0xbf007004,
} as const;

export type BattlefieldMessageOpcodeType =
  (typeof BattlefieldMessageOpcode)[keyof typeof BattlefieldMessageOpcode];

// ============================================
// Queue Messages
// ============================================

/**
 * BattlefieldQueueMessage - Client request to join queue
 */
export interface BattlefieldQueueMessage {
  opcode: typeof BattlefieldMessageOpcode.QueueRequest;
  /** Type of battlefield to queue for */
  battlefieldType: BattlefieldType;
}

/**
 * BattlefieldQueueResponseMessage - Server response to queue request
 */
export interface BattlefieldQueueResponseMessage {
  opcode: typeof BattlefieldMessageOpcode.QueueResponse;
  /** Whether queue join succeeded */
  success: boolean;
  /** Error message if failed */
  errorMessage: string;
  /** Battlefield type queued for */
  battlefieldType: BattlefieldType;
  /** Estimated wait time in ms */
  estimatedWaitMs: bigint;
  /** Position in queue */
  queuePosition: number;
  /** When queue entry expires (Unix ms) */
  expiresAt: bigint;
}

/**
 * LeaveQueueRequestMessage - Client request to leave queue
 */
export interface LeaveQueueRequestMessage {
  opcode: typeof BattlefieldMessageOpcode.LeaveQueueRequest;
}

/**
 * LeaveQueueResponseMessage - Server response to leave queue
 */
export interface LeaveQueueResponseMessage {
  opcode: typeof BattlefieldMessageOpcode.LeaveQueueResponse;
  /** Whether leave succeeded */
  success: boolean;
  /** Error message if failed */
  errorMessage: string;
}

/**
 * BattlefieldMatchFoundMessage - Server notification of match found
 */
export interface BattlefieldMatchFoundMessage {
  opcode: typeof BattlefieldMessageOpcode.MatchFound;
  /** Battlefield type */
  battlefieldType: BattlefieldType;
  /** Battlefield display name */
  battlefieldName: string;
  /** Battlefield instance ID */
  battlefieldId: bigint;
  /** Team assigned to player */
  assignedTeam: TeamDesignation;
  /** Number of players on each team */
  imperialPlayerCount: number;
  rebelPlayerCount: number;
  /** When match starts (Unix ms) */
  startsAt: bigint;
}

/**
 * QueueStatusUpdateMessage - Server update on queue status
 */
export interface QueueStatusUpdateMessage {
  opcode: typeof BattlefieldMessageOpcode.QueueStatusUpdate;
  /** Current queue status */
  status: QueueStatus;
  /** Battlefield type (if queued) */
  battlefieldType: BattlefieldType | null;
  /** Position in queue */
  queuePosition: number;
  /** Estimated wait time in ms */
  estimatedWaitMs: bigint;
}

// ============================================
// Match Messages
// ============================================

/**
 * BattlefieldStartMessage - Server notification that match is starting
 */
export interface BattlefieldStartMessage {
  opcode: typeof BattlefieldMessageOpcode.MatchStart;
  /** Battlefield ID */
  battlefieldId: bigint;
  /** Battlefield type */
  battlefieldType: BattlefieldType;
  /** Battlefield name */
  battlefieldName: string;
  /** Zone ID */
  zoneId: string;
  /** Instance ID */
  instanceId: number;
  /** Player's team */
  team: TeamDesignation;
  /** Match duration in ms */
  matchDurationMs: bigint;
  /** When match ends (Unix ms) */
  endsAt: bigint;
  /** Imperial spawn positions */
  imperialSpawns: Position3DData[];
  /** Rebel spawn positions */
  rebelSpawns: Position3DData[];
  /** Objectives in the battlefield */
  objectives: ObjectiveData[];
}

/**
 * Position data for network transmission
 */
export interface Position3DData {
  x: number;
  y: number;
  z: number;
}

/**
 * MatchStateUpdateMessage - Server update on match state
 */
export interface MatchStateUpdateMessage {
  opcode: typeof BattlefieldMessageOpcode.MatchStateUpdate;
  /** Battlefield ID */
  battlefieldId: bigint;
  /** Current phase */
  phase: BattlefieldPhase;
  /** Phase display name */
  phaseName: string;
  /** Time remaining in ms */
  timeRemainingMs: bigint;
  /** Imperial score */
  imperialScore: number;
  /** Rebel score */
  rebelScore: number;
  /** Imperial player count */
  imperialPlayerCount: number;
  /** Rebel player count */
  rebelPlayerCount: number;
}

/**
 * PlayerJoinedMessage - Server notification of player joining
 */
export interface PlayerJoinedMessage {
  opcode: typeof BattlefieldMessageOpcode.PlayerJoined;
  /** Battlefield ID */
  battlefieldId: bigint;
  /** Player ID */
  playerId: bigint;
  /** Player name */
  playerName: string;
  /** Player's team */
  team: TeamDesignation;
}

/**
 * PlayerLeftMessage - Server notification of player leaving
 */
export interface PlayerLeftMessage {
  opcode: typeof BattlefieldMessageOpcode.PlayerLeft;
  /** Battlefield ID */
  battlefieldId: bigint;
  /** Player ID */
  playerId: bigint;
  /** Player name */
  playerName: string;
  /** Team */
  team: TeamDesignation;
  /** Reason for leaving */
  reason: string;
}

/**
 * LeaveMatchRequestMessage - Client request to leave match
 */
export interface LeaveMatchRequestMessage {
  opcode: typeof BattlefieldMessageOpcode.LeaveMatchRequest;
}

/**
 * LeaveMatchResponseMessage - Server response to leave match
 */
export interface LeaveMatchResponseMessage {
  opcode: typeof BattlefieldMessageOpcode.LeaveMatchResponse;
  /** Whether leave succeeded */
  success: boolean;
  /** Error message if failed */
  errorMessage: string;
  /** Penalty applied (if any) */
  penaltyApplied: boolean;
  /** Penalty description */
  penaltyDescription: string;
}

// ============================================
// Objective Messages
// ============================================

/**
 * Objective data for network transmission
 */
export interface ObjectiveData {
  /** Objective ID */
  objectiveId: string;
  /** Objective type */
  type: ObjectiveType;
  /** Display name */
  name: string;
  /** Position */
  position: Position3DData;
  /** Controlling team (empty if neutral) */
  controller: TeamDesignation | null;
  /** Capture progress (0-100) */
  captureProgress: number;
  /** Team currently capturing */
  capturingTeam: TeamDesignation | null;
  /** Points awarded for capture */
  capturePoints: number;
  /** Current health (for structures) */
  health: number;
  /** Max health (for structures) */
  maxHealth: number;
  /** Whether objective is active */
  active: boolean;
}

/**
 * BattlefieldObjectiveMessage - Server update on objective status
 */
export interface BattlefieldObjectiveMessage {
  opcode: typeof BattlefieldMessageOpcode.ObjectiveUpdate;
  /** Battlefield ID */
  battlefieldId: bigint;
  /** Objective data */
  objective: ObjectiveData;
}

/**
 * ObjectiveCapturedMessage - Server notification of objective captured
 */
export interface ObjectiveCapturedMessage {
  opcode: typeof BattlefieldMessageOpcode.ObjectiveCaptured;
  /** Battlefield ID */
  battlefieldId: bigint;
  /** Objective ID */
  objectiveId: string;
  /** Objective name */
  objectiveName: string;
  /** Capturing team */
  capturingTeam: TeamDesignation;
  /** Capturing player ID */
  capturingPlayerId: bigint;
  /** Capturing player name */
  capturingPlayerName: string;
  /** Points awarded */
  pointsAwarded: number;
}

/**
 * ObjectiveDestroyedMessage - Server notification of objective destroyed
 */
export interface ObjectiveDestroyedMessage {
  opcode: typeof BattlefieldMessageOpcode.ObjectiveDestroyed;
  /** Battlefield ID */
  battlefieldId: bigint;
  /** Objective ID */
  objectiveId: string;
  /** Objective name */
  objectiveName: string;
  /** Destroying team */
  destroyingTeam: TeamDesignation;
  /** Destroying player ID */
  destroyingPlayerId: bigint;
  /** Destroying player name */
  destroyingPlayerName: string;
  /** Points awarded */
  pointsAwarded: number;
}

/**
 * ObjectiveInteractMessage - Client request to interact with objective
 */
export interface ObjectiveInteractMessage {
  opcode: typeof BattlefieldMessageOpcode.ObjectiveInteract;
  /** Objective ID */
  objectiveId: string;
  /** Interaction type */
  interactionType: 'capture' | 'damage';
  /** Damage amount (for damage interaction) */
  damageAmount: number;
}

/**
 * ObjectiveInteractResponseMessage - Server response to objective interaction
 */
export interface ObjectiveInteractResponseMessage {
  opcode: typeof BattlefieldMessageOpcode.ObjectiveInteractResponse;
  /** Whether interaction succeeded */
  success: boolean;
  /** Error message if failed */
  errorMessage: string;
  /** Objective ID */
  objectiveId: string;
  /** New capture progress */
  captureProgress: number;
  /** New health (for structures) */
  health: number;
  /** Points awarded */
  pointsAwarded: number;
  /** Whether objective was captured/destroyed */
  completed: boolean;
}

// ============================================
// Score Messages
// ============================================

/**
 * BattlefieldScoreMessage - Server update on scores
 */
export interface BattlefieldScoreMessage {
  opcode: typeof BattlefieldMessageOpcode.ScoreUpdate;
  /** Battlefield ID */
  battlefieldId: bigint;
  /** Imperial team score */
  imperialScore: number;
  /** Rebel team score */
  rebelScore: number;
  /** Score change reason */
  reason: string;
  /** Time remaining in ms */
  timeRemainingMs: bigint;
}

/**
 * KillNotificationMessage - Server notification of kill
 */
export interface KillNotificationMessage {
  opcode: typeof BattlefieldMessageOpcode.KillNotification;
  /** Battlefield ID */
  battlefieldId: bigint;
  /** Killer player ID */
  killerId: bigint;
  /** Killer name */
  killerName: string;
  /** Killer team */
  killerTeam: TeamDesignation;
  /** Victim player ID */
  victimId: bigint;
  /** Victim name */
  victimName: string;
  /** Victim team */
  victimTeam: TeamDesignation;
  /** Points awarded to killer */
  pointsAwarded: number;
}

/**
 * Leaderboard entry for network transmission
 */
export interface LeaderboardEntryData {
  /** Rank position */
  rank: number;
  /** Player ID */
  playerId: bigint;
  /** Player name */
  playerName: string;
  /** Team */
  team: TeamDesignation;
  /** Kills */
  kills: number;
  /** Deaths */
  deaths: number;
  /** K/D ratio * 100 (for fixed point) */
  kdRatio: number;
  /** Objective score */
  objectiveScore: number;
  /** Total score */
  totalScore: number;
}

/**
 * LeaderboardUpdateMessage - Server update on leaderboard
 */
export interface LeaderboardUpdateMessage {
  opcode: typeof BattlefieldMessageOpcode.LeaderboardUpdate;
  /** Battlefield ID */
  battlefieldId: bigint;
  /** Leaderboard entries */
  entries: LeaderboardEntryData[];
}

/**
 * LeaderboardRequestMessage - Client request for leaderboard
 */
export interface LeaderboardRequestMessage {
  opcode: typeof BattlefieldMessageOpcode.LeaderboardRequest;
}

// ============================================
// End Messages
// ============================================

/**
 * BattlefieldEndingMessage - Server notification of match ending
 */
export interface BattlefieldEndingMessage {
  opcode: typeof BattlefieldMessageOpcode.MatchEnding;
  /** Battlefield ID */
  battlefieldId: bigint;
  /** Seconds until results are shown */
  secondsRemaining: number;
}

/**
 * BattlefieldEndMessage - Server notification with match result
 */
export interface BattlefieldEndMessage {
  opcode: typeof BattlefieldMessageOpcode.MatchResult;
  /** Battlefield ID */
  battlefieldId: bigint;
  /** Battlefield type */
  battlefieldType: BattlefieldType;
  /** Winning team (null for draw) */
  winningTeam: TeamDesignation | null;
  /** Imperial final score */
  imperialScore: number;
  /** Rebel final score */
  rebelScore: number;
  /** Match duration in ms */
  durationMs: bigint;
  /** Final leaderboard */
  leaderboard: LeaderboardEntryData[];
  /** MVP player ID */
  mvpPlayerId: bigint;
  /** MVP player name */
  mvpPlayerName: string;
}

/**
 * Reward data for network transmission
 */
export interface RewardData {
  /** Reward type */
  type: BattlefieldRewardType;
  /** Amount */
  amount: number;
  /** Item ID (for ITEM type) */
  itemId: string;
  /** Item name (for ITEM type) */
  itemName: string;
}

/**
 * BattlefieldRewardMessage - Server notification with reward info
 */
export interface BattlefieldRewardMessage {
  opcode: typeof BattlefieldMessageOpcode.RewardNotification;
  /** Battlefield ID */
  battlefieldId: bigint;
  /** Whether player was on winning team */
  isWinner: boolean;
  /** Whether player was MVP */
  isMVP: boolean;
  /** Rewards earned */
  rewards: RewardData[];
  /** Bonus multiplier applied */
  bonusMultiplier: number;
  /** Total tokens earned */
  totalTokens: number;
  /** New token balance */
  newTokenBalance: number;
  /** Total faction points earned */
  totalFactionPoints: number;
  /** Total GCW points earned */
  totalGCWPoints: number;
}

// ============================================
// Respawn Messages
// ============================================

/**
 * PlayerDiedMessage - Server notification that player died
 */
export interface PlayerDiedMessage {
  opcode: typeof BattlefieldMessageOpcode.PlayerDied;
  /** Battlefield ID */
  battlefieldId: bigint;
  /** Player ID */
  playerId: bigint;
  /** Killer ID (0 if environment) */
  killerId: bigint;
  /** Killer name (empty if environment) */
  killerName: string;
  /** Respawn time (Unix ms) */
  respawnAt: bigint;
  /** Seconds until respawn */
  respawnInSeconds: number;
}

/**
 * RespawnReadyMessage - Server notification that player can respawn
 */
export interface RespawnReadyMessage {
  opcode: typeof BattlefieldMessageOpcode.RespawnReady;
  /** Battlefield ID */
  battlefieldId: bigint;
  /** Available spawn points */
  spawnPoints: Position3DData[];
}

/**
 * RespawnRequestMessage - Client request to respawn
 */
export interface RespawnRequestMessage {
  opcode: typeof BattlefieldMessageOpcode.RespawnRequest;
  /** Selected spawn point index */
  spawnPointIndex: number;
}

/**
 * RespawnResponseMessage - Server response to respawn
 */
export interface RespawnResponseMessage {
  opcode: typeof BattlefieldMessageOpcode.RespawnResponse;
  /** Whether respawn succeeded */
  success: boolean;
  /** Error message if failed */
  errorMessage: string;
  /** Spawn position */
  spawnPosition: Position3DData;
}

// ============================================
// Info Messages
// ============================================

/**
 * BattlefieldInfoRequestMessage - Client request for battlefield info
 */
export interface BattlefieldInfoRequestMessage {
  opcode: typeof BattlefieldMessageOpcode.BattlefieldInfoRequest;
  /** Battlefield ID (0 for current) */
  battlefieldId: bigint;
}

/**
 * BattlefieldInfoResponseMessage - Server response with battlefield info
 */
export interface BattlefieldInfoResponseMessage {
  opcode: typeof BattlefieldMessageOpcode.BattlefieldInfoResponse;
  /** Whether battlefield was found */
  found: boolean;
  /** Battlefield ID */
  battlefieldId: bigint;
  /** Battlefield type */
  battlefieldType: BattlefieldType;
  /** Battlefield name */
  battlefieldName: string;
  /** Current phase */
  phase: BattlefieldPhase;
  /** Phase name */
  phaseName: string;
  /** Time remaining in ms */
  timeRemainingMs: bigint;
  /** Imperial score */
  imperialScore: number;
  /** Rebel score */
  rebelScore: number;
  /** Imperial player count */
  imperialPlayerCount: number;
  /** Rebel player count */
  rebelPlayerCount: number;
  /** Objectives */
  objectives: ObjectiveData[];
}

/**
 * Battlefield list entry for available battlefields
 */
export interface BattlefieldListEntry {
  /** Battlefield type */
  type: BattlefieldType;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Minimum players per team */
  minPlayersPerTeam: number;
  /** Maximum players per team */
  maxPlayersPerTeam: number;
  /** Match duration in ms */
  matchDurationMs: bigint;
  /** Imperial players in queue */
  imperialQueued: number;
  /** Rebel players in queue */
  rebelQueued: number;
  /** Active matches of this type */
  activeMatches: number;
  /** Whether queue is available */
  queueAvailable: boolean;
}

/**
 * AvailableBattlefieldsRequestMessage - Client request for available battlefields
 */
export interface AvailableBattlefieldsRequestMessage {
  opcode: typeof BattlefieldMessageOpcode.AvailableBattlefieldsRequest;
}

/**
 * AvailableBattlefieldsResponseMessage - Server response with available battlefields
 */
export interface AvailableBattlefieldsResponseMessage {
  opcode: typeof BattlefieldMessageOpcode.AvailableBattlefieldsResponse;
  /** Available battlefields */
  battlefields: BattlefieldListEntry[];
  /** Player's current queue status */
  currentQueueStatus: QueueStatus;
  /** Battlefield type player is queued for (if any) */
  queuedBattlefieldType: BattlefieldType | null;
}

// ============================================
// Union Types
// ============================================

/**
 * Union type of all battlefield client messages
 */
export type BattlefieldClientMessage =
  | BattlefieldQueueMessage
  | LeaveQueueRequestMessage
  | LeaveMatchRequestMessage
  | ObjectiveInteractMessage
  | LeaderboardRequestMessage
  | RespawnRequestMessage
  | BattlefieldInfoRequestMessage
  | AvailableBattlefieldsRequestMessage;

/**
 * Union type of all battlefield server messages
 */
export type BattlefieldServerMessage =
  | BattlefieldQueueResponseMessage
  | LeaveQueueResponseMessage
  | BattlefieldMatchFoundMessage
  | QueueStatusUpdateMessage
  | BattlefieldStartMessage
  | MatchStateUpdateMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | LeaveMatchResponseMessage
  | BattlefieldObjectiveMessage
  | ObjectiveCapturedMessage
  | ObjectiveDestroyedMessage
  | ObjectiveInteractResponseMessage
  | BattlefieldScoreMessage
  | KillNotificationMessage
  | LeaderboardUpdateMessage
  | BattlefieldEndingMessage
  | BattlefieldEndMessage
  | BattlefieldRewardMessage
  | PlayerDiedMessage
  | RespawnReadyMessage
  | RespawnResponseMessage
  | BattlefieldInfoResponseMessage
  | AvailableBattlefieldsResponseMessage;

/**
 * Union type of all battlefield messages
 */
export type BattlefieldMessage = BattlefieldClientMessage | BattlefieldServerMessage;

// ============================================
// Helper Functions
// ============================================

/**
 * Check if an opcode is a valid battlefield message opcode
 */
export function isBattlefieldMessageOpcode(
  opcode: number
): opcode is BattlefieldMessageOpcodeType {
  return Object.values(BattlefieldMessageOpcode).includes(
    opcode as BattlefieldMessageOpcodeType
  );
}

/**
 * Create a BattlefieldQueueResponseMessage
 */
export function createQueueResponse(
  success: boolean,
  errorMessage: string,
  battlefieldType: BattlefieldType,
  estimatedWaitMs: number,
  queuePosition: number,
  expiresAt: Date
): BattlefieldQueueResponseMessage {
  return {
    opcode: BattlefieldMessageOpcode.QueueResponse,
    success,
    errorMessage,
    battlefieldType,
    estimatedWaitMs: BigInt(estimatedWaitMs),
    queuePosition,
    expiresAt: BigInt(expiresAt.getTime()),
  };
}

/**
 * Create a BattlefieldMatchFoundMessage
 */
export function createMatchFoundMessage(
  battlefieldType: BattlefieldType,
  battlefieldId: ObjectId,
  assignedTeam: TeamDesignation,
  imperialPlayerCount: number,
  rebelPlayerCount: number,
  startsAt: Date
): BattlefieldMatchFoundMessage {
  return {
    opcode: BattlefieldMessageOpcode.MatchFound,
    battlefieldType,
    battlefieldName: getBattlefieldTypeName(battlefieldType),
    battlefieldId: battlefieldId as bigint,
    assignedTeam,
    imperialPlayerCount,
    rebelPlayerCount,
    startsAt: BigInt(startsAt.getTime()),
  };
}

/**
 * Create a BattlefieldStartMessage
 */
export function createStartMessage(
  battlefieldId: ObjectId,
  battlefieldType: BattlefieldType,
  zoneId: string,
  instanceId: number,
  team: TeamDesignation,
  matchDurationMs: number,
  endsAt: Date,
  imperialSpawns: Position3D[],
  rebelSpawns: Position3D[],
  objectives: ObjectiveData[]
): BattlefieldStartMessage {
  return {
    opcode: BattlefieldMessageOpcode.MatchStart,
    battlefieldId: battlefieldId as bigint,
    battlefieldType,
    battlefieldName: getBattlefieldTypeName(battlefieldType),
    zoneId,
    instanceId,
    team,
    matchDurationMs: BigInt(matchDurationMs),
    endsAt: BigInt(endsAt.getTime()),
    imperialSpawns: imperialSpawns.map((p) => ({ x: p.x, y: p.y, z: p.z })),
    rebelSpawns: rebelSpawns.map((p) => ({ x: p.x, y: p.y, z: p.z })),
    objectives,
  };
}

/**
 * Create a BattlefieldScoreMessage
 */
export function createScoreMessage(
  battlefieldId: ObjectId,
  imperialScore: number,
  rebelScore: number,
  reason: string,
  timeRemainingMs: number
): BattlefieldScoreMessage {
  return {
    opcode: BattlefieldMessageOpcode.ScoreUpdate,
    battlefieldId: battlefieldId as bigint,
    imperialScore,
    rebelScore,
    reason,
    timeRemainingMs: BigInt(timeRemainingMs),
  };
}

/**
 * Create an ObjectiveCapturedMessage
 */
export function createObjectiveCapturedMessage(
  battlefieldId: ObjectId,
  objectiveId: string,
  objectiveName: string,
  capturingTeam: TeamDesignation,
  capturingPlayerId: ObjectId,
  capturingPlayerName: string,
  pointsAwarded: number
): ObjectiveCapturedMessage {
  return {
    opcode: BattlefieldMessageOpcode.ObjectiveCaptured,
    battlefieldId: battlefieldId as bigint,
    objectiveId,
    objectiveName,
    capturingTeam,
    capturingPlayerId: capturingPlayerId as bigint,
    capturingPlayerName,
    pointsAwarded,
  };
}

/**
 * Create a KillNotificationMessage
 */
export function createKillNotification(
  battlefieldId: ObjectId,
  killerId: ObjectId,
  killerName: string,
  killerTeam: TeamDesignation,
  victimId: ObjectId,
  victimName: string,
  victimTeam: TeamDesignation,
  pointsAwarded: number
): KillNotificationMessage {
  return {
    opcode: BattlefieldMessageOpcode.KillNotification,
    battlefieldId: battlefieldId as bigint,
    killerId: killerId as bigint,
    killerName,
    killerTeam,
    victimId: victimId as bigint,
    victimName,
    victimTeam,
    pointsAwarded,
  };
}

/**
 * Create a BattlefieldEndMessage
 */
export function createEndMessage(
  battlefieldId: ObjectId,
  battlefieldType: BattlefieldType,
  winningTeam: TeamDesignation | null,
  imperialScore: number,
  rebelScore: number,
  durationMs: number,
  leaderboard: LeaderboardEntryData[],
  mvpPlayerId: ObjectId,
  mvpPlayerName: string
): BattlefieldEndMessage {
  return {
    opcode: BattlefieldMessageOpcode.MatchResult,
    battlefieldId: battlefieldId as bigint,
    battlefieldType,
    winningTeam,
    imperialScore,
    rebelScore,
    durationMs: BigInt(durationMs),
    leaderboard,
    mvpPlayerId: mvpPlayerId as bigint,
    mvpPlayerName,
  };
}

/**
 * Create a BattlefieldRewardMessage
 */
export function createRewardMessage(
  battlefieldId: ObjectId,
  isWinner: boolean,
  isMVP: boolean,
  rewards: BattlefieldReward[],
  bonusMultiplier: number,
  totalTokens: number,
  newTokenBalance: number,
  totalFactionPoints: number,
  totalGCWPoints: number
): BattlefieldRewardMessage {
  return {
    opcode: BattlefieldMessageOpcode.RewardNotification,
    battlefieldId: battlefieldId as bigint,
    isWinner,
    isMVP,
    rewards: rewards.map((r) => ({
      type: r.type,
      amount: r.amount,
      itemId: r.itemId ?? '',
      itemName: '',
    })),
    bonusMultiplier,
    totalTokens,
    newTokenBalance,
    totalFactionPoints,
    totalGCWPoints,
  };
}

/**
 * Create a PlayerDiedMessage
 */
export function createPlayerDiedMessage(
  battlefieldId: ObjectId,
  playerId: ObjectId,
  killerId: ObjectId | null,
  killerName: string,
  respawnAt: Date
): PlayerDiedMessage {
  const respawnInSeconds = Math.ceil((respawnAt.getTime() - Date.now()) / 1000);
  return {
    opcode: BattlefieldMessageOpcode.PlayerDied,
    battlefieldId: battlefieldId as bigint,
    playerId: playerId as bigint,
    killerId: killerId ? (killerId as bigint) : 0n,
    killerName,
    respawnAt: BigInt(respawnAt.getTime()),
    respawnInSeconds: Math.max(0, respawnInSeconds),
  };
}

/**
 * Create a RespawnReadyMessage
 */
export function createRespawnReadyMessage(
  battlefieldId: ObjectId,
  spawnPoints: Position3D[]
): RespawnReadyMessage {
  return {
    opcode: BattlefieldMessageOpcode.RespawnReady,
    battlefieldId: battlefieldId as bigint,
    spawnPoints: spawnPoints.map((p) => ({ x: p.x, y: p.y, z: p.z })),
  };
}

/**
 * Get team display name
 */
export function getTeamDisplayName(team: TeamDesignation): string {
  return team === TeamDesignation.TEAM_IMPERIAL ? 'Imperial' : 'Rebel';
}

/**
 * Get reward type display name
 */
export function getRewardTypeDisplayName(type: BattlefieldRewardType): string {
  const names: Record<BattlefieldRewardType, string> = {
    [BattlefieldRewardType.TOKENS]: 'Battlefield Tokens',
    [BattlefieldRewardType.FACTION_POINTS]: 'Faction Points',
    [BattlefieldRewardType.GCW_POINTS]: 'GCW Points',
    [BattlefieldRewardType.ITEM]: 'Item',
  };
  return names[type];
}
