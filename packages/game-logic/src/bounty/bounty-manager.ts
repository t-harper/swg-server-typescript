/**
 * Bounty Manager
 * Core service for bounty mission generation, assignment, and tracking
 *
 * Handles:
 * - Bounty mission generation for Jedi and criminal targets
 * - Priority target identification (high visibility Jedi)
 * - Reward calculation based on target level/visibility
 * - Mission assignment and tracking
 * - Mission expiration handling
 * - Bounty completion and failure processing
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  MAX_CONCURRENT_BOUNTIES,
  DEFAULT_MISSION_EXPIRY_MS,
  MIN_JEDI_VISIBILITY_FOR_BOUNTY,
  JEDI_REWARD_MULTIPLIER,
  BountyTargetType,
  BountyStatus,
  BountyMissionType,
  BountyResultCode,
  type BountyMission,
  type BountyTarget,
  type BountyHunter,
  type BountyTerminal,
  type BountyOperationResult,
  type BountySystemConfig,
  type InvestigationClue,
} from './bounty-types.js';

// ============================================
// Configuration
// ============================================

/**
 * Default bounty system configuration
 */
export const DEFAULT_BOUNTY_CONFIG: BountySystemConfig = {
  enableLogging: false,
  maxConcurrentBounties: MAX_CONCURRENT_BOUNTIES,
  defaultMissionExpiryMs: DEFAULT_MISSION_EXPIRY_MS,
  minJediVisibility: MIN_JEDI_VISIBILITY_FOR_BOUNTY,
  baseReward: 1000n,
  rewardPerLevel: 500n,
  jediRewardMultiplier: JEDI_REWARD_MULTIPLIER,
  criminalRewardMultiplier: 2,
  seekerDroidCooldownMs: 5 * 60 * 1000,
  probeDroidCooldownMs: 10 * 60 * 1000,
  generateId: () => BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000)),
};

// ============================================
// Repository Interface
// ============================================

/**
 * Repository interface for bounty data persistence
 */
export interface BountyRepository {
  /** Create a new bounty mission */
  createMission(mission: Omit<BountyMission, 'clues'>): Promise<BountyMission>;

  /** Get mission by ID */
  getMissionById(missionId: bigint): Promise<BountyMission | undefined>;

  /** Get all available missions */
  getAvailableMissions(): Promise<BountyMission[]>;

  /** Get missions for a specific hunter */
  getMissionsForHunter(hunterId: ObjectId): Promise<BountyMission[]>;

  /** Get missions targeting a specific player */
  getMissionsForTarget(targetId: ObjectId): Promise<BountyMission[]>;

  /** Update mission status */
  updateMissionStatus(missionId: bigint, status: BountyStatus): Promise<boolean>;

  /** Update mission data */
  updateMission(mission: BountyMission): Promise<boolean>;

  /** Add clue to mission */
  addClueToMission(missionId: bigint, clue: InvestigationClue): Promise<boolean>;

  /** Delete expired missions */
  deleteExpiredMissions(): Promise<number>;

  /** Get bounty target by ID */
  getTarget(targetId: ObjectId): Promise<BountyTarget | undefined>;

  /** Get all eligible bounty targets */
  getEligibleTargets(): Promise<BountyTarget[]>;

  /** Get priority targets (high visibility Jedi) */
  getPriorityTargets(minVisibility: number): Promise<BountyTarget[]>;

  /** Update target location */
  updateTargetLocation(targetId: ObjectId, location: Vector3, zone: string): Promise<boolean>;

  /** Get bounty hunter data */
  getHunter(hunterId: ObjectId): Promise<BountyHunter | undefined>;

  /** Update hunter data */
  updateHunter(hunter: BountyHunter): Promise<boolean>;

  /** Get terminal by ID */
  getTerminal(terminalId: ObjectId): Promise<BountyTerminal | undefined>;

  /** Get all active terminals */
  getActiveTerminals(): Promise<BountyTerminal[]>;
}

/**
 * Service interface for visibility system integration
 */
export interface VisibilityService {
  /** Get Jedi visibility for a character */
  getVisibility(characterId: ObjectId): Promise<number>;

  /** Check if character is a Jedi */
  isJedi(characterId: ObjectId): Promise<boolean>;

  /** Reduce visibility on successful bounty escape */
  reduceVisibilityOnEscape(characterId: ObjectId, amount: number): Promise<void>;
}

/**
 * Service interface for credit operations
 */
export interface BountyCreditService {
  /** Add credits to player */
  addCredits(playerId: ObjectId, amount: bigint): Promise<boolean>;

  /** Deduct credits from player */
  deductCredits(playerId: ObjectId, amount: bigint): Promise<boolean>;

  /** Check if player has credits */
  hasCredits(playerId: ObjectId, amount: bigint): Promise<boolean>;
}

// ============================================
// Bounty Manager Class
// ============================================

/**
 * Bounty Manager
 * Central service for bounty hunting operations
 */
export class BountyManager {
  private repository: BountyRepository;
  private visibilityService: VisibilityService;
  private creditService: BountyCreditService;
  private config: BountySystemConfig;

  /** Cache of active missions by mission ID */
  private missionCache: Map<bigint, BountyMission> = new Map();

  /** Cache of hunter active mission counts */
  private hunterMissionCounts: Map<ObjectId, number> = new Map();

  /**
   * Create a new Bounty Manager
   * @param repository - Bounty repository for data persistence
   * @param visibilityService - Service for Jedi visibility operations
   * @param creditService - Service for credit operations
   * @param config - Optional configuration overrides
   */
  constructor(
    repository: BountyRepository,
    visibilityService: VisibilityService,
    creditService: BountyCreditService,
    config: Partial<BountySystemConfig> = {}
  ) {
    this.repository = repository;
    this.visibilityService = visibilityService;
    this.creditService = creditService;
    this.config = { ...DEFAULT_BOUNTY_CONFIG, ...config };
  }

  // ============================================
  // Mission Generation
  // ============================================

  /**
   * Generate bounty missions for eligible targets
   * Should be called periodically to refresh available missions
   * @returns Number of new missions generated
   */
  async generateMissions(): Promise<number> {
    const eligibleTargets = await this.repository.getEligibleTargets();
    let generatedCount = 0;

    for (const target of eligibleTargets) {
      // Check if target already has an active mission
      const existingMissions = await this.repository.getMissionsForTarget(target.characterId);
      const hasActiveMission = existingMissions.some(
        (m) => m.status === BountyStatus.AVAILABLE || m.status === BountyStatus.ACCEPTED || m.status === BountyStatus.IN_PROGRESS
      );

      if (hasActiveMission) {
        continue;
      }

      // Generate mission for this target
      const mission = await this.createMissionForTarget(target);
      if (mission) {
        generatedCount++;
      }
    }

    if (this.config.enableLogging && generatedCount > 0) {
      console.log(`[BountyManager] Generated ${generatedCount} new bounty missions`);
    }

    return generatedCount;
  }

  /**
   * Generate priority bounty missions for high visibility Jedi
   * @returns Array of generated missions
   */
  async generatePriorityMissions(): Promise<BountyMission[]> {
    const priorityTargets = await this.repository.getPriorityTargets(this.config.minJediVisibility * 2);
    const generatedMissions: BountyMission[] = [];

    for (const target of priorityTargets) {
      const existingMissions = await this.repository.getMissionsForTarget(target.characterId);
      const hasActiveMission = existingMissions.some(
        (m) => m.status === BountyStatus.AVAILABLE || m.status === BountyStatus.ACCEPTED || m.status === BountyStatus.IN_PROGRESS
      );

      if (!hasActiveMission) {
        const mission = await this.createMissionForTarget(target, true);
        if (mission) {
          generatedMissions.push(mission);
        }
      }
    }

    if (this.config.enableLogging && generatedMissions.length > 0) {
      console.log(`[BountyManager] Generated ${generatedMissions.length} priority bounty missions`);
    }

    return generatedMissions;
  }

  /**
   * Create a bounty mission for a specific target
   * @param target - The bounty target
   * @param isPriority - Whether this is a priority mission
   * @returns The created mission or null if failed
   */
  private async createMissionForTarget(
    target: BountyTarget,
    isPriority: boolean = false
  ): Promise<BountyMission | null> {
    try {
      const reward = this.calculateReward(target, isPriority);
      const expiresAt = new Date(Date.now() + this.config.defaultMissionExpiryMs);

      const mission = await this.repository.createMission({
        id: this.config.generateId(),
        targetId: target.characterId,
        targetName: target.name,
        targetType: target.targetType,
        reward,
        status: BountyStatus.AVAILABLE,
        missionType: BountyMissionType.INVESTIGATION,
        expiresAt,
        createdAt: new Date(),
        acceptedAt: null,
        hunterId: null,
        targetLevel: target.level,
        targetVisibility: target.jediVisibility,
        lastKnownZone: target.lastKnownZone,
      });

      this.missionCache.set(mission.id, mission);

      if (this.config.enableLogging) {
        console.log(
          `[BountyManager] Created mission ${mission.id} for target ${target.name} (reward: ${reward})`
        );
      }

      return mission;
    } catch (error) {
      if (this.config.enableLogging) {
        console.error(`[BountyManager] Error creating mission:`, error);
      }
      return null;
    }
  }

  // ============================================
  // Reward Calculation
  // ============================================

  /**
   * Calculate bounty reward based on target attributes
   * @param target - The bounty target
   * @param isPriority - Whether this is a priority target
   * @returns Calculated reward in credits
   */
  calculateReward(target: BountyTarget, isPriority: boolean = false): bigint {
    let reward = this.config.baseReward + this.config.rewardPerLevel * BigInt(target.level);

    // Apply type multiplier
    switch (target.targetType) {
      case BountyTargetType.JEDI:
        reward = reward * BigInt(this.config.jediRewardMultiplier);
        // Additional visibility bonus for Jedi
        reward = reward + BigInt(target.jediVisibility) * 100n;
        break;
      case BountyTargetType.PLAYER_CRIMINAL:
        reward = reward * BigInt(this.config.criminalRewardMultiplier);
        break;
      case BountyTargetType.NPC:
        // NPCs have base reward only
        break;
    }

    // Add existing bounty amount if any
    reward = reward + target.bountyAmount;

    // Priority bonus (50% extra)
    if (isPriority) {
      reward = (reward * 150n) / 100n;
    }

    // Escape bonus (targets who have escaped before are worth more)
    if (target.escapeCount > 0) {
      reward = reward + BigInt(target.escapeCount) * 1000n;
    }

    return reward;
  }

  // ============================================
  // Mission Assignment
  // ============================================

  /**
   * Get available missions from a terminal
   * @param terminalId - The terminal object ID
   * @param hunterId - The hunter requesting missions
   * @returns Array of available missions
   */
  async getAvailableMissions(terminalId: ObjectId, hunterId: ObjectId): Promise<BountyMission[]> {
    const terminal = await this.repository.getTerminal(terminalId);
    if (!terminal || !terminal.isActive) {
      return [];
    }

    const hunter = await this.repository.getHunter(hunterId);
    if (!hunter) {
      return [];
    }

    // Get all available missions
    const missions = await this.repository.getAvailableMissions();

    // Filter expired missions
    const now = Date.now();
    const validMissions = missions.filter((m) => m.expiresAt.getTime() > now);

    // Sort by reward (highest first)
    validMissions.sort((a, b) => Number(b.reward - a.reward));

    return validMissions;
  }

  /**
   * Accept a bounty mission
   * @param missionId - The mission ID to accept
   * @param hunterId - The hunter accepting the mission
   * @returns Operation result
   */
  async acceptMission(missionId: bigint, hunterId: ObjectId): Promise<BountyOperationResult> {
    const mission = await this.repository.getMissionById(missionId);
    if (!mission) {
      return {
        success: false,
        resultCode: BountyResultCode.MissionNotFound,
        errorMessage: 'Mission not found',
      };
    }

    // Check mission is available
    if (mission.status !== BountyStatus.AVAILABLE) {
      return {
        success: false,
        resultCode: BountyResultCode.MissionAlreadyAccepted,
        errorMessage: 'Mission is no longer available',
      };
    }

    // Check mission not expired
    if (mission.expiresAt.getTime() < Date.now()) {
      await this.repository.updateMissionStatus(missionId, BountyStatus.EXPIRED);
      return {
        success: false,
        resultCode: BountyResultCode.MissionExpired,
        errorMessage: 'Mission has expired',
      };
    }

    // Check hunter exists and can accept more bounties
    const hunter = await this.repository.getHunter(hunterId);
    if (!hunter) {
      return {
        success: false,
        resultCode: BountyResultCode.HunterNotFound,
        errorMessage: 'Hunter not found',
      };
    }

    // Check concurrent mission limit
    const activeMissions = await this.repository.getMissionsForHunter(hunterId);
    const activeCount = activeMissions.filter(
      (m) => m.status === BountyStatus.ACCEPTED || m.status === BountyStatus.IN_PROGRESS
    ).length;

    if (activeCount >= this.config.maxConcurrentBounties) {
      return {
        success: false,
        resultCode: BountyResultCode.MaxBountiesReached,
        errorMessage: `Maximum of ${this.config.maxConcurrentBounties} concurrent bounties allowed`,
      };
    }

    // Assign mission
    mission.status = BountyStatus.ACCEPTED;
    mission.hunterId = hunterId;
    mission.acceptedAt = new Date();

    const updated = await this.repository.updateMission(mission);
    if (!updated) {
      return {
        success: false,
        resultCode: BountyResultCode.ServerError,
        errorMessage: 'Failed to accept mission',
      };
    }

    // Update cache
    this.missionCache.set(missionId, mission);
    this.hunterMissionCounts.set(hunterId, activeCount + 1);

    // Update hunter data
    hunter.activeMissions.push(missionId);
    await this.repository.updateHunter(hunter);

    if (this.config.enableLogging) {
      console.log(`[BountyManager] Mission ${missionId} accepted by hunter ${hunterId}`);
    }

    return {
      success: true,
      resultCode: BountyResultCode.Success,
      missionId,
    };
  }

  /**
   * Abandon a bounty mission
   * @param missionId - The mission ID to abandon
   * @param hunterId - The hunter abandoning the mission
   * @returns Operation result
   */
  async abandonMission(missionId: bigint, hunterId: ObjectId): Promise<BountyOperationResult> {
    const mission = await this.repository.getMissionById(missionId);
    if (!mission) {
      return {
        success: false,
        resultCode: BountyResultCode.MissionNotFound,
        errorMessage: 'Mission not found',
      };
    }

    // Verify hunter owns this mission
    if (mission.hunterId !== hunterId) {
      return {
        success: false,
        resultCode: BountyResultCode.NotAuthorized,
        errorMessage: 'Not authorized to abandon this mission',
      };
    }

    // Can only abandon accepted or in-progress missions
    if (mission.status !== BountyStatus.ACCEPTED && mission.status !== BountyStatus.IN_PROGRESS) {
      return {
        success: false,
        resultCode: BountyResultCode.NotAuthorized,
        errorMessage: 'Cannot abandon mission in current state',
      };
    }

    // Mark as failed and make available again
    mission.status = BountyStatus.AVAILABLE;
    mission.hunterId = null;
    mission.acceptedAt = null;
    mission.missionType = BountyMissionType.INVESTIGATION;
    mission.clues = [];

    const updated = await this.repository.updateMission(mission);
    if (!updated) {
      return {
        success: false,
        resultCode: BountyResultCode.ServerError,
        errorMessage: 'Failed to abandon mission',
      };
    }

    // Update hunter data
    const hunter = await this.repository.getHunter(hunterId);
    if (hunter) {
      hunter.activeMissions = hunter.activeMissions.filter((id) => id !== missionId);
      hunter.failedBounties++;
      await this.repository.updateHunter(hunter);
    }

    // Update caches
    this.missionCache.set(missionId, mission);
    const currentCount = this.hunterMissionCounts.get(hunterId) ?? 1;
    this.hunterMissionCounts.set(hunterId, Math.max(0, currentCount - 1));

    if (this.config.enableLogging) {
      console.log(`[BountyManager] Mission ${missionId} abandoned by hunter ${hunterId}`);
    }

    return {
      success: true,
      resultCode: BountyResultCode.Success,
      missionId,
    };
  }

  // ============================================
  // Mission Progress
  // ============================================

  /**
   * Progress mission to hunt phase
   * Called when sufficient clues have been gathered
   * @param missionId - The mission ID
   * @param hunterId - The hunter ID
   * @returns Operation result
   */
  async progressToHunt(missionId: bigint, hunterId: ObjectId): Promise<BountyOperationResult> {
    const mission = await this.repository.getMissionById(missionId);
    if (!mission) {
      return {
        success: false,
        resultCode: BountyResultCode.MissionNotFound,
        errorMessage: 'Mission not found',
      };
    }

    if (mission.hunterId !== hunterId) {
      return {
        success: false,
        resultCode: BountyResultCode.NotAuthorized,
        errorMessage: 'Not authorized to progress this mission',
      };
    }

    if (mission.status !== BountyStatus.ACCEPTED) {
      return {
        success: false,
        resultCode: BountyResultCode.NotAuthorized,
        errorMessage: 'Mission not in correct state',
      };
    }

    // Require at least one location clue to progress
    const hasLocationClue = mission.clues.some((c) => c.type === 0); // LOCATION type
    if (!hasLocationClue) {
      return {
        success: false,
        resultCode: BountyResultCode.NotAuthorized,
        errorMessage: 'Need at least one location clue to begin hunt',
      };
    }

    mission.status = BountyStatus.IN_PROGRESS;
    mission.missionType = BountyMissionType.HUNT;

    const updated = await this.repository.updateMission(mission);
    if (!updated) {
      return {
        success: false,
        resultCode: BountyResultCode.ServerError,
        errorMessage: 'Failed to progress mission',
      };
    }

    this.missionCache.set(missionId, mission);

    if (this.config.enableLogging) {
      console.log(`[BountyManager] Mission ${missionId} progressed to hunt phase`);
    }

    return {
      success: true,
      resultCode: BountyResultCode.Success,
      missionId,
    };
  }

  // ============================================
  // Mission Completion
  // ============================================

  /**
   * Complete a bounty mission (target eliminated)
   * @param missionId - The mission ID
   * @param hunterId - The hunter who completed the mission
   * @returns Operation result
   */
  async completeMission(missionId: bigint, hunterId: ObjectId): Promise<BountyOperationResult> {
    const mission = await this.repository.getMissionById(missionId);
    if (!mission) {
      return {
        success: false,
        resultCode: BountyResultCode.MissionNotFound,
        errorMessage: 'Mission not found',
      };
    }

    if (mission.hunterId !== hunterId) {
      return {
        success: false,
        resultCode: BountyResultCode.NotAuthorized,
        errorMessage: 'Not authorized to complete this mission',
      };
    }

    if (mission.status !== BountyStatus.IN_PROGRESS) {
      return {
        success: false,
        resultCode: BountyResultCode.NotAuthorized,
        errorMessage: 'Mission not in progress',
      };
    }

    // Award reward
    const rewarded = await this.creditService.addCredits(hunterId, mission.reward);
    if (!rewarded) {
      return {
        success: false,
        resultCode: BountyResultCode.ServerError,
        errorMessage: 'Failed to award bounty reward',
      };
    }

    // Mark mission complete
    mission.status = BountyStatus.COMPLETED;

    const updated = await this.repository.updateMission(mission);
    if (!updated) {
      return {
        success: false,
        resultCode: BountyResultCode.ServerError,
        errorMessage: 'Failed to complete mission',
      };
    }

    // Update hunter stats
    const hunter = await this.repository.getHunter(hunterId);
    if (hunter) {
      hunter.completedBounties++;
      hunter.totalEarnings = hunter.totalEarnings + mission.reward;
      hunter.activeMissions = hunter.activeMissions.filter((id) => id !== missionId);
      await this.repository.updateHunter(hunter);
    }

    // Update target stats
    const target = await this.repository.getTarget(mission.targetId);
    if (target) {
      target.captureCount++;
      // Note: Visibility reduction would be handled by the visibility service
    }

    // Update caches
    this.missionCache.delete(missionId);
    const currentCount = this.hunterMissionCounts.get(hunterId) ?? 1;
    this.hunterMissionCounts.set(hunterId, Math.max(0, currentCount - 1));

    if (this.config.enableLogging) {
      console.log(
        `[BountyManager] Mission ${missionId} completed by hunter ${hunterId}. Reward: ${mission.reward}`
      );
    }

    return {
      success: true,
      resultCode: BountyResultCode.Success,
      missionId,
    };
  }

  /**
   * Fail a bounty mission (hunter died)
   * @param missionId - The mission ID
   * @param hunterId - The hunter ID
   * @returns Operation result
   */
  async failMission(missionId: bigint, hunterId: ObjectId): Promise<BountyOperationResult> {
    const mission = await this.repository.getMissionById(missionId);
    if (!mission) {
      return {
        success: false,
        resultCode: BountyResultCode.MissionNotFound,
        errorMessage: 'Mission not found',
      };
    }

    if (mission.hunterId !== hunterId) {
      return {
        success: false,
        resultCode: BountyResultCode.NotAuthorized,
        errorMessage: 'Not authorized',
      };
    }

    mission.status = BountyStatus.FAILED;

    const updated = await this.repository.updateMission(mission);
    if (!updated) {
      return {
        success: false,
        resultCode: BountyResultCode.ServerError,
        errorMessage: 'Failed to update mission',
      };
    }

    // Update hunter stats
    const hunter = await this.repository.getHunter(hunterId);
    if (hunter) {
      hunter.failedBounties++;
      hunter.activeMissions = hunter.activeMissions.filter((id) => id !== missionId);
      await this.repository.updateHunter(hunter);
    }

    // Update target escape count
    const target = await this.repository.getTarget(mission.targetId);
    if (target) {
      target.escapeCount++;
      // Reduce visibility for successful escape
      if (target.targetType === BountyTargetType.JEDI) {
        await this.visibilityService.reduceVisibilityOnEscape(mission.targetId, 10);
      }
    }

    // Update caches
    this.missionCache.delete(missionId);
    const currentCount = this.hunterMissionCounts.get(hunterId) ?? 1;
    this.hunterMissionCounts.set(hunterId, Math.max(0, currentCount - 1));

    if (this.config.enableLogging) {
      console.log(`[BountyManager] Mission ${missionId} failed for hunter ${hunterId}`);
    }

    return {
      success: true,
      resultCode: BountyResultCode.Success,
      missionId,
    };
  }

  // ============================================
  // Mission Expiration
  // ============================================

  /**
   * Process expired missions
   * Should be called periodically
   * @returns Number of missions expired
   */
  async processExpiredMissions(): Promise<number> {
    const deletedCount = await this.repository.deleteExpiredMissions();

    if (this.config.enableLogging && deletedCount > 0) {
      console.log(`[BountyManager] Processed ${deletedCount} expired missions`);
    }

    return deletedCount;
  }

  /**
   * Check if a mission is expired
   * @param missionId - The mission ID
   * @returns Whether the mission is expired
   */
  async isMissionExpired(missionId: bigint): Promise<boolean> {
    const mission = await this.repository.getMissionById(missionId);
    if (!mission) {
      return true;
    }

    return mission.expiresAt.getTime() < Date.now();
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Get a mission by ID
   * @param missionId - The mission ID
   * @returns The mission or undefined
   */
  async getMission(missionId: bigint): Promise<BountyMission | undefined> {
    // Check cache first
    const cached = this.missionCache.get(missionId);
    if (cached) {
      return cached;
    }

    const mission = await this.repository.getMissionById(missionId);
    if (mission) {
      this.missionCache.set(missionId, mission);
    }

    return mission;
  }

  /**
   * Get all active missions for a hunter
   * @param hunterId - The hunter ID
   * @returns Array of active missions
   */
  async getHunterMissions(hunterId: ObjectId): Promise<BountyMission[]> {
    const missions = await this.repository.getMissionsForHunter(hunterId);
    return missions.filter(
      (m) => m.status === BountyStatus.ACCEPTED || m.status === BountyStatus.IN_PROGRESS
    );
  }

  /**
   * Get bounty target information
   * @param targetId - The target object ID
   * @returns Target info or undefined
   */
  async getTarget(targetId: ObjectId): Promise<BountyTarget | undefined> {
    return this.repository.getTarget(targetId);
  }

  /**
   * Check if a player is an eligible bounty target
   * @param playerId - The player object ID
   * @returns Whether player is eligible
   */
  async isEligibleTarget(playerId: ObjectId): Promise<boolean> {
    const isJedi = await this.visibilityService.isJedi(playerId);
    if (isJedi) {
      const visibility = await this.visibilityService.getVisibility(playerId);
      return visibility >= this.config.minJediVisibility;
    }

    // Check for criminal bounty (would need additional service)
    const target = await this.repository.getTarget(playerId);
    return target !== undefined && target.bountyAmount > 0n;
  }

  /**
   * Get the number of active bounties for a hunter
   * @param hunterId - The hunter ID
   * @returns Number of active bounties
   */
  async getActiveBountyCount(hunterId: ObjectId): Promise<number> {
    const cached = this.hunterMissionCounts.get(hunterId);
    if (cached !== undefined) {
      return cached;
    }

    const missions = await this.repository.getMissionsForHunter(hunterId);
    const count = missions.filter(
      (m) => m.status === BountyStatus.ACCEPTED || m.status === BountyStatus.IN_PROGRESS
    ).length;

    this.hunterMissionCounts.set(hunterId, count);
    return count;
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Bounty Manager instance
 * @param repository - Bounty repository for data persistence
 * @param visibilityService - Service for Jedi visibility operations
 * @param creditService - Service for credit operations
 * @param config - Optional configuration overrides
 * @returns New Bounty Manager instance
 */
export function createBountyManager(
  repository: BountyRepository,
  visibilityService: VisibilityService,
  creditService: BountyCreditService,
  config?: Partial<BountySystemConfig>
): BountyManager {
  return new BountyManager(repository, visibilityService, creditService, config);
}
