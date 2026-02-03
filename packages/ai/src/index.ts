/**
 * @swg/ai
 * Behavior Tree AI Framework for the SWG Server
 *
 * This package provides a complete behavior tree system for NPC and
 * creature AI decision making, including:
 *
 * - Core behavior tree nodes (composite, decorator, leaf)
 * - Condition nodes for evaluating game state
 * - Action nodes for performing creature actions
 * - Pre-built behavior trees for common AI patterns
 * - AI Manager for coordinating multiple AI agents
 *
 * Example usage:
 * ```typescript
 * import {
 *   AIManager,
 *   createAggressiveCreatureTree,
 *   createAIContext,
 * } from '@swg/ai';
 *
 * // Create AI manager
 * const aiManager = new AIManager({
 *   resolveCreature: (id) => objectManager.getCreature(id),
 * });
 *
 * // Create and register a creature with AI
 * const creature = new CreatureObject(...);
 * const tree = createAggressiveCreatureTree({ aggroRange: 32 });
 * aiManager.register(creature, tree, {
 *   homePosition: { x: 100, y: 0, z: 100 },
 *   socialGroup: 'tusken_raiders',
 * });
 *
 * // In game loop
 * aiManager.tick(deltaTime);
 * ```
 */

// AI Context
export {
  type AIContext,
  createAIContext,
  BlackboardKeys,
  getBlackboardValue,
  setBlackboardValue,
  hasBlackboardValue,
  removeBlackboardValue,
  clearBlackboard,
} from './ai-context.js';

// Behavior Tree core
export {
  BehaviorTree,
  BehaviorTreeBuilder,
  createTreeBuilder,
} from './behavior-tree.js';

// Base node types
export {
  NodeStatus,
  BehaviorNode,
  CompositeNode,
  DecoratorNode,
  LeafNode,
} from './nodes/base.js';

// Composite nodes
export {
  Selector,
  Sequence,
  Parallel,
  ParallelPolicy,
  RandomSelector,
  PrioritySelector,
} from './nodes/composites.js';

// Decorator nodes
export {
  Inverter,
  Repeater,
  Succeeder,
  Failer,
  UntilSuccess,
  UntilFailure,
  Cooldown,
  Timeout,
  ConditionalDecorator,
} from './nodes/decorators.js';

// Condition nodes
export {
  HasTarget,
  IsInCombat,
  IsHealthLow,
  IsTargetInRange,
  IsTargetVisible,
  HasThreat,
  IsDead,
  IsIncapacitated,
  IsAtHome,
  IsAwayFromHome,
  HasState,
  IsStunned,
  IsImmobilized,
  CanAct,
  CanMove,
  BlackboardCheck,
  RandomChance,
  TimeSince,
} from './nodes/conditions.js';

// Action nodes
export {
  AttackTarget,
  MoveToTarget,
  MoveToPosition,
  Patrol,
  Idle,
  Flee,
  CallForHelp,
  SelectHighestThreat,
  Wander,
  ReturnHome,
  SetBlackboard,
  ClearBlackboard,
  Log,
  Wait,
} from './nodes/actions.js';

// Pre-built behavior trees
export {
  // Passive creature
  createPassiveCreatureTree,
  createPassiveCreatureTreeWithBuilder,
  type PassiveCreatureOptions,
  // Aggressive creature
  createAggressiveCreatureTree,
  createStalkerCreatureTree,
  type AggressiveCreatureOptions,
  // Pack creature
  createPackCreatureTree,
  createPackAlphaTree,
  type PackCreatureOptions,
  // Guard NPC
  createGuardTree,
  createStationaryGuardTree,
  createEliteGuardTree,
  type GuardOptions,
} from './trees/index.js';

// AI Manager
export {
  AIManager,
  createAIManager,
  type AIAgent,
  type CallForHelpEvent,
  type AIManagerOptions,
} from './ai-manager.js';
