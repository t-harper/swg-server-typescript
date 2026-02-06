/**
 * @swg/world - Space Zone
 * Represents a single space zone (orbital region) for JTL
 */

import type { Vector3 } from '@swg/shared-types';
import {
  type SpaceZoneId,
  type SpaceSectorType,
  type SpaceBounds,
  type AsteroidField,
  type Nebula,
  type SpaceStation,
  type HyperspaceRoute,
  type SpawnPoint,
  type SpaceShip,
  type SpaceZoneConfig,
  type CollisionResult,
  SpaceFaction,
  NebulaEffectType,
  DockingStatus,
  isWithinSpaceBounds,
  distanceSquared3D,
  distance3D,
} from './space-types.js';

/**
 * Message that can be broadcast to ships in a space zone.
 */
export interface SpaceZoneMessage {
  /** Message type identifier */
  type: string;
  /** Source ship ID (if any) */
  sourceId?: bigint;
  /** Message payload */
  payload: unknown;
  /** Range for broadcast (-1 for zone-wide) */
  range: number;
  /** Center point for ranged broadcasts */
  origin?: Vector3;
}

/**
 * Callback type for space zone message handlers.
 */
export type SpaceMessageHandler = (
  message: SpaceZoneMessage,
  ships: SpaceShip[]
) => void;

/**
 * Docking state for a ship at a station.
 */
export interface DockingState {
  /** Ship ID */
  shipId: bigint;
  /** Station ID */
  stationId: string;
  /** Current docking status */
  status: DockingStatus;
  /** Assigned docking port (0-indexed) */
  portIndex: number;
  /** Timestamp when docking started */
  startTime: number;
}

/**
 * Represents a single space zone in the game world.
 *
 * Space zones manage:
 * - 3D spatial tracking of ships
 * - Asteroid field collision detection
 * - Nebula effect application
 * - Station docking
 * - NPC spawn management
 * - Hyperspace route access
 *
 * @example
 * ```typescript
 * const zone = new SpaceZone(spaceConfig);
 * zone.addShip(myShip);
 * const nearby = zone.getShipsInRadius(0, 0, 0, 5000);
 * ```
 */
export class SpaceZone {
  /** Zone identifier */
  readonly zoneId: SpaceZoneId;

  /** Display name */
  readonly displayName: string;

  /** Default sector type */
  readonly sectorType: SpaceSectorType;

  /** 3D zone boundaries */
  readonly boundaries: SpaceBounds;

  /** Asteroid fields in this zone */
  readonly asteroidFields: AsteroidField[];

  /** Nebulae in this zone */
  readonly nebulae: Nebula[];

  /** Space stations in this zone */
  readonly stations: SpaceStation[];

  /** Available hyperspace routes */
  readonly hyperspaceRoutes: HyperspaceRoute[];

  /** NPC spawn points */
  readonly spawnPoints: SpawnPoint[];

  /** Ships currently in this zone */
  private readonly ships: Map<bigint, SpaceShip>;

  /** Docking states for ships at stations */
  private readonly dockingStates: Map<bigint, DockingState>;

  /** Occupied docking ports per station */
  private readonly occupiedPorts: Map<string, Set<number>>;

  /** Message handlers */
  private readonly messageHandlers: Map<string, Set<SpaceMessageHandler>>;

  /** Whether the zone is currently active */
  private _active: boolean = false;

  /**
   * Creates a new SpaceZone from configuration.
   *
   * @param config - Space zone configuration
   */
  constructor(config: SpaceZoneConfig) {
    this.zoneId = config.zoneId;
    this.displayName = config.displayName;
    this.sectorType = config.defaultSectorType;
    this.boundaries = config.boundaries;
    this.asteroidFields = [...config.asteroidFields];
    this.nebulae = [...config.nebulae];
    this.stations = [...config.stations];
    this.hyperspaceRoutes = [...config.hyperspaceRoutes];
    this.spawnPoints = [...config.spawnPoints];

    this.ships = new Map();
    this.dockingStates = new Map();
    this.occupiedPorts = new Map();
    this.messageHandlers = new Map();

    // Initialize occupied ports for each station
    for (const station of this.stations) {
      this.occupiedPorts.set(station.id, new Set());
    }
  }

  /**
   * Whether the zone is currently active.
   */
  get active(): boolean {
    return this._active;
  }

  /**
   * Gets the number of ships in this zone.
   */
  get shipCount(): number {
    return this.ships.size;
  }

  /**
   * Activates the zone.
   */
  activate(): void {
    this._active = true;
  }

  /**
   * Deactivates the zone.
   */
  deactivate(): void {
    this._active = false;
  }

  // ============================================
  // Ship Management
  // ============================================

  /**
   * Adds a ship to the zone.
   *
   * @param ship - The ship to add
   * @throws Error if ship already exists or is out of bounds
   */
  addShip(ship: SpaceShip): void {
    if (this.ships.has(ship.id)) {
      throw new Error(
        `Ship ${ship.id} already exists in zone ${this.zoneId}`
      );
    }

    if (!isWithinSpaceBounds(this.boundaries, ship.x, ship.y, ship.z)) {
      throw new Error(
        `Ship ${ship.id} at (${ship.x}, ${ship.y}, ${ship.z}) is outside zone bounds`
      );
    }

    this.ships.set(ship.id, ship);
  }

  /**
   * Removes a ship from the zone.
   *
   * @param id - The ID of the ship to remove
   * @returns true if the ship was found and removed
   */
  removeShip(id: bigint): boolean {
    const ship = this.ships.get(id);
    if (!ship) {
      return false;
    }

    // Clean up docking state if docked
    const dockingState = this.dockingStates.get(id);
    if (dockingState) {
      const ports = this.occupiedPorts.get(dockingState.stationId);
      if (ports) {
        ports.delete(dockingState.portIndex);
      }
      this.dockingStates.delete(id);
    }

    this.ships.delete(id);
    return true;
  }

  /**
   * Gets a ship by ID.
   *
   * @param id - The ship ID
   * @returns The ship or undefined if not found
   */
  getShip(id: bigint): SpaceShip | undefined {
    return this.ships.get(id);
  }

  /**
   * Checks if a ship exists in this zone.
   *
   * @param id - The ship ID
   */
  hasShip(id: bigint): boolean {
    return this.ships.has(id);
  }

  /**
   * Updates a ship's position in the zone.
   *
   * @param id - The ship ID
   * @param x - New X coordinate
   * @param y - New Y coordinate
   * @param z - New Z coordinate
   * @throws Error if ship not found or new position is out of bounds
   */
  updateShipPosition(id: bigint, x: number, y: number, z: number): void {
    const ship = this.ships.get(id);
    if (!ship) {
      throw new Error(`Ship ${id} not found in zone ${this.zoneId}`);
    }

    if (!isWithinSpaceBounds(this.boundaries, x, y, z)) {
      throw new Error(
        `New position (${x}, ${y}, ${z}) is outside zone bounds`
      );
    }

    ship.x = x;
    ship.y = y;
    ship.z = z;
  }

  /**
   * Gets all ships within a 3D spherical radius.
   *
   * @param x - Center X coordinate
   * @param y - Center Y coordinate
   * @param z - Center Z coordinate
   * @param radius - Search radius in meters
   * @returns Array of ships within the radius
   */
  getShipsInRadius(x: number, y: number, z: number, radius: number): SpaceShip[] {
    const radiusSquared = radius * radius;
    const results: SpaceShip[] = [];

    for (const ship of this.ships.values()) {
      const distSq = distanceSquared3D(x, y, z, ship.x, ship.y, ship.z);
      if (distSq <= radiusSquared) {
        results.push(ship);
      }
    }

    return results;
  }

  /**
   * Gets all ships of a specific faction.
   *
   * @param faction - The faction to filter by
   * @returns Array of ships belonging to that faction
   */
  getShipsByFaction(faction: SpaceFaction): SpaceShip[] {
    const results: SpaceShip[] = [];
    for (const ship of this.ships.values()) {
      if (ship.faction === faction) {
        results.push(ship);
      }
    }
    return results;
  }

  /**
   * Gets all ships in the zone.
   *
   * @returns Array of all ships
   */
  getAllShips(): SpaceShip[] {
    return Array.from(this.ships.values());
  }

  /**
   * Gets all active ships in the zone.
   *
   * @returns Array of active ships
   */
  getActiveShips(): SpaceShip[] {
    return Array.from(this.ships.values()).filter((ship) => ship.active);
  }

  // ============================================
  // Station Management
  // ============================================

  /**
   * Gets the nearest station to a position.
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   * @returns The nearest station or undefined if none exist
   */
  getNearestStation(x: number, y: number, z: number): SpaceStation | undefined {
    let nearest: SpaceStation | undefined;
    let nearestDistSq = Infinity;

    for (const station of this.stations) {
      const distSq = distanceSquared3D(
        x, y, z,
        station.position.x, station.position.y, station.position.z
      );
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearest = station;
      }
    }

    return nearest;
  }

  /**
   * Gets a station by ID.
   *
   * @param id - Station ID
   * @returns The station or undefined if not found
   */
  getStation(id: string): SpaceStation | undefined {
    return this.stations.find((s) => s.id === id);
  }

  /**
   * Checks if a position is within a station's safe zone.
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   * @returns The station if within safe zone, undefined otherwise
   */
  isInSafeZone(x: number, y: number, z: number): SpaceStation | undefined {
    for (const station of this.stations) {
      const dist = distance3D(
        x, y, z,
        station.position.x, station.position.y, station.position.z
      );
      if (dist <= station.safeZoneRadius) {
        return station;
      }
    }
    return undefined;
  }

  // ============================================
  // Docking System
  // ============================================

  /**
   * Requests docking permission at a station.
   *
   * @param shipId - The ship requesting docking
   * @param stationId - The target station ID
   * @returns Docking status result
   */
  requestDocking(shipId: bigint, stationId: string): DockingStatus {
    const ship = this.ships.get(shipId);
    if (!ship) {
      return DockingStatus.DENIED_COMBAT; // Generic denial
    }

    const station = this.getStation(stationId);
    if (!station) {
      return DockingStatus.DENIED_NO_PORTS;
    }

    // Check faction compatibility
    if (
      station.faction !== SpaceFaction.NEUTRAL &&
      ship.faction !== SpaceFaction.NEUTRAL &&
      station.faction !== ship.faction
    ) {
      // Check for enemy factions
      const isEnemy =
        (station.faction === SpaceFaction.IMPERIAL && ship.faction === SpaceFaction.REBEL) ||
        (station.faction === SpaceFaction.REBEL && ship.faction === SpaceFaction.IMPERIAL);
      if (isEnemy) {
        return DockingStatus.DENIED_FACTION;
      }
    }

    // Check available ports
    const occupiedPorts = this.occupiedPorts.get(stationId);
    if (!occupiedPorts || occupiedPorts.size >= station.dockingPorts) {
      return DockingStatus.DENIED_NO_PORTS;
    }

    // Find an available port
    let portIndex = -1;
    for (let i = 0; i < station.dockingPorts; i++) {
      if (!occupiedPorts.has(i)) {
        portIndex = i;
        break;
      }
    }

    if (portIndex === -1) {
      return DockingStatus.DENIED_NO_PORTS;
    }

    // Create docking state
    const dockingState: DockingState = {
      shipId,
      stationId,
      status: DockingStatus.APPROVED,
      portIndex,
      startTime: Date.now(),
    };

    this.dockingStates.set(shipId, dockingState);
    occupiedPorts.add(portIndex);

    return DockingStatus.APPROVED;
  }

  /**
   * Completes the docking process for a ship.
   *
   * @param shipId - The ship ID
   * @returns true if docking completed successfully
   */
  completeDocking(shipId: bigint): boolean {
    const state = this.dockingStates.get(shipId);
    if (!state || state.status !== DockingStatus.APPROVED) {
      return false;
    }

    state.status = DockingStatus.DOCKED;
    return true;
  }

  /**
   * Requests undocking from a station.
   *
   * @param shipId - The ship ID
   * @returns true if undocking started
   */
  requestUndocking(shipId: bigint): boolean {
    const state = this.dockingStates.get(shipId);
    if (!state || state.status !== DockingStatus.DOCKED) {
      return false;
    }

    state.status = DockingStatus.UNDOCKING;
    return true;
  }

  /**
   * Completes undocking and removes docking state.
   *
   * @param shipId - The ship ID
   * @returns true if undocking completed
   */
  completeUndocking(shipId: bigint): boolean {
    const state = this.dockingStates.get(shipId);
    if (!state || state.status !== DockingStatus.UNDOCKING) {
      return false;
    }

    const ports = this.occupiedPorts.get(state.stationId);
    if (ports) {
      ports.delete(state.portIndex);
    }

    this.dockingStates.delete(shipId);
    return true;
  }

  /**
   * Gets the docking state for a ship.
   *
   * @param shipId - The ship ID
   * @returns The docking state or undefined
   */
  getDockingState(shipId: bigint): DockingState | undefined {
    return this.dockingStates.get(shipId);
  }

  /**
   * Checks if a ship is docked.
   *
   * @param shipId - The ship ID
   */
  isShipDocked(shipId: bigint): boolean {
    const state = this.dockingStates.get(shipId);
    return state?.status === DockingStatus.DOCKED;
  }

  // ============================================
  // Collision Detection
  // ============================================

  /**
   * Checks for collision at a given position.
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   * @param shipRadius - The ship's collision radius
   * @returns Collision result
   */
  checkCollision(
    x: number,
    y: number,
    z: number,
    _shipRadius: number = 10
  ): CollisionResult {
    // Check asteroid field collisions
    for (const field of this.asteroidFields) {
      const dist = distance3D(
        x, y, z,
        field.position.x, field.position.y, field.position.z
      );

      if (dist <= field.radius) {
        // Inside asteroid field - check density-based collision
        const collisionChance = field.density;
        if (Math.random() < collisionChance) {
          return {
            collided: true,
            collisionType: 'asteroid',
            objectId: field.id,
            damage: field.damageOnCollision,
          };
        }
      }
    }

    // Nebula effects are checked separately (don't cause collision damage directly)
    return { collided: false };
  }

  /**
   * Gets nebula effects at a given position.
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   * @returns Array of nebula effects and their parameters
   */
  getNebulaEffects(
    x: number,
    y: number,
    z: number
  ): Array<{ nebula: Nebula; intensity: number }> {
    const effects: Array<{ nebula: Nebula; intensity: number }> = [];

    for (const nebula of this.nebulae) {
      const dist = distance3D(
        x, y, z,
        nebula.position.x, nebula.position.y, nebula.position.z
      );

      if (dist <= nebula.radius) {
        // Intensity decreases towards the edge (1.0 at center, 0.0 at edge)
        const intensity = 1 - dist / nebula.radius;
        effects.push({ nebula, intensity });
      }
    }

    return effects;
  }

  /**
   * Calculates nebula damage per tick for a position.
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   * @returns Total damage per second from nebulae
   */
  calculateNebulaDamage(x: number, y: number, z: number): number {
    let totalDamage = 0;

    const effects = this.getNebulaEffects(x, y, z);
    for (const { nebula, intensity } of effects) {
      if (
        nebula.effectType === NebulaEffectType.RADIATION ||
        nebula.effectType === NebulaEffectType.CORROSIVE
      ) {
        totalDamage += nebula.damagePerSecond * intensity;
      }
    }

    return totalDamage;
  }

  /**
   * Calculates sensor range reduction at a position.
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   * @returns Sensor reduction factor (0.0 = no reduction, 1.0 = full jamming)
   */
  calculateSensorReduction(x: number, y: number, z: number): number {
    let maxReduction = 0;

    const effects = this.getNebulaEffects(x, y, z);
    for (const { nebula, intensity } of effects) {
      if (
        nebula.effectType === NebulaEffectType.SENSOR_JAMMING &&
        nebula.sensorReduction !== undefined
      ) {
        const reduction = nebula.sensorReduction * intensity;
        maxReduction = Math.max(maxReduction, reduction);
      }
    }

    return maxReduction;
  }

  // ============================================
  // Hyperspace Routes
  // ============================================

  /**
   * Gets available hyperspace routes from this zone.
   *
   * @param pilotLevel - The pilot's certification level
   * @returns Array of available routes
   */
  getAvailableRoutes(pilotLevel: number): HyperspaceRoute[] {
    return this.hyperspaceRoutes.filter(
      (route) => route.minPilotLevel <= pilotLevel
    );
  }

  /**
   * Gets a specific hyperspace route by destination.
   *
   * @param destination - The destination zone ID
   * @returns The route or undefined if not found
   */
  getRouteToZone(destination: SpaceZoneId): HyperspaceRoute | undefined {
    return this.hyperspaceRoutes.find((route) => route.destination === destination);
  }

  // ============================================
  // Messaging
  // ============================================

  /**
   * Registers a message handler.
   *
   * @param type - Message type to handle
   * @param handler - Handler function
   */
  onMessage(type: string, handler: SpaceMessageHandler): void {
    let handlers = this.messageHandlers.get(type);
    if (!handlers) {
      handlers = new Set();
      this.messageHandlers.set(type, handlers);
    }
    handlers.add(handler);
  }

  /**
   * Unregisters a message handler.
   *
   * @param type - Message type
   * @param handler - Handler function to remove
   */
  offMessage(type: string, handler: SpaceMessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Broadcasts a message to ships in range.
   *
   * @param message - The message to broadcast
   */
  broadcast(message: SpaceZoneMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (!handlers || handlers.size === 0) {
      return;
    }

    let targetShips: SpaceShip[];

    if (message.range < 0 || !message.origin) {
      // Zone-wide broadcast
      targetShips = this.getAllShips();
    } else {
      // Ranged broadcast
      targetShips = this.getShipsInRadius(
        message.origin.x,
        message.origin.y,
        message.origin.z,
        message.range
      );
    }

    for (const handler of handlers) {
      handler(message, targetShips);
    }
  }

  /**
   * Broadcasts a message from a specific ship.
   *
   * @param sourceId - The source ship ID
   * @param type - Message type
   * @param payload - Message payload
   * @param range - Broadcast range (-1 for zone-wide)
   */
  broadcastFromShip(
    sourceId: bigint,
    type: string,
    payload: unknown,
    range: number = -1
  ): void {
    const source = this.ships.get(sourceId);

    this.broadcast({
      type,
      sourceId,
      payload,
      range,
      origin: source ? { x: source.x, y: source.y, z: source.z } : undefined,
    });
  }

  // ============================================
  // Utilities
  // ============================================

  /**
   * Clears all ships from the zone.
   */
  clear(): void {
    this.ships.clear();
    this.dockingStates.clear();
    for (const ports of this.occupiedPorts.values()) {
      ports.clear();
    }
  }

  /**
   * Validates that a position is within zone bounds.
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   */
  isValidPosition(x: number, y: number, z: number): boolean {
    return isWithinSpaceBounds(this.boundaries, x, y, z);
  }

  /**
   * Clamps a position to zone bounds.
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   */
  clampPosition(x: number, y: number, z: number): Vector3 {
    return {
      x: Math.max(this.boundaries.minX, Math.min(x, this.boundaries.maxX)),
      y: Math.max(this.boundaries.minY, Math.min(y, this.boundaries.maxY)),
      z: Math.max(this.boundaries.minZ, Math.min(z, this.boundaries.maxZ)),
    };
  }

  /**
   * Gets statistics about the zone.
   */
  getStats(): {
    zoneId: SpaceZoneId;
    shipCount: number;
    dockedShipCount: number;
    stationCount: number;
    asteroidFieldCount: number;
    nebulaCount: number;
    active: boolean;
  } {
    let dockedCount = 0;
    for (const state of this.dockingStates.values()) {
      if (state.status === DockingStatus.DOCKED) {
        dockedCount++;
      }
    }

    return {
      zoneId: this.zoneId,
      shipCount: this.ships.size,
      dockedShipCount: dockedCount,
      stationCount: this.stations.length,
      asteroidFieldCount: this.asteroidFields.length,
      nebulaCount: this.nebulae.length,
      active: this._active,
    };
  }
}

/**
 * Factory function to create a SpaceZone from configuration.
 *
 * @param config - Space zone configuration
 * @returns A new SpaceZone instance
 */
export function createSpaceZone(config: SpaceZoneConfig): SpaceZone {
  return new SpaceZone(config);
}
