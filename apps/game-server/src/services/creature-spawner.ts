/**
 * Creature Spawner Service
 * Spawns NPCs and creatures from templates with randomized stats,
 * equipment, and AI initialization.
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import { CreatureObject, generateObjectId } from '@swg/objects';
import type {
  CreatureTemplate,
  CreatureStats,
  CreatureEquipment,
} from '@swg/game-logic';
import {
  CreatureDifficulty,
  DIFFICULTY_MULTIPLIERS,
  Factions,
} from '@swg/game-logic';
import type { SpawnManager, ActiveSpawn } from './spawn-manager.js';

/**
 * Faction CRC values for common factions
 */
export const FactionCrcs: Record<string, number> = {
  [Factions.NEUTRAL]: 0,
  [Factions.IMPERIAL]: 0x16148850, // "imperial" CRC
  [Factions.REBEL]: 0xddc4af09, // "rebel" CRC
  [Factions.TUSKEN]: 0x2f5c3c86, // "tusken" CRC
  [Factions.JABBA]: 0x44d29cde, // "jabba" CRC
  [Factions.CREATURE]: 0,
  [Factions.NPC]: 0,
  [Factions.DROID]: 0,
  [Factions.JAWA]: 0x9cd5e6df, // "jawa" CRC
  [Factions.GUNGAN]: 0xa55431a2, // "gungan" CRC
};

/**
 * Active creature tracking info
 */
export interface ActiveCreatureInfo {
  /** Creature object ID */
  objectId: ObjectId;
  /** Template used to spawn */
  template: CreatureTemplate;
  /** Spawn point ID (if from SpawnManager) */
  spawnPointId?: string | undefined;
  /** Original spawn position */
  spawnPosition: Vector3;
  /** Scene/zone ID */
  sceneId: string;
  /** Time spawned */
  spawnTime: number;
}

/**
 * Creature spawner options
 */
export interface CreatureSpawnerOptions {
  /** Default leash distance for creatures */
  defaultLeashDistance?: number;
  /** Default roam radius */
  defaultRoamRadius?: number;
  /** Enable stat variance (randomization) */
  enableStatVariance?: boolean;
}

/**
 * AI state for a creature
 */
export interface CreatureAIState {
  /** Behavior tree identifier */
  behaviorTree: string;
  /** Social group for group behavior */
  socialGroup: string;
  /** Aggro radius */
  aggroRadius: number;
  /** Assist radius */
  assistRadius: number;
  /** Leash distance */
  leashDistance: number;
  /** Roam radius */
  roamRadius: number;
  /** Home position (spawn point) */
  homePosition: Vector3;
  /** Current patrol waypoint index */
  patrolIndex?: number | undefined;
  /** Patrol path identifier */
  patrolPath?: string | undefined;
  /** Is currently in combat */
  inCombat: boolean;
  /** Is returning to home */
  returning: boolean;
  /** Last attack time */
  lastAttackTime: number;
  /** Special ability cooldowns */
  abilityCooldowns: Map<string, number>;
}

/**
 * Creature Spawner Service
 * Creates and initializes creatures from templates
 */
export class CreatureSpawner {
  /** Template registry */
  private readonly templates: Map<string, CreatureTemplate>;

  /** Active creatures tracking */
  private readonly activeCreatures: Map<ObjectId, ActiveCreatureInfo>;

  /** AI state for creatures */
  private readonly aiStates: Map<ObjectId, CreatureAIState>;

  /** Reference to spawn manager (optional) */
  private spawnManager?: SpawnManager;

  /** Configuration options */
  private readonly options: Required<CreatureSpawnerOptions>;

  constructor(options: CreatureSpawnerOptions = {}) {
    this.templates = new Map();
    this.activeCreatures = new Map();
    this.aiStates = new Map();
    this.options = {
      defaultLeashDistance: options.defaultLeashDistance ?? 64,
      defaultRoamRadius: options.defaultRoamRadius ?? 16,
      enableStatVariance: options.enableStatVariance ?? true,
    };
  }

  /**
   * Set the spawn manager reference for integration
   */
  setSpawnManager(manager: SpawnManager): void {
    this.spawnManager = manager;
  }

  /**
   * Get the spawn manager reference
   */
  getSpawnManager(): SpawnManager | undefined {
    return this.spawnManager;
  }

  // ============================================
  // Template Management
  // ============================================

  /**
   * Register a creature template
   * @param template - Template to register
   */
  registerTemplate(template: CreatureTemplate): void {
    this.templates.set(template.templateName, template);
    console.log(`[CreatureSpawner] Registered template: ${template.templateName}`);
  }

  /**
   * Register multiple templates
   * @param templates - Array of templates to register
   */
  registerTemplates(templates: CreatureTemplate[]): void {
    for (const template of templates) {
      this.registerTemplate(template);
    }
  }

  /**
   * Get a template by name
   * @param templateName - Template name to look up
   * @returns Template or undefined if not found
   */
  getTemplate(templateName: string): CreatureTemplate | undefined {
    return this.templates.get(templateName);
  }

  /**
   * Check if a template exists
   * @param templateName - Template name to check
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

  /**
   * Unregister a template
   * @param templateName - Template name to remove
   */
  unregisterTemplate(templateName: string): boolean {
    return this.templates.delete(templateName);
  }

  // ============================================
  // Spawning
  // ============================================

  /**
   * Spawn a creature from a template
   * @param template - Creature template to use
   * @param position - Spawn position
   * @param sceneId - Scene/zone ID
   * @param spawnPointId - Optional spawn point ID for tracking
   * @returns Created creature object
   */
  spawn(
    template: CreatureTemplate,
    position: Vector3,
    sceneId: string,
    spawnPointId?: string
  ): CreatureObject {
    // Generate object ID
    const objectId = generateObjectId();

    // Calculate CRC from appearance template (simplified - in production use actual CRC)
    const templateCrc = this.calculateTemplateCrc(template.appearanceTemplate);

    // Create the creature object
    const creature = new CreatureObject(objectId, templateCrc);

    // Roll randomized stats
    const stats = this.rollStats(template);

    // Apply stats to creature
    this.applyStats(creature, template, stats);

    // Set position
    creature.setPosition(position.x, position.y, position.z);
    creature.setHeading(Math.random() * Math.PI * 2);

    // Set scale
    creature.height = template.scale;

    // Setup faction
    this.setFaction(creature, template.faction);

    // Equip creature
    this.equipCreature(creature, template);

    // Initialize AI
    this.initializeAI(creature, template, position);

    // Activate the creature
    creature.isActive = true;
    creature.sceneId = sceneId;

    // Track the active creature
    this.activeCreatures.set(objectId, {
      objectId,
      template,
      spawnPointId,
      spawnPosition: { ...position },
      sceneId,
      spawnTime: Date.now(),
    });

    console.log(
      `[CreatureSpawner] Spawned ${template.displayName} (${objectId}) at ${sceneId} ` +
        `(${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}) ` +
        `L${stats.level} HP:${stats.health}`
    );

    return creature;
  }

  /**
   * Spawn a creature by template name
   * @param templateName - Name of registered template
   * @param position - Spawn position
   * @param sceneId - Scene/zone ID
   * @param spawnPointId - Optional spawn point ID
   * @returns Created creature or null if template not found
   */
  spawnByName(
    templateName: string,
    position: Vector3,
    sceneId: string,
    spawnPointId?: string
  ): CreatureObject | null {
    const template = this.templates.get(templateName);
    if (!template) {
      console.warn(`[CreatureSpawner] Template not found: ${templateName}`);
      return null;
    }
    return this.spawn(template, position, sceneId, spawnPointId);
  }

  /**
   * Despawn a creature
   * @param objectId - Creature object ID
   * @returns True if creature was found and removed
   */
  despawn(objectId: ObjectId): boolean {
    const info = this.activeCreatures.get(objectId);
    if (!info) {
      return false;
    }

    this.activeCreatures.delete(objectId);
    this.aiStates.delete(objectId);

    console.log(
      `[CreatureSpawner] Despawned ${info.template.displayName} (${objectId})`
    );

    return true;
  }

  // ============================================
  // Stat Rolling
  // ============================================

  /**
   * Roll randomized stats within template ranges
   * @param template - Template with stat ranges
   * @returns Rolled stats
   */
  rollStats(template: CreatureTemplate): CreatureStats {
    const diffMods = DIFFICULTY_MULTIPLIERS[template.difficulty];

    // Roll base values
    const baseHealth = this.rollRange(template.healthRange);
    const baseAction = this.rollRange(template.actionRange);
    const baseMind = this.rollRange(template.mindRange);
    const baseDamage = this.rollRange(template.damageRange);

    // Apply difficulty multipliers
    const health = Math.floor(baseHealth * diffMods.health);
    const action = Math.floor(baseAction * diffMods.health); // Use health mult for pools
    const mind = Math.floor(baseMind * diffMods.health);
    const damage = Math.floor(baseDamage * diffMods.damage);

    // Level may be adjusted for bosses
    let level = template.level;
    if (template.difficulty === CreatureDifficulty.Boss) {
      level = Math.min(level + 5, 90); // Boss level boost
    } else if (template.difficulty === CreatureDifficulty.Elite) {
      level = Math.min(level + 2, 90); // Elite level boost
    }

    return {
      health,
      action,
      mind,
      damage,
      level,
      difficultyMultiplier: diffMods.health,
    };
  }

  /**
   * Roll a random value within a range
   * @param range - [min, max] range
   * @returns Random value in range (inclusive)
   */
  private rollRange(range: [number, number]): number {
    if (!this.options.enableStatVariance) {
      // Return average when variance is disabled
      return Math.floor((range[0] + range[1]) / 2);
    }
    const [min, max] = range;
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  /**
   * Apply rolled stats to a creature
   */
  private applyStats(
    creature: CreatureObject,
    template: CreatureTemplate,
    stats: CreatureStats
  ): void {
    // Set level
    creature.setLevel(stats.level);

    // Set HAM pools
    creature.health.max = stats.health;
    creature.health.baseMax = stats.health;
    creature.health.current = stats.health;
    creature.health.regenRate = Math.floor(stats.health * 0.01); // 1% per second

    creature.action.max = stats.action;
    creature.action.baseMax = stats.action;
    creature.action.current = stats.action;
    creature.action.regenRate = Math.floor(stats.action * 0.01);

    creature.mind.max = stats.mind;
    creature.mind.baseMax = stats.mind;
    creature.mind.current = stats.mind;
    creature.mind.regenRate = Math.floor(stats.mind * 0.01);

    // Set movement speeds
    creature.walkSpeed = template.walkSpeed;
    creature.runSpeed = template.runSpeed;
    if (template.turnRate !== undefined) {
      creature.turnRate = template.turnRate;
    }

    // Set difficulty class
    creature.difficulty = template.difficulty;

    // Set combat-related skill mods
    creature.setSkillMod('armor', Math.floor(template.armor * (DIFFICULTY_MULTIPLIERS[template.difficulty]?.armor ?? 1)));
    creature.setSkillMod('accuracy', template.accuracy);
    creature.setSkillMod('damage_min', template.damageRange[0]);
    creature.setSkillMod('damage_max', template.damageRange[1]);
    creature.setSkillMod('attack_speed', Math.floor(template.attackSpeed * 1000));

    // Set XP value (adjusted for difficulty)
    const xpMult = DIFFICULTY_MULTIPLIERS[template.difficulty]?.xp ?? 1;
    creature.setSkillMod('xp_value', Math.floor(template.xpValue * xpMult));
  }

  // ============================================
  // Equipment
  // ============================================

  /**
   * Equip a creature with items from template
   * @param creature - Creature to equip
   * @param template - Template with equipment definitions
   */
  equipCreature(creature: CreatureObject, template: CreatureTemplate): void {
    if (!template.equipment || template.equipment.length === 0) {
      return;
    }

    for (const equip of template.equipment) {
      // Check spawn chance
      if (equip.chance !== undefined && Math.random() > equip.chance) {
        continue;
      }

      // In a full implementation, this would create actual item objects
      // For now, we track it via skill mods or a custom data structure
      this.applyEquipmentSlot(creature, equip);
    }

    // Set weapon if specified
    if (template.weaponTemplate) {
      // Would create actual weapon object in full implementation
      // For now, mark that creature has a weapon
      creature.setSkillMod('has_weapon', 1);
    }
  }

  /**
   * Apply an equipment slot to creature
   * @param creature - Target creature
   * @param equip - Equipment definition
   */
  private applyEquipmentSlot(creature: CreatureObject, equip: CreatureEquipment): void {
    // Map slot names to equipment slot constants
    // In full implementation, would create item objects and equip them
    // For now, track via skill mods for debugging
    const slotKey = `equipped_${equip.slot}`;
    creature.setSkillMod(slotKey, 1);
  }

  // ============================================
  // AI Initialization
  // ============================================

  /**
   * Initialize AI state for a creature
   * @param creature - Creature to initialize
   * @param template - Template with AI settings
   * @param homePosition - Spawn position as home
   */
  initializeAI(
    creature: CreatureObject,
    template: CreatureTemplate,
    homePosition: Vector3
  ): void {
    const aiState: CreatureAIState = {
      behaviorTree: template.behaviorTree,
      socialGroup: template.socialGroup,
      aggroRadius: template.aggressiveRadius,
      assistRadius: template.assistRadius,
      leashDistance: template.leashDistance ?? this.options.defaultLeashDistance,
      roamRadius: template.roamRadius ?? this.options.defaultRoamRadius,
      homePosition: { ...homePosition },
      patrolPath: template.patrolPath,
      inCombat: false,
      returning: false,
      lastAttackTime: 0,
      abilityCooldowns: new Map(),
    };

    // Initialize ability cooldowns for boss creatures
    if (template.specialAbilities) {
      for (const ability of template.specialAbilities) {
        aiState.abilityCooldowns.set(ability.name, 0);
      }
    }

    this.aiStates.set(creature.objectId, aiState);

    // Store AI reference info in creature skill mods for quick access
    creature.setSkillMod('aggro_radius', template.aggressiveRadius);
    creature.setSkillMod('assist_radius', template.assistRadius);
    creature.setSkillMod('leash_distance', aiState.leashDistance);
  }

  /**
   * Get AI state for a creature
   * @param objectId - Creature object ID
   * @returns AI state or undefined
   */
  getAIState(objectId: ObjectId): CreatureAIState | undefined {
    return this.aiStates.get(objectId);
  }

  /**
   * Update AI state for a creature
   * @param objectId - Creature object ID
   * @param updates - Partial state updates
   */
  updateAIState(objectId: ObjectId, updates: Partial<CreatureAIState>): void {
    const state = this.aiStates.get(objectId);
    if (state) {
      Object.assign(state, updates);
    }
  }

  // ============================================
  // Faction
  // ============================================

  /**
   * Set faction for a creature
   * @param creature - Creature to update
   * @param faction - Faction identifier
   */
  setFaction(creature: CreatureObject, faction: string): void {
    const factionCrc = FactionCrcs[faction] ?? 0;
    creature.setCreatureFaction(factionCrc, 0);

    // Store faction string in skill mod for AI reference
    creature.setSkillMod('faction_id', factionCrc);
  }

  /**
   * Check if two factions are hostile to each other
   * @param faction1 - First faction
   * @param faction2 - Second faction
   * @returns True if hostile
   */
  areFactionsHostile(faction1: string, faction2: string): boolean {
    // Creatures are hostile to players by default if aggressive
    if (faction1 === Factions.CREATURE || faction2 === Factions.CREATURE) {
      return true; // Aggro handled separately via aggro radius
    }

    // Imperial vs Rebel
    if (
      (faction1 === Factions.IMPERIAL && faction2 === Factions.REBEL) ||
      (faction1 === Factions.REBEL && faction2 === Factions.IMPERIAL)
    ) {
      return true;
    }

    // Tusken raiders are hostile to everyone except other tuskens
    if (faction1 === Factions.TUSKEN && faction2 !== Factions.TUSKEN) {
      return true;
    }
    if (faction2 === Factions.TUSKEN && faction1 !== Factions.TUSKEN) {
      return true;
    }

    return false;
  }

  // ============================================
  // Tracking & Queries
  // ============================================

  /**
   * Get info about an active creature
   * @param objectId - Creature object ID
   */
  getActiveCreatureInfo(objectId: ObjectId): ActiveCreatureInfo | undefined {
    return this.activeCreatures.get(objectId);
  }

  /**
   * Get all active creatures in a scene
   * @param sceneId - Scene to query
   */
  getCreaturesInScene(sceneId: string): ActiveCreatureInfo[] {
    const result: ActiveCreatureInfo[] = [];
    for (const info of this.activeCreatures.values()) {
      if (info.sceneId === sceneId) {
        result.push(info);
      }
    }
    return result;
  }

  /**
   * Get all active creatures from a spawn point
   * @param spawnPointId - Spawn point ID
   */
  getCreaturesFromSpawnPoint(spawnPointId: string): ActiveCreatureInfo[] {
    const result: ActiveCreatureInfo[] = [];
    for (const info of this.activeCreatures.values()) {
      if (info.spawnPointId === spawnPointId) {
        result.push(info);
      }
    }
    return result;
  }

  /**
   * Get count of active creatures
   */
  getActiveCreatureCount(): number {
    return this.activeCreatures.size;
  }

  /**
   * Get all active creature IDs
   */
  getActiveCreatureIds(): ObjectId[] {
    return Array.from(this.activeCreatures.keys());
  }

  // ============================================
  // Utility
  // ============================================

  /**
   * Calculate a simple CRC from template path
   * In production, use actual CRC32 implementation
   */
  private calculateTemplateCrc(templatePath: string): number {
    // Simple hash for now - replace with actual CRC32
    let hash = 0;
    for (let i = 0; i < templatePath.length; i++) {
      const char = templatePath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash >>> 0; // Ensure unsigned
  }

  /**
   * Handle creature death
   * @param objectId - Dead creature's object ID
   * @param killerId - Killer's object ID (for XP/loot)
   */
  async onCreatureDeath(objectId: ObjectId, killerId?: ObjectId): Promise<void> {
    const info = this.activeCreatures.get(objectId);
    if (!info) {
      return;
    }

    console.log(
      `[CreatureSpawner] ${info.template.displayName} (${objectId}) died` +
        (killerId ? ` killed by ${killerId}` : '')
    );

    // Notify spawn manager for respawn handling
    if (this.spawnManager && info.spawnPointId) {
      await this.spawnManager.onCreatureDeath(objectId);
    }

    // Clean up tracking
    this.despawn(objectId);
  }

  /**
   * Get statistics about spawned creatures
   */
  getStats(): {
    totalTemplates: number;
    activeCreatures: number;
    creaturesByDifficulty: Record<CreatureDifficulty, number>;
    creaturesByScene: Map<string, number>;
  } {
    const byDifficulty: Record<CreatureDifficulty, number> = {
      [CreatureDifficulty.Normal]: 0,
      [CreatureDifficulty.Elite]: 0,
      [CreatureDifficulty.Boss]: 0,
    };

    const byScene = new Map<string, number>();

    for (const info of this.activeCreatures.values()) {
      byDifficulty[info.template.difficulty]++;

      const count = byScene.get(info.sceneId) ?? 0;
      byScene.set(info.sceneId, count + 1);
    }

    return {
      totalTemplates: this.templates.size,
      activeCreatures: this.activeCreatures.size,
      creaturesByDifficulty: byDifficulty,
      creaturesByScene: byScene,
    };
  }
}

/**
 * Create a new CreatureSpawner instance
 */
export function createCreatureSpawner(options?: CreatureSpawnerOptions): CreatureSpawner {
  return new CreatureSpawner(options);
}
