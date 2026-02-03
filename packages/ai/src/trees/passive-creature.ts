/**
 * Passive Creature Behavior Tree
 *
 * Behavior pattern for passive/prey creatures:
 * - Wanders around home position when not threatened
 * - Flees when attacked or health is low
 * - Returns home when threat is gone
 *
 * Examples: deer, rabbits, non-aggressive wildlife
 */

import { BehaviorTree, BehaviorTreeBuilder } from '../behavior-tree.js';
import {
  HasThreat,
  IsHealthLow,
  IsAwayFromHome,
  CanMove,
  TimeSince,
} from '../nodes/conditions.js';
import {
  Flee,
  ReturnHome,
  Wander,
  Idle,
  SelectHighestThreat,
  ClearBlackboard,
} from '../nodes/actions.js';
import { Inverter, Cooldown } from '../nodes/decorators.js';
import { Sequence, Selector, PrioritySelector } from '../nodes/composites.js';
import { BlackboardKeys } from '../ai-context.js';

/**
 * Options for customizing passive creature behavior
 */
export interface PassiveCreatureOptions {
  /** Radius for wandering (default: 16) */
  wanderRadius?: number;
  /** Distance at which to flee (default: 32) */
  fleeDistance?: number;
  /** Health percentage to trigger flee (default: 0.5) */
  fleeHealthThreshold?: number;
  /** Max distance from home before returning (default: 48) */
  leashDistance?: number;
  /** Idle duration range in seconds (default: 3-8) */
  idleDuration?: number;
}

/**
 * Create a behavior tree for a passive creature
 *
 * Tree structure:
 * ```
 * PrioritySelector
 *   Sequence [Flee when threatened]
 *     HasThreat OR IsHealthLow
 *     SelectHighestThreat
 *     Flee
 *   Sequence [Return home if too far]
 *     IsAwayFromHome
 *     ReturnHome
 *   Sequence [Normal behavior]
 *     CanMove
 *     Selector
 *       Sequence [Wander]
 *         TimeSince(last_wander, 5)
 *         Wander
 *       Idle
 * ```
 */
export function createPassiveCreatureTree(
  options: PassiveCreatureOptions = {}
): BehaviorTree {
  const {
    wanderRadius = 16,
    fleeDistance = 32,
    fleeHealthThreshold = 0.5,
    leashDistance = 48,
    idleDuration = 5,
  } = options;

  // Build threat check (has threat OR health low)
  const threatCheck = new Selector([
    new HasThreat(),
    new IsHealthLow(fleeHealthThreshold),
  ], 'ThreatCheck');

  // Flee behavior sequence
  const fleeBehavior = new Sequence([
    threatCheck,
    new SelectHighestThreat(),
    new Flee(fleeDistance),
  ], 'FleeBehavior');

  // Return home sequence
  const returnHomeBehavior = new Sequence([
    new IsAwayFromHome(leashDistance),
    new ReturnHome(),
    new ClearBlackboard(BlackboardKeys.CALLED_FOR_HELP),
  ], 'ReturnHomeBehavior');

  // Wander sequence (with cooldown to prevent constant wandering)
  const wanderSequence = new Sequence([
    new TimeSince(BlackboardKeys.LAST_WANDER_TIME, 5),
    new Wander(wanderRadius),
  ], 'WanderSequence');

  // Normal behavior - wander or idle
  const normalBehavior = new Sequence([
    new CanMove(),
    new Selector([
      wanderSequence,
      new Idle(idleDuration, true),
    ], 'WanderOrIdle'),
  ], 'NormalBehavior');

  // Main tree with priority selection
  const root = new PrioritySelector([
    fleeBehavior,
    returnHomeBehavior,
    normalBehavior,
  ], 'PassiveCreatureRoot');

  return new BehaviorTree(root, 'PassiveCreature');
}

/**
 * Create passive creature tree using builder pattern
 * Alternative construction method for more explicit structure
 */
export function createPassiveCreatureTreeWithBuilder(
  options: PassiveCreatureOptions = {}
): BehaviorTree {
  const {
    wanderRadius = 16,
    fleeDistance = 32,
    fleeHealthThreshold = 0.5,
    leashDistance = 48,
    idleDuration = 5,
  } = options;

  return new BehaviorTreeBuilder('PassiveCreature')
    .prioritySelector()
      // Flee when threatened
      .sequence()
        .selector()
          .condition(new HasThreat())
          .condition(new IsHealthLow(fleeHealthThreshold))
        .end()
        .action(new SelectHighestThreat())
        .action(new Flee(fleeDistance))
      .end()
      // Return home if too far
      .sequence()
        .condition(new IsAwayFromHome(leashDistance))
        .action(new ReturnHome())
      .end()
      // Normal wander/idle behavior
      .sequence()
        .condition(new CanMove())
        .selector()
          .sequence()
            .condition(new TimeSince(BlackboardKeys.LAST_WANDER_TIME, 5))
            .action(new Wander(wanderRadius))
          .end()
          .action(new Idle(idleDuration, true))
        .end()
      .end()
    .end()
    .build();
}
