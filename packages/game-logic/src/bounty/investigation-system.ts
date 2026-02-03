/**
 * Investigation System
 * Clue discovery and target tracking for bounty hunters
 *
 * Handles:
 * - Clue discovery mechanics
 * - Information broker interactions
 * - Location triangulation from multiple clues
 * - Seeker droid deployment and tracking
 * - Investigation costs and cooldowns
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  InvestigationClueType,
  BountyResultCode,
  SEEKER_DROID_COOLDOWN_MS,
  SEEKER_DROID_MAX_RANGE,
  CLUE_ACCURACY_DECAY_RATE,
  MIN_CLUE_ACCURACY,
  INFO_BROKER_BASE_COST,
  type InvestigationClue,
  type BountyMission,
  type BountyTarget,
  type InformationBroker,
  type BountyOperationResult,
  type LocationClueData,
  type AliasClueData,
  type ActivityClueData,
  type AssociateClueData,
  type DroidTrackingResult,
  type AreaScanResult,
  type DetectedTarget,
} from './bounty-types.js';
import type { BountyRepository, BountyCreditService } from './bounty-manager.js';

// ============================================
// Configuration
// ============================================

/**
 * Investigation system configuration
 */
export interface InvestigationConfig {
  /** Enable detailed logging */
  enableLogging: boolean;
  /** Base cost for broker consultation */
  brokerBaseCost: bigint;
  /** Cost multiplier per target level */
  costPerLevel: bigint;
  /** Cost multiplier per target visibility */
  costPerVisibility: bigint;
  /** Base accuracy for location clues */
  baseLocationAccuracy: number;
  /** Cooldown between broker consultations in ms */
  brokerCooldownMs: number;
  /** Seeker droid cooldown in ms */
  seekerDroidCooldownMs: number;
  /** Probe droid cooldown in ms */
  probeDroidCooldownMs: number;
  /** Maximum range for seeker droid */
  seekerDroidMaxRange: number;
  /** Probe droid scan radius */
  probeDroidScanRadius: number;
}

/**
 * Default investigation configuration
 */
export const DEFAULT_INVESTIGATION_CONFIG: InvestigationConfig = {
  enableLogging: false,
  brokerBaseCost: BigInt(INFO_BROKER_BASE_COST),
  costPerLevel: 100n,
  costPerVisibility: 50n,
  baseLocationAccuracy: 0.7,
  brokerCooldownMs: 5 * 60 * 1000,
  seekerDroidCooldownMs: SEEKER_DROID_COOLDOWN_MS,
  probeDroidCooldownMs: 10 * 60 * 1000,
  seekerDroidMaxRange: SEEKER_DROID_MAX_RANGE,
  probeDroidScanRadius: 200,
};

// ============================================
// Service Interfaces
// ============================================

/**
 * Service interface for getting target information
 */
export interface TargetInfoService {
  /** Get target's current position */
  getTargetPosition(targetId: ObjectId): Promise<{ position: Vector3; zone: string } | undefined>;

  /** Get target's character name */
  getTargetName(targetId: ObjectId): Promise<string | undefined>;

  /** Get target's species */
  getTargetSpecies(targetId: ObjectId): Promise<string | undefined>;

  /** Check if target is online */
  isTargetOnline(targetId: ObjectId): Promise<boolean>;

  /** Get target's guild members */
  getTargetAssociates(targetId: ObjectId): Promise<Array<{ id: ObjectId; name: string }>>;

  /** Get targets in area */
  getTargetsInArea(center: Vector3, radius: number, zone: string): Promise<Array<{ id: ObjectId; name: string; position: Vector3 }>>;
}

// ============================================
// Investigation System Class
// ============================================

/**
 * Investigation System
 * Handles clue gathering and target tracking for bounty hunters
 */
export class InvestigationSystem {
  private repository: BountyRepository;
  private creditService: BountyCreditService;
  private targetService: TargetInfoService;
  private config: InvestigationConfig;

  /** Broker consultation cooldowns (hunterId -> Map<brokerId, timestamp>) */
  private brokerCooldowns: Map<ObjectId, Map<ObjectId, number>> = new Map();

  /** Droid deployment cooldowns (hunterId -> timestamp) */
  private droidCooldowns: Map<ObjectId, number> = new Map();

  /**
   * Create a new Investigation System
   * @param repository - Bounty repository for data persistence
   * @param creditService - Service for credit operations
   * @param targetService - Service for getting target information
   * @param config - Optional configuration overrides
   */
  constructor(
    repository: BountyRepository,
    creditService: BountyCreditService,
    targetService: TargetInfoService,
    config: Partial<InvestigationConfig> = {}
  ) {
    this.repository = repository;
    this.creditService = creditService;
    this.targetService = targetService;
    this.config = { ...DEFAULT_INVESTIGATION_CONFIG, ...config };
  }

  // ============================================
  // Information Broker Interactions
  // ============================================

  /**
   * Consult an information broker for clues about a target
   * @param hunterId - The hunter object ID
   * @param brokerId - The broker NPC object ID
   * @param missionId - The mission ID
   * @param clueType - Type of clue to request
   * @returns Operation result with clue if successful
   */
  async consultBroker(
    hunterId: ObjectId,
    brokerId: ObjectId,
    missionId: bigint,
    clueType: InvestigationClueType
  ): Promise<BountyOperationResult & { clue?: InvestigationClue }> {
    // Check broker cooldown
    if (this.isBrokerOnCooldown(hunterId, brokerId)) {
      return {
        success: false,
        resultCode: BountyResultCode.DroidOnCooldown,
        errorMessage: 'Broker consultation on cooldown',
      };
    }

    // Get mission
    const mission = await this.repository.getMissionById(missionId);
    if (!mission) {
      return {
        success: false,
        resultCode: BountyResultCode.MissionNotFound,
        errorMessage: 'Mission not found',
      };
    }

    // Verify mission belongs to hunter
    if (mission.hunterId !== hunterId) {
      return {
        success: false,
        resultCode: BountyResultCode.NotAuthorized,
        errorMessage: 'Not your mission',
      };
    }

    // Get target
    const target = await this.repository.getTarget(mission.targetId);
    if (!target) {
      return {
        success: false,
        resultCode: BountyResultCode.TargetNotFound,
        errorMessage: 'Target not found',
      };
    }

    // Calculate cost
    const cost = this.calculateBrokerCost(target, clueType);

    // Check hunter has credits
    const hasCredits = await this.creditService.hasCredits(hunterId, cost);
    if (!hasCredits) {
      return {
        success: false,
        resultCode: BountyResultCode.InsufficientFunds,
        errorMessage: `Insufficient credits. Cost: ${cost}`,
      };
    }

    // Deduct credits
    const deducted = await this.creditService.deductCredits(hunterId, cost);
    if (!deducted) {
      return {
        success: false,
        resultCode: BountyResultCode.ServerError,
        errorMessage: 'Failed to deduct credits',
      };
    }

    // Generate clue
    const clue = await this.generateClue(target, clueType, cost, `broker_${brokerId}`);

    // Add clue to mission
    await this.repository.addClueToMission(missionId, clue);

    // Set cooldown
    this.setBrokerCooldown(hunterId, brokerId);

    if (this.config.enableLogging) {
      console.log(
        `[InvestigationSystem] Hunter ${hunterId} consulted broker ${brokerId} for clue type ${clueType}`
      );
    }

    return {
      success: true,
      resultCode: BountyResultCode.Success,
      missionId,
      clue,
    };
  }

  /**
   * Calculate broker consultation cost
   * @param target - The bounty target
   * @param clueType - Type of clue requested
   * @returns Cost in credits
   */
  calculateBrokerCost(target: BountyTarget, clueType: InvestigationClueType): bigint {
    let cost = this.config.brokerBaseCost;

    // Level modifier
    cost = cost + this.config.costPerLevel * BigInt(target.level);

    // Visibility modifier (for Jedi)
    if (target.jediVisibility > 0) {
      cost = cost + this.config.costPerVisibility * BigInt(target.jediVisibility);
    }

    // Clue type modifier
    switch (clueType) {
      case InvestigationClueType.LOCATION:
        cost = (cost * 150n) / 100n; // Location clues are most expensive
        break;
      case InvestigationClueType.ALIAS:
        cost = (cost * 80n) / 100n;
        break;
      case InvestigationClueType.ACTIVITY:
        cost = (cost * 100n) / 100n;
        break;
      case InvestigationClueType.ASSOCIATE:
        cost = (cost * 120n) / 100n;
        break;
    }

    return cost;
  }

  /**
   * Check if broker is on cooldown for hunter
   */
  private isBrokerOnCooldown(hunterId: ObjectId, brokerId: ObjectId): boolean {
    const hunterCooldowns = this.brokerCooldowns.get(hunterId);
    if (!hunterCooldowns) {
      return false;
    }

    const cooldownEnd = hunterCooldowns.get(brokerId);
    if (!cooldownEnd) {
      return false;
    }

    return Date.now() < cooldownEnd;
  }

  /**
   * Set broker cooldown for hunter
   */
  private setBrokerCooldown(hunterId: ObjectId, brokerId: ObjectId): void {
    let hunterCooldowns = this.brokerCooldowns.get(hunterId);
    if (!hunterCooldowns) {
      hunterCooldowns = new Map();
      this.brokerCooldowns.set(hunterId, hunterCooldowns);
    }

    hunterCooldowns.set(brokerId, Date.now() + this.config.brokerCooldownMs);
  }

  // ============================================
  // Clue Generation
  // ============================================

  /**
   * Generate a clue based on type and target
   * @param target - The bounty target
   * @param clueType - Type of clue to generate
   * @param cost - Cost paid for the clue
   * @param source - Source of the clue
   * @returns Generated clue
   */
  private async generateClue(
    target: BountyTarget,
    clueType: InvestigationClueType,
    cost: bigint,
    source: string
  ): Promise<InvestigationClue> {
    let data;
    let accuracy = this.config.baseLocationAccuracy;

    // Higher level targets give less accurate clues
    accuracy -= target.level * 0.005;
    accuracy = Math.max(MIN_CLUE_ACCURACY, accuracy);

    switch (clueType) {
      case InvestigationClueType.LOCATION:
        data = await this.generateLocationClue(target, accuracy);
        break;
      case InvestigationClueType.ALIAS:
        data = await this.generateAliasClue(target);
        accuracy = 1.0; // Alias info is accurate
        break;
      case InvestigationClueType.ACTIVITY:
        data = await this.generateActivityClue(target);
        break;
      case InvestigationClueType.ASSOCIATE:
        data = await this.generateAssociateClue(target);
        accuracy = 0.9;
        break;
      default:
        data = await this.generateLocationClue(target, accuracy);
    }

    return {
      type: clueType,
      data,
      accuracy,
      cost,
      obtainedAt: new Date(),
      source,
    };
  }

  /**
   * Generate a location clue
   */
  private async generateLocationClue(
    target: BountyTarget,
    accuracy: number
  ): Promise<LocationClueData> {
    // Get actual position if target is online
    const currentPos = await this.targetService.getTargetPosition(target.characterId);

    let position: Vector3;
    let zone: string;

    if (currentPos) {
      // Add error based on accuracy
      const errorRadius = (1 - accuracy) * 500; // Up to 500m error at 0% accuracy
      position = this.addPositionError(currentPos.position, errorRadius);
      zone = currentPos.zone;
    } else {
      // Use last known location
      position = this.addPositionError(target.lastKnownLocation, 200);
      zone = target.lastKnownZone;
    }

    const uncertaintyRadius = Math.round((1 - accuracy) * 500);

    return {
      type: 'location',
      zone,
      position,
      seenAt: new Date(),
      uncertaintyRadius,
    };
  }

  /**
   * Generate an alias clue
   */
  private async generateAliasClue(target: BountyTarget): Promise<AliasClueData> {
    const species = (await this.targetService.getTargetSpecies(target.characterId)) ?? 'Unknown';

    return {
      type: 'alias',
      alias: target.name,
      description: this.generateAppearanceDescription(target),
      species,
    };
  }

  /**
   * Generate an activity clue
   */
  private async generateActivityClue(target: BountyTarget): Promise<ActivityClueData> {
    const activities = [
      'Seen training in the wilderness',
      'Spotted near a cantina',
      'Observed conducting business at a bazaar',
      'Reported meditating in a secluded area',
      'Witnessed in combat with local fauna',
      'Seen traveling between starports',
    ];

    const activity = activities[Math.floor(Math.random() * activities.length)];
    const frequencies = ['daily', 'frequently', 'occasionally', 'rarely'];
    const frequency = frequencies[Math.floor(Math.random() * frequencies.length)];

    return {
      type: 'activity',
      activity,
      zone: target.lastKnownZone,
      timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      frequency,
    };
  }

  /**
   * Generate an associate clue
   */
  private async generateAssociateClue(target: BountyTarget): Promise<AssociateClueData> {
    const associates = await this.targetService.getTargetAssociates(target.characterId);

    if (associates.length > 0) {
      const associate = associates[Math.floor(Math.random() * associates.length)];
      const relationships = ['guild member', 'friend', 'business partner', 'traveling companion'];
      const relationship = relationships[Math.floor(Math.random() * relationships.length)];

      return {
        type: 'associate',
        associateName: associate.name,
        associateId: associate.id,
        relationship,
        location: target.lastKnownZone,
      };
    }

    // No known associates
    return {
      type: 'associate',
      associateName: 'Unknown associate',
      associateId: null,
      relationship: 'unknown',
      location: target.lastKnownZone,
    };
  }

  /**
   * Generate a basic appearance description
   */
  private generateAppearanceDescription(target: BountyTarget): string {
    const descriptors = [
      'armed and dangerous',
      'known to be cautious',
      'often travels alone',
      'carries distinctive equipment',
      'has a recognizable stance',
    ];

    return descriptors[Math.floor(Math.random() * descriptors.length)];
  }

  /**
   * Add random error to a position
   */
  private addPositionError(position: Vector3, maxError: number): Vector3 {
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * maxError;

    return {
      x: position.x + Math.cos(angle) * distance,
      y: position.y,
      z: position.z + Math.sin(angle) * distance,
    };
  }

  // ============================================
  // Location Triangulation
  // ============================================

  /**
   * Triangulate target location from multiple clues
   * @param mission - The bounty mission with clues
   * @returns Triangulated position and accuracy
   */
  triangulateLocation(mission: BountyMission): {
    position: Vector3;
    zone: string;
    accuracy: number;
  } | null {
    // Get all location clues
    const locationClues = mission.clues.filter(
      (c) => c.type === InvestigationClueType.LOCATION
    ) as Array<InvestigationClue & { data: LocationClueData }>;

    if (locationClues.length === 0) {
      return null;
    }

    // Apply accuracy decay based on age
    const now = Date.now();
    const decayedClues = locationClues.map((clue) => {
      const ageHours = (now - clue.obtainedAt.getTime()) / (1000 * 60 * 60);
      const decayedAccuracy = Math.max(
        MIN_CLUE_ACCURACY,
        clue.accuracy - ageHours * CLUE_ACCURACY_DECAY_RATE
      );
      return { ...clue, accuracy: decayedAccuracy };
    });

    // Weight positions by accuracy
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;
    let weightedZ = 0;

    for (const clue of decayedClues) {
      const weight = clue.accuracy;
      totalWeight += weight;
      weightedX += clue.data.position.x * weight;
      weightedY += clue.data.position.y * weight;
      weightedZ += clue.data.position.z * weight;
    }

    if (totalWeight === 0) {
      return null;
    }

    const position: Vector3 = {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight,
      z: weightedZ / totalWeight,
    };

    // Use most recent zone
    const mostRecent = decayedClues.reduce((a, b) =>
      a.obtainedAt > b.obtainedAt ? a : b
    );

    // Combined accuracy improves with more clues
    const baseAccuracy = decayedClues.reduce((sum, c) => sum + c.accuracy, 0) / decayedClues.length;
    const clueBonus = Math.min(0.2, (decayedClues.length - 1) * 0.05);
    const accuracy = Math.min(1.0, baseAccuracy + clueBonus);

    return {
      position,
      zone: mostRecent.data.zone,
      accuracy,
    };
  }

  // ============================================
  // Seeker Droid Tracking
  // ============================================

  /**
   * Deploy seeker droid to track target
   * @param hunterId - The hunter object ID
   * @param hunterPosition - Hunter's current position
   * @param hunterZone - Hunter's current zone
   * @param missionId - The mission ID
   * @returns Tracking result
   */
  async deploySeeker(
    hunterId: ObjectId,
    hunterPosition: Vector3,
    hunterZone: string,
    missionId: bigint
  ): Promise<DroidTrackingResult> {
    // Check cooldown
    if (this.isDroidOnCooldown(hunterId)) {
      return {
        success: false,
        errorMessage: 'Seeker droid on cooldown',
      };
    }

    // Get mission
    const mission = await this.repository.getMissionById(missionId);
    if (!mission) {
      return {
        success: false,
        errorMessage: 'Mission not found',
      };
    }

    if (mission.hunterId !== hunterId) {
      return {
        success: false,
        errorMessage: 'Not your mission',
      };
    }

    // Get target position
    const targetPos = await this.targetService.getTargetPosition(mission.targetId);
    if (!targetPos) {
      return {
        success: false,
        errorMessage: 'Target not found or offline',
      };
    }

    // Check same zone
    if (targetPos.zone !== hunterZone) {
      return {
        success: false,
        errorMessage: 'Target not in current zone',
      };
    }

    // Calculate distance
    const dx = targetPos.position.x - hunterPosition.x;
    const dz = targetPos.position.z - hunterPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check range
    if (distance > this.config.seekerDroidMaxRange) {
      return {
        success: false,
        errorMessage: 'Target out of range',
      };
    }

    // Calculate heading (compass direction)
    const heading = Math.atan2(dx, dz) * (180 / Math.PI);
    const normalizedHeading = (heading + 360) % 360;

    // Accuracy decreases with distance
    const accuracy = Math.max(0.3, 1.0 - distance / this.config.seekerDroidMaxRange);

    // Add some error to the returned location based on accuracy
    const errorRadius = (1 - accuracy) * 100;
    const reportedLocation = this.addPositionError(targetPos.position, errorRadius);

    // Set cooldown
    this.setDroidCooldown(hunterId, this.config.seekerDroidCooldownMs);

    if (this.config.enableLogging) {
      console.log(
        `[InvestigationSystem] Hunter ${hunterId} deployed seeker droid. Target at distance ${distance.toFixed(0)}m`
      );
    }

    return {
      success: true,
      location: reportedLocation,
      zone: targetPos.zone,
      accuracy,
      distance: Math.round(distance),
      heading: Math.round(normalizedHeading),
    };
  }

  // ============================================
  // Probe Droid Scanning
  // ============================================

  /**
   * Deploy probe droid to scan an area
   * @param hunterId - The hunter object ID
   * @param scanCenter - Center of scan area
   * @param zone - Zone to scan
   * @param missionId - Optional mission ID to highlight target
   * @returns Area scan result
   */
  async deployProbe(
    hunterId: ObjectId,
    scanCenter: Vector3,
    zone: string,
    missionId?: bigint
  ): Promise<AreaScanResult> {
    // Check cooldown
    if (this.isDroidOnCooldown(hunterId)) {
      return {
        success: false,
        scanCenter,
        scanRadius: 0,
        detectedTargets: [],
        errorMessage: 'Probe droid on cooldown',
      };
    }

    // Get targets in area
    const targetsInArea = await this.targetService.getTargetsInArea(
      scanCenter,
      this.config.probeDroidScanRadius,
      zone
    );

    // Get mission target ID if provided
    let missionTargetId: ObjectId | undefined;
    if (missionId) {
      const mission = await this.repository.getMissionById(missionId);
      if (mission && mission.hunterId === hunterId) {
        missionTargetId = mission.targetId;
      }
    }

    // Convert to detected targets
    const detectedTargets: DetectedTarget[] = targetsInArea.map((t) => {
      const dx = t.position.x - scanCenter.x;
      const dz = t.position.z - scanCenter.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      // Signal strength decreases with distance
      const signalStrength = Math.max(0.3, 1.0 - distance / this.config.probeDroidScanRadius);

      // Add position error based on signal strength
      const errorRadius = (1 - signalStrength) * 50;
      const reportedPosition = this.addPositionError(t.position, errorRadius);

      return {
        targetId: t.id,
        name: t.name,
        position: reportedPosition,
        signalStrength,
        isBountyMark: t.id === missionTargetId,
      };
    });

    // Set cooldown
    this.setDroidCooldown(hunterId, this.config.probeDroidCooldownMs);

    if (this.config.enableLogging) {
      console.log(
        `[InvestigationSystem] Hunter ${hunterId} deployed probe droid. Detected ${detectedTargets.length} targets`
      );
    }

    return {
      success: true,
      scanCenter,
      scanRadius: this.config.probeDroidScanRadius,
      detectedTargets,
    };
  }

  // ============================================
  // Cooldown Management
  // ============================================

  /**
   * Check if droid is on cooldown
   */
  private isDroidOnCooldown(hunterId: ObjectId): boolean {
    const cooldownEnd = this.droidCooldowns.get(hunterId);
    if (!cooldownEnd) {
      return false;
    }

    return Date.now() < cooldownEnd;
  }

  /**
   * Set droid cooldown
   */
  private setDroidCooldown(hunterId: ObjectId, durationMs: number): void {
    this.droidCooldowns.set(hunterId, Date.now() + durationMs);
  }

  /**
   * Get remaining droid cooldown time
   * @param hunterId - The hunter object ID
   * @returns Remaining cooldown in milliseconds, or 0 if not on cooldown
   */
  getDroidCooldownRemaining(hunterId: ObjectId): number {
    const cooldownEnd = this.droidCooldowns.get(hunterId);
    if (!cooldownEnd) {
      return 0;
    }

    const remaining = cooldownEnd - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Get remaining broker cooldown time
   * @param hunterId - The hunter object ID
   * @param brokerId - The broker NPC object ID
   * @returns Remaining cooldown in milliseconds, or 0 if not on cooldown
   */
  getBrokerCooldownRemaining(hunterId: ObjectId, brokerId: ObjectId): number {
    const hunterCooldowns = this.brokerCooldowns.get(hunterId);
    if (!hunterCooldowns) {
      return 0;
    }

    const cooldownEnd = hunterCooldowns.get(brokerId);
    if (!cooldownEnd) {
      return 0;
    }

    const remaining = cooldownEnd - Date.now();
    return Math.max(0, remaining);
  }

  // ============================================
  // Clue Management
  // ============================================

  /**
   * Get all clues for a mission
   * @param missionId - The mission ID
   * @param hunterId - The hunter ID for authorization
   * @returns Array of clues or null if not authorized
   */
  async getMissionClues(
    missionId: bigint,
    hunterId: ObjectId
  ): Promise<InvestigationClue[] | null> {
    const mission = await this.repository.getMissionById(missionId);
    if (!mission) {
      return null;
    }

    if (mission.hunterId !== hunterId) {
      return null;
    }

    return mission.clues;
  }

  /**
   * Get the effective accuracy of a clue considering decay
   * @param clue - The investigation clue
   * @returns Current accuracy after decay
   */
  getClueCurrentAccuracy(clue: InvestigationClue): number {
    const ageHours = (Date.now() - clue.obtainedAt.getTime()) / (1000 * 60 * 60);
    const decayedAccuracy = clue.accuracy - ageHours * CLUE_ACCURACY_DECAY_RATE;
    return Math.max(MIN_CLUE_ACCURACY, decayedAccuracy);
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Investigation System instance
 * @param repository - Bounty repository for data persistence
 * @param creditService - Service for credit operations
 * @param targetService - Service for getting target information
 * @param config - Optional configuration overrides
 * @returns New Investigation System instance
 */
export function createInvestigationSystem(
  repository: BountyRepository,
  creditService: BountyCreditService,
  targetService: TargetInfoService,
  config?: Partial<InvestigationConfig>
): InvestigationSystem {
  return new InvestigationSystem(repository, creditService, targetService, config);
}
