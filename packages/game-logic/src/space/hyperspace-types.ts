/**
 * Hyperspace Travel Types
 * Type definitions for Jump to Lightspeed (JTL) hyperspace travel system
 *
 * Hyperspace travel in SWG involves:
 * - Nav computer route calculation
 * - Hyperdrive charging sequence
 * - Travel through hyperspace
 * - Arrival at destination
 * - Interdiction field detection
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import type { SpaceZoneId, HyperspaceRoute } from '@swg/world/src/space/space-types.js';

// ============================================
// Hyperspace State Enums
// ============================================

/**
 * States a ship can be in during hyperspace travel
 */
export enum HyperspaceState {
  /** Not engaged in hyperspace travel */
  IDLE = 'idle',
  /** Hyperdrive is charging for jump */
  CHARGING = 'charging',
  /** Currently traveling through hyperspace */
  IN_HYPERSPACE = 'in_hyperspace',
  /** Exiting hyperspace at destination */
  EXITING = 'exiting',
  /** Hyperdrive on cooldown after use */
  COOLDOWN = 'cooldown',
}

/**
 * Reasons a ship may be forced to exit hyperspace early
 */
export enum EmergencyExitReason {
  /** Pulled out by gravity well generator (Interdictor) */
  INTERDICTION = 'interdiction',
  /** Ship took critical damage */
  DAMAGE = 'damage',
  /** Pilot manually aborted the jump */
  MANUAL = 'manual',
  /** Ran out of fuel mid-jump */
  FUEL_EMPTY = 'fuel_empty',
  /** Collision detection (asteroid field, etc.) */
  COLLISION = 'collision',
}

/**
 * Status of the navigation computer
 */
export enum NavComputerStatus {
  /** Nav computer is offline/damaged */
  OFFLINE = 'offline',
  /** Currently calculating route */
  CALCULATING = 'calculating',
  /** Route calculated and ready */
  READY = 'ready',
  /** Nav computer disabled by ion damage */
  DISABLED = 'disabled',
}

// ============================================
// Hyperspace Jump Interface
// ============================================

/**
 * Represents an active or pending hyperspace jump
 */
export interface HyperspaceJump {
  /** Ship making the jump */
  shipId: ObjectId;
  /** Origin space zone */
  originZone: SpaceZoneId;
  /** Destination space zone */
  destinationZone: SpaceZoneId;
  /** Unix timestamp when jump began charging */
  chargeStartTime: number;
  /** Unix timestamp when ship entered hyperspace */
  departureTime: number;
  /** Unix timestamp when ship will arrive */
  arrivalTime: number;
  /** The hyperspace route being used */
  route: HyperspaceRoute;
  /** Current state of the jump */
  state: HyperspaceState;
  /** Position where ship entered hyperspace */
  departurePosition: Vector3;
  /** Target position in destination zone */
  arrivalPosition: Vector3;
  /** Fuel consumed for this jump */
  fuelConsumed: number;
}

/**
 * Configuration for a pending jump request
 */
export interface JumpRequest {
  /** Ship requesting the jump */
  shipId: ObjectId;
  /** Requested destination zone */
  destinationZoneId: SpaceZoneId;
  /** Unix timestamp of the request */
  requestTime: number;
  /** Pilot ID making the request */
  pilotId: ObjectId;
}

// ============================================
// Interdiction Field Interface
// ============================================

/**
 * Represents a gravity well/interdiction field that prevents hyperspace travel
 */
export interface InterdictionField {
  /** Center position of the interdiction field */
  position: Vector3;
  /** Radius of the interdiction field in meters */
  radius: number;
  /** Strength of the field (affects pullout chance) */
  strength: number;
  /** Object ID of the source (Interdictor ship, station, etc.) */
  sourceId: ObjectId;
  /** Zone this interdiction field is in */
  zoneId: SpaceZoneId;
  /** Whether the field is currently active */
  active: boolean;
}

// ============================================
// Jump Status and Results
// ============================================

/**
 * Result codes for hyperspace operations
 */
export enum HyperspaceResultCode {
  /** Operation successful */
  SUCCESS = 0,
  /** No hyperdrive installed */
  NO_HYPERDRIVE = 1,
  /** Hyperdrive is damaged */
  HYPERDRIVE_DAMAGED = 2,
  /** Insufficient fuel */
  INSUFFICIENT_FUEL = 3,
  /** Route not available from current location */
  NO_ROUTE = 4,
  /** Pilot lacks required certification */
  INSUFFICIENT_PILOT_LEVEL = 5,
  /** Missing required nav points */
  MISSING_NAV_POINTS = 6,
  /** Ship is in combat */
  IN_COMBAT = 7,
  /** Ship is docked */
  DOCKED = 8,
  /** Hyperdrive is on cooldown */
  ON_COOLDOWN = 9,
  /** Already in hyperspace */
  ALREADY_IN_HYPERSPACE = 10,
  /** Interdicted - cannot jump */
  INTERDICTED = 11,
  /** Ship is disabled */
  SHIP_DISABLED = 12,
  /** Invalid destination */
  INVALID_DESTINATION = 13,
  /** Nav computer offline */
  NAV_COMPUTER_OFFLINE = 14,
  /** Jump was cancelled */
  CANCELLED = 15,
  /** Emergency exit occurred */
  EMERGENCY_EXIT = 16,
  /** Server error */
  SERVER_ERROR = 99,
}

/**
 * Status information for a ship's hyperspace capabilities
 */
export interface HyperspaceStatus {
  /** Current hyperspace state */
  state: HyperspaceState;
  /** Whether ship has a functional hyperdrive */
  hasHyperdrive: boolean;
  /** Hyperdrive efficiency (0-1, affects charge time) */
  hyperdriveEfficiency: number;
  /** Current fuel level */
  currentFuel: number;
  /** Maximum fuel capacity */
  maxFuel: number;
  /** Cooldown remaining in milliseconds (0 if ready) */
  cooldownRemaining: number;
  /** Time remaining in charge sequence (ms) */
  chargeRemaining: number;
  /** Time remaining in hyperspace (ms) */
  travelTimeRemaining: number;
  /** Current destination (if jumping) */
  destination: SpaceZoneId | null;
  /** Whether ship is currently interdicted */
  isInterdicted: boolean;
}

// ============================================
// Hyperspace Configuration
// ============================================

/**
 * Configuration for hyperspace system behavior
 */
export interface HyperspaceConfig {
  /** Base time to charge hyperdrive (ms) */
  baseChargeTime: number;
  /** Minimum charge time regardless of bonuses (ms) */
  minChargeTime: number;
  /** Cooldown after completing a jump (ms) */
  cooldownTime: number;
  /** Combat lockout duration before jumping (ms) */
  combatLockout: number;
  /** Base speed multiplier for travel time calculation */
  baseTravelSpeed: number;
  /** Emergency exit cooldown multiplier */
  emergencyExitCooldownMultiplier: number;
  /** Chance to be pulled out by interdiction (0-1 base) */
  baseInterdictionChance: number;
  /** Distance at which interdiction check occurs */
  interdictionCheckDistance: number;
  /** Whether to enable logging */
  enableLogging: boolean;
}

/**
 * Default hyperspace configuration
 */
export const DEFAULT_HYPERSPACE_CONFIG: HyperspaceConfig = {
  baseChargeTime: 10000, // 10 seconds
  minChargeTime: 5000, // 5 seconds minimum
  cooldownTime: 30000, // 30 seconds
  combatLockout: 10000, // 10 seconds out of combat required
  baseTravelSpeed: 1.0,
  emergencyExitCooldownMultiplier: 2.0,
  baseInterdictionChance: 0.8,
  interdictionCheckDistance: 5000,
  enableLogging: false,
};

// ============================================
// Factory Functions
// ============================================

/**
 * Create a new HyperspaceJump
 */
export function createHyperspaceJump(
  shipId: ObjectId,
  originZone: SpaceZoneId,
  destinationZone: SpaceZoneId,
  route: HyperspaceRoute,
  departurePosition: Vector3,
  arrivalPosition: Vector3
): HyperspaceJump {
  const now = Date.now();
  return {
    shipId,
    originZone,
    destinationZone,
    chargeStartTime: now,
    departureTime: 0,
    arrivalTime: 0,
    route,
    state: HyperspaceState.IDLE,
    departurePosition,
    arrivalPosition,
    fuelConsumed: route.fuelCost,
  };
}

/**
 * Create a new InterdictionField
 */
export function createInterdictionField(
  position: Vector3,
  radius: number,
  strength: number,
  sourceId: ObjectId,
  zoneId: SpaceZoneId
): InterdictionField {
  return {
    position,
    radius,
    strength,
    sourceId,
    zoneId,
    active: true,
  };
}

/**
 * Create a default HyperspaceStatus
 */
export function createDefaultHyperspaceStatus(): HyperspaceStatus {
  return {
    state: HyperspaceState.IDLE,
    hasHyperdrive: false,
    hyperdriveEfficiency: 0,
    currentFuel: 0,
    maxFuel: 0,
    cooldownRemaining: 0,
    chargeRemaining: 0,
    travelTimeRemaining: 0,
    destination: null,
    isInterdicted: false,
  };
}

// ============================================
// Type Guards
// ============================================

/**
 * Check if a ship can initiate hyperspace travel
 */
export function canInitiateHyperspace(status: HyperspaceStatus): boolean {
  return (
    status.hasHyperdrive &&
    status.hyperdriveEfficiency > 0 &&
    status.state === HyperspaceState.IDLE &&
    status.cooldownRemaining === 0 &&
    !status.isInterdicted
  );
}

/**
 * Check if a ship is actively in hyperspace
 */
export function isInHyperspace(state: HyperspaceState): boolean {
  return state === HyperspaceState.IN_HYPERSPACE || state === HyperspaceState.EXITING;
}

/**
 * Check if hyperspace state is interruptible
 */
export function isInterruptibleState(state: HyperspaceState): boolean {
  return state === HyperspaceState.CHARGING;
}

/**
 * Get human-readable name for hyperspace state
 */
export function getHyperspaceStateName(state: HyperspaceState): string {
  switch (state) {
    case HyperspaceState.IDLE:
      return 'Ready';
    case HyperspaceState.CHARGING:
      return 'Charging Hyperdrive';
    case HyperspaceState.IN_HYPERSPACE:
      return 'In Hyperspace';
    case HyperspaceState.EXITING:
      return 'Exiting Hyperspace';
    case HyperspaceState.COOLDOWN:
      return 'Cooldown';
    default:
      return 'Unknown';
  }
}

/**
 * Get human-readable message for result code
 */
export function getHyperspaceResultMessage(code: HyperspaceResultCode): string {
  switch (code) {
    case HyperspaceResultCode.SUCCESS:
      return 'Hyperspace jump successful.';
    case HyperspaceResultCode.NO_HYPERDRIVE:
      return 'No hyperdrive installed.';
    case HyperspaceResultCode.HYPERDRIVE_DAMAGED:
      return 'Hyperdrive is damaged.';
    case HyperspaceResultCode.INSUFFICIENT_FUEL:
      return 'Insufficient fuel for jump.';
    case HyperspaceResultCode.NO_ROUTE:
      return 'No route available to destination.';
    case HyperspaceResultCode.INSUFFICIENT_PILOT_LEVEL:
      return 'Pilot certification insufficient for this route.';
    case HyperspaceResultCode.MISSING_NAV_POINTS:
      return 'Missing required navigation data.';
    case HyperspaceResultCode.IN_COMBAT:
      return 'Cannot jump while in combat.';
    case HyperspaceResultCode.DOCKED:
      return 'Cannot jump while docked.';
    case HyperspaceResultCode.ON_COOLDOWN:
      return 'Hyperdrive is cooling down.';
    case HyperspaceResultCode.ALREADY_IN_HYPERSPACE:
      return 'Already in hyperspace.';
    case HyperspaceResultCode.INTERDICTED:
      return 'Gravity well preventing jump.';
    case HyperspaceResultCode.SHIP_DISABLED:
      return 'Ship is disabled.';
    case HyperspaceResultCode.INVALID_DESTINATION:
      return 'Invalid destination.';
    case HyperspaceResultCode.NAV_COMPUTER_OFFLINE:
      return 'Navigation computer offline.';
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
 * Get human-readable message for emergency exit reason
 */
export function getEmergencyExitMessage(reason: EmergencyExitReason): string {
  switch (reason) {
    case EmergencyExitReason.INTERDICTION:
      return 'Pulled from hyperspace by gravity well!';
    case EmergencyExitReason.DAMAGE:
      return 'Critical damage - emergency hyperspace exit!';
    case EmergencyExitReason.MANUAL:
      return 'Hyperspace jump aborted.';
    case EmergencyExitReason.FUEL_EMPTY:
      return 'Fuel depleted - emergency exit!';
    case EmergencyExitReason.COLLISION:
      return 'Collision detected - emergency exit!';
    default:
      return 'Emergency hyperspace exit.';
  }
}
