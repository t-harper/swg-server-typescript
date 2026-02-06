/**
 * Threat Assessment
 * Threat and aggro management system for NPCs including
 * threat generation, target switching, and leashing mechanics.
 */

import type { Vector3, ObjectId } from '@swg/shared-types';
import type { CreatureObject } from '@swg/objects';
import type { AIContext } from '../ai-context.js';
import {
  getBlackboardValue,
  setBlackboardValue,
  BlackboardKeys,
} from '../ai-context.js';
import { LeafNode, NodeStatus, BehaviorNode } from '../nodes/base.js';
import { Sequence, Selector, PrioritySelector } from '../nodes/composites.js';
import { BehaviorTree } from '../behavior-tree.js';

/**
 * Blackboard keys for threat assessment
 */
export const ThreatBlackboardKeys = {
  /** Internal threat table */
  THREAT_TABLE: 'threat_table',
  /** Threat decay rate per second */
  THREAT_DECAY_RATE: 'threat_decay_rate',
  /** Time of last threat update */
  LAST_THREAT_UPDATE: 'threat_last_update',
  /** Threat cap per target */
  THREAT_CAP: 'threat_cap',
  /** Threat threshold for target switch */
  SWITCH_THRESHOLD: 'threat_switch_threshold',
  /** Leash distance from home */
  LEASH_DISTANCE: 'threat_leash_distance',
  /** Time target has been out of combat range */
  OUT_OF_RANGE_TIME: 'threat_out_of_range_time',
  /** Deaggro timer */
  DEAGGRO_TIMER: 'threat_deaggro_timer',
  /** Combat timeout duration */
  COMBAT_TIMEOUT: 'threat_combat_timeout',
  /** Assist target (for assist mechanics) */
  ASSIST_TARGET: 'threat_assist_target',
  /** Taunt source */
  TAUNT_SOURCE: 'threat_taunt_source',
  /** Taunt expiry time */
  TAUNT_EXPIRY: 'threat_taunt_expiry',
} as const;

/**
 * Threat entry for a single target
 */
export interface ThreatEntry {
  /** Target creature ID */
  targetId: ObjectId;
  /** Current threat value */
  threat: number;
  /** Time threat was last updated */
  lastUpdate: number;
  /** Whether this target is in combat range */
  inRange: boolean;
  /** Position when last seen */
  lastPosition: Vector3;
  /** Damage dealt by this target */
  totalDamage: number;
  /** Healing done by this target */
  totalHealing: number;
}

/**
 * Threat generation rules
 */
export interface ThreatGenerationRules {
  /** Threat per point of damage dealt */
  damageMultiplier: number;
  /** Threat per point of healing done */
  healingMultiplier: number;
  /** Flat threat for abilities */
  abilityThreat: number;
  /** Threat multiplier for being in melee range */
  meleeRangeMultiplier: number;
  /** Bonus threat for taunt abilities */
  tauntThreatBonus: number;
  /** Threat reduction for threat dumps */
  threatDumpReduction: number;
  /** Maximum threat cap */
  maxThreat: number;
}

/**
 * Default threat generation rules
 */
export const DEFAULT_THREAT_RULES: ThreatGenerationRules = {
  damageMultiplier: 1.0,
  healingMultiplier: 0.5,
  abilityThreat: 10,
  meleeRangeMultiplier: 1.1,
  tauntThreatBonus: 500,
  threatDumpReduction: 0.5,
  maxThreat: 100000,
};

/**
 * ThreatTableManager
 *
 * Manages the threat table for a creature:
 * - Tracks threat per target
 * - Handles threat decay
 * - Provides highest threat queries
 */
export class ThreatTableManager {
  /** Threat entries by target ID */
  private entries: Map<string, ThreatEntry> = new Map();

  /** Threat generation rules */
  rules: ThreatGenerationRules;

  /** Decay rate per second */
  decayRate: number;

  /** Combat range */
  combatRange: number;

  constructor(
    options: {
      rules?: Partial<ThreatGenerationRules> | undefined;
      decayRate?: number | undefined;
      combatRange?: number | undefined;
    } = {}
  ) {
    this.rules = { ...DEFAULT_THREAT_RULES, ...options.rules };
    this.decayRate = options.decayRate ?? 5;
    this.combatRange = options.combatRange ?? 64;
  }

  /**
   * Add threat for a target
   */
  addThreat(
    targetId: ObjectId,
    amount: number,
    source: 'damage' | 'healing' | 'ability' | 'taunt',
    position: Vector3
  ): number {
    const idStr = String(targetId);
    const now = Date.now();

    let entry = this.entries.get(idStr);
    if (!entry) {
      entry = {
        targetId,
        threat: 0,
        lastUpdate: now,
        inRange: true,
        lastPosition: { ...position },
        totalDamage: 0,
        totalHealing: 0,
      };
      this.entries.set(idStr, entry);
    }

    // Calculate threat based on source
    let threatAmount = amount;
    switch (source) {
      case 'damage':
        threatAmount *= this.rules.damageMultiplier;
        entry.totalDamage += amount;
        break;
      case 'healing':
        threatAmount *= this.rules.healingMultiplier;
        entry.totalHealing += amount;
        break;
      case 'ability':
        threatAmount += this.rules.abilityThreat;
        break;
      case 'taunt':
        threatAmount += this.rules.tauntThreatBonus;
        break;
    }

    entry.threat = Math.min(entry.threat + threatAmount, this.rules.maxThreat);
    entry.lastUpdate = now;
    entry.lastPosition = { ...position };

    return entry.threat;
  }

  /**
   * Remove threat for a target
   */
  removeThreat(targetId: ObjectId, amount?: number): void {
    const idStr = String(targetId);
    const entry = this.entries.get(idStr);
    if (!entry) return;

    if (amount === undefined) {
      this.entries.delete(idStr);
    } else {
      entry.threat = Math.max(0, entry.threat - amount);
      if (entry.threat === 0) {
        this.entries.delete(idStr);
      }
    }
  }

  /**
   * Reduce threat by percentage (for threat dumps)
   */
  reduceThreatByPercent(targetId: ObjectId, percent: number): void {
    const idStr = String(targetId);
    const entry = this.entries.get(idStr);
    if (entry) {
      entry.threat *= (1 - percent);
    }
  }

  /**
   * Get highest threat target
   */
  getHighestThreat(): ThreatEntry | null {
    let highest: ThreatEntry | null = null;
    for (const entry of this.entries.values()) {
      if (!highest || entry.threat > highest.threat) {
        highest = entry;
      }
    }
    return highest;
  }

  /**
   * Get sorted threat list
   */
  getSortedThreatList(): ThreatEntry[] {
    return Array.from(this.entries.values()).sort((a, b) => b.threat - a.threat);
  }

  /**
   * Update threat decay
   */
  updateDecay(deltaTime: number): void {
    const decayAmount = this.decayRate * deltaTime;
    const toRemove: string[] = [];

    for (const [id, entry] of this.entries) {
      entry.threat = Math.max(0, entry.threat - decayAmount);
      if (entry.threat === 0) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.entries.delete(id);
    }
  }

  /**
   * Clear all threat
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Get threat for specific target
   */
  getThreat(targetId: ObjectId): number {
    return this.entries.get(String(targetId))?.threat ?? 0;
  }

  /**
   * Get entry for target
   */
  getEntry(targetId: ObjectId): ThreatEntry | undefined {
    return this.entries.get(String(targetId));
  }

  /**
   * Check if any threat exists
   */
  hasThreat(): boolean {
    return this.entries.size > 0;
  }

  /**
   * Get all entries
   */
  getAllEntries(): ThreatEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Set a target as out of range
   */
  setOutOfRange(targetId: ObjectId): void {
    const entry = this.entries.get(String(targetId));
    if (entry) {
      entry.inRange = false;
    }
  }

  /**
   * Set a target as in range
   */
  setInRange(targetId: ObjectId, position: Vector3): void {
    const entry = this.entries.get(String(targetId));
    if (entry) {
      entry.inRange = true;
      entry.lastPosition = { ...position };
    }
  }
}

/**
 * UpdateThreatTable Action
 *
 * Updates the threat table based on recent events:
 * - Processes damage/healing
 * - Applies decay
 * - Updates range status
 */
export class UpdateThreatTable extends LeafNode {
  /** Threat table manager */
  threatManager: ThreatTableManager;

  /** Callback to get pending threat events */
  getPendingThreatEvents?: ((context: AIContext) => Array<{
    sourceId: ObjectId;
    amount: number;
    type: 'damage' | 'healing' | 'ability' | 'taunt';
    position: Vector3;
  }>) | undefined;

  /** Callback to resolve creature position */
  getCreaturePosition?: ((id: ObjectId) => Vector3 | null) | undefined;

  constructor(
    options: {
      threatManager?: ThreatTableManager | undefined;
      getPendingThreatEvents?: ((context: AIContext) => Array<{
        sourceId: ObjectId;
        amount: number;
        type: 'damage' | 'healing' | 'ability' | 'taunt';
        position: Vector3;
      }>) | undefined;
      getCreaturePosition?: ((id: ObjectId) => Vector3 | null) | undefined;
    } = {},
    name?: string
  ) {
    super(name ?? 'UpdateThreatTable');
    this.threatManager = options.threatManager ?? new ThreatTableManager();
    this.getPendingThreatEvents = options.getPendingThreatEvents;
    this.getCreaturePosition = options.getCreaturePosition;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, deltaTime } = context;

    // Process pending threat events
    if (this.getPendingThreatEvents) {
      const events = this.getPendingThreatEvents(context);
      for (const event of events) {
        this.threatManager.addThreat(event.sourceId, event.amount, event.type, event.position);
      }
    }

    // Update range status
    if (this.getCreaturePosition) {
      for (const entry of this.threatManager.getAllEntries()) {
        const pos = this.getCreaturePosition(entry.targetId);
        if (pos) {
          const distance = Math.sqrt(
            (pos.x - creature.position.x) ** 2 +
            (pos.z - creature.position.z) ** 2
          );
          if (distance <= this.threatManager.combatRange) {
            this.threatManager.setInRange(entry.targetId, pos);
          } else {
            this.threatManager.setOutOfRange(entry.targetId);
          }
        }
      }
    }

    // Apply decay
    this.threatManager.updateDecay(deltaTime);

    // Store in blackboard
    setBlackboardValue(context, ThreatBlackboardKeys.THREAT_TABLE, this.threatManager);
    setBlackboardValue(context, ThreatBlackboardKeys.LAST_THREAT_UPDATE, Date.now());

    return NodeStatus.Success;
  }
}

/**
 * SelectThreatTarget Action
 *
 * Selects target based on threat table:
 * - Highest threat normally
 * - Handles taunt mechanics
 * - Respects target switching threshold
 */
export class SelectThreatTarget extends LeafNode {
  /** Threat table manager (or get from blackboard) */
  threatManager?: ThreatTableManager | undefined;

  /** Threshold percentage for switching targets (e.g., 1.1 = 110%) */
  switchThreshold: number;

  /** Callback to resolve creature from ID */
  resolveCreature?: ((id: ObjectId) => CreatureObject | null) | undefined;

  constructor(
    options: {
      threatManager?: ThreatTableManager | undefined;
      switchThreshold?: number | undefined;
      resolveCreature?: ((id: ObjectId) => CreatureObject | null) | undefined;
    } = {},
    name?: string
  ) {
    super(name ?? 'SelectThreatTarget');
    this.threatManager = options.threatManager;
    this.switchThreshold = options.switchThreshold ?? 1.1;
    this.resolveCreature = options.resolveCreature;
  }

  tick(context: AIContext): NodeStatus {
    const manager = this.threatManager ??
      getBlackboardValue<ThreatTableManager>(context, ThreatBlackboardKeys.THREAT_TABLE);

    if (!manager || !manager.hasThreat()) {
      context.target = null;
      return NodeStatus.Failure;
    }

    // Check for taunt
    const tauntSource = getBlackboardValue<ObjectId>(context, ThreatBlackboardKeys.TAUNT_SOURCE);
    const tauntExpiry = getBlackboardValue<number>(context, ThreatBlackboardKeys.TAUNT_EXPIRY);

    if (tauntSource && tauntExpiry && Date.now() < tauntExpiry) {
      // Forced target from taunt
      if (this.resolveCreature) {
        const taunter = this.resolveCreature(tauntSource);
        if (taunter && !taunter.isDead()) {
          context.target = taunter;
          return NodeStatus.Success;
        }
      }
      // Taunt target invalid, clear
      context.blackboard.delete(ThreatBlackboardKeys.TAUNT_SOURCE);
      context.blackboard.delete(ThreatBlackboardKeys.TAUNT_EXPIRY);
    }

    // Get highest threat
    const highest = manager.getHighestThreat();
    if (!highest) {
      context.target = null;
      return NodeStatus.Failure;
    }

    // Check if we should switch targets
    const currentTargetId = context.target?.objectId;
    if (currentTargetId) {
      const currentThreat = manager.getThreat(currentTargetId);
      // Only switch if new target has significantly more threat
      if (currentThreat > 0 && highest.threat < currentThreat * this.switchThreshold) {
        // Keep current target
        return NodeStatus.Success;
      }
    }

    // Switch to highest threat
    if (this.resolveCreature) {
      const target = this.resolveCreature(highest.targetId);
      if (target && !target.isDead()) {
        context.target = target;
        return NodeStatus.Success;
      } else {
        // Target invalid, remove from threat table
        manager.removeThreat(highest.targetId);
        return NodeStatus.Failure;
      }
    }

    return NodeStatus.Failure;
  }
}

/**
 * ApplyTaunt Action
 *
 * Applies a taunt effect, forcing target switch:
 * - Sets taunt source
 * - Adds bonus threat
 * - Sets taunt duration
 */
export class ApplyTaunt extends LeafNode {
  /** Taunt duration in seconds */
  duration: number;

  /** Bonus threat to add */
  bonusThreat: number;

  constructor(
    options: {
      duration?: number;
      bonusThreat?: number;
    } = {},
    name?: string
  ) {
    super(name ?? 'ApplyTaunt');
    this.duration = options.duration ?? 6;
    this.bonusThreat = options.bonusThreat ?? 500;
  }

  tick(context: AIContext): NodeStatus {
    const { target } = context;

    if (!target) {
      return NodeStatus.Failure;
    }

    // Set taunt
    setBlackboardValue(context, ThreatBlackboardKeys.TAUNT_SOURCE, target.objectId);
    setBlackboardValue(context, ThreatBlackboardKeys.TAUNT_EXPIRY, Date.now() + this.duration * 1000);

    // Add bonus threat
    const manager = getBlackboardValue<ThreatTableManager>(context, ThreatBlackboardKeys.THREAT_TABLE);
    if (manager) {
      manager.addThreat(target.objectId, this.bonusThreat, 'taunt', {
        x: target.position.x,
        y: target.position.y,
        z: target.position.z,
      });
    }

    return NodeStatus.Success;
  }
}

/**
 * CheckDeaggro Action
 *
 * Checks if creature should deaggro:
 * - All threats dead or too far
 * - Combat timeout exceeded
 * - Returns to home if deaggro
 */
export class CheckDeaggro extends LeafNode {
  /** Timeout before deaggro (seconds) */
  combatTimeout: number;

  /** Distance at which targets are considered "too far" */
  maxRange: number;

  /** Callback to check if target is valid */
  isTargetValid?: ((id: ObjectId) => boolean) | undefined;

  constructor(
    options: {
      combatTimeout?: number | undefined;
      maxRange?: number | undefined;
      isTargetValid?: ((id: ObjectId) => boolean) | undefined;
    } = {},
    name?: string
  ) {
    super(name ?? 'CheckDeaggro');
    this.combatTimeout = options.combatTimeout ?? 30;
    this.maxRange = options.maxRange ?? 64;
    this.isTargetValid = options.isTargetValid;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, homePosition } = context;
    const now = Date.now();

    const manager = getBlackboardValue<ThreatTableManager>(context, ThreatBlackboardKeys.THREAT_TABLE);

    // No threat table = deaggro
    if (!manager || !manager.hasThreat()) {
      return NodeStatus.Success;
    }

    // Check if all targets are invalid/out of range
    let hasValidTarget = false;
    for (const entry of manager.getAllEntries()) {
      if (this.isTargetValid && !this.isTargetValid(entry.targetId)) {
        manager.removeThreat(entry.targetId);
        continue;
      }

      // Check range
      const distance = Math.sqrt(
        (entry.lastPosition.x - creature.position.x) ** 2 +
        (entry.lastPosition.z - creature.position.z) ** 2
      );

      if (distance <= this.maxRange && entry.inRange) {
        hasValidTarget = true;
        break;
      }
    }

    if (!hasValidTarget) {
      // Check timeout
      const outOfRangeTime = getBlackboardValue<number>(context, ThreatBlackboardKeys.OUT_OF_RANGE_TIME);
      if (!outOfRangeTime) {
        setBlackboardValue(context, ThreatBlackboardKeys.OUT_OF_RANGE_TIME, now);
        return NodeStatus.Failure;
      }

      if ((now - outOfRangeTime) / 1000 >= this.combatTimeout) {
        // Deaggro
        manager.clear();
        context.blackboard.delete(ThreatBlackboardKeys.OUT_OF_RANGE_TIME);
        return NodeStatus.Success;
      }
    } else {
      // Reset out of range timer
      context.blackboard.delete(ThreatBlackboardKeys.OUT_OF_RANGE_TIME);
    }

    return NodeStatus.Failure;
  }
}

/**
 * LeashCheck Action
 *
 * Checks if creature is too far from home and should leash:
 * - Compares distance to home vs leash distance
 * - Triggers return and threat clear on leash
 */
export class LeashCheck extends LeafNode {
  /** Maximum distance from home before leashing */
  leashDistance: number;

  /** Whether to clear threat on leash */
  clearThreatOnLeash: boolean;

  constructor(
    options: {
      leashDistance?: number | undefined;
      clearThreatOnLeash?: boolean | undefined;
    } = {},
    name?: string
  ) {
    super(name ?? 'LeashCheck');
    this.leashDistance = options.leashDistance ?? 64;
    this.clearThreatOnLeash = options.clearThreatOnLeash ?? true;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, homePosition } = context;

    const distance = Math.sqrt(
      (creature.position.x - homePosition.x) ** 2 +
      (creature.position.z - homePosition.z) ** 2
    );

    if (distance > this.leashDistance) {
      // Should leash
      if (this.clearThreatOnLeash) {
        const manager = getBlackboardValue<ThreatTableManager>(context, ThreatBlackboardKeys.THREAT_TABLE);
        if (manager) {
          manager.clear();
        }
      }

      setBlackboardValue(context, BlackboardKeys.RETURNING_HOME, true);
      return NodeStatus.Success;
    }

    return NodeStatus.Failure;
  }
}

/**
 * ThreatDump Action
 *
 * Reduces threat for a target (for threat dump abilities):
 * - Reduces by percentage
 * - Can be used by players or NPCs
 */
export class ThreatDump extends LeafNode {
  /** Percentage to reduce (0-1) */
  reductionPercent: number;

  constructor(reductionPercent: number = 0.5, name?: string) {
    super(name ?? 'ThreatDump');
    this.reductionPercent = reductionPercent;
  }

  tick(context: AIContext): NodeStatus {
    const { target, creature } = context;

    if (!target) {
      return NodeStatus.Failure;
    }

    const manager = getBlackboardValue<ThreatTableManager>(context, ThreatBlackboardKeys.THREAT_TABLE);
    if (manager) {
      manager.reduceThreatByPercent(target.objectId, this.reductionPercent);
    }

    return NodeStatus.Success;
  }
}

/**
 * AssistTarget Action
 *
 * Assists an ally by targeting their target:
 * - Used for coordinated attacks
 * - Inherits some threat
 */
export class AssistTarget extends LeafNode {
  /** Callback to get ally's target */
  getAllyTarget?: ((context: AIContext, allyId: ObjectId) => ObjectId | null) | undefined;

  /** Callback to resolve creature */
  resolveCreature?: ((id: ObjectId) => CreatureObject | null) | undefined;

  constructor(
    options: {
      getAllyTarget?: ((context: AIContext, allyId: ObjectId) => ObjectId | null) | undefined;
      resolveCreature?: ((id: ObjectId) => CreatureObject | null) | undefined;
    } = {},
    name?: string
  ) {
    super(name ?? 'AssistTarget');
    this.getAllyTarget = options.getAllyTarget;
    this.resolveCreature = options.resolveCreature;
  }

  tick(context: AIContext): NodeStatus {
    const assistTargetId = getBlackboardValue<ObjectId>(context, ThreatBlackboardKeys.ASSIST_TARGET);

    if (!assistTargetId || !this.getAllyTarget || !this.resolveCreature) {
      return NodeStatus.Failure;
    }

    const allyTargetId = this.getAllyTarget(context, assistTargetId);
    if (!allyTargetId) {
      return NodeStatus.Failure;
    }

    const target = this.resolveCreature(allyTargetId);
    if (!target || target.isDead()) {
      return NodeStatus.Failure;
    }

    context.target = target;

    // Add initial threat
    const manager = getBlackboardValue<ThreatTableManager>(context, ThreatBlackboardKeys.THREAT_TABLE);
    if (manager) {
      manager.addThreat(allyTargetId, 50, 'ability', {
        x: target.position.x,
        y: target.position.y,
        z: target.position.z,
      });
    }

    return NodeStatus.Success;
  }
}

/**
 * Options for creating threat assessment behavior
 */
export interface ThreatAssessmentOptions {
  /** Threat generation rules */
  rules?: Partial<ThreatGenerationRules> | undefined;
  /** Decay rate per second */
  decayRate?: number | undefined;
  /** Combat range */
  combatRange?: number | undefined;
  /** Leash distance */
  leashDistance?: number | undefined;
  /** Combat timeout for deaggro */
  combatTimeout?: number | undefined;
  /** Switch threshold */
  switchThreshold?: number | undefined;
  /** Callbacks */
  getPendingThreatEvents?: ((context: AIContext) => Array<{
    sourceId: ObjectId;
    amount: number;
    type: 'damage' | 'healing' | 'ability' | 'taunt';
    position: Vector3;
  }>) | undefined;
  getCreaturePosition?: ((id: ObjectId) => Vector3 | null) | undefined;
  resolveCreature?: ((id: ObjectId) => CreatureObject | null) | undefined;
  isTargetValid?: ((id: ObjectId) => boolean) | undefined;
}

/**
 * Creates a threat assessment behavior tree
 */
export function createThreatAssessmentBehavior(options: ThreatAssessmentOptions): BehaviorTree {
  const {
    rules,
    decayRate,
    combatRange,
    leashDistance = 64,
    combatTimeout = 30,
    switchThreshold = 1.1,
    getPendingThreatEvents,
    getCreaturePosition,
    resolveCreature,
    isTargetValid,
  } = options;

  const threatManager = new ThreatTableManager({
    rules,
    decayRate,
    combatRange,
  });

  const nodes: BehaviorNode[] = [
    // Update threat table
    new UpdateThreatTable({
      threatManager,
      getPendingThreatEvents,
      getCreaturePosition,
    }),

    // Check leash
    new LeashCheck({ leashDistance }),

    // Check deaggro
    new CheckDeaggro({
      combatTimeout,
      maxRange: combatRange,
      isTargetValid,
    }),

    // Select target
    new SelectThreatTarget({
      threatManager,
      switchThreshold,
      resolveCreature,
    }),
  ];

  const root = new PrioritySelector(nodes, 'ThreatAssessmentRoot');
  return new BehaviorTree(root, 'ThreatAssessment');
}

/**
 * Creates a threat table manager with default settings
 */
export function createThreatManager(
  options?: Partial<ThreatGenerationRules> & {
    decayRate?: number | undefined;
    combatRange?: number | undefined;
  }
): ThreatTableManager {
  return new ThreatTableManager({
    rules: options,
    decayRate: options?.decayRate,
    combatRange: options?.combatRange,
  });
}
