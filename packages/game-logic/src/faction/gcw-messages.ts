/**
 * GCW Network Messages
 * Additional protocol message types for advanced GCW mechanics
 *
 * Includes messages for:
 * - Invasion events
 * - Base vulnerability
 * - Weekly cycle resets
 * - NPC spawning notifications
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import { Faction } from './faction-types.js';
import {
  InvasionPhase,
  InvasionObjectiveType,
  ObjectiveStatus,
  type InvasionObjective,
  type InvasionParticipant,
  type InvasionResult,
} from './invasion-event.js';
import { NPCSpawnTier, NPCRole, type SpawnedNPC } from './faction-npc-spawner.js';

// ============================================
// Message Opcodes
// ============================================

/**
 * GCW advanced message opcodes
 */
export const GCWMessageOpcode = {
  // Invasion messages
  /** Server notification of invasion start */
  InvasionStart: 0xfc100001,
  /** Server notification of phase change */
  InvasionPhaseChange: 0xfc100002,
  /** Server notification of objective update */
  InvasionObjective: 0xfc100003,
  /** Server notification of invasion result */
  InvasionResult: 0xfc100004,
  /** Server notification of participant update */
  InvasionParticipantUpdate: 0xfc100005,
  /** Server notification of score update */
  InvasionScoreUpdate: 0xfc100006,
  /** Client request to join invasion */
  InvasionJoinRequest: 0xfc100007,
  /** Server response to join request */
  InvasionJoinResponse: 0xfc100008,
  /** Client request to leave invasion */
  InvasionLeaveRequest: 0xfc100009,
  /** Server notification of rewards */
  InvasionRewards: 0xfc10000a,

  // Base vulnerability messages
  /** Server notification of vulnerability window change */
  BaseVulnerability: 0xfc100010,
  /** Server notification of base damage */
  BaseDamage: 0xfc100011,
  /** Server notification of base defenses */
  BaseDefenses: 0xfc100012,
  /** Client request to set vulnerability window */
  SetVulnerabilityRequest: 0xfc100013,
  /** Server response to vulnerability request */
  SetVulnerabilityResponse: 0xfc100014,

  // Weekly cycle messages
  /** Server notification of weekly reset */
  WeeklyCycleReset: 0xfc100020,
  /** Server notification of weekly rewards */
  WeeklyCycleRewards: 0xfc100021,
  /** Server notification of decay applied */
  WeeklyDecayApplied: 0xfc100022,

  // Zone bonus messages
  /** Server notification of zone bonuses */
  ZoneBonuses: 0xfc100030,
  /** Client request for zone bonuses */
  ZoneBonusesRequest: 0xfc100031,

  // NPC messages
  /** Server notification of faction NPCs spawned */
  FactionNPCsSpawned: 0xfc100040,
  /** Server notification of reinforcements arriving */
  ReinforcementsArriving: 0xfc100041,
} as const;

export type GCWMessageOpcodeType = (typeof GCWMessageOpcode)[keyof typeof GCWMessageOpcode];

// ============================================
// Invasion Messages
// ============================================

/**
 * InvasionStartMessage - Server notification of invasion starting
 */
export interface InvasionStartMessage {
  opcode: typeof GCWMessageOpcode.InvasionStart;
  /** Region ID */
  regionId: string;
  /** Region display name */
  regionName: string;
  /** Attacking faction */
  attackingFaction: Faction;
  /** Defending faction */
  defendingFaction: Faction;
  /** Current phase */
  phase: InvasionPhase;
  /** Time until phase ends (ms) */
  phaseTimeRemaining: bigint;
  /** Total event duration so far (ms) */
  eventDuration: bigint;
  /** Objectives data */
  objectives: InvasionObjectiveData[];
  /** Timestamp (Unix ms) */
  timestamp: bigint;
}

/**
 * InvasionPhaseChangeMessage - Server notification of phase change
 */
export interface InvasionPhaseChangeMessage {
  opcode: typeof GCWMessageOpcode.InvasionPhaseChange;
  /** Region ID */
  regionId: string;
  /** Previous phase */
  previousPhase: InvasionPhase;
  /** New phase */
  newPhase: InvasionPhase;
  /** Time remaining in new phase (ms) */
  phaseTimeRemaining: bigint;
  /** Current attacker score */
  attackerScore: number;
  /** Current defender score */
  defenderScore: number;
  /** Timestamp (Unix ms) */
  timestamp: bigint;
}

/**
 * InvasionObjectiveMessage - Server notification of objective update
 */
export interface InvasionObjectiveMessage {
  opcode: typeof GCWMessageOpcode.InvasionObjective;
  /** Region ID */
  regionId: string;
  /** Objective data */
  objective: InvasionObjectiveData;
  /** Whether objective was just completed */
  justCompleted: boolean;
  /** Faction that completed (if applicable) */
  completedBy: Faction | null;
  /** Points awarded */
  pointsAwarded: number;
  /** Timestamp (Unix ms) */
  timestamp: bigint;
}

/**
 * Objective data for network transmission
 */
export interface InvasionObjectiveData {
  /** Objective ID */
  id: string;
  /** Objective type */
  type: InvasionObjectiveType;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Current status */
  status: ObjectiveStatus;
  /** Owning faction */
  owningFaction: Faction | null;
  /** World position X */
  positionX: number;
  /** World position Y */
  positionY: number;
  /** World position Z */
  positionZ: number;
  /** Capture progress (0-100) */
  captureProgress: number;
  /** Faction currently capturing */
  capturingFaction: Faction | null;
  /** Point value */
  pointValue: number;
  /** Required for victory */
  required: boolean;
  /** Time remaining (ms, 0 if no limit) */
  timeRemaining: bigint;
}

/**
 * InvasionResultMessage - Server notification of invasion result
 */
export interface InvasionResultMessage {
  opcode: typeof GCWMessageOpcode.InvasionResult;
  /** Region ID */
  regionId: string;
  /** Region name */
  regionName: string;
  /** Winning faction */
  winner: Faction;
  /** Final attacker score */
  attackerScore: number;
  /** Final defender score */
  defenderScore: number;
  /** Total duration (ms) */
  duration: bigint;
  /** Attacker objectives completed */
  attackerObjectivesCompleted: number;
  /** Defender objectives completed */
  defenderObjectivesCompleted: number;
  /** Attacker participant count */
  attackerCount: number;
  /** Defender participant count */
  defenderCount: number;
  /** MVP player ID */
  mvpPlayerId: bigint;
  /** MVP player name */
  mvpPlayerName: string;
  /** MVP score */
  mvpScore: number;
  /** New region control percentage for Imperial */
  newImperialControl: number;
  /** New region control percentage for Rebel */
  newRebelControl: number;
  /** Timestamp (Unix ms) */
  timestamp: bigint;
}

/**
 * InvasionParticipantUpdateMessage - Server notification of participant status
 */
export interface InvasionParticipantUpdateMessage {
  opcode: typeof GCWMessageOpcode.InvasionParticipantUpdate;
  /** Region ID */
  regionId: string;
  /** Participant data */
  participant: InvasionParticipantData;
  /** Update type */
  updateType: 'join' | 'leave' | 'score' | 'kill' | 'death' | 'objective';
  /** Timestamp (Unix ms) */
  timestamp: bigint;
}

/**
 * Participant data for network transmission
 */
export interface InvasionParticipantData {
  /** Player ID */
  playerId: bigint;
  /** Player name */
  playerName: string;
  /** Faction */
  faction: Faction;
  /** Current score */
  score: number;
  /** Objectives completed */
  objectivesCompleted: number;
  /** Player kills */
  playerKills: number;
  /** NPC kills */
  npcKills: number;
  /** Deaths */
  deaths: number;
  /** Whether currently active */
  active: boolean;
}

/**
 * InvasionScoreUpdateMessage - Server notification of score change
 */
export interface InvasionScoreUpdateMessage {
  opcode: typeof GCWMessageOpcode.InvasionScoreUpdate;
  /** Region ID */
  regionId: string;
  /** Current attacker score */
  attackerScore: number;
  /** Current defender score */
  defenderScore: number;
  /** Score change source */
  source: 'objective' | 'player_kill' | 'npc_kill' | 'time_bonus';
  /** Points changed */
  pointsChanged: number;
  /** Faction that gained points */
  faction: Faction;
  /** Timestamp (Unix ms) */
  timestamp: bigint;
}

/**
 * InvasionJoinRequestMessage - Client request to join invasion
 */
export interface InvasionJoinRequestMessage {
  opcode: typeof GCWMessageOpcode.InvasionJoinRequest;
  /** Region ID */
  regionId: string;
}

/**
 * InvasionJoinResponseMessage - Server response to join request
 */
export interface InvasionJoinResponseMessage {
  opcode: typeof GCWMessageOpcode.InvasionJoinResponse;
  /** Whether join succeeded */
  success: boolean;
  /** Error message if failed */
  errorMessage: string;
  /** Region ID */
  regionId: string;
  /** Player's assigned faction */
  faction: Faction;
  /** Current phase */
  currentPhase: InvasionPhase;
  /** Phase time remaining (ms) */
  phaseTimeRemaining: bigint;
}

/**
 * InvasionLeaveRequestMessage - Client request to leave invasion
 */
export interface InvasionLeaveRequestMessage {
  opcode: typeof GCWMessageOpcode.InvasionLeaveRequest;
  /** Region ID */
  regionId: string;
}

/**
 * InvasionRewardsMessage - Server notification of rewards
 */
export interface InvasionRewardsMessage {
  opcode: typeof GCWMessageOpcode.InvasionRewards;
  /** Region ID */
  regionId: string;
  /** Region name */
  regionName: string;
  /** Base faction points */
  baseFactionPoints: number;
  /** Bonus faction points */
  bonusFactionPoints: number;
  /** GCW contribution points */
  gcwPoints: number;
  /** Credits awarded */
  credits: bigint;
  /** Whether on winning side */
  isWinner: boolean;
  /** Rank in event */
  rank: number;
  /** Token rewards */
  tokens: string[];
  /** Timestamp (Unix ms) */
  timestamp: bigint;
}

// ============================================
// Base Vulnerability Messages
// ============================================

/**
 * BaseVulnerabilityMessage - Server notification of vulnerability window
 */
export interface BaseVulnerabilityMessage {
  opcode: typeof GCWMessageOpcode.BaseVulnerability;
  /** Base ID */
  baseId: bigint;
  /** Region ID */
  regionId: string;
  /** Faction */
  faction: Faction;
  /** Whether base is currently vulnerable */
  isVulnerable: boolean;
  /** Vulnerability window start (Unix ms, 0 if not scheduled) */
  vulnerabilityStart: bigint;
  /** Vulnerability window end (Unix ms, 0 if not scheduled) */
  vulnerabilityEnd: bigint;
  /** Time until vulnerable (ms, 0 if already vulnerable or not scheduled) */
  timeUntilVulnerable: bigint;
  /** Time remaining in vulnerability window (ms, 0 if not vulnerable) */
  vulnerabilityTimeRemaining: bigint;
  /** Timestamp (Unix ms) */
  timestamp: bigint;
}

/**
 * BaseDamageMessage - Server notification of base taking damage
 */
export interface BaseDamageMessage {
  opcode: typeof GCWMessageOpcode.BaseDamage;
  /** Base ID */
  baseId: bigint;
  /** Region ID */
  regionId: string;
  /** Damage dealt */
  damageTaken: number;
  /** Current health */
  currentHealth: number;
  /** Maximum health */
  maxHealth: number;
  /** Health percentage */
  healthPercent: number;
  /** Attacker ID */
  attackerId: bigint;
  /** Attacker faction */
  attackerFaction: Faction;
  /** Timestamp (Unix ms) */
  timestamp: bigint;
}

/**
 * BaseDefensesMessage - Server notification of base defensive capabilities
 */
export interface BaseDefensesMessage {
  opcode: typeof GCWMessageOpcode.BaseDefenses;
  /** Base ID */
  baseId: bigint;
  /** Region ID */
  regionId: string;
  /** Faction */
  faction: Faction;
  /** Current health */
  health: number;
  /** Maximum health */
  maxHealth: number;
  /** Health percentage */
  healthPercent: number;
  /** Defense rating */
  defenseRating: number;
  /** Damage reduction percentage */
  damageReduction: number;
  /** NPC defender count */
  npcDefenders: number;
  /** Turret count */
  turretCount: number;
  /** Shield strength (0-100) */
  shieldStrength: number;
  /** Whether vulnerable */
  isVulnerable: boolean;
  /** Time until vulnerable (ms) */
  timeUntilVulnerable: bigint;
  /** Vulnerability time remaining (ms) */
  vulnerabilityTimeRemaining: bigint;
}

/**
 * SetVulnerabilityRequestMessage - Client request to set vulnerability window
 */
export interface SetVulnerabilityRequestMessage {
  opcode: typeof GCWMessageOpcode.SetVulnerabilityRequest;
  /** Base ID */
  baseId: bigint;
  /** Requested start time (Unix ms) */
  startTime: bigint;
  /** Duration in hours */
  durationHours: number;
}

/**
 * SetVulnerabilityResponseMessage - Server response to vulnerability request
 */
export interface SetVulnerabilityResponseMessage {
  opcode: typeof GCWMessageOpcode.SetVulnerabilityResponse;
  /** Whether request succeeded */
  success: boolean;
  /** Error message if failed */
  errorMessage: string;
  /** Base ID */
  baseId: bigint;
  /** Confirmed start time (Unix ms) */
  startTime: bigint;
  /** Confirmed end time (Unix ms) */
  endTime: bigint;
}

// ============================================
// Weekly Cycle Messages
// ============================================

/**
 * WeeklyCycleResetMessage - Server notification of weekly reset
 */
export interface WeeklyCycleResetMessage {
  opcode: typeof GCWMessageOpcode.WeeklyCycleReset;
  /** Regions affected */
  regionsAffected: string[];
  /** Total points decayed server-wide */
  totalPointsDecayed: number;
  /** Next reset time (Unix ms) */
  nextResetTime: bigint;
  /** Timestamp (Unix ms) */
  timestamp: bigint;
}

/**
 * WeeklyCycleRewardsMessage - Server notification of weekly rewards
 */
export interface WeeklyCycleRewardsMessage {
  opcode: typeof GCWMessageOpcode.WeeklyCycleRewards;
  /** Player's faction */
  faction: Faction;
  /** Base reward points */
  baseReward: number;
  /** Ranking bonus */
  rankingBonus: number;
  /** Base maintenance bonus */
  baseMaintenanceBonus: number;
  /** Total reward */
  totalReward: number;
  /** Player's contribution rank */
  contributionRank: number;
  /** Total contributions this week */
  weeklyContributions: number;
  /** Timestamp (Unix ms) */
  timestamp: bigint;
}

/**
 * WeeklyDecayAppliedMessage - Server notification of decay
 */
export interface WeeklyDecayAppliedMessage {
  opcode: typeof GCWMessageOpcode.WeeklyDecayApplied;
  /** Region ID */
  regionId: string;
  /** Region name */
  regionName: string;
  /** Previous Imperial control */
  previousImperialControl: number;
  /** New Imperial control */
  newImperialControl: number;
  /** Previous Rebel control */
  previousRebelControl: number;
  /** New Rebel control */
  newRebelControl: number;
  /** Decay percentage applied */
  decayPercent: number;
  /** Timestamp (Unix ms) */
  timestamp: bigint;
}

// ============================================
// Zone Bonus Messages
// ============================================

/**
 * ZoneBonusesMessage - Server notification of zone bonuses
 */
export interface ZoneBonusesMessage {
  opcode: typeof GCWMessageOpcode.ZoneBonuses;
  /** Region ID */
  regionId: string;
  /** Player's faction */
  playerFaction: Faction;
  /** Controlling faction */
  controllingFaction: Faction;
  /** Whether player has control */
  hasControl: boolean;
  /** XP bonus percentage */
  xpBonus: number;
  /** Faction point bonus percentage */
  factionPointBonus: number;
  /** Vendor discount percentage */
  vendorDiscount: number;
  /** Respawn time reduction percentage */
  respawnReduction: number;
  /** Fast travel available */
  fastTravelAvailable: boolean;
  /** Combat buff tier (0-4) */
  combatBuffTier: number;
  /** Cloning available */
  cloningAvailable: boolean;
}

/**
 * ZoneBonusesRequestMessage - Client request for zone bonuses
 */
export interface ZoneBonusesRequestMessage {
  opcode: typeof GCWMessageOpcode.ZoneBonusesRequest;
  /** Region ID */
  regionId: string;
}

// ============================================
// NPC Messages
// ============================================

/**
 * FactionNPCsSpawnedMessage - Server notification of NPCs spawning
 */
export interface FactionNPCsSpawnedMessage {
  opcode: typeof GCWMessageOpcode.FactionNPCsSpawned;
  /** Region ID */
  regionId: string;
  /** Faction */
  faction: Faction;
  /** NPCs spawned */
  npcs: SpawnedNPCData[];
  /** Total NPC count for faction in region */
  totalFactionNPCs: number;
  /** Timestamp (Unix ms) */
  timestamp: bigint;
}

/**
 * Spawned NPC data for network transmission
 */
export interface SpawnedNPCData {
  /** Instance ID */
  instanceId: bigint;
  /** Template ID */
  templateId: string;
  /** Faction */
  faction: Faction;
  /** Role */
  role: NPCRole;
  /** Tier */
  tier: NPCSpawnTier;
  /** Position X */
  positionX: number;
  /** Position Y */
  positionY: number;
  /** Position Z */
  positionZ: number;
  /** Health percentage */
  healthPercent: number;
}

/**
 * ReinforcementsArrivingMessage - Server notification of reinforcements
 */
export interface ReinforcementsArrivingMessage {
  opcode: typeof GCWMessageOpcode.ReinforcementsArriving;
  /** Region ID */
  regionId: string;
  /** Faction */
  faction: Faction;
  /** Target position X */
  positionX: number;
  /** Target position Y */
  positionY: number;
  /** Target position Z */
  positionZ: number;
  /** Number of reinforcements */
  count: number;
  /** Wave number */
  waveNumber: number;
  /** Time until arrival (ms) */
  arrivalTime: bigint;
  /** Timestamp (Unix ms) */
  timestamp: bigint;
}

// ============================================
// Union Types
// ============================================

/**
 * Union of all GCW client messages
 */
export type GCWClientMessage =
  | InvasionJoinRequestMessage
  | InvasionLeaveRequestMessage
  | SetVulnerabilityRequestMessage
  | ZoneBonusesRequestMessage;

/**
 * Union of all GCW server messages
 */
export type GCWServerMessage =
  | InvasionStartMessage
  | InvasionPhaseChangeMessage
  | InvasionObjectiveMessage
  | InvasionResultMessage
  | InvasionParticipantUpdateMessage
  | InvasionScoreUpdateMessage
  | InvasionJoinResponseMessage
  | InvasionRewardsMessage
  | BaseVulnerabilityMessage
  | BaseDamageMessage
  | BaseDefensesMessage
  | SetVulnerabilityResponseMessage
  | WeeklyCycleResetMessage
  | WeeklyCycleRewardsMessage
  | WeeklyDecayAppliedMessage
  | ZoneBonusesMessage
  | FactionNPCsSpawnedMessage
  | ReinforcementsArrivingMessage;

/**
 * Union of all GCW messages
 */
export type GCWMessage = GCWClientMessage | GCWServerMessage;

// ============================================
// Helper Functions
// ============================================

/**
 * Check if opcode is a valid GCW message opcode
 */
export function isGCWMessageOpcode(opcode: number): opcode is GCWMessageOpcodeType {
  return Object.values(GCWMessageOpcode).includes(opcode as GCWMessageOpcodeType);
}

/**
 * Convert InvasionObjective to network data
 */
export function objectiveToData(objective: InvasionObjective): InvasionObjectiveData {
  return {
    id: objective.id,
    type: objective.type,
    name: objective.name,
    description: objective.description,
    status: objective.status,
    owningFaction: objective.owningFaction,
    positionX: objective.position.x,
    positionY: objective.position.y,
    positionZ: objective.position.z,
    captureProgress: objective.captureProgress,
    capturingFaction: objective.capturingFaction,
    pointValue: objective.pointValue,
    required: objective.required,
    timeRemaining: BigInt(objective.timeRemaining ?? 0),
  };
}

/**
 * Convert InvasionParticipant to network data
 */
export function participantToData(participant: InvasionParticipant): InvasionParticipantData {
  return {
    playerId: participant.playerId as bigint,
    playerName: participant.playerName,
    faction: participant.faction,
    score: participant.score,
    objectivesCompleted: participant.objectivesCompleted,
    playerKills: participant.playerKills,
    npcKills: participant.npcKills,
    deaths: participant.deaths,
    active: participant.active,
  };
}

/**
 * Convert SpawnedNPC to network data
 */
export function spawnedNPCToData(npc: SpawnedNPC): SpawnedNPCData {
  return {
    instanceId: npc.instanceId as bigint,
    templateId: npc.templateId,
    faction: npc.faction,
    role: npc.role,
    tier: npc.tier,
    positionX: npc.position.x,
    positionY: npc.position.y,
    positionZ: npc.position.z,
    healthPercent: npc.healthPercent,
  };
}

/**
 * Create an InvasionStartMessage
 */
export function createInvasionStartMessage(
  regionId: string,
  regionName: string,
  attackingFaction: Faction,
  defendingFaction: Faction,
  phase: InvasionPhase,
  phaseTimeRemaining: number,
  eventDuration: number,
  objectives: InvasionObjective[]
): InvasionStartMessage {
  return {
    opcode: GCWMessageOpcode.InvasionStart,
    regionId,
    regionName,
    attackingFaction,
    defendingFaction,
    phase,
    phaseTimeRemaining: BigInt(phaseTimeRemaining),
    eventDuration: BigInt(eventDuration),
    objectives: objectives.map(objectiveToData),
    timestamp: BigInt(Date.now()),
  };
}

/**
 * Create an InvasionPhaseChangeMessage
 */
export function createInvasionPhaseChangeMessage(
  regionId: string,
  previousPhase: InvasionPhase,
  newPhase: InvasionPhase,
  phaseTimeRemaining: number,
  attackerScore: number,
  defenderScore: number
): InvasionPhaseChangeMessage {
  return {
    opcode: GCWMessageOpcode.InvasionPhaseChange,
    regionId,
    previousPhase,
    newPhase,
    phaseTimeRemaining: BigInt(phaseTimeRemaining),
    attackerScore,
    defenderScore,
    timestamp: BigInt(Date.now()),
  };
}

/**
 * Create an InvasionObjectiveMessage
 */
export function createInvasionObjectiveMessage(
  regionId: string,
  objective: InvasionObjective,
  justCompleted: boolean,
  completedBy: Faction | null,
  pointsAwarded: number
): InvasionObjectiveMessage {
  return {
    opcode: GCWMessageOpcode.InvasionObjective,
    regionId,
    objective: objectiveToData(objective),
    justCompleted,
    completedBy,
    pointsAwarded,
    timestamp: BigInt(Date.now()),
  };
}

/**
 * Create an InvasionResultMessage
 */
export function createInvasionResultMessage(
  regionId: string,
  regionName: string,
  result: InvasionResult,
  mvpPlayerName: string,
  newImperialControl: number,
  newRebelControl: number
): InvasionResultMessage {
  return {
    opcode: GCWMessageOpcode.InvasionResult,
    regionId,
    regionName,
    winner: result.winner,
    attackerScore: result.attackerScore,
    defenderScore: result.defenderScore,
    duration: BigInt(result.duration),
    attackerObjectivesCompleted: result.attackerObjectivesCompleted,
    defenderObjectivesCompleted: result.defenderObjectivesCompleted,
    attackerCount: result.attackerCount,
    defenderCount: result.defenderCount,
    mvpPlayerId: result.mvpPlayerId as bigint ?? 0n,
    mvpPlayerName,
    mvpScore: result.mvpScore,
    newImperialControl,
    newRebelControl,
    timestamp: BigInt(Date.now()),
  };
}

/**
 * Create a BaseVulnerabilityMessage
 */
export function createBaseVulnerabilityMessage(
  baseId: ObjectId,
  regionId: string,
  faction: Faction,
  isVulnerable: boolean,
  vulnerabilityStart: Date | null,
  vulnerabilityEnd: Date | null,
  timeUntilVulnerable: number | null,
  vulnerabilityTimeRemaining: number | null
): BaseVulnerabilityMessage {
  return {
    opcode: GCWMessageOpcode.BaseVulnerability,
    baseId: baseId as bigint,
    regionId,
    faction,
    isVulnerable,
    vulnerabilityStart: vulnerabilityStart ? BigInt(vulnerabilityStart.getTime()) : 0n,
    vulnerabilityEnd: vulnerabilityEnd ? BigInt(vulnerabilityEnd.getTime()) : 0n,
    timeUntilVulnerable: BigInt(timeUntilVulnerable ?? 0),
    vulnerabilityTimeRemaining: BigInt(vulnerabilityTimeRemaining ?? 0),
    timestamp: BigInt(Date.now()),
  };
}

/**
 * Create a WeeklyCycleResetMessage
 */
export function createWeeklyCycleResetMessage(
  regionsAffected: string[],
  totalPointsDecayed: number,
  nextResetTime: Date
): WeeklyCycleResetMessage {
  return {
    opcode: GCWMessageOpcode.WeeklyCycleReset,
    regionsAffected,
    totalPointsDecayed,
    nextResetTime: BigInt(nextResetTime.getTime()),
    timestamp: BigInt(Date.now()),
  };
}

/**
 * Create a ZoneBonusesMessage
 */
export function createZoneBonusesMessage(
  regionId: string,
  playerFaction: Faction,
  controllingFaction: Faction,
  hasControl: boolean,
  xpBonus: number,
  factionPointBonus: number,
  vendorDiscount: number,
  respawnReduction: number,
  fastTravelAvailable: boolean,
  combatBuffTier: number,
  cloningAvailable: boolean
): ZoneBonusesMessage {
  return {
    opcode: GCWMessageOpcode.ZoneBonuses,
    regionId,
    playerFaction,
    controllingFaction,
    hasControl,
    xpBonus,
    factionPointBonus,
    vendorDiscount,
    respawnReduction,
    fastTravelAvailable,
    combatBuffTier,
    cloningAvailable,
  };
}

/**
 * Create a FactionNPCsSpawnedMessage
 */
export function createFactionNPCsSpawnedMessage(
  regionId: string,
  faction: Faction,
  npcs: SpawnedNPC[],
  totalFactionNPCs: number
): FactionNPCsSpawnedMessage {
  return {
    opcode: GCWMessageOpcode.FactionNPCsSpawned,
    regionId,
    faction,
    npcs: npcs.map(spawnedNPCToData),
    totalFactionNPCs,
    timestamp: BigInt(Date.now()),
  };
}

/**
 * Create a ReinforcementsArrivingMessage
 */
export function createReinforcementsArrivingMessage(
  regionId: string,
  faction: Faction,
  position: Vector3,
  count: number,
  waveNumber: number,
  arrivalTime: number
): ReinforcementsArrivingMessage {
  return {
    opcode: GCWMessageOpcode.ReinforcementsArriving,
    regionId,
    faction,
    positionX: position.x,
    positionY: position.y,
    positionZ: position.z,
    count,
    waveNumber,
    arrivalTime: BigInt(arrivalTime),
    timestamp: BigInt(Date.now()),
  };
}
