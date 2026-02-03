/**
 * Bounty Network Messages
 * Protocol message types for bounty system client-server communication
 *
 * Note: These are game-logic level message types. The actual network
 * serialization/deserialization would be implemented in the protocol package.
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  BountyStatus,
  BountyTargetType,
  BountyMissionType,
  InvestigationClueType,
  BountyResultCode,
  DroidState,
  BountyDroidType,
  type BountyMission,
  type InvestigationClue,
  type LocationClueData,
  type DroidTrackingResult,
  type AreaScanResult,
  type DetectedTarget,
} from './bounty-types.js';

// ============================================
// Message Opcodes
// ============================================

/**
 * Bounty message opcodes
 */
export const BountyMessageOpcode = {
  /** Client request for bounty list from terminal */
  RequestBountyList: 0xb1a2c3d4,
  /** Server response with bounty list */
  BountyListResponse: 0xb2a3c4d5,
  /** Client request to accept a bounty */
  AcceptBounty: 0xb3a4c5d6,
  /** Server response to accept bounty request */
  AcceptBountyResponse: 0xb4a5c6d7,
  /** Client request to abandon a bounty */
  AbandonBounty: 0xb5a6c7d8,
  /** Server response to abandon bounty request */
  AbandonBountyResponse: 0xb6a7c8d9,
  /** Server notification of new clue */
  ClueDiscovered: 0xb7a8c9da,
  /** Client request for clue from broker */
  RequestClue: 0xb8a9cadb,
  /** Server response with clue data */
  ClueResponse: 0xb9aacbdc,
  /** Client request to deploy seeker droid */
  DeploySeeker: 0xbaabccdd,
  /** Server response with seeker deployment result */
  DeploySeekerResponse: 0xbbaccdde,
  /** Server update on seeker droid status */
  SeekerDroidUpdate: 0xbcadcedf,
  /** Client request to deploy probe droid */
  DeployProbe: 0xbdaecfe0,
  /** Server response with probe scan results */
  ProbeScanResults: 0xbeafcfe1,
  /** Client request to recall droid */
  RecallDroid: 0xbfb0d0e2,
  /** Server notification of target location */
  TargetLocationUpdate: 0xc0b1d1e3,
  /** Server notification of bounty completion */
  BountyCompleted: 0xc1b2d2e4,
  /** Server notification of bounty failed */
  BountyFailed: 0xc2b3d3e5,
  /** Client request to progress mission to hunt phase */
  ProgressToHunt: 0xc3b4d4e6,
  /** Server response to progress request */
  ProgressToHuntResponse: 0xc4b5d5e7,
  /** Client request for mission details */
  RequestMissionDetails: 0xc5b6d6e8,
  /** Server response with mission details */
  MissionDetailsResponse: 0xc6b7d7e9,
} as const;

export type BountyMessageOpcodeType =
  (typeof BountyMessageOpcode)[keyof typeof BountyMessageOpcode];

// ============================================
// Bounty List Messages
// ============================================

/**
 * BountyListMessage - Client request for bounty list
 */
export interface RequestBountyListMessage {
  opcode: typeof BountyMessageOpcode.RequestBountyList;
  /** Terminal object ID being accessed */
  terminalId: ObjectId;
}

/**
 * Bounty list entry for network transmission
 */
export interface BountyListEntry {
  /** Mission ID */
  missionId: bigint;
  /** Target display name */
  targetName: string;
  /** Target type */
  targetType: BountyTargetType;
  /** Target level */
  targetLevel: number;
  /** Credit reward */
  reward: bigint;
  /** Last known zone */
  lastKnownZone: string;
  /** Time remaining until expiry (ms) */
  timeRemaining: bigint;
}

/**
 * BountyListResponseMessage - Server response with bounty list
 */
export interface BountyListResponseMessage {
  opcode: typeof BountyMessageOpcode.BountyListResponse;
  /** Array of available bounties */
  bounties: BountyListEntry[];
  /** Total available count */
  totalCount: number;
}

// ============================================
// Accept/Abandon Messages
// ============================================

/**
 * BountyAcceptMessage - Client request to accept a bounty
 */
export interface BountyAcceptMessage {
  opcode: typeof BountyMessageOpcode.AcceptBounty;
  /** Mission ID to accept */
  missionId: bigint;
  /** Terminal ID (for validation) */
  terminalId: ObjectId;
}

/**
 * BountyAcceptResponseMessage - Server response to accept request
 */
export interface BountyAcceptResponseMessage {
  opcode: typeof BountyMessageOpcode.AcceptBountyResponse;
  /** Whether acceptance succeeded */
  success: boolean;
  /** Result code */
  resultCode: BountyResultCode;
  /** Mission ID */
  missionId: bigint;
  /** Error message if failed */
  errorMessage: string;
  /** Mission data if successful */
  mission?: MissionData;
}

/**
 * AbandonBountyMessage - Client request to abandon a bounty
 */
export interface AbandonBountyMessage {
  opcode: typeof BountyMessageOpcode.AbandonBounty;
  /** Mission ID to abandon */
  missionId: bigint;
}

/**
 * AbandonBountyResponseMessage - Server response to abandon request
 */
export interface AbandonBountyResponseMessage {
  opcode: typeof BountyMessageOpcode.AbandonBountyResponse;
  /** Whether abandonment succeeded */
  success: boolean;
  /** Result code */
  resultCode: BountyResultCode;
  /** Mission ID */
  missionId: bigint;
  /** Error message if failed */
  errorMessage: string;
}

// ============================================
// Clue Messages
// ============================================

/**
 * BountyClueMessage - Server notification of clue discovery
 */
export interface BountyClueMessage {
  opcode: typeof BountyMessageOpcode.ClueDiscovered;
  /** Mission ID */
  missionId: bigint;
  /** Clue data */
  clue: ClueData;
}

/**
 * Clue data for network transmission
 */
export interface ClueData {
  /** Clue type */
  type: InvestigationClueType;
  /** Clue accuracy (0-1) */
  accuracy: number;
  /** Cost paid for clue */
  cost: bigint;
  /** Unix timestamp when obtained */
  obtainedAt: bigint;
  /** Source description */
  source: string;
  /** Type-specific data */
  locationData?: LocationClueNetworkData;
  aliasData?: AliasClueNetworkData;
  activityData?: ActivityClueNetworkData;
  associateData?: AssociateClueNetworkData;
}

/**
 * Location clue network data
 */
export interface LocationClueNetworkData {
  /** Zone/planet name */
  zone: string;
  /** Position coordinates */
  x: number;
  y: number;
  z: number;
  /** Unix timestamp of sighting */
  seenAt: bigint;
  /** Uncertainty radius in meters */
  uncertaintyRadius: number;
}

/**
 * Alias clue network data
 */
export interface AliasClueNetworkData {
  /** Known alias */
  alias: string;
  /** Appearance description */
  description: string;
  /** Species */
  species: string;
}

/**
 * Activity clue network data
 */
export interface ActivityClueNetworkData {
  /** Activity description */
  activity: string;
  /** Zone where activity occurred */
  zone: string;
  /** Unix timestamp of activity */
  timestamp: bigint;
  /** Frequency description */
  frequency: string;
}

/**
 * Associate clue network data
 */
export interface AssociateClueNetworkData {
  /** Associate name */
  associateName: string;
  /** Associate ID (0 if unknown) */
  associateId: bigint;
  /** Relationship type */
  relationship: string;
  /** Location where seen together */
  location: string;
}

/**
 * RequestClueMessage - Client request for clue from broker
 */
export interface RequestClueMessage {
  opcode: typeof BountyMessageOpcode.RequestClue;
  /** Mission ID */
  missionId: bigint;
  /** Broker NPC ID */
  brokerId: ObjectId;
  /** Type of clue requested */
  clueType: InvestigationClueType;
}

/**
 * ClueResponseMessage - Server response with clue data
 */
export interface ClueResponseMessage {
  opcode: typeof BountyMessageOpcode.ClueResponse;
  /** Whether request succeeded */
  success: boolean;
  /** Result code */
  resultCode: BountyResultCode;
  /** Mission ID */
  missionId: bigint;
  /** Clue data if successful */
  clue?: ClueData;
  /** Error message if failed */
  errorMessage: string;
}

// ============================================
// Seeker Droid Messages
// ============================================

/**
 * DeploySeekerMessage - Client request to deploy seeker droid
 */
export interface DeploySeekerMessage {
  opcode: typeof BountyMessageOpcode.DeploySeeker;
  /** Mission ID */
  missionId: bigint;
}

/**
 * DeploySeekerResponseMessage - Server response with deployment result
 */
export interface DeploySeekerResponseMessage {
  opcode: typeof BountyMessageOpcode.DeploySeekerResponse;
  /** Whether deployment succeeded */
  success: boolean;
  /** Result code */
  resultCode: BountyResultCode;
  /** Droid object ID if successful */
  droidId: bigint;
  /** Error message if failed */
  errorMessage: string;
}

/**
 * SeekerDroidUpdateMessage - Server update on seeker droid status
 */
export interface SeekerDroidUpdateMessage {
  opcode: typeof BountyMessageOpcode.SeekerDroidUpdate;
  /** Droid object ID */
  droidId: bigint;
  /** Current droid state */
  state: DroidState;
  /** Droid position */
  positionX: number;
  positionY: number;
  positionZ: number;
  /** Current zone */
  zone: string;
  /** Whether target was found */
  targetFound: boolean;
  /** Target position if found */
  targetX?: number;
  targetY?: number;
  targetZ?: number;
  /** Distance to target */
  targetDistance?: number;
  /** Heading to target */
  targetHeading?: number;
  /** Status message */
  message: string;
}

// ============================================
// Probe Droid Messages
// ============================================

/**
 * DeployProbeMessage - Client request to deploy probe droid
 */
export interface DeployProbeMessage {
  opcode: typeof BountyMessageOpcode.DeployProbe;
  /** Scan center X coordinate */
  scanX: number;
  /** Scan center Y coordinate */
  scanY: number;
  /** Scan center Z coordinate */
  scanZ: number;
  /** Optional mission ID */
  missionId?: bigint;
}

/**
 * ProbeScanResultsMessage - Server response with scan results
 */
export interface ProbeScanResultsMessage {
  opcode: typeof BountyMessageOpcode.ProbeScanResults;
  /** Whether scan succeeded */
  success: boolean;
  /** Droid object ID */
  droidId: bigint;
  /** Scan center coordinates */
  scanX: number;
  scanY: number;
  scanZ: number;
  /** Scan radius */
  scanRadius: number;
  /** Detected targets */
  targets: DetectedTargetData[];
  /** Error message if failed */
  errorMessage: string;
}

/**
 * Detected target data for network transmission
 */
export interface DetectedTargetData {
  /** Target object ID */
  targetId: bigint;
  /** Target name */
  name: string;
  /** Position coordinates */
  x: number;
  y: number;
  z: number;
  /** Signal strength */
  signalStrength: number;
  /** Whether this is the bounty mark */
  isBountyMark: boolean;
}

/**
 * RecallDroidMessage - Client request to recall droid
 */
export interface RecallDroidMessage {
  opcode: typeof BountyMessageOpcode.RecallDroid;
  /** Droid object ID to recall */
  droidId: bigint;
}

// ============================================
// Target Location Messages
// ============================================

/**
 * BountyTargetLocationMessage - Server notification of target location
 */
export interface BountyTargetLocationMessage {
  opcode: typeof BountyMessageOpcode.TargetLocationUpdate;
  /** Mission ID */
  missionId: bigint;
  /** Target object ID */
  targetId: bigint;
  /** Target position */
  x: number;
  y: number;
  z: number;
  /** Target zone */
  zone: string;
  /** Accuracy of location */
  accuracy: number;
  /** Whether target is online */
  isOnline: boolean;
}

// ============================================
// Completion Messages
// ============================================

/**
 * BountyCompletedMessage - Server notification of bounty completion
 */
export interface BountyCompletedMessage {
  opcode: typeof BountyMessageOpcode.BountyCompleted;
  /** Mission ID */
  missionId: bigint;
  /** Target name */
  targetName: string;
  /** Reward earned */
  reward: bigint;
  /** Total bounties completed by hunter */
  totalCompleted: number;
  /** Total earnings by hunter */
  totalEarnings: bigint;
}

/**
 * BountyFailedMessage - Server notification of bounty failed
 */
export interface BountyFailedMessage {
  opcode: typeof BountyMessageOpcode.BountyFailed;
  /** Mission ID */
  missionId: bigint;
  /** Target name */
  targetName: string;
  /** Reason for failure */
  reason: string;
  /** Total bounties failed by hunter */
  totalFailed: number;
}

// ============================================
// Progress Messages
// ============================================

/**
 * ProgressToHuntMessage - Client request to progress mission
 */
export interface ProgressToHuntMessage {
  opcode: typeof BountyMessageOpcode.ProgressToHunt;
  /** Mission ID */
  missionId: bigint;
}

/**
 * ProgressToHuntResponseMessage - Server response to progress request
 */
export interface ProgressToHuntResponseMessage {
  opcode: typeof BountyMessageOpcode.ProgressToHuntResponse;
  /** Whether progression succeeded */
  success: boolean;
  /** Result code */
  resultCode: BountyResultCode;
  /** Mission ID */
  missionId: bigint;
  /** Error message if failed */
  errorMessage: string;
}

// ============================================
// Mission Details Messages
// ============================================

/**
 * RequestMissionDetailsMessage - Client request for mission details
 */
export interface RequestMissionDetailsMessage {
  opcode: typeof BountyMessageOpcode.RequestMissionDetails;
  /** Mission ID */
  missionId: bigint;
}

/**
 * Mission data for network transmission
 */
export interface MissionData {
  /** Mission ID */
  missionId: bigint;
  /** Target object ID */
  targetId: bigint;
  /** Target name */
  targetName: string;
  /** Target type */
  targetType: BountyTargetType;
  /** Target level */
  targetLevel: number;
  /** Credit reward */
  reward: bigint;
  /** Current status */
  status: BountyStatus;
  /** Mission phase */
  missionType: BountyMissionType;
  /** Unix timestamp of expiry */
  expiresAt: bigint;
  /** Unix timestamp of acceptance */
  acceptedAt: bigint;
  /** Last known zone */
  lastKnownZone: string;
  /** Number of clues gathered */
  clueCount: number;
  /** Array of clues */
  clues: ClueData[];
}

/**
 * MissionDetailsResponseMessage - Server response with mission details
 */
export interface MissionDetailsResponseMessage {
  opcode: typeof BountyMessageOpcode.MissionDetailsResponse;
  /** Whether request succeeded */
  success: boolean;
  /** Mission data if found */
  mission?: MissionData;
  /** Error message if failed */
  errorMessage: string;
}

// ============================================
// Union Types
// ============================================

/**
 * Union type of all bounty client messages
 */
export type BountyClientMessage =
  | RequestBountyListMessage
  | BountyAcceptMessage
  | AbandonBountyMessage
  | RequestClueMessage
  | DeploySeekerMessage
  | DeployProbeMessage
  | RecallDroidMessage
  | ProgressToHuntMessage
  | RequestMissionDetailsMessage;

/**
 * Union type of all bounty server messages
 */
export type BountyServerMessage =
  | BountyListResponseMessage
  | BountyAcceptResponseMessage
  | AbandonBountyResponseMessage
  | BountyClueMessage
  | ClueResponseMessage
  | DeploySeekerResponseMessage
  | SeekerDroidUpdateMessage
  | ProbeScanResultsMessage
  | BountyTargetLocationMessage
  | BountyCompletedMessage
  | BountyFailedMessage
  | ProgressToHuntResponseMessage
  | MissionDetailsResponseMessage;

/**
 * Union type of all bounty messages
 */
export type BountyMessage = BountyClientMessage | BountyServerMessage;

// ============================================
// Helper Functions
// ============================================

/**
 * Check if an opcode is a valid bounty message opcode
 */
export function isBountyMessageOpcode(
  opcode: number
): opcode is BountyMessageOpcodeType {
  return Object.values(BountyMessageOpcode).includes(opcode as BountyMessageOpcodeType);
}

/**
 * Create a BountyListResponseMessage
 */
export function createBountyListResponse(
  missions: BountyMission[]
): BountyListResponseMessage {
  const now = Date.now();
  return {
    opcode: BountyMessageOpcode.BountyListResponse,
    bounties: missions.map((m) => ({
      missionId: m.id,
      targetName: m.targetName,
      targetType: m.targetType,
      targetLevel: m.targetLevel,
      reward: m.reward,
      lastKnownZone: m.lastKnownZone,
      timeRemaining: BigInt(Math.max(0, m.expiresAt.getTime() - now)),
    })),
    totalCount: missions.length,
  };
}

/**
 * Create a BountyAcceptResponseMessage
 */
export function createBountyAcceptResponse(
  success: boolean,
  resultCode: BountyResultCode,
  missionId: bigint,
  errorMessage: string = '',
  mission?: BountyMission
): BountyAcceptResponseMessage {
  return {
    opcode: BountyMessageOpcode.AcceptBountyResponse,
    success,
    resultCode,
    missionId,
    errorMessage,
    mission: mission ? convertMissionToData(mission) : undefined,
  };
}

/**
 * Create a BountyClueMessage
 */
export function createBountyClueMessage(
  missionId: bigint,
  clue: InvestigationClue
): BountyClueMessage {
  return {
    opcode: BountyMessageOpcode.ClueDiscovered,
    missionId,
    clue: convertClueToData(clue),
  };
}

/**
 * Create a SeekerDroidUpdateMessage
 */
export function createSeekerDroidUpdate(
  droidId: ObjectId,
  state: DroidState,
  position: Vector3,
  zone: string,
  trackingResult?: DroidTrackingResult
): SeekerDroidUpdateMessage {
  return {
    opcode: BountyMessageOpcode.SeekerDroidUpdate,
    droidId,
    state,
    positionX: position.x,
    positionY: position.y,
    positionZ: position.z,
    zone,
    targetFound: trackingResult?.success ?? false,
    targetX: trackingResult?.location?.x,
    targetY: trackingResult?.location?.y,
    targetZ: trackingResult?.location?.z,
    targetDistance: trackingResult?.distance,
    targetHeading: trackingResult?.heading,
    message: trackingResult?.errorMessage ?? '',
  };
}

/**
 * Create a ProbeScanResultsMessage
 */
export function createProbeScanResults(
  droidId: ObjectId,
  result: AreaScanResult
): ProbeScanResultsMessage {
  return {
    opcode: BountyMessageOpcode.ProbeScanResults,
    success: result.success,
    droidId,
    scanX: result.scanCenter.x,
    scanY: result.scanCenter.y,
    scanZ: result.scanCenter.z,
    scanRadius: result.scanRadius,
    targets: result.detectedTargets.map((t) => ({
      targetId: t.targetId,
      name: t.name,
      x: t.position.x,
      y: t.position.y,
      z: t.position.z,
      signalStrength: t.signalStrength,
      isBountyMark: t.isBountyMark,
    })),
    errorMessage: result.errorMessage ?? '',
  };
}

/**
 * Create a BountyTargetLocationMessage
 */
export function createTargetLocationUpdate(
  missionId: bigint,
  targetId: ObjectId,
  position: Vector3,
  zone: string,
  accuracy: number,
  isOnline: boolean
): BountyTargetLocationMessage {
  return {
    opcode: BountyMessageOpcode.TargetLocationUpdate,
    missionId,
    targetId,
    x: position.x,
    y: position.y,
    z: position.z,
    zone,
    accuracy,
    isOnline,
  };
}

/**
 * Create a BountyCompletedMessage
 */
export function createBountyCompleted(
  missionId: bigint,
  targetName: string,
  reward: bigint,
  totalCompleted: number,
  totalEarnings: bigint
): BountyCompletedMessage {
  return {
    opcode: BountyMessageOpcode.BountyCompleted,
    missionId,
    targetName,
    reward,
    totalCompleted,
    totalEarnings,
  };
}

/**
 * Create a BountyFailedMessage
 */
export function createBountyFailed(
  missionId: bigint,
  targetName: string,
  reason: string,
  totalFailed: number
): BountyFailedMessage {
  return {
    opcode: BountyMessageOpcode.BountyFailed,
    missionId,
    targetName,
    reason,
    totalFailed,
  };
}

/**
 * Get result code message for display
 */
export function getBountyResultMessage(resultCode: BountyResultCode): string {
  switch (resultCode) {
    case BountyResultCode.Success:
      return 'Operation completed successfully.';
    case BountyResultCode.HunterNotFound:
      return 'Bounty hunter not found.';
    case BountyResultCode.TargetNotFound:
      return 'Target not found.';
    case BountyResultCode.MissionNotFound:
      return 'Mission not found.';
    case BountyResultCode.MissionAlreadyAccepted:
      return 'Mission has already been accepted.';
    case BountyResultCode.MaxBountiesReached:
      return 'Maximum number of bounties reached.';
    case BountyResultCode.InsufficientFunds:
      return 'Insufficient credits.';
    case BountyResultCode.MissionExpired:
      return 'Mission has expired.';
    case BountyResultCode.NotAuthorized:
      return 'Not authorized for this operation.';
    case BountyResultCode.TargetNotEligible:
      return 'Target is not eligible for bounty.';
    case BountyResultCode.DroidOnCooldown:
      return 'Droid is on cooldown.';
    case BountyResultCode.NoDroidAvailable:
      return 'No droid available.';
    case BountyResultCode.TargetOutOfRange:
      return 'Target is out of range.';
    case BountyResultCode.ServerError:
    default:
      return 'A server error occurred. Please try again.';
  }
}

// ============================================
// Internal Helper Functions
// ============================================

/**
 * Convert a BountyMission to MissionData for network transmission
 */
function convertMissionToData(mission: BountyMission): MissionData {
  return {
    missionId: mission.id,
    targetId: mission.targetId,
    targetName: mission.targetName,
    targetType: mission.targetType,
    targetLevel: mission.targetLevel,
    reward: mission.reward,
    status: mission.status,
    missionType: mission.missionType,
    expiresAt: BigInt(mission.expiresAt.getTime()),
    acceptedAt: mission.acceptedAt ? BigInt(mission.acceptedAt.getTime()) : 0n,
    lastKnownZone: mission.lastKnownZone,
    clueCount: mission.clues.length,
    clues: mission.clues.map(convertClueToData),
  };
}

/**
 * Convert an InvestigationClue to ClueData for network transmission
 */
function convertClueToData(clue: InvestigationClue): ClueData {
  const data: ClueData = {
    type: clue.type,
    accuracy: clue.accuracy,
    cost: clue.cost,
    obtainedAt: BigInt(clue.obtainedAt.getTime()),
    source: clue.source,
  };

  // Add type-specific data
  switch (clue.data.type) {
    case 'location':
      data.locationData = {
        zone: clue.data.zone,
        x: clue.data.position.x,
        y: clue.data.position.y,
        z: clue.data.position.z,
        seenAt: BigInt(clue.data.seenAt.getTime()),
        uncertaintyRadius: clue.data.uncertaintyRadius,
      };
      break;
    case 'alias':
      data.aliasData = {
        alias: clue.data.alias,
        description: clue.data.description,
        species: clue.data.species,
      };
      break;
    case 'activity':
      data.activityData = {
        activity: clue.data.activity,
        zone: clue.data.zone,
        timestamp: BigInt(clue.data.timestamp.getTime()),
        frequency: clue.data.frequency,
      };
      break;
    case 'associate':
      data.associateData = {
        associateName: clue.data.associateName,
        associateId: clue.data.associateId ?? 0n,
        relationship: clue.data.relationship,
        location: clue.data.location,
      };
      break;
  }

  return data;
}
