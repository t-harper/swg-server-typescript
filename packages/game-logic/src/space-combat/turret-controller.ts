/**
 * Turret Controller
 * Manages turrets on multi-crew ships for JTL
 *
 * Multi-crew ships (POBs - Player on Board) have:
 * - Multiple turret stations for gunners
 * - Each turret has firing arc limitations
 * - Gunners can be assigned/removed from turrets
 * - Independent targeting per turret
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import type { ShipObject } from '@swg/objects';

import {
  type SpaceWeaponStats,
  type CombatResult,
  createEmptyCombatResult,
  distance3D,
  normalizeVector,
  dotProduct,
} from './space-combat-types.js';
import { SpaceCombatManager, type WeaponFireResult } from './space-combat-manager.js';

// ============================================
// Types
// ============================================

/**
 * Turret firing arc definition
 * Defines the cone of fire for a turret
 */
export interface TurretArc {
  /** Yaw (horizontal) arc in degrees (-180 to 180) */
  yawMin: number;
  yawMax: number;
  /** Pitch (vertical) arc in degrees (-90 to 90) */
  pitchMin: number;
  pitchMax: number;
}

/**
 * Turret configuration
 */
export interface TurretConfig {
  /** Turret index (0-based) */
  index: number;
  /** Weapon slot this turret uses */
  weaponSlot: number;
  /** Firing arc limitations */
  arc: TurretArc;
  /** Turret rotation speed in degrees per second */
  rotationSpeed: number;
  /** Local offset from ship center */
  offset: Vector3;
  /** Turret facing direction (relative to ship) */
  facing: 'forward' | 'rear' | 'dorsal' | 'ventral' | 'port' | 'starboard';
}

/**
 * Turret state
 */
export interface TurretState {
  /** Turret configuration */
  config: TurretConfig;
  /** Currently assigned gunner (0n if empty) */
  gunnerId: ObjectId;
  /** Current target (0n if none) */
  targetId: ObjectId;
  /** Current yaw angle in degrees */
  currentYaw: number;
  /** Current pitch angle in degrees */
  currentPitch: number;
  /** Time until next shot (ms) */
  cooldownRemaining: number;
  /** Whether turret is online/functional */
  isOnline: boolean;
  /** Whether turret is tracking a target */
  isTracking: boolean;
}

/**
 * Result of turret fire attempt
 */
export interface TurretFireResult extends WeaponFireResult {
  /** Whether target was in firing arc */
  inArc: boolean;
  /** Current turret angles */
  currentYaw: number;
  currentPitch: number;
}

// ============================================
// Default Turret Configurations
// ============================================

/**
 * Default turret arc configurations by facing
 */
export const DEFAULT_TURRET_ARCS: Record<TurretState['config']['facing'], TurretArc> = {
  forward: { yawMin: -45, yawMax: 45, pitchMin: -30, pitchMax: 30 },
  rear: { yawMin: 135, yawMax: -135, pitchMin: -30, pitchMax: 30 },
  dorsal: { yawMin: -180, yawMax: 180, pitchMin: 0, pitchMax: 90 },
  ventral: { yawMin: -180, yawMax: 180, pitchMin: -90, pitchMax: 0 },
  port: { yawMin: -135, yawMax: -45, pitchMin: -45, pitchMax: 45 },
  starboard: { yawMin: 45, yawMax: 135, pitchMin: -45, pitchMax: 45 },
};

// ============================================
// Turret Controller Class
// ============================================

/**
 * Turret Controller
 * Manages turrets for multi-crew ships
 */
export class TurretController {
  /** Combat manager for firing weapons */
  private combatManager: SpaceCombatManager;

  /** Turret states by ship (shipId -> turretIndex -> TurretState) */
  private turrets: Map<ObjectId, Map<number, TurretState>> = new Map();

  /** Gunner to turret mapping (gunnerId -> { shipId, turretIndex }) */
  private gunnerAssignments: Map<ObjectId, { shipId: ObjectId; turretIndex: number }> =
    new Map();

  /**
   * Create a new Turret Controller
   * @param combatManager - Space combat manager for firing
   */
  constructor(combatManager: SpaceCombatManager) {
    this.combatManager = combatManager;
  }

  // ============================================
  // Ship Turret Setup
  // ============================================

  /**
   * Initialize turrets for a ship
   * @param shipId - Ship to initialize turrets for
   * @param configs - Array of turret configurations
   */
  initializeShipTurrets(shipId: ObjectId, configs: TurretConfig[]): void {
    const shipTurrets = new Map<number, TurretState>();

    for (const config of configs) {
      const state: TurretState = {
        config,
        gunnerId: 0n as ObjectId,
        targetId: 0n as ObjectId,
        currentYaw: 0,
        currentPitch: 0,
        cooldownRemaining: 0,
        isOnline: true,
        isTracking: false,
      };

      shipTurrets.set(config.index, state);
    }

    this.turrets.set(shipId, shipTurrets);
  }

  /**
   * Remove turret tracking for a ship
   * @param shipId - Ship to remove
   */
  removeShipTurrets(shipId: ObjectId): void {
    const shipTurrets = this.turrets.get(shipId);
    if (shipTurrets) {
      // Remove all gunner assignments for this ship
      for (const [, state] of shipTurrets) {
        if (state.gunnerId !== 0n) {
          this.gunnerAssignments.delete(state.gunnerId);
        }
      }
      this.turrets.delete(shipId);
    }
  }

  // ============================================
  // Gunner Management
  // ============================================

  /**
   * Assign a gunner to a turret
   * @param shipId - Ship with the turret
   * @param gunnerId - Player/creature ID to assign
   * @param turretIndex - Turret index to assign to
   * @returns Whether assignment succeeded
   */
  assignGunnerToTurret(
    shipId: ObjectId,
    gunnerId: ObjectId,
    turretIndex: number
  ): boolean {
    const shipTurrets = this.turrets.get(shipId);
    if (!shipTurrets) {
      return false;
    }

    const turret = shipTurrets.get(turretIndex);
    if (!turret) {
      return false;
    }

    // Check if turret is already occupied
    if (turret.gunnerId !== 0n) {
      return false;
    }

    // Check if gunner is already assigned elsewhere
    const existingAssignment = this.gunnerAssignments.get(gunnerId);
    if (existingAssignment) {
      // Remove from current assignment
      this.removeGunnerFromTurret(existingAssignment.shipId, existingAssignment.turretIndex);
    }

    // Assign gunner
    turret.gunnerId = gunnerId;
    this.gunnerAssignments.set(gunnerId, { shipId, turretIndex });

    return true;
  }

  /**
   * Remove a gunner from a turret
   * @param shipId - Ship with the turret
   * @param turretIndex - Turret index to clear
   * @returns The removed gunner ID, or 0n if turret was empty
   */
  removeGunnerFromTurret(shipId: ObjectId, turretIndex: number): ObjectId {
    const shipTurrets = this.turrets.get(shipId);
    if (!shipTurrets) {
      return 0n as ObjectId;
    }

    const turret = shipTurrets.get(turretIndex);
    if (!turret || turret.gunnerId === 0n) {
      return 0n as ObjectId;
    }

    const gunnerId = turret.gunnerId;

    // Clear turret state
    turret.gunnerId = 0n as ObjectId;
    turret.targetId = 0n as ObjectId;
    turret.isTracking = false;

    // Remove from gunner assignments
    this.gunnerAssignments.delete(gunnerId);

    return gunnerId;
  }

  /**
   * Get gunner's current turret assignment
   * @param gunnerId - Gunner to look up
   * @returns Turret assignment or undefined
   */
  getGunnerTurret(gunnerId: ObjectId): { shipId: ObjectId; turretIndex: number } | undefined {
    return this.gunnerAssignments.get(gunnerId);
  }

  /**
   * Get the gunner assigned to a turret
   * @param shipId - Ship with the turret
   * @param turretIndex - Turret index
   * @returns Gunner ID or 0n if empty
   */
  getTurretGunner(shipId: ObjectId, turretIndex: number): ObjectId {
    const turret = this.getTurretState(shipId, turretIndex);
    return turret?.gunnerId ?? (0n as ObjectId);
  }

  // ============================================
  // Turret Firing
  // ============================================

  /**
   * Fire a turret at its current target
   * @param ship - The ship with the turret
   * @param turretIndex - Turret index to fire
   * @param weaponStats - Weapon stats for the turret
   * @returns Fire result
   */
  fireTurret(
    ship: ShipObject,
    turretIndex: number,
    weaponStats: SpaceWeaponStats
  ): TurretFireResult {
    const result: TurretFireResult = {
      success: false,
      projectileId: 0n,
      energyConsumed: 0,
      ammoConsumed: 0,
      errorMessage: '',
      inArc: false,
      currentYaw: 0,
      currentPitch: 0,
    };

    const turret = this.getTurretState(ship.objectId, turretIndex);
    if (!turret) {
      result.errorMessage = 'Turret not found';
      return result;
    }

    // Check if turret has a gunner
    if (turret.gunnerId === 0n) {
      result.errorMessage = 'No gunner assigned';
      return result;
    }

    // Check if turret is online
    if (!turret.isOnline) {
      result.errorMessage = 'Turret offline';
      return result;
    }

    // Check cooldown
    if (turret.cooldownRemaining > 0) {
      result.errorMessage = 'Turret on cooldown';
      return result;
    }

    // Check if there's a target
    if (turret.targetId === 0n) {
      result.errorMessage = 'No target';
      return result;
    }

    result.currentYaw = turret.currentYaw;
    result.currentPitch = turret.currentPitch;

    // Check if target is in firing arc
    // (This would need target position to fully calculate)
    result.inArc = this.isAngleInArc(
      turret.currentYaw,
      turret.currentPitch,
      turret.config.arc
    );

    if (!result.inArc) {
      result.errorMessage = 'Target outside firing arc';
      return result;
    }

    // Fire through combat manager
    const fireResult = this.combatManager.fireWeapon(
      ship,
      turret.config.weaponSlot,
      turret.targetId,
      weaponStats
    );

    // Copy fire result
    result.success = fireResult.success;
    result.projectileId = fireResult.projectileId;
    result.energyConsumed = fireResult.energyConsumed;
    result.ammoConsumed = fireResult.ammoConsumed;
    result.errorMessage = fireResult.errorMessage;

    // Set cooldown
    if (fireResult.success) {
      turret.cooldownRemaining = 1000 / weaponStats.refireRate;
    }

    return result;
  }

  /**
   * Set turret target
   * @param shipId - Ship with the turret
   * @param turretIndex - Turret index
   * @param targetId - Target to set
   */
  setTurretTarget(shipId: ObjectId, turretIndex: number, targetId: ObjectId): void {
    const turret = this.getTurretState(shipId, turretIndex);
    if (turret) {
      turret.targetId = targetId;
      turret.isTracking = targetId !== 0n;
    }
  }

  /**
   * Clear turret target
   * @param shipId - Ship with the turret
   * @param turretIndex - Turret index
   */
  clearTurretTarget(shipId: ObjectId, turretIndex: number): void {
    const turret = this.getTurretState(shipId, turretIndex);
    if (turret) {
      turret.targetId = 0n as ObjectId;
      turret.isTracking = false;
    }
  }

  // ============================================
  // Firing Arc Calculations
  // ============================================

  /**
   * Get the firing arcs for a turret
   * @param shipId - Ship with the turret
   * @param turretIndex - Turret index
   * @returns Turret arc or undefined
   */
  getTurretArcs(shipId: ObjectId, turretIndex: number): TurretArc | undefined {
    const turret = this.getTurretState(shipId, turretIndex);
    return turret?.config.arc;
  }

  /**
   * Check if a target position is within a turret's firing arc
   * @param shipId - Ship with the turret
   * @param turretIndex - Turret index
   * @param targetPosition - Target's world position
   * @param shipPosition - Ship's world position
   * @param shipHeading - Ship's heading in radians
   * @returns Whether target is in arc
   */
  isTargetInArc(
    shipId: ObjectId,
    turretIndex: number,
    targetPosition: Vector3,
    shipPosition: Vector3,
    shipHeading: number
  ): boolean {
    const turret = this.getTurretState(shipId, turretIndex);
    if (!turret) return false;

    // Calculate turret world position
    const turretWorldPos = this.getTurretWorldPosition(
      turret.config,
      shipPosition,
      shipHeading
    );

    // Calculate direction to target
    const toTarget = {
      x: targetPosition.x - turretWorldPos.x,
      y: targetPosition.y - turretWorldPos.y,
      z: targetPosition.z - turretWorldPos.z,
    };

    // Calculate angles to target
    const { yaw, pitch } = this.calculateAngles(toTarget, shipHeading, turret.config);

    // Check if angles are within arc
    return this.isAngleInArc(yaw, pitch, turret.config.arc);
  }

  /**
   * Calculate the angles to a target from turret perspective
   */
  private calculateAngles(
    direction: Vector3,
    shipHeading: number,
    config: TurretConfig
  ): { yaw: number; pitch: number } {
    // Calculate horizontal angle (yaw)
    const horizontalDist = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    let yaw = Math.atan2(direction.x, direction.z) * (180 / Math.PI);

    // Adjust for ship heading
    yaw -= shipHeading * (180 / Math.PI);

    // Adjust for turret facing
    yaw -= this.getFacingAngle(config.facing);

    // Normalize to -180 to 180
    while (yaw > 180) yaw -= 360;
    while (yaw < -180) yaw += 360;

    // Calculate vertical angle (pitch)
    const pitch = Math.atan2(direction.y, horizontalDist) * (180 / Math.PI);

    return { yaw, pitch };
  }

  /**
   * Get the base angle offset for a turret facing
   */
  private getFacingAngle(facing: TurretConfig['facing']): number {
    switch (facing) {
      case 'forward':
        return 0;
      case 'rear':
        return 180;
      case 'port':
        return -90;
      case 'starboard':
        return 90;
      case 'dorsal':
      case 'ventral':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Check if yaw/pitch angles are within a firing arc
   */
  private isAngleInArc(yaw: number, pitch: number, arc: TurretArc): boolean {
    // Check yaw
    let yawInArc: boolean;
    if (arc.yawMin <= arc.yawMax) {
      yawInArc = yaw >= arc.yawMin && yaw <= arc.yawMax;
    } else {
      // Arc wraps around (e.g., rear turret: 135 to -135)
      yawInArc = yaw >= arc.yawMin || yaw <= arc.yawMax;
    }

    // Check pitch
    const pitchInArc = pitch >= arc.pitchMin && pitch <= arc.pitchMax;

    return yawInArc && pitchInArc;
  }

  /**
   * Calculate turret world position from ship position
   */
  private getTurretWorldPosition(
    config: TurretConfig,
    shipPosition: Vector3,
    shipHeading: number
  ): Vector3 {
    // Rotate offset by ship heading
    const cos = Math.cos(shipHeading);
    const sin = Math.sin(shipHeading);

    return {
      x: shipPosition.x + config.offset.x * cos - config.offset.z * sin,
      y: shipPosition.y + config.offset.y,
      z: shipPosition.z + config.offset.x * sin + config.offset.z * cos,
    };
  }

  // ============================================
  // Turret Updates
  // ============================================

  /**
   * Update turret tracking for a ship
   * @param shipId - Ship to update
   * @param shipPosition - Ship's current position
   * @param shipHeading - Ship's current heading
   * @param deltaTime - Time step in ms
   * @param getTargetPosition - Function to get target position
   */
  updateTurretTracking(
    shipId: ObjectId,
    shipPosition: Vector3,
    shipHeading: number,
    deltaTime: number,
    getTargetPosition: (targetId: ObjectId) => Vector3 | undefined
  ): void {
    const shipTurrets = this.turrets.get(shipId);
    if (!shipTurrets) return;

    for (const [, turret] of shipTurrets) {
      // Update cooldown
      if (turret.cooldownRemaining > 0) {
        turret.cooldownRemaining = Math.max(0, turret.cooldownRemaining - deltaTime);
      }

      // Skip if not tracking
      if (!turret.isTracking || turret.targetId === 0n) continue;

      // Get target position
      const targetPosition = getTargetPosition(turret.targetId);
      if (!targetPosition) {
        turret.isTracking = false;
        continue;
      }

      // Calculate turret world position
      const turretWorldPos = this.getTurretWorldPosition(
        turret.config,
        shipPosition,
        shipHeading
      );

      // Calculate direction to target
      const toTarget = {
        x: targetPosition.x - turretWorldPos.x,
        y: targetPosition.y - turretWorldPos.y,
        z: targetPosition.z - turretWorldPos.z,
      };

      // Calculate target angles
      const { yaw: targetYaw, pitch: targetPitch } = this.calculateAngles(
        toTarget,
        shipHeading,
        turret.config
      );

      // Rotate turret toward target
      const maxRotation = turret.config.rotationSpeed * (deltaTime / 1000);

      // Update yaw
      let yawDiff = targetYaw - turret.currentYaw;
      while (yawDiff > 180) yawDiff -= 360;
      while (yawDiff < -180) yawDiff += 360;

      if (Math.abs(yawDiff) <= maxRotation) {
        turret.currentYaw = targetYaw;
      } else {
        turret.currentYaw += Math.sign(yawDiff) * maxRotation;
      }

      // Update pitch
      const pitchDiff = targetPitch - turret.currentPitch;
      if (Math.abs(pitchDiff) <= maxRotation) {
        turret.currentPitch = targetPitch;
      } else {
        turret.currentPitch += Math.sign(pitchDiff) * maxRotation;
      }

      // Clamp to arc limits
      turret.currentYaw = this.clampYawToArc(turret.currentYaw, turret.config.arc);
      turret.currentPitch = Math.max(
        turret.config.arc.pitchMin,
        Math.min(turret.config.arc.pitchMax, turret.currentPitch)
      );
    }
  }

  /**
   * Clamp yaw angle to arc limits
   */
  private clampYawToArc(yaw: number, arc: TurretArc): number {
    // Handle wrap-around arcs (e.g., rear turret)
    if (arc.yawMin > arc.yawMax) {
      // Arc wraps around
      if (yaw < arc.yawMax && yaw > arc.yawMin - 360) {
        return yaw;
      }
      if (yaw > arc.yawMin || yaw < arc.yawMax) {
        return yaw;
      }
      // Clamp to nearest edge
      const distToMin = Math.abs(yaw - arc.yawMin);
      const distToMax = Math.abs(yaw - arc.yawMax);
      return distToMin < distToMax ? arc.yawMin : arc.yawMax;
    } else {
      return Math.max(arc.yawMin, Math.min(arc.yawMax, yaw));
    }
  }

  // ============================================
  // Turret State
  // ============================================

  /**
   * Get turret state
   * @param shipId - Ship with the turret
   * @param turretIndex - Turret index
   * @returns Turret state or undefined
   */
  getTurretState(shipId: ObjectId, turretIndex: number): TurretState | undefined {
    const shipTurrets = this.turrets.get(shipId);
    return shipTurrets?.get(turretIndex);
  }

  /**
   * Get all turret states for a ship
   * @param shipId - Ship to query
   * @returns Map of turret states or undefined
   */
  getShipTurrets(shipId: ObjectId): Map<number, TurretState> | undefined {
    return this.turrets.get(shipId);
  }

  /**
   * Set turret online status
   * @param shipId - Ship with the turret
   * @param turretIndex - Turret index
   * @param online - Whether turret is online
   */
  setTurretOnline(shipId: ObjectId, turretIndex: number, online: boolean): void {
    const turret = this.getTurretState(shipId, turretIndex);
    if (turret) {
      turret.isOnline = online;
      if (!online) {
        turret.isTracking = false;
      }
    }
  }

  /**
   * Get count of manned turrets for a ship
   * @param shipId - Ship to check
   * @returns Number of turrets with gunners
   */
  getMannedTurretCount(shipId: ObjectId): number {
    const shipTurrets = this.turrets.get(shipId);
    if (!shipTurrets) return 0;

    let count = 0;
    for (const [, turret] of shipTurrets) {
      if (turret.gunnerId !== 0n) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get total turret count for a ship
   * @param shipId - Ship to check
   * @returns Total number of turrets
   */
  getTurretCount(shipId: ObjectId): number {
    const shipTurrets = this.turrets.get(shipId);
    return shipTurrets?.size ?? 0;
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a new Turret Controller
 * @param combatManager - Space combat manager
 * @returns New Turret Controller instance
 */
export function createTurretController(
  combatManager: SpaceCombatManager
): TurretController {
  return new TurretController(combatManager);
}

/**
 * Create a turret configuration
 * @param index - Turret index
 * @param weaponSlot - Weapon slot
 * @param facing - Turret facing direction
 * @param offset - Offset from ship center
 * @param customArc - Custom firing arc (uses default for facing if not provided)
 * @returns Turret configuration
 */
export function createTurretConfig(
  index: number,
  weaponSlot: number,
  facing: TurretConfig['facing'],
  offset: Vector3,
  customArc?: TurretArc
): TurretConfig {
  return {
    index,
    weaponSlot,
    arc: customArc ?? DEFAULT_TURRET_ARCS[facing],
    rotationSpeed: 90, // 90 degrees per second default
    offset,
    facing,
  };
}

/**
 * Create turret configurations for a YT-1300 (Millennium Falcon style)
 */
export function createYT1300TurretConfigs(): TurretConfig[] {
  return [
    createTurretConfig(0, 10, 'dorsal', { x: 0, y: 5, z: 0 }),
    createTurretConfig(1, 11, 'ventral', { x: 0, y: -5, z: 0 }),
  ];
}

/**
 * Create turret configurations for an ARC-170
 */
export function createARC170TurretConfigs(): TurretConfig[] {
  return [
    createTurretConfig(0, 10, 'rear', { x: 0, y: 0, z: -10 }),
  ];
}
