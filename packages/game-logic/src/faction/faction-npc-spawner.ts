/**
 * Faction NPC Spawner
 * Manages spawning of faction NPCs based on regional control
 *
 * Handles:
 * - Spawn templates based on region control level
 * - Patrol routes for faction NPCs
 * - Reinforcement mechanics when under attack
 * - Despawning when control changes
 * - Commander/elite spawns at high control levels
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import {
  Faction,
  type FactionNPCTemplate,
  isGCWFaction,
  getOpposingFaction,
  getFactionName,
} from './faction-types.js';

// ============================================
// Enums
// ============================================

/**
 * NPC spawn tier based on control level
 */
export enum NPCSpawnTier {
  /** Basic troops (55-69% control) */
  BASIC = 'basic',
  /** Standard military (70-84% control) */
  STANDARD = 'standard',
  /** Elite forces (85-94% control) */
  ELITE = 'elite',
  /** Command units (95%+ control) */
  COMMAND = 'command',
}

/**
 * NPC role types
 */
export enum NPCRole {
  /** Standard patrol unit */
  PATROL = 'patrol',
  /** Stationary guard */
  GUARD = 'guard',
  /** Roaming scout */
  SCOUT = 'scout',
  /** Heavy assault unit */
  ASSAULT = 'assault',
  /** Commander/officer */
  COMMANDER = 'commander',
  /** Specialist unit (medic, engineer, etc.) */
  SPECIALIST = 'specialist',
  /** Reinforcement unit */
  REINFORCEMENT = 'reinforcement',
}

/**
 * NPC behavior state
 */
export enum NPCBehavior {
  /** Following patrol route */
  PATROLLING = 'patrolling',
  /** Standing guard at position */
  GUARDING = 'guarding',
  /** In combat */
  COMBAT = 'combat',
  /** Retreating to base */
  RETREATING = 'retreating',
  /** Moving to reinforce position */
  REINFORCING = 'reinforcing',
  /** Idle at spawn */
  IDLE = 'idle',
}

// ============================================
// Constants
// ============================================

/** Base spawn count per tier */
export const TIER_BASE_SPAWN_COUNT: Record<NPCSpawnTier, number> = {
  [NPCSpawnTier.BASIC]: 5,
  [NPCSpawnTier.STANDARD]: 10,
  [NPCSpawnTier.ELITE]: 15,
  [NPCSpawnTier.COMMAND]: 20,
};

/** Control threshold for each tier */
export const TIER_CONTROL_THRESHOLD: Record<NPCSpawnTier, number> = {
  [NPCSpawnTier.BASIC]: 55,
  [NPCSpawnTier.STANDARD]: 70,
  [NPCSpawnTier.ELITE]: 85,
  [NPCSpawnTier.COMMAND]: 95,
};

/** Reinforcement delay (ms) */
export const REINFORCEMENT_DELAY_MS = 30 * 1000;

/** Maximum reinforcement waves */
export const MAX_REINFORCEMENT_WAVES = 3;

/** Respawn delay for killed NPCs (ms) */
export const NPC_RESPAWN_DELAY_MS = 5 * 60 * 1000;

/** Patrol update interval (ms) */
export const PATROL_UPDATE_INTERVAL_MS = 5000;

/** Maximum patrol waypoints */
export const MAX_PATROL_WAYPOINTS = 8;

/** Maximum NPCs per region */
export const MAX_NPCS_PER_REGION = 100;

// ============================================
// Types
// ============================================

/**
 * Patrol waypoint
 */
export interface PatrolWaypoint {
  /** Waypoint position */
  position: Vector3;
  /** Time to wait at waypoint (ms) */
  waitTime: number;
  /** Optional behavior at waypoint */
  behavior?: NPCBehavior;
}

/**
 * Patrol route
 */
export interface PatrolRoute {
  /** Route ID */
  id: string;
  /** Route name */
  name: string;
  /** Ordered waypoints */
  waypoints: PatrolWaypoint[];
  /** Whether route loops */
  loop: boolean;
  /** Faction this route belongs to */
  faction: Faction;
}

/**
 * Spawned NPC instance
 */
export interface SpawnedNPC {
  /** Unique instance ID */
  instanceId: ObjectId;
  /** Template used to spawn */
  templateId: string;
  /** Faction */
  faction: Faction;
  /** Role */
  role: NPCRole;
  /** Spawn tier */
  tier: NPCSpawnTier;
  /** Current position */
  position: Vector3;
  /** Current behavior */
  behavior: NPCBehavior;
  /** Assigned patrol route */
  patrolRoute: PatrolRoute | null;
  /** Current waypoint index */
  currentWaypointIndex: number;
  /** Spawn time */
  spawnedAt: Date;
  /** Whether NPC is alive */
  alive: boolean;
  /** Time of death (null if alive) */
  diedAt: Date | null;
  /** Health percentage (0-100) */
  healthPercent: number;
  /** In combat with */
  inCombatWith: ObjectId[];
}

/**
 * Spawn point definition
 */
export interface SpawnPoint {
  /** Spawn point ID */
  id: string;
  /** Position */
  position: Vector3;
  /** Faction */
  faction: Faction;
  /** Roles that can spawn here */
  allowedRoles: NPCRole[];
  /** Tiers that can spawn here */
  allowedTiers: NPCSpawnTier[];
  /** Maximum NPCs at this spawn */
  maxNPCs: number;
  /** Currently spawned count */
  currentCount: number;
  /** Whether spawn point is active */
  active: boolean;
}

/**
 * Reinforcement request
 */
export interface ReinforcementRequest {
  /** Request ID */
  id: string;
  /** Position to reinforce */
  position: Vector3;
  /** Faction requesting */
  faction: Faction;
  /** Requested count */
  requestedCount: number;
  /** Spawned count */
  spawnedCount: number;
  /** Request time */
  requestedAt: Date;
  /** Wave number (0-indexed) */
  waveNumber: number;
  /** Priority (higher = more urgent) */
  priority: number;
}

/**
 * NPC Spawner configuration
 */
export interface NPCSpawnerConfig {
  /** Enable detailed logging */
  enableLogging: boolean;
  /** Maximum NPCs per region */
  maxNPCs: number;
  /** Respawn delay (ms) */
  respawnDelay: number;
  /** Reinforcement delay (ms) */
  reinforcementDelay: number;
  /** Maximum reinforcement waves */
  maxReinforcementWaves: number;
  /** Patrol update interval (ms) */
  patrolUpdateInterval: number;
}

/**
 * Default NPC Spawner configuration
 */
export const DEFAULT_SPAWNER_CONFIG: NPCSpawnerConfig = {
  enableLogging: false,
  maxNPCs: MAX_NPCS_PER_REGION,
  respawnDelay: NPC_RESPAWN_DELAY_MS,
  reinforcementDelay: REINFORCEMENT_DELAY_MS,
  maxReinforcementWaves: MAX_REINFORCEMENT_WAVES,
  patrolUpdateInterval: PATROL_UPDATE_INTERVAL_MS,
};

// ============================================
// Event Types
// ============================================

/**
 * Event emitted when NPC is spawned
 */
export interface NPCSpawnedEvent {
  npc: SpawnedNPC;
  regionId: string;
  timestamp: Date;
}

/**
 * Event emitted when NPC is despawned
 */
export interface NPCDespawnedEvent {
  instanceId: ObjectId;
  templateId: string;
  faction: Faction;
  reason: 'killed' | 'control_change' | 'cleanup' | 'manual';
  regionId: string;
  timestamp: Date;
}

/**
 * Event emitted when reinforcements are called
 */
export interface ReinforcementsCalledEvent {
  request: ReinforcementRequest;
  regionId: string;
  timestamp: Date;
}

// ============================================
// Handler Types
// ============================================

export type NPCSpawnedHandler = (event: NPCSpawnedEvent) => void;
export type NPCDespawnedHandler = (event: NPCDespawnedEvent) => void;
export type ReinforcementsCalledHandler = (event: ReinforcementsCalledEvent) => void;

// ============================================
// NPC Templates
// ============================================

/**
 * Imperial NPC templates by tier
 */
export const IMPERIAL_TEMPLATES: Record<NPCSpawnTier, FactionNPCTemplate[]> = {
  [NPCSpawnTier.BASIC]: [
    { templateId: 'imp_stormtrooper', faction: Faction.IMPERIAL, pointsOnKill: 5, bonusPoints: 0, difficulty: 1, minRankForFullPoints: 0 },
    { templateId: 'imp_scout_trooper', faction: Faction.IMPERIAL, pointsOnKill: 5, bonusPoints: 0, difficulty: 1, minRankForFullPoints: 0 },
  ],
  [NPCSpawnTier.STANDARD]: [
    { templateId: 'imp_stormtrooper_sergeant', faction: Faction.IMPERIAL, pointsOnKill: 10, bonusPoints: 5, difficulty: 2, minRankForFullPoints: 3 },
    { templateId: 'imp_dark_trooper', faction: Faction.IMPERIAL, pointsOnKill: 15, bonusPoints: 5, difficulty: 3, minRankForFullPoints: 5 },
  ],
  [NPCSpawnTier.ELITE]: [
    { templateId: 'imp_stormtrooper_captain', faction: Faction.IMPERIAL, pointsOnKill: 20, bonusPoints: 10, difficulty: 4, minRankForFullPoints: 7 },
    { templateId: 'imp_shock_trooper', faction: Faction.IMPERIAL, pointsOnKill: 25, bonusPoints: 10, difficulty: 5, minRankForFullPoints: 9 },
  ],
  [NPCSpawnTier.COMMAND]: [
    { templateId: 'imp_commander', faction: Faction.IMPERIAL, pointsOnKill: 50, bonusPoints: 25, difficulty: 6, minRankForFullPoints: 11 },
    { templateId: 'imp_general', faction: Faction.IMPERIAL, pointsOnKill: 100, bonusPoints: 50, difficulty: 8, minRankForFullPoints: 14 },
  ],
};

/**
 * Rebel NPC templates by tier
 */
export const REBEL_TEMPLATES: Record<NPCSpawnTier, FactionNPCTemplate[]> = {
  [NPCSpawnTier.BASIC]: [
    { templateId: 'reb_trooper', faction: Faction.REBEL, pointsOnKill: 5, bonusPoints: 0, difficulty: 1, minRankForFullPoints: 0 },
    { templateId: 'reb_scout', faction: Faction.REBEL, pointsOnKill: 5, bonusPoints: 0, difficulty: 1, minRankForFullPoints: 0 },
  ],
  [NPCSpawnTier.STANDARD]: [
    { templateId: 'reb_commando', faction: Faction.REBEL, pointsOnKill: 10, bonusPoints: 5, difficulty: 2, minRankForFullPoints: 3 },
    { templateId: 'reb_specforce', faction: Faction.REBEL, pointsOnKill: 15, bonusPoints: 5, difficulty: 3, minRankForFullPoints: 5 },
  ],
  [NPCSpawnTier.ELITE]: [
    { templateId: 'reb_specforce_captain', faction: Faction.REBEL, pointsOnKill: 20, bonusPoints: 10, difficulty: 4, minRankForFullPoints: 7 },
    { templateId: 'reb_commando_elite', faction: Faction.REBEL, pointsOnKill: 25, bonusPoints: 10, difficulty: 5, minRankForFullPoints: 9 },
  ],
  [NPCSpawnTier.COMMAND]: [
    { templateId: 'reb_commander', faction: Faction.REBEL, pointsOnKill: 50, bonusPoints: 25, difficulty: 6, minRankForFullPoints: 11 },
    { templateId: 'reb_general', faction: Faction.REBEL, pointsOnKill: 100, bonusPoints: 50, difficulty: 8, minRankForFullPoints: 14 },
  ],
};

// ============================================
// Faction NPC Spawner Class
// ============================================

/**
 * FactionNPCSpawner
 * Manages faction NPC spawning for a region
 */
export class FactionNPCSpawner {
  /** Region ID */
  readonly regionId: string;

  /** Planet name */
  readonly planet: string;

  /** Configuration */
  private config: NPCSpawnerConfig;

  /** Spawned NPCs */
  private spawnedNPCs: Map<ObjectId, SpawnedNPC>;

  /** Spawn points */
  private spawnPoints: Map<string, SpawnPoint>;

  /** Patrol routes */
  private patrolRoutes: Map<string, PatrolRoute>;

  /** Active reinforcement requests */
  private reinforcementRequests: Map<string, ReinforcementRequest>;

  /** Current controlling faction */
  private controllingFaction: Faction;

  /** Current control level */
  private controlLevel: number;

  /** Patrol update interval */
  private patrolUpdateInterval: ReturnType<typeof setInterval> | null;

  /** Respawn queue */
  private respawnQueue: Map<string, { templateId: string; spawnPointId: string; scheduledTime: Date }>;

  /** Next instance ID counter */
  private nextInstanceId: bigint;

  /** Event handlers */
  private npcSpawnedHandlers: Set<NPCSpawnedHandler>;
  private npcDespawnedHandlers: Set<NPCDespawnedHandler>;
  private reinforcementsCalledHandlers: Set<ReinforcementsCalledHandler>;

  /**
   * Create a new Faction NPC Spawner
   */
  constructor(
    regionId: string,
    planet: string,
    config: Partial<NPCSpawnerConfig> = {}
  ) {
    this.regionId = regionId;
    this.planet = planet;
    this.config = { ...DEFAULT_SPAWNER_CONFIG, ...config };

    this.spawnedNPCs = new Map();
    this.spawnPoints = new Map();
    this.patrolRoutes = new Map();
    this.reinforcementRequests = new Map();
    this.controllingFaction = Faction.NEUTRAL;
    this.controlLevel = 0;
    this.patrolUpdateInterval = null;
    this.respawnQueue = new Map();
    this.nextInstanceId = 1n;

    this.npcSpawnedHandlers = new Set();
    this.npcDespawnedHandlers = new Set();
    this.reinforcementsCalledHandlers = new Set();
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the spawner with spawn points and routes
   */
  initialize(
    spawnPoints: SpawnPoint[],
    patrolRoutes: PatrolRoute[]
  ): void {
    for (const sp of spawnPoints) {
      this.spawnPoints.set(sp.id, sp);
    }

    for (const route of patrolRoutes) {
      this.patrolRoutes.set(route.id, route);
    }

    // Start patrol update interval
    this.patrolUpdateInterval = setInterval(
      () => this.updatePatrols(),
      this.config.patrolUpdateInterval
    );

    if (this.config.enableLogging) {
      console.log(`[FactionNPCSpawner] Initialized for ${this.regionId} with ${spawnPoints.length} spawn points`);
    }
  }

  /**
   * Shutdown the spawner
   */
  shutdown(): void {
    if (this.patrolUpdateInterval) {
      clearInterval(this.patrolUpdateInterval);
      this.patrolUpdateInterval = null;
    }

    // Despawn all NPCs
    this.despawnAllNPCs('cleanup');

    this.spawnPoints.clear();
    this.patrolRoutes.clear();
    this.reinforcementRequests.clear();
    this.respawnQueue.clear();
  }

  // ============================================
  // Event Registration
  // ============================================

  onNPCSpawned(handler: NPCSpawnedHandler): void {
    this.npcSpawnedHandlers.add(handler);
  }

  offNPCSpawned(handler: NPCSpawnedHandler): void {
    this.npcSpawnedHandlers.delete(handler);
  }

  onNPCDespawned(handler: NPCDespawnedHandler): void {
    this.npcDespawnedHandlers.add(handler);
  }

  offNPCDespawned(handler: NPCDespawnedHandler): void {
    this.npcDespawnedHandlers.delete(handler);
  }

  onReinforcementsCalled(handler: ReinforcementsCalledHandler): void {
    this.reinforcementsCalledHandlers.add(handler);
  }

  offReinforcementsCalled(handler: ReinforcementsCalledHandler): void {
    this.reinforcementsCalledHandlers.delete(handler);
  }

  // ============================================
  // Event Emission
  // ============================================

  private emitNPCSpawned(npc: SpawnedNPC): void {
    const event: NPCSpawnedEvent = {
      npc,
      regionId: this.regionId,
      timestamp: new Date(),
    };
    for (const handler of this.npcSpawnedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[FactionNPCSpawner] Error in NPC spawned handler:', error);
      }
    }
  }

  private emitNPCDespawned(npc: SpawnedNPC, reason: 'killed' | 'control_change' | 'cleanup' | 'manual'): void {
    const event: NPCDespawnedEvent = {
      instanceId: npc.instanceId,
      templateId: npc.templateId,
      faction: npc.faction,
      reason,
      regionId: this.regionId,
      timestamp: new Date(),
    };
    for (const handler of this.npcDespawnedHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[FactionNPCSpawner] Error in NPC despawned handler:', error);
      }
    }
  }

  private emitReinforcementsCalled(request: ReinforcementRequest): void {
    const event: ReinforcementsCalledEvent = {
      request,
      regionId: this.regionId,
      timestamp: new Date(),
    };
    for (const handler of this.reinforcementsCalledHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[FactionNPCSpawner] Error in reinforcements called handler:', error);
      }
    }
  }

  // ============================================
  // Spawning
  // ============================================

  /**
   * Spawn a wave of NPCs based on control level
   */
  spawnWave(faction: Faction, controlLevel: number): number {
    if (!isGCWFaction(faction)) return 0;

    this.controllingFaction = faction;
    this.controlLevel = controlLevel;

    const tier = this.getTierForControlLevel(controlLevel);
    const targetCount = TIER_BASE_SPAWN_COUNT[tier];

    // Get current count for this faction
    const currentCount = this.getNPCCountByFaction(faction);
    const toSpawn = Math.min(
      targetCount - currentCount,
      this.config.maxNPCs - this.spawnedNPCs.size
    );

    if (toSpawn <= 0) return 0;

    let spawned = 0;
    const templates = faction === Faction.IMPERIAL
      ? IMPERIAL_TEMPLATES[tier]
      : REBEL_TEMPLATES[tier];

    const availableSpawnPoints = Array.from(this.spawnPoints.values())
      .filter(sp => sp.faction === faction && sp.active && sp.currentCount < sp.maxNPCs);

    for (let i = 0; i < toSpawn && availableSpawnPoints.length > 0; i++) {
      const spawnPoint = availableSpawnPoints[i % availableSpawnPoints.length];
      const template = templates[Math.floor(Math.random() * templates.length)];

      const npc = this.spawnNPC(template, tier, spawnPoint);
      if (npc) {
        spawned++;
        spawnPoint.currentCount++;
      }
    }

    if (this.config.enableLogging) {
      console.log(`[FactionNPCSpawner] Spawned ${spawned} ${getFactionName(faction)} NPCs (tier: ${tier})`);
    }

    return spawned;
  }

  /**
   * Spawn a single NPC
   */
  private spawnNPC(
    template: FactionNPCTemplate,
    tier: NPCSpawnTier,
    spawnPoint: SpawnPoint
  ): SpawnedNPC | null {
    // Determine role based on spawn point and tier
    let role = NPCRole.PATROL;
    if (spawnPoint.allowedRoles.length > 0) {
      role = spawnPoint.allowedRoles[Math.floor(Math.random() * spawnPoint.allowedRoles.length)];
    }
    if (tier === NPCSpawnTier.COMMAND && template.templateId.includes('commander')) {
      role = NPCRole.COMMANDER;
    }

    // Find a patrol route if patrolling
    let patrolRoute: PatrolRoute | null = null;
    if (role === NPCRole.PATROL || role === NPCRole.SCOUT) {
      const routes = Array.from(this.patrolRoutes.values())
        .filter(r => r.faction === template.faction);
      if (routes.length > 0) {
        patrolRoute = routes[Math.floor(Math.random() * routes.length)];
      }
    }

    const instanceId = this.nextInstanceId++;

    const npc: SpawnedNPC = {
      instanceId,
      templateId: template.templateId,
      faction: template.faction,
      role,
      tier,
      position: { ...spawnPoint.position },
      behavior: role === NPCRole.GUARD ? NPCBehavior.GUARDING : NPCBehavior.PATROLLING,
      patrolRoute,
      currentWaypointIndex: 0,
      spawnedAt: new Date(),
      alive: true,
      diedAt: null,
      healthPercent: 100,
      inCombatWith: [],
    };

    this.spawnedNPCs.set(instanceId, npc);
    this.emitNPCSpawned(npc);

    return npc;
  }

  /**
   * Spawn reinforcements at a position
   */
  spawnReinforcements(position: Vector3, faction: Faction, count: number, priority: number = 1): string {
    const requestId = `reinforce_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const request: ReinforcementRequest = {
      id: requestId,
      position,
      faction,
      requestedCount: count,
      spawnedCount: 0,
      requestedAt: new Date(),
      waveNumber: 0,
      priority,
    };

    this.reinforcementRequests.set(requestId, request);
    this.emitReinforcementsCalled(request);

    // Schedule reinforcement spawning
    setTimeout(() => this.processReinforcementRequest(requestId), this.config.reinforcementDelay);

    if (this.config.enableLogging) {
      console.log(`[FactionNPCSpawner] Reinforcement request ${requestId} created for ${count} ${getFactionName(faction)} NPCs`);
    }

    return requestId;
  }

  /**
   * Process a reinforcement request
   */
  private processReinforcementRequest(requestId: string): void {
    const request = this.reinforcementRequests.get(requestId);
    if (!request) return;

    // Check if we can spawn more
    if (this.spawnedNPCs.size >= this.config.maxNPCs) {
      if (this.config.enableLogging) {
        console.log(`[FactionNPCSpawner] Cannot spawn reinforcements - max NPCs reached`);
      }
      return;
    }

    const tier = this.getTierForControlLevel(this.controlLevel);
    const templates = request.faction === Faction.IMPERIAL
      ? IMPERIAL_TEMPLATES[tier]
      : REBEL_TEMPLATES[tier];

    // Spawn reinforcement NPCs
    const toSpawn = Math.min(
      Math.ceil(request.requestedCount / this.config.maxReinforcementWaves),
      this.config.maxNPCs - this.spawnedNPCs.size
    );

    for (let i = 0; i < toSpawn; i++) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      const offset = {
        x: (Math.random() - 0.5) * 20,
        y: 0,
        z: (Math.random() - 0.5) * 20,
      };
      const position = {
        x: request.position.x + offset.x,
        y: request.position.y + offset.y,
        z: request.position.z + offset.z,
      };

      // Create a temporary spawn point for reinforcements
      const tempSpawnPoint: SpawnPoint = {
        id: `temp_${requestId}_${i}`,
        position,
        faction: request.faction,
        allowedRoles: [NPCRole.REINFORCEMENT],
        allowedTiers: [tier],
        maxNPCs: 1,
        currentCount: 0,
        active: true,
      };

      const npc = this.spawnNPC(template, tier, tempSpawnPoint);
      if (npc) {
        npc.role = NPCRole.REINFORCEMENT;
        npc.behavior = NPCBehavior.REINFORCING;
        request.spawnedCount++;
      }
    }

    request.waveNumber++;

    // Schedule next wave if needed
    if (request.spawnedCount < request.requestedCount &&
        request.waveNumber < this.config.maxReinforcementWaves) {
      setTimeout(
        () => this.processReinforcementRequest(requestId),
        this.config.reinforcementDelay
      );
    } else {
      // Request complete
      this.reinforcementRequests.delete(requestId);
    }
  }

  // ============================================
  // Despawning
  // ============================================

  /**
   * Handle control change - despawn enemy NPCs
   */
  handleControlChange(newControllingFaction: Faction): void {
    if (newControllingFaction === this.controllingFaction) return;

    // Despawn NPCs of the previous controlling faction
    const toDespawn: ObjectId[] = [];
    for (const [id, npc] of this.spawnedNPCs) {
      if (npc.faction !== newControllingFaction && npc.faction !== Faction.NEUTRAL) {
        toDespawn.push(id);
      }
    }

    for (const id of toDespawn) {
      this.despawnNPC(id, 'control_change');
    }

    this.controllingFaction = newControllingFaction;

    if (this.config.enableLogging) {
      console.log(`[FactionNPCSpawner] Control changed to ${getFactionName(newControllingFaction)}, despawned ${toDespawn.length} NPCs`);
    }
  }

  /**
   * Despawn a specific NPC
   */
  despawnNPC(instanceId: ObjectId, reason: 'killed' | 'control_change' | 'cleanup' | 'manual'): void {
    const npc = this.spawnedNPCs.get(instanceId);
    if (!npc) return;

    // Update spawn point count
    for (const sp of this.spawnPoints.values()) {
      if (sp.faction === npc.faction) {
        sp.currentCount = Math.max(0, sp.currentCount - 1);
      }
    }

    this.spawnedNPCs.delete(instanceId);
    this.emitNPCDespawned(npc, reason);

    // Schedule respawn if killed
    if (reason === 'killed') {
      this.scheduleRespawn(npc.templateId);
    }
  }

  /**
   * Despawn all NPCs
   */
  despawnAllNPCs(reason: 'killed' | 'control_change' | 'cleanup' | 'manual'): void {
    const ids = Array.from(this.spawnedNPCs.keys());
    for (const id of ids) {
      this.despawnNPC(id, reason);
    }
  }

  /**
   * Schedule NPC respawn
   */
  private scheduleRespawn(templateId: string): void {
    const respawnId = `respawn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Find a suitable spawn point
    const spawnPoint = Array.from(this.spawnPoints.values())
      .find(sp => sp.faction === this.controllingFaction && sp.active && sp.currentCount < sp.maxNPCs);

    if (!spawnPoint) return;

    this.respawnQueue.set(respawnId, {
      templateId,
      spawnPointId: spawnPoint.id,
      scheduledTime: new Date(Date.now() + this.config.respawnDelay),
    });

    setTimeout(() => {
      this.processRespawn(respawnId);
    }, this.config.respawnDelay);
  }

  /**
   * Process a scheduled respawn
   */
  private processRespawn(respawnId: string): void {
    const respawn = this.respawnQueue.get(respawnId);
    if (!respawn) return;

    this.respawnQueue.delete(respawnId);

    if (this.spawnedNPCs.size >= this.config.maxNPCs) return;

    const spawnPoint = this.spawnPoints.get(respawn.spawnPointId);
    if (!spawnPoint || !spawnPoint.active || spawnPoint.currentCount >= spawnPoint.maxNPCs) return;

    // Find the template
    const tier = this.getTierForControlLevel(this.controlLevel);
    const templates = this.controllingFaction === Faction.IMPERIAL
      ? IMPERIAL_TEMPLATES
      : REBEL_TEMPLATES;

    for (const tierTemplates of Object.values(templates)) {
      const template = tierTemplates.find(t => t.templateId === respawn.templateId);
      if (template) {
        this.spawnNPC(template, tier, spawnPoint);
        spawnPoint.currentCount++;
        break;
      }
    }
  }

  // ============================================
  // Patrol Management
  // ============================================

  /**
   * Update all patrolling NPCs
   */
  private updatePatrols(): void {
    for (const npc of this.spawnedNPCs.values()) {
      if (!npc.alive || npc.behavior !== NPCBehavior.PATROLLING || !npc.patrolRoute) {
        continue;
      }

      this.updateNPCPatrol(npc);
    }
  }

  /**
   * Update a single NPC's patrol
   */
  private updateNPCPatrol(npc: SpawnedNPC): void {
    if (!npc.patrolRoute) return;

    const waypoints = npc.patrolRoute.waypoints;
    if (waypoints.length === 0) return;

    const currentWaypoint = waypoints[npc.currentWaypointIndex];

    // Check if NPC has reached waypoint
    const distance = this.calculateDistance(npc.position, currentWaypoint.position);
    if (distance < 2) {
      // Advance to next waypoint
      npc.currentWaypointIndex++;
      if (npc.currentWaypointIndex >= waypoints.length) {
        if (npc.patrolRoute.loop) {
          npc.currentWaypointIndex = 0;
        } else {
          // Return to start
          npc.currentWaypointIndex = waypoints.length - 1;
        }
      }
    }

    // Move towards current waypoint
    const targetWaypoint = waypoints[npc.currentWaypointIndex];
    const direction = this.normalizeVector({
      x: targetWaypoint.position.x - npc.position.x,
      y: targetWaypoint.position.y - npc.position.y,
      z: targetWaypoint.position.z - npc.position.z,
    });

    // Move at patrol speed (simplified)
    const speed = 2; // meters per update
    npc.position.x += direction.x * speed;
    npc.position.y += direction.y * speed;
    npc.position.z += direction.z * speed;
  }

  // ============================================
  // Combat
  // ============================================

  /**
   * Handle NPC entering combat
   */
  enterCombat(instanceId: ObjectId, attackerId: ObjectId): void {
    const npc = this.spawnedNPCs.get(instanceId);
    if (!npc || !npc.alive) return;

    npc.behavior = NPCBehavior.COMBAT;
    if (!npc.inCombatWith.includes(attackerId)) {
      npc.inCombatWith.push(attackerId);
    }

    // Check if reinforcements should be called
    if (npc.role === NPCRole.COMMANDER || npc.role === NPCRole.GUARD) {
      this.spawnReinforcements(npc.position, npc.faction, 3, 2);
    }
  }

  /**
   * Handle NPC taking damage
   */
  takeDamage(instanceId: ObjectId, damagePercent: number): void {
    const npc = this.spawnedNPCs.get(instanceId);
    if (!npc || !npc.alive) return;

    npc.healthPercent = Math.max(0, npc.healthPercent - damagePercent);

    if (npc.healthPercent <= 0) {
      npc.alive = false;
      npc.diedAt = new Date();
      this.despawnNPC(instanceId, 'killed');
    }
  }

  /**
   * Handle NPC leaving combat
   */
  leaveCombat(instanceId: ObjectId, attackerId: ObjectId): void {
    const npc = this.spawnedNPCs.get(instanceId);
    if (!npc) return;

    npc.inCombatWith = npc.inCombatWith.filter(id => id !== attackerId);

    if (npc.inCombatWith.length === 0 && npc.alive) {
      // Return to normal behavior
      npc.behavior = npc.patrolRoute ? NPCBehavior.PATROLLING : NPCBehavior.GUARDING;
    }
  }

  // ============================================
  // Queries
  // ============================================

  /**
   * Get NPC by instance ID
   */
  getNPC(instanceId: ObjectId): SpawnedNPC | undefined {
    return this.spawnedNPCs.get(instanceId);
  }

  /**
   * Get all spawned NPCs
   */
  getAllNPCs(): SpawnedNPC[] {
    return Array.from(this.spawnedNPCs.values());
  }

  /**
   * Get NPCs by faction
   */
  getNPCsByFaction(faction: Faction): SpawnedNPC[] {
    return Array.from(this.spawnedNPCs.values()).filter(npc => npc.faction === faction);
  }

  /**
   * Get NPC count by faction
   */
  getNPCCountByFaction(faction: Faction): number {
    return this.getNPCsByFaction(faction).length;
  }

  /**
   * Get NPCs within radius of position
   */
  getNPCsInRadius(position: Vector3, radius: number): SpawnedNPC[] {
    return Array.from(this.spawnedNPCs.values()).filter(npc => {
      const distance = this.calculateDistance(position, npc.position);
      return distance <= radius;
    });
  }

  /**
   * Get tier for control level
   */
  private getTierForControlLevel(controlLevel: number): NPCSpawnTier {
    if (controlLevel >= TIER_CONTROL_THRESHOLD[NPCSpawnTier.COMMAND]) {
      return NPCSpawnTier.COMMAND;
    } else if (controlLevel >= TIER_CONTROL_THRESHOLD[NPCSpawnTier.ELITE]) {
      return NPCSpawnTier.ELITE;
    } else if (controlLevel >= TIER_CONTROL_THRESHOLD[NPCSpawnTier.STANDARD]) {
      return NPCSpawnTier.STANDARD;
    } else {
      return NPCSpawnTier.BASIC;
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Calculate distance between two points
   */
  private calculateDistance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Normalize a vector
   */
  private normalizeVector(v: Vector3): Vector3 {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (length === 0) return { x: 0, y: 0, z: 0 };
    return {
      x: v.x / length,
      y: v.y / length,
      z: v.z / length,
    };
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new Faction NPC Spawner
 */
export function createFactionNPCSpawner(
  regionId: string,
  planet: string,
  config?: Partial<NPCSpawnerConfig>
): FactionNPCSpawner {
  return new FactionNPCSpawner(regionId, planet, config);
}
