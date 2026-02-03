/**
 * Aggressive Creature Behavior Tree
 *
 * Behavior pattern for aggressive/predator creatures:
 * - Attacks targets on sight within aggro range
 * - Pursues fleeing targets
 * - Returns home if target escapes beyond leash distance
 * - Wanders/patrols when no targets
 *
 * Examples: carnivores, hostile NPCs, aggressive wildlife
 */

import { BehaviorTree } from '../behavior-tree.js';
import {
  HasTarget,
  HasThreat,
  IsTargetInRange,
  IsTargetVisible,
  IsAwayFromHome,
  CanMove,
  CanAct,
  IsHealthLow,
  TimeSince,
} from '../nodes/conditions.js';
import {
  AttackTarget,
  MoveToTarget,
  ReturnHome,
  Wander,
  Idle,
  SelectHighestThreat,
  ClearBlackboard,
} from '../nodes/actions.js';
import { Inverter } from '../nodes/decorators.js';
import { Sequence, Selector, PrioritySelector } from '../nodes/composites.js';
import { BlackboardKeys } from '../ai-context.js';

/**
 * Options for customizing aggressive creature behavior
 */
export interface AggressiveCreatureOptions {
  /** Range for detecting targets (default: 32) */
  aggroRange?: number;
  /** Range for attacking (default: 5) */
  attackRange?: number;
  /** Attack cooldown in seconds (default: 2) */
  attackCooldown?: number;
  /** Max distance from home before leashing (default: 64) */
  leashDistance?: number;
  /** Wander radius when idle (default: 16) */
  wanderRadius?: number;
  /** Health threshold to consider retreating (default: 0.1 - aggressive rarely flees) */
  lowHealthThreshold?: number;
}

/**
 * Create a behavior tree for an aggressive creature
 *
 * Tree structure:
 * ```
 * PrioritySelector
 *   Sequence [Leash - return home if too far]
 *     IsAwayFromHome
 *     NOT HasTarget (or target is too far)
 *     ReturnHome
 *   Sequence [Combat]
 *     HasThreat OR HasTarget
 *     SelectHighestThreat
 *     Selector [Attack or Chase]
 *       Sequence [Attack if in range]
 *         IsTargetInRange(attackRange)
 *         CanAct
 *         AttackTarget
 *       Sequence [Chase target]
 *         CanMove
 *         IsTargetVisible
 *         MoveToTarget
 *   Sequence [Idle behavior]
 *     CanMove
 *     Selector
 *       Wander
 *       Idle
 * ```
 */
export function createAggressiveCreatureTree(
  options: AggressiveCreatureOptions = {}
): BehaviorTree {
  const {
    aggroRange = 32,
    attackRange = 5,
    attackCooldown = 2,
    leashDistance = 64,
    wanderRadius = 16,
    lowHealthThreshold = 0.1,
  } = options;

  // Leash behavior - return home if too far and no active combat
  const leashBehavior = new Sequence([
    new IsAwayFromHome(leashDistance),
    new Inverter(new HasTarget(), 'NoTarget'),
    new ReturnHome(),
    new ClearBlackboard(BlackboardKeys.CALLED_FOR_HELP),
  ], 'LeashBehavior');

  // Attack sequence - attack if in range
  const attackSequence = new Sequence([
    new IsTargetInRange(attackRange),
    new CanAct(),
    new AttackTarget(0, attackRange, attackCooldown),
  ], 'AttackSequence');

  // Chase sequence - move toward target if can see them
  const chaseSequence = new Sequence([
    new CanMove(),
    new IsTargetVisible(aggroRange * 1.5), // Can chase a bit further than aggro
    new MoveToTarget(attackRange * 0.8), // Get within attack range
  ], 'ChaseSequence');

  // Combat selector - attack or chase
  const combatSelector = new Selector([
    attackSequence,
    chaseSequence,
  ], 'CombatSelector');

  // Has threat check
  const hasThreatCheck = new Selector([
    new HasThreat(),
    new HasTarget(),
  ], 'HasThreatCheck');

  // Full combat behavior
  const combatBehavior = new Sequence([
    hasThreatCheck,
    new SelectHighestThreat(),
    combatSelector,
  ], 'CombatBehavior');

  // Wander behavior
  const wanderBehavior = new Sequence([
    new TimeSince(BlackboardKeys.LAST_WANDER_TIME, 3),
    new Wander(wanderRadius),
  ], 'WanderBehavior');

  // Idle behavior - wander or stand still
  const idleBehavior = new Sequence([
    new CanMove(),
    new Selector([
      wanderBehavior,
      new Idle(5, true),
    ], 'WanderOrIdle'),
  ], 'IdleBehavior');

  // Main tree - priority based selection
  const root = new PrioritySelector([
    leashBehavior,
    combatBehavior,
    idleBehavior,
  ], 'AggressiveCreatureRoot');

  return new BehaviorTree(root, 'AggressiveCreature');
}

/**
 * Create a stalker/ambush predator variant
 * Waits for prey to get close before attacking
 */
export function createStalkerCreatureTree(
  options: AggressiveCreatureOptions & { ambushRange?: number } = {}
): BehaviorTree {
  const {
    aggroRange = 16, // Shorter aggro range for ambush
    attackRange = 5,
    attackCooldown = 2,
    leashDistance = 32,
    wanderRadius = 8,
    ambushRange = 10,
  } = options;

  // Wait for target to come close before attacking
  const ambushSequence = new Sequence([
    new HasTarget(),
    new IsTargetInRange(ambushRange),
    new Selector([
      new Sequence([
        new IsTargetInRange(attackRange),
        new CanAct(),
        new AttackTarget(0, attackRange, attackCooldown),
      ], 'Attack'),
      new Sequence([
        new CanMove(),
        new MoveToTarget(attackRange * 0.8),
      ], 'CloseDistance'),
    ], 'AmbushAction'),
  ], 'AmbushSequence');

  // Leash behavior
  const leashBehavior = new Sequence([
    new IsAwayFromHome(leashDistance),
    new ReturnHome(),
  ], 'LeashBehavior');

  // Idle - minimal movement for ambush predator
  const idleBehavior = new Sequence([
    new CanMove(),
    new Selector([
      new Sequence([
        new TimeSince(BlackboardKeys.LAST_WANDER_TIME, 15), // Less frequent movement
        new Wander(wanderRadius),
      ]),
      new Idle(10, true),
    ]),
  ], 'IdleBehavior');

  const root = new PrioritySelector([
    ambushSequence,
    leashBehavior,
    idleBehavior,
  ], 'StalkerCreatureRoot');

  return new BehaviorTree(root, 'StalkerCreature');
}
