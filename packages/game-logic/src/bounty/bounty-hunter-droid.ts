/**
 * Bounty Hunter Droid
 * Seeker and probe droid behavior for bounty hunting
 *
 * Handles:
 * - Seeker droid object behavior and tracking
 * - Probe droid area scanning
 * - Droid state management
 * - Target tracking mechanics
 * - Droid recall and redeployment
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  BountyDroidType,
  DroidState,
  BountyResultCode,
  SEEKER_DROID_MAX_RANGE,
  SEEKER_DROID_COOLDOWN_MS,
  type BountyOperationResult,
  type DroidTrackingResult,
  type AreaScanResult,
} from './bounty-types.js';

// ============================================
// Configuration
// ============================================

/**
 * Droid configuration
 */
export interface BountyDroidConfig {
  /** Enable detailed logging */
  enableLogging: boolean;
  /** Seeker droid maximum tracking range */
  seekerMaxRange: number;
  /** Seeker droid movement speed (meters per second) */
  seekerMoveSpeed: number;
  /** Seeker droid tracking update interval (ms) */
  seekerUpdateInterval: number;
  /** Seeker droid lifespan when deployed (ms) */
  seekerLifespan: number;
  /** Probe droid scan radius */
  probeScanRadius: number;
  /** Probe droid scan duration (ms) */
  probeScanDuration: number;
  /** Probe droid hover height */
  probeHoverHeight: number;
  /** Droid health points */
  droidHealth: number;
  /** Droid can be destroyed by targets */
  droidDestructible: boolean;
}

/**
 * Default droid configuration
 */
export const DEFAULT_DROID_CONFIG: BountyDroidConfig = {
  enableLogging: false,
  seekerMaxRange: SEEKER_DROID_MAX_RANGE,
  seekerMoveSpeed: 15,
  seekerUpdateInterval: 2000,
  seekerLifespan: 5 * 60 * 1000,
  probeScanRadius: 200,
  probeScanDuration: 10000,
  probeHoverHeight: 10,
  droidHealth: 500,
  droidDestructible: true,
};

// ============================================
// Interfaces
// ============================================

/**
 * Droid instance data
 */
export interface BountyDroid {
  /** Unique droid identifier */
  droidId: ObjectId;
  /** Type of droid */
  droidType: BountyDroidType;
  /** Owner hunter ID */
  ownerId: ObjectId;
  /** Current state */
  state: DroidState;
  /** Current position */
  position: Vector3;
  /** Current zone */
  zone: string;
  /** Target being tracked (for seeker) */
  targetId: ObjectId | null;
  /** Target mission ID */
  missionId: bigint | null;
  /** Deployment timestamp */
  deployedAt: Date | null;
  /** Current health */
  health: number;
  /** Maximum health */
  maxHealth: number;
  /** Last update timestamp */
  lastUpdate: Date;
}

/**
 * Droid update result
 */
export interface DroidUpdateResult {
  /** Updated droid state */
  droid: BountyDroid;
  /** Whether target was found */
  targetFound: boolean;
  /** Target position if found */
  targetPosition?: Vector3;
  /** Distance to target */
  targetDistance?: number;
  /** Direction to target (heading) */
  targetHeading?: number;
  /** Whether droid completed its task */
  taskComplete: boolean;
  /** Message for the owner */
  message?: string;
}

/**
 * Service interface for target position lookups
 */
export interface DroidTargetService {
  /** Get target's current position */
  getTargetPosition(targetId: ObjectId): Promise<{ position: Vector3; zone: string } | undefined>;

  /** Check if target is online */
  isTargetOnline(targetId: ObjectId): Promise<boolean>;

  /** Get targets in area for probe scan */
  getTargetsInArea(center: Vector3, radius: number, zone: string): Promise<Array<{
    id: ObjectId;
    name: string;
    position: Vector3;
  }>>;
}

// ============================================
// Bounty Hunter Droid Manager Class
// ============================================

/**
 * Bounty Hunter Droid Manager
 * Manages seeker and probe droid instances
 */
export class BountyHunterDroidManager {
  private config: BountyDroidConfig;
  private targetService: DroidTargetService;

  /** Active droids by droid ID */
  private activeDroids: Map<ObjectId, BountyDroid> = new Map();

  /** Droids by owner ID */
  private droidsByOwner: Map<ObjectId, Set<ObjectId>> = new Map();

  /** ID generator function */
  private generateId: () => ObjectId;

  /**
   * Create a new Bounty Hunter Droid Manager
   * @param targetService - Service for target position lookups
   * @param config - Optional configuration overrides
   * @param idGenerator - Function to generate unique IDs
   */
  constructor(
    targetService: DroidTargetService,
    config: Partial<BountyDroidConfig> = {},
    idGenerator?: () => ObjectId
  ) {
    this.targetService = targetService;
    this.config = { ...DEFAULT_DROID_CONFIG, ...config };
    this.generateId = idGenerator ?? (() => BigInt(Date.now()) as ObjectId);
  }

  // ============================================
  // Seeker Droid Operations
  // ============================================

  /**
   * Deploy a seeker droid to track a target
   * @param ownerId - Hunter who owns the droid
   * @param ownerPosition - Hunter's current position
   * @param ownerZone - Hunter's current zone
   * @param targetId - Target to track
   * @param missionId - Associated mission ID
   * @returns The deployed droid or error
   */
  async deploySeekerDroid(
    ownerId: ObjectId,
    ownerPosition: Vector3,
    ownerZone: string,
    targetId: ObjectId,
    missionId: bigint
  ): Promise<BountyOperationResult & { droid?: BountyDroid }> {
    // Check if owner already has an active droid
    const ownerDroids = this.droidsByOwner.get(ownerId);
    if (ownerDroids && ownerDroids.size > 0) {
      return {
        success: false,
        resultCode: BountyResultCode.DroidOnCooldown,
        errorMessage: 'Already have an active droid deployed',
      };
    }

    // Create droid
    const droidId = this.generateId();
    const droid: BountyDroid = {
      droidId,
      droidType: BountyDroidType.SEEKER,
      ownerId,
      state: DroidState.TRACKING,
      position: { ...ownerPosition },
      zone: ownerZone,
      targetId,
      missionId,
      deployedAt: new Date(),
      health: this.config.droidHealth,
      maxHealth: this.config.droidHealth,
      lastUpdate: new Date(),
    };

    // Register droid
    this.activeDroids.set(droidId, droid);
    if (!this.droidsByOwner.has(ownerId)) {
      this.droidsByOwner.set(ownerId, new Set());
    }
    this.droidsByOwner.get(ownerId)!.add(droidId);

    if (this.config.enableLogging) {
      console.log(
        `[BountyHunterDroid] Seeker droid ${droidId} deployed by ${ownerId} to track ${targetId}`
      );
    }

    return {
      success: true,
      resultCode: BountyResultCode.Success,
      droid,
    };
  }

  /**
   * Update a seeker droid's tracking state
   * @param droidId - The droid to update
   * @returns Update result
   */
  async updateSeekerDroid(droidId: ObjectId): Promise<DroidUpdateResult | null> {
    const droid = this.activeDroids.get(droidId);
    if (!droid || droid.droidType !== BountyDroidType.SEEKER) {
      return null;
    }

    if (droid.state !== DroidState.TRACKING) {
      return {
        droid,
        targetFound: false,
        taskComplete: droid.state === DroidState.RETURNING || droid.state === DroidState.DESTROYED,
        message: `Droid is ${DroidState[droid.state].toLowerCase()}`,
      };
    }

    // Check lifespan
    if (droid.deployedAt) {
      const age = Date.now() - droid.deployedAt.getTime();
      if (age > this.config.seekerLifespan) {
        droid.state = DroidState.RETURNING;
        return {
          droid,
          targetFound: false,
          taskComplete: true,
          message: 'Droid lifespan expired, returning',
        };
      }
    }

    if (!droid.targetId) {
      return {
        droid,
        targetFound: false,
        taskComplete: false,
        message: 'No target assigned',
      };
    }

    // Get target position
    const targetPos = await this.targetService.getTargetPosition(droid.targetId);
    if (!targetPos) {
      return {
        droid,
        targetFound: false,
        taskComplete: false,
        message: 'Target not found or offline',
      };
    }

    // Check zone
    if (targetPos.zone !== droid.zone) {
      return {
        droid,
        targetFound: false,
        taskComplete: false,
        message: 'Target has left the area',
      };
    }

    // Calculate distance and heading
    const dx = targetPos.position.x - droid.position.x;
    const dz = targetPos.position.z - droid.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const heading = ((Math.atan2(dx, dz) * 180) / Math.PI + 360) % 360;

    // Move droid towards target
    if (distance > 5) {
      const moveDistance = Math.min(
        this.config.seekerMoveSpeed * (this.config.seekerUpdateInterval / 1000),
        distance
      );
      const normalizedDx = dx / distance;
      const normalizedDz = dz / distance;

      droid.position = {
        x: droid.position.x + normalizedDx * moveDistance,
        y: targetPos.position.y, // Match target height
        z: droid.position.z + normalizedDz * moveDistance,
      };
    }

    droid.lastUpdate = new Date();

    // Check if within range to report
    const targetFound = distance <= this.config.seekerMaxRange;

    if (this.config.enableLogging) {
      console.log(
        `[BountyHunterDroid] Seeker ${droidId} tracking: distance=${distance.toFixed(0)}m, heading=${heading.toFixed(0)}`
      );
    }

    return {
      droid,
      targetFound,
      targetPosition: targetPos.position,
      targetDistance: Math.round(distance),
      targetHeading: Math.round(heading),
      taskComplete: false,
      message: targetFound
        ? `Target located at ${Math.round(distance)}m, heading ${Math.round(heading)}`
        : `Tracking... ${Math.round(distance)}m away`,
    };
  }

  // ============================================
  // Probe Droid Operations
  // ============================================

  /**
   * Deploy a probe droid to scan an area
   * @param ownerId - Hunter who owns the droid
   * @param scanCenter - Center of scan area
   * @param zone - Zone to scan
   * @param missionId - Optional associated mission ID
   * @returns The deployed droid or error
   */
  async deployProbeDroid(
    ownerId: ObjectId,
    scanCenter: Vector3,
    zone: string,
    missionId?: bigint
  ): Promise<BountyOperationResult & { droid?: BountyDroid }> {
    // Check if owner already has an active droid
    const ownerDroids = this.droidsByOwner.get(ownerId);
    if (ownerDroids && ownerDroids.size > 0) {
      return {
        success: false,
        resultCode: BountyResultCode.DroidOnCooldown,
        errorMessage: 'Already have an active droid deployed',
      };
    }

    // Create droid
    const droidId = this.generateId();
    const droid: BountyDroid = {
      droidId,
      droidType: BountyDroidType.PROBE,
      ownerId,
      state: DroidState.SCANNING,
      position: {
        x: scanCenter.x,
        y: scanCenter.y + this.config.probeHoverHeight,
        z: scanCenter.z,
      },
      zone,
      targetId: null,
      missionId: missionId ?? null,
      deployedAt: new Date(),
      health: this.config.droidHealth,
      maxHealth: this.config.droidHealth,
      lastUpdate: new Date(),
    };

    // Register droid
    this.activeDroids.set(droidId, droid);
    if (!this.droidsByOwner.has(ownerId)) {
      this.droidsByOwner.set(ownerId, new Set());
    }
    this.droidsByOwner.get(ownerId)!.add(droidId);

    if (this.config.enableLogging) {
      console.log(
        `[BountyHunterDroid] Probe droid ${droidId} deployed by ${ownerId} at ${zone}`
      );
    }

    return {
      success: true,
      resultCode: BountyResultCode.Success,
      droid,
    };
  }

  /**
   * Complete a probe droid scan and get results
   * @param droidId - The droid to complete scan
   * @param bountyTargetId - Optional target ID to mark as bounty
   * @returns Scan results
   */
  async completeProbeScan(
    droidId: ObjectId,
    bountyTargetId?: ObjectId
  ): Promise<AreaScanResult | null> {
    const droid = this.activeDroids.get(droidId);
    if (!droid || droid.droidType !== BountyDroidType.PROBE) {
      return null;
    }

    if (droid.state !== DroidState.SCANNING) {
      return {
        success: false,
        scanCenter: droid.position,
        scanRadius: this.config.probeScanRadius,
        detectedTargets: [],
        errorMessage: 'Droid is not scanning',
      };
    }

    // Get targets in area
    const targets = await this.targetService.getTargetsInArea(
      droid.position,
      this.config.probeScanRadius,
      droid.zone
    );

    // Convert to detected targets
    const detectedTargets = targets.map((t) => {
      const dx = t.position.x - droid.position.x;
      const dz = t.position.z - droid.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      const signalStrength = Math.max(0.3, 1.0 - distance / this.config.probeScanRadius);

      return {
        targetId: t.id,
        name: t.name,
        position: t.position,
        signalStrength,
        isBountyMark: t.id === bountyTargetId,
      };
    });

    // Mark droid as returning
    droid.state = DroidState.RETURNING;
    droid.lastUpdate = new Date();

    if (this.config.enableLogging) {
      console.log(
        `[BountyHunterDroid] Probe ${droidId} scan complete: ${detectedTargets.length} targets found`
      );
    }

    return {
      success: true,
      scanCenter: droid.position,
      scanRadius: this.config.probeScanRadius,
      detectedTargets,
    };
  }

  // ============================================
  // Droid Management
  // ============================================

  /**
   * Recall a droid to its owner
   * @param droidId - The droid to recall
   * @param ownerId - The owner requesting recall
   * @returns Whether recall was initiated
   */
  recallDroid(droidId: ObjectId, ownerId: ObjectId): boolean {
    const droid = this.activeDroids.get(droidId);
    if (!droid) {
      return false;
    }

    if (droid.ownerId !== ownerId) {
      return false;
    }

    if (droid.state === DroidState.DESTROYED) {
      return false;
    }

    droid.state = DroidState.RETURNING;
    droid.lastUpdate = new Date();

    if (this.config.enableLogging) {
      console.log(`[BountyHunterDroid] Droid ${droidId} recalled by ${ownerId}`);
    }

    return true;
  }

  /**
   * Complete droid return and deactivate
   * @param droidId - The droid that returned
   * @returns Whether deactivation succeeded
   */
  completeDroidReturn(droidId: ObjectId): boolean {
    const droid = this.activeDroids.get(droidId);
    if (!droid) {
      return false;
    }

    droid.state = DroidState.INACTIVE;

    // Remove from active tracking
    this.activeDroids.delete(droidId);
    const ownerDroids = this.droidsByOwner.get(droid.ownerId);
    if (ownerDroids) {
      ownerDroids.delete(droidId);
      if (ownerDroids.size === 0) {
        this.droidsByOwner.delete(droid.ownerId);
      }
    }

    if (this.config.enableLogging) {
      console.log(`[BountyHunterDroid] Droid ${droidId} deactivated`);
    }

    return true;
  }

  /**
   * Damage a droid (can be destroyed by targets)
   * @param droidId - The droid to damage
   * @param damage - Amount of damage
   * @returns Whether droid was destroyed
   */
  damageDroid(droidId: ObjectId, damage: number): boolean {
    if (!this.config.droidDestructible) {
      return false;
    }

    const droid = this.activeDroids.get(droidId);
    if (!droid) {
      return false;
    }

    if (droid.state === DroidState.DESTROYED || droid.state === DroidState.INACTIVE) {
      return false;
    }

    droid.health -= damage;
    droid.lastUpdate = new Date();

    if (droid.health <= 0) {
      droid.health = 0;
      droid.state = DroidState.DESTROYED;

      if (this.config.enableLogging) {
        console.log(`[BountyHunterDroid] Droid ${droidId} was destroyed`);
      }

      return true;
    }

    return false;
  }

  /**
   * Get a droid by ID
   * @param droidId - The droid ID
   * @returns The droid or undefined
   */
  getDroid(droidId: ObjectId): BountyDroid | undefined {
    return this.activeDroids.get(droidId);
  }

  /**
   * Get all active droids for an owner
   * @param ownerId - The owner ID
   * @returns Array of active droids
   */
  getOwnerDroids(ownerId: ObjectId): BountyDroid[] {
    const droidIds = this.droidsByOwner.get(ownerId);
    if (!droidIds) {
      return [];
    }

    const droids: BountyDroid[] = [];
    for (const droidId of droidIds) {
      const droid = this.activeDroids.get(droidId);
      if (droid) {
        droids.push(droid);
      }
    }

    return droids;
  }

  /**
   * Check if owner has an active droid
   * @param ownerId - The owner ID
   * @returns Whether owner has active droid
   */
  hasActiveDroid(ownerId: ObjectId): boolean {
    const droidIds = this.droidsByOwner.get(ownerId);
    return droidIds !== undefined && droidIds.size > 0;
  }

  // ============================================
  // Tick Processing
  // ============================================

  /**
   * Process all active droids
   * Should be called periodically
   * @returns Array of update results
   */
  async tick(): Promise<DroidUpdateResult[]> {
    const results: DroidUpdateResult[] = [];
    const droidsToRemove: ObjectId[] = [];

    for (const [droidId, droid] of this.activeDroids) {
      // Check for expired/returned droids
      if (droid.state === DroidState.DESTROYED || droid.state === DroidState.INACTIVE) {
        droidsToRemove.push(droidId);
        continue;
      }

      // Process based on droid type
      if (droid.droidType === BountyDroidType.SEEKER && droid.state === DroidState.TRACKING) {
        const result = await this.updateSeekerDroid(droidId);
        if (result) {
          results.push(result);

          // Check if task complete
          if (result.taskComplete) {
            droidsToRemove.push(droidId);
          }
        }
      }

      // Probe droids auto-complete after scan duration
      if (droid.droidType === BountyDroidType.PROBE && droid.state === DroidState.SCANNING) {
        if (droid.deployedAt) {
          const age = Date.now() - droid.deployedAt.getTime();
          if (age > this.config.probeScanDuration) {
            droid.state = DroidState.RETURNING;
          }
        }
      }

      // Returning droids auto-deactivate after a delay
      if (droid.state === DroidState.RETURNING) {
        const returnTime = Date.now() - droid.lastUpdate.getTime();
        if (returnTime > 10000) {
          // 10 second return time
          droidsToRemove.push(droidId);
        }
      }
    }

    // Clean up completed droids
    for (const droidId of droidsToRemove) {
      this.completeDroidReturn(droidId);
    }

    return results;
  }

  /**
   * Get count of active droids
   * @returns Number of active droids
   */
  getActiveDroidCount(): number {
    return this.activeDroids.size;
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Bounty Hunter Droid Manager instance
 * @param targetService - Service for target position lookups
 * @param config - Optional configuration overrides
 * @param idGenerator - Function to generate unique IDs
 * @returns New Bounty Hunter Droid Manager instance
 */
export function createBountyHunterDroidManager(
  targetService: DroidTargetService,
  config?: Partial<BountyDroidConfig>,
  idGenerator?: () => ObjectId
): BountyHunterDroidManager {
  return new BountyHunterDroidManager(targetService, config, idGenerator);
}
