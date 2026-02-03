/**
 * Behavior Tree Base Node
 * Foundation classes for the behavior tree system.
 */

import type { AIContext } from '../ai-context.js';

/**
 * Node execution status
 * Returned by nodes to indicate their execution result.
 */
export enum NodeStatus {
  /** Node completed successfully */
  Success = 'success',
  /** Node failed to complete */
  Failure = 'failure',
  /** Node is still running and needs more ticks */
  Running = 'running',
}

/**
 * Abstract base class for all behavior tree nodes
 *
 * All behavior tree nodes inherit from this class and implement
 * the tick() method to define their behavior.
 */
export abstract class BehaviorNode {
  /** Optional name for debugging */
  name: string;

  /** Whether this node is currently running */
  protected isRunning: boolean = false;

  constructor(name?: string) {
    this.name = name ?? this.constructor.name;
  }

  /**
   * Execute one tick of this node
   * @param context - AI context with creature and state data
   * @returns Node execution status
   */
  abstract tick(context: AIContext): NodeStatus;

  /**
   * Reset this node to initial state
   * Called when the tree is reset or when a parent node needs
   * to restart this node.
   */
  reset(): void {
    this.isRunning = false;
  }

  /**
   * Called when this node starts running
   * Override to perform initialization.
   */
  protected onStart(_context: AIContext): void {
    // Override in subclasses
  }

  /**
   * Called when this node stops running (success or failure)
   * Override to perform cleanup.
   */
  protected onStop(_context: AIContext): void {
    // Override in subclasses
  }
}

/**
 * Composite node - has multiple children
 * Base class for Selector, Sequence, and other composite nodes.
 */
export abstract class CompositeNode extends BehaviorNode {
  /** Child nodes */
  children: BehaviorNode[];

  /** Index of currently running child */
  protected currentChildIndex: number = 0;

  constructor(children: BehaviorNode[] = [], name?: string) {
    super(name);
    this.children = children;
  }

  /**
   * Add a child node
   * @param child - Node to add
   * @returns This node for chaining
   */
  addChild(child: BehaviorNode): this {
    this.children.push(child);
    return this;
  }

  /**
   * Remove a child node
   * @param child - Node to remove
   * @returns True if node was found and removed
   */
  removeChild(child: BehaviorNode): boolean {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      return true;
    }
    return false;
  }

  override reset(): void {
    super.reset();
    this.currentChildIndex = 0;
    for (const child of this.children) {
      child.reset();
    }
  }
}

/**
 * Decorator node - has exactly one child
 * Base class for Inverter, Repeater, and other decorator nodes.
 */
export abstract class DecoratorNode extends BehaviorNode {
  /** The child node to decorate */
  child: BehaviorNode;

  constructor(child: BehaviorNode, name?: string) {
    super(name);
    this.child = child;
  }

  override reset(): void {
    super.reset();
    this.child.reset();
  }
}

/**
 * Leaf node - no children, performs actual work
 * Base class for action and condition nodes.
 */
export abstract class LeafNode extends BehaviorNode {
  constructor(name?: string) {
    super(name);
  }
}
