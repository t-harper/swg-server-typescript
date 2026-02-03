/**
 * Decorator Nodes
 * Nodes that modify the behavior of a single child node.
 */

import type { AIContext } from '../ai-context.js';
import { DecoratorNode, NodeStatus } from './base.js';

/**
 * Inverter Node
 *
 * Inverts the result of its child:
 * - Success becomes Failure
 * - Failure becomes Success
 * - Running stays Running
 *
 * Useful for negating conditions.
 * Example: Inverter(HasTarget) = "Does NOT have target"
 */
export class Inverter extends DecoratorNode {
  constructor(child: DecoratorNode['child'], name?: string) {
    super(child, name ?? 'Inverter');
  }

  tick(context: AIContext): NodeStatus {
    const status = this.child.tick(context);

    switch (status) {
      case NodeStatus.Success:
        return NodeStatus.Failure;
      case NodeStatus.Failure:
        return NodeStatus.Success;
      case NodeStatus.Running:
        return NodeStatus.Running;
    }
  }
}

/**
 * Repeater Node
 *
 * Repeats its child a specified number of times.
 * - Returns Success after all repetitions complete successfully
 * - Returns Failure if child fails (unless continueOnFailure is true)
 * - Returns Running while child is running or repetitions remain
 *
 * Set repeatCount to -1 for infinite repetition (always returns Running).
 */
export class Repeater extends DecoratorNode {
  /** Number of times to repeat (-1 for infinite) */
  repeatCount: number;

  /** Whether to continue repeating on child failure */
  continueOnFailure: boolean;

  /** Current repetition count */
  private currentCount: number = 0;

  constructor(
    child: DecoratorNode['child'],
    repeatCount: number = 1,
    continueOnFailure: boolean = false,
    name?: string
  ) {
    super(child, name ?? 'Repeater');
    this.repeatCount = repeatCount;
    this.continueOnFailure = continueOnFailure;
  }

  override reset(): void {
    super.reset();
    this.currentCount = 0;
  }

  tick(context: AIContext): NodeStatus {
    // Infinite loop
    if (this.repeatCount < 0) {
      const status = this.child.tick(context);
      if (status === NodeStatus.Running) {
        return NodeStatus.Running;
      }
      // Reset child and continue looping
      this.child.reset();
      return NodeStatus.Running;
    }

    // Fixed repetitions
    while (this.currentCount < this.repeatCount) {
      const status = this.child.tick(context);

      switch (status) {
        case NodeStatus.Running:
          this.isRunning = true;
          return NodeStatus.Running;

        case NodeStatus.Failure:
          if (!this.continueOnFailure) {
            this.reset();
            return NodeStatus.Failure;
          }
          // Fall through to success case
          break;

        case NodeStatus.Success:
          break;
      }

      // Child completed, reset and increment count
      this.child.reset();
      this.currentCount++;
    }

    // All repetitions complete
    this.reset();
    return NodeStatus.Success;
  }
}

/**
 * Succeeder Node
 *
 * Always returns Success regardless of child result.
 * Useful for optional behavior that should not affect parent result.
 */
export class Succeeder extends DecoratorNode {
  constructor(child: DecoratorNode['child'], name?: string) {
    super(child, name ?? 'Succeeder');
  }

  tick(context: AIContext): NodeStatus {
    const status = this.child.tick(context);

    if (status === NodeStatus.Running) {
      return NodeStatus.Running;
    }

    return NodeStatus.Success;
  }
}

/**
 * Failer Node
 *
 * Always returns Failure regardless of child result.
 * Useful for intentionally failing a branch.
 */
export class Failer extends DecoratorNode {
  constructor(child: DecoratorNode['child'], name?: string) {
    super(child, name ?? 'Failer');
  }

  tick(context: AIContext): NodeStatus {
    const status = this.child.tick(context);

    if (status === NodeStatus.Running) {
      return NodeStatus.Running;
    }

    return NodeStatus.Failure;
  }
}

/**
 * UntilSuccess Node
 *
 * Repeats child until it succeeds.
 * - Returns Success when child succeeds
 * - Returns Running while child fails or is running
 *
 * Use with caution - can cause infinite loops if child never succeeds.
 */
export class UntilSuccess extends DecoratorNode {
  constructor(child: DecoratorNode['child'], name?: string) {
    super(child, name ?? 'UntilSuccess');
  }

  tick(context: AIContext): NodeStatus {
    const status = this.child.tick(context);

    switch (status) {
      case NodeStatus.Success:
        return NodeStatus.Success;

      case NodeStatus.Running:
        return NodeStatus.Running;

      case NodeStatus.Failure:
        // Reset and try again
        this.child.reset();
        return NodeStatus.Running;
    }
  }
}

/**
 * UntilFailure Node
 *
 * Repeats child until it fails.
 * - Returns Failure when child fails
 * - Returns Running while child succeeds or is running
 *
 * Use with caution - can cause infinite loops if child never fails.
 */
export class UntilFailure extends DecoratorNode {
  constructor(child: DecoratorNode['child'], name?: string) {
    super(child, name ?? 'UntilFailure');
  }

  tick(context: AIContext): NodeStatus {
    const status = this.child.tick(context);

    switch (status) {
      case NodeStatus.Failure:
        return NodeStatus.Failure;

      case NodeStatus.Running:
        return NodeStatus.Running;

      case NodeStatus.Success:
        // Reset and try again
        this.child.reset();
        return NodeStatus.Running;
    }
  }
}

/**
 * Cooldown Node
 *
 * Prevents child from executing until cooldown period has passed.
 * - Returns Failure if cooldown is active
 * - Executes child if cooldown has expired
 * - Starts new cooldown after child completes (success or failure)
 */
export class Cooldown extends DecoratorNode {
  /** Cooldown duration in seconds */
  cooldownDuration: number;

  /** Timestamp when cooldown expires */
  private cooldownExpires: number = 0;

  /** Whether child is currently running */
  private childRunning: boolean = false;

  constructor(
    child: DecoratorNode['child'],
    cooldownDuration: number,
    name?: string
  ) {
    super(child, name ?? 'Cooldown');
    this.cooldownDuration = cooldownDuration;
  }

  override reset(): void {
    super.reset();
    this.childRunning = false;
    // Note: Don't reset cooldown timer on reset
  }

  tick(context: AIContext): NodeStatus {
    const now = Date.now();

    // If child is running, let it complete
    if (this.childRunning) {
      const status = this.child.tick(context);

      if (status !== NodeStatus.Running) {
        this.childRunning = false;
        // Start cooldown when child completes
        this.cooldownExpires = now + this.cooldownDuration * 1000;
        this.child.reset();
      }

      return status;
    }

    // Check if still on cooldown
    if (now < this.cooldownExpires) {
      return NodeStatus.Failure;
    }

    // Execute child
    const status = this.child.tick(context);

    if (status === NodeStatus.Running) {
      this.childRunning = true;
    } else {
      // Start cooldown
      this.cooldownExpires = now + this.cooldownDuration * 1000;
      this.child.reset();
    }

    return status;
  }
}

/**
 * Timeout Node
 *
 * Fails child if it runs for too long.
 * - Returns child status normally if within timeout
 * - Returns Failure if timeout is exceeded while child is Running
 */
export class Timeout extends DecoratorNode {
  /** Maximum time in seconds before failing */
  timeoutDuration: number;

  /** Timestamp when timeout expires */
  private timeoutExpires: number = 0;

  /** Whether child has started */
  private started: boolean = false;

  constructor(
    child: DecoratorNode['child'],
    timeoutDuration: number,
    name?: string
  ) {
    super(child, name ?? 'Timeout');
    this.timeoutDuration = timeoutDuration;
  }

  override reset(): void {
    super.reset();
    this.started = false;
    this.timeoutExpires = 0;
  }

  tick(context: AIContext): NodeStatus {
    const now = Date.now();

    // Start timer on first tick
    if (!this.started) {
      this.started = true;
      this.timeoutExpires = now + this.timeoutDuration * 1000;
    }

    // Check timeout
    if (now >= this.timeoutExpires) {
      this.reset();
      return NodeStatus.Failure;
    }

    const status = this.child.tick(context);

    if (status !== NodeStatus.Running) {
      this.reset();
    }

    return status;
  }
}

/**
 * ConditionalDecorator Node
 *
 * Only executes child if a condition function returns true.
 * - Returns Failure if condition is false
 * - Returns child status if condition is true
 */
export class ConditionalDecorator extends DecoratorNode {
  /** Condition function to check */
  condition: (context: AIContext) => boolean;

  /** Whether to check condition only once or every tick */
  checkOncePerRun: boolean;

  /** Cached condition result */
  private conditionResult: boolean | null = null;

  constructor(
    child: DecoratorNode['child'],
    condition: (context: AIContext) => boolean,
    checkOncePerRun: boolean = false,
    name?: string
  ) {
    super(child, name ?? 'ConditionalDecorator');
    this.condition = condition;
    this.checkOncePerRun = checkOncePerRun;
  }

  override reset(): void {
    super.reset();
    this.conditionResult = null;
  }

  tick(context: AIContext): NodeStatus {
    // Check condition
    if (this.checkOncePerRun && this.conditionResult !== null) {
      // Use cached result
    } else {
      this.conditionResult = this.condition(context);
    }

    if (!this.conditionResult) {
      return NodeStatus.Failure;
    }

    const status = this.child.tick(context);

    if (status !== NodeStatus.Running) {
      this.reset();
    }

    return status;
  }
}
