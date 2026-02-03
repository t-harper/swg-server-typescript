/**
 * Bounty Types
 * Type definitions and constants for the bounty hunter system
 *
 * The bounty system allows bounty hunters to track and hunt Jedi,
 * criminal players, and NPCs for rewards. Includes investigation
 * mechanics and droid tracking systems.
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';

// ============================================
// Constants
// ============================================

/** Maximum concurrent bounty missions a hunter can have */
export const MAX_CONCURRENT_BOUNTIES = 1;

/** Default mission expiration time in milliseconds (24 hours) */
export const DEFAULT_MISSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** Minimum Jedi visibility required to become a bounty target */
export const MIN_JEDI_VISIBILITY_FOR_BOUNTY = 25;

/** Base reward multiplier for Jedi targets */
export const JEDI_REWARD_MULTIPLIER = 5;

/** Maximum distance for seeker droid tracking in meters */
export const SEEKER_DROID_MAX_RANGE = 1000;

/** Cooldown between seeker droid deployments in milliseconds */
export const SEEKER_DROID_COOLDOWN_MS = 5 * 60 * 1000;

/** Investigation clue accuracy decay rate per hour */
export const CLUE_ACCURACY_DECAY_RATE = 0.05;

/** Minimum accuracy for a clue to be useful */
export const MIN_CLUE_ACCURACY = 0.1;

/** Base cost for information broker consultation in credits */
export const INFO_BROKER_BASE_COST = 5000;

// ============================================
// Enums
// ============================================

/**
 * Type of bounty target
 */
export enum BountyTargetType {
  /** Jedi character with visibility */
  JEDI = 0,
  /** Player with criminal flag/bounty */
  PLAYER_CRIMINAL = 1,
  /** Non-player character target */
  NPC = 2,
}

/**
 * Current status of a bounty mission
 */
export enum BountyStatus {
  /** Mission is available for acceptance */
  AVAILABLE = 0,
  /** Mission has been accepted by a hunter */
  ACCEPTED = 1,
  /** Hunter is actively pursuing the target */
  IN_PROGRESS = 2,
  /** Target has been eliminated, mission complete */
  COMPLETED = 3,
  /** Mission failed (hunter died, target escaped) */
  FAILED = 4,
  /** Mission expired before completion */
  EXPIRED = 5,
}

/**
 * Type of bounty mission phase
 */
export enum BountyMissionType {
  /** Initial investigation phase to gather clues */
  INVESTIGATION = 0,
  /** Active hunt phase after target is located */
  HUNT = 1,
}

/**
 * Type of investigation clue
 */
export enum InvestigationClueType {
  /** Clue about target's last known location */
  LOCATION = 0,
  /** Known alias or identity information */
  ALIAS = 1,
  /** Recent activity or behavior pattern */
  ACTIVITY = 2,
  /** Known associates or contacts */
  ASSOCIATE = 3,
}

/**
 * Faction restriction for bounty terminals
 */
export enum BountyFaction {
  /** No faction restriction */
  NEUTRAL = 0,
  /** Imperial faction only */
  IMPERIAL = 1,
  /** Rebel faction only */
  REBEL = 2,
}

/**
 * Droid type for bounty hunting
 */
export enum BountyDroidType {
  /** Seeker droid for tracking */
  SEEKER = 0,
  /** Probe droid for scanning areas */
  PROBE = 1,
}

/**
 * Droid operational state
 */
export enum DroidState {
  /** Droid is stored/inactive */
  INACTIVE = 0,
  /** Droid is deployed and tracking */
  TRACKING = 1,
  /** Droid is scanning an area */
  SCANNING = 2,
  /** Droid is returning to owner */
  RETURNING = 3,
  /** Droid was destroyed */
  DESTROYED = 4,
}

// ============================================
// Interfaces
// ============================================

/**
 * A bounty mission assignment
 */
export interface BountyMission {
  /** Unique mission identifier */
  id: bigint;
  /** Object ID of the target character/NPC */
  targetId: ObjectId;
  /** Display name of the target */
  targetName: string;
  /** Type of target (Jedi, criminal, NPC) */
  targetType: BountyTargetType;
  /** Credit reward for completion */
  reward: bigint;
  /** Current mission status */
  status: BountyStatus;
  /** Current mission phase */
  missionType: BountyMissionType;
  /** Timestamp when mission expires */
  expiresAt: Date;
  /** Timestamp when mission was created */
  createdAt: Date;
  /** Timestamp when mission was accepted */
  acceptedAt: Date | null;
  /** Object ID of the hunter who accepted */
  hunterId: ObjectId | null;
  /** Target's level at time of bounty creation */
  targetLevel: number;
  /** Target's Jedi visibility (for Jedi targets) */
  targetVisibility: number;
  /** Zone/planet where target was last seen */
  lastKnownZone: string;
  /** Accumulated clues gathered during investigation */
  clues: InvestigationClue[];
}

/**
 * An investigation clue about a bounty target
 */
export interface InvestigationClue {
  /** Type of clue */
  type: InvestigationClueType;
  /** Clue data (location coordinates, alias, etc.) */
  data: ClueData;
  /** Accuracy of the clue (0.0 to 1.0) */
  accuracy: number;
  /** Cost in credits to obtain this clue */
  cost: bigint;
  /** Timestamp when clue was obtained */
  obtainedAt: Date;
  /** Source of the clue (info broker ID, droid scan, etc.) */
  source: string;
}

/**
 * Union type for clue data based on clue type
 */
export type ClueData = LocationClueData | AliasClueData | ActivityClueData | AssociateClueData;

/**
 * Location clue data
 */
export interface LocationClueData {
  type: 'location';
  /** Zone/planet name */
  zone: string;
  /** Approximate coordinates (may be offset based on accuracy) */
  position: Vector3;
  /** Timestamp of the sighting */
  seenAt: Date;
  /** Radius of uncertainty in meters */
  uncertaintyRadius: number;
}

/**
 * Alias/identity clue data
 */
export interface AliasClueData {
  type: 'alias';
  /** Known name or alias */
  alias: string;
  /** Character appearance description */
  description: string;
  /** Species of the target */
  species: string;
}

/**
 * Activity clue data
 */
export interface ActivityClueData {
  type: 'activity';
  /** Description of activity */
  activity: string;
  /** Zone where activity occurred */
  zone: string;
  /** Timestamp of activity */
  timestamp: Date;
  /** Frequency of activity (daily, weekly, etc.) */
  frequency: string;
}

/**
 * Associate clue data
 */
export interface AssociateClueData {
  type: 'associate';
  /** Name of the associate */
  associateName: string;
  /** Object ID of associate (if known) */
  associateId: ObjectId | null;
  /** Relationship type (guild member, friend, etc.) */
  relationship: string;
  /** Where they were seen together */
  location: string;
}

/**
 * A character that can be targeted for bounty
 */
export interface BountyTarget {
  /** Character object ID */
  characterId: ObjectId;
  /** Character display name */
  name: string;
  /** Last known location position */
  lastKnownLocation: Vector3;
  /** Last known zone/planet */
  lastKnownZone: string;
  /** Timestamp of last known location update */
  lastLocationUpdate: Date;
  /** Jedi visibility value (0 for non-Jedi) */
  jediVisibility: number;
  /** Current bounty amount on the target */
  bountyAmount: bigint;
  /** Target's combat level */
  level: number;
  /** Whether target is currently online */
  isOnline: boolean;
  /** Type of target */
  targetType: BountyTargetType;
  /** Number of times this target has escaped bounty hunters */
  escapeCount: number;
  /** Number of times this target has been captured/killed */
  captureCount: number;
}

/**
 * A bounty terminal location
 */
export interface BountyTerminal {
  /** Unique terminal identifier */
  terminalId: ObjectId;
  /** Terminal location coordinates */
  location: Vector3;
  /** Zone/planet where terminal is located */
  zone: string;
  /** Faction restriction for using this terminal */
  factionRestriction: BountyFaction;
  /** Whether terminal is currently active */
  isActive: boolean;
  /** Display name for the terminal */
  displayName: string;
}

/**
 * Bounty hunter character data
 */
export interface BountyHunter {
  /** Character object ID */
  characterId: ObjectId;
  /** Character display name */
  name: string;
  /** Number of successful bounties completed */
  completedBounties: number;
  /** Number of failed bounties */
  failedBounties: number;
  /** Total credits earned from bounties */
  totalEarnings: bigint;
  /** Current active missions */
  activeMissions: bigint[];
  /** Bounty hunter skill level */
  skillLevel: number;
  /** Whether hunter has seeker droid skill */
  hasSeekerDroid: boolean;
  /** Whether hunter has probe droid skill */
  hasProbeDroid: boolean;
  /** Last droid deployment timestamp */
  lastDroidDeployment: Date | null;
}

/**
 * Information broker NPC data
 */
export interface InformationBroker {
  /** NPC object ID */
  brokerId: ObjectId;
  /** Broker display name */
  name: string;
  /** Location coordinates */
  location: Vector3;
  /** Zone/planet where broker is located */
  zone: string;
  /** Faction affiliation */
  faction: BountyFaction;
  /** Base cost multiplier for this broker */
  costMultiplier: number;
  /** Accuracy bonus for clues from this broker */
  accuracyBonus: number;
  /** Cooldown between consultations in milliseconds */
  consultationCooldown: number;
}

/**
 * Bounty system configuration
 */
export interface BountySystemConfig {
  /** Enable detailed logging */
  enableLogging: boolean;
  /** Maximum concurrent bounties per hunter */
  maxConcurrentBounties: number;
  /** Default mission expiration time in milliseconds */
  defaultMissionExpiryMs: number;
  /** Minimum Jedi visibility for bounty */
  minJediVisibility: number;
  /** Base reward for level 1 target */
  baseReward: bigint;
  /** Reward multiplier per target level */
  rewardPerLevel: bigint;
  /** Jedi reward multiplier */
  jediRewardMultiplier: number;
  /** Criminal player reward multiplier */
  criminalRewardMultiplier: number;
  /** Seeker droid cooldown in milliseconds */
  seekerDroidCooldownMs: number;
  /** Probe droid cooldown in milliseconds */
  probeDroidCooldownMs: number;
  /** ID generator function */
  generateId: () => bigint;
}

/**
 * Result of a bounty operation
 */
export interface BountyOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result code */
  resultCode: BountyResultCode;
  /** Error message if failed */
  errorMessage?: string;
  /** Mission ID if applicable */
  missionId?: bigint;
}

/**
 * Result codes for bounty operations
 */
export enum BountyResultCode {
  /** Operation completed successfully */
  Success = 0,
  /** Hunter not found */
  HunterNotFound = 1,
  /** Target not found */
  TargetNotFound = 2,
  /** Mission not found */
  MissionNotFound = 3,
  /** Mission already accepted */
  MissionAlreadyAccepted = 4,
  /** Maximum bounties reached */
  MaxBountiesReached = 5,
  /** Insufficient funds */
  InsufficientFunds = 6,
  /** Mission expired */
  MissionExpired = 7,
  /** Not authorized */
  NotAuthorized = 8,
  /** Target not eligible for bounty */
  TargetNotEligible = 9,
  /** Droid on cooldown */
  DroidOnCooldown = 10,
  /** No droid available */
  NoDroidAvailable = 11,
  /** Target out of range */
  TargetOutOfRange = 12,
  /** Server error */
  ServerError = 99,
}

/**
 * Seeker droid tracking result
 */
export interface DroidTrackingResult {
  /** Whether tracking was successful */
  success: boolean;
  /** Target's approximate location */
  location?: Vector3;
  /** Zone where target was found */
  zone?: string;
  /** Accuracy of the location */
  accuracy?: number;
  /** Distance to target in meters */
  distance?: number;
  /** Direction to target (compass heading) */
  heading?: number;
  /** Error message if failed */
  errorMessage?: string;
}

/**
 * Area scan result from probe droid
 */
export interface AreaScanResult {
  /** Whether scan was successful */
  success: boolean;
  /** Center of scanned area */
  scanCenter: Vector3;
  /** Radius of scanned area */
  scanRadius: number;
  /** Detected targets in area */
  detectedTargets: DetectedTarget[];
  /** Error message if failed */
  errorMessage?: string;
}

/**
 * A target detected by area scan
 */
export interface DetectedTarget {
  /** Target object ID */
  targetId: ObjectId;
  /** Target name */
  name: string;
  /** Approximate position */
  position: Vector3;
  /** Signal strength (affects accuracy) */
  signalStrength: number;
  /** Whether target is a bounty mark */
  isBountyMark: boolean;
}
