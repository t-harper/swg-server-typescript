/**
 * Social Behavior
 * Social interaction behaviors for NPCs including pack mechanics,
 * herding, territorial behavior, and group coordination.
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
 * Blackboard keys for social behavior
 */
export const SocialBlackboardKeys = {
  /** ID of pack leader */
  PACK_LEADER_ID: 'social_pack_leader_id',
  /** List of pack member IDs */
  PACK_MEMBER_IDS: 'social_pack_member_ids',
  /** Whether this creature is the pack leader */
  IS_PACK_LEADER: 'social_is_pack_leader',
  /** Territory center point */
  TERRITORY_CENTER: 'social_territory_center',
  /** Territory radius */
  TERRITORY_RADIUS: 'social_territory_radius',
  /** Creatures marked as intruders */
  TERRITORY_INTRUDERS: 'social_territory_intruders',
  /** Herd movement target */
  HERD_TARGET: 'social_herd_target',
  /** Herd cohesion center */
  HERD_CENTER: 'social_herd_center',
  /** Help request timestamp */
  HELP_REQUESTED_TIME: 'social_help_requested_time',
  /** ID of creature requesting help */
  HELP_REQUESTED_BY: 'social_help_requested_by',
  /** Flee destination */
  FLEE_DESTINATION: 'social_flee_destination',
  /** Flee source (what to flee from) */
  FLEE_SOURCE: 'social_flee_source',
  /** Aggression level (0-1) */
  AGGRESSION_LEVEL: 'social_aggression_level',
  /** Formation position in group */
  FORMATION_POSITION: 'social_formation_position',
} as const;

/**
 * CallForHelpAdvanced Action
 *
 * Enhanced call for help mechanics:
 * - Different urgency levels
 * - Directional alerts
 * - Propagation through pack
 * - Cooldown management
 */
export class CallForHelpAdvanced extends LeafNode {
  /** Radius to call for help */
  radius: number;

  /** Social group identifier */
  socialGroup?: string;

  /** Urgency level (affects response priority) */
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';

  /** Cooldown between calls (seconds) */
  cooldown: number;

  /** Callback to notify nearby allies */
  notifyAllies?: (
    context: AIContext,
    radius: number,
    socialGroup: string | undefined,
    urgency: string
  ) => void;

  constructor(
    options: {
      radius?: number;
      socialGroup?: string;
      urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
      cooldown?: number;
      notifyAllies?: (
        context: AIContext,
        radius: number,
        socialGroup: string | undefined,
        urgency: string
      ) => void;
    } = {},
    name?: string
  ) {
    super(name ?? 'CallForHelpAdvanced');
    this.radius = options.radius ?? 32;
    this.socialGroup = options.socialGroup;
    this.urgencyLevel = options.urgencyLevel ?? 'medium';
    this.cooldown = options.cooldown ?? 10;
    this.notifyAllies = options.notifyAllies;
  }

  tick(context: AIContext): NodeStatus {
    const now = Date.now();

    // Check cooldown
    const lastCall = getBlackboardValue<number>(context, SocialBlackboardKeys.HELP_REQUESTED_TIME);
    if (lastCall !== undefined && (now - lastCall) / 1000 < this.cooldown) {
      return NodeStatus.Failure;
    }

    // Check if already called (one-time per combat)
    const alreadyCalled = getBlackboardValue<boolean>(context, BlackboardKeys.CALLED_FOR_HELP);
    if (alreadyCalled && this.urgencyLevel !== 'critical') {
      return NodeStatus.Success;
    }

    // Mark as called
    setBlackboardValue(context, BlackboardKeys.CALLED_FOR_HELP, true);
    setBlackboardValue(context, SocialBlackboardKeys.HELP_REQUESTED_TIME, now);
    setBlackboardValue(context, SocialBlackboardKeys.HELP_REQUESTED_BY, context.creature.objectId);

    // Store call info
    setBlackboardValue(context, 'call_for_help_radius', this.getEffectiveRadius());
    setBlackboardValue(context, 'call_for_help_group', this.socialGroup);
    setBlackboardValue(context, 'call_for_help_urgency', this.urgencyLevel);

    // Store attacker position for directional response
    if (context.target) {
      setBlackboardValue(context, 'call_for_help_threat_position', {
        x: context.target.x,
        y: context.target.y,
        z: context.target.z,
      });
    }

    // Notify allies if callback provided
    if (this.notifyAllies) {
      this.notifyAllies(context, this.getEffectiveRadius(), this.socialGroup, this.urgencyLevel);
    }

    return NodeStatus.Success;
  }

  private getEffectiveRadius(): number {
    // Urgency affects radius
    const multipliers = {
      low: 0.5,
      medium: 1.0,
      high: 1.5,
      critical: 2.0,
    };
    return this.radius * multipliers[this.urgencyLevel];
  }
}

/**
 * RespondToHelpCall Action
 *
 * Responds to nearby ally help calls:
 * - Moves toward ally in distress
 * - Inherits threat from ally
 * - Prioritizes by urgency
 */
export class RespondToHelpCall extends LeafNode {
  /** Maximum response distance */
  maxResponseDistance: number;

  /** Callback to get help call info */
  getHelpCalls?: (context: AIContext) => Array<{
    callerId: ObjectId;
    position: Vector3;
    urgency: string;
    threatPosition?: Vector3;
  }>;

  constructor(
    options: {
      maxResponseDistance?: number;
      getHelpCalls?: (context: AIContext) => Array<{
        callerId: ObjectId;
        position: Vector3;
        urgency: string;
        threatPosition?: Vector3;
      }>;
    } = {},
    name?: string
  ) {
    super(name ?? 'RespondToHelpCall');
    this.maxResponseDistance = options.maxResponseDistance ?? 48;
    this.getHelpCalls = options.getHelpCalls;
  }

  tick(context: AIContext): NodeStatus {
    if (!this.getHelpCalls) {
      return NodeStatus.Failure;
    }

    const helpCalls = this.getHelpCalls(context);
    if (helpCalls.length === 0) {
      return NodeStatus.Failure;
    }

    // Sort by urgency and distance
    const { creature } = context;
    const sortedCalls = helpCalls
      .map(call => ({
        ...call,
        distance: Math.sqrt(
          (call.position.x - creature.x) ** 2 +
          (call.position.z - creature.z) ** 2
        ),
      }))
      .filter(call => call.distance <= this.maxResponseDistance)
      .sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const urgencyDiff =
          (urgencyOrder[a.urgency as keyof typeof urgencyOrder] ?? 2) -
          (urgencyOrder[b.urgency as keyof typeof urgencyOrder] ?? 2);
        if (urgencyDiff !== 0) return urgencyDiff;
        return a.distance - b.distance;
      });

    if (sortedCalls.length === 0) {
      return NodeStatus.Failure;
    }

    // Respond to highest priority call
    const call = sortedCalls[0]!;

    // Store response target
    if (call.threatPosition) {
      setBlackboardValue(context, 'respond_to_threat_position', call.threatPosition);
    }
    setBlackboardValue(context, 'respond_to_ally_position', call.position);
    setBlackboardValue(context, 'responding_to_help_call', call.callerId);

    return NodeStatus.Success;
  }
}

/**
 * PackFormation Action
 *
 * Maintains pack formation relative to leader:
 * - Calculated formation positions
 * - Dynamic adjustment based on pack size
 * - Combat formation vs travel formation
 */
export class PackFormation extends LeafNode {
  /** Base formation spacing */
  spacing: number;

  /** Formation type */
  formationType: 'line' | 'wedge' | 'circle' | 'loose';

  /** Callback to get pack members */
  getPackMembers?: (context: AIContext) => Array<{
    id: ObjectId;
    position: Vector3;
    isLeader: boolean;
  }>;

  /** Formation tolerance */
  tolerance: number;

  constructor(
    options: {
      spacing?: number;
      formationType?: 'line' | 'wedge' | 'circle' | 'loose';
      getPackMembers?: (context: AIContext) => Array<{
        id: ObjectId;
        position: Vector3;
        isLeader: boolean;
      }>;
      tolerance?: number;
    } = {},
    name?: string
  ) {
    super(name ?? 'PackFormation');
    this.spacing = options.spacing ?? 3;
    this.formationType = options.formationType ?? 'wedge';
    this.getPackMembers = options.getPackMembers;
    this.tolerance = options.tolerance ?? 1.5;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, deltaTime } = context;

    // Check if this is the leader
    const isLeader = getBlackboardValue<boolean>(context, SocialBlackboardKeys.IS_PACK_LEADER);
    if (isLeader) {
      return NodeStatus.Success;
    }

    if (!this.getPackMembers) {
      return NodeStatus.Failure;
    }

    const members = this.getPackMembers(context);
    const leader = members.find(m => m.isLeader);
    if (!leader) {
      return NodeStatus.Failure;
    }

    // Find this creature's position in the pack
    const myIndex = members.findIndex(m => m.id === creature.objectId);
    if (myIndex === -1) {
      return NodeStatus.Failure;
    }

    // Calculate formation position
    const targetPos = this.calculateFormationPosition(leader.position, myIndex, members.length);

    const dx = targetPos.x - creature.x;
    const dz = targetPos.z - creature.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance <= this.tolerance) {
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

  private calculateFormationPosition(leaderPos: Vector3, index: number, totalMembers: number): Vector3 {
    // Skip index 0 as that's the leader
    const memberIndex = index - 1;

    switch (this.formationType) {
      case 'line': {
        // Single file behind leader
        return {
          x: leaderPos.x,
          y: leaderPos.y,
          z: leaderPos.z - (memberIndex + 1) * this.spacing,
        };
      }
      case 'wedge': {
        // V-formation behind leader
        const row = Math.floor(memberIndex / 2) + 1;
        const side = memberIndex % 2 === 0 ? 1 : -1;
        return {
          x: leaderPos.x + side * row * this.spacing * 0.7,
          y: leaderPos.y,
          z: leaderPos.z - row * this.spacing,
        };
      }
      case 'circle': {
        // Circle around leader
        const angle = (memberIndex / (totalMembers - 1)) * Math.PI * 2;
        return {
          x: leaderPos.x + Math.cos(angle) * this.spacing * 2,
          y: leaderPos.y,
          z: leaderPos.z + Math.sin(angle) * this.spacing * 2,
        };
      }
      case 'loose':
      default: {
        // Random-ish positions around leader
        const angle = (memberIndex / (totalMembers - 1)) * Math.PI * 2 + Math.PI / 4;
        const dist = this.spacing * (1.5 + (memberIndex % 2) * 0.5);
        return {
          x: leaderPos.x + Math.cos(angle) * dist,
          y: leaderPos.y,
          z: leaderPos.z + Math.sin(angle) * dist,
        };
      }
    }
  }
}

/**
 * FleeAdvanced Action
 *
 * Enhanced flee behavior:
 * - Flees toward pack/allies
 * - Avoids multiple threats
 * - Triggers pack flee response
 */
export class FleeAdvanced extends LeafNode {
  /** Health threshold to trigger flee (0-1) */
  healthThreshold: number;

  /** Minimum flee distance */
  fleeDistance: number;

  /** Maximum flee distance before giving up */
  maxFleeDistance: number;

  /** Whether to trigger pack flee */
  triggerPackFlee: boolean;

  /** Flee speed multiplier */
  speedMultiplier: number;

  /** Callback to get ally positions */
  getAllyPositions?: (context: AIContext) => Vector3[];

  constructor(
    options: {
      healthThreshold?: number;
      fleeDistance?: number;
      maxFleeDistance?: number;
      triggerPackFlee?: boolean;
      speedMultiplier?: number;
      getAllyPositions?: (context: AIContext) => Vector3[];
    } = {},
    name?: string
  ) {
    super(name ?? 'FleeAdvanced');
    this.healthThreshold = options.healthThreshold ?? 0.25;
    this.fleeDistance = options.fleeDistance ?? 32;
    this.maxFleeDistance = options.maxFleeDistance ?? 64;
    this.triggerPackFlee = options.triggerPackFlee ?? false;
    this.speedMultiplier = options.speedMultiplier ?? 1.2;
    this.getAllyPositions = options.getAllyPositions;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, target, deltaTime } = context;

    // Check health threshold
    const healthPercent = creature.health.current / creature.getEffectiveHealthMax();
    if (healthPercent > this.healthThreshold) {
      return NodeStatus.Failure;
    }

    if (!target) {
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

    // Calculate flee direction
    let fleeDir = { x: dx / distance, z: dz / distance };

    // Try to flee toward allies if available
    if (this.getAllyPositions) {
      const allyPositions = this.getAllyPositions(context);
      if (allyPositions.length > 0) {
        // Find nearest ally that's away from threat
        const validAllies = allyPositions.filter(pos => {
          const allyToThreat = Math.sqrt(
            (pos.x - target.x) ** 2 + (pos.z - target.z) ** 2
          );
          return allyToThreat > distance; // Ally is farther from threat
        });

        if (validAllies.length > 0) {
          // Sort by distance to us
          validAllies.sort((a, b) => {
            const distA = Math.sqrt((a.x - creature.x) ** 2 + (a.z - creature.z) ** 2);
            const distB = Math.sqrt((b.x - creature.x) ** 2 + (b.z - creature.z) ** 2);
            return distA - distB;
          });

          const nearestAlly = validAllies[0]!;
          const toDx = nearestAlly.x - creature.x;
          const toDz = nearestAlly.z - creature.z;
          const toDist = Math.sqrt(toDx * toDx + toDz * toDz);
          if (toDist > 0) {
            // Blend flee direction with direction to ally
            fleeDir = {
              x: fleeDir.x * 0.5 + (toDx / toDist) * 0.5,
              z: fleeDir.z * 0.5 + (toDz / toDist) * 0.5,
            };
            // Normalize
            const len = Math.sqrt(fleeDir.x ** 2 + fleeDir.z ** 2);
            fleeDir.x /= len;
            fleeDir.z /= len;
          }
        }
      }
    }

    // Move in flee direction
    const speed = creature.runSpeed * this.speedMultiplier;
    const moveDistance = speed * deltaTime;

    const newX = creature.x + fleeDir.x * moveDistance;
    const newZ = creature.z + fleeDir.z * moveDistance;

    creature.setPosition(newX, creature.y, newZ);

    // Face away from threat
    const heading = Math.atan2(fleeDir.x, fleeDir.z);
    creature.setHeading(heading);

    // Trigger pack flee if enabled
    if (this.triggerPackFlee) {
      setBlackboardValue(context, 'pack_flee_triggered', true);
      setBlackboardValue(context, SocialBlackboardKeys.FLEE_SOURCE, {
        x: target.x,
        y: target.y,
        z: target.z,
      });
    }

    return NodeStatus.Running;
  }
}

/**
 * TerritorialAggression Action
 *
 * Territorial behavior:
 * - Marks and defends territory
 * - Warns intruders before attacking
 * - Escalates aggression over time
 */
export class TerritorialAggression extends LeafNode {
  /** Territory radius */
  territoryRadius: number;

  /** Warning distance (starts warning here) */
  warningDistance: number;

  /** Attack distance (attacks if closer) */
  attackDistance: number;

  /** Time to warn before attacking (seconds) */
  warningDuration: number;

  /** Callback to warn intruder */
  onWarn?: (context: AIContext, intruderId: ObjectId) => void;

  /** Callback to mark as hostile */
  onMarkHostile?: (context: AIContext, intruderId: ObjectId) => void;

  constructor(
    options: {
      territoryRadius?: number;
      warningDistance?: number;
      attackDistance?: number;
      warningDuration?: number;
      onWarn?: (context: AIContext, intruderId: ObjectId) => void;
      onMarkHostile?: (context: AIContext, intruderId: ObjectId) => void;
    } = {},
    name?: string
  ) {
    super(name ?? 'TerritorialAggression');
    this.territoryRadius = options.territoryRadius ?? 30;
    this.warningDistance = options.warningDistance ?? 20;
    this.attackDistance = options.attackDistance ?? 10;
    this.warningDuration = options.warningDuration ?? 5;
    this.onWarn = options.onWarn;
    this.onMarkHostile = options.onMarkHostile;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, target, homePosition } = context;
    const now = Date.now();

    // Get territory center
    const territoryCenter = getBlackboardValue<Vector3>(context, SocialBlackboardKeys.TERRITORY_CENTER) ?? homePosition;

    if (!target) {
      return NodeStatus.Failure;
    }

    // Calculate target distance from territory center
    const targetDistFromCenter = Math.sqrt(
      (target.x - territoryCenter.x) ** 2 +
      (target.z - territoryCenter.z) ** 2
    );

    // Outside territory
    if (targetDistFromCenter > this.territoryRadius) {
      // Clear warning state
      context.blackboard.delete('territorial_warning_time');
      context.blackboard.delete('territorial_warning_target');
      return NodeStatus.Failure;
    }

    // Inside attack range - immediate attack
    if (targetDistFromCenter <= this.attackDistance) {
      if (this.onMarkHostile) {
        this.onMarkHostile(context, target.objectId);
      }
      return NodeStatus.Success;
    }

    // Inside warning range
    if (targetDistFromCenter <= this.warningDistance) {
      const warningTime = getBlackboardValue<number>(context, 'territorial_warning_time');
      const warningTarget = getBlackboardValue<ObjectId>(context, 'territorial_warning_target');

      if (warningTarget !== target.objectId) {
        // New intruder, start warning
        setBlackboardValue(context, 'territorial_warning_time', now);
        setBlackboardValue(context, 'territorial_warning_target', target.objectId);
        if (this.onWarn) {
          this.onWarn(context, target.objectId);
        }
        return NodeStatus.Running;
      }

      // Check if warning period expired
      if (warningTime && (now - warningTime) / 1000 >= this.warningDuration) {
        // Attack!
        if (this.onMarkHostile) {
          this.onMarkHostile(context, target.objectId);
        }
        return NodeStatus.Success;
      }

      // Still warning
      return NodeStatus.Running;
    }

    return NodeStatus.Failure;
  }
}

/**
 * PackLeaderBehavior Action
 *
 * Leadership behavior for pack alphas:
 * - Directs pack movement
 * - Coordinates attacks
 * - Protects weaker members
 */
export class PackLeaderBehavior extends LeafNode {
  /** Callback to get pack members */
  getPackMembers?: (context: AIContext) => Array<{
    id: ObjectId;
    position: Vector3;
    healthPercent: number;
  }>;

  /** Callback to direct pack member */
  directPackMember?: (context: AIContext, memberId: ObjectId, command: string, target?: Vector3 | ObjectId) => void;

  constructor(
    options: {
      getPackMembers?: (context: AIContext) => Array<{
        id: ObjectId;
        position: Vector3;
        healthPercent: number;
      }>;
      directPackMember?: (context: AIContext, memberId: ObjectId, command: string, target?: Vector3 | ObjectId) => void;
    } = {},
    name?: string
  ) {
    super(name ?? 'PackLeaderBehavior');
    this.getPackMembers = options.getPackMembers;
    this.directPackMember = options.directPackMember;
  }

  tick(context: AIContext): NodeStatus {
    const { target } = context;

    if (!this.getPackMembers || !this.directPackMember) {
      return NodeStatus.Success;
    }

    const members = this.getPackMembers(context);

    // Check for members in danger
    const endangeredMembers = members.filter(m => m.healthPercent < 0.3);
    if (endangeredMembers.length > 0 && target) {
      // Direct other members to protect
      const healthyMembers = members.filter(m => m.healthPercent >= 0.5);
      for (const healthy of healthyMembers) {
        this.directPackMember(context, healthy.id, 'protect', endangeredMembers[0]!.id);
      }
    }

    // If we have a target, coordinate attack
    if (target) {
      for (const member of members) {
        if (member.healthPercent >= 0.3) {
          this.directPackMember(context, member.id, 'attack', target.objectId);
        }
      }
    }

    return NodeStatus.Success;
  }
}

/**
 * HerdBehavior Action
 *
 * Passive creature herding:
 * - Cohesion (stay near group center)
 * - Separation (maintain personal space)
 * - Alignment (move in same direction as herd)
 */
export class HerdBehavior extends LeafNode {
  /** Cohesion weight (attraction to center) */
  cohesionWeight: number;

  /** Separation weight (repulsion from nearby) */
  separationWeight: number;

  /** Alignment weight (match herd velocity) */
  alignmentWeight: number;

  /** Maximum distance from herd center */
  maxHerdDistance: number;

  /** Personal space radius */
  personalSpace: number;

  /** Callback to get herd members */
  getHerdMembers?: (context: AIContext) => Array<{
    position: Vector3;
    velocity: Vector3;
  }>;

  constructor(
    options: {
      cohesionWeight?: number;
      separationWeight?: number;
      alignmentWeight?: number;
      maxHerdDistance?: number;
      personalSpace?: number;
      getHerdMembers?: (context: AIContext) => Array<{
        position: Vector3;
        velocity: Vector3;
      }>;
    } = {},
    name?: string
  ) {
    super(name ?? 'HerdBehavior');
    this.cohesionWeight = options.cohesionWeight ?? 1.0;
    this.separationWeight = options.separationWeight ?? 1.5;
    this.alignmentWeight = options.alignmentWeight ?? 0.5;
    this.maxHerdDistance = options.maxHerdDistance ?? 20;
    this.personalSpace = options.personalSpace ?? 3;
    this.getHerdMembers = options.getHerdMembers;
  }

  tick(context: AIContext): NodeStatus {
    const { creature, deltaTime } = context;

    if (!this.getHerdMembers) {
      return NodeStatus.Success;
    }

    const members = this.getHerdMembers(context);
    if (members.length === 0) {
      return NodeStatus.Success;
    }

    // Calculate herd center
    let centerX = 0, centerZ = 0;
    for (const member of members) {
      centerX += member.position.x;
      centerZ += member.position.z;
    }
    centerX /= members.length;
    centerZ /= members.length;

    // Store herd center
    setBlackboardValue(context, SocialBlackboardKeys.HERD_CENTER, {
      x: centerX,
      y: creature.y,
      z: centerZ,
    });

    // Calculate steering forces
    let steerX = 0, steerZ = 0;

    // Cohesion - steer toward center
    const toCenterX = centerX - creature.x;
    const toCenterZ = centerZ - creature.z;
    const distToCenter = Math.sqrt(toCenterX ** 2 + toCenterZ ** 2);

    if (distToCenter > 0) {
      steerX += (toCenterX / distToCenter) * this.cohesionWeight;
      steerZ += (toCenterZ / distToCenter) * this.cohesionWeight;
    }

    // Separation - avoid nearby members
    for (const member of members) {
      const dx = creature.x - member.position.x;
      const dz = creature.z - member.position.z;
      const dist = Math.sqrt(dx ** 2 + dz ** 2);

      if (dist > 0 && dist < this.personalSpace) {
        const repulsion = (this.personalSpace - dist) / this.personalSpace;
        steerX += (dx / dist) * repulsion * this.separationWeight;
        steerZ += (dz / dist) * repulsion * this.separationWeight;
      }
    }

    // Alignment - match herd velocity
    let avgVelX = 0, avgVelZ = 0;
    for (const member of members) {
      avgVelX += member.velocity.x;
      avgVelZ += member.velocity.z;
    }
    avgVelX /= members.length;
    avgVelZ /= members.length;

    steerX += avgVelX * this.alignmentWeight;
    steerZ += avgVelZ * this.alignmentWeight;

    // Normalize steering
    const steerMag = Math.sqrt(steerX ** 2 + steerZ ** 2);
    if (steerMag > 0) {
      steerX /= steerMag;
      steerZ /= steerMag;
    }

    // Apply movement if significant
    if (steerMag > 0.1) {
      const speed = creature.walkSpeed * 0.7; // Leisurely herding pace
      const moveDistance = speed * deltaTime;

      const newX = creature.x + steerX * moveDistance;
      const newZ = creature.z + steerZ * moveDistance;

      creature.setPosition(newX, creature.y, newZ);

      if (steerMag > 0.2) {
        const heading = Math.atan2(steerX, steerZ);
        creature.setHeading(heading);
      }
    }

    return NodeStatus.Running;
  }
}

/**
 * Options for creating social behavior tree
 */
export interface SocialBehaviorOptions {
  /** Social group identifier */
  socialGroup?: string;
  /** Whether this is a pack leader */
  isPackLeader?: boolean;
  /** Territory radius */
  territoryRadius?: number;
  /** Flee health threshold */
  fleeThreshold?: number;
  /** Help call radius */
  helpCallRadius?: number;
  /** Formation type for pack */
  formationType?: 'line' | 'wedge' | 'circle' | 'loose';
}

/**
 * Creates a social behavior tree for pack creatures
 */
export function createPackBehavior(
  options: SocialBehaviorOptions & {
    getPackMembers?: (context: AIContext) => Array<{
      id: ObjectId;
      position: Vector3;
      isLeader: boolean;
      healthPercent: number;
    }>;
    directPackMember?: (context: AIContext, memberId: ObjectId, command: string, target?: Vector3 | ObjectId) => void;
  }
): BehaviorTree {
  const {
    socialGroup,
    isPackLeader = false,
    helpCallRadius = 32,
    formationType = 'wedge',
    fleeThreshold = 0.25,
    getPackMembers,
    directPackMember,
  } = options;

  const nodes: BehaviorNode[] = [];

  // Pack leader behavior
  if (isPackLeader) {
    nodes.push(new PackLeaderBehavior({
      getPackMembers,
      directPackMember,
    }));
  }

  // Flee behavior for low health
  nodes.push(new FleeAdvanced({
    healthThreshold: fleeThreshold,
    triggerPackFlee: true,
  }));

  // Call for help
  nodes.push(new CallForHelpAdvanced({
    radius: helpCallRadius,
    socialGroup,
    urgencyLevel: 'high',
  }));

  // Pack formation
  if (!isPackLeader && getPackMembers) {
    nodes.push(new PackFormation({
      formationType,
      getPackMembers: getPackMembers as any,
    }));
  }

  const root = new Sequence(nodes, 'PackBehaviorRoot');
  return new BehaviorTree(root, 'PackBehavior');
}

/**
 * Creates a territorial behavior tree
 */
export function createTerritorialBehavior(
  options: SocialBehaviorOptions & {
    onWarn?: (context: AIContext, intruderId: ObjectId) => void;
    onMarkHostile?: (context: AIContext, intruderId: ObjectId) => void;
  }
): BehaviorTree {
  const {
    territoryRadius = 30,
    onWarn,
    onMarkHostile,
  } = options;

  const territorial = new TerritorialAggression({
    territoryRadius,
    warningDistance: territoryRadius * 0.7,
    attackDistance: territoryRadius * 0.3,
    onWarn,
    onMarkHostile,
  });

  return new BehaviorTree(territorial, 'TerritorialBehavior');
}

/**
 * Creates a herding behavior tree for passive creatures
 */
export function createHerdingBehavior(
  options: {
    getHerdMembers?: (context: AIContext) => Array<{
      position: Vector3;
      velocity: Vector3;
    }>;
    fleeThreshold?: number;
    getAllyPositions?: (context: AIContext) => Vector3[];
  }
): BehaviorTree {
  const {
    getHerdMembers,
    fleeThreshold = 0.5,
    getAllyPositions,
  } = options;

  const flee = new FleeAdvanced({
    healthThreshold: fleeThreshold,
    triggerPackFlee: true,
    getAllyPositions,
  });

  const herd = new HerdBehavior({
    getHerdMembers,
  });

  const root = new PrioritySelector([
    flee,
    herd,
  ], 'HerdingBehaviorRoot');

  return new BehaviorTree(root, 'HerdingBehavior');
}
