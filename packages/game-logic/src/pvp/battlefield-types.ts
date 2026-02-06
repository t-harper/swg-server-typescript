/**
 * Battlefield Types
 * Type definitions and constants for the PvP battlefield system
 *
 * Battlefields are instanced PvP zones where players compete in
 * objective-based gameplay with rewards for participation and victory.
 */

import type { ObjectId } from '@swg/shared-types';
import { Faction } from '../faction/faction-types.js';

// ============================================
// Constants
// ============================================

/** Minimum players required per team to start a battlefield */
export const MIN_PLAYERS_PER_TEAM = 4;

/** Maximum players allowed per team */
export const MAX_PLAYERS_PER_TEAM = 20;

/** Time in milliseconds for queue timeout (5 minutes) */
export const QUEUE_TIMEOUT_MS = 5 * 60 * 1000;

/** Time in milliseconds for match start countdown (30 seconds) */
export const MATCH_START_COUNTDOWN_MS = 30 * 1000;

/** Time in milliseconds for match duration (30 minutes default) */
export const DEFAULT_MATCH_DURATION_MS = 30 * 60 * 1000;

/** Time in milliseconds for end phase (60 seconds) */
export const END_PHASE_DURATION_MS = 60 * 1000;

/** Points awarded per kill */
export const POINTS_PER_KILL = 10;

/** Points awarded for capturing an objective */
export const POINTS_PER_CAPTURE = 50;

/** Points awarded for destroying a structure */
export const POINTS_PER_STRUCTURE_DESTROY = 100;

/** Points awarded for holding ground per tick */
export const POINTS_PER_HOLD_TICK = 5;

/** Respawn delay in milliseconds */
export const DEFAULT_RESPAWN_DELAY_MS = 10 * 1000;

// ============================================
// Enums
// ============================================

/**
 * Battlefield type enum
 * Represents the different battlefield scenarios
 */
export enum BattlefieldType {
  /** Restuss battlefield - urban warfare in Restuss */
  RESTUSS = 'restuss',
  /** Battle of Echo Base - assault/defense scenario on Hoth */
  BATTLE_OF_ECHO_BASE = 'battle_of_echo_base',
  /** Bunker Assault - attack/defend bunker complex */
  BUNKER_ASSAULT = 'bunker_assault',
}

/**
 * Battlefield phase enum
 * Represents the current state of a battlefield instance
 */
export enum BattlefieldPhase {
  /** Waiting for players to join */
  WAITING = 'waiting',
  /** Match is in progress */
  IN_PROGRESS = 'in_progress',
  /** Match is ending, displaying results */
  ENDING = 'ending',
  /** Battlefield instance is closed */
  CLOSED = 'closed',
}

/**
 * Objective type enum
 * Represents different objective types in battlefields
 */
export enum ObjectiveType {
  /** Capture and hold a control point */
  CAPTURE_POINT = 'capture_point',
  /** Destroy an enemy structure */
  DESTROY_STRUCTURE = 'destroy_structure',
  /** Escort a friendly unit */
  ESCORT = 'escort',
  /** Hold ground for a duration */
  HOLD_GROUND = 'hold_ground',
}

/**
 * Battlefield reward type enum
 * Represents the different types of rewards available
 */
export enum BattlefieldRewardType {
  /** Battlefield tokens for token shop */
  TOKENS = 'tokens',
  /** Faction points */
  FACTION_POINTS = 'faction_points',
  /** GCW contribution points */
  GCW_POINTS = 'gcw_points',
  /** Physical item reward */
  ITEM = 'item',
}

/**
 * Queue status enum
 * Represents a player's queue status
 */
export enum QueueStatus {
  /** Not in queue */
  NOT_QUEUED = 'not_queued',
  /** Waiting in queue */
  QUEUED = 'queued',
  /** Match found, waiting for acceptance */
  MATCH_FOUND = 'match_found',
  /** In a battlefield match */
  IN_MATCH = 'in_match',
}

/**
 * Team designation enum
 */
export enum TeamDesignation {
  /** Imperial team */
  TEAM_IMPERIAL = 'imperial',
  /** Rebel team */
  TEAM_REBEL = 'rebel',
}

// ============================================
// Interfaces
// ============================================

/**
 * Position in 3D space
 */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Battlefield instance interface
 * Represents an active battlefield match
 */
export interface Battlefield {
  /** Unique battlefield instance ID */
  id: ObjectId;
  /** Type of battlefield */
  type: BattlefieldType;
  /** Current phase */
  phase: BattlefieldPhase;
  /** Teams in this battlefield */
  teams: Map<TeamDesignation, BattlefieldTeam>;
  /** Objectives in this battlefield */
  objectives: Map<string, BattlefieldObjective>;
  /** Match timer - when the match started */
  startedAt: Date | null;
  /** When the match will end */
  endsAt: Date | null;
  /** Maximum match duration in ms */
  matchDurationMs: number;
  /** Respawn delay in ms */
  respawnDelayMs: number;
  /** Zone/map identifier */
  zoneId: string;
  /** Instance identifier */
  instanceId: number;
  /** Timestamp of creation */
  createdAt: Date;
}

/**
 * Battlefield team interface
 * Represents one team in a battlefield
 */
export interface BattlefieldTeam {
  /** Faction this team represents */
  faction: Faction;
  /** Team designation */
  designation: TeamDesignation;
  /** Player IDs on this team */
  players: Set<ObjectId>;
  /** Current team score */
  score: number;
  /** Spawn point locations */
  spawns: Position3D[];
  /** Maximum players allowed */
  maxPlayers: number;
  /** Number of kills by this team */
  kills: number;
  /** Number of deaths on this team */
  deaths: number;
  /** Objectives captured by this team */
  objectivesCaptured: number;
}

/**
 * Battlefield objective interface
 * Represents a capturable/destroyable objective
 */
export interface BattlefieldObjective {
  /** Unique objective ID */
  id: string;
  /** Type of objective */
  type: ObjectiveType;
  /** Position of the objective */
  position: Position3D;
  /** Currently controlling team (null if neutral) */
  controller: TeamDesignation | null;
  /** Capture progress (0-100) */
  captureProgress: number;
  /** Team currently capturing (null if none) */
  capturingTeam: TeamDesignation | null;
  /** Time required to capture in ms */
  captureTimeMs: number;
  /** Points awarded for capturing */
  capturePoints: number;
  /** For DESTROY_STRUCTURE: current health */
  health?: number | undefined;
  /** For DESTROY_STRUCTURE: max health */
  maxHealth?: number | undefined;
  /** For HOLD_GROUND: hold duration required in ms */
  holdDurationMs?: number | undefined;
  /** For HOLD_GROUND: current hold time in ms */
  currentHoldTimeMs?: number | undefined;
  /** Display name */
  name: string;
  /** Whether objective is active */
  active: boolean;
}

/**
 * Battlefield participant interface
 * Tracks a player's performance in a battlefield
 */
export interface BattlefieldParticipant {
  /** Player ID */
  playerId: ObjectId;
  /** Player name */
  playerName: string;
  /** Team the player is on */
  team: TeamDesignation;
  /** Number of kills */
  kills: number;
  /** Number of deaths */
  deaths: number;
  /** Objectives captured/completed */
  objectiveScore: number;
  /** Damage dealt */
  damageDealt: number;
  /** Damage received */
  damageReceived: number;
  /** Healing done */
  healingDone: number;
  /** Time joined the battlefield */
  joinedAt: Date;
  /** Whether the player is still in the battlefield */
  active: boolean;
  /** Current respawn timer (null if alive) */
  respawnAt: Date | null;
  /** Total points contributed to team score */
  pointsContributed: number;
}

/**
 * Battlefield configuration interface
 * Defines the settings for a battlefield type
 */
export interface BattlefieldConfig {
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
  matchDurationMs: number;
  /** Respawn delay in ms */
  respawnDelayMs: number;
  /** Zone ID */
  zoneId: string;
  /** Objective configurations */
  objectives: BattlefieldObjectiveConfig[];
  /** Imperial spawn points */
  imperialSpawns: Position3D[];
  /** Rebel spawn points */
  rebelSpawns: Position3D[];
  /** Victory conditions */
  victoryConditions: VictoryCondition[];
  /** Base token reward */
  baseTokenReward: number;
  /** Base faction point reward */
  baseFactionPointReward: number;
  /** Base GCW point reward */
  baseGCWPointReward: number;
}

/**
 * Objective configuration for battlefield setup
 */
export interface BattlefieldObjectiveConfig {
  /** Objective ID */
  id: string;
  /** Objective type */
  type: ObjectiveType;
  /** Position */
  position: Position3D;
  /** Display name */
  name: string;
  /** Time to capture in ms */
  captureTimeMs: number;
  /** Points for capturing */
  capturePoints: number;
  /** Initial controller (null for neutral) */
  initialController: TeamDesignation | null;
  /** For structures: initial health */
  health?: number;
  /** For hold ground: duration required */
  holdDurationMs?: number;
}

/**
 * Victory condition interface
 */
export interface VictoryCondition {
  /** Condition type */
  type: 'score' | 'objectives' | 'elimination' | 'time';
  /** Target value */
  targetValue: number;
  /** Description */
  description: string;
}

/**
 * Battlefield reward interface
 */
export interface BattlefieldReward {
  /** Reward type */
  type: BattlefieldRewardType;
  /** Amount (for tokens, points) */
  amount: number;
  /** Item ID (for ITEM type) */
  itemId?: string;
  /** Item template CRC (for ITEM type) */
  itemTemplateCrc?: number;
}

/**
 * Queue entry interface
 * Represents a player waiting in queue
 */
export interface QueueEntry {
  /** Player ID */
  playerId: ObjectId;
  /** Player name */
  playerName: string;
  /** Player's faction */
  faction: Faction;
  /** Battlefield type queued for */
  battlefieldType: BattlefieldType;
  /** When the player joined the queue */
  queuedAt: Date;
  /** When the queue entry expires */
  expiresAt: Date;
}

/**
 * Match result interface
 */
export interface BattlefieldMatchResult {
  /** Battlefield ID */
  battlefieldId: ObjectId;
  /** Battlefield type */
  battlefieldType: BattlefieldType;
  /** Winning team (null for draw) */
  winningTeam: TeamDesignation | null;
  /** Imperial team score */
  imperialScore: number;
  /** Rebel team score */
  rebelScore: number;
  /** Match duration in ms */
  durationMs: number;
  /** All participants and their stats */
  participants: BattlefieldParticipant[];
  /** Timestamp of completion */
  completedAt: Date;
}

/**
 * Participant reward info
 */
export interface ParticipantRewardInfo {
  /** Player ID */
  playerId: ObjectId;
  /** Whether player was on winning team */
  isWinner: boolean;
  /** Whether player was MVP */
  isMVP: boolean;
  /** Rewards earned */
  rewards: BattlefieldReward[];
  /** Bonus multiplier applied */
  bonusMultiplier: number;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get battlefield type display name
 */
export function getBattlefieldTypeName(type: BattlefieldType): string {
  const names: Record<BattlefieldType, string> = {
    [BattlefieldType.RESTUSS]: 'Restuss',
    [BattlefieldType.BATTLE_OF_ECHO_BASE]: 'Battle of Echo Base',
    [BattlefieldType.BUNKER_ASSAULT]: 'Bunker Assault',
  };
  return names[type];
}

/**
 * Get battlefield phase display name
 */
export function getBattlefieldPhaseName(phase: BattlefieldPhase): string {
  const names: Record<BattlefieldPhase, string> = {
    [BattlefieldPhase.WAITING]: 'Waiting for Players',
    [BattlefieldPhase.IN_PROGRESS]: 'In Progress',
    [BattlefieldPhase.ENDING]: 'Ending',
    [BattlefieldPhase.CLOSED]: 'Closed',
  };
  return names[phase];
}

/**
 * Get objective type display name
 */
export function getObjectiveTypeName(type: ObjectiveType): string {
  const names: Record<ObjectiveType, string> = {
    [ObjectiveType.CAPTURE_POINT]: 'Capture Point',
    [ObjectiveType.DESTROY_STRUCTURE]: 'Destroy Structure',
    [ObjectiveType.ESCORT]: 'Escort',
    [ObjectiveType.HOLD_GROUND]: 'Hold Ground',
  };
  return names[type];
}

/**
 * Get team designation from faction
 */
export function getTeamFromFaction(faction: Faction): TeamDesignation | null {
  if (faction === Faction.IMPERIAL) return TeamDesignation.TEAM_IMPERIAL;
  if (faction === Faction.REBEL) return TeamDesignation.TEAM_REBEL;
  return null;
}

/**
 * Get faction from team designation
 */
export function getFactionFromTeam(team: TeamDesignation): Faction {
  if (team === TeamDesignation.TEAM_IMPERIAL) return Faction.IMPERIAL;
  return Faction.REBEL;
}

/**
 * Get opposing team
 */
export function getOpposingTeam(team: TeamDesignation): TeamDesignation {
  return team === TeamDesignation.TEAM_IMPERIAL
    ? TeamDesignation.TEAM_REBEL
    : TeamDesignation.TEAM_IMPERIAL;
}

/**
 * Create a default battlefield participant
 */
export function createDefaultParticipant(
  playerId: ObjectId,
  playerName: string,
  team: TeamDesignation
): BattlefieldParticipant {
  return {
    playerId,
    playerName,
    team,
    kills: 0,
    deaths: 0,
    objectiveScore: 0,
    damageDealt: 0,
    damageReceived: 0,
    healingDone: 0,
    joinedAt: new Date(),
    active: true,
    respawnAt: null,
    pointsContributed: 0,
  };
}

/**
 * Create a default battlefield team
 */
export function createDefaultTeam(
  faction: Faction,
  designation: TeamDesignation,
  spawns: Position3D[],
  maxPlayers: number
): BattlefieldTeam {
  return {
    faction,
    designation,
    players: new Set(),
    score: 0,
    spawns,
    maxPlayers,
    kills: 0,
    deaths: 0,
    objectivesCaptured: 0,
  };
}

/**
 * Create a battlefield objective from config
 */
export function createObjectiveFromConfig(
  config: BattlefieldObjectiveConfig
): BattlefieldObjective {
  return {
    id: config.id,
    type: config.type,
    position: config.position,
    controller: config.initialController,
    captureProgress: config.initialController ? 100 : 0,
    capturingTeam: null,
    captureTimeMs: config.captureTimeMs,
    capturePoints: config.capturePoints,
    health: config.health,
    maxHealth: config.health,
    holdDurationMs: config.holdDurationMs,
    currentHoldTimeMs: 0,
    name: config.name,
    active: true,
  };
}

/**
 * Calculate K/D ratio
 */
export function calculateKDRatio(kills: number, deaths: number): number {
  if (deaths === 0) return kills;
  return Math.round((kills / deaths) * 100) / 100;
}

/**
 * Calculate participant's total score
 */
export function calculateParticipantScore(participant: BattlefieldParticipant): number {
  return (
    participant.kills * POINTS_PER_KILL +
    participant.objectiveScore +
    participant.pointsContributed
  );
}
