/**
 * Combat Tactics
 * Advanced combat behaviors for NPCs including target priority,
 * range management, ability rotation, and tactical movement.
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
 * Blackboard keys for combat tactics
 */
export const CombatBlackboardKeys = {
  /** Current combat role */
  COMBAT_ROLE: 'combat_role',
  /** Preferred combat range */
  PREFERRED_RANGE: 'combat_preferred_range',
  /** Current ability rotation index */
  ABILITY_ROTATION_INDEX: 'combat_ability_rotation_index',
  /** Last ability used */
  LAST_ABILITY_USED: 'combat_last_ability_used',
  /** Time of last ability use */
  LAST_ABILITY_TIME: 'combat_last_ability_time',
  /** Kiting direction */
  KITING_DIRECTION: 'combat_kiting_direction',
  /** AoE zones to avoid */
  AOE_ZONES: 'combat_aoe_zones',
  /** Defensive cooldowns available */
  DEFENSIVE_COOLDOWNS: 'combat_defensive_cooldowns',
  /** Target priority list */
  TARGET_PRIORITY_LIST: 'combat_target_priority_list',
  /** Sticky target (don't switch) */
  STICKY_TARGET: 'combat_sticky_target',
  /** Crowd control diminishing returns */
  CC_DIMINISHING_RETURNS: 'combat_cc_dr',
} as const;

/**
 * Combat role enumeration
 */
export enum CombatRole {
  /** Melee damage dealer */
  Melee = 'melee',
  /** Ranged damage dealer */
  Ranged = 'ranged',
  /** Tank - high threat, defensive */
  Tank = 'tank',
  /** Healer - supports allies */
  Healer = 'healer',
  /** Support - buffs/debuffs */
  Support = 'support',
}

/**
 * Target type for priority calculations
 */
export enum TargetType {
  Healer = 'healer',
  Tank = 'tank',
  DPS = 'dps',
  Support = 'support',
  Pet = 'pet',
  Unknown = 'unknown',
}

/**
 * Ability definition
 */
export interface AbilityDefinition {
  /** Unique ability ID */
  id: string;
  /** Display name */
  name: string;
  /** Minimum range */
  minRange: number;
  /** Maximum range */
  maxRange: number;
  /** Cooldown in seconds */
  cooldown: number;
  /** Resource cost */
  cost: number;
  /** Whether this is an AoE ability */
  isAoE: boolean;
  /** AoE radius (if applicable) */
  aoeRadius?: number;
  /** Whether this is a defensive ability */
  isDefensive: boolean;
  /** Priority weight for rotation */
  priority: number;
  /** Health threshold to use (for defensive abilities) */
  healthThreshold?: number;
  /** Target type preference */
  preferredTargetType?: TargetType;
}

/**
 * AoE zone to avoid
 */
export interface AoEZone {
  /** Zone center */
  center: Vector3;
  /** Zone radius */
  radius: number;
  /** Time zone expires */
  expiresAt: number;
  /** Damage per tick */
  damagePerTick?: number;
}

/**
 * TargetPriority Action
 *
 * Evaluates and selects targets based on priority:
 * - Healers first
 * - Low health targets
 * - High threat targets
 * - Closest targets
 */
export class TargetPriority extends LeafNode {
  /** Priority weights for target types */
  typeWeights: Record<TargetType, number>;

  /** Weight for low health targets */
  lowHealthWeight: number;

  /** Weight for proximity */
  proximityWeight: number;

  /** Weight for current threat */
  threatWeight: number;

  /** Health threshold for "low health" bonus */
  lowHealthThreshold: number;

  /** Callback to get potential targets */
  getPotentialTargets?: (context: AIContext) => Array<{
    creature: CreatureObject;
    type: TargetType;
    threat: number;
  }>;

  /** Callback to identify target type */
  identifyTargetType?: (creature: CreatureObject) => TargetType;

  constructor(
    options: {
      typeWeights?: Partial<Record<TargetType, number>>;
      lowHealthWeight?: number;
      proximityWeight?: number;
      threatWeight?: number;
      lowHealthThreshold?: number;
      getPotentialTargets?: (context: AIContext) => Array<{
        creature: CreatureObject;
        type: TargetType;
        threat: number;
      }>;
      identifyTargetType?: (creature: CreatureObject) => TargetType;
    } = {},
    name?: string
  ) {
    super(name ?? 'TargetPriority');
    this.typeWeights = {
      [TargetType.Healer]: options.typeWeights?.[TargetType.Healer] ?? 100,
      [TargetType.Support]: options.typeWeights?.[TargetType.Support] ?? 80,
      [TargetType.DPS]: options.typeWeights?.[TargetType.DPS] ?? 60,
      [TargetType.Tank]: options.typeWeights?.[TargetType.Tank] ?? 40,
      [TargetType.Pet]: options.typeWeights?.[TargetType.Pet] ?? 20,
      [TargetType.Unknown]: options.typeWeights?.[TargetType.Unknown] ?? 50,
    };
    this.lowHealthWeight = options.lowHealthWeight ?? 50;
    this.proximityWeight = options.proximityWeight ?? 20;
    this.threatWeight = options.threatWeight ?? 30;
    this.lowHealthThreshold = options.lowHealthThreshold ?? 0.3;
    this.getPotentialTargets = options.getPotentialTargets;
    this.identifyTargetType = options.identifyTargetType;
  }

  tick(context: AIContext): NodeStatus {
    const { creature } = context;

    // Check for sticky target
    const stickyTarget = getBlackboardValue<ObjectId>(context, CombatBlackboardKeys.STICKY_TARGET);
    if (stickyTarget && context.target?.objectId === stickyTarget) {
      return NodeStatus.Success;
    }

    if (!this.getPotentialTargets) {
      return NodeStatus.Failure;
    }

    const targets = this.getPotentialTargets(context);
    if (targets.length === 0) {
      return NodeStatus.Failure;
    }

    // Score each target
    const scoredTargets = targets.map(target => {
      let score = 0;

      // Type weight
      score += this.typeWeights[target.type];

      // Low health bonus
      const healthPercent = target.creature.health.current / target.creature.getEffectiveHealthMax();
      if (healthPercent <= this.lowHealthThreshold) {
        score += this.lowHealthWeight * (1 - healthPercent / this.lowHealthThreshold);
      }

      // Proximity bonus (closer = higher score)
      const distance = Math.sqrt(
        (target.creature.x - creature.x) ** 2 +
        (target.creature.z - creature.z) ** 2
      );
      const maxRange = 64;
      score += this.proximityWeight * (1 - Math.min(distance, maxRange) / maxRange);

      // Threat bonus
      score += this.threatWeight * Math.min(target.threat / 1000, 1);

      return { target, score };
    });

    // Sort by score
    scoredTargets.sort((a, b) => b.score - a.score);

    // Select highest priority target
    const bestTarget = scoredTargets[0]!;
    context.target = bestTarget.target.creature;

    // Store priority list in blackboard
    setBlackboardValue(
      context,
      CombatBlackboardKeys.TARGET_PRIORITY_LIST,
      scoredTargets.map(st => ({
        id: st.target.creature.objectId,
        score: st.score,
        type: st.target.type,
      }))
    );

    return NodeStatus.Success;
  }
}

/**
 * RangeManagement Action
 *
 * Manages combat positioning based on role:
 * - Melee: Stay close to target
 * - Ranged: Maintain optimal distance
 * - Tank: Position between threat and allies
 */
export class RangeManagement extends LeafNode {
  /** Combat role */
  role: CombatRole;

  /** Minimum desired range */
  minRange: number;

  /** Maximum desired range */
  maxRange: number;

  /** Optimal range (where we want to be) */
  optimalRange: number;

  /** Range tolerance before repositioning */
  tolerance: number;

  /** Movement speed multiplier */
  speedMultiplier: number;

  constructor(
    options: {
      role?: CombatRole;
      minRange?: number;
      maxRange?: number;
      optimalRange?: number;
      tolerance?: number;
      speedMultiplier?: number;
    } = {},
    name?: string
  ) {
    super(name ?? 'RangeManagement');
    this.role = options.role ?? CombatRole.Melee;

    // Set defaults based on role
    switch (this.role) {
      case CombatRole.Melee:
      case CombatRole.Tank:
        this.minRange = options.minRange ?? 0;
        this.maxRange = options.maxRange ?? 5;
        this.optimalRange = options.optimalRange ?? 2;
        break;
      case CombatRole.Ranged:
        this.minRange = options.minRange ?? 15;
        this.maxRange = options.maxRange ?? 35;
        this.optimalRange = options.optimalRange ?? 25;
        break;
      case CombatRole.Healer:
      case CombatRole.Support:
        this.minRange = options.minRange ?? 10;
        this.maxRange = options.maxRange ?? 30;
        this.optimalRange = options.optimalRange ?? 20;
        break;
    }

    this.tolerance = options.tolerance ?? 2;
    this.speedMultiplier = options.speedMultiplier ?? 1.0;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, target, deltaTime } = context;

    if (!target) {
      return NodeStatus.Failure;
    }

    const dx = target.x - creature.x;
    const dz = target.z - creature.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check if in acceptable range
    if (distance >= this.minRange - this.tolerance && distance <= this.maxRange + this.tolerance) {
      // Check if close enough to optimal
      if (Math.abs(distance - this.optimalRange) <= this.tolerance) {
        return NodeStatus.Success;
      }
    }

    // Need to reposition
    const speed = creature.runSpeed * this.speedMultiplier;
    const moveDistance = speed * deltaTime;

    let moveDir: { x: number; z: number };

    if (distance < this.minRange) {
      // Too close, back up
      moveDir = { x: -dx / distance, z: -dz / distance };
    } else if (distance > this.maxRange) {
      // Too far, close in
      moveDir = { x: dx / distance, z: dz / distance };
    } else {
      // In range but not optimal, adjust
      if (distance < this.optimalRange) {
        moveDir = { x: -dx / distance, z: -dz / distance };
      } else {
        moveDir = { x: dx / distance, z: dz / distance };
      }
    }

    const newX = creature.x + moveDir.x * moveDistance;
    const newZ = creature.z + moveDir.z * moveDistance;

    creature.setPosition(newX, creature.y, newZ);

    // Face target
    const heading = Math.atan2(dx / distance, dz / distance);
    creature.setHeading(heading);

    return NodeStatus.Running;
  }
}

/**
 * AbilityRotation Action
 *
 * Executes abilities in priority order:
 * - Checks cooldowns
 * - Validates range/resources
 * - Follows rotation priority
 */
export class AbilityRotation extends LeafNode {
  /** Available abilities */
  abilities: AbilityDefinition[];

  /** Cooldown tracking */
  private cooldowns: Map<string, number> = new Map();

  /** Callback to execute ability */
  executeAbility?: (context: AIContext, ability: AbilityDefinition) => boolean;

  /** Callback to check if ability can be used */
  canUseAbility?: (context: AIContext, ability: AbilityDefinition) => boolean;

  constructor(
    options: {
      abilities?: AbilityDefinition[];
      executeAbility?: (context: AIContext, ability: AbilityDefinition) => boolean;
      canUseAbility?: (context: AIContext, ability: AbilityDefinition) => boolean;
    } = {},
    name?: string
  ) {
    super(name ?? 'AbilityRotation');
    this.abilities = options.abilities ?? [];
    this.executeAbility = options.executeAbility;
    this.canUseAbility = options.canUseAbility;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, target } = context;
    const now = Date.now();

    if (!target) {
      return NodeStatus.Failure;
    }

    // Calculate distance to target
    const distance = Math.sqrt(
      (target.x - creature.x) ** 2 +
      (target.z - creature.z) ** 2
    );

    // Sort abilities by priority
    const sortedAbilities = [...this.abilities].sort((a, b) => b.priority - a.priority);

    // Find first usable ability
    for (const ability of sortedAbilities) {
      // Check cooldown
      const lastUse = this.cooldowns.get(ability.id) ?? 0;
      if ((now - lastUse) / 1000 < ability.cooldown) {
        continue;
      }

      // Check range
      if (distance < ability.minRange || distance > ability.maxRange) {
        continue;
      }

      // Check custom conditions
      if (this.canUseAbility && !this.canUseAbility(context, ability)) {
        continue;
      }

      // Execute ability
      if (this.executeAbility) {
        const success = this.executeAbility(context, ability);
        if (success) {
          this.cooldowns.set(ability.id, now);
          setBlackboardValue(context, CombatBlackboardKeys.LAST_ABILITY_USED, ability.id);
          setBlackboardValue(context, CombatBlackboardKeys.LAST_ABILITY_TIME, now);
          return NodeStatus.Success;
        }
      } else {
        // Default: mark as used
        this.cooldowns.set(ability.id, now);
        return NodeStatus.Success;
      }
    }

    return NodeStatus.Failure;
  }

  override reset(): void {
    super.reset();
    // Don't reset cooldowns - they persist across tree ticks
  }
}

/**
 * DefensiveCooldowns Action
 *
 * Uses defensive abilities when health is low:
 * - Shields
 * - Heals
 * - Damage reduction
 * - Crowd control breaks
 */
export class DefensiveCooldowns extends LeafNode {
  /** Defensive abilities */
  defensiveAbilities: AbilityDefinition[];

  /** Cooldown tracking */
  private cooldowns: Map<string, number> = new Map();

  /** Global defensive cooldown (prevent spam) */
  globalCooldown: number;

  /** Last time any defensive was used */
  private lastDefensiveTime: number = 0;

  /** Callback to execute defensive ability */
  executeDefensive?: (context: AIContext, ability: AbilityDefinition) => boolean;

  constructor(
    options: {
      defensiveAbilities?: AbilityDefinition[];
      globalCooldown?: number;
      executeDefensive?: (context: AIContext, ability: AbilityDefinition) => boolean;
    } = {},
    name?: string
  ) {
    super(name ?? 'DefensiveCooldowns');
    this.defensiveAbilities = (options.defensiveAbilities ?? []).filter(a => a.isDefensive);
    this.globalCooldown = options.globalCooldown ?? 5;
    this.executeDefensive = options.executeDefensive;
  }

  tick(context: AIContext): NodeStatus {
    const { creature } = context;
    const now = Date.now();

    // Check global cooldown
    if ((now - this.lastDefensiveTime) / 1000 < this.globalCooldown) {
      return NodeStatus.Failure;
    }

    const healthPercent = creature.health.current / creature.getEffectiveHealthMax();

    // Sort by health threshold (use abilities for lower health first)
    const sortedAbilities = [...this.defensiveAbilities].sort((a, b) => {
      const thresholdA = a.healthThreshold ?? 0.5;
      const thresholdB = b.healthThreshold ?? 0.5;
      return thresholdA - thresholdB;
    });

    for (const ability of sortedAbilities) {
      const threshold = ability.healthThreshold ?? 0.5;

      // Check if health is low enough
      if (healthPercent > threshold) {
        continue;
      }

      // Check cooldown
      const lastUse = this.cooldowns.get(ability.id) ?? 0;
      if ((now - lastUse) / 1000 < ability.cooldown) {
        continue;
      }

      // Execute defensive
      if (this.executeDefensive) {
        const success = this.executeDefensive(context, ability);
        if (success) {
          this.cooldowns.set(ability.id, now);
          this.lastDefensiveTime = now;
          return NodeStatus.Success;
        }
      } else {
        this.cooldowns.set(ability.id, now);
        this.lastDefensiveTime = now;
        return NodeStatus.Success;
      }
    }

    return NodeStatus.Failure;
  }
}

/**
 * KitingBehavior Action
 *
 * Kiting behavior for ranged NPCs:
 * - Maintains distance from melee attackers
 * - Strafes while attacking
 * - Uses terrain/obstacles
 */
export class KitingBehavior extends LeafNode {
  /** Minimum safe distance */
  minDistance: number;

  /** Preferred kiting distance */
  preferredDistance: number;

  /** How often to change strafe direction (seconds) */
  strafeChangeInterval: number;

  /** Speed multiplier when kiting */
  speedMultiplier: number;

  /** Last strafe direction change */
  private lastStrafeChange: number = 0;

  /** Current strafe direction (1 = right, -1 = left) */
  private strafeDirection: number = 1;

  constructor(
    options: {
      minDistance?: number;
      preferredDistance?: number;
      strafeChangeInterval?: number;
      speedMultiplier?: number;
    } = {},
    name?: string
  ) {
    super(name ?? 'KitingBehavior');
    this.minDistance = options.minDistance ?? 10;
    this.preferredDistance = options.preferredDistance ?? 20;
    this.strafeChangeInterval = options.strafeChangeInterval ?? 3;
    this.speedMultiplier = options.speedMultiplier ?? 0.9;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, target, deltaTime } = context;
    const now = Date.now();

    if (!target) {
      return NodeStatus.Failure;
    }

    const dx = target.x - creature.x;
    const dz = target.z - creature.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Don't kite if target is at range
    if (distance >= this.preferredDistance) {
      return NodeStatus.Success;
    }

    // Update strafe direction
    if ((now - this.lastStrafeChange) / 1000 >= this.strafeChangeInterval) {
      this.strafeDirection = Math.random() > 0.5 ? 1 : -1;
      this.lastStrafeChange = now;
      setBlackboardValue(context, CombatBlackboardKeys.KITING_DIRECTION, this.strafeDirection);
    }

    // Calculate kiting direction
    // Move away from target with strafe component
    const awayX = -dx / distance;
    const awayZ = -dz / distance;

    // Perpendicular for strafe
    const strafeX = -awayZ * this.strafeDirection;
    const strafeZ = awayX * this.strafeDirection;

    // Blend away and strafe
    let moveX: number, moveZ: number;
    if (distance < this.minDistance) {
      // Too close, prioritize backing up
      moveX = awayX * 0.8 + strafeX * 0.2;
      moveZ = awayZ * 0.8 + strafeZ * 0.2;
    } else {
      // At medium range, strafe more
      moveX = awayX * 0.4 + strafeX * 0.6;
      moveZ = awayZ * 0.4 + strafeZ * 0.6;
    }

    // Normalize
    const moveMag = Math.sqrt(moveX ** 2 + moveZ ** 2);
    moveX /= moveMag;
    moveZ /= moveMag;

    // Apply movement
    const speed = creature.runSpeed * this.speedMultiplier;
    const moveDistance = speed * deltaTime;

    const newX = creature.x + moveX * moveDistance;
    const newZ = creature.z + moveZ * moveDistance;

    creature.setPosition(newX, creature.y, newZ);

    // Face target while kiting
    const heading = Math.atan2(dx / distance, dz / distance);
    creature.setHeading(heading);

    return NodeStatus.Running;
  }
}

/**
 * AoEAvoidance Action
 *
 * Avoids area-of-effect damage zones:
 * - Detects AoE indicators
 * - Moves out of affected areas
 * - Prioritizes safety over DPS
 */
export class AoEAvoidance extends LeafNode {
  /** Safety margin outside AoE radius */
  safetyMargin: number;

  /** Movement speed multiplier when avoiding */
  speedMultiplier: number;

  /** Callback to get active AoE zones */
  getAoEZones?: (context: AIContext) => AoEZone[];

  constructor(
    options: {
      safetyMargin?: number;
      speedMultiplier?: number;
      getAoEZones?: (context: AIContext) => AoEZone[];
    } = {},
    name?: string
  ) {
    super(name ?? 'AoEAvoidance');
    this.safetyMargin = options.safetyMargin ?? 2;
    this.speedMultiplier = options.speedMultiplier ?? 1.2;
    this.getAoEZones = options.getAoEZones;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, deltaTime } = context;
    const now = Date.now();

    if (!this.getAoEZones) {
      return NodeStatus.Success;
    }

    const zones = this.getAoEZones(context)
      .filter(zone => zone.expiresAt > now);

    if (zones.length === 0) {
      return NodeStatus.Success;
    }

    // Store zones in blackboard for other nodes
    setBlackboardValue(context, CombatBlackboardKeys.AOE_ZONES, zones);

    // Check if in any AoE
    let inDanger = false;
    let escapeDir = { x: 0, z: 0 };

    for (const zone of zones) {
      const dx = creature.x - zone.center.x;
      const dz = creature.z - zone.center.z;
      const distance = Math.sqrt(dx ** 2 + dz ** 2);

      if (distance < zone.radius + this.safetyMargin) {
        inDanger = true;

        // Add escape direction (away from zone center)
        if (distance > 0) {
          escapeDir.x += dx / distance;
          escapeDir.z += dz / distance;
        } else {
          // At center, pick random direction
          const angle = Math.random() * Math.PI * 2;
          escapeDir.x += Math.cos(angle);
          escapeDir.z += Math.sin(angle);
        }
      }
    }

    if (!inDanger) {
      return NodeStatus.Success;
    }

    // Normalize escape direction
    const escapeMag = Math.sqrt(escapeDir.x ** 2 + escapeDir.z ** 2);
    if (escapeMag > 0) {
      escapeDir.x /= escapeMag;
      escapeDir.z /= escapeMag;
    }

    // Move to escape
    const speed = creature.runSpeed * this.speedMultiplier;
    const moveDistance = speed * deltaTime;

    const newX = creature.x + escapeDir.x * moveDistance;
    const newZ = creature.z + escapeDir.z * moveDistance;

    creature.setPosition(newX, creature.y, newZ);

    // Face escape direction
    const heading = Math.atan2(escapeDir.x, escapeDir.z);
    creature.setHeading(heading);

    return NodeStatus.Running;
  }
}

/**
 * StickyTarget Action
 *
 * Prevents target switching for a duration:
 * - Used for focus-fire tactics
 * - Ignores threat changes temporarily
 */
export class StickyTarget extends LeafNode {
  /** Duration to stick to target (seconds) */
  duration: number;

  /** Time when sticky was set */
  private stickyStartTime: number = 0;

  constructor(duration: number = 10, name?: string) {
    super(name ?? 'StickyTarget');
    this.duration = duration;
  }

  tick(context: AIContext): NodeStatus {
    const now = Date.now();

    // Check if sticky is still active
    const stickyTarget = getBlackboardValue<ObjectId>(context, CombatBlackboardKeys.STICKY_TARGET);

    if (stickyTarget) {
      // Check if expired
      if ((now - this.stickyStartTime) / 1000 >= this.duration) {
        context.blackboard.delete(CombatBlackboardKeys.STICKY_TARGET);
        return NodeStatus.Success;
      }

      // Verify target still valid
      if (context.target && context.target.objectId === stickyTarget && !context.target.isDead()) {
        return NodeStatus.Running;
      }

      // Target invalid, clear sticky
      context.blackboard.delete(CombatBlackboardKeys.STICKY_TARGET);
    }

    // Set new sticky target
    if (context.target && !context.target.isDead()) {
      setBlackboardValue(context, CombatBlackboardKeys.STICKY_TARGET, context.target.objectId);
      this.stickyStartTime = now;
      return NodeStatus.Running;
    }

    return NodeStatus.Failure;
  }

  override reset(): void {
    super.reset();
    this.stickyStartTime = 0;
  }
}

/**
 * Options for creating combat tactics behavior
 */
export interface CombatTacticsOptions {
  /** Combat role */
  role: CombatRole;
  /** Available abilities */
  abilities?: AbilityDefinition[];
  /** Defensive abilities */
  defensiveAbilities?: AbilityDefinition[];
  /** Custom target priority weights */
  targetPriorityWeights?: Partial<Record<TargetType, number>>;
  /** Whether to use AoE avoidance */
  avoidAoE?: boolean;
  /** Whether to use kiting */
  useKiting?: boolean;
  /** Callbacks */
  getPotentialTargets?: (context: AIContext) => Array<{
    creature: CreatureObject;
    type: TargetType;
    threat: number;
  }>;
  executeAbility?: (context: AIContext, ability: AbilityDefinition) => boolean;
  canUseAbility?: (context: AIContext, ability: AbilityDefinition) => boolean;
  executeDefensive?: (context: AIContext, ability: AbilityDefinition) => boolean;
  getAoEZones?: (context: AIContext) => AoEZone[];
}

/**
 * Creates a combat tactics behavior tree
 */
export function createCombatTacticsBehavior(options: CombatTacticsOptions): BehaviorTree {
  const {
    role,
    abilities = [],
    defensiveAbilities = [],
    targetPriorityWeights,
    avoidAoE = true,
    useKiting = false,
    getPotentialTargets,
    executeAbility,
    canUseAbility,
    executeDefensive,
    getAoEZones,
  } = options;

  const nodes: BehaviorNode[] = [];

  // AoE avoidance (highest priority)
  if (avoidAoE) {
    nodes.push(new AoEAvoidance({ getAoEZones }));
  }

  // Defensive cooldowns
  if (defensiveAbilities.length > 0) {
    nodes.push(new DefensiveCooldowns({
      defensiveAbilities,
      executeDefensive,
    }));
  }

  // Target priority
  nodes.push(new TargetPriority({
    typeWeights: targetPriorityWeights,
    getPotentialTargets,
  }));

  // Range management
  nodes.push(new RangeManagement({ role }));

  // Kiting for ranged
  if (useKiting && (role === CombatRole.Ranged || role === CombatRole.Healer)) {
    nodes.push(new KitingBehavior());
  }

  // Ability rotation
  if (abilities.length > 0) {
    nodes.push(new AbilityRotation({
      abilities,
      executeAbility,
      canUseAbility,
    }));
  }

  const root = new PrioritySelector(nodes, 'CombatTacticsRoot');
  return new BehaviorTree(root, `CombatTactics_${role}`);
}

/**
 * Creates a melee DPS combat behavior
 */
export function createMeleeDPSBehavior(
  options: Omit<CombatTacticsOptions, 'role' | 'useKiting'>
): BehaviorTree {
  return createCombatTacticsBehavior({
    ...options,
    role: CombatRole.Melee,
    useKiting: false,
  });
}

/**
 * Creates a ranged DPS combat behavior
 */
export function createRangedDPSBehavior(
  options: Omit<CombatTacticsOptions, 'role'>
): BehaviorTree {
  return createCombatTacticsBehavior({
    ...options,
    role: CombatRole.Ranged,
    useKiting: options.useKiting ?? true,
  });
}

/**
 * Creates a tank combat behavior
 */
export function createTankBehavior(
  options: Omit<CombatTacticsOptions, 'role' | 'useKiting'>
): BehaviorTree {
  return createCombatTacticsBehavior({
    ...options,
    role: CombatRole.Tank,
    useKiting: false,
    // Tanks don't prioritize healers - they focus on threat
    targetPriorityWeights: {
      ...options.targetPriorityWeights,
      [TargetType.Healer]: 30,
      [TargetType.DPS]: 40,
      [TargetType.Tank]: 50,
    },
  });
}
