/**
 * Patrol Behavior
 * Advanced patrol behaviors for NPCs including waypoint patrol,
 * random patrol, guard post, and patrol coordination.
 */

import type { Vector3, ObjectId } from '@swg/shared-types';
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
 * Alert state for patrol behaviors
 */
export enum AlertState {
  /** Normal patrol mode - relaxed, slow movement */
  Idle = 'idle',
  /** Alert mode - faster movement, increased awareness */
  Alert = 'alert',
  /** Combat mode - engaged with enemy */
  Combat = 'combat',
}

/**
 * Blackboard keys for patrol behavior
 */
export const PatrolBlackboardKeys = {
  /** Current alert state */
  ALERT_STATE: 'patrol_alert_state',
  /** Time when alert state was entered */
  ALERT_STATE_TIME: 'patrol_alert_state_time',
  /** Current patrol mode (waypoint, random, guard) */
  PATROL_MODE: 'patrol_mode',
  /** Guard post position */
  GUARD_POST: 'patrol_guard_post',
  /** Patrol group ID for coordination */
  PATROL_GROUP_ID: 'patrol_group_id',
  /** Formation position offset for group patrol */
  FORMATION_OFFSET: 'patrol_formation_offset',
  /** Leader creature ID for group patrol */
  PATROL_LEADER_ID: 'patrol_leader_id',
  /** Last alert position */
  LAST_ALERT_POSITION: 'patrol_last_alert_position',
  /** Random patrol area center */
  RANDOM_PATROL_CENTER: 'patrol_random_center',
  /** Random patrol area radius */
  RANDOM_PATROL_RADIUS: 'patrol_random_radius',
  /** Time of last waypoint arrival */
  WAYPOINT_ARRIVAL_TIME: 'patrol_waypoint_arrival_time',
  /** Wait time at current waypoint */
  WAYPOINT_WAIT_TIME: 'patrol_waypoint_wait_time',
} as const;

/**
 * Patrol mode enumeration
 */
export enum PatrolMode {
  /** Follow predefined waypoints */
  Waypoint = 'waypoint',
  /** Random movement within area */
  Random = 'random',
  /** Stay at guard post */
  GuardPost = 'guard_post',
}

/**
 * WaypointPatrol Action
 *
 * Advanced waypoint-based patrol with configurable options:
 * - Variable wait times at waypoints
 * - Speed adjustment based on alert state
 * - Reverse patrol option
 * - Waypoint callbacks for scripted events
 */
export class WaypointPatrol extends LeafNode {
  /** Patrol waypoints */
  waypoints: Vector3[];

  /** Whether to loop or reverse at end */
  loopMode: 'loop' | 'reverse' | 'stop';

  /** Base wait time at each waypoint (seconds) */
  waitTimeAtWaypoint: number;

  /** Random variance for wait time (0-1) */
  waitTimeVariance: number;

  /** Movement speed multiplier (1.0 = normal) */
  speedMultiplier: number;

  /** Stop distance from waypoint */
  stopDistance: number;

  /** Whether patrol direction is reversed (for reverse mode) */
  private isReversed: boolean = false;

  /** Callback when reaching a waypoint */
  onWaypointReached?: (context: AIContext, waypointIndex: number) => void;

  constructor(
    options: {
      waypoints?: Vector3[];
      loopMode?: 'loop' | 'reverse' | 'stop';
      waitTimeAtWaypoint?: number;
      waitTimeVariance?: number;
      speedMultiplier?: number;
      stopDistance?: number;
      onWaypointReached?: (context: AIContext, waypointIndex: number) => void;
    } = {},
    name?: string
  ) {
    super(name ?? 'WaypointPatrol');
    this.waypoints = options.waypoints ?? [];
    this.loopMode = options.loopMode ?? 'loop';
    this.waitTimeAtWaypoint = options.waitTimeAtWaypoint ?? 2;
    this.waitTimeVariance = options.waitTimeVariance ?? 0.5;
    this.speedMultiplier = options.speedMultiplier ?? 1;
    this.stopDistance = options.stopDistance ?? 1.5;
    this.onWaypointReached = options.onWaypointReached;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, deltaTime } = context;

    // Get waypoints from instance or blackboard
    const waypoints =
      this.waypoints.length > 0
        ? this.waypoints
        : getBlackboardValue<Vector3[]>(context, BlackboardKeys.PATROL_WAYPOINTS);

    if (!waypoints || waypoints.length === 0) {
      return NodeStatus.Failure;
    }

    // Get current waypoint index
    let index = getBlackboardValue<number>(context, BlackboardKeys.PATROL_INDEX) ?? 0;

    // Check if we're waiting at a waypoint
    const arrivalTime = getBlackboardValue<number>(context, PatrolBlackboardKeys.WAYPOINT_ARRIVAL_TIME);
    const waitTime = getBlackboardValue<number>(context, PatrolBlackboardKeys.WAYPOINT_WAIT_TIME);

    if (arrivalTime !== undefined && waitTime !== undefined) {
      const waitedTime = (Date.now() - arrivalTime) / 1000;
      if (waitedTime < waitTime) {
        // Still waiting
        return NodeStatus.Running;
      }
      // Done waiting, clear and advance
      context.blackboard.delete(PatrolBlackboardKeys.WAYPOINT_ARRIVAL_TIME);
      context.blackboard.delete(PatrolBlackboardKeys.WAYPOINT_WAIT_TIME);

      // Advance to next waypoint
      index = this.advanceWaypointIndex(index, waypoints.length);
      setBlackboardValue(context, BlackboardKeys.PATROL_INDEX, index);

      // Check if patrol is complete (stop mode at end)
      if (this.loopMode === 'stop' && index === 0) {
        return NodeStatus.Success;
      }
    }

    // Get current target waypoint
    const targetPos = waypoints[index]!;

    const dx = targetPos.x - creature.x;
    const dz = targetPos.z - creature.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check if reached waypoint
    if (distance <= this.stopDistance) {
      // Mark arrival
      const actualWaitTime = this.waitTimeAtWaypoint *
        (1 - this.waitTimeVariance / 2 + Math.random() * this.waitTimeVariance);
      setBlackboardValue(context, PatrolBlackboardKeys.WAYPOINT_ARRIVAL_TIME, Date.now());
      setBlackboardValue(context, PatrolBlackboardKeys.WAYPOINT_WAIT_TIME, actualWaitTime);

      // Callback
      if (this.onWaypointReached) {
        this.onWaypointReached(context, index);
      }

      return NodeStatus.Running;
    }

    // Adjust speed based on alert state
    const alertState = getBlackboardValue<AlertState>(context, PatrolBlackboardKeys.ALERT_STATE) ?? AlertState.Idle;
    let speed = creature.walkSpeed * this.speedMultiplier;
    if (alertState === AlertState.Alert) {
      speed = creature.runSpeed * 0.7 * this.speedMultiplier;
    }

    const moveDistance = speed * deltaTime;

    // Move toward waypoint
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

  private advanceWaypointIndex(current: number, total: number): number {
    if (this.loopMode === 'reverse') {
      if (this.isReversed) {
        if (current <= 0) {
          this.isReversed = false;
          return 1;
        }
        return current - 1;
      } else {
        if (current >= total - 1) {
          this.isReversed = true;
          return total - 2;
        }
        return current + 1;
      }
    }

    // Loop or stop mode - just increment with wrap
    return (current + 1) % total;
  }

  override reset(): void {
    super.reset();
    this.isReversed = false;
  }
}

/**
 * RandomPatrol Action
 *
 * Patrols randomly within a defined area:
 * - Picks random destinations within radius
 * - Respects terrain and obstacles (when implemented)
 * - Variable movement patterns
 */
export class RandomPatrol extends LeafNode {
  /** Center point of patrol area */
  center?: Vector3;

  /** Radius of patrol area */
  radius: number;

  /** Minimum distance for new destination */
  minMoveDistance: number;

  /** Wait time between moves (seconds) */
  waitTimeBetweenMoves: number;

  /** Stop distance from destination */
  stopDistance: number;

  constructor(
    options: {
      center?: Vector3;
      radius?: number;
      minMoveDistance?: number;
      waitTimeBetweenMoves?: number;
      stopDistance?: number;
    } = {},
    name?: string
  ) {
    super(name ?? 'RandomPatrol');
    this.center = options.center;
    this.radius = options.radius ?? 20;
    this.minMoveDistance = options.minMoveDistance ?? 5;
    this.waitTimeBetweenMoves = options.waitTimeBetweenMoves ?? 3;
    this.stopDistance = options.stopDistance ?? 1;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, homePosition, deltaTime } = context;
    const now = Date.now();

    // Get center from config or blackboard or home position
    let center = this.center
      ?? getBlackboardValue<Vector3>(context, PatrolBlackboardKeys.RANDOM_PATROL_CENTER)
      ?? homePosition;

    // Get or generate destination
    let destination = getBlackboardValue<Vector3>(context, BlackboardKeys.MOVE_DESTINATION);
    const lastMoveTime = getBlackboardValue<number>(context, BlackboardKeys.LAST_WANDER_TIME) ?? 0;

    if (!destination) {
      // Check if enough time passed since last move
      if ((now - lastMoveTime) / 1000 < this.waitTimeBetweenMoves) {
        return NodeStatus.Running;
      }

      // Pick new destination
      destination = this.pickRandomDestination(center, creature);
      setBlackboardValue(context, BlackboardKeys.MOVE_DESTINATION, destination);
      setBlackboardValue(context, BlackboardKeys.LAST_WANDER_TIME, now);
    }

    // Move toward destination
    const dx = destination.x - creature.x;
    const dz = destination.z - creature.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance <= this.stopDistance) {
      // Reached destination
      context.blackboard.delete(BlackboardKeys.MOVE_DESTINATION);
      return NodeStatus.Success;
    }

    // Move
    const speed = creature.walkSpeed;
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

  private pickRandomDestination(center: Vector3, creature: { x: number; z: number }): Vector3 {
    // Try multiple times to find a valid destination
    for (let attempt = 0; attempt < 5; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = this.minMoveDistance + Math.random() * (this.radius - this.minMoveDistance);

      const dest: Vector3 = {
        x: center.x + Math.cos(angle) * distance,
        y: center.y,
        z: center.z + Math.sin(angle) * distance,
      };

      // Verify it's within radius of center
      const distFromCenter = Math.sqrt(
        (dest.x - center.x) ** 2 + (dest.z - center.z) ** 2
      );
      if (distFromCenter <= this.radius) {
        return dest;
      }
    }

    // Fallback: return center
    return { ...center };
  }
}

/**
 * GuardPost Action
 *
 * Guard post behavior:
 * - Stays at designated post
 * - Returns to post after disturbances
 * - Looks around periodically
 * - Alerts on threats
 */
export class GuardPost extends LeafNode {
  /** Guard post position */
  postPosition?: Vector3;

  /** Tolerance for "at post" */
  tolerance: number;

  /** Time between look-around behaviors */
  lookAroundInterval: number;

  /** How long to look in each direction */
  lookDuration: number;

  /** Blackboard key for post position */
  postPositionKey: string;

  constructor(
    options: {
      postPosition?: Vector3;
      tolerance?: number;
      lookAroundInterval?: number;
      lookDuration?: number;
      postPositionKey?: string;
    } = {},
    name?: string
  ) {
    super(name ?? 'GuardPost');
    this.postPosition = options.postPosition;
    this.tolerance = options.tolerance ?? 1;
    this.lookAroundInterval = options.lookAroundInterval ?? 10;
    this.lookDuration = options.lookDuration ?? 2;
    this.postPositionKey = options.postPositionKey ?? PatrolBlackboardKeys.GUARD_POST;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, homePosition, deltaTime } = context;
    const now = Date.now();

    // Get post position
    const postPos = this.postPosition
      ?? getBlackboardValue<Vector3>(context, this.postPositionKey)
      ?? homePosition;

    const dx = postPos.x - creature.x;
    const dz = postPos.z - creature.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // If not at post, return to it
    if (distance > this.tolerance) {
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

    // At post - do look-around behavior
    const lastLook = getBlackboardValue<number>(context, 'guard_last_look_time') ?? 0;
    const lookStartTime = getBlackboardValue<number>(context, 'guard_look_start_time');

    if (lookStartTime !== undefined) {
      // Currently looking around
      const lookElapsed = (now - lookStartTime) / 1000;
      if (lookElapsed < this.lookDuration) {
        // Slowly rotate
        const currentHeading = creature.heading ?? 0;
        const rotationSpeed = (Math.PI / 2) / this.lookDuration; // 90 degrees over duration
        creature.setHeading(currentHeading + rotationSpeed * deltaTime);
        return NodeStatus.Running;
      }
      // Done looking
      context.blackboard.delete('guard_look_start_time');
      setBlackboardValue(context, 'guard_last_look_time', now);
    } else if ((now - lastLook) / 1000 >= this.lookAroundInterval) {
      // Start looking around
      setBlackboardValue(context, 'guard_look_start_time', now);
    }

    return NodeStatus.Running;
  }
}

/**
 * SetAlertState Action
 *
 * Sets the patrol alert state
 */
export class SetAlertState extends LeafNode {
  /** State to set */
  state: AlertState;

  /** Duration before auto-reverting (0 = never) */
  duration: number;

  /** State to revert to */
  revertState: AlertState;

  constructor(
    state: AlertState,
    options: {
      duration?: number;
      revertState?: AlertState;
    } = {},
    name?: string
  ) {
    super(name ?? 'SetAlertState');
    this.state = state;
    this.duration = options.duration ?? 0;
    this.revertState = options.revertState ?? AlertState.Idle;
  }

  tick(context: AIContext): NodeStatus {
    setBlackboardValue(context, PatrolBlackboardKeys.ALERT_STATE, this.state);
    setBlackboardValue(context, PatrolBlackboardKeys.ALERT_STATE_TIME, Date.now());

    if (this.duration > 0) {
      setBlackboardValue(context, 'alert_state_duration', this.duration);
      setBlackboardValue(context, 'alert_state_revert', this.revertState);
    }

    return NodeStatus.Success;
  }
}

/**
 * CheckAlertState Condition
 *
 * Checks if current alert state matches expected
 */
export class CheckAlertState extends LeafNode {
  /** Expected state(s) */
  expectedStates: AlertState[];

  constructor(expectedStates: AlertState | AlertState[], name?: string) {
    super(name ?? 'CheckAlertState');
    this.expectedStates = Array.isArray(expectedStates) ? expectedStates : [expectedStates];
  }

  tick(context: AIContext): NodeStatus {
    const currentState = getBlackboardValue<AlertState>(context, PatrolBlackboardKeys.ALERT_STATE) ?? AlertState.Idle;
    return this.expectedStates.includes(currentState) ? NodeStatus.Success : NodeStatus.Failure;
  }
}

/**
 * UpdateAlertStateTimer Action
 *
 * Updates alert state timer and reverts if expired
 */
export class UpdateAlertStateTimer extends LeafNode {
  constructor(name?: string) {
    super(name ?? 'UpdateAlertStateTimer');
  }

  tick(context: AIContext): NodeStatus {
    const alertTime = getBlackboardValue<number>(context, PatrolBlackboardKeys.ALERT_STATE_TIME);
    const duration = getBlackboardValue<number>(context, 'alert_state_duration');
    const revertState = getBlackboardValue<AlertState>(context, 'alert_state_revert');

    if (alertTime !== undefined && duration && duration > 0) {
      const elapsed = (Date.now() - alertTime) / 1000;
      if (elapsed >= duration) {
        // Revert alert state
        setBlackboardValue(context, PatrolBlackboardKeys.ALERT_STATE, revertState ?? AlertState.Idle);
        context.blackboard.delete('alert_state_duration');
        context.blackboard.delete('alert_state_revert');
      }
    }

    return NodeStatus.Success;
  }
}

/**
 * PatrolGroupCoordinator Action
 *
 * Coordinates patrol group movement:
 * - Maintains formation relative to leader
 * - Synchronizes alert states
 * - Coordinates responses to threats
 */
export class PatrolGroupCoordinator extends LeafNode {
  /** Formation offset from leader */
  formationOffset: Vector3;

  /** Whether this is the group leader */
  isLeader: boolean;

  /** Callback to get leader position */
  getLeaderPosition?: (leaderId: ObjectId) => Vector3 | null;

  /** Formation tolerance */
  formationTolerance: number;

  constructor(
    options: {
      formationOffset?: Vector3;
      isLeader?: boolean;
      getLeaderPosition?: (leaderId: ObjectId) => Vector3 | null;
      formationTolerance?: number;
    } = {},
    name?: string
  ) {
    super(name ?? 'PatrolGroupCoordinator');
    this.formationOffset = options.formationOffset ?? { x: 0, y: 0, z: 0 };
    this.isLeader = options.isLeader ?? false;
    this.getLeaderPosition = options.getLeaderPosition;
    this.formationTolerance = options.formationTolerance ?? 2;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, deltaTime } = context;

    if (this.isLeader) {
      // Leader just continues normal patrol
      return NodeStatus.Success;
    }

    // Get leader ID from blackboard
    const leaderId = getBlackboardValue<ObjectId>(context, PatrolBlackboardKeys.PATROL_LEADER_ID);
    if (!leaderId || !this.getLeaderPosition) {
      return NodeStatus.Failure;
    }

    // Get leader position
    const leaderPos = this.getLeaderPosition(leaderId);
    if (!leaderPos) {
      return NodeStatus.Failure;
    }

    // Get formation offset (may be overridden in blackboard)
    const offset = getBlackboardValue<Vector3>(context, PatrolBlackboardKeys.FORMATION_OFFSET) ?? this.formationOffset;

    // Calculate target position
    const targetPos: Vector3 = {
      x: leaderPos.x + offset.x,
      y: leaderPos.y + offset.y,
      z: leaderPos.z + offset.z,
    };

    const dx = targetPos.x - creature.x;
    const dz = targetPos.z - creature.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check if in formation
    if (distance <= this.formationTolerance) {
      return NodeStatus.Success;
    }

    // Move to formation position
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
 * Options for creating a patrol behavior tree
 */
export interface PatrolBehaviorOptions {
  /** Patrol mode */
  mode: PatrolMode;
  /** Waypoints for waypoint patrol */
  waypoints?: Vector3[];
  /** Center for random patrol */
  patrolCenter?: Vector3;
  /** Radius for random patrol */
  patrolRadius?: number;
  /** Guard post position */
  guardPostPosition?: Vector3;
  /** Detection range */
  detectRange?: number;
  /** Attack range */
  attackRange?: number;
  /** Max chase distance */
  maxChaseDistance?: number;
  /** Social group for coordination */
  socialGroup?: string;
  /** Alert duration in seconds */
  alertDuration?: number;
}

/**
 * Creates a patrol behavior tree based on options
 */
export function createPatrolBehavior(options: PatrolBehaviorOptions): BehaviorTree {
  const {
    mode,
    waypoints,
    patrolCenter,
    patrolRadius = 20,
    guardPostPosition,
    detectRange = 24,
    attackRange = 5,
    maxChaseDistance = 32,
    socialGroup,
    alertDuration = 30,
  } = options;

  // Create the patrol action based on mode
  let patrolAction: BehaviorNode;

  switch (mode) {
    case PatrolMode.Waypoint:
      patrolAction = new WaypointPatrol({
        waypoints,
        loopMode: 'loop',
        waitTimeAtWaypoint: 3,
      });
      break;
    case PatrolMode.Random:
      patrolAction = new RandomPatrol({
        center: patrolCenter,
        radius: patrolRadius,
      });
      break;
    case PatrolMode.GuardPost:
      patrolAction = new GuardPost({
        postPosition: guardPostPosition,
      });
      break;
    default:
      patrolAction = new RandomPatrol({ radius: patrolRadius });
  }

  // Build tree
  const root = new PrioritySelector([
    // Update alert state timer
    new UpdateAlertStateTimer(),
    // Main patrol behavior
    patrolAction,
  ], 'PatrolBehaviorRoot');

  return new BehaviorTree(root, `PatrolBehavior_${mode}`);
}

/**
 * Creates a coordinated patrol group behavior
 */
export function createPatrolGroupBehavior(
  options: PatrolBehaviorOptions & {
    isLeader: boolean;
    formationOffset?: Vector3;
    getLeaderPosition?: (leaderId: ObjectId) => Vector3 | null;
  }
): BehaviorTree {
  const baseBehavior = createPatrolBehavior(options);

  if (options.isLeader) {
    return baseBehavior;
  }

  // Add formation coordination for non-leaders
  const coordinator = new PatrolGroupCoordinator({
    formationOffset: options.formationOffset,
    isLeader: false,
    getLeaderPosition: options.getLeaderPosition,
  });

  const root = new Sequence([
    coordinator,
    baseBehavior.root,
  ], 'PatrolGroupRoot');

  return new BehaviorTree(root, 'PatrolGroupBehavior');
}
