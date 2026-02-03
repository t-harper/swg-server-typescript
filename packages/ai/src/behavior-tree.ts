/**
 * Behavior Tree
 * Main behavior tree class and builder pattern for constructing trees.
 */

import type { AIContext } from './ai-context.js';
import {
  BehaviorNode,
  CompositeNode,
  DecoratorNode,
  NodeStatus,
} from './nodes/base.js';
import {
  Selector,
  Sequence,
  Parallel,
  ParallelPolicy,
  RandomSelector,
  PrioritySelector,
} from './nodes/composites.js';
import { Inverter, Repeater, Succeeder } from './nodes/decorators.js';

/**
 * BehaviorTree - Container for the behavior tree root and execution
 *
 * The behavior tree is ticked each AI update cycle, starting from
 * the root node and propagating through the tree based on node logic.
 */
export class BehaviorTree {
  /** Root node of the tree */
  root: BehaviorNode;

  /** Optional name for debugging */
  name: string;

  /** Whether the tree is currently running */
  private isRunning: boolean = false;

  /** Last execution status */
  private lastStatus: NodeStatus = NodeStatus.Success;

  constructor(root: BehaviorNode, name?: string) {
    this.root = root;
    this.name = name ?? 'BehaviorTree';
  }

  /**
   * Execute one tick of the behavior tree
   * @param context - AI context with creature and state data
   * @returns Execution status
   */
  tick(context: AIContext): NodeStatus {
    this.lastStatus = this.root.tick(context);
    this.isRunning = this.lastStatus === NodeStatus.Running;
    return this.lastStatus;
  }

  /**
   * Reset the tree to initial state
   */
  reset(): void {
    this.root.reset();
    this.isRunning = false;
    this.lastStatus = NodeStatus.Success;
  }

  /**
   * Get the last execution status
   */
  getLastStatus(): NodeStatus {
    return this.lastStatus;
  }

  /**
   * Check if tree is currently running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }
}

/**
 * Builder stack entry
 */
interface BuilderStackEntry {
  node: CompositeNode | DecoratorNode;
  isDecorator: boolean;
}

/**
 * BehaviorTreeBuilder - Fluent builder for constructing behavior trees
 *
 * Example usage:
 * ```typescript
 * const tree = new BehaviorTreeBuilder('CombatTree')
 *   .selector()
 *     .sequence()
 *       .condition(new HasTarget())
 *       .condition(new IsTargetInRange(5))
 *       .action(new AttackTarget())
 *     .end()
 *     .sequence()
 *       .condition(new HasTarget())
 *       .action(new MoveToTarget())
 *     .end()
 *     .action(new Wander(16))
 *   .end()
 *   .build();
 * ```
 */
export class BehaviorTreeBuilder {
  /** Tree name */
  private name: string;

  /** Root node being built */
  private rootNode: BehaviorNode | null = null;

  /** Stack of composite/decorator nodes being built */
  private stack: BuilderStackEntry[] = [];

  constructor(name?: string) {
    this.name = name ?? 'BehaviorTree';
  }

  // ============================================
  // Composite Nodes
  // ============================================

  /**
   * Start a Selector node (OR logic)
   */
  selector(name?: string): this {
    return this.pushComposite(new Selector([], name));
  }

  /**
   * Start a Sequence node (AND logic)
   */
  sequence(name?: string): this {
    return this.pushComposite(new Sequence([], name));
  }

  /**
   * Start a Parallel node
   */
  parallel(policy: ParallelPolicy = ParallelPolicy.RequireAll, name?: string): this {
    return this.pushComposite(new Parallel(policy, [], name));
  }

  /**
   * Start a RandomSelector node
   */
  randomSelector(name?: string): this {
    return this.pushComposite(new RandomSelector([], name));
  }

  /**
   * Start a PrioritySelector node
   */
  prioritySelector(name?: string): this {
    return this.pushComposite(new PrioritySelector([], name));
  }

  // ============================================
  // Decorator Nodes
  // ============================================

  /**
   * Start an Inverter decorator
   */
  inverter(name?: string): this {
    // Create a placeholder that will be replaced with actual child
    const placeholder = new Succeeder(new (class extends BehaviorNode {
      tick(): NodeStatus { return NodeStatus.Success; }
    })());
    const inverter = new Inverter(placeholder, name);
    return this.pushDecorator(inverter);
  }

  /**
   * Start a Repeater decorator
   */
  repeater(repeatCount: number = 1, continueOnFailure: boolean = false, name?: string): this {
    const placeholder = new Succeeder(new (class extends BehaviorNode {
      tick(): NodeStatus { return NodeStatus.Success; }
    })());
    const repeater = new Repeater(placeholder, repeatCount, continueOnFailure, name);
    return this.pushDecorator(repeater);
  }

  /**
   * Start a Succeeder decorator
   */
  succeeder(name?: string): this {
    const placeholder = new Succeeder(new (class extends BehaviorNode {
      tick(): NodeStatus { return NodeStatus.Success; }
    })());
    const succeeder = new Succeeder(placeholder, name);
    return this.pushDecorator(succeeder);
  }

  // ============================================
  // Leaf Nodes
  // ============================================

  /**
   * Add a condition node (leaf node that checks a condition)
   */
  condition(node: BehaviorNode): this {
    return this.addChild(node);
  }

  /**
   * Add an action node (leaf node that performs an action)
   */
  action(node: BehaviorNode): this {
    return this.addChild(node);
  }

  /**
   * Add any node (generic method)
   */
  node(node: BehaviorNode): this {
    return this.addChild(node);
  }

  // ============================================
  // Tree Structure
  // ============================================

  /**
   * End the current composite or decorator node
   */
  end(): this {
    if (this.stack.length === 0) {
      throw new Error('BehaviorTreeBuilder: Cannot call end() - no open composite/decorator');
    }

    const entry = this.stack.pop()!;
    const completedNode = entry.node;

    if (this.stack.length === 0) {
      // This is the root node
      this.rootNode = completedNode;
    } else {
      // Add to parent
      const parent = this.stack[this.stack.length - 1]!;
      if (parent.isDecorator) {
        (parent.node as DecoratorNode).child = completedNode;
      } else {
        (parent.node as CompositeNode).addChild(completedNode);
      }
    }

    return this;
  }

  /**
   * Build the behavior tree
   * @returns Completed behavior tree
   */
  build(): BehaviorTree {
    // Close any open nodes
    while (this.stack.length > 0) {
      this.end();
    }

    if (!this.rootNode) {
      throw new Error('BehaviorTreeBuilder: No root node defined');
    }

    return new BehaviorTree(this.rootNode, this.name);
  }

  // ============================================
  // Internal Methods
  // ============================================

  private pushComposite(node: CompositeNode): this {
    this.stack.push({ node, isDecorator: false });
    return this;
  }

  private pushDecorator(node: DecoratorNode): this {
    this.stack.push({ node, isDecorator: true });
    return this;
  }

  private addChild(node: BehaviorNode): this {
    if (this.stack.length === 0) {
      // No parent, this becomes the root
      this.rootNode = node;
      return this;
    }

    const parent = this.stack[this.stack.length - 1]!;

    if (parent.isDecorator) {
      // Decorator can only have one child
      (parent.node as DecoratorNode).child = node;
      // Auto-close decorator after adding child
      this.end();
    } else {
      // Composite can have multiple children
      (parent.node as CompositeNode).addChild(node);
    }

    return this;
  }
}

/**
 * Create a new behavior tree builder
 * @param name - Optional tree name for debugging
 * @returns New builder instance
 */
export function createTreeBuilder(name?: string): BehaviorTreeBuilder {
  return new BehaviorTreeBuilder(name);
}
