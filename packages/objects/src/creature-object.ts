/**
 * CreatureObject - Represents creatures, NPCs, and player characters
 * Extends TangibleObject with health/action/mind pools, combat state,
 * skills, equipment, and other creature-specific properties.
 *
 * This is the base class for all living entities in the game world.
 * Player characters extend this further with PlayerObject.
 *
 * Baseline Types:
 * - CREO1: Bank/cash credits
 * - CREO3: Posture, faction, species, HAM wounds, skills, skill mods
 * - CREO4: Movement speeds, acceleration, turn rate, locomotion, group
 * - CREO6: HAM current/max, mood, target, defenders, state bitmask, performance
 */

import type { ObjectId, CrcValue } from '@swg/shared-types';
import { TangibleObject } from './tangible-object.js';
import { ObjectType } from './scene-object.js';
import { Posture, type PostureType } from '@swg/protocol';
import { DeltaTracker, DeltaType } from './deltas.js';

// Re-export Posture from protocol for convenience
export { Posture, type PostureType } from '@swg/protocol';

/**
 * Locomotion state enumeration
 * Defines the movement behavior of a creature
 */
export const Locomotion = {
  /** Standing still */
  STANDING: 0,
  /** Sneaking movement */
  SNEAKING: 1,
  /** Walking movement */
  WALKING: 2,
  /** Running movement */
  RUNNING: 3,
  /** Kneeling position */
  KNEELING: 4,
  /** Crouch walking */
  CROUCH_WALKING: 5,
  /** Crouch sneaking */
  CROUCH_SNEAKING: 6,
  /** Prone position */
  PRONE: 7,
  /** Crawling movement */
  CRAWLING: 8,
  /** Climbing ladder/wall */
  CLIMBING_STATIONARY: 9,
  /** Climbing while moving */
  CLIMBING: 10,
  /** Hovering (jetpack, etc.) */
  HOVERING: 11,
  /** Flying movement */
  FLYING: 12,
  /** Lying down */
  LYING_DOWN: 13,
  /** Sitting */
  SITTING: 14,
  /** Skill animation in progress */
  SKILL_ANIMATING: 15,
  /** Driving a vehicle */
  DRIVING_VEHICLE: 16,
  /** Riding a creature mount */
  RIDING_CREATURE: 17,
  /** Knocked down state */
  KNOCKED_DOWN: 18,
  /** Incapacitated state */
  INCAPACITATED: 19,
  /** Dead state */
  DEAD: 20,
  /** Blocking (combat stance) */
  BLOCKING: 21,
} as const;

export type LocomotionType = (typeof Locomotion)[keyof typeof Locomotion];

/**
 * Creature state flags (bitmask)
 * These represent various states a creature can be in
 */
export const CreatureState = {
  /** No special state */
  NONE: 0n,
  /** Cover state (hiding behind objects) */
  COVER: 1n << 0n,
  /** In combat */
  COMBAT: 1n << 1n,
  /** Peace mode (cannot attack) */
  PEACE: 1n << 2n,
  /** Aiming a weapon */
  AIMING: 1n << 3n,
  /** Alert state */
  ALERT: 1n << 4n,
  /** Berserk rage */
  BERSERK: 1n << 5n,
  /** Feigning death */
  FEIGN_DEATH: 1n << 6n,
  /** Combat attitude: evasive */
  COMBAT_ATTITUDE_EVASIVE: 1n << 7n,
  /** Combat attitude: normal */
  COMBAT_ATTITUDE_NORMAL: 1n << 8n,
  /** Combat attitude: aggressive */
  COMBAT_ATTITUDE_AGGRESSIVE: 1n << 9n,
  /** Tumbling (acrobatics) */
  TUMBLING: 1n << 10n,
  /** Rallied (group buff) */
  RALLIED: 1n << 11n,
  /** Stunned */
  STUNNED: 1n << 12n,
  /** Blinded */
  BLINDED: 1n << 13n,
  /** Dizzy */
  DIZZY: 1n << 14n,
  /** Intimidated */
  INTIMIDATED: 1n << 15n,
  /** Immobilized (root) */
  IMMOBILIZED: 1n << 16n,
  /** Frozen (ice/stasis) */
  FROZEN: 1n << 17n,
  /** Swimming */
  SWIMMING: 1n << 18n,
  /** Sitting on chair */
  SITTING_ON_CHAIR: 1n << 19n,
  /** Crafting */
  CRAFTING: 1n << 20n,
  /** Glowing (Jedi glow) */
  GLOWING_JEDI: 1n << 21n,
  /** Mask scent active */
  MASK_SCENT: 1n << 22n,
  /** Poisoned */
  POISONED: 1n << 23n,
  /** Bleeding */
  BLEEDING: 1n << 24n,
  /** Diseased */
  DISEASED: 1n << 25n,
  /** On fire */
  ON_FIRE: 1n << 26n,
  /** Riding mount */
  RIDING_MOUNT: 1n << 27n,
  /** Mounted creature */
  MOUNTED_CREATURE: 1n << 28n,
  /** Piloting ship */
  PILOTING_SHIP: 1n << 29n,
  /** Ship operations (turret, etc.) */
  SHIP_OPERATIONS: 1n << 30n,
  /** Ship gunner */
  SHIP_GUNNER: 1n << 31n,
  /** Ship interior */
  SHIP_INTERIOR: 1n << 32n,
  /** Piloting POB ship */
  PILOTING_POB_SHIP: 1n << 33n,
  /** Incapacitated */
  INCAPACITATED: 1n << 34n,
} as const;

export type CreatureStateType = bigint;

/**
 * HAM (Health/Action/Mind) attribute indices
 */
export const HamAttribute = {
  HEALTH: 0,
  STRENGTH: 1,
  CONSTITUTION: 2,
  ACTION: 3,
  QUICKNESS: 4,
  STAMINA: 5,
  MIND: 6,
  FOCUS: 7,
  WILLPOWER: 8,
} as const;

export type HamAttributeType = (typeof HamAttribute)[keyof typeof HamAttribute];

/** Number of HAM attributes */
export const HAM_ATTRIBUTE_COUNT = 9;

/**
 * Species enumeration
 */
export const Species = {
  HUMAN: 0,
  RODIAN: 1,
  TRANDOSHAN: 2,
  MONCALAMARI: 3,
  WOOKIEE: 4,
  BOTHAN: 5,
  TWILEK: 6,
  ZABRAK: 7,
  ITHORIAN: 8,
  SULLUSTAN: 9,
} as const;

export type SpeciesType = (typeof Species)[keyof typeof Species];

/**
 * Gender enumeration
 */
export const Gender = {
  MALE: 0,
  FEMALE: 1,
} as const;

export type GenderType = (typeof Gender)[keyof typeof Gender];

/**
 * HAM pool data structure
 * Each of the three main pools (Health, Action, Mind) has this structure
 */
export interface HamPool {
  /** Current value */
  current: number;
  /** Maximum value (base + modifiers) */
  max: number;
  /** Base maximum value (from species/level) */
  baseMax: number;
  /** Wounds reduce effective max */
  wounds: number;
  /** Encumbrance from equipment */
  encumbrance: number;
  /** Regeneration rate per second */
  regenRate: number;
}

/**
 * Equipment slot definitions
 */
export const EquipmentSlot = {
  INVENTORY: -1,
  HEAD: 0,
  CHEST: 1,
  LEGS: 2,
  FEET: 3,
  HANDS: 4,
  BACK: 5,
  RIGHT_HAND: 6,
  LEFT_HAND: 7,
  NECKLACE: 8,
  RING_LEFT: 9,
  RING_RIGHT: 10,
  EARRING_LEFT: 11,
  EARRING_RIGHT: 12,
  BRACELET_LEFT: 13,
  BRACELET_RIGHT: 14,
  BICEP_LEFT: 15,
  BICEP_RIGHT: 16,
  BELT: 17,
  CLOAK: 18,
  UTILITY_BELT: 19,
  BANK: 20,
  DATAPAD: 21,
  MISSION_BAG: 22,
} as const;

export type EquipmentSlotType = (typeof EquipmentSlot)[keyof typeof EquipmentSlot];

/**
 * Buff/debuff effect on a creature
 */
export interface CreatureBuff {
  /** CRC of the buff effect */
  buffCrc: CrcValue;
  /** Object ID of the buff giver */
  casterId: ObjectId;
  /** Duration remaining in seconds */
  duration: number;
  /** Timestamp when buff was applied */
  appliedAt: number;
  /** Skill mod effects */
  effects: Map<string, number>;
}

/**
 * Threat table entry for combat
 */
export interface ThreatEntry {
  /** Target object ID */
  targetId: ObjectId;
  /** Accumulated threat value */
  threat: number;
  /** Last time threat was generated */
  lastThreatTime: number;
}

/**
 * CREO property indices for delta tracking
 * These match the variable indices in CREO baselines
 */
export const CreoProperty = {
  // CREO1
  BANK_CREDITS: 0,
  CASH_CREDITS: 1,
  // CREO3
  POSTURE: 0,
  FACTION_RANK: 1,
  OWNER_ID: 2,
  HEIGHT: 3,
  BATTLE_FATIGUE: 4,
  STATE_BITMASK: 5,
  HAM_WOUNDS: 6,
  // CREO4
  ACCEL_SCALE: 0,
  ACCEL_MULTIPLIER_BASE: 1,
  ACCEL_MULTIPLIER_MOD: 2,
  HAM_ENCUMBRANCE: 3,
  SKILL_MODS: 4,
  SPEED_MULTIPLIER_BASE: 5,
  SPEED_MULTIPLIER_MOD: 6,
  LISTEN_TO_ID: 7,
  RUN_SPEED: 8,
  SLOPE_MOD_ANGLE: 9,
  SLOPE_MOD_PERCENT: 10,
  TURN_RATE: 11,
  WALK_SPEED: 12,
  WATER_MOD_PERCENT: 13,
  GROUP_INVITES: 14,
  GUILD_ID: 15,
  WEAPON_ID: 16,
  GROUP_ID: 17,
  INVITE_SENDER_ID: 18,
  INVITE_COUNTER: 19,
  LOCOMOTION: 20,
  PERFORMANCE_COUNTER: 21,
  PERFORMANCE_ID: 22,
  // CREO6
  LEVEL: 0,
  GRANTED_HEALTH: 1,
  CURRENT_WEAPON: 2,
  MAX_LEVEL: 3,
  EQUIPMENT: 4,
  COSTUME: 5,
  VISIBLE: 6,
  BUFFS: 7,
  PERFORMING: 8,
  DIFFICULTY: 9,
  HAM_CURRENT: 10,
  HAM_MAX: 11,
  SKILLS: 12,
  MOOD_ID: 13,
  PERFORMANCE_START_TIME: 14,
  PERFORMANCE_LISTEN_TARGET: 15,
  TARGET_ID: 16,
  DEFENDERS: 17,
} as const;

/**
 * CreatureObject - Base class for all living entities
 * Extends TangibleObject with creature-specific properties
 */
export class CreatureObject extends TangibleObject {
  // ============================================
  // HAM (Health/Action/Mind) System
  // ============================================

  /** Health pool (affects physical damage resistance) */
  health: HamPool;

  /** Action pool (affects combat abilities) */
  action: HamPool;

  /** Mind pool (affects force powers, crafting) */
  mind: HamPool;

  /** Secondary HAM attributes (Strength, Constitution, Quickness, etc.) */
  secondaryAttributes: number[];

  /** HAM wounds array (9 values for each attribute) */
  hamWounds: number[];

  /** HAM encumbrance array (9 values for each attribute) */
  hamEncumbrance: number[];

  /** Battle fatigue (accumulates from combat) */
  battleFatigue: number;

  // ============================================
  // Posture and Movement
  // ============================================

  /** Current posture (standing, sitting, dead, etc.) */
  posture: PostureType;

  /** Current locomotion state */
  locomotion: LocomotionType;

  /** Turn rate in radians per second */
  turnRate: number;

  /** Walking speed in meters per second */
  walkSpeed: number;

  /** Running speed in meters per second */
  runSpeed: number;

  /** Acceleration scale multiplier */
  accelScale: number;

  /** Acceleration multiplier (base) */
  accelMultiplierBase: number;

  /** Acceleration multiplier (modified) */
  accelMultiplierMod: number;

  /** Speed multiplier (base) */
  speedMultiplierBase: number;

  /** Speed multiplier (modified) */
  speedMultiplierMod: number;

  /** Slope movement modifier angle */
  slopeModeAngle: number;

  /** Slope movement modifier percent */
  slopeModPercent: number;

  /** Water movement modifier percent */
  waterModPercent: number;

  /** Character height (affects appearance) */
  height: number;

  // ============================================
  // Character Identity
  // ============================================

  /** Combat level */
  level: number;

  /** Maximum achievable level */
  maxLevel: number;

  /** Granted health (bonus health) */
  grantedHealth: number;

  /** Species (human, twilek, etc.) */
  species: SpeciesType;

  /** Gender */
  gender: GenderType;

  /** Faction CRC (rebel, imperial, neutral) */
  faction: CrcValue;

  /** Faction standing/rank */
  factionRank: number;

  /** Guild ID (0 if not in guild) */
  guildId: number;

  /** Group ID (0 if not in group) */
  groupId: ObjectId;

  /** ID of group invite sender */
  inviteSenderId: ObjectId;

  /** Counter for group invites */
  inviteCounter: number;

  /** List of pending group invites */
  groupInvites: ObjectId[];

  /** Master/owner ID (for pets/droids) */
  masterId: ObjectId;

  // ============================================
  // Mood and Performance
  // ============================================

  /** Current mood string (for chat/emotes) */
  mood: string;

  /** Mood animation ID */
  moodId: number;

  /** Performance type ID (for entertainer) */
  performanceId: number;

  /** Performance start time */
  performanceStartTime: number;

  /** Whether currently performing */
  performing: boolean;

  /** Performance listen target ID */
  listenToId: ObjectId;

  /** Counter for performance actions */
  performanceCounter: number;

  // ============================================
  // Equipment and Appearance
  // ============================================

  /** Equipped items (slot -> objectId) */
  equippedItems: Map<EquipmentSlotType, ObjectId>;

  /** Appearance-only equipment (for appearance tab) */
  appearanceEquipment: Map<EquipmentSlotType, ObjectId>;

  /** Current weapon object ID */
  weaponId: ObjectId;

  /** Costume/appearance container */
  costumeItems: ObjectId[];

  // ============================================
  // Skills and Abilities
  // ============================================

  /** Set of skill box names */
  skills: Set<string>;

  /** Skill modifiers (modName -> value) */
  skillMods: Map<string, number>;

  /** Active buffs */
  buffs: Map<CrcValue, CreatureBuff>;

  // ============================================
  // Combat State
  // ============================================

  /** Creature state bitmask */
  stateBitmask: CreatureStateType;

  /** Current target object ID */
  targetId: ObjectId;

  /** Creature difficulty class */
  difficulty: number;

  /** Threat table for AI targeting */
  threatTable: Map<ObjectId, ThreatEntry>;

  // ============================================
  // Currency
  // ============================================

  /** Cash credits (carried) */
  cashCredits: number;

  /** Bank credits (stored) */
  bankCredits: number;

  // ============================================
  // Delta Tracking
  // ============================================

  /** Delta tracker for CREO1 */
  private deltaTrackerCreo1: DeltaTracker;

  /** Delta tracker for CREO3 */
  private deltaTrackerCreo3: DeltaTracker;

  /** Delta tracker for CREO4 */
  private deltaTrackerCreo4: DeltaTracker;

  /** Delta tracker for CREO6 */
  private deltaTrackerCreo6: DeltaTracker;

  /** Update counters for list properties */
  private listUpdateCounters: Map<string, number>;

  /**
   * Create a new CreatureObject
   * @param objectId - Unique 64-bit identifier
   * @param templateCrc - CRC32 of the object template
   */
  constructor(objectId: ObjectId, templateCrc: CrcValue = 0) {
    super(objectId, templateCrc);

    this.objectType = ObjectType.Creature;

    // Initialize HAM pools
    this.health = this.createHamPool(1000);
    this.action = this.createHamPool(500);
    this.mind = this.createHamPool(500);
    this.secondaryAttributes = new Array(6).fill(0);
    this.hamWounds = new Array(HAM_ATTRIBUTE_COUNT).fill(0);
    this.hamEncumbrance = new Array(HAM_ATTRIBUTE_COUNT).fill(0);
    this.battleFatigue = 0;

    // Initialize posture and movement
    this.posture = Posture.UPRIGHT;
    this.locomotion = Locomotion.STANDING;
    this.turnRate = 1.5708; // ~90 degrees per second
    this.walkSpeed = 1.549;
    this.runSpeed = 5.376;
    this.accelScale = 1.0;
    this.accelMultiplierBase = 1.0;
    this.accelMultiplierMod = 1.0;
    this.speedMultiplierBase = 1.0;
    this.speedMultiplierMod = 1.0;
    this.slopeModeAngle = 1.0;
    this.slopeModPercent = 0.0;
    this.waterModPercent = 0.0;
    this.height = 1.0;

    // Initialize character identity
    this.level = 1;
    this.maxLevel = 90;
    this.grantedHealth = 0;
    this.species = Species.HUMAN;
    this.gender = Gender.MALE;
    this.faction = 0;
    this.factionRank = 0;
    this.guildId = 0;
    this.groupId = 0n;
    this.inviteSenderId = 0n;
    this.inviteCounter = 0;
    this.groupInvites = [];
    this.masterId = 0n;

    // Initialize mood and performance
    this.mood = 'none';
    this.moodId = 0;
    this.performanceId = 0;
    this.performanceStartTime = 0;
    this.performing = false;
    this.listenToId = 0n;
    this.performanceCounter = 0;

    // Initialize equipment
    this.equippedItems = new Map();
    this.appearanceEquipment = new Map();
    this.weaponId = 0n;
    this.costumeItems = [];

    // Initialize skills
    this.skills = new Set();
    this.skillMods = new Map();
    this.buffs = new Map();

    // Initialize combat state
    this.stateBitmask = CreatureState.NONE;
    this.targetId = 0n;
    this.difficulty = 0;
    this.threatTable = new Map();

    // Initialize currency
    this.cashCredits = 0;
    this.bankCredits = 0;

    // Initialize delta trackers
    this.deltaTrackerCreo1 = new DeltaTracker();
    this.deltaTrackerCreo3 = new DeltaTracker();
    this.deltaTrackerCreo4 = new DeltaTracker();
    this.deltaTrackerCreo6 = new DeltaTracker();
    this.listUpdateCounters = new Map();
  }

  /**
   * Create a default HAM pool
   */
  private createHamPool(defaultMax: number): HamPool {
    return {
      current: defaultMax,
      max: defaultMax,
      baseMax: defaultMax,
      wounds: 0,
      encumbrance: 0,
      regenRate: 10,
    };
  }

  /**
   * Get baseline type for CREO objects
   */
  override getBaselineType(): string {
    return 'CREO';
  }

  // ============================================
  // HAM Management
  // ============================================

  /**
   * Calculate effective maximum for a HAM pool
   * Effective max = max - wounds - encumbrance
   */
  getEffectiveMax(pool: HamPool): number {
    return Math.max(1, pool.max - pool.wounds - pool.encumbrance);
  }

  /**
   * Get effective health maximum
   */
  getEffectiveHealthMax(): number {
    return this.getEffectiveMax(this.health);
  }

  /**
   * Get effective action maximum
   */
  getEffectiveActionMax(): number {
    return this.getEffectiveMax(this.action);
  }

  /**
   * Get effective mind maximum
   */
  getEffectiveMindMax(): number {
    return this.getEffectiveMax(this.mind);
  }

  /**
   * Set health current value
   */
  setHealthCurrent(value: number): void {
    const effectiveMax = this.getEffectiveHealthMax();
    const newValue = Math.max(0, Math.min(value, effectiveMax));
    if (this.health.current !== newValue) {
      this.health.current = newValue;
      this.deltaTrackerCreo6.trackChange(CreoProperty.HAM_CURRENT, DeltaType.Change);
      this.markModified();
      this.checkIncapacitation();
    }
  }

  /**
   * Set action current value
   */
  setActionCurrent(value: number): void {
    const effectiveMax = this.getEffectiveActionMax();
    const newValue = Math.max(0, Math.min(value, effectiveMax));
    if (this.action.current !== newValue) {
      this.action.current = newValue;
      this.deltaTrackerCreo6.trackChange(CreoProperty.HAM_CURRENT, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set mind current value
   */
  setMindCurrent(value: number): void {
    const effectiveMax = this.getEffectiveMindMax();
    const newValue = Math.max(0, Math.min(value, effectiveMax));
    if (this.mind.current !== newValue) {
      this.mind.current = newValue;
      this.deltaTrackerCreo6.trackChange(CreoProperty.HAM_CURRENT, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Apply damage to health pool
   * @returns true if creature died
   */
  damageHealth(amount: number): boolean {
    this.setHealthCurrent(this.health.current - amount);
    return this.health.current <= 0;
  }

  /**
   * Apply damage to action pool
   */
  damageAction(amount: number): void {
    this.setActionCurrent(this.action.current - amount);
  }

  /**
   * Apply damage to mind pool
   */
  damageMind(amount: number): void {
    this.setMindCurrent(this.mind.current - amount);
  }

  /**
   * Heal health pool
   */
  healHealth(amount: number): void {
    this.setHealthCurrent(this.health.current + amount);
  }

  /**
   * Heal action pool
   */
  healAction(amount: number): void {
    this.setActionCurrent(this.action.current + amount);
  }

  /**
   * Heal mind pool
   */
  healMind(amount: number): void {
    this.setMindCurrent(this.mind.current + amount);
  }

  /**
   * Add wounds to a HAM attribute
   */
  addWounds(attribute: HamAttributeType, amount: number): void {
    const index = attribute as number;
    if (index >= 0 && index < HAM_ATTRIBUTE_COUNT) {
      this.hamWounds[index] = Math.max(0, (this.hamWounds[index] ?? 0) + amount);
      this.deltaTrackerCreo3.trackChange(CreoProperty.HAM_WOUNDS, DeltaType.Change);
      this.markModified();

      // Update the corresponding pool's wounds
      if (index <= 2) {
        this.health.wounds = (this.hamWounds[0] ?? 0) + (this.hamWounds[1] ?? 0) + (this.hamWounds[2] ?? 0);
      } else if (index <= 5) {
        this.action.wounds = (this.hamWounds[3] ?? 0) + (this.hamWounds[4] ?? 0) + (this.hamWounds[5] ?? 0);
      } else {
        this.mind.wounds = (this.hamWounds[6] ?? 0) + (this.hamWounds[7] ?? 0) + (this.hamWounds[8] ?? 0);
      }
    }
  }

  /**
   * Heal wounds on a HAM attribute
   */
  healWounds(attribute: HamAttributeType, amount: number): void {
    this.addWounds(attribute, -amount);
  }

  /**
   * Regenerate HAM pools based on regen rates
   * Call this periodically (e.g., every second)
   */
  regenerate(deltaSeconds: number): void {
    // Only regenerate if not incapacitated or dead
    if (this.isIncapacitated() || this.isDead()) {
      return;
    }

    const healthRegen = this.health.regenRate * deltaSeconds;
    const actionRegen = this.action.regenRate * deltaSeconds;
    const mindRegen = this.mind.regenRate * deltaSeconds;

    if (this.health.current < this.getEffectiveHealthMax()) {
      this.healHealth(healthRegen);
    }
    if (this.action.current < this.getEffectiveActionMax()) {
      this.healAction(actionRegen);
    }
    if (this.mind.current < this.getEffectiveMindMax()) {
      this.healMind(mindRegen);
    }
  }

  // ============================================
  // State Management
  // ============================================

  /**
   * Check and update incapacitation/death state
   */
  private checkIncapacitation(): void {
    if (this.health.current <= 0) {
      if (!this.hasState(CreatureState.INCAPACITATED) && !this.isDead()) {
        this.setIncapacitated();
      }
    }
  }

  /**
   * Set creature as incapacitated
   */
  setIncapacitated(): void {
    this.setPosture(Posture.INCAPACITATED);
    this.setState(CreatureState.COMBAT);
    this.setLocomotion(Locomotion.INCAPACITATED);
  }

  /**
   * Kill this creature
   */
  kill(): void {
    this.health.current = 0;
    this.setPosture(Posture.DEAD);
    this.clearState(CreatureState.COMBAT);
    this.clearState(CreatureState.INCAPACITATED);
    this.setLocomotion(Locomotion.DEAD);
    this.clearDefenders();
    this.threatTable.clear();
  }

  /**
   * Revive this creature to full health
   */
  revive(): void {
    this.health.current = this.getEffectiveHealthMax();
    this.action.current = this.getEffectiveActionMax();
    this.mind.current = this.getEffectiveMindMax();
    this.setPosture(Posture.UPRIGHT);
    this.setLocomotion(Locomotion.STANDING);
    this.deltaTrackerCreo6.trackChange(CreoProperty.HAM_CURRENT, DeltaType.Change);
    this.markModified();
  }

  /**
   * Check if creature is dead
   */
  isDead(): boolean {
    return this.posture === Posture.DEAD;
  }

  /**
   * Check if creature is incapacitated
   */
  isIncapacitated(): boolean {
    return this.posture === Posture.INCAPACITATED;
  }

  /**
   * Check if creature is in combat
   */
  isInCombatState(): boolean {
    return this.hasState(CreatureState.COMBAT);
  }

  // ============================================
  // Posture and Locomotion
  // ============================================

  /**
   * Set the creature's posture
   */
  setPosture(posture: PostureType): void {
    if (this.posture !== posture) {
      this.posture = posture;
      this.deltaTrackerCreo3.trackChange(CreoProperty.POSTURE, DeltaType.Change);
      this.markModified();

      // Update locomotion based on posture
      this.updateLocomotionForPosture();
    }
  }

  /**
   * Set the creature's locomotion
   */
  setLocomotion(locomotion: LocomotionType): void {
    if (this.locomotion !== locomotion) {
      this.locomotion = locomotion;
      this.deltaTrackerCreo4.trackChange(CreoProperty.LOCOMOTION, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Update locomotion based on current posture
   */
  private updateLocomotionForPosture(): void {
    switch (this.posture) {
      case Posture.UPRIGHT:
        this.setLocomotion(Locomotion.STANDING);
        break;
      case Posture.CROUCHED:
        this.setLocomotion(Locomotion.KNEELING);
        break;
      case Posture.PRONE:
        this.setLocomotion(Locomotion.PRONE);
        break;
      case Posture.SNEAKING:
        this.setLocomotion(Locomotion.SNEAKING);
        break;
      case Posture.SITTING:
        this.setLocomotion(Locomotion.SITTING);
        break;
      case Posture.LYING_DOWN:
        this.setLocomotion(Locomotion.LYING_DOWN);
        break;
      case Posture.INCAPACITATED:
        this.setLocomotion(Locomotion.INCAPACITATED);
        break;
      case Posture.DEAD:
        this.setLocomotion(Locomotion.DEAD);
        break;
      case Posture.KNOCKED_DOWN:
        this.setLocomotion(Locomotion.KNOCKED_DOWN);
        break;
      case Posture.CLIMBING:
        this.setLocomotion(Locomotion.CLIMBING);
        break;
      case Posture.FLYING:
        this.setLocomotion(Locomotion.FLYING);
        break;
      case Posture.DRIVING_VEHICLE:
        this.setLocomotion(Locomotion.DRIVING_VEHICLE);
        break;
      case Posture.RIDING_CREATURE:
        this.setLocomotion(Locomotion.RIDING_CREATURE);
        break;
    }
  }

  // ============================================
  // State Bitmask Management
  // ============================================

  /**
   * Check if creature has a specific state
   */
  hasState(state: CreatureStateType): boolean {
    return (this.stateBitmask & state) !== 0n;
  }

  /**
   * Set a state flag
   */
  setState(state: CreatureStateType): void {
    if ((this.stateBitmask & state) === 0n) {
      this.stateBitmask |= state;
      this.deltaTrackerCreo3.trackChange(CreoProperty.STATE_BITMASK, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Clear a state flag
   */
  clearState(state: CreatureStateType): void {
    if ((this.stateBitmask & state) !== 0n) {
      this.stateBitmask &= ~state;
      this.deltaTrackerCreo3.trackChange(CreoProperty.STATE_BITMASK, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Toggle a state flag
   */
  toggleState(state: CreatureStateType): void {
    this.stateBitmask ^= state;
    this.deltaTrackerCreo3.trackChange(CreoProperty.STATE_BITMASK, DeltaType.Change);
    this.markModified();
  }

  /**
   * Enter combat state
   */
  enterCombat(): void {
    this.setState(CreatureState.COMBAT);
    this.clearState(CreatureState.PEACE);
    this.inCombat = true;
  }

  /**
   * Exit combat state
   */
  exitCombat(): void {
    this.clearState(CreatureState.COMBAT);
    this.inCombat = false;
    this.clearDefenders();
    this.threatTable.clear();
    this.targetId = 0n;
    this.deltaTrackerCreo6.trackChange(CreoProperty.TARGET_ID, DeltaType.Change);
  }

  // ============================================
  // Target Management
  // ============================================

  /**
   * Set the current target
   */
  setTarget(targetId: ObjectId): void {
    if (this.targetId !== targetId) {
      this.targetId = targetId;
      this.deltaTrackerCreo6.trackChange(CreoProperty.TARGET_ID, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Clear the current target
   */
  clearTarget(): void {
    this.setTarget(0n);
  }

  /**
   * Check if this creature has a target
   */
  hasTarget(): boolean {
    return this.targetId !== 0n;
  }

  // ============================================
  // Threat Management
  // ============================================

  /**
   * Add or update threat for a target
   */
  addThreat(targetId: ObjectId, amount: number): void {
    const existing = this.threatTable.get(targetId);
    if (existing) {
      existing.threat += amount;
      existing.lastThreatTime = Date.now();
    } else {
      this.threatTable.set(targetId, {
        targetId,
        threat: amount,
        lastThreatTime: Date.now(),
      });
    }
  }

  /**
   * Get threat value for a target
   */
  getThreat(targetId: ObjectId): number {
    return this.threatTable.get(targetId)?.threat ?? 0;
  }

  /**
   * Get the highest threat target
   */
  getHighestThreatTarget(): ObjectId | undefined {
    let highestThreat = 0;
    let highestTarget: ObjectId | undefined;

    for (const [targetId, entry] of this.threatTable) {
      if (entry.threat > highestThreat) {
        highestThreat = entry.threat;
        highestTarget = targetId;
      }
    }

    return highestTarget;
  }

  /**
   * Clear all threat
   */
  clearThreat(): void {
    this.threatTable.clear();
  }

  /**
   * Remove a target from threat table
   */
  removeThreat(targetId: ObjectId): void {
    this.threatTable.delete(targetId);
  }

  // ============================================
  // Equipment Management
  // ============================================

  /**
   * Equip an item to a slot
   */
  equipItem(slot: EquipmentSlotType, itemId: ObjectId): void {
    this.equippedItems.set(slot, itemId);
    this.incrementListUpdateCounter('equipment');
    this.deltaTrackerCreo6.trackListAdd(CreoProperty.EQUIPMENT, slot, itemId);
    this.markModified();
  }

  /**
   * Unequip an item from a slot
   */
  unequipItem(slot: EquipmentSlotType): ObjectId | undefined {
    const itemId = this.equippedItems.get(slot);
    if (itemId !== undefined) {
      this.equippedItems.delete(slot);
      this.incrementListUpdateCounter('equipment');
      this.deltaTrackerCreo6.trackListRemove(CreoProperty.EQUIPMENT, slot, itemId);
      this.markModified();
    }
    return itemId;
  }

  /**
   * Get equipped item in a slot
   */
  getEquippedItem(slot: EquipmentSlotType): ObjectId | undefined {
    return this.equippedItems.get(slot);
  }

  /**
   * Check if a slot has an item equipped
   */
  hasEquippedItem(slot: EquipmentSlotType): boolean {
    return this.equippedItems.has(slot);
  }

  /**
   * Set current weapon
   */
  setWeapon(weaponId: ObjectId): void {
    if (this.weaponId !== weaponId) {
      this.weaponId = weaponId;
      this.deltaTrackerCreo4.trackChange(CreoProperty.WEAPON_ID, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Skill Management
  // ============================================

  /**
   * Add a skill
   */
  addSkill(skillName: string): void {
    if (!this.skills.has(skillName)) {
      this.skills.add(skillName);
      this.incrementListUpdateCounter('skills');
      this.deltaTrackerCreo6.trackListAdd(CreoProperty.SKILLS, this.skills.size - 1, skillName);
      this.markModified();
    }
  }

  /**
   * Remove a skill
   */
  removeSkill(skillName: string): void {
    if (this.skills.has(skillName)) {
      this.skills.delete(skillName);
      this.incrementListUpdateCounter('skills');
      this.deltaTrackerCreo6.trackListRemove(CreoProperty.SKILLS, 0, skillName);
      this.markModified();
    }
  }

  /**
   * Check if creature has a skill
   */
  hasSkill(skillName: string): boolean {
    return this.skills.has(skillName);
  }

  /**
   * Set a skill modifier
   */
  setSkillMod(modName: string, value: number): void {
    const isNew = !this.skillMods.has(modName);
    this.skillMods.set(modName, value);
    this.incrementListUpdateCounter('skillMods');
    this.deltaTrackerCreo4.trackMapChange(CreoProperty.SKILL_MODS, modName, value, isNew);
    this.markModified();
  }

  /**
   * Get a skill modifier value
   */
  getSkillMod(modName: string): number {
    return this.skillMods.get(modName) ?? 0;
  }

  /**
   * Remove a skill modifier
   */
  removeSkillMod(modName: string): void {
    if (this.skillMods.has(modName)) {
      this.skillMods.delete(modName);
      this.incrementListUpdateCounter('skillMods');
      this.deltaTrackerCreo4.trackMapRemove(CreoProperty.SKILL_MODS, modName);
      this.markModified();
    }
  }

  // ============================================
  // Buff Management
  // ============================================

  /**
   * Apply a buff
   */
  applyBuff(buff: CreatureBuff): void {
    const isNew = !this.buffs.has(buff.buffCrc);
    this.buffs.set(buff.buffCrc, buff);
    this.incrementListUpdateCounter('buffs');
    this.deltaTrackerCreo6.trackMapChange(CreoProperty.BUFFS, buff.buffCrc, buff, isNew);
    this.markModified();

    // Apply buff effects to skill mods
    for (const [modName, value] of buff.effects) {
      const current = this.getSkillMod(modName);
      this.setSkillMod(modName, current + value);
    }
  }

  /**
   * Remove a buff
   */
  removeBuff(buffCrc: CrcValue): CreatureBuff | undefined {
    const buff = this.buffs.get(buffCrc);
    if (buff) {
      this.buffs.delete(buffCrc);
      this.incrementListUpdateCounter('buffs');
      this.deltaTrackerCreo6.trackMapRemove(CreoProperty.BUFFS, buffCrc);
      this.markModified();

      // Remove buff effects from skill mods
      for (const [modName, value] of buff.effects) {
        const current = this.getSkillMod(modName);
        this.setSkillMod(modName, current - value);
      }
    }
    return buff;
  }

  /**
   * Check if creature has a buff
   */
  hasBuff(buffCrc: CrcValue): boolean {
    return this.buffs.has(buffCrc);
  }

  /**
   * Update buff durations (call periodically)
   */
  updateBuffs(deltaSeconds: number): void {
    const expiredBuffs: CrcValue[] = [];

    for (const [crc, buff] of this.buffs) {
      buff.duration -= deltaSeconds;
      if (buff.duration <= 0) {
        expiredBuffs.push(crc);
      }
    }

    for (const crc of expiredBuffs) {
      this.removeBuff(crc);
    }
  }

  // ============================================
  // Group Management
  // ============================================

  /**
   * Set the group ID
   */
  setGroupId(groupId: ObjectId): void {
    if (this.groupId !== groupId) {
      this.groupId = groupId;
      this.deltaTrackerCreo4.trackChange(CreoProperty.GROUP_ID, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Leave the current group
   */
  leaveGroup(): void {
    this.setGroupId(0n);
  }

  /**
   * Check if creature is in a group
   */
  isInGroup(): boolean {
    return this.groupId !== 0n;
  }

  /**
   * Add a group invite
   */
  addGroupInvite(inviterId: ObjectId): void {
    if (!this.groupInvites.includes(inviterId)) {
      this.groupInvites.push(inviterId);
      this.inviteSenderId = inviterId;
      this.inviteCounter++;
      this.incrementListUpdateCounter('groupInvites');
      this.deltaTrackerCreo4.trackListAdd(CreoProperty.GROUP_INVITES, this.groupInvites.length - 1, inviterId);
      this.deltaTrackerCreo4.trackChange(CreoProperty.INVITE_SENDER_ID, DeltaType.Change);
      this.deltaTrackerCreo4.trackChange(CreoProperty.INVITE_COUNTER, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Remove a group invite
   */
  removeGroupInvite(inviterId: ObjectId): void {
    const index = this.groupInvites.indexOf(inviterId);
    if (index !== -1) {
      this.groupInvites.splice(index, 1);
      this.incrementListUpdateCounter('groupInvites');
      this.deltaTrackerCreo4.trackListRemove(CreoProperty.GROUP_INVITES, index, inviterId);
      this.markModified();
    }
  }

  // ============================================
  // Currency Management
  // ============================================

  /**
   * Set cash credits
   */
  setCashCredits(amount: number): void {
    const newAmount = Math.max(0, amount);
    if (this.cashCredits !== newAmount) {
      this.cashCredits = newAmount;
      this.deltaTrackerCreo1.trackChange(CreoProperty.CASH_CREDITS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Add cash credits
   */
  addCashCredits(amount: number): void {
    this.setCashCredits(this.cashCredits + amount);
  }

  /**
   * Remove cash credits
   * @returns true if successful, false if not enough credits
   */
  removeCashCredits(amount: number): boolean {
    if (this.cashCredits >= amount) {
      this.setCashCredits(this.cashCredits - amount);
      return true;
    }
    return false;
  }

  /**
   * Set bank credits
   */
  setBankCredits(amount: number): void {
    const newAmount = Math.max(0, amount);
    if (this.bankCredits !== newAmount) {
      this.bankCredits = newAmount;
      this.deltaTrackerCreo1.trackChange(CreoProperty.BANK_CREDITS, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Add bank credits
   */
  addBankCredits(amount: number): void {
    this.setBankCredits(this.bankCredits + amount);
  }

  /**
   * Remove bank credits
   * @returns true if successful, false if not enough credits
   */
  removeBankCredits(amount: number): boolean {
    if (this.bankCredits >= amount) {
      this.setBankCredits(this.bankCredits - amount);
      return true;
    }
    return false;
  }

  /**
   * Get total credits (cash + bank)
   */
  getTotalCredits(): number {
    return this.cashCredits + this.bankCredits;
  }

  // ============================================
  // Mood and Performance
  // ============================================

  /**
   * Set mood
   */
  setMood(mood: string, moodId: number): void {
    this.mood = mood;
    if (this.moodId !== moodId) {
      this.moodId = moodId;
      this.deltaTrackerCreo6.trackChange(CreoProperty.MOOD_ID, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Start a performance
   */
  startPerformance(performanceId: number): void {
    this.performanceId = performanceId;
    this.performing = true;
    this.performanceStartTime = Date.now();
    this.deltaTrackerCreo4.trackChange(CreoProperty.PERFORMANCE_ID, DeltaType.Change);
    this.deltaTrackerCreo6.trackChange(CreoProperty.PERFORMING, DeltaType.Change);
    this.deltaTrackerCreo6.trackChange(CreoProperty.PERFORMANCE_START_TIME, DeltaType.Change);
    this.markModified();
  }

  /**
   * Stop the current performance
   */
  stopPerformance(): void {
    this.performanceId = 0;
    this.performing = false;
    this.performanceStartTime = 0;
    this.deltaTrackerCreo4.trackChange(CreoProperty.PERFORMANCE_ID, DeltaType.Change);
    this.deltaTrackerCreo6.trackChange(CreoProperty.PERFORMING, DeltaType.Change);
    this.markModified();
  }

  /**
   * Set listen target (watching entertainer)
   */
  setListenTarget(targetId: ObjectId): void {
    if (this.listenToId !== targetId) {
      this.listenToId = targetId;
      this.deltaTrackerCreo4.trackChange(CreoProperty.LISTEN_TO_ID, DeltaType.Change);
      this.deltaTrackerCreo6.trackChange(CreoProperty.PERFORMANCE_LISTEN_TARGET, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Level and Stats
  // ============================================

  /**
   * Set the creature's level
   */
  setLevel(level: number): void {
    const newLevel = Math.max(1, Math.min(level, this.maxLevel));
    if (this.level !== newLevel) {
      this.level = newLevel;
      this.deltaTrackerCreo6.trackChange(CreoProperty.LEVEL, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set faction
   */
  setCreatureFaction(faction: CrcValue, rank: number = 0): void {
    if (this.faction !== faction || this.factionRank !== rank) {
      this.faction = faction;
      this.factionRank = rank;
      this.deltaTrackerCreo3.trackChange(CreoProperty.FACTION_RANK, DeltaType.Change);
      this.markModified();
    }
  }

  /**
   * Set guild ID
   */
  setGuildId(guildId: number): void {
    if (this.guildId !== guildId) {
      this.guildId = guildId;
      this.deltaTrackerCreo4.trackChange(CreoProperty.GUILD_ID, DeltaType.Change);
      this.markModified();
    }
  }

  // ============================================
  // Delta Management
  // ============================================

  /**
   * Increment update counter for a list property
   */
  private incrementListUpdateCounter(listName: string): void {
    const current = this.listUpdateCounters.get(listName) ?? 0;
    this.listUpdateCounters.set(listName, current + 1);
  }

  /**
   * Get update counter for a list property
   */
  getListUpdateCounter(listName: string): number {
    return this.listUpdateCounters.get(listName) ?? 0;
  }

  /**
   * Check if CREO1 has changes
   */
  hasCreo1Changes(): boolean {
    return this.deltaTrackerCreo1.hasChanges();
  }

  /**
   * Check if CREO3 has changes
   */
  hasCreo3Changes(): boolean {
    return this.deltaTrackerCreo3.hasChanges();
  }

  /**
   * Check if CREO4 has changes
   */
  hasCreo4Changes(): boolean {
    return this.deltaTrackerCreo4.hasChanges();
  }

  /**
   * Check if CREO6 has changes
   */
  hasCreo6Changes(): boolean {
    return this.deltaTrackerCreo6.hasChanges();
  }

  /**
   * Get CREO1 delta tracker
   */
  getCreo1DeltaTracker(): DeltaTracker {
    return this.deltaTrackerCreo1;
  }

  /**
   * Get CREO3 delta tracker
   */
  getCreo3DeltaTracker(): DeltaTracker {
    return this.deltaTrackerCreo3;
  }

  /**
   * Get CREO4 delta tracker
   */
  getCreo4DeltaTracker(): DeltaTracker {
    return this.deltaTrackerCreo4;
  }

  /**
   * Get CREO6 delta tracker
   */
  getCreo6DeltaTracker(): DeltaTracker {
    return this.deltaTrackerCreo6;
  }

  /**
   * Clear all delta trackers
   */
  clearAllDeltas(): void {
    this.deltaTrackerCreo1.clear();
    this.deltaTrackerCreo3.clear();
    this.deltaTrackerCreo4.clear();
    this.deltaTrackerCreo6.clear();
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Get HAM current values as an array
   */
  getHamCurrentArray(): number[] {
    return [
      this.health.current,
      0, // Strength (not tracked as current)
      0, // Constitution
      this.action.current,
      0, // Quickness
      0, // Stamina
      this.mind.current,
      0, // Focus
      0, // Willpower
    ];
  }

  /**
   * Get HAM max values as an array
   */
  getHamMaxArray(): number[] {
    return [
      this.health.max,
      0,
      0,
      this.action.max,
      0,
      0,
      this.mind.max,
      0,
      0,
    ];
  }

  /**
   * Serialize to JSON for debugging/persistence
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      health: { ...this.health },
      action: { ...this.action },
      mind: { ...this.mind },
      posture: this.posture,
      locomotion: this.locomotion,
      level: this.level,
      species: this.species,
      gender: this.gender,
      faction: this.faction,
      factionRank: this.factionRank,
      guildId: this.guildId,
      groupId: this.groupId.toString(),
      mood: this.mood,
      moodId: this.moodId,
      stateBitmask: this.stateBitmask.toString(),
      targetId: this.targetId.toString(),
      cashCredits: this.cashCredits,
      bankCredits: this.bankCredits,
      skills: Array.from(this.skills),
      skillMods: Object.fromEntries(this.skillMods),
      equippedItems: Object.fromEntries(
        Array.from(this.equippedItems.entries()).map(([k, v]) => [k, v.toString()])
      ),
    };
  }
}
