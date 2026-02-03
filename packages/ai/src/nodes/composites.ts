/**
 * Composite Nodes
 * Nodes that have multiple children and control execution flow.
 */

import type { AIContext } from '../ai-context.js';
import { CompositeNode, NodeStatus } from './base.js';

/**
 * Selector Node (OR logic)
 *
 * Executes children in order until one succeeds.
 * - Returns Success when a child succeeds
 * - Returns Failure when all children fail
 * - Returns Running when a child returns Running
 *
 * Use for "try this, else try that" behavior.
 * Example: [AttackTarget, ChaseTarget, Patrol]
 */
export class Selector extends CompositeNode {
  constructor(children: CompositeNode['children'] = [], name?: string) {
    super(children, name ?? 'Selector');
  }

  tick(context: AIContext): NodeStatus {
    // Continue from where we left off if running
    for (let i = this.currentChildIndex; i < this.children.length; i++) {
      const child = this.children[i];
      if (!child) continue;

      const status = child.tick(context);

      switch (status) {
        case NodeStatus.Success:
          // A child succeeded, reset and return success
          this.currentChildIndex = 0;
          return NodeStatus.Success;

        case NodeStatus.Running:
          // Child is still running, remember where we are
          this.currentChildIndex = i;
          this.isRunning = true;
          return NodeStatus.Running;

        case NodeStatus.Failure:
          // Child failed, try the next one
          child.reset();
          continue;
      }
    }

    // All children failed
    this.currentChildIndex = 0;
    this.isRunning = false;
    return NodeStatus.Failure;
  }
}

/**
 * Sequence Node (AND logic)
 *
 * Executes children in order until one fails.
 * - Returns Success when all children succeed
 * - Returns Failure when a child fails
 * - Returns Running when a child returns Running
 *
 * Use for "do this, then do that" behavior.
 * Example: [HasTarget, IsInRange, AttackTarget]
 */
export class Sequence extends CompositeNode {
  constructor(children: CompositeNode['children'] = [], name?: string) {
    super(children, name ?? 'Sequence');
  }

  tick(context: AIContext): NodeStatus {
    // Continue from where we left off if running
    for (let i = this.currentChildIndex; i < this.children.length; i++) {
      const child = this.children[i];
      if (!child) continue;

      const status = child.tick(context);

      switch (status) {
        case NodeStatus.Failure:
          // A child failed, reset and return failure
          this.currentChildIndex = 0;
          return NodeStatus.Failure;

        case NodeStatus.Running:
          // Child is still running, remember where we are
          this.currentChildIndex = i;
          this.isRunning = true;
          return NodeStatus.Running;

        case NodeStatus.Success:
          // Child succeeded, continue to the next one
          child.reset();
          continue;
      }
    }

    // All children succeeded
    this.currentChildIndex = 0;
    this.isRunning = false;
    return NodeStatus.Success;
  }
}

/**
 * Parallel Node
 *
 * Executes all children simultaneously each tick.
 * Configurable success/failure policy determines when to return.
 *
 * Policies:
 * - RequireAll: Success when all succeed, Failure when any fails
 * - RequireOne: Success when any succeeds, Failure when all fail
 */
export enum ParallelPolicy {
  /** Require all children to succeed */
  RequireAll = 'require_all',
  /** Require at least one child to succeed */
  RequireOne = 'require_one',
}

export class Parallel extends CompositeNode {
  /** Success/failure policy */
  policy: ParallelPolicy;

  constructor(
    policy: ParallelPolicy = ParallelPolicy.RequireAll,
    children: CompositeNode['children'] = [],
    name?: string
  ) {
    super(children, name ?? 'Parallel');
    this.policy = policy;
  }

  tick(context: AIContext): NodeStatus {
    let successCount = 0;
    let failureCount = 0;
    let runningCount = 0;

    for (const child of this.children) {
      const status = child.tick(context);

      switch (status) {
        case NodeStatus.Success:
          successCount++;
          break;
        case NodeStatus.Failure:
          failureCount++;
          break;
        case NodeStatus.Running:
          runningCount++;
          break;
      }
    }

    if (this.policy === ParallelPolicy.RequireAll) {
      // All must succeed
      if (failureCount > 0) {
        return NodeStatus.Failure;
      }
      if (runningCount > 0) {
        return NodeStatus.Running;
      }
      return NodeStatus.Success;
    } else {
      // RequireOne - at least one must succeed
      if (successCount > 0) {
        return NodeStatus.Success;
      }
      if (runningCount > 0) {
        return NodeStatus.Running;
      }
      return NodeStatus.Failure;
    }
  }
}

/**
 * Random Selector Node
 *
 * Like Selector, but shuffles children order randomly before execution.
 * Useful for variety in AI behavior.
 */
export class RandomSelector extends CompositeNode {
  /** Shuffled order of children indices */
  private shuffledIndices: number[] = [];

  constructor(children: CompositeNode['children'] = [], name?: string) {
    super(children, name ?? 'RandomSelector');
  }

  override reset(): void {
    super.reset();
    this.shuffledIndices = [];
  }

  tick(context: AIContext): NodeStatus {
    // Shuffle on first tick or after reset
    if (this.shuffledIndices.length === 0) {
      this.shuffledIndices = this.shuffle(
        Array.from({ length: this.children.length }, (_, i) => i)
      );
    }

    for (let i = this.currentChildIndex; i < this.shuffledIndices.length; i++) {
      const childIndex = this.shuffledIndices[i];
      const child = this.children[childIndex!];
      if (!child) continue;

      const status = child.tick(context);

      switch (status) {
        case NodeStatus.Success:
          this.reset();
          return NodeStatus.Success;

        case NodeStatus.Running:
          this.currentChildIndex = i;
          this.isRunning = true;
          return NodeStatus.Running;

        case NodeStatus.Failure:
          child.reset();
          continue;
      }
    }

    this.reset();
    return NodeStatus.Failure;
  }

  private shuffle(array: number[]): number[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  }
}

/**
 * Priority Selector Node
 *
 * Like Selector, but always starts from the first child each tick.
 * Higher priority children (earlier in list) can interrupt running
 * lower priority children.
 */
export class PrioritySelector extends CompositeNode {
  constructor(children: CompositeNode['children'] = [], name?: string) {
    super(children, name ?? 'PrioritySelector');
  }

  tick(context: AIContext): NodeStatus {
    // Always start from the first child to check priorities
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (!child) continue;

      const status = child.tick(context);

      switch (status) {
        case NodeStatus.Success:
          // If we were running a different child, reset it
          if (this.isRunning && this.currentChildIndex !== i) {
            this.children[this.currentChildIndex]?.reset();
          }
          this.currentChildIndex = 0;
          this.isRunning = false;
          return NodeStatus.Success;

        case NodeStatus.Running:
          // If we were running a different child, reset it (preempted)
          if (this.isRunning && this.currentChildIndex !== i) {
            this.children[this.currentChildIndex]?.reset();
          }
          this.currentChildIndex = i;
          this.isRunning = true;
          return NodeStatus.Running;

        case NodeStatus.Failure:
          // Try the next child
          continue;
      }
    }

    // All children failed
    this.currentChildIndex = 0;
    this.isRunning = false;
    return NodeStatus.Failure;
  }
}
