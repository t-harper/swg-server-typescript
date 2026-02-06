/**
 * LairObject - Destructible spawn points that spawn waves of creatures
 * Lairs are physical objects in the world that players can attack to stop
 * creature spawning. They spawn creatures in waves, with a boss on the final wave.
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { TangibleObject } from './tangible-object.js';
import { ObjectType } from './scene-object.js';

/**
 * Lair state enumeration
 */
export enum LairState {
  /** Lair is idle, not currently spawning */
  Idle = 0,
  /** Lair is actively spawning creatures */
  Active = 1,
  /** Lair is spawning a wave */
  Spawning = 2,
  /** Lair is destroyed */
  Destroyed = 3,
}

/**
 * LairObject - Represents a creature lair/spawn point
 * Extends TangibleObject with lair-specific properties for creature spawning,
 * wave management, and destruction mechanics.
 */
export class LairObject extends TangibleObject {
  /** Lair template identifier (e.g., "womp_rat_den") */
  lairTemplate: string;

  // ============================================
  // Spawn Configuration
  // ============================================

  /** Maximum number of creatures that can be alive at once */
  maxCreatures: number;

  /** Radius around lair where creatures spawn (meters) */
  spawnRadius: number;

  /** Delay between respawns when creatures die (milliseconds) */
  respawnDelay: number;

  /** Creature templates that can spawn from this lair */
  creatureTemplates: string[];

  // ============================================
  // State Tracking
  // ============================================

  /** Set of currently alive creature object IDs */
  currentCreatures: Set<ObjectId>;

  /** Total number of creatures spawned since lair creation */
  totalSpawned: number;

  /** Whether the lair is actively spawning */
  isLairActive: boolean;

  /** Current lair state */
  lairState: LairState;

  /** Time of last creature spawn (milliseconds) */
  lastSpawnTime: number;

  /** Time of last damage received (milliseconds) */
  lastDamageTime: number;

  // ============================================
  // Wave System
  // ============================================

  /** Current wave number (0-indexed) */
  currentWave: number;

  /** Maximum number of waves before lair can be destroyed */
  maxWaves: number;

  /** Number of creatures per wave */
  creaturesPerWave: number;

  /** Damage percentage threshold to trigger next wave (0.0-1.0) */
  waveTriggerDamage: number;

  /** Health percentage at start of current wave */
  waveStartHealth: number;

  /** Whether the current wave has been triggered */
  waveTriggered: boolean;

  // ============================================
  // Boss/Special Spawns
  // ============================================

  /** Boss creature template (spawns on final wave) */
  bossTemplate: string | null;

  /** Whether the boss has been spawned */
  bossSpawned: boolean;

  // ============================================
  // Baby Spawns
  // ============================================

  /** Chance to spawn baby version of creatures (0.0-1.0) */
  babySpawnChance: number;

  /** Baby creature template */
  babyTemplate: string | null;

  // ============================================
  // Destruction Rewards
  // ============================================

  /** XP bonus awarded when lair is destroyed */
  xpBonus: number;

  /** Loot table for lair destruction */
  lootTable: string;

  /** Object ID of the player/group that dealt the most damage */
  topDamagerId: ObjectId;

  /** Damage dealt by each attacker (for reward distribution) */
  damageContributors: Map<ObjectId, number>;

  /**
   * Create a new LairObject
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the lair template
   */
  constructor(objectId: ObjectId, templateCrc: CrcValue = 0) {
    super(objectId, templateCrc);

    this.objectType = ObjectType.Tangible;
    this.lairTemplate = '';

    // Spawn configuration defaults
    this.maxCreatures = 3;
    this.spawnRadius = 32;
    this.respawnDelay = 60000; // 1 minute
    this.creatureTemplates = [];

    // State tracking
    this.currentCreatures = new Set();
    this.totalSpawned = 0;
    this.isLairActive = true;
    this.lairState = LairState.Idle;
    this.lastSpawnTime = 0;
    this.lastDamageTime = 0;

    // Wave system defaults
    this.currentWave = 0;
    this.maxWaves = 3;
    this.creaturesPerWave = 3;
    this.waveTriggerDamage = 0.25; // 25% damage triggers next wave
    this.waveStartHealth = 1.0;
    this.waveTriggered = false;

    // Boss/special spawns
    this.bossTemplate = null;
    this.bossSpawned = false;

    // Baby spawns
    this.babySpawnChance = 0.1; // 10% chance
    this.babyTemplate = null;

    // Destruction rewards
    this.xpBonus = 100;
    this.lootTable = 'loot_lair_default';
    this.topDamagerId = 0n;
    this.damageContributors = new Map();
  }

  /**
   * Get the current creature count
   */
  getCreatureCount(): number {
    return this.currentCreatures.size;
  }

  /**
   * Check if lair can spawn more creatures
   */
  canSpawnCreature(): boolean {
    return (
      this.isLairActive &&
      this.lairState !== LairState.Destroyed &&
      this.currentCreatures.size < this.maxCreatures
    );
  }

  /**
   * Add a spawned creature to tracking
   * @param creatureId - Object ID of the spawned creature
   */
  addCreature(creatureId: ObjectId): void {
    this.currentCreatures.add(creatureId);
    this.totalSpawned++;
    this.lastSpawnTime = Date.now();
    this.markModified();
  }

  /**
   * Remove a creature from tracking (called when creature dies)
   * @param creatureId - Object ID of the dead creature
   */
  removeCreature(creatureId: ObjectId): void {
    this.currentCreatures.delete(creatureId);
    this.markModified();
  }

  /**
   * Check if a specific creature belongs to this lair
   * @param creatureId - Object ID to check
   */
  hasCreature(creatureId: ObjectId): boolean {
    return this.currentCreatures.has(creatureId);
  }

  /**
   * Record damage from an attacker for reward distribution
   * @param attackerId - Object ID of the attacker
   * @param damage - Amount of damage dealt
   */
  recordDamage(attackerId: ObjectId, damage: number): void {
    const currentDamage = this.damageContributors.get(attackerId) ?? 0;
    this.damageContributors.set(attackerId, currentDamage + damage);
    this.lastDamageTime = Date.now();

    // Update top damager
    const newTotal = currentDamage + damage;
    const topDamage = this.damageContributors.get(this.topDamagerId) ?? 0;
    if (newTotal > topDamage) {
      this.topDamagerId = attackerId;
    }
  }

  /**
   * Get the current health percentage
   */
  getHealthPercent(): number {
    if (this.maxCondition <= 0) return 1.0;
    return this.condition / this.maxCondition;
  }

  /**
   * Check if damage threshold for next wave has been reached
   * @returns true if wave should be triggered
   */
  shouldTriggerWave(): boolean {
    if (this.waveTriggered || this.currentWave >= this.maxWaves) {
      return false;
    }

    const healthPercent = this.getHealthPercent();
    const damageDealt = this.waveStartHealth - healthPercent;

    return damageDealt >= this.waveTriggerDamage;
  }

  /**
   * Advance to the next wave
   */
  advanceWave(): void {
    this.currentWave++;
    this.waveStartHealth = this.getHealthPercent();
    this.waveTriggered = false;
    this.lairState = LairState.Spawning;
    this.markModified();
  }

  /**
   * Mark the current wave as triggered (spawning in progress)
   */
  markWaveTriggered(): void {
    this.waveTriggered = true;
    this.lairState = LairState.Spawning;
    this.markModified();
  }

  /**
   * Complete the current wave spawning
   */
  completeWaveSpawn(): void {
    this.lairState = LairState.Active;
    this.markModified();
  }

  /**
   * Check if this is the final wave
   */
  isFinalWave(): boolean {
    return this.currentWave >= this.maxWaves - 1;
  }

  /**
   * Check if the lair should spawn a boss
   */
  shouldSpawnBoss(): boolean {
    return (
      this.isFinalWave() &&
      this.bossTemplate !== null &&
      !this.bossSpawned
    );
  }

  /**
   * Mark the boss as spawned
   */
  markBossSpawned(): void {
    this.bossSpawned = true;
    this.markModified();
  }

  /**
   * Check if a baby creature should spawn
   * @returns true if baby should spawn instead of adult
   */
  shouldSpawnBaby(): boolean {
    return (
      this.babyTemplate !== null &&
      Math.random() < this.babySpawnChance
    );
  }

  /**
   * Get a random creature template from the available templates
   * @returns Template name or null if none available
   */
  getRandomCreatureTemplate(): string | null {
    if (this.creatureTemplates.length === 0) {
      return null;
    }
    const index = Math.floor(Math.random() * this.creatureTemplates.length);
    return this.creatureTemplates[index] ?? null;
  }

  /**
   * Check if lair can be destroyed (all waves defeated, no creatures alive)
   */
  canBeDestroyed(): boolean {
    return (
      this.currentWave >= this.maxWaves &&
      this.currentCreatures.size === 0 &&
      this.condition <= 0
    );
  }

  /**
   * Mark the lair as destroyed
   */
  markDestroyed(): void {
    this.lairState = LairState.Destroyed;
    this.isLairActive = false;
    this.isActive = false;
    this.markModified();
  }

  /**
   * Get the top damage contributors for reward distribution
   * @param limit - Maximum number of contributors to return
   * @returns Array of [objectId, damage] pairs sorted by damage descending
   */
  getTopContributors(limit: number = 10): [ObjectId, number][] {
    return Array.from(this.damageContributors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  /**
   * Calculate time since last spawn
   */
  getTimeSinceLastSpawn(): number {
    return Date.now() - this.lastSpawnTime;
  }

  /**
   * Check if enough time has passed for respawn
   */
  canRespawn(): boolean {
    return this.getTimeSinceLastSpawn() >= this.respawnDelay;
  }

  /**
   * Reset the lair to initial state (for respawning the lair itself)
   */
  reset(): void {
    this.currentCreatures.clear();
    this.totalSpawned = 0;
    this.isLairActive = true;
    this.lairState = LairState.Idle;
    this.lastSpawnTime = 0;
    this.lastDamageTime = 0;
    this.currentWave = 0;
    this.waveStartHealth = 1.0;
    this.waveTriggered = false;
    this.bossSpawned = false;
    this.condition = this.maxCondition;
    this.topDamagerId = 0n;
    this.damageContributors.clear();
    this.markModified();
  }

  /**
   * Get the baseline type string for this object
   */
  override getBaselineType(): string {
    return 'TANO';
  }

  /**
   * Serialize to JSON for persistence
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      lairTemplate: this.lairTemplate,
      maxCreatures: this.maxCreatures,
      spawnRadius: this.spawnRadius,
      respawnDelay: this.respawnDelay,
      creatureTemplates: this.creatureTemplates,
      currentCreatures: Array.from(this.currentCreatures).map(id => id.toString()),
      totalSpawned: this.totalSpawned,
      isLairActive: this.isLairActive,
      lairState: this.lairState,
      currentWave: this.currentWave,
      maxWaves: this.maxWaves,
      creaturesPerWave: this.creaturesPerWave,
      waveTriggerDamage: this.waveTriggerDamage,
      bossTemplate: this.bossTemplate,
      bossSpawned: this.bossSpawned,
      babySpawnChance: this.babySpawnChance,
      babyTemplate: this.babyTemplate,
      xpBonus: this.xpBonus,
      lootTable: this.lootTable,
    };
  }
}
