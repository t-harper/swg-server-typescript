/**
 * @swg/world - Space Zone Types
 * Type definitions for Jump to Lightspeed (JTL) space zones
 */

import type { Vector3 } from '@swg/shared-types';

/**
 * Space zone identifiers for all JTL space regions.
 */
export enum SpaceZoneId {
  /** Tatooine orbital space */
  SPACE_TATOOINE = 'space_tatooine',
  /** Naboo orbital space */
  SPACE_NABOO = 'space_naboo',
  /** Corellia orbital space */
  SPACE_CORELLIA = 'space_corellia',
  /** Dantooine orbital space */
  SPACE_DANTOOINE = 'space_dantooine',
  /** Dathomir orbital space */
  SPACE_DATHOMIR = 'space_dathomir',
  /** Endor orbital space */
  SPACE_ENDOR = 'space_endor',
  /** Lok orbital space */
  SPACE_LOK = 'space_lok',
  /** Talus orbital space */
  SPACE_TALUS = 'space_talus',
  /** Yavin orbital space */
  SPACE_YAVIN = 'space_yavin4',
  /** Kessel system - dangerous smuggler route */
  KESSEL = 'space_kessel',
  /** Deep space - uncharted regions */
  DEEP_SPACE = 'space_deep',
}

/**
 * Sector security classification affecting PvP rules and NPC spawns.
 */
export enum SpaceSectorType {
  /** Safe sectors near space stations - no PvP, minimal hostile NPCs */
  SAFE = 'safe',
  /** Contested sectors - faction PvP enabled, moderate hostile NPCs */
  CONTESTED = 'contested',
  /** Dangerous sectors - open PvP, heavy hostile NPC presence */
  DANGEROUS = 'dangerous',
  /** Restricted sectors - special access required (quest/faction) */
  RESTRICTED = 'restricted',
}

/**
 * Faction types for space entities.
 */
export enum SpaceFaction {
  /** Galactic Empire */
  IMPERIAL = 'imperial',
  /** Rebel Alliance */
  REBEL = 'rebel',
  /** Neutral/Independent */
  NEUTRAL = 'neutral',
  /** Pirates and criminals */
  PIRATE = 'pirate',
  /** Black Sun crime syndicate */
  BLACK_SUN = 'black_sun',
  /** Hutt Cartel */
  HUTT = 'hutt',
}

/**
 * Nebula effect types that apply different debuffs/effects to ships.
 */
export enum NebulaEffectType {
  /** Reduces sensor range */
  SENSOR_JAMMING = 'sensor_jamming',
  /** Damages shields over time */
  CORROSIVE = 'corrosive',
  /** Damages hull over time */
  RADIATION = 'radiation',
  /** Reduces weapon accuracy */
  STATIC_INTERFERENCE = 'static_interference',
  /** Reduces engine power */
  ION_STORM = 'ion_storm',
  /** Visual only, no gameplay effect */
  COSMETIC = 'cosmetic',
}

/**
 * Services available at space stations.
 */
export enum StationService {
  /** Repair ship hull and components */
  REPAIR = 'repair',
  /** Refuel ship reactor */
  REFUEL = 'refuel',
  /** Buy/sell ship components */
  COMPONENTS = 'components',
  /** Buy/sell ships */
  SHIP_DEALER = 'ship_dealer',
  /** Ship customization */
  CHASSIS_DEALER = 'chassis_dealer',
  /** Mission terminals */
  MISSIONS = 'missions',
  /** Medical services */
  MEDICAL = 'medical',
  /** Bank access */
  BANK = 'bank',
  /** Bazaar terminal */
  BAZAAR = 'bazaar',
  /** Insurance terminal */
  INSURANCE = 'insurance',
}

/**
 * Ship class types for spawn configuration.
 */
export enum ShipClass {
  /** Light fighter (TIE Fighter, X-Wing) */
  LIGHT_FIGHTER = 'light_fighter',
  /** Heavy fighter (TIE Interceptor, A-Wing) */
  HEAVY_FIGHTER = 'heavy_fighter',
  /** Bomber (TIE Bomber, Y-Wing) */
  BOMBER = 'bomber',
  /** Freighter (YT-1300, Lambda Shuttle) */
  FREIGHTER = 'freighter',
  /** Gunship (larger combat vessels) */
  GUNSHIP = 'gunship',
  /** Capital ship (Star Destroyer, Mon Calamari Cruiser) */
  CAPITAL = 'capital',
  /** POB ship (player-owned with interior) */
  POB = 'pob',
}

/**
 * 3D bounding box for space zones (extends 2D bounding box to 3D).
 */
export interface SpaceBounds {
  /** Minimum X coordinate */
  minX: number;
  /** Maximum X coordinate */
  maxX: number;
  /** Minimum Y coordinate */
  minY: number;
  /** Maximum Y coordinate */
  maxY: number;
  /** Minimum Z coordinate (vertical) */
  minZ: number;
  /** Maximum Z coordinate (vertical) */
  maxZ: number;
}

/**
 * Asteroid field definition within a space zone.
 */
export interface AsteroidField {
  /** Unique identifier for this asteroid field */
  id: string;
  /** Center position of the field */
  position: Vector3;
  /** Radius of the asteroid field in meters */
  radius: number;
  /** Density of asteroids (0.0 - 1.0) */
  density: number;
  /** Damage dealt on collision with asteroids */
  damageOnCollision: number;
  /** Whether asteroids can be mined */
  mineable: boolean;
  /** Resource types available if mineable */
  resourceTypes?: string[];
}

/**
 * Nebula region definition within a space zone.
 */
export interface Nebula {
  /** Unique identifier for this nebula */
  id: string;
  /** Center position of the nebula */
  position: Vector3;
  /** Radius of the nebula effect in meters */
  radius: number;
  /** Type of effect the nebula applies */
  effectType: NebulaEffectType;
  /** Damage per second if applicable (radiation, corrosive) */
  damagePerSecond: number;
  /** Sensor range reduction percentage (0.0 - 1.0) */
  sensorReduction?: number;
  /** Visual color tint (hex color) */
  colorTint?: string;
}

/**
 * Space station definition.
 */
export interface SpaceStation {
  /** Unique identifier for this station */
  id: string;
  /** Display name of the station */
  name: string;
  /** Position in space */
  position: Vector3;
  /** Faction controlling this station */
  faction: SpaceFaction;
  /** Services available at this station */
  services: StationService[];
  /** Number of docking ports available */
  dockingPorts: number;
  /** Radius of no-fire zone around station */
  safeZoneRadius: number;
  /** Whether this is a player-owned station (POB) */
  playerOwned: boolean;
  /** Owner ID if player-owned */
  ownerId?: bigint;
  /** Ground zone this station connects to (for shuttles) */
  groundZoneConnection?: string;
}

/**
 * Hyperspace route between zones.
 */
export interface HyperspaceRoute {
  /** Unique identifier for this route */
  id: string;
  /** Display name of the route */
  name: string;
  /** Origin space zone ID */
  origin: SpaceZoneId;
  /** Destination space zone ID */
  destination: SpaceZoneId;
  /** Travel time in seconds */
  travelTime: number;
  /** Number of navigation points required to plot course */
  navPointsRequired: number;
  /** Minimum pilot certification level required */
  minPilotLevel: number;
  /** Whether this is a one-way route */
  oneWay: boolean;
  /** Fuel cost for the journey */
  fuelCost: number;
}

/**
 * NPC ship spawn point configuration.
 */
export interface SpawnPoint {
  /** Unique identifier for this spawn point */
  id: string;
  /** Position in space */
  position: Vector3;
  /** Radius around position for spawn variation */
  spawnRadius: number;
  /** Faction of spawned ships */
  factionType: SpaceFaction;
  /** Ship classes that can spawn here */
  shipTypes: ShipClass[];
  /** Ships per hour spawn rate */
  spawnRate: number;
  /** Maximum concurrent ships from this spawn point */
  maxActive: number;
  /** Minimum pilot tier for this spawn */
  minTier: number;
  /** Maximum pilot tier for this spawn */
  maxTier: number;
  /** Whether this spawn is currently active */
  active: boolean;
}

/**
 * Space zone configuration for loading.
 */
export interface SpaceZoneConfig {
  /** Zone identifier */
  zoneId: SpaceZoneId;
  /** Display name */
  displayName: string;
  /** Default sector type for the zone */
  defaultSectorType: SpaceSectorType;
  /** 3D boundaries of the zone */
  boundaries: SpaceBounds;
  /** Asteroid fields in this zone */
  asteroidFields: AsteroidField[];
  /** Nebulae in this zone */
  nebulae: Nebula[];
  /** Space stations in this zone */
  stations: SpaceStation[];
  /** Available hyperspace routes from this zone */
  hyperspaceRoutes: HyperspaceRoute[];
  /** NPC spawn points */
  spawnPoints: SpawnPoint[];
  /** Whether this zone is enabled */
  enabled: boolean;
}

/**
 * Represents a ship object in a space zone.
 */
export interface SpaceShip {
  /** Unique object ID */
  id: bigint;
  /** Current position */
  x: number;
  y: number;
  z: number;
  /** Velocity vector */
  velocity: Vector3;
  /** Current heading/orientation */
  yaw: number;
  pitch: number;
  roll: number;
  /** Ship class type */
  shipClass: ShipClass;
  /** Faction allegiance */
  faction: SpaceFaction;
  /** Pilot/owner ID */
  pilotId: bigint;
  /** Whether this is an NPC ship */
  isNpc: boolean;
  /** Current hull integrity (0-100) */
  hullIntegrity: number;
  /** Current shield strength (0-100) */
  shieldStrength: number;
  /** Whether ship is active/visible */
  active: boolean;
  /** Ship template CRC */
  templateId?: number;
}

/**
 * Result of a collision check.
 */
export interface CollisionResult {
  /** Whether a collision occurred */
  collided: boolean;
  /** Type of object collided with */
  collisionType?: 'asteroid' | 'nebula' | 'station' | 'ship';
  /** ID of the object collided with */
  objectId?: string | bigint;
  /** Damage dealt by the collision */
  damage?: number;
  /** Effects applied (nebula effects) */
  effects?: NebulaEffectType[];
}

/**
 * Docking request status.
 */
export enum DockingStatus {
  /** Request pending */
  PENDING = 'pending',
  /** Docking approved */
  APPROVED = 'approved',
  /** Docking denied - no ports available */
  DENIED_NO_PORTS = 'denied_no_ports',
  /** Docking denied - hostile faction */
  DENIED_FACTION = 'denied_faction',
  /** Docking denied - ship too large */
  DENIED_SIZE = 'denied_size',
  /** Docking denied - combat lockout */
  DENIED_COMBAT = 'denied_combat',
  /** Ship is currently docked */
  DOCKED = 'docked',
  /** Undocking in progress */
  UNDOCKING = 'undocking',
}

/**
 * Factory function to create default space bounds.
 */
export function createSpaceBounds(
  size: number = 32768,
  height: number = 16384
): SpaceBounds {
  const halfSize = size / 2;
  const halfHeight = height / 2;
  return {
    minX: -halfSize,
    maxX: halfSize,
    minY: -halfSize,
    maxY: halfSize,
    minZ: -halfHeight,
    maxZ: halfHeight,
  };
}

/**
 * Checks if a point is within space bounds.
 */
export function isWithinSpaceBounds(
  bounds: SpaceBounds,
  x: number,
  y: number,
  z: number
): boolean {
  return (
    x >= bounds.minX &&
    x <= bounds.maxX &&
    y >= bounds.minY &&
    y <= bounds.maxY &&
    z >= bounds.minZ &&
    z <= bounds.maxZ
  );
}

/**
 * Calculates 3D distance between two points.
 */
export function distance3D(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculates squared 3D distance between two points (faster, no sqrt).
 */
export function distanceSquared3D(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  return dx * dx + dy * dy + dz * dz;
}
