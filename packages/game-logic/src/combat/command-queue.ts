/**
 * Command Queue
 * Manages the queue of combat commands waiting to be executed
 */

import type { ObjectId } from '@swg/shared-types';
import type { CombatCommand } from './combat-command.js';

/**
 * Queued command entry
 */
export interface QueuedCommand {
  /** Unique queue entry ID */
  queueId: number;
  /** Attacker object ID */
  attackerId: ObjectId;
  /** The command to execute */
  command: CombatCommand;
  /** Target object ID (if any) */
  targetId: ObjectId | null;
  /** Time when the command was queued */
  queuedAt: number;
  /** Time when warmup started (null if not started) */
  warmupStartedAt: number | null;
  /** Time when the command will execute */
  executeAt: number;
  /** Command arguments */
  arguments: string;
  /** Sequence number from client */
  sequenceNumber: number;
}

/**
 * Currently executing command
 */
export interface ExecutingCommand {
  /** The queued command being executed */
  queued: QueuedCommand;
  /** Time when execution started */
  executionStartedAt: number;
  /** Time when execution will complete (animation finishes) */
  completesAt: number;
}

/**
 * Result of an executed command
 */
export interface ExecutedCommand {
  /** Queue entry ID */
  queueId: number;
  /** Attacker object ID */
  attackerId: ObjectId;
  /** The command that was executed */
  command: CombatCommand;
  /** Target object ID (if any) */
  targetId: ObjectId | null;
  /** Time when execution completed */
  completedAt: number;
  /** Whether the command executed successfully */
  success: boolean;
  /** Error message if failed */
  errorMessage?: string;
  /** Command arguments */
  arguments: string;
}

/**
 * Queue state for a single attacker
 */
interface AttackerQueueState {
  /** Pending commands in queue */
  pending: QueuedCommand[];
  /** Currently executing command */
  executing: ExecutingCommand | null;
  /** Maximum queue size */
  maxQueueSize: number;
}

/**
 * Command Queue Manager
 * Handles queueing and execution of combat commands
 */
export class CommandQueue {
  /** Queue states per attacker */
  private queues: Map<bigint, AttackerQueueState> = new Map();

  /** Auto-incrementing queue ID */
  private nextQueueId: number = 1;

  /** Default max queue size per player */
  private readonly defaultMaxQueueSize: number;

  /** Whether to allow command queueing during animation */
  private readonly allowQueueDuringAnimation: boolean;

  constructor(options: {
    defaultMaxQueueSize?: number;
    allowQueueDuringAnimation?: boolean;
  } = {}) {
    this.defaultMaxQueueSize = options.defaultMaxQueueSize ?? 3;
    this.allowQueueDuringAnimation = options.allowQueueDuringAnimation ?? true;
  }

  /**
   * Enqueue a command for execution
   * @returns Queue ID if successful, null if queue is full
   */
  public enqueue(
    attackerId: ObjectId,
    command: CombatCommand,
    targetId?: ObjectId,
    args: string = '',
    sequenceNumber: number = 0
  ): number | null {
    const state = this.getOrCreateState(attackerId);
    const now = Date.now();

    // Check if queue is full
    if (state.pending.length >= state.maxQueueSize) {
      return null;
    }

    // Calculate when this command can execute
    let executeAt = now;

    // If currently executing, queue after that
    if (state.executing) {
      executeAt = Math.max(executeAt, state.executing.completesAt);
    }

    // If there are pending commands, queue after the last one
    if (state.pending.length > 0) {
      const lastPending = state.pending[state.pending.length - 1];
      if (lastPending) {
        // Account for warmup + animation of last pending command
        const lastFinishTime =
          lastPending.executeAt +
          lastPending.command.warmupTime +
          lastPending.command.animationTime;
        executeAt = Math.max(executeAt, lastFinishTime);
      }
    }

    const queueId = this.nextQueueId++;
    const queuedCommand: QueuedCommand = {
      queueId,
      attackerId,
      command,
      targetId: targetId ?? null,
      queuedAt: now,
      warmupStartedAt: null,
      executeAt,
      arguments: args,
      sequenceNumber,
    };

    state.pending.push(queuedCommand);
    return queueId;
  }

  /**
   * Process the queue for a specific attacker
   * @returns Commands that completed execution this tick
   */
  public tickAttacker(attackerId: ObjectId, currentTime: number): ExecutedCommand[] {
    const state = this.queues.get(attackerId);
    if (!state) return [];

    const completed: ExecutedCommand[] = [];

    // Check if current execution completed
    if (state.executing) {
      if (currentTime >= state.executing.completesAt) {
        // Execution completed
        const executed = state.executing;
        completed.push({
          queueId: executed.queued.queueId,
          attackerId: executed.queued.attackerId,
          command: executed.queued.command,
          targetId: executed.queued.targetId,
          completedAt: currentTime,
          success: true,
          arguments: executed.queued.arguments,
        });
        state.executing = null;
      }
    }

    // Try to start next pending command
    if (!state.executing && state.pending.length > 0) {
      const next = state.pending[0];
      if (next && currentTime >= next.executeAt) {
        // Start warmup/execution
        state.pending.shift();

        // If there's warmup time, start warmup
        if (next.command.warmupTime > 0 && !next.warmupStartedAt) {
          next.warmupStartedAt = currentTime;
          next.executeAt = currentTime + next.command.warmupTime;
          // Put back in queue as warmup
          state.pending.unshift(next);
        } else {
          // Start execution
          state.executing = {
            queued: next,
            executionStartedAt: currentTime,
            completesAt: currentTime + next.command.animationTime,
          };
        }
      }
    }

    return completed;
  }

  /**
   * Process all queues
   * @returns All commands that completed execution this tick
   */
  public tick(currentTime: number = Date.now()): ExecutedCommand[] {
    const allCompleted: ExecutedCommand[] = [];

    for (const [attackerId] of this.queues) {
      const completed = this.tickAttacker(attackerId, currentTime);
      allCompleted.push(...completed);
    }

    return allCompleted;
  }

  /**
   * Clear all pending commands for an attacker
   */
  public clearQueue(attackerId: ObjectId): void {
    const state = this.queues.get(attackerId);
    if (state) {
      state.pending = [];
    }
  }

  /**
   * Cancel current execution and clear queue
   */
  public cancelAll(attackerId: ObjectId): void {
    const state = this.queues.get(attackerId);
    if (state) {
      state.pending = [];
      state.executing = null;
    }
  }

  /**
   * Cancel a specific queued command
   */
  public cancelCommand(attackerId: ObjectId, queueId: number): boolean {
    const state = this.queues.get(attackerId);
    if (!state) return false;

    // Check executing command
    if (state.executing && state.executing.queued.queueId === queueId) {
      state.executing = null;
      return true;
    }

    // Check pending commands
    const index = state.pending.findIndex((cmd) => cmd.queueId === queueId);
    if (index !== -1) {
      state.pending.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Check if an attacker is currently executing a command
   */
  public isExecuting(attackerId: ObjectId): boolean {
    const state = this.queues.get(attackerId);
    return state?.executing !== null;
  }

  /**
   * Check if an attacker has commands in queue
   */
  public hasQueuedCommands(attackerId: ObjectId): boolean {
    const state = this.queues.get(attackerId);
    return (state?.pending.length ?? 0) > 0;
  }

  /**
   * Check if an attacker is busy (executing or has queued commands)
   */
  public isBusy(attackerId: ObjectId): boolean {
    const state = this.queues.get(attackerId);
    if (!state) return false;
    return state.executing !== null || state.pending.length > 0;
  }

  /**
   * Get current queue depth for an attacker
   */
  public getQueueDepth(attackerId: ObjectId): number {
    const state = this.queues.get(attackerId);
    if (!state) return 0;
    return state.pending.length + (state.executing ? 1 : 0);
  }

  /**
   * Get currently executing command for an attacker
   */
  public getExecutingCommand(attackerId: ObjectId): ExecutingCommand | null {
    return this.queues.get(attackerId)?.executing ?? null;
  }

  /**
   * Get all pending commands for an attacker
   */
  public getPendingCommands(attackerId: ObjectId): QueuedCommand[] {
    return this.queues.get(attackerId)?.pending ?? [];
  }

  /**
   * Get time until next command executes for an attacker
   */
  public getTimeUntilNextExecution(attackerId: ObjectId): number {
    const state = this.queues.get(attackerId);
    if (!state) return 0;

    const now = Date.now();

    if (state.executing) {
      return Math.max(0, state.executing.completesAt - now);
    }

    if (state.pending.length > 0) {
      const next = state.pending[0];
      if (next) {
        return Math.max(0, next.executeAt - now);
      }
    }

    return 0;
  }

  /**
   * Set max queue size for an attacker
   */
  public setMaxQueueSize(attackerId: ObjectId, maxSize: number): void {
    const state = this.getOrCreateState(attackerId);
    state.maxQueueSize = maxSize;

    // Trim queue if necessary
    while (state.pending.length > maxSize) {
      state.pending.pop();
    }
  }

  /**
   * Remove an attacker's queue state
   */
  public removeAttacker(attackerId: ObjectId): void {
    this.queues.delete(attackerId);
  }

  /**
   * Get or create queue state for an attacker
   */
  private getOrCreateState(attackerId: ObjectId): AttackerQueueState {
    let state = this.queues.get(attackerId);
    if (!state) {
      state = {
        pending: [],
        executing: null,
        maxQueueSize: this.defaultMaxQueueSize,
      };
      this.queues.set(attackerId, state);
    }
    return state;
  }

  /**
   * Get total number of attackers with active queues
   */
  public get attackerCount(): number {
    return this.queues.size;
  }

  /**
   * Get total number of queued commands across all attackers
   */
  public get totalQueuedCommands(): number {
    let count = 0;
    for (const [, state] of this.queues) {
      count += state.pending.length;
      if (state.executing) count++;
    }
    return count;
  }
}

/**
 * Create a command queue instance
 */
export function createCommandQueue(options?: {
  defaultMaxQueueSize?: number;
  allowQueueDuringAnimation?: boolean;
}): CommandQueue {
  return new CommandQueue(options);
}
