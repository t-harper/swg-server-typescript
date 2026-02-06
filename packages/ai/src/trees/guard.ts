/**
 * Guard NPC Behavior Tree
 *
 * Behavior pattern for guard/sentry NPCs:
 * - Patrols along predefined waypoints
 * - Defends area against hostiles
 * - Returns to patrol after combat
 * - Calls for backup when attacked
 *
 * Examples: city guards, base sentries, patrol NPCs
 */

import type { Vector3 } from '@swg/shared-types';
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
  IsAtHome,
} from '../nodes/conditions.js';
import {
  AttackTarget,
  MoveToTarget,
  ReturnHome,
  Patrol,
  Idle,
  SelectHighestThreat,
  CallForHelp,
  ClearBlackboard,
  SetBlackboard,
  MoveToPosition,
} from '../nodes/actions.js';
import { Inverter, Succeeder } from '../nodes/decorators.js';
import { Sequence, Selector, PrioritySelector, Parallel, ParallelPolicy } from '../nodes/composites.js';
import { BlackboardKeys } from '../ai-context.js';

/**
 * Options for customizing guard behavior
 */
export interface GuardOptions {
  /** Range for detecting hostiles (default: 20) */
  detectRange?: number;
  /** Range for attacking (default: 5) */
  attackRange?: number;
  /** Attack cooldown in seconds (default: 1.5) */
  attackCooldown?: number;
  /** Max chase distance from patrol route (default: 32) */
  maxChaseDistance?: number;
  /** Patrol waypoints */
  patrolWaypoints?: Vector3[];
  /** Time to wait at each waypoint (default: 3) */
  waypointWaitTime?: number;
  /** Radius for calling backup (default: 48) */
  backupRadius?: number;
  /** Social group for backup coordination */
  socialGroup?: string;
  /** Whether to loop patrol (default: true) */
  loopPatrol?: boolean;
}

/**
 * Create a behavior tree for a guard NPC
 *
 * Tree structure:
 * ```
 * PrioritySelector
 *   Sequence [Return to patrol if too far]
 *     IsAwayFromHome(maxChaseDistance)
 *     NOT HasThreat (threat left area)
 *     ReturnHome
 *   Sequence [Combat]
 *     HasThreat
 *     Parallel [Fight + Call backup]
 *       Succeeder [Call backup once]
 *         CallForHelp
 *       SelectHighestThreat
 *       Selector [Attack or pursue]
 *         Sequence [Attack]
 *           IsTargetInRange
 *           AttackTarget
 *         Sequence [Pursue]
 *           IsTargetVisible
 *           MoveToTarget
 *   Sequence [Patrol duty]
 *     CanMove
 *     Selector
 *       Patrol
 *       Idle (at waypoint)
 * ```
 */
export function createGuardTree(options: GuardOptions = {}): BehaviorTree {
  const {
    detectRange = 20,
    attackRange = 5,
    attackCooldown = 1.5,
    maxChaseDistance = 32,
    patrolWaypoints,
    waypointWaitTime = 3,
    backupRadius = 48,
    socialGroup,
    loopPatrol = true,
  } = options;

  // Return to patrol route if chased too far and threat is gone
  const returnToPatrolBehavior = new Sequence([
    new IsAwayFromHome(maxChaseDistance),
    new Inverter(new HasThreat(), 'NoThreat'),
    new ReturnHome(),
    new ClearBlackboard(BlackboardKeys.CALLED_FOR_HELP),
    new ClearBlackboard(BlackboardKeys.COMBAT_START_TIME),
  ], 'ReturnToPatrol');

  // Call for backup (only once per combat)
  const callBackupSequence = new Sequence([
    new Inverter(new BlackboardCheck(BlackboardKeys.CALLED_FOR_HELP, true)),
    new CallForHelp(backupRadius, socialGroup),
  ], 'CallBackup');

  // Attack sequence
  const attackSequence = new Sequence([
    new IsTargetInRange(attackRange),
    new CanAct(),
    new AttackTarget(0, attackRange, attackCooldown),
  ], 'AttackSequence');

  // Pursue sequence
  const pursueSequence = new Sequence([
    new CanMove(),
    new IsTargetVisible(detectRange * 1.5),
    new Inverter(new IsAwayFromHome(maxChaseDistance), 'NotTooFar'),
    new MoveToTarget(attackRange * 0.8),
  ], 'PursueSequence');

  // Combat behavior with backup call
  const combatBehavior = new Sequence([
    new HasThreat(),
    new Parallel(
      ParallelPolicy.RequireOne,
      [
        new Succeeder(callBackupSequence, 'OptionalBackup'),
        new SelectHighestThreat(),
        new Selector([attackSequence, pursueSequence], 'AttackOrPursue'),
      ],
      'CombatActions'
    ),
  ], 'CombatBehavior');

  // Patrol behavior
  const patrolOptions: {
    waypoints?: Vector3[];
    loop: boolean;
    stopDistance: number;
  } = {
    loop: loopPatrol,
    stopDistance: 1.5,
  };
  if (patrolWaypoints) {
    patrolOptions.waypoints = patrolWaypoints;
  }

  const patrolBehavior = new Sequence([
    new CanMove(),
    new Selector([
      new Patrol(patrolOptions, 'PatrolRoute'),
      new Idle(waypointWaitTime, false), // Fixed wait at waypoints
    ], 'PatrolOrWait'),
  ], 'PatrolBehavior');

  // Main tree
  const root = new PrioritySelector([
    returnToPatrolBehavior,
    combatBehavior,
    patrolBehavior,
  ], 'GuardRoot');

  return new BehaviorTree(root, 'Guard');
}

/**
 * Create a stationary guard that stays at a post
 * Only moves to engage nearby threats, then returns
 */
export function createStationaryGuardTree(
  options: Omit<GuardOptions, 'patrolWaypoints' | 'loopPatrol'> = {}
): BehaviorTree {
  const {
    detectRange = 20,
    attackRange = 5,
    attackCooldown = 1.5,
    maxChaseDistance = 16, // Shorter chase distance for stationary guard
    backupRadius = 48,
    socialGroup,
  } = options;

  // Return to post if too far
  const returnToPostBehavior = new Sequence([
    new IsAwayFromHome(maxChaseDistance),
    new Inverter(new HasThreat(), 'NoThreat'),
    new ReturnHome(),
    new ClearBlackboard(BlackboardKeys.CALLED_FOR_HELP),
  ], 'ReturnToPost');

  // Call for backup
  const callBackupSequence = new Sequence([
    new Inverter(new BlackboardCheck(BlackboardKeys.CALLED_FOR_HELP, true)),
    new CallForHelp(backupRadius, socialGroup),
  ], 'CallBackup');

  // Attack sequence
  const attackSequence = new Sequence([
    new IsTargetInRange(attackRange),
    new CanAct(),
    new AttackTarget(0, attackRange, attackCooldown),
  ], 'AttackSequence');

  // Pursue (limited range)
  const pursueSequence = new Sequence([
    new CanMove(),
    new IsTargetVisible(detectRange),
    new Inverter(new IsAwayFromHome(maxChaseDistance), 'NotTooFar'),
    new MoveToTarget(attackRange * 0.8),
  ], 'PursueSequence');

  // Combat behavior
  const combatBehavior = new Sequence([
    new HasThreat(),
    new Parallel(
      ParallelPolicy.RequireOne,
      [
        new Succeeder(callBackupSequence),
        new SelectHighestThreat(),
        new Selector([attackSequence, pursueSequence]),
      ]
    ),
  ], 'CombatBehavior');

  // Stand at post when not in combat
  const standAtPostBehavior = new Sequence([
    new Inverter(new IsAtHome(2), 'NotAtPost'),
    new ReturnHome(),
  ], 'ReturnToPost');

  const idleBehavior = new Idle(10, true);

  // Main tree
  const root = new PrioritySelector([
    returnToPostBehavior,
    combatBehavior,
    standAtPostBehavior,
    idleBehavior,
  ], 'StationaryGuardRoot');

  return new BehaviorTree(root, 'StationaryGuard');
}

/**
 * Create an elite guard with more aggressive pursuit
 */
export function createEliteGuardTree(options: GuardOptions = {}): BehaviorTree {
  return createGuardTree({
    ...options,
    detectRange: (options.detectRange ?? 20) * 1.5,
    maxChaseDistance: (options.maxChaseDistance ?? 32) * 1.5,
    attackCooldown: (options.attackCooldown ?? 1.5) * 0.75, // Faster attacks
  });
}
