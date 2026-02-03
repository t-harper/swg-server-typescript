/**
 * AI Context
 * Contains all the data needed for AI decision making.
 * Passed to behavior tree nodes during tick execution.
 */

import type { ObjectId, Vector3 } from '@swg/shared-types';
import type { CreatureObject } from '@swg/objects';

/**
 * AI Context - Data container for behavior tree execution
 *
 * The context provides all information a behavior tree node needs
 * to make decisions and execute actions. It includes:
 * - The creature being controlled
 * - Current target information
 * - Home/spawn position for leashing
 * - Blackboard for sharing data between nodes
 */
export interface AIContext {
  /** The creature this AI is controlling */
  creature: CreatureObject;

  /** Current combat target (null if not targeting anything) */
  target: CreatureObject | null;

  /** Home/spawn position - creature returns here when leashing */
  homePosition: Vector3;

  /** Timestamp of last AI update (milliseconds) */
  lastUpdate: number;

  /** Delta time since last update (seconds) */
  deltaTime: number;

  /**
   * Blackboard - Shared memory for behavior tree nodes
   * Nodes can store and retrieve arbitrary data here.
   * Common uses:
   * - Patrol waypoint index
   * - Last seen target position
   * - Ability cooldown tracking
   * - Movement destinations
   */
  blackboard: Map<string, unknown>;
}

/**
 * Create a new AI context for a creature
 * @param creature - The creature to create context for
 * @param homePosition - The creature's home/spawn position
 * @returns New AI context
 */
export function createAIContext(
  creature: CreatureObject,
  homePosition: Vector3
): AIContext {
  return {
    creature,
    target: null,
    homePosition: { ...homePosition },
    lastUpdate: Date.now(),
    deltaTime: 0,
    blackboard: new Map(),
  };
}

/**
 * Blackboard key constants for common data
 */
export const BlackboardKeys = {
  /** Current patrol waypoint index */
  PATROL_INDEX: 'patrol_index',
  /** Array of patrol waypoints */
  PATROL_WAYPOINTS: 'patrol_waypoints',
  /** Last known target position */
  LAST_TARGET_POSITION: 'last_target_position',
  /** Time when current idle started */
  IDLE_START_TIME: 'idle_start_time',
  /** Duration of current idle */
  IDLE_DURATION: 'idle_duration',
  /** Movement destination */
  MOVE_DESTINATION: 'move_destination',
  /** Wander center point */
  WANDER_CENTER: 'wander_center',
  /** Wander radius */
  WANDER_RADIUS: 'wander_radius',
  /** Last wander time */
  LAST_WANDER_TIME: 'last_wander_time',
  /** Flee target position */
  FLEE_DESTINATION: 'flee_destination',
  /** Time combat started */
  COMBAT_START_TIME: 'combat_start_time',
  /** Called for help flag */
  CALLED_FOR_HELP: 'called_for_help',
  /** Is returning to home */
  RETURNING_HOME: 'returning_home',
} as const;

/**
 * Get a typed value from the blackboard
 * @param context - AI context
 * @param key - Blackboard key
 * @returns Value or undefined if not found
 */
export function getBlackboardValue<T>(
  context: AIContext,
  key: string
): T | undefined {
  return context.blackboard.get(key) as T | undefined;
}

/**
 * Set a value in the blackboard
 * @param context - AI context
 * @param key - Blackboard key
 * @param value - Value to store
 */
export function setBlackboardValue<T>(
  context: AIContext,
  key: string,
  value: T
): void {
  context.blackboard.set(key, value);
}

/**
 * Check if blackboard has a key
 * @param context - AI context
 * @param key - Blackboard key
 * @returns True if key exists
 */
export function hasBlackboardValue(context: AIContext, key: string): boolean {
  return context.blackboard.has(key);
}

/**
 * Remove a value from the blackboard
 * @param context - AI context
 * @param key - Blackboard key
 * @returns True if value was removed
 */
export function removeBlackboardValue(context: AIContext, key: string): boolean {
  return context.blackboard.delete(key);
}

/**
 * Clear all blackboard data
 * @param context - AI context
 */
export function clearBlackboard(context: AIContext): void {
  context.blackboard.clear();
}
