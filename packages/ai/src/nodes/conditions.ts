/**
 * Condition Nodes
 * Leaf nodes that check conditions and return Success/Failure.
 * These do not perform actions - they only evaluate state.
 */

import type { AIContext } from '../ai-context.js';
import { getBlackboardValue, BlackboardKeys } from '../ai-context.js';
import { LeafNode, NodeStatus } from './base.js';
import { CreatureState } from '@swg/objects';

/**
 * HasTarget Condition
 *
 * Checks if the creature has a valid target.
 * Returns Success if target exists, Failure otherwise.
 */
export class HasTarget extends LeafNode {
  constructor(name?: string) {
    super(name ?? 'HasTarget');
  }

  tick(context: AIContext): NodeStatus {
    if (context.target && !context.target.isDead()) {
      return NodeStatus.Success;
    }
    return NodeStatus.Failure;
  }
}

/**
 * IsInCombat Condition
 *
 * Checks if the creature is in combat state.
 * Returns Success if in combat, Failure otherwise.
 */
export class IsInCombat extends LeafNode {
  constructor(name?: string) {
    super(name ?? 'IsInCombat');
  }

  tick(context: AIContext): NodeStatus {
    if (context.creature.isInCombatState()) {
      return NodeStatus.Success;
    }
    return NodeStatus.Failure;
  }
}

/**
 * IsHealthLow Condition
 *
 * Checks if creature's health is below a threshold percentage.
 * Returns Success if health is low, Failure otherwise.
 */
export class IsHealthLow extends LeafNode {
  /** Threshold as percentage (0-1), e.g., 0.25 = 25% */
  threshold: number;

  constructor(threshold: number = 0.25, name?: string) {
    super(name ?? 'IsHealthLow');
    this.threshold = threshold;
  }

  tick(context: AIContext): NodeStatus {
    const { creature } = context;
    const healthPercent = creature.health.current / creature.getEffectiveHealthMax();

    if (healthPercent <= this.threshold) {
      return NodeStatus.Success;
    }
    return NodeStatus.Failure;
  }
}

/**
 * IsTargetInRange Condition
 *
 * Checks if the target is within a specified range.
 * Returns Success if target is in range, Failure otherwise.
 */
export class IsTargetInRange extends LeafNode {
  /** Maximum range in meters */
  range: number;

  constructor(range: number, name?: string) {
    super(name ?? 'IsTargetInRange');
    this.range = range;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, target } = context;

    if (!target) {
      return NodeStatus.Failure;
    }

    const distance = this.calculateDistance(creature.position, target.position);

    if (distance <= this.range) {
      return NodeStatus.Success;
    }
    return NodeStatus.Failure;
  }

  private calculateDistance(a: { x: number; z: number }, b: { x: number; z: number }): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}

/**
 * IsTargetVisible Condition
 *
 * Checks if the creature can see its target.
 * This is a simplified implementation - full implementation would
 * use line-of-sight checks with terrain and obstacles.
 *
 * Returns Success if target is visible, Failure otherwise.
 */
export class IsTargetVisible extends LeafNode {
  /** Maximum visibility range */
  maxRange: number;

  constructor(maxRange: number = 64, name?: string) {
    super(name ?? 'IsTargetVisible');
    this.maxRange = maxRange;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, target } = context;

    if (!target) {
      return NodeStatus.Failure;
    }

    // Simple distance check for now
    // Full implementation would include LOS checks
    const distance = this.calculateDistance(creature.position, target.position);

    if (distance <= this.maxRange) {
      return NodeStatus.Success;
    }
    return NodeStatus.Failure;
  }

  private calculateDistance(a: { x: number; z: number }, b: { x: number; z: number }): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}

/**
 * HasThreat Condition
 *
 * Checks if the creature has any entries in its threat table.
 * Returns Success if threat exists, Failure otherwise.
 */
export class HasThreat extends LeafNode {
  constructor(name?: string) {
    super(name ?? 'HasThreat');
  }

  tick(context: AIContext): NodeStatus {
    if (context.creature.threatTable.size > 0) {
      return NodeStatus.Success;
    }
    return NodeStatus.Failure;
  }
}

/**
 * IsDead Condition
 *
 * Checks if the creature is dead.
 * Returns Success if dead, Failure otherwise.
 */
export class IsDead extends LeafNode {
  constructor(name?: string) {
    super(name ?? 'IsDead');
  }

  tick(context: AIContext): NodeStatus {
    if (context.creature.isDead()) {
      return NodeStatus.Success;
    }
    return NodeStatus.Failure;
  }
}

/**
 * IsIncapacitated Condition
 *
 * Checks if the creature is incapacitated.
 * Returns Success if incapacitated, Failure otherwise.
 */
export class IsIncapacitated extends LeafNode {
  constructor(name?: string) {
    super(name ?? 'IsIncapacitated');
  }

  tick(context: AIContext): NodeStatus {
    if (context.creature.isIncapacitated()) {
      return NodeStatus.Success;
    }
    return NodeStatus.Failure;
  }
}

/**
 * IsAtHome Condition
 *
 * Checks if the creature is at or near its home position.
 * Returns Success if at home, Failure otherwise.
 */
export class IsAtHome extends LeafNode {
  /** Distance tolerance for "at home" */
  tolerance: number;

  constructor(tolerance: number = 2, name?: string) {
    super(name ?? 'IsAtHome');
    this.tolerance = tolerance;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, homePosition } = context;

    const dx = creature.position.x - homePosition.x;
    const dz = creature.position.z - homePosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance <= this.tolerance) {
      return NodeStatus.Success;
    }
    return NodeStatus.Failure;
  }
}

/**
 * IsAwayFromHome Condition
 *
 * Checks if the creature is far from its home position (for leashing).
 * Returns Success if too far from home, Failure otherwise.
 */
export class IsAwayFromHome extends LeafNode {
  /** Maximum distance from home before considered "away" */
  maxDistance: number;

  constructor(maxDistance: number = 64, name?: string) {
    super(name ?? 'IsAwayFromHome');
    this.maxDistance = maxDistance;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, homePosition } = context;

    const dx = creature.position.x - homePosition.x;
    const dz = creature.position.z - homePosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance > this.maxDistance) {
      return NodeStatus.Success;
    }
    return NodeStatus.Failure;
  }
}

/**
 * HasState Condition
 *
 * Checks if the creature has a specific state flag set.
 * Returns Success if state is set, Failure otherwise.
 */
export class HasState extends LeafNode {
  /** State flag to check */
  state: bigint;

  constructor(state: bigint, name?: string) {
    super(name ?? 'HasState');
    this.state = state;
  }

  tick(context: AIContext): NodeStatus {
    if (context.creature.hasState(this.state)) {
      return NodeStatus.Success;
    }
    return NodeStatus.Failure;
  }
}

/**
 * IsStunned Condition
 *
 * Checks if the creature is stunned.
 * Returns Success if stunned, Failure otherwise.
 */
export class IsStunned extends LeafNode {
  constructor(name?: string) {
    super(name ?? 'IsStunned');
  }

  tick(context: AIContext): NodeStatus {
    if (context.creature.hasState(CreatureState.STUNNED)) {
      return NodeStatus.Success;
    }
    return NodeStatus.Failure;
  }
}

/**
 * IsImmobilized Condition
 *
 * Checks if the creature is immobilized (rooted).
 * Returns Success if immobilized, Failure otherwise.
 */
export class IsImmobilized extends LeafNode {
  constructor(name?: string) {
    super(name ?? 'IsImmobilized');
  }

  tick(context: AIContext): NodeStatus {
    if (context.creature.hasState(CreatureState.IMMOBILIZED)) {
      return NodeStatus.Success;
    }
    return NodeStatus.Failure;
  }
}

/**
 * CanAct Condition
 *
 * Checks if the creature can perform actions (not dead, incapacitated, or stunned).
 * Returns Success if can act, Failure otherwise.
 */
export class CanAct extends LeafNode {
  constructor(name?: string) {
    super(name ?? 'CanAct');
  }

  tick(context: AIContext): NodeStatus {
    const { creature } = context;

    if (
      creature.isDead() ||
      creature.isIncapacitated() ||
      creature.hasState(CreatureState.STUNNED)
    ) {
      return NodeStatus.Failure;
    }
    return NodeStatus.Success;
  }
}

/**
 * CanMove Condition
 *
 * Checks if the creature can move (not dead, incapacitated, stunned, or immobilized).
 * Returns Success if can move, Failure otherwise.
 */
export class CanMove extends LeafNode {
  constructor(name?: string) {
    super(name ?? 'CanMove');
  }

  tick(context: AIContext): NodeStatus {
    const { creature } = context;

    if (
      creature.isDead() ||
      creature.isIncapacitated() ||
      creature.hasState(CreatureState.STUNNED) ||
      creature.hasState(CreatureState.IMMOBILIZED)
    ) {
      return NodeStatus.Failure;
    }
    return NodeStatus.Success;
  }
}

/**
 * BlackboardCheck Condition
 *
 * Checks if a blackboard key exists and optionally matches a value.
 * Returns Success if condition is met, Failure otherwise.
 */
export class BlackboardCheck extends LeafNode {
  /** Blackboard key to check */
  key: string;

  /** Optional value to compare against */
  expectedValue?: unknown;

  constructor(key: string, expectedValue?: unknown, name?: string) {
    super(name ?? 'BlackboardCheck');
    this.key = key;
    this.expectedValue = expectedValue;
  }

  tick(context: AIContext): NodeStatus {
    const value = getBlackboardValue(context, this.key);

    if (this.expectedValue === undefined) {
      // Just check if key exists
      return value !== undefined ? NodeStatus.Success : NodeStatus.Failure;
    }

    // Check if value matches
    if (value === this.expectedValue) {
      return NodeStatus.Success;
    }
    return NodeStatus.Failure;
  }
}

/**
 * RandomChance Condition
 *
 * Returns Success based on a random chance.
 * Useful for probabilistic behavior.
 */
export class RandomChance extends LeafNode {
  /** Probability of success (0-1) */
  probability: number;

  constructor(probability: number, name?: string) {
    super(name ?? 'RandomChance');
    this.probability = Math.max(0, Math.min(1, probability));
  }

  tick(_context: AIContext): NodeStatus {
    if (Math.random() < this.probability) {
      return NodeStatus.Success;
    }
    return NodeStatus.Failure;
  }
}

/**
 * TimeSince Condition
 *
 * Checks if enough time has passed since a blackboard timestamp.
 * Returns Success if enough time has passed, Failure otherwise.
 */
export class TimeSince extends LeafNode {
  /** Blackboard key containing the timestamp */
  timestampKey: string;

  /** Required elapsed time in seconds */
  duration: number;

  constructor(timestampKey: string, duration: number, name?: string) {
    super(name ?? 'TimeSince');
    this.timestampKey = timestampKey;
    this.duration = duration;
  }

  tick(context: AIContext): NodeStatus {
    const timestamp = getBlackboardValue<number>(context, this.timestampKey);

    if (timestamp === undefined) {
      // No timestamp set, consider condition met
      return NodeStatus.Success;
    }

    const elapsed = (Date.now() - timestamp) / 1000;

    if (elapsed >= this.duration) {
      return NodeStatus.Success;
    }
    return NodeStatus.Failure;
  }
}
