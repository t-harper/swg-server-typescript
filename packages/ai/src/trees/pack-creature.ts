/**
 * Pack Creature Behavior Tree
 *
 * Behavior pattern for social/pack creatures:
 * - Calls for help when attacked
 * - Assists nearby pack members in combat
 * - Coordinated group behavior
 * - Shares threat across pack
 *
 * Examples: wolves, raptors, tusken raiders, tribal NPCs
 */

import { BehaviorTree } from '../behavior-tree.js';
import {
  HasTarget,
  HasThreat,
  IsTargetInRange,
  IsTargetVisible,
  IsAwayFromHome,
  IsHealthLow,
  CanMove,
  CanAct,
  BlackboardCheck,
  TimeSince,
} from '../nodes/conditions.js';
import {
  AttackTarget,
  MoveToTarget,
  ReturnHome,
  Wander,
  Idle,
  SelectHighestThreat,
  CallForHelp,
  ClearBlackboard,
  SetBlackboard,
} from '../nodes/actions.js';
import { Inverter, Succeeder } from '../nodes/decorators.js';
import { Sequence, Selector, PrioritySelector, Parallel, ParallelPolicy } from '../nodes/composites.js';
import { BlackboardKeys, type AIContext } from '../ai-context.js';

/**
 * Options for customizing pack creature behavior
 */
export interface PackCreatureOptions {
  /** Range for detecting targets (default: 24) */
  aggroRange?: number;
  /** Range for attacking (default: 5) */
  attackRange?: number;
  /** Attack cooldown in seconds (default: 2) */
  attackCooldown?: number;
  /** Max distance from home before leashing (default: 48) */
  leashDistance?: number;
  /** Wander radius when idle (default: 12) */
  wanderRadius?: number;
  /** Radius for calling allies (default: 32) */
  assistRadius?: number;
  /** Health threshold to call for help (default: 0.7) */
  callForHelpThreshold?: number;
  /** Social group identifier for pack coordination */
  socialGroup?: string;
}

/**
 * Create a behavior tree for a pack creature
 *
 * Tree structure:
 * ```
 * PrioritySelector
 *   Sequence [Leash]
 *     IsAwayFromHome
 *     NOT HasThreat
 *     ReturnHome
 *   Sequence [Combat]
 *     HasThreat OR HasTarget
 *     Parallel [Combat actions + Call for help]
 *       Succeeder [Optional call for help]
 *         Sequence
 *           NOT CalledForHelp
 *           IsHealthLow OR first_attack
 *           CallForHelp
 *       Selector [Attack or chase]
 *         Sequence [Attack]
 *           IsTargetInRange
 *           AttackTarget
 *         Sequence [Chase]
 *           MoveToTarget
 *   Sequence [Pack behavior - stay near pack]
 *     Wander (smaller radius, stay grouped)
 *     Idle
 * ```
 */
export function createPackCreatureTree(
  options: PackCreatureOptions = {}
): BehaviorTree {
  const {
    aggroRange = 24,
    attackRange = 5,
    attackCooldown = 2,
    leashDistance = 48,
    wanderRadius = 12,
    assistRadius = 32,
    callForHelpThreshold = 0.7,
    socialGroup,
  } = options;

  // Leash behavior
  const leashBehavior = new Sequence([
    new IsAwayFromHome(leashDistance),
    new Inverter(new HasThreat(), 'NoThreat'),
    new ReturnHome(),
    new ClearBlackboard(BlackboardKeys.CALLED_FOR_HELP),
  ], 'LeashBehavior');

  // Call for help - only once when first attacked or health low
  const callForHelpSequence = new Sequence([
    new Inverter(new BlackboardCheck(BlackboardKeys.CALLED_FOR_HELP, true), 'NotCalledYet'),
    new Selector([
      new IsHealthLow(callForHelpThreshold),
      new BlackboardCheck(BlackboardKeys.COMBAT_START_TIME), // First time in combat
    ], 'ShouldCallForHelp'),
    new CallForHelp(assistRadius, socialGroup),
  ], 'CallForHelpSequence');

  // Attack sequence
  const attackSequence = new Sequence([
    new IsTargetInRange(attackRange),
    new CanAct(),
    new AttackTarget(0, attackRange, attackCooldown),
  ], 'AttackSequence');

  // Chase sequence
  const chaseSequence = new Sequence([
    new CanMove(),
    new IsTargetVisible(aggroRange * 1.5),
    new MoveToTarget(attackRange * 0.8),
  ], 'ChaseSequence');

  // Combat actions with optional call for help
  const combatActions = new Parallel(
    ParallelPolicy.RequireOne, // Only need attack/chase to succeed
    [
      new Succeeder(callForHelpSequence, 'OptionalCallForHelp'),
      new Selector([attackSequence, chaseSequence], 'AttackOrChase'),
    ],
    'CombatActions'
  );

  // Mark combat start time
  const markCombatStart = new Sequence([
    new Inverter(new BlackboardCheck(BlackboardKeys.COMBAT_START_TIME), 'NoCombatStartTime'),
    new SetBlackboard(BlackboardKeys.COMBAT_START_TIME, (_ctx: AIContext) => Date.now()),
  ], 'MarkCombatStart');

  // Full combat behavior
  const combatBehavior = new Sequence([
    new Selector([new HasThreat(), new HasTarget()], 'HasThreatOrTarget'),
    new SelectHighestThreat(),
    new Succeeder(markCombatStart, 'MarkCombat'),
    combatActions,
  ], 'CombatBehavior');

  // Pack idle behavior - smaller wander radius to stay grouped
  const idleBehavior = new Sequence([
    new CanMove(),
    new ClearBlackboard(BlackboardKeys.COMBAT_START_TIME),
    new Selector([
      new Sequence([
        new TimeSince(BlackboardKeys.LAST_WANDER_TIME, 4),
        new Wander(wanderRadius),
      ], 'WanderSequence'),
      new Idle(4, true),
    ], 'WanderOrIdle'),
  ], 'IdleBehavior');

  // Main tree
  const root = new PrioritySelector([
    leashBehavior,
    combatBehavior,
    idleBehavior,
  ], 'PackCreatureRoot');

  return new BehaviorTree(root, 'PackCreature');
}

/**
 * Create a pack alpha/leader variant
 * More aggressive, larger aggro range, rallies the pack
 */
export function createPackAlphaTree(
  options: PackCreatureOptions = {}
): BehaviorTree {
  const enhancedOptions: PackCreatureOptions = {
    ...options,
    aggroRange: (options.aggroRange ?? 24) * 1.5,
    assistRadius: (options.assistRadius ?? 32) * 1.5,
    callForHelpThreshold: 0.9, // Calls for help sooner as leader
  };

  // Start with base pack behavior
  const baseTree = createPackCreatureTree(enhancedOptions);

  // For now, use the same tree structure
  // Could be enhanced with leader-specific behaviors like:
  // - Rally nearby pack members
  // - Coordinate attack patterns
  // - Strategic retreat and regroup

  return new BehaviorTree(baseTree.root, 'PackAlpha');
}
