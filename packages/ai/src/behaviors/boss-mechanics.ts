/**
 * Boss Mechanics
 * Advanced boss encounter mechanics including phases,
 * special abilities, add spawning, and unique mechanics.
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
import { Sequence, Selector, PrioritySelector, Parallel, ParallelPolicy } from '../nodes/composites.js';
import { Inverter, Succeeder } from '../nodes/decorators.js';
import { BehaviorTree } from '../behavior-tree.js';

/**
 * Blackboard keys for boss mechanics
 */
export const BossBlackboardKeys = {
  /** Current boss phase */
  BOSS_PHASE: 'boss_phase',
  /** Time phase started */
  PHASE_START_TIME: 'boss_phase_start_time',
  /** Enrage timer start */
  ENRAGE_START_TIME: 'boss_enrage_start_time',
  /** Whether boss is enraged */
  IS_ENRAGED: 'boss_is_enraged',
  /** Spawned add IDs */
  SPAWNED_ADDS: 'boss_spawned_adds',
  /** Special ability cooldowns */
  SPECIAL_COOLDOWNS: 'boss_special_cooldowns',
  /** Phase transition health thresholds hit */
  PHASE_THRESHOLDS_HIT: 'boss_phase_thresholds_hit',
  /** Current mechanic being executed */
  CURRENT_MECHANIC: 'boss_current_mechanic',
  /** Mechanic targets */
  MECHANIC_TARGETS: 'boss_mechanic_targets',
  /** Mechanic positions */
  MECHANIC_POSITIONS: 'boss_mechanic_positions',
  /** Boss state flags */
  BOSS_STATE_FLAGS: 'boss_state_flags',
  /** Damage immunity flag */
  IS_IMMUNE: 'boss_is_immune',
  /** Last special ability used */
  LAST_SPECIAL_ABILITY: 'boss_last_special_ability',
} as const;

/**
 * Boss phase definition
 */
export interface BossPhase {
  /** Phase number (1, 2, 3, etc.) */
  phaseNumber: number;
  /** Health threshold to enter phase (1.0 = 100%, 0.5 = 50%) */
  healthThreshold: number;
  /** Phase name for logging/UI */
  name: string;
  /** Abilities available in this phase */
  abilities: string[];
  /** Whether boss is immune to damage in this phase */
  damageImmune?: boolean | undefined;
  /** Speed multiplier for this phase */
  speedMultiplier?: number | undefined;
  /** Damage multiplier for this phase */
  damageMultiplier?: number | undefined;
  /** Special behaviors for this phase */
  specialBehaviors?: string[] | undefined;
  /** Callback when phase starts */
  onPhaseStart?: ((context: AIContext) => void) | undefined;
  /** Callback when phase ends */
  onPhaseEnd?: ((context: AIContext) => void) | undefined;
}

/**
 * Special ability definition for bosses
 */
export interface BossAbility {
  /** Unique ability ID */
  id: string;
  /** Display name */
  name: string;
  /** Cooldown in seconds */
  cooldown: number;
  /** Cast time in seconds (0 = instant) */
  castTime: number;
  /** Required phases (empty = all phases) */
  phases?: number[] | undefined;
  /** Health threshold to use (below this health %) */
  healthThreshold?: number | undefined;
  /** Whether this is an enrage ability */
  isEnrageAbility?: boolean | undefined;
  /** Target selection */
  targeting: 'current' | 'random' | 'highest_threat' | 'lowest_health' | 'all' | 'position';
  /** Number of targets (for 'random') */
  targetCount?: number | undefined;
  /** Callback to execute ability */
  execute: (context: AIContext, targets: CreatureObject[], positions?: Vector3[]) => void;
  /** Optional condition check */
  condition?: ((context: AIContext) => boolean) | undefined;
}

/**
 * Add spawn definition
 */
export interface AddSpawnDefinition {
  /** Spawn trigger type */
  trigger: 'phase' | 'timer' | 'health' | 'ability';
  /** Trigger value (phase number, seconds, health %, ability ID) */
  triggerValue: number | string;
  /** Number of adds to spawn */
  count: number;
  /** Add template/type */
  addType: string;
  /** Spawn positions (or callback) */
  positions?: Vector3[] | ((context: AIContext) => Vector3[]) | undefined;
  /** Maximum active adds of this type */
  maxActive?: number | undefined;
  /** Respawn time if killed (0 = no respawn) */
  respawnTime?: number | undefined;
  /** Callback when adds spawn */
  onSpawn?: ((context: AIContext, addIds: ObjectId[]) => void) | undefined;
}

/**
 * Enrage configuration
 */
export interface EnrageConfig {
  /** Time until enrage (seconds) */
  timer: number;
  /** Damage multiplier when enraged */
  damageMultiplier: number;
  /** Speed multiplier when enraged */
  speedMultiplier: number;
  /** Attack speed multiplier when enraged */
  attackSpeedMultiplier: number;
  /** Whether enrage is a soft enrage (gradual) or hard (instant) */
  softEnrage: boolean;
  /** Soft enrage ramp-up time (seconds) */
  rampUpTime?: number | undefined;
  /** Callback when enrage triggers */
  onEnrage?: ((context: AIContext) => void) | undefined;
}

/**
 * PhaseController Action
 *
 * Controls boss phase transitions:
 * - Monitors health for phase changes
 * - Triggers phase abilities
 * - Manages phase immunities
 */
export class PhaseController extends LeafNode {
  /** Phase definitions */
  phases: BossPhase[];

  /** Whether phases can be skipped */
  allowPhaseSkip: boolean;

  /** Callback when phase changes */
  onPhaseChange?: ((context: AIContext, oldPhase: number, newPhase: number) => void) | undefined;

  constructor(
    options: {
      phases?: BossPhase[];
      allowPhaseSkip?: boolean;
      onPhaseChange?: ((context: AIContext, oldPhase: number, newPhase: number) => void) | undefined;
    } = {},
    name?: string
  ) {
    super(name ?? 'PhaseController');
    this.phases = options.phases ?? [];
    this.allowPhaseSkip = options.allowPhaseSkip ?? false;
    this.onPhaseChange = options.onPhaseChange;
  }

  tick(context: AIContext): NodeStatus {
    const { creature } = context;

    if (this.phases.length === 0) {
      return NodeStatus.Success;
    }

    const healthPercent = creature.health.current / creature.getEffectiveHealthMax();
    const currentPhase = getBlackboardValue<number>(context, BossBlackboardKeys.BOSS_PHASE) ?? 1;
    const thresholdsHit = getBlackboardValue<number[]>(context, BossBlackboardKeys.PHASE_THRESHOLDS_HIT) ?? [];

    // Sort phases by health threshold descending
    const sortedPhases = [...this.phases].sort((a, b) => b.healthThreshold - a.healthThreshold);

    // Find the phase we should be in
    let targetPhase = 1;
    for (const phase of sortedPhases) {
      if (healthPercent <= phase.healthThreshold) {
        targetPhase = phase.phaseNumber;
        if (!this.allowPhaseSkip) {
          // Can only advance one phase at a time
          if (phase.phaseNumber > currentPhase + 1) {
            targetPhase = currentPhase + 1;
          }
        }
      }
    }

    // Check for phase transition
    if (targetPhase !== currentPhase) {
      const oldPhaseConfig = this.phases.find(p => p.phaseNumber === currentPhase);
      const newPhaseConfig = this.phases.find(p => p.phaseNumber === targetPhase);

      // End old phase
      if (oldPhaseConfig?.onPhaseEnd) {
        oldPhaseConfig.onPhaseEnd(context);
      }

      // Set new phase
      setBlackboardValue(context, BossBlackboardKeys.BOSS_PHASE, targetPhase);
      setBlackboardValue(context, BossBlackboardKeys.PHASE_START_TIME, Date.now());

      // Track threshold
      if (!thresholdsHit.includes(targetPhase)) {
        thresholdsHit.push(targetPhase);
        setBlackboardValue(context, BossBlackboardKeys.PHASE_THRESHOLDS_HIT, thresholdsHit);
      }

      // Start new phase
      if (newPhaseConfig?.onPhaseStart) {
        newPhaseConfig.onPhaseStart(context);
      }

      // Handle immunity
      if (newPhaseConfig?.damageImmune) {
        setBlackboardValue(context, BossBlackboardKeys.IS_IMMUNE, true);
      } else {
        setBlackboardValue(context, BossBlackboardKeys.IS_IMMUNE, false);
      }

      // Callback
      if (this.onPhaseChange) {
        this.onPhaseChange(context, currentPhase, targetPhase);
      }
    }

    return NodeStatus.Success;
  }
}

/**
 * SpecialAbilityExecutor Action
 *
 * Executes boss special abilities:
 * - Checks cooldowns
 * - Validates phase requirements
 * - Selects targets
 * - Executes ability
 */
export class SpecialAbilityExecutor extends LeafNode {
  /** Available abilities */
  abilities: BossAbility[];

  /** Global cooldown between specials */
  globalCooldown: number;

  /** Cooldown tracking */
  private cooldowns: Map<string, number> = new Map();

  /** Last ability time */
  private lastAbilityTime: number = 0;

  /** Callback to get potential targets */
  getPotentialTargets?: ((context: AIContext) => CreatureObject[]) | undefined;

  constructor(
    options: {
      abilities?: BossAbility[];
      globalCooldown?: number;
      getPotentialTargets?: ((context: AIContext) => CreatureObject[]) | undefined;
    } = {},
    name?: string
  ) {
    super(name ?? 'SpecialAbilityExecutor');
    this.abilities = options.abilities ?? [];
    this.globalCooldown = options.globalCooldown ?? 3;
    this.getPotentialTargets = options.getPotentialTargets;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, target } = context;
    const now = Date.now();

    // Check global cooldown
    if ((now - this.lastAbilityTime) / 1000 < this.globalCooldown) {
      return NodeStatus.Failure;
    }

    const currentPhase = getBlackboardValue<number>(context, BossBlackboardKeys.BOSS_PHASE) ?? 1;
    const healthPercent = creature.health.current / creature.getEffectiveHealthMax();

    // Find usable ability
    for (const ability of this.abilities) {
      // Check cooldown
      const lastUse = this.cooldowns.get(ability.id) ?? 0;
      if ((now - lastUse) / 1000 < ability.cooldown) {
        continue;
      }

      // Check phase requirement
      if (ability.phases && ability.phases.length > 0 && !ability.phases.includes(currentPhase)) {
        continue;
      }

      // Check health threshold
      if (ability.healthThreshold !== undefined && healthPercent > ability.healthThreshold) {
        continue;
      }

      // Check custom condition
      if (ability.condition && !ability.condition(context)) {
        continue;
      }

      // Select targets
      const targets = this.selectTargets(context, ability);
      if (targets.length === 0 && ability.targeting !== 'position') {
        continue;
      }

      // Execute ability
      setBlackboardValue(context, BossBlackboardKeys.CURRENT_MECHANIC, ability.id);
      setBlackboardValue(context, BossBlackboardKeys.MECHANIC_TARGETS, targets.map(t => t.objectId));

      ability.execute(context, targets);

      this.cooldowns.set(ability.id, now);
      this.lastAbilityTime = now;
      setBlackboardValue(context, BossBlackboardKeys.LAST_SPECIAL_ABILITY, ability.id);

      return NodeStatus.Success;
    }

    return NodeStatus.Failure;
  }

  private selectTargets(context: AIContext, ability: BossAbility): CreatureObject[] {
    const { target } = context;

    if (!this.getPotentialTargets) {
      return target ? [target] : [];
    }

    const potentialTargets = this.getPotentialTargets(context);

    switch (ability.targeting) {
      case 'current':
        return target ? [target] : [];

      case 'random':
        const count = ability.targetCount ?? 1;
        const shuffled = [...potentialTargets].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);

      case 'highest_threat':
        // Would need threat data - for now return current target
        return target ? [target] : [];

      case 'lowest_health':
        return [...potentialTargets]
          .sort((a, b) => {
            const healthA = a.health.current / a.getEffectiveHealthMax();
            const healthB = b.health.current / b.getEffectiveHealthMax();
            return healthA - healthB;
          })
          .slice(0, ability.targetCount ?? 1);

      case 'all':
        return potentialTargets;

      case 'position':
        return [];

      default:
        return target ? [target] : [];
    }
  }
}

/**
 * AddSpawnController Action
 *
 * Controls add spawning during boss fights:
 * - Phase-based spawns
 * - Timer-based spawns
 * - Health-based spawns
 */
export class AddSpawnController extends LeafNode {
  /** Add spawn definitions */
  spawns: AddSpawnDefinition[];

  /** Callback to spawn adds */
  spawnAdd?: ((context: AIContext, addType: string, position: Vector3) => ObjectId | null) | undefined;

  /** Callback to check if add is alive */
  isAddAlive?: ((addId: ObjectId) => boolean) | undefined;

  /** Spawned add tracking */
  private spawnedAdds: Map<string, { ids: ObjectId[]; lastSpawn: number }> = new Map();

  constructor(
    options: {
      spawns?: AddSpawnDefinition[];
      spawnAdd?: ((context: AIContext, addType: string, position: Vector3) => ObjectId | null) | undefined;
      isAddAlive?: ((addId: ObjectId) => boolean) | undefined;
    } = {},
    name?: string
  ) {
    super(name ?? 'AddSpawnController');
    this.spawns = options.spawns ?? [];
    this.spawnAdd = options.spawnAdd;
    this.isAddAlive = options.isAddAlive;
  }

  tick(context: AIContext): NodeStatus {
    const { creature } = context;
    const now = Date.now();

    if (!this.spawnAdd) {
      return NodeStatus.Success;
    }

    const currentPhase = getBlackboardValue<number>(context, BossBlackboardKeys.BOSS_PHASE) ?? 1;
    const healthPercent = creature.health.current / creature.getEffectiveHealthMax();
    const combatStartTime = getBlackboardValue<number>(context, BlackboardKeys.COMBAT_START_TIME) ?? now;

    for (const spawn of this.spawns) {
      const spawnKey = `${spawn.trigger}_${spawn.triggerValue}_${spawn.addType}`;
      let tracking = this.spawnedAdds.get(spawnKey);
      if (!tracking) {
        tracking = { ids: [], lastSpawn: 0 };
        this.spawnedAdds.set(spawnKey, tracking);
      }

      // Clean up dead adds
      if (this.isAddAlive) {
        tracking.ids = tracking.ids.filter(id => this.isAddAlive!(id));
      }

      // Check if should spawn
      let shouldSpawn = false;

      switch (spawn.trigger) {
        case 'phase':
          shouldSpawn = currentPhase === spawn.triggerValue &&
            tracking.ids.length === 0 &&
            tracking.lastSpawn === 0;
          break;

        case 'timer':
          const elapsed = (now - combatStartTime) / 1000;
          const interval = spawn.triggerValue as number;
          shouldSpawn = elapsed >= interval &&
            (tracking.lastSpawn === 0 || (now - tracking.lastSpawn) / 1000 >= interval);
          break;

        case 'health':
          shouldSpawn = healthPercent <= (spawn.triggerValue as number) &&
            tracking.ids.length === 0 &&
            tracking.lastSpawn === 0;
          break;

        case 'ability':
          const lastAbility = getBlackboardValue<string>(context, BossBlackboardKeys.LAST_SPECIAL_ABILITY);
          shouldSpawn = lastAbility === spawn.triggerValue &&
            tracking.ids.length === 0;
          break;
      }

      // Check max active
      if (shouldSpawn && spawn.maxActive !== undefined && tracking.ids.length >= spawn.maxActive) {
        shouldSpawn = false;
      }

      // Spawn adds
      if (shouldSpawn) {
        const positions = typeof spawn.positions === 'function'
          ? spawn.positions(context)
          : spawn.positions ?? this.generateDefaultPositions(context, spawn.count);

        const newIds: ObjectId[] = [];
        for (let i = 0; i < spawn.count; i++) {
          const pos = positions[i % positions.length]!;
          const addId = this.spawnAdd(context, spawn.addType, pos);
          if (addId) {
            newIds.push(addId);
            tracking.ids.push(addId);
          }
        }

        tracking.lastSpawn = now;

        if (spawn.onSpawn && newIds.length > 0) {
          spawn.onSpawn(context, newIds);
        }

        // Store spawned adds in blackboard
        const allSpawned = getBlackboardValue<ObjectId[]>(context, BossBlackboardKeys.SPAWNED_ADDS) ?? [];
        setBlackboardValue(context, BossBlackboardKeys.SPAWNED_ADDS, [...allSpawned, ...newIds]);
      }
    }

    return NodeStatus.Success;
  }

  private generateDefaultPositions(context: AIContext, count: number): Vector3[] {
    const { creature } = context;
    const positions: Vector3[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const distance = 10;
      positions.push({
        x: creature.position.x + Math.cos(angle) * distance,
        y: creature.position.y,
        z: creature.position.z + Math.sin(angle) * distance,
      });
    }

    return positions;
  }
}

/**
 * EnrageTimer Action
 *
 * Manages boss enrage timer:
 * - Tracks combat duration
 * - Triggers enrage at threshold
 * - Applies enrage effects
 */
export class EnrageTimer extends LeafNode {
  /** Enrage configuration */
  config: EnrageConfig;

  /** Callback to apply enrage stats */
  applyEnrageStats?: ((context: AIContext, multipliers: {
    damage: number;
    speed: number;
    attackSpeed: number;
  }) => void) | undefined;

  constructor(
    options: {
      config?: Partial<EnrageConfig>;
      applyEnrageStats?: ((context: AIContext, multipliers: {
        damage: number;
        speed: number;
        attackSpeed: number;
      }) => void) | undefined;
    } = {},
    name?: string
  ) {
    super(name ?? 'EnrageTimer');
    this.config = {
      timer: options.config?.timer ?? 600, // 10 minutes default
      damageMultiplier: options.config?.damageMultiplier ?? 2.0,
      speedMultiplier: options.config?.speedMultiplier ?? 1.5,
      attackSpeedMultiplier: options.config?.attackSpeedMultiplier ?? 2.0,
      softEnrage: options.config?.softEnrage ?? false,
      rampUpTime: options.config?.rampUpTime ?? 60,
      onEnrage: options.config?.onEnrage,
    };
    this.applyEnrageStats = options.applyEnrageStats;
  }

  tick(context: AIContext): NodeStatus {
    const now = Date.now();

    // Get or set enrage start time
    let enrageStartTime = getBlackboardValue<number>(context, BossBlackboardKeys.ENRAGE_START_TIME);
    if (!enrageStartTime) {
      const combatStartTime = getBlackboardValue<number>(context, BlackboardKeys.COMBAT_START_TIME);
      if (!combatStartTime) {
        return NodeStatus.Success;
      }
      enrageStartTime = combatStartTime;
      setBlackboardValue(context, BossBlackboardKeys.ENRAGE_START_TIME, enrageStartTime);
    }

    const elapsed = (now - enrageStartTime) / 1000;
    const isEnraged = getBlackboardValue<boolean>(context, BossBlackboardKeys.IS_ENRAGED) ?? false;

    // Check if should enrage
    if (!isEnraged && elapsed >= this.config.timer) {
      setBlackboardValue(context, BossBlackboardKeys.IS_ENRAGED, true);

      if (this.config.onEnrage) {
        this.config.onEnrage(context);
      }

      if (this.applyEnrageStats && !this.config.softEnrage) {
        this.applyEnrageStats(context, {
          damage: this.config.damageMultiplier,
          speed: this.config.speedMultiplier,
          attackSpeed: this.config.attackSpeedMultiplier,
        });
      }
    }

    // Soft enrage - gradual ramp up
    if (isEnraged && this.config.softEnrage && this.applyEnrageStats) {
      const enragedTime = elapsed - this.config.timer;
      const rampProgress = Math.min(enragedTime / (this.config.rampUpTime ?? 60), 1);

      const currentDamage = 1 + (this.config.damageMultiplier - 1) * rampProgress;
      const currentSpeed = 1 + (this.config.speedMultiplier - 1) * rampProgress;
      const currentAttackSpeed = 1 + (this.config.attackSpeedMultiplier - 1) * rampProgress;

      this.applyEnrageStats(context, {
        damage: currentDamage,
        speed: currentSpeed,
        attackSpeed: currentAttackSpeed,
      });
    }

    return NodeStatus.Success;
  }
}

/**
 * BossMechanicCheck Condition
 *
 * Checks various boss mechanic conditions:
 * - Phase checks
 * - Enrage status
 * - Add count
 */
export class BossMechanicCheck extends LeafNode {
  /** Check type */
  checkType: 'phase' | 'enraged' | 'adds_alive' | 'immune' | 'health_threshold';

  /** Value to compare against */
  checkValue?: number | undefined;

  /** Comparison operator */
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=';

  /** Callback to count alive adds */
  countAliveAdds?: ((context: AIContext) => number) | undefined;

  constructor(
    options: {
      checkType: 'phase' | 'enraged' | 'adds_alive' | 'immune' | 'health_threshold';
      checkValue?: number | undefined;
      operator?: '==' | '!=' | '<' | '<=' | '>' | '>=';
      countAliveAdds?: ((context: AIContext) => number) | undefined;
    },
    name?: string
  ) {
    super(name ?? 'BossMechanicCheck');
    this.checkType = options.checkType;
    this.checkValue = options.checkValue;
    this.operator = options.operator ?? '==';
    this.countAliveAdds = options.countAliveAdds;
  }

  tick(context: AIContext): NodeStatus {
    const { creature } = context;
    let currentValue: number | boolean;

    switch (this.checkType) {
      case 'phase':
        currentValue = getBlackboardValue<number>(context, BossBlackboardKeys.BOSS_PHASE) ?? 1;
        break;
      case 'enraged':
        currentValue = getBlackboardValue<boolean>(context, BossBlackboardKeys.IS_ENRAGED) ?? false;
        return currentValue ? NodeStatus.Success : NodeStatus.Failure;
      case 'adds_alive':
        currentValue = this.countAliveAdds ? this.countAliveAdds(context) : 0;
        break;
      case 'immune':
        currentValue = getBlackboardValue<boolean>(context, BossBlackboardKeys.IS_IMMUNE) ?? false;
        return currentValue ? NodeStatus.Success : NodeStatus.Failure;
      case 'health_threshold':
        currentValue = creature.health.current / creature.getEffectiveHealthMax();
        break;
      default:
        return NodeStatus.Failure;
    }

    if (this.checkValue === undefined) {
      return NodeStatus.Failure;
    }

    const result = this.compare(currentValue as number, this.checkValue);
    return result ? NodeStatus.Success : NodeStatus.Failure;
  }

  private compare(a: number, b: number): boolean {
    switch (this.operator) {
      case '==': return a === b;
      case '!=': return a !== b;
      case '<': return a < b;
      case '<=': return a <= b;
      case '>': return a > b;
      case '>=': return a >= b;
      default: return false;
    }
  }
}

/**
 * UniqueMechanic Action
 *
 * Executes unique boss-specific mechanics:
 * - Custom scripted behaviors
 * - Environmental hazards
 * - Player debuffs
 */
export class UniqueMechanic extends LeafNode {
  /** Mechanic ID */
  mechanicId: string;

  /** Mechanic execution callback */
  executeMechanic: (context: AIContext) => boolean;

  /** Duration of mechanic (0 = instant) */
  duration: number;

  /** Cooldown between uses */
  cooldown: number;

  /** Last use time */
  private lastUseTime: number = 0;

  /** Mechanic start time */
  private startTime: number = 0;

  constructor(
    options: {
      mechanicId: string;
      executeMechanic: (context: AIContext) => boolean;
      duration?: number | undefined;
      cooldown?: number | undefined;
    },
    name?: string
  ) {
    super(name ?? 'UniqueMechanic');
    this.mechanicId = options.mechanicId;
    this.executeMechanic = options.executeMechanic;
    this.duration = options.duration ?? 0;
    this.cooldown = options.cooldown ?? 30;
  }

  tick(context: AIContext): NodeStatus {
    const now = Date.now();

    // Check if mechanic is running
    if (this.startTime > 0) {
      const elapsed = (now - this.startTime) / 1000;
      if (elapsed >= this.duration) {
        // Mechanic complete
        this.startTime = 0;
        context.blackboard.delete(BossBlackboardKeys.CURRENT_MECHANIC);
        return NodeStatus.Success;
      }
      return NodeStatus.Running;
    }

    // Check cooldown
    if ((now - this.lastUseTime) / 1000 < this.cooldown) {
      return NodeStatus.Failure;
    }

    // Execute mechanic
    const success = this.executeMechanic(context);
    if (success) {
      this.lastUseTime = now;
      setBlackboardValue(context, BossBlackboardKeys.CURRENT_MECHANIC, this.mechanicId);

      if (this.duration > 0) {
        this.startTime = now;
        return NodeStatus.Running;
      }

      return NodeStatus.Success;
    }

    return NodeStatus.Failure;
  }

  override reset(): void {
    super.reset();
    this.startTime = 0;
    // Don't reset lastUseTime - cooldown persists
  }
}

/**
 * Options for creating boss mechanics behavior
 */
export interface BossMechanicsOptions {
  /** Phase definitions */
  phases?: BossPhase[] | undefined;
  /** Special abilities */
  abilities?: BossAbility[] | undefined;
  /** Add spawn definitions */
  addSpawns?: AddSpawnDefinition[] | undefined;
  /** Enrage configuration */
  enrageConfig?: Partial<EnrageConfig> | undefined;
  /** Unique mechanics */
  uniqueMechanics?: Array<{
    mechanicId: string;
    executeMechanic: (context: AIContext) => boolean;
    duration?: number | undefined;
    cooldown?: number | undefined;
  }> | undefined;
  /** Callbacks */
  getPotentialTargets?: ((context: AIContext) => CreatureObject[]) | undefined;
  spawnAdd?: ((context: AIContext, addType: string, position: Vector3) => ObjectId | null) | undefined;
  isAddAlive?: ((addId: ObjectId) => boolean) | undefined;
  applyEnrageStats?: ((context: AIContext, multipliers: {
    damage: number;
    speed: number;
    attackSpeed: number;
  }) => void) | undefined;
  onPhaseChange?: ((context: AIContext, oldPhase: number, newPhase: number) => void) | undefined;
}

/**
 * Creates a boss mechanics behavior tree
 */
export function createBossMechanicsBehavior(options: BossMechanicsOptions): BehaviorTree {
  const {
    phases = [],
    abilities = [],
    addSpawns = [],
    enrageConfig,
    uniqueMechanics = [],
    getPotentialTargets,
    spawnAdd,
    isAddAlive,
    applyEnrageStats,
    onPhaseChange,
  } = options;

  const nodes: BehaviorNode[] = [];

  // Phase controller
  if (phases.length > 0) {
    nodes.push(new PhaseController({
      phases,
      onPhaseChange,
    }));
  }

  // Enrage timer
  if (enrageConfig) {
    nodes.push(new EnrageTimer({
      config: enrageConfig,
      applyEnrageStats,
    }));
  }

  // Add spawn controller
  if (addSpawns.length > 0) {
    nodes.push(new AddSpawnController({
      spawns: addSpawns,
      spawnAdd,
      isAddAlive,
    }));
  }

  // Special abilities
  if (abilities.length > 0) {
    nodes.push(new SpecialAbilityExecutor({
      abilities,
      getPotentialTargets,
    }));
  }

  // Unique mechanics
  for (const mechanic of uniqueMechanics) {
    nodes.push(new UniqueMechanic(mechanic));
  }

  const root = new Sequence(nodes, 'BossMechanicsRoot');
  return new BehaviorTree(root, 'BossMechanics');
}

/**
 * Creates a simple boss with phases and enrage
 */
export function createSimpleBossBehavior(
  phases: BossPhase[],
  enrageTimer: number,
  options?: Partial<BossMechanicsOptions>
): BehaviorTree {
  return createBossMechanicsBehavior({
    ...options,
    phases,
    enrageConfig: {
      timer: enrageTimer,
      ...options?.enrageConfig,
    },
  });
}

/**
 * Creates a multi-phase boss with adds
 */
export function createRaidBossBehavior(
  phases: BossPhase[],
  abilities: BossAbility[],
  addSpawns: AddSpawnDefinition[],
  enrageTimer: number,
  options?: Partial<BossMechanicsOptions>
): BehaviorTree {
  return createBossMechanicsBehavior({
    ...options,
    phases,
    abilities,
    addSpawns,
    enrageConfig: {
      timer: enrageTimer,
      ...options?.enrageConfig,
    },
  });
}
