/**
 * Invasion Event
 * Manages regional invasion events in the Galactic Civil War
 *
 * Handles:
 * - Event phases (Mustering, Assault, Defense, Resolution)
 * - Participant tracking for attackers and defenders
 * - Objective system (capture points, destroy structures)
 * - Timer management
 * - Victory conditions
 * - Reward distribution
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  Faction,
  isGCWFaction,
  getOpposingFaction,
  getFactionName,
} from './faction-types.js';

// ============================================
// Enums
// ============================================

/**
 * Invasion event phases
 */
export enum InvasionPhase {
  /** Preparation phase - players gather and prepare */
  MUSTERING = 'mustering',
  /** Main combat phase - attackers attempt objectives */
  ASSAULT = 'assault',
  /** Defense response phase - defenders counterattack */
  DEFENSE = 'defense',
  /** Final phase - determine winner and distribute rewards */
  RESOLUTION = 'resolution',
  /** Event has ended */
  ENDED = 'ended',
}

/**
 * Invasion objective types
 */
export enum InvasionObjectiveType {
  /** Capture and hold a control point */
  CAPTURE_POINT = 'capture_point',
  /** Destroy an enemy structure */
  DESTROY_STRUCTURE = 'destroy_structure',
  /** Eliminate enemy NPCs */
  ELIMINATE_NPCS = 'eliminate_npcs',
  /** Defend a structure from attack */
  DEFEND_STRUCTURE = 'defend_structure',
  /** Escort an NPC to a location */
  ESCORT = 'escort',
  /** Hold a position for a duration */
  HOLD_POSITION = 'hold_position',
}

/**
 * Objective status
 */
export enum ObjectiveStatus {
  /** Not yet available */
  LOCKED = 'locked',
  /** Available to complete */
  ACTIVE = 'active',
  /** Successfully completed */
  COMPLETED = 'completed',
  /** Failed to complete */
  FAILED = 'failed',
  /** Contested by both factions */
  CONTESTED = 'contested',
}

// ============================================
// Constants
// ============================================

/** Mustering phase duration (ms) - 10 minutes */
export const MUSTERING_DURATION_MS = 10 * 60 * 1000;

/** Assault phase duration (ms) - 30 minutes */
export const ASSAULT_DURATION_MS = 30 * 60 * 1000;

/** Defense phase duration (ms) - 20 minutes */
export const DEFENSE_DURATION_MS = 20 * 60 * 1000;

/** Resolution phase duration (ms) - 5 minutes */
export const RESOLUTION_DURATION_MS = 5 * 60 * 1000;

/** Minimum participants to start invasion */
export const MIN_PARTICIPANTS = 5;

/** Points for capturing an objective */
export const OBJECTIVE_CAPTURE_POINTS = 100;

/** Points for defending an objective */
export const OBJECTIVE_DEFEND_POINTS = 75;

/** Points for killing enemy player */
export const PLAYER_KILL_POINTS = 25;

/** Points for killing enemy NPC */
export const NPC_KILL_POINTS = 5;

/** Bonus points for winning */
export const VICTORY_BONUS_POINTS = 500;

/** Base reward multiplier */
export const BASE_REWARD_MULTIPLIER = 1.0;

/** Maximum reward multiplier */
export const MAX_REWARD_MULTIPLIER = 3.0;

// ============================================
// Types
// ============================================

/**
 * Invasion objective
 */
export interface InvasionObjective {
  /** Unique objective ID */
  id: string;
  /** Objective type */
  type: InvasionObjectiveType;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Current status */
  status: ObjectiveStatus;
  /** Faction that owns/needs to defend (or null for neutral) */
  owningFaction: Faction | null;
  /** World position */
  position: Vector3;
  /** Capture progress (0-100) */
  captureProgress: number;
  /** Faction currently capturing */
  capturingFaction: Faction | null;
  /** Points awarded for completion */
  pointValue: number;
  /** Required to complete for victory */
  required: boolean;
  /** Prerequisite objective IDs */
  prerequisites: string[];
  /** Time limit to complete (ms, null for no limit) */
  timeLimit: number | null;
  /** Time remaining (ms) */
  timeRemaining: number | null;
}

/**
 * Invasion participant
 */
export interface InvasionParticipant {
  /** Player ID */
  playerId: ObjectId;
  /** Player name */
  playerName: string;
  /** Faction */
  faction: Faction;
  /** When they joined */
  joinedAt: Date;
  /** Score earned */
  score: number;
  /** Objectives completed */
  objectivesCompleted: number;
  /** Player kills */
  playerKills: number;
  /** NPC kills */
  npcKills: number;
  /** Deaths */
  deaths: number;
  /** Whether currently active in event */
  active: boolean;
  /** Last activity timestamp */
  lastActivity: Date;
}

/**
 * Invasion result
 */
export interface InvasionResult {
  /** Winning faction */
  winner: Faction;
  /** Attacker final score */
  attackerScore: number;
  /** Defender final score */
  defenderScore: number;
  /** Total duration (ms) */
  duration: number;
  /** Objectives completed by attackers */
  attackerObjectivesCompleted: number;
  /** Objectives completed by defenders */
  defenderObjectivesCompleted: number;
  /** Attacker participant count */
  attackerCount: number;
  /** Defender participant count */
  defenderCount: number;
  /** MVP player ID */
  mvpPlayerId: ObjectId | null;
  /** MVP score */
  mvpScore: number;
}

/**
 * Participant reward
 */
export interface ParticipantReward {
  /** Player ID */
  playerId: ObjectId;
  /** Base faction points */
  baseFactionPoints: number;
  /** Bonus faction points */
  bonusFactionPoints: number;
  /** GCW contribution points */
  gcwPoints: number;
  /** Credits awarded */
  credits: number;
  /** Whether on winning side */
  isWinner: boolean;
  /** Rank in event (1 = MVP) */
  rank: number;
  /** Token rewards (item IDs) */
  tokens: string[];
}

/**
 * Invasion configuration
 */
export interface InvasionConfig {
  /** Mustering duration (ms) */
  musteringDuration: number;
  /** Assault duration (ms) */
  assaultDuration: number;
  /** Defense duration (ms) */
  defenseDuration: number;
  /** Resolution duration (ms) */
  resolutionDuration: number;
  /** Minimum participants to start */
  minParticipants: number;
  /** Points for objective capture */
  objectiveCapturePoints: number;
  /** Points for player kill */
  playerKillPoints: number;
  /** Points for NPC kill */
  npcKillPoints: number;
  /** Victory bonus points */
  victoryBonusPoints: number;
  /** Enable logging */
  enableLogging: boolean;
}

/**
 * Default invasion configuration
 */
export const DEFAULT_INVASION_CONFIG: InvasionConfig = {
  musteringDuration: MUSTERING_DURATION_MS,
  assaultDuration: ASSAULT_DURATION_MS,
  defenseDuration: DEFENSE_DURATION_MS,
  resolutionDuration: RESOLUTION_DURATION_MS,
  minParticipants: MIN_PARTICIPANTS,
  objectiveCapturePoints: OBJECTIVE_CAPTURE_POINTS,
  playerKillPoints: PLAYER_KILL_POINTS,
  npcKillPoints: NPC_KILL_POINTS,
  victoryBonusPoints: VICTORY_BONUS_POINTS,
  enableLogging: false,
};

// ============================================
// Handler Types
// ============================================

export type PhaseChangeHandler = (phase: InvasionPhase, data: { timeRemaining: number }) => void;
export type ObjectiveUpdateHandler = (objective: InvasionObjective) => void;
export type ParticipantJoinHandler = (participant: InvasionParticipant) => void;
export type ParticipantLeaveHandler = (playerId: ObjectId) => void;
export type ScoreUpdateHandler = (attackerScore: number, defenderScore: number) => void;
export type CompleteHandler = (result: InvasionResult) => void;

// ============================================
// Invasion Event Class
// ============================================

/**
 * InvasionEvent
 * Manages a single regional invasion event
 */
export class InvasionEvent {
  /** Region ID */
  readonly regionId: string;

  /** Region name */
  readonly regionName: string;

  /** Attacking faction */
  readonly attackingFaction: Faction;

  /** Defending faction */
  readonly defendingFaction: Faction;

  /** Configuration */
  private config: InvasionConfig;

  /** Current phase */
  private currentPhase: InvasionPhase;

  /** Event start time */
  private startTime: Date | null;

  /** Phase start time */
  private phaseStartTime: Date | null;

  /** Objectives */
  private objectives: Map<string, InvasionObjective>;

  /** Participants */
  private participants: Map<ObjectId, InvasionParticipant>;

  /** Attacker score */
  private attackerScore: number;

  /** Defender score */
  private defenderScore: number;

  /** Phase timer */
  private phaseTimer: ReturnType<typeof setTimeout> | null;

  /** Objective update interval */
  private objectiveUpdateInterval: ReturnType<typeof setInterval> | null;

  /** Event handlers */
  private phaseChangeHandlers: Set<PhaseChangeHandler>;
  private objectiveUpdateHandlers: Set<ObjectiveUpdateHandler>;
  private participantJoinHandlers: Set<ParticipantJoinHandler>;
  private participantLeaveHandlers: Set<ParticipantLeaveHandler>;
  private scoreUpdateHandlers: Set<ScoreUpdateHandler>;
  private completeHandlers: Set<CompleteHandler>;

  /**
   * Create a new Invasion Event
   */
  constructor(
    regionId: string,
    regionName: string,
    attackingFaction: Faction,
    defendingFaction: Faction,
    config: Partial<InvasionConfig> = {}
  ) {
    this.regionId = regionId;
    this.regionName = regionName;
    this.attackingFaction = attackingFaction;
    this.defendingFaction = defendingFaction;
    this.config = { ...DEFAULT_INVASION_CONFIG, ...config };

    this.currentPhase = InvasionPhase.ENDED;
    this.startTime = null;
    this.phaseStartTime = null;
    this.objectives = new Map();
    this.participants = new Map();
    this.attackerScore = 0;
    this.defenderScore = 0;
    this.phaseTimer = null;
    this.objectiveUpdateInterval = null;

    this.phaseChangeHandlers = new Set();
    this.objectiveUpdateHandlers = new Set();
    this.participantJoinHandlers = new Set();
    this.participantLeaveHandlers = new Set();
    this.scoreUpdateHandlers = new Set();
    this.completeHandlers = new Set();
  }

  // ============================================
  // Event Registration
  // ============================================

  onPhaseChange(handler: PhaseChangeHandler): void {
    this.phaseChangeHandlers.add(handler);
  }

  offPhaseChange(handler: PhaseChangeHandler): void {
    this.phaseChangeHandlers.delete(handler);
  }

  onObjectiveUpdate(handler: ObjectiveUpdateHandler): void {
    this.objectiveUpdateHandlers.add(handler);
  }

  offObjectiveUpdate(handler: ObjectiveUpdateHandler): void {
    this.objectiveUpdateHandlers.delete(handler);
  }

  onParticipantJoin(handler: ParticipantJoinHandler): void {
    this.participantJoinHandlers.add(handler);
  }

  offParticipantJoin(handler: ParticipantJoinHandler): void {
    this.participantJoinHandlers.delete(handler);
  }

  onParticipantLeave(handler: ParticipantLeaveHandler): void {
    this.participantLeaveHandlers.add(handler);
  }

  offParticipantLeave(handler: ParticipantLeaveHandler): void {
    this.participantLeaveHandlers.delete(handler);
  }

  onScoreUpdate(handler: ScoreUpdateHandler): void {
    this.scoreUpdateHandlers.add(handler);
  }

  offScoreUpdate(handler: ScoreUpdateHandler): void {
    this.scoreUpdateHandlers.delete(handler);
  }

  onComplete(handler: CompleteHandler): void {
    this.completeHandlers.add(handler);
  }

  offComplete(handler: CompleteHandler): void {
    this.completeHandlers.delete(handler);
  }

  // ============================================
  // Event Emission
  // ============================================

  private emitPhaseChange(phase: InvasionPhase, timeRemaining: number): void {
    for (const handler of this.phaseChangeHandlers) {
      try {
        handler(phase, { timeRemaining });
      } catch (error) {
        console.error('[InvasionEvent] Error in phase change handler:', error);
      }
    }
  }

  private emitObjectiveUpdate(objective: InvasionObjective): void {
    for (const handler of this.objectiveUpdateHandlers) {
      try {
        handler(objective);
      } catch (error) {
        console.error('[InvasionEvent] Error in objective update handler:', error);
      }
    }
  }

  private emitParticipantJoin(participant: InvasionParticipant): void {
    for (const handler of this.participantJoinHandlers) {
      try {
        handler(participant);
      } catch (error) {
        console.error('[InvasionEvent] Error in participant join handler:', error);
      }
    }
  }

  private emitParticipantLeave(playerId: ObjectId): void {
    for (const handler of this.participantLeaveHandlers) {
      try {
        handler(playerId);
      } catch (error) {
        console.error('[InvasionEvent] Error in participant leave handler:', error);
      }
    }
  }

  private emitScoreUpdate(): void {
    for (const handler of this.scoreUpdateHandlers) {
      try {
        handler(this.attackerScore, this.defenderScore);
      } catch (error) {
        console.error('[InvasionEvent] Error in score update handler:', error);
      }
    }
  }

  private emitComplete(result: InvasionResult): void {
    for (const handler of this.completeHandlers) {
      try {
        handler(result);
      } catch (error) {
        console.error('[InvasionEvent] Error in complete handler:', error);
      }
    }
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Start the invasion event
   */
  start(): void {
    if (this.currentPhase !== InvasionPhase.ENDED) {
      return;
    }

    this.startTime = new Date();
    this.attackerScore = 0;
    this.defenderScore = 0;

    // Generate objectives
    this.generateObjectives();

    // Start mustering phase
    this.transitionToPhase(InvasionPhase.MUSTERING);

    // Start objective update interval
    this.objectiveUpdateInterval = setInterval(() => {
      this.updateObjectives();
    }, 1000);

    if (this.config.enableLogging) {
      console.log(`[InvasionEvent] Started in ${this.regionName}`);
    }
  }

  /**
   * Force end the invasion event
   */
  forceEnd(): void {
    if (this.currentPhase === InvasionPhase.ENDED) {
      return;
    }

    this.cleanup();
    this.transitionToPhase(InvasionPhase.RESOLUTION);
  }

  /**
   * Get current phase
   */
  getPhase(): InvasionPhase {
    return this.currentPhase;
  }

  /**
   * Get time remaining in current phase (ms)
   */
  getPhaseTimeRemaining(): number {
    if (!this.phaseStartTime) return 0;

    const phaseDuration = this.getPhaseDuration(this.currentPhase);
    const elapsed = Date.now() - this.phaseStartTime.getTime();
    return Math.max(0, phaseDuration - elapsed);
  }

  /**
   * Get total event duration (ms)
   */
  getEventDuration(): number {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime.getTime();
  }

  // ============================================
  // Participant Management
  // ============================================

  /**
   * Add a participant to the invasion
   */
  addParticipant(
    playerId: ObjectId,
    playerName: string,
    faction: Faction
  ): boolean {
    if (this.currentPhase === InvasionPhase.ENDED ||
        this.currentPhase === InvasionPhase.RESOLUTION) {
      return false;
    }

    if (!isGCWFaction(faction)) {
      return false;
    }

    if (faction !== this.attackingFaction && faction !== this.defendingFaction) {
      return false;
    }

    if (this.participants.has(playerId)) {
      // Reactivate existing participant
      const participant = this.participants.get(playerId)!;
      participant.active = true;
      participant.lastActivity = new Date();
      return true;
    }

    const participant: InvasionParticipant = {
      playerId,
      playerName,
      faction,
      joinedAt: new Date(),
      score: 0,
      objectivesCompleted: 0,
      playerKills: 0,
      npcKills: 0,
      deaths: 0,
      active: true,
      lastActivity: new Date(),
    };

    this.participants.set(playerId, participant);
    this.emitParticipantJoin(participant);

    if (this.config.enableLogging) {
      console.log(`[InvasionEvent] ${playerName} joined as ${getFactionName(faction)}`);
    }

    return true;
  }

  /**
   * Remove a participant from the invasion
   */
  removeParticipant(playerId: ObjectId): void {
    const participant = this.participants.get(playerId);
    if (participant) {
      participant.active = false;
      this.emitParticipantLeave(playerId);
    }
  }

  /**
   * Get a participant
   */
  getParticipant(playerId: ObjectId): InvasionParticipant | undefined {
    return this.participants.get(playerId);
  }

  /**
   * Get all participants
   */
  getAllParticipants(): InvasionParticipant[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get participants by faction
   */
  getParticipantsByFaction(faction: Faction): InvasionParticipant[] {
    return Array.from(this.participants.values()).filter(p => p.faction === faction && p.active);
  }

  /**
   * Get participant count by faction
   */
  getParticipantCount(faction: Faction): number {
    return this.getParticipantsByFaction(faction).length;
  }

  // ============================================
  // Objective Management
  // ============================================

  /**
   * Generate objectives for the invasion
   */
  private generateObjectives(): void {
    this.objectives.clear();

    // Create capture point objectives
    const capturePoints = [
      { id: 'cp_alpha', name: 'Control Point Alpha', position: { x: 100, y: 0, z: 100 } },
      { id: 'cp_beta', name: 'Control Point Beta', position: { x: -100, y: 0, z: 100 } },
      { id: 'cp_gamma', name: 'Control Point Gamma', position: { x: 0, y: 0, z: -150 } },
    ];

    for (const cp of capturePoints) {
      this.objectives.set(cp.id, {
        id: cp.id,
        type: InvasionObjectiveType.CAPTURE_POINT,
        name: cp.name,
        description: `Capture and hold ${cp.name}`,
        status: ObjectiveStatus.LOCKED,
        owningFaction: this.defendingFaction,
        position: cp.position as Vector3,
        captureProgress: 0,
        capturingFaction: null,
        pointValue: this.config.objectiveCapturePoints,
        required: true,
        prerequisites: [],
        timeLimit: null,
        timeRemaining: null,
      });
    }

    // Create structure objectives
    const structures = [
      { id: 'struct_command', name: 'Command Center', position: { x: 0, y: 0, z: 0 } },
      { id: 'struct_turret', name: 'Defense Turret', position: { x: 50, y: 0, z: 50 } },
    ];

    for (const struct of structures) {
      this.objectives.set(struct.id, {
        id: struct.id,
        type: InvasionObjectiveType.DESTROY_STRUCTURE,
        name: struct.name,
        description: `Destroy the ${struct.name}`,
        status: ObjectiveStatus.LOCKED,
        owningFaction: this.defendingFaction,
        position: struct.position as Vector3,
        captureProgress: 0,
        capturingFaction: null,
        pointValue: this.config.objectiveCapturePoints * 2,
        required: false,
        prerequisites: ['cp_alpha', 'cp_beta'],
        timeLimit: null,
        timeRemaining: null,
      });
    }
  }

  /**
   * Get an objective
   */
  getObjective(objectiveId: string): InvasionObjective | undefined {
    return this.objectives.get(objectiveId);
  }

  /**
   * Get all objectives
   */
  getAllObjectives(): InvasionObjective[] {
    return Array.from(this.objectives.values());
  }

  /**
   * Get active objectives
   */
  getActiveObjectives(): InvasionObjective[] {
    return Array.from(this.objectives.values()).filter(o => o.status === ObjectiveStatus.ACTIVE);
  }

  /**
   * Update capture progress on an objective
   */
  updateCaptureProgress(
    objectiveId: string,
    faction: Faction,
    progressDelta: number
  ): void {
    const objective = this.objectives.get(objectiveId);
    if (!objective || objective.status !== ObjectiveStatus.ACTIVE) return;

    if (objective.type !== InvasionObjectiveType.CAPTURE_POINT &&
        objective.type !== InvasionObjectiveType.HOLD_POSITION) {
      return;
    }

    // Handle contested capture
    if (objective.capturingFaction && objective.capturingFaction !== faction) {
      // Opposing faction - reduce progress
      objective.captureProgress = Math.max(0, objective.captureProgress - progressDelta);
      if (objective.captureProgress === 0) {
        objective.capturingFaction = null;
        objective.status = ObjectiveStatus.ACTIVE;
      }
    } else {
      // Same faction or neutral - increase progress
      objective.capturingFaction = faction;
      objective.captureProgress = Math.min(100, objective.captureProgress + progressDelta);

      if (objective.captureProgress >= 100) {
        this.completeObjective(objectiveId, faction);
      } else {
        objective.status = ObjectiveStatus.CONTESTED;
      }
    }

    this.emitObjectiveUpdate(objective);
  }

  /**
   * Complete an objective
   */
  completeObjective(objectiveId: string, faction: Faction): void {
    const objective = this.objectives.get(objectiveId);
    if (!objective) return;

    objective.status = ObjectiveStatus.COMPLETED;
    objective.captureProgress = 100;
    objective.capturingFaction = faction;

    // Award points
    if (faction === this.attackingFaction) {
      this.attackerScore += objective.pointValue;
    } else {
      this.defenderScore += objective.pointValue;
    }

    // Unlock dependent objectives
    for (const obj of this.objectives.values()) {
      if (obj.prerequisites.includes(objectiveId) &&
          obj.status === ObjectiveStatus.LOCKED) {
        const allPrereqsMet = obj.prerequisites.every(prereq => {
          const prereqObj = this.objectives.get(prereq);
          return prereqObj?.status === ObjectiveStatus.COMPLETED;
        });
        if (allPrereqsMet) {
          obj.status = ObjectiveStatus.ACTIVE;
          this.emitObjectiveUpdate(obj);
        }
      }
    }

    this.emitObjectiveUpdate(objective);
    this.emitScoreUpdate();

    if (this.config.enableLogging) {
      console.log(`[InvasionEvent] Objective ${objectiveId} completed by ${getFactionName(faction)}`);
    }
  }

  /**
   * Fail an objective
   */
  failObjective(objectiveId: string): void {
    const objective = this.objectives.get(objectiveId);
    if (!objective) return;

    objective.status = ObjectiveStatus.FAILED;
    this.emitObjectiveUpdate(objective);
  }

  /**
   * Update all objectives (called periodically)
   */
  private updateObjectives(): void {
    if (this.currentPhase === InvasionPhase.ENDED) return;

    for (const objective of this.objectives.values()) {
      // Update time-limited objectives
      if (objective.timeLimit !== null && objective.timeRemaining !== null) {
        objective.timeRemaining = Math.max(0, objective.timeRemaining - 1000);
        if (objective.timeRemaining === 0 && objective.status === ObjectiveStatus.ACTIVE) {
          this.failObjective(objective.id);
        }
      }
    }
  }

  // ============================================
  // Scoring
  // ============================================

  /**
   * Record a player kill
   */
  recordPlayerKill(killerId: ObjectId, victimId: ObjectId): void {
    const killer = this.participants.get(killerId);
    const victim = this.participants.get(victimId);

    if (killer && victim && killer.faction !== victim.faction) {
      killer.playerKills++;
      killer.score += this.config.playerKillPoints;
      killer.lastActivity = new Date();

      victim.deaths++;

      if (killer.faction === this.attackingFaction) {
        this.attackerScore += this.config.playerKillPoints;
      } else {
        this.defenderScore += this.config.playerKillPoints;
      }

      this.emitScoreUpdate();
    }
  }

  /**
   * Record an NPC kill
   */
  recordNPCKill(killerId: ObjectId, npcFaction: Faction): void {
    const killer = this.participants.get(killerId);

    if (killer && killer.faction !== npcFaction) {
      killer.npcKills++;
      killer.score += this.config.npcKillPoints;
      killer.lastActivity = new Date();

      if (killer.faction === this.attackingFaction) {
        this.attackerScore += this.config.npcKillPoints;
      } else {
        this.defenderScore += this.config.npcKillPoints;
      }

      this.emitScoreUpdate();
    }
  }

  /**
   * Get current scores
   */
  getScores(): { attacker: number; defender: number } {
    return {
      attacker: this.attackerScore,
      defender: this.defenderScore,
    };
  }

  // ============================================
  // Phase Management
  // ============================================

  /**
   * Transition to a new phase
   */
  private transitionToPhase(phase: InvasionPhase): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }

    this.currentPhase = phase;
    this.phaseStartTime = new Date();

    const duration = this.getPhaseDuration(phase);

    // Unlock objectives based on phase
    if (phase === InvasionPhase.ASSAULT) {
      for (const objective of this.objectives.values()) {
        if (objective.prerequisites.length === 0) {
          objective.status = ObjectiveStatus.ACTIVE;
          this.emitObjectiveUpdate(objective);
        }
      }
    }

    this.emitPhaseChange(phase, duration);

    if (phase !== InvasionPhase.ENDED) {
      this.phaseTimer = setTimeout(() => {
        this.advancePhase();
      }, duration);
    }

    if (this.config.enableLogging) {
      console.log(`[InvasionEvent] Phase changed to ${phase}`);
    }
  }

  /**
   * Advance to the next phase
   */
  private advancePhase(): void {
    switch (this.currentPhase) {
      case InvasionPhase.MUSTERING:
        // Check minimum participants
        if (this.getParticipantCount(this.attackingFaction) >= this.config.minParticipants &&
            this.getParticipantCount(this.defendingFaction) >= this.config.minParticipants) {
          this.transitionToPhase(InvasionPhase.ASSAULT);
        } else {
          // Not enough participants - end event
          this.transitionToPhase(InvasionPhase.RESOLUTION);
        }
        break;

      case InvasionPhase.ASSAULT:
        this.transitionToPhase(InvasionPhase.DEFENSE);
        break;

      case InvasionPhase.DEFENSE:
        this.transitionToPhase(InvasionPhase.RESOLUTION);
        break;

      case InvasionPhase.RESOLUTION:
        this.completeEvent();
        break;
    }
  }

  /**
   * Get duration for a phase
   */
  private getPhaseDuration(phase: InvasionPhase): number {
    switch (phase) {
      case InvasionPhase.MUSTERING:
        return this.config.musteringDuration;
      case InvasionPhase.ASSAULT:
        return this.config.assaultDuration;
      case InvasionPhase.DEFENSE:
        return this.config.defenseDuration;
      case InvasionPhase.RESOLUTION:
        return this.config.resolutionDuration;
      default:
        return 0;
    }
  }

  // ============================================
  // Completion
  // ============================================

  /**
   * Complete the invasion event
   */
  private completeEvent(): void {
    this.cleanup();

    // Determine winner
    const winner = this.attackerScore > this.defenderScore
      ? this.attackingFaction
      : this.attackerScore < this.defenderScore
        ? this.defendingFaction
        : Faction.NEUTRAL; // Draw

    // Find MVP
    let mvpPlayerId: ObjectId | null = null;
    let mvpScore = 0;
    for (const participant of this.participants.values()) {
      if (participant.score > mvpScore) {
        mvpScore = participant.score;
        mvpPlayerId = participant.playerId;
      }
    }

    // Count objectives
    let attackerObjectivesCompleted = 0;
    let defenderObjectivesCompleted = 0;
    for (const objective of this.objectives.values()) {
      if (objective.status === ObjectiveStatus.COMPLETED) {
        if (objective.capturingFaction === this.attackingFaction) {
          attackerObjectivesCompleted++;
        } else {
          defenderObjectivesCompleted++;
        }
      }
    }

    const result: InvasionResult = {
      winner,
      attackerScore: this.attackerScore,
      defenderScore: this.defenderScore,
      duration: this.getEventDuration(),
      attackerObjectivesCompleted,
      defenderObjectivesCompleted,
      attackerCount: this.getParticipantCount(this.attackingFaction),
      defenderCount: this.getParticipantCount(this.defendingFaction),
      mvpPlayerId,
      mvpScore,
    };

    this.currentPhase = InvasionPhase.ENDED;
    this.emitComplete(result);

    if (this.config.enableLogging) {
      console.log(`[InvasionEvent] Completed. Winner: ${getFactionName(winner)}`);
    }
  }

  /**
   * Calculate rewards for a participant
   */
  calculateRewards(playerId: ObjectId): ParticipantReward | null {
    const participant = this.participants.get(playerId);
    if (!participant) return null;

    const winner = this.attackerScore > this.defenderScore
      ? this.attackingFaction
      : this.defendingFaction;

    const isWinner = participant.faction === winner;

    // Sort participants by score to determine rank
    const sortedParticipants = Array.from(this.participants.values())
      .sort((a, b) => b.score - a.score);
    const rank = sortedParticipants.findIndex(p => p.playerId === playerId) + 1;

    // Calculate rewards
    let baseFactionPoints = Math.floor(participant.score * 0.5);
    let bonusFactionPoints = 0;

    if (isWinner) {
      bonusFactionPoints += this.config.victoryBonusPoints;
    }

    if (rank === 1) {
      bonusFactionPoints += 250; // MVP bonus
    } else if (rank <= 3) {
      bonusFactionPoints += 100;
    } else if (rank <= 10) {
      bonusFactionPoints += 50;
    }

    const gcwPoints = Math.floor((baseFactionPoints + bonusFactionPoints) * 0.5);
    const credits = (baseFactionPoints + bonusFactionPoints) * 10;

    // Token rewards based on performance
    const tokens: string[] = [];
    if (rank === 1) {
      tokens.push('invasion_mvp_token');
    }
    if (isWinner) {
      tokens.push('invasion_victory_token');
    }
    if (participant.objectivesCompleted >= 3) {
      tokens.push('invasion_objective_token');
    }

    return {
      playerId,
      baseFactionPoints,
      bonusFactionPoints,
      gcwPoints,
      credits,
      isWinner,
      rank,
      tokens,
    };
  }

  /**
   * Clean up timers and intervals
   */
  private cleanup(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
    if (this.objectiveUpdateInterval) {
      clearInterval(this.objectiveUpdateInterval);
      this.objectiveUpdateInterval = null;
    }
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Invasion Event
 */
export function createInvasionEvent(
  regionId: string,
  regionName: string,
  attackingFaction: Faction,
  defendingFaction: Faction,
  config?: Partial<InvasionConfig>
): InvasionEvent {
  return new InvasionEvent(regionId, regionName, attackingFaction, defendingFaction, config);
}
