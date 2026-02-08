/**
 * Mission Terminal Service
 * Handles mission generation, difficulty scaling, and terminal interactions
 *
 * Responsibilities:
 * - Mission generation for different terminal types
 * - Difficulty-based reward calculation
 * - Mission type filtering by terminal
 * - Faction-specific missions
 * - Mission refresh mechanics
 */

import type { ObjectId } from '@swg/shared-types';
import { type MissionData, type MissionTypeValue, MissionType } from './quest-messages.js';

/**
 * Terminal type definitions
 */
export const TerminalType = {
  /** Generic mission terminal */
  General: 'general',
  /** Destroy/combat missions */
  Destroy: 'destroy',
  /** Delivery missions */
  Delivery: 'delivery',
  /** Bounty hunting missions */
  Bounty: 'bounty',
  /** Survey missions for artisans */
  Survey: 'survey',
  /** Crafting missions */
  Crafting: 'crafting',
  /** Reconnaissance missions */
  Recon: 'recon',
  /** Entertainer missions */
  Entertainer: 'entertainer',
  /** Rebel faction terminal */
  Rebel: 'rebel',
  /** Imperial faction terminal */
  Imperial: 'imperial',
} as const;

export type TerminalTypeValue = (typeof TerminalType)[keyof typeof TerminalType];

/**
 * Mission difficulty levels
 */
export const MissionDifficulty = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
  Elite: 4,
  Heroic: 5,
} as const;

export type MissionDifficultyValue =
  (typeof MissionDifficulty)[keyof typeof MissionDifficulty];

/**
 * Faction alignments
 */
export const Faction = {
  Neutral: 'neutral',
  Rebel: 'rebel',
  Imperial: 'imperial',
} as const;

export type FactionValue = (typeof Faction)[keyof typeof Faction];

/**
 * Mission target data
 */
export interface MissionTarget {
  /** Target creature/NPC template */
  template: string;
  /** Display name */
  name: string;
  /** Target level */
  level: number;
  /** Faction alignment */
  faction: FactionValue;
}

/**
 * Mission location data
 */
export interface MissionLocation {
  planet: string;
  x: number;
  y: number;
  z: number;
  name?: string;
}

/**
 * Generated mission instance
 */
export interface GeneratedMission extends MissionData {
  /** When this mission was generated */
  generatedAt: number;
  /** Terminal that generated this mission */
  terminalId: bigint;
  /** Faction requirement (if any) */
  faction?: FactionValue | undefined;
  /** Minimum level requirement */
  minLevel: number;
  /** Target template for destroy missions */
  targetTemplate?: string | undefined;
  /** Pickup location for delivery missions */
  pickupLocation?: MissionLocation | undefined;
  /** Destination for delivery missions */
  deliveryLocation?: MissionLocation | undefined;
}

/**
 * Terminal state
 */
export interface TerminalState {
  terminalId: bigint;
  terminalType: TerminalTypeValue;
  planet: string;
  x: number;
  y: number;
  z: number;
  faction?: FactionValue | undefined;
  missions: GeneratedMission[];
  lastRefresh: number;
  refreshInterval: number;
}

/**
 * Player accepted mission
 */
export interface AcceptedMission {
  mission: GeneratedMission;
  playerId: ObjectId;
  acceptedAt: number;
  status: 'active' | 'completed' | 'failed' | 'abandoned';
}

/**
 * Mission service options
 */
export interface MissionTerminalServiceOptions {
  /** Number of missions per terminal */
  missionsPerTerminal?: number;
  /** Mission refresh interval in seconds */
  refreshInterval?: number;
  /** Base credit reward */
  baseCreditReward?: number;
  /** Base XP reward */
  baseXpReward?: number;
  /** Credit multiplier per difficulty level */
  creditDifficultyMultiplier?: number;
  /** XP multiplier per difficulty level */
  xpDifficultyMultiplier?: number;
  /** Credit multiplier per player level */
  creditLevelMultiplier?: number;
  /** XP multiplier per player level */
  xpLevelMultiplier?: number;
  /** Maximum mission distance from terminal */
  maxMissionDistance?: number;
  /** Minimum mission distance from terminal */
  minMissionDistance?: number;
}

/**
 * Mission operation result
 */
export interface MissionOperationResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

/**
 * Mission name templates for procedural generation
 */
const DESTROY_MISSION_TITLES = [
  'Eliminate the Threat',
  'Clear the Area',
  'Neutralize Hostiles',
  'Pest Control',
  'Security Sweep',
  'Hunt and Destroy',
  'Eradication Protocol',
  'Target Practice',
];

const DELIVERY_MISSION_TITLES = [
  'Special Delivery',
  'Time-Sensitive Package',
  'Courier Run',
  'Supply Drop',
  'Important Documents',
  'Medical Supplies',
  'Emergency Delivery',
  'Sensitive Cargo',
];

const BOUNTY_MISSION_TITLES = [
  'Wanted: Dead or Alive',
  'High-Value Target',
  'Fugitive Hunt',
  'Criminal Apprehension',
  'Justice Served',
  'The Hunt Begins',
];

const SURVEY_MISSION_TITLES = [
  'Resource Survey',
  'Geological Analysis',
  'Mineral Deposit Scan',
  'Resource Assessment',
  'Survey Mission',
  'Deposit Mapping',
];

const RECON_MISSION_TITLES = [
  'Reconnaissance',
  'Intel Gathering',
  'Scout the Area',
  'Enemy Assessment',
  'Strategic Recon',
  'Surveillance Operation',
];

/**
 * Common creature targets by planet
 */
const CREATURE_TARGETS: Record<string, MissionTarget[]> = {
  tatooine: [
    { template: 'womp_rat', name: 'Womp Rat', level: 5, faction: Faction.Neutral },
    { template: 'rill', name: 'Rill', level: 10, faction: Faction.Neutral },
    { template: 'dewback', name: 'Dewback', level: 15, faction: Faction.Neutral },
    { template: 'tusken_raider', name: 'Tusken Raider', level: 20, faction: Faction.Neutral },
    { template: 'krayt_dragon', name: 'Krayt Dragon', level: 60, faction: Faction.Neutral },
  ],
  naboo: [
    { template: 'mott', name: 'Mott', level: 5, faction: Faction.Neutral },
    { template: 'veermok', name: 'Veermok', level: 15, faction: Faction.Neutral },
    { template: 'gungan_warrior', name: 'Gungan Warrior', level: 25, faction: Faction.Neutral },
  ],
  corellia: [
    { template: 'slice_hound', name: 'Slice Hound', level: 10, faction: Faction.Neutral },
    { template: 'razor_cat', name: 'Razor Cat', level: 20, faction: Faction.Neutral },
    { template: 'corellian_sand_panther', name: 'Sand Panther', level: 30, faction: Faction.Neutral },
  ],
  dantooine: [
    { template: 'bol', name: 'Bol', level: 10, faction: Faction.Neutral },
    { template: 'piket', name: 'Piket', level: 20, faction: Faction.Neutral },
    { template: 'voritor_lizard', name: 'Voritor Lizard', level: 30, faction: Faction.Neutral },
  ],
  dathomir: [
    { template: 'rancor', name: 'Rancor', level: 50, faction: Faction.Neutral },
    { template: 'nightsister', name: 'Nightsister', level: 60, faction: Faction.Neutral },
  ],
  endor: [
    { template: 'boar_wolf', name: 'Boar Wolf', level: 30, faction: Faction.Neutral },
    { template: 'gorax', name: 'Gorax', level: 70, faction: Faction.Neutral },
  ],
  lok: [
    { template: 'canyon_corsair', name: 'Canyon Corsair', level: 40, faction: Faction.Neutral },
    { template: 'kimogila', name: 'Kimogila', level: 55, faction: Faction.Neutral },
  ],
  yavin4: [
    { template: 'massassi_warrior', name: 'Massassi Warrior', level: 45, faction: Faction.Neutral },
    { template: 'woolamander', name: 'Woolamander', level: 35, faction: Faction.Neutral },
  ],
};

/**
 * Mission Terminal Service
 */
export class MissionTerminalService {
  /** Active terminals */
  private readonly terminals: Map<string, TerminalState> = new Map();

  /** Accepted missions by mission ID */
  private readonly acceptedMissions: Map<string, AcceptedMission> = new Map();

  /** Player active missions */
  private readonly playerMissions: Map<string, Set<string>> = new Map();

  /** Configuration */
  private readonly options: Required<MissionTerminalServiceOptions>;

  /** ID counter for mission generation */
  private missionIdCounter: number = 0;

  constructor(options: MissionTerminalServiceOptions = {}) {
    this.options = {
      missionsPerTerminal: options.missionsPerTerminal ?? 10,
      refreshInterval: options.refreshInterval ?? 300, // 5 minutes
      baseCreditReward: options.baseCreditReward ?? 100,
      baseXpReward: options.baseXpReward ?? 50,
      creditDifficultyMultiplier: options.creditDifficultyMultiplier ?? 1.5,
      xpDifficultyMultiplier: options.xpDifficultyMultiplier ?? 1.3,
      creditLevelMultiplier: options.creditLevelMultiplier ?? 10,
      xpLevelMultiplier: options.xpLevelMultiplier ?? 5,
      maxMissionDistance: options.maxMissionDistance ?? 2000,
      minMissionDistance: options.minMissionDistance ?? 200,
    };
  }

  // ============================================
  // Terminal Registration
  // ============================================

  /**
   * Register a mission terminal
   */
  registerTerminal(
    terminalId: bigint,
    terminalType: TerminalTypeValue,
    planet: string,
    x: number,
    y: number,
    z: number = 0,
    faction?: FactionValue
  ): void {
    const terminalKey = terminalId.toString();

    const state: TerminalState = {
      terminalId,
      terminalType,
      planet,
      x,
      y,
      z,
      faction,
      missions: [],
      lastRefresh: 0,
      refreshInterval: this.options.refreshInterval,
    };

    this.terminals.set(terminalKey, state);
    console.log(
      `[MissionTerminalService] Registered ${terminalType} terminal ${terminalId} on ${planet}`
    );
  }

  /**
   * Unregister a mission terminal
   */
  unregisterTerminal(terminalId: bigint): void {
    const terminalKey = terminalId.toString();
    this.terminals.delete(terminalKey);
  }

  /**
   * Get terminal state
   */
  getTerminal(terminalId: bigint): TerminalState | undefined {
    return this.terminals.get(terminalId.toString());
  }

  // ============================================
  // Mission Generation
  // ============================================

  /**
   * Generate missions for a terminal
   */
  generateMissions(
    terminalId: bigint,
    terminalType: TerminalTypeValue,
    playerLevel: number
  ): MissionData[] {
    const terminalKey = terminalId.toString();
    let terminal = this.terminals.get(terminalKey);

    if (!terminal) {
      // Create a temporary terminal state if not registered
      terminal = {
        terminalId,
        terminalType,
        planet: 'tatooine',
        x: 0,
        y: 0,
        z: 0,
        missions: [],
        lastRefresh: 0,
        refreshInterval: this.options.refreshInterval,
      };
    }

    // Check if refresh is needed
    const now = Date.now();
    if (now - terminal.lastRefresh < terminal.refreshInterval * 1000) {
      // Return cached missions
      return terminal.missions;
    }

    // Generate new missions
    const missions: GeneratedMission[] = [];
    const missionTypes = this.getMissionTypesForTerminal(terminalType);

    for (let i = 0; i < this.options.missionsPerTerminal; i++) {
      const missionType = missionTypes[i % missionTypes.length]!;
      const difficulty = this.calculateMissionDifficulty(playerLevel, i);
      const mission = this.generateMission(
        terminal,
        missionType,
        difficulty,
        playerLevel
      );
      missions.push(mission);
    }

    // Update terminal state
    terminal.missions = missions;
    terminal.lastRefresh = now;
    this.terminals.set(terminalKey, terminal);

    return missions;
  }

  /**
   * Generate a single mission
   */
  private generateMission(
    terminal: TerminalState,
    missionType: number,
    difficulty: MissionDifficultyValue,
    playerLevel: number
  ): GeneratedMission {
    const missionId = this.generateMissionId();
    const rewards = this.calculateRewards(difficulty, playerLevel, terminal.faction);
    const targetLevel = Math.max(1, playerLevel + (difficulty - 2) * 5);

    // Generate target location
    const targetLocation = this.generateTargetLocation(terminal);

    // Get mission title and description
    const { title, description } = this.getMissionText(missionType, difficulty);

    // Get target info
    const target = this.selectTarget(terminal.planet, targetLevel, missionType);

    const mission: GeneratedMission = {
      missionId,
      type: missionType as MissionTypeValue,
      title,
      description,
      difficulty,
      creatorName: this.getCreatorName(terminal),
      targetName: target?.name ?? 'Unknown Target',
      targetLocation,
      rewards,
      timeLimit: this.calculateTimeLimit(missionType, difficulty),
      generatedAt: Date.now(),
      terminalId: terminal.terminalId,
      faction: terminal.faction,
      minLevel: Math.max(1, targetLevel - 10),
      targetTemplate: target?.template,
    };

    // Add delivery-specific locations
    if (missionType === MissionType.Delivery) {
      mission.pickupLocation = this.generateTargetLocation(terminal);
      mission.deliveryLocation = this.generateDeliveryLocation(terminal);
    }

    return mission;
  }

  /**
   * Generate a unique mission ID
   */
  private generateMissionId(): string {
    this.missionIdCounter++;
    return `mission_${Date.now()}_${this.missionIdCounter}`;
  }

  /**
   * Get mission types available for a terminal type
   */
  private getMissionTypesForTerminal(terminalType: TerminalTypeValue): number[] {
    switch (terminalType) {
      case TerminalType.Destroy:
        return [MissionType.Destroy];
      case TerminalType.Delivery:
        return [MissionType.Delivery];
      case TerminalType.Bounty:
        return [MissionType.Bounty];
      case TerminalType.Survey:
        return [MissionType.Survey];
      case TerminalType.Crafting:
        return [MissionType.Crafting];
      case TerminalType.Recon:
        return [MissionType.Recon];
      case TerminalType.Rebel:
      case TerminalType.Imperial:
        return [MissionType.Destroy, MissionType.Delivery, MissionType.Recon];
      case TerminalType.General:
      default:
        return [
          MissionType.Destroy,
          MissionType.Delivery,
          MissionType.Survey,
          MissionType.Recon,
        ];
    }
  }

  /**
   * Calculate mission difficulty based on position in list
   */
  private calculateMissionDifficulty(
    playerLevel: number,
    index: number
  ): MissionDifficultyValue {
    // Distribute difficulties across the mission list
    const difficulties = [
      MissionDifficulty.Easy,
      MissionDifficulty.Easy,
      MissionDifficulty.Medium,
      MissionDifficulty.Medium,
      MissionDifficulty.Medium,
      MissionDifficulty.Hard,
      MissionDifficulty.Hard,
      MissionDifficulty.Hard,
      MissionDifficulty.Elite,
      MissionDifficulty.Heroic,
    ];
    return difficulties[index % difficulties.length]!;
  }

  /**
   * Calculate mission rewards
   */
  private calculateRewards(
    difficulty: MissionDifficultyValue,
    playerLevel: number,
    faction?: FactionValue
  ): { credits: number; xp: number; factionPoints: number } {
    const difficultyMult = Math.pow(this.options.creditDifficultyMultiplier, difficulty - 1);
    const xpDifficultyMult = Math.pow(this.options.xpDifficultyMultiplier, difficulty - 1);

    const credits = Math.floor(
      (this.options.baseCreditReward +
        playerLevel * this.options.creditLevelMultiplier) *
        difficultyMult
    );

    const xp = Math.floor(
      (this.options.baseXpReward + playerLevel * this.options.xpLevelMultiplier) *
        xpDifficultyMult
    );

    const factionPoints = faction ? Math.floor(10 * difficulty) : 0;

    return { credits, xp, factionPoints };
  }

  /**
   * Calculate time limit based on mission type and difficulty
   */
  private calculateTimeLimit(
    missionType: number,
    difficulty: MissionDifficultyValue
  ): number {
    const baseTime = 1800; // 30 minutes base
    const typeMultiplier = missionType === MissionType.Delivery ? 1.5 : 1.0;
    const difficultyMultiplier = 1 + (difficulty - 1) * 0.2;

    return Math.floor(baseTime * typeMultiplier * difficultyMultiplier);
  }

  /**
   * Generate a target location near the terminal
   */
  private generateTargetLocation(terminal: TerminalState): MissionLocation {
    const angle = Math.random() * Math.PI * 2;
    const distance =
      this.options.minMissionDistance +
      Math.random() * (this.options.maxMissionDistance - this.options.minMissionDistance);

    return {
      planet: terminal.planet,
      x: terminal.x + Math.cos(angle) * distance,
      y: terminal.y + Math.sin(angle) * distance,
      z: terminal.z,
    };
  }

  /**
   * Generate a delivery destination
   */
  private generateDeliveryLocation(terminal: TerminalState): MissionLocation {
    const angle = Math.random() * Math.PI * 2;
    const distance =
      this.options.minMissionDistance +
      Math.random() * (this.options.maxMissionDistance - this.options.minMissionDistance);

    return {
      planet: terminal.planet,
      x: terminal.x + Math.cos(angle) * distance,
      y: terminal.y + Math.sin(angle) * distance,
      z: terminal.z,
      name: 'Delivery Point',
    };
  }

  /**
   * Select a target for the mission
   */
  private selectTarget(
    planet: string,
    targetLevel: number,
    missionType: number
  ): MissionTarget | undefined {
    const planetTargets = CREATURE_TARGETS[planet.toLowerCase()] ?? CREATURE_TARGETS['tatooine'];

    if (!planetTargets || planetTargets.length === 0) {
      return undefined;
    }

    // Filter by level range
    const suitable = planetTargets.filter(
      (t) => Math.abs(t.level - targetLevel) <= 15
    );

    if (suitable.length === 0) {
      return planetTargets[0];
    }

    return suitable[Math.floor(Math.random() * suitable.length)];
  }

  /**
   * Get mission text (title and description)
   */
  private getMissionText(
    missionType: number,
    difficulty: MissionDifficultyValue
  ): { title: string; description: string } {
    let titles: string[];
    let description: string;

    switch (missionType) {
      case MissionType.Destroy:
        titles = DESTROY_MISSION_TITLES;
        description =
          'Eliminate the hostile targets in the designated area. Return when the job is done.';
        break;
      case MissionType.Delivery:
        titles = DELIVERY_MISSION_TITLES;
        description =
          'Pick up the package and deliver it safely to the destination. Time is of the essence.';
        break;
      case MissionType.Bounty:
        titles = BOUNTY_MISSION_TITLES;
        description =
          'Track down and neutralize the target. Proof of completion required.';
        break;
      case MissionType.Survey:
        titles = SURVEY_MISSION_TITLES;
        description =
          'Survey the designated location and gather resource data. Specialized equipment required.';
        break;
      case MissionType.Recon:
        titles = RECON_MISSION_TITLES;
        description =
          'Scout the area and report back with intelligence. Avoid detection if possible.';
        break;
      default:
        titles = DESTROY_MISSION_TITLES;
        description = 'Complete the assigned task and report back.';
    }

    const title = titles[Math.floor(Math.random() * titles.length)];

    // Add difficulty prefix
    const difficultyPrefix =
      difficulty >= MissionDifficulty.Elite
        ? '[ELITE] '
        : difficulty >= MissionDifficulty.Hard
          ? '[HARD] '
          : '';

    return {
      title: difficultyPrefix + title,
      description,
    };
  }

  /**
   * Get creator name for the mission
   */
  private getCreatorName(terminal: TerminalState): string {
    if (terminal.faction === Faction.Rebel) {
      return 'Rebel Alliance';
    }
    if (terminal.faction === Faction.Imperial) {
      return 'Imperial Forces';
    }
    return 'Mission Board';
  }

  // ============================================
  // Mission Acceptance
  // ============================================

  /**
   * Accept a mission from a terminal
   */
  acceptMission(
    playerId: ObjectId,
    missionId: string
  ): MissionOperationResult {
    // Find the mission
    let mission: GeneratedMission | undefined;
    for (const terminal of this.terminals.values()) {
      mission = terminal.missions.find((m) => m.missionId === missionId);
      if (mission) break;
    }

    if (!mission) {
      return {
        success: false,
        message: 'Mission not found or has expired',
      };
    }

    // Check if already accepted
    if (this.acceptedMissions.has(missionId)) {
      return {
        success: false,
        message: 'Mission has already been accepted',
      };
    }

    // Check player mission limit
    const playerKey = playerId.toString();
    let playerMissions = this.playerMissions.get(playerKey);
    if (!playerMissions) {
      playerMissions = new Set();
      this.playerMissions.set(playerKey, playerMissions);
    }

    if (playerMissions.size >= 2) {
      return {
        success: false,
        message: 'You already have the maximum number of missions',
      };
    }

    // Accept the mission
    const accepted: AcceptedMission = {
      mission,
      playerId,
      acceptedAt: Date.now(),
      status: 'active',
    };

    this.acceptedMissions.set(missionId, accepted);
    playerMissions.add(missionId);

    return {
      success: true,
      message: 'Mission accepted',
      data: mission,
    };
  }

  /**
   * Abandon a mission
   */
  abandonMission(playerId: ObjectId, missionId: string): MissionOperationResult {
    const accepted = this.acceptedMissions.get(missionId);
    if (!accepted || accepted.playerId !== playerId) {
      return {
        success: false,
        message: 'Mission not found',
      };
    }

    accepted.status = 'abandoned';
    this.acceptedMissions.delete(missionId);

    const playerKey = playerId.toString();
    const playerMissions = this.playerMissions.get(playerKey);
    if (playerMissions) {
      playerMissions.delete(missionId);
    }

    return {
      success: true,
      message: 'Mission abandoned',
    };
  }

  /**
   * Complete a mission
   */
  completeMission(playerId: ObjectId, missionId: string): MissionOperationResult {
    const accepted = this.acceptedMissions.get(missionId);
    if (!accepted || accepted.playerId !== playerId) {
      return {
        success: false,
        message: 'Mission not found',
      };
    }

    if (accepted.status !== 'active') {
      return {
        success: false,
        message: 'Mission is not active',
      };
    }

    accepted.status = 'completed';
    this.acceptedMissions.delete(missionId);

    const playerKey = playerId.toString();
    const playerMissions = this.playerMissions.get(playerKey);
    if (playerMissions) {
      playerMissions.delete(missionId);
    }

    return {
      success: true,
      message: 'Mission completed',
      data: accepted.mission.rewards,
    };
  }

  /**
   * Fail a mission
   */
  failMission(playerId: ObjectId, missionId: string): MissionOperationResult {
    const accepted = this.acceptedMissions.get(missionId);
    if (!accepted || accepted.playerId !== playerId) {
      return {
        success: false,
        message: 'Mission not found',
      };
    }

    accepted.status = 'failed';
    this.acceptedMissions.delete(missionId);

    const playerKey = playerId.toString();
    const playerMissions = this.playerMissions.get(playerKey);
    if (playerMissions) {
      playerMissions.delete(missionId);
    }

    return {
      success: true,
      message: 'Mission failed',
    };
  }

  // ============================================
  // Refresh Mechanics
  // ============================================

  /**
   * Refresh missions at a terminal
   */
  refreshMissions(terminalId: bigint): void {
    const terminalKey = terminalId.toString();
    const terminal = this.terminals.get(terminalKey);
    if (!terminal) {
      return;
    }

    // Force refresh by setting lastRefresh to 0
    terminal.lastRefresh = 0;
    terminal.missions = [];
  }

  /**
   * Check and refresh all terminals that need it
   */
  processTerminalRefresh(): void {
    const now = Date.now();
    for (const terminal of this.terminals.values()) {
      if (now - terminal.lastRefresh >= terminal.refreshInterval * 1000) {
        terminal.missions = [];
        terminal.lastRefresh = 0;
      }
    }
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Get mission reward calculation
   */
  getMissionReward(
    mission: MissionData,
    difficulty: MissionDifficultyValue
  ): { credits: number; xp: number; factionPoints: number } {
    return mission.rewards;
  }

  /**
   * Get player's active missions
   */
  getPlayerMissions(playerId: ObjectId): AcceptedMission[] {
    const playerKey = playerId.toString();
    const missionIds = this.playerMissions.get(playerKey);
    if (!missionIds) {
      return [];
    }

    const missions: AcceptedMission[] = [];
    for (const missionId of missionIds) {
      const accepted = this.acceptedMissions.get(missionId);
      if (accepted && accepted.status === 'active') {
        missions.push(accepted);
      }
    }

    return missions;
  }

  /**
   * Get an accepted mission by ID
   */
  getAcceptedMission(missionId: string): AcceptedMission | undefined {
    return this.acceptedMissions.get(missionId);
  }

  /**
   * Check if a mission has expired (time limit)
   */
  checkMissionExpiration(missionId: string): boolean {
    const accepted = this.acceptedMissions.get(missionId);
    if (!accepted || accepted.status !== 'active') {
      return false;
    }

    const elapsed = (Date.now() - accepted.acceptedAt) / 1000;
    return elapsed > accepted.mission.timeLimit;
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get service statistics
   */
  getStats(): {
    totalTerminals: number;
    totalMissions: number;
    activeMissions: number;
    completedMissions: number;
  } {
    let totalMissions = 0;
    let activeMissions = 0;
    let completedMissions = 0;

    for (const terminal of this.terminals.values()) {
      totalMissions += terminal.missions.length;
    }

    for (const mission of this.acceptedMissions.values()) {
      if (mission.status === 'active') {
        activeMissions++;
      } else if (mission.status === 'completed') {
        completedMissions++;
      }
    }

    return {
      totalTerminals: this.terminals.size,
      totalMissions,
      activeMissions,
      completedMissions,
    };
  }
}

/**
 * Create a new MissionTerminalService instance
 */
export function createMissionTerminalService(
  options?: MissionTerminalServiceOptions
): MissionTerminalService {
  return new MissionTerminalService(options);
}

/**
 * Singleton instance for global access
 */
let globalMissionTerminalService: MissionTerminalService | null = null;

/**
 * Get or create the global mission terminal service instance
 */
export function getMissionTerminalService(
  options?: MissionTerminalServiceOptions
): MissionTerminalService {
  if (!globalMissionTerminalService) {
    globalMissionTerminalService = new MissionTerminalService(options);
  }
  return globalMissionTerminalService;
}
