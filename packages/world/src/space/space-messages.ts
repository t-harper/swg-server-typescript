/**
 * @swg/world - Space Zone Network Messages
 * Message definitions for JTL space zone communication
 */

import type { Vector3 } from '@swg/shared-types';
import type { SpaceZoneId, DockingStatus, SpaceFaction, NebulaEffectType } from './space-types.js';

/**
 * Base interface for all space zone messages.
 */
export interface SpaceNetworkMessage {
  /** Message type identifier */
  readonly messageType: string;
  /** Timestamp when message was created */
  readonly timestamp: number;
}

/**
 * Message sent when a player enters a space zone.
 */
export interface EnterSpaceZoneMessage extends SpaceNetworkMessage {
  readonly messageType: 'EnterSpaceZone';
  /** The space zone being entered */
  zoneId: SpaceZoneId;
  /** Ship object ID */
  shipId: bigint;
  /** Pilot/player object ID */
  pilotId: bigint;
  /** Entry position in the zone */
  position: Vector3;
  /** Entry velocity */
  velocity: Vector3;
  /** Entry orientation (yaw, pitch, roll in radians) */
  orientation: { yaw: number; pitch: number; roll: number };
  /** Source zone if transferring (undefined if launching from ground) */
  sourceZone?: SpaceZoneId;
  /** Source station ID if launching from station */
  sourceStationId?: string;
}

/**
 * Message sent when a player leaves a space zone.
 */
export interface LeaveSpaceZoneMessage extends SpaceNetworkMessage {
  readonly messageType: 'LeaveSpaceZone';
  /** The space zone being left */
  zoneId: SpaceZoneId;
  /** Ship object ID */
  shipId: bigint;
  /** Pilot/player object ID */
  pilotId: bigint;
  /** Reason for leaving */
  reason: LeaveSpaceReason;
  /** Destination zone if transferring */
  destinationZone?: SpaceZoneId;
  /** Destination station if docking */
  destinationStationId?: string;
}

/**
 * Reasons for leaving a space zone.
 */
export enum LeaveSpaceReason {
  /** Jumped to hyperspace */
  HYPERSPACE = 'hyperspace',
  /** Docked at a station */
  DOCKED = 'docked',
  /** Ship was destroyed */
  DESTROYED = 'destroyed',
  /** Player logged out */
  LOGOUT = 'logout',
  /** Player disconnected */
  DISCONNECT = 'disconnect',
  /** Admin command */
  ADMIN = 'admin',
  /** Landed on ground planet */
  LANDED = 'landed',
}

/**
 * Message sent when a player requests to enter hyperspace.
 */
export interface HyperspaceRequestMessage extends SpaceNetworkMessage {
  readonly messageType: 'HyperspaceRequest';
  /** Ship object ID */
  shipId: bigint;
  /** Pilot/player object ID */
  pilotId: bigint;
  /** Current zone */
  currentZone: SpaceZoneId;
  /** Destination zone */
  destinationZone: SpaceZoneId;
  /** Navigation computer accuracy (affects travel time) */
  navComputerLevel: number;
}

/**
 * Response to a hyperspace request.
 */
export interface HyperspaceResponseMessage extends SpaceNetworkMessage {
  readonly messageType: 'HyperspaceResponse';
  /** Ship object ID */
  shipId: bigint;
  /** Whether the request was approved */
  approved: boolean;
  /** Reason if denied */
  denyReason?: HyperspaceDenyReason;
  /** Travel time in seconds if approved */
  travelTime?: number;
  /** Fuel cost if approved */
  fuelCost?: number;
}

/**
 * Reasons hyperspace can be denied.
 */
export enum HyperspaceDenyReason {
  /** No route exists between zones */
  NO_ROUTE = 'no_route',
  /** Pilot level too low for route */
  INSUFFICIENT_LEVEL = 'insufficient_level',
  /** Not enough fuel */
  INSUFFICIENT_FUEL = 'insufficient_fuel',
  /** Ship is damaged and cannot jump */
  SHIP_DAMAGED = 'ship_damaged',
  /** Ship is in combat */
  IN_COMBAT = 'in_combat',
  /** Mass too high (cargo/passengers) */
  MASS_TOO_HIGH = 'mass_too_high',
  /** Hyperdrive is disabled */
  HYPERDRIVE_DISABLED = 'hyperdrive_disabled',
  /** Inside a nebula that blocks hyperspace */
  BLOCKED_BY_NEBULA = 'blocked_by_nebula',
  /** Destination zone is offline */
  DESTINATION_OFFLINE = 'destination_offline',
}

/**
 * Message sent when hyperspace jump begins.
 */
export interface HyperspaceBeginMessage extends SpaceNetworkMessage {
  readonly messageType: 'HyperspaceBegin';
  /** Ship object ID */
  shipId: bigint;
  /** Pilot/player object ID */
  pilotId: bigint;
  /** Origin zone */
  originZone: SpaceZoneId;
  /** Destination zone */
  destinationZone: SpaceZoneId;
  /** Total travel time in seconds */
  travelTime: number;
  /** Estimated arrival timestamp */
  estimatedArrival: number;
}

/**
 * Message sent when hyperspace jump completes.
 */
export interface HyperspaceCompleteMessage extends SpaceNetworkMessage {
  readonly messageType: 'HyperspaceComplete';
  /** Ship object ID */
  shipId: bigint;
  /** Pilot/player object ID */
  pilotId: bigint;
  /** Arrival zone */
  arrivalZone: SpaceZoneId;
  /** Arrival position */
  arrivalPosition: Vector3;
  /** Whether an interdiction occurred */
  interdicted: boolean;
  /** Interdiction position if pulled out early */
  interdictionPosition?: Vector3;
}

/**
 * Message sent when a player requests to dock at a station.
 */
export interface DockingRequestMessage extends SpaceNetworkMessage {
  readonly messageType: 'DockingRequest';
  /** Ship object ID */
  shipId: bigint;
  /** Pilot/player object ID */
  pilotId: bigint;
  /** Station ID to dock at */
  stationId: string;
  /** Current ship position */
  shipPosition: Vector3;
  /** Ship faction */
  shipFaction: SpaceFaction;
}

/**
 * Response to a docking request.
 */
export interface DockingResponseMessage extends SpaceNetworkMessage {
  readonly messageType: 'DockingResponse';
  /** Ship object ID */
  shipId: bigint;
  /** Station ID */
  stationId: string;
  /** Docking status result */
  status: DockingStatus;
  /** Assigned docking port if approved */
  assignedPort?: number;
  /** Docking approach vector if approved */
  approachVector?: Vector3;
}

/**
 * Message sent when docking permission is granted.
 */
export interface DockingGrantedMessage extends SpaceNetworkMessage {
  readonly messageType: 'DockingGranted';
  /** Ship object ID */
  shipId: bigint;
  /** Pilot/player object ID */
  pilotId: bigint;
  /** Station ID */
  stationId: string;
  /** Station name */
  stationName: string;
  /** Assigned docking port */
  portNumber: number;
  /** Time limit to complete docking (seconds) */
  dockingTimeout: number;
  /** Docking approach position */
  approachPosition: Vector3;
  /** Docking bay position */
  bayPosition: Vector3;
}

/**
 * Message sent when docking is complete.
 */
export interface DockingCompleteMessage extends SpaceNetworkMessage {
  readonly messageType: 'DockingComplete';
  /** Ship object ID */
  shipId: bigint;
  /** Pilot/player object ID */
  pilotId: bigint;
  /** Station ID */
  stationId: string;
  /** Services available at this station */
  availableServices: string[];
  /** Ground zone connection if available */
  groundZoneConnection?: string;
}

/**
 * Message sent when a player requests to undock from a station.
 */
export interface UndockingRequestMessage extends SpaceNetworkMessage {
  readonly messageType: 'UndockingRequest';
  /** Ship object ID */
  shipId: bigint;
  /** Pilot/player object ID */
  pilotId: bigint;
  /** Station ID to undock from */
  stationId: string;
}

/**
 * Message sent when undocking is complete.
 */
export interface UndockingCompleteMessage extends SpaceNetworkMessage {
  readonly messageType: 'UndockingComplete';
  /** Ship object ID */
  shipId: bigint;
  /** Pilot/player object ID */
  pilotId: bigint;
  /** Station ID undocked from */
  stationId: string;
  /** Launch position outside station */
  launchPosition: Vector3;
  /** Launch velocity */
  launchVelocity: Vector3;
}

/**
 * Message for ship position/state updates (broadcast frequently).
 */
export interface ShipUpdateMessage extends SpaceNetworkMessage {
  readonly messageType: 'ShipUpdate';
  /** Ship object ID */
  shipId: bigint;
  /** Current position */
  position: Vector3;
  /** Current velocity */
  velocity: Vector3;
  /** Current orientation */
  yaw: number;
  pitch: number;
  roll: number;
  /** Current speed */
  speed: number;
  /** Throttle position (0.0 - 1.0) */
  throttle: number;
  /** Is afterburner active */
  afterburnerActive: boolean;
}

/**
 * Message for ship damage events.
 */
export interface ShipDamageMessage extends SpaceNetworkMessage {
  readonly messageType: 'ShipDamage';
  /** Ship that took damage */
  targetShipId: bigint;
  /** Source of damage (ship ID or environment) */
  sourceId?: bigint;
  /** Damage type */
  damageType: DamageType;
  /** Amount of damage dealt */
  damageAmount: number;
  /** New hull integrity after damage */
  newHullIntegrity: number;
  /** New shield strength after damage */
  newShieldStrength: number;
  /** Hit position on ship */
  hitPosition?: Vector3;
}

/**
 * Types of damage in space combat.
 */
export enum DamageType {
  /** Laser/blaster damage */
  ENERGY = 'energy',
  /** Missile/torpedo damage */
  MISSILE = 'missile',
  /** Collision damage (asteroid, ship) */
  COLLISION = 'collision',
  /** Environmental damage (nebula, radiation) */
  ENVIRONMENTAL = 'environmental',
  /** Ion damage (affects systems) */
  ION = 'ion',
}

/**
 * Message for ship destruction.
 */
export interface ShipDestroyedMessage extends SpaceNetworkMessage {
  readonly messageType: 'ShipDestroyed';
  /** Ship that was destroyed */
  shipId: bigint;
  /** Pilot/player ID */
  pilotId: bigint;
  /** Destroyer ID if applicable */
  destroyerId?: bigint;
  /** Position where destroyed */
  position: Vector3;
  /** Whether an escape pod was launched */
  escapePodLaunched: boolean;
  /** Escape pod ID if launched */
  escapePodId?: bigint;
}

/**
 * Message for nebula effect notifications.
 */
export interface NebulaEffectMessage extends SpaceNetworkMessage {
  readonly messageType: 'NebulaEffect';
  /** Ship affected */
  shipId: bigint;
  /** Nebula ID */
  nebulaId: string;
  /** Effect type */
  effectType: NebulaEffectType;
  /** Effect intensity (0.0 - 1.0) */
  intensity: number;
  /** Whether entering or leaving nebula */
  entering: boolean;
}

/**
 * Message for asteroid collision warning.
 */
export interface AsteroidWarningMessage extends SpaceNetworkMessage {
  readonly messageType: 'AsteroidWarning';
  /** Ship being warned */
  shipId: bigint;
  /** Asteroid field ID */
  asteroidFieldId: string;
  /** Distance to nearest asteroid */
  distanceToNearest: number;
  /** Collision is imminent */
  collisionImminent: boolean;
}

/**
 * Message for radar/sensor contacts.
 */
export interface RadarContactMessage extends SpaceNetworkMessage {
  readonly messageType: 'RadarContact';
  /** Ship receiving the contact */
  receiverShipId: bigint;
  /** Detected contacts */
  contacts: RadarContact[];
  /** Sensor range used */
  sensorRange: number;
  /** Any sensor reduction applied */
  sensorReduction: number;
}

/**
 * Single radar contact data.
 */
export interface RadarContact {
  /** Contact object ID */
  objectId: bigint;
  /** Contact type */
  contactType: RadarContactType;
  /** Position (may be inaccurate if jammed) */
  position: Vector3;
  /** Faction if identifiable */
  faction?: SpaceFaction;
  /** Whether contact is hostile */
  hostile: boolean;
  /** Signal strength (0.0 - 1.0) */
  signalStrength: number;
  /** Whether this is a new contact */
  newContact: boolean;
}

/**
 * Types of radar contacts.
 */
export enum RadarContactType {
  /** Player ship */
  PLAYER_SHIP = 'player_ship',
  /** NPC ship */
  NPC_SHIP = 'npc_ship',
  /** Space station */
  STATION = 'station',
  /** Asteroid */
  ASTEROID = 'asteroid',
  /** Debris */
  DEBRIS = 'debris',
  /** Missile/torpedo */
  ORDNANCE = 'ordnance',
  /** Escape pod */
  ESCAPE_POD = 'escape_pod',
  /** Unknown contact */
  UNKNOWN = 'unknown',
}

/**
 * Union type of all space network messages.
 */
export type SpaceMessage =
  | EnterSpaceZoneMessage
  | LeaveSpaceZoneMessage
  | HyperspaceRequestMessage
  | HyperspaceResponseMessage
  | HyperspaceBeginMessage
  | HyperspaceCompleteMessage
  | DockingRequestMessage
  | DockingResponseMessage
  | DockingGrantedMessage
  | DockingCompleteMessage
  | UndockingRequestMessage
  | UndockingCompleteMessage
  | ShipUpdateMessage
  | ShipDamageMessage
  | ShipDestroyedMessage
  | NebulaEffectMessage
  | AsteroidWarningMessage
  | RadarContactMessage;

/**
 * Factory function to create an EnterSpaceZoneMessage.
 */
export function createEnterSpaceZoneMessage(
  zoneId: SpaceZoneId,
  shipId: bigint,
  pilotId: bigint,
  position: Vector3,
  velocity: Vector3 = { x: 0, y: 0, z: 0 },
  orientation: { yaw: number; pitch: number; roll: number } = { yaw: 0, pitch: 0, roll: 0 },
  sourceZone?: SpaceZoneId,
  sourceStationId?: string
): EnterSpaceZoneMessage {
  return {
    messageType: 'EnterSpaceZone',
    timestamp: Date.now(),
    zoneId,
    shipId,
    pilotId,
    position,
    velocity,
    orientation,
    sourceZone,
    sourceStationId,
  };
}

/**
 * Factory function to create a LeaveSpaceZoneMessage.
 */
export function createLeaveSpaceZoneMessage(
  zoneId: SpaceZoneId,
  shipId: bigint,
  pilotId: bigint,
  reason: LeaveSpaceReason,
  destinationZone?: SpaceZoneId,
  destinationStationId?: string
): LeaveSpaceZoneMessage {
  return {
    messageType: 'LeaveSpaceZone',
    timestamp: Date.now(),
    zoneId,
    shipId,
    pilotId,
    reason,
    destinationZone,
    destinationStationId,
  };
}

/**
 * Factory function to create a HyperspaceRequestMessage.
 */
export function createHyperspaceRequestMessage(
  shipId: bigint,
  pilotId: bigint,
  currentZone: SpaceZoneId,
  destinationZone: SpaceZoneId,
  navComputerLevel: number = 1
): HyperspaceRequestMessage {
  return {
    messageType: 'HyperspaceRequest',
    timestamp: Date.now(),
    shipId,
    pilotId,
    currentZone,
    destinationZone,
    navComputerLevel,
  };
}

/**
 * Factory function to create a HyperspaceBeginMessage.
 */
export function createHyperspaceBeginMessage(
  shipId: bigint,
  pilotId: bigint,
  originZone: SpaceZoneId,
  destinationZone: SpaceZoneId,
  travelTime: number
): HyperspaceBeginMessage {
  return {
    messageType: 'HyperspaceBegin',
    timestamp: Date.now(),
    shipId,
    pilotId,
    originZone,
    destinationZone,
    travelTime,
    estimatedArrival: Date.now() + travelTime * 1000,
  };
}

/**
 * Factory function to create a DockingRequestMessage.
 */
export function createDockingRequestMessage(
  shipId: bigint,
  pilotId: bigint,
  stationId: string,
  shipPosition: Vector3,
  shipFaction: SpaceFaction
): DockingRequestMessage {
  return {
    messageType: 'DockingRequest',
    timestamp: Date.now(),
    shipId,
    pilotId,
    stationId,
    shipPosition,
    shipFaction,
  };
}

/**
 * Factory function to create a DockingGrantedMessage.
 */
export function createDockingGrantedMessage(
  shipId: bigint,
  pilotId: bigint,
  stationId: string,
  stationName: string,
  portNumber: number,
  approachPosition: Vector3,
  bayPosition: Vector3,
  dockingTimeout: number = 120
): DockingGrantedMessage {
  return {
    messageType: 'DockingGranted',
    timestamp: Date.now(),
    shipId,
    pilotId,
    stationId,
    stationName,
    portNumber,
    dockingTimeout,
    approachPosition,
    bayPosition,
  };
}

/**
 * Factory function to create a ShipUpdateMessage.
 */
export function createShipUpdateMessage(
  shipId: bigint,
  position: Vector3,
  velocity: Vector3,
  yaw: number,
  pitch: number,
  roll: number,
  speed: number,
  throttle: number,
  afterburnerActive: boolean = false
): ShipUpdateMessage {
  return {
    messageType: 'ShipUpdate',
    timestamp: Date.now(),
    shipId,
    position,
    velocity,
    yaw,
    pitch,
    roll,
    speed,
    throttle,
    afterburnerActive,
  };
}

/**
 * Factory function to create a ShipDamageMessage.
 */
export function createShipDamageMessage(
  targetShipId: bigint,
  damageType: DamageType,
  damageAmount: number,
  newHullIntegrity: number,
  newShieldStrength: number,
  sourceId?: bigint,
  hitPosition?: Vector3
): ShipDamageMessage {
  return {
    messageType: 'ShipDamage',
    timestamp: Date.now(),
    targetShipId,
    sourceId,
    damageType,
    damageAmount,
    newHullIntegrity,
    newShieldStrength,
    hitPosition,
  };
}

/**
 * Factory function to create a ShipDestroyedMessage.
 */
export function createShipDestroyedMessage(
  shipId: bigint,
  pilotId: bigint,
  position: Vector3,
  escapePodLaunched: boolean,
  destroyerId?: bigint,
  escapePodId?: bigint
): ShipDestroyedMessage {
  return {
    messageType: 'ShipDestroyed',
    timestamp: Date.now(),
    shipId,
    pilotId,
    destroyerId,
    position,
    escapePodLaunched,
    escapePodId,
  };
}

/**
 * Factory function to create a RadarContactMessage.
 */
export function createRadarContactMessage(
  receiverShipId: bigint,
  contacts: RadarContact[],
  sensorRange: number,
  sensorReduction: number = 0
): RadarContactMessage {
  return {
    messageType: 'RadarContact',
    timestamp: Date.now(),
    receiverShipId,
    contacts,
    sensorRange,
    sensorReduction,
  };
}
