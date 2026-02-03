/**
 * Movement Handler
 * Handles player movement messages and position updates
 */

import {
  type DataTransform,
  type DataTransformWithParent,
  type UpdateTransform,
  type UpdateTransformWithParent,
  createUpdateTransform,
  createUpdateTransformWithParent,
  serializeUpdateTransform,
  serializeUpdateTransformWithParent,
} from '@swg/protocol/swg/messages/movement.js';
import { Posture, type PostureType, canMoveInPosture } from '@swg/protocol/swg/messages/posture.js';
import {
  MovementSpeed,
  MovementValidation,
  calculateDistance3D,
  calculateMaxAllowedSpeed,
  type Position,
  MovementValidator,
  createMovementValidator,
  type PlayerMovementState,
} from '@swg/game-logic/movement';

/**
 * Game session context for a connected client
 */
export interface GameSession {
  sessionId: number;
  address: string;
  port: number;
  authenticated: boolean;
  accountId?: number;
  characterId?: bigint;
  player?: PlayerObject;
  sendCallback?: (data: Uint8Array) => void;
}

/**
 * Player object representing an in-game character
 */
export interface PlayerObject {
  objectId: bigint;
  characterId: bigint;
  name: string;
  position: Position;
  yaw: number;
  cellId?: bigint; // If inside a cell
  posture: PostureType;
  speed: number;
  movementState: PlayerMovementState;
  speciesModifier: number;
  // Spatial index info
  zoneId: string;
  gridX: number;
  gridZ: number;
}

/**
 * Spatial grid cell for efficient nearby player lookup
 */
interface SpatialCell {
  players: Set<bigint>;
}

/**
 * Callback for broadcasting movement to nearby players
 */
type BroadcastCallback = (
  excludeObjectId: bigint,
  data: Uint8Array,
  nearbyObjectIds: bigint[]
) => void;

/**
 * Movement Handler class
 * Validates and processes player movement updates
 */
export class MovementHandler {
  private readonly validator: MovementValidator;
  private readonly spatialIndex: Map<string, SpatialCell>;
  private readonly cellSize: number;
  private readonly viewDistance: number;
  private broadcastCallback?: BroadcastCallback;

  // Player lookup
  private readonly playersByObjectId: Map<bigint, PlayerObject>;
  private readonly sessionsByObjectId: Map<bigint, GameSession>;

  constructor(options: {
    cellSize?: number;
    viewDistance?: number;
    maxViolations?: number;
  } = {}) {
    this.cellSize = options.cellSize ?? 64; // 64 meter grid cells
    this.viewDistance = options.viewDistance ?? 192; // ~3 grid cells
    this.validator = createMovementValidator({
      maxViolations: options.maxViolations ?? 5,
      logViolations: true,
    });
    this.spatialIndex = new Map();
    this.playersByObjectId = new Map();
    this.sessionsByObjectId = new Map();
  }

  /**
   * Set the broadcast callback for sending updates to nearby players
   */
  public setBroadcastCallback(callback: BroadcastCallback): void {
    this.broadcastCallback = callback;
  }

  /**
   * Register a player with the movement handler
   */
  public registerPlayer(session: GameSession, player: PlayerObject): void {
    this.playersByObjectId.set(player.objectId, player);
    this.sessionsByObjectId.set(player.objectId, session);
    this.addToSpatialIndex(player);
  }

  /**
   * Unregister a player from the movement handler
   */
  public unregisterPlayer(objectId: bigint): void {
    const player = this.playersByObjectId.get(objectId);
    if (player) {
      this.removeFromSpatialIndex(player);
      this.playersByObjectId.delete(objectId);
      this.sessionsByObjectId.delete(objectId);
    }
  }

  /**
   * Handle DataTransform message (world position update)
   */
  public handleDataTransform(session: GameSession, message: DataTransform): void {
    const player = session.player;
    if (!player) {
      console.warn('[MovementHandler] No player for session');
      return;
    }

    // Check if player can move in current posture
    if (!canMoveInPosture(player.posture)) {
      console.warn(
        `[MovementHandler] Player ${player.objectId} cannot move in posture ${player.posture}`
      );
      return;
    }

    const newPosition: Position = {
      x: message.transform.x,
      y: message.transform.y,
      z: message.transform.z,
    };

    // Validate movement
    const currentTime = Date.now();
    const validationResult = this.validateMovement(
      player,
      newPosition,
      currentTime
    );

    if (!validationResult.valid) {
      this.handleInvalidMovement(session, player, validationResult.reason ?? 'Unknown');
      return;
    }

    // Validate sequence number
    if (!this.validator.validateSequence(player.movementState, message.sequenceNumber)) {
      console.warn(
        `[MovementHandler] Invalid sequence for player ${player.objectId}: ${message.sequenceNumber}`
      );
      // Allow but log - sequence issues can happen with packet loss
    }

    // Clear cell if player was in one
    if (player.cellId !== undefined) {
      player.cellId = undefined;
    }

    // Update player position
    this.updatePlayerPosition(player, newPosition);
    player.yaw = message.transform.yaw;
    player.speed = message.speed;

    // Update movement state
    this.validator.updateState(
      player.movementState,
      newPosition,
      message.sequenceNumber,
      currentTime
    );

    // Broadcast to nearby players
    const updateMessage = createUpdateTransform(
      player.objectId,
      newPosition.x,
      newPosition.y,
      newPosition.z,
      message.transform.yaw,
      message.speed
    );
    this.broadcastMovement(player, serializeUpdateTransform(updateMessage));
  }

  /**
   * Handle DataTransformWithParent message (cell-relative position update)
   */
  public handleDataTransformWithParent(
    session: GameSession,
    message: DataTransformWithParent
  ): void {
    const player = session.player;
    if (!player) {
      console.warn('[MovementHandler] No player for session');
      return;
    }

    // Check if player can move in current posture
    if (!canMoveInPosture(player.posture)) {
      console.warn(
        `[MovementHandler] Player ${player.objectId} cannot move in posture ${player.posture}`
      );
      return;
    }

    const newPosition: Position = {
      x: message.transform.x,
      y: message.transform.y,
      z: message.transform.z,
    };

    const currentTime = Date.now();

    // For cell-relative movement, we still validate but with relaxed constraints
    // since positions are relative to the cell origin
    const validationResult = this.validateMovement(
      player,
      newPosition,
      currentTime
    );

    if (!validationResult.valid) {
      this.handleInvalidMovement(session, player, validationResult.reason ?? 'Unknown');
      return;
    }

    // Handle cell entry/exit
    const previousCellId = player.cellId;
    if (message.cellId !== previousCellId) {
      this.handleCellChange(player, previousCellId, message.cellId);
    }

    // Update player position and cell
    this.updatePlayerPosition(player, newPosition);
    player.cellId = message.cellId;
    player.yaw = message.transform.yaw;
    player.speed = message.speed;

    // Update movement state
    this.validator.updateState(
      player.movementState,
      newPosition,
      message.sequenceNumber,
      currentTime
    );

    // Broadcast to nearby players
    const updateMessage = createUpdateTransformWithParent(
      player.objectId,
      message.cellId,
      newPosition.x,
      newPosition.y,
      newPosition.z,
      message.transform.yaw,
      message.speed
    );
    this.broadcastMovement(
      player,
      serializeUpdateTransformWithParent(updateMessage)
    );
  }

  /**
   * Validate movement speed (anti-cheat)
   */
  private validateMovement(
    player: PlayerObject,
    newPosition: Position,
    currentTime: number
  ): { valid: boolean; reason?: string } {
    return this.validator.validateMovement(
      player.movementState,
      newPosition,
      currentTime
    );
  }

  /**
   * Handle invalid movement (potential hack)
   */
  private handleInvalidMovement(
    session: GameSession,
    player: PlayerObject,
    reason: string
  ): void {
    console.warn(
      `[MovementHandler] Invalid movement for player ${player.objectId}: ${reason}`
    );

    const violations = this.validator.recordViolation(player.movementState);

    if (this.validator.shouldKick(player.movementState)) {
      console.warn(
        `[MovementHandler] Kicking player ${player.objectId} for excessive violations`
      );
      // TODO: Implement kick mechanism
      // session.disconnect('Speed hack detected');
    }
  }

  /**
   * Update player position and spatial index
   */
  private updatePlayerPosition(player: PlayerObject, newPosition: Position): void {
    const oldGridX = player.gridX;
    const oldGridZ = player.gridZ;

    // Update position
    player.position = { ...newPosition };

    // Calculate new grid position
    const newGridX = Math.floor(newPosition.x / this.cellSize);
    const newGridZ = Math.floor(newPosition.z / this.cellSize);

    // Update spatial index if grid cell changed
    if (newGridX !== oldGridX || newGridZ !== oldGridZ) {
      this.removeFromSpatialIndex(player);
      player.gridX = newGridX;
      player.gridZ = newGridZ;
      this.addToSpatialIndex(player);
    }
  }

  /**
   * Handle cell entry/exit
   */
  private handleCellChange(
    player: PlayerObject,
    previousCellId: bigint | undefined,
    newCellId: bigint
  ): void {
    if (previousCellId !== undefined) {
      console.log(
        `[MovementHandler] Player ${player.objectId} exited cell ${previousCellId}`
      );
      // TODO: Trigger cell exit events
    }

    console.log(
      `[MovementHandler] Player ${player.objectId} entered cell ${newCellId}`
    );
    // TODO: Trigger cell entry events
  }

  /**
   * Broadcast movement update to nearby players
   */
  private broadcastMovement(player: PlayerObject, data: Uint8Array): void {
    const nearbyPlayers = this.getNearbyPlayers(player);

    if (this.broadcastCallback) {
      this.broadcastCallback(
        player.objectId,
        data,
        nearbyPlayers.map((p) => p.objectId)
      );
    } else {
      // Direct broadcast to nearby player sessions
      for (const nearbyPlayer of nearbyPlayers) {
        const session = this.sessionsByObjectId.get(nearbyPlayer.objectId);
        if (session?.sendCallback) {
          session.sendCallback(data);
        }
      }
    }
  }

  /**
   * Get players near a given player
   */
  private getNearbyPlayers(player: PlayerObject): PlayerObject[] {
    const nearby: PlayerObject[] = [];
    const gridRange = Math.ceil(this.viewDistance / this.cellSize);

    for (let dx = -gridRange; dx <= gridRange; dx++) {
      for (let dz = -gridRange; dz <= gridRange; dz++) {
        const cellKey = this.getCellKey(
          player.zoneId,
          player.gridX + dx,
          player.gridZ + dz
        );
        const cell = this.spatialIndex.get(cellKey);
        if (cell) {
          for (const objectId of cell.players) {
            if (objectId !== player.objectId) {
              const otherPlayer = this.playersByObjectId.get(objectId);
              if (otherPlayer) {
                // Check actual distance
                const distance = calculateDistance3D(
                  player.position.x,
                  player.position.y,
                  player.position.z,
                  otherPlayer.position.x,
                  otherPlayer.position.y,
                  otherPlayer.position.z
                );
                if (distance <= this.viewDistance) {
                  nearby.push(otherPlayer);
                }
              }
            }
          }
        }
      }
    }

    return nearby;
  }

  /**
   * Add player to spatial index
   */
  private addToSpatialIndex(player: PlayerObject): void {
    const cellKey = this.getCellKey(player.zoneId, player.gridX, player.gridZ);
    let cell = this.spatialIndex.get(cellKey);
    if (!cell) {
      cell = { players: new Set() };
      this.spatialIndex.set(cellKey, cell);
    }
    cell.players.add(player.objectId);
  }

  /**
   * Remove player from spatial index
   */
  private removeFromSpatialIndex(player: PlayerObject): void {
    const cellKey = this.getCellKey(player.zoneId, player.gridX, player.gridZ);
    const cell = this.spatialIndex.get(cellKey);
    if (cell) {
      cell.players.delete(player.objectId);
      if (cell.players.size === 0) {
        this.spatialIndex.delete(cellKey);
      }
    }
  }

  /**
   * Get spatial cell key
   */
  private getCellKey(zoneId: string, gridX: number, gridZ: number): string {
    return `${zoneId}:${gridX}:${gridZ}`;
  }

  /**
   * Get player by object ID
   */
  public getPlayer(objectId: bigint): PlayerObject | undefined {
    return this.playersByObjectId.get(objectId);
  }

  /**
   * Get all players in a zone
   */
  public getPlayersInZone(zoneId: string): PlayerObject[] {
    return Array.from(this.playersByObjectId.values()).filter(
      (p) => p.zoneId === zoneId
    );
  }

  /**
   * Get player count
   */
  public getPlayerCount(): number {
    return this.playersByObjectId.size;
  }
}

/**
 * Create a new MovementHandler instance
 */
export function createMovementHandler(options?: {
  cellSize?: number;
  viewDistance?: number;
  maxViolations?: number;
}): MovementHandler {
  return new MovementHandler(options);
}
