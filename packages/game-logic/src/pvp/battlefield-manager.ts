/**
 * Battlefield Manager
 * Core service for managing PvP battlefield instances
 *
 * Handles:
 * - Battlefield zone creation and lifecycle
 * - Queue/matchmaking system
 * - Team balancing and formation
 * - Objective-based gameplay
 * - Score tracking and victory conditions
 * - Reward distribution coordination
 */

import type { ObjectId } from '@swg/shared-types';
import { Faction, isGCWFaction } from '../faction/faction-types.js';
import type { FactionManager } from '../faction/faction-manager.js';
import {
  BattlefieldType,
  BattlefieldPhase,
  ObjectiveType,
  QueueStatus,
  TeamDesignation,
  MIN_PLAYERS_PER_TEAM,
  MAX_PLAYERS_PER_TEAM,
  QUEUE_TIMEOUT_MS,
  MATCH_START_COUNTDOWN_MS,
  DEFAULT_MATCH_DURATION_MS,
  END_PHASE_DURATION_MS,
  POINTS_PER_KILL,
  POINTS_PER_CAPTURE,
  POINTS_PER_STRUCTURE_DESTROY,
  POINTS_PER_HOLD_TICK,
  DEFAULT_RESPAWN_DELAY_MS,
  type Battlefield,
  type BattlefieldTeam,
  type BattlefieldObjective,
  type BattlefieldParticipant,
  type BattlefieldConfig,
  type BattlefieldMatchResult,
  type QueueEntry,
  type Position3D,
  getBattlefieldTypeName,
  getTeamFromFaction,
  getFactionFromTeam,
  getOpposingTeam,
  createDefaultParticipant,
  createDefaultTeam,
  createObjectiveFromConfig,
  calculateParticipantScore,
} from './battlefield-types.js';
import type { BattlefieldRewardCalculator } from './battlefield-rewards.js';

// ============================================
// Configuration
// ============================================

/**
 * Battlefield manager configuration
 */
export interface BattlefieldManagerConfig {
  /** Enable detailed logging */
  enableLogging: boolean;
  /** Minimum players per team to start */
  minPlayersPerTeam: number;
  /** Maximum players per team */
  maxPlayersPerTeam: number;
  /** Queue timeout in ms */
  queueTimeoutMs: number;
  /** Match start countdown in ms */
  matchStartCountdownMs: number;
  /** Default match duration in ms */
  defaultMatchDurationMs: number;
  /** End phase duration in ms */
  endPhaseDurationMs: number;
  /** Objective update interval in ms */
  objectiveUpdateIntervalMs: number;
  /** Enable cross-faction teams for testing */
  allowCrossFactionTeams: boolean;
}

/**
 * Default battlefield manager configuration
 */
export const DEFAULT_BATTLEFIELD_CONFIG: BattlefieldManagerConfig = {
  enableLogging: false,
  minPlayersPerTeam: MIN_PLAYERS_PER_TEAM,
  maxPlayersPerTeam: MAX_PLAYERS_PER_TEAM,
  queueTimeoutMs: QUEUE_TIMEOUT_MS,
  matchStartCountdownMs: MATCH_START_COUNTDOWN_MS,
  defaultMatchDurationMs: DEFAULT_MATCH_DURATION_MS,
  endPhaseDurationMs: END_PHASE_DURATION_MS,
  objectiveUpdateIntervalMs: 1000,
  allowCrossFactionTeams: false,
};

// ============================================
// Result Types
// ============================================

/**
 * Result of a battlefield operation
 */
export interface BattlefieldOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Informational message */
  message?: string;
}

/**
 * Result of joining a queue
 */
export interface QueueResult extends BattlefieldOperationResult {
  /** Queue entry if successful */
  queueEntry?: QueueEntry;
  /** Estimated wait time in ms */
  estimatedWaitMs?: number;
  /** Position in queue */
  queuePosition?: number;
}

/**
 * Result of matchmaking
 */
export interface MatchmakeResult extends BattlefieldOperationResult {
  /** Battlefield instance if created */
  battlefield?: Battlefield;
  /** Players matched */
  matchedPlayers?: ObjectId[];
}

/**
 * Result of starting a battlefield
 */
export interface StartBattlefieldResult extends BattlefieldOperationResult {
  /** Match start time */
  startsAt?: Date;
  /** Match end time */
  endsAt?: Date;
}

/**
 * Result of capturing an objective
 */
export interface CaptureResult extends BattlefieldOperationResult {
  /** Points awarded */
  pointsAwarded?: number;
  /** New capture progress */
  captureProgress?: number;
  /** Whether capture is complete */
  captureComplete?: boolean;
  /** New controller if capture complete */
  newController?: TeamDesignation | undefined;
}

/**
 * Result of recording a kill
 */
export interface KillResult extends BattlefieldOperationResult {
  /** Points awarded to killer */
  killerPoints?: number;
  /** Victim respawn time */
  victimRespawnAt?: Date;
  /** New team scores */
  teamScores?: { imperial: number; rebel: number };
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  /** Rank position */
  rank: number;
  /** Player ID */
  playerId: ObjectId;
  /** Player name */
  playerName: string;
  /** Team */
  team: TeamDesignation;
  /** Kills */
  kills: number;
  /** Deaths */
  deaths: number;
  /** K/D Ratio */
  kdRatio: number;
  /** Objective score */
  objectiveScore: number;
  /** Total score */
  totalScore: number;
}

// ============================================
// Event Types
// ============================================

/**
 * Event emitted when a battlefield is created
 */
export interface BattlefieldCreatedEvent {
  battlefield: Battlefield;
  timestamp: Date;
}

/**
 * Event emitted when a battlefield phase changes
 */
export interface BattlefieldPhaseChangedEvent {
  battlefieldId: ObjectId;
  previousPhase: BattlefieldPhase;
  newPhase: BattlefieldPhase;
  timestamp: Date;
}

/**
 * Event emitted when a player joins a battlefield
 */
export interface PlayerJoinedBattlefieldEvent {
  battlefieldId: ObjectId;
  playerId: ObjectId;
  playerName: string;
  team: TeamDesignation;
  timestamp: Date;
}

/**
 * Event emitted when a player leaves a battlefield
 */
export interface PlayerLeftBattlefieldEvent {
  battlefieldId: ObjectId;
  playerId: ObjectId;
  reason: 'disconnect' | 'leave' | 'kicked';
  timestamp: Date;
}

/**
 * Event emitted when an objective status changes
 */
export interface ObjectiveStatusChangedEvent {
  battlefieldId: ObjectId;
  objectiveId: string;
  previousController: TeamDesignation | null;
  newController: TeamDesignation | null;
  capturedBy: ObjectId | null;
  timestamp: Date;
}

/**
 * Event emitted when a kill occurs
 */
export interface BattlefieldKillEvent {
  battlefieldId: ObjectId;
  killerId: ObjectId;
  victimId: ObjectId;
  killerTeam: TeamDesignation;
  victimTeam: TeamDesignation;
  timestamp: Date;
}

/**
 * Event emitted when scores change
 */
export interface ScoreChangedEvent {
  battlefieldId: ObjectId;
  imperialScore: number;
  rebelScore: number;
  reason: string;
  timestamp: Date;
}

/**
 * Event emitted when a battlefield ends
 */
export interface BattlefieldEndedEvent {
  battlefieldId: ObjectId;
  result: BattlefieldMatchResult;
  timestamp: Date;
}

/**
 * Event emitted when match is found
 */
export interface MatchFoundEvent {
  battlefieldType: BattlefieldType;
  players: ObjectId[];
  battlefield: Battlefield;
  timestamp: Date;
}

// ============================================
// Handler Types
// ============================================

export type BattlefieldCreatedHandler = (event: BattlefieldCreatedEvent) => void;
export type BattlefieldPhaseChangedHandler = (event: BattlefieldPhaseChangedEvent) => void;
export type PlayerJoinedBattlefieldHandler = (event: PlayerJoinedBattlefieldEvent) => void;
export type PlayerLeftBattlefieldHandler = (event: PlayerLeftBattlefieldEvent) => void;
export type ObjectiveStatusChangedHandler = (event: ObjectiveStatusChangedEvent) => void;
export type BattlefieldKillHandler = (event: BattlefieldKillEvent) => void;
export type ScoreChangedHandler = (event: ScoreChangedEvent) => void;
export type BattlefieldEndedHandler = (event: BattlefieldEndedEvent) => void;
export type MatchFoundHandler = (event: MatchFoundEvent) => void;

// ============================================
// Repository Interface
// ============================================

/**
 * Expected interface for battlefield data repository
 */
export interface BattlefieldRepository {
  /** Get battlefield configuration for a type */
  getBattlefieldConfig(type: BattlefieldType): Promise<BattlefieldConfig | undefined>;

  /** Save a battlefield instance */
  saveBattlefield(battlefield: Battlefield): Promise<void>;

  /** Get a battlefield by ID */
  getBattlefield(battlefieldId: ObjectId): Promise<Battlefield | undefined>;

  /** Delete a battlefield */
  deleteBattlefield(battlefieldId: ObjectId): Promise<void>;

  /** Save participant data */
  saveParticipant(battlefieldId: ObjectId, participant: BattlefieldParticipant): Promise<void>;

  /** Get all participants for a battlefield */
  getParticipants(battlefieldId: ObjectId): Promise<BattlefieldParticipant[]>;

  /** Save match result */
  saveMatchResult(result: BattlefieldMatchResult): Promise<void>;

  /** Get player's match history */
  getPlayerMatchHistory(playerId: ObjectId, limit: number): Promise<BattlefieldMatchResult[]>;

  /** Get player's battlefield statistics */
  getPlayerBattlefieldStats(playerId: ObjectId): Promise<PlayerBattlefieldStats | undefined>;

  /** Update player's battlefield statistics */
  updatePlayerBattlefieldStats(stats: PlayerBattlefieldStats): Promise<void>;

  /** Generate a unique battlefield ID */
  generateBattlefieldId(): ObjectId;

  /** Get next instance ID for a zone */
  getNextInstanceId(zoneId: string): Promise<number>;
}

/**
 * Player battlefield statistics
 */
export interface PlayerBattlefieldStats {
  playerId: ObjectId;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  totalKills: number;
  totalDeaths: number;
  totalObjectiveScore: number;
  totalTokensEarned: number;
  currentTokens: number;
  lastMatchAt: Date | null;
}

// ============================================
// Battlefield Manager Class
// ============================================

/**
 * Battlefield Manager
 * Central service for all battlefield operations
 */
export class BattlefieldManager {
  private repository: BattlefieldRepository;
  private factionManager: FactionManager;
  private rewardCalculator: BattlefieldRewardCalculator | null;
  private config: BattlefieldManagerConfig;

  /** Active battlefields */
  private activeBattlefields: Map<ObjectId, Battlefield>;

  /** Participant data by battlefield */
  private participants: Map<ObjectId, Map<ObjectId, BattlefieldParticipant>>;

  /** Player to battlefield mapping */
  private playerBattlefieldMap: Map<ObjectId, ObjectId>;

  /** Queue by battlefield type */
  private queues: Map<BattlefieldType, Map<ObjectId, QueueEntry>>;

  /** Player queue status */
  private playerQueueStatus: Map<ObjectId, QueueStatus>;

  /** Objective update intervals */
  private objectiveIntervals: Map<ObjectId, ReturnType<typeof setInterval>>;

  /** Event handlers */
  private battlefieldCreatedHandlers: Set<BattlefieldCreatedHandler>;
  private phaseChangedHandlers: Set<BattlefieldPhaseChangedHandler>;
  private playerJoinedHandlers: Set<PlayerJoinedBattlefieldHandler>;
  private playerLeftHandlers: Set<PlayerLeftBattlefieldHandler>;
  private objectiveStatusChangedHandlers: Set<ObjectiveStatusChangedHandler>;
  private killHandlers: Set<BattlefieldKillHandler>;
  private scoreChangedHandlers: Set<ScoreChangedHandler>;
  private battlefieldEndedHandlers: Set<BattlefieldEndedHandler>;
  private matchFoundHandlers: Set<MatchFoundHandler>;

  /**
   * Create a new Battlefield Manager
   */
  constructor(
    repository: BattlefieldRepository,
    factionManager: FactionManager,
    config: Partial<BattlefieldManagerConfig> = {}
  ) {
    this.repository = repository;
    this.factionManager = factionManager;
    this.rewardCalculator = null;
    this.config = { ...DEFAULT_BATTLEFIELD_CONFIG, ...config };

    this.activeBattlefields = new Map();
    this.participants = new Map();
    this.playerBattlefieldMap = new Map();
    this.queues = new Map();
    this.playerQueueStatus = new Map();
    this.objectiveIntervals = new Map();

    // Initialize queues for each battlefield type
    for (const type of Object.values(BattlefieldType)) {
      this.queues.set(type, new Map());
    }

    // Initialize event handler sets
    this.battlefieldCreatedHandlers = new Set();
    this.phaseChangedHandlers = new Set();
    this.playerJoinedHandlers = new Set();
    this.playerLeftHandlers = new Set();
    this.objectiveStatusChangedHandlers = new Set();
    this.killHandlers = new Set();
    this.scoreChangedHandlers = new Set();
    this.battlefieldEndedHandlers = new Set();
    this.matchFoundHandlers = new Set();
  }

  /**
   * Set the reward calculator
   */
  setRewardCalculator(calculator: BattlefieldRewardCalculator): void {
    this.rewardCalculator = calculator;
  }

  // ============================================
  // Event Registration
  // ============================================

  onBattlefieldCreated(handler: BattlefieldCreatedHandler): void {
    this.battlefieldCreatedHandlers.add(handler);
  }

  offBattlefieldCreated(handler: BattlefieldCreatedHandler): void {
    this.battlefieldCreatedHandlers.delete(handler);
  }

  onPhaseChanged(handler: BattlefieldPhaseChangedHandler): void {
    this.phaseChangedHandlers.add(handler);
  }

  offPhaseChanged(handler: BattlefieldPhaseChangedHandler): void {
    this.phaseChangedHandlers.delete(handler);
  }

  onPlayerJoined(handler: PlayerJoinedBattlefieldHandler): void {
    this.playerJoinedHandlers.add(handler);
  }

  offPlayerJoined(handler: PlayerJoinedBattlefieldHandler): void {
    this.playerJoinedHandlers.delete(handler);
  }

  onPlayerLeft(handler: PlayerLeftBattlefieldHandler): void {
    this.playerLeftHandlers.add(handler);
  }

  offPlayerLeft(handler: PlayerLeftBattlefieldHandler): void {
    this.playerLeftHandlers.delete(handler);
  }

  onObjectiveStatusChanged(handler: ObjectiveStatusChangedHandler): void {
    this.objectiveStatusChangedHandlers.add(handler);
  }

  offObjectiveStatusChanged(handler: ObjectiveStatusChangedHandler): void {
    this.objectiveStatusChangedHandlers.delete(handler);
  }

  onKill(handler: BattlefieldKillHandler): void {
    this.killHandlers.add(handler);
  }

  offKill(handler: BattlefieldKillHandler): void {
    this.killHandlers.delete(handler);
  }

  onScoreChanged(handler: ScoreChangedHandler): void {
    this.scoreChangedHandlers.add(handler);
  }

  offScoreChanged(handler: ScoreChangedHandler): void {
    this.scoreChangedHandlers.delete(handler);
  }

  onBattlefieldEnded(handler: BattlefieldEndedHandler): void {
    this.battlefieldEndedHandlers.add(handler);
  }

  offBattlefieldEnded(handler: BattlefieldEndedHandler): void {
    this.battlefieldEndedHandlers.delete(handler);
  }

  onMatchFound(handler: MatchFoundHandler): void {
    this.matchFoundHandlers.add(handler);
  }

  offMatchFound(handler: MatchFoundHandler): void {
    this.matchFoundHandlers.delete(handler);
  }

  // ============================================
  // Event Emission
  // ============================================

  private emitBattlefieldCreated(event: BattlefieldCreatedEvent): void {
    for (const handler of this.battlefieldCreatedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[BattlefieldManager] Error in battlefield created handler:', error);
      }
    }
  }

  private emitPhaseChanged(event: BattlefieldPhaseChangedEvent): void {
    for (const handler of this.phaseChangedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[BattlefieldManager] Error in phase changed handler:', error);
      }
    }
  }

  private emitPlayerJoined(event: PlayerJoinedBattlefieldEvent): void {
    for (const handler of this.playerJoinedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[BattlefieldManager] Error in player joined handler:', error);
      }
    }
  }

  private emitPlayerLeft(event: PlayerLeftBattlefieldEvent): void {
    for (const handler of this.playerLeftHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[BattlefieldManager] Error in player left handler:', error);
      }
    }
  }

  private emitObjectiveStatusChanged(event: ObjectiveStatusChangedEvent): void {
    for (const handler of this.objectiveStatusChangedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[BattlefieldManager] Error in objective status changed handler:', error);
      }
    }
  }

  private emitKill(event: BattlefieldKillEvent): void {
    for (const handler of this.killHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[BattlefieldManager] Error in kill handler:', error);
      }
    }
  }

  private emitScoreChanged(event: ScoreChangedEvent): void {
    for (const handler of this.scoreChangedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[BattlefieldManager] Error in score changed handler:', error);
      }
    }
  }

  private emitBattlefieldEnded(event: BattlefieldEndedEvent): void {
    for (const handler of this.battlefieldEndedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[BattlefieldManager] Error in battlefield ended handler:', error);
      }
    }
  }

  private emitMatchFound(event: MatchFoundEvent): void {
    for (const handler of this.matchFoundHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[BattlefieldManager] Error in match found handler:', error);
      }
    }
  }

  // ============================================
  // Battlefield Creation
  // ============================================

  /**
   * Create a new battlefield instance
   */
  async createBattlefield(type: BattlefieldType): Promise<Battlefield | null> {
    const battlefieldConfig = await this.repository.getBattlefieldConfig(type);
    if (!battlefieldConfig) {
      if (this.config.enableLogging) {
        console.error(`[BattlefieldManager] No configuration found for battlefield type: ${type}`);
      }
      return null;
    }

    const battlefieldId = this.repository.generateBattlefieldId();
    const instanceId = await this.repository.getNextInstanceId(battlefieldConfig.zoneId);

    // Create teams
    const teams = new Map<TeamDesignation, BattlefieldTeam>();
    teams.set(
      TeamDesignation.TEAM_IMPERIAL,
      createDefaultTeam(
        Faction.IMPERIAL,
        TeamDesignation.TEAM_IMPERIAL,
        battlefieldConfig.imperialSpawns,
        battlefieldConfig.maxPlayersPerTeam
      )
    );
    teams.set(
      TeamDesignation.TEAM_REBEL,
      createDefaultTeam(
        Faction.REBEL,
        TeamDesignation.TEAM_REBEL,
        battlefieldConfig.rebelSpawns,
        battlefieldConfig.maxPlayersPerTeam
      )
    );

    // Create objectives
    const objectives = new Map<string, BattlefieldObjective>();
    for (const objConfig of battlefieldConfig.objectives) {
      objectives.set(objConfig.id, createObjectiveFromConfig(objConfig));
    }

    const battlefield: Battlefield = {
      id: battlefieldId,
      type,
      phase: BattlefieldPhase.WAITING,
      teams,
      objectives,
      startedAt: null,
      endsAt: null,
      matchDurationMs: battlefieldConfig.matchDurationMs,
      respawnDelayMs: battlefieldConfig.respawnDelayMs,
      zoneId: battlefieldConfig.zoneId,
      instanceId,
      createdAt: new Date(),
    };

    this.activeBattlefields.set(battlefieldId, battlefield);
    this.participants.set(battlefieldId, new Map());

    await this.repository.saveBattlefield(battlefield);

    if (this.config.enableLogging) {
      console.log(
        `[BattlefieldManager] Created battlefield ${battlefieldId} (${getBattlefieldTypeName(type)})`
      );
    }

    this.emitBattlefieldCreated({
      battlefield,
      timestamp: new Date(),
    });

    return battlefield;
  }

  // ============================================
  // Queue Management
  // ============================================

  /**
   * Add a player to the queue for a battlefield type
   */
  async queuePlayer(
    playerId: ObjectId,
    playerName: string,
    battlefieldType: BattlefieldType
  ): Promise<QueueResult> {
    // Check if player is already in queue or match
    const currentStatus = this.playerQueueStatus.get(playerId);
    if (currentStatus && currentStatus !== QueueStatus.NOT_QUEUED) {
      return {
        success: false,
        error: 'You are already in a queue or match.',
      };
    }

    // Get player faction
    const playerFaction = await this.factionManager.getPlayerFaction(playerId);
    if (!isGCWFaction(playerFaction)) {
      return {
        success: false,
        error: 'You must be enlisted in a faction to join a battlefield.',
      };
    }

    const queue = this.queues.get(battlefieldType)!;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.queueTimeoutMs);

    const queueEntry: QueueEntry = {
      playerId,
      playerName,
      faction: playerFaction,
      battlefieldType,
      queuedAt: now,
      expiresAt,
    };

    queue.set(playerId, queueEntry);
    this.playerQueueStatus.set(playerId, QueueStatus.QUEUED);

    // Calculate queue position
    const queuePosition = this.getQueuePosition(playerId, battlefieldType);

    // Estimate wait time based on queue size and matchmaking requirements
    const estimatedWaitMs = this.estimateWaitTime(battlefieldType);

    if (this.config.enableLogging) {
      console.log(
        `[BattlefieldManager] Player ${playerId} joined queue for ${getBattlefieldTypeName(battlefieldType)}`
      );
    }

    // Attempt matchmaking
    await this.matchmake(battlefieldType);

    return {
      success: true,
      queueEntry,
      estimatedWaitMs,
      queuePosition,
      message: `You have joined the queue for ${getBattlefieldTypeName(battlefieldType)}.`,
    };
  }

  /**
   * Remove a player from the queue
   */
  async leaveQueue(playerId: ObjectId): Promise<BattlefieldOperationResult> {
    const currentStatus = this.playerQueueStatus.get(playerId);
    if (currentStatus !== QueueStatus.QUEUED) {
      return {
        success: false,
        error: 'You are not in a queue.',
      };
    }

    // Find and remove from queue
    for (const [type, queue] of this.queues) {
      if (queue.has(playerId)) {
        queue.delete(playerId);
        this.playerQueueStatus.set(playerId, QueueStatus.NOT_QUEUED);

        if (this.config.enableLogging) {
          console.log(`[BattlefieldManager] Player ${playerId} left queue for ${getBattlefieldTypeName(type)}`);
        }

        return {
          success: true,
          message: 'You have left the queue.',
        };
      }
    }

    return {
      success: false,
      error: 'Queue entry not found.',
    };
  }

  /**
   * Get player's current queue status
   */
  getPlayerQueueStatus(playerId: ObjectId): QueueStatus {
    return this.playerQueueStatus.get(playerId) ?? QueueStatus.NOT_QUEUED;
  }

  /**
   * Get queue position for a player
   */
  private getQueuePosition(playerId: ObjectId, battlefieldType: BattlefieldType): number {
    const queue = this.queues.get(battlefieldType)!;
    let position = 1;
    for (const [id] of queue) {
      if (id === playerId) return position;
      position++;
    }
    return position;
  }

  /**
   * Estimate wait time for a battlefield type
   */
  private estimateWaitTime(battlefieldType: BattlefieldType): number {
    const queue = this.queues.get(battlefieldType)!;
    const imperialCount = Array.from(queue.values()).filter(
      (e) => e.faction === Faction.IMPERIAL
    ).length;
    const rebelCount = Array.from(queue.values()).filter(
      (e) => e.faction === Faction.REBEL
    ).length;

    const minNeeded = this.config.minPlayersPerTeam;
    const imperialNeeded = Math.max(0, minNeeded - imperialCount);
    const rebelNeeded = Math.max(0, minNeeded - rebelCount);

    // Rough estimate: 30 seconds per player needed
    return (imperialNeeded + rebelNeeded) * 30000;
  }

  // ============================================
  // Matchmaking
  // ============================================

  /**
   * Attempt to form a match from the queue
   */
  async matchmake(battlefieldType: BattlefieldType): Promise<MatchmakeResult> {
    const queue = this.queues.get(battlefieldType)!;

    // Separate players by faction
    const imperialPlayers: QueueEntry[] = [];
    const rebelPlayers: QueueEntry[] = [];

    for (const entry of queue.values()) {
      if (entry.faction === Faction.IMPERIAL) {
        imperialPlayers.push(entry);
      } else if (entry.faction === Faction.REBEL) {
        rebelPlayers.push(entry);
      }
    }

    // Check if we have enough players
    if (
      imperialPlayers.length < this.config.minPlayersPerTeam ||
      rebelPlayers.length < this.config.minPlayersPerTeam
    ) {
      return {
        success: false,
        error: 'Not enough players in queue for a match.',
      };
    }

    // Balance teams - take equal numbers from each side
    const teamSize = Math.min(
      Math.min(imperialPlayers.length, rebelPlayers.length),
      this.config.maxPlayersPerTeam
    );

    // Sort by queue time (first in, first out)
    imperialPlayers.sort((a, b) => a.queuedAt.getTime() - b.queuedAt.getTime());
    rebelPlayers.sort((a, b) => a.queuedAt.getTime() - b.queuedAt.getTime());

    const selectedImperials = imperialPlayers.slice(0, teamSize);
    const selectedRebels = rebelPlayers.slice(0, teamSize);

    // Create battlefield
    const battlefield = await this.createBattlefield(battlefieldType);
    if (!battlefield) {
      return {
        success: false,
        error: 'Failed to create battlefield instance.',
      };
    }

    // Add players to battlefield
    const matchedPlayers: ObjectId[] = [];

    for (const entry of selectedImperials) {
      await this.addPlayerToBattlefield(
        battlefield.id,
        entry.playerId,
        entry.playerName,
        TeamDesignation.TEAM_IMPERIAL
      );
      queue.delete(entry.playerId);
      matchedPlayers.push(entry.playerId);
    }

    for (const entry of selectedRebels) {
      await this.addPlayerToBattlefield(
        battlefield.id,
        entry.playerId,
        entry.playerName,
        TeamDesignation.TEAM_REBEL
      );
      queue.delete(entry.playerId);
      matchedPlayers.push(entry.playerId);
    }

    if (this.config.enableLogging) {
      console.log(
        `[BattlefieldManager] Matchmade ${matchedPlayers.length} players for ${getBattlefieldTypeName(battlefieldType)}`
      );
    }

    this.emitMatchFound({
      battlefieldType,
      players: matchedPlayers,
      battlefield,
      timestamp: new Date(),
    });

    // Auto-start if we have enough players
    if (matchedPlayers.length >= this.config.minPlayersPerTeam * 2) {
      setTimeout(() => {
        this.startBattlefield(battlefield.id);
      }, this.config.matchStartCountdownMs);
    }

    return {
      success: true,
      battlefield,
      matchedPlayers,
      message: `Match found! ${matchedPlayers.length} players.`,
    };
  }

  /**
   * Add a player to a battlefield
   */
  private async addPlayerToBattlefield(
    battlefieldId: ObjectId,
    playerId: ObjectId,
    playerName: string,
    team: TeamDesignation
  ): Promise<boolean> {
    const battlefield = this.activeBattlefields.get(battlefieldId);
    if (!battlefield) return false;

    const teamData = battlefield.teams.get(team);
    if (!teamData) return false;

    if (teamData.players.size >= teamData.maxPlayers) return false;

    teamData.players.add(playerId);
    this.playerBattlefieldMap.set(playerId, battlefieldId);
    this.playerQueueStatus.set(playerId, QueueStatus.IN_MATCH);

    const participant = createDefaultParticipant(playerId, playerName, team);
    const battlefieldParticipants = this.participants.get(battlefieldId)!;
    battlefieldParticipants.set(playerId, participant);

    await this.repository.saveParticipant(battlefieldId, participant);

    this.emitPlayerJoined({
      battlefieldId,
      playerId,
      playerName,
      team,
      timestamp: new Date(),
    });

    return true;
  }

  // ============================================
  // Battlefield Lifecycle
  // ============================================

  /**
   * Start a battlefield match
   */
  async startBattlefield(battlefieldId: ObjectId): Promise<StartBattlefieldResult> {
    const battlefield = this.activeBattlefields.get(battlefieldId);
    if (!battlefield) {
      return {
        success: false,
        error: 'Battlefield not found.',
      };
    }

    if (battlefield.phase !== BattlefieldPhase.WAITING) {
      return {
        success: false,
        error: 'Battlefield is not in waiting phase.',
      };
    }

    const previousPhase = battlefield.phase;
    const now = new Date();
    battlefield.phase = BattlefieldPhase.IN_PROGRESS;
    battlefield.startedAt = now;
    battlefield.endsAt = new Date(now.getTime() + battlefield.matchDurationMs);

    await this.repository.saveBattlefield(battlefield);

    // Start objective update interval
    this.startObjectiveUpdates(battlefieldId);

    // Schedule match end
    setTimeout(() => {
      this.endBattlefield(battlefieldId);
    }, battlefield.matchDurationMs);

    if (this.config.enableLogging) {
      console.log(`[BattlefieldManager] Battlefield ${battlefieldId} started`);
    }

    this.emitPhaseChanged({
      battlefieldId,
      previousPhase,
      newPhase: BattlefieldPhase.IN_PROGRESS,
      timestamp: now,
    });

    return {
      success: true,
      startsAt: now,
      endsAt: battlefield.endsAt,
      message: 'The battle has begun!',
    };
  }

  /**
   * End a battlefield match
   */
  async endBattlefield(battlefieldId: ObjectId): Promise<BattlefieldOperationResult> {
    const battlefield = this.activeBattlefields.get(battlefieldId);
    if (!battlefield) {
      return {
        success: false,
        error: 'Battlefield not found.',
      };
    }

    if (battlefield.phase === BattlefieldPhase.CLOSED) {
      return {
        success: false,
        error: 'Battlefield is already closed.',
      };
    }

    const previousPhase = battlefield.phase;
    battlefield.phase = BattlefieldPhase.ENDING;

    // Stop objective updates
    this.stopObjectiveUpdates(battlefieldId);

    // Calculate match result
    const result = await this.calculateMatchResult(battlefieldId);

    // Distribute rewards
    if (this.rewardCalculator) {
      await this.rewardCalculator.distributeRewards(result);
    }

    // Save result
    await this.repository.saveMatchResult(result);

    this.emitPhaseChanged({
      battlefieldId,
      previousPhase,
      newPhase: BattlefieldPhase.ENDING,
      timestamp: new Date(),
    });

    this.emitBattlefieldEnded({
      battlefieldId,
      result,
      timestamp: new Date(),
    });

    // Schedule cleanup
    setTimeout(() => {
      this.cleanupBattlefield(battlefieldId);
    }, this.config.endPhaseDurationMs);

    if (this.config.enableLogging) {
      console.log(
        `[BattlefieldManager] Battlefield ${battlefieldId} ended. Winner: ${result.winningTeam ?? 'Draw'}`
      );
    }

    return {
      success: true,
      message: `The battle has ended. ${result.winningTeam ? `${result.winningTeam} team wins!` : "It's a draw!"}`,
    };
  }

  /**
   * Cleanup a closed battlefield
   */
  private async cleanupBattlefield(battlefieldId: ObjectId): Promise<void> {
    const battlefield = this.activeBattlefields.get(battlefieldId);
    if (!battlefield) return;

    battlefield.phase = BattlefieldPhase.CLOSED;

    // Remove players from battlefield tracking
    const battlefieldParticipants = this.participants.get(battlefieldId);
    if (battlefieldParticipants) {
      for (const [playerId] of battlefieldParticipants) {
        this.playerBattlefieldMap.delete(playerId);
        this.playerQueueStatus.set(playerId, QueueStatus.NOT_QUEUED);
      }
    }

    // Clean up data structures
    this.activeBattlefields.delete(battlefieldId);
    this.participants.delete(battlefieldId);

    if (this.config.enableLogging) {
      console.log(`[BattlefieldManager] Battlefield ${battlefieldId} cleaned up`);
    }
  }

  // ============================================
  // Objective Management
  // ============================================

  /**
   * Start objective update interval
   */
  private startObjectiveUpdates(battlefieldId: ObjectId): void {
    const interval = setInterval(() => {
      this.updateObjectives(battlefieldId);
    }, this.config.objectiveUpdateIntervalMs);

    this.objectiveIntervals.set(battlefieldId, interval);
  }

  /**
   * Stop objective update interval
   */
  private stopObjectiveUpdates(battlefieldId: ObjectId): void {
    const interval = this.objectiveIntervals.get(battlefieldId);
    if (interval) {
      clearInterval(interval);
      this.objectiveIntervals.delete(battlefieldId);
    }
  }

  /**
   * Update all objectives in a battlefield
   */
  private async updateObjectives(battlefieldId: ObjectId): Promise<void> {
    const battlefield = this.activeBattlefields.get(battlefieldId);
    if (!battlefield || battlefield.phase !== BattlefieldPhase.IN_PROGRESS) return;

    for (const objective of battlefield.objectives.values()) {
      if (!objective.active) continue;

      // Handle hold ground objectives
      if (objective.type === ObjectiveType.HOLD_GROUND && objective.controller) {
        objective.currentHoldTimeMs =
          (objective.currentHoldTimeMs ?? 0) + this.config.objectiveUpdateIntervalMs;

        if (
          objective.holdDurationMs &&
          objective.currentHoldTimeMs >= objective.holdDurationMs
        ) {
          // Award points for holding
          const team = battlefield.teams.get(objective.controller);
          if (team) {
            team.score += POINTS_PER_HOLD_TICK;
            this.emitScoreChanged({
              battlefieldId,
              imperialScore: battlefield.teams.get(TeamDesignation.TEAM_IMPERIAL)?.score ?? 0,
              rebelScore: battlefield.teams.get(TeamDesignation.TEAM_REBEL)?.score ?? 0,
              reason: `${objective.name} held`,
              timestamp: new Date(),
            });
          }
          objective.currentHoldTimeMs = 0;
        }
      }
    }
  }

  /**
   * Capture an objective
   */
  async captureObjective(
    battlefieldId: ObjectId,
    objectiveId: string,
    playerId: ObjectId,
    captureAmount: number = 10
  ): Promise<CaptureResult> {
    const battlefield = this.activeBattlefields.get(battlefieldId);
    if (!battlefield) {
      return {
        success: false,
        error: 'Battlefield not found.',
      };
    }

    if (battlefield.phase !== BattlefieldPhase.IN_PROGRESS) {
      return {
        success: false,
        error: 'Match is not in progress.',
      };
    }

    const objective = battlefield.objectives.get(objectiveId);
    if (!objective || !objective.active) {
      return {
        success: false,
        error: 'Objective not found or not active.',
      };
    }

    if (objective.type !== ObjectiveType.CAPTURE_POINT) {
      return {
        success: false,
        error: 'This objective cannot be captured this way.',
      };
    }

    // Get player's team
    const participant = this.participants.get(battlefieldId)?.get(playerId);
    if (!participant) {
      return {
        success: false,
        error: 'Player not found in battlefield.',
      };
    }

    const playerTeam = participant.team;

    // Update capture progress
    if (objective.controller === playerTeam) {
      return {
        success: false,
        error: 'Your team already controls this objective.',
      };
    }

    // If capturing team is different, reset progress
    if (objective.capturingTeam !== playerTeam) {
      objective.capturingTeam = playerTeam;
      objective.captureProgress = 0;
    }

    objective.captureProgress = Math.min(100, objective.captureProgress + captureAmount);

    // Check if capture is complete
    const captureComplete = objective.captureProgress >= 100;
    let pointsAwarded = 0;
    let newController: TeamDesignation | undefined;

    if (captureComplete) {
      const previousController = objective.controller;
      objective.controller = playerTeam;
      objective.capturingTeam = null;
      objective.captureProgress = 100;
      newController = playerTeam;

      // Award points
      pointsAwarded = objective.capturePoints || POINTS_PER_CAPTURE;
      const team = battlefield.teams.get(playerTeam);
      if (team) {
        team.score += pointsAwarded;
        team.objectivesCaptured++;
      }

      // Update participant
      participant.objectiveScore += pointsAwarded;
      participant.pointsContributed += pointsAwarded;

      this.emitObjectiveStatusChanged({
        battlefieldId,
        objectiveId,
        previousController,
        newController: playerTeam,
        capturedBy: playerId,
        timestamp: new Date(),
      });

      this.emitScoreChanged({
        battlefieldId,
        imperialScore: battlefield.teams.get(TeamDesignation.TEAM_IMPERIAL)?.score ?? 0,
        rebelScore: battlefield.teams.get(TeamDesignation.TEAM_REBEL)?.score ?? 0,
        reason: `${objective.name} captured`,
        timestamp: new Date(),
      });
    }

    return {
      success: true,
      pointsAwarded,
      captureProgress: objective.captureProgress,
      captureComplete,
      newController,
      message: captureComplete
        ? `You have captured ${objective.name}!`
        : `Capturing ${objective.name}... ${objective.captureProgress}%`,
    };
  }

  /**
   * Damage a structure objective
   */
  async damageObjective(
    battlefieldId: ObjectId,
    objectiveId: string,
    playerId: ObjectId,
    damage: number
  ): Promise<CaptureResult> {
    const battlefield = this.activeBattlefields.get(battlefieldId);
    if (!battlefield) {
      return {
        success: false,
        error: 'Battlefield not found.',
      };
    }

    const objective = battlefield.objectives.get(objectiveId);
    if (!objective || !objective.active) {
      return {
        success: false,
        error: 'Objective not found or not active.',
      };
    }

    if (objective.type !== ObjectiveType.DESTROY_STRUCTURE) {
      return {
        success: false,
        error: 'This objective cannot be damaged.',
      };
    }

    if (objective.health === undefined || objective.maxHealth === undefined) {
      return {
        success: false,
        error: 'Structure has no health.',
      };
    }

    const participant = this.participants.get(battlefieldId)?.get(playerId);
    if (!participant) {
      return {
        success: false,
        error: 'Player not found in battlefield.',
      };
    }

    // Can only damage enemy structures
    if (objective.controller === participant.team) {
      return {
        success: false,
        error: 'Cannot damage your own structure.',
      };
    }

    objective.health = Math.max(0, objective.health - damage);

    // Check if destroyed
    const destroyed = objective.health <= 0;
    let pointsAwarded = 0;

    if (destroyed) {
      objective.active = false;
      pointsAwarded = POINTS_PER_STRUCTURE_DESTROY;

      const team = battlefield.teams.get(participant.team);
      if (team) {
        team.score += pointsAwarded;
      }

      participant.objectiveScore += pointsAwarded;
      participant.pointsContributed += pointsAwarded;

      this.emitObjectiveStatusChanged({
        battlefieldId,
        objectiveId,
        previousController: objective.controller,
        newController: null,
        capturedBy: playerId,
        timestamp: new Date(),
      });

      this.emitScoreChanged({
        battlefieldId,
        imperialScore: battlefield.teams.get(TeamDesignation.TEAM_IMPERIAL)?.score ?? 0,
        rebelScore: battlefield.teams.get(TeamDesignation.TEAM_REBEL)?.score ?? 0,
        reason: `${objective.name} destroyed`,
        timestamp: new Date(),
      });
    }

    return {
      success: true,
      pointsAwarded,
      captureComplete: destroyed,
      message: destroyed
        ? `${objective.name} has been destroyed!`
        : `${objective.name} damaged: ${objective.health}/${objective.maxHealth}`,
    };
  }

  // ============================================
  // Kill Tracking
  // ============================================

  /**
   * Record a kill in the battlefield
   */
  async recordKill(
    battlefieldId: ObjectId,
    killerId: ObjectId,
    victimId: ObjectId
  ): Promise<KillResult> {
    const battlefield = this.activeBattlefields.get(battlefieldId);
    if (!battlefield) {
      return {
        success: false,
        error: 'Battlefield not found.',
      };
    }

    if (battlefield.phase !== BattlefieldPhase.IN_PROGRESS) {
      return {
        success: false,
        error: 'Match is not in progress.',
      };
    }

    const battlefieldParticipants = this.participants.get(battlefieldId);
    if (!battlefieldParticipants) {
      return {
        success: false,
        error: 'Participants not found.',
      };
    }

    const killer = battlefieldParticipants.get(killerId);
    const victim = battlefieldParticipants.get(victimId);

    if (!killer || !victim) {
      return {
        success: false,
        error: 'Killer or victim not found in battlefield.',
      };
    }

    if (killer.team === victim.team) {
      return {
        success: false,
        error: 'Team kills do not count.',
      };
    }

    // Update killer stats
    killer.kills++;
    killer.pointsContributed += POINTS_PER_KILL;

    // Update victim stats
    victim.deaths++;
    const respawnAt = new Date(Date.now() + battlefield.respawnDelayMs);
    victim.respawnAt = respawnAt;

    // Update team stats
    const killerTeam = battlefield.teams.get(killer.team);
    const victimTeam = battlefield.teams.get(victim.team);

    if (killerTeam) {
      killerTeam.kills++;
      killerTeam.score += POINTS_PER_KILL;
    }

    if (victimTeam) {
      victimTeam.deaths++;
    }

    this.emitKill({
      battlefieldId,
      killerId,
      victimId,
      killerTeam: killer.team,
      victimTeam: victim.team,
      timestamp: new Date(),
    });

    this.emitScoreChanged({
      battlefieldId,
      imperialScore: battlefield.teams.get(TeamDesignation.TEAM_IMPERIAL)?.score ?? 0,
      rebelScore: battlefield.teams.get(TeamDesignation.TEAM_REBEL)?.score ?? 0,
      reason: 'Player kill',
      timestamp: new Date(),
    });

    return {
      success: true,
      killerPoints: POINTS_PER_KILL,
      victimRespawnAt: respawnAt,
      teamScores: {
        imperial: battlefield.teams.get(TeamDesignation.TEAM_IMPERIAL)?.score ?? 0,
        rebel: battlefield.teams.get(TeamDesignation.TEAM_REBEL)?.score ?? 0,
      },
    };
  }

  // ============================================
  // Scoring and Results
  // ============================================

  /**
   * Calculate match result
   */
  private async calculateMatchResult(battlefieldId: ObjectId): Promise<BattlefieldMatchResult> {
    const battlefield = this.activeBattlefields.get(battlefieldId)!;
    const battlefieldParticipants = this.participants.get(battlefieldId)!;

    const imperialTeam = battlefield.teams.get(TeamDesignation.TEAM_IMPERIAL)!;
    const rebelTeam = battlefield.teams.get(TeamDesignation.TEAM_REBEL)!;

    let winningTeam: TeamDesignation | null = null;
    if (imperialTeam.score > rebelTeam.score) {
      winningTeam = TeamDesignation.TEAM_IMPERIAL;
    } else if (rebelTeam.score > imperialTeam.score) {
      winningTeam = TeamDesignation.TEAM_REBEL;
    }

    const participants = Array.from(battlefieldParticipants.values());
    const durationMs = battlefield.startedAt
      ? Date.now() - battlefield.startedAt.getTime()
      : 0;

    return {
      battlefieldId,
      battlefieldType: battlefield.type,
      winningTeam,
      imperialScore: imperialTeam.score,
      rebelScore: rebelTeam.score,
      durationMs,
      participants,
      completedAt: new Date(),
    };
  }

  /**
   * Get current leaderboard for a battlefield
   */
  async getLeaderboard(battlefieldId: ObjectId): Promise<LeaderboardEntry[]> {
    const battlefieldParticipants = this.participants.get(battlefieldId);
    if (!battlefieldParticipants) return [];

    const entries: LeaderboardEntry[] = [];

    for (const participant of battlefieldParticipants.values()) {
      const kdRatio =
        participant.deaths === 0
          ? participant.kills
          : Math.round((participant.kills / participant.deaths) * 100) / 100;

      entries.push({
        rank: 0,
        playerId: participant.playerId,
        playerName: participant.playerName,
        team: participant.team,
        kills: participant.kills,
        deaths: participant.deaths,
        kdRatio,
        objectiveScore: participant.objectiveScore,
        totalScore: calculateParticipantScore(participant),
      });
    }

    // Sort by total score descending
    entries.sort((a, b) => b.totalScore - a.totalScore);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries;
  }

  // ============================================
  // Player Management
  // ============================================

  /**
   * Remove a player from their battlefield
   */
  async removePlayer(
    playerId: ObjectId,
    reason: 'disconnect' | 'leave' | 'kicked'
  ): Promise<BattlefieldOperationResult> {
    const battlefieldId = this.playerBattlefieldMap.get(playerId);
    if (!battlefieldId) {
      return {
        success: false,
        error: 'Player is not in a battlefield.',
      };
    }

    const battlefield = this.activeBattlefields.get(battlefieldId);
    if (!battlefield) {
      return {
        success: false,
        error: 'Battlefield not found.',
      };
    }

    const battlefieldParticipants = this.participants.get(battlefieldId);
    const participant = battlefieldParticipants?.get(playerId);

    if (participant) {
      participant.active = false;

      // Remove from team
      const team = battlefield.teams.get(participant.team);
      if (team) {
        team.players.delete(playerId);
      }
    }

    this.playerBattlefieldMap.delete(playerId);
    this.playerQueueStatus.set(playerId, QueueStatus.NOT_QUEUED);

    this.emitPlayerLeft({
      battlefieldId,
      playerId,
      reason,
      timestamp: new Date(),
    });

    if (this.config.enableLogging) {
      console.log(`[BattlefieldManager] Player ${playerId} left battlefield ${battlefieldId} (${reason})`);
    }

    return {
      success: true,
      message: 'You have left the battlefield.',
    };
  }

  /**
   * Get player's current battlefield ID
   */
  getPlayerBattlefield(playerId: ObjectId): ObjectId | undefined {
    return this.playerBattlefieldMap.get(playerId);
  }

  /**
   * Get battlefield by ID
   */
  getBattlefield(battlefieldId: ObjectId): Battlefield | undefined {
    return this.activeBattlefields.get(battlefieldId);
  }

  /**
   * Get all active battlefields
   */
  getActiveBattlefields(): Battlefield[] {
    return Array.from(this.activeBattlefields.values());
  }

  // ============================================
  // Maintenance
  // ============================================

  /**
   * Clean expired queue entries
   */
  cleanExpiredQueueEntries(): void {
    const now = Date.now();
    for (const [type, queue] of this.queues) {
      for (const [playerId, entry] of queue) {
        if (entry.expiresAt.getTime() < now) {
          queue.delete(playerId);
          this.playerQueueStatus.set(playerId, QueueStatus.NOT_QUEUED);

          if (this.config.enableLogging) {
            console.log(
              `[BattlefieldManager] Expired queue entry for player ${playerId} (${getBattlefieldTypeName(type)})`
            );
          }
        }
      }
    }
  }

  /**
   * Shutdown the battlefield manager
   */
  shutdown(): void {
    // Stop all objective intervals
    for (const [battlefieldId] of this.objectiveIntervals) {
      this.stopObjectiveUpdates(battlefieldId);
    }

    // Clear all data
    this.activeBattlefields.clear();
    this.participants.clear();
    this.playerBattlefieldMap.clear();
    for (const queue of this.queues.values()) {
      queue.clear();
    }
    this.playerQueueStatus.clear();

    if (this.config.enableLogging) {
      console.log('[BattlefieldManager] Shutdown complete');
    }
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Battlefield Manager instance
 */
export function createBattlefieldManager(
  repository: BattlefieldRepository,
  factionManager: FactionManager,
  config?: Partial<BattlefieldManagerConfig>
): BattlefieldManager {
  return new BattlefieldManager(repository, factionManager, config);
}
