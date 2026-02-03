/**
 * Action Nodes
 * Leaf nodes that perform actual actions in the game world.
 * These modify state and may take multiple ticks to complete.
 */

import type { Vector3, ObjectId } from '@swg/shared-types';
import type { AIContext } from '../ai-context.js';
import {
  getBlackboardValue,
  setBlackboardValue,
  BlackboardKeys,
} from '../ai-context.js';
import { LeafNode, NodeStatus } from './base.js';

/**
 * AttackTarget Action
 *
 * Commands the creature to attack its current target.
 * - Returns Success if attack is executed
 * - Returns Failure if no target or target is dead/out of range
 * - Returns Running while attack animation/cooldown is in progress
 */
export class AttackTarget extends LeafNode {
  /** Minimum range for attack */
  minRange: number;

  /** Maximum range for attack */
  maxRange: number;

  /** Attack cooldown in seconds */
  cooldown: number;

  /** Time of last attack */
  private lastAttackTime: number = 0;

  constructor(
    minRange: number = 0,
    maxRange: number = 5,
    cooldown: number = 1,
    name?: string
  ) {
    super(name ?? 'AttackTarget');
    this.minRange = minRange;
    this.maxRange = maxRange;
    this.cooldown = cooldown;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, target } = context;

    // Validate target
    if (!target || target.isDead()) {
      return NodeStatus.Failure;
    }

    // Check range
    const distance = this.calculateDistance(creature, target);
    if (distance < this.minRange || distance > this.maxRange) {
      return NodeStatus.Failure;
    }

    // Check cooldown
    const now = Date.now();
    const elapsed = (now - this.lastAttackTime) / 1000;
    if (elapsed < this.cooldown) {
      return NodeStatus.Running;
    }

    // Execute attack
    this.lastAttackTime = now;

    // Set creature's target
    creature.setTarget(target.objectId);

    // Enter combat if not already
    if (!creature.isInCombatState()) {
      creature.enterCombat();
    }

    // Add threat from attack
    const damage = creature.getSkillMod('damage_min') || 10;
    creature.addThreat(target.objectId, damage);

    // Note: Actual damage application would be handled by combat system
    // This just commands the attack

    return NodeStatus.Success;
  }

  override reset(): void {
    super.reset();
    // Don't reset lastAttackTime - maintains cooldown across tree resets
  }

  private calculateDistance(a: { x: number; z: number }, b: { x: number; z: number }): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}

/**
 * MoveToTarget Action
 *
 * Moves the creature toward its current target.
 * - Returns Success when close enough to target
 * - Returns Failure if no target or can't move
 * - Returns Running while moving
 */
export class MoveToTarget extends LeafNode {
  /** Stop distance from target */
  stopDistance: number;

  constructor(stopDistance: number = 2, name?: string) {
    super(name ?? 'MoveToTarget');
    this.stopDistance = stopDistance;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, target, deltaTime } = context;

    if (!target || target.isDead()) {
      return NodeStatus.Failure;
    }

    const distance = this.calculateDistance(creature, target);

    // Check if close enough
    if (distance <= this.stopDistance) {
      return NodeStatus.Success;
    }

    // Calculate movement
    const speed = creature.runSpeed;
    const moveDistance = speed * deltaTime;

    // Direction to target
    const dx = target.x - creature.x;
    const dz = target.z - creature.z;
    const length = Math.sqrt(dx * dx + dz * dz);

    if (length > 0) {
      const dirX = dx / length;
      const dirZ = dz / length;

      // Move toward target
      const newX = creature.x + dirX * Math.min(moveDistance, distance - this.stopDistance);
      const newZ = creature.z + dirZ * Math.min(moveDistance, distance - this.stopDistance);

      creature.setPosition(newX, creature.y, newZ);

      // Face target
      const heading = Math.atan2(dirX, dirZ);
      creature.setHeading(heading);
    }

    return NodeStatus.Running;
  }

  private calculateDistance(a: { x: number; z: number }, b: { x: number; z: number }): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}

/**
 * MoveToPosition Action
 *
 * Moves the creature to a specific position.
 * Position is specified either directly or via blackboard key.
 * - Returns Success when position is reached
 * - Returns Failure if position is not set
 * - Returns Running while moving
 */
export class MoveToPosition extends LeafNode {
  /** Target position (if specified directly) */
  position?: Vector3;

  /** Blackboard key for position (if using blackboard) */
  positionKey?: string;

  /** Stop distance from position */
  stopDistance: number;

  constructor(
    options: {
      position?: Vector3;
      positionKey?: string;
      stopDistance?: number;
    } = {},
    name?: string
  ) {
    super(name ?? 'MoveToPosition');
    this.position = options.position;
    this.positionKey = options.positionKey ?? BlackboardKeys.MOVE_DESTINATION;
    this.stopDistance = options.stopDistance ?? 1;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, deltaTime } = context;

    // Get target position
    const targetPos =
      this.position ?? getBlackboardValue<Vector3>(context, this.positionKey!);

    if (!targetPos) {
      return NodeStatus.Failure;
    }

    const dx = targetPos.x - creature.x;
    const dz = targetPos.z - creature.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check if close enough
    if (distance <= this.stopDistance) {
      return NodeStatus.Success;
    }

    // Calculate movement
    const speed = creature.runSpeed;
    const moveDistance = speed * deltaTime;

    if (distance > 0) {
      const dirX = dx / distance;
      const dirZ = dz / distance;

      // Move toward position
      const newX = creature.x + dirX * Math.min(moveDistance, distance - this.stopDistance);
      const newZ = creature.z + dirZ * Math.min(moveDistance, distance - this.stopDistance);

      creature.setPosition(newX, creature.y, newZ);

      // Face movement direction
      const heading = Math.atan2(dirX, dirZ);
      creature.setHeading(heading);
    }

    return NodeStatus.Running;
  }
}

/**
 * Patrol Action
 *
 * Moves the creature along a series of waypoints.
 * - Returns Success when current waypoint is reached
 * - Returns Running while moving to waypoint
 * Automatically advances to next waypoint when current is reached.
 */
export class Patrol extends LeafNode {
  /** Patrol waypoints */
  waypoints: Vector3[];

  /** Whether to loop the patrol or stop at end */
  loop: boolean;

  /** Stop distance from waypoint */
  stopDistance: number;

  /** Use blackboard for waypoints if not specified directly */
  waypointsKey: string;

  constructor(
    options: {
      waypoints?: Vector3[];
      waypointsKey?: string;
      loop?: boolean;
      stopDistance?: number;
    } = {},
    name?: string
  ) {
    super(name ?? 'Patrol');
    this.waypoints = options.waypoints ?? [];
    this.waypointsKey = options.waypointsKey ?? BlackboardKeys.PATROL_WAYPOINTS;
    this.loop = options.loop ?? true;
    this.stopDistance = options.stopDistance ?? 1;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, deltaTime } = context;

    // Get waypoints
    const waypoints =
      this.waypoints.length > 0
        ? this.waypoints
        : getBlackboardValue<Vector3[]>(context, this.waypointsKey);

    if (!waypoints || waypoints.length === 0) {
      return NodeStatus.Failure;
    }

    // Get current waypoint index
    let index = getBlackboardValue<number>(context, BlackboardKeys.PATROL_INDEX) ?? 0;

    // Ensure index is valid
    if (index >= waypoints.length) {
      if (this.loop) {
        index = 0;
        setBlackboardValue(context, BlackboardKeys.PATROL_INDEX, index);
      } else {
        return NodeStatus.Success;
      }
    }

    const targetPos = waypoints[index]!;

    const dx = targetPos.x - creature.x;
    const dz = targetPos.z - creature.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check if reached waypoint
    if (distance <= this.stopDistance) {
      // Advance to next waypoint
      index = (index + 1) % waypoints.length;
      setBlackboardValue(context, BlackboardKeys.PATROL_INDEX, index);
      return NodeStatus.Success;
    }

    // Move toward waypoint
    const speed = creature.walkSpeed; // Patrol at walk speed
    const moveDistance = speed * deltaTime;

    if (distance > 0) {
      const dirX = dx / distance;
      const dirZ = dz / distance;

      const newX = creature.x + dirX * Math.min(moveDistance, distance);
      const newZ = creature.z + dirZ * Math.min(moveDistance, distance);

      creature.setPosition(newX, creature.y, newZ);

      const heading = Math.atan2(dirX, dirZ);
      creature.setHeading(heading);
    }

    return NodeStatus.Running;
  }
}

/**
 * Idle Action
 *
 * Makes the creature idle/wait for a duration.
 * - Returns Success when duration has elapsed
 * - Returns Running while waiting
 */
export class Idle extends LeafNode {
  /** Idle duration in seconds */
  duration: number;

  /** Whether to vary duration randomly */
  randomize: boolean;

  /** Actual duration for this idle (may be randomized) */
  private actualDuration: number = 0;

  constructor(duration: number = 5, randomize: boolean = true, name?: string) {
    super(name ?? 'Idle');
    this.duration = duration;
    this.randomize = randomize;
  }

  override reset(): void {
    super.reset();
    this.actualDuration = 0;
  }

  tick(context: AIContext): NodeStatus {
    const now = Date.now();

    // Initialize on first tick
    let startTime = getBlackboardValue<number>(context, BlackboardKeys.IDLE_START_TIME);

    if (startTime === undefined || this.actualDuration === 0) {
      startTime = now;
      setBlackboardValue(context, BlackboardKeys.IDLE_START_TIME, startTime);

      // Calculate actual duration
      this.actualDuration = this.randomize
        ? this.duration * (0.5 + Math.random())
        : this.duration;

      setBlackboardValue(context, BlackboardKeys.IDLE_DURATION, this.actualDuration);
    }

    const elapsed = (now - startTime) / 1000;

    if (elapsed >= this.actualDuration) {
      // Clear blackboard entries
      context.blackboard.delete(BlackboardKeys.IDLE_START_TIME);
      context.blackboard.delete(BlackboardKeys.IDLE_DURATION);
      this.actualDuration = 0;
      return NodeStatus.Success;
    }

    return NodeStatus.Running;
  }
}

/**
 * Flee Action
 *
 * Makes the creature flee away from its target.
 * - Returns Success when far enough away
 * - Returns Failure if no target
 * - Returns Running while fleeing
 */
export class Flee extends LeafNode {
  /** Minimum distance to flee before stopping */
  fleeDistance: number;

  /** Maximum distance to flee (gives up) */
  maxFleeDistance: number;

  constructor(fleeDistance: number = 32, maxFleeDistance: number = 64, name?: string) {
    super(name ?? 'Flee');
    this.fleeDistance = fleeDistance;
    this.maxFleeDistance = maxFleeDistance;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, target, deltaTime } = context;

    if (!target) {
      // No threat, flee succeeded
      return NodeStatus.Success;
    }

    const dx = creature.x - target.x;
    const dz = creature.z - target.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Far enough away
    if (distance >= this.fleeDistance) {
      return NodeStatus.Success;
    }

    // Too far, give up
    if (distance >= this.maxFleeDistance) {
      return NodeStatus.Failure;
    }

    // Calculate flee direction (away from target)
    const speed = creature.runSpeed;
    const moveDistance = speed * deltaTime;

    if (distance > 0) {
      const dirX = dx / distance;
      const dirZ = dz / distance;

      const newX = creature.x + dirX * moveDistance;
      const newZ = creature.z + dirZ * moveDistance;

      creature.setPosition(newX, creature.y, newZ);

      // Face away from target
      const heading = Math.atan2(dirX, dirZ);
      creature.setHeading(heading);
    }

    return NodeStatus.Running;
  }
}

/**
 * CallForHelp Action
 *
 * Signals nearby allies to assist in combat.
 * This sets a flag in the blackboard that the AI manager can use
 * to alert nearby creatures of the same social group.
 * - Returns Success after calling for help
 */
export class CallForHelp extends LeafNode {
  /** Radius to call for help */
  radius: number;

  /** Social group identifier (creatures of same group will respond) */
  socialGroup?: string;

  constructor(radius: number = 32, socialGroup?: string, name?: string) {
    super(name ?? 'CallForHelp');
    this.radius = radius;
    this.socialGroup = socialGroup;
  }

  tick(context: AIContext): NodeStatus {
    // Check if already called for help
    const alreadyCalled = getBlackboardValue<boolean>(
      context,
      BlackboardKeys.CALLED_FOR_HELP
    );

    if (alreadyCalled) {
      return NodeStatus.Success;
    }

    // Mark as called for help
    setBlackboardValue(context, BlackboardKeys.CALLED_FOR_HELP, true);

    // Store call for help info for AI manager to process
    setBlackboardValue(context, 'call_for_help_radius', this.radius);
    setBlackboardValue(context, 'call_for_help_group', this.socialGroup);

    return NodeStatus.Success;
  }
}

/**
 * SelectHighestThreat Action
 *
 * Selects the target with the highest threat value.
 * Updates context.target to the highest threat target.
 * - Returns Success if a target was selected
 * - Returns Failure if no threats exist
 */
export class SelectHighestThreat extends LeafNode {
  /** Callback to resolve ObjectId to CreatureObject */
  resolveCreature?: (id: ObjectId) => import('@swg/objects').CreatureObject | null;

  constructor(
    resolveCreature?: (id: ObjectId) => import('@swg/objects').CreatureObject | null,
    name?: string
  ) {
    super(name ?? 'SelectHighestThreat');
    this.resolveCreature = resolveCreature;
  }

  tick(context: AIContext): NodeStatus {
    const { creature } = context;

    const highestThreatId = creature.getHighestThreatTarget();

    if (!highestThreatId) {
      context.target = null;
      return NodeStatus.Failure;
    }

    // Resolve creature if callback is provided
    if (this.resolveCreature) {
      const target = this.resolveCreature(highestThreatId);
      if (target && !target.isDead()) {
        context.target = target;
        creature.setTarget(highestThreatId);
        return NodeStatus.Success;
      } else {
        // Target invalid, remove from threat table
        creature.removeThreat(highestThreatId);
        return NodeStatus.Failure;
      }
    }

    // Without resolver, just set the target ID
    creature.setTarget(highestThreatId);
    return NodeStatus.Success;
  }
}

/**
 * Wander Action
 *
 * Moves the creature randomly within a radius of a center point.
 * - Returns Success when wander destination is reached
 * - Returns Running while wandering
 */
export class Wander extends LeafNode {
  /** Radius to wander within */
  radius: number;

  /** Minimum time between picking new destinations */
  minWaitTime: number;

  /** Maximum time between picking new destinations */
  maxWaitTime: number;

  constructor(
    radius: number = 16,
    minWaitTime: number = 3,
    maxWaitTime: number = 10,
    name?: string
  ) {
    super(name ?? 'Wander');
    this.radius = radius;
    this.minWaitTime = minWaitTime;
    this.maxWaitTime = maxWaitTime;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, homePosition, deltaTime } = context;
    const now = Date.now();

    // Get or initialize wander center
    let center = getBlackboardValue<Vector3>(context, BlackboardKeys.WANDER_CENTER);
    if (!center) {
      center = { ...homePosition };
      setBlackboardValue(context, BlackboardKeys.WANDER_CENTER, center);
    }

    // Check if we need a new destination
    let destination = getBlackboardValue<Vector3>(context, BlackboardKeys.MOVE_DESTINATION);
    const lastWanderTime = getBlackboardValue<number>(context, BlackboardKeys.LAST_WANDER_TIME) ?? 0;

    if (!destination) {
      // Pick a new random destination
      destination = this.pickRandomDestination(center);
      setBlackboardValue(context, BlackboardKeys.MOVE_DESTINATION, destination);
      setBlackboardValue(context, BlackboardKeys.LAST_WANDER_TIME, now);
    }

    // Move toward destination
    const dx = destination.x - creature.x;
    const dz = destination.z - creature.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance <= 1) {
      // Reached destination
      context.blackboard.delete(BlackboardKeys.MOVE_DESTINATION);
      return NodeStatus.Success;
    }

    // Move toward destination
    const speed = creature.walkSpeed; // Wander at walk speed
    const moveDistance = speed * deltaTime;

    if (distance > 0) {
      const dirX = dx / distance;
      const dirZ = dz / distance;

      const newX = creature.x + dirX * Math.min(moveDistance, distance);
      const newZ = creature.z + dirZ * Math.min(moveDistance, distance);

      creature.setPosition(newX, creature.y, newZ);

      const heading = Math.atan2(dirX, dirZ);
      creature.setHeading(heading);
    }

    return NodeStatus.Running;
  }

  private pickRandomDestination(center: Vector3): Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * this.radius;

    return {
      x: center.x + Math.cos(angle) * distance,
      y: center.y,
      z: center.z + Math.sin(angle) * distance,
    };
  }
}

/**
 * ReturnHome Action
 *
 * Moves the creature back to its home position.
 * Also clears combat state and threat table.
 * - Returns Success when home is reached
 * - Returns Running while moving
 */
export class ReturnHome extends LeafNode {
  /** Distance tolerance for "at home" */
  tolerance: number;

  constructor(tolerance: number = 2, name?: string) {
    super(name ?? 'ReturnHome');
    this.tolerance = tolerance;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, homePosition, deltaTime } = context;

    // Clear combat state when returning home
    if (creature.isInCombatState()) {
      creature.exitCombat();
    }

    // Clear target
    context.target = null;

    // Mark as returning
    setBlackboardValue(context, BlackboardKeys.RETURNING_HOME, true);

    const dx = homePosition.x - creature.x;
    const dz = homePosition.z - creature.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check if home
    if (distance <= this.tolerance) {
      context.blackboard.delete(BlackboardKeys.RETURNING_HOME);
      return NodeStatus.Success;
    }

    // Move toward home
    const speed = creature.runSpeed;
    const moveDistance = speed * deltaTime;

    if (distance > 0) {
      const dirX = dx / distance;
      const dirZ = dz / distance;

      const newX = creature.x + dirX * Math.min(moveDistance, distance);
      const newZ = creature.z + dirZ * Math.min(moveDistance, distance);

      creature.setPosition(newX, creature.y, newZ);

      const heading = Math.atan2(dirX, dirZ);
      creature.setHeading(heading);
    }

    return NodeStatus.Running;
  }
}

/**
 * SetBlackboard Action
 *
 * Sets a value in the blackboard.
 * Always returns Success.
 */
export class SetBlackboard extends LeafNode {
  /** Blackboard key */
  key: string;

  /** Value to set (or function to compute value) */
  value: unknown | ((context: AIContext) => unknown);

  constructor(
    key: string,
    value: unknown | ((context: AIContext) => unknown),
    name?: string
  ) {
    super(name ?? 'SetBlackboard');
    this.key = key;
    this.value = value;
  }

  tick(context: AIContext): NodeStatus {
    const val = typeof this.value === 'function' ? this.value(context) : this.value;
    setBlackboardValue(context, this.key, val);
    return NodeStatus.Success;
  }
}

/**
 * ClearBlackboard Action
 *
 * Clears a value from the blackboard.
 * Always returns Success.
 */
export class ClearBlackboard extends LeafNode {
  /** Blackboard key to clear */
  key: string;

  constructor(key: string, name?: string) {
    super(name ?? 'ClearBlackboard');
    this.key = key;
  }

  tick(context: AIContext): NodeStatus {
    context.blackboard.delete(this.key);
    return NodeStatus.Success;
  }
}

/**
 * Log Action
 *
 * Logs a message for debugging.
 * Always returns Success.
 */
export class Log extends LeafNode {
  /** Message to log */
  message: string | ((context: AIContext) => string);

  constructor(message: string | ((context: AIContext) => string), name?: string) {
    super(name ?? 'Log');
    this.message = message;
  }

  tick(context: AIContext): NodeStatus {
    const msg = typeof this.message === 'function' ? this.message(context) : this.message;
    console.log(`[AI:${context.creature.objectId}] ${msg}`);
    return NodeStatus.Success;
  }
}

/**
 * Wait Action
 *
 * Waits for a specified duration.
 * Similar to Idle but more explicit naming for non-idle waits.
 * - Returns Success when duration has elapsed
 * - Returns Running while waiting
 */
export class Wait extends LeafNode {
  /** Wait duration in seconds */
  duration: number;

  /** Start time */
  private startTime: number = 0;

  constructor(duration: number, name?: string) {
    super(name ?? 'Wait');
    this.duration = duration;
  }

  override reset(): void {
    super.reset();
    this.startTime = 0;
  }

  tick(_context: AIContext): NodeStatus {
    const now = Date.now();

    if (this.startTime === 0) {
      this.startTime = now;
    }

    const elapsed = (now - this.startTime) / 1000;

    if (elapsed >= this.duration) {
      this.startTime = 0;
      return NodeStatus.Success;
    }

    return NodeStatus.Running;
  }
}
