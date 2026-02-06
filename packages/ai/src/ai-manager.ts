/**
 * AI Manager
 * Central system for managing creature AI processing.
 * Handles registration, updates, and coordination of AI agents.
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import type { CreatureObject } from '@swg/objects';
import type { BehaviorTree } from './behavior-tree.js';
import {
  AIContext,
  createAIContext,
  getBlackboardValue,
  setBlackboardValue,
  BlackboardKeys,
} from './ai-context.js';
import { NodeStatus } from './nodes/base.js';

/**
 * Registered AI agent data
 */
export interface AIAgent {
  /** Creature being controlled */
  creature: CreatureObject;
  /** Behavior tree for decision making */
  tree: BehaviorTree;
  /** AI context with state data */
  context: AIContext;
  /** Social group for pack behavior */
  socialGroup?: string | undefined;
  /** Whether AI is currently active */
  active: boolean;
  /** Priority for processing order (higher = processed first) */
  priority: number;
}

/**
 * Call for help event data
 */
export interface CallForHelpEvent {
  /** Creature calling for help */
  callerId: ObjectId;
  /** Threat that triggered the call */
  threatId: ObjectId;
  /** Position of the caller */
  position: Vector3;
  /** Radius to search for allies */
  radius: number;
  /** Social group to notify */
  socialGroup?: string | undefined;
  /** Timestamp of the call */
  timestamp: number;
}

/**
 * AI Manager options
 */
export interface AIManagerOptions {
  /** Maximum number of AIs to update per tick (for load balancing) */
  maxUpdatesPerTick?: number;
  /** Minimum update interval in milliseconds */
  minUpdateInterval?: number;
  /** Enable threat decay over time */
  enableThreatDecay?: boolean;
  /** Threat decay rate per second */
  threatDecayRate?: number;
  /** Callback to resolve ObjectId to CreatureObject */
  resolveCreature?: (id: ObjectId) => CreatureObject | null;
}

/**
 * AI Manager - Central coordination for creature AI
 *
 * Responsibilities:
 * - Register/unregister creatures for AI processing
 * - Tick all registered AIs each update cycle
 * - Manage threat between creatures
 * - Handle social group coordination (call for help, assist)
 * - Load balance AI updates across frames
 */
export class AIManager {
  /** Registered AI agents */
  private readonly agents: Map<ObjectId, AIAgent>;

  /** Pending call for help events */
  private readonly callsForHelp: CallForHelpEvent[];

  /** Configuration options */
  private readonly options: Required<AIManagerOptions>;

  /** Index for round-robin updates when load balancing */
  private updateIndex: number = 0;

  /** Last update timestamp */
  private lastUpdateTime: number = 0;

  constructor(options: AIManagerOptions = {}) {
    this.agents = new Map();
    this.callsForHelp = [];
    this.options = {
      maxUpdatesPerTick: options.maxUpdatesPerTick ?? 100,
      minUpdateInterval: options.minUpdateInterval ?? 100, // 10 updates per second
      enableThreatDecay: options.enableThreatDecay ?? true,
      threatDecayRate: options.threatDecayRate ?? 5, // 5 threat per second
      resolveCreature: options.resolveCreature ?? (() => null),
    };
  }

  // ============================================
  // Registration
  // ============================================

  /**
   * Register a creature for AI processing
   * @param creature - Creature to control
   * @param tree - Behavior tree for decision making
   * @param options - Additional options
   */
  register(
    creature: CreatureObject,
    tree: BehaviorTree,
    options: {
      homePosition?: Vector3;
      socialGroup?: string;
      priority?: number;
    } = {}
  ): void {
    const homePosition = options.homePosition ?? {
      x: creature.position.x,
      y: creature.position.y,
      z: creature.position.z,
    };

    const context = createAIContext(creature, homePosition);

    const agent: AIAgent = {
      creature,
      tree,
      context,
      socialGroup: options.socialGroup,
      active: true,
      priority: options.priority ?? 0,
    };

    this.agents.set(creature.objectId, agent);

    console.log(
      `[AIManager] Registered creature ${creature.objectId} ` +
        `(tree: ${tree.name}, group: ${options.socialGroup ?? 'none'})`
    );
  }

  /**
   * Unregister a creature from AI processing
   * @param creatureId - Creature object ID
   * @returns True if creature was found and removed
   */
  unregister(creatureId: ObjectId): boolean {
    const agent = this.agents.get(creatureId);
    if (agent) {
      this.agents.delete(creatureId);
      console.log(`[AIManager] Unregistered creature ${creatureId}`);
      return true;
    }
    return false;
  }

  /**
   * Check if a creature is registered
   * @param creatureId - Creature object ID
   */
  isRegistered(creatureId: ObjectId): boolean {
    return this.agents.has(creatureId);
  }

  /**
   * Get agent data for a creature
   * @param creatureId - Creature object ID
   */
  getAgent(creatureId: ObjectId): AIAgent | undefined {
    return this.agents.get(creatureId);
  }

  /**
   * Set whether an agent is active
   * @param creatureId - Creature object ID
   * @param active - Whether to activate or deactivate
   */
  setActive(creatureId: ObjectId, active: boolean): void {
    const agent = this.agents.get(creatureId);
    if (agent) {
      agent.active = active;
    }
  }

  // ============================================
  // Update Loop
  // ============================================

  /**
   * Tick all registered AIs
   * @param deltaTime - Time since last update in seconds
   */
  tick(deltaTime: number): void {
    const now = Date.now();

    // Check minimum update interval
    if (now - this.lastUpdateTime < this.options.minUpdateInterval) {
      return;
    }
    this.lastUpdateTime = now;

    // Process call for help events first
    this.processCallsForHelp();

    // Get agents to update this tick
    const agentsToUpdate = this.getAgentsToUpdate();

    // Update each agent
    for (const agent of agentsToUpdate) {
      this.updateAgent(agent, deltaTime);
    }

    // Decay threat if enabled
    if (this.options.enableThreatDecay) {
      this.decayThreat(deltaTime);
    }
  }

  /**
   * Get agents to update this tick (with load balancing)
   */
  private getAgentsToUpdate(): AIAgent[] {
    const allAgents = Array.from(this.agents.values())
      .filter((a) => a.active && !a.creature.isDead())
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    if (allAgents.length <= this.options.maxUpdatesPerTick) {
      return allAgents;
    }

    // Round-robin selection for load balancing
    const result: AIAgent[] = [];
    const count = Math.min(this.options.maxUpdatesPerTick, allAgents.length);

    for (let i = 0; i < count; i++) {
      const index = (this.updateIndex + i) % allAgents.length;
      const agent = allAgents[index];
      if (agent) {
        result.push(agent);
      }
    }

    this.updateIndex = (this.updateIndex + count) % allAgents.length;

    return result;
  }

  /**
   * Update a single agent
   */
  private updateAgent(agent: AIAgent, deltaTime: number): void {
    const { creature, tree, context } = agent;

    // Skip dead creatures
    if (creature.isDead()) {
      return;
    }

    // Update context
    context.deltaTime = deltaTime;
    context.lastUpdate = Date.now();

    // Resolve target if we have one
    if (creature.targetId !== 0n) {
      const target = this.options.resolveCreature(creature.targetId);
      context.target = target;

      // Clear target if invalid
      if (!target || target.isDead()) {
        context.target = null;
        creature.clearTarget();
        creature.removeThreat(creature.targetId);
      }
    }

    // Tick the behavior tree
    try {
      tree.tick(context);
    } catch (error) {
      console.error(
        `[AIManager] Error ticking AI for creature ${creature.objectId}:`,
        error
      );
    }

    // Check for call for help
    this.checkCallForHelp(agent);
  }

  /**
   * Check if agent is calling for help and queue event
   */
  private checkCallForHelp(agent: AIAgent): void {
    const { creature, context } = agent;

    const radius = getBlackboardValue<number>(context, 'call_for_help_radius');
    const group = getBlackboardValue<string>(context, 'call_for_help_group');

    if (radius !== undefined) {
      const highestThreat = creature.getHighestThreatTarget();

      if (highestThreat) {
        this.callsForHelp.push({
          callerId: creature.objectId,
          threatId: highestThreat,
          position: { x: creature.position.x, y: creature.position.y, z: creature.position.z },
          radius,
          socialGroup: group ?? agent.socialGroup,
          timestamp: Date.now(),
        });
      }

      // Clear the blackboard entries
      context.blackboard.delete('call_for_help_radius');
      context.blackboard.delete('call_for_help_group');
    }
  }

  /**
   * Process pending call for help events
   */
  private processCallsForHelp(): void {
    while (this.callsForHelp.length > 0) {
      const event = this.callsForHelp.shift()!;

      // Find allies in range
      for (const agent of this.agents.values()) {
        // Skip the caller
        if (agent.creature.objectId === event.callerId) {
          continue;
        }

        // Skip inactive or dead
        if (!agent.active || agent.creature.isDead()) {
          continue;
        }

        // Check social group match
        if (event.socialGroup && agent.socialGroup !== event.socialGroup) {
          continue;
        }

        // Check distance
        const dx = agent.creature.position.x - event.position.x;
        const dz = agent.creature.position.z - event.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance > event.radius) {
          continue;
        }

        // Alert this ally - add threat to make them target the threat
        this.addThreat(agent.creature, event.threatId, 50); // Assist threat

        console.log(
          `[AIManager] Creature ${agent.creature.objectId} responding to call for help ` +
            `from ${event.callerId} against ${event.threatId}`
        );
      }
    }
  }

  // ============================================
  // Threat Management
  // ============================================

  /**
   * Add threat from one creature to another
   * @param creature - Creature whose threat table to modify
   * @param targetId - Target generating threat
   * @param amount - Amount of threat to add
   */
  addThreat(creature: CreatureObject, targetId: ObjectId, amount: number): void {
    creature.addThreat(targetId, amount);

    // Enter combat if not already
    if (!creature.isInCombatState()) {
      creature.enterCombat();
    }
  }

  /**
   * Get the highest threat target for a creature
   * @param creature - Creature to check
   * @returns Target with highest threat, or null
   */
  getHighestThreat(creature: CreatureObject): CreatureObject | null {
    const targetId = creature.getHighestThreatTarget();

    if (!targetId) {
      return null;
    }

    return this.options.resolveCreature(targetId);
  }

  /**
   * Decay threat over time
   */
  private decayThreat(deltaTime: number): void {
    const decayAmount = this.options.threatDecayRate * deltaTime;

    for (const agent of this.agents.values()) {
      const { creature } = agent;

      // Decay each threat entry
      for (const [targetId, entry] of creature.threatTable) {
        entry.threat -= decayAmount;

        if (entry.threat <= 0) {
          creature.threatTable.delete(targetId);
        }
      }

      // Exit combat if no more threats
      if (creature.threatTable.size === 0 && creature.isInCombatState()) {
        creature.exitCombat();

        // Reset called for help flag
        const agent = this.agents.get(creature.objectId);
        if (agent) {
          setBlackboardValue(agent.context, BlackboardKeys.CALLED_FOR_HELP, false);
        }
      }
    }
  }

  /**
   * Transfer threat from one target to another
   * Used when a creature dies or leaves combat
   */
  transferThreat(
    creature: CreatureObject,
    fromId: ObjectId,
    toId: ObjectId,
    percentage: number = 1
  ): void {
    const threatAmount = creature.getThreat(fromId);

    if (threatAmount > 0) {
      creature.addThreat(toId, threatAmount * percentage);
      creature.removeThreat(fromId);
    }
  }

  /**
   * Clear all threat for a creature
   */
  clearThreat(creature: CreatureObject): void {
    creature.clearThreat();

    if (creature.isInCombatState()) {
      creature.exitCombat();
    }
  }

  // ============================================
  // Social Groups
  // ============================================

  /**
   * Get all agents in a social group
   * @param socialGroup - Group identifier
   */
  getGroupMembers(socialGroup: string): AIAgent[] {
    return Array.from(this.agents.values()).filter(
      (a) => a.socialGroup === socialGroup
    );
  }

  /**
   * Get nearby group members
   * @param creatureId - Center creature
   * @param radius - Search radius
   */
  getNearbyGroupMembers(creatureId: ObjectId, radius: number): AIAgent[] {
    const agent = this.agents.get(creatureId);
    if (!agent || !agent.socialGroup) {
      return [];
    }

    const { creature } = agent;
    const result: AIAgent[] = [];

    for (const other of this.agents.values()) {
      if (other.creature.objectId === creatureId) {
        continue;
      }

      if (other.socialGroup !== agent.socialGroup) {
        continue;
      }

      const dx = other.creature.position.x - creature.position.x;
      const dz = other.creature.position.z - creature.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance <= radius) {
        result.push(other);
      }
    }

    return result;
  }

  // ============================================
  // Queries
  // ============================================

  /**
   * Get all registered agents
   */
  getAllAgents(): AIAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get count of registered agents
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Get count of active agents
   */
  getActiveAgentCount(): number {
    return Array.from(this.agents.values()).filter((a) => a.active).length;
  }

  /**
   * Find agents near a position
   * @param position - Center position
   * @param radius - Search radius
   */
  findAgentsNear(position: Vector3, radius: number): AIAgent[] {
    const result: AIAgent[] = [];

    for (const agent of this.agents.values()) {
      const dx = agent.creature.position.x - position.x;
      const dz = agent.creature.position.z - position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance <= radius) {
        result.push(agent);
      }
    }

    return result;
  }

  /**
   * Get statistics about AI state
   */
  getStats(): {
    totalAgents: number;
    activeAgents: number;
    inCombat: number;
    byTree: Map<string, number>;
    bySocialGroup: Map<string, number>;
  } {
    const byTree = new Map<string, number>();
    const bySocialGroup = new Map<string, number>();
    let inCombat = 0;
    let activeAgents = 0;

    for (const agent of this.agents.values()) {
      if (agent.active) {
        activeAgents++;
      }

      if (agent.creature.isInCombatState()) {
        inCombat++;
      }

      const treeName = agent.tree.name;
      byTree.set(treeName, (byTree.get(treeName) ?? 0) + 1);

      if (agent.socialGroup) {
        bySocialGroup.set(
          agent.socialGroup,
          (bySocialGroup.get(agent.socialGroup) ?? 0) + 1
        );
      }
    }

    return {
      totalAgents: this.agents.size,
      activeAgents,
      inCombat,
      byTree,
      bySocialGroup,
    };
  }

  /**
   * Clear all registered agents
   */
  clear(): void {
    this.agents.clear();
    this.callsForHelp.length = 0;
    this.updateIndex = 0;
    console.log('[AIManager] Cleared all agents');
  }
}

/**
 * Create a new AI manager instance
 * @param options - Configuration options
 */
export function createAIManager(options?: AIManagerOptions): AIManager {
  return new AIManager(options);
}
