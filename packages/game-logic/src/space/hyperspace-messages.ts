/**
 * Hyperspace Network Messages
 * Protocol message types for hyperspace system client-server communication
 *
 * Handles:
 * - HyperspaceChargeStartMessage
 * - HyperspaceChargeCompleteMessage
 * - HyperspaceJumpMessage
 * - HyperspaceArrivalMessage
 * - HyperspaceAbortMessage
 * - InterdictionWarningMessage
 * - NavComputerUpdateMessage
 */

import type { ObjectId } from '@swg/shared-types';
import type { SpaceZoneId } from '@swg/world/src/space/space-types.js';
import {
  HyperspaceState,
  EmergencyExitReason,
  HyperspaceResultCode,
} from './hyperspace-types.js';
import { NavComputerStatus } from './hyperspace-types.js';

// ============================================
// Message Opcodes
// ============================================

/**
 * Hyperspace message opcodes
 */
export const HyperspaceMessageOpcode = {
  /** Client request to initiate hyperspace jump */
  RequestJump: 0xd1a1e1f1,
  /** Server response to jump request */
  RequestJumpResponse: 0xd2a2e2f2,
  /** Server notification that hyperdrive charging started */
  ChargeStart: 0xd3a3e3f3,
  /** Server notification that charging is complete */
  ChargeComplete: 0xd4a4e4f4,
  /** Server notification that ship entered hyperspace */
  JumpEntered: 0xd5a5e5f5,
  /** Server notification that ship arrived at destination */
  Arrival: 0xd6a6e6f6,
  /** Client request to abort jump */
  AbortJump: 0xd7a7e7f7,
  /** Server notification that jump was aborted */
  JumpAborted: 0xd8a8e8f8,
  /** Server warning of interdiction field */
  InterdictionWarning: 0xd9a9e9f9,
  /** Server notification of emergency exit */
  EmergencyExit: 0xdaaaeafa,
  /** Server update of nav computer status */
  NavComputerUpdate: 0xdbabebfb,
  /** Client request to set nav destination */
  SetNavDestination: 0xdcacecfc,
  /** Server response to nav destination request */
  SetNavDestinationResponse: 0xddadedfd,
  /** Client request for available routes */
  RequestRoutes: 0xdeaeee00,
  /** Server response with available routes */
  RoutesResponse: 0xdfafef01,
  /** Server notification of hyperspace progress */
  ProgressUpdate: 0xe0b0f002,
  /** Client request for jump status */
  RequestStatus: 0xe1b1f103,
  /** Server response with jump status */
  StatusResponse: 0xe2b2f204,
} as const;

export type HyperspaceMessageOpcodeType =
  (typeof HyperspaceMessageOpcode)[keyof typeof HyperspaceMessageOpcode];

// ============================================
// Jump Request Messages
// ============================================

/**
 * RequestJumpMessage - Client request to initiate hyperspace jump
 */
export interface RequestJumpMessage {
  opcode: typeof HyperspaceMessageOpcode.RequestJump;
  /** Ship object ID */
  shipId: ObjectId;
  /** Destination zone ID */
  destinationZoneId: SpaceZoneId;
}

/**
 * RequestJumpResponseMessage - Server response to jump request
 */
export interface RequestJumpResponseMessage {
  opcode: typeof HyperspaceMessageOpcode.RequestJumpResponse;
  /** Whether request was accepted */
  success: boolean;
  /** Result code */
  resultCode: HyperspaceResultCode;
  /** Ship object ID */
  shipId: ObjectId;
  /** Destination zone (if successful) */
  destinationZoneId: SpaceZoneId | null;
  /** Estimated charge time in ms */
  chargeTime: number;
  /** Estimated travel time in ms */
  travelTime: number;
  /** Fuel cost */
  fuelCost: number;
  /** Error message if failed */
  errorMessage: string;
}

// ============================================
// Charge Messages
// ============================================

/**
 * HyperspaceChargeStartMessage - Server notification that charging started
 */
export interface HyperspaceChargeStartMessage {
  opcode: typeof HyperspaceMessageOpcode.ChargeStart;
  /** Ship object ID */
  shipId: ObjectId;
  /** Pilot object ID */
  pilotId: ObjectId;
  /** Destination zone */
  destinationZoneId: SpaceZoneId;
  /** Charge duration in ms */
  chargeDuration: number;
  /** Unix timestamp when charging started */
  chargeStartTime: bigint;
}

/**
 * HyperspaceChargeCompleteMessage - Server notification that charging completed
 */
export interface HyperspaceChargeCompleteMessage {
  opcode: typeof HyperspaceMessageOpcode.ChargeComplete;
  /** Ship object ID */
  shipId: ObjectId;
  /** Destination zone */
  destinationZoneId: SpaceZoneId;
  /** Travel time in ms */
  travelTime: number;
}

// ============================================
// Jump Messages
// ============================================

/**
 * HyperspaceJumpMessage - Server notification that ship entered hyperspace
 */
export interface HyperspaceJumpMessage {
  opcode: typeof HyperspaceMessageOpcode.JumpEntered;
  /** Ship object ID */
  shipId: ObjectId;
  /** Pilot object ID */
  pilotId: ObjectId;
  /** Origin zone */
  originZoneId: SpaceZoneId;
  /** Destination zone */
  destinationZoneId: SpaceZoneId;
  /** Travel time in ms */
  travelTime: number;
  /** Unix timestamp of departure */
  departureTime: bigint;
  /** Unix timestamp of expected arrival */
  arrivalTime: bigint;
  /** Departure position X */
  departureX: number;
  /** Departure position Y */
  departureY: number;
  /** Departure position Z */
  departureZ: number;
}

/**
 * HyperspaceArrivalMessage - Server notification that ship arrived
 */
export interface HyperspaceArrivalMessage {
  opcode: typeof HyperspaceMessageOpcode.Arrival;
  /** Ship object ID */
  shipId: ObjectId;
  /** Pilot object ID */
  pilotId: ObjectId;
  /** Destination zone arrived at */
  destinationZoneId: SpaceZoneId;
  /** Arrival position X */
  arrivalX: number;
  /** Arrival position Y */
  arrivalY: number;
  /** Arrival position Z */
  arrivalZ: number;
  /** Cooldown duration in ms */
  cooldownDuration: number;
}

// ============================================
// Abort Messages
// ============================================

/**
 * AbortJumpMessage - Client request to abort jump
 */
export interface AbortJumpMessage {
  opcode: typeof HyperspaceMessageOpcode.AbortJump;
  /** Ship object ID */
  shipId: ObjectId;
}

/**
 * HyperspaceAbortMessage - Server notification that jump was aborted
 */
export interface HyperspaceAbortMessage {
  opcode: typeof HyperspaceMessageOpcode.JumpAborted;
  /** Ship object ID */
  shipId: ObjectId;
  /** Pilot object ID */
  pilotId: ObjectId;
  /** Result code (why it was aborted) */
  resultCode: HyperspaceResultCode;
  /** Error message */
  message: string;
}

// ============================================
// Interdiction Messages
// ============================================

/**
 * InterdictionWarningMessage - Server warning of interdiction field
 */
export interface InterdictionWarningMessage {
  opcode: typeof HyperspaceMessageOpcode.InterdictionWarning;
  /** Ship object ID */
  shipId: ObjectId;
  /** Source of interdiction (ship/station ID) */
  sourceId: ObjectId;
  /** Source name */
  sourceName: string;
  /** Distance to interdiction source */
  distance: number;
  /** Field strength (0-1) */
  strength: number;
  /** Zone where interdiction is occurring */
  zoneId: SpaceZoneId;
}

/**
 * EmergencyExitMessage - Server notification of emergency hyperspace exit
 */
export interface EmergencyExitMessage {
  opcode: typeof HyperspaceMessageOpcode.EmergencyExit;
  /** Ship object ID */
  shipId: ObjectId;
  /** Pilot object ID */
  pilotId: ObjectId;
  /** Reason for emergency exit */
  reason: EmergencyExitReason;
  /** Exit zone */
  exitZoneId: SpaceZoneId;
  /** Exit position X */
  exitX: number;
  /** Exit position Y */
  exitY: number;
  /** Exit position Z */
  exitZ: number;
  /** Extended cooldown duration in ms */
  cooldownDuration: number;
  /** Descriptive message */
  message: string;
}

// ============================================
// Nav Computer Messages
// ============================================

/**
 * SetNavDestinationMessage - Client request to set nav destination
 */
export interface SetNavDestinationMessage {
  opcode: typeof HyperspaceMessageOpcode.SetNavDestination;
  /** Ship object ID */
  shipId: ObjectId;
  /** Destination zone ID */
  destinationZoneId: SpaceZoneId;
}

/**
 * SetNavDestinationResponseMessage - Server response to nav destination request
 */
export interface SetNavDestinationResponseMessage {
  opcode: typeof HyperspaceMessageOpcode.SetNavDestinationResponse;
  /** Whether request succeeded */
  success: boolean;
  /** Ship object ID */
  shipId: ObjectId;
  /** Destination zone ID */
  destinationZoneId: SpaceZoneId | null;
  /** Calculation time in ms */
  calculationTime: number;
  /** Error message if failed */
  errorMessage: string;
}

/**
 * NavComputerUpdateMessage - Server update of nav computer status
 */
export interface NavComputerUpdateMessage {
  opcode: typeof HyperspaceMessageOpcode.NavComputerUpdate;
  /** Ship object ID */
  shipId: ObjectId;
  /** Nav computer status */
  status: NavComputerStatus;
  /** Current destination (null if none) */
  destinationZoneId: SpaceZoneId | null;
  /** Calculation progress (0-1) */
  calculationProgress: number;
  /** Whether route is valid */
  routeValid: boolean;
  /** Estimated travel time in ms (0 if no route) */
  estimatedTravelTime: number;
  /** Fuel required (0 if no route) */
  fuelRequired: number;
  /** Required pilot level (0 if no route) */
  requiredPilotLevel: number;
  /** Missing nav points */
  missingNavPoints: string[];
  /** Error message if route invalid */
  errorMessage: string;
}

// ============================================
// Route Messages
// ============================================

/**
 * Route data for network transmission
 */
export interface RouteData {
  /** Route ID */
  routeId: string;
  /** Route name */
  name: string;
  /** Destination zone ID */
  destinationZoneId: SpaceZoneId;
  /** Travel time in seconds */
  travelTime: number;
  /** Fuel cost */
  fuelCost: number;
  /** Required pilot level */
  requiredPilotLevel: number;
  /** Required nav points */
  requiredNavPoints: number;
  /** Whether player has required nav points */
  hasRequiredNavPoints: boolean;
  /** Whether route is one-way */
  oneWay: boolean;
}

/**
 * RequestRoutesMessage - Client request for available routes
 */
export interface RequestRoutesMessage {
  opcode: typeof HyperspaceMessageOpcode.RequestRoutes;
  /** Ship object ID */
  shipId: ObjectId;
}

/**
 * RoutesResponseMessage - Server response with available routes
 */
export interface RoutesResponseMessage {
  opcode: typeof HyperspaceMessageOpcode.RoutesResponse;
  /** Ship object ID */
  shipId: ObjectId;
  /** Current zone ID */
  currentZoneId: SpaceZoneId;
  /** Available routes */
  routes: RouteData[];
  /** Total route count */
  totalRoutes: number;
}

// ============================================
// Progress Messages
// ============================================

/**
 * ProgressUpdateMessage - Server notification of hyperspace progress
 */
export interface ProgressUpdateMessage {
  opcode: typeof HyperspaceMessageOpcode.ProgressUpdate;
  /** Ship object ID */
  shipId: ObjectId;
  /** Current hyperspace state */
  state: HyperspaceState;
  /** Progress through current state (0-1) */
  progress: number;
  /** Time remaining in current state (ms) */
  timeRemaining: number;
  /** Destination zone */
  destinationZoneId: SpaceZoneId;
}

// ============================================
// Status Messages
// ============================================

/**
 * RequestStatusMessage - Client request for jump status
 */
export interface RequestStatusMessage {
  opcode: typeof HyperspaceMessageOpcode.RequestStatus;
  /** Ship object ID */
  shipId: ObjectId;
}

/**
 * StatusResponseMessage - Server response with jump status
 */
export interface StatusResponseMessage {
  opcode: typeof HyperspaceMessageOpcode.StatusResponse;
  /** Ship object ID */
  shipId: ObjectId;
  /** Current hyperspace state */
  state: HyperspaceState;
  /** Whether ship has functional hyperdrive */
  hasHyperdrive: boolean;
  /** Hyperdrive efficiency (0-1) */
  hyperdriveEfficiency: number;
  /** Current fuel */
  currentFuel: number;
  /** Maximum fuel */
  maxFuel: number;
  /** Cooldown remaining in ms */
  cooldownRemaining: number;
  /** Charge time remaining in ms */
  chargeRemaining: number;
  /** Travel time remaining in ms */
  travelTimeRemaining: number;
  /** Current destination (null if none) */
  destinationZoneId: SpaceZoneId | null;
  /** Whether ship is interdicted */
  isInterdicted: boolean;
}

// ============================================
// Union Types
// ============================================

/**
 * Union type of all hyperspace client messages
 */
export type HyperspaceClientMessage =
  | RequestJumpMessage
  | AbortJumpMessage
  | SetNavDestinationMessage
  | RequestRoutesMessage
  | RequestStatusMessage;

/**
 * Union type of all hyperspace server messages
 */
export type HyperspaceServerMessage =
  | RequestJumpResponseMessage
  | HyperspaceChargeStartMessage
  | HyperspaceChargeCompleteMessage
  | HyperspaceJumpMessage
  | HyperspaceArrivalMessage
  | HyperspaceAbortMessage
  | InterdictionWarningMessage
  | EmergencyExitMessage
  | SetNavDestinationResponseMessage
  | NavComputerUpdateMessage
  | RoutesResponseMessage
  | ProgressUpdateMessage
  | StatusResponseMessage;

/**
 * Union type of all hyperspace messages
 */
export type HyperspaceMessage = HyperspaceClientMessage | HyperspaceServerMessage;

// ============================================
// Helper Functions
// ============================================

/**
 * Check if an opcode is a valid hyperspace message opcode
 */
export function isHyperspaceMessageOpcode(
  opcode: number
): opcode is HyperspaceMessageOpcodeType {
  return Object.values(HyperspaceMessageOpcode).includes(
    opcode as HyperspaceMessageOpcodeType
  );
}

/**
 * Create a RequestJumpResponseMessage
 */
export function createRequestJumpResponse(
  success: boolean,
  resultCode: HyperspaceResultCode,
  shipId: ObjectId,
  destinationZoneId: SpaceZoneId | null = null,
  chargeTime: number = 0,
  travelTime: number = 0,
  fuelCost: number = 0,
  errorMessage: string = ''
): RequestJumpResponseMessage {
  return {
    opcode: HyperspaceMessageOpcode.RequestJumpResponse,
    success,
    resultCode,
    shipId,
    destinationZoneId,
    chargeTime,
    travelTime,
    fuelCost,
    errorMessage,
  };
}

/**
 * Create a HyperspaceChargeStartMessage
 */
export function createChargeStartMessage(
  shipId: ObjectId,
  pilotId: ObjectId,
  destinationZoneId: SpaceZoneId,
  chargeDuration: number
): HyperspaceChargeStartMessage {
  return {
    opcode: HyperspaceMessageOpcode.ChargeStart,
    shipId,
    pilotId,
    destinationZoneId,
    chargeDuration,
    chargeStartTime: BigInt(Date.now()),
  };
}

/**
 * Create a HyperspaceChargeCompleteMessage
 */
export function createChargeCompleteMessage(
  shipId: ObjectId,
  destinationZoneId: SpaceZoneId,
  travelTime: number
): HyperspaceChargeCompleteMessage {
  return {
    opcode: HyperspaceMessageOpcode.ChargeComplete,
    shipId,
    destinationZoneId,
    travelTime,
  };
}

/**
 * Create a HyperspaceJumpMessage
 */
export function createJumpMessage(
  shipId: ObjectId,
  pilotId: ObjectId,
  originZoneId: SpaceZoneId,
  destinationZoneId: SpaceZoneId,
  travelTime: number,
  departurePosition: { x: number; y: number; z: number }
): HyperspaceJumpMessage {
  const now = Date.now();
  return {
    opcode: HyperspaceMessageOpcode.JumpEntered,
    shipId,
    pilotId,
    originZoneId,
    destinationZoneId,
    travelTime,
    departureTime: BigInt(now),
    arrivalTime: BigInt(now + travelTime),
    departureX: departurePosition.x,
    departureY: departurePosition.y,
    departureZ: departurePosition.z,
  };
}

/**
 * Create a HyperspaceArrivalMessage
 */
export function createArrivalMessage(
  shipId: ObjectId,
  pilotId: ObjectId,
  destinationZoneId: SpaceZoneId,
  arrivalPosition: { x: number; y: number; z: number },
  cooldownDuration: number
): HyperspaceArrivalMessage {
  return {
    opcode: HyperspaceMessageOpcode.Arrival,
    shipId,
    pilotId,
    destinationZoneId,
    arrivalX: arrivalPosition.x,
    arrivalY: arrivalPosition.y,
    arrivalZ: arrivalPosition.z,
    cooldownDuration,
  };
}

/**
 * Create a HyperspaceAbortMessage
 */
export function createAbortMessage(
  shipId: ObjectId,
  pilotId: ObjectId,
  resultCode: HyperspaceResultCode,
  message: string
): HyperspaceAbortMessage {
  return {
    opcode: HyperspaceMessageOpcode.JumpAborted,
    shipId,
    pilotId,
    resultCode,
    message,
  };
}

/**
 * Create an InterdictionWarningMessage
 */
export function createInterdictionWarningMessage(
  shipId: ObjectId,
  sourceId: ObjectId,
  sourceName: string,
  distance: number,
  strength: number,
  zoneId: SpaceZoneId
): InterdictionWarningMessage {
  return {
    opcode: HyperspaceMessageOpcode.InterdictionWarning,
    shipId,
    sourceId,
    sourceName,
    distance,
    strength,
    zoneId,
  };
}

/**
 * Create an EmergencyExitMessage
 */
export function createEmergencyExitMessage(
  shipId: ObjectId,
  pilotId: ObjectId,
  reason: EmergencyExitReason,
  exitZoneId: SpaceZoneId,
  exitPosition: { x: number; y: number; z: number },
  cooldownDuration: number,
  message: string
): EmergencyExitMessage {
  return {
    opcode: HyperspaceMessageOpcode.EmergencyExit,
    shipId,
    pilotId,
    reason,
    exitZoneId,
    exitX: exitPosition.x,
    exitY: exitPosition.y,
    exitZ: exitPosition.z,
    cooldownDuration,
    message,
  };
}

/**
 * Create a NavComputerUpdateMessage
 */
export function createNavComputerUpdateMessage(
  shipId: ObjectId,
  status: NavComputerStatus,
  destinationZoneId: SpaceZoneId | null,
  calculationProgress: number,
  routeValid: boolean,
  estimatedTravelTime: number = 0,
  fuelRequired: number = 0,
  requiredPilotLevel: number = 0,
  missingNavPoints: string[] = [],
  errorMessage: string = ''
): NavComputerUpdateMessage {
  return {
    opcode: HyperspaceMessageOpcode.NavComputerUpdate,
    shipId,
    status,
    destinationZoneId,
    calculationProgress,
    routeValid,
    estimatedTravelTime,
    fuelRequired,
    requiredPilotLevel,
    missingNavPoints,
    errorMessage,
  };
}

/**
 * Create a RoutesResponseMessage
 */
export function createRoutesResponseMessage(
  shipId: ObjectId,
  currentZoneId: SpaceZoneId,
  routes: RouteData[]
): RoutesResponseMessage {
  return {
    opcode: HyperspaceMessageOpcode.RoutesResponse,
    shipId,
    currentZoneId,
    routes,
    totalRoutes: routes.length,
  };
}

/**
 * Create a ProgressUpdateMessage
 */
export function createProgressUpdateMessage(
  shipId: ObjectId,
  state: HyperspaceState,
  progress: number,
  timeRemaining: number,
  destinationZoneId: SpaceZoneId
): ProgressUpdateMessage {
  return {
    opcode: HyperspaceMessageOpcode.ProgressUpdate,
    shipId,
    state,
    progress,
    timeRemaining,
    destinationZoneId,
  };
}

/**
 * Create a StatusResponseMessage
 */
export function createStatusResponseMessage(
  shipId: ObjectId,
  state: HyperspaceState,
  hasHyperdrive: boolean,
  hyperdriveEfficiency: number,
  currentFuel: number,
  maxFuel: number,
  cooldownRemaining: number,
  chargeRemaining: number,
  travelTimeRemaining: number,
  destinationZoneId: SpaceZoneId | null,
  isInterdicted: boolean
): StatusResponseMessage {
  return {
    opcode: HyperspaceMessageOpcode.StatusResponse,
    shipId,
    state,
    hasHyperdrive,
    hyperdriveEfficiency,
    currentFuel,
    maxFuel,
    cooldownRemaining,
    chargeRemaining,
    travelTimeRemaining,
    destinationZoneId,
    isInterdicted,
  };
}

/**
 * Get human-readable description for hyperspace result code
 */
export function getHyperspaceResultDescription(code: HyperspaceResultCode): string {
  switch (code) {
    case HyperspaceResultCode.SUCCESS:
      return 'Jump successful.';
    case HyperspaceResultCode.NO_HYPERDRIVE:
      return 'No hyperdrive installed.';
    case HyperspaceResultCode.HYPERDRIVE_DAMAGED:
      return 'Hyperdrive is damaged.';
    case HyperspaceResultCode.INSUFFICIENT_FUEL:
      return 'Insufficient fuel for this jump.';
    case HyperspaceResultCode.NO_ROUTE:
      return 'No hyperspace route available to destination.';
    case HyperspaceResultCode.INSUFFICIENT_PILOT_LEVEL:
      return 'Pilot certification level too low for this route.';
    case HyperspaceResultCode.MISSING_NAV_POINTS:
      return 'Missing required navigation data.';
    case HyperspaceResultCode.IN_COMBAT:
      return 'Cannot enter hyperspace while in combat.';
    case HyperspaceResultCode.DOCKED:
      return 'Cannot enter hyperspace while docked.';
    case HyperspaceResultCode.ON_COOLDOWN:
      return 'Hyperdrive is still cooling down.';
    case HyperspaceResultCode.ALREADY_IN_HYPERSPACE:
      return 'Ship is already in hyperspace.';
    case HyperspaceResultCode.INTERDICTED:
      return 'Gravity well preventing hyperspace entry.';
    case HyperspaceResultCode.SHIP_DISABLED:
      return 'Ship systems are disabled.';
    case HyperspaceResultCode.INVALID_DESTINATION:
      return 'Invalid destination.';
    case HyperspaceResultCode.NAV_COMPUTER_OFFLINE:
      return 'Navigation computer is offline.';
    case HyperspaceResultCode.CANCELLED:
      return 'Jump cancelled.';
    case HyperspaceResultCode.EMERGENCY_EXIT:
      return 'Emergency hyperspace exit.';
    case HyperspaceResultCode.SERVER_ERROR:
    default:
      return 'Server error occurred.';
  }
}

/**
 * Get human-readable description for emergency exit reason
 */
export function getEmergencyExitDescription(reason: EmergencyExitReason): string {
  switch (reason) {
    case EmergencyExitReason.INTERDICTION:
      return 'Pulled from hyperspace by an interdiction field!';
    case EmergencyExitReason.DAMAGE:
      return 'Critical damage forced emergency hyperspace exit!';
    case EmergencyExitReason.MANUAL:
      return 'Hyperspace jump manually aborted.';
    case EmergencyExitReason.FUEL_EMPTY:
      return 'Fuel depleted during hyperspace travel!';
    case EmergencyExitReason.COLLISION:
      return 'Mass shadow detected - emergency exit!';
    default:
      return 'Emergency hyperspace exit.';
  }
}
