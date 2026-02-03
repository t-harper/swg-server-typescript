/**
 * Movement Validator
 * Server-side validation for player movement (anti-cheat)
 */

import {
  MovementSpeed,
  MovementValidation,
  calculateDistance3D,
  calculateMaxAllowedSpeed,
} from './movement-constants.js';

/**
 * Position interface for movement validation
 */
export interface Position {
  x: number;
  y: number;
  z: number;
}

/**
 * Movement validation result
 */
export interface MovementValidationResult {
  /** Whether the movement is valid */
  valid: boolean;
  /** Reason for rejection (if invalid) */
  reason?: string;
  /** Calculated speed */
  calculatedSpeed?: number;
  /** Maximum allowed speed */
  maxAllowedSpeed?: number;
  /** Distance traveled */
  distance?: number;
  /** Time delta in milliseconds */
  deltaTime?: number;
}

/**
 * Player movement state for tracking
 */
export interface PlayerMovementState {
  /** Last known position */
  lastPosition: Position;
  /** Timestamp of last position update */
  lastUpdateTime: number;
  /** Current sequence number */
  sequenceNumber: number;
  /** Speed violations count */
  speedViolations: number;
  /** Is the player currently running */
  isRunning: boolean;
  /** Player's species modifier */
  speciesModifier: number;
  /** Is the player on a mount */
  isMounted: boolean;
  /** Mount speed if mounted */
  mountSpeed?: number;
}

/**
 * Movement Validator class
 * Validates player movement updates for anti-cheat purposes
 */
export class MovementValidator {
  /** Maximum speed violations before action */
  private readonly maxViolations: number;
  /** Grace period for initial connection (ms) */
  private readonly gracePeriod: number;
  /** Whether to log violations */
  private readonly logViolations: boolean;

  constructor(options: {
    maxViolations?: number;
    gracePeriod?: number;
    logViolations?: boolean;
  } = {}) {
    this.maxViolations = options.maxViolations ?? 5;
    this.gracePeriod = options.gracePeriod ?? 5000;
    this.logViolations = options.logViolations ?? true;
  }

  /**
   * Validate a movement update
   * @param state - Current player movement state
   * @param newPosition - New position from client
   * @param currentTime - Current server time
   * @returns Validation result
   */
  public validateMovement(
    state: PlayerMovementState,
    newPosition: Position,
    currentTime: number
  ): MovementValidationResult {
    const deltaTime = currentTime - state.lastUpdateTime;

    // Check update interval
    if (deltaTime < MovementValidation.MIN_UPDATE_INTERVAL) {
      return {
        valid: false,
        reason: 'Update too frequent',
        deltaTime,
      };
    }

    // Allow grace period for initial connection
    if (deltaTime > MovementValidation.MAX_UPDATE_INTERVAL) {
      // Player was idle or reconnecting, allow the move
      return {
        valid: true,
        deltaTime,
      };
    }

    // Calculate distance traveled
    const distance = calculateDistance3D(
      state.lastPosition.x,
      state.lastPosition.y,
      state.lastPosition.z,
      newPosition.x,
      newPosition.y,
      newPosition.z
    );

    // Check for teleport (very large distance)
    if (distance > MovementValidation.MAX_TELEPORT_DISTANCE) {
      if (this.logViolations) {
        console.warn(
          `[MovementValidator] Possible teleport detected: ${distance.toFixed(2)}m`
        );
      }
      return {
        valid: false,
        reason: 'Teleport detected',
        distance,
        deltaTime,
      };
    }

    // Calculate speed
    const deltaTimeSeconds = deltaTime / 1000;
    const calculatedSpeed = distance / deltaTimeSeconds;

    // Determine max allowed speed
    let baseSpeed = state.isRunning ? MovementSpeed.RUN : MovementSpeed.WALK;
    if (state.isMounted && state.mountSpeed) {
      baseSpeed = state.mountSpeed;
    }

    const maxAllowedSpeed = calculateMaxAllowedSpeed(
      baseSpeed,
      state.speciesModifier
    );

    // Check speed
    if (calculatedSpeed > maxAllowedSpeed) {
      if (this.logViolations) {
        console.warn(
          `[MovementValidator] Speed violation: ${calculatedSpeed.toFixed(2)} > ${maxAllowedSpeed.toFixed(2)} m/s`
        );
      }
      return {
        valid: false,
        reason: 'Speed hack detected',
        calculatedSpeed,
        maxAllowedSpeed,
        distance,
        deltaTime,
      };
    }

    return {
      valid: true,
      calculatedSpeed,
      maxAllowedSpeed,
      distance,
      deltaTime,
    };
  }

  /**
   * Validate sequence number
   * @param state - Current player movement state
   * @param newSequence - New sequence number from client
   * @returns Whether the sequence is valid
   */
  public validateSequence(
    state: PlayerMovementState,
    newSequence: number
  ): boolean {
    // Sequence should be increasing (with wrapping)
    const expectedMin = state.sequenceNumber;
    const expectedMax = (state.sequenceNumber + 100) & 0xffffffff; // Allow up to 100 ahead

    // Handle wrap-around
    if (expectedMax < expectedMin) {
      // Wrapped around, new sequence should be either >= expectedMin or <= expectedMax
      return newSequence >= expectedMin || newSequence <= expectedMax;
    }

    return newSequence >= expectedMin && newSequence <= expectedMax;
  }

  /**
   * Record a speed violation
   * @param state - Player movement state
   * @returns Number of violations
   */
  public recordViolation(state: PlayerMovementState): number {
    state.speedViolations++;
    return state.speedViolations;
  }

  /**
   * Reset violation count
   * @param state - Player movement state
   */
  public resetViolations(state: PlayerMovementState): void {
    state.speedViolations = 0;
  }

  /**
   * Check if player should be kicked for violations
   * @param state - Player movement state
   * @returns Whether the player should be kicked
   */
  public shouldKick(state: PlayerMovementState): boolean {
    return state.speedViolations >= this.maxViolations;
  }

  /**
   * Create initial movement state for a player
   * @param initialPosition - Starting position
   * @param speciesModifier - Species speed modifier
   * @returns Initial movement state
   */
  public createInitialState(
    initialPosition: Position,
    speciesModifier: number = 1.0
  ): PlayerMovementState {
    return {
      lastPosition: { ...initialPosition },
      lastUpdateTime: Date.now(),
      sequenceNumber: 0,
      speedViolations: 0,
      isRunning: false,
      speciesModifier,
      isMounted: false,
    };
  }

  /**
   * Update movement state after successful validation
   * @param state - Player movement state
   * @param newPosition - New position
   * @param newSequence - New sequence number
   * @param currentTime - Current server time
   */
  public updateState(
    state: PlayerMovementState,
    newPosition: Position,
    newSequence: number,
    currentTime: number
  ): void {
    state.lastPosition = { ...newPosition };
    state.lastUpdateTime = currentTime;
    state.sequenceNumber = newSequence;
  }
}

/**
 * Create a new MovementValidator instance
 */
export function createMovementValidator(options?: {
  maxViolations?: number;
  gracePeriod?: number;
  logViolations?: boolean;
}): MovementValidator {
  return new MovementValidator(options);
}
