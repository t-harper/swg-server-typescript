/**
 * Lair Manager Service
 * Manages creature lair lifecycle, creature spawning, wave systems,
 * and lair destruction mechanics.
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import { LairObject, LairState, generateObjectId } from '@swg/objects';
import type { CreatureObject } from '@swg/objects';
import type { LairTemplate } from '@swg/game-logic';
import {
  calculateLairHealth,
  getWaveCreatureCount,
  getWaveCreatureTemplate,
  shouldWaveSpawnBoss,
} from '@swg/game-logic';
import type { CreatureSpawner } from './creature-spawner.js';
import type { ZoneService } from './zone-service.js';

/**
 * Active lair tracking info
 */
export interface ActiveLairInfo {
  /** Lair object reference */
  lair: LairObject;
  /** Template used to create the lair */
  template: LairTemplate;
  /** Scene/zone ID */
  sceneId: string;
  /** Spawn position */
  position: Vector3;
  /** Time lair was created */
  createdTime: number;
  /** Pending respawn timer */
  respawnTimer?: ReturnType<typeof setTimeout> | undefined;
  /** Wave spawn timer */
  waveTimer?: ReturnType<typeof setTimeout> | undefined;
}

/**
 * Lair destruction event data
 */
export interface LairDestructionEvent {
  /** Destroyed lair ID */
  lairId: ObjectId;
  /** Template name */
  templateName: string;
  /** Top damager ID */
  topDamagerId: ObjectId;
  /** All damage contributors */
  contributors: Map<ObjectId, number>;
  /** Total XP to distribute */
  xpBonus: number;
  /** Loot table for drops */
  lootTable: string;
  /** Scene where lair was destroyed */
  sceneId: string;
  /** Position of destroyed lair */
  position: Vector3;
}

/**
 * Lair manager options
 */
export interface LairManagerOptions {
  /** Default tick interval in milliseconds */
  tickInterval?: number;
  /** Enable automatic ticking */
  enableAutoTick?: boolean;
  /** Maximum lairs per zone */
  maxLairsPerZone?: number;
}

/**
 * Callback for lair destruction events
 */
export type LairDestructionCallback = (event: LairDestructionEvent) => void;

/**
 * Lair Manager Service
 * Handles lair creation, creature wave spawning, and destruction
 */
export class LairManager {
  /** Template registry */
  private readonly templates: Map<string, LairTemplate>;

  /** Active lairs by object ID */
  private readonly activeLairs: Map<ObjectId, ActiveLairInfo>;

  /** Lairs indexed by scene ID */
  private readonly lairsByScene: Map<string, Set<ObjectId>>;

  /** Creature to lair mapping */
  private readonly creatureToLair: Map<ObjectId, ObjectId>;

  /** Reference to creature spawner */
  private creatureSpawner?: CreatureSpawner;

  /** Reference to zone service */
  private zoneService?: ZoneService;

  /** Configuration options */
  private readonly options: Required<LairManagerOptions>;

  /** Tick timer reference */
  private tickTimer: ReturnType<typeof setInterval> | undefined;

  /** Destruction event callbacks */
  private readonly destructionCallbacks: Set<LairDestructionCallback>;

  /** Whether the manager has been initialized */
  private initialized: boolean = false;

  constructor(options: LairManagerOptions = {}) {
    this.templates = new Map();
    this.activeLairs = new Map();
    this.lairsByScene = new Map();
    this.creatureToLair = new Map();
    this.destructionCallbacks = new Set();
    this.options = {
      tickInterval: options.tickInterval ?? 1000,
      enableAutoTick: options.enableAutoTick ?? true,
      maxLairsPerZone: options.maxLairsPerZone ?? 100,
    };
  }

  /**
   * Initialize the lair manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[LairManager] Initializing...');

    if (this.options.enableAutoTick) {
      this.startTicking();
    }

    this.initialized = true;
    console.log('[LairManager] Initialized');
  }

  /**
   * Shutdown the lair manager
   */
  async shutdown(): Promise<void> {
    console.log('[LairManager] Shutting down...');

    this.stopTicking();

    // Clear all timers
    for (const info of this.activeLairs.values()) {
      if (info.respawnTimer) {
        clearTimeout(info.respawnTimer);
      }
      if (info.waveTimer) {
        clearTimeout(info.waveTimer);
      }
    }

    // Despawn all creatures from lairs
    for (const info of this.activeLairs.values()) {
      for (const creatureId of info.lair.currentCreatures) {
        this.creatureToLair.delete(creatureId);
        if (this.creatureSpawner) {
          this.creatureSpawner.despawn(creatureId);
        }
      }
    }

    this.activeLairs.clear();
    this.lairsByScene.clear();
    this.creatureToLair.clear();
    this.initialized = false;

    console.log('[LairManager] Shutdown complete');
  }

  /**
   * Set the creature spawner reference
   */
  setCreatureSpawner(spawner: CreatureSpawner): void {
    this.creatureSpawner = spawner;
  }

  /**
   * Set the zone service reference
   */
  setZoneService(zoneService: ZoneService): void {
    this.zoneService = zoneService;
  }

  // ============================================
  // Template Management
  // ============================================

  /**
   * Register a lair template
   */
  registerTemplate(template: LairTemplate): void {
    this.templates.set(template.templateName, template);
    console.log(`[LairManager] Registered template: ${template.templateName}`);
  }

  /**
   * Register multiple templates
   */
  registerTemplates(templates: LairTemplate[]): void {
    for (const template of templates) {
      this.registerTemplate(template);
    }
  }

  /**
   * Get a template by name
   */
  getTemplate(templateName: string): LairTemplate | undefined {
    return this.templates.get(templateName);
  }

  /**
   * Check if a template exists
   */
  hasTemplate(templateName: string): boolean {
    return this.templates.has(templateName);
  }

  /**
   * Get all registered template names
   */
  getTemplateNames(): string[] {
    return Array.from(this.templates.keys());
  }

  // ============================================
  // Lair Lifecycle
  // ============================================

  /**
   * Spawn a lair from a template
   * @param template - Lair template to use
   * @param position - World position for the lair
   * @param sceneId - Scene/zone ID
   * @returns Created lair object
   */
  spawnLair(
    template: LairTemplate,
    position: Vector3,
    sceneId: string
  ): LairObject {
    // Check zone lair limit
    const sceneLairs = this.lairsByScene.get(sceneId);
    if (sceneLairs && sceneLairs.size >= this.options.maxLairsPerZone) {
      throw new Error(`Maximum lairs reached for zone ${sceneId}`);
    }

    // Generate object ID and create lair
    const objectId = generateObjectId();
    const templateCrc = this.calculateTemplateCrc(template.appearanceTemplate);
    const lair = new LairObject(objectId, templateCrc);

    // Configure lair from template
    this.configureLairFromTemplate(lair, template);

    // Set position
    lair.setPosition(position.x, position.y, position.z);
    lair.sceneId = sceneId;
    lair.isActive = true;

    // Calculate and set health
    const health = calculateLairHealth(template);
    lair.maxCondition = health;
    lair.condition = health;
    lair.maxHitPoints = health;

    // Track the lair
    const lairInfo: ActiveLairInfo = {
      lair,
      template,
      sceneId,
      position: { ...position },
      createdTime: Date.now(),
    };
    this.activeLairs.set(objectId, lairInfo);

    // Add to scene index
    if (!this.lairsByScene.has(sceneId)) {
      this.lairsByScene.set(sceneId, new Set());
    }
    this.lairsByScene.get(sceneId)!.add(objectId);

    // Spawn in zone if zone service is available
    if (this.zoneService) {
      this.zoneService.spawnObject(lair, sceneId).catch(error => {
        console.error(`[LairManager] Failed to spawn lair in zone:`, error);
      });
    }

    console.log(
      `[LairManager] Spawned lair ${template.templateName} (${objectId}) at ${sceneId} ` +
      `(${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`
    );

    // Perform initial spawn based on behavior
    if (template.spawnBehavior === 'immediate' || !template.spawnBehavior) {
      this.performInitialSpawn(lairInfo);
    }

    return lair;
  }

  /**
   * Spawn a lair by template name
   */
  spawnLairByName(
    templateName: string,
    position: Vector3,
    sceneId: string
  ): LairObject | null {
    const template = this.templates.get(templateName);
    if (!template) {
      console.warn(`[LairManager] Template not found: ${templateName}`);
      return null;
    }
    return this.spawnLair(template, position, sceneId);
  }

  /**
   * Destroy a lair
   */
  destroyLair(lairId: ObjectId): void {
    const info = this.activeLairs.get(lairId);
    if (!info) {
      return;
    }

    // Clear timers
    if (info.respawnTimer) {
      clearTimeout(info.respawnTimer);
    }
    if (info.waveTimer) {
      clearTimeout(info.waveTimer);
    }

    // Despawn all creatures
    for (const creatureId of info.lair.currentCreatures) {
      this.creatureToLair.delete(creatureId);
      if (this.creatureSpawner) {
        this.creatureSpawner.despawn(creatureId);
      }
    }

    // Emit destruction event
    const event: LairDestructionEvent = {
      lairId,
      templateName: info.template.templateName,
      topDamagerId: info.lair.topDamagerId,
      contributors: new Map(info.lair.damageContributors),
      xpBonus: info.lair.xpBonus,
      lootTable: info.lair.lootTable,
      sceneId: info.sceneId,
      position: { ...info.position },
    };
    this.emitDestructionEvent(event);

    // Remove from zone
    if (this.zoneService) {
      this.zoneService.despawnObject(lairId).catch(error => {
        console.error(`[LairManager] Failed to despawn lair from zone:`, error);
      });
    }

    // Clean up tracking
    this.activeLairs.delete(lairId);
    const sceneLairs = this.lairsByScene.get(info.sceneId);
    if (sceneLairs) {
      sceneLairs.delete(lairId);
    }

    console.log(
      `[LairManager] Destroyed lair ${info.template.templateName} (${lairId})`
    );
  }

  /**
   * Configure a lair object from a template
   */
  private configureLairFromTemplate(lair: LairObject, template: LairTemplate): void {
    lair.lairTemplate = template.templateName;
    lair.maxCreatures = template.maxCreatures;
    lair.spawnRadius = template.spawnRadius;
    lair.respawnDelay = template.respawnDelay;
    lair.creatureTemplates = [...template.creatureTemplates];
    lair.maxWaves = template.waveCount;
    lair.creaturesPerWave = template.creaturesPerWave;
    lair.waveTriggerDamage = template.waveTriggerDamage;
    lair.bossTemplate = template.bossTemplate;
    lair.babyTemplate = template.babyTemplate;
    lair.babySpawnChance = template.babySpawnChance ?? 0.1;
    lair.xpBonus = template.xpBonus;
    lair.lootTable = template.lootTable;

    if (template.scale) {
      lair.scale = template.scale;
    }
  }

  // ============================================
  // Creature Management
  // ============================================

  /**
   * Perform initial creature spawn for a lair
   */
  private performInitialSpawn(info: ActiveLairInfo): void {
    const { lair, template, sceneId } = info;
    const spawnCount = Math.min(template.minCreatures, template.maxCreatures);

    for (let i = 0; i < spawnCount; i++) {
      this.spawnCreatureForLair(lair, template, sceneId);
    }
  }

  /**
   * Spawn a creature wave for a lair
   * @param lair - Lair to spawn creatures for
   * @returns Array of spawned creatures
   */
  spawnCreatureWave(lair: LairObject): CreatureObject[] {
    const info = this.activeLairs.get(lair.objectId);
    if (!info || !this.creatureSpawner) {
      return [];
    }

    const { template, sceneId } = info;
    const waveIndex = lair.currentWave;
    const creatureCount = getWaveCreatureCount(template, waveIndex);
    const spawned: CreatureObject[] = [];

    console.log(
      `[LairManager] Spawning wave ${waveIndex + 1}/${template.waveCount} ` +
      `(${creatureCount} creatures) for lair ${lair.objectId}`
    );

    // Spawn regular creatures
    for (let i = 0; i < creatureCount && lair.canSpawnCreature(); i++) {
      const creature = this.spawnCreatureForLair(lair, template, sceneId);
      if (creature) {
        spawned.push(creature);
      }
    }

    // Check for boss spawn
    if (shouldWaveSpawnBoss(template, waveIndex) && template.bossTemplate) {
      const boss = this.spawnBossForLair(lair, template, sceneId);
      if (boss) {
        spawned.push(boss);
        lair.markBossSpawned();
      }
    }

    // Mark wave as triggered and complete spawning
    lair.markWaveTriggered();
    lair.completeWaveSpawn();

    return spawned;
  }

  /**
   * Spawn a single creature for a lair
   */
  private spawnCreatureForLair(
    lair: LairObject,
    template: LairTemplate,
    sceneId: string
  ): CreatureObject | null {
    if (!this.creatureSpawner || !lair.canSpawnCreature()) {
      return null;
    }

    // Determine which template to use (baby chance)
    let creatureTemplate: string | null;
    if (lair.shouldSpawnBaby() && template.babyTemplate) {
      creatureTemplate = template.babyTemplate;
    } else {
      creatureTemplate = getWaveCreatureTemplate(template, lair.currentWave);
    }

    if (!creatureTemplate) {
      return null;
    }

    // Generate spawn position within radius
    const spawnPos = this.getRandomSpawnPosition(lair);

    // Spawn the creature
    const creature = this.creatureSpawner.spawnByName(
      creatureTemplate,
      spawnPos,
      sceneId
    );

    if (creature) {
      // Track creature-lair relationship
      lair.addCreature(creature.objectId);
      this.creatureToLair.set(creature.objectId, lair.objectId);
    }

    return creature;
  }

  /**
   * Spawn a boss creature for a lair
   */
  private spawnBossForLair(
    lair: LairObject,
    template: LairTemplate,
    sceneId: string
  ): CreatureObject | null {
    if (!this.creatureSpawner || !template.bossTemplate) {
      return null;
    }

    const spawnPos = this.getRandomSpawnPosition(lair);
    const boss = this.creatureSpawner.spawnByName(
      template.bossTemplate,
      spawnPos,
      sceneId
    );

    if (boss) {
      lair.addCreature(boss.objectId);
      this.creatureToLair.set(boss.objectId, lair.objectId);
      console.log(`[LairManager] Spawned boss ${template.bossTemplate} for lair ${lair.objectId}`);
    }

    return boss;
  }

  /**
   * Generate a random spawn position within lair radius
   */
  private getRandomSpawnPosition(lair: LairObject): Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * lair.spawnRadius;

    return {
      x: lair.position.x + Math.cos(angle) * distance,
      y: lair.position.y,
      z: lair.position.z + Math.sin(angle) * distance,
    };
  }

  /**
   * Handle creature death from a lair
   * @param lair - Lair the creature belonged to
   * @param creatureId - Dead creature's object ID
   */
  onCreatureDeath(lair: LairObject, creatureId: ObjectId): void {
    // Remove from tracking
    lair.removeCreature(creatureId);
    this.creatureToLair.delete(creatureId);

    const info = this.activeLairs.get(lair.objectId);
    if (!info) {
      return;
    }

    console.log(
      `[LairManager] Creature ${creatureId} from lair ${lair.objectId} died. ` +
      `Remaining: ${lair.getCreatureCount()}`
    );

    // Schedule respawn if lair is still active and has capacity
    if (lair.isLairActive && lair.lairState !== LairState.Destroyed) {
      this.scheduleCreatureRespawn(info);
    }
  }

  /**
   * Handle creature death by creature ID (finds the lair)
   */
  onCreatureDeathById(creatureId: ObjectId): void {
    const lairId = this.creatureToLair.get(creatureId);
    if (!lairId) {
      return; // Not a lair creature
    }

    const info = this.activeLairs.get(lairId);
    if (info) {
      this.onCreatureDeath(info.lair, creatureId);
    }
  }

  /**
   * Schedule a creature respawn for a lair
   */
  private scheduleCreatureRespawn(info: ActiveLairInfo): void {
    const { lair, template, sceneId } = info;

    if (info.respawnTimer) {
      return; // Already scheduled
    }

    info.respawnTimer = setTimeout(() => {
      info.respawnTimer = undefined;

      if (lair.canSpawnCreature() && lair.lairState !== LairState.Destroyed) {
        this.spawnCreatureForLair(lair, template, sceneId);

        // Schedule another if still under min creatures
        if (lair.getCreatureCount() < template.minCreatures) {
          this.scheduleCreatureRespawn(info);
        }
      }
    }, lair.respawnDelay);
  }

  // ============================================
  // Damage Handling
  // ============================================

  /**
   * Handle damage to a lair
   * @param lair - Lair being damaged
   * @param damage - Amount of damage
   * @param attackerId - ID of the attacker
   */
  onLairDamaged(lair: LairObject, damage: number, attackerId: ObjectId): void {
    // Record damage for rewards
    lair.recordDamage(attackerId, damage);

    // Apply damage
    const destroyed = lair.damage(damage);

    // Check for wave trigger
    if (this.checkWaveTrigger(lair)) {
      const info = this.activeLairs.get(lair.objectId);
      if (info) {
        this.triggerNextWave(info);
      }
    }

    // Check for destruction
    if (destroyed && lair.canBeDestroyed()) {
      lair.markDestroyed();
      this.destroyLair(lair.objectId);
    }
  }

  /**
   * Check if damage threshold has been reached to trigger next wave
   * @param lair - Lair to check
   * @returns true if wave should be triggered
   */
  checkWaveTrigger(lair: LairObject): boolean {
    return lair.shouldTriggerWave();
  }

  /**
   * Trigger the next wave for a lair
   */
  private triggerNextWave(info: ActiveLairInfo): void {
    const { lair, template } = info;

    console.log(
      `[LairManager] Triggering wave ${lair.currentWave + 1}/${template.waveCount} ` +
      `for lair ${lair.objectId}`
    );

    // Mark wave as triggered
    lair.markWaveTriggered();

    // Get wave cooldown
    const cooldown = template.waveCooldown ?? 5000;

    // Schedule wave spawn after cooldown
    info.waveTimer = setTimeout(() => {
      info.waveTimer = undefined;
      this.spawnCreatureWave(lair);
      lair.advanceWave();
    }, cooldown);
  }

  // ============================================
  // Tick Processing
  // ============================================

  /**
   * Start automatic tick processing
   */
  startTicking(): void {
    if (this.tickTimer) {
      return;
    }

    this.tickTimer = setInterval(() => {
      this.tick(this.options.tickInterval);
    }, this.options.tickInterval);

    console.log(`[LairManager] Started ticking (interval: ${this.options.tickInterval}ms)`);
  }

  /**
   * Stop automatic tick processing
   */
  stopTicking(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = undefined;
      console.log('[LairManager] Stopped ticking');
    }
  }

  /**
   * Process a single tick for all active lairs
   * @param deltaTime - Time since last tick in milliseconds
   */
  tick(deltaTime: number): void {
    for (const info of this.activeLairs.values()) {
      this.tickLair(info, deltaTime);
    }
  }

  /**
   * Process tick for a single lair
   */
  private tickLair(info: ActiveLairInfo, deltaTime: number): void {
    const { lair, template } = info;

    if (lair.lairState === LairState.Destroyed) {
      return;
    }

    // Health regeneration
    if (template.regeneratesHealth && lair.condition < lair.maxCondition) {
      const timeSinceDamage = Date.now() - lair.lastDamageTime;
      const regenDelay = template.regenDelay ?? 30000;

      if (timeSinceDamage >= regenDelay) {
        const regenRate = template.healthRegenRate ?? 10;
        const regenAmount = (regenRate * deltaTime) / 1000;
        lair.repair(regenAmount);
      }
    }

    // Check for respawn needs
    if (lair.getCreatureCount() < template.minCreatures && !info.respawnTimer) {
      if (lair.canRespawn()) {
        this.scheduleCreatureRespawn(info);
      }
    }
  }

  // ============================================
  // Queries
  // ============================================

  /**
   * Get all lairs within range of a position
   * @param position - Center position
   * @param radius - Search radius
   * @param sceneId - Scene to search in
   * @returns Array of lairs in range
   */
  getLairsInRange(position: Vector3, radius: number, sceneId: string): LairObject[] {
    const sceneLairs = this.lairsByScene.get(sceneId);
    if (!sceneLairs) {
      return [];
    }

    const result: LairObject[] = [];
    const radiusSq = radius * radius;

    for (const lairId of sceneLairs) {
      const info = this.activeLairs.get(lairId);
      if (!info) continue;

      const lair = info.lair;
      const dx = lair.position.x - position.x;
      const dz = lair.position.z - position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq <= radiusSq) {
        result.push(lair);
      }
    }

    return result;
  }

  /**
   * Get lair by object ID
   */
  getLair(lairId: ObjectId): LairObject | undefined {
    return this.activeLairs.get(lairId)?.lair;
  }

  /**
   * Get lair info by object ID
   */
  getLairInfo(lairId: ObjectId): ActiveLairInfo | undefined {
    return this.activeLairs.get(lairId);
  }

  /**
   * Get all lairs in a scene
   */
  getLairsInScene(sceneId: string): LairObject[] {
    const sceneLairs = this.lairsByScene.get(sceneId);
    if (!sceneLairs) {
      return [];
    }

    const result: LairObject[] = [];
    for (const lairId of sceneLairs) {
      const info = this.activeLairs.get(lairId);
      if (info) {
        result.push(info.lair);
      }
    }

    return result;
  }

  /**
   * Get the lair a creature belongs to
   */
  getLairForCreature(creatureId: ObjectId): LairObject | undefined {
    const lairId = this.creatureToLair.get(creatureId);
    if (!lairId) {
      return undefined;
    }
    return this.activeLairs.get(lairId)?.lair;
  }

  /**
   * Check if a creature belongs to a lair
   */
  isLairCreature(creatureId: ObjectId): boolean {
    return this.creatureToLair.has(creatureId);
  }

  // ============================================
  // Event Handling
  // ============================================

  /**
   * Register a callback for lair destruction events
   */
  onLairDestroyed(callback: LairDestructionCallback): void {
    this.destructionCallbacks.add(callback);
  }

  /**
   * Remove a destruction callback
   */
  offLairDestroyed(callback: LairDestructionCallback): void {
    this.destructionCallbacks.delete(callback);
  }

  /**
   * Emit a destruction event to all callbacks
   */
  private emitDestructionEvent(event: LairDestructionEvent): void {
    for (const callback of this.destructionCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('[LairManager] Error in destruction callback:', error);
      }
    }
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get statistics about active lairs
   */
  getStats(): {
    totalTemplates: number;
    activeLairs: number;
    lairsByScene: Map<string, number>;
    totalCreatures: number;
  } {
    const byScene = new Map<string, number>();
    let totalCreatures = 0;

    for (const [sceneId, lairIds] of this.lairsByScene) {
      byScene.set(sceneId, lairIds.size);
    }

    for (const info of this.activeLairs.values()) {
      totalCreatures += info.lair.getCreatureCount();
    }

    return {
      totalTemplates: this.templates.size,
      activeLairs: this.activeLairs.size,
      lairsByScene: byScene,
      totalCreatures,
    };
  }

  // ============================================
  // Utility
  // ============================================

  /**
   * Calculate a simple CRC from template path
   */
  private calculateTemplateCrc(templatePath: string): number {
    let hash = 0;
    for (let i = 0; i < templatePath.length; i++) {
      const char = templatePath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash >>> 0;
  }
}

/**
 * Create a new LairManager instance
 */
export function createLairManager(options?: LairManagerOptions): LairManager {
  return new LairManager(options);
}
